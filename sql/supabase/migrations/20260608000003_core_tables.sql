-- =============================================================================
-- WIMRUX® FINANCES → SUPABASE MIGRATION
-- Migration 03: Tables core — companies, audit_log, user_profiles, clients, suppliers
-- ⚠️  Ordre critique : companies → audit_log → user_profiles → clients/suppliers
-- =============================================================================

-- =============================================================================
-- TABLE: companies
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  character varying(255) NOT NULL,
    ifu                   character varying(20) NOT NULL,
    rccm                  character varying(100),
    address_cadastral     character varying(100),
    phone                 character varying(30),
    email                 character varying(255),
    address               text,
    bank_accounts         jsonb DEFAULT '[]'::jsonb,
    tax_regime            character varying(100),
    tax_office            character varying(255),
    logo_url              text,
    created_at            timestamptz DEFAULT now(),
    ai_model              character varying(100) DEFAULT 'anthropic/claude-sonnet-4.5',
    ai_fallback_model     character varying(100) DEFAULT 'openai/gpt-4o-mini',
    ai_system_prompt      text,
    ai_enabled            boolean DEFAULT true,
    openrouter_api_key    text,
    ai_routing            jsonb DEFAULT '{}'::jsonb,
    chatbot_enabled       boolean DEFAULT false,
    is_active             boolean NOT NULL DEFAULT true,
    qr_scan_base_url      text,
    invoice_settings      jsonb DEFAULT '{}'::jsonb,
    fiscal_profile        text NOT NULL DEFAULT 'BF',
    fiscal_config         jsonb DEFAULT '{}'::jsonb,
    country_code          character varying(3) DEFAULT 'BF',
    locale                character varying(10) DEFAULT 'fr-BF',
    certification_mode    character varying(20) DEFAULT 'device',
    stirling_api_url      text,
    stirling_api_key      text,
    is_platform_provider  boolean NOT NULL DEFAULT false
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_insert"          ON public.companies FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "companies_platform_read"   ON public.companies FOR SELECT TO authenticated USING (is_platform_provider = true);
CREATE POLICY "companies_public_ifu"      ON public.companies FOR SELECT TO authenticated USING (true);
CREATE POLICY "companies_select_own"      ON public.companies FOR SELECT TO authenticated USING ((id = get_user_company_id()) OR is_project_admin());
CREATE POLICY "companies_update_own"      ON public.companies FOR UPDATE TO authenticated USING ((id = get_user_company_id()) OR is_project_admin())
                                                                             WITH CHECK  ((id = get_user_company_id()) OR is_project_admin());

-- =============================================================================
-- TABLE: audit_log  (immuable — aucun UPDATE ni DELETE autorisé)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.audit_log (
    id           bigint PRIMARY KEY DEFAULT nextval('public.audit_log_id_seq'),
    user_id      character varying(255),
    timestamp    timestamptz DEFAULT now(),
    action_type  character varying(10) NOT NULL,
    table_name   character varying(100) NOT NULL,
    record_id    character varying(255),
    data_before  jsonb,
    data_after   jsonb,
    ip_address   character varying(45),
    company_id   uuid REFERENCES public.companies(id) ON DELETE SET NULL
);

ALTER SEQUENCE public.audit_log_id_seq OWNED BY public.audit_log.id;

CREATE INDEX idx_audit_log_company_id  ON public.audit_log (company_id);
CREATE INDEX idx_audit_log_table_name  ON public.audit_log (table_name);
CREATE INDEX idx_audit_log_timestamp   ON public.audit_log ("timestamp");

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "audit_log_select" ON public.audit_log FOR SELECT TO authenticated USING (company_id = get_user_company_id());

CREATE TRIGGER audit_realtime
  AFTER INSERT ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.notify_audit_entry();

CREATE TRIGGER trg_audit_log_immutable_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

CREATE TRIGGER trg_audit_log_immutable_update
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

-- =============================================================================
-- TABLE: user_profiles
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         character varying(255) NOT NULL UNIQUE,
    company_id      uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    role            character varying(20) NOT NULL,
    full_name       character varying(255) NOT NULL,
    created_at      timestamptz DEFAULT now(),
    phone           text,
    two_fa_enabled  boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_user_profiles_company_id ON public.user_profiles (company_id);
CREATE INDEX idx_user_profiles_user_id    ON public.user_profiles (user_id);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_profiles_insert"    ON public.user_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "user_profiles_select"    ON public.user_profiles FOR SELECT TO authenticated
    USING ((user_id = auth.uid()::text) OR (company_id = get_user_company_id()));

-- =============================================================================
-- TABLE: clients
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.clients (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type                character varying(5) NOT NULL,
    name                character varying(255) NOT NULL,
    ifu                 character varying(20),
    rccm                character varying(100),
    address             text,
    address_cadastral   character varying(100),
    phone               character varying(30),
    email               character varying(255),
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    is_active           boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_clients_company_id ON public.clients (company_id);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated USING (company_id = get_user_company_id());
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated USING (company_id = get_user_company_id());
CREATE POLICY "clients_delete" ON public.clients FOR DELETE TO authenticated USING (company_id = get_user_company_id());

CREATE TRIGGER clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_audit_clients AFTER INSERT OR UPDATE OR DELETE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

-- =============================================================================
-- TABLE: suppliers
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name                character varying(255) NOT NULL,
    ifu                 character varying(50),
    rccm                character varying(100),
    address             text,
    phone               character varying(50),
    email               character varying(255),
    country             character varying(2) DEFAULT 'BF',
    payment_terms_days  integer DEFAULT 30,
    bank_name           character varying(255),
    bank_iban           character varying(100),
    bank_bic            character varying(20),
    notes               text,
    is_active           boolean DEFAULT true,
    created_at          timestamptz DEFAULT now(),
    updated_at          timestamptz DEFAULT now(),
    regime_fiscal       character varying(20),
    division_fiscale    character varying(100),
    supplier_code       character varying(50),
    supplier_type       character varying(20) DEFAULT 'local'
);

CREATE INDEX idx_suppliers_company ON public.suppliers (company_id);
CREATE INDEX idx_suppliers_name    ON public.suppliers (company_id, name);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "suppliers_all" ON public.suppliers FOR ALL TO authenticated USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Triggers audit companies (après création audit_log)
CREATE TRIGGER trg_audit_companies   AFTER INSERT OR UPDATE OR DELETE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
CREATE TRIGGER trg_auto_provision_ai AFTER INSERT ON public.companies FOR EACH ROW EXECUTE FUNCTION public.auto_provision_ai_for_new_company();
