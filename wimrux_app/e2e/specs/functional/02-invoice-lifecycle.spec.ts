import { test, expect, Page } from '@playwright/test';
import { login } from '../../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../../helpers/console-errors.helper';
import { cleanupTestData } from '../../helpers/cleanup.helper';
import { createClientPM } from '../../helpers/clients.helper';
import { createInvoiceWithItemsViaApi, navigateToInvoiceEditor } from '../../helpers/invoices.helper';
import { waitForAppPage } from '../../helpers/wait.helper';
import { INVOICE } from '../../fixtures/selectors';
import { TEST_INVOICE } from '../../fixtures/test-data';

async function clickUntilStatus(page: Page, buttonSelector: string, expectedStatus: string, maxAttempts = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const btn = page.locator(buttonSelector);
    await btn.waitFor({ state: 'visible', timeout: 10_000 });
    await expect(btn).toBeEnabled({ timeout: 10_000 });
    await btn.click();

    try {
      await expect(page.locator(INVOICE.status)).toContainText(expectedStatus, { timeout: 8_000 });
      return;
    } catch {
      if (attempt === maxAttempts) throw new Error(`Le statut n'est pas passe a "${expectedStatus}" apres ${maxAttempts} tentatives`);
      await page.waitForTimeout(1_000);
    }
  }
}

test.describe('Invoice lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('crée une facture de vente et la fait passer par le workflow', async ({ page }) => {
    const errors = createErrorCollector(page);

    const client = await createClientPM(page);

    const invoiceId = await createInvoiceWithItemsViaApi(page, 'FV', {
      clientId: client.id ?? undefined,
      description: 'Vente E2E (E2E-TEST)',
      items: TEST_INVOICE.items.map((item) => ({
        designation: item.designation,
        qty: item.qty,
        priceHt: item.priceHt,
        taxGroup: item.taxGroup,
      })),
    });

    await navigateToInvoiceEditor(page, invoiceId);
    await waitForAppPage(page);

    await expect(page.locator(INVOICE.number)).not.toHaveText('Nouvelle facture', { timeout: 15_000 });

    // Les articles créés via API sont affichés dans le tableau
    for (const item of TEST_INVOICE.items) {
      const row = page.locator('table tbody tr').filter({ hasText: item.designation });
      await expect(row).toBeVisible();
    }

    // Pas besoin d'enregistrer le brouillon séparément : submit appelle saveDraft(true)
    await clickUntilStatus(page, INVOICE.submitBtn, 'En attente');
    await clickUntilStatus(page, INVOICE.approveBtn, 'Approuv');
    await clickUntilStatus(page, INVOICE.validateBtn, 'Valid');

    const certifyBtn = page.locator(INVOICE.certifyBtn);
    const certifyCount = await certifyBtn.count();
    if (certifyCount > 0) {
      await expect(certifyBtn).toBeDisabled();
    }

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });
});
