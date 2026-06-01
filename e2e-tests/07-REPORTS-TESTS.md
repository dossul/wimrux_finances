# 07 — Tests E2E : Rapports & Tableaux de bord

> Tests des rapports standards, fiscaux, query builder, dashboards, exports.

---

## Contexte

- **Pages** : `ReportsPage.vue`, `StandardReportsPage.vue`, `QueryBuilderPage.vue`, `DashboardsPage.vue`
- **Composables** : `useFinancialReports.ts`, `useReportExports.ts`, `useSavedQueries.ts`, `useDashboards.ts`, `useAReport.ts`, `useFiscalProfile.ts`
- **Routes** : `/app/reports`, `/app/reports/standard`, `/app/reports/query-builder`, `/app/reports/dashboards`

---

## Scénario 1 : Rapport synthèse mensuelle

```typescript
test('synthèse mensuelle → KPIs affichés', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/reports');

  // Sélectionner période
  await page.selectOption('[data-testid="report-period"]', 'this_month');
  await page.click('[data-testid="report-generate-btn"]');

  // Vérifier KPIs
  await expect(page.locator('[data-testid="kpi-invoice-count"]')).toBeVisible();
  await expect(page.locator('[data-testid="kpi-revenue-ht"]')).toBeVisible();
  await expect(page.locator('[data-testid="kpi-tva-collected"]')).toBeVisible();
  await expect(page.locator('[data-testid="kpi-total-ttc"]')).toBeVisible();
});
```

---

## Scénario 2 : Répartition par type de facture

```typescript
test('répartition par type → tableau FV/AV/NI', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/reports');

  await page.click('[data-testid="tab-by-type"]');
  await expect(page.locator('[data-testid="type-table"]')).toBeVisible();
  await expect(page.locator('text=FV')).toBeVisible();
});
```

---

## Scénario 3 : Répartition par groupe taxe

```typescript
test('répartition taxes → groupes A/B/C', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/reports');

  await page.click('[data-testid="tab-by-tax"]');
  await expect(page.locator('text=Groupe A (18%)')).toBeVisible();
  await expect(page.locator('text=Groupe B (18%)')).toBeVisible();
  await expect(page.locator('text=Groupe C (0%)')).toBeVisible();
});
```

---

## Scénario 4 : Export CSV rapport

```typescript
test('exporter rapport CSV → téléchargement', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/reports');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="report-export-csv-btn"]'),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});
```

---

## Scénario 5 : Export PDF rapport

```typescript
test('exporter rapport PDF → téléchargement', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/reports');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="report-export-pdf-btn"]'),
  ]);

  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
});
```

---

## Scénario 6 : Rapports standards

```typescript
test('rapports standards → balance, grand livre, journal', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/reports/standard');

  // Balance
  await page.click('[data-testid="report-balance-btn"]');
  await expect(page.locator('[data-testid="balance-table"]')).toBeVisible();

  // Grand livre
  await page.click('[data-testid="report-ledger-btn"]');
  await expect(page.locator('[data-testid="ledger-table"]')).toBeVisible();

  // Journal
  await page.click('[data-testid="report-journal-btn"]');
  await expect(page.locator('[data-testid="journal-table"]')).toBeVisible();
});
```

---

## Scénario 7 : Query Builder

```typescript
test('query builder → construire requête → exécuter', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/reports/query-builder');

  // Sélectionner table
  await page.selectOption('[data-testid="qb-table"]', 'invoices');

  // Ajouter condition
  await page.click('[data-testid="qb-add-condition"]');
  await page.selectOption('[data-testid="qb-field-0"]', 'status');
  await page.selectOption('[data-testid="qb-operator-0"]', 'eq');
  await page.fill('[data-testid="qb-value-0"]', 'certified');

  // Exécuter
  await page.click('[data-testid="qb-run-btn"]');
  await expect(page.locator('[data-testid="qb-results"]')).toBeVisible();
});
```

---

## Scénario 8 : Dashboards

```typescript
test('dashboards → chargement widgets', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/reports/dashboards');

  await expect(page.locator('[data-testid="dashboard-widget-revenue"]')).toBeVisible();
  await expect(page.locator('[data-testid="dashboard-widget-expenses"]')).toBeVisible();
  await expect(page.locator('[data-testid="dashboard-widget-cashflow"]')).toBeVisible();
});
```

---

## Scénario 9 : Rapport Z

```typescript
test('rapport Z → génération + compteurs', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/reports');  // ou /fiscal-reports

  await page.click('[data-testid="report-z-btn"]');
  await page.fill('[data-testid="z-date"]', '2026-05-27');
  await page.click('[data-testid="z-generate-btn"]');

  await expect(page.locator('[data-testid="z-report-content"]')).toBeVisible();
  await expect(page.locator('[data-testid="z-counters"]')).toBeVisible();
});
```

---

## Scénario 10 : Rapport X

```typescript
test('rapport X → génération + compteurs', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/reports');

  await page.click('[data-testid="report-x-btn"]');
  await page.click('[data-testid="x-generate-btn"]');

  await expect(page.locator('[data-testid="x-report-content"]')).toBeVisible();
});
```

---

## Scénario 11 : Compte de résultat

```typescript
test('compte de résultat → affichage', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/reports/standard');

  await page.click('[data-testid="report-income-statement-btn"]');
  await expect(page.locator('[data-testid="income-statement-table"]')).toBeVisible();
  await expect(page.locator('text=Chiffre d\'affaires')).toBeVisible();
});
```

---

## Scénario 12 : Bilan

```typescript
test('bilan → actif / passif', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/reports/standard');

  await page.click('[data-testid="report-balance-sheet-btn"]');
  await expect(page.locator('[data-testid="balance-sheet-assets"]')).toBeVisible();
  await expect(page.locator('[data-testid="balance-sheet-liabilities"]')).toBeVisible();
});
```
