import { Page } from '@playwright/test';

export async function waitForAppPage(page: Page, timeout = 10_000): Promise<void> {
  await page.waitForSelector('.q-page', { state: 'visible', timeout });
  await page.waitForSelector('.q-loading', { state: 'hidden', timeout });
}

export async function waitForDialog(page: Page, timeout = 10_000): Promise<void> {
  await page.waitForSelector('.q-dialog .q-card', { state: 'visible', timeout });
}

export async function waitForToast(
  page: Page,
  type: 'positive' | 'negative' | 'warning' = 'positive',
  timeout = 10_000
): Promise<string> {
  const selector = `.q-notification--${type}`;

  const notification = page.locator(selector);
  await notification.waitFor({ state: 'visible', timeout });
  return notification.textContent() as Promise<string>;
}

export async function waitForNotificationContaining(
  page: Page,
  substring: string,
  timeout = 10_000,
): Promise<void> {
  const notification = page.locator('.q-notification').filter({ hasText: substring });
  await notification.waitFor({ state: 'visible', timeout });
}
