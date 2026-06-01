CREATE POLICY "Allow public inserts" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'invoices-scans');
CREATE POLICY "Allow public select" ON storage.objects FOR SELECT TO public USING (bucket_id = 'invoices-scans');
