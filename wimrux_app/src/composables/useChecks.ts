// =============================================================================
// WIMRUX® FINANCES — Gestion des chèques (émis + reçus)
// Workflow statut : in_circulation → cashed | bounced | endorsed | cancelled
// =============================================================================
import { ref, computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import type { Check, CheckType, CheckStatus } from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';

export interface CheckStats {
  totalInCirculation: number;
  amountInCirculation: number;
  totalEmitted: number;
  totalReceived: number;
  upcomingDue: Check[];
}

export function useChecks() {
  const checks       = ref<Check[]>([]);
  const loading      = ref(false);
  const error        = ref<string | null>(null);
  const companyStore = useCompanyStore();

  // ---------------------------------------------------------------------------
  // LISTE avec filtres
  // ---------------------------------------------------------------------------
  async function loadChecks(filters?: {
    type?: CheckType;
    status?: CheckStatus | CheckStatus[];
    bank_account_id?: string;
    date_from?: string;
    date_to?: string;
  }) {
    loading.value = true;
    error.value   = null;
    try {
      let q = appwriteDb
        .from('checks')
        .select('*')
        .eq('company_id', companyStore.company!.id)
        .order('issue_date', { ascending: false });

      if (filters?.type)             q = q.eq('type', filters.type);
      if (filters?.bank_account_id)  q = q.eq('bank_account_id', filters.bank_account_id);
      if (filters?.date_from)        q = q.gte('issue_date', filters.date_from);
      if (filters?.date_to)          q = q.lte('issue_date', filters.date_to);
      if (filters?.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        q = q.in('status', statuses);
      }

      const { data, error: err } = await q;
      if (err) { error.value = err.message; return; }
      checks.value = data || [];
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // CRÉER
  // ---------------------------------------------------------------------------
  async function createCheck(payload: Omit<Check, 'id' | 'company_id' | 'status' | 'created_at' | 'cashed_date'>) {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await appwriteDb
        .from('checks')
        .insert([{ ...payload, company_id: companyStore.company!.id, status: 'in_circulation' }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
      if (err) { error.value = err.message; return null; }
      if (data) checks.value.unshift(data);
      return data;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // MISE À JOUR
  // ---------------------------------------------------------------------------
  async function updateCheck(id: string, payload: Partial<Check>) {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await appwriteDb
        .from('checks')
        .update(id, payload);
      if (err) { error.value = err.message; return null; }
      if (data) {
        const idx = checks.value.findIndex(c => c.id === id);
        if (idx !== -1) checks.value[idx] = data;
      }
      return data;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // TRANSITIONS DE STATUT
  // ---------------------------------------------------------------------------
  async function markAsCashed(id: string, date?: string) {
    return updateCheck(id, {
      status: 'cashed',
      cashed_date: date ?? new Date().toISOString().split('T')[0] ?? null,
    } as Partial<Check>);
  }

  async function markAsBounced(id: string) {
    return updateCheck(id, { status: 'bounced' });
  }

  async function markAsEndorsed(id: string) {
    return updateCheck(id, { status: 'endorsed' });
  }

  async function cancelCheck(id: string) {
    return updateCheck(id, { status: 'cancelled' });
  }

  // ---------------------------------------------------------------------------
  // SUPPRIMER (in_circulation uniquement)
  // ---------------------------------------------------------------------------
  async function deleteCheck(id: string) {
    loading.value = true;
    error.value   = null;
    try {
      const { error: err } = await appwriteDb
        .from('checks')
        .delete()
        .eq('id', id)
        .eq('company_id', companyStore.company!.id)
        .eq('status', 'in_circulation');
      if (err) { error.value = err.message; return false; }
      checks.value = checks.value.filter(c => c.id !== id);
      return true;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // CHÈQUES DONT L'ÉCHÉANCE EST PROCHE (≤ N jours)
  // ---------------------------------------------------------------------------
  function getUpcomingDue(days = 7): Check[] {
    const today     = new Date();
    const threshold = new Date(today);
    threshold.setDate(today.getDate() + days);
    return checks.value.filter(c => {
      if (c.status !== 'in_circulation' || !c.due_date) return false;
      const d = new Date(c.due_date);
      return d >= today && d <= threshold;
    });
  }

  // ---------------------------------------------------------------------------
  // STATISTIQUES
  // ---------------------------------------------------------------------------
  const stats = computed<CheckStats>(() => {
    const inCirc = checks.value.filter(c => c.status === 'in_circulation');
    return {
      totalInCirculation:  inCirc.length,
      amountInCirculation: inCirc.reduce((s, c) => s + Number(c.amount), 0),
      totalEmitted:  checks.value.filter(c => c.type === 'emitted').length,
      totalReceived: checks.value.filter(c => c.type === 'received').length,
      upcomingDue:   getUpcomingDue(7),
    };
  });

  return {
    checks,
    loading,
    error,
    stats,
    loadChecks,
    createCheck,
    updateCheck,
    markAsCashed,
    markAsBounced,
    markAsEndorsed,
    cancelCheck,
    deleteCheck,
    getUpcomingDue,
  };
}
