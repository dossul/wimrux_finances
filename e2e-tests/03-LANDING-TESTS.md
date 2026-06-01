# 03 — Tests E2E : Landing Page & Navigation publique

> Tests de la page d'accueil et des pages legales (publiques, pas d'auth requise).

---

## Contexte

- **Pages** : `LandingPage.vue`, `TermsPage.vue`, `PrivacyPolicyPage.vue`
- **Layout** : `AuthLayout.vue` pour les pages legales
- **Routes** : `/`, `/legal/terms`, `/legal/privacy`

---

## Scénario 1 : Landing page — Navbar visible

```typescript
test('landing page → navbar sur une seule ligne', async ({ page }) => {
  await page.goto('/');

  // Logo + titre visibles
  await expect(page.locator('img[alt="W"]')).toBeVisible();
  await expect(page.locator('text=WIMRUX')).toBeVisible();

  // Menu items
  await expect(page.locator('text=Fonctionnalités')).toBeVisible();
  await expect(page.locator('text=Avantages')).toBeVisible();
  await expect(page.locator('text=WIMRUX Facturation')).toBeVisible();
  await expect(page.locator('text=Tarifs')).toBeVisible();

  // Boutons
  await expect(page.locator('text=Connexion')).toBeVisible();
  await expect(page.locator('text=Voir la Démo')).toBeVisible();
});
```

---

## Scénario 2 : Navigation scroll

```typescript
test('clic "Fonctionnalités" → scroll vers section features', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Fonctionnalités');

  // Verifier que l'element #features est dans le viewport
  const features = page.locator('#features');
  await expect(features).toBeInViewport();
});
```

---

## Scénario 3 : Bouton Connexion

```typescript
test('clic Connexion → /auth/login', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Connexion');
  await page.waitForURL('/auth/login');
  await expect(page.locator('[data-testid="login-email"]')).toBeVisible();
});
```

---

## Scénario 4 : Bouton Voir la Démo

```typescript
test('clic Voir la Démo → modal vidéo', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Voir la Démo');

  // Modal visible
  await expect(page.locator('.q-dialog:visible')).toBeVisible();
});
```

---

## Scénario 5 : Pages legales

```typescript
test('CGU chargee', async ({ page }) => {
  await page.goto('/legal/terms');
  await expect(page.locator('h1, h2:has-text("Conditions")')).toBeVisible();
});

test('Politique de confidentialite chargee', async ({ page }) => {
  await page.goto('/legal/privacy');
  await expect(page.locator('h1, h2:has-text("Confidentialité")')).toBeVisible();
});
```

---

## Scénario 6 : Responsive mobile

```typescript
test('landing page responsive mobile → menu hamburger', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');

  // Hamburger menu visible sur mobile
  await expect(page.locator('.lt-md')).toBeVisible();

  // Cliquer hamburger → menu drawer
  await page.click('.q-btn[aria-label="Menu"]');
  await expect(page.locator('.q-drawer')).toBeVisible();
});
```
