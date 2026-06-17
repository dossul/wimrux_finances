// =============================================================================
// WIMRUX® FINANCES — Paiements de factures (T3.1)
// Fonctionne pour factures émises (encaissements) et reçues (décaissements)
// =============================================================================
import { ref } from 'vue';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import type { InvoicePayment, InvoicePaymentMethod } from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';

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
      const { data, error: err } = await appwriteDb
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
      const { data, error: err } = await appwriteDb
        .from('invoice_payments')
        .insert(record).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
      if (err) { error.value = err.message; return null; }
      if (data) payments.value.unshift(data);

      // Mise à jour du statut de paiement de la facture
      try {
        const { data: invoice } = await appwriteDb
          .from('invoices')
          .select('*')
          .eq('id', payload.invoice_id)
          .single();
        if (invoice) {
          const totalTtc = Number(invoice.total_ttc) || 0;
          const currentPaid = Number(invoice.paid_amount) || 0;
          const newPaid = currentPaid + Number(payload.amount);
          let paymentStatus: 'unpaid' | 'partial' | 'paid' | 'overpaid' = 'unpaid';
          if (newPaid >= totalTtc) paymentStatus = 'paid';
          else if (newPaid > 0) paymentStatus = 'partial';
          await appwriteDb
            .from('invoices')
            .update(invoice.id, {
              paid_amount: newPaid,
              payment_status: paymentStatus,
            });
        }
      } catch (updateErr) {
        console.error('[useInvoicePayments] Failed to update invoice status:', updateErr);
      }

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
      const { error: err } = await appwriteDb
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
      let q = appwriteDb
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
