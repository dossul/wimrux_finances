const API = 'https://gfe4bd9y.eu-central.insforge.app/api/database/advance/rawsql';
const KEY = 'ik_1358be6dcbccff7c0d6636b011559406';

const queries = [
  `ALTER TABLE sim_invoices ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'project_admin_policy' AND tablename = 'sim_invoices') THEN
      CREATE POLICY project_admin_policy ON sim_invoices FOR ALL USING (true);
    END IF;
  END $$`,
];

async function run() {
  for (const q of queries) {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
      body: JSON.stringify({ query: q }),
    });
    const d = await res.json();
    console.log(`Status: ${res.status}`, JSON.stringify(d).substring(0, 100));
  }
  console.log('Done.');
}
run().catch(console.error);
