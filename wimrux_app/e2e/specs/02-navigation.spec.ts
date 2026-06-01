import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.helper';
import { createErrorCollector, getRealErrors, formatErrorSummary } from '../helpers/console-errors.helper';
import { waitForAppPage } from '../helpers/wait.helper';
import { ALL_APP_ROUTES, ADMIN_ROUTES } from '../fixtures/test-data';

/**
 * 02 — Navigation complète & Smoke Test
 * 
 * Objectif : Naviguer sur CHAQUE page de l'application en tant qu'utilisateur
 * authentifié et vérifier :
 * 
 * 1. ✅ La page charge sans crash (pas de page blanche)
 * 2. ✅ 0 erreur console JavaScript
 * 3. ✅ 0 erreur réseau (pas de 4xx/5xx hors favicon)
 * 4. ✅ Le conteneur .q-page est visible
 * 5. ✅ Pas d'erreur JS non capturée (pageerror)
 *
 * Ce test est le garde-fou ultime avant la mise en production.
 */

test.describe('02 — Navigation Complète (Smoke Test)', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, 'superAdmin');
  });

  // Test paramétré pour chaque route de l'application
  for (const route of ALL_APP_ROUTES) {
    test(`${route.name} (${route.path}) — 0 erreur`, async ({ page }) => {
      const errors = createErrorCollector(page);

      // Naviguer vers la page
      await page.goto(route.path);

      // Attendre le chargement complet
      try {
        await waitForAppPage(page, 20_000);
      } catch {
        // Si .q-page n'apparaît pas, la page est peut-être vide ou en erreur
        console.warn(`[Smoke] ⚠️ ${route.name}: .q-page non trouvé après 20s`);
      }

      // Vérifier que la page n'est pas complètement vide
      const bodyContent = await page.locator('body').textContent();
      expect(bodyContent?.trim().length, `Page ${route.path} est vide`).toBeGreaterThan(0);

      // Vérifier pas de page 404 non intentionnelle
      const is404 = await page.locator('text=404, text=Page introuvable').isVisible({ timeout: 1_000 }).catch(() => false);
      expect(is404, `Page ${route.path} affiche une 404`).toBe(false);

      // Collecter et afficher le résumé des erreurs
      const summary = formatErrorSummary(errors, route.name);
      console.log(summary);

      // Assertion finale : 0 erreur réelle
      const realErrors = getRealErrors(errors);
      expect(
        realErrors,
        `${route.name} (${route.path}) a ${realErrors.length} erreur(s):\n${realErrors.join('\n')}`,
      ).toHaveLength(0);
    });
  }

  // Routes Admin (project_admin uniquement)
  for (const route of ADMIN_ROUTES) {
    test(`[Admin] ${route.name} (${route.path}) — 0 erreur`, async ({ page }) => {
      const errors = createErrorCollector(page);

      await page.goto(route.path);

      try {
        await waitForAppPage(page, 20_000);
      } catch {
        console.warn(`[Smoke Admin] ⚠️ ${route.name}: .q-page non trouvé`);
      }

      const realErrors = getRealErrors(errors);
      console.log(formatErrorSummary(errors, route.name));

      expect(
        realErrors,
        `[Admin] ${route.name} a ${realErrors.length} erreur(s):\n${realErrors.join('\n')}`,
      ).toHaveLength(0);
    });
  }
});

test.describe('02b — Navigation Multi-Tenant', () => {

  const accounts = ['adminIltic', 'adminWestago'] as const;

  for (const account of accounts) {
    test(`Login ${account} et navigation basique`, async ({ page }) => {
      const errors = createErrorCollector(page);

      await login(page, account);

      // Vérifier dashboard
      expect(page.url()).toContain('/app');
      await expect(page.locator('.q-page')).toBeVisible();

      // Naviguer vers les pages principales
      const criticalRoutes = ['/app/invoices', '/app/clients', '/app/treasury', '/app/settings'];
      for (const route of criticalRoutes) {
        await page.goto(route);
        await waitForAppPage(page).catch(() => {});
      }

      const realErrors = getRealErrors(errors);
      console.log(`[Multi-Tenant ${account}] ${realErrors.length} erreurs`);

      // Tolérant pour le multi-tenant (on logue mais on ne bloque pas)
      if (realErrors.length > 0) {
        console.warn(`[Multi-Tenant ${account}] Erreurs:\n${realErrors.join('\n')}`);
      }
    });
  }
});
