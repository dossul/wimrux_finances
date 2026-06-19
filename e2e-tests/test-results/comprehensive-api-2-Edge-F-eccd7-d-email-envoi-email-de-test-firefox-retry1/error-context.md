# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: comprehensive-api.spec.ts >> 2. Edge Functions — Appels Fonctionnels >> [send-email] envoi email de test
- Location: specs\comprehensive-api.spec.ts:80:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "completed"
Received: "failed"
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.benga.live/v1';
  4   | const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || '6a29285200015cd421c7';
  5   | const APPWRITE_KEY = process.env.APPWRITE_API_KEY || 'cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57';
  6   | 
  7   | const adminHeaders = {
  8   |   'Content-Type': 'application/json',
  9   |   'X-Appwrite-Project': APPWRITE_PROJECT,
  10  |   'X-Appwrite-Key': APPWRITE_KEY,
  11  |   'X-Appwrite-Response-Format': '1.4.0',
  12  | };
  13  | 
  14  | /**
  15  |  * TESTS E2E COMPLETS — API Appwrite & Edge Functions
  16  |  * Date: 2026-06-13
  17  |  * Scope: Toutes les fonctions, collections, secrets
  18  |  */
  19  | 
  20  | // ───────────────────────────────────────────────────────────────
  21  | // SECTION 1: EDGE FUNCTIONS — EXISTENCE & ÉTAT
  22  | // ───────────────────────────────────────────────────────────────
  23  | 
  24  | test.describe('1. Edge Functions — Existence & État', () => {
  25  |   const functions = [
  26  |     'ai-router',
  27  |     'send-email',
  28  |     'verify-otp',
  29  |     'send-otp-whatsapp',
  30  |     'verify-tax-id',
  31  |     'nl-to-sql',
  32  |     'cashflow-forecast',
  33  |     'detect-anomalies',
  34  |     'export-report',
  35  |     'ingest-payment',
  36  |     'ingest-image-payment',
  37  |     'ingest-sms',
  38  |     'ingest-statement-file',
  39  |     'ingest-text-payment',
  40  |     'invoice-generate-pdf',
  41  |     'bank-reconciliation',
  42  |     'wallet-sync',
  43  |     'mcf-simulator',
  44  |     'device-heartbeat',
  45  |     'generate-device-key',
  46  |     'esyntas-export',
  47  |     'push-certified-invoice',
  48  |     'pull-pending-invoices',
  49  |     'parse-certified-invoice',
  50  |     'pdf-to-images',
  51  |   ];
  52  | 
  53  |   for (const fn of functions) {
  54  |     test(`[${fn}] exists and is enabled`, async ({ request }) => {
  55  |       const res = await request.get(`${APPWRITE_ENDPOINT}/functions/${fn}`, { headers: adminHeaders });
  56  |       expect(res.status(), `Function ${fn} should exist`).toBe(200);
  57  |       const body = await res.json();
  58  |       expect(body.enabled, `Function ${fn} should be enabled`).toBe(true);
  59  |       expect(body.$id, `Function ${fn} ID mismatch`).toBe(fn);
  60  |     });
  61  |   }
  62  | });
  63  | 
  64  | // ───────────────────────────────────────────────────────────────
  65  | // SECTION 2: EDGE FUNCTIONS — APPELS FONCTIONNELS
  66  | // ───────────────────────────────────────────────────────────────
  67  | 
  68  | test.describe('2. Edge Functions — Appels Fonctionnels', () => {
  69  | 
  70  |   test('[verify-tax-id] validation format IFU', async ({ request }) => {
  71  |     const res = await request.post(`${APPWRITE_ENDPOINT}/functions/verify-tax-id/executions`, {
  72  |       headers: adminHeaders,
  73  |       data: JSON.stringify({ tax_id: '0015629852123A0' }),
  74  |     });
  75  |     expect(res.status()).toBe(201);
  76  |     const body = await res.json();
  77  |     expect(body.status).toMatch(/completed|failed/);
  78  |   });
  79  | 
  80  |   test('[send-email] envoi email de test', async ({ request }) => {
  81  |     const res = await request.post(`${APPWRITE_ENDPOINT}/functions/send-email/executions`, {
  82  |       headers: adminHeaders,
  83  |       data: JSON.stringify({
  84  |         data: JSON.stringify({
  85  |           to: 'dossulrich@gmail.com',
  86  |           subject: 'E2E Test SMTP',
  87  |           template: 'custom',
  88  |           vars: { subject: 'E2E Test', html_body: '<p>Test complet</p>' }
  89  |         })
  90  |       }),
  91  |     });
  92  |     expect(res.status()).toBe(201);
  93  |     const body = await res.json();
> 94  |     expect(body.status).toBe('completed');
      |                         ^ Error: expect(received).toBe(expected) // Object.is equality
  95  |   });
  96  | 
  97  |   test('[nl-to-sql] génération SQL sécurisée', async ({ request }) => {
  98  |     const res = await request.post(`${APPWRITE_ENDPOINT}/functions/nl-to-sql/executions`, {
  99  |       headers: adminHeaders,
  100 |       data: JSON.stringify({
  101 |         data: JSON.stringify({
  102 |           question: 'Combien de factures ont été émises en 2024 ?',
  103 |           user_id: 'test-user'
  104 |         })
  105 |       }),
  106 |     });
  107 |     expect(res.status()).toBe(201);
  108 |     const body = await res.json();
  109 |     expect(body.status).toMatch(/completed|failed/);
  110 |   });
  111 | 
  112 |   test('[detect-anomalies] détection sans erreur', async ({ request }) => {
  113 |     const res = await request.post(`${APPWRITE_ENDPOINT}/functions/detect-anomalies/executions`, {
  114 |       headers: adminHeaders,
  115 |       data: JSON.stringify({
  116 |         data: JSON.stringify({ company_id: 'test-company' })
  117 |       }),
  118 |     });
  119 |     expect(res.status()).toBe(201);
  120 |     const body = await res.json();
  121 |     expect(body.status).toMatch(/completed|failed/);
  122 |   });
  123 | 
  124 |   test('[export-report] génération rapport', async ({ request }) => {
  125 |     const res = await request.post(`${APPWRITE_ENDPOINT}/functions/export-report/executions`, {
  126 |       headers: adminHeaders,
  127 |       data: JSON.stringify({
  128 |         data: JSON.stringify({
  129 |           report_type: 'invoices',
  130 |           format: 'csv',
  131 |           company_id: 'test-company'
  132 |         })
  133 |       }),
  134 |     });
  135 |     expect(res.status()).toBe(201);
  136 |     const body = await res.json();
  137 |     expect(body.status).toMatch(/completed|failed/);
  138 |   });
  139 | 
  140 |   test('[verify-otp] vérification structure', async ({ request }) => {
  141 |     const res = await request.get(`${APPWRITE_ENDPOINT}/functions/verify-otp`, { headers: adminHeaders });
  142 |     expect(res.status()).toBe(200);
  143 |     const body = await res.json();
  144 |     expect(body.enabled).toBe(true);
  145 |   });
  146 | 
  147 |   test('[send-otp-whatsapp] vérification structure', async ({ request }) => {
  148 |     const res = await request.get(`${APPWRITE_ENDPOINT}/functions/send-otp-whatsapp`, { headers: adminHeaders });
  149 |     expect(res.status()).toBe(200);
  150 |     const body = await res.json();
  151 |     expect(body.enabled).toBe(true);
  152 |   });
  153 | });
  154 | 
  155 | // ───────────────────────────────────────────────────────────────
  156 | // SECTION 3: BASE DE DONNÉES — COLLECTIONS & DONNÉES
  157 | // ───────────────────────────────────────────────────────────────
  158 | 
  159 | test.describe('3. Base de Données — Collections & Données Seed', () => {
  160 | 
  161 |   const collections = [
  162 |     { name: 'clients', minDocs: 1 },
  163 |     { name: 'invoices', minDocs: 1 },
  164 |     { name: 'invoice_items', minDocs: 1 },
  165 |     { name: 'companies', minDocs: 1 },
  166 |     { name: 'bank_accounts', minDocs: 0 },
  167 |     { name: 'wallet_transactions', minDocs: 0 },
  168 |     { name: 'treasury_movements', minDocs: 0 },
  169 |     { name: 'payment_evidences', minDocs: 0 },
  170 |     { name: 'budgets', minDocs: 0 },
  171 |     { name: 'budget_lines', minDocs: 0 },
  172 |     { name: 'anomaly_alerts', minDocs: 0 },
  173 |     { name: 'report_exports', minDocs: 0 },
  174 |     { name: 'ai_usage_logs', minDocs: 0 },
  175 |     { name: 'otp_codes', minDocs: 0 },
  176 |     { name: 'user_profiles', minDocs: 1 },
  177 |     { name: 'audit_log', minDocs: 0 },
  178 |   ];
  179 | 
  180 |   for (const col of collections) {
  181 |     test(`[${col.name}] collection accessible${col.minDocs > 0 ? ' avec données seed' : ''}`, async ({ request }) => {
  182 |       const res = await request.get(
  183 |         `${APPWRITE_ENDPOINT}/databases/wimrux_finances/collections/${col.name}/documents?queries[]=${encodeURIComponent('limit(10)')}`,
  184 |         { headers: adminHeaders }
  185 |       );
  186 |       expect(res.status(), `Collection ${col.name} should be accessible`).toBe(200);
  187 |       const body = await res.json();
  188 |       expect(body.documents, `Collection ${col.name} should have documents array`).toBeDefined();
  189 |       if (col.minDocs > 0) {
  190 |         expect(body.documents.length, `Collection ${col.name} should have at least ${col.minDocs} seed documents`).toBeGreaterThanOrEqual(col.minDocs);
  191 |       }
  192 |     });
  193 |   }
  194 | });
```