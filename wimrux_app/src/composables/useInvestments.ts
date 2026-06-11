// =============================================================================
// WIMRUX® FINANCES — Composable Investissements (EPIC 8)
// =============================================================================
import { ref, computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store';
import type { Investment, InvestmentInput, InvestmentValuation, InvestmentType } from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';

export function useInvestments() {
  const investments = ref<Investment[]>([]);
  const valuations  = ref<InvestmentValuation[]>([]);
  const loading     = ref(false);
  const error       = ref<string | null>(null);
  const companyStore = useCompanyStore();

  async function loadInvestments(filters?: { type?: InvestmentType; status?: string }) {
    loading.value = true;
    try {
      let q = appwriteDb.from('investments').select('*')
        .eq('company_id', companyStore.company!.id)
        .order('purchase_date', { ascending: false });
      if (filters?.type)   q = q.eq('type', filters.type);
      if (filters?.status) q = q.eq('status', filters.status);
      const { data, error: err } = await q;
      if (err) { error.value = err.message; return; }
      investments.value = data || [];
    } finally { loading.value = false; }
  }

  async function createInvestment(payload: InvestmentInput) {
    const { data, error: err } = await appwriteDb.from('investments').insert([{
      ...payload,
      company_id: companyStore.company!.id,
      current_price: payload.purchase_price,
      current_value: payload.total_invested,
    }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
    if (err) { error.value = err.message; return null; }
    if (data) investments.value.unshift(data);
    return data as Investment;
  }

  async function updateInvestment(id: string, payload: Partial<Investment>) {
    const { data, error: err } = await appwriteDb.from('investments')
      .update(id, payload)
    if (err) { error.value = err.message; return null; }
    if (data) {
      const idx = investments.value.findIndex(i => i.id === id);
      if (idx !== -1) investments.value[idx] = data;
    }
    return data as Investment;
  }

  async function deleteInvestment(id: string) {
    const { error: err } = await appwriteDb.from('investments')
      .delete().eq('id', id).eq('company_id', companyStore.company!.id);
    if (err) { error.value = err.message; return false; }
    investments.value = investments.value.filter(i => i.id !== id);
    return true;
  }

  async function sellInvestment(id: string, soldDate: string, soldPrice: number, soldValue: number) {
    return updateInvestment(id, {
      status: 'sold', sold_date: soldDate, sold_price: soldPrice, sold_value: soldValue,
    });
  }

  async function loadValuations(investmentId: string) {
    const { data } = await appwriteDb.from('investment_valuations')
      .select('*').eq('investment_id', investmentId)
      .eq('company_id', companyStore.company!.id)
      .order('valuation_date', { ascending: false });
    valuations.value = data || [];
  }

  async function addValuation(investmentId: string, date: string, price: number, source = 'manual') {
    const inv = investments.value.find(i => i.id === investmentId);
    if (!inv) return null;
    const totalValue = (inv.quantity ?? 1) * price;
    const { data, error: err } = await appwriteDb.from('investment_valuations').insert([{
      investment_id: investmentId,
      company_id: companyStore.company!.id,
      valuation_date: date, price, total_value: totalValue, source,
    }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
    if (err) { error.value = err.message; return null; }
    await updateInvestment(investmentId, { current_price: price, current_value: totalValue });
    if (data) valuations.value.unshift(data);
    return data;
  }

  function computeReturn(inv: Investment): { absolute: number; pct: number; annualized: number } {
    const current = inv.status === 'sold' ? (inv.sold_value ?? 0) : (inv.current_value ?? 0);
    const absolute = current - inv.total_invested;
    const pct = inv.total_invested > 0 ? (absolute / inv.total_invested) * 100 : 0;
    const startDate = new Date(inv.purchase_date);
    const endDate = inv.status === 'sold' && inv.sold_date ? new Date(inv.sold_date) : new Date();
    const years = (endDate.getTime() - startDate.getTime()) / (365.25 * 86400000);
    const annualized = years > 0 && inv.total_invested > 0
      ? (Math.pow(current / inv.total_invested, 1 / years) - 1) * 100 : 0;
    return {
      absolute: Math.round(absolute * 100) / 100,
      pct: Math.round(pct * 100) / 100,
      annualized: Math.round(annualized * 100) / 100,
    };
  }

  const stats = computed(() => {
    const active = investments.value.filter(i => i.status === 'active');
    const totalInvested = active.reduce((s, i) => s + Number(i.total_invested), 0);
    const currentValue  = active.reduce((s, i) => s + Number(i.current_value ?? 0), 0);
    const totalReturn   = currentValue - totalInvested;
    const sold = investments.value.filter(i => i.status === 'sold');
    const realizedPL = sold.reduce((s, i) => s + ((i.sold_value ?? 0) - i.total_invested), 0);
    return {
      activeCount: active.length,
      totalInvested, currentValue, totalReturn,
      returnPct: totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0,
      realizedPL,
    };
  });

  const portfolioBreakdown = computed(() => {
    const breakdown = new Map<string, number>();
    for (const inv of investments.value.filter(i => i.status === 'active')) {
      const val = Number(inv.current_value ?? 0);
      breakdown.set(inv.type, (breakdown.get(inv.type) || 0) + val);
    }
    return Array.from(breakdown.entries()).map(([type, value]) => ({ type, value }));
  });

  return {
    investments, valuations, loading, error, stats, portfolioBreakdown,
    loadInvestments, createInvestment, updateInvestment, deleteInvestment, sellInvestment,
    loadValuations, addValuation, computeReturn,
  };
}
