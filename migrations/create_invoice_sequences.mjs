const API = 'https://gfe4bd9y.eu-central.insforge.app/api/database/advance/rawsql';
const KEY = 'ik_1358be6dcbccff7c0d6636b011559406';

const queries = [
  // Step 1: Create table
  `CREATE TABLE IF NOT EXISTS invoice_sequences (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid NOT NULL REFERENCES companies(id),
    type varchar(5) NOT NULL,
    year integer NOT NULL,
    last_number integer NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(company_id, type, year)
  )`,
  // Step 2: Enable RLS
  `ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY`,
  // Step 3: RLS policy
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'invoice_sequences_company') THEN
      CREATE POLICY invoice_sequences_company ON invoice_sequences FOR ALL USING (company_id = get_user_company_id());
    END IF;
  END $$`,
  // Step 4: Atomic sequence function (SECURITY DEFINER bypasses RLS)
  `CREATE OR REPLACE FUNCTION next_invoice_reference(p_company_id uuid, p_type varchar, p_year integer)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $fn$
  DECLARE
    v_num integer;
  BEGIN
    INSERT INTO invoice_sequences(company_id, type, year, last_number)
    VALUES (p_company_id, p_type, p_year, 1)
    ON CONFLICT (company_id, type, year)
    DO UPDATE SET last_number = invoice_sequences.last_number + 1, updated_at = now()
    RETURNING last_number INTO v_num;
    RETURN p_type || '-' || p_year || '-' || lpad(v_num::text, 5, '0');
  END;
  $fn$`,
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
    if (res.status >= 400) { console.error('FAILED'); process.exit(1); }
  }
  console.log('All steps completed.');
}

run().catch(console.error);
