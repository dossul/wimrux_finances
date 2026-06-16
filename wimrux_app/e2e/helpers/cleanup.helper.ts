/**
 * Nettoyage des données de test E2E — WIMRUX® Finances
 *
 * Supprime les documents marqués avec TEST_MARKER via l'API Appwrite serveur.
 * Nécessite la variable d'environnement APPWRITE_API_KEY.
 */

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || '6a29285200015cd421c7';
const APPWRITE_DATABASE = process.env.APPWRITE_DATABASE || 'wimrux_finances';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

const TEST_MARKER = '(E2E-TEST)';

const COLLECTIONS = {
  CLIENTS: 'clients',
  INVOICES: 'invoices',
  INVOICE_ITEMS: 'invoice_items',
  TREASURY_ACCOUNTS: 'treasury_accounts',
  TREASURY_MOVEMENTS: 'treasury_movements',
} as const;

interface AppwriteDocument {
  $id: string;
  [key: string]: unknown;
}

async function appwriteFetch(path: string, options: RequestInit = {}): Promise<unknown> {
  const url = new URL(`${APPWRITE_ENDPOINT}${path}`);

  const res = await fetch(url.toString(), {
    ...options,
    headers: {
      'X-Appwrite-Project': APPWRITE_PROJECT,
      'X-Appwrite-Key': APPWRITE_API_KEY as string,
      'X-Appwrite-Response-Format': '1.4.0',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Appwrite ${res.status}: ${text}`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json') || res.status === 204) {
    return null;
  }

  return res.json();
}

function buildQueryParams(queries: string[]): string {
  return queries.map((q, i) => `queries[${i}]=${encodeURIComponent(q)}`).join('&');
}

async function listAllDocuments(collectionId: string): Promise<AppwriteDocument[]> {
  const all: AppwriteDocument[] = [];
  const limit = 100;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const queryString = buildQueryParams([`limit(${limit})`, `offset(${all.length})`]);
    const data = (await appwriteFetch(
      `/databases/${APPWRITE_DATABASE}/collections/${collectionId}/documents?${queryString}`
    )) as { documents: AppwriteDocument[]; total: number };

    if (!data.documents || data.documents.length === 0) break;

    all.push(...data.documents);

    if (all.length >= data.total) break;
  }

  return all;
}

async function deleteDocument(collectionId: string, documentId: string): Promise<void> {
  await appwriteFetch(
    `/databases/${APPWRITE_DATABASE}/collections/${collectionId}/documents/${documentId}`,
    { method: 'DELETE' }
  );
}

function documentContainsMarker(doc: AppwriteDocument): boolean {
  return Object.values(doc).some((value) =>
    typeof value === 'string' && value.includes(TEST_MARKER)
  );
}

export async function cleanupTestData(): Promise<void> {
  if (!APPWRITE_API_KEY) {
    console.warn('[cleanup] APPWRITE_API_KEY non configurée — nettoyage ignoré');
    return;
  }

  try {
    // 1. Supprimer les factures marquées et leurs lignes
    const invoices = await listAllDocuments(COLLECTIONS.INVOICES);
    const e2eInvoiceIds = new Set<string>();

    for (const invoice of invoices) {
      if (documentContainsMarker(invoice)) {
        e2eInvoiceIds.add(invoice.$id);
      }
    }

    if (e2eInvoiceIds.size > 0) {
      const items = await listAllDocuments(COLLECTIONS.INVOICE_ITEMS);
      for (const item of items) {
        const invoiceId = item.invoice_id as string | undefined;
        if (invoiceId && e2eInvoiceIds.has(invoiceId)) {
          await deleteDocument(COLLECTIONS.INVOICE_ITEMS, item.$id);
        }
      }

      for (const id of e2eInvoiceIds) {
        await deleteDocument(COLLECTIONS.INVOICES, id);
      }
    }

    // 2. Supprimer les clients marqués
    const clients = await listAllDocuments(COLLECTIONS.CLIENTS);
    for (const client of clients) {
      if (documentContainsMarker(client)) {
        await deleteDocument(COLLECTIONS.CLIENTS, client.$id);
      }
    }

    // 3. Supprimer les comptes de trésorerie marqués et leurs mouvements
    const accounts = await listAllDocuments(COLLECTIONS.TREASURY_ACCOUNTS);
    const e2eAccountIds = new Set<string>();

    for (const account of accounts) {
      if (documentContainsMarker(account)) {
        e2eAccountIds.add(account.$id);
      }
    }

    if (e2eAccountIds.size > 0) {
      const movements = await listAllDocuments(COLLECTIONS.TREASURY_MOVEMENTS);
      for (const movement of movements) {
        const accountId = (movement.treasury_account_id as string | undefined) || (movement.account_id as string | undefined);
        if (accountId && e2eAccountIds.has(accountId)) {
          await deleteDocument(COLLECTIONS.TREASURY_MOVEMENTS, movement.$id);
        }
      }

      for (const id of e2eAccountIds) {
        await deleteDocument(COLLECTIONS.TREASURY_ACCOUNTS, id);
      }
    }

    console.log(`[cleanup] Terminé : ${e2eInvoiceIds.size} factures, ${e2eAccountIds.size} comptes de trésorerie nettoyés`);
  } catch (err) {
    console.error('[cleanup] Erreur lors du nettoyage :', err);
    throw err;
  }
}
