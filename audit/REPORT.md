# Audit Migration InsForge → Appwrite

**Date:** 2026-06-12T11:49:26.964223
**Endpoint:** https://appwrite.benga.live/v1

## 📊 Statistiques globales

| Métrique | Valeur |
|----------|--------|
| Tables SQL cible | 45 |
| Collections Appwrite | 25 |
| Buckets Appwrite | 13 |
| Functions Appwrite | 8 |

## 🗄️ Tables / Collections

### ❌ Collections MANQUANTES (à créer)

- `ai_usage_logs` - 11 attributs
- `bank_statement_imports` - 13 attributs
- `bank_transactions` - 18 attributs
- `checks` - 13 attributs
- `company_ai_quota_usage` - 7 attributs
- `company_ai_task_routing` - 8 attributs
- `company_role_permissions` - 9 attributs
- `mcf_logs` - 9 attributs
- `mobile_wallet_transactions` - 14 attributs
- `mobile_wallets` - 10 attributs
- `notifications` - 12 attributs
- `otp_codes` - 8 attributs
- `payment_providers` - 8 attributs
- `pending_certification_queue` - 10 attributs
- `petty_cash_accounts` - 9 attributs
- `petty_cash_movements` - 10 attributs
- `reconciliation_rules` - 10 attributs
- `treasury_movements` - 14 attributs
- `wallet_transactions` - 32 attributs
- `wire_transfers` - 15 attributs

### ⚠️ Collections INCOMPLÈTES (à compléter)

- `ai_models` - 2 attrs manquants, 2 types incorrects
- `ai_models_default_routing` - 1 attrs manquants
- `ai_providers` - 2 attrs manquants
- `ai_tasks` - 1 attrs manquants
- `articles` - 7 attrs manquants, 1 types incorrects
- `audit_log` - 2 attrs manquants
- `bank_accounts` - 7 attrs manquants
- `certification_devices` - 3 attrs manquants
- `clients` - 4 attrs manquants
- `companies` - 5 attrs manquants
- `company_ai_credits` - 3 attrs manquants, 3 types incorrects
- `esyntas_field_mappings` - 3 attrs manquants
- `invoice_items` - 1 attrs manquants, 8 types incorrects
- `invoice_payments` - 2 attrs manquants, 1 types incorrects
- `invoice_sequences` - 3 attrs manquants
- `invoices` - 1 attrs manquants, 9 types incorrects
- `payment_evidences` - 2 attrs manquants
- `payment_wallets` - 3 attrs manquants
- `suppliers` - 12 attrs manquants
- `tax_declarations` - 3 attrs manquants, 2 types incorrects
- `tax_payments` - 3 attrs manquants, 1 types incorrects
- `transaction_categories` - 3 attrs manquants
- `treasury_accounts` - 6 attrs manquants
- `user_profiles` - 3 attrs manquants
- `withholding_taxes` - 3 attrs manquants, 3 types incorrects

## 📦 Buckets Storage

### ❌ Buckets MANQUANTS

- `carnet-documents`
- `carnet-logos`
- `carnet-rapports`
- `carnet-scans`
- `carnet-scans-processed`
- `carnet-signatures`
- `certified-invoices-scans`
- `company-logos`
- `coupon-tickets`
- `invoices-pdf`
- `invoices-scans`
- `payment-evidences`
- `report-exports`

## ⚡ Edge Functions

### ❌ Functions MANQUANTES (22)

- `cashflow-forecast`
- `chatbot-gateway`
- `crypto-aes256`
- `delete-user`
- `detect-anomalies`
- `device-heartbeat`
- `export-report`
- `fnec-simulator`
- `generate-device-key`
- `ingest-image-payment`
- `ingest-payment`
- `ingest-sms`
- `ingest-statement-file`
- `ingest-text-payment`
- `mcf-simulator`
- `next-invoice-ref`
- `nl-to-sql`
- `parse-certified-invoice`
- `pdf-to-images`
- `pull-pending-invoices`
- `push-certified-invoice`
- `verify-tax-id`

### ✅ Functions OK (4)

- `ai-router`
- `send-email`
- `send-otp-whatsapp`
- `verify-otp`

## 🎯 Recommandations

### Priorité 0 (Bloquant)
1. Créer les collections manquantes avec attributs corrects
2. Corriger les permissions sur toutes les collections (read/write users)
3. Créer les buckets storage manquants

### Priorité 1 (Critique)
1. Compléter les attributs manquants sur collections INCOMPLETE
2. Corriger les types d'attributs incorrects
3. Créer les index manquants

### Priorité 2 (Important)
1. Déployer les edge functions critiques (auth, OTP, email)
2. Migrer les données depuis InsForge

### Priorité 3 (Amélioration)
1. Déployer toutes les edge functions
2. Portage des triggers métier
3. Tests E2E complets
