// =============================================================================
// WIMRUX FINANCES - Factures recues (fournisseurs)
// Schéma BD réel exploré via Appwrite SDK CLI (58 colonnes)
// direction = 'received', type = 'FT' OBLIGATOIRE (CHECK constraint: FV,FT,FA,EV,ET,EA,PF)
// =============================================================================
import { ref, computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store';
import { useAuthStore } from 'src/stores/auth-store';
import type { InvoicePaymentStatus, FiscalComplianceStatus } from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';

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
  total_ht:               number;
  total_tva:              number;
  total_psvb:             number;   // Prelevement special vehicules/biens
  total_ttc:              number;
  stamp_duty:             number;   // Droit de timbre
  total_payment:          number;
  withholding_tax_rate:   number | null;  // Taux RAS en fraction (0.05 = 5%)
  withholding_tax_amount: number;

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

  // Tracking workflow
  submitted_by?:   string | null;
  submitted_at?:   string | null;
  approved_by?:    string | null;
  approved_at?:    string | null;
  rejected_by?:    string | null;
  rejected_at?:    string | null;
  rejection_reason?: string | null;

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
      let q = appwriteDb
        .from('invoices')
        .eq('company_id', companyStore.company!.id)
        .eq('direction', 'received')
        .order('created_at', { ascending: false });


      if (filters?.payment_status)            q = q.eq('payment_status', filters.payment_status);
      if (filters?.fiscal_compliance_status)  q = q.eq('fiscal_compliance_status', filters.fiscal_compliance_status);
      if (filters?.supplier_id)               q = q.eq('supplier_id', filters.supplier_id);
      if (filters?.date_from)                 q = q.gte('received_at', filters.date_from);
      if (filters?.date_to)                   q = q.lte('received_at', filters.date_to);

      const { data, error: err } = await q.select('*');
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
      const { data, error: err } = await appwriteDb
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
          reference:                payload.reference ?? await generateReference(companyStore.company!.id),
          // Montants
          total_ht:                 Number(payload.total_ht)    || 0,
          total_tva:                Number(payload.total_tva)   || 0,
          total_psvb:               Number(payload.total_psvb)  || 0,
          total_ttc:                Number(payload.total_ttc)   || 0,
          stamp_duty:               Number(payload.stamp_duty)  || 0,
          withholding_tax_rate:     payload.withholding_tax_rate  ?? null,
          withholding_tax_amount:   Number(payload.withholding_tax_amount) || 0,
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
        }]);
      if (err) { error.value = err.message; return null; }
      const inserted = Array.isArray(data) ? data[0] : data;
      if (inserted) invoices.value.unshift(inserted as ReceivedInvoice);
      return inserted;
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
      const { data, error: err } = await appwriteDb
        .from('invoices')
        .update(id, payload);
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
  // VALIDER — draft → pending_validation → approved → validated
  // ---------------------------------------------------------------------------
  async function validateInvoice(id: string) {
    const now = new Date().toISOString();
    const userName = authStore.fullName ?? authStore.user?.email ?? 'Utilisateur';
    return updateInvoice(id, {
      status: 'validated',
      fiscal_compliance_status: 'valid',
      approved_by: userName,
      approved_at: now,
    } as Partial<ReceivedInvoice>);
  }

  // ---------------------------------------------------------------------------
  // SOUMETTRE — draft → pending_validation
  // ---------------------------------------------------------------------------
  async function submitInvoice(id: string) {
    const now = new Date().toISOString();
    const userName = authStore.fullName ?? authStore.user?.email ?? 'Utilisateur';
    return updateInvoice(id, {
      status: 'pending_validation',
      submitted_by: userName,
      submitted_at: now,
    } as Partial<ReceivedInvoice>);
  }

  // ---------------------------------------------------------------------------
  // APPROUVER — pending_validation → approved
  // ---------------------------------------------------------------------------
  async function approveInvoice(id: string) {
    const now = new Date().toISOString();
    const userName = authStore.fullName ?? authStore.user?.email ?? 'Utilisateur';
    return updateInvoice(id, {
      status: 'approved',
      approved_by: userName,
      approved_at: now,
    } as Partial<ReceivedInvoice>);
  }

  // ---------------------------------------------------------------------------
  // REJETER (retour brouillon avec motif)
  // ---------------------------------------------------------------------------
  async function rejectInvoice(id: string, reason: string) {
    const now = new Date().toISOString();
    const userName = authStore.fullName ?? authStore.user?.email ?? 'Utilisateur';
    return updateInvoice(id, {
      status: 'draft',
      rejected_by: userName,
      rejected_at: now,
      rejection_reason: reason,
      approved_by: null,
      approved_at: null,
    } as Partial<ReceivedInvoice>);
  }

  // ---------------------------------------------------------------------------
  // ANNULER (sans supprimer) — reste dans le système avec statut 'cancelled'
  // ---------------------------------------------------------------------------
  async function cancelInvoice(id: string, reason?: string) {
    const now = new Date().toISOString();
    const userName = authStore.fullName ?? authStore.user?.email ?? 'Utilisateur';
    return updateInvoice(id, {
      status: 'cancelled',
      rejected_by: userName,
      rejected_at: now,
      rejection_reason: reason ?? 'Annulée',
    } as Partial<ReceivedInvoice>);
  }

  // ---------------------------------------------------------------------------
  // SUPPRIMER — uniquement si aucun paiement et statut draft
  // ---------------------------------------------------------------------------
  async function deleteInvoice(id: string): Promise<boolean> {
    const target = invoices.value.find(i => i.id === id);
    if (target) {
      if (Number(target.paid_amount) > 0 || target.payment_status !== 'unpaid') {
        error.value = 'Impossible de supprimer une facture avec des paiements enregistrés.';
        return false;
      }
      if (target.status !== 'draft') {
        error.value = 'Seules les factures en brouillon peuvent être supprimées.';
        return false;
      }
    }
    loading.value = true;
    error.value   = null;
    try {
      const { databases, DATABASE_ID } = await import('src/boot/appwrite');
      const { error: err } = await databases.deleteDocument(DATABASE_ID, 'invoices', id)
        .then(() => ({ error: null }), (e: Error) => ({ error: e }));
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
    submitInvoice,
    approveInvoice,
    validateInvoice,
    rejectInvoice,
    cancelInvoice,
    deleteInvoice,
  };
}

// ---------------------------------------------------------------------------
// Générer une référence séquentielle via la RPC next_invoice_reference
// Fallback sur timestamp si la RPC échoue
// ---------------------------------------------------------------------------
async function generateReference(companyId: string): Promise<string> {
  const year = new Date().getFullYear();
  try {
    const { data, error } = await appwriteDb
      .rpc('next_invoice_reference', { p_company_id: companyId, p_type: 'FR', p_year: year });
    if (!error && data) return data as string;
  } catch { /* ignore */ }
  return `FR-${year}-${Date.now().toString(36).toUpperCase()}`;
}
