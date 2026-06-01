# 08 — Tests E2E : Intelligence Artificielle

> Tests Assistant IA, Chat IA, OCR factures fournisseurs, OCR relevés bancaires, Chatbot, Anomalies.

---

## Contexte

- **Pages** : `AiAssistantPage.vue`, `AiAskPage.vue`, `AdminAiUsagePage.vue`, `AdminChatbotPage.vue`
- **Composables** : `useAiAssistant.ts`, `useAiChat.ts`, `useAiSettings.ts`, `useAiUsage.ts`, `useAnomalyDetection.ts`, `useBankStatementOcr.ts`, `useSupplierInvoiceOcr.ts`, `useChatbotConfig.ts`, `useChatbotSkill.ts`
- **Edge functions** : `chatbot-gateway` (si déployée)
- **Routes** : `/app/ai-assistant`, `/app/ai/ask`, `/app/admin/ai-usage`, `/app/admin/chatbot`

---

## Scénario 1 : Assistant IA — poser une question

```typescript
test('assistant IA → question → réponse cohérente', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/ai-assistant');

  // Saisir question
  await page.fill('[data-testid="ai-input"]', 'Quel est le total de mes factures ce mois?');
  await page.click('[data-testid="ai-send-btn"]');

  // Attendre réponse (peut être long, timeout 30s)
  await page.waitForSelector('[data-testid="ai-response"]', { timeout: 30000 });

  // Vérifier que la réponse n'est pas vide
  const response = await page.locator('[data-testid="ai-response"]').textContent();
  expect(response?.length).toBeGreaterThan(10);
});
```

---

## Scénario 2 : Assistant IA — suggestions

```typescript
test('assistant IA → clic suggestion pré-configurée', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/ai-assistant');

  // Cliquer une suggestion
  await page.click('[data-testid="ai-suggestion-0"]');
  await page.waitForSelector('[data-testid="ai-response"]', { timeout: 30000 });

  const response = await page.locator('[data-testid="ai-response"]').textContent();
  expect(response).toBeTruthy();
});
```

---

## Scénario 3 : AI Ask Page

```typescript
test('AI Ask → conversation multi-tours', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/ai/ask');

  // Message 1
  await page.fill('[data-testid="ai-chat-input"]', 'Liste mes clients');
  await page.click('[data-testid="ai-chat-send"]');
  await page.waitForSelector('[data-testid="ai-message-assistant"]', { timeout: 30000 });

  // Message 2 (contexte conservé)
  await page.fill('[data-testid="ai-chat-input"]', 'Et combien de factures pour le premier?');
  await page.click('[data-testid="ai-chat-send"]');
  await page.waitForSelector('[data-testid="ai-message-assistant"]:nth-of-type(4)', { timeout: 30000 });
});
```

---

## Scénario 4 : OCR Facture fournisseur (SupplierInvoiceOcr)

```typescript
test('OCR facture fournisseur → extraction données', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/invoices/received');

  // Nouvelle facture reçue
  await page.click('[data-testid="received-invoice-new-btn"]');

  // Upload image/PDF
  const input = page.locator('input[type="file"]');
  await input.setInputFiles('fixtures/test-supplier-invoice.pdf');

  // Attendre OCR
  await page.waitForSelector('[data-testid="ocr-result"]', { timeout: 20000 });

  // Vérifier champs extraits
  const amount = await page.inputValue('[data-testid="ocr-amount"]');
  expect(parseInt(amount)).toBeGreaterThan(0);

  const supplier = await page.inputValue('[data-testid="ocr-supplier"]');
  expect(supplier.length).toBeGreaterThan(0);
});
```

---

## Scénario 5 : OCR Relevé bancaire (BankStatementOcr)

```typescript
test('OCR relevé bancaire → extraction transactions', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/banking');

  // Sélectionner compte
  await page.click('text=Compte BOA TEST');
  await page.click('[data-testid="import-statement-btn"]');

  // Upload relevé
  const input = page.locator('input[type="file"]');
  await input.setInputFiles('fixtures/test-bank-statement.pdf');

  // Attendre extraction
  await page.waitForSelector('[data-testid="ocr-transactions-list"]', { timeout: 20000 });

  // Vérifier transactions extraites
  const transactions = page.locator('[data-testid="ocr-transaction-row"]');
  await expect(transactions).toHaveCount.greaterThan(0);

  // Vérifier colonnes
  await expect(page.locator('[data-testid="ocr-date-header"]')).toBeVisible();
  await expect(page.locator('[data-testid="ocr-amount-header"]')).toBeVisible();
  await expect(page.locator('[data-testid="ocr-description-header"]')).toBeVisible();
});
```

---

## Scénario 6 : Anomalies de détection IA

```typescript
test('anomalies IA → liste détectée', async ({ page }) => {
  await login(page, 'adminIltic');
  await page.goto('/app/ai-assistant');  // ou page dédiée anomalies

  // Naviguer vers anomalies si onglet séparé
  if (await page.isVisible('[data-testid="nav-anomalies"]')) {
    await page.click('[data-testid="nav-anomalies"]');
  }

  await expect(page.locator('[data-testid="anomalies-table"]')).toBeVisible();
});
```

---

## Scénario 7 : Chatbot Admin — configurer

```typescript
test('chatbot admin → activer + configurer', async ({ page }) => {
  await login(page, 'superAdmin');
  await page.goto('/app/admin/chatbot');

  // Activer chatbot
  const toggle = page.locator('[data-testid="chatbot-enabled-toggle"]');
  if (!(await toggle.isChecked())) {
    await toggle.click();
  }

  // Sauvegarder
  await page.click('[data-testid="chatbot-save-btn"]');
  await waitForToast(page, 'enregistré');
});
```

---

## Scénario 8 : Chatbot — créer clé API

```typescript
test('chatbot → créer clé API', async ({ page }) => {
  await login(page, 'superAdmin');
  await page.goto('/app/admin/chatbot');

  await page.click('[data-testid="chatbot-new-key-btn"]');
  await page.fill('[data-testid="chatbot-key-name"]', 'Test WhatsApp');
  await page.selectOption('[data-testid="chatbot-key-channel"]', 'whatsapp');
  await page.click('[data-testid="chatbot-key-save-btn"]');
  await waitForToast(page, 'clé créée');

  // Vérifier clé affichée
  await expect(page.locator('text=Test WhatsApp')).toBeVisible();
});
```

---

## Scénario 9 : Chatbot — permissions

```typescript
test('chatbot → définir permissions clé API', async ({ page }) => {
  await login(page, 'superAdmin');
  await page.goto('/app/admin/chatbot');

  // Ouvrir permissions
  await page.click('[data-testid="chatbot-key-permissions-btn"]');

  // Activer permissions
  await page.click('[data-testid="perm-view-invoices"]');
  await page.click('[data-testid="perm-view-clients"]');
  await page.click('[data-testid="perm-save"]');
  await waitForToast(page, 'permissions');
});
```

---

## Scénario 10 : Chatbot — tester endpoint (cURL équivalent)

```typescript
test('chatbot endpoint → test via UI', async ({ page }) => {
  await login(page, 'superAdmin');
  await page.goto('/app/admin/chatbot');

  // Cliquer tester
  await page.click('[data-testid="chatbot-test-btn"]');
  await page.fill('[data-testid="chatbot-test-message"]', 'Liste mes factures');
  await page.click('[data-testid="chatbot-test-send"]');

  // Attendre réponse
  await page.waitForSelector('[data-testid="chatbot-test-response"]', { timeout: 15000 });
  const response = await page.locator('[data-testid="chatbot-test-response"]').textContent();
  expect(response).toContain('facture');
});
```

---

## Scénario 11 : Suivi consommation IA (Admin)

```typescript
test('suivi IA admin → crédits et usage', async ({ page }) => {
  await login(page, 'superAdmin');
  await page.goto('/app/admin/ai-usage');

  await expect(page.locator('[data-testid="ai-usage-chart"]')).toBeVisible();
  await expect(page.locator('[data-testid="ai-credits-remaining"]')).toBeVisible();
});
```

---

## Scénario 12 : Acheter crédits IA

```typescript
test('acheter crédits IA → checkout Stripe', async ({ page }) => {
  await login(page, 'superAdmin');
  await page.goto('/app/settings/ai/credits');

  await page.click('[data-testid="credits-buy-100-btn"]');

  // Vérifier redirection Stripe (ou modal)
  await expect(page.locator('[data-testid="stripe-checkout"]')).toBeVisible();
});
```

---

## Scénario 13 : Configurer fournisseur IA

```typescript
test('fournisseurs IA → sélectionner modèle', async ({ page }) => {
  await login(page, 'superAdmin');
  await page.goto('/app/settings/ai/providers');

  await page.selectOption('[data-testid="ai-provider-select"]', 'openrouter');
  await page.fill('[data-testid="ai-api-key"]', 'sk-test-key');
  await page.click('[data-testid="ai-provider-save-btn"]');
  await waitForToast(page, 'enregistré');
});
```

---

## Scénario 14 : Routage IA

```typescript
test('routage IA → configurer règles', async ({ page }) => {
  await login(page, 'superAdmin');
  await page.goto('/app/settings/ai/routing');

  await page.click('[data-testid="routing-new-rule-btn"]');
  await page.fill('[data-testid="routing-pattern"]', 'facture*');
  await page.selectOption('[data-testid="routing-target"]', 'invoice-agent');
  await page.click('[data-testid="routing-save-btn"]');
  await waitForToast(page, 'enregistré');
});
```
