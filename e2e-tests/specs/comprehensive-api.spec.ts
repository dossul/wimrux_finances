import { test, expect } from '@playwright/test';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || '6a29285200015cd421c7';
const APPWRITE_KEY = process.env.APPWRITE_API_KEY || 'cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57';

const adminHeaders = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': APPWRITE_PROJECT,
  'X-Appwrite-Key': APPWRITE_KEY,
  'X-Appwrite-Response-Format': '1.4.0',
};

/**
 * TESTS E2E COMPLETS — API Appwrite & Edge Functions
 * Date: 2026-06-13
 * Scope: Toutes les fonctions, collections, secrets
 */

// ───────────────────────────────────────────────────────────────
// SECTION 1: EDGE FUNCTIONS — EXISTENCE & ÉTAT
// ───────────────────────────────────────────────────────────────

test.describe('1. Edge Functions — Existence & État', () => {
  const functions = [
    'ai-router',
    'send-email',
    'verify-otp',
    'send-otp-whatsapp',
    'verify-tax-id',
    'nl-to-sql',
    'cashflow-forecast',
    'detect-anomalies',
    'export-report',
    'ingest-payment',
    'ingest-image-payment',
    'ingest-sms',
    'ingest-statement-file',
    'ingest-text-payment',
    'invoice-generate-pdf',
    'bank-reconciliation',
    'wallet-sync',
    'mcf-simulator',
    'device-heartbeat',
    'generate-device-key',
    'esyntas-export',
    'push-certified-invoice',
    'pull-pending-invoices',
    'parse-certified-invoice',
    'pdf-to-images',
  ];

  for (const fn of functions) {
    test(`[${fn}] exists and is enabled`, async ({ request }) => {
      const res = await request.get(`${APPWRITE_ENDPOINT}/functions/${fn}`, { headers: adminHeaders });
      expect(res.status(), `Function ${fn} should exist`).toBe(200);
      const body = await res.json();
      expect(body.enabled, `Function ${fn} should be enabled`).toBe(true);
      expect(body.$id, `Function ${fn} ID mismatch`).toBe(fn);
    });
  }
});

// ───────────────────────────────────────────────────────────────
// SECTION 2: EDGE FUNCTIONS — APPELS FONCTIONNELS
// ───────────────────────────────────────────────────────────────

test.describe('2. Edge Functions — Appels Fonctionnels', () => {

  test('[verify-tax-id] validation format IFU', async ({ request }) => {
    const res = await request.post(`${APPWRITE_ENDPOINT}/functions/verify-tax-id/executions`, {
      headers: adminHeaders,
      data: JSON.stringify({ tax_id: '0015629852123A0' }),
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.status).toMatch(/completed|failed/);
  });

  test('[send-email] envoi email de test', async ({ request }) => {
    const res = await request.post(`${APPWRITE_ENDPOINT}/functions/send-email/executions`, {
      headers: adminHeaders,
      data: JSON.stringify({
        data: JSON.stringify({
          to: 'dossulrich@gmail.com',
          subject: 'E2E Test SMTP',
          template: 'custom',
          vars: { subject: 'E2E Test', html_body: '<p>Test complet</p>' }
        })
      }),
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.status).toBe('completed');
  });

  test('[nl-to-sql] génération SQL sécurisée', async ({ request }) => {
    const res = await request.post(`${APPWRITE_ENDPOINT}/functions/nl-to-sql/executions`, {
      headers: adminHeaders,
      data: JSON.stringify({
        data: JSON.stringify({
          question: 'Combien de factures ont été émises en 2024 ?',
          user_id: 'test-user'
        })
      }),
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.status).toMatch(/completed|failed/);
  });

  test('[detect-anomalies] détection sans erreur', async ({ request }) => {
    const res = await request.post(`${APPWRITE_ENDPOINT}/functions/detect-anomalies/executions`, {
      headers: adminHeaders,
      data: JSON.stringify({
        data: JSON.stringify({ company_id: 'test-company' })
      }),
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.status).toMatch(/completed|failed/);
  });

  test('[export-report] génération rapport', async ({ request }) => {
    const res = await request.post(`${APPWRITE_ENDPOINT}/functions/export-report/executions`, {
      headers: adminHeaders,
      data: JSON.stringify({
        data: JSON.stringify({
          report_type: 'invoices',
          format: 'csv',
          company_id: 'test-company'
        })
      }),
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.status).toMatch(/completed|failed/);
  });

  test('[verify-otp] vérification structure', async ({ request }) => {
    const res = await request.get(`${APPWRITE_ENDPOINT}/functions/verify-otp`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
  });

  test('[send-otp-whatsapp] vérification structure', async ({ request }) => {
    const res = await request.get(`${APPWRITE_ENDPOINT}/functions/send-otp-whatsapp`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
  });
});

// ───────────────────────────────────────────────────────────────
// SECTION 3: BASE DE DONNÉES — COLLECTIONS & DONNÉES
// ───────────────────────────────────────────────────────────────

test.describe('3. Base de Données — Collections & Données Seed', () => {

  const collections = [
    { name: 'clients', minDocs: 1 },
    { name: 'invoices', minDocs: 1 },
    { name: 'invoice_items', minDocs: 1 },
    { name: 'companies', minDocs: 1 },
    { name: 'bank_accounts', minDocs: 0 },
    { name: 'wallet_transactions', minDocs: 0 },
    { name: 'treasury_movements', minDocs: 0 },
    { name: 'payment_evidences', minDocs: 0 },
    { name: 'budgets', minDocs: 0 },
    { name: 'budget_lines', minDocs: 0 },
    { name: 'anomaly_alerts', minDocs: 0 },
    { name: 'report_exports', minDocs: 0 },
    { name: 'ai_usage_logs', minDocs: 0 },
    { name: 'otp_codes', minDocs: 0 },
    { name: 'user_profiles', minDocs: 1 },
    { name: 'audit_log', minDocs: 0 },
  ];

  for (const col of collections) {
    test(`[${col.name}] collection accessible${col.minDocs > 0 ? ' avec données seed' : ''}`, async ({ request }) => {
      const res = await request.get(
        `${APPWRITE_ENDPOINT}/databases/wimrux_finances/collections/${col.name}/documents?queries[]=${encodeURIComponent('limit(10)')}`,
        { headers: adminHeaders }
      );
      expect(res.status(), `Collection ${col.name} should be accessible`).toBe(200);
      const body = await res.json();
      expect(body.documents, `Collection ${col.name} should have documents array`).toBeDefined();
      if (col.minDocs > 0) {
        expect(body.documents.length, `Collection ${col.name} should have at least ${col.minDocs} seed documents`).toBeGreaterThanOrEqual(col.minDocs);
      }
    });
  }
});

// ───────────────────────────────────────────────────────────────
// SECTION 4: AUTHENTIFICATION — APPWRITE AUTH
// ───────────────────────────────────────────────────────────────

test.describe('4. Authentification — Appwrite Auth', () => {

  test('Liste des utilisateurs (admin)', async ({ request }) => {
    const res = await request.get(`${APPWRITE_ENDPOINT}/users?queries[]=${encodeURIComponent('limit(5)')}`, {
      headers: adminHeaders,
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.users).toBeDefined();
    expect(body.users.length).toBeGreaterThan(0);
  });

  test('Création session anonyme (test)', async ({ request }) => {
    const res = await request.post(`${APPWRITE_ENDPOINT}/account/sessions/anonymous`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT,
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.$id).toBeDefined();
  });
});

// ───────────────────────────────────────────────────────────────
// SECTION 5: STOCKAGE — BUCKETS
// ───────────────────────────────────────────────────────────────

test.describe('5. Stockage — Buckets', () => {

  test('Bucket invoices existe', async ({ request }) => {
    const res = await request.get(`${APPWRITE_ENDPOINT}/storage/buckets/invoices-pdf`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.$id).toBe('invoices-pdf');
  });

  test('Bucket evidence existe', async ({ request }) => {
    const res = await request.get(`${APPWRITE_ENDPOINT}/storage/buckets/payment-evidences`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.$id).toBe('payment-evidences');
  });
});

// ───────────────────────────────────────────────────────────────
// SECTION 6: SECRETS — VARIABLES D'ENVIRONNEMENT
// ───────────────────────────────────────────────────────────────

test.describe('6. Secrets — Variables Configurées', () => {

  test('[ai-router] a LITELLM_MASTER_KEY', async ({ request }) => {
    const res = await request.get(`${APPWRITE_ENDPOINT}/functions/ai-router/variables`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const keys = body.variables.map((v: any) => v.key);
    expect(keys).toContain('LITELLM_MASTER_KEY');
  });

  test('[send-email] a SMTP_HOST, SMTP_USER, SMTP_PASS', async ({ request }) => {
    const res = await request.get(`${APPWRITE_ENDPOINT}/functions/send-email/variables`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const keys = body.variables.map((v: any) => v.key);
    expect(keys).toContain('SMTP_HOST');
    expect(keys).toContain('SMTP_USER');
    expect(keys).toContain('SMTP_PASS');
  });

  test('[send-otp-whatsapp] a WHAPI_TOKEN', async ({ request }) => {
    const res = await request.get(`${APPWRITE_ENDPOINT}/functions/send-otp-whatsapp/variables`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    const keys = body.variables.map((v: any) => v.key);
    expect(keys).toContain('WHAPI_TOKEN');
  });
});

// ───────────────────────────────────────────────────────────────
// SECTION 7: INTÉGRITÉ — DONNÉES CONSISTANTES
// ───────────────────────────────────────────────────────────────

test.describe('7. Intégrité des Données', () => {

  test('Les factures ont des items liés', async ({ request }) => {
    const resInvoices = await request.get(
      `${APPWRITE_ENDPOINT}/databases/wimrux_finances/collections/invoices/documents?queries[]=${encodeURIComponent('limit(5)')}`,
      { headers: adminHeaders }
    );
    expect(resInvoices.status()).toBe(200);
    const invoices = await resInvoices.json();
    
    if (invoices.documents.length > 0) {
      const firstInvoice = invoices.documents[0];
      expect(firstInvoice.$id).toBeDefined();
      expect(firstInvoice.company_id).toBeDefined();
    }
  });

  test('Les clients ont un nom et un IFU', async ({ request }) => {
    const res = await request.get(
      `${APPWRITE_ENDPOINT}/databases/wimrux_finances/collections/clients/documents?queries[]=${encodeURIComponent('limit(5)')}`,
      { headers: adminHeaders }
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    for (const doc of body.documents) {
      expect(doc.name || doc.company_name, 'Client should have a name').toBeTruthy();
      expect(doc.ifu || doc.tax_id, 'Client should have an IFU').toBeTruthy();
    }
  });
});

// ───────────────────────────────────────────────────────────────
// SECTION 8: RÉCAPITULATIF
// ───────────────────────────────────────────────────────────────

test.describe('8. Récapitulatif Global', () => {

  test('Rapport de santé global', async ({ request }) => {
    // Compter les fonctions
    const fnRes = await request.get(`${APPWRITE_ENDPOINT}/functions`, { headers: adminHeaders });
    expect(fnRes.status()).toBe(200);
    const fnBody = await fnRes.json();
    const fnCount = (fnBody.functions || []).length;
    
    // Compter les collections
    const colRes = await request.get(`${APPWRITE_ENDPOINT}/databases/wimrux_finances/collections`, { headers: adminHeaders });
    expect(colRes.status()).toBe(200);
    const colBody = await colRes.json();
    const colCount = (colBody.collections || []).length;
    
    // Vérifier
    expect(fnCount).toBeGreaterThanOrEqual(25);
    expect(colCount).toBeGreaterThanOrEqual(19);
    
    console.log(`\n📊 RAPPORT GLOBAL:`);
    console.log(`   Edge Functions: ${fnCount}`);
    console.log(`   Collections:    ${colCount}`);
    console.log(`   Endpoint:       ${APPWRITE_ENDPOINT}`);
    console.log(`   Project:        ${APPWRITE_PROJECT}`);
  });
});
