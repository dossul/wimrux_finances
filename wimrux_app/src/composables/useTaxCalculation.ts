import type { TaxGroup, PriceMode, PaymentType, InvoiceItem } from 'src/types';

// --- 16 Groupes de taxation A-P ---
export const TAX_GROUP_RATES: Record<TaxGroup, { description: string; tva: number; psvb: number }> = {
  A: { description: 'Exonéré', tva: 0, psvb: 0.02 },
  B: { description: 'TVA taxable 1', tva: 0.18, psvb: 0.02 },
  C: { description: 'TVA taxable 2', tva: 0.10, psvb: 0.02 },
  D: { description: 'Exportation produits taxables', tva: 0, psvb: 0 },
  E: { description: 'Régime dérogatoire', tva: 0, psvb: 0.01 },
  F: { description: 'Régime dérogatoire', tva: 0.18, psvb: 0.01 },
  G: { description: 'Régime dérogatoire', tva: 0.10, psvb: 0.01 },
  H: { description: 'Régime synthétique', tva: 0, psvb: 0 },
  I: { description: 'Consignation emballage', tva: 0, psvb: 0 },
  J: { description: 'Dépôts, garantie, caution', tva: 0, psvb: 0 },
  K: { description: 'Débours', tva: 0, psvb: 0 },
  L: { description: 'Taxe développement touristique', tva: 0.10, psvb: 0 },
  M: { description: 'Taxe séjour hôtelier', tva: 0.10, psvb: 0 },
  N: { description: 'PBA (Droits fixes)', tva: 0, psvb: 0 },
  O: { description: 'Réservé', tva: 0, psvb: 0 },
  P: { description: 'Réservé', tva: 0, psvb: 0 },
};

// Arrondi fiscal: 2 décimales, ≥ 0.005 → arrondi supérieur
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export interface ItemTaxResult {
  amountHT: number;
  amountTVA: number;
  amountPSVB: number;
  amountTTC: number;
}

export interface TaxSummary {
  totalHT: Record<TaxGroup, number>;
  tva: Record<TaxGroup, number>;
  psvb: Record<TaxGroup, number>;
  grandTotalHT: number;
  grandTotalTVA: number;
  grandTotalPSVB: number;
  totalTTC: number;
  stampDuty: number;
}

function initGroupMap(): Record<TaxGroup, number> {
  const map = {} as Record<TaxGroup, number>;
  const groups: TaxGroup[] = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P'];
  groups.forEach(g => { map[g] = 0; });
  return map;
}

export function useTaxCalculation() {

  // Conforme DGI BF — Spéc. SFE §6.9
  // Base taxable TVA = montant HT + taxe spécifique (si applicable)
  // TVA = base taxable × taux TVA
  // TTC = HT + taxe spécifique + TVA
  function calculateItemTax(
    price: number,
    quantity: number,
    taxGroup: TaxGroup,
    priceMode: PriceMode,
    discount = 0,
    specificTax = 0,
  ): ItemTaxResult {
    const rates = TAX_GROUP_RATES[taxGroup];

    let ht: number;
    if (priceMode === 'TTC') {
      // Le prix saisi est TTC (hors taxe spécifique)
      const priceTTC = round2(price * quantity - discount);
      ht = round2(priceTTC / (1 + rates.tva));
    } else {
      // Le prix saisi est HT
      ht = round2(price * quantity - discount);
    }

    // §6.9: Base taxable TVA augmentée de la taxe spécifique
    const baseTVA = round2(ht + specificTax);
    const tvaMontant = round2(baseTVA * rates.tva);

    const ttc = round2(ht + specificTax + tvaMontant);
    const psvbMontant = round2(ttc * rates.psvb);

    return {
      amountHT: ht,
      amountTVA: tvaMontant,
      amountPSVB: psvbMontant,
      amountTTC: ttc,
    };
  }

  function calculateStampDuty(totalTTC: number, payments: { type: PaymentType; amount: number }[]): number {
    const cashAmount = payments
      .filter(p => p.type === 'ESPECES')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    if (cashAmount <= 0) return 0;
    if (totalTTC < 5000) return 0;
    if (totalTTC <= 25000) return 100;
    if (totalTTC <= 50000) return 200;
    if (totalTTC <= 100000) return 500;
    return 1000;
  }

  function calculateInvoiceTotals(
    items: Pick<InvoiceItem, 'price' | 'quantity' | 'tax_group' | 'discount' | 'specific_tax'>[],
    priceMode: PriceMode,
    payments: { type: PaymentType; amount: number }[] = [],
  ): TaxSummary {
    const totalHT = initGroupMap();
    const tva = initGroupMap();
    const psvb = initGroupMap();

    let grandTotalHT = 0;
    let grandTotalTVA = 0;
    let grandTotalPSVB = 0;
    let totalTTC = 0;

    for (const item of items) {
      const result = calculateItemTax(
        item.price,
        item.quantity,
        item.tax_group,
        priceMode,
        item.discount,
        item.specific_tax,
      );

      totalHT[item.tax_group] = round2(totalHT[item.tax_group] + result.amountHT);
      tva[item.tax_group] = round2(tva[item.tax_group] + result.amountTVA);
      psvb[item.tax_group] = round2(psvb[item.tax_group] + result.amountPSVB);

      grandTotalHT += result.amountHT;
      grandTotalTVA += result.amountTVA;
      grandTotalPSVB += result.amountPSVB;
      totalTTC += result.amountTTC;
    }

    const stamp = calculateStampDuty(round2(totalTTC), payments);

    return {
      totalHT,
      tva,
      psvb,
      grandTotalHT: round2(grandTotalHT),
      grandTotalTVA: round2(grandTotalTVA),
      grandTotalPSVB: round2(grandTotalPSVB),
      totalTTC: round2(totalTTC),
      stampDuty: stamp,
    };
  }

  return {
    TAX_GROUP_RATES,
    calculateItemTax,
    calculateStampDuty,
    calculateInvoiceTotals,
    round2,
  };
}
