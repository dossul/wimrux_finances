import { test, expect, Page } from '@playwright/test';
import { login } from '../../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../../helpers/console-errors.helper';
import { cleanupTestData } from '../../helpers/cleanup.helper';
import { waitForAppPage } from '../../helpers/wait.helper';
import { TREASURY } from '../../fixtures/selectors';
import { TEST_BANK_ACCOUNT, TEST_TREASURY_MOVEMENT } from '../../fixtures/test-data';

function parseBalance(text: string | null): number {
  if (!text) return 0;
  const cleaned = text.replace(/[^\d]/g, '');
  return Number(cleaned) || 0;
}

async function saveAccountAndWait(page: Page, maxAttempts = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await page.click(TREASURY.bankAccountSaveBtn);

    const notification = page.locator('.q-notification');
    await notification.waitFor({ state: 'visible', timeout: 20_000 });
    const notifText = (await notification.textContent()) ?? '';

    if (notifText.includes('créé')) {
      return;
    }

    if (notifText.includes('already exists') && attempt < maxAttempts) {
      await page.waitForTimeout(1_000);
      continue;
    }

    throw new Error(`Notification inattendue lors de la création du compte : ${notifText}`);
  }
}

async function saveMovementAndWait(page: Page): Promise<void> {
  await page.click(TREASURY.movementSaveBtn);
  const notification = page.locator('.q-notification');
  await notification.waitFor({ state: 'visible', timeout: 20_000 });
  const notifText = (await notification.textContent()) ?? '';
  if (!/créé|enregistré|ajouté/i.test(notifText)) {
    throw new Error(`Notification inattendue lors de la création du mouvement : ${notifText}`);
  }
}

test.describe('Treasury', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('crée un compte et met à jour le solde après crédit et débit', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/app/treasury');
    await waitForAppPage(page);

    await page.click(TREASURY.bankAccountNewBtn);
    await page.fill(TREASURY.bankAccountName, TEST_BANK_ACCOUNT.name);
    await page.click(TREASURY.bankAccountType);
    await page.locator('.q-menu .q-item').filter({ hasText: TEST_BANK_ACCOUNT.type }).first().click();
    await page.fill(TREASURY.bankAccountBalance, String(TEST_BANK_ACCOUNT.initialBalance));
    await saveAccountAndWait(page);

    const accountCard = page.locator('.q-card').filter({ hasText: TEST_BANK_ACCOUNT.name }).first();
    await expect(accountCard).toBeVisible();

    // Crédit
    await page.click(TREASURY.newMovementBtn);
    await page.locator(`${TREASURY.movementAccount} input`).first().click();
    await page.waitForSelector('.q-menu .q-item', { state: 'visible', timeout: 10_000 });
    await page.locator('.q-menu .q-item').filter({ hasText: TEST_BANK_ACCOUNT.name }).first().click();

    await page.locator(`${TREASURY.movementType} .q-btn`).filter({ hasText: 'Entrée' }).first().click();

    await page.fill(TREASURY.movementAmount, String(TEST_TREASURY_MOVEMENT.credit.amount));
    await page.fill(TREASURY.movementReference, TEST_TREASURY_MOVEMENT.credit.reference);
    await saveMovementAndWait(page);

    // Attendre que le solde reflète le crédit avant le reload
    await expect.poll(
      async () => parseBalance(await accountCard.locator('.text-h5').textContent()),
      { timeout: 15_000 }
    ).toBe(TEST_BANK_ACCOUNT.initialBalance + TEST_TREASURY_MOVEMENT.credit.amount);

    await page.reload();
    await waitForAppPage(page);

    const balanceAfterCredit = parseBalance(await accountCard.locator('.text-h5').textContent());
    expect(balanceAfterCredit).toBe(TEST_BANK_ACCOUNT.initialBalance + TEST_TREASURY_MOVEMENT.credit.amount);

    // Débit
    await page.click(TREASURY.newMovementBtn);
    await page.locator(`${TREASURY.movementAccount} input`).first().click();
    await page.waitForSelector('.q-menu .q-item', { state: 'visible', timeout: 10_000 });
    await page.locator('.q-menu .q-item').filter({ hasText: TEST_BANK_ACCOUNT.name }).first().click();

    await page.locator(`${TREASURY.movementType} .q-btn`).filter({ hasText: 'Sortie' }).first().click();

    await page.fill(TREASURY.movementAmount, String(TEST_TREASURY_MOVEMENT.debit.amount));
    await page.fill(TREASURY.movementReference, TEST_TREASURY_MOVEMENT.debit.reference);
    await saveMovementAndWait(page);

    const expectedAfterDebit =
      TEST_BANK_ACCOUNT.initialBalance +
      TEST_TREASURY_MOVEMENT.credit.amount -
      TEST_TREASURY_MOVEMENT.debit.amount;

    await expect.poll(
      async () => parseBalance(await accountCard.locator('.text-h5').textContent()),
      { timeout: 15_000 }
    ).toBe(expectedAfterDebit);

    await page.reload();
    await waitForAppPage(page);

    const balanceAfterDebit = parseBalance(await accountCard.locator('.text-h5').textContent());
    expect(balanceAfterDebit).toBe(expectedAfterDebit);

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });
});
