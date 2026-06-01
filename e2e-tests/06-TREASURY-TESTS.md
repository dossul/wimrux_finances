# 06 — Tests E2E : Trésorerie, Banque, Wallets

> Tests complets : comptes, mouvements, import relevé bancaire, OCR, rapprochement, virements, chèques, wallets.

---

## Contexte

- **Pages** : `TreasuryPage.vue`, `BankingAccountsPage.vue`, `BankingAccountDetailPage.vue`, `BankStatementImportPage.vue`, `ReconciliationPage.vue`, `WireTransfersPage.vue`, `ChecksPage.vue`, `BankFeesPage.vue`, `MobileWalletsPage.vue`, `WalletsPage.vue`, `WalletTransactionsPage.vue`, `WalletReconciliationPage.vue`, `WalletSyncSettingsPage.vue`, `PettyCashPage.vue`, `CashflowPage.vue`, `AssetsPage.vue`, `LoansPage.vue`, `InvestmentsPage.vue`, `BudgetsPage.vue`, `BudgetDetailPage.vue`
- **Composables** : `useBankAccounts.ts`, `useBankTransactions.ts`, `useBankStatementOcr.ts`, `useReconciliation.ts`, `useWireTransfers.ts`, `useChecks.ts`, `useBankFees.ts`, `usePaymentWallets.ts`, `useMobileWallets.ts`, `usePettyCash.ts`, `useCashflowForecast.ts`, `useLoans.ts`, `useInvestments.ts`, `useBudgets.ts`, `useDepreciation.ts`, `useIngestPayment.ts`
- **Routes** : `/app/treasury`, `/app/banking`, `/app/banking/:id`, `/app/banking/:id/import`, `/app/banking/:id/reconciliation`, `/app/banking/transfers`, `/app/banking/checks`, `/app/banking/fees`, `/app/mobile-wallets`, `/app/wallets`, `/app/petty-cash`, `/app/treasury/cashflow`, `/app/assets`, `/app/loans`, `/app/investments`, `/app/budgets`

---

## Scénario 1 : Créer compte bancaire

```typescript
test('créer compte bancaire → solde initial', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/banking');

  // Nouveau compte
  await page.click('[data-testid="bank-account-new-btn"]');
  await page.fill('[data-testid="bank-account-name"]', 'Compte BOA TEST');
  await page.selectOption('[data-testid="bank-account-type"]', 'bank');
  await page.fill('[data-testid="bank-account-balance"]', '5000000');
  await page.click('[data-testid="bank-account-save-btn"]');
  await waitForToast(page, 'enregistré');

  // Verifier solde
  await expect(page.locator('text=5 000 000')).toBeVisible();
});
```

---

## Scénario 2 : Mouvement crédit

```typescript
test('crédit → solde mis à jour', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/treasury');

  // Nouveau mouvement
  await page.click('[data-testid="treasury-new-movement-btn"]');
  await page.selectOption('[data-testid="movement-type"]', 'credit');
  await page.selectOption('[data-testid="movement-account"]', 'Compte BOA TEST');
  await page.fill('[data-testid="movement-amount"]', '1500000');
  await page.selectOption('[data-testid="movement-mode"]', 'bank_transfer');
  await page.fill('[data-testid="movement-reference"]', 'Règlement TECHNO TEST');
  await page.click('[data-testid="movement-save-btn"]');
  await waitForToast(page, 'enregistré');

  // Verifier solde = 6 500 000
  await expect(page.locator('text=6 500 000')).toBeVisible();
});
```

---

## Scénario 3 : Mouvement débit

```typescript
test('débit → solde mis à jour', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/treasury');

  await page.click('[data-testid="treasury-new-movement-btn"]');
  await page.selectOption('[data-testid="movement-type"]', 'debit');
  await page.selectOption('[data-testid="movement-account"]', 'Compte BOA TEST');
  await page.fill('[data-testid="movement-amount"]', '200000');
  await page.selectOption('[data-testid="movement-mode"]', 'cash');
  await page.fill('[data-testid="movement-reference"]', 'Achat fournitures TEST');
  await page.click('[data-testid="movement-save-btn"]');
  await waitForToast(page, 'enregistré');

  // Solde = 6 300 000
  await expect(page.locator('text=6 300 000')).toBeVisible();
});
```

---

## Scénario 4 : Import relevé bancaire (OCR)

```typescript
test('import relevé PDF → extraction transactions', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/banking');

  // Sélectionner compte
  await page.click('text=Compte BOA TEST');
  await page.click('[data-testid="import-statement-btn"]');

  // Upload fichier PDF
  const input = page.locator('input[type="file"]');
  await input.setInputFiles('fixtures/test-bank-statement.pdf');

  // Attendre OCR
  await page.waitForTimeout(5000);

  // Verifier transactions extraites
  await expect(page.locator('[data-testid="extracted-transaction"]')).toHaveCount.greaterThan(0);

  // Confirmer import
  await page.click('[data-testid="confirm-import-btn"]');
  await waitForToast(page, 'importé');
});
```

---

## Scénario 5 : Rapprochement bancaire

```typescript
test('rapprochement → matcher transactions', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/banking');
  await page.click('text=Compte BOA TEST');
  await page.click('[data-testid="reconciliation-btn"]');

  // Sélectionner période
  await page.fill('[data-testid="reconciliation-from"]', '2026-01-01');
  await page.fill('[data-testid="reconciliation-to"]', '2026-12-31');
  await page.click('[data-testid="reconciliation-run-btn"]');

  // Matcher une ligne
  await page.click('[data-testid="reconcile-match-btn"]:first-of-type');
  await waitForToast(page, 'rapproché');
});
```

---

## Scénario 6 : Ordre de virement

```typescript
test('virement → création + statut', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/banking/transfers');

  await page.click('[data-testid="transfer-new-btn"]');
  await page.selectOption('[data-testid="transfer-from"]', 'Compte BOA TEST');
  await page.fill('[data-testid="transfer-beneficiary"]', 'Fournisseur TEST');
  await page.fill('[data-testid="transfer-iban"]', 'BF123456789');
  await page.fill('[data-testid="transfer-amount"]', '500000');
  await page.click('[data-testid="transfer-save-btn"]');
  await waitForToast(page, 'enregistré');

  // Verifier statut "En attente"
  await expect(page.locator('[data-testid="transfer-status"]')).toContainText('En attente');
});
```

---

## Scénario 7 : Chèques

```typescript
test('chèque → émission + suivi', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/banking/checks');

  await page.click('[data-testid="check-new-btn"]');
  await page.fill('[data-testid="check-number"]', '00012345');
  await page.fill('[data-testid="check-beneficiary"]', 'Fournisseur TEST');
  await page.fill('[data-testid="check-amount"]', '250000');
  await page.click('[data-testid="check-save-btn"]');
  await waitForToast(page, 'enregistré');
});
```

---

## Scénario 8 : Frais bancaires

```typescript
test('frais bancaires → saisie automatique', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/banking/fees');

  await expect(page.locator('[data-testid="fees-table"]')).toBeVisible();
});
```

---

## Scénario 9 : Petite caisse

```typescript
test('petite caisse → dépense + remboursement', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/petty-cash');

  await page.click('[data-testid="petty-expense-new-btn"]');
  await page.fill('[data-testid="petty-expense-amount"]', '15000');
  await page.fill('[data-testid="petty-expense-reason"]', 'Fournitures bureau TEST');
  await page.click('[data-testid="petty-expense-save-btn"]');
  await waitForToast(page, 'enregistrée');
});
```

---

## Scénario 10 : Wallets mobiles

```typescript
test('wallet mobile → transaction', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/mobile-wallets');

  await page.click('[data-testid="wallet-new-btn"]');
  await page.selectOption('[data-testid="wallet-provider"]', 'orange_money');
  await page.fill('[data-testid="wallet-number"]', '+22670000001');
  await page.click('[data-testid="wallet-save-btn"]');
  await waitForToast(page, 'enregistré');
});
```

---

## Scénario 11 : Budgets

```typescript
test('budget → création + suivi', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/budgets');

  await page.click('[data-testid="budget-new-btn"]');
  await page.fill('[data-testid="budget-name"]', 'Budget Marketing TEST');
  await page.fill('[data-testid="budget-amount"]', '2000000');
  await page.selectOption('[data-testid="budget-period"]', 'monthly');
  await page.click('[data-testid="budget-save-btn"]');
  await waitForToast(page, 'enregistré');

  // Vérifier détail
  await page.click(`text=Budget Marketing TEST`);
  await expect(page.locator('[data-testid="budget-detail-chart"]')).toBeVisible();
});
```

---

## Scénario 12 : Immobilisations

```typescript
test('immobilisation → création + amortissement', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/assets');

  await page.click('[data-testid="asset-new-btn"]');
  await page.fill('[data-testid="asset-name"]', 'Véhicule TEST');
  await page.fill('[data-testid="asset-value"]', '8000000');
  await page.fill('[data-testid="asset-lifespan"]', '5');
  await page.click('[data-testid="asset-save-btn"]');
  await waitForToast(page, 'enregistrée');

  // Vérifier tableau amortissement
  await expect(page.locator('[data-testid="depreciation-table"]')).toBeVisible();
});
```

---

## Scénario 13 : Emprunts

```typescript
test('emprunt → création + tableau amortissement', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/loans');

  await page.click('[data-testid="loan-new-btn"]');
  await page.fill('[data-testid="loan-amount"]', '10000000');
  await page.fill('[data-testid="loan-rate"]', '7.5');
  await page.fill('[data-testid="loan-duration"]', '36');
  await page.click('[data-testid="loan-save-btn"]');
  await waitForToast(page, 'enregistré');

  // Vérifier tableau
  await expect(page.locator('[data-testid="loan-schedule"]')).toBeVisible();
});
```

---

## Scénario 14 : Investissements

```typescript
test('investissement → création + valorisation', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/investments');

  await page.click('[data-testid="investment-new-btn"]');
  await page.fill('[data-testid="investment-name"]', 'Actions TEST');
  await page.selectOption('[data-testid="investment-type"]', 'stocks');
  await page.fill('[data-testid="investment-amount"]', '5000000');
  await page.click('[data-testid="investment-save-btn"]');
  await waitForToast(page, 'enregistré');
});
```

---

## Scénario 15 : Prévision de trésorerie

```typescript
test('cashflow forecast → affichage graphique', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/treasury/cashflow');

  await expect(page.locator('[data-testid="cashflow-chart"]')).toBeVisible();
  await expect(page.locator('[data-testid="cashflow-projection"]')).toBeVisible();
});
```
