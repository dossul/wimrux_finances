import { Page } from '@playwright/test';
import { BANKING } from '../fixtures/selectors';

function generateId(): string {
  return crypto.randomUUID();
}

export interface BankAccountFormData {
  bankName: string;
  accountNumber: string;
  iban?: string;
  bic?: string;
  holder?: string;
  currency?: string;
  openingBalance?: number;
}

export async function fillBankAccountForm(page: Page, data: BankAccountFormData): Promise<void> {
  await page.fill(BANKING.accountBankName, data.bankName);
  await page.fill(BANKING.accountNumber, data.accountNumber);
  if (data.iban) await page.fill(BANKING.accountIban, data.iban);
  if (data.bic) await page.fill(BANKING.accountBic, data.bic);
  if (data.holder) await page.fill(BANKING.accountHolder, data.holder);
  if (data.currency && data.currency !== 'XOF') {
    await page.locator(`${BANKING.accountCurrency} input`).first().click();
    await page.waitForSelector('.q-menu .q-item', { state: 'visible', timeout: 10_000 });
    await page.locator('.q-menu .q-item').filter({ hasText: data.currency }).first().click();
  }
  if (data.openingBalance !== undefined) {
    await page.fill(BANKING.accountOpeningBalance, String(data.openingBalance));
  }
}

export async function createBankAccountViaApi(
  page: Page,
  data: BankAccountFormData
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
    bank_name: data.bankName,
    bank_code: null,
    account_number: data.accountNumber,
    iban: data.iban || null,
    bic: data.bic || null,
    account_holder: data.holder || null,
    currency: data.currency || 'XOF',
    opening_balance: data.openingBalance ?? 0,
    current_balance: data.openingBalance ?? 0,
    is_active: true,
    treasury_account_id: null,
  };

  return page.evaluate(async (args) => {
    const databases = (window as any).__appwriteDatabases;
    const databaseId = (window as any).__appwriteDatabaseId;
    const { documentId, data } = args;
    const response = await databases.createDocument(databaseId, 'bank_accounts', documentId, data);
    return response.$id as string;
  }, { documentId, data: payload });
}

export async function createWireTransferViaApi(
  page: Page,
  data: {
    sourceBankAccountId: string;
    beneficiaryName: string;
    amount: number;
    currency?: string;
    beneficiaryIban?: string;
    beneficiaryBic?: string;
    beneficiaryBank?: string;
    motif?: string;
    scheduledDate?: string;
  }
): Promise<string> {
  const auth = await page.evaluate(async () => {
    const account = (window as any).__appwriteAccount;
    const databases = (window as any).__appwriteDatabases;
    const databaseId = (window as any).__appwriteDatabaseId;
    if (!account || !databases || !databaseId) return null;
    const user = await account.get();
    const response = await databases.listDocuments(databaseId, 'user_profiles', [`equal("user_id","${user.$id}")`]);
    const profile = response.documents[0];
    return { companyId: profile?.company_id as string | undefined, userId: user.$id as string };
  });

  if (!auth?.companyId) throw new Error('Impossible de determiner company_id du compte de test');

  const documentId = generateId();
  const now = new Date().toISOString();
  const payload = {
    id: documentId,
    company_id: auth.companyId,
    reference: `VIR-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`,
    source_bank_account_id: data.sourceBankAccountId,
    bank_account_id: data.sourceBankAccountId,
    beneficiary_name: data.beneficiaryName,
    beneficiary_iban: data.beneficiaryIban || null,
    beneficiary_bic: data.beneficiaryBic || null,
    beneficiary_bank: data.beneficiaryBank || null,
    amount: data.amount,
    currency: data.currency || 'XOF',
    motif: data.motif || null,
    scheduled_date: data.scheduledDate || now.slice(0, 10),
    status: 'draft',
    created_by: auth.userId,
    invoice_id: null,
  };

  return page.evaluate(async (args) => {
    const databases = (window as any).__appwriteDatabases;
    const databaseId = (window as any).__appwriteDatabaseId;
    const { documentId, data } = args;
    const response = await databases.createDocument(databaseId, 'wire_transfers', documentId, data);
    return response.$id as string;
  }, { documentId, data: payload });
}
