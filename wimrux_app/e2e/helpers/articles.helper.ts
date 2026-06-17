import { Page } from '@playwright/test';
import { ARTICLE } from '../fixtures/selectors';

function generateId(): string {
  return crypto.randomUUID();
}

export interface ArticleFormData {
  code: string;
  name: string;
  type?: string;
  taxGroup?: string;
  unitPrice?: number;
  specificTax?: number;
}

export async function fillArticleForm(page: Page, data: ArticleFormData): Promise<void> {
  await page.fill(ARTICLE.code, data.code);
  await page.fill(ARTICLE.name, data.name);

  if (data.type) {
    await page.locator(`${ARTICLE.type} input`).first().click();
    await page.waitForSelector('.q-menu .q-item', { state: 'visible', timeout: 10_000 });
    await page.locator('.q-menu .q-item').filter({ hasText: data.type }).first().click();
  }

  if (data.taxGroup) {
    await page.locator(`${ARTICLE.taxGroup} input`).first().click();
    await page.waitForSelector('.q-menu .q-item', { state: 'visible', timeout: 10_000 });
    await page.locator('.q-menu .q-item').filter({ hasText: `Groupe ${data.taxGroup}` }).first().click();
  }

  if (data.unitPrice !== undefined) {
    await page.fill(ARTICLE.unitPrice, String(data.unitPrice));
  }
}

export async function createArticleViaApi(
  page: Page,
  data: ArticleFormData
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
    code: data.code,
    name: data.name,
    type: data.type || 'LOCBIE',
    tax_group: data.taxGroup || 'B',
    unit_price: data.unitPrice ?? 0,
    specific_tax: data.specificTax ?? 0,
    is_active: true,
  };

  return page.evaluate(async (args) => {
    const databases = (window as any).__appwriteDatabases;
    const databaseId = (window as any).__appwriteDatabaseId;
    const { documentId, data } = args;
    const response = await databases.createDocument(databaseId, 'articles', documentId, data);
    return response.$id as string;
  }, { documentId, data: payload });
}
