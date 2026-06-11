# WIMRUX® FINANCES — STORAGE BUCKETS INSFORGE

**Date de génération:** 2026-06-08  
**Backend:** https://gfe4bd9y.eu-central.insforge.app

---

## 📦 Liste des Buckets (13 buckets)

| # | Nom du Bucket | Public | Object Count | Usage |
|---|---------------|--------|--------------|-------|
| 1 | `invoices-pdf` | ✅ Oui | 4 | PDF des factures certifiées |
| 2 | `company-logos` | ✅ Oui | 1 | Logos des entreprises |
| 3 | `invoices-scans` | ✅ Oui | 0 | Scans de factures physiques |
| 4 | `carnet-logos` | ✅ Oui | 0 | Logos partenaires (carnet) |
| 5 | `carnet-documents` | ❌ Non | 0 | Documents carnet |
| 6 | `carnet-rapports` | ❌ Non | 0 | Rapports carnet |
| 7 | `carnet-scans` | ❌ Non | 0 | Scans carnet |
| 8 | `carnet-scans-processed` | ❌ Non | 0 | Scans traités carnet |
| 9 | `carnet-signatures` | ❌ Non | 0 | Signatures carnet |
| 10 | `certified-invoices-scans` | ❌ Non | 0 | Scans factures certifiées |
| 11 | `coupon-tickets` | ❌ Non | 0 | Tickets de coupon |
| 12 | `payment-evidences` | ❌ Non | 0 | Preuves de paiement |
| 13 | `report-exports` | ❌ Non | 0 | Exports de rapports |

**Taille totale:** ~0.16 MB

---

## 🔐 Configuration des Buckets

### Buckets Publics (Accès sans auth)

```sql
-- invoices-pdf
-- company-logos
-- invoices-scans
-- carnet-logos
```

**Usage:** Génération de liens publics pour partage de factures/certifications

### Buckets Privés (Auth requise)

```sql
-- carnet-documents
-- carnet-rapports
-- carnet-scans
-- carnet-scans-processed
-- carnet-signatures
-- certified-invoices-scans
-- coupon-tickets
-- payment-evidences
-- report-exports
```

**Usage:** Données sensibles, accès contrôlé via RLS/Auth

---

## 📁 Structure des chemins par bucket

### `invoices-pdf`
```
invoices-pdf/
  └── {company_id}/
      └── {invoice_id}.pdf
```
**Exemple:** `invoices-pdf/550e8400-e29b-41d4-a716-446655440000/inv-001.pdf`

### `invoices-scans`
```
invoices-scans/
  └── {company_id}/
      └── invoices/
          └── {invoice_id}/
              └── scan-{timestamp}.pdf
```
**Exemple:** `invoices-scans/550e8400/scan-20240608120000.pdf`

### `company-logos`
```
company-logos/
  └── {company_id}/
      └── logo.{ext}
```

### `payment-evidences`
```
payment-evidences/
  └── {company_id}/
      └── payments/
          └── {payment_id}/
              └── evidence-{timestamp}.jpg
```

### `certified-invoices-scans`
```
certified-invoices-scans/
  └── {company_id}/
      └── {certification_device_id}/
          └── {invoice_id}/
              └── {filename}.pdf
```

### `report-exports`
```
report-exports/
  └── {company_id}/
      └── {export_id}/
          └── report.{csv|json|html|pdf}
```

---

## 🔧 Création des Buckets (SQL)

```sql
-- Buckins publics
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES 
  ('invoices-pdf', 'invoices-pdf', true, false, 10485760, '{application/pdf}'),
  ('company-logos', 'company-logos', true, false, 2097152, '{image/jpeg,image/png,image/svg+xml}'),
  ('invoices-scans', 'invoices-scans', true, false, 10485760, '{application/pdf,image/jpeg,image/png}'),
  ('carnet-logos', 'carnet-logos', true, false, 2097152, '{image/jpeg,image/png}');

-- Buckets privés
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES 
  ('carnet-documents', 'carnet-documents', false, false, 52428800, '{application/pdf,image/*}'),
  ('carnet-rapports', 'carnet-rapports', false, false, 52428800, '{application/pdf}'),
  ('carnet-scans', 'carnet-scans', false, false, 52428800, '{image/jpeg,image/png,application/pdf}'),
  ('carnet-scans-processed', 'carnet-scans-processed', false, false, 52428800, '{application/pdf}'),
  ('carnet-signatures', 'carnet-signatures', false, false, 2097152, '{image/png}'),
  ('certified-invoices-scans', 'certified-invoices-scans', false, false, 10485760, '{application/pdf,image/jpeg}'),
  ('coupon-tickets', 'coupon-tickets', false, false, 2097152, '{application/pdf}'),
  ('payment-evidences', 'payment-evidences', false, false, 5242880, '{image/jpeg,image/png,application/pdf}'),
  ('report-exports', 'report-exports', false, false, 52428800, '{text/csv,application/json,text/html,application/pdf}');
```

---

## 🛡️ RLS Policies pour Storage

### Bucket: `invoices-scans`
```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoices-scans' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow company members to read
CREATE POLICY "Allow company members to read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'invoices-scans');
```

### Bucket: `payment-evidences`
```sql
-- Allow authenticated uploads
CREATE POLICY "Allow payment evidence upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'payment-evidences');

-- Allow company read
CREATE POLICY "Allow payment evidence read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-evidences');
```

---

## 📊 Utilisation par bucket (métriques)

| Bucket | Taille estimée | % Usage |
|--------|---------------|---------|
| `invoices-pdf` | ~160 KB | 99% |
| `company-logos` | ~5 KB | 1% |
| Autres | 0 B | 0% |

**Total:** ~165 KB / 1 GB disponible

---

## 🔄 Edge Functions liées au Storage

| Function | Bucket utilisé | Description |
|----------|---------------|-------------|
| `ingest-image-payment` | `payment-evidences` | Upload preuve paiement → OCR |
| `ingest-statement-file` | `report-exports` | Import relevés bancaires |
| `export-report` | `report-exports` | Génération exports |
| `pdf-to-images` | `invoices-pdf` | Conversion PDF → Images |
| `parse-certified-invoice` | `certified-invoices-scans` | OCR factures certifiées |

---

## 📝 Notes importantes

1. **Maximum file size:** 10MB pour PDF factures, 50MB pour documents carnet
2. **Formats acceptés:** PDF, JPEG, PNG principalement
3. **URL publique format:** `https://gfe4bd9y.eu-central.insforge.app/storage/v1/object/public/{bucket}/{path}`
4. **URL signée format:** `https://gfe4bd9y.eu-central.insforge.app/storage/v1/object/sign/{bucket}/{path}?token={jwt}`
5. **Expiration URL signée:** Par défaut 1 heure

---

## 🔗 URLs d'accès

**Base URL Storage:**
```
https://gfe4bd9y.eu-central.insforge.app/storage/v1
```

**Exemple lien public:**
```
https://gfe4bd9y.eu-central.insforge.app/storage/v1/object/public/invoices-pdf/{company_id}/{invoice_id}.pdf
```

**SDK InsForge upload:**
```typescript
const { data, error } = await insforge.storage
  .from('invoices-scans')
  .upload(`company-id/invoice-id/scan.pdf`, file);
```
