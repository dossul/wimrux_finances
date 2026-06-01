# 14 — Suite complète de régression

> Suite E2E à exécuter **intégralement** avant chaque mise en production.  
> Cette suite couvre tous les scénarios critiques en un seul passage.

---

## 🎯 Objectif

Vérifier en **~15-20 minutes** que l'application est fonctionnelle de bout en bout :
- Auth → Dashboard → Factures → Clients → Trésorerie → Rapports → Settings → Déconnexion
- Sans régression sur les bugs historiques

---

## 🔐 Setup pré-test

```typescript
// global-setup.ts
import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // 1. Vérifier URL accessible
  // 2. Préparer compte test (reset 2FA = false)
  // 3. Nettoyer données TEST précédentes
}

export default globalSetup;
```

---

## Suite complète (ordre séquentiel)

### Phase A : Auth & Landing (2 min)

```typescript
test.describe.serial('Régression Auth', () => {
  test('landing page → navbar OK', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=WIMRUX')).toBeVisible();
    await expect(page.locator('text=Connexion')).toBeVisible();
  });

  test('login admin → dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[data-testid="login-email"]', 'test1@wimrux.app');
    await page.fill('[data-testid="login-password"]', 'WimruxAdmin2026!');
    await page.click('[data-testid="login-submit"]');
    await page.waitForURL('/app', { timeout: 10000 });
    await expect(page.locator('[data-testid="main-sidebar"]')).toBeVisible();
  });
});
```

### Phase B : Dashboard & Navigation (2 min)

```typescript
test.describe.serial('Régression Navigation', () => {
  test('sidebar → toutes les sections accessibles', async ({ page }) => {
    const sections = [
      { nav: 'nav-invoices', url: '/app/invoices', title: 'Factures' },
      { nav: 'nav-clients', url: '/app/clients', title: 'Clients' },
      { nav: 'nav-treasury', url: '/app/treasury', title: 'Trésorerie' },
      { nav: 'nav-reports', url: '/app/reports', title: 'Rapports' },
      { nav: 'nav-ai-assistant', url: '/app/ai-assistant', title: 'Assistant' },
      { nav: 'nav-audit', url: '/app/audit', title: 'Audit' },
      { nav: 'nav-settings', url: '/app/settings', title: 'Paramètres' },
    ];

    for (const section of sections) {
      await page.click(`[data-testid="${section.nav}"]`);
      await page.waitForURL(section.url, { timeout: 5000 });
      await expect(page.locator(`text=${section.title}`)).toBeVisible();
    }
  });
});
```

### Phase C : Facturation complète (4 min)

```typescript
test.describe.serial('Régression Factures', () => {
  test('créer FV → valider → certifier → PDF', async ({ page }) => {
    await page.goto('/app/invoices');

    // Nouvelle
    await page.click('[data-testid="invoice-new-btn"]');
    await page.selectOption('[data-testid="invoice-type-select"]', 'FV');
    await page.click('[data-testid="invoice-client-select"]');
    await page.click('.q-item:has-text("WESTAGO")');
    await page.fill('[data-testid="item-designation-0"]', 'Service TEST Regression');
    await page.fill('[data-testid="item-qty-0"]', '1');
    await page.fill('[data-testid="item-price-0"]', '100000');
    await page.selectOption('[data-testid="item-tax-0"]', 'A');
    await page.click('[data-testid="invoice-save-btn"]');
    await waitForToast(page, 'enregistrée');

    // Valider
    await page.click('[data-testid="invoice-validate-btn"]');
    await waitForToast(page, 'validée');

    // Certifier
    await page.click('[data-testid="invoice-certify-btn"]');
    await waitForToast(page, 'certifiée');

    // PDF
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="invoice-pdf-btn"]'),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
```

### Phase D : Clients CRUD (2 min)

```typescript
test.describe.serial('Régression Clients', () => {
  test('PM + CC → CRUD', async ({ page }) => {
    await page.goto('/app/clients');

    // PM
    await page.click('[data-testid="client-new-btn"]');
    await page.click('[data-testid="client-type-pm"]');
    await page.fill('[data-testid="client-name"]', 'REGRESSION PM TEST');
    await page.fill('[data-testid="client-ifu"]', '99999999Z');
    await page.click('[data-testid="client-save-btn"]');
    await waitForToast(page, 'enregistré');

    // CC
    await page.click('[data-testid="client-new-btn"]');
    await page.click('[data-testid="client-type-cc"]');
    await page.fill('[data-testid="client-name"]', 'REGRESSION CC TEST');
    await page.click('[data-testid="client-save-btn"]');
    await waitForToast(page, 'enregistré');

    // Vérifier liste
    await expect(page.locator('text=REGRESSION PM TEST')).toBeVisible();
    await expect(page.locator('text=REGRESSION CC TEST')).toBeVisible();
  });
});
```

### Phase E : Trésorerie (2 min)

```typescript
test.describe.serial('Régression Trésorerie', () => {
  test('compte + mouvement → solde cohérent', async ({ page }) => {
    await page.goto('/app/banking');

    // Créer compte
    await page.click('[data-testid="bank-account-new-btn"]');
    await page.fill('[data-testid="bank-account-name"]', 'REGRESSION COMPTE TEST');
    await page.fill('[data-testid="bank-account-balance"]', '1000000');
    await page.click('[data-testid="bank-account-save-btn"]');
    await waitForToast(page, 'enregistré');

    // Crédit
    await page.goto('/app/treasury');
    await page.click('[data-testid="treasury-new-movement-btn"]');
    await page.selectOption('[data-testid="movement-type"]', 'credit');
    await page.selectOption('[data-testid="movement-account"]', 'REGRESSION COMPTE TEST');
    await page.fill('[data-testid="movement-amount"]', '500000');
    await page.click('[data-testid="movement-save-btn"]');
    await waitForToast(page, 'enregistré');

    // Vérifier solde
    await page.goto('/app/banking');
    await expect(page.locator('text=1 500 000')).toBeVisible();
  });
});
```

### Phase F : Rapports (2 min)

```typescript
test.describe.serial('Régression Rapports', () => {
  test('synthèse + rapport Z', async ({ page }) => {
    await page.goto('/app/reports');
    await page.selectOption('[data-testid="report-period"]', 'this_month');
    await page.click('[data-testid="report-generate-btn"]');
    await expect(page.locator('[data-testid="kpi-invoice-count"]')).toBeVisible();

    // Rapport Z
    await page.click('[data-testid="report-z-btn"]');
    await page.fill('[data-testid="z-date"]', '2026-05-27');
    await page.click('[data-testid="z-generate-btn"]');
    await expect(page.locator('[data-testid="z-report-content"]')).toBeVisible();
  });
});
```

### Phase G : Audit (1 min)

```typescript
test.describe.serial('Régression Audit', () => {
  test('audit log → entrées + badge', async ({ page }) => {
    await page.goto('/app/audit');
    await expect(page.locator('[data-testid="audit-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="audit-badge-immutable"]').first()).toBeVisible();
  });
});
```

### Phase H : Settings (2 min)

```typescript
test.describe.serial('Régression Paramètres', () => {
  test('profil + 2FA toggle', async ({ page }) => {
    await page.goto('/app/settings');

    // Modifier profil
    await page.fill('[data-testid="profile-fullname"]', 'Admin Regression');
    await page.click('[data-testid="profile-save-btn"]');
    await waitForToast(page, 'Profil mis à jour');

    // Toggle 2FA
    const toggle = page.locator('[data-testid="toggle-2fa"]');
    const wasChecked = await toggle.isChecked();
    await toggle.click();
    await page.click('[data-testid="profile-save-btn"]');
    await waitForToast(page, 'Profil mis à jour');

    // Restaurer
    if (wasChecked !== await toggle.isChecked()) {
      await toggle.click();
      await page.click('[data-testid="profile-save-btn"]');
    }
  });
});
```

### Phase I : Déconnexion (30s)

```typescript
test.describe.serial('Régression Déconnexion', () => {
  test('logout → login', async ({ page }) => {
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-btn"]');
    await page.waitForURL('/auth/login');
    await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
  });
});
```

---

## 🏁 Checklist finale de régression

| # | Module | Durée estimée | Statut |
|:---|:---|:---|:---|
| A | Auth + Landing | 2 min | ⬜ |
| B | Navigation sidebar | 2 min | ⬜ |
| C | Facturation (CRUD + MCF + PDF) | 4 min | ⬜ |
| D | Clients (PM + CC) | 2 min | ⬜ |
| E | Trésorerie (compte + mouvement) | 2 min | ⬜ |
| F | Rapports (synthèse + Z) | 2 min | ⬜ |
| G | Audit | 1 min | ⬜ |
| H | Paramètres (profil + 2FA) | 2 min | ⬜ |
| I | Déconnexion | 30s | ⬜ |
| | **TOTAL** | **~18 min** | |

---

## 🧹 Nettoyage post-régression

```typescript
// global-teardown.ts
async function globalTeardown() {
  // 1. Supprimer factures "REGRESSION" et "TEST"
  // 2. Supprimer clients "REGRESSION" et "TEST"
  // 3. Supprimer comptes bancaires "REGRESSION"
  // 4. Réinitialiser profil utilisateur
  // 5. Réinitialiser 2FA = true sur les comptes principaux
}
```
