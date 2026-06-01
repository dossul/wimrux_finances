// =============================================================================
// WIMRUX FINANCES - Factures recues (fournisseurs)
// Schéma BD réel exploré via InsForge SDK CLI (58 colonnes)
// direction = 'received', type = 'FT' OBLIGATOIRE (CHECK constraint: FV,FT,FA,EV,ET,EA,PF)
// =============================================================================
import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import { useAuthStore } from 'src/stores/auth-store';
import type { InvoicePaymentStatus, FiscalComplianceStatus } from 'src/types';

// Toutes les colonnes reelles de la table invoices
export interface ReceivedInvoice {
  // Cles primaires
  id:         string;
  company_id: string;

  // Champs NOT NULL obligatoires (schema BD reel)
  type:          string;   // 'FT' = Facture Tiers (recue fournisseur) — CHECK: FV,FT,FA,EV,ET,EA,PF
  price_mode:    string;   // 'TTC' | 'HT'
  direction:     'received';
  operator_name: string | null;

  // Identification facture
  reference:               string;
  status:                  string;
  supplier_id:             string | null;
  supplier_invoice_number: string | null;

  // Montants (tous presents dans le schema)
  total_ht:      number;
  total_tva:     number;
  total_psvb:    number;   // Prelevement special vehicules/biens
  total_ttc:     number;
  stamp_duty:    number;   // Droit de timbre
  total_payment: number;

  // Dates
  due_date:    string | null;
  received_at: string | null;
  received_by: string | null;
  created_at:  string;

  // Paiement
  payment_terms_days: number | null;
  payment_status:     InvoicePaymentStatus;
  paid_amount:        number;

  // OCR et Documents
  ocr_source_url: string | null;
  ocr_confidence: Record<string, number> | null;
  scan_url:       string | null;

  // Conformite fiscale
  fiscal_compliance_status: FiscalComplianceStatus;
  fiscal_compliance_notes:  string | null;
  ifu_verified:             boolean;
  ifu_verified_at:          string | null;

  // Description et notes complementaires (JSONB)
  description: string | null;
  comments:    { label: string; content: string }[] | null;

  // Jointure — nom retourné par PostgREST = nom de la table liée
  suppliers?: {
    id:      string;
    name:    string;
    ifu:     string | null;
    rccm:    string | null;
    phone:   string | null;
    email:   string | null;
    address: string | null;
  };
}

export function useReceivedInvoices() {
  const invoices     = ref<ReceivedInvoice[]>([]);
  const loading      = ref(false);
  const error        = ref<string | null>(null);
  const companyStore = useCompanyStore();
  const authStore    = useAuthStore();

  // ---------------------------------------------------------------------------
  // CHARGER
  // ---------------------------------------------------------------------------
  async function loadInvoices(filters?: {
    payment_status?: InvoicePaymentStatus;
    fiscal_compliance_status?: FiscalComplianceStatus;
    supplier_id?: string;
    date_from?: string;
    date_to?: string;
  }) {
    loading.value = true;
    error.value   = null;
    try {
      let q = insforge.database
        .from('invoices')
        .select('*, suppliers(id, name, ifu, rccm, phone, email, address)')
        .eq('company_id', companyStore.company!.id)
        .eq('direction', 'received')
        .order('created_at', { ascending: false });


      if (filters?.payment_status)            q = q.eq('payment_status', filters.payment_status);
      if (filters?.fiscal_compliance_status)  q = q.eq('fiscal_compliance_status', filters.fiscal_compliance_status);
      if (filters?.supplier_id)               q = q.eq('supplier_id', filters.supplier_id);
      if (filters?.date_from)                 q = q.gte('received_at', filters.date_from);
      if (filters?.date_to)                   q = q.lte('received_at', filters.date_to);

      const { data, error: err } = await q;
      if (err) { error.value = err.message; return; }
      invoices.value = (data || []) as ReceivedInvoice[];
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // CREER — type='FR' et price_mode obligatoires (NOT NULL)
  // ---------------------------------------------------------------------------
  async function createInvoice(payload: Partial<ReceivedInvoice>) {
    loading.value = true;
    error.value   = null;
    try {
      const operatorName = authStore.user?.email ?? 'Utilisateur';
      const { data, error: err } = await insforge.database
        .from('invoices')
        .insert([{
          ...payload,
          // Champs NOT NULL — toujours fournir
          company_id:               companyStore.company!.id,
          type:                     payload.type ?? 'FT',    // Types DGI: FV,FT,FA,EV,ET,EA,PF
          direction:                'received',
          price_mode:               payload.price_mode ?? 'TTC',
          operator_name:            operatorName,
          status:                   payload.status ?? 'draft',
          reference:                payload.reference ?? `FR-${Date.now().toString(36).toUpperCase()}`,
          // Montants
          total_ht:                 Number(payload.total_ht)    || 0,
          total_tva:                Number(payload.total_tva)   || 0,
          total_psvb:               Number(payload.total_psvb)  || 0,
          total_ttc:                Number(payload.total_ttc)   || 0,
          stamp_duty:               Number(payload.stamp_duty)  || 0,
          total_payment:            0,
          // Paiement
          payment_status:           'unpaid',
          paid_amount:              0,
          payment_terms_days:       payload.payment_terms_days ?? 30,
          // Fiscalite
          ifu_verified:             payload.ifu_verified ?? false,
          fiscal_compliance_status: payload.fiscal_compliance_status ?? 'pending',
          // Dates
          received_at:              payload.received_at ?? new Date().toISOString(),
          // Notes (tableau JSONB)
          comments:                 payload.comments ?? [],
        }])
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) invoices.value.unshift(data as ReceivedInvoice);
      return data;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // METTRE A JOUR
  // ---------------------------------------------------------------------------
  async function updateInvoice(id: string, payload: Partial<ReceivedInvoice>) {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await insforge.database
        .from('invoices')
        .update(payload)
        .eq('id', id)
        .eq('company_id', companyStore.company!.id)
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) {
        const idx = invoices.value.findIndex(i => i.id === id);
        if (idx !== -1) invoices.value[idx] = data as ReceivedInvoice;
      }
      return data;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // VALIDER / REJETER
  // ---------------------------------------------------------------------------
  async function validateInvoice(id: string) {
    return updateInvoice(id, { status: 'validated', fiscal_compliance_status: 'valid' } as Partial<ReceivedInvoice>);
  }
  async function rejectInvoice(id: string, reason: string) {
    return updateInvoice(id, { status: 'cancelled', fiscal_compliance_notes: reason } as Partial<ReceivedInvoice>);
  }

  // ---------------------------------------------------------------------------
  // ANNULER (sans supprimer) — facture reste dans le système avec statut 'cancelled'
  // ---------------------------------------------------------------------------
  async function cancelInvoice(id: string) {
    return updateInvoice(id, { status: 'cancelled' } as Partial<ReceivedInvoice>);
  }

  // ---------------------------------------------------------------------------
  // SUPPRIMER — uniquement si aucun paiement enregistré
  // ---------------------------------------------------------------------------
  async function deleteInvoice(id: string): Promise<boolean> {
    loading.value = true;
    error.value   = null;
    try {
      const { error: err } = await insforge.database
        .from('invoices')
        .delete()
        .eq('id', id)
        .eq('company_id', companyStore.company!.id);
      if (err) { error.value = err.message; return false; }
      invoices.value = invoices.value.filter(i => i.id !== id);
      return true;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // STATS
  // ---------------------------------------------------------------------------
  const stats = computed(() => {
    // Exclure les factures annulées des KPI encours
    const active  = invoices.value.filter(i => i.status !== 'cancelled');
    const total   = active.length;
    const unpaid  = active.filter(i => i.payment_status === 'unpaid').length;
    const partial = active.filter(i => i.payment_status === 'partial').length;
    const overdue = active.filter(i => {
      if (!i.due_date || i.payment_status === 'paid') return false;
      return new Date(i.due_date) < new Date();
    }).length;
    const totalAmount    = active.reduce((s, i) => s + Number(i.total_ttc), 0);
    const outstandingAmt = active
      .filter(i => i.payment_status !== 'paid')
      .reduce((s, i) => s + (Number(i.total_ttc) - Number(i.paid_amount)), 0);
    const partialAmt = active
      .filter(i => i.payment_status === 'partial')
      .reduce((s, i) => s + (Number(i.total_ttc) - Number(i.paid_amount)), 0);
    const partialPct = active
      .filter(i => i.payment_status === 'partial' && Number(i.total_ttc) > 0)
      .reduce((acc, i) => {
        acc.paid  += Number(i.paid_amount);
        acc.total += Number(i.total_ttc);
        return acc;
      }, { paid: 0, total: 0 });
    const partialRate = partialPct.total > 0
      ? Math.round(partialPct.paid / partialPct.total * 100) : 0;
    return { total, unpaid, partial, overdue, totalAmount, outstandingAmt, partialAmt, partialRate };
  });

  return {
    invoices,
    loading,
    error,
    stats,
    loadInvoices,
    createInvoice,
    updateInvoice,
    validateInvoice,
    rejectInvoice,
    cancelInvoice,
    deleteInvoice,
  };
}
