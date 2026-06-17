import { Page } from '@playwright/test';
import { SUPPLIER } from '../fixtures/selectors';

function generateId(): string {
  return crypto.randomUUID();
}

export interface SupplierFormData {
  name: string;
  ifu?: string;
  rccm?: string;
  regime: string;
  division: string;
  phone?: string;
  email?: string;
  address?: string;
  bankName?: string;
  bankIban?: string;
  bankBic?: string;
}

export async function fillSupplierForm(page: Page, data: SupplierFormData): Promise<void> {
  await page.fill(SUPPLIER.name, data.name);
  if (data.ifu) await page.fill(SUPPLIER.ifu, data.ifu);
  if (data.rccm) await page.fill(SUPPLIER.rccm, data.rccm);

  await page.locator(`${SUPPLIER.regime} input`).first().click();
  await page.waitForSelector('.q-menu .q-item', { state: 'visible', timeout: 10_000 });
  await page.locator('.q-menu .q-item').filter({ hasText: data.regime }).first().click();

  await page.fill(SUPPLIER.division, data.division);

  if (data.phone) await page.fill(SUPPLIER.phone, data.phone);
  if (data.email) await page.fill(SUPPLIER.email, data.email);
  if (data.address) await page.fill(SUPPLIER.address, data.address);
  if (data.bankName) await page.fill(SUPPLIER.bankName, data.bankName);
  if (data.bankIban) await page.fill(SUPPLIER.bankIban, data.bankIban);
  if (data.bankBic) await page.fill(SUPPLIER.bankBic, data.bankBic);
}

export async function createSupplierViaApi(
  page: Page,
  data: Partial<SupplierFormData> & { name: string; regime: string; division: string }
): Promise<string> {
  const auth = await page.evaluate(async () => {
    const account = (window as any).__appwriteAccount;
    const databases = (window as any).__appwriteDatabases;
    const databaseId = (window as any).__appwriteDatabaseId;
    if (!account || !databases || !databaseId) return null;
    const user = await account.get();
    const response = await databases.listDocuments(databaseId, 'user_profiles', [`equal("user_id","${user.$id}")`]);
    const profile = response.documents[0];
    return { companyId: profile?.company_id as string | undefined };
  });

  if (!auth?.companyId) throw new Error('Impossible de determiner company_id du compte de test');

  const documentId = generateId();
  const payload = {
    id: documentId,
    company_id: auth.companyId,
    name: data.name,
    ifu: data.ifu || null,
    rccm: data.rccm || null,
    regime_fiscal: data.regime,
    division_fiscale: data.division,
    phone: data.phone || null,
    email: data.email || null,
    address: data.address || null,
    bank_name: data.bankName || null,
    bank_iban: data.bankIban || null,
    bank_bic: data.bankBic || null,
    is_active: true,
    country: 'BF',
    payment_terms_days: 30,
  };

  return page.evaluate(async (args) => {
    const databases = (window as any).__appwriteDatabases;
    const databaseId = (window as any).__appwriteDatabaseId;
    const { documentId, data } = args;
    const response = await databases.createDocument(databaseId, 'suppliers', documentId, data);
    return response.$id as string;
  }, { documentId, data: payload });
}
