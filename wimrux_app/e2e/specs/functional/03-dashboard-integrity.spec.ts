import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth.helper';
import { createErrorCollector, getCriticalErrors } from '../../helpers/console-errors.helper';
import { cleanupTestData } from '../../helpers/cleanup.helper';
import { createClientPM } from '../../helpers/clients.helper';
import { createCertifiedInvoiceViaApi } from '../../helpers/invoices.helper';
import { waitForAppPage } from '../../helpers/wait.helper';
import { REPORT } from '../../fixtures/selectors';

test.describe('Dashboard integrity', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('affiche les KPI et graphiques sans erreur réseau', async ({ page }) => {
    const errors = createErrorCollector(page);

    const client = await createClientPM(page);
    const totalTtc = 1_500_000;
    await createCertifiedInvoiceViaApi(page, 'FV', {
      ...(client.id ? { clientId: client.id } : {}),
      description: 'Facture certifiee E2E (E2E-TEST)',
      totalTtc,
    });

    await page.goto('/app');
    await waitForAppPage(page);

    const kpiTotalTtc = page.locator(REPORT.kpiTotalTtc);
    await expect(kpiTotalTtc).toBeVisible();
    const kpiText = await kpiTotalTtc.textContent();
    expect(kpiText).not.toMatch(/^0[\s\u202f\u00a0]?F?\s*CFA$/);
    expect(kpiText).toMatch(/[1-9]/);

    const chartBars = page.locator(`${REPORT.chartRevenue} > div`);
    await expect(chartBars).toHaveCount(12);

    const topClients = page.locator(REPORT.topClients);
    await expect(topClients).toBeVisible();
    await expect(topClients.locator('.row')).toHaveCount(2);

    const criticalErrors = getCriticalErrors(errors);
    expect(criticalErrors).toHaveLength(0);

    const insforgeCalls = errors.networkErrors.filter((e) => e.includes('insforge.app'));
    expect(insforgeCalls).toHaveLength(0);

    const createdAt400 = errors.networkErrors.filter((e) =>
      e.includes('created_at=') && e.startsWith('400 ')
    );
    expect(createdAt400).toHaveLength(0);
  });
});
