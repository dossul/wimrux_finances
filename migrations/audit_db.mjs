const API = 'https://gfe4bd9y.eu-central.insforge.app/api/database/advance/rawsql';
const KEY = 'ik_1358be6dcbccff7c0d6636b011559406';

async function sql(query) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
    body: JSON.stringify({ query })
  });
  return res.json();
}

async function run() {
  // 1. List all public tables
  console.log('=== TABLES ===');
  const t = await sql("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log(JSON.stringify(t.rows, null, 2));

  // 2. Check invoice_sequences table
  console.log('\n=== invoice_sequences columns ===');
  const c1 = await sql("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='invoice_sequences' ORDER BY ordinal_position");
  console.log(JSON.stringify(c1.rows, null, 2));

  // 3. Check articles table
  console.log('\n=== articles columns ===');
  const c2 = await sql("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='articles' ORDER BY ordinal_position");
  console.log(JSON.stringify(c2.rows, null, 2));

  // 4. Check fiscal_a_reports table
  console.log('\n=== fiscal_a_reports columns ===');
  const c3 = await sql("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='fiscal_a_reports' ORDER BY ordinal_position");
  console.log(JSON.stringify(c3.rows, null, 2));

  // 5. Check credit_note_nature column on invoices
  console.log('\n=== invoices.credit_note_nature ===');
  const c4 = await sql("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='invoices' AND column_name='credit_note_nature'");
  console.log(JSON.stringify(c4.rows, null, 2));

  // 6. Check movement_type column on treasury_movements
  console.log('\n=== treasury_movements.movement_type ===');
  const c5 = await sql("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='treasury_movements' AND column_name='movement_type'");
  console.log(JSON.stringify(c5.rows, null, 2));

  // 7. Check RLS policies
  console.log('\n=== RLS policies (new tables) ===');
  const p = await sql("SELECT tablename, policyname FROM pg_policies WHERE tablename IN ('invoice_sequences','articles','fiscal_a_reports') ORDER BY tablename");
  console.log(JSON.stringify(p.rows, null, 2));

  // 8. Check next_invoice_reference function exists
  console.log('\n=== next_invoice_reference function ===');
  const f = await sql("SELECT proname, prorettype::regtype FROM pg_proc WHERE proname='next_invoice_reference'");
  console.log(JSON.stringify(f.rows, null, 2));

  // 9. Check storage buckets
  console.log('\n=== Storage buckets ===');
  const b = await fetch('https://gfe4bd9y.eu-central.insforge.app/api/storage/buckets', {
    headers: { 'x-api-key': KEY }
  });
  const bData = await b.json();
  console.log(JSON.stringify(bData, null, 2));

  // 10. Count existing data
  console.log('\n=== Data counts ===');
  const counts = await sql("SELECT (SELECT count(*) FROM companies) as companies, (SELECT count(*) FROM invoices) as invoices, (SELECT count(*) FROM clients) as clients, (SELECT count(*) FROM invoice_sequences) as sequences");
  console.log(JSON.stringify(counts.rows, null, 2));
}

run();
