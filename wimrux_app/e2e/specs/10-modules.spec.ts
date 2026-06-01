import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../helpers/console-errors.helper';
import { waitForAppPage } from '../helpers/wait.helper';

/**
 * 10 — Tests modules complémentaires
 * 
 * Couvre :
 * - Budgets
 * - Immobilisations
 * - Emprunts
 * - Investissements
 * - Workflows d'approbation
 * - Articles
 * - Landing page
 * - Pages légales
 */

test.describe('10 — Modules Complémentaires', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  const modules = [
    { path: '/app/budgets', name: 'Budgets' },
    { path: '/app/assets', name: 'Immobilisations' },
    { path: '/app/loans', name: 'Emprunts' },
    { path: '/app/investments', name: 'Investissements' },
    { path: '/app/articles', name: 'Articles' },
    { path: '/app/approvals/workflows', name: 'Workflows d\'approbation' },
  ];

  for (const mod of modules) {
    test(`${mod.name} se charge sans erreur`, async ({ page }) => {
      const errors = createErrorCollector(page);

      await page.goto(mod.path);
      await waitForAppPage(page);

      await expect(page.locator('.q-page')).toBeVisible();

      const realErrors = getRealErrors(errors);
      expect(realErrors, `Erreurs sur ${mod.path}: ${realErrors.join(', ')}`).toHaveLength(0);
    });
  }
});

test.describe('10b — Landing & Legal (public)', () => {

  test('landing page se charge sans erreur', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // La landing page doit avoir du contenu visible
    const body = await page.locator('body').textContent();
    expect(body?.trim().length).toBeGreaterThan(100);

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });

  test('page CGU se charge', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/legal/terms');
    await page.waitForLoadState('networkidle');

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });

  test('page politique de confidentialité se charge', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/legal/privacy');
    await page.waitForLoadState('networkidle');

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });
});
