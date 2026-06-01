// =============================================================================
// WIMRUX® FINANCES — useIngestPayment
// Ingestion paiements universels via Edge Functions :
//   text/SMS → ingest-payment
//   image    → ingest-image-payment
//   file     → ingest-statement-file
// =============================================================================
import { ref } from 'vue';
import { insforge } from 'src/boot/insforge';

export type IngestChannel = 'text' | 'sms' | 'image' | 'file';

export interface IngestJobState {
  status: 'idle' | 'uploading' | 'processing' | 'done' | 'error';
  channel: IngestChannel | null;
  evidenceId: string | null;
  transactionId: string | null;
  inserted: number;
  skipped: number;
  errors: string[];
  modelUsed: string | null;
  isFallback: boolean;
  isDuplicate: boolean;
  durationMs: number;
  errorMessage: string | null;
}

function emptyState(): IngestJobState {
  return {
    status: 'idle', channel: null, evidenceId: null, transactionId: null,
    inserted: 0, skipped: 0, errors: [], modelUsed: null,
    isFallback: false, isDuplicate: false, durationMs: 0, errorMessage: null,
  };
}

export function useIngestPayment() {
  const job = ref<IngestJobState>(emptyState());

  function reset() { job.value = emptyState(); }

  // ── Ingest text / SMS ────────────────────────────────────────────────────

  async function ingestText(payload: {
    wallet_id: string;
    content: string;
    channel?: 'text' | 'sms';
    language?: string;
  }) {
    job.value = { ...emptyState(), status: 'processing', channel: payload.channel ?? 'text' };
    const t0 = Date.now();
    try {
      const { data, error } = await insforge.functions.invoke('ingest-payment', {
        body: {
          source_channel: payload.channel ?? 'text',
          wallet_id: payload.wallet_id,
          content: payload.content,
          options: { language: payload.language ?? 'fr' },
        },
      });
      job.value.durationMs = Date.now() - t0;
      if (error) throw new Error(error.message);
      if (!data?.success) {
        if (data?.error === 'duplicate_transaction') {
          job.value.isDuplicate = true;
          job.value.status = 'done';
          job.value.evidenceId = data.evidence_id ?? null;
          return;
        }
        throw new Error(data?.error ?? 'Extraction échouée');
      }
      job.value.status = 'done';
      job.value.evidenceId = data.evidence_id ?? null;
      job.value.transactionId = data.transaction?.id ?? null;
      job.value.inserted = 1;
      job.value.modelUsed = data.model_used ?? null;
      job.value.isFallback = data.is_fallback ?? false;
    } catch (e) {
      job.value.status = 'error';
      job.value.durationMs = Date.now() - t0;
      job.value.errorMessage = e instanceof Error ? e.message : 'Erreur inconnue';
    }
  }

  // ── Ingest image ─────────────────────────────────────────────────────────

  async function ingestImage(payload: {
    wallet_id: string;
    file: File;
    language?: string;
  }) {
    job.value = { ...emptyState(), status: 'uploading', channel: 'image' };
    const t0 = Date.now();
    try {
      const formData = new FormData();
      formData.append('file', payload.file);
      formData.append('wallet_id', payload.wallet_id);
      if (payload.language) formData.append('language', payload.language);

      job.value.status = 'processing';
      const { data, error } = await insforge.functions.invoke('ingest-image-payment', {
        body: formData,
      });
      job.value.durationMs = Date.now() - t0;
      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error ?? 'Extraction échouée');
      job.value.status = 'done';
      job.value.evidenceId = data.evidence_id ?? null;
      job.value.transactionId = data.transaction?.id ?? null;
      job.value.inserted = 1;
      job.value.modelUsed = data.model_used ?? null;
      job.value.isFallback = data.is_fallback ?? false;
    } catch (e) {
      job.value.status = 'error';
      job.value.durationMs = Date.now() - t0;
      job.value.errorMessage = e instanceof Error ? e.message : 'Erreur inconnue';
    }
  }

  // ── Ingest file (PDF/CSV/XLSX/OFX/QIF) ──────────────────────────────────

  async function ingestFile(payload: {
    wallet_id: string;
    file: File;
    language?: string;
  }) {
    job.value = { ...emptyState(), status: 'uploading', channel: 'file' };
    const t0 = Date.now();
    try {
      const formData = new FormData();
      formData.append('file', payload.file);
      formData.append('wallet_id', payload.wallet_id);
      if (payload.language) formData.append('language', payload.language);

      job.value.status = 'processing';
      const { data, error } = await insforge.functions.invoke('ingest-statement-file', {
        body: formData,
      });
      job.value.durationMs = Date.now() - t0;
      if (error) throw new Error(error.message);
      job.value.status = 'done';
      job.value.evidenceId = data?.evidence_id ?? null;
      job.value.inserted = data?.inserted ?? 0;
      job.value.skipped  = data?.skipped  ?? 0;
      job.value.errors   = data?.errors   ?? [];
      job.value.modelUsed = null;
    } catch (e) {
      job.value.status = 'error';
      job.value.durationMs = Date.now() - t0;
      job.value.errorMessage = e instanceof Error ? e.message : 'Erreur inconnue';
    }
  }

  return { job, reset, ingestText, ingestImage, ingestFile };
}
