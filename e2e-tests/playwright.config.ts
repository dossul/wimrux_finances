import { defineConfig, devices } from '@playwright/test';

const CI = !!(globalThis as any).process?.env?.CI;
const BASE_URL = (globalThis as any).process?.env?.BASE_URL || 'http://localhost:9000';

/**
 * Configuration Playwright pour WIMRUX® Finances
 * Voir : 01-SETUP.md pour les instructions d'installation
 */
export default defineConfig({
  testDir: './specs',

  /* Exécuter les tests dans un seul worker pour éviter les conflits de données */
  fullyParallel: false,
  workers: 1,

  /* Retries : 1 en local, 2 en CI */
  retries: CI ? 2 : 1,

  /* Reporter HTML + ligne de commande */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  /* Shared settings */
  use: {
    /* URL de base (local dev par défaut, ou override via env) */
    baseURL: BASE_URL,

    /* Collecter trace uniquement en cas de retry */
    trace: 'on-first-retry',

    /* Screenshot en cas d'échec */
    screenshot: 'only-on-failure',

    /* Vidéo en cas d'échec */
    video: 'retain-on-failure',

    /* Temps d'attente par défaut */
    actionTimeout: 15000,
    navigationTimeout: 15000,
  },

  /* Projets : seulement Desktop Chrome pour l'instant */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  /* Global setup / teardown (désactivés temporairement — cf. doc 01-SETUP.md) */
  // globalSetup: './global-setup.ts',
  // globalTeardown: './global-teardown.ts',
});
