-- Migration: Séquence DB factures ininterrompue par type+année
-- Réf. Spéc. SFE §2.18

CREATE TABLE IF NOT EXISTS invoice_sequences (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_type varchar(5) NOT NULL,
  year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  UNIQUE(company_id, invoice_type, year)
);

ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_sequences_company_isolation" ON invoice_sequences
  FOR ALL USING (company_id::text = get_user_company_id());

-- Fonction atomique d'incrémentation (pas de trou dans la séquence)
CREATE OR REPLACE FUNCTION next_invoice_reference(
  p_company_id uuid,
  p_type varchar,
  p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_next integer;
BEGIN
  INSERT INTO invoice_sequences (company_id, invoice_type, year, last_number)
  VALUES (p_company_id, p_type, p_year, 1)
  ON CONFLICT (company_id, invoice_type, year)
  DO UPDATE SET last_number = invoice_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN p_type || '-' || p_year::text || '-' || LPAD(v_next::text, 5, '0');
END;
$$;
