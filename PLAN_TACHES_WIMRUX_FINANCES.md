# PLAN DE TÂCHES — FINALISATION WIMRUX® FINANCES À 100%
**Document destiné aux agents codeurs (Claude/GPT/Gemini)**
**Date : 23 mai 2026**
**Source : PRD codé + Cahier des charges v1.2 + Schéma DB InsForge réel (25 tables)**

---

## 0. CONTEXTE D'EXÉCUTION POUR LES AGENTS

### 0.1 Stack confirmée (ne pas changer)
- **Frontend** : Quasar 2 + Vue 3 Composition API + TypeScript + Pinia
- **Backend** : InsForge BaaS (PostgreSQL + PostgREST + Edge Functions Deno)
- **Storage** : InsForge Storage (10 buckets existants)
- **Auth** : InsForge Auth (email/password + Google + GitHub)
- **IA** : OpenRouter (multi-modèles, clé chiffrée par entreprise)
- **PDF** : jsPDF + jspdf-autotable + qrcode
- **Déploiement** : Vercel (`wimrux_app`)
- **URL backend** : `gfe4bd9y.eu-central.insforge.app`

### 0.2 Périmètre WIMRUX FINANCES vs WIMRUX FACTURATION
- **WIMRUX FACTURATION (Electron Desktop)** : certification MCF Eltrade CC300, homologation FEC 06, file pull/push certification, QR SECeF — **NE PAS DUPLIQUER ICI**
- **WIMRUX FINANCES (SaaS Web)** : tout le reste de la gestion financière d'entreprise

### 0.3 Règles inviolables pour les agents
1. **Toujours réutiliser l'existant** : `companies`, `user_profiles`, `clients`, `articles`, `invoices`, `invoice_items`, `treasury_accounts`, `treasury_movements`, `audit_log`, `ai_usage_logs`, etc.
2. **RLS obligatoire** : toute nouvelle table DOIT avoir RLS activé avec politique basée sur `get_user_company_id()` + politique `project_admin_policy`
3. **Audit obligatoire** : ajouter `trg_audit_<table>` AFTER INSERT/UPDATE/DELETE → `log_audit_changes()` sur toute table sensible
4. **Multi-tenant** : toute nouvelle table DOIT avoir `company_id uuid NOT NULL` + FK CASCADE vers `companies(id)`
5. **Convention nommage** : snake_case en DB, camelCase en TS, kebab-case pour fichiers Vue
6. **Pas de duplication de la certification** : ne pas réimplémenter les workflows SECeF/MCF côté Finances
7. **i18n FR par défaut** (locale `fr-BF`)
8. **Tests** : chaque module livre au moins 1 test unitaire (Vitest) sur le composable principal

---

## 1. ÉTAT DES LIEUX — PRÉ-REQUIS À RÉSOUDRE (Sprint 0)

### EPIC 0 — Stabilisation de l'existant

#### T0.1 — Finaliser l'éditeur de factures `/invoices`
**Statut actuel** : page existe mais éditeur partiellement implémenté
**Livrable** :
- Éditeur complet (création, édition, lignes d'articles, calcul fiscal en temps réel)
- Sélection client + article depuis catalogues existants (`clients`, `articles`)
- Aperçu PDF inline (utiliser `useInvoicePdf.ts` existant)
- Bouton "Soumettre pour validation" → passage `draft` → `pending_validation`
- Bouton "Approuver/Rejeter" (RBAC `invoices.approve`)
- Bouton "Valider" (RBAC `invoices.validate`) → passe en `validated` → enqueue dans `pending_certification_queue` (handoff vers WIMRUX FACTURATION)
**Tables touchées** : `invoices`, `invoice_items`, `invoice_sequences`, `pending_certification_queue`
**Critères d'acceptation** :
- [ ] Toutes les transitions de statut respectent `submitted_by !== approver_id`
- [ ] `next_invoice_reference()` est appelé via RPC PostgREST
- [ ] Les triggers `trg_invoice_immutable_*` ne sont pas violés
- [ ] Calcul fiscal cohérent avec `useTaxCalculation.ts`

#### T0.2 — Tableau de bord principal `/dashboard`
**Statut actuel** : routes existent, contenu à confirmer
**Livrable** : page de tableau de bord avec widgets configurables :
- Widget "CA du mois" (somme `total_ttc` factures certifiées du mois)
- Widget "Factures en attente" (count `status IN ('pending_validation','approved')`)
- Widget "Solde trésorerie" (somme `treasury_accounts.balance`)
- Widget "Top 5 clients" (somme par `client_id`)
- Widget "Évolution CA 12 mois" (graphique courbe)
**Tables touchées** : lecture seule
**Critères d'acceptation** :
- [ ] Chargement < 1.5s avec données réelles
- [ ] Filtrage par période (mois/trimestre/année)
- [ ] Responsive desktop/tablette/mobile

#### T0.3 — Sélecteur d'entreprise multi-tenant en header
**Statut actuel** : champ `company_id` dans JWT mais pas de selector visible
**Livrable** :
- Composant `<CompanySelector>` dans le header global
- Liste les entreprises où l'utilisateur a un `user_role_assignments`
- Switch entreprise = nouveau JWT avec `company_id` mis à jour (via RPC InsForge `switch_company` à créer)
**Tables touchées** : `user_role_assignments`, `companies`
**Edge Function à créer** : `switch-company` (régénère JWT avec nouveau claim `company_id`)
**Critères d'acceptation** :
- [ ] L'utilisateur voit toutes ses entreprises
- [ ] Le switch invalide les caches Pinia
- [ ] Le RLS `get_user_company_id()` reflète immédiatement le changement

---

## 2. SPRINT 1 — MODULE BANQUE (P1 BLOQUANT)

### EPIC 1 — Gestion des comptes bancaires

#### T1.1 — Schéma DB pour comptes bancaires structurés
**Migration SQL à créer** :
```sql
CREATE TABLE bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_name varchar(255) NOT NULL,
  bank_code varchar(20),
  account_number varchar(50) NOT NULL,
  iban varchar(50),
  bic varchar(20),
  currency varchar(3) NOT NULL DEFAULT 'XOF',
  account_holder varchar(255),
  opening_balance numeric NOT NULL DEFAULT 0,
  current_balance numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  treasury_account_id uuid REFERENCES treasury_accounts(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  transaction_date date NOT NULL,
  value_date date,
  amount numeric NOT NULL,
  direction varchar(10) NOT NULL CHECK (direction IN ('debit','credit')),
  label text NOT NULL,
  reference varchar(100),
  category_id uuid,
  reconciliation_status varchar(20) NOT NULL DEFAULT 'unreconciled'
    CHECK (reconciliation_status IN ('unreconciled','matched','manual','ignored')),
  matched_invoice_id uuid REFERENCES invoices(id),
  matched_movement_id uuid REFERENCES treasury_movements(id),
  import_batch_id uuid,
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE transaction_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  code varchar(20),
  type varchar(20) CHECK (type IN ('income','expense','transfer','tax','bank_fee')),
  parent_id uuid REFERENCES transaction_categories(id),
  color varchar(7),
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, name)
);

CREATE TABLE bank_statement_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  bank_account_id uuid NOT NULL REFERENCES bank_accounts(id),
  file_name varchar(255),
  file_format varchar(10) CHECK (file_format IN ('OFX','CSV','QIF','PDF','XLSX')),
  total_rows integer DEFAULT 0,
  imported_rows integer DEFAULT 0,
  errors_count integer DEFAULT 0,
  status varchar(20) DEFAULT 'pending',
  imported_by varchar(255),
  created_at timestamptz DEFAULT now()
);
```
**À ajouter** : RLS + triggers d'audit comme convention
**Critères** :
- [ ] Toutes les contraintes CHECK posées
- [ ] FK avec ON DELETE CASCADE vers companies
- [ ] RLS company isolation + project_admin
- [ ] Triggers audit

#### T1.2 — Pages Vue pour gestion des comptes bancaires
**Routes à créer** :
- `/banking/accounts` — liste et CRUD comptes
- `/banking/accounts/:id` — détail compte + transactions + courbe solde
- `/banking/transactions` — vue transverse de toutes les transactions
- `/banking/import` — wizard d'import de relevé
- `/banking/reconciliation/:accountId` — interface de rapprochement

**Composables à créer** :
- `useBankAccounts.ts` — CRUD comptes
- `useBankTransactions.ts` — CRUD transactions + filtres
- `useBankImport.ts` — parsing fichiers OFX/CSV/QIF/PDF/XLSX
- `useReconciliation.ts` — algo rapprochement

**Critères** :
- [ ] CRUD complet sur `bank_accounts`
- [ ] Filtres par compte/période/catégorie/statut rapprochement
- [ ] Export CSV/XLSX des transactions
- [ ] Recherche full-text dans `label` et `reference`

#### T1.3 — Import de relevés bancaires (OFX/CSV/QIF/PDF/XLSX)
**Edge Function à créer** : `parse-bank-statement`
- Input : `{ file_base64, format, bank_account_id }`
- Détection format
- Parsing :
  - **OFX** : utiliser parser regex/XML simple
  - **CSV/XLSX** : mapper colonnes via UI (date / libellé / débit / crédit / solde)
  - **QIF** : parser ligne à ligne
  - **PDF** : extraction texte via `pdf-parse` côté Deno (fallback OCR si scanné — utiliser `parse-certified-invoice` existant comme modèle)
- Insertion en batch dans `bank_transactions` + `bank_statement_imports`
- Retour : `{ imported, errors, batch_id }`

**Composant UI** : `<BankStatementImportWizard>` (4 étapes : upload → mapping → preview → import)

**Critères** :
- [ ] Aucun doublon si même `(bank_account_id, transaction_date, amount, label)` déjà présent
- [ ] Rollback possible via `import_batch_id`
- [ ] Progress bar temps réel

#### T1.4 — Rapprochement bancaire manuel et automatique
**Composable** : `useReconciliation.ts`
- **Auto-match** : règles ordonnées
  1. Match exact par `reference` ↔ `invoices.reference`
  2. Match par montant + date ±3 jours + nom client/fournisseur (fuzzy `levenshtein` PostgreSQL)
  3. Match par règles utilisateur (table `reconciliation_rules` à créer)
- **Manuel** : interface split-view (transactions à gauche / factures-mouvements à droite) avec drag & drop

**Table additionnelle** :
```sql
CREATE TABLE reconciliation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  pattern_label text,
  pattern_amount_min numeric,
  pattern_amount_max numeric,
  category_id uuid REFERENCES transaction_categories(id),
  auto_match_invoice boolean DEFAULT false,
  priority integer DEFAULT 100,
  is_active boolean DEFAULT true
);
```

**Critères** :
- [ ] Match score affiché (0-100%)
- [ ] Undo possible
- [ ] Logs dans `audit_log`

#### T1.5 — Ordres de virement
**Tables additionnelles** :
```sql
CREATE TABLE wire_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reference varchar(50) NOT NULL,
  source_bank_account_id uuid NOT NULL REFERENCES bank_accounts(id),
  beneficiary_name varchar(255) NOT NULL,
  beneficiary_iban varchar(50),
  beneficiary_bic varchar(20),
  beneficiary_bank varchar(255),
  amount numeric NOT NULL,
  currency varchar(3) DEFAULT 'XOF',
  motif text,
  status varchar(20) DEFAULT 'draft' CHECK (status IN ('draft','approved','sent','executed','failed','cancelled')),
  scheduled_date date,
  executed_date date,
  invoice_id uuid REFERENCES invoices(id),
  created_by varchar(255),
  approved_by varchar(255),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, reference)
);
```
**Livrables** :
- Page `/banking/transfers` (CRUD + workflow approbation)
- Export format SEPA XML (pacs.008) — librairie : générer XML conformément à `ISO 20022`
- Génération PDF "Ordre de virement" via `useInvoicePdf` adapté

**Critères** :
- [ ] Workflow `draft → approved → sent → executed`
- [ ] Approbation requiert RBAC `treasury.update`
- [ ] Export SEPA XML conforme schéma

#### T1.6 — Gestion des chèques
**Table** :
```sql
CREATE TABLE checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type varchar(10) NOT NULL CHECK (type IN ('emitted','received')),
  check_number varchar(50) NOT NULL,
  bank_account_id uuid REFERENCES bank_accounts(id),
  amount numeric NOT NULL,
  issue_date date NOT NULL,
  due_date date,
  beneficiary_name varchar(255),
  drawer_name varchar(255),
  status varchar(20) DEFAULT 'in_circulation'
    CHECK (status IN ('in_circulation','cashed','bounced','cancelled','endorsed')),
  cashed_date date,
  invoice_id uuid REFERENCES invoices(id),
  created_at timestamptz DEFAULT now()
);
```
**Pages** : `/banking/checks` (liste + détail + statut)

**Critères** :
- [ ] Alerte automatique chèque approchant due_date
- [ ] Statistiques chèques en circulation par compte

#### T1.7 — Frais bancaires
**Réutiliser** `bank_transactions` avec `category.type = 'bank_fee'`
**Livrable** : vue dédiée `/banking/fees` filtrée + analyse mensuelle des frais

---

## 3. SPRINT 2 — FACTURES REÇUES & CRÉANCES (P1 BLOQUANT)

### EPIC 2 — Factures fournisseurs et OCR

#### T2.1 — Extension du schéma pour factures reçues
**Migration** : Ajouter à `invoices` la notion de **direction** émise/reçue
```sql
ALTER TABLE invoices ADD COLUMN direction varchar(10) DEFAULT 'issued'
  CHECK (direction IN ('issued','received'));

-- Pour les factures reçues, client_id devient le FOURNISSEUR
-- → Élargir clients ou créer suppliers ?
-- DÉCISION : créer une table dédiée pour ne pas polluer clients
CREATE TABLE suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  ifu varchar(20),
  rccm varchar(100),
  address text,
  phone varchar(30),
  email varchar(255),
  payment_terms_days integer DEFAULT 30,
  bank_iban varchar(50),
  default_category_id uuid REFERENCES transaction_categories(id),
  is_active boolean NOT NULL DEFAULT true,
  ifu_verified_at timestamptz,
  ifu_verification_result jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ADD COLUMN supplier_id uuid REFERENCES suppliers(id);
ALTER TABLE invoices ADD COLUMN supplier_invoice_number varchar(100);
ALTER TABLE invoices ADD COLUMN received_at timestamptz;
ALTER TABLE invoices ADD COLUMN received_by varchar(255);
ALTER TABLE invoices ADD COLUMN ocr_source_url text;
ALTER TABLE invoices ADD COLUMN ocr_confidence numeric;
ALTER TABLE invoices ADD COLUMN compliance_status varchar(20) DEFAULT 'pending'
  CHECK (compliance_status IN ('pending','compliant','non_compliant','exception'));
ALTER TABLE invoices ADD COLUMN compliance_issues jsonb DEFAULT '[]'::jsonb;
```

**Critères** :
- [ ] Toutes les pages factures filtrent par `direction`
- [ ] RLS inchangée (déjà par `company_id`)

#### T2.2 — Pages "Factures Reçues"
**Routes** :
- `/invoices/received` — liste
- `/invoices/received/new` — création manuelle
- `/invoices/received/scan` — capture par OCR (upload PDF/image)
- `/invoices/received/:id` — détail + workflow approbation

**Composables** :
- `useReceivedInvoices.ts`
- `useSuppliers.ts`
- `useInvoiceOcr.ts`

#### T2.3 — OCR factures reçues
**Edge Function à créer** : `ocr-supplier-invoice`
- Input : `{ file_url, company_id }`
- Provider : utiliser OpenRouter avec modèle vision (claude-sonnet-4.5 ou gpt-4o) — l'infrastructure IA existe déjà
- Prompt structuré JSON : extraire `supplier_name, supplier_ifu, invoice_number, date, items[], total_ht, total_tva, total_ttc, currency`
- Stocker confiance par champ
- Sauvegarder fichier source dans bucket `invoices-pdf` (existant) — sous-dossier `received/`
- Pré-remplir le formulaire facture reçue

**Tracking** : utiliser `ai_usage_logs` (table existante) avec `task = 'ocr_supplier_invoice'`

**Critères** :
- [ ] Confiance affichée par champ
- [ ] Validation humaine obligatoire avant enregistrement
- [ ] Coût USD tracé

#### T2.4 — Vérification IFU via API DGI
**Edge Function à créer** : `verify-ifu-dgi`
- Input : `{ ifu }`
- Appel API DGI BF (URL et auth à confirmer auprès DGI — paramètre en variable d'environnement)
- Cache : table dédiée
```sql
CREATE TABLE ifu_verification_cache (
  ifu varchar(20) PRIMARY KEY,
  company_name varchar(255),
  tax_regime varchar(50),
  is_valid boolean,
  raw_response jsonb,
  verified_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT now() + interval '30 days'
);
```
- Output : `{ valid, company_name, regime }`

**À intégrer** :
- Création/édition client/fournisseur : bouton "Vérifier IFU"
- Saisie facture reçue : vérification auto
- Création entreprise : vérification de l'IFU de l'entreprise elle-même

**Critères** :
- [ ] Fallback gracieux si API DGI down (mode dégradé "non vérifié")
- [ ] Logging des appels dans `audit_log`

#### T2.5 — Contrôle de conformité fiscale des factures reçues
**Règles par pays (BF)** :
- IFU fournisseur présent et valide
- Numéro de facture format DGI (vérifier longueur 32 max selon SECeF)
- Date émission ≤ aujourd'hui
- Total HT + TVA + PSVB = Total TTC (tolérance arrondi)
- Si Total TTC > seuil → timbre quittance obligatoire
- Si fournisseur burkinabè ET pas de NIM/Code SECeF → flag "non certifié DGI"

**Composable** : `useComplianceCheck.ts`
**Stockage** : `invoices.compliance_status` et `invoices.compliance_issues`

**Critères** :
- [ ] Toutes les règles documentées dans `docs/compliance-rules-bf.md`
- [ ] Possibilité de **passer outre** avec motif + RBAC `invoices.approve`

#### T2.6 — Vérification des stickers d'impôts
**Edge Function** : `verify-tax-sticker`
- API à définir auprès DGI (paramétrable)
- Si pas d'API disponible : mode "manuel" avec champ texte + photo du sticker stockée dans `invoices-pdf/received-stickers/`

**Critères** :
- [ ] Configurable par entreprise (`companies.fiscal_config.sticker_verification_enabled`)

### EPIC 3 — Cycle de paiement, créances et relances

#### T3.1 — Cycle de paiement des factures
**Migration** :
```sql
ALTER TABLE invoices ADD COLUMN payment_status varchar(20) DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid','partial','paid','overpaid','cancelled'));
ALTER TABLE invoices ADD COLUMN paid_amount numeric DEFAULT 0;
ALTER TABLE invoices ADD COLUMN paid_at timestamptz;
ALTER TABLE invoices ADD COLUMN due_date date;
ALTER TABLE invoices ADD COLUMN payment_terms_days integer DEFAULT 30;

CREATE TABLE invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_date date NOT NULL,
  payment_method varchar(20) NOT NULL CHECK (payment_method IN ('cash','check','transfer','mobile_money','card','credit','other')),
  reference varchar(100),
  treasury_movement_id uuid REFERENCES treasury_movements(id),
  bank_transaction_id uuid REFERENCES bank_transactions(id),
  check_id uuid REFERENCES checks(id),
  notes text,
  recorded_by varchar(255),
  created_at timestamptz DEFAULT now()
);
```

**Trigger** : mettre à jour `invoices.paid_amount` et `payment_status` à chaque INSERT/UPDATE/DELETE sur `invoice_payments`
```sql
CREATE FUNCTION update_invoice_payment_status() RETURNS trigger ...
```

**Critères** :
- [ ] `paid_amount` toujours = SUM(`invoice_payments.amount`)
- [ ] `payment_status` dérivé correctement : 0 → unpaid, < total → partial, = total → paid, > total → overpaid

#### T3.2 — Suivi des créances clients et balance âgée
**Vue SQL** :
```sql
CREATE VIEW v_client_receivables AS
SELECT
  c.id AS client_id,
  c.company_id,
  c.name AS client_name,
  COUNT(i.id) AS invoice_count,
  SUM(i.total_ttc - i.paid_amount) AS outstanding_amount,
  SUM(CASE WHEN i.due_date >= CURRENT_DATE THEN i.total_ttc - i.paid_amount ELSE 0 END) AS not_due,
  SUM(CASE WHEN i.due_date < CURRENT_DATE AND i.due_date >= CURRENT_DATE - 30 THEN i.total_ttc - i.paid_amount ELSE 0 END) AS overdue_0_30,
  SUM(CASE WHEN i.due_date < CURRENT_DATE - 30 AND i.due_date >= CURRENT_DATE - 60 THEN i.total_ttc - i.paid_amount ELSE 0 END) AS overdue_31_60,
  SUM(CASE WHEN i.due_date < CURRENT_DATE - 60 AND i.due_date >= CURRENT_DATE - 90 THEN i.total_ttc - i.paid_amount ELSE 0 END) AS overdue_61_90,
  SUM(CASE WHEN i.due_date < CURRENT_DATE - 90 THEN i.total_ttc - i.paid_amount ELSE 0 END) AS overdue_90_plus
FROM clients c
LEFT JOIN invoices i ON i.client_id = c.id
  AND i.direction = 'issued'
  AND i.payment_status IN ('unpaid','partial')
  AND i.status IN ('certified','validated')
GROUP BY c.id, c.company_id, c.name;
```

**Page** : `/receivables` — table balance âgée + drilldown par client → liste factures

**Export** : PDF + Excel + CSV

#### T3.3 — Relances automatiques
**Tables** :
```sql
CREATE TABLE reminder_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  level integer NOT NULL CHECK (level BETWEEN 1 AND 5),
  trigger_days_after_due integer NOT NULL,
  channel varchar(20) NOT NULL CHECK (channel IN ('email','sms','whatsapp')),
  subject varchar(255),
  body_template text NOT NULL,
  is_active boolean DEFAULT true,
  UNIQUE(company_id, level, channel)
);

CREATE TABLE reminder_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  template_id uuid REFERENCES reminder_templates(id),
  level integer NOT NULL,
  channel varchar(20) NOT NULL,
  sent_to varchar(255),
  status varchar(20) DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','bounced','failed')),
  sent_at timestamptz,
  external_id varchar(255),
  error_message text,
  created_at timestamptz DEFAULT now()
);
```

**Edge Function** : `cron-send-reminders` (CRON quotidien)
- Lit factures impayées avec `due_date + level.trigger_days_after_due ≤ today`
- Vérifie qu'un reminder de ce niveau n'a pas déjà été envoyé
- Envoie via canal (mail/SMS/WhatsApp) — utiliser `chatbot-gateway` existante pour WhatsApp
- Enregistre dans `reminder_history`

**Variables Mustache supportées** : `{{client_name}}`, `{{invoice_reference}}`, `{{amount}}`, `{{due_date}}`, `{{days_overdue}}`, `{{company_name}}`

**Critères** :
- [ ] Aucun reminder envoyé deux fois pour le même `(invoice, level, channel)`
- [ ] Désactivation possible par client
- [ ] Page UI `/settings/reminders` pour configurer templates

---

## 4. SPRINT 3 — BUDGETS & TRÉSORERIE PRÉVISIONNELLE (P1)

### EPIC 4 — Budgets

#### T4.1 — Schéma budgets
```sql
CREATE TABLE budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  period_type varchar(20) NOT NULL CHECK (period_type IN ('monthly','quarterly','yearly','custom')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_planned numeric NOT NULL DEFAULT 0,
  status varchar(20) DEFAULT 'active' CHECK (status IN ('draft','active','closed','archived')),
  created_by varchar(255),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id uuid NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id uuid REFERENCES transaction_categories(id),
  label varchar(255),
  planned_amount numeric NOT NULL DEFAULT 0,
  actual_amount numeric NOT NULL DEFAULT 0,
  alert_threshold_pct integer DEFAULT 80,
  alert_sent_at timestamptz,
  sort_order integer DEFAULT 0
);
```

**Vue de réconciliation budget vs réel** :
```sql
CREATE VIEW v_budget_vs_actual AS
SELECT
  bl.id, bl.budget_id, bl.category_id, bl.label,
  bl.planned_amount,
  COALESCE(SUM(bt.amount), 0) AS computed_actual,
  bl.planned_amount - COALESCE(SUM(bt.amount), 0) AS variance,
  CASE WHEN bl.planned_amount > 0
       THEN COALESCE(SUM(bt.amount), 0) / bl.planned_amount * 100
       ELSE 0 END AS consumption_pct
FROM budget_lines bl
LEFT JOIN budgets b ON b.id = bl.budget_id
LEFT JOIN bank_transactions bt ON bt.category_id = bl.category_id
  AND bt.transaction_date BETWEEN b.period_start AND b.period_end
  AND bt.company_id = bl.company_id
GROUP BY bl.id, bl.budget_id, bl.category_id, bl.label, bl.planned_amount;
```

#### T4.2 — Pages budgets
**Routes** :
- `/budgets` — liste budgets
- `/budgets/:id` — détail + lignes + graphique consommation
- `/budgets/:id/variance` — analyse écart

**Critères** :
- [ ] Création par copie d'un budget précédent
- [ ] Alerte temps réel via `pg_net` ou Realtime quand consumption_pct ≥ alert_threshold_pct
- [ ] Export PDF rapport budgétaire

### EPIC 5 — Trésorerie prévisionnelle

#### T5.1 — Schéma cashflow forecast
```sql
CREATE TABLE cashflow_forecasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  horizon_days integer NOT NULL DEFAULT 90,
  method varchar(20) DEFAULT 'historical' CHECK (method IN ('historical','manual','hybrid','ml')),
  base_date date NOT NULL DEFAULT CURRENT_DATE,
  generated_at timestamptz DEFAULT now(),
  data jsonb NOT NULL,
  created_by varchar(255)
);

CREATE TABLE cashflow_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  forecast_id uuid REFERENCES cashflow_forecasts(id),
  name varchar(100) NOT NULL,
  description text,
  assumptions jsonb NOT NULL,
  result jsonb,
  created_at timestamptz DEFAULT now()
);
```

#### T5.2 — Algorithme de prévision
**Composable** : `useCashflowForecast.ts`
- **Méthode historique** : moyenne mobile 3/6/12 mois sur catégories
- **Méthode hybride** : factures émises non payées (entrée prévue à `due_date`) + factures reçues non payées (sortie prévue à `due_date`) + dépenses récurrentes (détectées sur 3 mois)
- **Méthode ML** : appel IA (OpenRouter, task `cashflow_forecast`) — fallback `gpt-4o-mini`

**Visualisation** : Chart.js courbe stack (entrées / sorties / solde cumulé)

**Critères** :
- [ ] Identifie périodes à risque (solde < seuil paramétrable)
- [ ] Comparaison multi-scénarios sur même graphique

#### T5.3 — Simulation de scénarios
**UI** : `/treasury/scenarios/new` — formulaire :
- Retard de paiement client X de N jours
- Modification dates fournisseurs
- Nouvel emprunt (lié à Sprint 6)
- Nouvelle dépense récurrente

**Output** : graphique avant/après + tableau des impacts

---

## 5. SPRINT 4 — IMMOBILISATIONS, EMPRUNTS, INVESTISSEMENTS (P2)

### EPIC 6 — Immobilisations

#### T6.1 — Schéma
```sql
CREATE TABLE asset_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  default_depreciation_method varchar(20) DEFAULT 'linear' CHECK (default_depreciation_method IN ('linear','degressive','units')),
  default_useful_life_years integer,
  default_residual_value_pct numeric DEFAULT 0,
  accounting_code varchar(20),
  UNIQUE(company_id, name)
);

CREATE TABLE fixed_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id uuid REFERENCES asset_categories(id),
  reference varchar(50) NOT NULL,
  name varchar(255) NOT NULL,
  description text,
  acquisition_date date NOT NULL,
  acquisition_value numeric NOT NULL,
  residual_value numeric DEFAULT 0,
  useful_life_years integer NOT NULL,
  depreciation_method varchar(20) NOT NULL,
  supplier_id uuid REFERENCES suppliers(id),
  invoice_id uuid REFERENCES invoices(id),
  location varchar(255),
  status varchar(20) DEFAULT 'in_service' CHECK (status IN ('in_service','disposed','sold','scrapped')),
  disposal_date date,
  disposal_value numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, reference)
);

CREATE TABLE asset_depreciation_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_year integer NOT NULL,
  period_month integer,
  annuity numeric NOT NULL,
  accumulated numeric NOT NULL,
  net_book_value numeric NOT NULL,
  is_posted boolean DEFAULT false,
  UNIQUE(asset_id, period_year, period_month)
);
```

#### T6.2 — Calcul amortissement
**Composable** : `useDepreciation.ts`
- Linéaire : `annuity = (value - residual) / useful_life`
- Dégressif : taux dégressif fiscal BF (selon catégorie)
- Génération du tableau d'amortissement complet à la création

**Routes** :
- `/assets` — catalogue
- `/assets/:id` — détail + tableau amortissement + courbe valeur résiduelle

### EPIC 7 — Emprunts

#### T7.1 — Schéma
```sql
CREATE TABLE loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  reference varchar(50) NOT NULL,
  lender_name varchar(255) NOT NULL,
  principal_amount numeric NOT NULL,
  currency varchar(3) DEFAULT 'XOF',
  interest_rate numeric NOT NULL,
  rate_type varchar(20) CHECK (rate_type IN ('fixed','variable')),
  duration_months integer NOT NULL,
  start_date date NOT NULL,
  first_payment_date date NOT NULL,
  amortization_method varchar(20) DEFAULT 'constant_annuity'
    CHECK (amortization_method IN ('constant_annuity','constant_principal','bullet','custom')),
  bank_account_id uuid REFERENCES bank_accounts(id),
  status varchar(20) DEFAULT 'active' CHECK (status IN ('draft','active','paid_off','defaulted')),
  outstanding_balance numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, reference)
);

CREATE TABLE loan_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  installment_number integer NOT NULL,
  due_date date NOT NULL,
  principal numeric NOT NULL,
  interest numeric NOT NULL,
  total numeric NOT NULL,
  remaining_balance numeric NOT NULL,
  is_paid boolean DEFAULT false,
  paid_at timestamptz,
  bank_transaction_id uuid REFERENCES bank_transactions(id),
  UNIQUE(loan_id, installment_number)
);
```

#### T7.2 — Calcul échéanciers + KPI endettement
- Générer `loan_schedule` à la création
- Vue `v_debt_ratio` calculant le ratio dette/CA

### EPIC 8 — Investissements

```sql
CREATE TABLE investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type varchar(30) NOT NULL CHECK (type IN ('stocks','bonds','real_estate','mutual_fund','term_deposit','other')),
  name varchar(255) NOT NULL,
  ticker varchar(20),
  quantity numeric,
  purchase_price numeric NOT NULL,
  purchase_date date NOT NULL,
  current_price numeric,
  current_value numeric,
  currency varchar(3) DEFAULT 'XOF',
  status varchar(20) DEFAULT 'active',
  notes text,
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE investment_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investment_id uuid NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  valuation_date date NOT NULL,
  price numeric NOT NULL,
  total_value numeric NOT NULL,
  UNIQUE(investment_id, valuation_date)
);
```

**Calcul rendement** : `(current_value - purchase_price * quantity) / (purchase_price * quantity)` + annualisé.

---

## 6. SPRINT 5 — PETITE CAISSE, WALLETS MOBILES, WORKFLOWS APPROBATION (P2)

### EPIC 9 — Petite caisse avec approvisionnement multi-niveaux

#### T9.1 — Schéma
```sql
CREATE TABLE petty_cash_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  manager_user_id varchar(255),
  ceiling_amount numeric,
  current_balance numeric DEFAULT 0,
  treasury_account_id uuid REFERENCES treasury_accounts(id),
  is_active boolean DEFAULT true
);

CREATE TABLE petty_cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  petty_cash_id uuid NOT NULL REFERENCES petty_cash_accounts(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  direction varchar(10) CHECK (direction IN ('in','out')),
  amount numeric NOT NULL,
  category_id uuid REFERENCES transaction_categories(id),
  label text NOT NULL,
  supporting_doc_url text,
  movement_date date NOT NULL,
  recorded_by varchar(255),
  treasury_movement_id uuid REFERENCES treasury_movements(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE replenishment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  target_type varchar(20) CHECK (target_type IN ('petty_cash','mobile_wallet')),
  target_id uuid NOT NULL,
  amount numeric NOT NULL,
  reason text NOT NULL,
  status varchar(20) DEFAULT 'pending'
    CHECK (status IN ('pending','approved_l1','approved_l2','approved_final','rejected','disbursed','cancelled')),
  current_level integer DEFAULT 1,
  required_levels integer NOT NULL DEFAULT 2,
  requested_by varchar(255) NOT NULL,
  requested_at timestamptz DEFAULT now(),
  disbursed_at timestamptz,
  source_account_id uuid REFERENCES bank_accounts(id)
);

CREATE TABLE replenishment_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES replenishment_requests(id) ON DELETE CASCADE,
  level integer NOT NULL,
  approver_id varchar(255) NOT NULL,
  decision varchar(10) CHECK (decision IN ('approved','rejected')),
  comment text,
  decided_at timestamptz DEFAULT now()
);

CREATE TABLE approval_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  domain varchar(30) NOT NULL,
  threshold_amount numeric NOT NULL DEFAULT 0,
  required_levels integer NOT NULL DEFAULT 1,
  approver_role_l1 varchar(50),
  approver_role_l2 varchar(50),
  approver_role_l3 varchar(50),
  is_active boolean DEFAULT true,
  UNIQUE(company_id, domain, threshold_amount)
);
```

**Permissions** : ajouter `petty_cash.read`, `petty_cash.create`, `replenishment.approve_l1/l2/l3`.

### EPIC 10 — Wallets mobiles structurés

```sql
CREATE TABLE mobile_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider varchar(30) NOT NULL CHECK (provider IN ('orange_money','moov_money','wave','mtn_momo','airtel_money','other')),
  phone_number varchar(20) NOT NULL,
  account_name varchar(255),
  current_balance numeric DEFAULT 0,
  treasury_account_id uuid REFERENCES treasury_accounts(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, provider, phone_number)
);

CREATE TABLE mobile_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES mobile_wallets(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type varchar(20) NOT NULL CHECK (type IN ('deposit','withdrawal','transfer_in','transfer_out','payment','fee')),
  amount numeric NOT NULL,
  fees numeric DEFAULT 0,
  counterparty_phone varchar(20),
  counterparty_name varchar(255),
  external_transaction_id varchar(100),
  transaction_date timestamptz NOT NULL,
  status varchar(20) DEFAULT 'completed',
  treasury_movement_id uuid REFERENCES treasury_movements(id),
  created_at timestamptz DEFAULT now()
);
```

**Pages** : `/mobile-wallets` — liste + détail + import CSV depuis relevé opérateur

---

## 7. SPRINT 6 — REPORTING & EXPORTS (P2)

### EPIC 11 — Rapports standards

#### T11.1 — Bilan comptable
**Vue SQL** ou **vue calculée TypeScript** :
- Actif : immobilisations nettes (`fixed_assets` - amortissements) + stocks (`articles.stock_quantity * unit_price`) + créances clients + trésorerie
- Passif : capitaux propres + emprunts restants (`loans.outstanding_balance`) + dettes fournisseurs (`invoices.direction='received' AND payment_status IN ('unpaid','partial')`)

#### T11.2 — Compte de résultat
- Produits : factures émises certifiées (`total_ht`)
- Charges : factures reçues conformes (`total_ht`) + frais bancaires + amortissements de la période
- Résultat = Produits - Charges

#### T11.3 — Balance âgée (déjà partiellement en T3.2)

#### T11.4 — Page `/reports/standard`
**Sélecteur** : type de rapport + période + format (PDF/Excel/CSV/HTML)
**Génération PDF** : utiliser `useInvoicePdf` étendu pour rapports

### EPIC 12 — Générateur de requêtes visuel (Query Builder)

#### T12.1 — Composant `<VisualQueryBuilder>`
**Sources** : factures, transactions bancaires, mouvements trésorerie, paiements, etc.
**Operations** : filter, group, aggregate (sum/avg/count/min/max), sort, limit
**Vue** : table / chart (bar/line/pie/donut)
**Sauvegarde** :
```sql
CREATE TABLE saved_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  description text,
  source varchar(50) NOT NULL,
  config jsonb NOT NULL,
  visualization varchar(20) DEFAULT 'table',
  is_shared boolean DEFAULT false,
  created_by varchar(255),
  created_at timestamptz DEFAULT now()
);
```

#### T12.2 — Tableaux de bord personnalisables
```sql
CREATE TABLE dashboards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id varchar(255),
  name varchar(100) NOT NULL,
  layout jsonb NOT NULL,
  is_default boolean DEFAULT false
);
```
**Composant** : `<DashboardEditor>` (grid drag & drop, widgets configurables)

### EPIC 13 — Export universel

**Edge Function** : `export-report`
- Input : `{ report_type, params, format }`
- Output : URL signée du fichier dans `invoices-pdf` (sous-dossier `reports/`)
- Formats : PDF (jsPDF), XLSX (`exceljs` côté Deno ou côté client), CSV, PNG (image du graphique via `chart.js` headless)

---

## 8. SPRINT 7 — IA AVANCÉE & NL→SQL (P2)

### EPIC 14 — Analyse prédictive ML

#### T14.1 — Détection d'anomalies avancée
- Étendre le mode existant `detection_anomalie`
- Règles statistiques : Z-score sur montants par catégorie, détection de doublons (même montant + même fournisseur + même semaine)
- Vue dédiée `/ai/anomalies`

#### T14.2 — Prévision entrées/sorties
- Ajouter task IA `cashflow_forecast` (réutiliser `ai_usage_logs`)
- Provider : OpenRouter, modèle principal `claude-sonnet-4.5`, fallback `gpt-4o-mini`
- Input : historique 12 mois agrégé par catégorie
- Output : prévisions M+1, M+2, M+3 avec intervalles de confiance

### EPIC 15 — NL→SQL (langage naturel → requête)

#### T15.1 — Edge Function `nl-to-sql`
- Input : `{ question, company_id }`
- LLM : claude-sonnet-4.5 avec prompt système qui inclut le **schéma DB whitelisté** (uniquement les tables read-only)
- **GARDE-FOUS OBLIGATOIRES** :
  - SQL généré filtré par `WHERE company_id = '<JWT company_id>'` (réécriture automatique)
  - Whitelist tables : `invoices`, `clients`, `articles`, `bank_transactions`, `treasury_movements`, `invoice_payments`, vues `v_*`
  - **Blocage strict** : aucun mot-clé `DROP`, `DELETE`, `UPDATE`, `INSERT`, `ALTER`, `GRANT`
  - Timeout 30s
  - Max 1000 lignes
- Exécution via PostgREST RPC `execute_safe_query(sql_text)` avec `SECURITY DEFINER` mais role read-only
- Retour : `{ data, suggested_visualization, sql_for_review }`

#### T15.2 — Page `/ai/ask`
**UI** : champ question + bouton "Poser" + résultats (table + graphique auto) + bouton "Voir SQL"

**Tracking** : `ai_usage_logs.task = 'nl_to_sql'`

---

## 9. SPRINT 8 — NOTIFICATIONS, AIDE, PERSONNALISATION (P3)

### EPIC 16 — Système de notifications

#### T16.1 — Schéma
```sql
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id varchar(255) NOT NULL,
  type varchar(50) NOT NULL,
  title varchar(255) NOT NULL,
  body text,
  link text,
  severity varchar(20) DEFAULT 'info' CHECK (severity IN ('info','success','warning','error')),
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id varchar(255) NOT NULL,
  notification_type varchar(50) NOT NULL,
  in_app boolean DEFAULT true,
  email boolean DEFAULT false,
  sms boolean DEFAULT false,
  whatsapp boolean DEFAULT false,
  UNIQUE(user_id, notification_type)
);
```

#### T16.2 — Trigger events qui créent des notifications
| Event | Trigger |
|---|---|
| Facture en attente d'approbation | Trigger PG sur `invoices.status → pending_validation` |
| Budget à 80% | Edge Function CRON quotidien |
| Échéance facture J-3 | Edge Function CRON quotidien |
| Chèque approchant due_date | Edge Function CRON quotidien |
| Demande d'approvisionnement | Trigger PG sur `replenishment_requests` |
| Anomalie détectée par IA | Edge Function `detect-anomalies` (CRON) |

#### T16.3 — UI
- Cloche dans header avec badge count
- Drawer notifications + filtrage
- Page `/settings/notifications` pour préférences

### EPIC 17 — Aide, documentation, tickets

#### T17.1 — Centre d'aide
**Route** : `/help`
- Articles markdown statiques dans `src/docs/` (FR par défaut, EN/PT en extension)
- Recherche full-text
- Sommaire automatique

#### T17.2 — Système de tickets
```sql
CREATE TABLE support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by varchar(255) NOT NULL,
  subject varchar(255) NOT NULL,
  description text NOT NULL,
  status varchar(20) DEFAULT 'open',
  priority varchar(10) DEFAULT 'normal',
  assigned_to varchar(255),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_id varchar(255) NOT NULL,
  author_type varchar(10) CHECK (author_type IN ('user','support')),
  message text NOT NULL,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

#### T17.3 — Feedback utilisateurs
**Bouton flottant** "Feedback" → modal → `support_tickets` avec type `feedback`

### EPIC 18 — Personnalisation UI

#### T18.1 — Thème global par entreprise
**Migration** : `companies.ui_theme jsonb` (couleurs primaire/secondaire/accent, mode dark/light)
**Composable** : `useTheme.ts` — applique les CSS variables Quasar à chaud
**Page** : `/settings/appearance`

#### T18.2 — Templates de factures multiples
**Migration** :
```sql
CREATE TABLE invoice_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  layout jsonb NOT NULL,
  is_default boolean DEFAULT false,
  preview_url text
);
```
**Page** : `/settings/invoice-templates`

---

## 10. SPRINT 9 — SÉCURITÉ, RGPD, MONITORING (P3 — Conformité)

### EPIC 19 — Authentification forte

#### T19.1 — 2FA (TOTP)
- InsForge fournit-il 2FA natif ? Sinon implémenter :
```sql
CREATE TABLE user_2fa (
  user_id varchar(255) PRIMARY KEY,
  totp_secret text NOT NULL,
  backup_codes_hash text[],
  enabled_at timestamptz,
  last_used_at timestamptz
);
```
- Librairie : `otpauth` (Vue) + génération QR code de provisioning
- Edge Function : `verify-totp` (validation code 6 chiffres)

#### T19.2 — Force des mots de passe
- Augmenter min length 6 → 12
- Règles : majuscule + minuscule + chiffre + spécial
- Composant `<PasswordStrengthMeter>`

### EPIC 20 — RGPD

#### T20.1 — Consentement
```sql
CREATE TABLE user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar(255) NOT NULL,
  consent_type varchar(50) NOT NULL,
  granted boolean NOT NULL,
  granted_at timestamptz DEFAULT now(),
  ip_address varchar(45),
  user_agent text,
  policy_version varchar(20) NOT NULL
);
```
**Modal au login** si nouvelle version de politique non acceptée

#### T20.2 — Droits utilisateurs
**Edge Function** : `gdpr-data-export`
- Génère un ZIP avec toutes les données de l'utilisateur (JSON par table)
- Email avec lien signé 24h

**Edge Function** : `gdpr-data-deletion`
- Anonymise (pseudonymise) les données après vérification 2FA
- `audit_log` non supprimé (légal) mais `user_id` remplacé par hash

#### T20.3 — Politique de confidentialité + CGU
- Pages `/legal/privacy` et `/legal/terms`
- Versioning + tracking acceptation

### EPIC 21 — Monitoring & KPI utilisateurs

#### T21.1 — Page `/admin/user-kpi`
**Métriques** (exploite `audit_log` existant) :
- Factures émises / réceptionnées par utilisateur
- Temps moyen d'approbation par utilisateur
- Heatmap d'activité (heures × jours)
- Top utilisateurs par actions

**Vues SQL** :
```sql
CREATE VIEW v_user_activity_stats AS
SELECT
  user_id,
  company_id,
  table_name,
  action_type,
  COUNT(*) AS action_count,
  MIN(timestamp) AS first_action,
  MAX(timestamp) AS last_action,
  DATE_TRUNC('day', timestamp) AS activity_date
FROM audit_log
GROUP BY user_id, company_id, table_name, action_type, DATE_TRUNC('day', timestamp);

CREATE VIEW v_approval_time_stats AS
SELECT
  approved_by AS user_id,
  company_id,
  AVG(EXTRACT(EPOCH FROM (approved_at - submitted_at)) / 3600) AS avg_approval_hours,
  COUNT(*) AS approvals_count
FROM invoices
WHERE approved_at IS NOT NULL AND submitted_at IS NOT NULL
GROUP BY approved_by, company_id;
```

#### T21.2 — Surveillance applicative
- Sentry frontend (DSN par environnement)
- Logs Vercel exportés vers monitoring centralisé
- Healthcheck endpoint `/health` (Edge Function)

---

## 11. SPRINT 10 — INTÉGRATIONS FISCALES & MULTI-LANGUE (P3)

### EPIC 22 — Retenues à la source, TVA, BIC

```sql
CREATE TABLE tax_withholdings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES invoices(id),
  withholding_type varchar(30) CHECK (withholding_type IN ('rs_bic','rs_loyer','rs_prestations','tva_collectee','tva_deductible','crédit_tva')),
  base_amount numeric NOT NULL,
  rate numeric NOT NULL,
  amount numeric NOT NULL,
  period_year integer NOT NULL,
  period_month integer NOT NULL,
  declared boolean DEFAULT false,
  declaration_reference varchar(50),
  declared_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

**Page** : `/tax/withholdings` — table par type + période + bouton "Déclaration"

**Génération états déclaratifs** : PDF formaté DGI BF (modèles à fournir)

### EPIC 23 — Multi-langue

**Setup i18n Quasar** :
- Locales : `fr` (défaut), `en`, `pt`
- Tous les textes UI passent par `$t()`
- Détection automatique navigateur + override en `user_profiles.preferred_locale`

---

## 12. ANNEXES — STANDARDS DE LIVRAISON

### A.1 Définition de "Done"
Chaque tâche est considérée terminée si :
- [ ] Code mergé sur `main`
- [ ] Migration SQL appliquée en dev + RLS activé + audit configuré
- [ ] Tests unitaires sur composable principal (couverture > 70%)
- [ ] Test E2E sur le happy path (Playwright/Cypress)
- [ ] Documentation utilisateur dans `src/docs/` (1 article par feature)
- [ ] Documentation technique JSDoc/TSDoc dans le code
- [ ] Revue de code par un autre agent ou par le développeur principal
- [ ] Pas de régression sur les modules existants

### A.2 Structure d'une migration SQL
```sql
-- migrations/2026-MM-DD_NNN_<feature>.sql
BEGIN;

-- 1. Tables
CREATE TABLE IF NOT EXISTS ...;

-- 2. Indexes
CREATE INDEX IF NOT EXISTS ...;

-- 3. RLS
ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;
CREATE POLICY <name>_company_isolation ON <name>
  FOR ALL TO public
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());
CREATE POLICY <name>_project_admin ON <name>
  FOR ALL TO public
  USING (project_admin_policy())
  WITH CHECK (project_admin_policy());

-- 4. Triggers d'audit
CREATE TRIGGER trg_audit_<name>
  AFTER INSERT OR UPDATE OR DELETE ON <name>
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- 5. Données de seed si pertinent

COMMIT;
```

### A.3 Convention pour nouveaux composables
```ts
// useFeatureName.ts
import { ref, computed } from 'vue';
import { useInsForge } from '@/composables/useInsForge';
import { useCompany } from '@/composables/useCompany';

export function useFeatureName() {
  const { client } = useInsForge();
  const { companyId } = useCompany();
  // ...
  return { /* state, methods */ };
}
```

### A.4 Convention pour nouvelles Edge Functions
- Dossier : `insforge/functions/<slug>/index.ts`
- Header standard : CORS + auth check + company_id resolution depuis JWT
- Logging structuré : `console.log(JSON.stringify({ level, msg, company_id, ... }))`
- Réponse : `{ success: boolean, data?, error? }` JSON

### A.5 Quels modules ne pas toucher dans WIMRUX FINANCES
- `pending_certification_queue` (lecture seule, write par WIMRUX FACTURATION)
- `devices`, `certification_devices` (gérés par FACTURATION)
- `sim_invoices`, `mcf_logs`, `fiscal_reports` Z/X (gérés par FACTURATION)
- Edge Functions : `generate-device-key`, `device-heartbeat`, `push-certified-invoice`, `pull-pending-invoices`, `mcf-simulator`, `fnec-simulator`

### A.6 Buckets Storage à exploiter
- `invoices-pdf` (public, déjà utilisé) — étendre avec sous-dossiers : `issued/`, `received/`, `reports/`, `transfers/`
- `company-logos` (public, déjà utilisé)
- `carnet-*` (6 buckets) — **NE PAS UTILISER** sans confirmation : ils semblent appartenir à un autre projet
- `certified-invoices-scans`, `coupon-tickets` — réservés à FACTURATION

---

## 13. ROADMAP DE LIVRAISON

| Sprint | Durée | Périmètre | Priorité |
|---|---|---|---|
| Sprint 0 | 1 sem | Stabilisation éditeur + dashboard + selector entreprise | P0 |
| Sprint 1 | 3 sem | Comptes bancaires, import, rapprochement, virements, chèques | P1 |
| Sprint 2 | 3 sem | Factures reçues, OCR, IFU/DGI, conformité, paiements, créances, relances | P1 |
| Sprint 3 | 2 sem | Budgets + trésorerie prévisionnelle + scénarios | P1 |
| Sprint 4 | 2 sem | Immobilisations, emprunts, investissements | P2 |
| Sprint 5 | 2 sem | Petite caisse, wallets mobiles, workflows approbation | P2 |
| Sprint 6 | 2 sem | Reporting standards + query builder + exports | P2 |
| Sprint 7 | 2 sem | IA avancée + NL→SQL | P2 |
| Sprint 8 | 1 sem | Notifications + aide + tickets + personnalisation | P3 |
| Sprint 9 | 2 sem | 2FA + RGPD + monitoring + KPI users | P3 |
| Sprint 10 | 1 sem | Retenues/TVA déclaratives + multi-langue | P3 |
| **TOTAL** | **~21 semaines** | **Couverture 100% du cahier des charges** | |

---

## 14. CHECKLIST FINALE DE COUVERTURE

| Cahier des charges § | Module | Sprint | Statut prévu |
|---|---|---|---|
| 2.1 Comptes bancaires | EPIC 1 | S1 | ✅ |
| 2.1 Factures émises | EPIC du PRD existant + S0 | S0 | ✅ |
| 2.1 Factures reçues + OCR + IFU + conformité | EPIC 2 | S2 | ✅ |
| 2.1 Relances & créances | EPIC 3 | S2 | ✅ |
| 2.1 Budgets | EPIC 4 | S3 | ✅ |
| 2.1 Trésorerie prévisionnelle + scénarios | EPIC 5 | S3 | ✅ |
| 2.1 Reporting + dashboards | EPIC 11-12 | S6 | ✅ |
| 2.2 Analyse prédictive | EPIC 14 | S7 | ✅ |
| 2.2 Assistant IA | Existant + S7 | déjà / S7 | ✅ |
| 2.2 Immobilisations | EPIC 6 | S4 | ✅ |
| 2.2 Emprunts | EPIC 7 | S4 | ✅ |
| 2.2 Investissements | EPIC 8 | S4 | ✅ |
| 2.2 Intégration fiscale | EPIC 22 | S10 | ✅ |
| 2.2 Petite caisse + approbations | EPIC 9 | S5 | ✅ |
| 2.2 Wallets mobiles | EPIC 10 | S5 | ✅ |
| 2.2 Demandes IA langage naturel | EPIC 15 | S7 | ✅ |
| 2.3 Utilisateurs / rôles | Existant | déjà | ✅ |
| 2.3 Multi-entreprise | Existant + S0 | déjà / S0 | ✅ |
| 2.3 Personnalisation thèmes | EPIC 18 | S8 | ✅ |
| 2.3 Aide / doc / tickets | EPIC 17 | S8 | ✅ |
| 4 UI/UX responsive | Tous sprints | continu | ✅ |
| 4 Sélecteur entreprise / search / notifs | S0 + EPIC 16 | S0 / S8 | ✅ |
| 5 Sécurité (2FA, chiffrement, RGPD) | EPIC 19-20 | S9 | ✅ |
| 5 Tracking opérations | EPIC 21 | S9 | ✅ |

---

*Document généré le 23 mai 2026 — Plan ancré sur l'inventaire réel : 25 tables InsForge, 10 Edge Functions, 10 buckets, RLS multi-tenant, audit log immuable, RBAC 9 rôles + 18 permissions.*
