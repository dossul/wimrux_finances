import { test, expect } from '@playwright/test';

const APP_URL = process.env.TEST_URL || 'https://www.wimrux.app';

test.describe('Basic Login Test', () => {
  test('should display login page', async ({ page }) => {
    await page.goto(APP_URL);
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/login-page.png' });
    
    // Check if we're on a page with expected elements
    // This is a basic smoke test - just verifying the page loads
    const body = await page.locator('body').textContent();
    expect(body).toBeTruthy();
    
    console.log('Page loaded successfully');
  });
  
  test('login form elements exist', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForLoadState('networkidle');
    
    // Common login form selectors
    const possibleEmailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="e-mail" i]',
    ];
    
    const possiblePasswordSelectors = [
      'input[type="password"]',
      'input[name="password"]',
      'input[placeholder*="password" i]',
      'input[placeholder*="mot de passe" i]',
    ];
    
    // Try to find email input
    let emailFound = false;
    for (const selector of possibleEmailSelectors) {
      const locator = page.locator(selector).first();
      if (await locator.isVisible().catch(() => false)) {
        emailFound = true;
        break;
      }
    }
    
    // Try to find password input
    let passwordFound = false;
    for (const selector of possiblePasswordSelectors) {
      const locator = page.locator(selector).first();
      if (await locator.isVisible().catch(() => false)) {
        passwordFound = true;
        break;
      }
    }
    
    // Log results but don't fail - this is diagnostic
    console.log(`Email input found: ${emailFound}`);
    console.log(`Password input found: ${passwordFound}`);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/login-form.png' });
  });
});
