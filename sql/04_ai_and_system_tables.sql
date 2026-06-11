-- =============================================================================
-- WIMRUX® FINANCES — DUMP STRUCTURE (Partie 4: IA et Système)
-- Date: 2026-06-08
-- =============================================================================

-- =============================================================================
-- TABLE: ai_providers
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_providers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    base_url text NOT NULL,
    is_active boolean DEFAULT true,
    supports_vision boolean DEFAULT false,
    supports_tools boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX ai_providers_code_key ON public.ai_providers USING btree (code);
CREATE UNIQUE INDEX ai_providers_pkey ON public.ai_providers USING btree (id);

-- =============================================================================
-- TABLE: ai_models
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_models (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id uuid NOT NULL,
    code character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    input_cost_per_1k_tokens numeric,
    output_cost_per_1k_tokens numeric,
    context_window integer,
    is_active boolean DEFAULT true,
    quality_tier character varying(20) DEFAULT 'medium'::character varying,
    supports_vision boolean DEFAULT false,
    supports_json_mode boolean DEFAULT false,
    supports_tools boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX ai_models_pkey ON public.ai_models USING btree (id);
CREATE UNIQUE INDEX ai_models_provider_code_key ON public.ai_models USING btree (provider_id, code);

ALTER TABLE public.ai_models ADD CONSTRAINT ai_models_provider_id_fkey 
    FOREIGN KEY (provider_id) REFERENCES public.ai_providers(id) ON DELETE CASCADE;

-- =============================================================================
-- TABLE: ai_tasks
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    category character varying(30),
    default_quality_tier character varying(20) DEFAULT 'medium'::character varying,
    default_needs_vision boolean DEFAULT false,
    default_needs_tools boolean DEFAULT false,
    default_needs_json_mode boolean DEFAULT false,
    default_system_prompt text,
    estimated_input_tokens integer DEFAULT 1000,
    estimated_output_tokens integer DEFAULT 500,
    is_workflow_capable boolean DEFAULT false,
    is_active boolean DEFAULT true
);

CREATE UNIQUE INDEX ai_tasks_code_key ON public.ai_tasks USING btree (code);
CREATE UNIQUE INDEX ai_tasks_pkey ON public.ai_tasks USING btree (id);

-- =============================================================================
-- TABLE: ai_models_default_routing
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_models_default_routing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_code character varying(50) NOT NULL,
    model_id uuid NOT NULL,
    priority integer DEFAULT 1,
    is_fallback boolean DEFAULT false,
    UNIQUE (task_code, model_id)
);

CREATE UNIQUE INDEX ai_models_default_routing_pkey ON public.ai_models_default_routing USING btree (id);

ALTER TABLE public.ai_models_default_routing ADD CONSTRAINT ai_models_default_routing_model_id_fkey 
    FOREIGN KEY (model_id) REFERENCES public.ai_models(id) ON DELETE CASCADE;

-- =============================================================================
-- TABLE: company_ai_credits
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.company_ai_credits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    balance_usd numeric NOT NULL DEFAULT 0,
    total_purchased_usd numeric NOT NULL DEFAULT 0,
    total_consumed_usd numeric NOT NULL DEFAULT 0,
    last_purchase_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (company_id)
);

CREATE UNIQUE INDEX company_ai_credits_pkey ON public.company_ai_credits USING btree (id);
CREATE UNIQUE INDEX company_ai_credits_company_id_key ON public.company_ai_credits USING btree (company_id);

ALTER TABLE public.company_ai_credits ADD CONSTRAINT company_ai_credits_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.company_ai_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_ai_credits_tenant ON public.company_ai_credits FOR ALL TO authenticated USING (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: company_ai_quota_usage
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.company_ai_quota_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    period_month date NOT NULL,
    quota_cap_usd numeric NOT NULL DEFAULT 0,
    consumed_usd numeric NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (company_id, period_month)
);

CREATE INDEX idx_company_ai_quota_company_period ON public.company_ai_quota_usage USING btree (company_id, period_month);

ALTER TABLE public.company_ai_quota_usage ADD CONSTRAINT company_ai_quota_usage_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.company_ai_quota_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_ai_quota_tenant ON public.company_ai_quota_usage FOR ALL TO public USING (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: company_ai_task_routing
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.company_ai_task_routing (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    task_code character varying(50) NOT NULL,
    model_id uuid NOT NULL,
    custom_system_prompt text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (company_id, task_code)
);

ALTER TABLE public.company_ai_task_routing ADD CONSTRAINT company_ai_task_routing_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.company_ai_task_routing ADD CONSTRAINT company_ai_task_routing_model_id_fkey 
    FOREIGN KEY (model_id) REFERENCES public.ai_models(id);

ALTER TABLE public.company_ai_task_routing ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_ai_task_routing_tenant ON public.company_ai_task_routing FOR ALL TO public USING (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: ai_usage_logs
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    task_code character varying(50),
    model_code character varying(100),
    input_tokens integer,
    output_tokens integer,
    cost_usd numeric,
    latency_ms integer,
    status character varying(20),
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_ai_usage_logs_company ON public.ai_usage_logs USING btree (company_id, created_at);

ALTER TABLE public.ai_usage_logs ADD CONSTRAINT ai_usage_logs_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY ai_usage_logs_tenant ON public.ai_usage_logs FOR ALL TO public USING (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: company_role_permissions (permissions RBAC)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.company_role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    role character varying(50) NOT NULL,
    permission character varying(100) NOT NULL,
    granted boolean NOT NULL DEFAULT true,
    expires_at timestamp with time zone,
    granted_by character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (company_id, role, permission)
);

CREATE UNIQUE INDEX company_role_permissions_pkey ON public.company_role_permissions USING btree (id);
CREATE UNIQUE INDEX company_role_permissions_company_id_role_permission_key ON public.company_role_permissions USING btree (company_id, role, permission);
CREATE INDEX idx_crp_company_id ON public.company_role_permissions USING btree (company_id);
CREATE INDEX idx_crp_company_role ON public.company_role_permissions USING btree (company_id, role);

ALTER TABLE public.company_role_permissions ADD CONSTRAINT company_role_permissions_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.company_role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY crp_company_admin_all ON public.company_role_permissions FOR ALL TO public 
    USING ((company_id = get_user_company_id()) AND (EXISTS (SELECT 1 FROM user_profiles 
    WHERE ((user_profiles.user_id)::text = (auth.uid())::text) AND (user_profiles.company_id = get_user_company_id()) AND ((user_profiles.role)::text = 'admin'::text))));
CREATE POLICY crp_company_select ON public.company_role_permissions FOR SELECT TO public USING (company_id = get_user_company_id());
CREATE POLICY crp_project_admin ON public.company_role_permissions FOR ALL TO public USING (true);

CREATE TRIGGER company_role_permissions_updated_at BEFORE UPDATE ON public.company_role_permissions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: otp_codes (2FA WhatsApp)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.otp_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    phone text NOT NULL,
    code text NOT NULL,
    purpose text NOT NULL DEFAULT 'login_2fa'::text,
    used boolean NOT NULL DEFAULT false,
    expires_at timestamp with time zone NOT NULL DEFAULT (now() + '00:10:00'::interval),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX otp_codes_pkey ON public.otp_codes USING btree (id);
CREATE INDEX otp_codes_expires_at_idx ON public.otp_codes USING btree (expires_at);
CREATE INDEX otp_codes_user_id_idx ON public.otp_codes USING btree (user_id);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY otp_codes_user ON public.otp_codes FOR ALL TO public USING ((user_id)::text = (auth.uid())::text);

-- =============================================================================
-- TABLE: notifications
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    user_id character varying(255),
    type character varying(50) NOT NULL,
    severity character varying(20) DEFAULT 'info'::character varying,
    title character varying(255) NOT NULL,
    body text,
    link character varying(500),
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_notifications_company_user ON public.notifications USING btree (company_id, user_id, created_at);
CREATE INDEX idx_notifications_unread ON public.notifications USING btree (company_id, user_id, is_read) WHERE (is_read = false);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY notifications_user ON public.notifications FOR ALL TO public USING (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: mcf_logs
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.mcf_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid,
    invoice_id uuid,
    action_type character varying(50) NOT NULL,
    payload jsonb,
    response jsonb,
    status character varying(20),
    error_message text,
    created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_mcf_logs_company ON public.mcf_logs USING btree (company_id, created_at);
CREATE INDEX idx_mcf_logs_invoice ON public.mcf_logs USING btree (invoice_id);

ALTER TABLE public.mcf_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY mcf_logs_company ON public.mcf_logs FOR ALL TO public USING (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: pending_certification_queue
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pending_certification_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    company_id uuid NOT NULL,
    device_id uuid,
    priority integer DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying,
    retry_count integer DEFAULT 0,
    error_message text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_pending_cert_queue_company ON public.pending_certification_queue USING btree (company_id, status);
CREATE INDEX idx_pending_cert_queue_device ON public.pending_certification_queue USING btree (device_id, status) WHERE device_id IS NOT NULL;

ALTER TABLE public.pending_certification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY pending_cert_queue_company ON public.pending_certification_queue FOR ALL TO public USING (company_id = get_user_company_id());

CREATE TRIGGER pending_cert_queue_updated_at BEFORE UPDATE ON public.pending_certification_queue FOR EACH ROW EXECUTE FUNCTION set_updated_at();
