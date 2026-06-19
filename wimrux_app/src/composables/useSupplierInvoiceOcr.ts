// =============================================================================
// WIMRUX® FINANCES — OCR Factures Fournisseurs (images scannées)
//
// WORKFLOW :
//  1. PDF → PNG pages via Stirling /api/v1/convert/pdf/img (ZIP)
//  2. Images → GPT-4o-mini Vision → JSON structuré
//  3. Matching fournisseur par IFU ou nom (fuzzy) → créer si absent
//  4. Créer received_invoice dans Appwrite
//
// POURQUOI VISION IA plutôt que Tesseract OCR :
//  - Factures burkinabè scannées avec stickers fiscaux DGI, tampons, écritures
//    manuscrites → Tesseract donne 40-60% de précision
//  - GPT-4o-mini Vision → 90%+ de précision sur ces formats complexes
//  - Coût marginal (~$0.01-0.02/facture vs ~$0.005 avec Tesseract)
// =============================================================================
import { ref } from 'vue';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import { useCrypto } from 'src/composables/useCrypto';
import { appwriteDb } from 'src/services/appwrite-db';

const OPENROUTER_URL   = 'https://openrouter.ai/api/v1/chat/completions';
const VISION_MODEL     = 'openai/gpt-4o-mini';   // Vision + JSON mode
const MAX_PAGES        = 4;                        // Max pages analysées
const STIRLING_DEFAULT = 'https://pdf.ulia.site';

// ── Types ────────────────────────────────────────────────────────────────────

export interface OcrInvoiceData {
  supplier_name: string | null;
  supplier_ifu:  string | null;
  supplier_invoice_number: string | null;
  invoice_date: string | null;   // YYYY-MM-DD
  due_date:     string | null;   // YYYY-MM-DD
  total_ht:     number;
  total_tva:    number;
  total_ttc:    number;
  currency:     string;           // XOF par défaut
  description:  string | null;
  line_items: {
    label:      string;
    qty:        number;
    unit_price: number;
    total:      number;
  }[];
  fiscal_sticker_ref: string | null;   // Référence sticker DGI si présente
  confidence:         number;          // 0-1
  needs_human_review: boolean;
}

export interface OcrExtractResult {
  ocr:              OcrInvoiceData;
  supplier_id:      string;
  supplier_name:    string;
  supplier_created: boolean;
  // Pas d'invoice_id : la facture n'est PAS encore créée avant review
}

export interface OcrImportResult extends OcrExtractResult {
  invoice_id:  string;
  invoice_ref: string;
}

export type OcrStep =
  | 'idle'
  | 'converting'   // PDF → images
  | 'analyzing'    // Vision IA
  | 'matching'     // Matching fournisseur
  | 'ready'        // Extraction terminée, en attente review humaine
  | 'importing'    // Insertion Appwrite (après confirmation)
  | 'done'
  | 'error';

export interface OcrState {
  step:       OcrStep;
  progress:   number;
  message:    string;
  error:      string | null;
  result:     OcrImportResult | null;
  ocrData:    OcrInvoiceData | null;
  extracted:  OcrExtractResult | null;  // disponible après extractOnly()
}

// ── Composable ────────────────────────────────────────────────────────────────

export function useSupplierInvoiceOcr() {
  const companyStore = useCompanyStore();
  const { decrypt }  = useCrypto();

  const state = ref<OcrState>({
    step: 'idle', progress: 0, message: '', error: null,
    result: null, ocrData: null, extracted: null,
  });

  function reset() {
    state.value = {
      step: 'idle', progress: 0, message: '', error: null,
      result: null, ocrData: null, extracted: null,
    };
  }

  // ── Clé OpenRouter ──────────────────────────────────────────────────────────
  async function resolveApiKey(): Promise<string> {
    const company = companyStore.company;
    let enc = company?.openrouter_api_key || '';
    if (!enc) {
      const { data } = await appwriteDb
        .from('companies').select('openrouter_api_key')
        .eq('is_platform_provider', true).limit(1);
      enc = (data as { openrouter_api_key?: string | null }[] | null)?.[0]?.openrouter_api_key || '';
    }
    if (!enc) throw new Error('Aucune clé API OpenRouter configurée (Paramètres → IA).');

    // Si la clé est déjà en clair (commence par sk-or- ou sk-), pas besoin de déchiffrer
    if (enc.startsWith('sk-or-') || enc.startsWith('sk-')) return enc;

    // Sinon tenter le déchiffrement AES-256
    try {
      const { plaintext, error } = await decrypt(enc);
      if (!error && plaintext) return plaintext;
    } catch {
      // ignore
    }

    throw new Error('Impossible de déchiffrer la clé OpenRouter. Vérifiez la configuration dans Paramètres → IA.');
  }

  // ── Config Stirling ─────────────────────────────────────────────────────────
  async function resolveStirling(): Promise<{ url: string; key: string }> {
    const c = companyStore.company;
    if (c?.stirling_api_url) {
      let key = c.stirling_api_key || '';
      // Ne déchiffrer que si c'est un vrai ciphertext AES (format "IV:data")
      if (key && key.includes(':') && !key.startsWith('http')) {
        const { plaintext, error } = await decrypt(key);
        if (!error && plaintext) key = plaintext;
      }
      return { url: c.stirling_api_url.replace(/\/$/, ''), key };
    }
    try {
      const { data } = await appwriteDb
        .from('companies').select('stirling_api_url, stirling_api_key')
        .eq('is_platform_provider', true).limit(1);
      const row = (data as { stirling_api_url?: string | null; stirling_api_key?: string | null }[] | null)?.[0];
      if (row?.stirling_api_url) {
        let key = row.stirling_api_key || '';
        if (key && key.includes(':') && !key.startsWith('http')) {
          const { plaintext, error } = await decrypt(key);
          if (!error && plaintext) key = plaintext;
        }
        return { url: row.stirling_api_url.replace(/\/$/, ''), key };
      }
    } catch { /* ignore */ }
    return { url: STIRLING_DEFAULT, key: '' };
  }

  // ── Étape 1 : PDF → Images PNG via Stirling ─────────────────────────────────
  // Endpoint : POST /api/v1/convert/pdf/img → ZIP d'images PNG

  // ── Étape 1 : PDF/Image → base64 PNG via fonction edge Appwrite ─────────────
  // Appel fetch direct (le SDK Appwrite sérialise FormData en JSON → KO)
  async function pdfToBase64Images(file: File): Promise<string[]> {
    const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT as string || 'https://appwrite.benga.live/v1';
    const APPWRITE_PROJECT  = import.meta.env.VITE_APPWRITE_PROJECT as string || '6a29285200015cd421c7';
    const FUNC_URL = `${APPWRITE_ENDPOINT}/functions/pdf-to-images/executions`;

    const form = new FormData();
    form.append('file', file);

    const res = await fetch(FUNC_URL, {
      method:  'POST',
      headers: { 'X-Appwrite-Project': APPWRITE_PROJECT },
      body:    form,
    });

    const json = await res.json() as { images?: string[]; error?: string };
    if (!res.ok || json.error) {
      throw new Error(`pdf-to-images : ${json.error ?? `HTTP ${res.status}`}`);
    }

    const images = json.images ?? [];
    if (images.length === 0) throw new Error('pdf-to-images : aucune image extraite');
    return images;
  }

  // ── Décompresse ZIP → base64 PNG ────────────────────────────────────────────
  function extractPngsFromZip(bytes: Uint8Array): string[] {
    const images: string[] = [];
    let i = 0;
    while (i < bytes.length - 30) {
      // Signature ZIP local file header: 50 4B 03 04
      const b0 = bytes[i] ?? 0;
      const b1 = bytes[i+1] ?? 0;
      const b2 = bytes[i+2] ?? 0;
      const b3 = bytes[i+3] ?? 0;
      if (b0 === 0x50 && b1 === 0x4B && b2 === 0x03 && b3 === 0x04) {
        const compression  = (bytes[i+8] ?? 0) | ((bytes[i+9] ?? 0) << 8);
        const compSize     = ((bytes[i+18] ?? 0) | ((bytes[i+19] ?? 0) << 8) | ((bytes[i+20] ?? 0) << 16) | ((bytes[i+21] ?? 0) << 24)) >>> 0;
        const fileNameLen  = (bytes[i+26] ?? 0) | ((bytes[i+27] ?? 0) << 8);
        const extraLen     = (bytes[i+28] ?? 0) | ((bytes[i+29] ?? 0) << 8);
        const dataStart    = i + 30 + fileNameLen + extraLen;
        const fileName     = new TextDecoder().decode(bytes.slice(i + 30, i + 30 + fileNameLen));

        if (compression === 0 && /\.(png|jpg|jpeg)$/i.test(fileName)) {
          const imgBytes = bytes.slice(dataStart, dataStart + compSize);
          // Convert to base64 in chunks to avoid call stack overflow
          let binary = '';
          const chunkSize = 8192;
          for (let j = 0; j < imgBytes.length; j += chunkSize) {
            binary += String.fromCharCode(...imgBytes.slice(j, j + chunkSize));
          }
          const b64 = btoa(binary);
          const mime = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          images.push(`data:${mime};base64,${b64}`);
        }
        i = dataStart + compSize;
      } else {
        i++;
      }
    }
    return images;
  }

  // ── Étape 1B : Image directe → base64 ──────────────────────────────────────
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload  = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(file);
    });
  }

  // ── Compression image avant envoi IA (évite les 400 sur images trop grandes) ──
  function compressImage(dataUrl: string, maxWidth = 1280, quality = 0.85): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
        canvas.width  = Math.round(img.width  * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl); // fallback: image originale
      img.src = dataUrl;
    });
  }

  // ── Étape 2 : Analyse Vision IA ─────────────────────────────────────────────
  async function analyzeWithVision(images: string[], apiKey: string): Promise<OcrInvoiceData> {
    const rawPages = images.slice(0, MAX_PAGES);
    // Comprimer les images pour éviter les 400 liés à la taille des payloads
    const pages = await Promise.all(rawPages.map(img => compressImage(img)));

    const systemPrompt = `Tu es un expert-comptable OHADA spécialisé dans les factures d'Afrique de l'Ouest (Burkina Faso, Côte d'Ivoire, Mali, Sénégal).
Tu analyses des factures fournisseurs scannées incluant potentiellement :
- Des stickers fiscaux DGI avec numéro de référence
- Des tampons et cachets
- Des éléments manuscrits
- Des formats de factures variés (informatiques, pré-imprimés, manuscrits)

Extrait toutes les informations et retourne UNIQUEMENT un JSON valide (sans markdown) :
{
  "supplier_name": "Nom exact du fournisseur",
  "supplier_ifu": "Numéro IFU ou null",
  "supplier_invoice_number": "Numéro de facture du fournisseur ou null",
  "invoice_date": "YYYY-MM-DD ou null",
  "due_date": "YYYY-MM-DD ou null",
  "total_ht": 0,
  "total_tva": 0,
  "total_ttc": 0,
  "currency": "XOF",
  "description": "Description courte de la facture",
  "line_items": [
    {"label": "Description article", "qty": 1, "unit_price": 0, "total": 0}
  ],
  "fiscal_sticker_ref": "Référence du sticker fiscal DGI ou null",
  "confidence": 0.9,
  "needs_human_review": false
}

RÈGLES IMPORTANTES :
- IFU (Identifiant Fiscal Unique) : cherche toute mention de "IFU", "N° IFU", "Numéro IFU", "NIF", "IF" suivie d'un code
  Format Burkina Faso : 8 à 11 chiffres suivis d'une lettre (ex: 00014674A, 000146744A, 00014674A)
  Cherche aussi dans les blocs d'adresse fournisseur, en bas de page, ou sur les stickers DGI
  Si tu vois un code alphanumérique après "IFU" ou "N° IFU" : c'est l'IFU — l'extraire IMPÉRATIVEMENT
- Si total_ttc visible mais pas total_ht : estimer total_ht = total_ttc / 1.18 (TVA 18%)
- Si seulement total_ttc : mettre total_tva = total_ttc - total_ht
- currency = "XOF" par défaut sauf si clairement indiqué autrement
- needs_human_review = true si confiance < 0.7 ou montants incohérents
- Ne jamais inventer des données — mettre null si non lisible`;


    const imageContent = pages.map(img => ({
      type: 'image_url' as const,
      image_url: { url: img },
    }));

    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'WIMRUX FINANCES OCR',
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: `Analyse cette facture fournisseur (${pages.length} page(s)) et extrais toutes les données :` },
              ...imageContent,
            ],
          },
        ],
        temperature: 0.05,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: { message?: string; code?: string; metadata?: unknown } };
      console.error('[OCR] OpenRouter error:', JSON.stringify(err));
      const detail = err.error?.message || err.error?.code || `HTTP ${response.status}`;
      throw new Error(`IA Vision : ${detail}`);
    }

    const data = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? '';

    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const start = cleaned.indexOf('{');
    const end   = cleaned.lastIndexOf('}');
    if (start < 0 || end < 0) throw new Error('Réponse IA invalide — pas de JSON retourné');

    return JSON.parse(cleaned.slice(start, end + 1)) as OcrInvoiceData;
  }

  // ── Étape 3 : Matching / Création fournisseur ────────────────────────────────
  async function resolveSupplier(ocr: OcrInvoiceData): Promise<{ id: string; name: string; created: boolean }> {
    const companyId = companyStore.company!.id;

    // 1. Recherche par IFU exact (identifiant fiscal unique)
    if (ocr.supplier_ifu) {
      const { data } = await appwriteDb
        .from('suppliers')
        .select('id, name')
        .eq('company_id', companyId)
        .ilike('ifu', ocr.supplier_ifu.trim())
        .limit(1);
      if (data && (data as { id: string; name: string }[]).length > 0) {
        const s = (data as { id: string; name: string }[])[0]!;
        return { id: s.id, name: s.name, created: false };
      }
    }

    // 2. Recherche par nom (ilike, tolérant aux variations mineures)
    if (ocr.supplier_name) {
      const nameParts = ocr.supplier_name.trim().split(/\s+/).slice(0, 2).join(' ');
      const { data } = await appwriteDb
        .from('suppliers')
        .select('id, name')
        .eq('company_id', companyId)
        .ilike('name', `%${nameParts}%`)
        .limit(1);
      if (data && (data as { id: string; name: string }[]).length > 0) {
        const s = (data as { id: string; name: string }[])[0]!;
        return { id: s.id, name: s.name, created: false };
      }
    }

    // 3. Créer nouveau fournisseur
    const name = ocr.supplier_name || 'Fournisseur inconnu';
    const { data, error } = await appwriteDb
      .from('suppliers')
      .insert([{
        company_id: companyId,
        name,
        ifu:       ocr.supplier_ifu   || null,
        is_active: true,
        country:   'BF',
      }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));

    if (error) throw new Error(`Création fournisseur : ${error.message}`);
    const created = data as { id: string; name: string };
    return { id: created.id, name: created.name, created: true };
  }

  // ── Étape 4 : Création de la facture reçue dans Appwrite ────────────────────
  async function createReceivedInvoice(
    ocr:         OcrInvoiceData,
    supplierId:  string,
    sourceUrl:   string | null,
  ): Promise<{ id: string; reference: string }> {
    const companyId = companyStore.company!.id;

    // Générer une référence interne
    const ref = `FR-${Date.now().toString(36).toUpperCase()}`;

    const { data, error } = await appwriteDb
      .from('invoices')
      .insert([{
        company_id:              companyId,
        direction:               'received',
        supplier_id:             supplierId,
        supplier_invoice_number: ocr.supplier_invoice_number,
        reference:               ref,
        status:                  ocr.needs_human_review ? 'draft' : 'draft',
        total_ht:                Number(ocr.total_ht)  || 0,
        total_tva:               Number(ocr.total_tva) || 0,
        total_ttc:               Number(ocr.total_ttc) || 0,
        due_date:                ocr.due_date,
        received_at:             ocr.invoice_date
                                   ? new Date(ocr.invoice_date).toISOString()
                                   : new Date().toISOString(),
        description:             ocr.description,
        payment_status:          'unpaid',
        paid_amount:             0,
        ifu_verified:            !!ocr.supplier_ifu,
        fiscal_compliance_status: ocr.fiscal_sticker_ref ? 'pending' : 'pending',
        fiscal_compliance_notes: ocr.fiscal_sticker_ref
          ? `Sticker fiscal DGI : ${ocr.fiscal_sticker_ref}`
          : null,
        ocr_source_url:          sourceUrl,
        ocr_confidence:          { global: ocr.confidence },
      }]);

    if (error) throw new Error(`Création facture : ${error.message}`);
    const inv = data as { id: string; reference: string };
    return { id: inv.id, reference: inv.reference };
  }

  // ── extractOnly : Étapes 1-3 sans import DB ──────────────────────────────────
  // Utilisé par OcrInvoiceReviewDialog : l'utilisateur vérifie avant import
  async function extractOnly(file: File): Promise<OcrExtractResult | null> {
    reset();
    try {
      // Étape 1 : PDF → Images
      state.value = { ...state.value, step: 'converting', progress: 10,
        message: 'Conversion PDF → images via Stirling…', error: null };

      let images: string[];
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        try {
          images = await pdfToBase64Images(file);
          if (images.length === 0) throw new Error('Aucune image extraite du PDF');
        } catch (stirlingErr) {
          // GPT-4o-mini n'accepte pas les PDF — Stirling est obligatoire pour convertir
          throw new Error(
            'Stirling PDF Tools est indisponible pour convertir ce PDF en images. ' +
            'Veuillez convertir votre facture en JPG ou PNG avant de l\'importer, ' +
            'ou vérifier la configuration Stirling dans Paramètres → IA.'
          );
        }
      } else {
        const b64 = await fileToBase64(file);
        images = [b64];
      }


      state.value = { ...state.value, progress: 30,
        message: `${images.length} page(s) prête(s) pour analyse IA…` };

      // Étape 2 : Vision IA
      state.value = { ...state.value, step: 'analyzing', progress: 40,
        message: 'Analyse IA Vision en cours…' };

      const apiKey = await resolveApiKey();
      const ocr    = await analyzeWithVision(images, apiKey);
      state.value.ocrData = ocr;

      state.value = { ...state.value, progress: 65,
        message: `Extraction réussie (confiance : ${Math.round(ocr.confidence * 100)}%)` };

      // Étape 3 : Matching fournisseur
      state.value = { ...state.value, step: 'matching', progress: 80,
        message: 'Identification du fournisseur…' };

      const supplier = await resolveSupplier(ocr);
      const supplierMsg = supplier.created
        ? `✅ Nouveau fournisseur créé : ${supplier.name}`
        : `✅ Fournisseur trouvé : ${supplier.name}`;

      const extracted: OcrExtractResult = {
        ocr,
        supplier_id:      supplier.id,
        supplier_name:    supplier.name,
        supplier_created: supplier.created,
      };

      state.value = {
        ...state.value,
        step: 'ready', progress: 100,
        message: `${supplierMsg} — Vérifiez et confirmez avant import`,
        extracted,
      };

      return extracted;

    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      state.value = { ...state.value, step: 'error', error: msg, message: msg };
      return null;
    }
  }

  // ── processFile : Flux complet (legacy, conservé) ────────────────────────────
  async function processFile(file: File): Promise<OcrImportResult | null> {
    const extracted = await extractOnly(file);
    if (!extracted) return null;

    try {
      state.value = { ...state.value, step: 'importing', progress: 90,
        message: 'Import de la facture dans Appwrite…' };

      const invoice = await createReceivedInvoice(extracted.ocr, extracted.supplier_id, null);

      const result: OcrImportResult = {
        ...extracted,
        invoice_id:  invoice.id,
        invoice_ref: invoice.reference,
      };

      state.value = {
        step: 'done', progress: 100,
        message: `Facture importée : ${invoice.reference}${
          extracted.supplier_created ? ' · Nouveau fournisseur créé' : ''}${
          extracted.ocr.needs_human_review ? ' ⚠️ Vérification manuelle recommandée' : ''}`,
        error: null, result, ocrData: extracted.ocr, extracted,
      };

      return result;

    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      state.value = { ...state.value, step: 'error', error: msg, message: msg };
      return null;
    }
  }

  return { state, reset, extractOnly, processFile, createReceivedInvoice };
}
