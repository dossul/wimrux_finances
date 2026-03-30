const API = 'https://gfe4bd9y.eu-central.insforge.app/api/database/advance/rawsql';
const KEY = 'ik_1358be6dcbccff7c0d6636b011559406';

async function query(sql) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify({ query: sql }),
  });
  return res.json();
}

async function run() {
  // 1. Tables with RLS status
  console.log('=== RLS STATUS PER TABLE ===');
  const tables = await query(`
    SELECT t.tablename, t.rowsecurity
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    ORDER BY t.tablename
  `);
  for (const row of tables.rows) {
    const icon = row.rowsecurity ? '✅' : '❌';
    console.log(`  ${icon} ${row.tablename} — RLS ${row.rowsecurity ? 'ON' : 'OFF'}`);
  }

  // 2. Policies per table
  console.log('\n=== RLS POLICIES ===');
  const policies = await query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname
  `);
  const byTable = {};
  for (const p of policies.rows) {
    if (!byTable[p.tablename]) byTable[p.tablename] = [];
    byTable[p.tablename].push(p);
  }
  for (const [table, pols] of Object.entries(byTable)) {
    console.log(`  ${table}:`);
    for (const p of pols) {
      console.log(`    - ${p.policyname} (${p.cmd}) ${p.permissive === 'PERMISSIVE' ? '' : '[RESTRICTIVE]'}`);
    }
  }

  // 3. Triggers
  console.log('\n=== TRIGGERS ===');
  const triggers = await query(`
    SELECT trigger_name, event_manipulation, event_object_table, action_timing
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name
  `);
  for (const t of triggers.rows) {
    console.log(`  ${t.event_object_table}: ${t.trigger_name} (${t.action_timing} ${t.event_manipulation})`);
  }

  // 4. Tables WITHOUT policies (security gap)
  console.log('\n=== TABLES WITHOUT RLS POLICIES (GAPS) ===');
  const gaps = await query(`
    SELECT t.tablename
    FROM pg_tables t
    LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
    WHERE t.schemaname = 'public' AND t.rowsecurity = true AND p.policyname IS NULL
    ORDER BY t.tablename
  `);
  if (gaps.rows.length === 0) {
    console.log('  ✅ No gaps — all RLS-enabled tables have at least one policy');
  } else {
    for (const g of gaps.rows) {
      console.log(`  ❌ ${g.tablename} — RLS ON but NO policies!`);
    }
  }

  // 5. Tables with RLS OFF
  console.log('\n=== TABLES WITH RLS OFF ===');
  const off = await query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND rowsecurity = false
    ORDER BY tablename
  `);
  for (const o of off.rows) {
    console.log(`  ⚠️  ${o.tablename}`);
  }
}

run().catch(console.error);
