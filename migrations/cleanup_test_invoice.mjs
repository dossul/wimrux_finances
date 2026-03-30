const API = 'https://gfe4bd9y.eu-central.insforge.app/api/database/advance/rawsql';
const KEY = 'ik_1358be6dcbccff7c0d6636b011559406';

async function q(sql) {
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify({ query: sql }),
  });
  return r.json();
}

async function run() {
  // Clean up the broken test invoice for WESTAGO
  const invId = '55a754e9-93c4-473c-873d-1bbf77b61a23';

  console.log('Deleting items...');
  console.log(JSON.stringify(await q(`DELETE FROM invoice_items WHERE invoice_id = '${invId}'::uuid`)));

  console.log('Deleting invoice...');
  console.log(JSON.stringify(await q(`DELETE FROM invoices WHERE id = '${invId}'::uuid`)));

  console.log('Remaining invoices:');
  console.log(JSON.stringify(await q('SELECT id, reference, status, company_id FROM invoices')));
}

run().catch(console.error);
