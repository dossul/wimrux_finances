-- =============================================================================
-- MIGRATION : 2026-05-23_001_sprint1_banque.sql
-- SPRINT 1 — MODULE BANQUE — WIMRUX FINANCES
-- Backend : gfe4bd9y.eu-central.insforge.app
-- =============================================================================
-- Tables créées :
--   bank_accounts, bank_transactions, transaction_categories,
--   bank_statement_imports, reconciliation_rules, wire_transfers, checks
-- Vues créées : (aucune — voir Sprint 6)
-- Fonctions créées : auto_reconcile()
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. TRANSACTION CATEGORIES (hiérarchique — doit être créée en premier)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_categories (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name           varchar(100) NOT NULL,
  code           varchar(20),
  type           varchar(20) CHECK (type IN ('income','expense','transfer','tax','bank_fee')),
  parent_id      uuid REFERENCES transaction_categories(id),
  color          varchar(7),  -- couleur HEX ex: #FF5733
  is_system      boolean DEFAULT false,
  created_at     timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tx_categories_company
  ON transaction_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_tx_categories_type
  ON transaction_categories(company_id, type);

ALTER TABLE transaction_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY transaction_categories_company_isolation
  ON transaction_categories FOR ALL TO public
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY transaction_categories_project_admin
  ON transaction_categories FOR ALL TO project_admin
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_audit_transaction_categories
  AFTER INSERT OR UPDATE OR DELETE ON transaction_categories
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- -----------------------------------------------------------------------------
-- 2. BANK ACCOUNTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_accounts (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_name            varchar(255) NOT NULL,
  bank_code            varchar(20),
  account_number       varchar(50) NOT NULL,
  iban                 varchar(50),
  bic                  varchar(20),
  currency             varchar(3) NOT NULL DEFAULT 'XOF',
  account_holder       varchar(255),
  opening_balance      numeric NOT NULL DEFAULT 0,
  current_balance      numeric NOT NULL DEFAULT 0,
  is_active            boolean NOT NULL DEFAULT true,
  treasury_account_id  uuid REFERENCES treasury_accounts(id),
  created_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_company
  ON bank_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active
  ON bank_accounts(company_id, is_active);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_accounts_company_isolation
  ON bank_accounts FOR ALL TO public
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY bank_accounts_project_admin
  ON bank_accounts FOR ALL TO project_admin
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_audit_bank_accounts
  AFTER INSERT OR UPDATE OR DELETE ON bank_accounts
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- -----------------------------------------------------------------------------
-- 3. BANK TRANSACTIONS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_transactions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id         uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  company_id              uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  transaction_date        date NOT NULL,
  value_date              date,
  amount                  numeric NOT NULL,
  direction               varchar(10) NOT NULL CHECK (direction IN ('debit','credit')),
  label                   text NOT NULL,
  reference               varchar(100),
  category_id             uuid REFERENCES transaction_categories(id),
  reconciliation_status   varchar(20) NOT NULL DEFAULT 'unreconciled'
    CHECK (reconciliation_status IN ('unreconciled','matched','manual','ignored')),
  matched_invoice_id      uuid REFERENCES invoices(id),
  matched_movement_id     uuid REFERENCES treasury_movements(id),
  import_batch_id         uuid,
  raw_data                jsonb,
  created_at              timestamptz DEFAULT now(),
  -- Déduplication import
  UNIQUE(bank_account_id, transaction_date, amount, label)
);

CREATE INDEX IF NOT EXISTS idx_bank_tx_account
  ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_company
  ON bank_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_date
  ON bank_transactions(company_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_tx_reconciliation
  ON bank_transactions(company_id, reconciliation_status);
CREATE INDEX IF NOT EXISTS idx_bank_tx_category
  ON bank_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_bank_tx_batch
  ON bank_transactions(import_batch_id) WHERE import_batch_id IS NOT NULL;

ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_transactions_company_isolation
  ON bank_transactions FOR ALL TO public
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY bank_transactions_project_admin
  ON bank_transactions FOR ALL TO project_admin
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_audit_bank_transactions
  AFTER INSERT OR UPDATE OR DELETE ON bank_transactions
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- -----------------------------------------------------------------------------
-- 4. BANK STATEMENT IMPORTS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_statement_imports (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id  uuid NOT NULL REFERENCES bank_accounts(id),
  file_name        varchar(255),
  file_format      varchar(10) CHECK (file_format IN ('OFX','CSV','QIF','PDF','XLSX')),
  total_rows       integer DEFAULT 0,
  imported_rows    integer DEFAULT 0,
  duplicates_count integer DEFAULT 0,
  errors_count     integer DEFAULT 0,
  status           varchar(20) DEFAULT 'pending'
    CHECK (status IN ('pending','processing','completed','failed')),
  imported_by      varchar(255),
  file_url         text,  -- URL storage invoices-pdf/bank-statements/
  error_details    jsonb,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bank_imports_company
  ON bank_statement_imports(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_imports_account
  ON bank_statement_imports(bank_account_id);

ALTER TABLE bank_statement_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY bank_imports_company_isolation
  ON bank_statement_imports FOR ALL TO public
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY bank_imports_project_admin
  ON bank_statement_imports FOR ALL TO project_admin
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_audit_bank_statement_imports
  AFTER INSERT OR UPDATE OR DELETE ON bank_statement_imports
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- -----------------------------------------------------------------------------
-- 5. RECONCILIATION RULES
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reconciliation_rules (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id           uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name                 varchar(100) NOT NULL,
  pattern_label        text,
  pattern_amount_min   numeric,
  pattern_amount_max   numeric,
  category_id          uuid REFERENCES transaction_categories(id),
  auto_match_invoice   boolean DEFAULT false,
  priority             integer DEFAULT 100,
  is_active            boolean DEFAULT true,
  created_at           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recon_rules_company
  ON reconciliation_rules(company_id, is_active);

ALTER TABLE reconciliation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY reconciliation_rules_company_isolation
  ON reconciliation_rules FOR ALL TO public
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY reconciliation_rules_project_admin
  ON reconciliation_rules FOR ALL TO project_admin
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_audit_reconciliation_rules
  AFTER INSERT OR UPDATE OR DELETE ON reconciliation_rules
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- -----------------------------------------------------------------------------
-- 6. WIRE TRANSFERS (Ordres de virement)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wire_transfers (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reference               varchar(50) NOT NULL,
  source_bank_account_id  uuid NOT NULL REFERENCES bank_accounts(id),
  beneficiary_name        varchar(255) NOT NULL,
  beneficiary_iban        varchar(50),
  beneficiary_bic         varchar(20),
  beneficiary_bank        varchar(255),
  amount                  numeric NOT NULL CHECK (amount > 0),
  currency                varchar(3) DEFAULT 'XOF',
  motif                   text,
  status                  varchar(20) DEFAULT 'draft'
    CHECK (status IN ('draft','approved','sent','executed','failed','cancelled')),
  scheduled_date          date,
  executed_date           date,
  invoice_id              uuid REFERENCES invoices(id),
  created_by              varchar(255),
  approved_by             varchar(255),
  approved_at             timestamptz,
  sepa_xml_generated_at   timestamptz,
  created_at              timestamptz DEFAULT now(),
  UNIQUE(company_id, reference)
);

CREATE INDEX IF NOT EXISTS idx_wire_transfers_company
  ON wire_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_status
  ON wire_transfers(company_id, status);
CREATE INDEX IF NOT EXISTS idx_wire_transfers_account
  ON wire_transfers(source_bank_account_id);

ALTER TABLE wire_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY wire_transfers_company_isolation
  ON wire_transfers FOR ALL TO public
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY wire_transfers_project_admin
  ON wire_transfers FOR ALL TO project_admin
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_audit_wire_transfers
  AFTER INSERT OR UPDATE OR DELETE ON wire_transfers
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- -----------------------------------------------------------------------------
-- 7. CHECKS (Chèques)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checks (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type             varchar(10) NOT NULL CHECK (type IN ('emitted','received')),
  check_number     varchar(50) NOT NULL,
  bank_account_id  uuid REFERENCES bank_accounts(id),
  amount           numeric NOT NULL CHECK (amount > 0),
  issue_date       date NOT NULL,
  due_date         date,
  beneficiary_name varchar(255),
  drawer_name      varchar(255),
  status           varchar(20) DEFAULT 'in_circulation'
    CHECK (status IN ('in_circulation','cashed','bounced','cancelled','endorsed')),
  cashed_date      date,
  invoice_id       uuid REFERENCES invoices(id),
  notes            text,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checks_company
  ON checks(company_id);
CREATE INDEX IF NOT EXISTS idx_checks_status
  ON checks(company_id, status);
CREATE INDEX IF NOT EXISTS idx_checks_due_date
  ON checks(company_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_checks_account
  ON checks(bank_account_id);

ALTER TABLE checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY checks_company_isolation
  ON checks FOR ALL TO public
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY checks_project_admin
  ON checks FOR ALL TO project_admin
  USING (true) WITH CHECK (true);

CREATE TRIGGER trg_audit_checks
  AFTER INSERT OR UPDATE OR DELETE ON checks
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- -----------------------------------------------------------------------------
-- 8. FONCTION RPC : auto_reconcile
-- Retourne les suggestions de rapprochement pour un compte
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auto_reconcile(p_bank_account_id uuid)
RETURNS TABLE(
  transaction_id  uuid,
  match_type      text,
  match_id        uuid,
  score           integer,
  match_label     text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Règle 1 : Match exact par reference → score 100
  RETURN QUERY
  SELECT
    bt.id AS transaction_id,
    'exact_reference'::text AS match_type,
    i.id AS match_id,
    100 AS score,
    i.reference AS match_label
  FROM bank_transactions bt
  JOIN invoices i ON i.reference = bt.reference
    AND i.company_id = bt.company_id
  WHERE bt.bank_account_id = p_bank_account_id
    AND bt.reconciliation_status = 'unreconciled'
    AND bt.reference IS NOT NULL;

  -- Règle 2 : Match montant + date ±3 jours → score 80
  RETURN QUERY
  SELECT
    bt.id AS transaction_id,
    'amount_date'::text AS match_type,
    i.id AS match_id,
    80 AS score,
    i.reference AS match_label
  FROM bank_transactions bt
  JOIN invoices i ON ABS(i.total_ttc - ABS(bt.amount)) <= 1
    AND ABS(EXTRACT(EPOCH FROM (bt.transaction_date::timestamptz - i.certification_datetime)) / 86400) <= 3
    AND i.company_id = bt.company_id
    AND i.status = 'certified'
  WHERE bt.bank_account_id = p_bank_account_id
    AND bt.reconciliation_status = 'unreconciled'
    AND i.id NOT IN (
      SELECT matched_invoice_id FROM bank_transactions
      WHERE matched_invoice_id IS NOT NULL
        AND bank_account_id = p_bank_account_id
    );
END;
$$;

-- -----------------------------------------------------------------------------
-- 9. DONNÉES DE SEED — Catégories système par défaut
-- (seront créées par l'application au premier login d'une entreprise)
-- Commentées — à activer si seed global souhaité
-- -----------------------------------------------------------------------------
-- INSERT INTO transaction_categories (company_id, name, code, type, is_system, color)
-- VALUES
--   (<company_id>, 'Tenue de compte', 'BANK_FEE_001', 'bank_fee', true, '#FF6B6B'),
--   (<company_id>, 'Frais de virement', 'BANK_FEE_002', 'bank_fee', true, '#FF8E53'),
--   (<company_id>, 'Frais carte', 'BANK_FEE_003', 'bank_fee', true, '#FFA62B'),
--   (<company_id>, 'Agios', 'BANK_FEE_004', 'bank_fee', true, '#FFD93D'),
--   (<company_id>, 'Ventes', 'INCOME_001', 'income', true, '#6BCB77'),
--   (<company_id>, 'Achats fournisseurs', 'EXP_001', 'expense', true, '#4D96FF');

COMMIT;

-- =============================================================================
-- VÉRIFICATION POST-MIGRATION
-- Exécuter pour confirmer la création :
-- =============================================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN (
--   'bank_accounts', 'bank_transactions', 'transaction_categories',
--   'bank_statement_imports', 'reconciliation_rules', 'wire_transfers', 'checks'
-- );
