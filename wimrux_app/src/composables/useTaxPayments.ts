// =============================================================================
// WIMRUX® FINANCES — Paiements fiscaux / reçus DGI / eSyntas (T2.4 + T2.5)
// Import OCR (PDF/image) ou fichiers eSyntas (CSV/PDF/Excel)
// =============================================================================
import { ref, computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import { TAX_PAYMENT_TYPES, type TaxPaymentCode } from 'src/utils/fiscalCompliance';
import { appwriteDb } from 'src/services/appwrite-db';

export type TaxPaymentSource = 'manual' | 'ocr_pdf' | 'ocr_image' | 'esyntas_csv' | 'esyntas_pdf' | 'esyntas_excel';
export type TaxPaymentStatus = 'pending' | 'validated' | 'rejected';

export interface TaxPayment {
  id: string;
  company_id: string;
  payment_type: TaxPaymentCode;
  reference: string | null;
  fiscal_period: string | null;
  payment_date: string;
  amount: number;
  bank_account_id: string | null;
  bank_transaction_id: string | null;
  source_type: TaxPaymentSource;
  source_file_url: string | null;
  ocr_confidence: Record<string, number> | null;
  ocr_raw_text: string | null;
  dgi_receipt_number: string | null;
  dgi_agent_code: string | null;
  dgi_bureau: string | null;
  notes: string | null;
  status: TaxPaymentStatus;
  validated_by: string | null;
  validated_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FieldMapping {
  source_field: string;
  target_field: string;
  value: string;
  confidence: number;
  needs_review: boolean;
}

export function useTaxPayments() {
  const taxPayments  = ref<TaxPayment[]>([]);
  const loading      = ref(false);
  const error        = ref<string | null>(null);
  const companyStore = useCompanyStore();

  // ---------------------------------------------------------------------------
  // CHARGER
  // ---------------------------------------------------------------------------
  async function loadTaxPayments(filters?: {
    payment_type?: TaxPaymentCode;
    status?: TaxPaymentStatus;
    date_from?: string;
    date_to?: string;
    fiscal_period?: string;
  }) {
    loading.value = true;
    error.value   = null;
    try {
      let q = appwriteDb
        .from('tax_payments')
        .select('*')
        .eq('company_id', companyStore.company!.id)
        .order('payment_date', { ascending: false });

      if (filters?.payment_type)  q = q.eq('payment_type',  filters.payment_type);
      if (filters?.status)        q = q.eq('status',        filters.status);
      if (filters?.fiscal_period) q = q.eq('fiscal_period', filters.fiscal_period);
      if (filters?.date_from)     q = q.gte('payment_date', filters.date_from);
      if (filters?.date_to)       q = q.lte('payment_date', filters.date_to);

      const { data, error: err } = await q;
      if (err) { error.value = err.message; return; }
      taxPayments.value = data || [];
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // CRÉER manuellement
  // ---------------------------------------------------------------------------
  async function createTaxPayment(
    payload: Omit<TaxPayment, 'id' | 'company_id' | 'status' | 'validated_by' | 'validated_at' | 'created_at' | 'updated_at'>
  ) {
    loading.value = true;
    error.value   = null;
    try {
      // Guard doublon : même quittance + même date + même montant
      if (payload.dgi_receipt_number) {
        const { data: existing } = await appwriteDb
          .from('tax_payments')
          .select('id')
          .eq('company_id', companyStore.company!.id)
          .eq('dgi_receipt_number', payload.dgi_receipt_number)
          .eq('payment_date', payload.payment_date)
          .limit(1)
          .single();
        if (existing) {
          error.value = `Doublon : un paiement avec la quittance ${payload.dgi_receipt_number} existe déjà pour cette date.`;
          return null;
        }
      }
      const { data, error: err } = await appwriteDb
        .from('tax_payments')
        .insert([{ ...payload, company_id: companyStore.company!.id, status: 'pending' }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
      if (err) { error.value = err.message; return null; }
      if (data) taxPayments.value.unshift(data);
      return data;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // METTRE À JOUR (post-révision manuelle des champs OCR)
  // ---------------------------------------------------------------------------
  async function updateTaxPayment(id: string, payload: Partial<TaxPayment>) {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await appwriteDb
        .from('tax_payments')
        .update(id, { ...payload, updated_at: new Date().toISOString() })
      if (err) { error.value = err.message; return null; }
      if (data) {
        const idx = taxPayments.value.findIndex(t => t.id === id);
        if (idx !== -1) taxPayments.value[idx] = data;
      }
      return data;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // SUPPRIMER (uniquement si statut pending)
  // ---------------------------------------------------------------------------
  async function deleteTaxPayment(id: string): Promise<boolean> {
    const target = taxPayments.value.find(t => t.id === id);
    if (target && target.status !== 'pending') {
      error.value = 'Seuls les paiements en attente peuvent être supprimés.';
      return false;
    }
    loading.value = true;
    error.value   = null;
    try {
      const { error: err } = await appwriteDb
        .from('tax_payments')
        .delete()
        .eq('id', id)
        .eq('company_id', companyStore.company!.id);
      if (err) { error.value = err.message; return false; }
      taxPayments.value = taxPayments.value.filter(t => t.id !== id);
      return true;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // VALIDER / REJETER
  // ---------------------------------------------------------------------------
  async function validateTaxPayment(id: string, validatedBy: string) {
    return updateTaxPayment(id, {
      status: 'validated',
      validated_by: validatedBy,
      validated_at: new Date().toISOString(),
    });
  }
  async function rejectTaxPayment(id: string, notes: string) {
    return updateTaxPayment(id, { status: 'rejected', notes });
  }

  // ---------------------------------------------------------------------------
  // PARSE CSV eSyntas (format inconnu → détection automatique des colonnes)
  // Retourne des FieldMappings pour révision avant import
  // ---------------------------------------------------------------------------
  function parseEsyntasCSV(csvText: string): {
    headers: string[];
    rows: Record<string, string>[];
    suggestedMappings: Record<string, string>;
  } {
    const lines = csvText.trim().split('\n').filter(l => l.trim());
    if (lines.length < 2) return { headers: [], rows: [], suggestedMappings: {} };

    // Détecter le séparateur : ; , \t
    const sep = lines[0]?.includes(';') ? ';' : lines[0]?.includes('\t') ? '\t' : ',';
    const headers = (lines[0] ?? '').split(sep).map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1).map(line => {
      const vals = line.split(sep).map(v => v.trim().replace(/^["']|["']$/g, ''));
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
    });

    // Heuristiques de mapping basées sur les noms de colonnes
    const suggestedMappings: Record<string, string> = {};
    const FIELD_HINTS: Record<string, string[]> = {
      payment_date:        ['date', 'date_paiement', 'date paiement', 'date_versement', 'datepay'],
      amount:              ['montant', 'amount', 'somme', 'valeur', 'net'],
      reference:           ['ref', 'référence', 'numero', 'numéro', 'n°', 'receipt'],
      dgi_receipt_number:  ['quittance', 'bordereau', 'recu', 'reçu', 'receipt_no'],
      dgi_bureau:          ['bureau', 'centre', 'service'],
      fiscal_period:       ['periode', 'période', 'mois', 'exercice', 'annee'],
      payment_type:        ['type', 'nature', 'rubrique', 'impot', 'impôt', 'taxe'],
      dgi_agent_code:      ['agent', 'code_agent', 'percepteur'],
    };
    for (const header of headers) {
      const normalized = header.toLowerCase().replace(/[\s_-]/g, '');
      for (const [targetField, hints] of Object.entries(FIELD_HINTS)) {
        if (hints.some(h => normalized.includes(h.replace(/[\s_-]/g, '')))) {
          if (!suggestedMappings[targetField]) {
            suggestedMappings[targetField] = header;
          }
        }
      }
    }

    return { headers, rows, suggestedMappings };
  }

  // ---------------------------------------------------------------------------
  // SAUVEGARDER le mapping eSyntas appris (pour réutilisation)
  // ---------------------------------------------------------------------------
  async function saveEsyntasMapping(
    sourceFormat: 'csv' | 'excel' | 'pdf',
    mappings: Array<{ source_field: string; target_field: string; transform_rule?: string }>
  ) {
    for (const m of mappings) {
      await appwriteDb
        .from('esyntas_field_mappings')
        .upsert([{
          company_id: companyStore.company!.id,
          source_format: sourceFormat,
          source_field: m.source_field,
          target_field: m.target_field,
          transform_rule: m.transform_rule ?? null,
        }]);
    }
  }

  async function loadSavedMappings(sourceFormat: 'csv' | 'excel' | 'pdf') {
    const { data } = await appwriteDb
      .from('esyntas_field_mappings')
      .select('*')
      .eq('company_id', companyStore.company!.id)
      .eq('source_format', sourceFormat)
      .order('usage_count', { ascending: false });
    return data ?? [];
  }

  // ---------------------------------------------------------------------------
  // IMPORTER en masse depuis les lignes eSyntas parsées
  // ---------------------------------------------------------------------------
  async function bulkImportFromEsyntas(
    rows: Record<string, string>[],
    fieldMap: Record<string, string>,  // { target_field: source_column }
    source: TaxPaymentSource
  ): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    const records: Partial<TaxPayment>[] = [];

    for (const row of rows) {
      try {
        const get = (target: string) => row[fieldMap[target] ?? ''] ?? null;
        const amtStr = get('amount')?.replace(/[\s,]/g, '.').replace(/[^\d.]/g, '') ?? '';
        const amt = parseFloat(amtStr);
        if (isNaN(amt) || amt <= 0) { errors.push(`Montant invalide : ${get('amount')}`); continue; }

        records.push({
          company_id:         companyStore.company!.id,
          payment_type:       (get('payment_type') ?? 'autre_fiscal') as TaxPaymentCode,
          reference:          get('reference'),
          fiscal_period:      get('fiscal_period'),
          payment_date:       get('payment_date') ?? new Date().toISOString().split('T')[0] ?? '',
          amount:             amt,
          source_type:        source,
          dgi_receipt_number: get('dgi_receipt_number'),
          dgi_bureau:         get('dgi_bureau'),
          dgi_agent_code:     get('dgi_agent_code'),
          status:             'pending',
        });
      } catch {
        errors.push(`Erreur ligne : ${JSON.stringify(row)}`);
      }
    }

    if (records.length > 0) {
      const { error: err } = await appwriteDb
        .from('tax_payments')
        .insert(records as Record<string, unknown>[]);
      if (err) { errors.push(err.message); return { imported: 0, errors }; }
      await loadTaxPayments();
    }

    return { imported: records.length, errors };
  }

  // ---------------------------------------------------------------------------
  // STATS
  // ---------------------------------------------------------------------------
  const stats = computed(() => {
    const totalPaid      = taxPayments.value.reduce((s, t) => s + Number(t.amount), 0);
    const pending        = taxPayments.value.filter(t => t.status === 'pending').length;
    const byType         = TAX_PAYMENT_TYPES.map(type => ({
      ...type,
      total: taxPayments.value
        .filter(t => t.payment_type === type.code)
        .reduce((s, t) => s + Number(t.amount), 0),
    })).filter(t => t.total > 0);
    return { totalPaid, pending, byType };
  });

  return {
    taxPayments,
    loading,
    error,
    stats,
    taxPaymentTypes: TAX_PAYMENT_TYPES,
    loadTaxPayments,
    createTaxPayment,
    updateTaxPayment,
    validateTaxPayment,
    rejectTaxPayment,
    deleteTaxPayment,
    parseEsyntasCSV,
    saveEsyntasMapping,
    loadSavedMappings,
    bulkImportFromEsyntas,
  };
}
