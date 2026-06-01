// =============================================================================
// WIMRUX® FINANCES — Ordres de virement
// CRUD + workflow de statut : draft → approved → sent → executed/failed/cancelled
// =============================================================================
import { ref } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import type { WireTransfer, WireTransferStatus } from 'src/types';

export function useWireTransfers() {
  const transfers   = ref<WireTransfer[]>([]);
  const loading     = ref(false);
  const error       = ref<string | null>(null);
  const companyStore = useCompanyStore();

  // ---------------------------------------------------------------------------
  // LISTE
  // ---------------------------------------------------------------------------
  async function loadTransfers(filters?: {
    status?: WireTransferStatus | WireTransferStatus[];
    source_bank_account_id?: string;
    date_from?: string;
    date_to?: string;
  }) {
    loading.value = true;
    error.value   = null;
    try {
      let q = insforge.database
        .from('wire_transfers')
        .select('*')
        .eq('company_id', companyStore.company!.id)
        .order('created_at', { ascending: false });

      if (filters?.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        q = q.in('status', statuses);
      }
      if (filters?.source_bank_account_id) {
        q = q.eq('source_bank_account_id', filters.source_bank_account_id);
      }
      if (filters?.date_from) q = q.gte('scheduled_date', filters.date_from);
      if (filters?.date_to)   q = q.lte('scheduled_date', filters.date_to);

      const { data, error: err } = await q;
      if (err) { error.value = err.message; return; }
      transfers.value = data || [];
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // CRÉER
  // ---------------------------------------------------------------------------
  async function createTransfer(payload: Omit<WireTransfer, 'id' | 'company_id' | 'status' | 'created_at' | 'approved_by' | 'approved_at' | 'sepa_xml_generated_at' | 'executed_date'>) {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await insforge.database
        .from('wire_transfers')
        .insert([{ ...payload, company_id: companyStore.company!.id, status: 'draft' }])
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) transfers.value.unshift(data);
      return data;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // METTRE À JOUR
  // ---------------------------------------------------------------------------
  async function updateTransfer(id: string, payload: Partial<WireTransfer>) {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await insforge.database
        .from('wire_transfers')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyStore.company!.id)
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) {
        const idx = transfers.value.findIndex(t => t.id === id);
        if (idx !== -1) transfers.value[idx] = data;
      }
      return data;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // WORKFLOW : transition de statut
  // ---------------------------------------------------------------------------
  async function approveTransfer(id: string, approvedBy: string) {
    return updateTransfer(id, {
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    });
  }

  async function markAsSent(id: string) {
    return updateTransfer(id, { status: 'sent' });
  }

  async function markAsExecuted(id: string) {
    return updateTransfer(id, {
      status: 'executed',
      executed_date: new Date().toISOString().split('T')[0] ?? null,
    } as Partial<WireTransfer>);
  }

  async function markAsFailed(id: string) {
    return updateTransfer(id, { status: 'failed' });
  }

  async function cancelTransfer(id: string) {
    return updateTransfer(id, { status: 'cancelled' });
  }

  // ---------------------------------------------------------------------------
  // SUPPRIMER (brouillons uniquement)
  // ---------------------------------------------------------------------------
  async function deleteTransfer(id: string) {
    loading.value = true;
    error.value   = null;
    try {
      const { error: err } = await insforge.database
        .from('wire_transfers')
        .delete()
        .eq('id', id)
        .eq('company_id', companyStore.company!.id)
        .eq('status', 'draft');
      if (err) { error.value = err.message; return false; }
      transfers.value = transfers.value.filter(t => t.id !== id);
      return true;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // GÉNÉRATION RÉFÉRENCE
  // ---------------------------------------------------------------------------
  function generateReference(): string {
    const now = new Date();
    const ymd = now.toISOString().replace(/[-T:Z.]/g, '').substring(0, 14);
    return `VIR-${ymd}`;
  }

  return {
    transfers,
    loading,
    error,
    loadTransfers,
    createTransfer,
    updateTransfer,
    approveTransfer,
    markAsSent,
    markAsExecuted,
    markAsFailed,
    cancelTransfer,
    deleteTransfer,
    generateReference,
  };
}
