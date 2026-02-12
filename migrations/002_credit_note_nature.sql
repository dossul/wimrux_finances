-- Migration: Nature d'avoir obligatoire (COR/RAN/RAM/RRR)
-- Réf. Spéc. SFE §2.28-2.29

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS credit_note_nature varchar(3) CHECK (
  credit_note_nature IS NULL OR credit_note_nature IN ('COR', 'RAN', 'RAM', 'RRR')
);

COMMENT ON COLUMN invoices.credit_note_nature IS 'Nature avoir: COR=Correction, RAN=Annulation sans livraison, RAM=Après livraison, RRR=Rabais/Remise/Ristourne';

-- Migration: Articles / Inventaire
-- Réf. Spéc. SFE §2.19-2.20

CREATE TABLE IF NOT EXISTS articles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code varchar(50) NOT NULL,
  name varchar(255) NOT NULL,
  type varchar(10) NOT NULL CHECK (type IN ('LOCBIE', 'LOCSER', 'IMPBIE', 'IMPSER')),
  unit varchar(30) NOT NULL DEFAULT 'unité',
  unit_price numeric(15,2) NOT NULL DEFAULT 0,
  tax_group varchar(1) NOT NULL DEFAULT 'B',
  specific_tax numeric(15,2) NOT NULL DEFAULT 0,
  stock_quantity numeric(15,3) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, code)
);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "articles_company_isolation" ON articles
  FOR ALL USING (company_id::text = get_user_company_id());
