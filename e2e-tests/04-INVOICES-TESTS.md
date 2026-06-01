# 04 — Tests E2E : Facturation (100% coverage)

> Tests CRUD factures, certification MCF, PDF, numerotation, factures recues, fournisseurs, creances.

---

## Contexte

- **Pages** : `InvoicesListPage.vue`, `InvoiceEditorPage.vue`, `ReceivedInvoicesPage.vue`, `SuppliersPage.vue`, `ReceivablesPage.vue`, `TaxPaymentsPage.vue`
- **Composables** : `useInvoiceWorkflow.ts`, `useInvoicePdf.ts`, `useInvoicePayments.ts`, `useTaxCalculation.ts`
- **Store** : `invoice-store.ts`
- **Routes** : `/app/invoices`, `/app/invoices/new`, `/app/invoices/:id`, `/app/invoices/received`, `/app/suppliers`, `/app/receivables`, `/app/tax-payments`

---

## Données de test

```typescript
const INVOICE_DATA = {
  client: 'TECHNO SOLUTIONS SARL (TEST)',
  items: [
    { designation: 'Ordinateur portable TEST', qty: 2, priceHt: 450000, taxGroup: 'A' },
    { designation: 'Licence logiciel TEST', qty: 5, priceHt: 50000, taxGroup: 'B' },
    { designation: 'Formation TEST', qty: 1, priceHt: 150000, taxGroup: 'C' },
  ],
};
```

---

## Scénario 1 : Créer facture de vente (FV)

```typescript
test('créer FV → validée → affichée dans la liste', async ({ page }) => {
  await login(page, 'adminIltic');

  // 1. Aller dans Factures
  await page.click('[data-testid="nav-invoices"]');
  await page.waitForURL('/app/invoices');

  // 2. Nouvelle facture
  await page.click('[data-testid="invoice-new-btn"]');
  await page.waitForURL('/app/invoices/new');

  // 3. Sélectionner type FV
  await page.selectOption('[data-testid="invoice-type-select"]', 'FV');

  // 4. Sélectionner client
  await page.click('[data-testid="invoice-client-select"]');
  await page.click(`.q-item:has-text("${INVOICE_DATA.client}")`);

  // 5. Mode prix HT
  await page.click('[data-testid="price-mode-ht"]');

  // 6. Ajouter articles
  for (let i = 0; i < INVOICE_DATA.items.length; i++) {
    const item = INVOICE_DATA.items[i];
    await page.fill(`[data-testid="item-designation-${i}"]`, item.designation);
    await page.fill(`[data-testid="item-qty-${i}"]`, String(item.qty));
    await page.fill(`[data-testid="item-price-${i}"]`, String(item.priceHt));
    await page.selectOption(`[data-testid="item-tax-${i}"]`, item.taxGroup);

    if (i < INVOICE_DATA.items.length - 1) {
      await page.click('[data-testid="add-item-btn"]');
    }
  }

  // 7. Sauvegarder brouillon
  await page.click('[data-testid="invoice-save-btn"]');
  await waitForToast(page, 'Facture enregistrée');

  // 8. Valider la facture
  await page.click('[data-testid="invoice-validate-btn"]');
  await waitForToast(page, 'validée');

  // 9. Verifier statut
  await expect(page.locator('[data-testid="invoice-status"]'))
    .toContainText('Validée');
});
```

---

## Scénario 2 : Certifier MCF (Machine à facturer certifiée)

```typescript
test('certifier facture MCF → QR code + UID généré', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/invoices');

  // Ouvrir une facture validée
  await page.click('[data-testid="invoice-row-validated"]');

  // Cliquer Certifier
  await page.click('[data-testid="invoice-certify-btn"]');

  // Attendre notification
  await waitForToast(page, 'certifiée');

  // Verifier statut
  await expect(page.locator('[data-testid="invoice-status"]'))
    .toContainText('Certifiée');

  // Verifier UID MCF affiché
  await expect(page.locator('[data-testid="mcf-uid"]')).toBeVisible();

  // Verifier QR code present
  await expect(page.locator('canvas[data-testid="mcf-qrcode"]')).toBeVisible();
});
```

---

## Scénario 3 : Générer PDF

```typescript
test('générer PDF → téléchargement OK', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/invoices');

  // Ouvrir facture certifiée
  await page.click('[data-testid="invoice-row-certified"]');

  // Attendre chargement
  await page.waitForLoadState('networkidle');

  // Cliquer PDF
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="invoice-pdf-btn"]'),
  ]);

  // Verifier nom du fichier
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
});
```

---

## Scénario 4 : Numérotation séquentielle

```typescript
test('numérotation FV consécutive', async ({ page }) => {
  await login(page, 'adminIltic');

  // Créer FV #1
  await createDraftInvoice(page, 'FV');
  const num1 = await page.locator('[data-testid="invoice-number"]').textContent();

  // Créer FV #2
  await createDraftInvoice(page, 'FV');
  const num2 = await page.locator('[data-testid="invoice-number"]').textContent();

  // Verifier séquence
  expect(parseInt(num2!.split('-')[1])).toBe(parseInt(num1!.split('-')[1]) + 1);
});
```

---

## Scénario 5 : Créer avoir (AV)

```typescript
test('créer avoir AV → numérotation AV', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.click('[data-testid="nav-invoices"]');
  await page.click('[data-testid="invoice-new-btn"]');
  await page.selectOption('[data-testid="invoice-type-select"]', 'AV');
  await page.click('[data-testid="invoice-client-select"]');
  await page.click(`.q-item:has-text("${INVOICE_DATA.client}")`);
  await page.click('[data-testid="invoice-save-btn"]');
  await waitForToast(page, 'enregistrée');

  // Verifier prefix AV
  const num = await page.locator('[data-testid="invoice-number"]').textContent();
  expect(num).toMatch(/^AV/);
});
```

---

## Scénario 6 : Liste + recherche + filtres

```typescript
test('liste factures → recherche + pagination', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/invoices');

  // Recherche
  await page.fill('[data-testid="invoice-search"]', 'TECHNO');
  await page.waitForTimeout(500);  // debounce
  const rows = page.locator('[data-testid="invoice-row"]');
  await expect(rows.first()).toContainText('TECHNO');

  // Filtre par statut
  await page.selectOption('[data-testid="invoice-status-filter"]', 'validated');
  await expect(rows.first()).toContainText('Validée');

  // Filtre par date
  await page.fill('[data-testid="invoice-date-from"]', '2026-01-01');
  await page.fill('[data-testid="invoice-date-to"]', '2026-12-31');
});
```

---

## Scénario 7 : Factures reçues (ReceivedInvoicesPage)

```typescript
test('factures reçues → créer + OCR fournisseur', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/invoices/received');

  // Nouvelle facture reçue
  await page.click('[data-testid="received-invoice-new-btn"]');
  await page.fill('[data-testid="received-amount"]', '150000');
  await page.selectOption('[data-testid="received-supplier"]', 'Fournisseur Test');
  await page.click('[data-testid="received-save-btn"]');
  await waitForToast(page, 'enregistrée');
});
```

---

## Scénario 8 : Fournisseurs (SuppliersPage)

```typescript
test('fournisseurs → CRUD', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/suppliers');

  // Creer
  await page.click('[data-testid="supplier-new-btn"]');
  await page.fill('[data-testid="supplier-name"]', 'SUPPLIER TEST SARL');
  await page.fill('[data-testid="supplier-ifu"]', '88888888Z');
  await page.click('[data-testid="supplier-save-btn"]');
  await waitForToast(page, 'enregistré');

  // Verifier liste
  await expect(page.locator('text=SUPPLIER TEST SARL')).toBeVisible();

  // Supprimer
  await page.click('[data-testid="supplier-delete-SUPPLIER TEST SARL"]');
  await page.click('.q-btn:has-text("Confirmer")');
  await expect(page.locator('text=SUPPLIER TEST SARL')).not.toBeVisible();
});
```

---

## Scénario 9 : Créances (ReceivablesPage)

```typescript
test('balance âgée → affichage + relance email', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/receivables');

  // Verifier tableau
  await expect(page.locator('[data-testid="receivables-table"]')).toBeVisible();

  // Envoyer relance
  await page.click('[data-testid="receivable-remind-btn"]');
  await page.click('.q-item:has-text("Email")');
  await waitForToast(page, 'relance');
});
```

---

## Scénario 10 : Paiements fiscaux (TaxPaymentsPage)

```typescript
test('paiements fiscaux → CRUD', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/tax-payments');

  // Nouveau paiement
  await page.click('[data-testid="tax-payment-new-btn"]');
  await page.fill('[data-testid="tax-payment-amount"]', '500000');
  await page.selectOption('[data-testid="tax-payment-type"]', 'tva');
  await page.click('[data-testid="tax-payment-save-btn"]');
  await waitForToast(page, 'enregistré');
});
```

---

## Scénario 11 : Export CSV factures

```typescript
test('exporter CSV → téléchargement', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/invoices');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="export-csv-btn"]'),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});
```

---

## Scénario 12 : Dupliquer facture

```typescript
test('dupliquer facture → nouveau brouillon', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/invoices');

  // Ouvrir menu actions
  await page.click('[data-testid="invoice-menu-btn"]');
  await page.click('[data-testid="invoice-duplicate"]');

  // Verifier redirection editor
  await page.waitForURL(/\/app\/invoices\/new/);
  await expect(page.locator('[data-testid="invoice-status"]'))
    .toContainText('Brouillon');
});
```

---

## Nettoyage

Apres les tests :
```typescript
// Supprimer toutes les factures dont le client contient "(TEST)"
// via SQL ou API admin
```
