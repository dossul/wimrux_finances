import { ref, computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store';
import type { BalanceSheet, IncomeStatement } from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';

export function useFinancialReports() {
  const companyStore = useCompanyStore();
  const companyId = computed(() => companyStore.company?.id ?? '');

  const balanceSheet = ref<BalanceSheet | null>(null);
  const incomeStatementMonthly = ref<IncomeStatement[]>([]);
  const incomeStatementYearly = ref<IncomeStatement[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadBalanceSheet(): Promise<void> {
    if (!companyId.value) return;
    loading.value = true;
    error.value = null;
    const { data, error: err } = await appwriteDb
      .from('v_balance_sheet_current')
      .select('*')
      .eq('company_id', companyId.value)
      .single();
    if (err) { error.value = err.message; balanceSheet.value = null; }
    else { balanceSheet.value = data as BalanceSheet; }
    loading.value = false;
  }

  async function loadIncomeStatementMonthly(year?: number): Promise<void> {
    if (!companyId.value) return;
    loading.value = true;
    error.value = null;
    let query = appwriteDb
      .from('v_income_statement_monthly')
      .select('*')
      .eq('company_id', companyId.value)
      .order('year', { ascending: false })
      .order('month', { ascending: false });
    if (year) query = query.eq('year', year);
    const { data, error: err } = await query;
    if (err) { error.value = err.message; }
    else { incomeStatementMonthly.value = (data as IncomeStatement[]) || []; }
    loading.value = false;
  }

  async function loadIncomeStatementYearly(): Promise<void> {
    if (!companyId.value) return;
    loading.value = true;
    error.value = null;
    const { data, error: err } = await appwriteDb
      .from('v_income_statement_yearly')
      .select('*')
      .eq('company_id', companyId.value)
      .order('year', { ascending: false });
    if (err) { error.value = err.message; }
    else { incomeStatementYearly.value = (data as IncomeStatement[]) || []; }
    loading.value = false;
  }

  // KPIs derived from latest year
  const currentYearStats = computed(() => {
    const current = incomeStatementYearly.value[0];
    if (!current) return null;
    const prior = incomeStatementYearly.value[1];
    const growth = prior && prior.chiffre_affaires > 0
      ? ((current.chiffre_affaires - prior.chiffre_affaires) / prior.chiffre_affaires) * 100
      : null;
    const margin = current.chiffre_affaires > 0
      ? (current.resultat_net / current.chiffre_affaires) * 100
      : 0;
    return { current, prior, growth, margin };
  });

  const balanceSheetRatios = computed(() => {
    const b = balanceSheet.value;
    if (!b) return null;
    const totalCash = b.tresorerie_banque + b.tresorerie_caisse + b.tresorerie_wallets;
    const liquidityRatio = b.dettes_fournisseurs > 0
      ? (b.creances_clients + totalCash) / b.dettes_fournisseurs
      : null;
    const debtRatio = b.total_actif > 0
      ? ((b.dettes_fournisseurs + b.dettes_financieres) / b.total_actif) * 100
      : 0;
    const equityRatio = b.total_actif > 0
      ? (b.capitaux_propres / b.total_actif) * 100
      : 0;
    return { totalCash, liquidityRatio, debtRatio, equityRatio };
  });

  // CSV export helpers
  function balanceSheetToCSV(): string {
    const b = balanceSheet.value;
    if (!b) return '';
    const lines = [
      'Poste,Montant FCFA',
      `Immobilisations nettes,${b.immobilisations_nettes}`,
      `Creances clients,${b.creances_clients}`,
      `Tresorerie banque,${b.tresorerie_banque}`,
      `Tresorerie caisse,${b.tresorerie_caisse}`,
      `Tresorerie wallets,${b.tresorerie_wallets}`,
      `Placements financiers,${b.placements_financiers}`,
      `TOTAL ACTIF,${b.total_actif}`,
      `Dettes fournisseurs,${b.dettes_fournisseurs}`,
      `Dettes financieres,${b.dettes_financieres}`,
      `Capitaux propres,${b.capitaux_propres}`,
      `TOTAL PASSIF,${b.total_passif}`,
    ];
    return lines.join('\n');
  }

  function incomeStatementToCSV(rows: IncomeStatement[]): string {
    const header = 'Annee,Mois,CA,Charges externes,Dotations amort,Charges fin.,Impots,Resultat net';
    const body = rows.map(r =>
      `${r.year},${r.month ?? ''},${r.chiffre_affaires},${r.charges_externes},${r.dotations_amortissements},${r.charges_financieres},${r.impots_taxes},${r.resultat_net}`
    );
    return [header, ...body].join('\n');
  }

  return {
    balanceSheet, incomeStatementMonthly, incomeStatementYearly,
    loading, error,
    currentYearStats, balanceSheetRatios,
    loadBalanceSheet, loadIncomeStatementMonthly, loadIncomeStatementYearly,
    balanceSheetToCSV, incomeStatementToCSV,
  };
}
