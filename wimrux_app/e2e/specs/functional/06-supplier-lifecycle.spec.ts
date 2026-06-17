import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../../helpers/console-errors.helper';
import { waitForAppPage } from '../../helpers/wait.helper';
import { SUPPLIER } from '../../fixtures/selectors';
import { TEST_MARKER } from '../../fixtures/test-data';

import { cleanupTestData } from '../../helpers/cleanup.helper';

const uniqueSuffix = Date.now().toString();
const supplierName = `Fournisseur E2E ${uniqueSuffix} ${TEST_MARKER}`;

async function saveAndWaitForNotification(page: any): Promise<void> {
  await page.click(SUPPLIER.saveBtn);
  const notification = page.locator('.q-notification');
  await notification.waitFor({ state: 'visible', timeout: 20_000 });
  const notifText = (await notification.textContent()) ?? '';
  if (!/créé|modifié/i.test(notifText)) {
    throw new Error(`Notification inattendue : ${notifText}`);
  }
}

test.describe('Supplier lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData();
    await login(page, 'adminWestago');
  });

  test('crée, affiche et désactive un fournisseur', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/app/suppliers');
    await waitForAppPage(page);

    await page.click(SUPPLIER.newBtn);
    await page.waitForSelector(SUPPLIER.dialog, { state: 'visible', timeout: 10_000 });

    await page.fill(SUPPLIER.name, supplierName);
    await page.fill(SUPPLIER.ifu, '00014674A');
    await page.fill(SUPPLIER.rccm, 'RCCM-E2E-001');

    await page.locator(`${SUPPLIER.regime} input`).first().click();
    await page.waitForSelector('.q-menu .q-item', { state: 'visible', timeout: 10_000 });
    await page.locator('.q-menu .q-item').filter({ hasText: 'RNI' }).first().click();

    await page.fill(SUPPLIER.division, 'DME-CV');
    await page.fill(SUPPLIER.phone, '+22670000002');
    await page.fill(SUPPLIER.email, 'fournisseur@e2e.test');
    await page.fill(SUPPLIER.address, 'Ouagadougou, Burkina Faso');
    await page.fill(SUPPLIER.bankName, 'BOA');
    await page.fill(SUPPLIER.bankIban, 'BF123456789');
    await page.fill(SUPPLIER.bankBic, 'BOFABFBF');

    await saveAndWaitForNotification(page);

    await page.goto('/app/suppliers');
    await waitForAppPage(page);

    const row = page.locator(SUPPLIER.table).locator('tbody tr').filter({ hasText: supplierName }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('RNI');
    await expect(row).toContainText('DME-CV');

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });
});
