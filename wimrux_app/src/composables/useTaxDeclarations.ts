// =============================================================================
// WIMRUX® FINANCES — Composable Tax Declarations (T22.x)
// Retenues à la source + déclarations fiscales DGI BF
// =============================================================================
import { ref, computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store';
import { appwriteDb } from 'src/services/appwrite-db';

export interface WithholdingTax {
  id: string;
  company_id: string;
  invoice_id: string | null;
  tax_type: string;
  rate: number;
  base_amount: number;
  tax_amount: number;
  period_month: string;
  status: 'pending' | 'declared' | 'paid';
  declared_at: string | null;
  paid_at: string | null;
  receipt_number: string | null;
  notes: string | null;
  created_at: string;
}

export interface TaxDeclaration {
  id: string;
  company_id: string;
  declaration_type: string;
  period: string;
  total_base: number;
  total_tax: number;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  submitted_at: string | null;
  reference_dgi: string | null;
  pdf_url: string | null;
  notes: string | null;
  created_at: string;
}

export interface TvaMonthly {
  company_id: string;
  period: string;
  tva_collectee: number;
  tva_deductible: number;
  tva_nette: number;
}

export const TAX_TYPES = [
  { value: 'iuts', label: 'IUTS (Impôt Unique sur les Traitements et Salaires)' },
  { value: 'tpa', label: 'TPA (Taxe Patronale d\'Apprentissage)' },
  { value: 'rns', label: 'RNS (Retenue à la source Non Salarié)' },
  { value: 'bnc', label: 'BNC (Bénéfices Non Commerciaux)' },
  { value: 'bic', label: 'BIC (Bénéfices Industriels et Commerciaux)' },
  { value: 'tva', label: 'TVA (Taxe sur la Valeur Ajoutée)' },
] as const;

export const DECLARATION_TYPES = [
  { value: 'tva_mensuelle', label: 'TVA mensuelle' },
  { value: 'iuts_mensuel', label: 'IUTS mensuel' },
  { value: 'tpa_mensuel', label: 'TPA mensuel' },
  { value: 'bnc_annuel', label: 'BNC annuel' },
  { value: 'bic_annuel', label: 'BIC annuel' },
] as const;

export function useTaxDeclarations() {
  const companyStore = useCompanyStore();
  const companyId = computed(() => companyStore.company?.id ?? '');

  const withholdings = ref<WithholdingTax[]>([]);
  const declarations = ref<TaxDeclaration[]>([]);
  const tvaMonthly = ref<TvaMonthly[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ---------------------------------------------------------------------------
  // RETENUES À LA SOURCE
  // ---------------------------------------------------------------------------
  async function loadWithholdings(periodMonth?: string) {
    loading.value = true;
    try {
      let q = appwriteDb.from('withholding_taxes').select('*').eq('company_id', companyId.value);
      if (periodMonth) q = q.eq('period_month', periodMonth);
      const { data, error: err } = await q.order('created_at', { ascending: false });
      if (err) { error.value = err.message; return; }
      withholdings.value = data || [];
    } finally { loading.value = false; }
  }

  async function createWithholding(payload: Omit<WithholdingTax, 'id' | 'company_id' | 'created_at' | 'status' | 'declared_at' | 'paid_at' | 'receipt_number'>) {
    const { data, error: err } = await appwriteDb
      .from('withholding_taxes')
      .insert([{ company_id: companyId.value, ...payload }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
    if (err) { error.value = err.message; return null; }
    if (data) withholdings.value.unshift(data);
    return data as WithholdingTax;
  }

  async function markWithholdingDeclared(id: string) {
    await appwriteDb.from('withholding_taxes')
      .update(id, { status: 'declared', declared_at: new Date().toISOString() });
    const idx = withholdings.value.findIndex(w => w.id === id);
    if (idx !== -1) withholdings.value[idx] = { ...withholdings.value[idx]!, status: 'declared' };
  }

  async function markWithholdingPaid(id: string, receiptNumber: string) {
    await appwriteDb.from('withholding_taxes')
      .update(id, { status: 'paid', paid_at: new Date().toISOString(), receipt_number: receiptNumber });
    const idx = withholdings.value.findIndex(w => w.id === id);
    if (idx !== -1) withholdings.value[idx] = { ...withholdings.value[idx]!, status: 'paid' };
  }

  // ---------------------------------------------------------------------------
  // DÉCLARATIONS
  // ---------------------------------------------------------------------------
  async function loadDeclarations() {
    const { data } = await appwriteDb
      .from('tax_declarations')
      .select('*')
      .eq('company_id', companyId.value)
      .order('period', { ascending: false });
    declarations.value = data || [];
  }

  async function createDeclaration(payload: { declaration_type: string; period: string; total_base?: number; total_tax?: number; notes?: string }) {
    const { data, error: err } = await appwriteDb
      .from('tax_declarations')
      .insert([{ company_id: companyId.value, ...payload }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
    if (err) { error.value = err.message; return null; }
    if (data) declarations.value.unshift(data);
    return data as TaxDeclaration;
  }

  async function submitDeclaration(id: string) {
    await appwriteDb.from('tax_declarations')
      .update(id, { status: 'submitted', submitted_at: new Date().toISOString() });
    const idx = declarations.value.findIndex(d => d.id === id);
    if (idx !== -1) declarations.value[idx] = { ...declarations.value[idx]!, status: 'submitted' };
  }

  // ---------------------------------------------------------------------------
  // TVA MENSUELLE
  // ---------------------------------------------------------------------------
  async function loadTvaMonthly() {
    const { data } = await appwriteDb
      .from('v_tva_monthly')
      .select('*')
      .eq('company_id', companyId.value)
      .order('period', { ascending: false });
    tvaMonthly.value = data || [];
  }

  // ---------------------------------------------------------------------------
  // STATS
  // ---------------------------------------------------------------------------
  const pendingWithholdings = computed(() => withholdings.value.filter(w => w.status === 'pending'));
  const totalPendingTax = computed(() => pendingWithholdings.value.reduce((s, w) => s + Number(w.tax_amount), 0));

  return {
    withholdings, declarations, tvaMonthly, loading, error,
    pendingWithholdings, totalPendingTax,
    loadWithholdings, createWithholding, markWithholdingDeclared, markWithholdingPaid,
    loadDeclarations, createDeclaration, submitDeclaration,
    loadTvaMonthly,
  };
}
