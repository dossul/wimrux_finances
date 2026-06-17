import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../../helpers/console-errors.helper';
import { waitForAppPage } from '../../helpers/wait.helper';
import { ARTICLE } from '../../fixtures/selectors';
import { TEST_MARKER } from '../../fixtures/test-data';

import { cleanupTestData } from '../../helpers/cleanup.helper';

const uniqueSuffix = Date.now().toString();
const articleName = `Article E2E ${uniqueSuffix} ${TEST_MARKER}`;

async function saveAndNotify(page: any): Promise<void> {
  await page.click(ARTICLE.saveBtn);
  const notification = page.locator('.q-notification');
  await notification.waitFor({ state: 'visible', timeout: 20_000 });
  const notifText = (await notification.textContent()) ?? '';
  if (!/créé|modifié/i.test(notifText)) {
    throw new Error(`Notification inattendue : ${notifText}`);
  }
}

test.describe('Article lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await cleanupTestData();
    await login(page, 'adminWestago');
  });

  test('crée un article et l\'affiche dans le catalogue', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/app/articles');
    await waitForAppPage(page);

    await page.click(ARTICLE.newBtn);
    await page.waitForSelector(ARTICLE.dialog, { state: 'visible', timeout: 10_000 });

    await page.fill(ARTICLE.code, `ART-E2E-${Date.now()}`);
    await page.fill(ARTICLE.name, articleName);

    await page.locator(`${ARTICLE.type} input`).first().click();
    await page.waitForSelector('.q-menu .q-item', { state: 'visible', timeout: 10_000 });
    await page.locator('.q-menu .q-item').filter({ hasText: 'LOCBIE' }).first().click();

    await page.locator(`${ARTICLE.taxGroup} input`).first().click();
    await page.waitForSelector('.q-menu .q-item', { state: 'visible', timeout: 10_000 });
    await page.locator('.q-menu .q-item').filter({ hasText: 'Groupe B' }).first().click();

    await page.fill(ARTICLE.unitPrice, '75000');

    await saveAndNotify(page);

    await page.goto('/app/articles');
    await waitForAppPage(page);

    const row = page.locator(ARTICLE.table).locator('tbody tr').filter({ hasText: articleName }).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText('LOCBIE');
    await expect(row).toContainText('B');

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });
});
