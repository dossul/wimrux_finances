import { describe, it, expect } from 'vitest';
import { useTaxCalculation, TAX_GROUP_RATES } from '../useTaxCalculation';

const { calculateItemTax, calculateStampDuty, calculateInvoiceTotals, round2 } = useTaxCalculation();

describe('round2', () => {
  it('rounds to 2 decimal places', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(1.004)).toBe(1);
    expect(round2(100.456)).toBe(100.46);
    expect(round2(0)).toBe(0);
  });
});

describe('TAX_GROUP_RATES', () => {
  it('has 16 groups A-P', () => {
    const groups = Object.keys(TAX_GROUP_RATES);
    expect(groups).toHaveLength(16);
    expect(groups[0]).toBe('A');
    expect(groups[15]).toBe('P');
  });

  it('group B has 18% TVA and 2% PSVB', () => {
    expect(TAX_GROUP_RATES.B.tva).toBe(0.18);
    expect(TAX_GROUP_RATES.B.psvb).toBe(0.02);
  });

  it('group A (exonéré) has 0% TVA', () => {
    expect(TAX_GROUP_RATES.A.tva).toBe(0);
    expect(TAX_GROUP_RATES.A.psvb).toBe(0.02);
  });

  it('group D (export) has 0% TVA and 0% PSVB', () => {
    expect(TAX_GROUP_RATES.D.tva).toBe(0);
    expect(TAX_GROUP_RATES.D.psvb).toBe(0);
  });
});

describe('calculateItemTax', () => {
  it('calculates group B item in HT mode', () => {
    // 1000 FCFA HT × 1 unité, groupe B (18% TVA, 2% PSVB)
    const result = calculateItemTax(1000, 1, 'B', 'HT');
    expect(result.amountHT).toBe(1000);
    expect(result.amountTVA).toBe(180);       // 1000 × 18%
    expect(result.amountTTC).toBe(1180);       // 1000 + 180
    expect(result.amountPSVB).toBe(23.6);      // 1180 × 2%
  });

  it('calculates group B item in TTC mode', () => {
    // 1180 FCFA TTC → HT = 1180 / 1.18 = 1000
    const result = calculateItemTax(1180, 1, 'B', 'TTC');
    expect(result.amountHT).toBe(1000);
    expect(result.amountTVA).toBe(180);
    expect(result.amountTTC).toBe(1180);
  });

  it('handles quantity > 1', () => {
    const result = calculateItemTax(500, 3, 'B', 'HT');
    expect(result.amountHT).toBe(1500);
    expect(result.amountTVA).toBe(270);        // 1500 × 18%
    expect(result.amountTTC).toBe(1770);
  });

  it('applies discount', () => {
    // 1000 × 2 = 2000, discount 200 → HT = 1800
    const result = calculateItemTax(1000, 2, 'B', 'HT', 200);
    expect(result.amountHT).toBe(1800);
    expect(result.amountTVA).toBe(324);        // 1800 × 18%
    expect(result.amountTTC).toBe(2124);
  });

  it('§6.9: specific tax augments TVA base', () => {
    // HT = 1000, specificTax = 100
    // Base TVA = 1000 + 100 = 1100
    // TVA = 1100 × 18% = 198
    // TTC = 1000 + 100 + 198 = 1298
    const result = calculateItemTax(1000, 1, 'B', 'HT', 0, 100);
    expect(result.amountHT).toBe(1000);
    expect(result.amountTVA).toBe(198);
    expect(result.amountTTC).toBe(1298);
  });

  it('exonerated group A has zero TVA', () => {
    const result = calculateItemTax(10000, 1, 'A', 'HT');
    expect(result.amountHT).toBe(10000);
    expect(result.amountTVA).toBe(0);
    expect(result.amountTTC).toBe(10000);
    expect(result.amountPSVB).toBe(200);       // 10000 × 2%
  });

  it('export group D has zero TVA and zero PSVB', () => {
    const result = calculateItemTax(5000, 1, 'D', 'HT');
    expect(result.amountHT).toBe(5000);
    expect(result.amountTVA).toBe(0);
    expect(result.amountTTC).toBe(5000);
    expect(result.amountPSVB).toBe(0);
  });
});

describe('calculateStampDuty', () => {
  it('returns 0 if no cash payment', () => {
    expect(calculateStampDuty(50000, [{ type: 'VIREMENT', amount: 50000 }])).toBe(0);
  });

  it('returns 0 if total < 5000', () => {
    expect(calculateStampDuty(4000, [{ type: 'ESPECES', amount: 4000 }])).toBe(0);
  });

  it('returns 100 for 5000 ≤ total ≤ 25000', () => {
    expect(calculateStampDuty(5000, [{ type: 'ESPECES', amount: 5000 }])).toBe(100);
    expect(calculateStampDuty(25000, [{ type: 'ESPECES', amount: 25000 }])).toBe(100);
  });

  it('returns 200 for 25001 ≤ total ≤ 50000', () => {
    expect(calculateStampDuty(25001, [{ type: 'ESPECES', amount: 25001 }])).toBe(200);
    expect(calculateStampDuty(50000, [{ type: 'ESPECES', amount: 50000 }])).toBe(200);
  });

  it('returns 500 for 50001 ≤ total ≤ 100000', () => {
    expect(calculateStampDuty(50001, [{ type: 'ESPECES', amount: 50001 }])).toBe(500);
    expect(calculateStampDuty(100000, [{ type: 'ESPECES', amount: 100000 }])).toBe(500);
  });

  it('returns 1000 for total > 100000', () => {
    expect(calculateStampDuty(100001, [{ type: 'ESPECES', amount: 100001 }])).toBe(1000);
    expect(calculateStampDuty(1000000, [{ type: 'ESPECES', amount: 1000000 }])).toBe(1000);
  });
});

describe('calculateInvoiceTotals', () => {
  it('aggregates multiple items correctly', () => {
    const items = [
      { price: 1000, quantity: 2, tax_group: 'B' as const, discount: 0, specific_tax: 0 },
      { price: 500, quantity: 1, tax_group: 'A' as const, discount: 0, specific_tax: 0 },
    ];
    const result = calculateInvoiceTotals(items, 'HT');

    expect(result.grandTotalHT).toBe(2500);          // 2000 + 500
    expect(result.grandTotalTVA).toBe(360);           // 2000×18% + 500×0%
    expect(result.totalTTC).toBe(2860);               // 2360 + 500
    expect(result.totalHT.B).toBe(2000);
    expect(result.totalHT.A).toBe(500);
    expect(result.tva.B).toBe(360);
    expect(result.tva.A).toBe(0);
  });

  it('calculates stamp duty with cash payments', () => {
    const items = [
      { price: 30000, quantity: 1, tax_group: 'B' as const, discount: 0, specific_tax: 0 },
    ];
    const payments = [{ type: 'ESPECES' as const, amount: 35400 }];
    const result = calculateInvoiceTotals(items, 'HT', payments);

    expect(result.grandTotalHT).toBe(30000);
    expect(result.grandTotalTVA).toBe(5400);
    expect(result.totalTTC).toBe(35400);
    expect(result.stampDuty).toBe(200);               // 25001-50000 bracket
  });

  it('returns zero stamp duty with no cash', () => {
    const items = [
      { price: 50000, quantity: 1, tax_group: 'B' as const, discount: 0, specific_tax: 0 },
    ];
    const result = calculateInvoiceTotals(items, 'HT', [{ type: 'VIREMENT' as const, amount: 59000 }]);
    expect(result.stampDuty).toBe(0);
  });
});
