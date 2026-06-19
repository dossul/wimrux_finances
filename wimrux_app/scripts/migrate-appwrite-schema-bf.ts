import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve('.env.local') });

const ENDPOINT = process.env.APPWRITE_ENDPOINT || '';
const PROJECT_ID = process.env.APPWRITE_PROJECT || '';
const API_KEY = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID = process.env.APPWRITE_DATABASE || '';

const client = new Client();
client.setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const databases = new Databases(client);

async function ensureStringAttribute(
  collectionId: string,
  key: string,
  size = 65535,
  required = false,
  defaultValue: string | undefined = undefined,
) {
  try {
    await databases.getAttribute(DATABASE_ID, collectionId, key);
    console.log(`  ${collectionId}.${key}: already exists`);
  } catch {
    console.log(`  ${collectionId}.${key}: creating...`);
    await databases.createStringAttribute(
      DATABASE_ID,
      collectionId,
      key,
      size,
      required,
      defaultValue,
    );
  }
}

async function main() {
  console.log('Ensuring BF schema attributes...');

  const partnerAttributes = [
    'legal_form',
    'legal_form_other',
    'physical_address',
    'cadastral_address',
    'postal_address',
    'phone_country_code',
    'ifu_scan_file_id',
    'rccm_scan_file_id',
    'tax_regime',
    'tax_division',
    'contacts',
    'bank_accounts',
    'billing_email',
  ];

  for (const collectionId of ['clients', 'suppliers']) {
    console.log(`\nCollection: ${collectionId}`);
    for (const attr of partnerAttributes) {
      await ensureStringAttribute(collectionId, attr, 65535, false);
    }
  }

  // charges_vat (boolean) and vat_rate (float) for clients and suppliers
  for (const collectionId of ['clients', 'suppliers']) {
    console.log(`\nCollection: ${collectionId} — charges_vat, vat_rate`);
    try {
      await databases.getAttribute(DATABASE_ID, collectionId, 'charges_vat');
      console.log(`  ${collectionId}.charges_vat: already exists`);
    } catch {
      console.log(`  ${collectionId}.charges_vat: creating...`);
      await databases.createBooleanAttribute(DATABASE_ID, collectionId, 'charges_vat', false, false);
    }
    try {
      await databases.getAttribute(DATABASE_ID, collectionId, 'vat_rate');
      console.log(`  ${collectionId}.vat_rate: already exists`);
    } catch {
      console.log(`  ${collectionId}.vat_rate: creating...`);
      await databases.createFloatAttribute(DATABASE_ID, collectionId, 'vat_rate', false, 0, 1);
    }
  }

  console.log('\nCollection: companies');
  const companyAttributes = [
    'legal_form',
    'legal_form_other',
    'physical_address',
    'cadastral_address',
    'postal_address',
    'phone_country_code',
    'tax_regime',
    'tax_division',
    'contacts',
  ];
  for (const attr of companyAttributes) {
    await ensureStringAttribute('companies', attr, 65535, false);
  }

  console.log('\nSchema migration complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
