import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth.helper';
import { cleanupTestData } from '../../helpers/cleanup.helper';
import { SUPPLIER } from '../../fixtures/selectors';

test.describe('Facture normalisée BF - Formulaire fournisseur', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('vérifie les champs fournisseur spécifiques : TVA, contacts, e-mail facturation', async ({ page }) => {
    await page.goto('/app/suppliers');
    await page.waitForSelector(SUPPLIER.newBtn, { state: 'visible' });
    await page.click(SUPPLIER.newBtn);

    await page.waitForSelector(SUPPLIER.dialog, { state: 'visible' });

    // TVA
    await expect(page.getByTestId('supplier-vat-toggle')).toBeVisible();
    await expect(page.getByTestId('supplier-vat-rate-18')).toBeVisible();
    await expect(page.getByTestId('supplier-vat-rate-10')).toBeVisible();

    // Contacts
    await expect(page.locator('text=Contact vente')).toBeVisible();
    await expect(page.locator('text=Contact comptabilité')).toBeVisible();

    // E-mail de facturation
    await expect(page.getByLabel(/E-mail de facturation/i)).toBeVisible();

    // Jusqu'à 5 comptes bancaires
    await expect(page.locator('text=Comptes bancaires (max. 5)')).toBeVisible();
    await expect(page.getByTestId('supplier-add-bank')).toBeVisible();
  });
});
