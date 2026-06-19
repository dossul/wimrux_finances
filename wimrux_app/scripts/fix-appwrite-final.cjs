/**
 * Finalise les corrections Appwrite pour la suite E2E.
 */

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || '6a29285200015cd421c7';
const APPWRITE_DATABASE = process.env.APPWRITE_DATABASE || 'wimrux_finances';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

if (!APPWRITE_API_KEY) {
  console.error('[fix-final] APPWRITE_API_KEY manquant');
  process.exit(1);
}

const PERMISSIONS = [
  'read("users")',
  'create("users")',
  'update("users")',
  'delete("users")',
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

async function safeCreateAttribute(createFn) {
  try {
    return await createFn();
  } catch (err) {
    if (err.message.includes('attribute_already_exists')) {
      console.log('    -> attribut déjà existant, ignoré');
      return null;
    }
    throw err;
  }
}

async function createStringAttribute(collectionId, key, size, required = false, defaultValue = null) {
  return safeCreateAttribute(() => appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections/${collectionId}/attributes/string`, {
    method: 'POST',
    body: JSON.stringify({ key, size, required, default: defaultValue }),
  }));
}

async function createDoubleAttribute(collectionId, key, required = false, defaultValue = null) {
  return safeCreateAttribute(() => appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections/${collectionId}/attributes/double`, {
    method: 'POST',
    body: JSON.stringify({ key, required, default: defaultValue }),
  }));
}

async function createBooleanAttribute(collectionId, key, required = false, defaultValue = null) {
  return safeCreateAttribute(() => appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections/${collectionId}/attributes/boolean`, {
    method: 'POST',
    body: JSON.stringify({ key, required, default: defaultValue }),
  }));
}

async function updatePermissions(collectionId, name) {
  return appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections/${collectionId}`, {
    method: 'PUT',
    body: JSON.stringify({
      name,
      permissions: PERMISSIONS,
      documentSecurity: false,
      enabled: true,
    }),
  });
}

async function fixAiCreditPacks() {
  console.log('[fix-final] ai_credit_packs : ajout price_usd + permissions');
  await createDoubleAttribute('ai_credit_packs', 'price_usd', false, 0);
  await updatePermissions('ai_credit_packs', 'AI Credit Packs');
  console.log('[fix-final] ai_credit_packs OK');
}

async function createAiCreditTransactions() {
  console.log('[fix-final] ai_credit_transactions : création');
  try {
    await appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections`, {
      method: 'POST',
      body: JSON.stringify({
        collectionId: 'ai_credit_transactions',
        name: 'Transactions crédits IA',
        permissions: PERMISSIONS,
        documentSecurity: false,
      }),
    });
  } catch (err) {
    if (!err.message.includes('already exists')) throw err;
  }

  await createStringAttribute('ai_credit_transactions', 'company_id', 36, true);
  await createStringAttribute('ai_credit_transactions', 'type', 32, true);
  await createDoubleAttribute('ai_credit_transactions', 'amount_usd', true, 0);
  await createDoubleAttribute('ai_credit_transactions', 'amount_xof', false, 0);
  await createStringAttribute('ai_credit_transactions', 'description', 255, false);
  await createStringAttribute('ai_credit_transactions', 'status', 32, true, 'completed');
  await createStringAttribute('ai_credit_transactions', 'payment_method', 32, false);
  await createStringAttribute('ai_credit_transactions', 'metadata', 4000, false);
  await createStringAttribute('ai_credit_transactions', 'id', 36, true);
  console.log('[fix-final] ai_credit_transactions OK');
}

async function main() {
  await fixAiCreditPacks();
  await createAiCreditTransactions();
  console.log('[fix-final] Terminé');
}

main().catch((err) => {
  console.error('[fix-final] Erreur fatale :', err);
  process.exit(1);
});
