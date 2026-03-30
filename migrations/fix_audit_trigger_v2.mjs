const API = 'https://gfe4bd9y.eu-central.insforge.app/api/database/advance/rawsql';
const KEY = 'ik_1358be6dcbccff7c0d6636b011559406';

async function q(sql) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify({ query: sql }),
  });
  const data = await r.json();
  if (r.status >= 400) throw new Error(JSON.stringify(data));
  return data;
}

const steps = [
  // Drop old fn_audit_log triggers on invoice_items
  'DROP TRIGGER IF EXISTS trg_audit_invoice_items_insert ON invoice_items',
  'DROP TRIGGER IF EXISTS trg_audit_invoice_items_update ON invoice_items',
  'DROP TRIGGER IF EXISTS trg_audit_invoice_items_delete ON invoice_items',

  // Drop old fn_audit_log triggers on invoices
  'DROP TRIGGER IF EXISTS trg_audit_invoices_insert ON invoices',
  'DROP TRIGGER IF EXISTS trg_audit_invoices_update ON invoices',
  'DROP TRIGGER IF EXISTS trg_audit_invoices_delete ON invoices',

  // Check: drop fn_audit_log triggers on clients and companies too if they exist
  'DROP TRIGGER IF EXISTS trg_audit_clients_insert ON clients',
  'DROP TRIGGER IF EXISTS trg_audit_clients_update ON clients',
  'DROP TRIGGER IF EXISTS trg_audit_clients_delete ON clients',
  'DROP TRIGGER IF EXISTS trg_audit_companies_insert ON companies',
  'DROP TRIGGER IF EXISTS trg_audit_companies_update ON companies',
  'DROP TRIGGER IF EXISTS trg_audit_companies_delete ON companies',
];

async function run() {
  // Step 1: Drop all old fn_audit_log triggers
  console.log('=== Step 1: Drop old fn_audit_log() triggers ===');
  for (const sql of steps) {
    const label = sql.replace('DROP TRIGGER IF EXISTS ', '').substring(0, 60);
    try {
      await q(sql);
      console.log(`  OK: ${label}`);
    } catch (err) {
      console.error(`  ERR: ${label} — ${err.message.substring(0, 200)}`);
    }
  }

  // Step 2: Drop the old fn_audit_log function itself
  console.log('\n=== Step 2: Drop old fn_audit_log() function ===');
  try {
    await q('DROP FUNCTION IF EXISTS fn_audit_log()');
    console.log('  OK');
  } catch (err) {
    console.error('  ERR:', err.message.substring(0, 200));
  }

  // Step 3: Test INSERT into invoice_items
  console.log('\n=== Step 3: Test INSERT into invoice_items ===');
  const inv = '55a754e9-93c4-473c-873d-1bbf77b61a23';
  try {
    const result = await q(`
      INSERT INTO invoice_items (invoice_id, code, name, type, price, quantity, unit, tax_group, specific_tax, discount, amount_ht, amount_tva, amount_psvb, amount_ttc, sort_order)
      VALUES ('${inv}', 'TEST-OK', 'Brique Test', 'LOCBIE', 350, 4, 'unité', 'B', 0, 0, 1186.44, 213.56, 0, 1400, 0)
      RETURNING id, name, amount_ttc
    `);
    console.log('  SUCCESS:', JSON.stringify(result.rows));
  } catch (err) {
    console.error('  FAILED:', err.message.substring(0, 300));
  }

  // Step 4: Clean up test item
  console.log('\n=== Step 4: Cleanup ===');
  try {
    await q(`DELETE FROM invoice_items WHERE invoice_id = '${inv}' AND code LIKE 'TEST-%'`);
    console.log('  OK');
  } catch (err) {
    console.error('  ERR:', err.message.substring(0, 200));
  }

  // Step 5: Verify remaining triggers
  console.log('\n=== Step 5: Remaining triggers on invoice_items ===');
  const triggers = await q("SELECT trigger_name, event_manipulation, action_statement FROM information_schema.triggers WHERE event_object_table = 'invoice_items' ORDER BY trigger_name");
  console.log(JSON.stringify(triggers.rows, null, 2));
}

run().catch(err => console.error('FATAL:', err.message));
