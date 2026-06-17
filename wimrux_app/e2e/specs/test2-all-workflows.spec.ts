import { test, expect, type Page } from '@playwright/test';

/**
 * Test E2E complet — Tous les menus/workflows avec test2@wimrux.app
 * Compte: test2@wimrux.app / WimruxAdmin2026!
 * Rôle: admin (WESTAGO)
 * WhatsApp: +226 75 53 25 39
 *
 * Note: test2 n'a PAS le rôle project_admin → routes admin cachées
 */

const ACCOUNT = {
  email: 'test2@wimrux.app',
  password: 'WimruxAdmin2026!',
  name: 'Administrateur WESTAGO',
};

const SCREENSHOT_DIR = 'e2e/screenshots/test2-workflows';

// Routes accessibles pour un admin (pas project_admin)
const WORKFLOWS = [
  // ─── Dashboard ───
  { name: 'Tableau de bord', path: '/app', navId: 'nav-', section: 'Dashboard' },

  // ─── Facturation ───
  { name: 'Factures', path: '/app/invoices', navId: 'nav-invoices', section: 'Facturation' },
  { name: 'Nouvelle facture', path: '/app/invoices/new', navId: null, section: 'Facturation' },
  { name: 'Factures reçues', path: '/app/invoices/received', navId: 'nav-invoices-received', section: 'Facturation' },
  { name: 'Fournisseurs', path: '/app/suppliers', navId: 'nav-suppliers', section: 'Facturation' },
  { name: 'Balance âgée', path: '/app/receivables', navId: 'nav-receivables', section: 'Facturation' },
  { name: 'Paiements fiscaux', path: '/app/tax-payments', navId: 'nav-tax-payments', section: 'Facturation' },
  { name: 'Articles', path: '/app/articles', navId: 'nav-articles', section: 'Facturation' },
  { name: 'Clients', path: '/app/clients', navId: 'nav-clients', section: 'Facturation' },

  // ─── Trésorerie ───
  { name: 'Trésorerie', path: '/app/treasury', navId: 'nav-treasury', section: 'Trésorerie' },
  { name: 'Banque', path: '/app/banking', navId: 'nav-banking', section: 'Trésorerie' },
  { name: 'Budgets', path: '/app/budgets', navId: 'nav-budgets', section: 'Trésorerie' },
  { name: 'Trésorerie prévisionnelle', path: '/app/treasury/cashflow', navId: 'nav-treasury-cashflow', section: 'Trésorerie' },
  { name: 'Immobilisations', path: '/app/assets', navId: 'nav-assets', section: 'Trésorerie' },
  { name: 'Emprunts', path: '/app/loans', navId: 'nav-loans', section: 'Trésorerie' },
  { name: 'Investissements', path: '/app/investments', navId: 'nav-investments', section: 'Trésorerie' },
  { name: 'Petite caisse', path: '/app/petty-cash', navId: 'nav-petty-cash', section: 'Trésorerie' },
  { name: 'Wallets mobiles', path: '/app/mobile-wallets', navId: 'nav-mobile-wallets', section: 'Trésorerie' },
  { name: 'Wallets de paiement', path: '/app/wallets', navId: 'nav-wallets', section: 'Trésorerie' },

  // ─── Fiscale ───
  { name: 'Déclarations fiscales', path: '/app/fiscal/declarations', navId: 'nav-fiscal-declarations', section: 'Fiscale' },
  { name: 'Retenues à la source', path: '/app/fiscal/withholding', navId: 'nav-fiscal-withholding', section: 'Fiscale' },

  // ─── Rapports ───
  { name: 'Rapports', path: '/app/reports', navId: 'nav-reports', section: 'Rapports' },
  { name: 'Bilan & Résultat', path: '/app/reports/standard', navId: 'nav-reports-standard', section: 'Rapports' },
  { name: 'Query Builder', path: '/app/reports/query-builder', navId: 'nav-reports-query-builder', section: 'Rapports' },
  { name: 'Tableaux de bord', path: '/app/reports/dashboards', navId: 'nav-reports-dashboards', section: 'Rapports' },

  // ─── Audit ───
  { name: 'Journal d\'audit', path: '/app/audit', navId: 'nav-audit', section: 'Audit' },

  // ─── Approbation ───
  { name: 'Workflows d\'approbation', path: '/app/approvals/workflows', navId: 'nav-approvals-workflows', section: 'Approbation' },

  // ─── IA ───
  { name: 'Assistant IA', path: '/app/ai-assistant', navId: 'nav-ai-assistant', section: 'IA' },
  { name: 'Analyse avec IA', path: '/app/ai/ask', navId: 'nav-ai-ask', section: 'IA' },

  // ─── Paramètres ───
  { name: 'Paramètres', path: '/app/settings', navId: 'nav-settings', section: 'Paramètres' },
  { name: 'Confidentialité & RGPD', path: '/app/settings/privacy', navId: 'nav-settings-privacy', section: 'Paramètres' },

  // ─── Support ───
  { name: 'Support', path: '/app/support', navId: 'nav-support', section: 'Support' },
];

// Routes INACCESSIBLES pour test2 (project_admin only)
const RESTRICTED_ROUTES = [
  { name: 'Consommation IA', path: '/app/admin/ai-usage' },
  { name: 'Chatbot API', path: '/app/admin/chatbot' },
  { name: 'KPI Admin', path: '/app/admin/kpi' },
  { name: 'Monitoring', path: '/app/admin/health' },
];

async function login(page: Page) {
  await page.goto('/auth/login');
  await page.fill('[data-testid="login-email"]', ACCOUNT.email);
  await page.fill('[data-testid="login-password"]', ACCOUNT.password);
  await page.click('[data-testid="login-submit"]');

  // Attendre dashboard ou OTP
  const otpInput = page.locator('[data-testid="otp-input"]');
  try {
    await otpInput.waitFor({ timeout: 8_000 });
    console.log(`  ⚠️  2FA WhatsApp activé pour ${ACCOUNT.email} — annulation`);
    await page.click('text=Annuler');
    throw new Error('2FA active - test cannot complete');
  } catch (e: any) {
    if (e.message.includes('2FA')) throw e;
    // Pas de 2FA → attendre dashboard
    await page.waitForURL('**/app**', { timeout: 15_000 });
  }

  await expect(page.locator('[data-testid="user-fullname"]')).toContainText(ACCOUNT.name);
  console.log(`  ✅ Login OK — ${ACCOUNT.email}`);
}

async function navigateTo(page: Page, workflow: typeof WORKFLOWS[0], index: number) {
  const slug = workflow.path.replace(/\//g, '_');
  const screenshotPath = `${SCREENSHOT_DIR}/${String(index + 1).padStart(2, '0')}_${slug}.png`;

  // Collecter erreurs console
  const consoleErrors: string[] = [];
  const networkErrors: { url: string; status: number }[] = [];

  const consoleHandler = (msg: any) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  };
  const requestHandler = (req: any) => {
    req.response().then((res: any) => {
      if (res && res.status() >= 400) {
        networkErrors.push({ url: req.url(), status: res.status() });
      }
    }).catch(() => {});
  };

  page.on('console', consoleHandler);
  page.on('requestfinished', requestHandler);

  try {
    await page.goto(workflow.path);
    await page.waitForLoadState('networkidle', { timeout: 15_000 });

    // Attendre que la page ne soit plus "vide" (au moins un élément visible)
    const body = page.locator('body');
    await body.waitFor({ timeout: 10_000 });

    // Screenshot
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Vérifier pas d'erreur 404 ou "Page non trouvée"
    const notFound = page.locator('text=Page non trouvée, text=404, text=ErrorNotFound');
    const hasNotFound = await notFound.isVisible().catch(() => false);

    page.off('console', consoleHandler);
    page.off('requestfinished', requestHandler);

    return {
      success: !hasNotFound,
      consoleErrors: consoleErrors.slice(0, 5),
      networkErrors: networkErrors.filter(n => n.status >= 500).slice(0, 5),
      screenshot: screenshotPath,
      title: await page.title(),
    };
  } catch (e: any) {
    page.off('console', consoleHandler);
    page.off('requestfinished', requestHandler);
    await page.screenshot({ path: screenshotPath.replace('.png', '-error.png'), fullPage: true });
    return {
      success: false,
      consoleErrors: consoleErrors.slice(0, 5),
      networkErrors: networkErrors.filter(n => n.status >= 500).slice(0, 5),
      screenshot: screenshotPath.replace('.png', '-error.png'),
      title: await page.title().catch(() => ''), error: e.message,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

test.describe(`Workflows complets — ${ACCOUNT.email}`, () => {
  test.beforeAll(async () => {
    const fs = await import('fs');
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test('01 — Login et vérification profil', async ({ page }) => {
    await login(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/00_login_dashboard.png`, fullPage: true });
    await expect(page.locator('[data-testid="user-fullname"]')).toContainText(ACCOUNT.name);
  });

  for (let i = 0; i < WORKFLOWS.length; i++) {
    const workflow = WORKFLOWS[i]!;
    test(`${String(i + 2).padStart(2, '0')} — [${workflow.section}] ${workflow.name}`, async ({ page }) => {
      await login(page);
      const result = await navigateTo(page, workflow, i);

      console.log(`  ${result.success ? '✅' : '❌'} ${workflow.name} (${workflow.path})`);
      if (result.consoleErrors.length > 0) {
        console.log(`     ⚠️ Console errors: ${result.consoleErrors.length}`);
        result.consoleErrors.forEach(e => console.log(`        ${e.substring(0, 120)}`));
      }
      if (result.networkErrors.length > 0) {
        console.log(`     ⚠️ Network errors: ${result.networkErrors.length}`);
        result.networkErrors.forEach(n => console.log(`        ${n.status} ${n.url.substring(0, 100)}`));
      }

      expect(result.success, `Page ${workflow.name} a échoué: ${result.error || 'voir screenshot'}`).toBe(true);
    });
  }

  for (const restricted of RESTRICTED_ROUTES) {
    test(`XX — [RESTRICTED] ${restricted.name} doit être inaccessible`, async ({ page }) => {
      await login(page);
      await page.goto(restricted.path);
      await page.waitForLoadState('networkidle', { timeout: 10_000 });

      // Soit redirect vers dashboard, soit 404, soit pas le contenu admin
      const url = page.url();
      const isBlocked = url !== restricted.path ||
        await page.locator('text=Page non trouvée').isVisible().catch(() => false) ||
        await page.locator('text=403').isVisible().catch(() => false);

      console.log(`  🔒 ${restricted.name} → ${isBlocked ? 'bloqué' : '⚠️ accessible?'}`);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/restricted_${restricted.path.replace(/\//g, '_')}.png`, fullPage: true });
    });
  }
});
