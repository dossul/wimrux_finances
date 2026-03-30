import { test, expect } from '@playwright/test';

test.describe('Smoke Tests — Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login once
    await page.goto('/auth/login');
    await page.fill('input[type="email"], input[aria-label*="email" i]', 'admin@wimrux.bf');
    await page.fill('input[type="password"]', 'WimruxAdmin2026!');
    await page.click('button[type="submit"], button:has-text("Connexion")');
    await page.waitForURL('**/app**', { timeout: 15_000 });
  });

  test('dashboard displays KPI cards', async ({ page }) => {
    await expect(page.locator('text=Tableau de bord')).toBeVisible();
    await expect(page.locator('text=Factures')).toBeVisible();
    await expect(page.locator('text=FCFA')).toBeVisible();
  });

  test('navigate to invoices list', async ({ page }) => {
    await page.click('a:has-text("Factures"), .q-item:has-text("Factures")');
    await page.waitForURL('**/invoices**');
    await expect(page.locator('text=Factures')).toBeVisible();
  });

  test('navigate to clients', async ({ page }) => {
    await page.click('a:has-text("Clients"), .q-item:has-text("Clients")');
    await page.waitForURL('**/clients**');
    await expect(page.locator('text=Clients')).toBeVisible();
  });

  test('navigate to treasury', async ({ page }) => {
    await page.click('a:has-text("Trésorerie"), .q-item:has-text("Trésorerie")');
    await page.waitForURL('**/treasury**');
    await expect(page.locator('text=Trésorerie')).toBeVisible();
  });

  test('navigate to reports', async ({ page }) => {
    await page.click('a:has-text("Rapports").q-item__label, .q-item:has-text("Rapports")');
    await page.waitForURL('**/reports**');
    await expect(page.locator('text=Rapports')).toBeVisible();
  });

  test('navigate to audit log', async ({ page }) => {
    await page.click('.q-item:has-text("Journal d\'audit")');
    await page.waitForURL('**/audit**');
    await expect(page.locator('text=Journal')).toBeVisible();
  });

  test('navigate to settings', async ({ page }) => {
    await page.click('.q-item:has-text("Paramètres")');
    await page.waitForURL('**/settings**');
    await expect(page.locator('text=Paramètres')).toBeVisible();
  });
});
