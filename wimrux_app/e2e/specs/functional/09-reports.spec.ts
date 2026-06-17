import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../../helpers/console-errors.helper';
import { waitForAppPage } from '../../helpers/wait.helper';
import { REPORT } from '../../fixtures/selectors';
import { createValidatedInvoiceViaApi } from '../../helpers/invoices.helper';
import { TEST_INVOICE } from '../../fixtures/test-data';

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  test('génère un rapport et exporte en CSV', async ({ page }) => {
    const errors = createErrorCollector(page);

    await createValidatedInvoiceViaApi(page, 'FV', {
      description: 'Rapport E2E',
      items: TEST_INVOICE.items.map((item) => ({
        designation: item.designation,
        qty: item.qty,
        priceHt: item.priceHt,
        taxGroup: item.taxGroup,
      })),
    });

    await page.goto('/app/reports');
    await waitForAppPage(page);

    await page.click(REPORT.generateBtn);

    await expect(page.locator(REPORT.kpiInvoiceCount)).toHaveText(/[1-9]/, { timeout: 15_000 });
    // Le format fr-BF utilise une espace insécable étroite (U+202F) entre F et CFA
    const currencyRe = /FCFA|F[\s\u202F]CFA/;
    await expect(page.locator(REPORT.kpiRevenueHt)).toHaveText(currencyRe);
    await expect(page.locator(REPORT.kpiTvaCollected)).toHaveText(currencyRe);
    await expect(page.locator(REPORT.kpiTotalTtc)).toHaveText(currencyRe);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click(REPORT.exportCsvBtn),
    ]);

    expect(download.suggestedFilename()).toMatch(/rapport_.*\.csv/);

    await page.click('[data-testid="tab-income"]');
    await expect(page.locator('td:has-text("PRODUITS")').first()).toBeVisible();

    await page.click('[data-testid="tab-aging"]');
    await expect(page.locator('text=Balance âgée').first()).toBeVisible();

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });
});
