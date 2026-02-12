-- Migration: Dépôts et retraits de caisse
-- Réf. Spéc. SFE §2.35

ALTER TABLE treasury_movements ADD COLUMN IF NOT EXISTS movement_type varchar(10) 
  CHECK (movement_type IN ('DEPOT', 'RETRAIT', 'RECETTE', 'DEPENSE'));

COMMENT ON COLUMN treasury_movements.movement_type IS 'Type: DEPOT=dépôt caisse, RETRAIT=retrait caisse, RECETTE=encaissement, DEPENSE=décaissement';

-- Table A-Rapport (rapprochement fiscal)
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

CREATE POLICY "fiscal_a_reports_company_isolation" ON fiscal_a_reports
  FOR ALL USING (company_id::text = get_user_company_id());
