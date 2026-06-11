-- =============================================================================
-- WIMRUX® FINANCES → SUPABASE MIGRATION
-- Migration 02: Séquences + Fonctions de base
-- ⚠️  Ces fonctions DOIVENT être créées avant toutes les tables
--     car elles sont référencées par les policies RLS et les triggers.
-- =============================================================================

-- Séquence pour audit_log (bigint auto-increment)
CREATE SEQUENCE IF NOT EXISTS public.audit_log_id_seq
    START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

-- =============================================================================
-- FONCTIONS RLS (appelées dans les policies — créer en premier)
-- =============================================================================

-- Retourne le company_id de l'utilisateur connecté
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.user_profiles
  WHERE user_id = auth.uid()::text
  LIMIT 1;
  RETURN v_company_id;
END;
$$;

-- Vérifie si l'utilisateur est project_admin
-- ⚠️ SUPABASE: remplace le rôle PostgreSQL "project_admin" d'InsForge
--    par une vérification via user_profiles. Vous pouvez aussi utiliser
--    le rôle service_role côté serveur pour les opérations admin.
CREATE OR REPLACE FUNCTION public.is_project_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid()::text
      AND role IN ('project_admin', 'superadmin')
  );
END;
$$;

-- Auto-mise à jour du champ updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Empêche la modification des logs d'audit (immuabilité)
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Les logs d''audit sont immuables et ne peuvent pas être modifiés ou supprimés.';
END;
$$;

-- Log d'audit générique (INSERT dans audit_log)
CREATE OR REPLACE FUNCTION public.log_audit_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_log (
    user_id, action_type, table_name, record_id,
    data_before, data_after, company_id
  ) VALUES (
    COALESCE(auth.uid()::text, 'system'),
    TG_OP,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
    CASE WHEN TG_OP IN ('DELETE', 'UPDATE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.company_id ELSE NEW.company_id END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Notification realtime sur audit_log
CREATE OR REPLACE FUNCTION public.notify_audit_entry()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pg_notify('audit_entry', json_build_object(
    'id',         NEW.id,
    'table',      NEW.table_name,
    'action',     NEW.action_type,
    'company_id', NEW.company_id
  )::text);
  RETURN NEW;
END;
$$;

-- Notification realtime sur changement de statut facture
CREATE OR REPLACE FUNCTION public.notify_invoice_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM pg_notify('invoice_status_change', json_build_object(
      'invoice_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'reference',  NEW.reference,
      'company_id', NEW.company_id
    )::text);
  END IF;
  RETURN NEW;
END;
$$;

-- Provisioning automatique IA pour nouvelle entreprise
CREATE OR REPLACE FUNCTION public.auto_provision_ai_for_new_company()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_period date := date_trunc('month', now())::date;
BEGIN
  INSERT INTO public.company_ai_quota_usage (company_id, period_month, quota_cap_usd, consumed_usd)
  VALUES (NEW.id, v_period, 1.00, 0.00)
  ON CONFLICT (company_id, period_month) DO NOTHING;

  INSERT INTO public.company_ai_credits (company_id, balance_usd, total_purchased_usd, total_consumed_usd)
  VALUES (NEW.id, 0.00, 0.00, 0.00)
  ON CONFLICT (company_id) DO NOTHING;

  RETURN NEW;
END;
$$;
