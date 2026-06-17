import { Page, ConsoleMessage } from '@playwright/test';

/**
 * Helper de capture d'erreurs console — WIMRUX® Finances
 * 
 * Capture toutes les erreurs console et réseau pendant le test.
 * Permet de vérifier 0 erreur console sur chaque page.
 */

export interface PageErrors {
  consoleErrors: string[];
  consoleWarnings: string[];
  networkErrors: string[];
  jsErrors: string[];
}

/** Patterns à ignorer (faux positifs connus) */
const IGNORED_CONSOLE_PATTERNS = [
  'webpage_content_reporter',     // Extension Chrome
  'favicon.ico',                  // Favicon manquante (Vercel)
  'ResizeObserver',               // Bug Chromium connu
  'third-party cookie',           // Avertissement cookies tiers
  'Download the React DevTools',  // Extension dev
  'Error with Permissions-Policy', // Header Vercel
  'net::ERR_BLOCKED_BY_CLIENT',   // Adblock
  'No refresh token provided',    // Session vide initiale (normal)
  'Failed to load resource',      // Status 401/403 réseau affiché en console
];

const IGNORED_NETWORK_PATTERNS = [
  'favicon.ico',
  'chrome-extension://',
  'hot-update',                   // HMR dev
  '/api/auth/refresh',            // Refresh token vide au chargement initial (normal)
  '/v1/account',                  // 401 sur page publique = session vide (normal)
];

export function createErrorCollector(page: Page): PageErrors {
  const errors: PageErrors = {
    consoleErrors: [],
    consoleWarnings: [],
    networkErrors: [],
    jsErrors: [],
  };

  // Capture console errors
  page.on('console', (msg: ConsoleMessage) => {
    const text = msg.text();
    const isIgnored = IGNORED_CONSOLE_PATTERNS.some((p) => text.includes(p));
    if (isIgnored) return;

    if (msg.type() === 'error') {
      errors.consoleErrors.push(text);
    } else if (msg.type() === 'warning') {
      errors.consoleWarnings.push(text);
    }
  });

  // Capture network errors (status >= 400)
  page.on('response', (response) => {
    const url = response.url();
    const isIgnored = IGNORED_NETWORK_PATTERNS.some((p) => url.includes(p));
    if (isIgnored) return;

    if (response.status() >= 400) {
      errors.networkErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  // Capture unhandled JS errors
  page.on('pageerror', (error) => {
    errors.jsErrors.push(`${error.name}: ${error.message}`);
  });

  return errors;
}

/**
 * Filtre les erreurs réelles (exclut les faux positifs)
 */
export function getRealErrors(errors: PageErrors): string[] {
  return [
    ...errors.consoleErrors,
    ...errors.networkErrors,
    ...errors.jsErrors,
  ];
}

/**
 * Erreurs critiques réseau (401/403/404/5xx) sans filtrage console.
 * Utile pour détecter les bugs API masqués par les faux positifs console.
 */
export function getCriticalErrors(errors: PageErrors, urlFilter?: string | string[]): string[] {
  const filters = Array.isArray(urlFilter) ? urlFilter : urlFilter ? [urlFilter] : [];
  const network = errors.networkErrors.filter((e) => {
    if (filters.length === 0) return true;
    return filters.some((f) => e.includes(f));
  });
  return [...network, ...errors.jsErrors];
}

/**
 * Crée un résumé lisible des erreurs pour le rapport
 */
export function formatErrorSummary(errors: PageErrors, pageName: string): string {
  const lines: string[] = [];
  if (errors.consoleErrors.length > 0) {
    lines.push(`  Console Errors (${errors.consoleErrors.length}):`);
    errors.consoleErrors.forEach((e) => lines.push(`    ❌ ${e.substring(0, 200)}`));
  }
  if (errors.networkErrors.length > 0) {
    lines.push(`  Network Errors (${errors.networkErrors.length}):`);
    errors.networkErrors.forEach((e) => lines.push(`    🌐 ${e.substring(0, 200)}`));
  }
  if (errors.jsErrors.length > 0) {
    lines.push(`  JS Errors (${errors.jsErrors.length}):`);
    errors.jsErrors.forEach((e) => lines.push(`    💥 ${e.substring(0, 200)}`));
  }
  if (lines.length === 0) {
    return `  ✅ ${pageName}: 0 erreurs`;
  }
  return `  ⚠️ ${pageName}:\n${lines.join('\n')}`;
}
