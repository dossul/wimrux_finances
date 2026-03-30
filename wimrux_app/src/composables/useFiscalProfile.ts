import { computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store';
import type { FiscalConfig, TaxGroupConfig, PaymentType } from 'src/types';

// Default BF fiscal config — used as fallback and as template for new GENERIC accounts
export const DEFAULT_BF_FISCAL_CONFIG: FiscalConfig = {
  country: 'BF',
  currency: 'XOF',
  currency_label: 'FCFA',
  secef_enabled: true,
  secef_type: 'MCF',
  tax_category: 'BIC',
  tax_sub_regime: 'RNI',
  tax_groups: {
    A: { description: 'Exonéré', tva: 0, psvb: 0.02 },
    B: { description: 'TVA taxable 1', tva: 0.18, psvb: 0.02 },
    C: { description: 'TVA taxable 2', tva: 0.10, psvb: 0.02 },
    D: { description: 'Exportation', tva: 0, psvb: 0 },
    E: { description: 'Régime dérogatoire', tva: 0, psvb: 0.01 },
    F: { description: 'Régime dérogatoire TVA 18%', tva: 0.18, psvb: 0.01 },
    G: { description: 'Régime dérogatoire TVA 10%', tva: 0.10, psvb: 0.01 },
    H: { description: 'Régime synthétique', tva: 0, psvb: 0 },
    I: { description: 'Consignation emballage', tva: 0, psvb: 0 },
    J: { description: 'Dépôts/garantie', tva: 0, psvb: 0 },
    K: { description: 'Débours', tva: 0, psvb: 0 },
    L: { description: 'TDT touristique', tva: 0.10, psvb: 0 },
    M: { description: 'Taxe séjour hôtelier', tva: 0.10, psvb: 0 },
    N: { description: 'PBA droits fixes', tva: 0, psvb: 0 },
    O: { description: 'Réservé', tva: 0, psvb: 0 },
    P: { description: 'Réservé', tva: 0, psvb: 0 },
  },
  psvb_enabled: true,
  psvb_label: 'PSVB',
  stamp_duty_enabled: true,
  stamp_duty_thresholds: [
    { max: 4999, amount: 0 },
    { max: 24999, amount: 100 },
    { max: 49999, amount: 200 },
    { max: 99999, amount: 500 },
    { max: null, amount: 1000 },
  ],
  invoice_types: ['FV', 'FT', 'FA', 'EV', 'ET', 'EA'],
  client_types: ['CC', 'PM', 'PP', 'PC'],
  article_types: ['LOCBIE', 'LOCSER', 'IMPBIE', 'IMPSER'],
};

export function useFiscalProfile() {
  const companyStore = useCompanyStore();

  const fiscalConfig = computed<FiscalConfig>(() => {
    const cfg = companyStore.company?.fiscal_config;
    if (cfg && Object.keys(cfg).length > 0) return cfg;
    return DEFAULT_BF_FISCAL_CONFIG;
  });

  const isBF = computed(() => companyStore.company?.fiscal_profile === 'BF');

  const isSecefEnabled = computed(() => fiscalConfig.value.secef_enabled);

  const getCurrencyLabel = computed(() => fiscalConfig.value.currency_label || 'FCFA');

  const taxGroups = computed(() => fiscalConfig.value.tax_groups);

  const taxGroupKeys = computed(() => Object.keys(fiscalConfig.value.tax_groups));

  const psvbEnabled = computed(() => fiscalConfig.value.psvb_enabled);

  const psvbLabel = computed(() => fiscalConfig.value.psvb_label || 'PSVB');

  const stampDutyEnabled = computed(() => fiscalConfig.value.stamp_duty_enabled);

  const availableInvoiceTypes = computed(() => fiscalConfig.value.invoice_types);

  const availableClientTypes = computed(() => fiscalConfig.value.client_types);

  const availableArticleTypes = computed(() => fiscalConfig.value.article_types);

  function getTaxGroupConfig(group: string): TaxGroupConfig {
    return taxGroups.value[group] ?? { description: group, tva: 0, psvb: 0 };
  }

  function calculateStampDuty(totalTTC: number, payments: { type: PaymentType; amount: number }[]): number {
    if (!stampDutyEnabled.value) return 0;
    const thresholds = fiscalConfig.value.stamp_duty_thresholds;
    if (!thresholds || thresholds.length === 0) return 0;

    const cashAmount = payments
      .filter(p => p.type === 'ESPECES')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    if (cashAmount <= 0) return 0;

    for (const t of thresholds) {
      if (t.max === null || totalTTC <= t.max) return t.amount;
    }
    return 0;
  }

  function getTaxRegimeLabel(): string {
    const cfg = fiscalConfig.value;
    if (!cfg.tax_category) return '';
    const sub = cfg.tax_sub_regime ? `   Régime : ${cfg.tax_sub_regime}` : '';
    return `Catégorie : ${cfg.tax_category}${sub}`;
  }

  const taxCategoryOptions = [
    { value: 'BIC', label: 'BIC — Bénéfices Industriels et Commerciaux' },
    { value: 'BNC', label: 'BNC — Bénéfices Non Commerciaux' },
    { value: 'BA',  label: 'BA — Bénéfices Agricoles' },
    { value: 'IS',  label: 'IS — Impôt sur les Sociétés' },
  ];

  const taxSubRegimeOptions: Record<string, { value: string; label: string }[]> = {
    BIC: [
      { value: 'RNI', label: 'RNI — Régime Normal d\'Imposition' },
      { value: 'RSI', label: 'RSI — Régime Simplifié d\'Imposition' },
      { value: 'CME', label: 'CME — Contribution des Micro-Entreprises' },
      { value: 'CSE', label: 'CSE — Contribution du Secteur Informel' },
    ],
    BNC: [
      { value: 'RNI', label: 'RNI — Régime Normal d\'Imposition' },
      { value: 'RSI', label: 'RSI — Régime Simplifié d\'Imposition' },
    ],
    BA: [
      { value: 'RNI', label: 'RNI — Régime Normal d\'Imposition' },
      { value: 'RSI', label: 'RSI — Régime Simplifié d\'Imposition' },
    ],
    IS: [
      { value: 'RNI', label: 'RNI — Régime Normal d\'Imposition' },
      { value: 'RSI', label: 'RSI — Régime Simplifié d\'Imposition' },
      { value: 'ND',  label: 'ND — Non Domicilié' },
    ],
  };

  return {
    fiscalConfig,
    isBF,
    isSecefEnabled,
    getCurrencyLabel,
    taxGroups,
    taxGroupKeys,
    psvbEnabled,
    psvbLabel,
    stampDutyEnabled,
    availableInvoiceTypes,
    availableClientTypes,
    availableArticleTypes,
    getTaxGroupConfig,
    calculateStampDuty,
    getTaxRegimeLabel,
    taxCategoryOptions,
    taxSubRegimeOptions,
    DEFAULT_BF_FISCAL_CONFIG,
  };
}
