// =============================================================================
import { appwriteDb } from 'src/services/appwrite-db';
import { functions } from 'src/boot/appwrite';
// WIMRUX® FINANCES — Contrôle conformité fiscale universelle (T2.6)
// Validation locale (regex) + vérification en ligne via Edge Function verify-tax-id
// Architecture : config par pays dans country_fiscal_configs (DB)
// =============================================================================

// ---------------------------------------------------------------------------
// Config pays (issue de country_fiscal_configs)
// ---------------------------------------------------------------------------
export interface CountryFiscalConfig {
  country_code: string;
  country_name: string;
  tax_id_label: string;
  tax_id_format_regex: string | null;
  tax_id_format_hint: string | null;
  verification_type: 'manual' | 'web_scrape' | 'api_json' | 'api_xml' | 'dify_workflow';
  verification_url: string | null;
  dify_workflow_id: string | null;
  dify_workflow_notes: string | null;
  fiscal_platform_name: string | null;
  fiscal_platform_url: string | null;
  fiscal_platform_notes: string | null;
  standard_vat_rate: number;
  vat_exempt_threshold: number | null;
  uses_syscohada: boolean;
  currency_code: string;
}

export interface OnlineVerifyResult {
  format_valid: boolean;
  format_message: string;
  online_check: 'not_available' | 'pending' | 'valid' | 'invalid' | 'error';
  online_message: string | null;
  manual_required: boolean;
  fiscal_platform_name: string | null;
  fiscal_platform_url: string | null;
  // Données enrichies retournées par le scraper Browserless (ifucheck.ulia.site)
  details?: {
    nom?: string;
    etat?: string;
    rccm?: string;
    regime?: string;
    direction?: string;
    siege?: string;
    forme_jur?: string;
    telephone?: string;
    mail?: string;
    adresse?: string;
    champs?: { label: string; valeur: string; actif: boolean }[];
  };
}

// Cache en mémoire pour éviter de recharger la même config
const configCache: Map<string, CountryFiscalConfig> = new Map();

export async function getCountryFiscalConfig(
  countryCode: string
): Promise<CountryFiscalConfig | null> {
  const code = countryCode.toUpperCase();
  if (configCache.has(code)) return configCache.get(code)!;

  try {
    const { data, error } = await appwriteDb
      .from('country_fiscal_configs')
      .select('*')
      .eq('country_code', code)
      .eq('is_active', true)
      .single();

    if (error || !data) return null;
    configCache.set(code, data as CountryFiscalConfig);
    return data as CountryFiscalConfig;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Vérification en ligne — route vers Dify workflow ou Edge Fn générique
// selon country_fiscal_configs.verification_type
// ---------------------------------------------------------------------------
export async function verifyTaxIdOnline(
  countryCode: string,
  taxId: string
): Promise<OnlineVerifyResult> {
  // Charge la config pays en silence (ne loggue pas l'erreur si la collection n'existe pas)
  let config: CountryFiscalConfig | null = null;
  try {
    config = await getCountryFiscalConfig(countryCode);
  } catch {
    config = null;
  }

  // Cas 0 (prioritaire) : scraper Browserless dédié (ifucheck.ulia.site)
  // Actif pour BF tant que VITE_IFU_SCRAPER_URL est défini.
  const scraperUrl = (import.meta.env.VITE_IFU_SCRAPER_URL as string | undefined)?.trim();
  if (scraperUrl && countryCode.toUpperCase() === 'BF') {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 45000);
      const resp = await fetch(`${scraperUrl.replace(/\/$/, '')}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ifu: taxId }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (resp.ok) {
        const payload = await resp.json() as {
          statut?: string;
          message?: string;
          resultat?: {
            etat?: string;
            nom?: string; rccm?: string; regime?: string;
            direction?: string; siege?: string; forme_jur?: string;
            telephone?: string; mail?: string; adresse?: string;
            champs?: { label: string; valeur: string; actif: boolean }[];
          };
        };
        if (payload?.statut === 'ok' && payload.resultat) {
          const etat = (payload.resultat.etat || '').toUpperCase();
          const isActif = etat === 'ACTIF';
          const isInvalide = etat === 'INVALIDE' || etat === 'DESACTIVE';
          return {
            format_valid: true,
            format_message: 'Format valide',
            online_check: isActif ? 'valid' : isInvalide ? 'invalid' : 'pending',
            online_message: payload.resultat.nom || etat || 'Réponse DGI reçue',
            manual_required: !isActif && !isInvalide,
            fiscal_platform_name: config?.fiscal_platform_name ?? 'DGI Burkina Faso',
            fiscal_platform_url: config?.fiscal_platform_url ?? 'https://dgi.bf/verification/verification-ifu',
            details: payload.resultat,
          };
        }
      }
    } catch (e) {
      console.warn('[IFU] scraper unavailable, fallback:', e);
    }
  }

  // Cas 1 : workflow Dify configuré → tentative de vérification automatique via ai-router
  if (config?.verification_type === 'dify_workflow' && config.dify_workflow_id) {
    try {
      const r = await functions.createExecution('ai-router', JSON.stringify({
        task_code: 'verify_ifu_bf',
        input: { text: taxId, country_code: countryCode },
        options: { workflow_id: config.dify_workflow_id },
      }));
      const data = (() => { try { return JSON.parse(r.responseBody); } catch { return null; } })();
      if (data?.success) {
        const content: string = data.data?.content ?? '';
        const isValid   = /valid|valide|trouvé|contribuable/i.test(content);
        const isInvalid = /invalide|introuvable|inexistant|not found/i.test(content);
        return {
          format_valid: true,
          format_message: 'Format valide',
          online_check: isValid ? 'valid' : isInvalid ? 'invalid' : 'pending',
          online_message: content || 'Résultat Dify reçu',
          manual_required: !isValid && !isInvalid,
          fiscal_platform_name: config.fiscal_platform_name,
          fiscal_platform_url: config.fiscal_platform_url,
        };
      }
    } catch {
      // Ignore et bascule en fallback manuel
    }
  }

  // Cas 2 : aucun workflow automatique disponible → mode manuel via dgi.bf
  // (l'UI ouvre dgi.bf et propose le bouton "J'ai vérifié manuellement")
  const platformName = config?.fiscal_platform_name
    ?? (countryCode === 'BF' ? 'DGI Burkina Faso' : null);
  const platformUrl = config?.fiscal_platform_url
    ?? (countryCode === 'BF' ? 'https://dgi.bf/verification/verification-ifu' : null);

  return {
    format_valid: true,
    format_message: 'Format valide',
    online_check: 'not_available',
    online_message: platformUrl
      ? `Vérification automatique non configurée — utilisez ${platformName}`
      : 'Vérification manuelle requise',
    manual_required: true,
    fiscal_platform_name: platformName,
    fiscal_platform_url: platformUrl,
  };
}

export interface ComplianceCheck {
  field: string;
  label: string;
  passed: boolean;
  severity: 'error' | 'warning' | 'info';
  message: string;
}

export interface ComplianceResult {
  score: number;            // 0-100
  status: 'valid' | 'invalid' | 'pending';
  checks: ComplianceCheck[];
  summary: string;
}

// ---------------------------------------------------------------------------
// Validation locale IFU/NIF/TIN (basée sur la config pays ou fallback BF)
// ---------------------------------------------------------------------------
export async function validateTaxIdForCountry(
  taxId: string,
  countryCode: string
): Promise<{ valid: boolean; message: string }> {
  const config = await getCountryFiscalConfig(countryCode);
  if (!config) return validateIFU(taxId); // fallback BF

  if (!taxId || taxId.trim() === '') {
    return { valid: false, message: `${config.tax_id_label} absent` };
  }

  if (!config.tax_id_format_regex) {
    return { valid: true, message: `${config.tax_id_label} : format non vérifiable localement` };
  }

  const cleaned = taxId.trim().replace(/[\s-]/g, '');
  const regex = new RegExp(config.tax_id_format_regex, 'i');
  return regex.test(cleaned)
    ? { valid: true, message: `${config.tax_id_label} valide (${config.tax_id_format_hint ?? 'OK'})` }
    : { valid: false, message: `${config.tax_id_label} invalide — ${config.tax_id_format_hint ?? 'format incorrect'}` };
}

// ---------------------------------------------------------------------------
// Règles IFU Burkina Faso (validation locale synchrone — fallback sans DB)
// IFU = 14 chiffres (ancienne norme) ou format SECeF (lettre + chiffres)
// ---------------------------------------------------------------------------
export function validateIFU(ifu: string | null | undefined): { valid: boolean; message: string } {
  if (!ifu || ifu.trim() === '') {
    return { valid: false, message: 'IFU absent' };
  }
  const cleaned = ifu.trim().replace(/[\s-]/g, '');
  // Numérique pur : 13 ou 14 chiffres
  if (/^\d{13,14}$/.test(cleaned)) {
    return { valid: true, message: `IFU numérique valide (${cleaned.length} chiffres)` };
  }
  // Format SECeF : 1-2 lettres + 10-13 chiffres
  if (/^[A-Z]{1,2}\d{10,13}$/i.test(cleaned)) {
    return { valid: true, message: 'IFU format SECeF valide' };
  }
  return { valid: false, message: `Format IFU invalide : "${ifu}" (attendu : 13-14 chiffres ou 1-2 lettres + chiffres)` };
}

// ---------------------------------------------------------------------------
// Règles numéro de facture (SECeF DGI)
// Max 32 caractères, doit être alphanumérique + tirets/barres
// ---------------------------------------------------------------------------
export function validateInvoiceNumber(num: string | null | undefined): { valid: boolean; message: string } {
  if (!num || num.trim() === '') {
    return { valid: false, message: 'Numéro de facture absent' };
  }
  if (num.length > 32) {
    return { valid: false, message: `Numéro trop long (${num.length} car., max 32 selon SECeF)` };
  }
  if (!/^[A-Z0-9/_\-. ]+$/i.test(num)) {
    return { valid: false, message: 'Numéro contient des caractères non autorisés' };
  }
  return { valid: true, message: 'Numéro de facture valide' };
}

// ---------------------------------------------------------------------------
// Contrôle global d'une facture reçue
// ---------------------------------------------------------------------------
export function checkReceivedInvoiceCompliance(invoice: {
  supplier_invoice_number?: string | null;
  ifu?: string | null;                 // IFU du fournisseur
  total_ttc?: number;
  total_ht?: number;
  total_tva?: number;
  received_at?: string | null;
  supplier_name?: string | null;
}): ComplianceResult {
  const checks: ComplianceCheck[] = [];

  // 1. IFU fournisseur
  const ifuResult = validateIFU(invoice.ifu);
  checks.push({
    field: 'ifu',
    label: 'IFU fournisseur',
    passed: ifuResult.valid,
    severity: 'error',
    message: ifuResult.message,
  });

  // 2. Numéro de facture
  const numResult = validateInvoiceNumber(invoice.supplier_invoice_number);
  checks.push({
    field: 'supplier_invoice_number',
    label: 'Numéro de facture',
    passed: numResult.valid,
    severity: 'error',
    message: numResult.message,
  });

  // 3. Montants cohérents
  if (invoice.total_ttc !== undefined && invoice.total_ht !== undefined) {
    const expectedTTC = Number(invoice.total_ht) + Number(invoice.total_tva ?? 0);
    const diff = Math.abs(Number(invoice.total_ttc) - expectedTTC);
    checks.push({
      field: 'total_ttc',
      label: 'Cohérence montants HT/TVA/TTC',
      passed: diff < 1,
      severity: 'warning',
      message: diff < 1
        ? 'Montants cohérents'
        : `Écart de ${diff.toFixed(2)} entre HT+TVA et TTC`,
    });
  }

  // 4. TVA (18% en BF pour régime normal, 0% exonéré)
  if (invoice.total_ht && invoice.total_tva !== undefined) {
    const tvaRate = Number(invoice.total_ht) > 0
      ? (Number(invoice.total_tva) / Number(invoice.total_ht)) * 100
      : 0;
    const validRates = [0, 18];
    const nearValidRate = validRates.some(r => Math.abs(tvaRate - r) < 0.5);
    checks.push({
      field: 'total_tva',
      label: 'Taux TVA (BF : 0% ou 18%)',
      passed: nearValidRate,
      severity: 'warning',
      message: nearValidRate
        ? `Taux TVA : ${tvaRate.toFixed(1)}% ✓`
        : `Taux TVA inhabituel : ${tvaRate.toFixed(1)}% (attendu 0% ou 18%)`,
    });
  }

  // 5. Date de réception
  if (!invoice.received_at) {
    checks.push({
      field: 'received_at',
      label: 'Date de réception',
      passed: false,
      severity: 'warning',
      message: 'Date de réception non renseignée',
    });
  }

  // 6. Nom fournisseur
  checks.push({
    field: 'supplier_name',
    label: 'Fournisseur identifié',
    passed: !!(invoice.supplier_name && invoice.supplier_name.trim()),
    severity: 'error',
    message: invoice.supplier_name ? `Fournisseur : ${invoice.supplier_name}` : 'Fournisseur non renseigné',
  });

  // Calcul score
  const errorChecks   = checks.filter(c => c.severity === 'error');
  const warningChecks = checks.filter(c => c.severity === 'warning');
  const errorFailed   = errorChecks.filter(c => !c.passed).length;
  const warnFailed    = warningChecks.filter(c => !c.passed).length;

  // Score : erreurs = -20 chacune, warnings = -5 chacune (sur 100)
  const score = Math.max(0, 100 - errorFailed * 20 - warnFailed * 5);

  let status: ComplianceResult['status'];
  if (errorFailed > 0)  status = 'invalid';
  else if (score < 90)  status = 'pending';
  else                  status = 'valid';

  const passed = checks.filter(c => c.passed).length;
  const summary = `${passed}/${checks.length} règles respectées — Score : ${score}/100`;

  return { score, status, checks, summary };
}

// ---------------------------------------------------------------------------
// Catégories de paiements fiscaux (pour reçus DGI / eSyntas)
// ---------------------------------------------------------------------------
export const TAX_PAYMENT_TYPES = [
  { code: 'ifu_annuel',       label: 'IFU annuel',                        account: '4455' },
  { code: 'tva_mensuelle',    label: 'TVA mensuelle',                     account: '4457' },
  { code: 'is_acompte',       label: 'IS — acompte provisionnel',         account: '4441' },
  { code: 'is_solde',         label: 'IS — solde',                        account: '4441' },
  { code: 'bic',              label: 'BIC',                               account: '4441' },
  { code: 'patente',          label: 'Patente',                           account: '6372' },
  { code: 'tpa',              label: 'Taxe professionnelle annuelle',     account: '6371' },
  { code: 'ipts',             label: 'IPTS (retenue salariale)',          account: '4421' },
  { code: 'cnss_employeur',   label: 'CNSS part patronale',               account: '6451' },
  { code: 'cnss_employe',     label: 'CNSS part salariale',               account: '4311' },
  { code: 'rts',              label: 'RTS (retenue sur honoraires)',      account: '4452' },
  { code: 'timbre',           label: 'Droits de timbre',                  account: '6362' },
  { code: 'droits_enreg',     label: "Droits d'enregistrement",           account: '6361' },
  { code: 'autre_fiscal',     label: 'Autre paiement fiscal',             account: '6379' },
] as const;

export type TaxPaymentCode = typeof TAX_PAYMENT_TYPES[number]['code'];
