# 02 — Tests E2E : Authentification & 2FA

> Tests complets du flux auth : login, register, forgot password, 2FA WhatsApp ON/OFF.

---

## Contexte

- **Pages** : `LoginPage.vue`, `RegisterPage.vue`, `ForgotPasswordPage.vue`
- **Store** : `auth-store.ts`
- **Edge functions** : `send-otp-whatsapp.ts`, `verify-otp.ts`
- **Composables** : `usePasswordStrength.ts`
- **Routes** : `/auth/login`, `/auth/register`, `/auth/forgot-password`

---

## Données de test

```typescript
const CREDENTIALS = {
  valid: { email: 'test1@wimrux.app', password: 'WimruxAdmin2026!' },
  invalid: { email: 'test1@wimrux.app', password: 'WrongPassword123!' },
  newUser: {
    email: 'newuser-test@wimrux.app',
    password: 'NewUser2026!',
    fullName: 'New User Test',
    companyName: 'TEST COMPANY SARL',
    ifu: '99999999Z',
  },
};
```

---

## Scénario 1 : Login réussi (2FA désactivé)

**Prerequis** : `two_fa_enabled = false` sur le compte test1.

```typescript
test('login avec 2FA désactivé → accès direct au dashboard', async ({ page }) => {
  // 1. Aller sur la page de login
  await page.goto('/auth/login');
  await expect(page).toHaveURL('/auth/login');

  // 2. Saisir email
  await page.fill('[data-testid="login-email"]', CREDENTIALS.valid.email);

  // 3. Saisir mot de passe
  await page.fill('[data-testid="login-password"]', CREDENTIALS.valid.password);

  // 4. Cliquer Connexion
  await page.click('[data-testid="login-submit"]');

  // 5. Attendre redirection dashboard
  await page.waitForURL('/app', { timeout: 10000 });

  // 6. Verifier le nom affiché dans le header
  await expect(page.locator('[data-testid="user-fullname"]'))
    .toContainText('Admin ILTIC');  // ou le nom correspondant

  // 7. Verifier la sidebar visible
  await expect(page.locator('[data-testid="main-sidebar"]')).toBeVisible();
});
```

---

## Scénario 2 : Login échoué (mot de passe incorrect)

```typescript
test('login avec mauvais MDP → notification erreur', async ({ page }) => {
  await page.goto('/auth/login');
  await page.fill('[data-testid="login-email"]', CREDENTIALS.invalid.email);
  await page.fill('[data-testid="login-password"]', CREDENTIALS.invalid.password);
  await page.click('[data-testid="login-submit"]');

  // Attendre notification negative
  await expect(page.locator('.q-notification.q-notification--negative'))
    .toBeVisible({ timeout: 5000 });

  // Rester sur la page login
  await expect(page).toHaveURL('/auth/login');
});
```

---

## Scénario 3 : 2FA WhatsApp activé → OTP envoyé

**Prerequis** : `two_fa_enabled = true`, `phone` renseigné.

```typescript
test('login avec 2FA activé → écran OTP affiché', async ({ page }) => {
  // Activer 2FA sur le compte avant le test
  await page.goto('/auth/login');
  await page.fill('[data-testid="login-email"]', CREDENTIALS.valid.email);
  await page.fill('[data-testid="login-password"]', CREDENTIALS.valid.password);
  await page.click('[data-testid="login-submit"]');

  // Attendre l'ecran OTP
  await expect(page.locator('[data-testid="otp-input"]')).toBeVisible({ timeout: 10000 });

  // Verifier le numero masqué affiché
  await expect(page.locator('[data-testid="otp-phone-display"]'))
    .toContainText('+226 65 *** ** 89');  // masqué
});
```

---

## Scénario 4 : Toggle 2FA ON/OFF dans les paramètres

**Page** : `/app/settings` → onglet "Mon profil utilisateur"

```typescript
test('désactiver 2FA dans paramètres → prochain login sans OTP', async ({ page }) => {
  // 1. Se connecter (avec 2FA désactivé ou en injectant le code)
  await login(page, 'adminIltic');

  // 2. Aller dans Paramètres
  await page.click('[data-testid="nav-settings"]');

  // 3. Verifier le toggle 2FA
  const toggle = page.locator('[data-testid="toggle-2fa"]');
  await expect(toggle).toBeVisible();

  // 4. Si activé, le désactiver
  const isChecked = await toggle.isChecked();
  if (isChecked) {
    await toggle.click();
    await page.click('[data-testid="profile-save-btn"]');
    await waitForToast(page, 'Profil mis à jour');
  }

  // 5. Déconnexion
  await logout(page);

  // 6. Reconnexion → accès direct (pas d'OTP)
  await page.fill('[data-testid="login-email"]', CREDENTIALS.valid.email);
  await page.fill('[data-testid="login-password"]', CREDENTIALS.valid.password);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL('/app', { timeout: 10000 });
});
```

---

## Scénario 5 : Déconnexion

```typescript
test('déconnexion → redirection login', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.click('[data-testid="user-menu"]');
  await page.click('[data-testid="logout-btn"]');
  await page.waitForURL('/auth/login');
  await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
});
```

---

## Scénario 6 : Mot de passe oublié

```typescript
test('forgot password → saisir email → notification envoyée', async ({ page }) => {
  await page.goto('/auth/forgot-password');
  await page.fill('[data-testid="forgot-email"]', 'test1@wimrux.app');
  await page.click('[data-testid="forgot-submit"]');

  // Notification positive (même si SMTP non configuré, le message est affiché)
  await expect(page.locator('.q-notification--positive, .q-notification--warning'))
    .toBeVisible();
});
```

---

## Scénario 7 : Inscription nouvelle entreprise

**Page** : `/auth/register`

```typescript
test('inscription nouvelle entreprise → création compte', async ({ page }) => {
  await page.goto('/auth/register');
  await page.fill('[data-testid="reg-ifu"]', '99999999Z');
  // Attendre que l'entreprise s'affiche (si lookup IFU)
  await page.fill('[data-testid="reg-fullname"]', 'Test User');
  await page.fill('[data-testid="reg-email"]', 'newuser-test@wimrux.app');
  await page.fill('[data-testid="reg-password"]', 'NewUser2026!');
  await page.selectOption('[data-testid="reg-role"]', 'admin');
  await page.click('[data-testid="reg-submit"]');

  // Redirection login ou dashboard
  await page.waitForURL(/\/(auth\/login|app)/, { timeout: 15000 });
});
```

---

## Nettoyage

Apres chaque test auth :
- Supprimer les comptes "test-*" crées pendant les tests (via SQL si besoin)
- Réinitialiser `two_fa_enabled = true` sur les comptes principaux
