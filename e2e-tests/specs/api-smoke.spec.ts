import { test, expect } from '@playwright/test';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || '6a29285200015cd421c7';
const APPWRITE_KEY = process.env.APPWRITE_API_KEY || 'cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57';

/**
 * Smoke tests API — vérifie que les edge functions et collections répondent
 */

test.describe('API Smoke Tests', () => {
  const adminHeaders = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': APPWRITE_PROJECT,
    'X-Appwrite-Key': APPWRITE_KEY,
    'X-Appwrite-Response-Format': '1.4.0',
  };

  test('send-email function exists and is enabled', async ({ request }) => {
    const res = await request.get(`${APPWRITE_ENDPOINT}/functions/send-email`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
  });

  test('verify-otp function exists and is enabled', async ({ request }) => {
    const res = await request.get(`${APPWRITE_ENDPOINT}/functions/verify-otp`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
  });

  test('send-otp-whatsapp function exists and is enabled', async ({ request }) => {
    const res = await request.get(`${APPWRITE_ENDPOINT}/functions/send-otp-whatsapp`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
  });

  test('ai-router function exists and is enabled', async ({ request }) => {
    const res = await request.get(`${APPWRITE_ENDPOINT}/functions/ai-router`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
  });

  test('verify-tax-id function exists and is enabled', async ({ request }) => {
    const res = await request.get(`${APPWRITE_ENDPOINT}/functions/verify-tax-id`, { headers: adminHeaders });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.enabled).toBe(true);
  });

  test('Appwrite database — clients collection has seed data', async ({ request }) => {
    const res = await request.get(
      `${APPWRITE_ENDPOINT}/databases/wimrux_finances/collections/clients/documents?queries[]=${encodeURIComponent('limit(5)')}`,
      { headers: adminHeaders }
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.documents).toBeDefined();
    expect(body.documents.length).toBeGreaterThan(0);
  });

  test('Appwrite database — invoices collection has seed data', async ({ request }) => {
    const res = await request.get(
      `${APPWRITE_ENDPOINT}/databases/wimrux_finances/collections/invoices/documents?queries[]=${encodeURIComponent('limit(5)')}`,
      { headers: adminHeaders }
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.documents).toBeDefined();
    expect(body.documents.length).toBeGreaterThan(0);
  });
});
