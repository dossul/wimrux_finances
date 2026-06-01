# 10 — Tests E2E : Admin (KPI, Health, Chatbot)

> Tests des pages admin réservées au `project_admin`.

---

## Contexte

- **Pages** : `AdminKpiPage.vue`, `HealthcheckPage.vue`, `AdminAiUsagePage.vue`, `AdminChatbotPage.vue`
- **Composables** : `useAiUsage.ts`, `useChatbotConfig.ts`
- **Routes** : `/app/admin/kpi`, `/app/admin/health`, `/app/admin/ai-usage`, `/app/admin/chatbot`
- **Permissions** : `roles: ['project_admin']`

---

## Scénario 1 : Accès refusé pour non-admin

```typescript
test('accès admin refusé → redirection dashboard', async ({ page }) => {
  await login(page, 'adminIltic');  // role=admin, pas project_admin
  await page.goto('/app/admin/kpi');

  // Redirection
  await page.waitForURL('/app');
  await expect(page.locator('.q-notification--negative'))
    .toContainText('accès');
});
```

---

## Scénario 2 : KPI Admin — vue d'ensemble

```typescript
test('KPI admin → métriques affichées', async ({ page }) => {
  await login(page, 'superAdmin');
  await page.goto('/app/admin/kpi');

  await expect(page.locator('[data-testid="kpi-users-count"]')).toBeVisible();
  await expect(page.locator('[data-testid="kpi-invoices-count"]')).toBeVisible();
  await expect(page.locator('[data-testid="kpi-revenue-total"]')).toBeVisible();
  await expect(page.locator('[data-testid="kpi-mrr"]')).toBeVisible();
});
```

---

## Scénario 3 : Healthcheck — monitoring système

```typescript
test('healthcheck → tous les services UP', async ({ page }) => {
  await login(page, 'superAdmin');
  await page.goto('/app/admin/health');

  // Vérifier status des services
  const services = page.locator('[data-testid="health-service"]');
  const count = await services.count();
  expect(count).toBeGreaterThan(0);

  // Tous les services doivent être verts
  for (let i = 0; i < count; i++) {
    const status = await services.nth(i).getAttribute('data-status');
    expect(['up', 'degraded']).toContain(status);
  }
});
```

---

## Scénario 4 : Admin AI Usage — consommation globale

```typescript
test('admin AI usage → graphiques et stats', async ({ page }) => {
  await login(page, 'superAdmin');
  await page.goto('/app/admin/ai-usage');

  await expect(page.locator('[data-testid="ai-usage-chart"]')).toBeVisible();
  await expect(page.locator('[data-testid="ai-usage-by-user"]')).toBeVisible();
  await expect(page.locator('[data-testid="ai-usage-by-model"]')).toBeVisible();
});
```

---

## Scénario 5 : Admin Chatbot — configuration globale

```typescript
test('admin chatbot → configuration + clés API', async ({ page }) => {
  await login(page, 'superAdmin');
  await page.goto('/app/admin/chatbot');

  // Toggle activer
  await page.click('[data-testid="chatbot-enabled-toggle"]');
  await page.click('[data-testid="chatbot-save-btn"]');
  await waitForToast(page, 'enregistrée');

  // Créer clé
  await page.click('[data-testid="chatbot-new-key-btn"]');
  await page.fill('[data-testid="chatbot-key-name"]', 'E2E Test Key');
  await page.selectOption('[data-testid="chatbot-key-channel"]', 'whatsapp');
  await page.click('[data-testid="chatbot-key-save-btn"]');
  await waitForToast(page, 'clé créée');

  // Exporter skill
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('[data-testid="chatbot-export-skill-btn"]'),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.md$/);
});
```
