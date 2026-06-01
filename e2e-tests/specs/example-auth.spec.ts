import { test, expect } from '@playwright/test';
import { login, logout } from '../helpers/auth-helper';
import { waitForToast } from '../helpers/wait-helper';

/**
 * EXEMPLE — Tests E2E Auth
 * Ce fichier est un modèle pour les futurs agents qui écriront les specs.
 * Voir : 02-AUTH-TESTS.md pour la documentation complète.
 */

test.describe('Auth — Exemple', () => {
  test.beforeEach(async ({ page }) => {
    // S'assurer qu'on est déconnecté
    await page.goto('/auth/login');
  });

  test('login admin → dashboard', async ({ page }) => {
    await login(page, 'adminIltic');
    await expect(page).toHaveURL('/app');
    await expect(page.locator('[data-testid="main-sidebar"]')).toBeVisible();
  });

  test('login échoué → notification erreur', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[data-testid="login-email"]', 'test1@wimrux.app');
    await page.fill('[data-testid="login-password"]', 'WrongPassword!');
    await page.click('[data-testid="login-submit"]');

    await expect(page.locator('.q-notification--negative')).toBeVisible();
    await expect(page).toHaveURL('/auth/login');
  });

  test('logout → login', async ({ page }) => {
    await login(page, 'adminIltic');
    await logout(page);
    await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
  });
});
