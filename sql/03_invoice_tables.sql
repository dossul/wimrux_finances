-- =============================================================================
-- WIMRUX® FINANCES — DUMP STRUCTURE (Partie 3: Tables Facturation)
-- Date: 2026-06-08
-- =============================================================================

-- =============================================================================
-- TABLE: invoice_sequences
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invoice_sequences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    type character varying(10) NOT NULL,
    year integer NOT NULL,
    last_number integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (company_id, type, year)
);

CREATE INDEX idx_invoice_sequences_company ON public.invoice_sequences USING btree (company_id);

ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoice_sequences_company ON public.invoice_sequences FOR ALL TO public USING (company_id = get_user_company_id());

-- =============================================================================
-- TABLE: invoices
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    client_id uuid,
    supplier_id uuid,
    type character varying(2) NOT NULL,
    reference character varying(100) NOT NULL,
    status character varying(20) NOT NULL DEFAULT 'draft'::character varying,
    price_mode character varying(3) NOT NULL DEFAULT 'TTC'::character varying,
    operator_name character varying(255),
    direction character varying(10) DEFAULT 'issued'::character varying,
    supplier_invoice_number character varying(100),
    original_invoice_id uuid,
    proforma_converted_to uuid,
    description text,
    comments jsonb DEFAULT '[]'::jsonb,
    tax_calculation jsonb,
    total_ht numeric DEFAULT 0,
    total_tva numeric DEFAULT 0,
    total_psvb numeric DEFAULT 0,
    total_ttc numeric DEFAULT 0,
    stamp_duty numeric DEFAULT 0,
    total_payment numeric DEFAULT 0,
    withholding_tax_rate numeric,
    withholding_tax_amount numeric DEFAULT 0,
    due_date date,
    payment_terms_days integer DEFAULT 30,
    payment_status character varying(20) DEFAULT 'unpaid'::character varying,
    paid_amount numeric DEFAULT 0,
    fiscal_compliance_status character varying(20) DEFAULT 'pending'::character varying,
    fiscal_compliance_notes text,
    ifu_verified boolean DEFAULT false,
    ifu_verified_at timestamp with time zone,
    received_at timestamp with time zone,
    received_by character varying(255),
    ocr_source_url text,
    ocr_confidence jsonb,
    scan_url text,
    mcf_uid uuid,
    fiscal_number character varying(50),
    code_secef_dgi character varying(29),
    qr_code text,
    signature text,
    nim character varying(10),
    counters character varying(50),
    certification_datetime timestamp with time zone,
    pdf_url text,
    certification_source character varying(20) DEFAULT 'driver'::character varying,
    certification_device_id uuid,
    coupon_ticket_url text,
    submitted_by character varying(255),
    submitted_at timestamp with time zone,
    approved_by character varying(255),
    approved_at timestamp with time zone,
    rejected_by character varying(255),
    rejected_at timestamp with time zone,
    rejection_reason text,
    credit_note_nature character varying(3),
    validated_at timestamp with time zone,
    certified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX invoices_pkey ON public.invoices USING btree (id);
CREATE UNIQUE INDEX idx_invoices_company_reference ON public.invoices USING btree (company_id, reference);
CREATE INDEX idx_invoices_client_id ON public.invoices USING btree (client_id);
CREATE INDEX idx_invoices_company_id ON public.invoices USING btree (company_id);
CREATE INDEX idx_invoices_direction ON public.invoices USING btree (company_id, direction);
CREATE INDEX idx_invoices_due_date ON public.invoices USING btree (company_id, due_date) WHERE (due_date IS NOT NULL);
CREATE INDEX idx_invoices_payment_status ON public.invoices USING btree (company_id, payment_status);
CREATE INDEX idx_invoices_reference ON public.invoices USING btree (reference);
CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);
CREATE INDEX idx_invoices_supplier ON public.invoices USING btree (company_id, supplier_id);
CREATE INDEX idx_invoices_received_at ON public.invoices USING btree (company_id, received_at);

-- Foreign Keys
ALTER TABLE public.invoices ADD CONSTRAINT invoices_certification_device_id_fkey 
    FOREIGN KEY (certification_device_id) REFERENCES public.certification_devices(id);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_client_id_fkey 
    FOREIGN KEY (client_id) REFERENCES public.clients(id);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_original_invoice_id_fkey 
    FOREIGN KEY (original_invoice_id) REFERENCES public.invoices(id);
ALTER TABLE public.invoices ADD CONSTRAINT invoices_proforma_converted_to_fkey 
    FOREIGN KEY (proforma_converted_to) REFERENCES public.invoices(id) ON DELETE SET NULL;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_supplier_id_fkey 
    FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoices_delete ON public.invoices FOR DELETE TO public USING (company_id = get_user_company_id());
CREATE POLICY invoices_insert ON public.invoices FOR INSERT TO public WITH CHECK (company_id = get_user_company_id());
CREATE POLICY invoices_public_verify ON public.invoices FOR SELECT TO anon USING ((status)::text = 'certified'::text);
CREATE POLICY invoices_select ON public.invoices FOR SELECT TO public USING (company_id = get_user_company_id());
CREATE POLICY invoices_update ON public.invoices FOR UPDATE TO public USING (company_id = get_user_company_id());

-- Triggers
CREATE TRIGGER invoice_status_realtime AFTER UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION notify_invoice_status();
CREATE TRIGGER trg_audit_invoices AFTER INSERT OR DELETE OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION log_audit_changes();
CREATE TRIGGER trg_decrement_stock_on_certification AFTER UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION decrement_stock_on_certification();
CREATE TRIGGER trg_invoice_immutable_delete BEFORE DELETE ON public.invoices FOR EACH ROW WHEN ((old.status)::text = ANY (ARRAY[('validated'::character varying)::text, ('certified'::character varying)::text])) EXECUTE FUNCTION prevent_invoice_modification();
CREATE TRIGGER trg_invoice_immutable_update BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION allow_certification_update();

COMMENT ON TABLE public.invoices IS 'Factures émises (FV, EV, PF) et reçues (FT, ET, EA)';

-- =============================================================================
-- TABLE: invoice_items
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    code character varying(50),
    name character varying(255) NOT NULL,
    type character varying(10) NOT NULL,
    price numeric NOT NULL,
    quantity numeric NOT NULL DEFAULT 1,
    unit character varying(50) DEFAULT 'unité'::character varying,
    tax_group character(1) NOT NULL,
    specific_tax numeric DEFAULT 0,
    discount numeric DEFAULT 0,
    amount_ht numeric DEFAULT 0,
    amount_tva numeric DEFAULT 0,
    amount_psvb numeric DEFAULT 0,
    amount_ttc numeric DEFAULT 0,
    sort_order integer DEFAULT 0
);

CREATE UNIQUE INDEX invoice_items_pkey ON public.invoice_items USING btree (id);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items USING btree (invoice_id);

ALTER TABLE public.invoice_items ADD CONSTRAINT invoice_items_invoice_id_fkey 
    FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoice_items_delete ON public.invoice_items FOR DELETE TO public USING ((EXISTS (SELECT 1 FROM invoices WHERE ((invoices.id = invoice_items.invoice_id) AND (invoices.company_id = get_user_company_id())))));
CREATE POLICY invoice_items_insert ON public.invoice_items FOR INSERT TO public WITH CHECK ((EXISTS (SELECT 1 FROM invoices WHERE ((invoices.id = invoice_items.invoice_id) AND (invoices.company_id = get_user_company_id())))));
CREATE POLICY invoice_items_select ON public.invoice_items FOR SELECT TO public USING ((EXISTS (SELECT 1 FROM invoices WHERE ((invoices.id = invoice_items.invoice_id) AND (invoices.company_id = get_user_company_id())))));
CREATE POLICY invoice_items_update ON public.invoice_items FOR UPDATE TO public USING ((EXISTS (SELECT 1 FROM invoices WHERE ((invoices.id = invoice_items.invoice_id) AND (invoices.company_id = get_user_company_id())))));

CREATE TRIGGER trg_audit_invoice_items AFTER INSERT OR DELETE OR UPDATE ON public.invoice_items FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- =============================================================================
-- TABLE: invoice_payments
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invoice_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL,
    company_id uuid NOT NULL,
    payment_date date NOT NULL DEFAULT CURRENT_DATE,
    amount numeric NOT NULL,
    payment_method character varying(50) DEFAULT 'bank_transfer'::character varying,
    reference character varying(255),
    bank_account_id uuid,
    bank_transaction_id uuid,
    notes text,
    created_by character varying(255),
    created_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX invoice_payments_pkey ON public.invoice_payments USING btree (id);
CREATE INDEX idx_invoice_payments_company ON public.invoice_payments USING btree (company_id);
CREATE INDEX idx_invoice_payments_date ON public.invoice_payments USING btree (company_id, payment_date);
CREATE INDEX idx_invoice_payments_invoice ON public.invoice_payments USING btree (invoice_id);

ALTER TABLE public.invoice_payments ADD CONSTRAINT invoice_payments_bank_account_id_fkey 
    FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);
ALTER TABLE public.invoice_payments ADD CONSTRAINT invoice_payments_bank_transaction_id_fkey 
    FOREIGN KEY (bank_transaction_id) REFERENCES public.bank_transactions(id);
ALTER TABLE public.invoice_payments ADD CONSTRAINT invoice_payments_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.invoice_payments ADD CONSTRAINT invoice_payments_invoice_id_fkey 
    FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

CREATE TRIGGER trg_invoice_payment_status AFTER INSERT OR DELETE OR UPDATE ON public.invoice_payments FOR EACH ROW EXECUTE FUNCTION update_invoice_payment_status();

COMMENT ON TABLE public.invoice_payments IS 'Paiements associés aux factures';

-- =============================================================================
-- TABLE: withholding_taxes (retenues à la source)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.withholding_taxes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    invoice_id uuid,
    tax_type character varying(50) NOT NULL,
    rate numeric NOT NULL,
    base_amount numeric NOT NULL,
    tax_amount numeric NOT NULL,
    period_month character varying(7) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    declared_at timestamp with time zone,
    paid_at timestamp with time zone,
    receipt_number character varying(50),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX withholding_taxes_pkey ON public.withholding_taxes USING btree (id);
CREATE INDEX idx_withholding_company ON public.withholding_taxes USING btree (company_id, period_month);

ALTER TABLE public.withholding_taxes ADD CONSTRAINT withholding_taxes_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.withholding_taxes ADD CONSTRAINT withholding_taxes_invoice_id_fkey 
    FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

ALTER TABLE public.withholding_taxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY withholding_admin ON public.withholding_taxes FOR ALL TO project_admin USING (true);
CREATE POLICY withholding_user ON public.withholding_taxes FOR ALL TO public USING (company_id = get_user_company_id());

CREATE TRIGGER withholding_taxes_updated_at BEFORE UPDATE ON public.withholding_taxes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE public.withholding_taxes IS 'Retenues à la source (RAS/RAS-TVA)';

-- =============================================================================
-- TABLE: tax_payments (paiements fiscaux DGI)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tax_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    payment_type character varying(50) NOT NULL DEFAULT 'autre_fiscal'::character varying,
    reference character varying(255),
    fiscal_period character varying(20),
    payment_date date NOT NULL,
    amount numeric NOT NULL,
    bank_account_id uuid,
    bank_transaction_id uuid,
    source_type character varying(20) DEFAULT 'manual'::character varying,
    source_file_url text,
    ocr_confidence jsonb,
    ocr_raw_text text,
    dgi_receipt_number character varying(100),
    dgi_agent_code character varying(50),
    dgi_bureau character varying(255),
    notes text,
    status character varying(20) DEFAULT 'pending'::character varying,
    validated_by character varying(255),
    validated_at timestamp with time zone,
    created_by character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX tax_payments_pkey ON public.tax_payments USING btree (id);
CREATE INDEX idx_tax_payments_company ON public.tax_payments USING btree (company_id);
CREATE INDEX idx_tax_payments_date ON public.tax_payments USING btree (company_id, payment_date);
CREATE INDEX idx_tax_payments_type ON public.tax_payments USING btree (company_id, payment_type);
CREATE INDEX idx_tax_payments_receipt ON public.tax_payments USING btree (dgi_receipt_number) WHERE dgi_receipt_number IS NOT NULL;

ALTER TABLE public.tax_payments ADD CONSTRAINT tax_payments_bank_account_id_fkey 
    FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);
ALTER TABLE public.tax_payments ADD CONSTRAINT tax_payments_bank_transaction_id_fkey 
    FOREIGN KEY (bank_transaction_id) REFERENCES public.bank_transactions(id);
ALTER TABLE public.tax_payments ADD CONSTRAINT tax_payments_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.tax_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tax_payments_company ON public.tax_payments FOR ALL TO public USING (company_id = get_user_company_id());

CREATE TRIGGER tax_payments_updated_at BEFORE UPDATE ON public.tax_payments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE public.tax_payments IS 'Paiements fiscaux eSyntas / DGI';

-- =============================================================================
-- TABLE: tax_declarations
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tax_declarations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    declaration_type character varying(50) NOT NULL,
    period character varying(20) NOT NULL,
    total_base numeric DEFAULT 0,
    total_tax numeric DEFAULT 0,
    status character varying(20) DEFAULT 'draft'::character varying,
    submitted_at timestamp with time zone,
    reference_dgi character varying(100),
    pdf_url character varying(500),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE UNIQUE INDEX tax_declarations_pkey ON public.tax_declarations USING btree (id);
CREATE INDEX idx_tax_decl_company ON public.tax_declarations USING btree (company_id, declaration_type, period);

ALTER TABLE public.tax_declarations ADD CONSTRAINT tax_declarations_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.tax_declarations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tax_decl_admin ON public.tax_declarations FOR ALL TO project_admin USING (true);
CREATE POLICY tax_decl_user ON public.tax_declarations FOR ALL TO public USING (company_id = get_user_company_id());

CREATE TRIGGER tax_declarations_updated_at BEFORE UPDATE ON public.tax_declarations FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- TABLE: esyntas_field_mappings
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.esyntas_field_mappings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    source_format character varying(20) NOT NULL,
    source_field character varying(100) NOT NULL,
    target_field character varying(100) NOT NULL,
    transform_rule text,
    usage_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE (company_id, source_format, source_field)
);

CREATE INDEX idx_esyntas_mappings_company ON public.esyntas_field_mappings USING btree (company_id);

ALTER TABLE public.esyntas_field_mappings ADD CONSTRAINT esyntas_field_mappings_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.esyntas_field_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY esyntas_mappings_company ON public.esyntas_field_mappings FOR ALL TO public USING (company_id = get_user_company_id());
