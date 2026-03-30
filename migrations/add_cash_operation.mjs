const API = 'https://gfe4bd9y.eu-central.insforge.app/api/database/advance/rawsql';
const KEY = 'ik_1358be6dcbccff7c0d6636b011559406';

const queries = [
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='treasury_movements' AND column_name='is_cash_operation') THEN
      ALTER TABLE treasury_movements ADD COLUMN is_cash_operation boolean DEFAULT false;
    END IF;
  END $$`,
];

async function run() {
  for (let i = 0; i < queries.length; i++) {
    console.log(`Step ${i + 1}/${queries.length}...`);
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
      body: JSON.stringify({ query: queries[i] }),
    });
    const data = await res.json();
    console.log(`  Status: ${res.status}`, JSON.stringify(data).substring(0, 200));
  }
  console.log('Done.');
}
run().catch(console.error);
