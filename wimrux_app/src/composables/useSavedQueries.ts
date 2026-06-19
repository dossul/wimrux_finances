import { ref, computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import { useAuthStore } from 'src/stores/auth-store-appwrite';
import type {
  SavedQuery, SavedQueryInput, QueryAggregation,
} from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';

// Whitelist of tables that can be queried via the visual builder.
// Keep this conservative for security.
export const QUERY_BUILDER_TABLES = [
  { value: 'invoices', label: 'Factures', companyScoped: true },
  { value: 'clients', label: 'Clients', companyScoped: true },
  { value: 'suppliers', label: 'Fournisseurs', companyScoped: true },
  { value: 'bank_transactions', label: 'Transactions bancaires', companyScoped: true },
  { value: 'treasury_movements', label: 'Mouvements de trésorerie', companyScoped: true },
  { value: 'tax_payments', label: 'Paiements fiscaux', companyScoped: true },
  { value: 'budgets', label: 'Budgets', companyScoped: true },
  { value: 'budget_lines', label: 'Lignes de budget', companyScoped: true },
  { value: 'fixed_assets', label: 'Immobilisations', companyScoped: true },
  { value: 'loans', label: 'Emprunts', companyScoped: true },
  { value: 'investments', label: 'Investissements', companyScoped: true },
  { value: 'petty_cash_movements', label: 'Mouvements petite caisse', companyScoped: true },
  { value: 'mobile_wallet_transactions', label: 'Transactions wallets mobiles', companyScoped: true },
];

/** Known fields per table — used for field picker in UI */
export const TABLE_SCHEMAS: Record<string, { value: string; label: string; type: string }[]> = {
  invoices: [
    { value: 'invoice_number', label: 'N° Facture', type: 'text' },
    { value: 'client_name', label: 'Client', type: 'text' },
    { value: 'issue_date', label: 'Date émission', type: 'date' },
    { value: 'due_date', label: 'Date échéance', type: 'date' },
    { value: 'total_ttc', label: 'Total TTC', type: 'number' },
    { value: 'total_ht', label: 'Total HT', type: 'number' },
    { value: 'tax_amount', label: 'Montant TVA', type: 'number' },
    { value: 'status', label: 'Statut', type: 'text' },
    { value: 'currency', label: 'Devise', type: 'text' },
    { value: 'notes', label: 'Notes', type: 'text' },
  ],
  clients: [
    { value: 'name', label: 'Nom', type: 'text' },
    { value: 'email', label: 'Email', type: 'text' },
    { value: 'phone', label: 'Téléphone', type: 'text' },
    { value: 'ifu', label: 'IFU', type: 'text' },
    { value: 'city', label: 'Ville', type: 'text' },
    { value: 'country', label: 'Pays', type: 'text' },
    { value: 'client_type', label: 'Type', type: 'text' },
    { value: 'created_at', label: 'Date création', type: 'date' },
  ],
  suppliers: [
    { value: 'name', label: 'Nom', type: 'text' },
    { value: 'email', label: 'Email', type: 'text' },
    { value: 'phone', label: 'Téléphone', type: 'text' },
    { value: 'ifu', label: 'IFU', type: 'text' },
    { value: 'city', label: 'Ville', type: 'text' },
  ],
  bank_transactions: [
    { value: 'transaction_date', label: 'Date', type: 'date' },
    { value: 'label', label: 'Libellé', type: 'text' },
    { value: 'amount', label: 'Montant', type: 'number' },
    { value: 'direction', label: 'Sens (debit/credit)', type: 'text' },
    { value: 'balance', label: 'Solde après', type: 'number' },
    { value: 'bank_name', label: 'Banque', type: 'text' },
    { value: 'reference', label: 'Référence', type: 'text' },
  ],
  treasury_movements: [
    { value: 'movement_date', label: 'Date', type: 'date' },
    { value: 'label', label: 'Libellé', type: 'text' },
    { value: 'amount', label: 'Montant', type: 'number' },
    { value: 'type', label: 'Type', type: 'text' },
    { value: 'category', label: 'Catégorie', type: 'text' },
  ],
  tax_payments: [
    { value: 'payment_date', label: 'Date paiement', type: 'date' },
    { value: 'tax_type', label: 'Type taxe', type: 'text' },
    { value: 'amount', label: 'Montant', type: 'number' },
    { value: 'period', label: 'Période', type: 'text' },
    { value: 'status', label: 'Statut', type: 'text' },
  ],
  budgets: [
    { value: 'name', label: 'Nom budget', type: 'text' },
    { value: 'start_date', label: 'Début', type: 'date' },
    { value: 'end_date', label: 'Fin', type: 'date' },
    { value: 'total_budget', label: 'Budget total', type: 'number' },
    { value: 'status', label: 'Statut', type: 'text' },
  ],
  loans: [
    { value: 'lender_name', label: 'Prêteur', type: 'text' },
    { value: 'amount', label: 'Montant', type: 'number' },
    { value: 'interest_rate', label: 'Taux (%)', type: 'number' },
    { value: 'start_date', label: 'Date début', type: 'date' },
    { value: 'end_date', label: 'Date fin', type: 'date' },
    { value: 'remaining_balance', label: 'Solde restant', type: 'number' },
    { value: 'status', label: 'Statut', type: 'text' },
  ],
  investments: [
    { value: 'name', label: 'Investissement', type: 'text' },
    { value: 'amount', label: 'Montant', type: 'number' },
    { value: 'current_value', label: 'Valeur actuelle', type: 'number' },
    { value: 'investment_date', label: 'Date', type: 'date' },
    { value: 'type', label: 'Type', type: 'text' },
  ],
};

export function useSavedQueries() {
  const companyStore = useCompanyStore();
  const authStore = useAuthStore();
  const companyId = computed(() => companyStore.company?.id ?? '');
  const userId = computed(() => authStore.user?.id ?? null);

  const queries = ref<SavedQuery[]>([]);
  const lastResults = ref<Record<string, unknown>[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadQueries(): Promise<void> {
    loading.value = true;
    error.value = null;
    const { data, error: err } = await appwriteDb
      .from('saved_queries')
      .select('*')
      .eq('company_id', companyId.value)
      .order('updated_at', { ascending: false });
    if (err) { error.value = err.message; }
    else { queries.value = (data as SavedQuery[]) || []; }
    loading.value = false;
  }

  async function createQuery(input: SavedQueryInput): Promise<SavedQuery | null> {
    const payload = {
      ...input,
      company_id: companyId.value,
      user_id: userId.value,
      fields: input.fields ?? [],
      filters: input.filters ?? [],
      group_by: input.group_by ?? [],
      order_by: input.order_by ?? [],
      aggregations: input.aggregations ?? [],
    };
    const { data, error: err } = await appwriteDb
      .from('saved_queries')
      .insert([payload]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
    if (err) { error.value = err.message; return null; }
    await loadQueries();
    return data as SavedQuery;
  }

  async function updateQuery(id: string, input: Partial<SavedQueryInput>): Promise<boolean> {
    const { error: err } = await appwriteDb
      .from('saved_queries')
      .update(id, input);
    if (err) { error.value = err.message; return false; }
    await loadQueries();
    return true;
  }

  async function deleteQuery(id: string): Promise<boolean> {
    const { error: err } = await appwriteDb
      .from('saved_queries')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId.value);
    if (err) { error.value = err.message; return false; }
    await loadQueries();
    return true;
  }

  async function toggleFavorite(id: string, isFavorite: boolean): Promise<boolean> {
    return updateQuery(id, { is_favorite: isFavorite });
  }

  /**
   * Execute a saved query (or an ad-hoc one) against Appwrite DB.
   * Note: client-side aggregation/group-by are applied after the SELECT.
   */
  async function runQuery(q: Pick<SavedQuery,
    'source_table' | 'fields' | 'filters' | 'group_by' | 'order_by' | 'aggregations'
  >): Promise<Record<string, unknown>[]> {
    if (!QUERY_BUILDER_TABLES.find(t => t.value === q.source_table)) {
      error.value = `Table non autorisée : ${q.source_table}`;
      return [];
    }

    loading.value = true;
    error.value = null;

    try {
      // Build SELECT: if no fields, group_by, or aggregations → select everything
      const hasFields    = (q.fields        || []).length > 0;
      const hasGroupBy   = (q.group_by      || []).length > 0;
      const hasAggs      = (q.aggregations  || []).length > 0;
      const hasOrderBy   = (q.order_by      || []).length > 0;

      let selectClause: string;
      if (!hasFields && !hasGroupBy && !hasAggs) {
        selectClause = '*';
      } else {
        const selectFields = new Set<string>();
        (q.fields       || []).forEach(f => selectFields.add(f));
        (q.group_by     || []).forEach(f => selectFields.add(f));
        (q.aggregations || []).forEach(a => selectFields.add(a.field));
        if (hasOrderBy) (q.order_by || []).forEach(o => selectFields.add(o.field));
        selectClause = Array.from(selectFields).join(',');
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query: any = appwriteDb
        .from(q.source_table)
        .select(selectClause);

      // Company scope
      const tableInfo = QUERY_BUILDER_TABLES.find(t => t.value === q.source_table);
      if (tableInfo?.companyScoped) {
        query = query.eq('company_id', companyId.value);
      }

      // Filters
      for (const f of q.filters || []) {
        switch (f.operator) {
          case 'eq':       query = query.eq(f.field, f.value); break;
          case 'neq':      query = query.neq(f.field, f.value); break;
          case 'gt':       query = query.gt(f.field, f.value); break;
          case 'gte':      query = query.gte(f.field, f.value); break;
          case 'lt':       query = query.lt(f.field, f.value); break;
          case 'lte':      query = query.lte(f.field, f.value); break;
          case 'like':     query = query.like(f.field, `%${String(f.value ?? '')}%`); break;
          case 'ilike':    query = query.ilike(f.field, `%${String(f.value ?? '')}%`); break;
          case 'in': {
            let arr: (string | number)[];
            if (Array.isArray(f.value)) arr = f.value as (string | number)[];
            else if (typeof f.value === 'string') arr = f.value.split(',').map(s => s.trim()).filter(Boolean);
            else arr = f.value !== null && f.value !== undefined ? [f.value as string | number] : [];
            query = query.in(f.field, arr);
            break;
          }
          case 'is_null':  query = query.is(f.field, null); break;
          case 'not_null': query = query.not(f.field, 'is', null); break;
          case 'between':  query = query.gte(f.field, f.value).lte(f.field, f.value2); break;
        }
      }

      // Server-side ordering (only if not aggregating)
      if ((!q.aggregations || q.aggregations.length === 0) && q.order_by) {
        for (const o of q.order_by) {
          query = query.order(o.field, { ascending: o.direction === 'asc' });
        }
      }

      const { data, error: err } = await query.limit(5000);
      if (err) { error.value = err.message; return []; }

      let rows = (data as unknown as Record<string, unknown>[]) || [];

      // Client-side group_by + aggregations
      if (q.group_by?.length || q.aggregations?.length) {
        rows = aggregateRows(rows, q.group_by || [], q.aggregations || []);

        // Apply ordering after aggregation
        if (q.order_by?.length) {
          rows.sort((a, b) => {
            for (const o of q.order_by) {
              const av = a[o.field];
              const bv = b[o.field];
              if (av === bv) continue;
              const cmp = (av as number | string) > (bv as number | string) ? 1 : -1;
              return o.direction === 'asc' ? cmp : -cmp;
            }
            return 0;
          });
        }
      }

      lastResults.value = rows;
      return rows;
    } finally {
      loading.value = false;
    }
  }

  function aggregateRows(
    rows: Record<string, unknown>[],
    groupBy: string[],
    aggs: QueryAggregation[],
  ): Record<string, unknown>[] {
    if (!groupBy.length) {
      // Single aggregated row
      return [computeAggs(rows, aggs)];
    }
    const buckets = new Map<string, Record<string, unknown>[]>();
    for (const r of rows) {
      const key = groupBy.map(g => String(r[g] ?? '')).join('|');
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push(r);
    }
    const out: Record<string, unknown>[] = [];
    for (const [_key, bucketRows] of buckets) {
      const first = bucketRows[0]!;
      const row: Record<string, unknown> = {};
      for (const g of groupBy) row[g] = first[g];
      const aggRow = computeAggs(bucketRows, aggs);
      Object.assign(row, aggRow);
      out.push(row);
    }
    return out;
  }

  function computeAggs(rows: Record<string, unknown>[], aggs: QueryAggregation[]): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const a of aggs) {
      const key = a.alias || `${a.fn}_${a.field}`;
      const values = rows
        .map(r => r[a.field])
        .filter(v => v !== null && v !== undefined)
        .map(v => Number(v))
        .filter(v => !isNaN(v));
      switch (a.fn) {
        case 'sum':   out[key] = values.reduce((s, v) => s + v, 0); break;
        case 'avg':   out[key] = values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0; break;
        case 'count': out[key] = rows.length; break;
        case 'min':   out[key] = values.length ? Math.min(...values) : 0; break;
        case 'max':   out[key] = values.length ? Math.max(...values) : 0; break;
      }
    }
    return out;
  }

  function resultsToCSV(rows: Record<string, unknown>[]): string {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]!);
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [headers.join(',')];
    for (const r of rows) {
      lines.push(headers.map(h => escape(r[h])).join(','));
    }
    return lines.join('\n');
  }

  return {
    queries, lastResults, loading, error,
    loadQueries, createQuery, updateQuery, deleteQuery, toggleFavorite,
    runQuery, resultsToCSV,
  };
}
