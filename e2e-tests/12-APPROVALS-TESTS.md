# 12 — Tests E2E : Workflows d'approbation

> Tests des workflows d'approbation de factures et mouvements.

---

## Contexte

- **Page** : `ApprovalWorkflowsPage.vue`
- **Composables** : `useApprovalWorkflow.ts`
- **Route** : `/app/approvals/workflows`
- **Permissions** : `settings.manage`

---

## Scénario 1 : Créer workflow d'approbation

```typescript
test('workflow → création + activation', async ({ page }) => {
  await login(page, 'superAdmin');
  await page.goto('/app/approvals/workflows');

  await page.click('[data-testid="workflow-new-btn"]');
  await page.fill('[data-testid="workflow-name"]', 'Workflow Factures TEST');
  await page.selectOption('[data-testid="workflow-entity"]', 'invoice');
  await page.selectOption('[data-testid="workflow-trigger"]', 'submit');

  // Ajouter étape
  await page.click('[data-testid="workflow-add-step-btn"]');
  await page.selectOption('[data-testid="workflow-step-role-0"]', 'admin');
  await page.selectOption('[data-testid="workflow-step-action-0"]', 'approve');

  await page.click('[data-testid="workflow-save-btn"]');
  await waitForToast(page, 'enregistré');
});
```

---

## Scénario 2 : Soumettre facture pour approbation

```typescript
test('facture → soumission → statut pending_approval', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/invoices');

  // Ouvrir brouillon
  await page.click('[data-testid="invoice-row-draft"]');

  // Soumettre
  await page.click('[data-testid="invoice-submit-btn"]');
  await waitForToast(page, 'soumise');

  // Vérifier statut
  await expect(page.locator('[data-testid="invoice-status"]'))
    .toContainText('En attente');
});
```

---

## Scénario 3 : Approuver facture

```typescript
test('approbation → facture validée', async ({ page }) => {
  await login(page, 'superAdmin');  // Approbateur
  await page.goto('/app/approvals/workflows');

  // Liste des approbations en attente
  await page.click('[data-testid="pending-approval-btn"]');
  await page.click('[data-testid="approve-btn"]:first-of-type');
  await waitForToast(page, 'approuvée');
});
```

---

## Scénario 4 : Rejeter facture

```typescript
test('rejet → facture retournée avec motif', async ({ page }) => {
  await login(page, 'superAdmin');
  await page.goto('/app/approvals/workflows');

  await page.click('[data-testid="pending-approval-btn"]');
  await page.click('[data-testid="reject-btn"]:first-of-type');
  await page.fill('[data-testid="reject-reason"]', 'Montant incorrect TEST');
  await page.click('[data-testid="reject-confirm-btn"]');
  await waitForToast(page, 'rejetée');
});
```
