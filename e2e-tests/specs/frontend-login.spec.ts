import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.wimrux.app';
const APPWRITE_PROJECT = '6a29285200015cd421c7';
const APPWRITE_API_KEY = 'cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57';

/**
 * TESTS E2E — Frontend Login & Console Errors
 * Vérifie qu'il n'y a plus d'erreurs 401 sur les collections RBAC
 */

test.describe('Frontend — Login & Console Errors', () => {

  test('Page login se charge sans erreurs console critiques', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarns: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      if (msg.type() === 'error') consoleErrors.push(text);
      if (msg.type() === 'warning') consoleWarns.push(text);
    });

    page.on('pageerror', err => {
      consoleErrors.push(`PAGE ERROR: ${err.message}`);
    });

    await page.goto(`${FRONTEND_URL}/auth/login`);
    await page.waitForLoadState('networkidle');

    // Vérifier que la page login est affichée via data-testid
    await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-password"]')).toBeVisible();

    // Aucune erreur 401 sur user_role_assignments ou company_custom_roles
    const rbac401Errors = consoleErrors.filter(e =>
      e.includes('user_role_assignments') ||
      e.includes('company_custom_roles') ||
      e.includes('company_role_permissions')
    );
    expect(rbac401Errors, `Erreurs RBAC 401 restantes: ${rbac401Errors.join(', ')}`).toHaveLength(0);

    // Aucune erreur "not authorized to perform the requested action"
    const authErrors = consoleErrors.filter(e =>
      e.includes('not authorized to perform the requested action')
    );
    expect(authErrors, `Erreurs d'autorisation restantes: ${authErrors.join(', ')}`).toHaveLength(0);

    console.log(`Console errors: ${consoleErrors.length}, warns: ${consoleWarns.length}`);
    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors);
    }
  });

  test('Login avec admin@wimrux.app — pas de 401 RBAC après connexion', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // 0. Supprimer les sessions Appwrite existantes cote serveur
    try {
      await fetch('https://appwrite.benga.live/v1/users/admin-wimrux/sessions', {
        method: 'DELETE',
        headers: {
          'X-Appwrite-Project': APPWRITE_PROJECT,
          'X-Appwrite-Key': APPWRITE_API_KEY,
        },
      });
    } catch (_e) { /* ignore */ }

    await page.goto(`${FRONTEND_URL}/auth/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Effacer les cookies et stockage local
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.context().clearCookies();

    // Supprimer le cookie de session Appwrite cross-origin via CDP (très important !)
    try {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Network.deleteCookies', {
        name: 'a_session_6a29285200015cd421c7',
        url: 'https://appwrite.benga.live',
      });
      await cdp.detach();
    } catch (_e) { /* ignore */ }

    // Remplir le formulaire
    await page.fill('[data-testid="login-email"]', 'admin@wimrux.app');
    await page.fill('[data-testid="login-password"]', 'WimruxAdmin2026!');
    await page.click('[data-testid="login-submit"]');

    // Attendre la réponse (soit OTP, soit dashboard)
    await page.waitForTimeout(3000);

    // Vérifier qu'on n'est plus sur la page de saisie des credentials (soit redirigé, soit écran OTP actif)
    const url = page.url();
    const otpVisible = await page.locator('[data-testid="otp-input"]').isVisible().catch(() => false);
    const isRedirectedOrOtp = url !== `${FRONTEND_URL}/auth/login` || otpVisible;
    expect(isRedirectedOrOtp, `Resté bloqué sur la saisie des identifiants (URL: ${url}, OTP visible: ${otpVisible})`).toBe(true);

    // Vérifier qu'il n'y a pas d'erreur RBAC 401 après login
    const rbac401Errors = consoleErrors.filter(e =>
      e.includes('user_role_assignments') ||
      e.includes('company_custom_roles') ||
      e.includes('company_role_permissions')
    );
    expect(rbac401Errors, `Erreurs RBAC 401 après login: ${rbac401Errors.join(', ')}`).toHaveLength(0);

    // Vérifier qu'il n'y a pas d'erreur "not authorized"
    const authErrors = consoleErrors.filter(e =>
      e.includes('not authorized to perform the requested action')
    );
    expect(authErrors, `Erreurs auth restantes: ${authErrors.join(', ')}`).toHaveLength(0);

    console.log(`Login test — Console errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Errors:', consoleErrors.slice(0, 10));
    }
  });

});
