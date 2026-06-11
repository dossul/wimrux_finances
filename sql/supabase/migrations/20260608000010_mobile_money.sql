-- =============================================================================
-- WIMRUX® FINANCES → SUPABASE MIGRATION
-- Migration 10: Mobile money, caisse, chèques, virements
-- =============================================================================

-- =============================================================================
-- TABLE: mobile_wallets
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.mobile_wallets (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    provider            character varying(30) NOT NULL,
    phone_number        character varying(20) NOT NULL,
    account_name        character varying(255),
    current_balance     numeric DEFAULT 0,
    treasury_account_id uuid REFERENCES public.treasury_accounts(id),
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    UNIQUE (company_id, provider, phone_number)
);

ALTER TABLE public.mobile_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mobile_wallets_company" ON public.mobile_wallets FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER mobile_wallets_updated_at BEFORE UPDATE ON public.mobile_wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- TABLE: wallet_transactions (transactions via payment_wallets)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
    id                           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id                   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    wallet_id                    uuid NOT NULL REFERENCES public.payment_wallets(id) ON DELETE CASCADE,
    external_transaction_id      character varying(255),
    external_reference           character varying(255),
    direction                    character varying(10) NOT NULL,
    operation_type               character varying(30) NOT NULL,
    amount                       numeric NOT NULL,
    fees                         numeric DEFAULT 0,
    currency                     character varying(3) NOT NULL,
    counterparty_name            character varying(255),
    counterparty_identifier      character varying(100),
    counterparty_wallet_type     character varying(30),
    counterparty_country         character varying(3),
    transaction_date             timestamptz NOT NULL,
    value_date                   date,
    label                        text NOT NULL,
    description                  text,
    raw_payload                  jsonb,
    source_channel               character varying(30) NOT NULL,
    source_evidence_id           uuid REFERENCES public.payment_evidences(id),
    ingestion_batch_id           uuid,
    confidence_score             numeric,
    needs_human_review           boolean DEFAULT false,
    reconciliation_status        character varying(20) DEFAULT 'unreconciled',
    matched_invoice_id           uuid REFERENCES public.invoices(id),
    matched_invoice_payment_id   uuid REFERENCES public.invoice_payments(id),
    matched_treasury_movement_id uuid REFERENCES public.treasury_movements(id),
    category_id                  uuid REFERENCES public.transaction_categories(id),
    dedup_hash                   text NOT NULL,
    created_at                   timestamptz DEFAULT now(),
    updated_at                   timestamptz DEFAULT now(),
    UNIQUE (wallet_id, dedup_hash)
);

CREATE INDEX idx_wallet_tx_company  ON public.wallet_transactions (company_id);
CREATE INDEX idx_wallet_tx_wallet   ON public.wallet_transactions (wallet_id);
CREATE INDEX idx_wallet_tx_date     ON public.wallet_transactions (transaction_date DESC);
CREATE INDEX idx_wallet_tx_recon    ON public.wallet_transactions (reconciliation_status);
CREATE INDEX idx_wallet_tx_external ON public.wallet_transactions (external_transaction_id);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wallet_transactions_company" ON public.wallet_transactions FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER wallet_transactions_updated_at BEFORE UPDATE ON public.wallet_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Compléter la FK treasury_movements.wallet_transaction_id
ALTER TABLE public.treasury_movements
    ADD CONSTRAINT treasury_movements_wallet_transaction_id_fkey
    FOREIGN KEY (wallet_transaction_id)
    REFERENCES public.wallet_transactions(id);

-- =============================================================================
-- TABLE: mobile_wallet_transactions (transactions SMS mobile money brutes)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.mobile_wallet_transactions (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    wallet_id               uuid NOT NULL REFERENCES public.mobile_wallets(id) ON DELETE CASCADE,
    external_transaction_id character varying(255),
    direction               character varying(10) NOT NULL,
    amount                  numeric NOT NULL,
    fees                    numeric DEFAULT 0,
    balance_after           numeric,
    transaction_date        timestamptz NOT NULL,
    label                   text NOT NULL,
    raw_sms                 text,
    parsed_confidence       numeric,
    reconciliation_status   character varying(20) DEFAULT 'unreconciled',
    created_at              timestamptz DEFAULT now()
);

CREATE INDEX idx_mobile_wallet_tx_company ON public.mobile_wallet_transactions (company_id, transaction_date);
CREATE INDEX idx_mobile_wallet_tx_wallet  ON public.mobile_wallet_transactions (wallet_id, transaction_date);

ALTER TABLE public.mobile_wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mobile_wallet_tx_company" ON public.mobile_wallet_transactions FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: petty_cash_accounts (caisses)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.petty_cash_accounts (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name                character varying(255) NOT NULL,
    current_balance     numeric DEFAULT 0,
    limit_amount        numeric DEFAULT 0,
    responsible_user_id character varying(255),
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now()
);

CREATE INDEX idx_petty_cash_accounts_company ON public.petty_cash_accounts (company_id);

ALTER TABLE public.petty_cash_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "petty_cash_accounts_company" ON public.petty_cash_accounts FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER petty_cash_accounts_updated_at BEFORE UPDATE ON public.petty_cash_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- TABLE: petty_cash_movements
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.petty_cash_movements (
    id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id              uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    petty_cash_account_id   uuid NOT NULL REFERENCES public.petty_cash_accounts(id) ON DELETE CASCADE,
    movement_date           date NOT NULL,
    description             text NOT NULL,
    amount                  numeric NOT NULL,
    direction               character varying(10) NOT NULL,
    category_id             uuid REFERENCES public.transaction_categories(id),
    receipt_url             text,
    created_at              timestamptz DEFAULT now()
);

CREATE INDEX idx_petty_cash_movements_account ON public.petty_cash_movements (petty_cash_account_id, movement_date);

ALTER TABLE public.petty_cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "petty_cash_movements_company" ON public.petty_cash_movements FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: checks (chèques)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.checks (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    bank_account_id  uuid NOT NULL REFERENCES public.bank_accounts(id),
    check_number     character varying(50) NOT NULL,
    payee            character varying(255),
    amount           numeric NOT NULL,
    issue_date       date NOT NULL,
    due_date         date,
    status           character varying(20) DEFAULT 'issued',
    memo             text,
    cleared_at       timestamptz,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now(),
    UNIQUE (company_id, check_number)
);

CREATE INDEX idx_checks_company      ON public.checks (company_id, status);
CREATE INDEX idx_checks_bank_account ON public.checks (bank_account_id, issue_date);

ALTER TABLE public.checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checks_company" ON public.checks FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER checks_updated_at BEFORE UPDATE ON public.checks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- TABLE: wire_transfers (virements bancaires)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.wire_transfers (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id         uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    bank_account_id    uuid NOT NULL REFERENCES public.bank_accounts(id),
    beneficiary_name   character varying(255) NOT NULL,
    beneficiary_bank   character varying(255),
    beneficiary_iban   character varying(100),
    beneficiary_bic    character varying(20),
    amount             numeric NOT NULL,
    currency           character varying(3) DEFAULT 'XOF',
    reference          character varying(255),
    status             character varying(20) DEFAULT 'draft',
    scheduled_date     date,
    executed_at        timestamptz,
    created_at         timestamptz DEFAULT now(),
    updated_at         timestamptz DEFAULT now()
);

CREATE INDEX idx_wire_transfers_company ON public.wire_transfers (company_id, status);
CREATE INDEX idx_wire_transfers_account ON public.wire_transfers (bank_account_id, scheduled_date);

ALTER TABLE public.wire_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wire_transfers_company" ON public.wire_transfers FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER wire_transfers_updated_at BEFORE UPDATE ON public.wire_transfers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
