# 09 — Tests E2E : Paramètres

> Tests de toutes les pages de paramètres : profil utilisateur, entreprise, thème, IA, confidentialité.

---

## Contexte

- **Pages** : `SettingsPage.vue`, `AiProvidersPage.vue`, `AiRoutingPage.vue`, `AiUsagePage.vue`, `AiCreditsBuyPage.vue`, `ThemePage.vue`, `PrivacyPage.vue`
- **Store** : `auth-store.ts`, `company-store.ts`
- **Routes** : `/app/settings`, `/app/settings/ai/providers`, `/app/settings/ai/routing`, `/app/settings/ai/usage`, `/app/settings/ai/credits`, `/app/settings/theme`, `/app/settings/privacy`

---

## Scénario 1 : Profil utilisateur — modifier nom et téléphone

```typescript
test('profil utilisateur → mise à jour', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/settings');

  // Modifier nom
  await page.fill('[data-testid="profile-fullname"]', 'Admin ILTIC TEST');
  await page.fill('[data-testid="profile-phone"]', '+22665599195');

  // Sauvegarder
  await page.click('[data-testid="profile-save-btn"]');
  await waitForToast(page, 'Profil mis à jour');

  // Rafraîchir et vérifier persistance
  await page.reload();
  await expect(page.locator('[data-testid="profile-fullname"]'))
    .toHaveValue('Admin ILTIC TEST');
});
```

---

## Scénario 2 : Toggle 2FA WhatsApp

```typescript
test('toggle 2FA → désactiver → réactiver', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/settings');

  const toggle = page.locator('[data-testid="toggle-2fa"]');

  // Désactiver
  if (await toggle.isChecked()) {
    await toggle.click();
    await page.click('[data-testid="profile-save-btn"]');
    await waitForToast(page, 'Profil mis à jour');
  }

  // Vérifier label "Désactivé"
  await expect(page.locator('[data-testid="2fa-status-label"]')).toContainText('Désactivé');

  // Réactiver
  await toggle.click();
  await page.click('[data-testid="profile-save-btn"]');
  await waitForToast(page, 'Profil mis à jour');

  // Vérifier label "Activé"
  await expect(page.locator('[data-testid="2fa-status-label"]')).toContainText('Activé');
});
```

---

## Scénario 3 : Paramètres entreprise — IFU, taxe, logo

```typescript
test('paramètres entreprise → modification', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/settings');

  // Aller dans onglet entreprise
  await page.click('[data-testid="tab-company"]');

  // Modifier adresse
  await page.fill('[data-testid="company-address"]', 'Nouvelle adresse TEST, Ouagadougou');

  // Modifier taux TVA
  await page.fill('[data-testid="company-tax-rate"]', '18');

  // Upload logo
  const logoInput = page.locator('[data-testid="company-logo-input"]');
  await logoInput.setInputFiles('fixtures/test-logo.png');

  await page.click('[data-testid="company-save-btn"]');
  await waitForToast(page, 'enregistrés');
});
```

---

## Scénario 4 : Thème — personnalisation couleurs

```typescript
test('thème → changer couleur primaire', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/settings/theme');

  await page.click('[data-testid="theme-color-blue"]');
  await page.click('[data-testid="theme-save-btn"]');
  await waitForToast(page, 'enregistré');

  // Vérifier que la couleur est appliquée (header)
  await expect(page.locator('.q-header')).toHaveCSS('background-color', /rgb\(25, 118, 210\)/);
});
```

---

## Scénario 5 : Confidentialité & RGPD

```typescript
test('confidentialité → politique RGPD affichée', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/settings/privacy');

  await expect(page.locator('[data-testid="rgpd-consent-list"]')).toBeVisible();
  await expect(page.locator('text=Traitement des données')).toBeVisible();
});
```

---

## Scénario 6 : Appareils SFE (DGI)

```typescript
test('paramètres → appareils SFE listés', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/settings');

  // Onglet appareils (si présent)
  if (await page.isVisible('[data-testid="tab-devices"]')) {
    await page.click('[data-testid="tab-devices"]');
    await expect(page.locator('[data-testid="device-nim"]')).toBeVisible();
  }
});
```

---

## Scénario 7 : Utilisateurs — liste

```typescript
test('paramètres → utilisateurs listés', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/settings');

  // Onglet utilisateurs
  await page.click('[data-testid="tab-users"]');
  await expect(page.locator('[data-testid="users-table"]')).toBeVisible();
  await expect(page.locator('text=admin@wimrux.app')).toBeVisible();
});
```

---

## Scénario 8 : Changer mot de passe

```typescript
test('changer mot de passe → succès', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/settings');

  await page.click('[data-testid="tab-security"]');
  await page.fill('[data-testid="current-password"]', 'WimruxAdmin2026!');
  await page.fill('[data-testid="new-password"]', 'NewPassword2026!');
  await page.fill('[data-testid="confirm-password"]', 'NewPassword2026!');
  await page.click('[data-testid="change-password-btn"]');
  await waitForToast(page, 'mot de passe');

  // Réinitialiser pour les autres tests
  // ... (via API ou SQL)
});
```
