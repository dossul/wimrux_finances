/**
 * Script d'inspection automatisée — wimrux.app
 * Utilise Playwright pour crawler les routes publiques, capturer
 * console errors, network errors, localStorage et générer un rapport.
 *
 * Usage:
 *   cd c:\wamp64\www\wimrux_finances\wimrux_app
 *   node scripts\inspect-wimrux.mjs
 *
 * Prérequis:
 *   npm install -g playwright
 *   npx playwright install chromium
 */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://wimruxapp.vercel.app';
const TIMESTAMP = new Date().toISOString().replace(/[:.]/g, '-');
const REPORT_DIR = join(__dirname, '..', 'reports', `inspection-${TIMESTAMP}`);

const ROUTES = [
  { path: '/', name: 'Landing' },
  { path: '/auth/login', name: 'Login' },
  { path: '/auth/register', name: 'Register' },
  { path: '/auth/forgot-password', name: 'ForgotPassword' },
  { path: '/legal/terms', name: 'Terms' },
  { path: '/legal/privacy', name: 'Privacy' },
];

async function inspectPage(page, route) {
  const url = `${BASE_URL}${route.path}`;
  const errors = [];
  const networkErrors = [];
  const networkCalls = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push({ type: 'console', text: msg.text(), location: msg.location() });
    }
  });

  page.on('pageerror', (err) => {
    errors.push({ type: 'pageerror', text: `${err.name}: ${err.message}` });
  });

  page.on('response', (res) => {
    networkCalls.push({ url: res.url(), status: res.status() });
    if (res.status() >= 400) {
      networkErrors.push({ url: res.url(), status: res.status() });
    }
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 20_000 });
  await page.waitForTimeout(1_500);

  // Screenshot
  const screenshotPath = join(REPORT_DIR, `${route.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // localStorage / sessionStorage
  const storage = await page.evaluate(() => ({
    localStorage: Object.fromEntries(Object.entries(localStorage)),
    sessionStorage: Object.fromEntries(Object.entries(sessionStorage)),
  }));

  // Scripts chargés
  const scripts = await page.evaluate(() =>
    Array.from(document.querySelectorAll('script[src]')).map(s => s.src)
  );

  // Rechercher références à appwrite dans le DOM
  const refs = await page.evaluate(() => {
    const html = document.documentElement.innerHTML.toLowerCase();
    return {
      hasAppwrite: html.includes('appwrite'),
      hasBenga: html.includes('benga.live'),
    };
  });

  return {
    route: route.path,
    name: route.name,
    url: page.url(),
    errors: errors.slice(0, 20), // Limiter
    networkErrors: networkErrors.slice(0, 20),
    networkCalls: networkCalls.filter(c =>
      c.url.includes('appwrite') || c.url.includes('benga')
    ).slice(0, 20),
    storage,
    scripts: scripts.slice(0, 10),
    refs,
    screenshot: screenshotPath,
  };
}

async function main() {
  await mkdir(REPORT_DIR, { recursive: true });
  console.log(`📁 Rapport : ${REPORT_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  const results = [];
  for (const route of ROUTES) {
    process.stdout.write(`🔍 ${route.name} (${route.path}) ... `);
    try {
      const result = await inspectPage(page, route);
      results.push(result);
      const errCount = result.errors.length;
      const netErrCount = result.networkErrors.length;
      console.log(`${errCount} console err | ${netErrCount} net err | appwrite:${result.refs.hasAppwrite}`);
    } catch (e) {
      console.log(`❌ FAILED: ${e.message}`);
      results.push({ route: route.path, name: route.name, error: e.message });
    }
  }

  await browser.close();

  // Résumé
  const summary = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    totalRoutes: ROUTES.length,
    totalErrors: results.reduce((sum, r) => sum + (r.errors?.length || 0), 0),
    totalNetworkErrors: results.reduce((sum, r) => sum + (r.networkErrors?.length || 0), 0),
    routesWithAppwrite: results.filter(r => r.refs?.hasAppwrite).length,
    routesWithBenga: results.filter(r => r.refs?.hasBenga).length,
    results,
  };

  const reportPath = join(REPORT_DIR, 'report.json');
  await writeFile(reportPath, JSON.stringify(summary, null, 2));

  // Rapport Markdown
  const mdLines = [
    `# Rapport d'inspection — wimrux.app`,
    `**Date** : ${new Date().toISOString()}`,
    `**URL** : ${BASE_URL}`,
    ``,
    `## Résumé`,
    `- Routes inspectées : ${summary.totalRoutes}`,
    `- Erreurs console totales : ${summary.totalErrors}`,
    `- Erreurs réseau totales : ${summary.totalNetworkErrors}`,
    `- Routes avec référence Appwrite : ${summary.routesWithAppwrite}`,
    `- Routes avec référence benga.live : ${summary.routesWithBenga}`,
    ``,
    `## Détail par route`,
  ];

  for (const r of results) {
    mdLines.push(`### ${r.name} (${r.route})`);
    mdLines.push(`- URL finale : ${r.url || r.route}`);
    mdLines.push(`- Erreurs console : ${r.errors?.length || 0}`);
    mdLines.push(`- Erreurs réseau : ${r.networkErrors?.length || 0}`);
    mdLines.push(`- Réf. Appwrite dans DOM : ${r.refs?.hasAppwrite || false}`);
    mdLines.push(`- Réf. benga.live dans DOM : ${r.refs?.hasBenga || false}`);
    if (r.errors?.length > 0) {
      mdLines.push(`- **Erreurs :**`);
      for (const e of r.errors.slice(0, 5)) {
        mdLines.push(`  - \`${e.text.substring(0, 200)}\``);
      }
    }
    if (r.networkErrors?.length > 0) {
      mdLines.push(`- **Network errors :**`);
      for (const e of r.networkErrors.slice(0, 5)) {
        mdLines.push(`  - ${e.status} ${e.url.substring(0, 100)}`);
      }
    }
    mdLines.push('');
  }

  const mdPath = join(REPORT_DIR, 'report.md');
  await writeFile(mdPath, mdLines.join('\n'));

  console.log(`\n✅ Rapport JSON : ${reportPath}`);
  console.log(`✅ Rapport MD   : ${mdPath}`);
  console.log(`\nProchaine étape : analyser le rapport et corriger les bugs identifiés.`);
}

main().catch(console.error);
