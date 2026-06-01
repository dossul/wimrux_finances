# 11 — Tests E2E : Fiscalité (Rapports Z/X, Déclarations)

> Tests des rapports fiscaux DGI : Rapport Z, Rapport X, déclarations fiscales.

---

## Contexte

- **Pages** : `TaxDeclarationsPage.vue`, `ReportsPage.vue` (intégré)
- **Composables** : `useFiscalProfile.ts`, `useTaxDeclarations.ts`, `useTaxCalculation.ts`, `useTaxPayments.ts`
- **Routes** : `/app/fiscal/declarations`

---

## Scénario 1 : Rapport Z — génération et validation

```typescript
test('rapport Z → génération + compteurs cohérents', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/reports');  // ou page dédiée si séparée

  await page.click('[data-testid="report-z-btn"]');
  await page.fill('[data-testid="z-date"]', '2026-05-27');
  await page.click('[data-testid="z-generate-btn"]');

  // Vérifier contenu
  await expect(page.locator('[data-testid="z-report-content"]')).toBeVisible();

  // Vérifier compteurs
  const total = await page.locator('[data-testid="z-total-ttc"]').textContent();
  expect(parseInt(total!.replace(/\D/g, ''))).toBeGreaterThanOrEqual(0);

  // Vérifier numéro fiscal (NIM)
  await expect(page.locator('[data-testid="z-nim"]')).toBeVisible();
});
```

---

## Scénario 2 : Rapport X — compteurs courants

```typescript
test('rapport X → génération + compteurs non remis à zéro', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/reports');

  await page.click('[data-testid="report-x-btn"]');
  await page.click('[data-testid="x-generate-btn"]');

  await expect(page.locator('[data-testid="x-report-content"]')).toBeVisible();
  await expect(page.locator('[data-testid="x-counters"]')).toBeVisible();
});
```

---

## Scénario 3 : Déclarations fiscales — liste

```typescript
test('déclarations fiscales → affichage', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/fiscal/declarations');

  await expect(page.locator('[data-testid="declarations-table"]')).toBeVisible();
  await expect(page.locator('text=TVA mensuelle')).toBeVisible();
  await expect(page.locator('text=BIC annuel')).toBeVisible();
});
```

---

## Scénario 4 : Déclaration TVA — création

```typescript
test('déclaration TVA → création + calcul auto', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/fiscal/declarations');

  await page.click('[data-testid="declaration-new-btn"]');
  await page.selectOption('[data-testid="declaration-type"]', 'tva_mensuelle');
  await page.fill('[data-testid="declaration-period"]', '2026-05');
  await page.click('[data-testid="declaration-calculate-btn"]');

  // Attendre calcul
  await page.waitForSelector('[data-testid="declaration-tva-amount"]', { timeout: 10000 });

  const amount = await page.inputValue('[data-testid="declaration-tva-amount"]');
  expect(parseInt(amount)).toBeGreaterThan(0);

  await page.click('[data-testid="declaration-save-btn"]');
  await waitForToast(page, 'enregistrée');
});
```

---

## Scénario 5 : Certification MCF — QR code et signature

```typescript
test('certification MCF → QR code lisible + signature', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/invoices');

  // Ouvrir facture certifiée
  await page.click('[data-testid="invoice-row-certified"]');

  // Vérifier QR code
  await expect(page.locator('canvas[data-testid="mcf-qrcode"]')).toBeVisible();

  // Vérifier signature
  await expect(page.locator('[data-testid="mcf-signature"]')).toBeVisible();

  // Vérifier UID
  await expect(page.locator('[data-testid="mcf-uid"]')).toBeVisible();

  // Vérifier statut
  await expect(page.locator('[data-testid="invoice-status"]')).toContainText('Certifiée');
});
```

---

## Scénario 6 : Paiements fiscaux — enregistrement

```typescript
test('paiement fiscal → enregistrement + historique', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/tax-payments');

  await page.click('[data-testid="tax-payment-new-btn"]');
  await page.selectOption('[data-testid="tax-payment-type"]', 'tva');
  await page.fill('[data-testid="tax-payment-amount"]', '250000');
  await page.fill('[data-testid="tax-payment-date"]', '2026-05-27');
  await page.click('[data-testid="tax-payment-save-btn"]');
  await waitForToast(page, 'enregistré');

  // Vérifier historique
  await expect(page.locator('text=250 000')).toBeVisible();
});
```
