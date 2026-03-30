import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.locator('text=Connexion')).toBeVisible();
    await expect(page.locator('input[type="email"], input[aria-label*="email" i]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('input[type="email"], input[aria-label*="email" i]', 'admin@wimrux.bf');
    await page.fill('input[type="password"]', 'WimruxAdmin2026!');
    await page.click('button[type="submit"], button:has-text("Connexion")');

    await page.waitForURL('**/app**', { timeout: 15_000 });
    await expect(page.locator('text=Tableau de bord')).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('input[type="email"], input[aria-label*="email" i]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"], button:has-text("Connexion")');

    await expect(page.locator('.q-notification, .q-banner, [role="alert"]')).toBeVisible({ timeout: 10_000 });
  });

  test('register page loads correctly', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.locator('text=Inscription')).toBeVisible();
  });
});
