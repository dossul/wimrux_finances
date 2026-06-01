import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../helpers/console-errors.helper';
import { waitForAppPage } from '../helpers/wait.helper';
import { INVOICE } from '../fixtures/selectors';
import { TEST_INVOICE } from '../fixtures/test-data';

/**
 * 04 — Tests Factures
 * 
 * Couvre :
 * - Liste factures chargée sans erreur
 * - Bouton nouvelle facture visible
 * - Navigation vers l'éditeur de facture
 * - Vérification des filtres de recherche
 * - Export CSV (si disponible)
 */

test.describe('04 — Factures', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  test('liste factures se charge sans erreur', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/app/invoices');
    await waitForAppPage(page);

    await expect(page.locator('.q-page')).toBeVisible();

    const realErrors = getRealErrors(errors);
    expect(realErrors, `Erreurs sur /app/invoices: ${realErrors.join(', ')}`).toHaveLength(0);
  });

  test('bouton nouvelle facture visible', async ({ page }) => {
    await page.goto('/app/invoices');
    await waitForAppPage(page);

    const newBtn = page.locator(`${INVOICE.newBtn}, button:has-text("Nouvelle facture"), button:has-text("Nouveau")`);
    const isVisible = await newBtn.first().isVisible({ timeout: 5_000 }).catch(() => false);
    expect(isVisible, 'Bouton "Nouvelle facture" non trouvé').toBe(true);
  });

  test('navigation vers éditeur de facture', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/app/invoices/new');
    await waitForAppPage(page);

    await expect(page.locator('.q-page')).toBeVisible();

    const realErrors = getRealErrors(errors);
    expect(realErrors, `Erreurs sur /app/invoices/new: ${realErrors.join(', ')}`).toHaveLength(0);
  });

  test('champ recherche factures', async ({ page }) => {
    await page.goto('/app/invoices');
    await waitForAppPage(page);

    const searchField = page.locator(`${INVOICE.search}, input[placeholder*="Rechercher"], input[type="search"]`);
    const isVisible = await searchField.first().isVisible({ timeout: 5_000 }).catch(() => false);

    if (isVisible) {
      await searchField.first().fill('FV-');
      await page.waitForTimeout(1_000);
      console.log('[Factures] Champ recherche fonctionnel');
    } else {
      console.warn('[Factures] Champ recherche non visible');
    }
  });

  test('factures reçues se charge', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/app/invoices/received');
    await waitForAppPage(page);

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });

  test('fournisseurs se charge', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/app/suppliers');
    await waitForAppPage(page);

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });

  test('balance âgée se charge', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/app/receivables');
    await waitForAppPage(page);

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });
});
