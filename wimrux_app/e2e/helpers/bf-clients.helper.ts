import type { Page } from '@playwright/test';

interface WindowWithAppwrite extends Window {
  __appwriteAccount?: {
    get: () => Promise<{ $id: string }>;
  };
  __appwriteDatabases?: {
    listDocuments: (
      databaseId: string,
      collectionId: string,
      queries: string[]
    ) => Promise<{ documents: Array<{ company_id?: string }> }>;
    createDocument: (
      databaseId: string,
      collectionId: string,
      documentId: string,
      payload: Record<string, unknown>
    ) => Promise<unknown>;
  };
  __appwriteDatabaseId?: string;
}

export interface BfClientData {
  id: string | undefined;
  name: string;
  ifu: string;
}

export async function createBfClient(page: Page): Promise<BfClientData> {
  const suffix = Date.now().toString(36);
  const name = `CLIENT BF E2E ${suffix}`;
  const ifu = String(Math.floor(10000000 + Math.random() * 90000000));

  const auth = await page.evaluate(async () => {
    const win = window as WindowWithAppwrite;
    const account = win.__appwriteAccount;
    const databases = win.__appwriteDatabases;
    const databaseId = win.__appwriteDatabaseId;
    if (!account || !databases || !databaseId) return null;
    const user = await account.get();
    const response = await databases.listDocuments(databaseId, 'user_profiles', [`equal("user_id","${user.$id}")`]);
    const profile = response.documents[0];
    const companyId = profile?.company_id;
    return { companyId, databaseId };
  });

  if (!auth || !auth.companyId) throw new Error('Impossible de recuperer company_id');

  const clientId = await page.evaluate(async (args) => {
    const { companyId, databaseId, name, ifu, suffix } = args;
    const win = window as WindowWithAppwrite;
    const databases = win.__appwriteDatabases;
    if (!databases) throw new Error('__appwriteDatabases not available');
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const payload = {
      id,
      company_id: companyId,
      type: 'PM',
      name,
      legal_form: 'SARL',
      legal_form_other: null,
      physical_address: JSON.stringify({ city: 'Ouagadougou', district: 'Koulouba', sector: 'Secteur 15' }),
      cadastral_address: JSON.stringify({ parcel: '15', lot: '10', section: 'ZD' }),
      postal_address: JSON.stringify({ post_office: '01', po_box: 'BP6647', postal_code: 'OUAGA05' }),
      phone_country_code: '+226',
      phone: '+22670000001',
      email: `client-${suffix}@test.wimrux`,
      ifu,
      ifu_scan_file_id: null,
      rccm: 'RCCM-BF-TEST-123',
      rccm_scan_file_id: null,
      tax_regime: 'RNI',
      tax_division: JSON.stringify({ type: 'DGE' }),
      contacts: JSON.stringify([
        { role: 'sales', name: 'Contact Vente', function: 'Commercial', phone: '+22671111111', email: 'vente@wimrux.app' },
      ]),
      bank_accounts: JSON.stringify([
        { bank_name: 'BOA CLIENT', account_number: 'BF123456789', iban: 'BF123456789', bic: '', is_default: true },
      ]),
      billing_email: `facturation-${suffix}@test.wimrux`,
      is_active: true,
      created_at: now,
      updated_at: now,
    };
    await databases.createDocument(databaseId, 'clients', id, payload);
    return id;
  }, { companyId: auth.companyId, databaseId: auth.databaseId, name, ifu, suffix });

  return { id: clientId, name, ifu };
}
