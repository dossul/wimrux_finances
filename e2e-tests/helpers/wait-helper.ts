import { Page } from '@playwright/test';

/**
 * Helpers d'attente conditionnelle pour Quasar / Vue
 */

export async function waitForToast(
  page: Page,
  message: string,
  type: 'positive' | 'negative' | 'warning' = 'positive',
  timeout = 10000
) {
  const selector = `.q-notification.q-notification--${type}:has-text("${message}")`;
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

export async function waitForLoading(page: Page, timeout = 15000) {
  // Attendre que le loader Quasar disparaisse
  await page.waitForSelector('.q-loading', { state: 'detached', timeout });
}

export async function waitForQuasarDialog(page: Page, timeout = 5000) {
  await page.waitForSelector('.q-dialog .q-card', { state: 'visible', timeout });
}

export async function waitForNetworkIdle(page: Page, timeout = 10000) {
  await page.waitForLoadState('networkidle', { timeout });
}
