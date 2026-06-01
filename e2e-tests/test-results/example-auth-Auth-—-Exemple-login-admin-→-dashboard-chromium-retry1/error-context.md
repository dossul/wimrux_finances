# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: example-auth.spec.ts >> Auth — Exemple >> login admin → dashboard
- Location: specs\example-auth.spec.ts:17:3

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:9000/auth/login
Call log:
  - navigating to "http://localhost:9000/auth/login", waiting until "load"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { login, logout } from '../helpers/auth-helper';
  3  | import { waitForToast } from '../helpers/wait-helper';
  4  | 
  5  | /**
  6  |  * EXEMPLE — Tests E2E Auth
  7  |  * Ce fichier est un modèle pour les futurs agents qui écriront les specs.
  8  |  * Voir : 02-AUTH-TESTS.md pour la documentation complète.
  9  |  */
  10 | 
  11 | test.describe('Auth — Exemple', () => {
  12 |   test.beforeEach(async ({ page }) => {
  13 |     // S'assurer qu'on est déconnecté
> 14 |     await page.goto('/auth/login');
     |                ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:9000/auth/login
  15 |   });
  16 | 
  17 |   test('login admin → dashboard', async ({ page }) => {
  18 |     await login(page, 'adminIltic');
  19 |     await expect(page).toHaveURL('/app');
  20 |     await expect(page.locator('[data-testid="main-sidebar"]')).toBeVisible();
  21 |   });
  22 | 
  23 |   test('login échoué → notification erreur', async ({ page }) => {
  24 |     await page.goto('/auth/login');
  25 |     await page.fill('[data-testid="login-email"]', 'test1@wimrux.app');
  26 |     await page.fill('[data-testid="login-password"]', 'WrongPassword!');
  27 |     await page.click('[data-testid="login-submit"]');
  28 | 
  29 |     await expect(page.locator('.q-notification--negative')).toBeVisible();
  30 |     await expect(page).toHaveURL('/auth/login');
  31 |   });
  32 | 
  33 |   test('logout → login', async ({ page }) => {
  34 |     await login(page, 'adminIltic');
  35 |     await logout(page);
  36 |     await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
  37 |   });
  38 | });
  39 | 
```