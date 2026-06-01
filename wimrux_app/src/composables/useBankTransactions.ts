import { ref } from 'vue';
import { insforge } from 'src/boot/insforge';
import type { BankTransaction, ReconciliationStatus } from 'src/types';

export interface TransactionFilter {
  accountId?: string | undefined;
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  direction?: 'debit' | 'credit' | null | undefined;
  reconciliation_status?: ReconciliationStatus | null | undefined;
  categoryId?: string | null | undefined;
  search?: string | undefined;
}

export function useBankTransactions() {
  const transactions = ref<BankTransaction[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const totalDebit = ref(0);
  const totalCredit = ref(0);

  async function loadTransactions(filter: TransactionFilter = {}) {
    loading.value = true;
    error.value = null;
    try {
      let query = insforge.database
        .from('bank_transactions')
        .select('*, category:transaction_categories(id, name, color, type)')
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filter.accountId) query = query.eq('bank_account_id', filter.accountId);
      if (filter.dateFrom) query = query.gte('transaction_date', filter.dateFrom);
      if (filter.dateTo) query = query.lte('transaction_date', filter.dateTo);
      if (filter.direction) query = query.eq('direction', filter.direction);
      if (filter.reconciliation_status) query = query.eq('reconciliation_status', filter.reconciliation_status);
      if (filter.categoryId) query = query.eq('category_id', filter.categoryId);
      if (filter.search) query = query.ilike('label', `%${filter.search}%`);

      const { data, error: err } = await query;
      if (err) { error.value = err.message; return; }
      transactions.value = (data || []) as BankTransaction[];

      totalDebit.value = transactions.value
        .filter(t => t.direction === 'debit')
        .reduce((s, t) => s + Math.abs(t.amount), 0);
      totalCredit.value = transactions.value
        .filter(t => t.direction === 'credit')
        .reduce((s, t) => s + Math.abs(t.amount), 0);
    } finally {
      loading.value = false;
    }
  }

  async function addTransaction(payload: Omit<BankTransaction, 'id' | 'created_at'>) {
    const { data, error: err } = await insforge.database
      .from('bank_transactions')
      .insert([payload])
      .select('*, category:transaction_categories(id, name, color, type)')
      .single();
    if (err) throw new Error(err.message);
    const created = data as BankTransaction;
    transactions.value.unshift(created);
    return created;
  }

  async function updateReconciliation(
    id: string,
    status: ReconciliationStatus,
    matchedInvoiceId?: string | null,
    matchedMovementId?: string | null
  ) {
    const { data, error: err } = await insforge.database
      .from('bank_transactions')
      .update({
        reconciliation_status: status,
        ...(matchedInvoiceId !== undefined ? { matched_invoice_id: matchedInvoiceId } : {}),
        ...(matchedMovementId !== undefined ? { matched_movement_id: matchedMovementId } : {}),
      })
      .eq('id', id)
      .select()
      .single();
    if (err) throw new Error(err.message);
    const updated = data as BankTransaction;
    const idx = transactions.value.findIndex(t => t.id === id);
    if (idx !== -1) transactions.value[idx] = { ...transactions.value[idx], ...updated };
    return updated;
  }

  async function assignCategory(id: string, categoryId: string | null) {
    const { data, error: err } = await insforge.database
      .from('bank_transactions')
      .update({ category_id: categoryId })
      .eq('id', id)
      .select('*, category:transaction_categories(id, name, color, type)')
      .single();
    if (err) throw new Error(err.message);
    const updated = data as BankTransaction;
    const idx = transactions.value.findIndex(t => t.id === id);
    if (idx !== -1) transactions.value[idx] = updated;
    return updated;
  }

  async function deleteTransaction(id: string) {
    const { error: err } = await insforge.database
      .from('bank_transactions')
      .delete()
      .eq('id', id);
    if (err) throw new Error(err.message);
    transactions.value = transactions.value.filter(t => t.id !== id);
  }

  async function runAutoReconcile(bankAccountId: string) {
    const { data, error: err } = await insforge.database
      .rpc('auto_reconcile', { p_bank_account_id: bankAccountId });
    if (err) throw new Error(err.message);
    return data as { transaction_id: string; match_type: string; match_id: string; score: number; match_label: string }[];
  }

  return {
    transactions,
    loading,
    error,
    totalDebit,
    totalCredit,
    loadTransactions,
    addTransaction,
    updateReconciliation,
    assignCategory,
    deleteTransaction,
    runAutoReconcile,
  };
}
