-- =============================================================================
-- WIMRUX® FINANCES → SUPABASE MIGRATION
-- Migration 06: Transactions bancaires — résolution des FK circulaires
--
-- ⚠️  DÉPENDANCE CIRCULAIRE IDENTIFIÉE :
--   bank_transactions.matched_treasury_movement_id → treasury_movements(id)
--   treasury_movements.bank_transaction_id         → bank_transactions(id)
--
-- SOLUTION : créer les deux tables sans les FK croisées,
-- puis ajouter les FK via ALTER TABLE une fois les deux tables créées.
-- =============================================================================

-- =============================================================================
-- TABLE: payment_providers (opérateurs MNO — sans dépendances)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.payment_providers (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code                  character varying(30) NOT NULL UNIQUE,
    name                  character varying(100) NOT NULL,
    country_codes         character varying(3)[] DEFAULT '{}',
    type                  character varying(30) DEFAULT 'mobile_money',
    is_active             boolean DEFAULT true,
    supported_operations  character varying(50)[] DEFAULT '{}',
    created_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_payment_providers_country ON public.payment_providers USING gin(country_codes);

-- =============================================================================
-- TABLE: bank_transactions (sans FK → treasury_movements)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id                   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    bank_account_id              uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
    external_transaction_id      character varying(255),
    transaction_date             date NOT NULL,
    value_date                   date,
    label                        text NOT NULL,
    reference                    character varying(255),
    amount                       numeric NOT NULL,
    currency                     character varying(3) DEFAULT 'XOF',
    direction                    character varying(10) NOT NULL,
    raw_data                     jsonb,
    reconciliation_status        character varying(20) DEFAULT 'unreconciled',
    matched_invoice_id           uuid REFERENCES public.invoices(id),
    matched_treasury_movement_id uuid,          -- FK ajoutée après (cf. ci-dessous)
    category_id                  uuid REFERENCES public.transaction_categories(id),
    import_batch_id              uuid,
    created_at                   timestamptz DEFAULT now()
);

CREATE INDEX idx_bank_transactions_company ON public.bank_transactions (company_id, transaction_date);
CREATE INDEX idx_bank_transactions_account ON public.bank_transactions (bank_account_id, transaction_date);
CREATE INDEX idx_bank_transactions_recon   ON public.bank_transactions (reconciliation_status);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank_transactions_company" ON public.bank_transactions FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: treasury_movements (sans FK → bank_transactions)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.treasury_movements (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    treasury_account_id     uuid NOT NULL REFERENCES public.treasury_accounts(id) ON DELETE CASCADE,
    movement_date           date NOT NULL,
    label                   text NOT NULL,
    description             text,
    amount                  numeric NOT NULL,
    direction               character varying(10) NOT NULL,
    reference               character varying(255),
    bank_transaction_id     uuid,               -- FK ajoutée après (cf. ci-dessous)
    wallet_transaction_id   uuid,               -- FK ajoutée en migration 10
    invoice_payment_id      uuid,               -- FK ajoutée en migration 07
    is_reconciled           boolean DEFAULT false,
    created_at              timestamptz DEFAULT now()
);

CREATE INDEX idx_treasury_movements_company ON public.treasury_movements (company_id, movement_date);
CREATE INDEX idx_treasury_movements_account ON public.treasury_movements (treasury_account_id, movement_date);

ALTER TABLE public.treasury_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "treasury_movements_company" ON public.treasury_movements FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

-- =============================================================================
-- RÉSOLUTION FK CIRCULAIRE : ajouter les clés étrangères croisées
-- =============================================================================
ALTER TABLE public.bank_transactions
    ADD CONSTRAINT bank_transactions_matched_treasury_movement_id_fkey
    FOREIGN KEY (matched_treasury_movement_id)
    REFERENCES public.treasury_movements(id);

ALTER TABLE public.treasury_movements
    ADD CONSTRAINT treasury_movements_bank_transaction_id_fkey
    FOREIGN KEY (bank_transaction_id)
    REFERENCES public.bank_transactions(id);

-- =============================================================================
-- TABLE: bank_statement_imports
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bank_statement_imports (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id            uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    bank_account_id       uuid NOT NULL REFERENCES public.bank_accounts(id),
    source_file_url       text,
    source_format         character varying(20),
    date_from             date,
    date_to               date,
    total_transactions    integer,
    imported_transactions integer,
    status                character varying(20) DEFAULT 'pending',
    error_message         text,
    processed_at          timestamptz,
    created_at            timestamptz DEFAULT now()
);

CREATE INDEX idx_bank_statement_imports_company ON public.bank_statement_imports (company_id, created_at);

ALTER TABLE public.bank_statement_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank_statement_imports_company" ON public.bank_statement_imports FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: reconciliation_rules
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.reconciliation_rules (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name                character varying(255) NOT NULL,
    pattern_label       character varying(255) NOT NULL,
    pattern_amount_min  numeric,
    pattern_amount_max  numeric,
    category_id         uuid REFERENCES public.transaction_categories(id),
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_reconciliation_rules_company ON public.reconciliation_rules (company_id, is_active);

ALTER TABLE public.reconciliation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reconciliation_rules_company" ON public.reconciliation_rules FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER reconciliation_rules_updated_at BEFORE UPDATE ON public.reconciliation_rules FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- FONCTION: auto_reconcile (rapprochement bancaire automatique)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.auto_reconcile(p_bank_account_id uuid)
RETURNS TABLE(
    transaction_id uuid,
    match_type     text,
    match_id       uuid,
    score          int,
    match_label    text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id FROM public.bank_accounts WHERE id = p_bank_account_id;
  IF v_company_id IS NULL THEN RETURN; END IF;
  -- Règle 1: match exact par référence
  RETURN QUERY
  SELECT
    bt.id,
    'exact_reference'::text,
    inv.id,
    100::int,
    inv.reference || ' (' || inv.total_ttc::text || ' XOF)'
  FROM public.bank_transactions bt
  JOIN public.invoices inv
    ON LOWER(TRIM(bt.reference)) = LOWER(TRIM(inv.reference))
  WHERE bt.bank_account_id = p_bank_account_id
    AND bt.reconciliation_status = 'unreconciled'
    AND inv.company_id = v_company_id
    AND inv.status NOT IN ('draft','cancelled');
END;
$$;
