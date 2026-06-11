-- =============================================================================
-- WIMRUX® FINANCES — DUMP STRUCTURE (Partie 5: Mobile Money et Wallet)
-- Date: 2026-06-08
-- =============================================================================

-- =============================================================================
-- TABLE: mobile_wallets
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.mobile_wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    provider character varying(30) NOT NULL,
    phone_number character varying(20) NOT NULL,
    account_name character varying(255),
    current_balance numeric DEFAULT 0,
    treasury_account_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX mobile_wallets_pkey ON public.mobile_wallets USING btree (id);
CREATE UNIQUE INDEX mobile_wallets_company_id_provider_phone_number_key ON public.mobile_wallets USING btree (company_id, provider, phone_number);

ALTER TABLE public.mobile_wallets ADD CONSTRAINT mobile_wallets_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.mobile_wallets ADD CONSTRAINT mobile_wallets_treasury_account_id_fkey 
    FOREIGN KEY (treasury_account_id) REFERENCES public.treasury_accounts(id);

ALTER TABLE public.mobile_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY mobile_wallets_company ON public.mobile_wallets FOR ALL TO public 
    USING (company_id IN (SELECT user_profiles.company_id FROM user_profiles WHERE user_profiles.user_id = auth.uid()));

CREATE TRIGGER mobile_wallets_updated_at BEFORE UPDATE ON public.mobile_wallets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: wallet_transactions
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    external_transaction_id character varying(255),
    external_reference character varying(255),
    direction character varying(10) NOT NULL,
    operation_type character varying(30) NOT NULL,
    amount numeric NOT NULL,
    fees numeric DEFAULT 0,
    currency character varying(3) NOT NULL,
    counterparty_name character varying(255),
    counterparty_identifier character varying(100),
    counterparty_wallet_type character varying(30),
    counterparty_country character varying(3),
    transaction_date timestamp with time zone NOT NULL,
    value_date date,
    label text NOT NULL,
    description text,
    raw_payload jsonb,
    source_channel character varying(30) NOT NULL,
    source_evidence_id uuid,
    ingestion_batch_id uuid,
    confidence_score numeric,
    needs_human_review boolean DEFAULT false,
    reconciliation_status character varying(20) DEFAULT 'unreconciled'::character varying,
    matched_invoice_id uuid,
    matched_invoice_payment_id uuid,
    matched_treasury_movement_id uuid,
    category_id uuid,
    dedup_hash text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX wallet_transactions_pkey ON public.wallet_transactions USING btree (id);
CREATE UNIQUE INDEX wallet_transactions_wallet_id_dedup_hash_key ON public.wallet_transactions USING btree (wallet_id, dedup_hash);
CREATE INDEX idx_wallet_tx_company ON public.wallet_transactions USING btree (company_id);
CREATE INDEX idx_wallet_tx_date ON public.wallet_transactions USING btree (transaction_date DESC);
CREATE INDEX idx_wallet_tx_external ON public.wallet_transactions USING btree (external_transaction_id);
CREATE INDEX idx_wallet_tx_recon ON public.wallet_transactions USING btree (reconciliation_status);
CREATE INDEX idx_wallet_tx_wallet ON public.wallet_transactions USING btree (wallet_id);

ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES public.transaction_categories(id);
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_matched_invoice_id_fkey 
    FOREIGN KEY (matched_invoice_id) REFERENCES public.invoices(id);
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_matched_treasury_movement_id_fkey 
    FOREIGN KEY (matched_treasury_movement_id) REFERENCES public.treasury_movements(id);
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_source_evidence_id_fkey 
    FOREIGN KEY (source_evidence_id) REFERENCES public.payment_evidences(id);
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_wallet_id_fkey 
    FOREIGN KEY (wallet_id) REFERENCES public.payment_wallets(id) ON DELETE CASCADE;

CREATE TRIGGER wallet_transactions_updated_at BEFORE UPDATE ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: mobile_wallet_transactions
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.mobile_wallet_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    wallet_id uuid NOT NULL,
    external_transaction_id character varying(255),
    direction character varying(10) NOT NULL,
    amount numeric NOT NULL,
    fees numeric DEFAULT 0,
    balance_after numeric,
    transaction_date timestamp with time zone NOT NULL,
    label text NOT NULL,
    raw_sms text,
    parsed_confidence numeric,
    reconciliation_status character varying(20) DEFAULT 'unreconciled'::character varying,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_mobile_wallet_tx_company ON public.mobile_wallet_transactions USING btree (company_id, transaction_date);
CREATE INDEX idx_mobile_wallet_tx_wallet ON public.mobile_wallet_transactions USING btree (wallet_id, transaction_date);

ALTER TABLE public.mobile_wallet_transactions ADD CONSTRAINT mobile_wallet_transactions_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.mobile_wallet_transactions ADD CONSTRAINT mobile_wallet_transactions_wallet_id_fkey 
    FOREIGN KEY (wallet_id) REFERENCES public.mobile_wallets(id) ON DELETE CASCADE;

-- =============================================================================
-- TABLE: payment_providers (opérateurs MNO)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code character varying(30) NOT NULL,
    name character varying(100) NOT NULL,
    country_codes character varying(3)[] DEFAULT '{}'::character varying[],
    type character varying(30) DEFAULT 'mobile_money'::character varying,
    is_active boolean DEFAULT true,
    supported_operations character varying(50)[] DEFAULT '{}'::character varying[],
    created_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX payment_providers_code_key ON public.payment_providers USING btree (code);
CREATE INDEX idx_payment_providers_country ON public.payment_providers USING gin (country_codes);

-- =============================================================================
-- TABLE: bank_transactions
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.bank_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    bank_account_id uuid NOT NULL,
    external_transaction_id character varying(255),
    transaction_date date NOT NULL,
    value_date date,
    label text NOT NULL,
    reference character varying(255),
    amount numeric NOT NULL,
    currency character varying(3) DEFAULT 'XOF'::character varying,
    direction character varying(10) NOT NULL,
    raw_data jsonb,
    reconciliation_status character varying(20) DEFAULT 'unreconciled'::character varying,
    matched_invoice_id uuid,
    matched_treasury_movement_id uuid,
    category_id uuid,
    import_batch_id uuid,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_bank_transactions_account ON public.bank_transactions USING btree (bank_account_id, transaction_date);
CREATE INDEX idx_bank_transactions_company ON public.bank_transactions USING btree (company_id, transaction_date);
CREATE INDEX idx_bank_transactions_recon ON public.bank_transactions USING btree (reconciliation_status);

ALTER TABLE public.bank_transactions ADD CONSTRAINT bank_transactions_bank_account_id_fkey 
    FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id) ON DELETE CASCADE;
ALTER TABLE public.bank_transactions ADD CONSTRAINT bank_transactions_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.bank_transactions ADD CONSTRAINT bank_transactions_matched_invoice_id_fkey 
    FOREIGN KEY (matched_invoice_id) REFERENCES public.invoices(id);
ALTER TABLE public.bank_transactions ADD CONSTRAINT bank_transactions_matched_treasury_movement_id_fkey 
    FOREIGN KEY (matched_treasury_movement_id) REFERENCES public.treasury_movements(id);

ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_transactions_company ON public.bank_transactions FOR ALL TO public USING (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: bank_statement_imports
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.bank_statement_imports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    bank_account_id uuid NOT NULL,
    source_file_url text,
    source_format character varying(20),
    date_from date,
    date_to date,
    total_transactions integer,
    imported_transactions integer,
    status character varying(20) DEFAULT 'pending'::character varying,
    error_message text,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_bank_statement_imports_company ON public.bank_statement_imports USING btree (company_id, created_at);

ALTER TABLE public.bank_statement_imports ADD CONSTRAINT bank_statement_imports_bank_account_id_fkey 
    FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);

ALTER TABLE public.bank_statement_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_statement_imports_company ON public.bank_statement_imports FOR ALL TO public USING (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: reconciliation_rules
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.reconciliation_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    pattern_label character varying(255) NOT NULL,
    pattern_amount_min numeric,
    pattern_amount_max numeric,
    category_id uuid,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_reconciliation_rules_company ON public.reconciliation_rules USING btree (company_id, is_active);

ALTER TABLE public.reconciliation_rules ADD CONSTRAINT reconciliation_rules_category_id_fkey 
    FOREIGN KEY (category_id) REFERENCES public.transaction_categories(id);
ALTER TABLE public.reconciliation_rules ADD CONSTRAINT reconciliation_rules_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.reconciliation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY reconciliation_rules_company ON public.reconciliation_rules FOR ALL TO public USING (company_id = get_user_company_id());

CREATE TRIGGER reconciliation_rules_updated_at BEFORE UPDATE ON public.reconciliation_rules FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: treasury_movements
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.treasury_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    treasury_account_id uuid NOT NULL,
    movement_date date NOT NULL,
    label text NOT NULL,
    description text,
    amount numeric NOT NULL,
    direction character varying(10) NOT NULL,
    reference character varying(255),
    bank_transaction_id uuid,
    wallet_transaction_id uuid,
    invoice_payment_id uuid,
    is_reconciled boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_treasury_movements_account ON public.treasury_movements USING btree (treasury_account_id, movement_date);
CREATE INDEX idx_treasury_movements_company ON public.treasury_movements USING btree (company_id, movement_date);

ALTER TABLE public.treasury_movements ADD CONSTRAINT treasury_movements_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.treasury_movements ADD CONSTRAINT treasury_movements_treasury_account_id_fkey 
    FOREIGN KEY (treasury_account_id) REFERENCES public.treasury_accounts(id) ON DELETE CASCADE;

ALTER TABLE public.treasury_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY treasury_movements_company ON public.treasury_movements FOR ALL TO public USING (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: petty_cash_accounts
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.petty_cash_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    current_balance numeric DEFAULT 0,
    limit_amount numeric DEFAULT 0,
    responsible_user_id character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_petty_cash_accounts_company ON public.petty_cash_accounts USING btree (company_id);

ALTER TABLE public.petty_cash_accounts ADD CONSTRAINT petty_cash_accounts_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.petty_cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY petty_cash_accounts_company ON public.petty_cash_accounts FOR ALL TO public USING (company_id = get_user_company_id());

CREATE TRIGGER petty_cash_accounts_updated_at BEFORE UPDATE ON public.petty_cash_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: petty_cash_movements
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.petty_cash_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    petty_cash_account_id uuid NOT NULL,
    movement_date date NOT NULL,
    description text NOT NULL,
    amount numeric NOT NULL,
    direction character varying(10) NOT NULL,
    category_id uuid,
    receipt_url text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_petty_cash_movements_account ON public.petty_cash_movements USING btree (petty_cash_account_id, movement_date);

ALTER TABLE public.petty_cash_movements ADD CONSTRAINT petty_cash_movements_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.petty_cash_movements ADD CONSTRAINT petty_cash_movements_petty_cash_account_id_fkey 
    FOREIGN KEY (petty_cash_account_id) REFERENCES public.petty_cash_accounts(id) ON DELETE CASCADE;

ALTER TABLE public.petty_cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY petty_cash_movements_company ON public.petty_cash_movements FOR ALL TO public USING (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: checks
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.checks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    bank_account_id uuid NOT NULL,
    check_number character varying(50) NOT NULL,
    payee character varying(255),
    amount numeric NOT NULL,
    issue_date date NOT NULL,
    due_date date,
    status character varying(20) DEFAULT 'issued'::character varying,
    memo text,
    cleared_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_checks_bank_account ON public.checks USING btree (bank_account_id, issue_date);
CREATE INDEX idx_checks_company ON public.checks USING btree (company_id, status);
CREATE UNIQUE INDEX checks_company_check_number_key ON public.checks USING btree (company_id, check_number);

ALTER TABLE public.checks ADD CONSTRAINT checks_bank_account_id_fkey 
    FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);
ALTER TABLE public.checks ADD CONSTRAINT checks_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY checks_company ON public.checks FOR ALL TO public USING (company_id = get_user_company_id());

CREATE TRIGGER checks_updated_at BEFORE UPDATE ON public.checks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: wire_transfers (virements)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.wire_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    bank_account_id uuid NOT NULL,
    beneficiary_name character varying(255) NOT NULL,
    beneficiary_bank character varying(255),
    beneficiary_iban character varying(100),
    beneficiary_bic character varying(20),
    amount numeric NOT NULL,
    currency character varying(3) DEFAULT 'XOF'::character varying,
    reference character varying(255),
    status character varying(20) DEFAULT 'draft'::character varying,
    scheduled_date date,
    executed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_wire_transfers_account ON public.wire_transfers USING btree (bank_account_id, scheduled_date);
CREATE INDEX idx_wire_transfers_company ON public.wire_transfers USING btree (company_id, status);

ALTER TABLE public.wire_transfers ADD CONSTRAINT wire_transfers_bank_account_id_fkey 
    FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);
ALTER TABLE public.wire_transfers ADD CONSTRAINT wire_transfers_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.wire_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY wire_transfers_company ON public.wire_transfers FOR ALL TO public USING (company_id = get_user_company_id());

CREATE TRIGGER wire_transfers_updated_at BEFORE UPDATE ON public.wire_transfers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
