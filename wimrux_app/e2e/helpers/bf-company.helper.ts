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
    updateDocument: (
      databaseId: string,
      collectionId: string,
      documentId: string,
      payload: Record<string, unknown>
    ) => Promise<unknown>;
  };
  __appwriteDatabaseId?: string;
}

export async function updateCompanyBfInfo(page: Page): Promise<void> {
  const auth = await page.evaluate(async () => {
    const win = window as WindowWithAppwrite;
    const account = win.__appwriteAccount;
    const databases = win.__appwriteDatabases;
    const databaseId = win.__appwriteDatabaseId;
    if (!account || !databases || !databaseId) return null;

    try {
      const user = await account.get();
      const response = await databases.listDocuments(
        databaseId,
        'user_profiles',
        [`equal("user_id","${user.$id}")`]
      );
      const profile = response.documents[0];
      const companyId = profile?.company_id;
      if (!companyId) return null;
      return { userId: user.$id, companyId, databaseId };
    } catch {
      return null;
    }
  });

  if (!auth) throw new Error('Impossible de determiner company_id pour mise a jour entreprise');

  await page.evaluate(async (args) => {
    const { companyId, databaseId } = args;
    const win = window as WindowWithAppwrite;
    const databases = win.__appwriteDatabases;
    if (!databases) throw new Error('__appwriteDatabases not available');
    const updates = {
      name: 'WIMRUX BF TEST SARL',
      ifu: '1234567890123',
      rccm: 'RCCM-OUAGA-TEST-001',
      legal_form: 'SARL',
      legal_form_other: null,
      physical_address: JSON.stringify({ city: 'Ouagadougou', district: 'Koulouba', sector: 'Secteur 15' }),
      cadastral_address: JSON.stringify({ parcel: '15', lot: '10', section: 'ZD' }),
      postal_address: JSON.stringify({ post_office: '01', po_box: 'BP6647', postal_code: 'OUAGA05' }),
      phone_country_code: '+226',
      phone: '+22670000001',
      email: 'test@wimrux.app',
      tax_regime: 'RNI',
      tax_division: JSON.stringify({ type: 'DGE' }),
      tax_office: null,
      bank_accounts: JSON.stringify([
        { bank_name: 'BOA', account_number: 'BF001', iban: 'BF001', bic: 'BOABF BF', is_default: true },
      ]),
      contacts: JSON.stringify([
        { role: 'sales', name: 'Contact Vente', function: 'Commercial', phone: '+22671111111', email: 'vente@wimrux.app' },
        { role: 'accounting', name: 'Contact Compta', function: 'Comptable', phone: '+22672222222', email: 'compta@wimrux.app' },
      ]),
    };
    await databases.updateDocument(databaseId, 'companies', companyId, updates);
  }, { companyId: auth.companyId, databaseId: auth.databaseId });
}
