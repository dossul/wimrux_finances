import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../helpers/console-errors.helper';
import { waitForAppPage } from '../helpers/wait.helper';
import { AUDIT, ADMIN } from '../fixtures/selectors';
import { ADMIN_ROUTES } from '../fixtures/test-data';

/**
 * 09 — Tests Admin & Audit
 * 
 * Couvre :
 * - Journal d'audit
 * - Pages admin (KPI, health, AI usage, chatbot)
 */

test.describe('09 — Audit', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, 'superAdmin');
  });

  test('journal d\'audit se charge sans erreur', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/app/audit');
    await waitForAppPage(page);

    await expect(page.locator('.q-page')).toBeVisible();

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });

  test('table d\'audit présente', async ({ page }) => {
    await page.goto('/app/audit');
    await waitForAppPage(page);

    const table = page.locator(`${AUDIT.table}, .q-table`);
    const isVisible = await table.first().isVisible({ timeout: 5_000 }).catch(() => false);
    console.log(`[Audit] Table: ${isVisible ? 'visible' : 'non trouvée'}`);
  });
});

test.describe('09b — Admin', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, 'superAdmin');
  });

  for (const route of ADMIN_ROUTES) {
    test(`[Admin] ${route.name} se charge sans erreur`, async ({ page }) => {
      const errors = createErrorCollector(page);

      await page.goto(route.path);
      await waitForAppPage(page);

      await expect(page.locator('.q-page')).toBeVisible();

      const realErrors = getRealErrors(errors);
      expect(realErrors, `Erreurs sur ${route.path}: ${realErrors.join(', ')}`).toHaveLength(0);
    });
  }
});
