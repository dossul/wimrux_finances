import { defineConfig, devices } from '@playwright/test';

const CI = !!process.env.CI;
const BASE_URL = process.env.BASE_URL || 'https://www.wimrux.app';

/**
 * Configuration Playwright unifiée — WIMRUX® Finances
 * 
 * Usage :
 *   npx playwright test                     # Tous les tests (production)
 *   npx playwright test --headed            # Voir le navigateur
 *   npx playwright test --ui                # Interface visuelle
 *   npx playwright test specs/01-auth       # Un seul module
 *   BASE_URL=http://localhost:9000 npx playwright test  # Tester en local
 */
export default defineConfig({
  testDir: './e2e/specs',

  /* Séquentiel pour éviter les conflits de données entre tests */
  fullyParallel: false,
  workers: 1,

  /* Timeouts */
  timeout: 60_000,
  expect: { timeout: 10_000 },

  /* Retries */
  retries: CI ? 2 : 1,

  /* Reporters : HTML + console */
  reporter: [
    ['html', { open: 'never', outputFolder: './e2e/playwright-report' }],
    ['list'],
  ],

  /* Shared settings */
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
    /* Viewport desktop standard */
    viewport: { width: 1280, height: 720 },
  },

  /* Projets */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Output */
  outputDir: './e2e/test-results',
});
