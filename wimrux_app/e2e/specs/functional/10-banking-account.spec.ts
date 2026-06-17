import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../../helpers/console-errors.helper';
import { waitForAppPage } from '../../helpers/wait.helper';
import { BANKING } from '../../fixtures/selectors';
import { TEST_MARKER } from '../../fixtures/test-data';

import { cleanupTestData } from '../../helpers/cleanup.helper';

const uniqueSuffix = Date.now().toString();
const bankName = `Banque E2E ${uniqueSuffix} ${TEST_MARKER}`;

async function saveAndNotify(page: any): Promise<void> {
  await page.click(BANKING.accountSaveBtn);
  const notification = page.locator('.q-notification');
  await notification.waitFor({ state: 'visible', timeout: 20_000 });
  const notifText = (await notification.textContent()) ?? '';
  if (!/créé|mis à jour/i.test(notifText)) {
    throw new Error(`Notification inattendue : ${notifText}`);
  }
}

test.describe('Banking account', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData();
    await login(page, 'adminWestago');
  });

  test('crée un compte bancaire et l\'affiche dans la liste', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/app/banking');
    await waitForAppPage(page);

    await page.click(BANKING.newAccountBtn);
    await page.waitForSelector(BANKING.accountDialog, { state: 'visible', timeout: 10_000 });

    await page.fill(BANKING.accountBankName, bankName);
    await page.fill(BANKING.accountNumber, '123456789012');
    await page.fill(BANKING.accountIban, 'BF12 3456 7890 1234');
    await page.fill(BANKING.accountBic, 'BOFABFBF');
    await page.fill(BANKING.accountHolder, 'WIMRUX E2E');
    await page.fill(BANKING.accountOpeningBalance, '5000000');

    await saveAndNotify(page);

    await page.goto('/app/banking');
    await waitForAppPage(page);

    const card = page.locator(BANKING.accountCard).filter({ hasText: bankName }).first();
    await expect(card).toBeVisible();
    await expect(card).toContainText('5 000 000');

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });
});
