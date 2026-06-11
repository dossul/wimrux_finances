-- =============================================================================
-- WIMRUX® FINANCES → SUPABASE MIGRATION
-- Migration 07: Paiements factures, retenues à la source, paiements fiscaux,
--               déclarations fiscales, mappings eSyntas
-- =============================================================================

-- =============================================================================
-- FONCTION: update_invoice_payment_status (trigger paiements)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.update_invoice_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id    uuid;
  v_total_paid    numeric;
  v_invoice_total numeric;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
  FROM public.invoice_payments WHERE invoice_id = v_invoice_id;
  SELECT total_ttc INTO v_invoice_total FROM public.invoices WHERE id = v_invoice_id;
  UPDATE public.invoices SET
    paid_amount    = v_total_paid,
    payment_status = CASE
      WHEN v_total_paid >= v_invoice_total THEN 'paid'
      WHEN v_total_paid > 0               THEN 'partial'
      ELSE 'unpaid'
    END
  WHERE id = v_invoice_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =============================================================================
-- TABLE: invoice_payments
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_payments (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id           uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    company_id           uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    payment_date         date NOT NULL DEFAULT CURRENT_DATE,
    amount               numeric NOT NULL,
    payment_method       character varying(50) DEFAULT 'bank_transfer',
    reference            character varying(255),
    bank_account_id      uuid REFERENCES public.bank_accounts(id),
    bank_transaction_id  uuid REFERENCES public.bank_transactions(id),
    notes                text,
    created_by           character varying(255),
    created_at           timestamptz DEFAULT now()
);

CREATE INDEX idx_invoice_payments_invoice ON public.invoice_payments (invoice_id);
CREATE INDEX idx_invoice_payments_company ON public.invoice_payments (company_id);
CREATE INDEX idx_invoice_payments_date    ON public.invoice_payments (company_id, payment_date);

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_payments_company" ON public.invoice_payments FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER trg_invoice_payment_status
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_invoice_payment_status();

-- Compléter la FK dans treasury_movements
ALTER TABLE public.treasury_movements
    ADD CONSTRAINT treasury_movements_invoice_payment_id_fkey
    FOREIGN KEY (invoice_payment_id)
    REFERENCES public.invoice_payments(id);

COMMENT ON TABLE public.invoice_payments IS 'Paiements associés aux factures';

-- =============================================================================
-- TABLE: withholding_taxes (retenues à la source)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.withholding_taxes (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id     uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    invoice_id     uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
    tax_type       character varying(50) NOT NULL,
    rate           numeric NOT NULL,
    base_amount    numeric NOT NULL,
    tax_amount     numeric NOT NULL,
    period_month   character varying(7) NOT NULL,
    status         character varying(20) DEFAULT 'pending',
    declared_at    timestamptz,
    paid_at        timestamptz,
    receipt_number character varying(50),
    notes          text,
    created_at     timestamptz DEFAULT now(),
    updated_at     timestamptz DEFAULT now()
);

CREATE INDEX idx_withholding_company ON public.withholding_taxes (company_id, period_month);

ALTER TABLE public.withholding_taxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "withholding_user"  ON public.withholding_taxes FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER withholding_taxes_updated_at BEFORE UPDATE ON public.withholding_taxes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.withholding_taxes IS 'Retenues à la source (RAS/RAS-TVA)';

-- =============================================================================
-- TABLE: tax_payments (paiements fiscaux DGI / eSyntas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tax_payments (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id           uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    payment_type         character varying(50) NOT NULL DEFAULT 'autre_fiscal',
    reference            character varying(255),
    fiscal_period        character varying(20),
    payment_date         date NOT NULL,
    amount               numeric NOT NULL,
    bank_account_id      uuid REFERENCES public.bank_accounts(id),
    bank_transaction_id  uuid REFERENCES public.bank_transactions(id),
    source_type          character varying(20) DEFAULT 'manual',
    source_file_url      text,
    ocr_confidence       jsonb,
    ocr_raw_text         text,
    dgi_receipt_number   character varying(100),
    dgi_agent_code       character varying(50),
    dgi_bureau           character varying(255),
    notes                text,
    status               character varying(20) DEFAULT 'pending',
    validated_by         character varying(255),
    validated_at         timestamptz,
    created_by           character varying(255),
    created_at           timestamptz DEFAULT now(),
    updated_at           timestamptz DEFAULT now()
);

CREATE INDEX idx_tax_payments_company ON public.tax_payments (company_id);
CREATE INDEX idx_tax_payments_date    ON public.tax_payments (company_id, payment_date);
CREATE INDEX idx_tax_payments_type    ON public.tax_payments (company_id, payment_type);
CREATE INDEX idx_tax_payments_receipt ON public.tax_payments (dgi_receipt_number) WHERE dgi_receipt_number IS NOT NULL;

ALTER TABLE public.tax_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax_payments_company" ON public.tax_payments FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER tax_payments_updated_at BEFORE UPDATE ON public.tax_payments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.tax_payments IS 'Paiements fiscaux eSyntas / DGI';

-- =============================================================================
-- TABLE: tax_declarations
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.tax_declarations (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id       uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    declaration_type character varying(50) NOT NULL,
    period           character varying(20) NOT NULL,
    total_base       numeric DEFAULT 0,
    total_tax        numeric DEFAULT 0,
    status           character varying(20) DEFAULT 'draft',
    submitted_at     timestamptz,
    reference_dgi    character varying(100),
    pdf_url          character varying(500),
    notes            text,
    created_at       timestamptz DEFAULT now(),
    updated_at       timestamptz DEFAULT now()
);

CREATE INDEX idx_tax_decl_company ON public.tax_declarations (company_id, declaration_type, period);

ALTER TABLE public.tax_declarations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tax_decl_user" ON public.tax_declarations FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER tax_declarations_updated_at BEFORE UPDATE ON public.tax_declarations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- TABLE: esyntas_field_mappings
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.esyntas_field_mappings (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id     uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    source_format  character varying(20) NOT NULL,
    source_field   character varying(100) NOT NULL,
    target_field   character varying(100) NOT NULL,
    transform_rule text,
    usage_count    integer DEFAULT 0,
    created_at     timestamptz DEFAULT now(),
    updated_at     timestamptz DEFAULT now(),
    UNIQUE (company_id, source_format, source_field)
);

CREATE INDEX idx_esyntas_mappings_company ON public.esyntas_field_mappings (company_id);

ALTER TABLE public.esyntas_field_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "esyntas_mappings_company" ON public.esyntas_field_mappings FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

CREATE TRIGGER esyntas_field_mappings_updated_at BEFORE UPDATE ON public.esyntas_field_mappings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
