import { Page } from '@playwright/test';
import { TEST_ACCOUNTS } from '../fixtures/test-data';

/**
 * Helper d'authentification pour les tests E2E WIMRUX® Finances
 */

export async function login(
  page: Page,
  account: keyof typeof TEST_ACCOUNTS,
  options?: { withOtp?: boolean }
) {
  const creds = TEST_ACCOUNTS[account];
  await page.goto('/auth/login');

  await page.fill('[data-testid="login-email"]', creds.email);
  await page.fill('[data-testid="login-password"]', creds.password);
  await page.click('[data-testid="login-submit"]');

  // Attendre dashboard ou OTP
  await page.waitForURL(/\/(app|auth\/otp)/, { timeout: 10000 });

  // Gérer OTP si présent
  if (options?.withOtp) {
    const otpVisible = await page.isVisible('[data-testid="otp-input"]').catch(() => false);
    if (otpVisible) {
      // Si OTP visible mais pas de withOtp=true, erreur
      if (!options.withOtp) {
        throw new Error(`OTP requis pour ${creds.email} — désactiver 2FA avant le test`);
      }
      // Injection de code OTP (si mocké) ou attente manuelle
      await page.fill('[data-testid="otp-input"]', '000000');
      await page.click('[data-testid="otp-submit"]');
      await page.waitForURL('/app', { timeout: 10000 });
    }
  }

  // Vérifier dashboard chargé
  await page.waitForSelector('[data-testid="main-sidebar"]', { timeout: 10000 });
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-btn"]');
  await page.waitForURL('/auth/login');
}

export async function ensureLoggedOut(page: Page) {
  // Vérifier si déjà connecté
  const sidebar = page.locator('[data-testid="main-sidebar"]');
  if (await sidebar.isVisible().catch(() => false)) {
    await logout(page);
  }
}
