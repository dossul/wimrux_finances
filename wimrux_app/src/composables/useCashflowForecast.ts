// =============================================================================
// WIMRUX® FINANCES — Composable Trésorerie prévisionnelle (T5.2)
// Méthodes : historical (moyenne mobile) | hybrid (factures + dépenses récurrentes)
// Méthode ml : stub — activé après réception credentials IA
// =============================================================================
import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import type {
  CashflowForecast, CashflowScenario, CashflowDataPoint,
  CashflowForecastInput, CashflowScenarioInput, ScenarioAssumption
} from 'src/types';

// ---------------------------------------------------------------------------
// Helpers date
// ---------------------------------------------------------------------------
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0] as string;
}
function diffDays(from: string, to: string): number {
  return Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
}
function dateRange(start: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

export function useCashflowForecast() {
  const forecasts  = ref<CashflowForecast[]>([]);
  const scenarios  = ref<CashflowScenario[]>([]);
  const loading    = ref(false);
  const error      = ref<string | null>(null);
  const companyStore = useCompanyStore();

  // ---------------------------------------------------------------------------
  // FORECASTS — CRUD
  // ---------------------------------------------------------------------------
  async function loadForecasts() {
    loading.value = true; error.value = null;
    try {
      const { data, error: err } = await insforge.database
        .from('cashflow_forecasts')
        .select('*')
        .eq('company_id', companyStore.company!.id)
        .order('created_at', { ascending: false });
      if (err) { error.value = err.message; return; }
      forecasts.value = (data || []).map(f => ({ ...f, data: f.data || [] }));
    } finally { loading.value = false; }
  }

  async function saveForecast(payload: CashflowForecastInput, data: CashflowDataPoint[]) {
    loading.value = true;
    try {
      const totals = computeTotals(data, payload.low_cash_threshold ?? 0);
      const row = {
        ...payload,
        company_id: companyStore.company!.id,
        data,
        generated_at: new Date().toISOString(),
        ...totals,
      };
      const { data: saved, error: err } = await insforge.database
        .from('cashflow_forecasts')
        .insert([row])
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (saved) forecasts.value.unshift({ ...saved, data: saved.data || [] });
      return saved as CashflowForecast;
    } finally { loading.value = false; }
  }

  async function deleteForecast(id: string) {
    const { error: err } = await insforge.database
      .from('cashflow_forecasts')
      .delete()
      .eq('id', id)
      .eq('company_id', companyStore.company!.id);
    if (err) { error.value = err.message; return false; }
    forecasts.value = forecasts.value.filter(f => f.id !== id);
    return true;
  }

  // ---------------------------------------------------------------------------
  // MÉTHODE HISTORIQUE — moyenne mobile sur bank_transactions passées
  // ---------------------------------------------------------------------------
  async function generateHistoricalForecast(
    baseDate: string,
    horizonDays: number,
    lookbackMonths = 6
  ): Promise<CashflowDataPoint[]> {
    const from = addDays(baseDate, -(lookbackMonths * 30));

    const { data: txs } = await insforge.database
      .from('bank_transactions')
      .select('transaction_date, amount, direction')
      .eq('company_id', companyStore.company!.id)
      .gte('transaction_date', from)
      .lte('transaction_date', baseDate)
      .order('transaction_date', { ascending: true });

    if (!txs || txs.length === 0) return buildEmptyPoints(baseDate, horizonDays);

    // Agréger par semaine
    const weeklyInflows: number[] = [];
    const weeklyOutflows: number[] = [];

    const totalWeeks = lookbackMonths * 4;
    for (let w = 0; w < totalWeeks; w++) {
      const wStart = addDays(baseDate, -(totalWeeks - w) * 7);
      const wEnd   = addDays(wStart, 6);
      const week   = txs.filter(t => t.transaction_date >= wStart && t.transaction_date <= wEnd);
      weeklyInflows.push(week.filter(t => t.direction === 'credit').reduce((s, t) => s + Number(t.amount), 0));
      weeklyOutflows.push(week.filter(t => t.direction === 'debit').reduce((s, t) => s + Number(t.amount), 0));
    }

    const avgWeeklyIn  = weeklyInflows.reduce((s, v) => s + v, 0) / totalWeeks;
    const avgWeeklyOut = weeklyOutflows.reduce((s, v) => s + v, 0) / totalWeeks;

    // Distribuer uniformément sur l'horizon (par jour)
    const dailyIn  = avgWeeklyIn / 7;
    const dailyOut = avgWeeklyOut / 7;

    // Solde courant depuis bank_accounts
    const { data: accounts } = await insforge.database
      .from('bank_accounts')
      .select('balance')
      .eq('company_id', companyStore.company!.id);
    const startBalance = (accounts || []).reduce((s, a) => s + Number(a.balance ?? 0), 0);

    return buildPointsFromDaily(baseDate, horizonDays, dailyIn, dailyOut, startBalance, 0);
  }

  // ---------------------------------------------------------------------------
  // MÉTHODE HYBRIDE — factures dues + dépenses récurrentes + historique résiduel
  // ---------------------------------------------------------------------------
  async function generateHybridForecast(
    baseDate: string,
    horizonDays: number,
    lowCashThreshold = 0
  ): Promise<CashflowDataPoint[]> {
    const endDate = addDays(baseDate, horizonDays);

    // 1. Factures reçues non payées → sorties à due_date
    const { data: receivedInvoices } = await insforge.database
      .from('invoices')
      .select('due_date, total_ttc, payment_status')
      .eq('company_id', companyStore.company!.id)
      .eq('type', 'received')
      .in('payment_status', ['unpaid', 'partial'])
      .gte('due_date', baseDate)
      .lte('due_date', endDate);

    // 2. Factures émises non payées → entrées à due_date
    const { data: issuedInvoices } = await insforge.database
      .from('invoices')
      .select('due_date, total_ttc, payment_status')
      .eq('company_id', companyStore.company!.id)
      .eq('type', 'issued')
      .in('payment_status', ['unpaid', 'partial'])
      .gte('due_date', baseDate)
      .lte('due_date', endDate);

    // 3. Dépenses récurrentes (détection sur 3 derniers mois)
    const lookbackStart = addDays(baseDate, -90);
    const { data: pastTxs } = await insforge.database
      .from('bank_transactions')
      .select('transaction_date, amount, direction, label, category_id')
      .eq('company_id', companyStore.company!.id)
      .gte('transaction_date', lookbackStart)
      .lte('transaction_date', baseDate);

    const recurring = detectRecurring(pastTxs || []);

    // 4. Solde de départ
    const { data: accounts } = await insforge.database
      .from('bank_accounts')
      .select('balance')
      .eq('company_id', companyStore.company!.id);
    const startBalance = (accounts || []).reduce((s, a) => s + Number(a.balance ?? 0), 0);

    // Construire carte jour par jour
    const points = dateRange(baseDate, horizonDays).map(date => ({
      date,
      inflows: 0,
      outflows: 0,
      net: 0,
      cumulative_balance: 0,
      is_risk: false,
      label: '',
    }));

    const dayMap = new Map(points.map(p => [p.date, p]));

    // Ajouter encaissements clients
    for (const inv of issuedInvoices || []) {
      if (!inv.due_date) continue;
      const p = dayMap.get(inv.due_date);
      if (p) { p.inflows += Number(inv.total_ttc ?? 0); p.label += `Enc. client; `; }
    }

    // Ajouter décaissements fournisseurs
    for (const inv of receivedInvoices || []) {
      if (!inv.due_date) continue;
      const p = dayMap.get(inv.due_date);
      if (p) { p.outflows += Number(inv.total_ttc ?? 0); p.label += `Paie. fourn.; `; }
    }

    // Ajouter récurrents projetés
    for (const rec of recurring) {
      for (let d = 0; d < horizonDays; d += rec.intervalDays) {
        const date = addDays(baseDate, d);
        const p = dayMap.get(date);
        if (!p) continue;
        if (rec.direction === 'credit') p.inflows += rec.avgAmount;
        else p.outflows += rec.avgAmount;
        p.label += `Récurrent; `;
      }
    }

    // Calculer net + solde cumulatif
    let balance = startBalance;
    for (const p of points) {
      p.net = p.inflows - p.outflows;
      balance += p.net;
      p.cumulative_balance = balance;
      p.is_risk = balance < lowCashThreshold;
    }

    return points;
  }

  // ---------------------------------------------------------------------------
  // ML stub — activé après credentials IA
  // ---------------------------------------------------------------------------
  async function generateMLForecast(baseDate: string, horizonDays: number): Promise<CashflowDataPoint[]> {
    error.value = 'Méthode ML disponible après configuration des credentials IA (ai-router)';
    return generateHybridForecast(baseDate, horizonDays);
  }

  // ---------------------------------------------------------------------------
  // Dispatcher principal
  // ---------------------------------------------------------------------------
  async function generateForecast(
    input: CashflowForecastInput
  ): Promise<{ forecast: CashflowForecast | null; points: CashflowDataPoint[] }> {
    loading.value = true;
    error.value   = null;
    try {
      let points: CashflowDataPoint[] = [];
      switch (input.method) {
        case 'historical':
          points = await generateHistoricalForecast(input.base_date, input.horizon_days);
          break;
        case 'hybrid':
          points = await generateHybridForecast(input.base_date, input.horizon_days, input.low_cash_threshold ?? 0);
          break;
        case 'ml':
          points = await generateMLForecast(input.base_date, input.horizon_days);
          break;
        default:
          points = buildEmptyPoints(input.base_date, input.horizon_days);
      }
      const forecast = await saveForecast(input, points);
      return { forecast, points };
    } finally { loading.value = false; }
  }

  // ---------------------------------------------------------------------------
  // SCÉNARIOS
  // ---------------------------------------------------------------------------
  async function loadScenarios(forecastId?: string) {
    loading.value = true;
    try {
      let q = insforge.database
        .from('cashflow_scenarios')
        .select('*')
        .eq('company_id', companyStore.company!.id)
        .order('created_at', { ascending: false });
      if (forecastId) q = q.eq('forecast_id', forecastId);
      const { data, error: err } = await q;
      if (err) { error.value = err.message; return; }
      scenarios.value = (data || []).map(s => ({
        ...s,
        assumptions: s.assumptions || [],
        result: s.result || null,
      }));
    } finally { loading.value = false; }
  }

  function runScenario(
    basePoints: CashflowDataPoint[],
    input: CashflowScenarioInput
  ): CashflowDataPoint[] {
    // Copier les points de base
    const simulated = basePoints.map(p => ({ ...p }));
    const dayMap = new Map(simulated.map(p => [p.date, p]));

    for (const assumption of input.assumptions) {
      applyAssumption(dayMap, assumption, basePoints[0]?.date ?? new Date().toISOString().split('T')[0] as string);
    }

    // Recalculer cumulative_balance
    let balance = basePoints[0]?.cumulative_balance ?? 0;
    for (const p of simulated) {
      p.net = p.inflows - p.outflows;
      balance = (simulated.indexOf(p) === 0 ? (p.cumulative_balance - basePoints[0]!.net) : balance) + p.net;
      p.cumulative_balance = balance;
    }

    return simulated;
  }

  async function saveScenario(
    input: CashflowScenarioInput,
    resultPoints: CashflowDataPoint[],
    basePoints: CashflowDataPoint[]
  ): Promise<CashflowScenario | null> {
    const totalImpact = resultPoints.reduce((s, p, i) => s + p.net - (basePoints[i]?.net ?? 0), 0);
    const { data, error: err } = await insforge.database
      .from('cashflow_scenarios')
      .insert([{
        ...input,
        company_id: companyStore.company!.id,
        result: resultPoints,
        total_impact: totalImpact,
      }])
      .select()
      .single();
    if (err) { error.value = err.message; return null; }
    if (data) scenarios.value.unshift({ ...data, assumptions: data.assumptions || [], result: data.result || null });
    return data as CashflowScenario;
  }

  async function deleteScenario(id: string) {
    const { error: err } = await insforge.database
      .from('cashflow_scenarios')
      .delete()
      .eq('id', id)
      .eq('company_id', companyStore.company!.id);
    if (err) { error.value = err.message; return false; }
    scenarios.value = scenarios.value.filter(s => s.id !== id);
    return true;
  }

  // ---------------------------------------------------------------------------
  // STATS
  // ---------------------------------------------------------------------------
  const riskDays = computed(() =>
    forecasts.value.flatMap(f => (f.data || []).filter(p => p.is_risk)).length
  );

  function getSummaryStats(points: CashflowDataPoint[]) {
    if (!points.length) return { minBalance: 0, maxBalance: 0, riskCount: 0, totalIn: 0, totalOut: 0 };
    return {
      minBalance: Math.min(...points.map(p => p.cumulative_balance)),
      maxBalance: Math.max(...points.map(p => p.cumulative_balance)),
      riskCount: points.filter(p => p.is_risk).length,
      totalIn: points.reduce((s, p) => s + p.inflows, 0),
      totalOut: points.reduce((s, p) => s + p.outflows, 0),
    };
  }

  // ---------------------------------------------------------------------------
  // Utilitaires privés
  // ---------------------------------------------------------------------------
  function computeTotals(points: CashflowDataPoint[], threshold: number) {
    const totalInflows  = points.reduce((s, p) => s + p.inflows, 0);
    const totalOutflows = points.reduce((s, p) => s + p.outflows, 0);
    const endingBalance = points[points.length - 1]?.cumulative_balance ?? 0;
    const low_cash_alert = points.some(p => p.is_risk || p.cumulative_balance < threshold);
    return { total_inflows: totalInflows, total_outflows: totalOutflows, ending_balance: endingBalance, low_cash_alert };
  }

  function buildEmptyPoints(baseDate: string, days: number): CashflowDataPoint[] {
    return dateRange(baseDate, days).map(date => ({
      date, inflows: 0, outflows: 0, net: 0, cumulative_balance: 0, is_risk: false,
    }));
  }

  function buildPointsFromDaily(
    baseDate: string, days: number,
    dailyIn: number, dailyOut: number,
    startBalance: number, threshold: number
  ): CashflowDataPoint[] {
    let balance = startBalance;
    return dateRange(baseDate, days).map(date => {
      const net = dailyIn - dailyOut;
      balance += net;
      return {
        date, inflows: dailyIn, outflows: dailyOut, net,
        cumulative_balance: balance,
        is_risk: balance < threshold,
      };
    });
  }

  interface RecurringPattern { direction: 'credit' | 'debit'; intervalDays: number; avgAmount: number; label: string; }

  function detectRecurring(txs: { transaction_date: string; amount: number; direction: string; label: string }[]): RecurringPattern[] {
    // Grouper par label, regarder l'espacement moyen
    const groups = new Map<string, typeof txs>();
    for (const tx of txs) {
      const key = (tx.label ?? '').toLowerCase().trim().substring(0, 30);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tx);
    }
    const patterns: RecurringPattern[] = [];
    for (const [label, group] of groups) {
      if (group.length < 2) continue;
      const sorted = [...group].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
      const diffs: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        diffs.push(diffDays(sorted[i - 1]!.transaction_date, sorted[i]!.transaction_date));
      }
      const avgDiff = diffs.reduce((s, v) => s + v, 0) / diffs.length;
      // Considérer récurrent si espacement ≤ 35 jours et cohérent (±7j)
      const stdDev = Math.sqrt(diffs.reduce((s, v) => s + (v - avgDiff) ** 2, 0) / diffs.length);
      if (avgDiff <= 35 && stdDev <= 7) {
        const avgAmount = group.reduce((s, t) => s + Number(t.amount), 0) / group.length;
        const direction = group[0]!.direction as 'credit' | 'debit';
        patterns.push({ direction, intervalDays: Math.round(avgDiff), avgAmount, label });
      }
    }
    return patterns;
  }

  function applyAssumption(
    dayMap: Map<string, CashflowDataPoint>,
    assumption: ScenarioAssumption,
    _baseDate: string
  ): void {
    switch (assumption.type) {
      case 'payment_delay':
        // Décaler les entrées de N jours
        for (const [, p] of dayMap) {
          if (p.inflows > 0 && (!assumption.start_date || p.date >= assumption.start_date)) {
            const targetDate = addDays(p.date, assumption.days ?? 0);
            const target = dayMap.get(targetDate);
            if (target) { target.inflows += p.inflows; p.inflows = 0; }
          }
        }
        break;
      case 'supplier_delay':
        for (const [, p] of dayMap) {
          if (p.outflows > 0 && (!assumption.start_date || p.date >= assumption.start_date)) {
            const targetDate = addDays(p.date, assumption.days ?? 0);
            const target = dayMap.get(targetDate);
            if (target) { target.outflows += p.outflows; p.outflows = 0; }
          }
        }
        break;
      case 'new_expense':
        if (assumption.start_date && assumption.amount) {
          const p = dayMap.get(assumption.start_date);
          if (p) p.outflows += assumption.amount;
          if (assumption.recurring && assumption.days) {
            let d = assumption.start_date;
            while (dayMap.has(d)) {
              d = addDays(d, assumption.days);
              const rp = dayMap.get(d);
              if (rp) rp.outflows += assumption.amount;
            }
          }
        }
        break;
      case 'revenue_change':
        for (const [, p] of dayMap) {
          if (!assumption.start_date || p.date >= assumption.start_date) {
            p.inflows *= 1 + (assumption.amount ?? 0) / 100;
          }
        }
        break;
    }
  }

  // ── Prévision IA (remplace stub ml) ──────────────────────────────────────
  interface AiForecastPoint {
    date: string;
    predicted_inflow: number;
    predicted_outflow: number;
    predicted_balance: number;
    confidence: number;
    drivers: string[];
  }
  interface AiForecastResult {
    horizon_days: number;
    current_balance: number;
    currency: string;
    points: AiForecastPoint[];
    summary: string;
    risks: string[];
    opportunities: string[];
    model_used: string | null;
  }

  const aiForecast    = ref<AiForecastResult | null>(null);
  const aiLoading     = ref(false);
  const aiError       = ref<string | null>(null);

  async function runAiForecast(horizonDays = 90): Promise<AiForecastResult | null> {
    aiLoading.value = true; aiError.value = null;
    try {
      const { data, error: fnErr } = await insforge.functions.invoke('cashflow-forecast', {
        body: { company_id: companyStore.company?.id, horizon_days: horizonDays, currency: 'XOF' },
      });
      if (fnErr || !data?.success) throw new Error(fnErr?.message ?? data?.message ?? 'Erreur prévision IA');
      aiForecast.value = data.forecast as AiForecastResult;
      return aiForecast.value;
    } catch (e) {
      aiError.value = e instanceof Error ? e.message : 'Erreur';
      return null;
    } finally { aiLoading.value = false; }
  }

  return {
    forecasts, scenarios, loading, error, riskDays,
    aiForecast, aiLoading, aiError,
    loadForecasts, saveForecast, deleteForecast, generateForecast,
    generateHistoricalForecast, generateHybridForecast,
    loadScenarios, runScenario, saveScenario, deleteScenario,
    getSummaryStats, runAiForecast,
  };
}
