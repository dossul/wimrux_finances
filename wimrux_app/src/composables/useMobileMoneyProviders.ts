// =============================================================================
// WIMRUX® FINANCES — Opérateurs Mobile Money
// payment_providers (global) + mobile_wallets (par company)
// =============================================================================
import { ref } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';

export interface MobileMoneyProvider {
  id:           string;
  code:         string;          // 'orange_bf', 'moov_bf', 'wave_sn'...
  name:         string;          // 'Orange Money Burkina'
  type:         string;          // 'mobile_money'
  country_codes: string[];       // ['BF'], ['SN','CI']...
  region:       string | null;
  logo_url:     string | null;
  is_active:    boolean;
}

export interface MobileWallet {
  id:              string;
  company_id:      string;
  provider:        string;       // code de l'opérateur
  phone_number:    string;
  account_name:    string | null;
  current_balance: number;
  is_active:       boolean;
  created_at:      string;
}

// Pays disponibles (basé sur country_codes des providers actifs)
export interface CountryOption {
  code: string;
  name: string;
}

// Mapping ISO alpha-3 → nom (correspond aux country_codes dans payment_providers)
const COUNTRY_NAMES: Record<string, string> = {
  BFA: 'Burkina Faso',
  CIV: "Côte d'Ivoire",
  SEN: 'Sénégal',
  MLI: 'Mali',
  GIN: 'Guinée',
  TGO: 'Togo',
  BEN: 'Bénin',
  NER: 'Niger',
  MRT: 'Mauritanie',
  GHA: 'Ghana',
  CMR: 'Cameroun',
  NGA: 'Nigeria',
  MAR: 'Maroc',
  TUN: 'Tunisie',
  DZA: 'Algérie',
  EGY: 'Égypte',
  GMB: 'Gambie',
  GNB: 'Guinée-Bissau',
  SLE: 'Sierra Leone',
  LBR: 'Liberia',
  FRA: 'France',
  BEL: 'Belgique',
};

export function useMobileMoneyProviders() {
  const providers    = ref<MobileMoneyProvider[]>([]);
  const wallets      = ref<MobileWallet[]>([]);
  const loading      = ref(false);
  const error        = ref<string | null>(null);
  const companyStore = useCompanyStore();

  // Charger tous les opérateurs Mobile Money globaux
  async function loadProviders() {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await insforge.database
        .from('payment_providers')
        .select('*')
        .eq('type', 'mobile_money')
        .eq('is_active', true)
        .order('name');
      if (err) { error.value = err.message; return; }
      providers.value = (data || []) as MobileMoneyProvider[];
    } finally {
      loading.value = false;
    }
  }

  // Charger les wallets Mobile Money de la company (numéros enregistrés)
  async function loadWallets() {
    if (!companyStore.company?.id) return;
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await insforge.database
        .from('mobile_wallets')
        .select('*')
        .eq('company_id', companyStore.company.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (err) { error.value = err.message; return; }
      wallets.value = (data || []) as MobileWallet[];
    } finally {
      loading.value = false;
    }
  }

  // Créer un wallet (numéro Mobile Money de la company)
  async function createWallet(payload: Omit<MobileWallet, 'id' | 'company_id' | 'current_balance' | 'created_at'>): Promise<MobileWallet> {
    if (!companyStore.company?.id) throw new Error('Entreprise non chargée');
    const { data, error: err } = await insforge.database
      .from('mobile_wallets')
      .insert([{ ...payload, company_id: companyStore.company.id, current_balance: 0 }])
      .select()
      .single();
    if (err) throw new Error(err.message);
    const created = data as MobileWallet;
    wallets.value.unshift(created);
    return created;
  }

  // Pays distincts extraits des providers chargés
  function getCountries(): CountryOption[] {
    const codes = new Set<string>();
    providers.value.forEach(p => p.country_codes?.forEach(c => codes.add(c)));
    return Array.from(codes)
      .map(code => ({ code, name: COUNTRY_NAMES[code] ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  // Opérateurs filtrés par pays
  function getProvidersByCountry(countryCode: string): MobileMoneyProvider[] {
    return providers.value.filter(p => p.country_codes?.includes(countryCode));
  }

  return {
    providers, wallets, loading, error,
    loadProviders, loadWallets, createWallet,
    getCountries, getProvidersByCountry,
    COUNTRY_NAMES,
  };
}
