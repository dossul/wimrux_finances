/**
 * Crée la collection country_fiscal_configs et le document BF pour la vérification IFU.
 */

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || '6a29285200015cd421c7';
const APPWRITE_DATABASE = process.env.APPWRITE_DATABASE || 'wimrux_finances';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

if (!APPWRITE_API_KEY) {
  console.error('[create-country-fiscal-configs] APPWRITE_API_KEY manquant');
  process.exit(1);
}

const PERMISSIONS_COLLECTION = [
  'read("users")',
  'create("users")',
  'update("users")',
  'delete("users")',
];

const PERMISSIONS_DOCUMENT = [
  'read("users")',
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

const COLLECTION_ID = 'country_fiscal_configs';

async function createCollection() {
  try {
    return await appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections`, {
      method: 'POST',
      body: JSON.stringify({
        collectionId: COLLECTION_ID,
        name: 'Country Fiscal Configs',
        permissions: PERMISSIONS_COLLECTION,
        documentSecurity: false,
      }),
    });
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log('[create-country-fiscal-configs] Collection déjà existante');
      return null;
    }
    throw err;
  }
}

async function createStringAttribute(key, size = 255, required = false, defaultValue = null) {
  const body = {
    key,
    size,
    required,
    array: false,
    default: defaultValue,
  };
  if (defaultValue === null) delete body.default;
  try {
    return await appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections/${COLLECTION_ID}/attributes/string`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('Attribute with the requested ID already exists')) {
      console.log(`[create-country-fiscal-configs] Attribut ${key} déjà existant`);
      return null;
    }
    throw err;
  }
}

async function createBooleanAttribute(key, required = false, defaultValue = false) {
  const body = {
    key,
    required,
    array: false,
    default: defaultValue,
  };
  try {
    return await appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections/${COLLECTION_ID}/attributes/boolean`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('Attribute with the requested ID already exists')) {
      console.log(`[create-country-fiscal-configs] Attribut ${key} déjà existant`);
      return null;
    }
    throw err;
  }
}

async function createDocument() {
  const bf = {
    country_code: 'BF',
    country_name: 'Burkina Faso',
    tax_id_label: 'IFU',
    tax_id_format_regex: '^[A-Za-z0-9]{7,20}$',
    tax_id_format_hint: '7 à 20 caractères alphanumériques',
    verification_type: 'dify_workflow',
    verification_url: 'https://dgi.bf/verification/verification-ifu',
    verification_field: 'IFU',
    verification_valid_pattern: 'valid|trouvé|existe|contribuable|enregistré',
    fiscal_platform_name: 'DGI Burkina Faso',
    fiscal_platform_url: 'https://dgi.bf/verification/verification-ifu',
    dify_workflow_id: 'verify-ifu-bf',
    is_active: true,
  };

  try {
    return await appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections/${COLLECTION_ID}/documents`, {
      method: 'POST',
      body: JSON.stringify({
        documentId: 'bf-fiscal-config',
        data: bf,
        permissions: PERMISSIONS_DOCUMENT,
      }),
    });
  } catch (err) {
    if (err.message.includes('already exists') || err.message.includes('Document with the requested ID already exists')) {
      console.log('[create-country-fiscal-configs] Document BF déjà existant');
      return null;
    }
    throw err;
  }
}

async function main() {
  console.log('[create-country-fiscal-configs] Création collection...');
  const col = await createCollection();
  if (col) console.log('[create-country-fiscal-configs] Collection créée:', col.$id);

  await new Promise((r) => setTimeout(r, 500));

  console.log('[create-country-fiscal-configs] Création attributs...');
  await createStringAttribute('country_code', 2, true);
  await createStringAttribute('country_name', 100, true);
  await createStringAttribute('tax_id_label', 50, false);
  await createStringAttribute('tax_id_format_regex', 255, false);
  await createStringAttribute('tax_id_format_hint', 255, false);
  await createStringAttribute('verification_type', 30, false);
  await createStringAttribute('verification_url', 500, false);
  await createStringAttribute('verification_field', 50, false);
  await createStringAttribute('verification_valid_pattern', 255, false);
  await createStringAttribute('fiscal_platform_name', 100, false);
  await createStringAttribute('fiscal_platform_url', 500, false);
  await createStringAttribute('dify_workflow_id', 100, false);
  await createBooleanAttribute('is_active', false, true);

  await new Promise((r) => setTimeout(r, 500));

  console.log('[create-country-fiscal-configs] Création document BF...');
  const doc = await createDocument();
  if (doc) console.log('[create-country-fiscal-configs] Document BF créé:', doc.$id);

  console.log('[create-country-fiscal-configs] Terminé');
}

main().catch((err) => {
  console.error('[create-country-fiscal-configs] Erreur:', err.message);
  process.exit(1);
});
