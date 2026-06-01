# 13 — Tests E2E : Journal d'Audit

> Tests du journal d'audit inaltérable : lecture, filtrage, détail.

---

## Contexte

- **Page** : `AuditLogPage.vue`
- **Composables** : (direct dans la page)
- **Route** : `/app/audit`
- **Permissions** : `audit.read`

---

## Scénario 1 : Liste des entrées d'audit

```typescript
test('audit log → entrées visibles', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/audit');

  await expect(page.locator('[data-testid="audit-table"]')).toBeVisible();
  await expect(page.locator('[data-testid="audit-row"]').first()).toBeVisible();
});
```

---

## Scénario 2 : Badge INALTÉRABLE

```typescript
test('audit → badge inaltérable sur chaque entrée', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/audit');

  const rows = page.locator('[data-testid="audit-row"]');
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < Math.min(count, 5); i++) {
    await expect(rows.nth(i).locator('[data-testid="audit-badge-immutable"]'))
      .toBeVisible();
  }
});
```

---

## Scénario 3 : Filtrer par action (INSERT/UPDATE/DELETE)

```typescript
test('audit → filtre par action INSERT', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/audit');

  await page.selectOption('[data-testid="audit-action-filter"]', 'INSERT');
  await page.click('[data-testid="audit-apply-filter-btn"]');

  const rows = page.locator('[data-testid="audit-row"]');
  if (await rows.count() > 0) {
    await expect(rows.first().locator('[data-testid="audit-action"]'))
      .toContainText('INSERT');
  }
});
```

---

## Scénario 4 : Filtrer par table

```typescript
test('audit → filtre par table invoices', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/audit');

  await page.selectOption('[data-testid="audit-table-filter"]', 'invoices');
  await page.click('[data-testid="audit-apply-filter-btn"]');

  const rows = page.locator('[data-testid="audit-row"]');
  if (await rows.count() > 0) {
    await expect(rows.first().locator('[data-testid="audit-table"]'))
      .toContainText('invoices');
  }
});
```

---

## Scénario 5 : Détail d'une entrée (JSON avant/après)

```typescript
test('audit → clic entrée → dialog détail JSON', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/audit');

  // Cliquer première ligne
  await page.click('[data-testid="audit-row"]:first-of-type');

  // Dialog visible
  await expect(page.locator('[data-testid="audit-detail-dialog"]')).toBeVisible();

  // JSON avant/après visible
  await expect(page.locator('[data-testid="audit-before-json"]')).toBeVisible();
  await expect(page.locator('[data-testid="audit-after-json"]')).toBeVisible();

  // Fermer
  await page.click('[data-testid="audit-detail-close"]');
  await expect(page.locator('[data-testid="audit-detail-dialog"]')).not.toBeVisible();
});
```

---

## Scénario 6 : Pagination audit

```typescript
test('audit → pagination', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/audit');

  const nextBtn = page.locator('[data-testid="audit-pagination-next"]');
  if (await nextBtn.isVisible()) {
    await nextBtn.click();
    await expect(page.locator('[data-testid="audit-page-indicator"]'))
      .toContainText('2');
  }
});
```
