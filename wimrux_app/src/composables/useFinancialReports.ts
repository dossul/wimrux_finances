import { ref, computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
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
    try {
      // Calcul JS — remplace v_balance_sheet_current
      const [bankRes, walletRes, assetRes, invoiceRes, loanRes] = await Promise.all([
        appwriteDb.from('bank_accounts').select('*').eq('company_id', companyId.value),
        appwriteDb.from('mobile_wallets').select('*').eq('company_id', companyId.value).eq('is_active', true),
        appwriteDb.from('fixed_assets').select('*').eq('company_id', companyId.value).eq('is_active', true),
        appwriteDb.from('invoices').select('*').eq('company_id', companyId.value).eq('direction', 'issued').neq('payment_status', 'paid'),
        appwriteDb.from('loans').select('*').eq('company_id', companyId.value).eq('status', 'active'),
      ]);

      const tresorerie_banque = (bankRes.data || []).reduce((s: number, b: any) => s + Number(b.current_balance ?? 0), 0);
      const tresorerie_wallets = (walletRes.data || []).reduce((s: number, w: any) => s + Number(w.current_balance ?? 0), 0);
      const immobilisations_nettes = (assetRes.data || []).reduce((s: number, a: any) => s + Number(a.net_book_value ?? a.purchase_price ?? 0), 0);
      const creances_clients = (invoiceRes.data || []).reduce((s: number, i: any) => s + Math.max(0, Number(i.total_ttc) - Number(i.paid_amount ?? 0)), 0);
      const dettes_financieres = (loanRes.data || []).reduce((s: number, l: any) => s + Number(l.outstanding_balance ?? l.principal_amount), 0);
      const total_actif = tresorerie_banque + tresorerie_wallets + immobilisations_nettes + creances_clients;
      const capitaux_propres = total_actif - dettes_financieres;

      balanceSheet.value = {
        company_id: companyId.value,
        immobilisations_nettes,
        creances_clients,
        tresorerie_banque,
        tresorerie_caisse: 0,
        tresorerie_wallets,
        placements_financiers: 0,
        total_actif,
        dettes_fournisseurs: 0,
        dettes_financieres,
        capitaux_propres,
        total_passif: dettes_financieres + capitaux_propres,
      } as any;
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  async function loadIncomeStatementMonthly(year?: number): Promise<void> {
    if (!companyId.value) return;
    loading.value = true;
    error.value = null;
    try {
      // Calcul JS — remplace v_income_statement_monthly
      let q = appwriteDb.from('invoices').select('*')
        .eq('company_id', companyId.value)
        .eq('direction', 'issued')
        .neq('status', 'draft');
      if (year) q = q.gte('$createdAt', `${year}-01-01`).lte('$createdAt', `${year}-12-31`);
      const { data: invoices } = await q;

      const byMonth = new Map<string, { ca: number; tva: number }>();
      for (const inv of (invoices || [])) {
        const d = new Date(inv.created_at ?? Date.now());
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!byMonth.has(k)) byMonth.set(k, { ca: 0, tva: 0 });
        const e = byMonth.get(k)!;
        e.ca += Number(inv.total_ht ?? 0);
        e.tva += Number(inv.total_tva ?? 0);
      }

      incomeStatementMonthly.value = Array.from(byMonth.entries())
        .map(([period, v]) => ({
          company_id: companyId.value,
          year: parseInt(period.split('-')[0]!),
          month: parseInt(period.split('-')[1]!),
          period,
          chiffre_affaires: v.ca,
          charges_externes: 0,
          dotations_amortissements: 0,
          charges_financieres: 0,
          impots_taxes: v.tva,
          resultat_net: v.ca,
        } as any))
        .sort((a, b) => b.year - a.year || b.month - a.month);
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  async function loadIncomeStatementYearly(): Promise<void> {
    if (!companyId.value) return;
    loading.value = true;
    error.value = null;
    try {
      // Calcul JS — agréger l'annuel depuis le mensuel
      await loadIncomeStatementMonthly();
      const byYear = new Map<number, any>();
      for (const m of incomeStatementMonthly.value) {
        const y = m.year;
        if (!byYear.has(y)) byYear.set(y, { ...m, month: undefined, period: String(y) });
        else {
          const e = byYear.get(y)!;
          e.chiffre_affaires += m.chiffre_affaires;
          e.resultat_net += m.resultat_net;
        }
      }
      incomeStatementYearly.value = Array.from(byYear.values()).sort((a, b) => b.year - a.year);
    } catch (e: any) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
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
