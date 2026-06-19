/**
 * Migration Appwrite : enrichissement des clients et fournisseurs
 * pour la facture normalisée Burkina Faso (11 champs obligatoires).
 *
 * Usage (depuis la racine wimrux_app) :
 *   npx ts-node scripts/migrate-partners-bf-fiscal.ts
 *
 * Ce script est idempotent : il ne modifie que les enregistrements
 * qui n'ont pas encore les nouveaux champs structurés.
 */

import { Client, Databases, Query } from 'node-appwrite';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || '';
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || '';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID = process.env.APPWRITE_DATABASE || 'wimrux_finances';

if (!APPWRITE_PROJECT || !APPWRITE_API_KEY) {
  console.error('Variables APPWRITE_PROJECT et APPWRITE_API_KEY requises.');
  process.exit(1);
}

const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT)
  .setKey(APPWRITE_API_KEY);

const db = new Databases(client);

const JSON_FIELDS = new Set(['physical_address', 'cadastral_address', 'postal_address', 'tax_division', 'contacts', 'bank_accounts']);

function stringifyJsonFields(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = { ...data };
  for (const key of JSON_FIELDS) {
    if (key in result && result[key] !== undefined && result[key] !== null && typeof result[key] !== 'string') {
      result[key] = JSON.stringify(result[key]);
    }
  }
  return result;
}

const LEGACY_CADASTRAL_REGEX = /^(\d{4})\s*(\d{3})\s*(\d{4})$/;

function parseLegacyCadastral(value: string): { parcel: string; lot: string; section: string } | null {
  const m = value.trim().match(LEGACY_CADASTRAL_REGEX);
  if (!m) return null;
  return { section: m[1] ?? '', lot: m[2] ?? '', parcel: m[3] ?? '' };
}

function parseAddress(address: string | null): {
  physical_address: { city: string; district: string; sector: string } | null;
  postal_address: { post_office: string; po_box: string; postal_code: string } | null;
} {
  if (!address) return { physical_address: null, postal_address: null };

  const bpMatch = address.match(/(?:BP|boite postale)\s*([0-9]+)/i);
  const postalCodeMatch = address.match(/(\d{5}|[A-Z]{2,}\d{2,})/i);

  if (bpMatch || postalCodeMatch) {
    return {
      physical_address: { city: '', district: '', sector: '' },
      postal_address: {
        post_office: bpMatch ? 'Bureau postal' : '',
        po_box: bpMatch ? `BP${bpMatch[1] ?? ''}` : '',
        postal_code: postalCodeMatch ? (postalCodeMatch[1] ?? '') : '',
      },
    };
  }

  const parts = address.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return {
      physical_address: {
        sector: parts[0] || '',
        district: parts[1] || '',
        city: parts[2] || '',
      },
      postal_address: null,
    };
  }

  return {
    physical_address: { city: address, district: '', sector: '' },
    postal_address: null,
  };
}

async function migrateCollection(collectionId: string, isSupplier: boolean) {
  console.log(`Migration collection ${collectionId}...`);
  let offset = 0;
  const limit = 100;

   
  while (true) {
    const { documents } = await db.listDocuments(DATABASE_ID, collectionId, [
      Query.limit(limit),
      Query.offset(offset),
    ]);

    if (documents.length === 0) break;

    for (const doc of documents) {
      const updates: Record<string, unknown> = {};

      if (!doc.cadastral_address && doc.address_cadastral) {
        const parsed = parseLegacyCadastral(String(doc.address_cadastral));
        if (parsed) updates.cadastral_address = parsed;
      }

      if (!doc.physical_address && doc.address) {
        const { physical_address, postal_address } = parseAddress(String(doc.address));
        if (physical_address) updates.physical_address = physical_address;
        if (postal_address) updates.postal_address = postal_address;
      }

      if (!doc.phone_country_code && doc.phone) {
        updates.phone_country_code = '+226';
      }

      if (isSupplier) {
        if (!doc.tax_regime && doc.regime_fiscal) {
          const mapping: Record<string, string> = {
            RNI: 'RNI',
            RSI: 'RSI',
            CME: 'CME',
            CSE: 'CSE',
            RND: 'RND',
          };
          const normalized = String(doc.regime_fiscal).toUpperCase();
          updates.tax_regime = mapping[normalized] || null;
        }

        if (!doc.tax_division && doc.division_fiscale) {
          const div = String(doc.division_fiscale).toUpperCase();
          if (div.startsWith('DGE')) updates.tax_division = { type: 'DGE' };
          else if (div.startsWith('DME')) {
            const sub = div.split('-')[1] || '';
            updates.tax_division = { type: 'DME', sub_division: sub };
          } else if (div.startsWith('DCI')) {
            const sub = div.split('-')[1] || '';
            updates.tax_division = { type: 'DCI', sub_division: sub };
          } else if (div.startsWith('DPI')) {
            updates.tax_division = { type: 'DPI', province: div.replace('DPI', '').replace('-', '').trim() || '' };
          }
        }

        if (!doc.bank_accounts && (doc.bank_name || doc.bank_iban || doc.bank_bic)) {
          updates.bank_accounts = [
            {
              bank_name: doc.bank_name || '',
              account_number: doc.bank_iban || '',
              iban: doc.bank_iban || '',
              bic: doc.bank_bic || '',
              is_default: true,
            },
          ];
        }
      }

      if (Object.keys(updates).length > 0) {
        const payload = stringifyJsonFields(updates);
        await db.updateDocument(DATABASE_ID, collectionId, doc.$id, payload);
        console.log(`  Migrated ${doc.$id}`);
      }
    }

    offset += limit;
  }
}

async function main() {
  await migrateCollection('clients', false);
  await migrateCollection('suppliers', true);
  console.log('Migration terminee.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
