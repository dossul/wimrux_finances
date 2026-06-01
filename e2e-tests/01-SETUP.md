# 01 — Setup Playwright

> Installation et configuration de l'environnement de test E2E.

---

## 1. Installation

```bash
# Cwd: C:\wamp64\www\wimrux_finances\wimrux_app
npm install -D @playwright/test
npx playwright install chromium  # On teste sur Chromium principalement
```

---

## 2. Fichier `playwright.config.ts`

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-tests/specs',
  fullyParallel: false,  // Auth partage session, pas parallel
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,  // Un worker pour eviter conflits de donnees
  reporter: 'html',
  use: {
    baseURL: 'https://wimruxapp.vercel.app',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

---

## 3. Structure des specs

```
wimrux_app/e2e-tests/
├── specs/
│   ├── auth.spec.ts
│   ├── landing.spec.ts
│   ├── invoices.spec.ts
│   ├── clients.spec.ts
│   ├── treasury.spec.ts
│   ├── reports.spec.ts
│   ├── ai.spec.ts
│   ├── settings.spec.ts
│   ├── admin.spec.ts
│   └── fiscal.spec.ts
├── fixtures/
│   ├── test-data.ts
│   └── selectors.ts
└── helpers/
    ├── auth-helper.ts
    ├── wait-helper.ts
    └── pdf-helper.ts
```

---

## 4. Fixtures (`fixtures/test-data.ts`)

```typescript
export const TEST_ACCOUNTS = {
  superAdmin: {
    email: 'admin@wimrux.app',
    password: 'WimruxAdmin2026!',
    role: 'project_admin',
    company: 'WIMRUX SaaS',
  },
  adminIltic: {
    email: 'test1@wimrux.app',
    password: 'WimruxAdmin2026!',
    role: 'admin',
    company: 'ILTIC',
    phone: '+22665599195',
  },
  adminWestago: {
    email: 'test2@wimrux.app',
    password: 'WimruxAdmin2026!',
    role: 'admin',
    company: 'WESTAGO',
    phone: '+22665751089',
  },
} as const;

export const TEST_CLIENT = {
  pm: {
    name: 'TECHNO SOLUTIONS SARL (TEST)',
    ifu: '00123456A',
    address: 'Zone Industrielle, Ouagadougou',
    phone: '+22670000001',
    type: 'PM',
  },
  cc: {
    name: 'Client Comptoir (TEST)',
    type: 'CC',
  },
};

export const TEST_INVOICE = {
  type: 'FV',
  clientName: 'TECHNO SOLUTIONS SARL (TEST)',
  items: [
    { designation: 'Ordinateur portable (TEST)', qty: 2, priceHt: 450000, taxGroup: 'A' },
    { designation: 'Licence logiciel (TEST)', qty: 5, priceHt: 50000, taxGroup: 'B' },
    { designation: 'Formation (TEST)', qty: 1, priceHt: 150000, taxGroup: 'C' },
  ],
};
```

---

## 5. Helpers

### `helpers/auth-helper.ts`

```typescript
import { Page } from '@playwright/test';
import { TEST_ACCOUNTS } from '../fixtures/test-data';

export async function login(page: Page, account: keyof typeof TEST_ACCOUNTS) {
  const creds = TEST_ACCOUNTS[account];
  await page.goto('/auth/login');
  await page.fill('[data-testid="login-email"]', creds.email);
  await page.fill('[data-testid="login-password"]', creds.password);
  await page.click('[data-testid="login-submit"]');
  // Attendre le dashboard ou l'ecran OTP
  await page.waitForURL(/\/(dashboard|auth\/otp)/, { timeout: 10000 });
}

export async function loginWithOtp(page: Page, account: keyof typeof TEST_ACCOUNTS) {
  await login(page, account);
  // Si OTP, attendre le code (manuel ou mock)
  if (await page.isVisible('[data-testid="otp-input"]')) {
    // Pour tests automatiques : desactiver 2FA d'abord, ou injecter le code
    throw new Error('OTP requis — desactiver 2FA dans les parametres avant le test');
  }
}

export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-btn"]');
  await page.waitForURL('/auth/login');
}
```

### `helpers/wait-helper.ts`

```typescript
import { Page } from '@playwright/test';

export async function waitForToast(page: Page, message: string, type: 'positive' | 'negative' = 'positive') {
  const toast = page.locator(`.q-notification:has-text("${message}")`);
  await toast.waitFor({ state: 'visible', timeout: 10000 });
}

export async function waitForLoading(page: Page) {
  await page.waitForSelector('.q-loading', { state: 'detached', timeout: 15000 });
}
```

---

## 6. Sélecteurs communs (`fixtures/selectors.ts`)

```typescript
export const NAV = {
  sidebar: '[data-testid="main-sidebar"]',
  invoices: '[data-testid="nav-invoices"]',
  clients: '[data-testid="nav-clients"]',
  treasury: '[data-testid="nav-treasury"]',
  reports: '[data-testid="nav-reports"]',
  settings: '[data-testid="nav-settings"]',
  aiAssistant: '[data-testid="nav-ai-assistant"]',
  audit: '[data-testid="nav-audit"]',
};

export const AUTH = {
  emailInput: '[data-testid="login-email"]',
  passwordInput: '[data-testid="login-password"]',
  submitBtn: '[data-testid="login-submit"]',
  otpInput: '[data-testid="otp-input"]',
  otpSubmit: '[data-testid="otp-submit"]',
  forgotLink: '[data-testid="forgot-password-link"]',
};

export const INVOICE = {
  newBtn: '[data-testid="invoice-new-btn"]',
  typeSelect: '[data-testid="invoice-type-select"]',
  clientSelect: '[data-testid="invoice-client-select"]',
  itemDesignation: (index: number) => `[data-testid="item-designation-${index}"]`,
  itemQty: (index: number) => `[data-testid="item-qty-${index}"]`,
  itemPrice: (index: number) => `[data-testid="item-price-${index}"]`,
  saveBtn: '[data-testid="invoice-save-btn"]',
  validateBtn: '[data-testid="invoice-validate-btn"]',
  certifyBtn: '[data-testid="invoice-certify-btn"]',
  pdfBtn: '[data-testid="invoice-pdf-btn"]',
};
```

---

## 7. Prerequis avant chaque session de test

1. **2FA désactive** sur le compte de test (parametres → toggle OFF)
2. **Données de test propres** — supprimer les factures/clients "(TEST)" avant/apres
3. **Edge functions deployees** — verifier `send-otp-whatsapp` et `verify-otp`
4. **Base de données accessible** — verifier tables critiques
