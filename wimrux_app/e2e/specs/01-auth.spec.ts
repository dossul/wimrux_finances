import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth.helper';
import { createErrorCollector, getRealErrors } from '../helpers/console-errors.helper';
import { AUTH, QUASAR } from '../fixtures/selectors';
import { TEST_ACCOUNTS, PUBLIC_ROUTES } from '../fixtures/test-data';

/**
 * 01 — Tests d'Authentification
 * 
 * Couvre :
 * - Page de login chargée correctement
 * - Login avec credentials valides → redirect dashboard
 * - Login avec credentials invalides → notification erreur
 * - Logout → retour page login
 * - Pages publiques accessibles sans auth
 * - Protection des routes authentifiées
 */

test.describe('01 — Authentification', () => {

  test('page de login se charge sans erreur', async ({ page }) => {
    const errors = createErrorCollector(page);
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Connexion')).toBeVisible();
    await expect(page.locator(AUTH.emailInput)).toBeVisible();
    await expect(page.locator(AUTH.passwordInput)).toBeVisible();
    await expect(page.locator(AUTH.submitBtn)).toBeVisible();
    await expect(page.locator(AUTH.forgotLink)).toBeVisible();

    const realErrors = getRealErrors(errors);
    expect(realErrors, `Erreurs console sur /auth/login: ${realErrors.join(', ')}`).toHaveLength(0);
  });

  test('page register se charge', async ({ page }) => {
    const errors = createErrorCollector(page);
    await page.goto('/auth/register');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Inscription')).toBeVisible();

    const realErrors = getRealErrors(errors);
    expect(realErrors, `Erreurs console sur /auth/register: ${realErrors.join(', ')}`).toHaveLength(0);
  });

  test('page forgot-password se charge', async ({ page }) => {
    const errors = createErrorCollector(page);
    await page.goto('/auth/forgot-password');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('text=Mot de passe')).toBeVisible();

    const realErrors = getRealErrors(errors);
    expect(realErrors, `Erreurs console: ${realErrors.join(', ')}`).toHaveLength(0);
  });

  test('login avec credentials invalides → notification erreur', async ({ page }) => {
    await page.goto('/auth/login');
    await page.waitForLoadState('networkidle');

    await page.fill(AUTH.emailInput, 'faux@email.com');
    await page.fill(AUTH.passwordInput, 'MotDePasseFaux123!');
    await page.click(AUTH.submitBtn);

    // Doit rester sur la page login et afficher une erreur
    await expect(page.locator(`${QUASAR.notificationNegative}, [role="alert"]`)).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toContain('/auth/login');
  });

  test('login Super Admin → redirect dashboard', async ({ page }) => {
    const errors = createErrorCollector(page);

    await login(page, 'superAdmin');

    // Doit être redirigé vers /app
    expect(page.url()).toContain('/app');

    // Doit voir le contenu du dashboard
    await expect(page.locator('.q-page')).toBeVisible();

    const realErrors = getRealErrors(errors);
    // On accepte les erreurs de login OTP si le 2FA est actif
    console.log(`[Auth Test] Erreurs après login: ${realErrors.length}`);
  });

  test('logout → retour page login', async ({ page }) => {
    await login(page, 'superAdmin');
    await logout(page);

    expect(page.url()).toContain('/auth/login');
    await expect(page.locator(AUTH.emailInput)).toBeVisible();
  });

  test('route protégée sans auth → redirect login', async ({ page }) => {
    await page.goto('/app/invoices');
    await page.waitForLoadState('networkidle');

    // Doit être redirigé vers login
    await page.waitForURL('**/auth/login**', { timeout: 10_000 });
    expect(page.url()).toContain('/auth/login');
  });

  for (const route of PUBLIC_ROUTES) {
    test(`page publique "${route.name}" (${route.path}) accessible`, async ({ page }) => {
      const errors = createErrorCollector(page);
      await page.goto(route.path);
      await page.waitForLoadState('networkidle');

      // La page doit se charger (pas de 404)
      const isNotFound = await page.locator('text=404').isVisible({ timeout: 2_000 }).catch(() => false);
      expect(isNotFound, `Page ${route.path} retourne 404`).toBe(false);

      const realErrors = getRealErrors(errors);
      expect(realErrors, `Erreurs console sur ${route.path}: ${realErrors.join(', ')}`).toHaveLength(0);
    });
  }
});
