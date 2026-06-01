import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../helpers/console-errors.helper';
import { waitForAppPage } from '../helpers/wait.helper';

/**
 * 06 — Tests Rapports & Fiscalité
 * 
 * Couvre :
 * - Rapports principaux
 * - Rapports standards
 * - Query Builder
 * - Tableaux de bord
 * - Déclarations fiscales
 * - Paiements fiscaux
 */

test.describe('06 — Rapports & Fiscalité', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  const reportRoutes = [
    { path: '/app/reports', name: 'Rapports' },
    { path: '/app/reports/standard', name: 'Rapports standards' },
    { path: '/app/reports/query-builder', name: 'Query Builder' },
    { path: '/app/reports/dashboards', name: 'Tableaux de bord' },
    { path: '/app/fiscal/declarations', name: 'Déclarations fiscales' },
    { path: '/app/tax-payments', name: 'Paiements fiscaux' },
  ];

  for (const route of reportRoutes) {
    test(`${route.name} se charge sans erreur`, async ({ page }) => {
      const errors = createErrorCollector(page);

      await page.goto(route.path);
      await waitForAppPage(page);

      await expect(page.locator('.q-page')).toBeVisible();

      const realErrors = getRealErrors(errors);
      expect(realErrors, `Erreurs sur ${route.path}: ${realErrors.join(', ')}`).toHaveLength(0);
    });
  }
});
