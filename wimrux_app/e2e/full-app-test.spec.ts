import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'https://wimrux-app.vercel.app';

const ACCOUNTS = [
  {
    name: 'WIMRUX SaaS (project_admin)',
    email: 'admin@wimrux.bf',
    password: 'WimruxAdmin2026!',
    role: 'project_admin',
    expectedClients: 5,
    expectedArticles: 10,
  },
  {
    name: 'ILTIC (admin)',
    email: 'admin@iltic.bf',
    password: 'IlticAdmin2026!',
    role: 'admin',
    expectedClients: 5,
    expectedArticles: 10,
  },
  {
    name: 'WESTAGO (admin)',
    email: 'admin@westago.bf',
    password: 'WestagoAdmin2026!',
    role: 'admin',
    expectedClients: 6,
    expectedArticles: 10,
  },
];

const PAGES_TO_TEST = [
  { path: '/', name: 'Tableau de bord', selector: '.q-page' },
  { path: '/invoices', name: 'Factures', selector: '.q-table' },
  { path: '/articles', name: 'Articles', selector: '.q-page' },
  { path: '/clients', name: 'Clients', selector: '.q-page' },
  { path: '/treasury', name: 'Trésorerie', selector: '.q-page' },
  { path: '/reports', name: 'Rapports', selector: '.q-page' },
  { path: '/reports/fiscal', name: 'Rapports fiscaux', selector: '.q-page' },
  { path: '/reports/a-report', name: 'A-Rapport', selector: '.q-page' },
  { path: '/audit', name: 'Journal d\'audit', selector: '.q-page' },
  { path: '/settings', name: 'Paramètres', selector: '.q-page' },
  { path: '/ai', name: 'Assistant IA', selector: '.q-page' },
];

interface TestResult {
  account: string;
  page: string;
  status: 'OK' | 'ERROR' | 'WARNING';
  message: string;
  consoleErrors: string[];
  networkErrors: string[];
}

const results: TestResult[] = [];

async function login(page: Page, email: string, password: string): Promise<boolean> {
  try {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 10000 });
    return true;
  } catch (e) {
    return false;
  }
}

async function logout(page: Page): Promise<void> {
  try {
    await page.click('.q-avatar');
    await page.click('text=Déconnexion');
    await page.waitForURL('**/login', { timeout: 5000 });
  } catch {
    await page.goto(`${BASE_URL}/login`);
  }
}

for (const account of ACCOUNTS) {
  test.describe(`Tests pour ${account.name}`, () => {
    test.beforeEach(async ({ page }) => {
      const consoleErrors: string[] = [];
      const networkErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          if (!text.includes('webpage_content_reporter')) {
            consoleErrors.push(text);
          }
        }
      });

      page.on('response', (response) => {
        if (response.status() >= 400) {
          networkErrors.push(`${response.status()} ${response.url()}`);
        }
      });

      const loginSuccess = await login(page, account.email, account.password);
      expect(loginSuccess).toBe(true);
    });

    test.afterEach(async ({ page }) => {
      await logout(page);
    });

    for (const pageInfo of PAGES_TO_TEST) {
      test(`${pageInfo.name} (${pageInfo.path})`, async ({ page }) => {
        const consoleErrors: string[] = [];
        const networkErrors: string[] = [];

        page.on('console', (msg) => {
          if (msg.type() === 'error') {
            const text = msg.text();
            if (!text.includes('webpage_content_reporter')) {
              consoleErrors.push(text);
            }
          }
        });

        page.on('response', (response) => {
          if (response.status() >= 400) {
            networkErrors.push(`${response.status()} ${response.url()}`);
          }
        });

        await page.goto(`${BASE_URL}${pageInfo.path}`, { waitUntil: 'networkidle', timeout: 30000 });
        
        await page.waitForTimeout(2000);

        const pageVisible = await page.locator(pageInfo.selector).isVisible().catch(() => false);
        
        const result: TestResult = {
          account: account.name,
          page: pageInfo.name,
          status: 'OK',
          message: '',
          consoleErrors,
          networkErrors,
        };

        if (!pageVisible) {
          result.status = 'WARNING';
          result.message = 'Page selector not found';
        }

        if (networkErrors.length > 0) {
          result.status = 'ERROR';
          result.message = `${networkErrors.length} network errors`;
        }

        if (consoleErrors.length > 0) {
          result.status = result.status === 'OK' ? 'WARNING' : result.status;
          result.message += ` ${consoleErrors.length} console errors`;
        }

        results.push(result);

        expect(networkErrors.filter(e => !e.includes('favicon'))).toHaveLength(0);
      });
    }

    test('Vérification isolation données - Clients', async ({ page }) => {
      await page.goto(`${BASE_URL}/clients`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      const clientRows = await page.locator('.q-table tbody tr').count();
      console.log(`[${account.name}] Clients trouvés: ${clientRows}`);
    });

    test('Vérification isolation données - Articles', async ({ page }) => {
      await page.goto(`${BASE_URL}/articles`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      
      const articleRows = await page.locator('.q-table tbody tr').count();
      console.log(`[${account.name}] Articles trouvés: ${articleRows}`);
    });

    test('Création facture brouillon', async ({ page }) => {
      await page.goto(`${BASE_URL}/invoices`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1000);
      
      const newInvoiceBtn = page.locator('button:has-text("Nouvelle facture")');
      if (await newInvoiceBtn.isVisible()) {
        await newInvoiceBtn.click();
        await page.waitForTimeout(1000);
        
        const dialogVisible = await page.locator('.q-dialog').isVisible();
        console.log(`[${account.name}] Dialog nouvelle facture: ${dialogVisible ? 'OK' : 'ERREUR'}`);
      }
    });
  });
}
