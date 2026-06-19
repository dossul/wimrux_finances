// =============================================================================
// WIMRUX® FINANCES — Composable Immobilisations & Amortissement (T6.x)
// =============================================================================
import { ref, computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import type {
  FixedAsset, FixedAssetInput, AssetCategory, AssetDepreciationEntry,
  DepreciationMethod, AssetStatus
} from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';

interface ScheduleRow {
  period_year: number;
  period_month: number | null;
  annuity: number;
  accumulated: number;
  net_book_value: number;
}

export function useDepreciation() {
  const assets       = ref<FixedAsset[]>([]);
  const categories   = ref<AssetCategory[]>([]);
  const schedule     = ref<AssetDepreciationEntry[]>([]);
  const loading      = ref(false);
  const error        = ref<string | null>(null);
  const companyStore = useCompanyStore();

  async function loadCategories() {
    const { data } = await appwriteDb
      .from('asset_categories').select('*')
      .eq('company_id', companyStore.company!.id).order('name');
    categories.value = data || [];
  }

  async function createCategory(payload: Partial<AssetCategory>) {
    const { data, error: err } = await appwriteDb.from('asset_categories')
      .insert([{ ...payload, company_id: companyStore.company!.id }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
    if (err) { error.value = err.message; return null; }
    if (data) categories.value.push(data);
    return data;
  }

  async function loadAssets(filters?: { status?: AssetStatus; category_id?: string }) {
    loading.value = true;
    try {
      let q = appwriteDb.from('fixed_assets').select('*')
        .eq('company_id', companyStore.company!.id)
        .order('acquisition_date', { ascending: false });
      if (filters?.status)      q = q.eq('status', filters.status);
      if (filters?.category_id) q = q.eq('category_id', filters.category_id);
      const { data, error: err } = await q;
      if (err) { error.value = err.message; return; }
      assets.value = data || [];
    } finally { loading.value = false; }
  }

  async function createAsset(payload: FixedAssetInput) {
    loading.value = true;
    try {
      const nbv = payload.acquisition_value - (payload.residual_value ?? 0);
      const { data, error: err } = await appwriteDb.from('fixed_assets').insert([{
        ...payload,
        company_id: companyStore.company!.id,
        residual_value: payload.residual_value ?? 0,
        degressive_rate: payload.degressive_rate ?? 0,
        net_book_value: nbv,
        accumulated_depreciation: 0,
      }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
      if (err) { error.value = err.message; return null; }
      if (data) {
        assets.value.unshift(data);
        await generateDepreciationSchedule(data.id);
      }
      return data as FixedAsset;
    } finally { loading.value = false; }
  }

  async function updateAsset(id: string, payload: Partial<FixedAsset>) {
    const { data, error: err } = await appwriteDb.from('fixed_assets')
      .update(id, payload)
    if (err) { error.value = err.message; return null; }
    if (data) {
      const idx = assets.value.findIndex(a => a.id === id);
      if (idx !== -1) assets.value[idx] = data;
    }
    return data as FixedAsset;
  }

  async function disposeAsset(id: string, disposalDate: string, disposalValue: number) {
    return updateAsset(id, { status: 'sold', disposal_date: disposalDate, disposal_value: disposalValue });
  }

  async function deleteAsset(id: string) {
    const { error: err } = await appwriteDb.from('fixed_assets')
      .delete().eq('id', id).eq('company_id', companyStore.company!.id);
    if (err) { error.value = err.message; return false; }
    assets.value = assets.value.filter(a => a.id !== id);
    return true;
  }

  // ---------------------------------------------------------------------------
  // CALCUL AMORTISSEMENT — pur (sans DB)
  // ---------------------------------------------------------------------------
  function computeSchedule(
    acquisitionValue: number,
    residualValue: number,
    usefulLifeYears: number,
    method: DepreciationMethod,
    acquisitionDate: string,
    degressiveRate = 0
  ): ScheduleRow[] {
    const rows: ScheduleRow[] = [];
    const amortizable = acquisitionValue - residualValue;
    if (amortizable <= 0 || usefulLifeYears <= 0) return rows;

    const startYear = new Date(acquisitionDate).getFullYear();
    let accumulated = 0;
    let nbv = acquisitionValue;

    if (method === 'linear') {
      const annuity = amortizable / usefulLifeYears;
      for (let y = 0; y < usefulLifeYears; y++) {
        // Prorata pour la 1ère année
        const yearAnnuity = y === 0 ? annuity * proRataFactor(acquisitionDate) : annuity;
        accumulated += yearAnnuity;
        nbv = acquisitionValue - accumulated;
        rows.push({
          period_year: startYear + y,
          period_month: null,
          annuity: round2(yearAnnuity),
          accumulated: round2(accumulated),
          net_book_value: round2(Math.max(nbv, residualValue)),
        });
      }
    } else if (method === 'degressive') {
      // Taux dégressif fiscal BF (par défaut = (1/N) * coef)
      // coef : N≤4 → 1.5 ; 5-6 → 2 ; ≥7 → 2.5
      const coef = usefulLifeYears <= 4 ? 1.5 : usefulLifeYears <= 6 ? 2 : 2.5;
      const rate = degressiveRate > 0 ? degressiveRate / 100 : (1 / usefulLifeYears) * coef;
      const _linearAnnuity = amortizable / usefulLifeYears;
      let remainingYears = usefulLifeYears;
      for (let y = 0; y < usefulLifeYears; y++) {
        let yearAnnuity = nbv * rate;
        // Bascule en linéaire quand le linéaire devient > dégressif
        const linearProjected = (nbv - residualValue) / remainingYears;
        if (linearProjected > yearAnnuity) yearAnnuity = linearProjected;
        if (y === 0) yearAnnuity *= proRataFactor(acquisitionDate);
        // Ne pas dépasser la valeur résiduelle
        if (accumulated + yearAnnuity > amortizable) yearAnnuity = amortizable - accumulated;
        accumulated += yearAnnuity;
        nbv = acquisitionValue - accumulated;
        rows.push({
          period_year: startYear + y,
          period_month: null,
          annuity: round2(yearAnnuity),
          accumulated: round2(accumulated),
          net_book_value: round2(Math.max(nbv, residualValue)),
        });
        remainingYears--;
        if (nbv <= residualValue) break;
      }
    } else {
      // units : utilisation par unités — formule simplifiée linéaire (à affiner avec hooks)
      const annuity = amortizable / usefulLifeYears;
      for (let y = 0; y < usefulLifeYears; y++) {
        accumulated += annuity;
        nbv = acquisitionValue - accumulated;
        rows.push({
          period_year: startYear + y,
          period_month: null,
          annuity: round2(annuity),
          accumulated: round2(accumulated),
          net_book_value: round2(Math.max(nbv, residualValue)),
        });
      }
    }
    return rows;
  }

  function proRataFactor(acquisitionDate: string): number {
    const d = new Date(acquisitionDate);
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
    return (365 - dayOfYear) / 365;
  }
  function round2(n: number): number { return Math.round(n * 100) / 100; }

  async function generateDepreciationSchedule(assetId: string) {
    const asset = assets.value.find(a => a.id === assetId);
    if (!asset) return;
    const rows = computeSchedule(
      asset.acquisition_value, asset.residual_value, asset.useful_life_years,
      asset.depreciation_method, asset.acquisition_date, asset.degressive_rate
    );
    // Effacer ancien tableau
    await appwriteDb.from('asset_depreciation_entries')
      .delete().eq('asset_id', assetId);
    // Insérer nouveau
    if (rows.length > 0) {
      const toInsert = rows.map(r => ({
        ...r,
        asset_id: assetId,
        company_id: companyStore.company!.id,
        is_posted: false,
      }));
      await appwriteDb.from('asset_depreciation_entries').insert(toInsert);
    }
  }

  async function loadSchedule(assetId: string) {
    const { data, error: err } = await appwriteDb
      .from('asset_depreciation_entries').select('*')
      .eq('asset_id', assetId).eq('company_id', companyStore.company!.id)
      .order('period_year').order('period_month');
    if (err) { error.value = err.message; return; }
    schedule.value = data || [];
  }

  // STATS
  const stats = computed(() => {
    const active = assets.value.filter(a => a.status === 'in_service');
    return {
      totalCount: active.length,
      totalAcquisitionValue: active.reduce((s, a) => s + Number(a.acquisition_value), 0),
      totalNetBookValue: active.reduce((s, a) => s + Number(a.net_book_value ?? 0), 0),
      totalAccumulated: active.reduce((s, a) => s + Number(a.accumulated_depreciation), 0),
    };
  });

  return {
    assets, categories, schedule, loading, error, stats,
    loadCategories, createCategory,
    loadAssets, createAsset, updateAsset, disposeAsset, deleteAsset,
    computeSchedule, generateDepreciationSchedule, loadSchedule,
  };
}
