-- =============================================================================
-- WIMRUX® FINANCES — DUMP STRUCTURE (Partie 2: Tables Core)
-- Date: 2026-06-08
-- =============================================================================

-- =============================================================================
-- TABLE: audit_log (logs d'audit)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id bigint PRIMARY KEY DEFAULT nextval('audit_log_id_seq'::regclass),
    user_id character varying(255),
    timestamp timestamp with time zone DEFAULT now(),
    action_type character varying(10) NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id character varying(255),
    data_before jsonb,
    data_after jsonb,
    ip_address character varying(45),
    company_id uuid
);

CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id);
CREATE INDEX idx_audit_log_company_id ON public.audit_log USING btree (company_id);
CREATE INDEX idx_audit_log_table_name ON public.audit_log USING btree (table_name);
CREATE INDEX idx_audit_log_timestamp ON public.audit_log USING btree ("timestamp");

ALTER TABLE public.audit_log ADD CONSTRAINT audit_log_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_insert ON public.audit_log FOR INSERT TO public WITH CHECK (true);
CREATE POLICY audit_log_select ON public.audit_log FOR SELECT TO public USING (company_id = get_user_company_id());

CREATE TRIGGER audit_realtime AFTER INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION notify_audit_entry();
CREATE TRIGGER trg_audit_log_immutable_delete BEFORE DELETE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
CREATE TRIGGER trg_audit_log_immutable_update BEFORE UPDATE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- =============================================================================
-- TABLE: companies (entreprises)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name character varying(255) NOT NULL,
    ifu character varying(20) NOT NULL,
    rccm character varying(100),
    address_cadastral character varying(100),
    phone character varying(30),
    email character varying(255),
    address text,
    bank_accounts jsonb DEFAULT '[]'::jsonb,
    tax_regime character varying(100),
    tax_office character varying(255),
    logo_url text,
    created_at timestamp with time zone DEFAULT now(),
    ai_model character varying(100) DEFAULT 'anthropic/claude-sonnet-4.5'::character varying,
    ai_fallback_model character varying(100) DEFAULT 'openai/gpt-4o-mini'::character varying,
    ai_system_prompt text,
    ai_enabled boolean DEFAULT true,
    openrouter_api_key text,
    ai_routing jsonb DEFAULT '{}'::jsonb,
    chatbot_enabled boolean DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    qr_scan_base_url text,
    invoice_settings jsonb DEFAULT '{}'::jsonb,
    fiscal_profile text NOT NULL DEFAULT 'BF'::text,
    fiscal_config jsonb DEFAULT '{}'::jsonb,
    country_code character varying(3) DEFAULT 'BF'::character varying,
    locale character varying(10) DEFAULT 'fr-BF'::character varying,
    certification_mode character varying(20) DEFAULT 'device'::character varying,
    stirling_api_url text,
    stirling_api_key text,
    is_platform_provider boolean NOT NULL DEFAULT false
);

CREATE UNIQUE INDEX companies_pkey ON public.companies USING btree (id);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY companies_insert ON public.companies FOR INSERT TO public WITH CHECK (true);
CREATE POLICY companies_platform_read ON public.companies FOR SELECT TO public USING (is_platform_provider = true);
CREATE POLICY companies_public_ifu_lookup ON public.companies FOR SELECT TO public USING (true);
CREATE POLICY companies_select ON public.companies FOR SELECT TO public USING ((id = get_user_company_id()) OR is_project_admin());
CREATE POLICY companies_update ON public.companies FOR UPDATE TO public USING ((id = get_user_company_id()) OR is_project_admin()) WITH CHECK ((id = get_user_company_id()) OR is_project_admin());

CREATE TRIGGER trg_audit_companies AFTER INSERT OR DELETE OR UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION log_audit_changes();
CREATE TRIGGER trg_auto_provision_ai AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION auto_provision_ai_for_new_company();

-- =============================================================================
-- TABLE: user_profiles
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id character varying(255) NOT NULL,
    company_id uuid NOT NULL,
    role character varying(20) NOT NULL,
    full_name character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    phone text,
    two_fa_enabled boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (id);
CREATE UNIQUE INDEX user_profiles_user_id_key ON public.user_profiles USING btree (user_id);
CREATE INDEX idx_user_profiles_company_id ON public.user_profiles USING btree (company_id);
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles USING btree (user_id);

ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_profiles_insert ON public.user_profiles FOR INSERT TO public WITH CHECK (true);
CREATE POLICY user_profiles_select ON public.user_profiles FOR SELECT TO public USING (((user_id)::text = (auth.uid())::text) OR (company_id = get_user_company_id()));
CREATE POLICY user_profiles_self_insert ON public.user_profiles FOR INSERT TO public WITH CHECK (true);

-- =============================================================================
-- TABLE: clients
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    type character varying(5) NOT NULL,
    name character varying(255) NOT NULL,
    ifu character varying(20),
    rccm character varying(100),
    address text,
    address_cadastral character varying(100),
    phone character varying(30),
    email character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_active boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX clients_pkey ON public.clients USING btree (id);
CREATE INDEX idx_clients_company_id ON public.clients USING btree (company_id);

ALTER TABLE public.clients ADD CONSTRAINT clients_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY clients_delete ON public.clients FOR DELETE TO public USING (company_id = get_user_company_id());
CREATE POLICY clients_insert ON public.clients FOR INSERT TO public WITH CHECK (company_id = get_user_company_id());
CREATE POLICY clients_select ON public.clients FOR SELECT TO public USING (company_id = get_user_company_id());
CREATE POLICY clients_update ON public.clients FOR UPDATE TO public USING (company_id = get_user_company_id());

CREATE TRIGGER trg_audit_clients AFTER INSERT OR DELETE OR UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- =============================================================================
-- TABLE: suppliers
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.suppliers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    ifu character varying(50),
    rccm character varying(100),
    address text,
    phone character varying(50),
    email character varying(255),
    country character varying(2) DEFAULT 'BF'::character varying,
    payment_terms_days integer DEFAULT 30,
    bank_name character varying(255),
    bank_iban character varying(100),
    bank_bic character varying(20),
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    regime_fiscal character varying(20),
    division_fiscale character varying(100),
    supplier_code character varying(50),
    supplier_type character varying(20) DEFAULT 'local'::character varying
);

CREATE UNIQUE INDEX suppliers_pkey ON public.suppliers USING btree (id);
CREATE INDEX idx_suppliers_company ON public.suppliers USING btree (company_id);
CREATE INDEX idx_suppliers_name ON public.suppliers USING btree (company_id, name);

ALTER TABLE public.suppliers ADD CONSTRAINT suppliers_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- =============================================================================
-- TABLE: bank_accounts
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.bank_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    bank_name character varying(255) NOT NULL,
    bank_code character varying(20),
    account_number character varying(50) NOT NULL,
    iban character varying(50),
    bic character varying(20),
    currency character varying(3) NOT NULL DEFAULT 'XOF'::character varying,
    account_holder character varying(255),
    opening_balance numeric NOT NULL DEFAULT 0,
    current_balance numeric NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    treasury_account_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX bank_accounts_pkey ON public.bank_accounts USING btree (id);
CREATE INDEX idx_bank_accounts_active ON public.bank_accounts USING btree (company_id, is_active);
CREATE INDEX idx_bank_accounts_company ON public.bank_accounts USING btree (company_id);

ALTER TABLE public.bank_accounts ADD CONSTRAINT bank_accounts_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY bank_accounts_company_isolation ON public.bank_accounts FOR ALL TO public USING (company_id = get_user_company_id());
CREATE POLICY bank_accounts_project_admin ON public.bank_accounts FOR ALL TO public USING (true);

CREATE TRIGGER trg_audit_bank_accounts AFTER INSERT OR DELETE OR UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION log_audit_changes();
CREATE TRIGGER bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: treasury_accounts
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.treasury_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    parent_id uuid,
    opening_balance numeric NOT NULL DEFAULT 0,
    current_balance numeric NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.bank_accounts ADD CONSTRAINT bank_accounts_treasury_account_id_fkey 
    FOREIGN KEY (treasury_account_id) REFERENCES public.treasury_accounts(id);

ALTER TABLE public.treasury_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY treasury_accounts_company ON public.treasury_accounts FOR ALL TO public USING (company_id = get_user_company_id());

CREATE TRIGGER treasury_accounts_updated_at BEFORE UPDATE ON public.treasury_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: articles
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.articles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(10) NOT NULL DEFAULT 'LOCBIE'::character varying,
    tax_group character varying(2) NOT NULL DEFAULT 'B'::character varying,
    unit_price numeric NOT NULL DEFAULT 0,
    specific_tax numeric NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    stock_quantity numeric DEFAULT 0
);

CREATE UNIQUE INDEX articles_pkey ON public.articles USING btree (id);
CREATE UNIQUE INDEX articles_company_id_code_key ON public.articles USING btree (company_id, code);

ALTER TABLE public.articles ADD CONSTRAINT articles_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY articles_company_isolation ON public.articles FOR ALL TO public USING (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: transaction_categories
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.transaction_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(20) NOT NULL,
    parent_id uuid,
    account_code character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_transaction_categories_company ON public.transaction_categories USING btree (company_id);

ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY transaction_categories_company ON public.transaction_categories FOR ALL TO public USING (company_id = get_user_company_id());

CREATE TRIGGER transaction_categories_updated_at BEFORE UPDATE ON public.transaction_categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: payment_wallets
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_wallets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    provider character varying(50) NOT NULL,
    account_identifier character varying(100) NOT NULL,
    account_name character varying(255),
    currency character varying(3) DEFAULT 'XOF'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_payment_wallets_company ON public.payment_wallets USING btree (company_id);
CREATE UNIQUE INDEX payment_wallets_company_provider_identifier_key ON public.payment_wallets USING btree (company_id, provider, account_identifier);

ALTER TABLE public.payment_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_wallets_company ON public.payment_wallets FOR ALL TO public USING (company_id = get_user_company_id());

CREATE TRIGGER payment_wallets_updated_at BEFORE UPDATE ON public.payment_wallets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: payment_evidences
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.payment_evidences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    source_type character varying(50) NOT NULL,
    source_url text,
    ocr_text text,
    ocr_confidence jsonb,
    extracted_data jsonb,
    needs_review boolean DEFAULT true,
    reviewed_by character varying(255),
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_payment_evidences_company ON public.payment_evidences USING btree (company_id);

ALTER TABLE public.payment_evidences ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_evidences_company ON public.payment_evidences FOR ALL TO public USING (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: certification_devices
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.certification_devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    device_type character varying(50) NOT NULL,
    serial_number character varying(100),
    api_key_hash text,
    is_active boolean DEFAULT true,
    last_seen_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_certification_devices_company ON public.certification_devices USING btree (company_id);

ALTER TABLE public.certification_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY certification_devices_company ON public.certification_devices FOR ALL TO public USING (company_id = get_user_company_id());

CREATE TRIGGER certification_devices_updated_at BEFORE UPDATE ON public.certification_devices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
