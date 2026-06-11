-- =============================================================================
-- WIMRUX® FINANCES → SUPABASE MIGRATION
-- Migration 08: Tables IA (providers, models, tasks, routing, credits, logs)
-- =============================================================================

-- =============================================================================
-- TABLE: ai_providers
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_providers (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code             character varying(50) NOT NULL UNIQUE,
    name             character varying(255) NOT NULL,
    base_url         text NOT NULL,
    is_active        boolean DEFAULT true,
    supports_vision  boolean DEFAULT false,
    supports_tools   boolean DEFAULT false,
    created_at       timestamptz DEFAULT now()
);

-- =============================================================================
-- TABLE: ai_models
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_models (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id                 uuid NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
    code                        character varying(100) NOT NULL,
    name                        character varying(255) NOT NULL,
    input_cost_per_1k_tokens    numeric,
    output_cost_per_1k_tokens   numeric,
    context_window              integer,
    is_active                   boolean DEFAULT true,
    quality_tier                character varying(20) DEFAULT 'medium',
    supports_vision             boolean DEFAULT false,
    supports_json_mode          boolean DEFAULT false,
    supports_tools              boolean DEFAULT false,
    created_at                  timestamptz DEFAULT now(),
    UNIQUE (provider_id, code)
);

-- =============================================================================
-- TABLE: ai_tasks
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_tasks (
    id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code                      character varying(50) NOT NULL UNIQUE,
    name                      character varying(150) NOT NULL,
    description               text,
    category                  character varying(30),
    default_quality_tier      character varying(20) DEFAULT 'medium',
    default_needs_vision      boolean DEFAULT false,
    default_needs_tools       boolean DEFAULT false,
    default_needs_json_mode   boolean DEFAULT false,
    default_system_prompt     text,
    estimated_input_tokens    integer DEFAULT 1000,
    estimated_output_tokens   integer DEFAULT 500,
    is_workflow_capable        boolean DEFAULT false,
    is_active                 boolean DEFAULT true
);

-- =============================================================================
-- TABLE: ai_models_default_routing
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_models_default_routing (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_code   character varying(50) NOT NULL,
    model_id    uuid NOT NULL REFERENCES public.ai_models(id) ON DELETE CASCADE,
    priority    integer DEFAULT 1,
    is_fallback boolean DEFAULT false,
    UNIQUE (task_code, model_id)
);

-- =============================================================================
-- TABLE: company_ai_credits
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.company_ai_credits (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
    balance_usd          numeric NOT NULL DEFAULT 0,
    total_purchased_usd  numeric NOT NULL DEFAULT 0,
    total_consumed_usd   numeric NOT NULL DEFAULT 0,
    last_purchase_at     timestamptz,
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now()
);

ALTER TABLE public.company_ai_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_ai_credits_tenant" ON public.company_ai_credits FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER company_ai_credits_updated_at BEFORE UPDATE ON public.company_ai_credits FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Fonction pour incrémenter les crédits IA
CREATE OR REPLACE FUNCTION public.increment_ai_credits(p_company_id uuid, p_amount_usd numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.company_ai_credits
  SET balance_usd          = balance_usd + p_amount_usd,
      total_purchased_usd  = total_purchased_usd + p_amount_usd,
      updated_at           = NOW()
  WHERE company_id = p_company_id;
END;
$$;

-- =============================================================================
-- TABLE: company_ai_quota_usage
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.company_ai_quota_usage (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    period_month date NOT NULL,
    quota_cap_usd numeric NOT NULL DEFAULT 0,
    consumed_usd  numeric NOT NULL DEFAULT 0,
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now(),
    UNIQUE (company_id, period_month)
);

CREATE INDEX idx_company_ai_quota_company_period ON public.company_ai_quota_usage (company_id, period_month);

ALTER TABLE public.company_ai_quota_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_ai_quota_tenant" ON public.company_ai_quota_usage FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER company_ai_quota_updated_at BEFORE UPDATE ON public.company_ai_quota_usage FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- TABLE: company_ai_task_routing
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.company_ai_task_routing (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id            uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    task_code             character varying(50) NOT NULL,
    model_id              uuid NOT NULL REFERENCES public.ai_models(id),
    custom_system_prompt  text,
    is_active             boolean DEFAULT true,
    created_at            timestamptz DEFAULT now(),
    updated_at            timestamptz DEFAULT now(),
    UNIQUE (company_id, task_code)
);

ALTER TABLE public.company_ai_task_routing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_ai_task_routing_tenant" ON public.company_ai_task_routing FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER company_ai_task_routing_updated_at BEFORE UPDATE ON public.company_ai_task_routing FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- TABLE: ai_usage_logs
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    task_code     character varying(50),
    model_code    character varying(100),
    input_tokens  integer,
    output_tokens integer,
    cost_usd      numeric,
    latency_ms    integer,
    status        character varying(20),
    error_message text,
    created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_usage_logs_company ON public.ai_usage_logs (company_id, created_at);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_usage_logs_tenant" ON public.ai_usage_logs FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());
