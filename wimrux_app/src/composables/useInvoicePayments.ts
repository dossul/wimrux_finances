// =============================================================================
// WIMRUX® FINANCES — Paiements de factures (T3.1)
// Fonctionne pour factures émises (encaissements) et reçues (décaissements)
// =============================================================================
import { ref } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import type { InvoicePayment, InvoicePaymentMethod } from 'src/types';

export function useInvoicePayments() {
  const payments     = ref<InvoicePayment[]>([]);
  const loading      = ref(false);
  const error        = ref<string | null>(null);
  const companyStore = useCompanyStore();

  // ---------------------------------------------------------------------------
  // CHARGER les paiements d'une facture
  // ---------------------------------------------------------------------------
  async function loadPayments(invoiceId: string) {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await insforge.database
        .from('invoice_payments')
        .select('*')
        .eq('invoice_id', invoiceId)
        .eq('company_id', companyStore.company!.id)
        .order('payment_date', { ascending: false });
      if (err) { error.value = err.message; return; }
      payments.value = data || [];
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // AJOUTER un paiement
  // ---------------------------------------------------------------------------
  async function addPayment(payload: {
    invoice_id: string;
    payment_date: string;
    amount: number;
    payment_method: InvoicePaymentMethod;
    reference?: string | null;
    bank_account_id?: string | null;
    bank_transaction_id?: string | null;
    notes?: string | null;
    created_by?: string | null;
  }) {
    loading.value = true;
    error.value   = null;
    try {
      const record = { ...payload, company_id: companyStore.company!.id };
      const { data, error: err } = await insforge.database
        .from('invoice_payments')
        .insert(record)
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) payments.value.unshift(data);
      return data;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // SUPPRIMER un paiement
  // ---------------------------------------------------------------------------
  async function deletePayment(id: string) {
    loading.value = true;
    error.value   = null;
    try {
      const { error: err } = await insforge.database
        .from('invoice_payments')
        .delete()
        .eq('id', id)
        .eq('company_id', companyStore.company!.id);
      if (err) { error.value = err.message; return false; }
      payments.value = payments.value.filter(p => p.id !== id);
      return true;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // PAIEMENTS PAR COMPTE (pour rapprochement)
  // ---------------------------------------------------------------------------
  async function loadByAccount(bankAccountId: string, opts?: { date_from?: string; date_to?: string }) {
    loading.value = true;
    error.value   = null;
    try {
      let q = insforge.database
        .from('invoice_payments')
        .select('*, invoices!invoice_payments_invoice_id_fkey(reference, direction, supplier_id, client_id)')
        .eq('company_id', companyStore.company!.id)
        .eq('bank_account_id', bankAccountId)
        .order('payment_date', { ascending: false });
      if (opts?.date_from) q = q.gte('payment_date', opts.date_from);
      if (opts?.date_to)   q = q.lte('payment_date', opts.date_to);
      const { data, error: err } = await q;
      if (err) { error.value = err.message; return; }
      payments.value = (data || []) as InvoicePayment[];
    } finally {
      loading.value = false;
    }
  }

  return {
    payments,
    loading,
    error,
    loadPayments,
    addPayment,
    deletePayment,
    loadByAccount,
  };
}
