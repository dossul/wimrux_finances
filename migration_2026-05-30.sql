-- =====================================================
-- WIMRUX FINANCES — Migration 2026-05-30
-- Nouvelles colonnes fournisseurs + factures
-- =====================================================

-- Fournisseurs : champs fiscaux et classification
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS regime_fiscal    VARCHAR(10);   -- RNI, RSI, CME, CSE, RND
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS division_fiscale VARCHAR(30);   -- DME-CV, DGE, DME-Centre...
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_code    VARCHAR(30);   -- code interne
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_type    VARCHAR(10) DEFAULT 'local'; -- local, foreign

-- Factures : IFU client (obligation légale BF)
ALTER TABLE invoices  ADD COLUMN IF NOT EXISTS client_ifu       VARCHAR(20);   -- IFU du client destinataire

-- Table des régimes fiscaux par pays (multi-SaaS)
CREATE TABLE IF NOT EXISTS fiscal_regimes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code    CHAR(2)       NOT NULL,
  code            VARCHAR(10)   NOT NULL,
  label           VARCHAR(100)  NOT NULL,
  tva_applicable  BOOLEAN       NOT NULL DEFAULT false,
  description     TEXT,
  ca_min          BIGINT,
  ca_max          BIGINT,
  actif           BOOLEAN       NOT NULL DEFAULT true,
  UNIQUE(country_code, code)
);

-- Données Burkina Faso
INSERT INTO fiscal_regimes (country_code, code, label, tva_applicable, description, ca_min, ca_max)
VALUES
  ('BF','RNI','Réel Normal d''Imposition',         true,  'CA ≥ 50 000 000 FCFA — TVA 18% obligatoire', 50000000, NULL),
  ('BF','RSI','Réel Simplifié d''Imposition',       false, 'CA 15M à < 50M FCFA — TVA non autorisée',   15000000, 49999999),
  ('BF','CME','Contribution des Micro-Entreprises', false, 'CA < 15 000 000 FCFA — TVA non autorisée',  0,         14999999),
  ('BF','CSE','Contribution du Secteur Élevage',    false, 'Bétail, volaille, pêche, aquaculture',      NULL,      NULL),
  ('BF','RND','Régime Non Déterminé',               false, 'ONG, associations, admins, diplomatiques',  NULL,      NULL)
ON CONFLICT (country_code, code) DO NOTHING;
