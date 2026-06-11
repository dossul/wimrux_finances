# WIMRUX® Finances — Migration vers Supabase

> **Généré le 2026-06-08** — Migration complète depuis InsForge (PostgreSQL/PostgREST)

---

## Sommaire

1. [Vue d'ensemble](#1-vue-densemble)
2. [Différences InsForge vs Supabase](#2-différences-insforge-vs-supabase)
3. [Ordre d'exécution des migrations](#3-ordre-dexécution-des-migrations)
4. [Contenu de chaque migration](#4-contenu-de-chaque-migration)
5. [Étapes de migration pas-à-pas](#5-étapes-de-migration-pas-à-pas)
6. [Configuration du client SDK](#6-configuration-du-client-sdk)
7. [Variables d'environnement](#7-variables-denvironnement)
8. [Points d'attention critiques](#8-points-dattention-critiques)
9. [Vérifications post-migration](#9-vérifications-post-migration)

---

## 1. Vue d'ensemble

Le projet **Wimrux Finances** est une application de gestion financière et fiscale (Burkina Faso) avec :

| Composant | InsForge | Supabase |
|-----------|----------|----------|
| Base de données | PostgreSQL + PostgREST | PostgreSQL + PostgREST |
| Auth | InsForge Auth (JWT) | Supabase Auth (JWT) |
| Storage | InsForge Buckets | Supabase Storage |
| Fonctions serveur | Edge Functions (Deno) | Edge Functions (Deno) |
| Realtime | InsForge Realtime | Supabase Realtime |
| RLS | ✅ Identique | ✅ Identique |

**40+ tables**, **30+ fonctions PostgreSQL**, **6 buckets storage**, **2FA WhatsApp OTP**.

---

## 2. Différences InsForge vs Supabase

### 2.1 Rôle `project_admin` ⚠️ CRITIQUE

InsForge définit un rôle PostgreSQL natif `project_admin`. Ce rôle n'existe **pas** dans Supabase.

**Solution appliquée dans les migrations :**
- La fonction `is_project_admin()` vérifie `user_profiles.role IN ('project_admin', 'superadmin')`
- Les policies RLS qui ciblaient `TO project_admin` ont été converties en conditions `USING (is_project_admin())`
- Pour les opérations admin côté serveur, utiliser le `service_role` key (bypass RLS)

### 2.2 Extension `http`

InsForge utilise `pg_http` pour les appels HTTP depuis PL/pgSQL (`http_get`, `http_post`).
Dans Supabase :
- `pg_net` est la bibliothèque recommandée (asynchrone)
- L'extension `http` synchrone est disponible mais doit être activée dans Dashboard > Extensions

**Migration :** Les fonctions `http_get` et `http_post` ont été retirées des migrations. Remplacer par des Edge Functions Deno pour les appels HTTP sortants.

### 2.3 Extension `pg_cron`

Disponible uniquement sur les plans **Pro et supérieur** de Supabase. Activer dans Dashboard > Database > Extensions.

### 2.4 Types composites HTTP

Les types `http_header`, `http_request`, `http_response` sont fournis automatiquement par l'extension `http`. Ne pas les recréer manuellement.

### 2.5 `auth.uid()`

Identique dans les deux plateformes. Aucune modification nécessaire.

### 2.6 Storage — chemins des fichiers

**Convention de nommage adoptée :**
```
{bucket}/{company_id}/{entité}/{filename}
```
Exemple : `invoice-pdfs/550e8400-e29b.../2026-06/FV-2026-0042.pdf`

Les policies RLS storage utilisent `(storage.foldername(name))[1]::uuid` pour extraire le `company_id` depuis le chemin.

### 2.7 Edge Functions

Les Edge Functions InsForge (`send-email`, `send-otp-whatsapp`, `verify-otp`, `ai-router`) doivent être redéployées sur Supabase. L'API est identique (Deno + Request/Response standard).

---

## 3. Ordre d'exécution des migrations

**L'ordre est CRITIQUE** à cause des dépendances FK entre tables.

```
00001 → Extensions PostgreSQL
00002 → Séquences + Fonctions RLS de base (get_user_company_id, is_project_admin, set_updated_at, log_audit_changes)
00003 → Tables core (companies → audit_log → user_profiles → clients → suppliers)
00004 → Trésorerie + banque + articles + wallets + appareils
00005 → Tables factures (invoice_sequences → invoices → invoice_items)
00006 → Transactions bancaires + résolution FK CIRCULAIRE (bank_transactions ↔ treasury_movements)
00007 → Paiements + taxes (invoice_payments → withholding_taxes → tax_payments → tax_declarations)
00008 → Tables IA (providers → models → tasks → routing → credits → logs)
00009 → Système (RBAC → OTP → notifications → mcf_logs → queue + fonctions utilitaires)
00010 → Mobile money + caisse + chèques + virements
00011 → Buckets Storage Supabase (SQL Editor uniquement)
```

### Dépendances circulaires résolues en 00006

```
bank_transactions.matched_treasury_movement_id → treasury_movements ⟵ créée après
treasury_movements.bank_transaction_id         → bank_transactions  ⟵ créée avant
```
**Résolution :** créer les deux tables sans la FK croisée, puis `ALTER TABLE ADD CONSTRAINT` une fois les deux tables existantes.

---

## 4. Contenu de chaque migration

| Fichier | Tables | Fonctions/Triggers |
|---------|--------|-------------------|
| `20260608000001_extensions.sql` | — | fuzzystrmatch, pgcrypto |
| `20260608000002_sequences_and_base_functions.sql` | Séquence audit_log | `get_user_company_id`, `is_project_admin`, `set_updated_at`, `log_audit_changes`, `prevent_audit_log_modification`, `notify_audit_entry`, `notify_invoice_status`, `auto_provision_ai_for_new_company` |
| `20260608000003_core_tables.sql` | companies, audit_log, user_profiles, clients, suppliers | Triggers audit, updated_at |
| `20260608000004_treasury_bank_articles.sql` | treasury_accounts, bank_accounts, articles, transaction_categories, payment_wallets, payment_evidences, certification_devices | Triggers updated_at, audit |
| `20260608000005_invoice_tables.sql` | invoice_sequences, invoices, invoice_items | `allow_certification_update`, `prevent_invoice_modification`, `decrement_stock_on_certification`, `next_invoice_reference` + 5 triggers |
| `20260608000006_bank_transactions_circular_fk.sql` | payment_providers, bank_transactions, treasury_movements, bank_statement_imports, reconciliation_rules | `auto_reconcile` + FK circulaires résolues |
| `20260608000007_payments_and_taxes.sql` | invoice_payments, withholding_taxes, tax_payments, tax_declarations, esyntas_field_mappings | `update_invoice_payment_status` |
| `20260608000008_ai_tables.sql` | ai_providers, ai_models, ai_tasks, ai_models_default_routing, company_ai_credits, company_ai_quota_usage, company_ai_task_routing, ai_usage_logs | `increment_ai_credits` |
| `20260608000009_system_tables.sql` | company_role_permissions, otp_codes, notifications, mcf_logs, pending_certification_queue | `check_permission`, `get_user_permissions`, `grant_permission`, `revoke_permission`, `verify_otp`, `create_notification`, `anonymize_old_audit_logs`, `fuzzy_match_score`, `get_fiscal_year`, `format_currency`, `calculate_vat`, `calculate_withholding_tax`, `get_company_fiscal_config`, `generate_unique_reference` |
| `20260608000010_mobile_money.sql` | mobile_wallets, wallet_transactions, mobile_wallet_transactions, petty_cash_accounts, petty_cash_movements, checks, wire_transfers | FK treasury_movements.wallet_transaction_id résolue |
| `20260608000011_storage_buckets.sql` | — | 6 buckets + 14 policies storage |

---

## 5. Étapes de migration pas-à-pas

### Étape 1 : Créer un projet Supabase

1. Aller sur [supabase.com/dashboard](https://supabase.com/dashboard)
2. **New Project** → choisir la région la plus proche (ex: `eu-west-1` pour l'Afrique de l'Ouest)
3. Noter : **Project URL**, **anon key**, **service_role key**

### Étape 2 : Installer la Supabase CLI

```bash
npm install -g supabase
supabase login
```

### Étape 3 : Initialiser le projet local

```bash
cd c:\wamp64\www\wimrux_finances
supabase init
```

Copier les fichiers de migration dans `supabase/migrations/` :

```bash
xcopy /E /I sql\supabase\migrations supabase\migrations
```

### Étape 4 : Lier le projet Supabase

```bash
supabase link --project-ref <VOTRE_PROJECT_REF>
```

Le `project_ref` se trouve dans Dashboard > Settings > General.

### Étape 5 : Appliquer les migrations

```bash
# Appliquer TOUTES les migrations dans l'ordre
supabase db push
```

Ou migration par migration pour vérifier chaque étape :

```bash
supabase migration up 20260608000001
supabase migration up 20260608000002
# ... etc.
```

### Étape 6 : Appliquer les buckets Storage (SQL Editor)

La migration `00011_storage_buckets.sql` doit être exécutée depuis le **SQL Editor** du Dashboard Supabase (pas via CLI) car elle accède au schéma `storage` :

1. Dashboard > SQL Editor > New query
2. Coller le contenu de `20260608000011_storage_buckets.sql`
3. Cliquer **Run**

### Étape 7 : Configurer l'authentification

Dans Dashboard > Authentication > Settings :
- **Site URL** : `https://wimruxapp.vercel.app`
- **Redirect URLs** : `https://wimruxapp.vercel.app/**`
- Activer **Email** provider

### Étape 8 : Déployer les Edge Functions

```bash
supabase functions deploy send-email
supabase functions deploy send-otp-whatsapp
supabase functions deploy verify-otp
supabase functions deploy ai-router
```

Sources dans `c:\wamp64\www\wimrux_finances\ai_router_fn\`.

### Étape 9 : Configurer les secrets Edge Functions

```bash
supabase secrets set WHAPI_TOKEN=<votre_token_whatsapp>
supabase secrets set OPENROUTER_API_KEY=<votre_clé>
supabase secrets set LITELLM_BASE_URL=https://litellm.ulia.site/v1
supabase secrets set LANGFUSE_BASE_URL=https://langfuse.ulia.site
supabase secrets set STIRLING_BASE_URL=https://pdf.ulia.site
```

### Étape 10 : Mettre à jour `.env.local` de l'application

```env
VITE_SUPABASE_URL=https://<project_ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

---

## 6. Configuration du client SDK

Remplacer `@insforge/sdk` par `@supabase/supabase-js` :

```typescript
// Avant (InsForge)
import { createClient } from '@insforge/sdk';
const client = createClient({
  baseUrl: 'https://gfe4bd9y.eu-central.insforge.app',
  anonKey: process.env.VITE_INSFORGE_ANON_KEY
});

// Après (Supabase)
import { createClient } from '@supabase/supabase-js';
const client = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);
```

Les méthodes CRUD sont quasi-identiques :

| InsForge | Supabase |
|----------|----------|
| `client.db.from('table').select()` | `client.from('table').select()` |
| `client.db.from('table').insert([{...}])` | `client.from('table').insert({...})` |
| `client.db.from('table').update({...}).eq('id', id)` | `client.from('table').update({...}).eq('id', id)` |
| `client.auth.signIn({email, password})` | `client.auth.signInWithPassword({email, password})` |
| `client.storage.upload(key, file)` | `client.storage.from(bucket).upload(path, file)` |
| `client.functions.invoke('fn', {body})` | `client.functions.invoke('fn', {body})` |

---

## 7. Variables d'environnement

### Application (`.env.local`)

```env
VITE_SUPABASE_URL=https://<project_ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Edge Functions (secrets Supabase)

```bash
WHAPI_TOKEN            # 2FA WhatsApp
OPENROUTER_API_KEY     # IA via OpenRouter
LITELLM_BASE_URL       # https://litellm.ulia.site/v1
LANGFUSE_BASE_URL      # https://langfuse.ulia.site
STIRLING_BASE_URL      # https://pdf.ulia.site
DIFY_BASE_URL          # https://dify.ulia.site
PRESIDIO_URL           # https://presidio.ulia.site
```

---

## 8. Points d'attention critiques

### ⚠️ RLS — Fonction `get_user_company_id()`

Cette fonction est appelée dans **toutes** les policies RLS. Elle est définie en `SECURITY DEFINER` et doit être dans le schéma `public`. Sans elle, **aucune donnée n'est accessible**.

Vérification après migration :
```sql
SELECT public.get_user_company_id();  -- Doit retourner un UUID si vous êtes connecté
```

### ⚠️ `audit_log` — Séquence bigint

La table `audit_log` utilise une séquence PostgreSQL (pas `gen_random_uuid()`). La séquence `audit_log_id_seq` doit être créée **avant** la table. C'est fait en migration `00002`.

### ⚠️ FK circulaires `bank_transactions` ↔ `treasury_movements`

Ces deux tables se référencent mutuellement. La migration `00006` crée les tables sans les FK croisées, puis les ajoute avec `ALTER TABLE ADD CONSTRAINT`. Ne pas réordonner ces opérations.

### ⚠️ `invoice_payments` → `bank_transactions`

La table `bank_transactions` est définie en migration `00006` (mobile money / banque), **après** `invoices` (migration `00005`). La table `invoice_payments` est créée en `00007` et peut donc référencer `bank_transactions`. Ne pas déplacer `invoice_payments` avant `00007`.

### ⚠️ Storage buckets — exécution SQL Editor uniquement

Le schéma `storage` n'est pas accessible via `psql` standard ni via `supabase db push`. Exécuter `00011_storage_buckets.sql` **uniquement** depuis le SQL Editor du Dashboard.

### ⚠️ Plans Supabase et extensions

| Extension | Free | Pro+ |
|-----------|------|------|
| `fuzzystrmatch` | ✅ | ✅ |
| `pgcrypto` | ✅ | ✅ |
| `http` | ✅ | ✅ |
| `pg_cron` | ❌ | ✅ |
| `pg_net` | ✅ | ✅ |

---

## 9. Vérifications post-migration

### 9.1 Vérifier les tables

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
-- Attendu : 40+ tables
```

### 9.2 Vérifier les fonctions

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;
-- Attendu : 25+ fonctions
```

### 9.3 Vérifier les policies RLS

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
-- Attendu : 60+ policies
```

### 9.4 Tester l'isolation tenant

```sql
-- En tant qu'utilisateur authentifié (avec JWT valide) :
SELECT * FROM companies;          -- doit retourner UNE seule company
SELECT * FROM invoices LIMIT 5;   -- doit retourner seulement les factures de sa company
SELECT * FROM audit_log LIMIT 5;  -- doit retourner seulement les logs de sa company
```

### 9.5 Vérifier les buckets

```sql
SELECT id, name, public FROM storage.buckets ORDER BY name;
-- Attendu : 6 lignes
```

### 9.6 Test fonctionnel complet

1. **Auth** : créer un compte → vérifier `user_profiles` auto-créé
2. **Facture** : créer une facture FV → vérifier `audit_log` alimenté
3. **Paiement** : enregistrer un paiement → vérifier `payment_status` mis à jour sur la facture
4. **Storage** : uploader un logo company → vérifier URL accessible
5. **2FA OTP** : déclencher le flux WhatsApp → vérifier `otp_codes` créé
6. **IA** : appeler la function `ai-router` → vérifier `ai_usage_logs` alimenté

---

## Structure des fichiers de migration

```
sql/supabase/
├── README.md                                         ← Ce fichier
└── migrations/
    ├── 20260608000001_extensions.sql
    ├── 20260608000002_sequences_and_base_functions.sql
    ├── 20260608000003_core_tables.sql
    ├── 20260608000004_treasury_bank_articles.sql
    ├── 20260608000005_invoice_tables.sql
    ├── 20260608000006_bank_transactions_circular_fk.sql
    ├── 20260608000007_payments_and_taxes.sql
    ├── 20260608000008_ai_tables.sql
    ├── 20260608000009_system_tables.sql
    ├── 20260608000010_mobile_money.sql
    └── 20260608000011_storage_buckets.sql  ← SQL Editor uniquement
```

---

*Wimrux® Finances — Migration Supabase préparée le 2026-06-08*
