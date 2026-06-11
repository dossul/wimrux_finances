# WIMRUX® FINANCES — DUMP COMPLET DE LA STRUCTURE INSFORGE

**Date de génération:** 2026-06-08 09:52 UTC  
**Backend:** https://gfe4bd9y.eu-central.insforge.app  
**Projet:** Wimrux Finances — Burkina Faso  
**Version:** 2026.06.08

---

## 📁 Structure des fichiers

```
sql/
├── README.md                           ← Ce fichier (index complet)
├── 01_extensions_and_functions.sql     ← Extensions PostgreSQL + fonctions utilitaires
├── 02_core_tables.sql                  ← Tables core (companies, users, clients, suppliers)
├── 03_invoice_tables.sql               ← Tables facturation (invoices, items, payments)
├── 04_ai_and_system_tables.sql         ← Tables IA et système (AI models, permissions, 2FA)
├── 05_mobile_money_and_wallet.sql    ← Mobile money, wallets, bank transactions
├── 06_storage_buckets.md              ← Documentation des buckets Storage
└── 99_data_insert_template.sql        ← Template d'insertion de données (à venir)
```

---

## 📊 Statistiques de la base

| Métrique | Valeur |
|----------|--------|
| **Tables** | 95+ tables |
| **Extensions** | 5 extensions PostgreSQL |
| **Fonctions** | 50+ fonctions PL/pgSQL |
| **Buckets Storage** | 13 buckets |
| **Edge Functions** | 24 functions |
| **Taille totale DB** | ~22.2 MB |
| **Taille Storage** | ~0.16 MB |

---

## 🗄️ Extensions PostgreSQL installées

| Extension | Version | Schema | Usage |
|-----------|---------|--------|-------|
| `fuzzystrmatch` | 1.1 | public | Matching fuzzy (Levenshtein) pour rapprochement bancaire |
| `http` | 1.7 | public | Client HTTP pour appels API externes |
| `pg_cron` | 1.6 | pg_catalog | Job scheduler pour tâches automatisées |
| `pgcrypto` | 1.3 | public | Cryptographie (hash, encryption) |
| `plpgsql` | 1.0 | pg_catalog | Langage procédural PostgreSQL |

---

## 🏛️ Architecture des tables par domaine

### 1. **Core / Authentification**
- `companies` — Entreprises clientes
- `user_profiles` — Profils utilisateurs
- `clients` — Clients B2B/B2C pour facturation
- `suppliers` — Fournisseurs
- `company_role_permissions` — Permissions RBAC
- `otp_codes` — Codes 2FA WhatsApp

### 2. **Facturation (Invoices)**
- `invoices` — Factures émises et reçues
- `invoice_items` — Lignes de facture
- `invoice_payments` — Paiements de factures
- `invoice_sequences` — Séquences de numérotation
- `invoice_templates` — Templates de facturation
- `withholding_taxes` — Retenues à la source (RAS)
- `tax_payments` — Paiements fiscaux (eSyntas/DGI)
- `tax_declarations` — Déclarations fiscales

### 3. **Comptabilité / Trésorerie**
- `bank_accounts` — Comptes bancaires
- `bank_transactions` — Transactions bancaires
- `bank_statement_imports` — Imports de relevés
- `treasury_accounts` — Comptes de trésorerie
- `treasury_movements` — Mouvements de trésorerie
- `mobile_wallets` — Wallets mobile money
- `wallet_transactions` — Transactions wallets
- `payment_wallets` — Portefeuilles de paiement
- `payment_evidences` — Preuves de paiement
- `checks` — Chèques émis
- `wire_transfers` — Virements bancaires
- `petty_cash_accounts` — Caisse
- `petty_cash_movements` — Mouvements caisse

### 4. **Articles / Stock**
- `articles` — Articles et produits
- `transaction_categories` — Catégories de transaction

### 5. **IA / ML**
- `ai_providers` — Fournisseurs IA (OpenAI, Anthropic)
- `ai_models` — Modèles IA
- `ai_tasks` — Tâches IA définies
- `ai_models_default_routing` — Routage par défaut
- `ai_usage_logs` — Logs d'utilisation IA
- `company_ai_credits` — Crédits IA par entreprise
- `company_ai_quota_usage` — Quotas mensuels IA
- `company_ai_task_routing` — Routage personnalisé
- `ai_admin_settings` — Paramètres admin IA
- `ai_credit_packs` — Packs de crédits
- `ai_credit_transactions` — Transactions crédits
- `company_ai_credentials` — Credentials IA entreprise

### 6. **Système / Audit**
- `audit_log` — Logs d'audit complets
- `notifications` — Notifications utilisateurs
- `mcf_logs` — Logs de certification MCF/DGI
- `esyntas_field_mappings` — Mappings eSyntas

### 7. **Certification DGI**
- `certification_devices` — Appareils de certification
- `pending_certification_queue` — File d'attente certification
- `sim_invoices` — Factures simulées (dev)

### 8. **Chatbot / Support**
- `chatbot_api_keys` — Clés API chatbot
- `chatbot_conversations` — Conversations
- `chatbot_messages` — Messages
- `chatbot_permissions` — Permissions chatbot
- `support_tickets` — Tickets support
- `support_ticket_messages` — Messages tickets

### 9. **Budgets / Prévisions**
- `budgets` — Budgets annuels
- `budget_lines` — Lignes de budget
- `cashflow_forecasts` — Prévisions de trésorerie
- `cashflow_scenarios` — Scénarios

### 10. **Immobilisations**
- `fixed_assets` — Immobilisations
- `asset_categories` — Catégories
- `asset_depreciation_entries` — Amortissements

### 11. **Autres**
- `payment_cards` — Cartes bancaires
- `payment_providers` — Opérateurs MNO
- `country_fiscal_configs` — Config fiscale par pays
- `currency_rates` — Taux de change
- `devices` — Appareils connectés
- `subscriptions` — Abonnements
- `user_consents` — Consentements utilisateurs
- `anomaly_alerts` — Alertes anomalies
- `approval_workflows` — Workflows d'approbation
- `data_export_requests` — Demandes d'export
- `report_exports` — Exports générés
- `saved_queries` — Requêtes sauvegardées

---

## 🔐 Row Level Security (RLS)

**Tables avec RLS activé:** 50+ tables

**Patterns de sécurité:**
1. **Tenant isolation** — `company_id = get_user_company_id()`
2. **User isolation** — `user_id = auth.uid()`
3. **Role-based** — Vérification du rôle dans `user_profiles`
4. **Public read** — Accès anonyme pour certaines données

**Fonctions de sécurité:**
- `get_user_company_id()` — Récupère l'entreprise de l'utilisateur connecté
- `is_project_admin()` — Vérifie si l'utilisateur est admin projet

---

## 🎯 Fonctions principales

### Workflow Facturation
- `next_invoice_reference()` — Génère références séquentielles
- `allow_certification_update()` — Guard transitions workflow
- `update_invoice_payment_status()` — Sync statut paiement

### Audit
- `log_audit_changes()` — Log toutes modifications
- `prevent_audit_log_modification()` — Immuabilité audit

### AI / Automation
- `auto_provision_ai_for_new_company()` — Provisionnement crédits IA
- `auto_reconcile()` — Rapprochement bancaire automatique

### Fiscal
- `calculate_vat()` — Calcul TVA
- `calculate_withholding_tax()` — Calcul RAS

### Utilitaires
- `set_updated_at()` — Auto-update timestamps
- `format_currency()` — Formatage montants
- `verify_otp()` — Vérification codes 2FA

---

## 📦 Buckets Storage (13 buckets)

### Publics (4)
1. `invoices-pdf` — PDF factures certifiées
2. `company-logos` — Logos entreprises
3. `invoices-scans` — Scans factures
4. `carnet-logos` — Logos partenaires

### Privés (9)
5. `carnet-documents`
6. `carnet-rapports`
7. `carnet-scans`
8. `carnet-scans-processed`
9. `carnet-signatures`
10. `certified-invoices-scans`
11. `coupon-tickets`
12. `payment-evidences`
13. `report-exports`

**Voir:** `06_storage_buckets.md` pour détails complets

---

## ⚡ Edge Functions (24 functions)

| Function | Description |
|----------|-------------|
| `ai-router` | Router IA centralisé |
| `send-email` | Envoi emails SMTP |
| `send-otp-whatsapp` | OTP WhatsApp 2FA |
| `verify-otp` | Vérification OTP |
| `cashflow-forecast` | Prévision trésorerie IA |
| `detect-anomalies` | Détection anomalies |
| `export-report` | Génération exports |
| `ingest-payment` | Ingestion paiements |
| `ingest-image-payment` | OCR preuves paiement |
| `ingest-statement-file` | Import relevés bancaires |
| `ingest-text-payment` | Parsing SMS paiements |
| `ingest-sms` | Ingestion SMS |
| `nl-to-sql` | NL → SQL avec garde-fous |
| `verify-tax-id` | Vérification IFU/DGI |
| `generate-device-key` | Génération clés appareils |
| `device-heartbeat` | Heartbeat appareils |
| `push-certified-invoice` | Push facture certifiée |
| `pull-pending-invoices` | Pull file attente |
| `parse-certified-invoice` | OCR factures certifiées |
| `pdf-to-images` | Conversion PDF |
| `mcf-simulator` | Simulateur MCF/DGI |
| `fnec-simulator` | Simulateur FNEC |
| `chatbot-gateway` | Gateway chatbot |
| `crypto-aes256` | Chiffrement AES-256 |
| `delete-user` | Suppression utilisateurs |

---

## 🔄 Triggers par table

### `invoices`
- `invoice_status_realtime` → Notifications realtime
- `trg_audit_invoices` → Audit trail
- `trg_decrement_stock_on_certification` → Décrément stock
- `trg_invoice_immutable_delete` → Guard suppression
- `trg_invoice_immutable_update` → Guard workflow

### `invoice_items`
- `trg_audit_invoice_items` → Audit trail

### `invoice_payments`
- `trg_invoice_payment_status` → Sync statut paiement

### `withholding_taxes`
- `withholding_taxes_updated_at` → Auto-update timestamp

### `clients`, `companies`, `bank_accounts`
- `trg_audit_*` → Audit trail

---

## 📈 Indexes principaux

### Clés uniques
- `idx_invoices_company_reference` — Unicité référence facture
- `articles_company_id_code_key` — Unicité code article
- `mobile_wallets_company_id_provider_phone_number_key` — Unicité wallet
- `otp_codes_user_id_code_key` — Unicité OTP

### Indexes de performance
- `idx_invoices_*` — Multiples indexes sur company_id, status, due_date
- `idx_invoice_payments_invoice` — Jointure paiements
- `idx_tax_payments_date` — Filtrage par date
- `idx_wallet_tx_*` — Transactions wallet

---

## 🛠️ Commandes d'utilisation

### Appliquer le dump complet
```bash
# Via psql (nécessite accès direct PostgreSQL)
psql -h gfe4bd9y.eu-central.insforge.app -d postgres -f sql/01_extensions_and_functions.sql
psql -h gfe4bd9y.eu-central.insforge.app -d postgres -f sql/02_core_tables.sql
psql -h gfe4bd9y.eu-central.insforge.app -d postgres -f sql/03_invoice_tables.sql
psql -h gfe4bd9y.eu-central.insforge.app -d postgres -f sql/04_ai_and_system_tables.sql
psql -h gfe4bd9y.eu-central.insforge.app -d postgres -f sql/05_mobile_money_and_wallet.sql
```

**Note:** Pour InsForge, utiliser plutôt l'interface web ou les migrations via CLI.

### Vérifier la structure
```sql
-- Liste des tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Liste des fonctions
SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace;

-- Liste des triggers
SELECT trigger_name, event_object_table FROM information_schema.triggers;
```

---

## 📝 Notes importantes

1. **RLS Activé:** Toutes les tables sensibles ont RLS activé
2. **Audit automatique:** Les tables critiques sont auditées (audit_log)
3. **Soft delete:** Certaines tables utilisent `is_active` au lieu de DELETE
4. **Multi-tenant:** Toutes les tables ont `company_id` pour isolation
5. **Timestamps:** `created_at` et `updated_at` sur toutes les tables

---

## 🔗 Liens utiles

- **App:** https://wimruxapp.vercel.app
- **API:** https://gfe4bd9y.eu-central.insforge.app
- **Storage:** `https://gfe4bd9y.eu-central.insforge.app/storage/v1`

---

## 📧 Contact

**WIMRUX® Finances**  
Développé par ILTIC  
Ouagadougou, Burkina Faso  
contact@wimrux.bf

---

*Dump généré automatiquement le 2026-06-08 — Structure complète de la base InsForge*
