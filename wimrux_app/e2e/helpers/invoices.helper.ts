import { Page } from '@playwright/test';

function generateId(): string {
  return crypto.randomUUID();
}

async function getAuthContext(page: Page): Promise<{ userId: string; companyId: string; fullName: string } | null> {
  return page.evaluate(async () => {
    const account = (window as any).__appwriteAccount;
    const databases = (window as any).__appwriteDatabases;
    const databaseId = (window as any).__appwriteDatabaseId;
    if (!account || !databases || !databaseId) return null;

    try {
      const user = await account.get();
      const response = await databases.listDocuments(
        databaseId,
        'user_profiles',
        [`equal("user_id","${user.$id}")`]
      );
      const profile = response.documents[0];
      const companyId = profile?.company_id as string | undefined;
      const fullName = profile?.full_name as string | undefined;
      if (!companyId) return null;
      return { userId: user.$id as string, companyId, fullName: fullName || 'Test E2E' };
    } catch {
      return null;
    }
  });
}

export async function createInvoiceViaApi(
  page: Page,
  type: 'FV' | 'FA' | 'FT' | 'EV' | 'ET' | 'EA' | 'PF',
  options: { clientId?: string; description?: string; status?: string; totalTtc?: number } = {}
): Promise<string> {
  const auth = await getAuthContext(page);
  if (!auth) {
    throw new Error('Impossible de determiner company_id du compte de test');
  }

  const { companyId, fullName } = auth;
  const documentId = generateId();
  const reference = `E2E-TEST-${type}-${Date.now()}`;
  const nowIso = new Date().toISOString();

  if (options.status === 'certified') {
    throw new Error('createInvoiceViaApi ne peut pas creer de facture certifiee : utiliser le workflow UI ou un helper dedie');
  }

  const payload: Record<string, unknown> = {
    id: documentId,
    company_id: companyId,
    type,
    reference,
    status: options.status || 'draft',
    price_mode: 'TTC',
    description: options.description || `Brouillon E2E (${reference})`,
    created_at: nowIso,
    updated_at: nowIso,
    client_id: options.clientId || null,
    operator_name: fullName,
    comments: JSON.stringify([{ label: '', content: '' }]),
    total_ht: 0,
    total_tva: 0,
    total_psvb: 0,
    total_ttc: options.totalTtc ?? 0,
    stamp_duty: 0,
    total_payment: 0,
  };

  return page.evaluate(async (args) => {
    const databases = (window as any).__appwriteDatabases;
    const databaseId = (window as any).__appwriteDatabaseId;
    const { documentId, data } = args;

    const response = await databases.createDocument(
      databaseId,
      'invoices',
      documentId,
      data
    );
    return response.$id as string;
  }, { documentId, data: payload });
}

export async function createInvoiceWithItemsViaApi(
  page: Page,
  type: 'FV' | 'FA' | 'FT' | 'EV' | 'ET' | 'EA' | 'PF',
  options: {
    clientId?: string | undefined;
    description?: string | undefined;
    items?: { designation: string; qty: number; priceHt: number; taxGroup: string }[] | undefined;
  } = {}
): Promise<string> {
  const auth = await getAuthContext(page);
  if (!auth) throw new Error('Impossible de determiner company_id du compte de test');

  const { companyId, fullName } = auth;
  const documentId = generateId();
  const reference = `E2E-TEST-${type}-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const items = options.items ?? [];
  let total_ht = 0;
  let total_tva = 0;
  let total_ttc = 0;
  let total_psvb = 0;

  for (const item of items) {
    const rate = TAX_RATES[item.taxGroup] ?? { tva: 0 };
    const priceTtc = item.priceHt * item.qty;
    const ht = round2(priceTtc / (1 + rate.tva));
    const tva = round2(ht * rate.tva);
    const psvb = round2(ht * 0.02); // PSVB 2%
    total_ht += ht;
    total_tva += tva;
    total_ttc += priceTtc;
    total_psvb += psvb;
  }

  const invoicePayload: Record<string, unknown> = {
    id: documentId,
    company_id: companyId,
    type,
    reference,
    status: 'draft',
    price_mode: 'TTC',
    description: options.description || `Brouillon E2E (${reference})`,
    created_at: nowIso,
    updated_at: nowIso,
    client_id: options.clientId || null,
    operator_name: fullName,
    comments: JSON.stringify([{ label: '', content: '' }]),
    total_ht: round2(total_ht),
    total_tva: round2(total_tva),
    total_psvb: round2(total_psvb),
    total_ttc: round2(total_ttc),
    stamp_duty: 0,
    total_payment: 0,
  };

  const itemsWithComputed = items.map((item) => {
    const rate = TAX_RATES[item.taxGroup] ?? { tva: 0 };
    const priceTtc = item.priceHt * item.qty;
    const ht = round2(priceTtc / (1 + rate.tva));
    const tva = round2(ht * rate.tva);
    const psvb = round2(ht * 0.02);
    const ttc = round2(ht + tva + psvb);
    return {
      ...item,
      ht,
      tva,
      psvb,
      ttc,
    };
  });

  await page.evaluate(async (args) => {
    const databases = (window as any).__appwriteDatabases;
    const databaseId = (window as any).__appwriteDatabaseId;
    const { documentId, invoice, items } = args;

    await databases.createDocument(databaseId, 'invoices', documentId, invoice);

    const itemPromises = items.map((item: any, idx: number) => {
      const itemId = crypto.randomUUID();
      return databases.createDocument(databaseId, 'invoice_items', itemId, {
        id: itemId,
        invoice_id: documentId,
        company_id: invoice.company_id,
        code: `ART${String(idx + 1).padStart(3, '0')}`,
        name: item.designation,
        type: 'LOCBIE',
        quantity: item.qty,
        price: item.priceHt,
        unit: 'unite',
        tax_group: item.taxGroup,
        specific_tax: 0,
        discount: 0,
        amount_ht: item.ht,
        amount_tva: item.tva,
        amount_psvb: item.psvb,
        amount_ttc: item.ttc,
        sort_order: idx,
      });
    });

    await Promise.all(itemPromises);
    return documentId;
  }, { documentId, invoice: invoicePayload, items: itemsWithComputed });

  return documentId;
}

export async function createCertifiedInvoiceViaApi(
  page: Page,
  type: 'FV' | 'FA' | 'FT' | 'EV' | 'ET' | 'EA' | 'PF',
  options: { clientId?: string; description?: string; totalTtc?: number } = {}
): Promise<string> {
  const auth = await getAuthContext(page);
  if (!auth) throw new Error('Impossible de determiner company_id du compte de test');

  const { companyId, fullName } = auth;
  const documentId = generateId();
  const reference = `E2E-TEST-${type}-${Date.now()}`;
  const nowIso = new Date().toISOString();
  const totalTtc = options.totalTtc ?? 1_500_000;

  const payload: Record<string, unknown> = {
    id: documentId,
    company_id: companyId,
    type,
    reference,
    status: 'certified',
    price_mode: 'TTC',
    description: options.description || `Facture certifiee E2E (${reference})`,
    created_at: nowIso,
    updated_at: nowIso,
    certified_at: nowIso,
    client_id: options.clientId || null,
    operator_name: fullName,
    comments: JSON.stringify([{ label: '', content: '' }]),
    total_ht: round2(totalTtc / 1.18),
    total_tva: round2(totalTtc - totalTtc / 1.18),
    total_psvb: 0,
    total_ttc: totalTtc,
    stamp_duty: 0,
    total_payment: 0,
    mcf_uid: `mcf-e2e-${documentId.slice(0, 8)}`,
    fiscal_number: `FNEC-E2E-${Date.now()}`,
    signature: 'fake-signature-for-e2e-only',
    certification_datetime: nowIso,
    certification_source: 'manual',
  };

  return page.evaluate(async (args) => {
    const databases = (window as any).__appwriteDatabases;
    const databaseId = (window as any).__appwriteDatabaseId;
    const { documentId, data } = args;

    const response = await databases.createDocument(
      databaseId,
      'invoices',
      documentId,
      data
    );
    return response.$id as string;
  }, { documentId, data: payload });
}

export async function navigateToInvoiceEditor(page: Page, invoiceId: string): Promise<void> {
  await page.goto(`/app/invoices/${invoiceId}`);
  await page.waitForURL(`/app/invoices/${invoiceId}`, { timeout: 15_000 });
}

const TAX_RATES: Record<string, { tva: number }> = {
  A: { tva: 0 },
  B: { tva: 0.18 },
  C: { tva: 0.10 },
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
