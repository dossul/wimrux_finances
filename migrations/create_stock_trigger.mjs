const API = 'https://gfe4bd9y.eu-central.insforge.app/api/database/advance/rawsql';
const KEY = 'ik_1358be6dcbccff7c0d6636b011559406';

const queries = [
  // Step 1: Add stock_quantity column to articles if not exists
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='articles' AND column_name='stock_quantity') THEN
      ALTER TABLE articles ADD COLUMN stock_quantity numeric(12,2) DEFAULT 0;
    END IF;
  END $$`,

  // Step 2: Function to decrement stock after certification
  `CREATE OR REPLACE FUNCTION decrement_stock_on_certification()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $fn$
  BEGIN
    -- Only fire when status changes to 'certified'
    IF NEW.status = 'certified' AND (OLD.status IS DISTINCT FROM 'certified') THEN
      UPDATE articles a
      SET stock_quantity = GREATEST(a.stock_quantity - i.quantity, 0)
      FROM invoice_items i
      WHERE i.invoice_id = NEW.id
        AND a.company_id = NEW.company_id
        AND a.code = i.code;
    END IF;
    RETURN NEW;
  END;
  $fn$`,

  // Step 3: Create trigger on invoices
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_decrement_stock_on_certification') THEN
      CREATE TRIGGER trg_decrement_stock_on_certification
      AFTER UPDATE ON invoices
      FOR EACH ROW
      EXECUTE FUNCTION decrement_stock_on_certification();
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
    if (res.status >= 400) { console.error('FAILED'); process.exit(1); }
  }
  console.log('All steps completed.');
}

run().catch(console.error);
