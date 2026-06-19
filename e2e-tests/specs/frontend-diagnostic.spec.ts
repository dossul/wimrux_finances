import { test, expect, chromium } from '@playwright/test';
import * as fs from 'fs';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.wimrux.app';
const APPWRITE_ENDPOINT = 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT = '6a29285200015cd421c7';
const APPWRITE_API_KEY = 'cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57';

test.describe('Diagnostic — Console Errors', () => {

  test('Capture erreurs console au boot + login', async () => {
    // Lancer un nouveau navigateur completement isole
    const browser = await chromium.launch({
      args: [
        '--disable-features=SameSiteByDefaultCookies,CookiesWithoutSameSiteMustBeSecure',
        '--disable-site-isolation-trials',
        '--disable-web-security',
      ],
    });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    const consoleLogs: {type: string, text: string}[] = [];

    page.on('console', msg => {
      consoleLogs.push({type: msg.type(), text: msg.text()});
    });

    page.on('pageerror', err => {
      consoleLogs.push({type: 'pageerror', text: err.message});
    });

    page.on('response', resp => {
      const url = resp.url();
      if (url.includes('appwrite.benga.live')) {
        consoleLogs.push({type: 'http', text: `${resp.status()} ${url}`});
      }
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

    // 1. Boot sur login
    await page.goto(`${FRONTEND_URL}/auth/login`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Effacer les cookies cross-origin avant le login
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await page.context().clearCookies();
    // Force delete the Appwrite session cookie via CDP
    try {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Network.deleteCookies', {
        name: 'a_session_6a29285200015cd421c7',
        url: 'https://appwrite.benga.live',
      });
      await cdp.detach();
    } catch (_e) { /* ignore */ }

    // Debug cookies after clearing
    const allCookies = await page.context().cookies();
    console.log('All cookies after clear:', JSON.stringify(allCookies));

    // Debug storage before login
    const storageBefore = await page.evaluate(() => {
      return {
        localStorage: Object.entries(localStorage),
        cookies: document.cookie,
      };
    });
    console.log('Storage before:', JSON.stringify(storageBefore));

    // 2. Login
    await page.fill('[data-testid="login-email"]', 'admin@wimrux.app');
    await page.fill('[data-testid="login-password"]', 'WimruxAdmin2026!');
    await page.click('[data-testid="login-submit"]');

    // Attendre que l'OTP soit visible ou que la redirection ait lieu
    try {
      await Promise.race([
        page.waitForSelector('[data-testid="otp-input"]', { timeout: 15000 }),
        page.waitForURL(url => !url.toString().includes('/auth/login'), { timeout: 15000 }),
      ]);
    } catch (_e) { /* fallback — on vérifie manuellement */ }

    // Debug: lire les logs persistants du login
    const loginDebug = await page.evaluate(() => (window as any).__loginDebug || []);
    const sendOtpResult = await page.evaluate(() => (window as any).__sendOtpResult || null);
    const sendOtpError = await page.evaluate(() => (window as any).__sendOtpError || null);
    console.log('Login debug:', JSON.stringify(loginDebug));
    console.log('SendOtp result:', JSON.stringify(sendOtpResult));
    console.log('SendOtp error:', JSON.stringify(sendOtpError));

    // Sauvegarder les logs pour analyse
    const storageAfter = await page.evaluate(() => {
      return {
        localStorage: Object.entries(localStorage),
        cookies: document.cookie,
      };
    });
    const allCookiesAfter = await page.context().cookies();
    const logPath = 'test-results/console-logs.json';
    fs.writeFileSync(logPath, JSON.stringify({
      url: page.url(),
      loginDebug,
      sendOtpResult,
      sendOtpError,
      storageBefore,
      storageAfter,
      allCookies: allCookiesAfter,
      logs: consoleLogs,
      errors: consoleLogs.filter(l => l.type === 'error' || l.type === 'pageerror' || l.type === 'http-error'),
    }, null, 2));

    // Afficher les erreurs dans le output
    console.log('\n=== URL FINALE ===');
    console.log(page.url());

    console.log('\n=== ERREURS CONSOLE ===');
    consoleLogs.filter(l => l.type === 'error' || l.type === 'pageerror' || l.type === 'http-error').forEach(l => {
      console.log(`[${l.type}] ${l.text.substring(0, 300)}`);
    });

    // Screenshot
    await page.screenshot({ path: 'test-results/diagnostic-screenshot.png', fullPage: true });

    // Vérifier qu'on est soit sur le dashboard, soit sur la page OTP
    const url = page.url();
    const otpVisible = await page.locator('[data-testid="otp-input"]').isVisible().catch(() => false);
    const isRedirected = url !== `${FRONTEND_URL}/auth/login` || otpVisible;
    console.log(`URL: ${url}, OTP visible: ${otpVisible}`);
    expect(isRedirected, `Resté sur login sans OTP. URL=${url}, OTP visible=${otpVisible}`).toBe(true);
  });

});
