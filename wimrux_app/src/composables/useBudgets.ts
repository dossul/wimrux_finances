// =============================================================================
// WIMRUX® FINANCES — Composable Budgets (T4.2)
// Gestion budgétaire : budgets + lignes + suivi consommation vs réalisé
// =============================================================================
import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import { useAuthStore } from 'src/stores/auth-store';
import { useEmailService } from 'src/composables/useEmailService';
import type {
  Budget, BudgetLine, BudgetVsActual, BudgetInput, BudgetLineInput,
  BudgetStatus, BudgetPeriodType
} from 'src/types';

export function useBudgets() {
  const budgets       = ref<Budget[]>([]);
  const budgetLines   = ref<BudgetLine[]>([]);
  const budgetActuals = ref<BudgetVsActual[]>([]);
  const loading       = ref(false);
  const error         = ref<string | null>(null);
  const companyStore  = useCompanyStore();
  const authStore     = useAuthStore();
  const emailService  = useEmailService();

  // ---------------------------------------------------------------------------
  // BUDGETS — CRUD
  // ---------------------------------------------------------------------------
  async function loadBudgets(filters?: {
    status?: BudgetStatus;
    fiscal_year?: number;
    period_type?: BudgetPeriodType;
  }) {
    loading.value = true;
    error.value   = null;
    try {
      let q = insforge.database
        .from('budgets')
        .select('*')
        .eq('company_id', companyStore.company!.id)
        .order('fiscal_year', { ascending: false })
        .order('created_at', { ascending: false });

      if (filters?.status)      q = q.eq('status', filters.status);
      if (filters?.fiscal_year) q = q.eq('fiscal_year', filters.fiscal_year);
      if (filters?.period_type) q = q.eq('period_type', filters.period_type);

      const { data, error: err } = await q;
      if (err) { error.value = err.message; return; }
      budgets.value = data || [];
    } finally {
      loading.value = false;
    }
  }

  async function createBudget(payload: BudgetInput) {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await insforge.database
        .from('budgets')
        .insert([{ ...payload, company_id: companyStore.company!.id }])
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) budgets.value.unshift(data);
      return data as Budget;
    } finally {
      loading.value = false;
    }
  }

  async function updateBudget(id: string, payload: Partial<BudgetInput>) {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await insforge.database
        .from('budgets')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', companyStore.company!.id)
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) {
        const idx = budgets.value.findIndex(b => b.id === id);
        if (idx !== -1) budgets.value[idx] = data;
      }
      return data as Budget;
    } finally {
      loading.value = false;
    }
  }

  async function deleteBudget(id: string) {
    const { error: err } = await insforge.database
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('company_id', companyStore.company!.id);
    if (err) { error.value = err.message; return false; }
    budgets.value = budgets.value.filter(b => b.id !== id);
    return true;
  }

  async function duplicateBudget(sourceId: string, newName: string, newFiscalYear: number) {
    loading.value = true;
    try {
      // Charger le budget source + ses lignes
      const { data: source } = await insforge.database
        .from('budgets')
        .select('*')
        .eq('id', sourceId)
        .single();
      if (!source) { error.value = 'Budget source introuvable'; return null; }

      const { data: lines } = await insforge.database
        .from('budget_lines')
        .select('*')
        .eq('budget_id', sourceId);

      // Calculer nouvelles dates selon l'année fiscale
      const yearDiff = newFiscalYear - source.fiscal_year;
      const newStart = new Date(source.period_start);
      const newEnd   = new Date(source.period_end);
      newStart.setFullYear(newStart.getFullYear() + yearDiff);
      newEnd.setFullYear(newEnd.getFullYear() + yearDiff);

      // Créer le nouveau budget
      const { data: newBudget, error: err1 } = await insforge.database
        .from('budgets')
        .insert([{
          company_id: companyStore.company!.id,
          name: newName,
          period_type: source.period_type,
          fiscal_year: newFiscalYear,
          period_start: newStart.toISOString().split('T')[0] || null,
          period_end: newEnd.toISOString().split('T')[0] || null,
          total_planned: source.total_planned,
          status: 'draft' as BudgetStatus,
          notes: `Copie de "${source.name}" (${source.fiscal_year})`,
        }])
        .select()
        .single();

      if (err1 || !newBudget) { error.value = err1?.message ?? 'Erreur copie budget'; return null; }

      // Copier les lignes
      if (lines && lines.length > 0) {
        const newLines = lines.map(l => ({
          budget_id: newBudget.id,
          company_id: companyStore.company!.id,
          category_id: l.category_id,
          label: l.label,
          line_type: l.line_type,
          planned_amount: l.planned_amount,
          alert_threshold_pct: l.alert_threshold_pct,
          sort_order: l.sort_order,
          notes: l.notes,
        }));
        await insforge.database.from('budget_lines').insert(newLines);
      }

      budgets.value.unshift(newBudget);
      return newBudget as Budget;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // BUDGET LINES — CRUD
  // ---------------------------------------------------------------------------
  async function loadBudgetLines(budgetId: string) {
    loading.value = true;
    try {
      const { data, error: err } = await insforge.database
        .from('budget_lines')
        .select('*')
        .eq('budget_id', budgetId)
        .eq('company_id', companyStore.company!.id)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      if (err) { error.value = err.message; return; }
      budgetLines.value = data || [];
    } finally {
      loading.value = false;
    }
  }

  async function createBudgetLine(budgetId: string, payload: BudgetLineInput) {
    loading.value = true;
    try {
      const { data, error: err } = await insforge.database
        .from('budget_lines')
        .insert([{
          ...payload,
          budget_id: budgetId,
          company_id: companyStore.company!.id,
        }])
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) budgetLines.value.push(data);
      return data as BudgetLine;
    } finally {
      loading.value = false;
    }
  }

  async function updateBudgetLine(id: string, payload: Partial<BudgetLineInput>) {
    loading.value = true;
    try {
      const { data, error: err } = await insforge.database
        .from('budget_lines')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', companyStore.company!.id)
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) {
        const idx = budgetLines.value.findIndex(l => l.id === id);
        if (idx !== -1) budgetLines.value[idx] = data;
      }
      return data as BudgetLine;
    } finally {
      loading.value = false;
    }
  }

  async function deleteBudgetLine(id: string) {
    const { error: err } = await insforge.database
      .from('budget_lines')
      .delete()
      .eq('id', id)
      .eq('company_id', companyStore.company!.id);
    if (err) { error.value = err.message; return false; }
    budgetLines.value = budgetLines.value.filter(l => l.id !== id);
    return true;
  }

  // ---------------------------------------------------------------------------
  // VUE BUDGET VS ACTUAL — Consommation
  // ---------------------------------------------------------------------------
  async function loadBudgetVsActual(budgetId: string) {
    loading.value = true;
    try {
      const { data, error: err } = await insforge.database
        .from('v_budget_vs_actual')
        .select('*')
        .eq('budget_id', budgetId)
        .eq('company_id', companyStore.company!.id)
        .order('consumption_pct', { ascending: false });
      if (err) { error.value = err.message; return; }
      budgetActuals.value = data || [];
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // STATS & UTILS
  // ---------------------------------------------------------------------------
  const stats = computed(() => {
    if (!budgetActuals.value.length) {
      return {
        totalPlanned: 0, totalActual: 0, totalVariance: 0, avgConsumption: 0,
        alertsCount: 0, incomePlanned: 0, expensePlanned: 0,
      };
    }
    const lines = budgetActuals.value;
    const income = lines.filter(l => l.line_type === 'income');
    const expense = lines.filter(l => l.line_type === 'expense');
    return {
      totalPlanned: lines.reduce((s, l) => s + Number(l.planned_amount), 0),
      totalActual: lines.reduce((s, l) => s + Number(l.computed_actual), 0),
      totalVariance: lines.reduce((s, l) => s + Number(l.variance), 0),
      avgConsumption: lines.length
        ? lines.reduce((s, l) => s + Number(l.consumption_pct), 0) / lines.length
        : 0,
      alertsCount: lines.filter(l => l.alert_triggered).length,
      incomePlanned: income.reduce((s, l) => s + Number(l.planned_amount), 0),
      expensePlanned: expense.reduce((s, l) => s + Number(l.planned_amount), 0),
    };
  });

  // ---------------------------------------------------------------------------
  // E08 — ALERTES EMAIL budget dépassé
  // ---------------------------------------------------------------------------
  async function checkAndSendBudgetAlerts(budgetName: string, periodLabel?: string) {
    const userEmail = authStore.user?.email;
    const userName  = authStore.fullName;
    if (!userEmail) return;

    const alertLines = budgetActuals.value.filter(l => l.alert_triggered);
    for (const line of alertLines) {
      const pct = Number(line.consumption_pct);
      if (pct < 80) continue;
      try {
        await emailService.sendBudgetAlertEmail({
          to: userEmail,
          name: userName || userEmail,
          budgetName: `${budgetName} — ${line.label ?? ''}`,
          allocated: Number(line.planned_amount).toFixed(0),
          consumed: Number(line.computed_actual).toFixed(0),
          percent: pct.toFixed(1),
          ...(periodLabel ? { period: periodLabel } : {}),
        });
      } catch (err) {
        console.error('[Budgets] Failed to send budget alert email:', err);
        // Log silencieux — l'alerte dans l'UI reste visible même si l'email échoue
      }
    }
  }

  function getAlertColor(consumptionPct: number): string {
    if (consumptionPct >= 100) return 'negative';
    if (consumptionPct >= 80) return 'orange';
    if (consumptionPct >= 50) return 'warning';
    return 'positive';
  }

  // Helpers pour périodes
  function getDefaultPeriods(fiscalYear: number, periodType: BudgetPeriodType): { start: string; end: string } {
    switch (periodType) {
      case 'monthly':
        return { start: `${fiscalYear}-01-01`, end: `${fiscalYear}-01-31` };
      case 'quarterly':
        return { start: `${fiscalYear}-01-01`, end: `${fiscalYear}-03-31` };
      case 'yearly':
      default:
        return { start: `${fiscalYear}-01-01`, end: `${fiscalYear}-12-31` };
    }
  }

  return {
    budgets, budgetLines, budgetActuals,
    loading, error, stats,
    loadBudgets, createBudget, updateBudget, deleteBudget, duplicateBudget,
    loadBudgetLines, createBudgetLine, updateBudgetLine, deleteBudgetLine,
    loadBudgetVsActual,
    checkAndSendBudgetAlerts,
    getAlertColor, getDefaultPeriods,
  };
}
