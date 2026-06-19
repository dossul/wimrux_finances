import { test, expect } from '@playwright/test';
import { login } from '../../helpers/auth.helper';
import { cleanupTestData } from '../../helpers/cleanup.helper';
import { CLIENT } from '../../fixtures/selectors';

test.describe('Facture normalisée BF - Formulaire client', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('vérifie la présence des 11 champs obligatoires et des nouveaux sélecteurs', async ({ page }) => {
    await page.goto('/app/clients');
    await page.waitForSelector(CLIENT.newBtn, { state: 'visible' });
    await page.click(CLIENT.newBtn);

    // 1. Raison sociale
    await expect(page.getByTestId('client-name')).toBeVisible();

    // 2. Forme juridique (menu déroulant)
    await page.getByRole('combobox', { name: /Forme juridique/i }).waitFor({ state: 'visible' });
    await page.getByRole('combobox', { name: /Forme juridique/i }).click();
    const legalFormLabels = [
      'S.A. (Société anonyme)',
      'S.A.R.L. (Société à responsabilité limitée)',
      'S.A.S. (Société par actions simplifiées)',
      'S.N.C. (Société en nom collectif)',
      'Personne physique',
      'S.C.S (Société en commandite simple)',
      'Autres (à spécifier)',
    ];
    for (const label of legalFormLabels) {
      await expect(page.getByRole('option', { name: label })).toBeVisible();
    }

    // 3. Adresse physique
    await expect(page.getByLabel(/Ville/i)).toBeVisible();
    await expect(page.getByLabel(/Quartier/i)).toBeVisible();
    await expect(page.getByLabel(/Secteur/i)).toBeVisible();

    // 4. Adresse cadastrale
    await expect(page.getByLabel(/Parcelle/i)).toBeVisible();
    await expect(page.getByLabel(/Lot/i)).toBeVisible();
    await expect(page.getByLabel(/Section/i)).toBeVisible();

    // 5. Adresse postale
    await expect(page.getByLabel(/Bureau postal/i)).toBeVisible();
    await expect(page.getByLabel(/boîte postale/i)).toBeVisible();
    await expect(page.getByLabel(/Code postal/i)).toBeVisible();

    // 6. Téléphone + indicatif
    await expect(page.getByLabel(/Indicatif pays/i)).toBeVisible();
    await expect(page.getByTestId('client-phone')).toBeVisible();

    // 7. IFU + scan
    await expect(page.getByTestId('client-ifu')).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /Scan IFU/i })).toBeVisible();

    // 8. RCCM + scan
    await expect(page.locator('label').filter({ hasText: /RCCM/i })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /Scan RCCM/i })).toBeVisible();

    // 9. Régime d'imposition
    await page.getByRole('combobox', { name: /Régime d'imposition/i }).waitFor({ state: 'visible' });
    await page.getByRole('combobox', { name: /Régime d'imposition/i }).click();
    const regimeLabels = [
      'RNI (Régime normal d\'imposition)',
      'RSI (Régime simplifié d\'imposition)',
      'CME Déclaratif (Contribution des micro-entreprises, déclaratif)',
      'CME (Contribution des micro-entreprises)',
    ];
    for (const label of regimeLabels) {
      await expect(page.getByRole('option', { name: label })).toBeVisible();
    }

    // 10. Division fiscale
    await page.getByRole('combobox', { name: /Division fiscale/i }).waitFor({ state: 'visible' });
    await page.getByRole('combobox', { name: /Division fiscale/i }).click();
    await expect(page.getByRole('option', { name: 'DGE (Direction des grandes entreprises)' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'DME — I', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: 'DCI — I', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: 'DPI (préciser la province)' })).toBeVisible();

    // 11. Comptes bancaires
    await expect(page.locator('text=Comptes bancaires (max. 5)')).toBeVisible();
    await page.getByTestId('client-add-bank').click();
    await expect(page.getByLabel(/Banque/i).first()).toBeVisible();

    // E-mail + e-mail de facturation
    await expect(page.getByTestId('client-email')).toBeVisible();
    await expect(page.getByLabel(/E-mail de facturation/i)).toBeVisible();

    // Contacts
    await expect(page.locator('text=Contact vente')).toBeVisible();
    await expect(page.locator('text=Contact comptabilité')).toBeVisible();
  });
});
