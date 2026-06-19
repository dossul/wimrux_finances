/**
 * Crée les collections Appwrite manquantes pour WIMRUX® Finances.
 * Collections : wire_transfers, treasury_movements, ai_credit_packs, ai_credit_transactions.
 */

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || '6a29285200015cd421c7';
const APPWRITE_DATABASE = process.env.APPWRITE_DATABASE || 'wimrux_finances';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

if (!APPWRITE_API_KEY) {
  console.error('[create-collections] APPWRITE_API_KEY manquant');
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

async function createCollection(collectionId, name) {
  try {
    return await appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections`, {
      method: 'POST',
      body: JSON.stringify({
        collectionId,
        name,
        permissions: PERMISSIONS,
        documentSecurity: false,
      }),
    });
  } catch (err) {
    if (err.message.includes('already exists')) {
      console.log(`[create-collections] Collection déjà existante : ${collectionId}`);
      return null;
    }
    throw err;
  }
}

async function safeCreateAttribute(createFn) {
  try {
    return await createFn();
  } catch (err) {
    if (err.message.includes('attribute_already_exists')) {
      return null;
    }
    throw err;
  }
}

async function createStringAttribute(collectionId, key, size, required = false, defaultValue = null) {
  return safeCreateAttribute(() => appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections/${collectionId}/attributes/string`, {
    method: 'POST',
    body: JSON.stringify({
      key,
      size,
      required,
      default: defaultValue,
    }),
  }));
}

async function createIntegerAttribute(collectionId, key, required = false, defaultValue = null) {
  return safeCreateAttribute(() => appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections/${collectionId}/attributes/integer`, {
    method: 'POST',
    body: JSON.stringify({
      key,
      required,
      default: defaultValue,
    }),
  }));
}

async function createDoubleAttribute(collectionId, key, required = false, defaultValue = null) {
  return safeCreateAttribute(() => appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections/${collectionId}/attributes/double`, {
    method: 'POST',
    body: JSON.stringify({
      key,
      required,
      default: defaultValue,
    }),
  }));
}

async function createBooleanAttribute(collectionId, key, required = false, defaultValue = null) {
  return safeCreateAttribute(() => appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections/${collectionId}/attributes/boolean`, {
    method: 'POST',
    body: JSON.stringify({
      key,
      required,
      default: defaultValue,
    }),
  }));
}

async function createDatetimeAttribute(collectionId, key, required = false, defaultValue = null) {
  return safeCreateAttribute(() => appwriteFetch(`/databases/${APPWRITE_DATABASE}/collections/${collectionId}/attributes/datetime`, {
    method: 'POST',
    body: JSON.stringify({
      key,
      required,
      default: defaultValue,
    }),
  }));
}

async function createWireTransfersCollection() {
  const id = 'wire_transfers';
  await createCollection(id, 'Virements bancaires');

  await createStringAttribute(id, 'company_id', 36, true);
  await createStringAttribute(id, 'reference', 64, true);
  await createStringAttribute(id, 'source_bank_account_id', 36, true);
  await createStringAttribute(id, 'beneficiary_name', 255, true);
  await createStringAttribute(id, 'beneficiary_iban', 64, false);
  await createStringAttribute(id, 'beneficiary_bic', 32, false);
  await createStringAttribute(id, 'beneficiary_bank', 128, false);
  await createDoubleAttribute(id, 'amount', true, 0);
  await createStringAttribute(id, 'currency', 3, true, 'XOF');
  await createStringAttribute(id, 'motif', 500, false);
  await createStringAttribute(id, 'status', 32, true, 'draft');
  await createDatetimeAttribute(id, 'scheduled_date', false);
  await createDatetimeAttribute(id, 'executed_date', false);
  await createStringAttribute(id, 'invoice_id', 36, false);
  await createStringAttribute(id, 'created_by', 36, false);
  await createStringAttribute(id, 'approved_by', 36, false);
  await createDatetimeAttribute(id, 'approved_at', false);
  await createDatetimeAttribute(id, 'sepa_xml_generated_at', false);
  await createStringAttribute(id, 'id', 36, true);

  console.log('[create-collections] wire_transfers créée/mise à jour');
}

async function createTreasuryMovementsCollection() {
  const id = 'treasury_movements';
  await createCollection(id, 'Mouvements de trésorerie');

  await createStringAttribute(id, 'company_id', 36, true);
  await createStringAttribute(id, 'treasury_account_id', 36, true);
  await createStringAttribute(id, 'type', 32, true); // credit/debit/transfer
  await createStringAttribute(id, 'direction', 32, false);
  await createDoubleAttribute(id, 'amount', true, 0);
  await createStringAttribute(id, 'label', 255, true);
  await createStringAttribute(id, 'description', 500, false);
  await createStringAttribute(id, 'reference', 255, false);
  await createDoubleAttribute(id, 'balance_after', false);
  await createDatetimeAttribute(id, 'date', false);
  await createDatetimeAttribute(id, 'movement_date', false);
  await createStringAttribute(id, 'payment_type', 32, false);
  await createStringAttribute(id, 'id', 36, true);

  console.log('[create-collections] treasury_movements créée/mise à jour');
}

async function createAiCreditPacksCollection() {
  const id = 'ai_credit_packs';
  await createCollection(id, 'Packs crédits IA');

  await createStringAttribute(id, 'code', 64, true);
  await createStringAttribute(id, 'name', 128, true);
  await createDoubleAttribute(id, 'credits_usd', true, 0);
  await createDoubleAttribute(id, 'price_xof', true, 0);
  await createDoubleAttribute(id, 'price_usd', false, 0);
  await createBooleanAttribute(id, 'is_active', true, true);
  await createStringAttribute(id, 'description', 500, false);
  await createStringAttribute(id, 'id', 36, true);

  console.log('[create-collections] ai_credit_packs créée/mise à jour');
}

async function createAiCreditTransactionsCollection() {
  const id = 'ai_credit_transactions';
  await createCollection(id, 'Transactions crédits IA');

  await createStringAttribute(id, 'company_id', 36, true);
  await createStringAttribute(id, 'type', 32, true); // purchase/consumption/refund/bonus
  await createDoubleAttribute(id, 'amount_usd', true, 0);
  await createDoubleAttribute(id, 'amount_xof', false, 0);
  await createStringAttribute(id, 'description', 255, false);
  await createStringAttribute(id, 'status', 32, true, 'completed');
  await createStringAttribute(id, 'payment_method', 32, false);
  await createStringAttribute(id, 'metadata', 4000, false); // JSON string
  await createStringAttribute(id, 'id', 36, true);

  console.log('[create-collections] ai_credit_transactions créée/mise à jour');
}

async function main() {
  await createWireTransfersCollection();
  await createTreasuryMovementsCollection();
  await createAiCreditPacksCollection();
  await createAiCreditTransactionsCollection();
  console.log('[create-collections] Terminé');
}

main().catch((err) => {
  console.error('[create-collections] Erreur fatale :', err);
  process.exit(1);
});
