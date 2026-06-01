import { Page } from '@playwright/test';
import { QUASAR } from '../fixtures/selectors';

/**
 * Helpers d'attente conditionnelle pour Quasar / Vue
 */

export async function waitForToast(
  page: Page,
  type: 'positive' | 'negative' | 'warning' = 'positive',
  timeout = 10_000,
): Promise<string> {
  const selector =
    type === 'positive' ? QUASAR.notificationPositive :
    type === 'negative' ? QUASAR.notificationNegative :
    QUASAR.notificationWarning;

  const notification = page.locator(selector);
  await notification.waitFor({ state: 'visible', timeout });
  return notification.textContent() as Promise<string>;
}

export async function waitForLoading(page: Page, timeout = 15_000): Promise<void> {
  // Attendre que le loader Quasar disparaisse
  const loader = page.locator(QUASAR.loading);
  if (await loader.isVisible({ timeout: 1_000 }).catch(() => false)) {
    await loader.waitFor({ state: 'detached', timeout });
  }
}

export async function waitForDialog(page: Page, timeout = 5_000): Promise<void> {
  await page.waitForSelector(QUASAR.dialog, { state: 'visible', timeout });
}

export async function waitForPageReady(page: Page, timeout = 15_000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
  await waitForLoading(page, timeout);
}

/**
 * Attend qu'une page de l'app soit complètement chargée
 * Vérifie la présence du conteneur .q-page
 */
export async function waitForAppPage(page: Page, timeout = 15_000): Promise<void> {
  await page.waitForSelector('.q-page', { state: 'visible', timeout });
  // Petite pause pour laisser les composants asynchrones se monter
  await page.waitForTimeout(500);
}
