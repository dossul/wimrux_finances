-- =============================================================================
-- WIMRUX® FINANCES → SUPABASE MIGRATION
-- Migration 11: Création des buckets Storage Supabase
--
-- ⚠️  Ces INSERT utilisent l'API storage.buckets de Supabase.
--     Exécuter depuis le SQL Editor du Dashboard Supabase (pas via psql).
--     Le schéma "storage" n'est pas accessible via psql standard.
--
-- BUCKETS requis:
--   • company-logos      — public   — logos entreprise
--   • invoice-pdfs       — private  — PDFs factures certifiées
--   • invoice-scans      — private  — scans factures reçues
--   • payment-proofs     — private  — justificatifs de paiement
--   • tax-documents      — private  — documents fiscaux DGI
--   • certification-docs — private  — certificats MCF/SECEF
-- =============================================================================

-- Buckets publics
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('company-logos', 'company-logos', true, 5242880,  -- 5 MB
   ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Buckets privés
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('invoice-pdfs', 'invoice-pdfs', false, 26214400,  -- 25 MB
   ARRAY['application/pdf']),
  ('invoice-scans', 'invoice-scans', false, 26214400,  -- 25 MB
   ARRAY['application/pdf','image/jpeg','image/png','image/webp']),
  ('payment-proofs', 'payment-proofs', false, 10485760,  -- 10 MB
   ARRAY['application/pdf','image/jpeg','image/png','image/webp']),
  ('tax-documents', 'tax-documents', false, 26214400,  -- 25 MB
   ARRAY['application/pdf','image/jpeg','image/png']),
  ('certification-docs', 'certification-docs', false, 10485760,  -- 10 MB
   ARRAY['application/pdf','application/json','text/plain'])
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- RLS Policies pour Storage
-- =============================================================================

-- company-logos : lecture publique, écriture pour membres authentifiés
CREATE POLICY "company_logos_select"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'company-logos');

CREATE POLICY "company_logos_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'company-logos');

CREATE POLICY "company_logos_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'company-logos');

CREATE POLICY "company_logos_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'company-logos');

-- invoice-pdfs : accès réservé aux membres de la company (via le préfixe company_id dans le path)
CREATE POLICY "invoice_pdfs_company_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'invoice-pdfs'
    AND (storage.foldername(name))[1]::uuid = (
      SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "invoice_pdfs_company_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'invoice-pdfs'
    AND (storage.foldername(name))[1]::uuid = (
      SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()::text LIMIT 1
    )
  );

-- invoice-scans : même logique que invoice-pdfs
CREATE POLICY "invoice_scans_company_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'invoice-scans'
    AND (storage.foldername(name))[1]::uuid = (
      SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "invoice_scans_company_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'invoice-scans'
    AND (storage.foldername(name))[1]::uuid = (
      SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()::text LIMIT 1
    )
  );

-- payment-proofs : accès company
CREATE POLICY "payment_proofs_company_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1]::uuid = (
      SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "payment_proofs_company_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1]::uuid = (
      SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()::text LIMIT 1
    )
  );

-- tax-documents : accès company
CREATE POLICY "tax_documents_company_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'tax-documents'
    AND (storage.foldername(name))[1]::uuid = (
      SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "tax_documents_company_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tax-documents'
    AND (storage.foldername(name))[1]::uuid = (
      SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()::text LIMIT 1
    )
  );

-- certification-docs : accès company
CREATE POLICY "certification_docs_company_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'certification-docs'
    AND (storage.foldername(name))[1]::uuid = (
      SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()::text LIMIT 1
    )
  );

CREATE POLICY "certification_docs_company_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'certification-docs'
    AND (storage.foldername(name))[1]::uuid = (
      SELECT company_id FROM public.user_profiles WHERE user_id = auth.uid()::text LIMIT 1
    )
  );
