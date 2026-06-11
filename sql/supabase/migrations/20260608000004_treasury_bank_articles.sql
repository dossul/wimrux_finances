-- =============================================================================
-- WIMRUX® FINANCES → SUPABASE MIGRATION
-- Migration 04: Trésorerie, comptes bancaires, articles, catégories, wallets,
--               preuves de paiement, appareils de certification
-- =============================================================================

-- =============================================================================
-- TABLE: treasury_accounts
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.treasury_accounts (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name             character varying(255) NOT NULL,
    type             character varying(50) NOT NULL,
    parent_id        uuid REFERENCES public.treasury_accounts(id),
    opening_balance  numeric NOT NULL DEFAULT 0,
    current_balance  numeric NOT NULL DEFAULT 0,
    is_active        boolean NOT NULL DEFAULT true,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

ALTER TABLE public.treasury_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "treasury_accounts_company" ON public.treasury_accounts FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER treasury_accounts_updated_at BEFORE UPDATE ON public.treasury_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- TABLE: bank_accounts
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    bank_name            character varying(255) NOT NULL,
    bank_code            character varying(20),
    account_number       character varying(50) NOT NULL,
    iban                 character varying(50),
    bic                  character varying(20),
    currency             character varying(3) NOT NULL DEFAULT 'XOF',
    account_holder       character varying(255),
    opening_balance      numeric NOT NULL DEFAULT 0,
    current_balance      numeric NOT NULL DEFAULT 0,
    is_active            boolean NOT NULL DEFAULT true,
    treasury_account_id  uuid REFERENCES public.treasury_accounts(id),
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now()
);

CREATE INDEX idx_bank_accounts_company ON public.bank_accounts (company_id);
CREATE INDEX idx_bank_accounts_active  ON public.bank_accounts (company_id, is_active);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bank_accounts_company" ON public.bank_accounts FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER trg_audit_bank_accounts AFTER INSERT OR UPDATE OR DELETE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
CREATE TRIGGER bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- TABLE: articles
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.articles (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id     uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    code           character varying(50) NOT NULL,
    name           character varying(255) NOT NULL,
    type           character varying(10) NOT NULL DEFAULT 'LOCBIE',
    tax_group      character varying(2) NOT NULL DEFAULT 'B',
    unit_price     numeric NOT NULL DEFAULT 0,
    specific_tax   numeric NOT NULL DEFAULT 0,
    is_active      boolean NOT NULL DEFAULT true,
    created_at     timestamptz NOT NULL DEFAULT now(),
    stock_quantity numeric DEFAULT 0,
    UNIQUE (company_id, code)
);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles_company" ON public.articles FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: transaction_categories
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.transaction_categories (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name         character varying(255) NOT NULL,
    type         character varying(20) NOT NULL,
    parent_id    uuid REFERENCES public.transaction_categories(id),
    account_code character varying(50),
    is_active    boolean DEFAULT true,
    created_at   timestamptz DEFAULT now(),
    updated_at   timestamptz DEFAULT now()
);

CREATE INDEX idx_transaction_categories_company ON public.transaction_categories (company_id);

ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transaction_categories_company" ON public.transaction_categories FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER transaction_categories_updated_at BEFORE UPDATE ON public.transaction_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- TABLE: payment_wallets
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.payment_wallets (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    provider             character varying(50) NOT NULL,
    account_identifier   character varying(100) NOT NULL,
    account_name         character varying(255),
    currency             character varying(3) DEFAULT 'XOF',
    is_active            boolean DEFAULT true,
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now(),
    UNIQUE (company_id, provider, account_identifier)
);

CREATE INDEX idx_payment_wallets_company ON public.payment_wallets (company_id);

ALTER TABLE public.payment_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_wallets_company" ON public.payment_wallets FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER payment_wallets_updated_at BEFORE UPDATE ON public.payment_wallets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- TABLE: payment_evidences
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.payment_evidences (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id     uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    source_type    character varying(50) NOT NULL,
    source_url     text,
    ocr_text       text,
    ocr_confidence jsonb,
    extracted_data jsonb,
    needs_review   boolean DEFAULT true,
    reviewed_by    character varying(255),
    reviewed_at    timestamptz,
    created_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_payment_evidences_company ON public.payment_evidences (company_id);

ALTER TABLE public.payment_evidences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_evidences_company" ON public.payment_evidences FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: certification_devices
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.certification_devices (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name            character varying(255) NOT NULL,
    device_type     character varying(50) NOT NULL,
    serial_number   character varying(100),
    api_key_hash    text,
    is_active       boolean DEFAULT true,
    last_seen_at    timestamptz,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_certification_devices_company ON public.certification_devices (company_id);

ALTER TABLE public.certification_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "certification_devices_company" ON public.certification_devices FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER certification_devices_updated_at BEFORE UPDATE ON public.certification_devices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
