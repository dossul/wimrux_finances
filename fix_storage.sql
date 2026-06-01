ALTER TABLE storage.objects ADD COLUMN IF NOT EXISTS uploaded_via TEXT DEFAULT 'sdk';
