// =============================================================================
// WIMRUX® FINANCES — OCR Relevés bancaires via Stirling PDF + DeepSeek/LiteLLM
// Flux : PDF/image → Stirling (pdf.ulia.site) → texte brut → ai-router (DeepSeek) → JSON
// =============================================================================
import { ref } from 'vue';
import type { ParsedTransaction } from 'src/utils/bankStatementParsers';
import { functions } from 'src/boot/appwrite';

const STIRLING_BASE_URL = 'https://pdf.ulia.site';

export interface OcrJob {
  status: 'idle' | 'ocr' | 'ai' | 'done' | 'error';
  rawText: string;
  transactions: ParsedTransaction[];
  errorMessage: string | null;
  ocrDurationMs: number;
  aiDurationMs: number;
  pageCount: number;
}

export function useBankStatementOcr() {
  const job = ref<OcrJob>({
    status: 'idle',
    rawText: '',
    transactions: [],
    errorMessage: null,
    ocrDurationMs: 0,
    aiDurationMs: 0,
    pageCount: 0,
  });

  function resetJob() {
    job.value = { status: 'idle', rawText: '', transactions: [], errorMessage: null, ocrDurationMs: 0, aiDurationMs: 0, pageCount: 0 };
  }

  async function ocrWithStirling(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('fileInput', file);
    // Stirling PDF — extraction texte brut (pdf.ulia.site, pas d'auth requise)
    const endpoint = STIRLING_BASE_URL + '/api/v1/misc/extract-text-from-pdf';

    const t0 = Date.now();
    const response = await fetch(endpoint, { method: 'POST', body: formData });
    job.value.ocrDurationMs = Date.now() - t0;

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Stirling OCR erreur ${response.status}: ${body || response.statusText}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const json = await response.json() as { text?: string; content?: string; pages?: { text: string }[] };
      if (json.pages) {
        job.value.pageCount = json.pages.length;
        return json.pages.map(p => p.text).join('\n\n--- PAGE ---\n\n');
      }
      return json.text ?? json.content ?? '';
    }
    return await response.text();
  }

  async function parseWithAi(rawText: string): Promise<ParsedTransaction[]> {
    const truncated = rawText.length > 12000 ? rawText.slice(0, 12000) + '\n[... tronqué ...]' : rawText;

    const t0 = Date.now();
    // Appel via ai-router → DeepSeek via LiteLLM (deepseek-chat, fallback claude-haiku)
    const { data, error } = await (async () => { try { const r = await functions.createExecution('ai-router', JSON.stringify({ task_code: 'bank_statement_ocr', input: { text: `Voici le texte OCR d'un relevé bancaire :\n\n${truncated}` }, options: { language: 'fr', bypass_pii: true } })); return { data: (() => { try { return JSON.parse(r.responseBody); } catch { return r.responseBody; } })(), error: null }; } catch(e) { return { data: null, error: e as Error }; } })();
    job.value.aiDurationMs = Date.now() - t0;

    if (error || !data?.success) {
      throw new Error(`IA erreur : ${error?.message ?? data?.message ?? 'Réponse invalide'}`);
    }

    const content: string = data.data?.content ?? '';
    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const startIdx = cleaned.indexOf('[');
    const endIdx = cleaned.lastIndexOf(']');
    if (startIdx < 0 || endIdx < 0) throw new Error('L\'IA n\'a pas retourné un tableau JSON valide');

    const jsonStr = cleaned.slice(startIdx, endIdx + 1);
    const parsed = JSON.parse(jsonStr) as Partial<ParsedTransaction>[];

    const dir = (d: string | undefined): 'debit' | 'credit' => d === 'debit' ? 'debit' : 'credit';
    return parsed.map(tx => ({
      transaction_date: tx.transaction_date ?? new Date().toISOString().slice(0, 10),
      value_date: tx.value_date ?? null,
      amount: Math.abs(Number(tx.amount) || 0),
      direction: dir(tx.direction),
      label: tx.label ?? '',
      reference: tx.reference ?? null,
      raw: JSON.stringify(tx),
    })).filter(tx => tx.amount > 0 && tx.label);
  }

  async function processFile(file: File): Promise<ParsedTransaction[]> {
    resetJob();

    try {
      // Étape 1 : OCR Stirling
      job.value.status = 'ocr';
      const rawText = await ocrWithStirling(file);
      job.value.rawText = rawText;

      // Étape 2 : Normalisation IA
      job.value.status = 'ai';
      const transactions = await parseWithAi(rawText);
      job.value.transactions = transactions;
      job.value.status = 'done';
      return transactions;
    } catch (e: unknown) {
      job.value.status = 'error';
      job.value.errorMessage = e instanceof Error ? e.message : 'Erreur inconnue';
      return [];
    }
  }

  /**
   * Permet aussi de re-parser un texte OCR déjà obtenu (mode manuel / correction)
   */
  async function reParseRawText(rawText: string): Promise<ParsedTransaction[]> {
    job.value.rawText = rawText;
    job.value.status = 'ai';
    try {
      const transactions = await parseWithAi(rawText);
      job.value.transactions = transactions;
      job.value.status = 'done';
      return transactions;
    } catch (e: unknown) {
      job.value.status = 'error';
      job.value.errorMessage = e instanceof Error ? e.message : 'Erreur IA';
      return [];
    }
  }

  return { job, processFile, reParseRawText, resetJob };
}
