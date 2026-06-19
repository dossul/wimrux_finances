// =============================================================================
// WIMRUX® FINANCES — useUniversalReconciliation
// Rapprochement wallet_transactions ↔ invoices/invoice_payments
// Suggestion IA via ai-router (reconciliation_suggestion → Claude Sonnet)
// =============================================================================
import { ref, computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import { appwriteDb } from 'src/services/appwrite-db';
import { functions } from 'src/boot/appwrite';

export interface WalletTx {
  id: string;
  wallet_id: string;
  direction: 'credit' | 'debit';
  amount: number;
  currency: string;
  label: string;
  counterparty_name: string | null;
  transaction_date: string;
  reconciliation_status: 'unreconciled' | 'reconciled' | 'partial' | 'excluded';
  needs_human_review: boolean;
  confidence_score: number | null;
  matched_invoice_id: string | null;
  source_channel: string;
}

export interface ReconciliationMatch {
  wallet_tx_id: string;
  invoice_id: string;
  invoice_number: string;
  invoice_amount: number;
  match_score: number;
  match_reason: string;
  ai_suggested: boolean;
}

export interface RecoStats {
  total: number;
  reconciled: number;
  unreconciled: number;
  needs_review: number;
  pct: number;
}

export function useUniversalReconciliation() {
  const companyStore = useCompanyStore();

  const transactions   = ref<WalletTx[]>([]);
  const suggestions    = ref<ReconciliationMatch[]>([]);
  const loading        = ref(false);
  const aiLoading      = ref(false);
  const error          = ref<string | null>(null);
  const lastAiModel    = ref<string | null>(null);

  const stats = computed<RecoStats>(() => {
    const total       = transactions.value.length;
    const reconciled  = transactions.value.filter(t => t.reconciliation_status === 'reconciled').length;
    const unreconciled = transactions.value.filter(t => t.reconciliation_status === 'unreconciled').length;
    const needs_review = transactions.value.filter(t => t.needs_human_review).length;
    return { total, reconciled, unreconciled, needs_review, pct: total ? Math.round(reconciled / total * 100) : 0 };
  });

  const unreconciledTxs = computed(() =>
    transactions.value.filter(t => t.reconciliation_status === 'unreconciled')
  );

  // ── Load unreconciled transactions ────────────────────────────────────────

  async function loadTransactions(walletId?: string) {
    loading.value = true; error.value = null;
    try {
      let q = appwriteDb
        .from('wallet_transactions')
        .select('id,wallet_id,direction,amount,currency,label,counterparty_name,transaction_date,reconciliation_status,needs_human_review,confidence_score,matched_invoice_id,source_channel')
        .eq('company_id', companyStore.company?.id ?? '')
        .order('transaction_date', { ascending: false })
        .limit(200);
      if (walletId) q = q.eq('wallet_id', walletId);
      const { data, error: err } = await q;
      if (err) throw new Error(err.message);
      transactions.value = (data ?? []) as WalletTx[];
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur chargement';
    } finally { loading.value = false; }
  }

  // ── AI suggestions ────────────────────────────────────────────────────────

  async function getAiSuggestions(txIds?: string[]) {
    aiLoading.value = true; error.value = null;
    try {
      const toAnalyze = txIds
        ? transactions.value.filter(t => txIds.includes(t.id) && t.reconciliation_status === 'unreconciled')
        : unreconciledTxs.value.slice(0, 30);

      if (!toAnalyze.length) return;

      // Fetch open invoices for context
      const { data: openInvoices } = await appwriteDb
        .from('invoices')
        .select('id,number,total_ttc,direction,status,client_name,due_date')
        .eq('company_id', companyStore.company?.id ?? '')
        .in('status', ['sent', 'partial', 'overdue'])
        .limit(50);

      const prompt = `Tu es un expert en rapprochement comptable.

TRANSACTIONS NON RAPPROCHÉES (wallet mobile money) :
${JSON.stringify(toAnalyze.map(t => ({
  id: t.id, montant: t.amount, sens: t.direction,
  libellé: t.label, contrepartie: t.counterparty_name,
  date: t.transaction_date.slice(0, 10),
})), null, 2)}

FACTURES OUVERTES :
${JSON.stringify((openInvoices ?? []).map((i: Record<string, unknown>) => ({
  id: i.id, numéro: i.number, montant: i.total_ttc,
  client: i.client_name, échéance: i.due_date,
})), null, 2)}

Pour chaque transaction, propose le meilleur rapprochement possible avec une facture (ou "aucun" si aucune correspondance).
Retourne UNIQUEMENT un tableau JSON :
[{"wallet_tx_id":"...","invoice_id":"... ou null","invoice_number":"...","invoice_amount":0,"match_score":0.95,"match_reason":"montant exact + même client","ai_suggested":true}]`;

      const { data: aiResult, error: aiErr } = await (async () => { try { const r = await functions.createExecution('ai-router', JSON.stringify({
          task_code: 'reconciliation_suggestion',
          input: { text: prompt },
          options: { language: 'fr', bypass_pii: true },
        })); return { data: (() => { try { return JSON.parse(r.responseBody); } catch { return r.responseBody; } })(), error: null }; } catch(e) { return { data: null, error: e as Error }; } })();

      if (aiErr || !aiResult?.success) throw new Error(aiErr?.message ?? 'ai-router error');
      lastAiModel.value = aiResult.data?.model_used ?? null;

      const content = (aiResult.data?.content ?? '') as string;
      const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const s = cleaned.indexOf('['), e = cleaned.lastIndexOf(']');
      if (s >= 0 && e > s) {
        suggestions.value = JSON.parse(cleaned.slice(s, e + 1)) as ReconciliationMatch[];
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur IA';
    } finally { aiLoading.value = false; }
  }

  // ── Apply match ───────────────────────────────────────────────────────────

  async function applyMatch(walletTxId: string, invoiceId: string) {
    const { error: err } = await appwriteDb
      .from('wallet_transactions')
      .update(walletTxId, { reconciliation_status: 'reconciled', matched_invoice_id: invoiceId });

    if (err) { error.value = err.message; return false; }

    const idx = transactions.value.findIndex(t => t.id === walletTxId);
    if (idx !== -1) {
      transactions.value[idx] = { ...transactions.value[idx]!, reconciliation_status: 'reconciled', matched_invoice_id: invoiceId };
    }
    suggestions.value = suggestions.value.filter(s => s.wallet_tx_id !== walletTxId);
    return true;
  }

  // ── Exclude / undo ────────────────────────────────────────────────────────

  async function excludeTx(walletTxId: string) {
    await appwriteDb
      .from('wallet_transactions')
      .update(walletTxId, { reconciliation_status: 'excluded' });
    const idx = transactions.value.findIndex(t => t.id === walletTxId);
    if (idx !== -1) transactions.value[idx] = { ...transactions.value[idx]!, reconciliation_status: 'excluded' };
  }

  async function undoMatch(walletTxId: string) {
    await appwriteDb
      .from('wallet_transactions')
      .update(walletTxId, { reconciliation_status: 'unreconciled', matched_invoice_id: null });
    const idx = transactions.value.findIndex(t => t.id === walletTxId);
    if (idx !== -1) transactions.value[idx] = { ...transactions.value[idx]!, reconciliation_status: 'unreconciled', matched_invoice_id: null };
  }

  return {
    transactions, suggestions, loading, aiLoading, error, stats,
    unreconciledTxs, lastAiModel,
    loadTransactions, getAiSuggestions, applyMatch, excludeTx, undoMatch,
  };
}
