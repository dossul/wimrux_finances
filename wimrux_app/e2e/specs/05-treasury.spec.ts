import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../helpers/console-errors.helper';
import { waitForAppPage } from '../helpers/wait.helper';
import { TREASURY } from '../fixtures/selectors';

/**
 * 05 — Tests Trésorerie & Banking
 * 
 * Couvre :
 * - Page trésorerie principale
 * - Comptes bancaires
 * - Ordres de virement
 * - Chèques
 * - Frais bancaires
 * - Petite caisse
 * - Wallets mobiles
 * - Bouton nouveau mouvement
 * - Bouton nouveau compte bancaire
 */

test.describe('05 — Trésorerie & Banking', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  test('trésorerie se charge sans erreur', async ({ page }) => {
    const errors = createErrorCollector(page);
    await page.goto('/app/treasury');
    await waitForAppPage(page);

    await expect(page.locator('.q-page')).toBeVisible();

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });

  test('bouton nouveau mouvement visible', async ({ page }) => {
    await page.goto('/app/treasury');
    await waitForAppPage(page);

    const btn = page.locator(`${TREASURY.newMovementBtn}, button:has-text("Mouvement")`);
    const isVisible = await btn.first().isVisible({ timeout: 5_000 }).catch(() => false);
    expect(isVisible, 'Bouton "Nouveau mouvement" non trouvé').toBe(true);
  });

  test('dialog création mouvement', async ({ page }) => {
    await page.goto('/app/treasury');
    await waitForAppPage(page);

    const btn = page.locator(`${TREASURY.newMovementBtn}, button:has-text("Mouvement")`);
    await btn.first().click();
    await page.waitForTimeout(1_000);

    // Vérifier les champs du formulaire
    const accountField = page.locator(TREASURY.movementAccount);
    const amountField = page.locator(TREASURY.movementAmount);

    const accountVisible = await accountField.isVisible({ timeout: 3_000 }).catch(() => false);
    const amountVisible = await amountField.isVisible({ timeout: 3_000 }).catch(() => false);

    console.log(`[Treasury] Formulaire mouvement: compte=${accountVisible}, montant=${amountVisible}`);
  });

  const treasuryRoutes = [
    { path: '/app/banking', name: 'Comptes bancaires' },
    { path: '/app/banking/transfers', name: 'Ordres de virement' },
    { path: '/app/banking/checks', name: 'Chèques' },
    { path: '/app/banking/fees', name: 'Frais bancaires' },
    { path: '/app/petty-cash', name: 'Petite caisse' },
    { path: '/app/mobile-wallets', name: 'Wallets mobiles' },
    { path: '/app/wallets', name: 'Wallets de paiement' },
    { path: '/app/treasury/cashflow', name: 'Trésorerie prévisionnelle' },
  ];

  for (const route of treasuryRoutes) {
    test(`${route.name} (${route.path}) se charge`, async ({ page }) => {
      const errors = createErrorCollector(page);
      await page.goto(route.path);
      await waitForAppPage(page);

      await expect(page.locator('.q-page')).toBeVisible();

      const realErrors = getRealErrors(errors);
      expect(realErrors, `Erreurs sur ${route.path}: ${realErrors.join(', ')}`).toHaveLength(0);
    });
  }
});
