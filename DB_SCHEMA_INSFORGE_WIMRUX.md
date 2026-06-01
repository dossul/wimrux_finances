# SCHÉMA INTÉGRAL — BASE DE DONNÉES INSFORGE WIMRUX
**Horodatage : 2026-05-23T13:35 UTC+00:00**
**Backend : `gfe4bd9y.eu-central.insforge.app` (partagé WIMRUX FINANCES + WIMRUX FACTURATION)**
**Source : inspection directe via MCP InsForge — 25 tables, 10 Edge Functions, 10 buckets Storage**

---

## ⚠️ INCIDENTS / FIXES CONNUS

### [2026-05-26] Bug Login — Page blanche après connexion

**Symptôme** : Login API retournait 200 OK, mais l'app affichait une page blanche après soumission du formulaire.

**Root cause** : RLS circulaire sur `public.user_profiles`.
- La policy `user_profiles_select` utilisait uniquement `company_id = get_user_company_id()`.
- Or `get_user_company_id()` lit elle-même `user_profiles` pour trouver la company du user courant.
- Résultat : 0 lignes retournées → `profile = null` → `role = null` → `hasPermission('dashboard.view') = false` → boucle de redirect → page blanche.

**Fix appliqué** (migration `20260526010000_fix-user-profiles-rls-select-policy.sql`) :
```sql
DROP POLICY IF EXISTS user_profiles_select ON public.user_profiles;
CREATE POLICY user_profiles_select ON public.user_profiles FOR SELECT
  USING (
    (user_id::text = auth.uid()::text)
    OR (company_id = get_user_company_id())
  );
```

**Règle à retenir** : Toute policy SELECT sur `user_profiles` **doit** inclure `user_id = auth.uid()` comme condition de base. Ne jamais dépendre uniquement d'une fonction qui lit la même table.

---

## RÉSUMÉ

| Catégorie | Quantité |
|---|---|
| Tables | 25 |
| Index (total) | 66 |
| Triggers (total) | 19 |
| Politiques RLS (total) | ~120 |
| Edge Functions | 10 |
| Buckets Storage | 10 |
| Fonctions PostgreSQL custom | 15 (hors extensions) |
| Extensions actives | `pgcrypto`, `pg_net` (`http_*`) |

---

## TABLES

---

### 1. `companies`
**Usage** : Entreprises clientes (WIMRUX FINANCES). Racine de toutes les données multi-tenant.

| Colonne | Type | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `name` | varchar(255) | NO | — | |
| `ifu` | varchar(20) | NO | — | Identifiant Fiscal Unique DGI BF |
| `rccm` | varchar(100) | YES | — | |
| `address_cadastral` | varchar(100) | YES | — | |
| `address` | text | YES | — | |
| `phone` | varchar(30) | YES | — | |
| `email` | varchar(255) | YES | — | |
| `bank_accounts` | jsonb | YES | `[]` | |
| `tax_regime` | varchar(100) | YES | — | RNI/RSI/etc. |
| `tax_office` | varchar(255) | YES | — | |
| `logo_url` | text | YES | — | |
| `country_code` | varchar(3) | YES | `'BF'` | |
| `locale` | varchar(10) | YES | `'fr-BF'` | |
| `is_active` | boolean | NO | `true` | |
| `fiscal_profile` | text | NO | `'BF'` | |
| `fiscal_config` | jsonb | YES | `{}` | Groupes taxe, timbre, PSVB |
| `invoice_settings` | jsonb | YES | `{}` | Couleurs, logo, PDF |
| `certification_mode` | varchar(20) | YES | `'device'` | |
| `ai_model` | varchar(100) | YES | `'anthropic/claude-sonnet-4.5'` | |
| `ai_fallback_model` | varchar(100) | YES | `'openai/gpt-4o-mini'` | |
| `ai_system_prompt` | text | YES | — | |
| `ai_enabled` | boolean | YES | `true` | |
| `ai_routing` | jsonb | YES | `{}` | Routing par tâche IA |
| `openrouter_api_key` | text | YES | — | Clé chiffrée |
| `chatbot_enabled` | boolean | YES | `false` | |
| `qr_scan_base_url` | text | YES | — | |
| `created_at` | timestamptz | YES | now() | |

**Index** : PK `companies_pkey`

**RLS** : activé — 5 politiques
- `companies_select` (public) : `id = get_user_company_id()`
- `companies_insert` (public) : `true`
- `companies_update` (public) : `id = get_user_company_id()`
- `companies_public_ifu_lookup` (public) : `true` (SELECT)
- `project_admin_policy` : bypass total

**Triggers** : `trg_audit_companies` AFTER INSERT/UPDATE/DELETE → `log_audit_changes()`

---

### 2. `user_profiles`
**Usage** : Profils utilisateurs avec rôle principal et appartenance entreprise.

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | varchar(255) | NO | — | Unique (FK auth) |
| `company_id` | uuid | NO | — | FK → companies |
| `role` | varchar(20) | NO | — | admin/comptable/caissier/etc. |
| `full_name` | varchar(255) | NO | — | |
| `created_at` | timestamptz | YES | now() | |

**Index** : PK, UNIQUE `user_profiles_user_id_key`, IDX `company_id`, IDX `user_id`

**FK** : `company_id` → `companies.id` CASCADE DELETE

**RLS** : activé — 4 politiques
- `user_profiles_select` : `company_id = get_user_company_id()`
- `user_profiles_insert` / `user_profiles_self_insert` : `true`
- `project_admin_policy` : bypass

---

### 3. `user_role_assignments`
**Usage** : Multi-rôle — rôles additionnels assignés à un utilisateur (avec expiration possible).

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `user_id` | varchar(255) | NO | — |
| `company_id` | uuid | NO | — | FK → companies CASCADE |
| `role` | varchar(50) | NO | — |
| `is_primary` | boolean | NO | `false` |
| `assigned_by` | varchar(255) | YES | — |
| `assigned_at` | timestamptz | YES | now() |
| `expires_at` | timestamptz | YES | — |

**Index** : PK, UNIQUE `(user_id, company_id, role)`, IDX `company_id`, IDX `(user_id, company_id)`

**RLS** : activé — 4 politiques
- SELECT : `company_id = get_user_company_id()`
- ALL (admin) : `company_id = get_user_company_id()` AND rôle `admin`
- `ura_project_admin` + `project_admin_policy`

---

### 4. `company_role_permissions`
**Usage** : Overrides de permissions par rôle et par entreprise (grant/revoke granulaire).

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `company_id` | uuid | NO | — | FK → companies CASCADE |
| `role` | varchar(50) | NO | — |
| `permission` | varchar(100) | NO | — |
| `granted` | boolean | NO | `true` |
| `expires_at` | timestamptz | YES | — |
| `granted_by` | varchar(255) | YES | — |
| `created_at` | timestamptz | YES | now() |
| `updated_at` | timestamptz | YES | now() |

**Index** : PK, UNIQUE `(company_id, role, permission)`, IDX `company_id`, IDX `(company_id, role)`

**RLS** : activé — 4 politiques (SELECT company, ALL admin, project_admin)

---

### 5. `company_custom_roles`
**Usage** : Rôles métier personnalisés par entreprise.

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `company_id` | uuid | NO | — | FK → companies CASCADE |
| `role_key` | varchar(20) | NO | — |
| `label` | varchar(100) | NO | — |
| `description` | text | YES | — |
| `base_role` | varchar(20) | YES | — | Rôle système de base |
| `created_by` | varchar(255) | YES | — |
| `created_at` | timestamptz | YES | now() |

**Index** : PK, UNIQUE `(company_id, role_key)`, IDX `company_id`

**RLS** : activé — 4 politiques (SELECT company, ALL admin, project_admin)

---

### 6. `clients`
**Usage** : Répertoire clients de facturation (WIMRUX FINANCES).

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `company_id` | uuid | NO | — | FK → companies CASCADE |
| `type` | varchar(5) | NO | — | CC/PM/PP/PC |
| `name` | varchar(255) | NO | — | |
| `ifu` | varchar(20) | YES | — | |
| `rccm` | varchar(100) | YES | — | |
| `address` | text | YES | — | |
| `address_cadastral` | varchar(100) | YES | — | |
| `phone` | varchar(30) | YES | — | |
| `email` | varchar(255) | YES | — | |
| `is_active` | boolean | NO | `true` | |
| `created_at` | timestamptz | YES | now() | |
| `updated_at` | timestamptz | YES | now() | |

**Index** : PK, IDX `company_id`

**FK** : `company_id` → `companies.id` CASCADE DELETE

**RLS** : activé — 5 politiques (SELECT/INSERT/UPDATE/DELETE company isolation, project_admin)

**Triggers** : `trg_audit_clients` AFTER INSERT/UPDATE/DELETE → `log_audit_changes()`

---

### 7. `articles`
**Usage** : Catalogue articles/produits par entreprise (30 enregistrements).

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `company_id` | uuid | NO | — | FK → companies CASCADE |
| `code` | varchar(50) | NO | — | |
| `name` | varchar(255) | NO | — | |
| `type` | varchar(10) | NO | `'LOCBIE'` | LOCBIE/LOCSER/IMPBIE/IMPSER |
| `tax_group` | varchar(2) | NO | `'B'` | Groupe A-P |
| `unit_price` | numeric | NO | `0` | |
| `specific_tax` | numeric | NO | `0` | |
| `stock_quantity` | numeric | YES | `0` | |
| `is_active` | boolean | NO | `true` | |
| `created_at` | timestamptz | NO | now() | |

**Index** : PK, UNIQUE `(company_id, code)`

**RLS** : activé — 2 politiques
- `articles_company_isolation` (ALL) : `company_id = get_user_company_id()`
- `project_admin_policy`

---

### 8. `invoice_sequences`
**Usage** : Compteurs atomiques de numérotation de factures par type/année/entreprise.

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `company_id` | uuid | NO | — | FK → companies CASCADE |
| `invoice_type` | varchar(5) | NO | — | FV/FT/FA/EV/ET/EA/PF |
| `year` | integer | NO | — | |
| `last_number` | integer | NO | `0` | |

**Index** : PK, UNIQUE `(company_id, invoice_type, year)`

**RLS** : activé — 3 politiques (company isolation ×2, project_admin)

---

### 9. `invoices`
**Usage** : Factures centrales (partagé WIMRUX FINANCES + WIMRUX FACTURATION). Table la plus critique.

| Colonne | Type | Null | Défaut | Notes |
|---|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() | PK |
| `company_id` | uuid | NO | — | FK → companies CASCADE |
| `client_id` | uuid | YES | — | FK → clients |
| `type` | varchar(2) | NO | — | FV/FT/FA/EV/ET/EA/PF |
| `reference` | varchar(100) | NO | — | UNIQUE par company |
| `status` | varchar(20) | NO | `'draft'` | draft/pending_validation/approved/validated/certified/sent/accepted/rejected/cancelled |
| `price_mode` | varchar(3) | NO | `'TTC'` | TTC ou HT |
| `original_invoice_id` | uuid | YES | — | FK → invoices (auto-référence, avoir) |
| `operator_name` | varchar(255) | YES | — | |
| `comments` | jsonb | YES | `[]` | |
| `tax_calculation` | jsonb | YES | — | Détail calcul fiscal |
| `total_ht` | numeric | YES | `0` | |
| `total_tva` | numeric | YES | `0` | |
| `total_psvb` | numeric | YES | `0` | |
| `total_ttc` | numeric | YES | `0` | |
| `stamp_duty` | numeric | YES | `0` | Timbre quittance |
| `total_payment` | numeric | YES | `0` | |
| `mcf_uid` | uuid | YES | — | UID MCF certifiant |
| `fiscal_number` | varchar(50) | YES | — | Numéro fiscal DGI |
| `code_secef_dgi` | varchar(29) | YES | — | Code SECeF DGI |
| `qr_code` | text | YES | — | Format BFSECEF01 |
| `signature` | text | YES | — | |
| `nim` | varchar(10) | YES | — | NIM du MCF |
| `counters` | varchar(50) | YES | — | Compteurs MCF |
| `certification_datetime` | timestamptz | YES | — | |
| `pdf_url` | text | YES | — | URL Storage |
| `scan_url` | text | YES | — | URL scan certifié |
| `coupon_ticket_url` | text | YES | — | URL ticket coupon |
| `certification_source` | varchar(20) | YES | `'driver'` | driver/scan/fnec |
| `certification_device_id` | uuid | YES | — | FK → certification_devices |
| `created_at` | timestamptz | YES | now() | |
| `validated_at` | timestamptz | YES | — | |
| `certified_at` | timestamptz | YES | — | |
| `submitted_by` | varchar(255) | YES | — | |
| `submitted_at` | timestamptz | YES | — | |
| `approved_by` | varchar(255) | YES | — | |
| `approved_at` | timestamptz | YES | — | |
| `rejected_by` | varchar(255) | YES | — | |
| `rejected_at` | timestamptz | YES | — | |
| `rejection_reason` | text | YES | — | |
| `credit_note_nature` | varchar(3) | YES | — | COR/RAN/RAM/RRR |
| `proforma_converted_to` | uuid | YES | — | FK → invoices (proforma → FV) |
| `description` | text | YES | — | |

**Index** : PK, UNIQUE `(company_id, reference)`, IDX `client_id`, IDX `company_id`, IDX `reference`, IDX `status`

**FK** : `company_id` CASCADE, `client_id` NO ACTION, `original_invoice_id` NO ACTION, `proforma_converted_to` SET NULL, `certification_device_id` NO ACTION

**RLS** : activé — 6 politiques
- `invoices_select/insert/update/delete` (public) : `company_id = get_user_company_id()`
- `invoices_public_verify` (anon) : `status = 'certified'` (lecture publique QR scan)
- `project_admin_policy`

**Triggers** :
| Trigger | Timing | Événement | Fonction |
|---|---|---|---|
| `trg_audit_invoices` | AFTER | INSERT/UPDATE/DELETE | `log_audit_changes()` |
| `invoice_status_realtime` | AFTER | UPDATE | `notify_invoice_status()` |
| `trg_decrement_stock_on_certification` | AFTER | UPDATE | `decrement_stock_on_certification()` |
| `trg_invoice_immutable_delete` | BEFORE | DELETE | `prevent_invoice_modification()` — condition : `status IN ('validated','certified')` |
| `trg_invoice_immutable_update` | BEFORE | UPDATE | `allow_certification_update()` |

---

### 10. `invoice_items`
**Usage** : Lignes de facture.

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `invoice_id` | uuid | NO | — | FK → invoices CASCADE |
| `code` | varchar(50) | YES | — | |
| `name` | varchar(255) | NO | — | |
| `type` | varchar(10) | NO | — | LOCBIE/LOCSER/IMPBIE/IMPSER |
| `price` | numeric | NO | — | |
| `quantity` | numeric | NO | `1` | |
| `unit` | varchar(50) | YES | `'unité'` | |
| `tax_group` | char(1) | NO | — | A-P |
| `specific_tax` | numeric | YES | `0` | |
| `discount` | numeric | YES | `0` | |
| `amount_ht` | numeric | YES | `0` | |
| `amount_tva` | numeric | YES | `0` | |
| `amount_psvb` | numeric | YES | `0` | |
| `amount_ttc` | numeric | YES | `0` | |
| `sort_order` | integer | YES | `0` | |

**Index** : PK, IDX `invoice_id`

**FK** : `invoice_id` → `invoices.id` CASCADE DELETE

**RLS** : activé — 5 politiques (via JOIN invoices → company isolation, project_admin)

**Triggers** : `trg_audit_invoice_items` AFTER INSERT/UPDATE/DELETE → `log_audit_changes()`

---

### 11. `treasury_accounts`
**Usage** : Comptes de trésorerie par entreprise.

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `company_id` | uuid | NO | — | FK → companies CASCADE |
| `name` | varchar(255) | NO | — | |
| `type` | varchar(20) | NO | — | banque/caisse/mobile_money |
| `balance` | numeric | YES | `0` | |
| `created_at` | timestamptz | YES | now() | |

**Index** : PK, IDX `company_id`

**RLS** : activé — 4 politiques (SELECT/INSERT/UPDATE company, project_admin)

---

### 12. `treasury_movements`
**Usage** : Mouvements de trésorerie (débit/crédit), liés optionnellement à une facture.

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `account_id` | uuid | NO | — | FK → treasury_accounts CASCADE |
| `invoice_id` | uuid | YES | — | FK → invoices |
| `company_id` | uuid | YES | — | FK → companies |
| `amount` | numeric | NO | — | |
| `type` | varchar(10) | NO | — | |
| `movement_type` | varchar(10) | YES | — | crédit/débit |
| `is_cash_operation` | boolean | YES | `false` | |
| `description` | text | YES | — | |
| `created_at` | timestamptz | YES | now() | |

**Index** : PK, IDX `account_id`, IDX `company_id`

**RLS** : activé — 4 politiques (SELECT/INSERT/UPDATE company, project_admin)

---

### 13. `devices`
**Usage** : MCF Eltrade CC300 enregistrés (WIMRUX FACTURATION). PK = `nim`.

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `nim` | varchar(10) | NO | — | **PK** — Numéro d'Identification Machine |
| `ifu` | varchar(20) | NO | — | |
| `company_id` | uuid | YES | — | FK → companies |
| `name` | varchar(100) | YES | — | |
| `status` | varchar(20) | NO | `'ACTIF'` | |
| `jwt_secret` | varchar(255) | NO | — | |
| `activation_counter` | integer | YES | `1` | |
| `simulator_enabled` | boolean | NO | `true` | |
| `last_audit_remote` | timestamptz | YES | — | |
| `created_at` | timestamptz | YES | now() | |

**Index** : PK `nim`, IDX `company_id`

**RLS** : activé — 5 politiques (SELECT/INSERT/UPDATE/DELETE company, project_admin)

---

### 14. `certification_devices`
**Usage** : Appareils de certification autorisés avec clé API (WIMRUX FACTURATION).

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `company_id` | uuid | NO | — | FK → companies CASCADE |
| `device_name` | varchar(100) | NO | — | |
| `api_key_hash` | text | NO | — | |
| `api_key_prefix` | varchar(12) | NO | — | |
| `mcf_serial` | varchar(50) | YES | — | |
| `mcf_isf` | varchar(50) | YES | — | ISF DGI |
| `last_seen_at` | timestamptz | YES | — | |
| `is_active` | boolean | YES | `true` | |
| `created_by` | uuid | YES | — | |
| `created_at` | timestamptz | YES | now() | |

**Index** : PK, IDX `company_id`, IDX `api_key_prefix`

**RLS** : activé — 6 politiques (SELECT/INSERT/UPDATE/DELETE company, project_admin ×2)

---

### 15. `pending_certification_queue`
**Usage** : File d'attente des factures validées en attente de certification MCF (utilisé par WIMRUX FACTURATION).

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `invoice_id` | uuid | NO | — | FK → invoices NO ACTION |
| `attempts` | integer | YES | `0` | |
| `last_attempt_at` | timestamptz | YES | — | |
| `error_message` | text | YES | — | |
| `created_at` | timestamptz | YES | now() | |

**Index** : PK, IDX `invoice_id`

**RLS** : activé — 3 politiques (SELECT/INSERT via JOIN invoices, project_admin)

---

### 16. `sim_invoices`
**Usage** : Factures simulées pour mode simulation FNEC/MCF (WIMRUX FACTURATION). PK = `uid`.

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `uid` | uuid | NO | gen_random_uuid() | PK |
| `nim` | varchar(10) | NO | — | FK → devices.nim |
| `ifu` | varchar(20) | NO | — | |
| `reference` | varchar(100) | NO | — | UNIQUE |
| `type` | varchar(2) | NO | — | |
| `status` | varchar(20) | NO | `'PENDING'` | |
| `fiscal_number` | varchar(50) | YES | — | |
| `code_secef_dgi` | varchar(29) | YES | — | |
| `qr_code` | text | YES | — | |
| `signature` | text | YES | — | |
| `data` | jsonb | NO | — | Corps complet facture |
| `tax_calculation` | jsonb | YES | — | |
| `date_submitted` | timestamptz | YES | now() | |
| `date_certified` | timestamptz | YES | — | |
| `counters` | varchar(50) | YES | — | |

**Index** : PK `uid`, UNIQUE `reference`, IDX `nim`

**FK** : `nim` → `devices.nim`

**RLS** : activé — 2 politiques
- `sim_invoices_authenticated` : nim IN (SELECT nim FROM devices WHERE company = current)
- `project_admin_policy`

---

### 17. `mcf_logs`
**Usage** : Logs techniques de communication avec le MCF (22 enregistrements).

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `company_id` | uuid | YES | — | FK → companies CASCADE |
| `nim` | varchar(20) | YES | — | |
| `endpoint` | varchar(100) | YES | — | /check, /info, /bill |
| `method` | varchar(10) | YES | — | GET/POST |
| `request_body` | jsonb | YES | — | |
| `response_body` | jsonb | YES | — | |
| `status_code` | integer | YES | — | |
| `duration_ms` | integer | YES | — | |
| `user_id` | varchar(50) | YES | — | |
| `created_at` | timestamptz | YES | now() | |

**Index** : PK, IDX `nim`, IDX `(company_id, created_at DESC)`

**RLS** : activé — 4 politiques (INSERT/SELECT authenticated, project_admin ×2)

**Triggers** : `mcf_logs_set_company_id` BEFORE INSERT → `set_mcf_log_company_id()`

---

### 18. `fiscal_reports`
**Usage** : Rapports fiscaux Z et X issus du MCF (type='Z' ou type='X').

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `company_id` | uuid | NO | — | FK → companies CASCADE |
| `nim` | varchar(10) | YES | — | |
| `type` | varchar(1) | NO | — | Z ou X |
| `data` | jsonb | NO | — | |
| `pdf_url` | text | YES | — | |
| `report_date` | date | NO | — | |
| `created_at` | timestamptz | YES | now() | |

**Index** : PK, IDX `company_id`

**RLS** : activé — 3 politiques (SELECT/INSERT company, project_admin)

---

### 19. `fiscal_a_reports`
**Usage** : Rapports A de rapprochement fiscal par période (SFE §2.33).

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `company_id` | uuid | NO | — | FK → companies CASCADE |
| `period_start` | date | NO | — | |
| `period_end` | date | NO | — | |
| `total_fv` | numeric | NO | `0` | |
| `total_ft` | numeric | NO | `0` | |
| `total_fa` | numeric | NO | `0` | |
| `total_ev` | numeric | NO | `0` | |
| `total_et` | numeric | NO | `0` | |
| `total_ea` | numeric | NO | `0` | |
| `total_ht` | numeric | NO | `0` | |
| `total_tva` | numeric | NO | `0` | |
| `total_psvb` | numeric | NO | `0` | |
| `total_ttc` | numeric | NO | `0` | |
| `total_stamp_duty` | numeric | NO | `0` | |
| `invoice_count` | integer | NO | `0` | |
| `generated_by` | uuid | YES | — | |
| `generated_at` | timestamptz | NO | now() | |
| `report_data` | jsonb | YES | — | |

**Index** : PK, UNIQUE `(company_id, period_start, period_end)`

**RLS** : activé — 2 politiques (ALL company isolation, project_admin)

---

### 20. `audit_log`
**Usage** : Journal d'audit immuable — toutes les modifications INSERT/UPDATE/DELETE des tables sensibles (129 entrées). PK séquentielle bigint.

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | bigint | NO | nextval sequence | PK |
| `user_id` | varchar(255) | YES | — | |
| `company_id` | uuid | YES | — | FK → companies |
| `timestamp` | timestamptz | YES | now() | |
| `action_type` | varchar(10) | NO | — | INSERT/UPDATE/DELETE |
| `table_name` | varchar(100) | NO | — | |
| `record_id` | varchar(255) | YES | — | |
| `data_before` | jsonb | YES | — | |
| `data_after` | jsonb | YES | — | |
| `ip_address` | varchar(45) | YES | — | |

**Index** : PK, IDX `company_id`, IDX `table_name`, IDX `timestamp`

**RLS** : activé — 3 politiques (SELECT company, INSERT public, project_admin)

**Triggers** :
| Trigger | Timing | Événement | Fonction |
|---|---|---|---|
| `audit_realtime` | AFTER | INSERT | `notify_audit_entry()` (realtime) |
| `trg_audit_log_immutable_delete` | BEFORE | DELETE | `prevent_audit_log_modification()` |
| `trg_audit_log_immutable_update` | BEFORE | UPDATE | `prevent_audit_log_modification()` |

---

### 21. `ai_usage_logs`
**Usage** : Tracking des appels IA (modèle, tokens, coût USD, latence, modération).

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `company_id` | uuid | NO | — | FK → companies |
| `user_id` | uuid | NO | — | |
| `model` | text | NO | — | |
| `task` | text | NO | — | assistant_fiscal/analyse_facture/etc. |
| `tokens_input` | integer | NO | `0` | |
| `tokens_output` | integer | NO | `0` | |
| `tokens_total` | integer | YES | — | |
| `latency_ms` | integer | YES | `0` | |
| `status` | text | NO | `'success'` | |
| `is_fallback` | boolean | YES | `false` | |
| `error_message` | text | YES | — | |
| `moderation_flagged` | boolean | YES | `false` | |
| `moderation_reason` | text | YES | — | |
| `cost_usd` | numeric | YES | `0` | |
| `created_at` | timestamptz | YES | now() | |

**Index** : PK, IDX `company_id`, IDX `created_at DESC`, IDX `model`, IDX `task`

**RLS** : activé — 4 politiques (SELECT company, SELECT admin all, INSERT company, project_admin)

---

### 22. `chatbot_api_keys`
**Usage** : Clés API pour intégrations chatbot externes (WhatsApp, Telegram, API…).

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `company_id` | uuid | NO | — | FK → companies CASCADE |
| `name` | varchar(100) | NO | — | |
| `api_key_hash` | text | NO | — | Hash clé `wmrx_cb_*` |
| `api_key_prefix` | varchar(12) | NO | — | |
| `channels` | text[] | NO | `{}` | whatsapp/telegram/email/sms/api/webhook |
| `is_active` | boolean | NO | `true` | |
| `expires_at` | timestamptz | YES | — | |
| `rate_limit_per_hour` | integer | NO | `60` | |
| `last_used_at` | timestamptz | YES | — | |
| `created_by` | uuid | YES | — | |
| `created_at` | timestamptz | NO | now() | |

**Index** : PK, IDX `company_id`, IDX `(company_id, is_active)`, IDX `api_key_hash`

**RLS** : activé — 7 politiques (SELECT/INSERT/UPDATE/DELETE company, SELECT admin, project_admin ×2)

---

### 23. `chatbot_permissions`
**Usage** : Permissions granulaires par clé API chatbot et par action.

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `api_key_id` | uuid | NO | — | FK → chatbot_api_keys CASCADE |
| `company_id` | uuid | NO | — | FK → companies CASCADE |
| `action` | varchar(50) | NO | — | view_invoices/create_invoice/etc. |
| `enabled` | boolean | NO | `true` | |
| `valid_from` | timestamptz | YES | — | |
| `valid_until` | timestamptz | YES | — | |
| `rate_limit_per_hour` | integer | YES | — | |
| `conditions` | jsonb | YES | `{}` | |
| `created_at` | timestamptz | NO | now() | |

**Index** : PK, UNIQUE `(api_key_id, action)`, IDX `company_id`, IDX `api_key_id`

**RLS** : activé — 7 politiques

---

### 24. `chatbot_conversations`
**Usage** : Sessions de conversation chatbot par canal.

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `company_id` | uuid | NO | — | FK → companies CASCADE |
| `api_key_id` | uuid | YES | — | FK → chatbot_api_keys SET NULL |
| `channel` | varchar(30) | NO | — | |
| `external_id` | varchar(255) | YES | — | |
| `external_user` | varchar(255) | YES | — | |
| `status` | varchar(20) | NO | `'active'` | |
| `metadata` | jsonb | YES | `{}` | |
| `started_at` | timestamptz | NO | now() | |
| `last_message_at` | timestamptz | NO | now() | |

**Index** : PK, IDX `company_id`, IDX `channel`, IDX `(company_id, status)`

**RLS** : activé — 5 politiques

---

### 25. `chatbot_messages`
**Usage** : Messages échangés dans les conversations chatbot.

| Colonne | Type | Null | Défaut |
|---|---|---|---|
| `id` | uuid | NO | gen_random_uuid() |
| `conversation_id` | uuid | NO | — | FK → chatbot_conversations CASCADE |
| `company_id` | uuid | NO | — | FK → companies CASCADE |
| `role` | varchar(20) | NO | — | user/assistant/system |
| `content` | text | NO | — | |
| `action_requested` | varchar(50) | YES | — | |
| `action_payload` | jsonb | YES | — | |
| `action_result` | jsonb | YES | — | |
| `action_status` | varchar(20) | YES | — | |
| `tokens_used` | integer | YES | `0` | |
| `created_at` | timestamptz | NO | now() | |

**Index** : PK, IDX `company_id`, IDX `conversation_id`, IDX `action_requested` (partial WHERE NOT NULL)

**RLS** : activé — 5 politiques

---

## FONCTIONS POSTGRESQL CUSTOM

| Fonction | Type retour | Rôle |
|---|---|---|
| `get_user_company_id()` | uuid | Retourne le `company_id` de l'utilisateur courant depuis le JWT — utilisée dans toutes les politiques RLS |
| `get_user_id_by_email(email)` | uuid | Retourne l'ID utilisateur auth par email |
| `next_invoice_reference(p_company_id, p_type, p_year)` | text | Génère le prochain numéro de facture atomiquement (via `invoice_sequences`) |
| `log_audit_changes()` | trigger | Fonction trigger : insère dans `audit_log` avant/après chaque modification |
| `notify_invoice_status()` | trigger | Envoi realtime (pg_notify) lors du changement de statut d'une facture |
| `notify_audit_entry()` | trigger | Envoi realtime lors d'une nouvelle entrée audit |
| `allow_certification_update()` | trigger | Autorise uniquement les updates liés à la certification sur factures `validated`/`certified` |
| `prevent_invoice_modification()` | trigger | Bloque DELETE sur factures `validated` ou `certified` |
| `prevent_audit_log_modification()` | trigger | Bloque DELETE et UPDATE sur `audit_log` (immuabilité) |
| `decrement_stock_on_certification()` | trigger | Décrémente `articles.stock_quantity` lors de la certification d'une facture |
| `set_mcf_log_company_id()` | trigger | Résout et fixe `company_id` dans `mcf_logs` au moment de l'INSERT |
| `generate_certification_device_key()` | jsonb | Génère une clé API pour un device de certification |
| `verify_certification_device_key(key)` | uuid | Vérifie une clé API device et retourne l'`id` du device |
| `device_pull_pending_invoices()` | USER-DEFINED | RPC : retourne les factures en attente de certification pour un device |
| `device_push_certified_invoice()` | jsonb | RPC : reçoit le résultat de certification MCF et met à jour la facture |
| `delete_auth_users(user_ids, admin_token)` | record | Suppression d'utilisateurs via API admin |

*Extensions présentes : `pgcrypto` (crypt/pgp/digest/hmac), `pg_net` (http/http_get/http_post/…)*

---

## TRIGGERS — RÉCAPITULATIF GLOBAL

| Table | Trigger | Timing | Événement | Fonction |
|---|---|---|---|---|
| `companies` | `trg_audit_companies` | AFTER | INSERT/UPDATE/DELETE | `log_audit_changes()` |
| `clients` | `trg_audit_clients` | AFTER | INSERT/UPDATE/DELETE | `log_audit_changes()` |
| `invoices` | `trg_audit_invoices` | AFTER | INSERT/UPDATE/DELETE | `log_audit_changes()` |
| `invoices` | `invoice_status_realtime` | AFTER | UPDATE | `notify_invoice_status()` |
| `invoices` | `trg_decrement_stock_on_certification` | AFTER | UPDATE | `decrement_stock_on_certification()` |
| `invoices` | `trg_invoice_immutable_delete` | BEFORE | DELETE | `prevent_invoice_modification()` |
| `invoices` | `trg_invoice_immutable_update` | BEFORE | UPDATE | `allow_certification_update()` |
| `invoice_items` | `trg_audit_invoice_items` | AFTER | INSERT/UPDATE/DELETE | `log_audit_changes()` |
| `audit_log` | `audit_realtime` | AFTER | INSERT | `notify_audit_entry()` |
| `audit_log` | `trg_audit_log_immutable_delete` | BEFORE | DELETE | `prevent_audit_log_modification()` |
| `audit_log` | `trg_audit_log_immutable_update` | BEFORE | UPDATE | `prevent_audit_log_modification()` |
| `mcf_logs` | `mcf_logs_set_company_id` | BEFORE | INSERT | `set_mcf_log_company_id()` |

---

## EDGE FUNCTIONS (Serverless Deno)

| Slug | Statut | Description |
|---|---|---|
| `generate-device-key` | active | Génère une clé API pour un device de certification |
| `parse-certified-invoice` | active | Parse une facture certifiée via OCR |
| `device-heartbeat` | active | Heartbeat périodique du device — met à jour `last_seen_at` |
| `push-certified-invoice` | active | Reçoit et enregistre le résultat de certification MCF depuis WIMRUX FACTURATION |
| `pull-pending-invoices` | active | Retourne les factures validées en attente de certification pour un device |
| `delete-user` | active | Supprime des utilisateurs (Body: `{ user_ids, admin_token }`) |
| `mcf-simulator` | active | API MCF/SECeF simulée — lit `_path/_method` du body pour routing InsForge + endpoint `/ping` |
| `chatbot-gateway` | active | Gateway chatbot — auth par clé API, permissions granulaires, intent IA, actions métier |
| `crypto-aes256` | active | Chiffrement/déchiffrement AES-256-CBC (clés JWT, API keys, données MCF) |
| `fnec-simulator` | active | API FNEC simulée BF — 11 endpoints REST pour facturation certifiée |

---

## STORAGE BUCKETS

| Bucket | Public | Créé le | Objets |
|---|---|---|---|
| `company-logos` | **oui** | 2026-03-02 | 1 |
| `invoices-pdf` | **oui** | 2026-02-13 | 4 |
| `certified-invoices-scans` | non | 2026-05-19 | 0 |
| `coupon-tickets` | non | 2026-05-19 | 0 |
| `carnet-documents` | non | 2026-03-11 | 0 |
| `carnet-logos` | **oui** | 2026-03-11 | 0 |
| `carnet-rapports` | non | 2026-03-11 | 0 |
| `carnet-scans` | non | 2026-03-11 | 0 |
| `carnet-scans-processed` | non | 2026-03-11 | 0 |
| `carnet-signatures` | non | 2026-03-11 | 0 |

---

## AUTHENTIFICATION

| Paramètre | Valeur |
|---|---|
| Fournisseurs OAuth | GitHub, Google |
| Vérification email | Obligatoire (méthode : code) |
| Réinitialisation mdp | Par code |
| Longueur mdp minimum | 6 caractères |

---

## DONNÉES EN PRODUCTION (état au 2026-05-23)

| Table | Enregistrements |
|---|---|
| `companies` | 4 |
| `user_profiles` | 4 |
| `clients` | 14 |
| `articles` | 30 |
| `invoices` | 8 |
| `invoice_items` | 11 |
| `invoice_sequences` | 3 |
| `devices` | 1 |
| `sim_invoices` | 4 |
| `mcf_logs` | 22 |
| `audit_log` | 129 |
| `company_custom_roles` | 1 |
| `company_role_permissions` | 21 |
| Autres tables | 0 |

---

## POINTS NOTABLES

- **`trg_invoice_immutable_delete`** : le trigger BEFORE DELETE sur `invoices` n'est conditionnel que sur `status IN ('validated', 'certified')` — les brouillons (`draft`) restent librement supprimables via la couche applicative.

- **`trg_decrement_stock_on_certification`** : trigger AFTER UPDATE sur `invoices` — décrémente automatiquement `articles.stock_quantity` au passage en statut `certified`. La gestion de stock est donc couplée au cycle de certification.

- **`audit_log` immuable** : les triggers `trg_audit_log_immutable_delete` et `trg_audit_log_immutable_update` (BEFORE DELETE/UPDATE) bloquent toute modification ou suppression des entrées d'audit — garantie d'intégrité légale.

- **`sim_invoices` lié à `devices` par `nim`** : le simulateur MCF (WIMRUX FACTURATION) stocke ses factures certifiées simulées dans une table dédiée, reliée au registre des MCF physiques. Un device peut donc fonctionner en mode réel ou simulé sans changer de structure de données.

- **Double politique RLS sur `invoices` pour les anons** : la politique `invoices_public_verify` autorise les utilisateurs non authentifiés à lire les factures avec `status = 'certified'` — ce qui permet la vérification publique du QR code SECeF sans authentification.

- **`get_user_company_id()` comme pivot RLS universel** : toutes les tables multi-tenant utilisent cette fonction pour l'isolation des données. Elle lit le `company_id` depuis le claim JWT — toute politique RLS en dépend.

- **`mcf_logs_set_company_id`** : trigger BEFORE INSERT sur `mcf_logs` — le `company_id` est résolu automatiquement côté DB, évitant que le client doive le fournir explicitement dans les logs MCF.

- **Buckets `carnet-*`** : 6 buckets liés à un module "Carnet" (documents, logos, rapports, scans, signatures) non documenté dans le code source actuel des deux projets — indique probablement un module futur ou un ancien projet sur le même backend.

---

*Document généré par inspection directe MCP InsForge — Backend `gfe4bd9y.eu-central.insforge.app` — 2026-05-23T13:35 UTC*
