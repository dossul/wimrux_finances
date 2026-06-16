import { test, expect, type Page } from '@playwright/test';

/**
 * Test E2E — Login avec 2FA WhatsApp
 * Comptes :
 *  - admin@wimrux.app (project_admin) — WhatsApp: +226 65 59 91 95
 *  - test1@wimrux.app (admin ILTIC)   — WhatsApp: +226 65 75 10 89
 *  - test2@wimrux.app (admin WESTAGO) — WhatsApp: +226 75 53 25 39
 *
 * Variables d'environnement optionnelles :
 *  - E2E_OTP_CODE : code OTP à injecter (sinon le test vérifie seulement le flow)
 */

const ACCOUNTS = [
  {
    name: 'Admin SaaS',
    email: 'admin@wimrux.app',
    password: 'WimruxAdmin2026!',
    phone: '+226 65 59 91 95',
    role: 'project_admin',
  },
  {
    name: 'Admin ILTIC',
    email: 'test1@wimrux.app',
    password: 'WimruxAdmin2026!',
    phone: '+226 65 75 10 89',
    role: 'admin (ILTIC)',
  },
  {
    name: 'Admin WESTAGO',
    email: 'test2@wimrux.app',
    password: 'WimruxAdmin2026!',
    phone: '+226 75 53 25 39',
    role: 'admin (WESTAGO)',
  },
];

async function performLogin(page: Page, account: typeof ACCOUNTS[0]) {
  await page.goto('/auth/login');
  await expect(page.locator('[data-testid="login-email"]')).toBeVisible();

  // Étape 1 : Credentials
  await page.fill('[data-testid="login-email"]', account.email);
  await page.fill('[data-testid="login-password"]', account.password);

  // Capture avant submit
  await page.screenshot({ path: `e2e/screenshots/${account.email.split('@')[0]}-step1-credentials.png` });

  await page.click('[data-testid="login-submit"]');

  // Attendre soit le dashboard (pas de 2FA), soit l'écran OTP
  const otpInput = page.locator('[data-testid="otp-input"]');
  const dashboard = page.locator('[data-testid="nav--app"], h1:has-text("Tableau de bord"), .text-h5:has-text("Tableau de bord")').first();

  try {
    await otpInput.waitFor({ timeout: 8_000 });
    // → 2FA activé
    return { has2fa: true as const, account };
  } catch {
    // → Pas de 2FA, attendre le dashboard
    await dashboard.waitFor({ timeout: 10_000 });
    return { has2fa: false as const, account };
  }
}

async function complete2fa(page: Page, account: typeof ACCOUNTS[0]) {
  const otpInput = page.locator('[data-testid="otp-input"]');
  await expect(otpInput).toBeVisible();

  // Vérifier le numéro affiché
  const phoneDisplay = page.locator('[data-testid="otp-phone-display"]');
  await expect(phoneDisplay).toBeVisible();
  const displayedPhone = await phoneDisplay.textContent();
  const expectedPhone = account.phone.replace(/\s/g, '');
  expect(displayedPhone).toContain(expectedPhone);

  // Capture écran OTP
  await page.screenshot({ path: `e2e/screenshots/${account.email.split('@')[0]}-step2-otp.png` });

  const otpCode = process.env.E2E_OTP_CODE;
  if (otpCode) {
    await otpInput.fill(otpCode);
    await page.click('[data-testid="otp-submit"]');
    await page.waitForURL('**/app**', { timeout: 15_000 });
    await expect(page.locator('text=Tableau de bord')).toBeVisible();
    return { otpSubmitted: true };
  }

  // Pas de code OTP fourni — on vérifie juste que le flow est présent
  return { otpSubmitted: false };
}

async function logout(page: Page) {
  try {
    // Cherche le bouton/logique de logout (adapt selon ton UI)
    await page.goto('/auth/logout');
    await page.waitForURL('**/auth/login**', { timeout: 10_000 });
  } catch {
    // Fallback: clear cookies
    await page.context().clearCookies();
  }
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe('Login + 2FA WhatsApp — 3 comptes', () => {
  test.beforeAll(async () => {
    // Créer le dossier screenshots si besoin
    const fs = await import('fs');
    if (!fs.existsSync('e2e/screenshots')) {
      fs.mkdirSync('e2e/screenshots', { recursive: true });
    }
  });

  for (const account of ACCOUNTS) {
    test(`[${account.name}] ${account.email} — login flow`, async ({ page }) => {
      console.log(`\n🔐 Testing ${account.email} (${account.role})`);

      const result = await performLogin(page, account);

      if (result.has2fa) {
        console.log(`  📱 2FA WhatsApp détecté — numéro: ${account.phone}`);
        const otpResult = await complete2fa(page, account);

        if (otpResult.otpSubmitted) {
          console.log(`  ✅ Login complet avec OTP`);
          await page.screenshot({ path: `e2e/screenshots/${account.email.split('@')[0]}-step3-dashboard.png` });

          // Vérification finale: on est sur /app
          const url = page.url();
          expect(url).toContain('/app');
        } else {
          console.log(`  ⏭️  OTP non fourni (E2E_OTP_CODE manquant) — flow 2FA vérifié`);
          test.info().annotations.push({
            type: 'skip-otp',
            description: `2FA activé mais E2E_OTP_CODE non défini — ${account.phone}`,
          });
          // On annule le OTP pour revenir à la page login et ne pas polluer le test suivant
          await page.click('text=Annuler');
          await page.waitForSelector('[data-testid="login-email"]', { timeout: 5_000 });
        }
      } else {
        console.log(`  ✅ Login sans 2FA — dashboard atteint`);
        await page.screenshot({ path: `e2e/screenshots/${account.email.split('@')[0]}-step2-dashboard.png` });

        // Vérification finale: on est sur /app
        const url = page.url();
        expect(url).toContain('/app');

        await logout(page);
      }
    });
  }

  test('Numéros WhatsApp correctement affichés sur écran OTP', async ({ browser }) => {
    // Ce test vérifie que chaque numéro WhatsApp est bien affiché sur l'écran OTP
    // Utilise une nouvelle page pour chaque compte pour éviter les conflits de session
    for (const account of ACCOUNTS) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
      const page = await context.newPage();

      await page.goto('/auth/login');
      await page.waitForSelector('[data-testid="login-email"]', { timeout: 10_000 });

      const result = await performLogin(page, account);

      if (result.has2fa) {
        const phoneDisplay = page.locator('[data-testid="otp-phone-display"]');
        await expect(phoneDisplay).toBeVisible();
        const text = await phoneDisplay.textContent();
        expect(text).toContain(account.phone.replace(/\s/g, ''));
        console.log(`  ✅ ${account.email} — numéro WhatsApp affiché: ${account.phone}`);
      } else {
        console.log(`  ⏭️  ${account.email} — 2FA non activé (numéro non testé)`);
      }

      await context.close();
    }
  });
});
