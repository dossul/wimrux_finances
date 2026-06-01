import { Page } from '@playwright/test';
import { TEST_ACCOUNTS } from '../fixtures/test-data';
import { AUTH } from '../fixtures/selectors';

/**
 * Helper d'authentification — WIMRUX® Finances
 *
 * Tous les comptes :
 *   - Mot de passe : WimruxAdmin2026!
 *   - 2FA         : DÉSACTIVÉ (mis à jour en DB le 27/05/2026)
 *
 * Donc le flow login est simple : email → password → submit → dashboard.
 * Aucune gestion OTP nécessaire.
 */

export type AccountKey = keyof typeof TEST_ACCOUNTS;

export async function login(
  page: Page,
  account: AccountKey = 'superAdmin',
): Promise<void> {
  const creds = TEST_ACCOUNTS[account];

  await page.goto('/auth/login');

  // Attendre que la page SPA soit montée (l'input doit être visible)
  await page.waitForSelector(AUTH.emailInput, { state: 'visible', timeout: 20_000 });

  await page.fill(AUTH.emailInput, creds.email);
  await page.fill(AUTH.passwordInput, creds.password);
  await page.click(AUTH.submitBtn);

  // Attendre la redirection vers /app (2FA désactivé = pas d'OTP)
  await page.waitForURL('**/app**', { timeout: 20_000 });

  // Attendre que la page principale soit chargée
  await page.waitForSelector('.q-page', { state: 'visible', timeout: 15_000 });
  console.log(`[Auth] ✅ Connecté : ${creds.email}`);
}

export async function logout(page: Page): Promise<void> {
  try {
    const userMenu = page.locator('[data-testid="user-menu"]');
    if (await userMenu.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await userMenu.click();
      await page.locator('[data-testid="logout-btn"]').click();
    } else {
      // Fallback : chercher le bouton de déconnexion directement
      const logoutBtn = page.locator('button:has-text("Déconnexion"), .q-item:has-text("Déconnexion")');
      if (await logoutBtn.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
        await logoutBtn.first().click();
      }
    }
    await page.waitForURL('**/auth/login**', { timeout: 10_000 });
  } catch {
    // Fallback direct
    await page.goto('/auth/login');
    await page.waitForLoadState('domcontentloaded');
  }
}

export async function ensureLoggedIn(
  page: Page,
  account: AccountKey = 'superAdmin',
): Promise<void> {
  // Vérifier si déjà authentifié
  const isOnApp = page.url().includes('/app');
  const hasPage = await page.locator('.q-page').isVisible({ timeout: 1_000 }).catch(() => false);

  if (isOnApp && hasPage) return;

  await login(page, account);
}
