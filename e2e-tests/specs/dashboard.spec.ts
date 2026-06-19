import { test, expect } from '@playwright/test';
import { login } from '../helpers/auth-helper';
import { NAV } from '../fixtures/selectors';

/**
 * Tests E2E Dashboard — navigation et KPIs
 */

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, 'adminIltic');
  });

  test('dashboard loads with sidebar', async ({ page }) => {
    await expect(page.locator(NAV.sidebar)).toBeVisible();
    await expect(page.locator('[data-testid="dashboard-kpi-cards"]')).toBeVisible();
  });

  test('navigate to invoices list', async ({ page }) => {
    await page.click(NAV.invoices);
    await expect(page).toHaveURL(/\/app\/invoices/);
    await expect(page.locator('[data-testid="invoice-list"]')).toBeVisible();
  });

  test('navigate to clients list', async ({ page }) => {
    await page.click(NAV.clients);
    await expect(page).toHaveURL(/\/app\/clients/);
    await expect(page.locator('[data-testid="client-list"]')).toBeVisible();
  });

  test('navigate to treasury', async ({ page }) => {
    await page.click(NAV.treasury);
    await expect(page).toHaveURL(/\/app\/treasury/);
    await expect(page.locator('[data-testid="treasury-page"]')).toBeVisible();
  });
});
