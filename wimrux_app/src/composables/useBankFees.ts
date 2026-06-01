// =============================================================================
// WIMRUX® FINANCES — Frais bancaires
// Réutilise bank_transactions filtrées sur transaction_categories.type = 'bank_fee'
// =============================================================================
import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import type { BankTransaction } from 'src/types';

export interface FeeRow extends BankTransaction {
  category_name?: string | undefined;
  category_code?: string | undefined;
}

export interface MonthlyFee {
  month: string;
  label: string;
  total: number;
}

export interface CategoryFee {
  category_id: string | null;
  category_name: string;
  total: number;
  count: number;
}

export function useBankFees() {
  const fees         = ref<FeeRow[]>([]);
  const loading      = ref(false);
  const error        = ref<string | null>(null);
  const companyStore = useCompanyStore();

  // ---------------------------------------------------------------------------
  // CHARGER les frais bancaires (transactions catégorisées bank_fee)
  // ---------------------------------------------------------------------------
  async function loadFees(filters?: {
    bank_account_id?: string;
    date_from?: string;
    date_to?: string;
  }) {
    loading.value = true;
    error.value   = null;
    try {
      // On joint transaction_categories pour filtrer type = 'bank_fee'
      let q = insforge.database
        .from('bank_transactions')
        .select(`
          *,
          transaction_categories!bank_transactions_category_id_fkey(name, code, type)
        `)
        .eq('company_id', companyStore.company!.id)
        .order('transaction_date', { ascending: false });

      if (filters?.bank_account_id) q = q.eq('bank_account_id', filters.bank_account_id);
      if (filters?.date_from)       q = q.gte('transaction_date', filters.date_from);
      if (filters?.date_to)         q = q.lte('transaction_date', filters.date_to);

      const { data, error: err } = await q;
      if (err) { error.value = err.message; return; }

      // Filtrer côté client sur type = bank_fee (évite d'exposer la logique dans l'URL)
      fees.value = ((data || []) as (BankTransaction & { transaction_categories?: { name: string; code: string; type: string } | null })[])
        .filter(t => t.transaction_categories?.type === 'bank_fee')
        .map(t => ({
          ...t,
          category_name: t.transaction_categories?.name,
          category_code: t.transaction_categories?.code,
        }));
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // AGRÉGATION MENSUELLE (12 mois)
  // ---------------------------------------------------------------------------
  const monthlyBreakdown = computed<MonthlyFee[]>(() => {
    const map = new Map<string, number>();
    for (const f of fees.value) {
      const d = new Date(f.transaction_date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + Math.abs(Number(f.amount)));
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({
        month,
        label: new Date(month + '-01').toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        total,
      }));
  });

  // ---------------------------------------------------------------------------
  // AGRÉGATION PAR CATÉGORIE
  // ---------------------------------------------------------------------------
  const categoryBreakdown = computed<CategoryFee[]>(() => {
    const map = new Map<string, CategoryFee>();
    for (const f of fees.value) {
      const key  = f.category_id ?? '__uncategorized__';
      const name = f.category_name ?? 'Non catégorisé';
      const existing = map.get(key);
      if (existing) {
        existing.total += Math.abs(Number(f.amount));
        existing.count++;
      } else {
        map.set(key, { category_id: f.category_id ?? null, category_name: name, total: Math.abs(Number(f.amount)), count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  });

  // ---------------------------------------------------------------------------
  // STATISTIQUES YTD + N-1
  // ---------------------------------------------------------------------------
  const stats = computed(() => {
    const now      = new Date();
    const yearNow  = now.getFullYear();
    const yearPrev = yearNow - 1;

    const ytd  = fees.value
      .filter(f => new Date(f.transaction_date).getFullYear() === yearNow)
      .reduce((s, f) => s + Math.abs(Number(f.amount)), 0);

    const prev = fees.value
      .filter(f => new Date(f.transaction_date).getFullYear() === yearPrev)
      .reduce((s, f) => s + Math.abs(Number(f.amount)), 0);

    const evolution = prev > 0 ? ((ytd - prev) / prev) * 100 : null;

    return { ytd, prev, evolution, yearNow, yearPrev };
  });

  // ---------------------------------------------------------------------------
  // EXPORT CSV
  // ---------------------------------------------------------------------------
  function exportCSV(): void {
    const header = 'Date;Libellé;Compte;Catégorie;Montant;Devise\n';
    const rows   = fees.value.map(f =>
      [
        f.transaction_date,
        `"${(f.label ?? '').replace(/"/g, '""')}"`,
        f.bank_account_id,
        f.category_name ?? '',
        Math.abs(Number(f.amount)).toFixed(2),
        'XOF',
      ].join(';')
    ).join('\n');

    const blob     = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8' });
    const url      = URL.createObjectURL(blob);
    const filename = `frais-bancaires-${new Date().toISOString().split('T')[0]}.csv`;
    const a        = document.createElement('a');
    a.href         = url;
    a.download     = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    fees,
    loading,
    error,
    stats,
    monthlyBreakdown,
    categoryBreakdown,
    loadFees,
    exportCSV,
  };
}
