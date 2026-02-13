// Temporary script to apply SQL migrations via InsForge REST API
const API = 'https://gfe4bd9y.eu-central.insforge.app/api/database/advance/rawsql';
const KEY = 'ik_1358be6dcbccff7c0d6636b011559406';

const migrations = [
  {
    name: '001_invoice_sequences',
    query: `
CREATE TABLE IF NOT EXISTS invoice_sequences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_type varchar(5) NOT NULL,
  year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  UNIQUE(company_id, invoice_type, year)
);

ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'invoice_seq_company_isolation') THEN
    CREATE POLICY "invoice_seq_company_isolation" ON invoice_sequences FOR ALL USING (company_id = get_user_company_id()::uuid);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION next_invoice_reference(p_company_id uuid, p_type varchar, p_year integer)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE v_num integer;
BEGIN
  INSERT INTO invoice_sequences (company_id, invoice_type, year, last_number)
  VALUES (p_company_id, p_type, p_year, 1)
  ON CONFLICT (company_id, invoice_type, year)
  DO UPDATE SET last_number = invoice_sequences.last_number + 1
  RETURNING last_number INTO v_num;
  RETURN p_type || '-' || p_year::text || '-' || LPAD(v_num::text, 5, '0');
END; $$;
`
  },
  {
    name: '002_credit_note_nature',
    query: `
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS credit_note_nature varchar(3)
  CHECK (credit_note_nature IN ('COR', 'RAN', 'RAM', 'RRR'));

CREATE TABLE IF NOT EXISTS articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code varchar(50) NOT NULL,
  name varchar(255) NOT NULL,
  type varchar(10) NOT NULL DEFAULT 'LOCBIE',
  tax_group varchar(2) NOT NULL DEFAULT 'B',
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  specific_tax numeric(15,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'articles_company_isolation') THEN
    CREATE POLICY "articles_company_isolation" ON articles FOR ALL USING (company_id = get_user_company_id()::uuid);
  END IF;
END $$;
`
  },
  {
    name: '003_treasury_and_a_reports',
    query: `
ALTER TABLE treasury_movements ADD COLUMN IF NOT EXISTS movement_type varchar(10)
  CHECK (movement_type IN ('DEPOT', 'RETRAIT', 'RECETTE', 'DEPENSE'));

CREATE TABLE IF NOT EXISTS fiscal_a_reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_fv numeric(15,2) NOT NULL DEFAULT 0,
  total_ft numeric(15,2) NOT NULL DEFAULT 0,
  total_fa numeric(15,2) NOT NULL DEFAULT 0,
  total_ev numeric(15,2) NOT NULL DEFAULT 0,
  total_et numeric(15,2) NOT NULL DEFAULT 0,
  total_ea numeric(15,2) NOT NULL DEFAULT 0,
  total_ht numeric(15,2) NOT NULL DEFAULT 0,
  total_tva numeric(15,2) NOT NULL DEFAULT 0,
  total_psvb numeric(15,2) NOT NULL DEFAULT 0,
  total_ttc numeric(15,2) NOT NULL DEFAULT 0,
  total_stamp_duty numeric(15,2) NOT NULL DEFAULT 0,
  invoice_count integer NOT NULL DEFAULT 0,
  generated_by uuid,
  generated_at timestamptz NOT NULL DEFAULT now(),
  report_data jsonb,
  UNIQUE(company_id, period_start, period_end)
);

ALTER TABLE fiscal_a_reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'fiscal_a_reports_company_isolation') THEN
    CREATE POLICY "fiscal_a_reports_company_isolation" ON fiscal_a_reports FOR ALL USING (company_id = get_user_company_id()::uuid);
  END IF;
END $$;
`
  },
  {
    name: '004_create_bucket',
    query: `SELECT 1;`
  }
];

async function run() {
  for (const m of migrations) {
    if (m.name === '004_create_bucket') {
      // Create storage bucket via API
      try {
        const res = await fetch('https://gfe4bd9y.eu-central.insforge.app/api/storage/buckets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
          body: JSON.stringify({ bucketName: 'invoices-pdf', isPublic: true })
        });
        const txt = await res.text();
        console.log(`[${m.name}] ${res.status} — ${txt}`);
      } catch (e) { console.error(`[${m.name}] ERROR:`, e.message); }
      continue;
    }

    try {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': KEY },
        body: JSON.stringify({ query: m.query })
      });
      const data = await res.text();
      console.log(`[${m.name}] ${res.status} — ${data.substring(0, 200)}`);
    } catch (e) {
      console.error(`[${m.name}] ERROR:`, e.message);
    }
  }
}

run();
