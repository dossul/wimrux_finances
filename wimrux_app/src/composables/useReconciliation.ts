// =============================================================================
// WIMRUX® FINANCES — Rapprochement bancaire
// - Auto-match via RPC auto_reconcile() (SQL levenshtein)
// - Rapprochement manuel (drag & drop)
// - Undo (retour unreconciled)
// - CRUD règles utilisateur (reconciliation_rules)
// =============================================================================
import { ref } from 'vue';
import { useCompanyStore } from 'src/stores/company-store';
import type { AutoReconcileResult, ReconciliationRule, BankTransaction } from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';

export interface ReconciliationSuggestion extends AutoReconcileResult {
  transaction?: BankTransaction;
  applied: boolean;
}

export function useReconciliation() {
  const suggestions    = ref<ReconciliationSuggestion[]>([]);
  const rules          = ref<ReconciliationRule[]>([]);
  const loading        = ref(false);
  const loadingRules   = ref(false);
  const error          = ref<string | null>(null);

  // ---------------------------------------------------------------------------
  // AUTO-MATCH via RPC
  // ---------------------------------------------------------------------------
  async function runAutoMatch(bankAccountId: string): Promise<ReconciliationSuggestion[]> {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await appwriteDb
        .rpc('auto_reconcile', { p_bank_account_id: bankAccountId });
      if (err) { error.value = err.message; return []; }

      const raw = (data || []) as AutoReconcileResult[];
      // Dédoublonner : garder le meilleur score par transaction_id
      const best = new Map<string, AutoReconcileResult>();
      for (const r of raw) {
        const existing = best.get(r.transaction_id);
        if (!existing || r.score > existing.score) best.set(r.transaction_id, r);
      }

      suggestions.value = Array.from(best.values()).map(s => ({ ...s, applied: false }));
      return suggestions.value;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // APPLIQUER un match (manuel ou auto)
  // ---------------------------------------------------------------------------
  async function applyMatch(
    transactionId: string,
    matchedInvoiceId: string | null,
    matchedMovementId: string | null = null,
  ) {
    const { data, error: err } = await appwriteDb
      .from('bank_transactions')
      .update(transactionId, {
        reconciliation_status: 'matched',
        matched_invoice_id: matchedInvoiceId,
        matched_movement_id: matchedMovementId,
      });
    if (err) throw new Error(err.message);

    // Marquer la suggestion comme appliquée
    const idx = suggestions.value.findIndex(s => s.transaction_id === transactionId);
    if (idx !== -1) suggestions.value[idx]!.applied = true;

    return data as BankTransaction;
  }

  // ---------------------------------------------------------------------------
  // IGNORER une transaction (ne pas rapprocher)
  // ---------------------------------------------------------------------------
  async function ignoreTransaction(transactionId: string) {
    const { error: err } = await appwriteDb
      .from('bank_transactions')
      .update(transactionId, { reconciliation_status: 'ignored' });
    if (err) throw new Error(err.message);
    suggestions.value = suggestions.value.filter(s => s.transaction_id !== transactionId);
  }

  // ---------------------------------------------------------------------------
  // UNDO : retour unreconciled
  // ---------------------------------------------------------------------------
  async function undoMatch(transactionId: string) {
    const { error: err } = await appwriteDb
      .from('bank_transactions')
      .update(transactionId, {
        reconciliation_status: 'unreconciled',
        matched_invoice_id: null,
        matched_movement_id: null,
      });
    if (err) throw new Error(err.message);
  }

  // ---------------------------------------------------------------------------
  // CHARGER les transactions non rapprochées d'un compte
  // ---------------------------------------------------------------------------
  async function loadUnreconciled(bankAccountId: string): Promise<BankTransaction[]> {
    const { data, error: err } = await appwriteDb
      .from('bank_transactions')
      .select('*, category:transaction_categories(id, name, color, type)')
      .eq('bank_account_id', bankAccountId)
      .eq('reconciliation_status', 'unreconciled')
      .order('transaction_date', { ascending: false });
    if (err) { error.value = err.message; return []; }
    return (data || []) as BankTransaction[];
  }

  // ---------------------------------------------------------------------------
  // RÈGLES UTILISATEUR — CRUD
  // ---------------------------------------------------------------------------
  async function loadRules() {
    loadingRules.value = true;
    try {
      const { data, error: err } = await appwriteDb
        .from('reconciliation_rules')
        .select('*')
        .order('priority', { ascending: true })
        .order('created_at', { ascending: true });
      if (err) { error.value = err.message; return; }
      rules.value = (data || []) as ReconciliationRule[];
    } finally {
      loadingRules.value = false;
    }
  }

  async function createRule(payload: Omit<ReconciliationRule, 'id' | 'created_at' | 'company_id'>) {
    const companyId = useCompanyStore().companyId;
    const { data, error: err } = await appwriteDb
      .from('reconciliation_rules')
      .insert([{ ...payload, company_id: companyId }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
    if (err) throw new Error(err.message);
    const created = data as ReconciliationRule;
    rules.value.push(created);
    rules.value.sort((a, b) => a.priority - b.priority);
    return created;
  }

  async function updateRule(id: string, updates: Partial<ReconciliationRule>) {
    const { data, error: err } = await appwriteDb
      .from('reconciliation_rules')
      .update(id, updates);
    if (err) throw new Error(err.message);
    const updated = data as ReconciliationRule;
    const idx = rules.value.findIndex(r => r.id === id);
    if (idx !== -1) rules.value[idx] = updated;
    return updated;
  }

  async function deleteRule(id: string) {
    const { error: err } = await appwriteDb
      .from('reconciliation_rules')
      .delete()
      .eq('id', id);
    if (err) throw new Error(err.message);
    rules.value = rules.value.filter(r => r.id !== id);
  }

  async function toggleRule(id: string, is_active: boolean) {
    return updateRule(id, { is_active });
  }

  // ---------------------------------------------------------------------------
  // UTILITAIRES SCORING (client-side pour affichage)
  // ---------------------------------------------------------------------------
  function scoreColor(score: number): string {
    if (score >= 90) return 'positive';
    if (score >= 70) return 'warning';
    return 'negative';
  }

  function scoreLabel(score: number): string {
    if (score === 100) return 'Exact';
    if (score >= 90)   return 'Très fort';
    if (score >= 70)   return 'Fort';
    if (score >= 50)   return 'Moyen';
    return 'Faible';
  }

  function matchTypeLabel(type: AutoReconcileResult['match_type']): string {
    if (type === 'exact_reference') return 'Réf. exacte';
    if (type === 'amount_date_name') return 'Montant + date + client';
    return 'Règle utilisateur';
  }

  function matchTypeIcon(type: AutoReconcileResult['match_type']): string {
    if (type === 'exact_reference') return 'tag';
    if (type === 'amount_date_name') return 'tune';
    return 'rule';
  }

  return {
    suggestions, rules, loading, loadingRules, error,
    runAutoMatch, applyMatch, ignoreTransaction, undoMatch, loadUnreconciled,
    loadRules, createRule, updateRule, deleteRule, toggleRule,
    scoreColor, scoreLabel, matchTypeLabel, matchTypeIcon,
  };
}
