-- =============================================================================
-- WIMRUX® FINANCES — DUMP STRUCTURE INSFORGE (Partie 1: Extensions et Fonctions)
-- Date: 2026-06-08
-- Backend: https://gfe4bd9y.eu-central.insforge.app
-- =============================================================================

-- =============================================================================
-- EXTENSIONS INSTALLÉES
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "fuzzystrmatch" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "http" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA pg_catalog;

COMMENT ON EXTENSION "fuzzystrmatch" IS 'Fuzzy string matching (Levenshtein distance, etc.)';
COMMENT ON EXTENSION "http" IS 'HTTP client for PostgreSQL';
COMMENT ON EXTENSION "pg_cron" IS 'Job scheduler for PostgreSQL';
COMMENT ON EXTENSION "pgcrypto" IS 'Cryptographic functions';

-- =============================================================================
-- FONCTIONS UTILITAIRES
-- =============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Audit trail
CREATE OR REPLACE FUNCTION public.log_audit_changes()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO audit_log (user_id, action_type, table_name, record_id, data_before, data_after, company_id)
  VALUES (
    COALESCE(auth.uid()::text, 'system'),
    TG_OP,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id::text ELSE NEW.id::text END,
    CASE WHEN TG_OP IN ('DELETE','UPDATE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) END,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.company_id ELSE NEW.company_id END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Prevent audit modification
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Logs audit immuables';
END;
$$;

-- Invoice status notifications
CREATE OR REPLACE FUNCTION public.notify_invoice_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM pg_notify('invoice_status_change', json_build_object(
      'invoice_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status,
      'reference', NEW.reference, 'company_id', NEW.company_id
    )::text);
  END IF;
  RETURN NEW;
END;
$$;

-- Update payment status
CREATE OR REPLACE FUNCTION public.update_invoice_payment_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_total_paid NUMERIC; v_invoice_total NUMERIC; v_invoice_id UUID;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(amount),0) INTO v_total_paid FROM invoice_payments WHERE invoice_id = v_invoice_id;
  SELECT total_ttc INTO v_invoice_total FROM invoices WHERE id = v_invoice_id;
  UPDATE invoices SET
    paid_amount = v_total_paid,
    payment_status = CASE WHEN v_total_paid >= v_invoice_total THEN 'paid' WHEN v_total_paid > 0 THEN 'partial' ELSE 'unpaid' END
  WHERE id = v_invoice_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Certification workflow guard
CREATE OR REPLACE FUNCTION public.allow_certification_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF OLD.status = 'draft' THEN RETURN NEW; END IF;
  IF OLD.status = 'pending_validation' AND NEW.status IN ('approved','draft','certified') THEN RETURN NEW; END IF;
  IF OLD.status = 'approved' AND NEW.status IN ('validated','certified') THEN RETURN NEW; END IF;
  IF OLD.status = 'approved' AND NEW.status = 'sent' AND OLD.type = 'PF' THEN RETURN NEW; END IF;
  IF OLD.status = 'sent' AND NEW.status IN ('accepted','rejected') AND OLD.type = 'PF' THEN RETURN NEW; END IF;
  IF OLD.status = 'validated' AND NEW.status = 'certified' THEN RETURN NEW; END IF;
  IF OLD.status IN ('certified','cancelled') THEN
    RAISE EXCEPTION 'INTERDIT: Modification non autorisée sur facture % (status: %)', OLD.reference, OLD.status;
  END IF;
  RAISE EXCEPTION 'INTERDIT: Transition non autorisée % → %', OLD.status, NEW.status;
END;
$$;

-- Prevent invoice modification
CREATE OR REPLACE FUNCTION public.prevent_invoice_modification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'INTERDIT: Facture % immuable', OLD.reference;
END;
$$;

-- Decrement stock
CREATE OR REPLACE FUNCTION public.decrement_stock_on_certification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status != 'certified' AND NEW.status = 'certified' THEN
    UPDATE articles a SET stock_quantity = COALESCE(a.stock_quantity,0) - i.quantity
    FROM invoice_items i
    WHERE i.invoice_id = NEW.id AND a.id = i.article_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Auto-provision AI for new company
CREATE OR REPLACE FUNCTION public.auto_provision_ai_for_new_company()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_period DATE := date_trunc('month', now())::date;
BEGIN
  INSERT INTO company_ai_quota_usage (company_id, period_month, quota_cap_usd, consumed_usd)
  VALUES (NEW.id, v_period, 1.00, 0.00) ON CONFLICT DO NOTHING;
  INSERT INTO company_ai_credits (company_id, balance_usd, total_purchased_usd, total_consumed_usd)
  VALUES (NEW.id, 0.00, 0.00, 0.00) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Next invoice reference
CREATE OR REPLACE FUNCTION public.next_invoice_reference(p_company_id uuid, p_type varchar, p_year int)
RETURNS varchar LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_prefix VARCHAR(10) := CASE p_type WHEN 'FV' THEN 'FV' WHEN 'FT' THEN 'FR' WHEN 'FA' THEN 'FA'
    WHEN 'EV' THEN 'EV' WHEN 'ET' THEN 'ET' WHEN 'EA' THEN 'EA' WHEN 'PF' THEN 'PF' ELSE 'DOC' END;
  v_next_seq INTEGER; v_reference VARCHAR(100);
BEGIN
  INSERT INTO invoice_sequences (company_id, type, year, last_number)
  VALUES (p_company_id, p_type, p_year, 1)
  ON CONFLICT (company_id, type, year) DO UPDATE SET last_number = invoice_sequences.last_number + 1
  RETURNING last_number INTO v_next_seq;
  v_reference := v_prefix || '-' || p_year || '-' || LPAD(v_next_seq::text, 4, '0');
  RETURN v_reference;
END;
$$;

-- Get user company ID
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_company_id UUID;
BEGIN
  SELECT company_id INTO v_company_id FROM user_profiles WHERE user_id = auth.uid()::text LIMIT 1;
  RETURN v_company_id;
END;
$$;

-- Check if project admin
CREATE OR REPLACE FUNCTION public.is_project_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM user_profiles WHERE user_id = auth.uid()::text AND role = 'project_admin');
END;
$$;

-- Auto reconcile function
CREATE OR REPLACE FUNCTION public.auto_reconcile(p_bank_account_id uuid)
RETURNS TABLE(transaction_id uuid, match_type text, match_id uuid, score int, match_label text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id FROM bank_accounts WHERE id = p_bank_account_id;
  IF v_company_id IS NULL THEN RETURN; END IF;
  -- Règle 1: match exact par référence
  RETURN QUERY
  SELECT bt.id, 'exact_reference'::text, inv.id, 100::int,
    inv.reference || ' (' || inv.total_ttc::text || ' XOF)'
  FROM bank_transactions bt
  JOIN invoices inv ON LOWER(TRIM(bt.reference)) = LOWER(TRIM(inv.reference))
  WHERE bt.bank_account_id = p_bank_account_id AND bt.reconciliation_status = 'unreconciled'
    AND inv.company_id = v_company_id AND inv.status NOT IN ('draft','cancelled');
END;
$$;

-- Check budget alerts
CREATE OR REPLACE FUNCTION public.check_budget_alerts()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE consumption_pct NUMERIC;
BEGIN
  SELECT CASE WHEN bl.planned_amount > 0 THEN COALESCE(SUM(bt.amount),0)/bl.planned_amount*100 ELSE 0 END INTO consumption_pct
  FROM budget_lines bl JOIN budgets b ON b.id = bl.budget_id
  LEFT JOIN bank_transactions bt ON bt.category_id = bl.category_id
  WHERE bl.id = COALESCE(NEW.id, OLD.id) AND bt.transaction_date BETWEEN b.period_start AND b.period_end
  GROUP BY bl.id, bl.planned_amount;
  IF consumption_pct >= NEW.alert_threshold_pct AND NEW.alert_sent_at IS NULL THEN
    UPDATE budget_lines SET alert_sent_at = NOW() WHERE id = NEW.id;
  END IF;
  UPDATE budgets SET total_planned = (SELECT COALESCE(SUM(planned_amount),0) FROM budget_lines WHERE budget_id = NEW.budget_id),
    total_actual = (SELECT COALESCE(SUM(actual_amount),0) FROM budget_lines WHERE budget_id = NEW.budget_id)
  WHERE id = NEW.budget_id;
  RETURN NEW;
END;
$$;

-- Increment AI credits
CREATE OR REPLACE FUNCTION public.increment_ai_credits(p_company_id uuid, p_amount_usd numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE company_ai_credits SET balance_usd = balance_usd + p_amount_usd,
    total_purchased_usd = total_purchased_usd + p_amount_usd, updated_at = NOW()
  WHERE company_id = p_company_id;
END;
$$;

-- Create notification
CREATE OR REPLACE FUNCTION public.create_notification(p_company_id uuid, p_user_id varchar, p_type varchar, 
  p_severity varchar, p_title varchar, p_body text DEFAULT NULL, p_link varchar DEFAULT NULL, p_metadata jsonb DEFAULT '{}')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE notif_id UUID;
BEGIN
  INSERT INTO notifications (company_id, user_id, type, severity, title, body, link, metadata)
  VALUES (p_company_id, p_user_id, p_type, p_severity, p_title, p_body, p_link, p_metadata)
  RETURNING id INTO notif_id;
  RETURN notif_id;
END;
$$;

-- Check permission
CREATE OR REPLACE FUNCTION public.check_permission(p_company_id uuid, p_user_id varchar, p_permission varchar)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS(SELECT 1 FROM company_role_permissions 
    WHERE company_id = p_company_id AND role = (SELECT role FROM user_profiles WHERE user_id = p_user_id)
    AND permission = p_permission AND granted = true);
END;
$$;

-- Get user permissions
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_company_id uuid, p_user_id varchar)
RETURNS TABLE(permission character varying, granted boolean) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT crp.permission, crp.granted FROM company_role_permissions crp
  WHERE crp.company_id = p_company_id AND crp.role = (SELECT role FROM user_profiles WHERE user_id = p_user_id);
END;
$$;

-- Grant permission
CREATE OR REPLACE FUNCTION public.grant_permission(p_company_id uuid, p_role varchar, p_permission varchar, p_granted_by varchar)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO company_role_permissions (company_id, role, permission, granted, granted_by)
  VALUES (p_company_id, p_role, p_permission, true, p_granted_by)
  ON CONFLICT (company_id, role, permission) DO UPDATE SET granted = true, granted_by = p_granted_by;
END;
$$;

-- Revoke permission
CREATE OR REPLACE FUNCTION public.revoke_permission(p_company_id uuid, p_role varchar, p_permission varchar)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE company_role_permissions SET granted = false WHERE company_id = p_company_id AND role = p_role AND permission = p_permission;
END;
$$;

-- Anonymize old audit logs
CREATE OR REPLACE FUNCTION public.anonymize_old_audit_logs()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE audit_log SET user_id = '[REDACTED]', ip_address = '[REDACTED]'
  WHERE timestamp < NOW() - INTERVAL '1 year' AND user_id != '[REDACTED]';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Levenshtein wrapper for fuzzy matching
CREATE OR REPLACE FUNCTION public.fuzzy_match_score(str1 text, str2 text)
RETURNS integer LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN levenshtein(LOWER(TRIM(str1)), LOWER(TRIM(str2)));
END;
$$;

-- URL encode helper
CREATE OR REPLACE FUNCTION public.urlencode(data jsonb)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE result text := '';
BEGIN
  SELECT string_agg(encode(key::bytea, 'hex') || '=' || encode(value::bytea, 'hex'), '&')
  INTO result FROM jsonb_each_text(data);
  RETURN result;
END;
$$;

-- HTTP helper functions (pg_net style)
CREATE OR REPLACE FUNCTION public.http_get(uri varchar)
RETURNS public.http_response LANGUAGE sql AS $$
  SELECT public.http(('GET', $1, NULL, NULL, NULL)::public.http_request);
$$;

CREATE OR REPLACE FUNCTION public.http_post(uri varchar, content varchar, content_type varchar)
RETURNS public.http_response LANGUAGE sql AS $$
  SELECT public.http(('POST', $1, NULL, $3, $2)::public.http_request);
$$;

-- Verify OTP
CREATE OR REPLACE FUNCTION public.verify_otp(p_user_id uuid, p_code text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_valid boolean;
BEGIN
  SELECT (code = p_code AND NOT used AND expires_at > NOW()) INTO v_valid
  FROM otp_codes WHERE user_id = p_user_id ORDER BY created_at DESC LIMIT 1;
  IF v_valid THEN
    UPDATE otp_codes SET used = true WHERE user_id = p_user_id AND code = p_code AND NOT used;
  END IF;
  RETURN v_valid;
END;
$$;

-- Calculate fiscal year
CREATE OR REPLACE FUNCTION public.get_fiscal_year(p_date date DEFAULT CURRENT_DATE, p_country varchar DEFAULT 'BF')
RETURNS integer LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p_country = 'BF' THEN
    RETURN CASE WHEN EXTRACT(MONTH FROM p_date) >= 1 THEN EXTRACT(YEAR FROM p_date)::int ELSE EXTRACT(YEAR FROM p_date)::int END;
  END IF;
  RETURN EXTRACT(YEAR FROM p_date)::int;
END;
$$;

-- Format currency
CREATE OR REPLACE FUNCTION public.format_currency(amount numeric, currency varchar DEFAULT 'XOF')
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN to_char(amount, 'FM999G999G999G999') || ' ' || currency;
END;
$$;

-- Calculate VAT amount
CREATE OR REPLACE FUNCTION public.calculate_vat(base_amount numeric, vat_rate numeric DEFAULT 0.18)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN ROUND(base_amount * vat_rate, 0);
END;
$$;

-- Calculate withholding tax
CREATE OR REPLACE FUNCTION public.calculate_withholding_tax(base_amount numeric, wht_rate numeric DEFAULT 0.05)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN ROUND(base_amount * wht_rate, 0);
END;
$$;

-- Get company fiscal config
CREATE OR REPLACE FUNCTION public.get_company_fiscal_config(p_company_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_config jsonb;
BEGIN
  SELECT fiscal_config INTO v_config FROM companies WHERE id = p_company_id;
  RETURN COALESCE(v_config, '{}'::jsonb);
END;
$$;

-- Generate unique reference
CREATE OR REPLACE FUNCTION public.generate_unique_reference(p_prefix varchar, p_company_id uuid)
RETURNS varchar LANGUAGE plpgsql AS $$
DECLARE
  v_ref varchar; v_attempts int := 0; v_max_attempts int := 10;
BEGIN
  LOOP
    v_attempts := v_attempts + 1;
    IF v_attempts > v_max_attempts THEN RAISE EXCEPTION 'Impossible de générer une référence unique'; END IF;
    v_ref := p_prefix || '-' || to_char(now(), 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6);
    EXIT WHEN NOT EXISTS(SELECT 1 FROM invoices WHERE reference = v_ref AND company_id = p_company_id);
  END LOOP;
  RETURN v_ref;
END;
$$;

-- =============================================================================
-- TYPES COMPOSITES POUR HTTP
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'http_header') THEN
    CREATE TYPE public.http_header AS (field varchar, value varchar);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'http_request') THEN
    CREATE TYPE public.http_request AS (
      method varchar, uri varchar, headers public.http_header[],
      content_type varchar, content varchar
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'http_response') THEN
    CREATE TYPE public.http_response AS (
      status int, content_type varchar, headers public.http_header[], content text
    );
  END IF;
END;
$$;
