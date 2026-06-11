-- =============================================================================
-- WIMRUX® FINANCES → SUPABASE MIGRATION
-- Migration 09: Tables système — RBAC, OTP, notifications, logs MCF, queue
-- =============================================================================

-- =============================================================================
-- TABLE: company_role_permissions (RBAC granulaire)
-- ⚠️ SUPABASE: Le rôle "project_admin" PostgreSQL n'existe pas.
--    Les policies ci-dessous utilisent is_project_admin() (fonction publique)
--    à la place du rôle natif InsForge.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.company_role_permissions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    role        character varying(50) NOT NULL,
    permission  character varying(100) NOT NULL,
    granted     boolean NOT NULL DEFAULT true,
    expires_at  timestamptz,
    granted_by  character varying(255),
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now(),
    UNIQUE (company_id, role, permission)
);

CREATE INDEX idx_crp_company_id   ON public.company_role_permissions (company_id);
CREATE INDEX idx_crp_company_role ON public.company_role_permissions (company_id, role);

ALTER TABLE public.company_role_permissions ENABLE ROW LEVEL SECURITY;
-- Lecture par tous les membres de la company
CREATE POLICY "crp_company_select"    ON public.company_role_permissions FOR SELECT TO authenticated
    USING (company_id = get_user_company_id());
-- Modification réservée aux admins de la company
CREATE POLICY "crp_company_admin_all" ON public.company_role_permissions FOR ALL TO authenticated
    USING (
      (company_id = get_user_company_id()) AND
      EXISTS (SELECT 1 FROM public.user_profiles
              WHERE user_id = auth.uid()::text
                AND company_id = get_user_company_id()
                AND role = 'admin')
    )
    WITH CHECK (
      (company_id = get_user_company_id()) AND
      EXISTS (SELECT 1 FROM public.user_profiles
              WHERE user_id = auth.uid()::text
                AND company_id = get_user_company_id()
                AND role = 'admin')
    );

CREATE TRIGGER company_role_permissions_updated_at BEFORE UPDATE ON public.company_role_permissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Fonctions RPC de gestion des permissions
CREATE OR REPLACE FUNCTION public.check_permission(p_company_id uuid, p_user_id varchar, p_permission varchar)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.company_role_permissions
    WHERE company_id  = p_company_id
      AND role        = (SELECT role FROM public.user_profiles WHERE user_id = p_user_id)
      AND permission  = p_permission
      AND granted     = true
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_permissions(p_company_id uuid, p_user_id varchar)
RETURNS TABLE(permission character varying, granted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT crp.permission, crp.granted
  FROM public.company_role_permissions crp
  WHERE crp.company_id = p_company_id
    AND crp.role = (SELECT role FROM public.user_profiles WHERE user_id = p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.grant_permission(p_company_id uuid, p_role varchar, p_permission varchar, p_granted_by varchar)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.company_role_permissions (company_id, role, permission, granted, granted_by)
  VALUES (p_company_id, p_role, p_permission, true, p_granted_by)
  ON CONFLICT (company_id, role, permission)
  DO UPDATE SET granted = true, granted_by = p_granted_by;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_permission(p_company_id uuid, p_role varchar, p_permission varchar)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.company_role_permissions
  SET granted = false
  WHERE company_id = p_company_id AND role = p_role AND permission = p_permission;
END;
$$;

-- =============================================================================
-- TABLE: otp_codes (2FA WhatsApp / SMS)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL,
    phone       text NOT NULL,
    code        text NOT NULL,
    purpose     text NOT NULL DEFAULT 'login_2fa',
    used        boolean NOT NULL DEFAULT false,
    expires_at  timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX otp_codes_user_id_idx    ON public.otp_codes (user_id);
CREATE INDEX otp_codes_expires_at_idx ON public.otp_codes (expires_at);

ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "otp_codes_user" ON public.otp_codes FOR ALL TO authenticated
    USING (user_id::text = auth.uid()::text);

-- Fonction de vérification OTP
CREATE OR REPLACE FUNCTION public.verify_otp(p_user_id uuid, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_valid boolean;
BEGIN
  SELECT (code = p_code AND NOT used AND expires_at > NOW())
  INTO v_valid
  FROM public.otp_codes
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_valid IS TRUE THEN
    UPDATE public.otp_codes SET used = true
    WHERE user_id = p_user_id AND code = p_code AND NOT used;
  END IF;

  RETURN COALESCE(v_valid, false);
END;
$$;

-- =============================================================================
-- TABLE: notifications
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id     character varying(255),
    type        character varying(50) NOT NULL,
    severity    character varying(20) DEFAULT 'info',
    title       character varying(255) NOT NULL,
    body        text,
    link        character varying(500),
    is_read     boolean DEFAULT false,
    read_at     timestamptz,
    metadata    jsonb DEFAULT '{}'::jsonb,
    created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_notifications_company_user ON public.notifications (company_id, user_id, created_at);
CREATE INDEX idx_notifications_unread        ON public.notifications (company_id, user_id, is_read) WHERE is_read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_user" ON public.notifications FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

-- Fonction RPC de création de notification
CREATE OR REPLACE FUNCTION public.create_notification(
    p_company_id  uuid,
    p_user_id     varchar,
    p_type        varchar,
    p_severity    varchar,
    p_title       varchar,
    p_body        text    DEFAULT NULL,
    p_link        varchar DEFAULT NULL,
    p_metadata    jsonb   DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE notif_id uuid;
BEGIN
  INSERT INTO public.notifications (company_id, user_id, type, severity, title, body, link, metadata)
  VALUES (p_company_id, p_user_id, p_type, p_severity, p_title, p_body, p_link, p_metadata)
  RETURNING id INTO notif_id;
  RETURN notif_id;
END;
$$;

-- =============================================================================
-- TABLE: mcf_logs (logs certification MCF/DGI)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.mcf_logs (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    uuid REFERENCES public.companies(id) ON DELETE SET NULL,
    invoice_id    uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
    action_type   character varying(50) NOT NULL,
    payload       jsonb,
    response      jsonb,
    status        character varying(20),
    error_message text,
    created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_mcf_logs_company ON public.mcf_logs (company_id, created_at);
CREATE INDEX idx_mcf_logs_invoice ON public.mcf_logs (invoice_id);

ALTER TABLE public.mcf_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mcf_logs_company" ON public.mcf_logs FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: pending_certification_queue
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.pending_certification_queue (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id    uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    company_id    uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    device_id     uuid REFERENCES public.certification_devices(id),
    priority      integer DEFAULT 0,
    status        character varying(20) DEFAULT 'pending',
    retry_count   integer DEFAULT 0,
    error_message text,
    created_at    timestamptz DEFAULT now(),
    updated_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_pending_cert_queue_company ON public.pending_certification_queue (company_id, status);
CREATE INDEX idx_pending_cert_queue_device  ON public.pending_certification_queue (device_id, status) WHERE device_id IS NOT NULL;

ALTER TABLE public.pending_certification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pending_cert_queue_company" ON public.pending_certification_queue FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER pending_cert_queue_updated_at BEFORE UPDATE ON public.pending_certification_queue FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- FONCTIONS utilitaires diverses
-- =============================================================================

-- Anonymiser les anciens logs d'audit
CREATE OR REPLACE FUNCTION public.anonymize_old_audit_logs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.audit_log
  SET user_id    = '[REDACTED]',
      ip_address = '[REDACTED]'
  WHERE "timestamp" < NOW() - INTERVAL '1 year'
    AND user_id != '[REDACTED]';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Score de similarité fuzzy (wrapper levenshtein)
CREATE OR REPLACE FUNCTION public.fuzzy_match_score(str1 text, str2 text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN levenshtein(LOWER(TRIM(str1)), LOWER(TRIM(str2)));
END;
$$;

-- Obtenir l'année fiscale
CREATE OR REPLACE FUNCTION public.get_fiscal_year(p_date date DEFAULT CURRENT_DATE, p_country varchar DEFAULT 'BF')
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM p_date)::int;
END;
$$;

-- Formater un montant en devise
CREATE OR REPLACE FUNCTION public.format_currency(amount numeric, currency varchar DEFAULT 'XOF')
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN to_char(amount, 'FM999G999G999G999') || ' ' || currency;
END;
$$;

-- Calculer la TVA
CREATE OR REPLACE FUNCTION public.calculate_vat(base_amount numeric, vat_rate numeric DEFAULT 0.18)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN ROUND(base_amount * vat_rate, 0);
END;
$$;

-- Calculer la retenue à la source
CREATE OR REPLACE FUNCTION public.calculate_withholding_tax(base_amount numeric, wht_rate numeric DEFAULT 0.05)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN ROUND(base_amount * wht_rate, 0);
END;
$$;

-- Obtenir la config fiscale d'une entreprise
CREATE OR REPLACE FUNCTION public.get_company_fiscal_config(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_config jsonb;
BEGIN
  SELECT fiscal_config INTO v_config FROM public.companies WHERE id = p_company_id;
  RETURN COALESCE(v_config, '{}'::jsonb);
END;
$$;

-- Générer une référence unique
CREATE OR REPLACE FUNCTION public.generate_unique_reference(p_prefix varchar, p_company_id uuid)
RETURNS varchar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ref         varchar;
  v_attempts    int := 0;
  v_max_attempts int := 10;
BEGIN
  LOOP
    v_attempts := v_attempts + 1;
    IF v_attempts > v_max_attempts THEN
      RAISE EXCEPTION 'Impossible de générer une référence unique après % tentatives', v_max_attempts;
    END IF;
    v_ref := p_prefix || '-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.invoices WHERE reference = v_ref AND company_id = p_company_id
    );
  END LOOP;
  RETURN v_ref;
END;
$$;
