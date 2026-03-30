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

async function run() {
  // Fix: Recreate log_audit_changes with SECURITY DEFINER + handle tables without company_id
  console.log('1. Recreating log_audit_changes() with SECURITY DEFINER + invoice_id lookup...');
  await q(`
    CREATE OR REPLACE FUNCTION log_audit_changes()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $fn$
    DECLARE
      v_action_type VARCHAR(10);
      v_record_id VARCHAR(255);
      v_data_before JSONB;
      v_data_after JSONB;
      v_company_id UUID;
      v_new_json JSONB;
      v_old_json JSONB;
    BEGIN
      IF TG_OP = 'INSERT' THEN
        v_action_type := 'INSERT';
        v_new_json := to_jsonb(NEW);
        v_record_id := (v_new_json->>'id');
        v_data_before := NULL;
        v_data_after := v_new_json;
      ELSIF TG_OP = 'UPDATE' THEN
        v_action_type := 'UPDATE';
        v_new_json := to_jsonb(NEW);
        v_old_json := to_jsonb(OLD);
        v_record_id := (v_new_json->>'id');
        v_data_before := v_old_json;
        v_data_after := v_new_json;
      ELSIF TG_OP = 'DELETE' THEN
        v_action_type := 'DELETE';
        v_old_json := to_jsonb(OLD);
        v_record_id := (v_old_json->>'id');
        v_data_before := v_old_json;
        v_data_after := NULL;
      END IF;

      -- Resolve company_id based on table structure
      IF TG_TABLE_NAME = 'companies' THEN
        v_company_id := COALESCE((v_new_json->>'id')::UUID, (v_old_json->>'id')::UUID);
      ELSIF v_new_json IS NOT NULL AND v_new_json ? 'company_id' THEN
        v_company_id := (v_new_json->>'company_id')::UUID;
      ELSIF v_old_json IS NOT NULL AND v_old_json ? 'company_id' THEN
        v_company_id := (v_old_json->>'company_id')::UUID;
      ELSIF v_new_json IS NOT NULL AND v_new_json ? 'invoice_id' THEN
        -- For invoice_items: lookup company_id from parent invoice
        SELECT i.company_id INTO v_company_id
        FROM invoices i WHERE i.id = (v_new_json->>'invoice_id')::UUID;
      ELSIF v_old_json IS NOT NULL AND v_old_json ? 'invoice_id' THEN
        SELECT i.company_id INTO v_company_id
        FROM invoices i WHERE i.id = (v_old_json->>'invoice_id')::UUID;
      END IF;

      INSERT INTO audit_log (action_type, table_name, record_id, data_before, data_after, company_id)
      VALUES (v_action_type, TG_TABLE_NAME, v_record_id, v_data_before, v_data_after, v_company_id);

      IF TG_OP = 'DELETE' THEN
        RETURN OLD;
      END IF;
      RETURN NEW;
    END;
    $fn$
  `);
  console.log('  OK');

  // Test: insert a test item to verify trigger works
  console.log('\n2. Testing INSERT into invoice_items...');
  const inv = '55a754e9-93c4-473c-873d-1bbf77b61a23';
  const testResult = await q(`
    INSERT INTO invoice_items (invoice_id, code, name, type, price, quantity, unit, tax_group, specific_tax, discount, amount_ht, amount_tva, amount_psvb, amount_ttc, sort_order)
    VALUES ('${inv}', 'TEST-002', 'Test Brique', 'LOCBIE', 350, 4, 'unité', 'B', 0, 0, 1186.44, 213.56, 0, 1400, 0)
    RETURNING id, name, amount_ttc
  `);
  console.log('  OK:', JSON.stringify(testResult.rows));

  // Clean up test item
  console.log('\n3. Cleaning up test items...');
  await q(`DELETE FROM invoice_items WHERE invoice_id = '${inv}' AND code LIKE 'TEST-%'`);
  console.log('  OK');

  // Verify audit_log was populated
  console.log('\n4. Checking recent audit_log entries for invoice_items...');
  const audit = await q(`SELECT id, action_type, table_name, record_id, company_id FROM audit_log WHERE table_name = 'invoice_items' ORDER BY id DESC LIMIT 3`);
  console.log('  ', JSON.stringify(audit.rows, null, 2));
}

run().catch(err => console.error('FAILED:', err.message));
