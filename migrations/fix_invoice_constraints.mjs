// ============================================================================
// Fix: invoices_status_check + RLS DELETE policy + get_user_company_id check
// ============================================================================
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
  return data.rows;
}

const queries = [
  // Step 1: Fix CHECK constraint — add pending_validation and approved
  `ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check`,

  `ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
    CHECK (status::text = ANY(ARRAY['draft','pending_validation','approved','validated','certified','cancelled']))`,

  // Step 2: Add DELETE RLS policy on invoices (was missing)
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_delete') THEN
      CREATE POLICY invoices_delete ON invoices FOR DELETE
        USING (company_id = get_user_company_id());
    END IF;
  END $$`,

  // Step 3: Verify get_user_company_id function exists and check its definition
  `SELECT pg_get_functiondef(oid) as def FROM pg_proc WHERE proname = 'get_user_company_id'`,

  // Step 4: Verify WESTAGO user_profile linkage
  `SELECT up.user_id, up.company_id, up.full_name, up.role
   FROM user_profiles up
   WHERE up.company_id = '445329bd-a896-477a-9c32-836d1d17f5de'`,
];

async function run() {
  for (let i = 0; i < queries.length; i++) {
    const label = queries[i].substring(0, 70).replace(/\s+/g, ' ').trim();
    console.log(`\nStep ${i + 1}/${queries.length} — ${label}...`);
    try {
      const rows = await q(queries[i]);
      console.log('  OK', rows.length > 0 ? JSON.stringify(rows, null, 2) : '');
    } catch (err) {
      console.error('  ERROR:', err.message.substring(0, 300));
    }
  }

  // Final verification: list all CHECK constraints on invoices
  console.log('\n=== VERIFICATION: CHECK constraints on invoices ===');
  const checks = await q("SELECT conname, pg_get_constraintdef(c.oid) as def FROM pg_constraint c JOIN pg_class t ON c.conrelid=t.oid WHERE t.relname='invoices' AND c.contype='c'");
  console.log(JSON.stringify(checks, null, 2));

  console.log('\n=== VERIFICATION: RLS policies on invoices ===');
  const policies = await q("SELECT policyname, cmd FROM pg_policies WHERE tablename='invoices'");
  console.log(JSON.stringify(policies, null, 2));
}

run().catch(console.error);
