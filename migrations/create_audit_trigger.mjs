const API = 'https://gfe4bd9y.eu-central.insforge.app/api/database/advance/rawsql';
const KEY = 'ik_1358be6dcbccff7c0d6636b011559406';

const queries = [
  // Step 1: Check audit_log table schema
  `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'audit_log' ORDER BY ordinal_position`,

  // Step 2: Create audit function
  `CREATE OR REPLACE FUNCTION fn_audit_log()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $fn$
  DECLARE
    v_action TEXT;
    v_record_id TEXT;
    v_data_before JSONB;
    v_data_after JSONB;
    v_company_id UUID;
    v_user_id UUID;
  BEGIN
    v_action := TG_OP;
    v_user_id := COALESCE(current_setting('request.jwt.claim.sub', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid);

    IF TG_OP = 'DELETE' THEN
      v_record_id := OLD.id::text;
      v_data_before := to_jsonb(OLD);
      v_data_after := NULL;
      v_company_id := OLD.company_id;
    ELSIF TG_OP = 'INSERT' THEN
      v_record_id := NEW.id::text;
      v_data_before := NULL;
      v_data_after := to_jsonb(NEW);
      v_company_id := NEW.company_id;
    ELSE
      v_record_id := NEW.id::text;
      v_data_before := to_jsonb(OLD);
      v_data_after := to_jsonb(NEW);
      v_company_id := NEW.company_id;
    END IF;

    INSERT INTO audit_log (user_id, action_type, table_name, record_id, data_before, data_after, company_id, ip_address)
    VALUES (v_user_id, v_action, TG_TABLE_NAME, v_record_id, v_data_before, v_data_after, v_company_id, COALESCE(current_setting('request.header.x-forwarded-for', true), 'unknown'));

    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END;
  $fn$`,

  // Step 3: Create triggers on invoices table
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_invoices_insert') THEN
      CREATE TRIGGER trg_audit_invoices_insert AFTER INSERT ON invoices FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_invoices_update') THEN
      CREATE TRIGGER trg_audit_invoices_update AFTER UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_invoices_delete') THEN
      CREATE TRIGGER trg_audit_invoices_delete AFTER DELETE ON invoices FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
    END IF;
  END $$`,

  // Step 4: Create triggers on invoice_items table
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_invoice_items_insert') THEN
      CREATE TRIGGER trg_audit_invoice_items_insert AFTER INSERT ON invoice_items FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_invoice_items_update') THEN
      CREATE TRIGGER trg_audit_invoice_items_update AFTER UPDATE ON invoice_items FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_invoice_items_delete') THEN
      CREATE TRIGGER trg_audit_invoice_items_delete AFTER DELETE ON invoice_items FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
    END IF;
  END $$`,

  // Step 5: Create triggers on clients table
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_clients_insert') THEN
      CREATE TRIGGER trg_audit_clients_insert AFTER INSERT ON clients FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_clients_update') THEN
      CREATE TRIGGER trg_audit_clients_update AFTER UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_clients_delete') THEN
      CREATE TRIGGER trg_audit_clients_delete AFTER DELETE ON clients FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
    END IF;
  END $$`,

  // Step 6: Create triggers on companies table
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_companies_update') THEN
      CREATE TRIGGER trg_audit_companies_update AFTER UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION fn_audit_log();
    END IF;
  END $$`,
];

async function run() {
  for (let i = 0; i < queries.length; i++) {
    console.log(`\nStep ${i + 1}/${queries.length}...`);
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
      body: JSON.stringify({ query: queries[i] }),
    });
    const data = await res.json();
    console.log(`  Status: ${res.status}`, JSON.stringify(data).substring(0, 300));
    if (res.status >= 400) { console.error('FAILED at step', i + 1); process.exit(1); }
  }
  console.log('\n✅ All audit triggers created successfully.');
}

run().catch(console.error);
