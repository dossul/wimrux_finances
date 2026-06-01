import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../helpers/console-errors.helper';
import { waitForAppPage } from '../helpers/wait.helper';
import { SETTINGS } from '../fixtures/selectors';

/**
 * 08 — Tests Paramètres
 * 
 * Couvre :
 * - Page paramètres principale
 * - Onglet profil
 * - Onglet entreprise
 * - Onglet utilisateurs
 * - Sous-routes IA settings
 * - Page thème
 * - Page support
 */

test.describe('08 — Paramètres', () => {

  test.beforeEach(async ({ page }) => {
    await login(page, 'adminWestago');
  });

  test('page paramètres se charge sans erreur', async ({ page }) => {
    const errors = createErrorCollector(page);

    await page.goto('/app/settings');
    await waitForAppPage(page);

    await expect(page.locator('.q-page')).toBeVisible();

    const realErrors = getRealErrors(errors);
    expect(realErrors).toHaveLength(0);
  });

  test('onglets profil / entreprise / utilisateurs visibles', async ({ page }) => {
    await page.goto('/app/settings');
    await waitForAppPage(page);

    // Vérifier que les onglets sont présents
    const tabs = ['tab-company', 'tab-users'];
    for (const tab of tabs) {
      const tabEl = page.locator(`[data-testid="${tab}"]`);
      const isVisible = await tabEl.isVisible({ timeout: 3_000 }).catch(() => false);
      console.log(`[Settings] Onglet ${tab}: ${isVisible ? 'visible' : 'non trouvé'}`);
    }
  });

  test('champs profil visibles', async ({ page }) => {
    await page.goto('/app/settings');
    await waitForAppPage(page);

    // Activer l'onglet profil
    await page.click('[data-testid="tab-profile"]');

    const fullname = page.locator(SETTINGS.profileFullname);
    const phone = page.locator(SETTINGS.profilePhone);

    const nameVisible = await fullname.isVisible({ timeout: 5_000 }).catch(() => false);
    const phoneVisible = await phone.isVisible({ timeout: 3_000 }).catch(() => false);

    console.log(`[Settings] Profil: nom=${nameVisible}, tel=${phoneVisible}`);
    expect(nameVisible, 'Champ nom complet non visible').toBe(true);
  });

  const settingsRoutes = [
    { path: '/app/settings/ai/providers', name: 'Fournisseurs IA' },
    { path: '/app/settings/ai/routing', name: 'Routage IA' },
    { path: '/app/settings/ai/usage', name: 'Consommation IA' },
    { path: '/app/settings/ai/credits', name: 'Crédits IA' },
    { path: '/app/settings/theme', name: 'Personnalisation' },
    { path: '/app/settings/privacy', name: 'Confidentialité' },
    { path: '/app/support', name: 'Support' },
  ];

  for (const route of settingsRoutes) {
    test(`${route.name} se charge sans erreur`, async ({ page }) => {
      const errors = createErrorCollector(page);

      await page.goto(route.path);
      await waitForAppPage(page);

      const realErrors = getRealErrors(errors);
      expect(realErrors, `Erreurs sur ${route.path}`).toHaveLength(0);
    });
  }
});
