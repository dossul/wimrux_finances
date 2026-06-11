-- =============================================================================
-- WIMRUX® FINANCES → SUPABASE MIGRATION
-- Migration 05: Tables de facturation
-- =============================================================================

-- =============================================================================
-- FONCTIONS métier factures (nécessaires avant les triggers)
-- =============================================================================

-- Garde workflow de certification
CREATE OR REPLACE FUNCTION public.allow_certification_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF OLD.status = 'draft' THEN RETURN NEW; END IF;
  IF OLD.status = 'pending_validation' AND NEW.status IN ('approved','draft','certified') THEN RETURN NEW; END IF;
  IF OLD.status = 'approved' AND NEW.status IN ('validated','certified') THEN RETURN NEW; END IF;
  IF OLD.status = 'approved' AND NEW.status = 'sent' AND OLD.type = 'PF' THEN RETURN NEW; END IF;
  IF OLD.status = 'sent' AND NEW.status IN ('accepted','rejected') AND OLD.type = 'PF' THEN RETURN NEW; END IF;
  IF OLD.status = 'validated' AND NEW.status = 'certified' THEN RETURN NEW; END IF;
  IF OLD.status = 'pending_validation' AND NEW.status = 'certified' THEN RETURN NEW; END IF;
  IF OLD.status IN ('certified','cancelled') THEN
    RAISE EXCEPTION 'INTERDIT: Modification non autorisée sur facture % (status: %)', OLD.reference, OLD.status;
  END IF;
  RAISE EXCEPTION 'INTERDIT: Transition non autorisée sur facture % (% → %)', OLD.reference, OLD.status, NEW.status;
END;
$$;

-- Prévention suppression factures immutables
CREATE OR REPLACE FUNCTION public.prevent_invoice_modification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'INTERDIT: Facture % est immuable (status: %)', OLD.reference, OLD.status;
END;
$$;

-- Décrémente le stock lors de la certification
CREATE OR REPLACE FUNCTION public.decrement_stock_on_certification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'certified' AND (OLD.status IS DISTINCT FROM 'certified') THEN
    UPDATE public.articles a
    SET stock_quantity = GREATEST(COALESCE(a.stock_quantity, 0) - i.quantity, 0)
    FROM public.invoice_items i
    WHERE i.invoice_id = NEW.id
      AND a.company_id = NEW.company_id
      AND a.code = i.code;
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- TABLE: invoice_sequences
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type        character varying(10) NOT NULL,
    year        integer NOT NULL,
    last_number integer NOT NULL DEFAULT 0,
    created_at  timestamptz DEFAULT now(),
    updated_at  timestamptz DEFAULT now(),
    UNIQUE (company_id, type, year)
);

CREATE INDEX idx_invoice_sequences_company ON public.invoice_sequences (company_id);

ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_sequences_company" ON public.invoice_sequences FOR ALL TO authenticated
    USING (company_id = get_user_company_id()) WITH CHECK (company_id = get_user_company_id());

-- Fonction RPC pour incrémenter la séquence de manière atomique
CREATE OR REPLACE FUNCTION public.next_invoice_reference(
    p_company_id uuid,
    p_type       varchar,
    p_year       int
)
RETURNS varchar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix    varchar(10) := CASE p_type
    WHEN 'FV' THEN 'FV' WHEN 'FT' THEN 'FR' WHEN 'FA' THEN 'FA'
    WHEN 'EV' THEN 'EV' WHEN 'ET' THEN 'ET' WHEN 'EA' THEN 'EA'
    WHEN 'PF' THEN 'PF' ELSE 'DOC' END;
  v_next_seq  integer;
  v_reference varchar(100);
BEGIN
  INSERT INTO public.invoice_sequences (company_id, type, year, last_number)
  VALUES (p_company_id, p_type, p_year, 1)
  ON CONFLICT (company_id, type, year)
  DO UPDATE SET last_number = invoice_sequences.last_number + 1
  RETURNING last_number INTO v_next_seq;

  v_reference := v_prefix || '-' || p_year || '-' || LPAD(v_next_seq::text, 4, '0');
  RETURN v_reference;
END;
$$;

-- =============================================================================
-- TABLE: invoices
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoices (
    id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id                  uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    client_id                   uuid REFERENCES public.clients(id),
    supplier_id                 uuid REFERENCES public.suppliers(id),
    type                        character varying(2) NOT NULL,
    reference                   character varying(100) NOT NULL,
    status                      character varying(20) NOT NULL DEFAULT 'draft',
    price_mode                  character varying(3) NOT NULL DEFAULT 'TTC',
    operator_name               character varying(255),
    direction                   character varying(10) DEFAULT 'issued',
    supplier_invoice_number     character varying(100),
    original_invoice_id         uuid REFERENCES public.invoices(id),
    proforma_converted_to       uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
    description                 text,
    comments                    jsonb DEFAULT '[]'::jsonb,
    tax_calculation             jsonb,
    total_ht                    numeric DEFAULT 0,
    total_tva                   numeric DEFAULT 0,
    total_psvb                  numeric DEFAULT 0,
    total_ttc                   numeric DEFAULT 0,
    stamp_duty                  numeric DEFAULT 0,
    total_payment               numeric DEFAULT 0,
    withholding_tax_rate        numeric,
    withholding_tax_amount      numeric DEFAULT 0,
    due_date                    date,
    payment_terms_days          integer DEFAULT 30,
    payment_status              character varying(20) DEFAULT 'unpaid',
    paid_amount                 numeric DEFAULT 0,
    fiscal_compliance_status    character varying(20) DEFAULT 'pending',
    fiscal_compliance_notes     text,
    ifu_verified                boolean DEFAULT false,
    ifu_verified_at             timestamptz,
    received_at                 timestamptz,
    received_by                 character varying(255),
    ocr_source_url              text,
    ocr_confidence              jsonb,
    scan_url                    text,
    mcf_uid                     uuid,
    fiscal_number               character varying(50),
    code_secef_dgi              character varying(29),
    qr_code                     text,
    signature                   text,
    nim                         character varying(10),
    counters                    character varying(50),
    certification_datetime      timestamptz,
    pdf_url                     text,
    certification_source        character varying(20) DEFAULT 'driver',
    certification_device_id     uuid REFERENCES public.certification_devices(id),
    coupon_ticket_url           text,
    submitted_by                character varying(255),
    submitted_at                timestamptz,
    approved_by                 character varying(255),
    approved_at                 timestamptz,
    rejected_by                 character varying(255),
    rejected_at                 timestamptz,
    rejection_reason            text,
    credit_note_nature          character varying(3),
    validated_at                timestamptz,
    certified_at                timestamptz,
    created_at                  timestamptz DEFAULT now(),
    UNIQUE (company_id, reference)
);

CREATE INDEX idx_invoices_company_id      ON public.invoices (company_id);
CREATE INDEX idx_invoices_client_id       ON public.invoices (client_id);
CREATE INDEX idx_invoices_supplier        ON public.invoices (company_id, supplier_id);
CREATE INDEX idx_invoices_status          ON public.invoices (status);
CREATE INDEX idx_invoices_reference       ON public.invoices (reference);
CREATE INDEX idx_invoices_direction       ON public.invoices (company_id, direction);
CREATE INDEX idx_invoices_payment_status  ON public.invoices (company_id, payment_status);
CREATE INDEX idx_invoices_due_date        ON public.invoices (company_id, due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_invoices_received_at     ON public.invoices (company_id, received_at);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_select"       ON public.invoices FOR SELECT TO authenticated USING (company_id = get_user_company_id());
CREATE POLICY "invoices_insert"       ON public.invoices FOR INSERT TO authenticated WITH CHECK (company_id = get_user_company_id());
CREATE POLICY "invoices_update"       ON public.invoices FOR UPDATE TO authenticated USING (company_id = get_user_company_id());
CREATE POLICY "invoices_delete"       ON public.invoices FOR DELETE TO authenticated USING (company_id = get_user_company_id());
-- Accès public lecture seule pour les factures certifiées (vérification QR)
CREATE POLICY "invoices_public_verify" ON public.invoices FOR SELECT TO anon USING (status = 'certified');

CREATE TRIGGER invoice_status_realtime
  AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.notify_invoice_status();

CREATE TRIGGER trg_audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();

CREATE TRIGGER trg_decrement_stock_on_certification
  AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_certification();

CREATE TRIGGER trg_invoice_immutable_delete
  BEFORE DELETE ON public.invoices
  FOR EACH ROW
  WHEN (OLD.status IN ('validated','certified'))
  EXECUTE FUNCTION public.prevent_invoice_modification();

CREATE TRIGGER trg_invoice_immutable_update
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.allow_certification_update();

COMMENT ON TABLE public.invoices IS 'Factures émises (FV/EV/PF) et reçues (FT/ET/EA)';

-- =============================================================================
-- TABLE: invoice_items
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id    uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    code          character varying(50),
    name          character varying(255) NOT NULL,
    type          character varying(10) NOT NULL,
    price         numeric NOT NULL,
    quantity      numeric NOT NULL DEFAULT 1,
    unit          character varying(50) DEFAULT 'unité',
    tax_group     char(1) NOT NULL,
    specific_tax  numeric DEFAULT 0,
    discount      numeric DEFAULT 0,
    amount_ht     numeric DEFAULT 0,
    amount_tva    numeric DEFAULT 0,
    amount_psvb   numeric DEFAULT 0,
    amount_ttc    numeric DEFAULT 0,
    sort_order    integer DEFAULT 0
);

CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items (invoice_id);

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoice_items_select" ON public.invoice_items FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_items.invoice_id AND company_id = get_user_company_id()));
CREATE POLICY "invoice_items_insert" ON public.invoice_items FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_items.invoice_id AND company_id = get_user_company_id()));
CREATE POLICY "invoice_items_update" ON public.invoice_items FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_items.invoice_id AND company_id = get_user_company_id()));
CREATE POLICY "invoice_items_delete" ON public.invoice_items FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.invoices WHERE id = invoice_items.invoice_id AND company_id = get_user_company_id()));

CREATE TRIGGER trg_audit_invoice_items
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_changes();
