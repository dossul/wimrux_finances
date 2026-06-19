/**
 * Fix Appwrite collection permissions for WIMRUX® Finances E2E tests.
 *
 * Sets collection-level permissions so authenticated users can create/read/update/delete
 * documents. Application-level filtering (company_id) remains the source of truth for RLS.
 */

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || '6a29285200015cd421c7';
const APPWRITE_DATABASE = process.env.APPWRITE_DATABASE || 'wimrux_finances';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

if (!APPWRITE_API_KEY) {
  console.error('[fix-permissions] APPWRITE_API_KEY manquant');
  process.exit(1);
}

const PERMISSIONS = [
  'read("users")',
  'create("users")',
  'update("users")',
  'delete("users")',
];

const COLLECTIONS_TO_FIX = [
  'wire_transfers',
  'ai_credit_packs',
  'ai_credit_transactions',
  'bank_accounts',
  'treasury_accounts',
  'treasury_movements',
  'suppliers',
  'articles',
  'received_invoices',
  'invoice_payments',
];

async function appwriteFetch(path, options = {}) {
  const url = new URL(`${APPWRITE_ENDPOINT}${path}`);
  const res = await fetch(url.toString(), {
    ...options,
    headers: {
      'X-Appwrite-Project': APPWRITE_PROJECT,
      'X-Appwrite-Key': APPWRITE_API_KEY,
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

async function listCollections() {
  const all = [];
  let lastId = null;
  // Appwrite list endpoint supports cursor; use limit+offset for simplicity
  while (true) {
    const params = new URLSearchParams({ limit: '100' });
    if (lastId) params.set('cursor', lastId);
    const data = await appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections?${params.toString()}`);
    if (!data?.collections?.length) break;
    all.push(...data.collections);
    if (all.length >= data.total) break;
    lastId = data.collections[data.collections.length - 1].$id;
  }
  return all;
}

async function updateCollectionPermissions(collectionId, name) {
  const body = {
    name,
    permissions: PERMISSIONS,
    documentSecurity: false,
    enabled: true,
  };

  return appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections/${collectionId}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

async function main() {
  console.log('[fix-permissions] Listing collections...');
  const collections = await listCollections();
  const collectionMap = new Map(collections.map((c) => [c.$id, c]));

  for (const collectionId of COLLECTIONS_TO_FIX) {
    const collection = collectionMap.get(collectionId);
    if (!collection) {
      console.warn(`[fix-permissions] Collection introuvable : ${collectionId}`);
      continue;
    }

    try {
      await updateCollectionPermissions(collectionId, collection.name);
      console.log(`[fix-permissions] Permissions mises à jour : ${collectionId}`);
    } catch (err) {
      console.error(`[fix-permissions] Échec ${collectionId} :`, err.message);
    }
  }
}

main().catch((err) => {
  console.error('[fix-permissions] Erreur fatale :', err);
  process.exit(1);
});
