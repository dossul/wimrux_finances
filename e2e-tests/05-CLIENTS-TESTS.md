# 05 — Tests E2E : Clients

> Tests CRUD clients : Personne Morale (PM) et Consommateur (CC), recherche, IFU lookup.

---

## Contexte

- **Page** : `ClientsPage.vue`
- **Composables** : (direct dans la page)
- **Route** : `/app/clients`

---

## Données de test

```typescript
const CLIENT_PM = {
  type: 'PM',
  name: 'TECHNO SOLUTIONS SARL (TEST)',
  ifu: '00123456A',
  address: 'Zone Industrielle, Ouagadougou',
  phone: '+22670000001',
};

const CLIENT_CC = {
  type: 'CC',
  name: 'Client Comptoir (TEST)',
};
```

---

## Scénario 1 : Créer client PM avec IFU

```typescript
test('créer client PM → lookup IFU → sauvegarde', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/clients');

  // 1. Nouveau client
  await page.click('[data-testid="client-new-btn"]');

  // 2. Type PM
  await page.click('[data-testid="client-type-pm"]');

  // 3. Nom
  await page.fill('[data-testid="client-name"]', CLIENT_PM.name);

  // 4. IFU (peut declencher un lookup)
  await page.fill('[data-testid="client-ifu"]', CLIENT_PM.ifu);

  // 5. Adresse
  await page.fill('[data-testid="client-address"]', CLIENT_PM.address);

  // 6. Téléphone
  await page.fill('[data-testid="client-phone"]', CLIENT_PM.phone);

  // 7. Sauvegarder
  await page.click('[data-testid="client-save-btn"]');
  await waitForToast(page, 'enregistré');

  // 8. Verifier liste
  await expect(page.locator(`text=${CLIENT_PM.name}`)).toBeVisible();
});
```

---

## Scénario 2 : Créer client Consommateur (CC)

```typescript
test('créer client CC → sans IFU', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/clients');

  await page.click('[data-testid="client-new-btn"]');
  await page.click('[data-testid="client-type-cc"]');
  await page.fill('[data-testid="client-name"]', CLIENT_CC.name);
  await page.click('[data-testid="client-save-btn"]');
  await waitForToast(page, 'enregistré');

  await expect(page.locator(`text=${CLIENT_CC.name}`)).toBeVisible();
});
```

---

## Scénario 3 : Rechercher client

```typescript
test('recherche client → filtrage', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/clients');

  // Recherche
  await page.fill('[data-testid="client-search"]', 'TECHNO');
  await page.waitForTimeout(500);

  const rows = page.locator('[data-testid="client-row"]');
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('TECHNO');
});
```

---

## Scénario 4 : Modifier client

```typescript
test('modifier client → mise à jour', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/clients');

  // Ouvrir client
  await page.click(`text=${CLIENT_PM.name}`);

  // Modifier adresse
  await page.fill('[data-testid="client-address"]', 'Nouvelle adresse TEST');
  await page.click('[data-testid="client-save-btn"]');
  await waitForToast(page, 'mis à jour');

  // Verifier
  await expect(page.locator('text=Nouvelle adresse TEST')).toBeVisible();
});
```

---

## Scénario 5 : Supprimer client

```typescript
test('supprimer client → confirmation', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/clients');

  // Menu actions
  await page.click(`[data-testid="client-menu-${CLIENT_CC.name}"]`);
  await page.click('[data-testid="client-delete"]');

  // Confirmation dialog
  await page.click('.q-btn:has-text("Confirmer")');
  await waitForToast(page, 'supprimé');

  await expect(page.locator(`text=${CLIENT_CC.name}`)).not.toBeVisible();
});
```

---

## Scénario 6 : IFU lookup (si implémenté)

```typescript
test('saisir IFU valide → auto-remplissage nom entreprise', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/clients');
  await page.click('[data-testid="client-new-btn"]');
  await page.click('[data-testid="client-type-pm"]');

  // Saisir IFU connu
  await page.fill('[data-testid="client-ifu"]', '00089946R');  // WESTAGO
  await page.press('[data-testid="client-ifu"]', 'Tab');

  // Attendre auto-fill
  await page.waitForTimeout(1500);

  // Verifier que le nom est rempli
  const nameValue = await page.inputValue('[data-testid="client-name"]');
  expect(nameValue).toContain('WESTAGO');
});
```

---

## Scénario 7 : Pagination clients

```typescript
test('pagination → page 2', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/clients');

  const nextBtn = page.locator('[data-testid="client-pagination-next"]');
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await expect(page.locator('[data-testid="client-page-indicator"]'))
      .toContainText('2');
  }
});
```

---

## Nettoyage

Supprimer tous les clients dont le nom contient "(TEST)".
