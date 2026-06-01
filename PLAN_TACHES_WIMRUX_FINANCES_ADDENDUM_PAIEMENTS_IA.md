# ADDENDUM AU PLAN DE TÂCHES — WIMRUX® FINANCES
## Collecte universelle des preuves de paiement, rapprochements multi-formats, périmètre CEDEAO/UEMOA et configuration IA (BYOK + plateforme)

**Date : 23 mai 2026**
**Document à intégrer aux Sprints 1, 2, 5 et 7 du plan principal**
**Destiné aux agents codeurs (Claude / GPT / Gemini)**

---

## 0. CONTEXTE COMPLÉMENTAIRE

Ce document **complète et précise** trois aspects sous-spécifiés du plan principal :

1. **EPIC 24 — Collecte universelle des preuves de paiement** : tous les portefeuilles d'entreprise (banques, cartes débit/crédit, wallets mobiles, agrégateurs API) doivent pouvoir alimenter le rapprochement, par **n'importe quel canal d'entrée** (API, capture d'écran, copier-coller texte, PDF, XLS, CSV, photo).
2. **EPIC 25 — Périmètre géographique CEDEAO / UEMOA** : couverture des opérateurs et standards bancaires des 15 pays de la CEDEAO (dont les 8 de l'UEMOA) au lancement.
3. **EPIC 26 — Configuration IA hybride** : BYOK (Bring Your Own Key) + quota plateforme par abonnement + intégration Stirling AI, Dify, et tout fournisseur IA futur (architecture extensible).

**Ces EPICs sont à insérer dans :**
- Sprint 1 (Banque) → EPIC 24 partie API et imports bancaires
- Sprint 2 (Factures reçues) → EPIC 24 partie OCR justificatifs paiement
- Sprint 5 (Wallets mobiles) → EPIC 24 partie Mobile Money + EPIC 25
- Sprint 7 (IA) → EPIC 26 entièrement

---

## 1. EPIC 24 — COLLECTE UNIVERSELLE DES PREUVES DE PAIEMENT

### 1.1 Principe directeur

Tout instrument de paiement de l'entreprise — **quel qu'il soit, quel que soit le pays** — doit pouvoir :

1. Être enregistré comme **portefeuille** (wallet structuré)
2. Recevoir des **transactions** alimentées par **n'importe quel canal d'entrée**
3. Être **rapproché** avec les factures émises ou reçues
4. Conserver une **preuve de paiement** vérifiable et stockée

### 1.2 Modèle de données unifié — `payment_wallets`

**Migration SQL** (remplace et étend `bank_accounts` + `mobile_wallets` du plan principal) :

```sql
-- 1. Référentiel des fournisseurs de paiement (CEDEAO/UEMOA)
CREATE TABLE payment_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) UNIQUE NOT NULL,
  name varchar(100) NOT NULL,
  type varchar(30) NOT NULL CHECK (type IN (
    'bank',                  -- Banque traditionnelle
    'mobile_money',          -- Orange Money, MTN MoMo, Wave, etc.
    'mobile_wallet_local',   -- SankMoney, CorisMoney, etc.
    'card_issuer',           -- Visa, Mastercard, GIM-UEMOA, etc.
    'card_acquirer',         -- Banque acquéreur cartes
    'payment_aggregator',    -- CinetPay, InTouch, PayDunya, FedaPay, etc.
    'fintech',               -- Néo-banque, paiement P2P
    'crypto',                -- Crypto-paiements (future)
    'other'
  )),
  country_codes text[] NOT NULL DEFAULT '{}',  -- ISO 3166-1 alpha-3 ['BFA','CIV','SEN'...]
  region varchar(20),                          -- 'UEMOA', 'CEDEAO', 'CEMAC', etc.
  has_official_api boolean DEFAULT false,
  api_doc_url text,
  supports_pull boolean DEFAULT false,         -- API pull transactions
  supports_push boolean DEFAULT false,         -- Webhook push paiements
  supports_send_payment boolean DEFAULT false, -- Init paiement sortant
  supports_balance_query boolean DEFAULT false,
  statement_formats text[] DEFAULT '{}',       -- ['PDF','XLSX','CSV','SMS','OFX']
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. Portefeuilles unifiés de l'entreprise
CREATE TABLE payment_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES payment_providers(id),
  category varchar(30) NOT NULL CHECK (category IN (
    'bank_account',
    'credit_card',
    'debit_card',
    'mobile_money_account',
    'local_wallet',
    'aggregator_account',
    'cash_register',
    'petty_cash'
  )),
  display_name varchar(255) NOT NULL,
  identifier varchar(100),                     -- N° compte, N° téléphone, masque PAN (****1234)
  identifier_masked varchar(50),               -- Affichage public (****1234)
  identifier_hash text,                        -- SHA-256 pour recherche déduplication
  account_holder varchar(255),
  currency varchar(3) NOT NULL DEFAULT 'XOF',
  country_code varchar(3),                     -- ISO alpha-3
  current_balance numeric DEFAULT 0,
  available_balance numeric,
  credit_limit numeric,                        -- Pour cartes crédit
  issuing_bank_id uuid REFERENCES payment_providers(id),  -- Banque émettrice carte
  parent_wallet_id uuid REFERENCES payment_wallets(id),   -- Carte rattachée à un compte bancaire
  -- Connexion API (si supportée)
  connection_mode varchar(20) DEFAULT 'manual' CHECK (connection_mode IN (
    'manual', 'api_polling', 'api_webhook', 'screen_scrape', 'sms_parsing'
  )),
  api_credentials_encrypted text,              -- AES-256 via Edge Function crypto-aes256
  webhook_secret_hash text,
  last_sync_at timestamptz,
  sync_frequency_minutes integer DEFAULT 60,
  sync_status varchar(20) DEFAULT 'idle',
  -- Trésorerie liée
  treasury_account_id uuid REFERENCES treasury_accounts(id),
  -- Métadonnées
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, identifier_hash)
);

CREATE INDEX idx_payment_wallets_company ON payment_wallets(company_id);
CREATE INDEX idx_payment_wallets_provider ON payment_wallets(provider_id);
CREATE INDEX idx_payment_wallets_category ON payment_wallets(category);
CREATE INDEX idx_payment_wallets_country ON payment_wallets(country_code);
```

**RLS standard** : company isolation + project_admin (cf. convention plan principal)
**Trigger audit** : `trg_audit_payment_wallets`

### 1.3 Modèle unifié des transactions

```sql
CREATE TABLE wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES payment_wallets(id) ON DELETE CASCADE,
  -- Identifiants externes
  external_transaction_id varchar(255),         -- ID provider (anti-doublon)
  external_reference varchar(255),
  -- Nature
  direction varchar(10) NOT NULL CHECK (direction IN ('credit','debit')),
  operation_type varchar(30) NOT NULL CHECK (operation_type IN (
    'deposit','withdrawal','transfer_in','transfer_out',
    'payment_sent','payment_received','refund_in','refund_out',
    'fee','interest','tax','adjustment','reversal','other'
  )),
  amount numeric NOT NULL,
  fees numeric DEFAULT 0,
  currency varchar(3) NOT NULL,
  -- Contrepartie
  counterparty_name varchar(255),
  counterparty_identifier varchar(100),
  counterparty_wallet_type varchar(30),
  counterparty_country varchar(3),
  -- Dates
  transaction_date timestamptz NOT NULL,
  value_date date,
  -- Description et métadonnées brutes
  label text NOT NULL,
  description text,
  raw_payload jsonb,                            -- Payload original (API, parsing, OCR)
  -- Source d'ingestion
  source_channel varchar(30) NOT NULL CHECK (source_channel IN (
    'api_pull','api_webhook','sms_parse','email_parse',
    'pdf_import','csv_import','xlsx_import','ofx_import','qif_import',
    'image_ocr','screenshot_paste','text_paste','manual_entry','bulk_import'
  )),
  source_evidence_id uuid,                      -- FK → payment_evidences (preuve)
  ingestion_batch_id uuid,
  -- Confiance (pour OCR / parsing)
  confidence_score numeric CHECK (confidence_score >= 0 AND confidence_score <= 1),
  needs_human_review boolean DEFAULT false,
  -- Rapprochement
  reconciliation_status varchar(20) NOT NULL DEFAULT 'unreconciled' CHECK (reconciliation_status IN (
    'unreconciled','auto_matched','manual_matched','rule_matched','ignored','disputed'
  )),
  matched_invoice_id uuid REFERENCES invoices(id),
  matched_invoice_payment_id uuid,              -- FK → invoice_payments
  matched_treasury_movement_id uuid REFERENCES treasury_movements(id),
  category_id uuid REFERENCES transaction_categories(id),
  -- Hash de déduplication
  dedup_hash text NOT NULL,                     -- SHA-256(wallet_id, date, amount, direction, label_normalized)
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(wallet_id, dedup_hash)
);

CREATE INDEX idx_wallet_tx_company ON wallet_transactions(company_id);
CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_date ON wallet_transactions(transaction_date DESC);
CREATE INDEX idx_wallet_tx_recon ON wallet_transactions(reconciliation_status);
CREATE INDEX idx_wallet_tx_external ON wallet_transactions(external_transaction_id);
```

### 1.4 Table dédiée aux preuves de paiement

```sql
CREATE TABLE payment_evidences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  wallet_id uuid REFERENCES payment_wallets(id),
  evidence_type varchar(30) NOT NULL CHECK (evidence_type IN (
    'sms_screenshot',        -- Capture d'écran SMS confirmation
    'mobile_app_screenshot', -- Capture app banque/wallet
    'pdf_receipt',           -- Reçu PDF
    'pdf_statement',         -- Relevé PDF
    'csv_export',
    'xlsx_export',
    'ofx_export',
    'pasted_text',           -- Texte collé manuellement
    'pasted_image',          -- Image collée presse-papier
    'email_forward',         -- Email transféré
    'api_response',          -- Capture réponse API brute
    'manual_note',
    'other'
  )),
  file_url text,
  file_mime_type varchar(50),
  file_size_bytes bigint,
  pasted_content text,                          -- Si copier-coller texte
  ocr_text text,                                -- Texte extrait
  ocr_confidence numeric,
  ai_extracted_data jsonb,                      -- Données structurées extraites
  ai_model_used varchar(100),
  ai_task_id uuid REFERENCES ai_usage_logs(id),
  processing_status varchar(20) DEFAULT 'pending' CHECK (processing_status IN (
    'pending','processing','extracted','validated','rejected','error'
  )),
  processing_error text,
  uploaded_by varchar(255),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_evidences_company ON payment_evidences(company_id);
CREATE INDEX idx_evidences_wallet ON payment_evidences(wallet_id);
CREATE INDEX idx_evidences_status ON payment_evidences(processing_status);
```

**Bucket Storage à créer** : `payment-evidences` (privé, accès via URL signée)

### 1.5 Canaux d'ingestion — Edge Functions

Chaque canal possède sa propre Edge Function spécialisée mais **toutes alimentent la même table `wallet_transactions`** via un pipeline commun.

#### T24.1 — Pipeline d'ingestion unifié

**Edge Function `ingest-payment`** (orchestrateur central)
- Input : `{ wallet_id, source_channel, payload, evidence_id? }`
- Étapes :
  1. Validation et résolution du wallet
  2. Calcul `dedup_hash`
  3. Vérification doublons via `(wallet_id, dedup_hash)` UNIQUE
  4. Insertion `wallet_transactions`
  5. Déclenchement règles de rapprochement automatique
  6. Mise à jour `payment_wallets.current_balance`
  7. Si `confidence_score < 0.85` → `needs_human_review = true`
- Output : `{ transaction_id, duplicate, needs_review, suggested_matches[] }`

#### T24.2 — Canal API (pull / webhook)

**Edge Functions à créer (une par famille de provider)** :
- `ingest-api-cinetpay` — webhook + polling
- `ingest-api-intouch` — webhook + polling
- `ingest-api-paydunya` — webhook
- `ingest-api-fedapay` — webhook
- `ingest-api-orange-money` — pull (où API disponible)
- `ingest-api-wave` — webhook
- `ingest-api-mtn-momo` — pull (Open API MTN MoMo)
- `ingest-api-generic-bank` — Open Banking si disponible (rare en CEDEAO)

**Convention** : chaque function suit le contrat :
```ts
interface IngestApiPayload {
  wallet_id: string;
  raw_event: unknown;
  signature?: string;
}
interface IngestApiResult {
  transaction_id: string | null;
  status: 'ingested' | 'duplicate' | 'error';
  error?: string;
}
```

**CRON polling** : `cron-poll-wallets` (toutes les 15 min) → boucle sur `payment_wallets` avec `connection_mode = 'api_polling'` et appelle le provider correspondant.

#### T24.3 — Canal SMS (parsing automatique)

**Edge Function `ingest-sms`** :
- Input : `{ wallet_id, sms_body, sender, received_at }`
- Approche : librairie de **patterns regex par opérateur et par pays** (table à créer)

```sql
CREATE TABLE sms_parsing_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES payment_providers(id),
  country_code varchar(3),
  language varchar(5) DEFAULT 'fr',
  sender_pattern varchar(100),
  template_name varchar(100) NOT NULL,
  regex_pattern text NOT NULL,
  field_mappings jsonb NOT NULL,                -- {amount: '$1', counterparty: '$2', ...}
  operation_type varchar(30),
  priority integer DEFAULT 100,
  is_active boolean DEFAULT true,
  examples text[],
  created_at timestamptz DEFAULT now()
);
```

**Fallback IA** : si aucun pattern ne matche, appel IA (`task = 'sms_parsing'`) avec prompt structuré.

**Source des SMS** : application mobile compagnon (à prévoir en V2) ou import manuel via copier-coller dans l'UI.

#### T24.4 — Canal copier-coller (texte ou image)

**Composant Vue `<PaymentEvidencePasteZone>`** :
- Zone de drop + écoute événement `paste`
- Détecte automatiquement le type : texte brut, image PNG/JPG, fichier
- Pour image : upload dans `payment-evidences`, déclenche OCR
- Pour texte : envoie à `ingest-text-payment`

**Edge Function `ingest-text-payment`** :
- Input : `{ wallet_id, pasted_text }`
- Pipeline :
  1. Tentative match patterns SMS (table `sms_parsing_patterns`)
  2. Fallback IA `task = 'text_payment_extraction'`
  3. Extraction structurée JSON : `{ amount, currency, counterparty, date, reference, fees }`
  4. Création `payment_evidences` (type `pasted_text`)
  5. Appel `ingest-payment` avec les données extraites

#### T24.5 — Canal OCR (image, capture d'écran, photo)

**Edge Function `ingest-image-payment`** (réutilise pipeline `ocr-supplier-invoice` du plan principal) :
- Input : `{ wallet_id, file_base64 }` OU `{ wallet_id, file_url }`
- Prompt vision spécialisé "preuves de paiement mobile/banque" :
  ```
  Tu es un assistant qui extrait les informations d'une preuve de paiement.
  Renvoie un JSON avec : amount, currency, transaction_date (ISO 8601),
  counterparty_name, counterparty_phone_or_account, operation_type
  (deposit/withdrawal/payment_sent/payment_received/transfer),
  external_reference, fees, balance_after, provider_detected.
  Marque les champs incertains avec confidence < 0.7.
  ```
- Détection automatique du provider (logo, en-tête, format)
- Si confiance globale < 0.85 → review humaine

#### T24.6 — Canal fichiers (PDF / CSV / XLSX / OFX / QIF)

**Edge Function `ingest-statement-file`** :
- Input : `{ wallet_id, file_url, file_format }`
- Détection format si non précisé
- Parsing :
  - **PDF natif** : `pdf-parse` Deno → texte → patterns par banque/opérateur
  - **PDF scanné** : fallback OCR (claude-sonnet-4.5 vision)
  - **CSV / XLSX** : mapping interactif par l'utilisateur (sauvegardé dans `file_mapping_templates`)
  - **OFX** : parser XML standard
  - **QIF** : parser ligne à ligne
- Insertion en batch
- Création `payment_evidences` (type correspondant)

```sql
CREATE TABLE file_mapping_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES payment_providers(id),
  file_format varchar(10) NOT NULL,
  template_name varchar(100) NOT NULL,
  column_mappings jsonb NOT NULL,
  date_format varchar(30) DEFAULT 'YYYY-MM-DD',
  decimal_separator varchar(1) DEFAULT '.',
  thousand_separator varchar(1) DEFAULT ',',
  skip_header_rows integer DEFAULT 1,
  is_shared boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

#### T24.7 — Canal email (transfert)

**Edge Function `ingest-email-payment`** (V2, optionnel sprint 1) :
- Endpoint email-to-API (ex : `paiements+<company_hash>@wimrux.com`)
- Parse pièces jointes + corps email
- Route vers `ingest-image-payment`, `ingest-statement-file` ou `ingest-text-payment` selon contenu

### 1.6 Rapprochement universel

Le module de rapprochement du plan principal (T1.4) est étendu pour couvrir **tous les types de wallets** :

**Composable `useUniversalReconciliation.ts`** :
- Source : `wallet_transactions` (au lieu de `bank_transactions` uniquement)
- Cibles de match : `invoices` (émises et reçues), `invoice_payments`, `treasury_movements`, dépenses récurrentes
- Règles ordonnées :
  1. Match exact par `external_reference` ↔ `invoices.reference`
  2. Match par montant + date ±5 jours + nom contrepartie (fuzzy)
  3. Match par `counterparty_identifier` connu (table `known_counterparties`)
  4. Match par règles utilisateur (table `reconciliation_rules` étendue avec `wallet_provider_id`)
  5. Suggestion IA (`task = 'reconciliation_suggestion'`)

```sql
CREATE TABLE known_counterparties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  identifier_normalized varchar(100) NOT NULL,
  display_name varchar(255),
  client_id uuid REFERENCES clients(id),
  supplier_id uuid REFERENCES suppliers(id),
  default_category_id uuid REFERENCES transaction_categories(id),
  occurrence_count integer DEFAULT 1,
  last_seen_at timestamptz DEFAULT now(),
  UNIQUE(company_id, identifier_normalized)
);
```

**UI dédiée** : `/reconciliation` (vue unifiée tous wallets) + drilldown par wallet.

### 1.7 Tâches détaillées EPIC 24

| ID | Tâche | Durée | Sprint |
|---|---|---|---|
| T24.1 | Edge Function `ingest-payment` (orchestrateur) | 3j | S1 |
| T24.2 | Edge Functions API providers (10 providers prioritaires) | 8j | S1-S2 |
| T24.3 | Edge Function `ingest-sms` + table patterns + seeds | 4j | S5 |
| T24.4 | Composant `<PaymentEvidencePasteZone>` + `ingest-text-payment` | 3j | S2 |
| T24.5 | Edge Function `ingest-image-payment` + UI capture | 3j | S2 |
| T24.6 | Edge Function `ingest-statement-file` (5 formats) | 5j | S1 |
| T24.7 | Edge Function `ingest-email-payment` (V2) | 3j | S5 |
| T24.8 | Composable `useUniversalReconciliation` + UI `/reconciliation` | 5j | S2 |
| T24.9 | Page `/wallets` (CRUD payment_wallets) | 3j | S1 |
| T24.10 | Page `/wallets/:id/transactions` avec filtres et exports | 2j | S1 |
| T24.11 | Page `/wallets/:id/sync-settings` (config API, polling, webhook) | 2j | S2 |
| T24.12 | Seeds `payment_providers` (CEDEAO/UEMOA, voir EPIC 25) | 2j | S5 |
| T24.13 | Tests unitaires pipeline + Tests E2E par canal | 4j | S2 |

### 1.8 Critères d'acceptation EPIC 24

- [ ] Tout type de portefeuille peut être créé (banque, carte débit/crédit, mobile money, wallet local, agrégateur, caisse)
- [ ] Aucune transaction insérée 2 fois (contrainte UNIQUE + `dedup_hash`)
- [ ] 6 canaux d'entrée fonctionnels : API, SMS, texte collé, image collée/uploadée, fichier (PDF/CSV/XLSX/OFX/QIF), saisie manuelle
- [ ] Toute transaction tracée à sa preuve via `source_evidence_id`
- [ ] Rapprochement automatique fonctionnel cross-wallets
- [ ] Solde wallet recalculé automatiquement après chaque insertion
- [ ] Niveau de confiance affiché pour OCR/parsing IA
- [ ] Workflow de revue humaine pour transactions `needs_human_review = true`

---

## 2. EPIC 25 — PÉRIMÈTRE CEDEAO / UEMOA AU LANCEMENT

### 2.1 Pays cibles

| Région | Pays | Code ISO | Devise |
|---|---|---|---|
| UEMOA | Bénin | BEN | XOF |
| UEMOA | Burkina Faso | BFA | XOF |
| UEMOA | Côte d'Ivoire | CIV | XOF |
| UEMOA | Guinée-Bissau | GNB | XOF |
| UEMOA | Mali | MLI | XOF |
| UEMOA | Niger | NER | XOF |
| UEMOA | Sénégal | SEN | XOF |
| UEMOA | Togo | TGO | XOF |
| CEDEAO (hors UEMOA) | Cap-Vert | CPV | CVE |
| CEDEAO | Gambie | GMB | GMD |
| CEDEAO | Ghana | GHA | GHS |
| CEDEAO | Guinée | GIN | GNF |
| CEDEAO | Libéria | LBR | LRD |
| CEDEAO | Nigéria | NGA | NGN |
| CEDEAO | Sierra Leone | SLE | SLL/SLE |

### 2.2 Seeds des fournisseurs de paiement (référentiel `payment_providers`)

#### Mobile Money et wallets locaux par pays

**Burkina Faso (BFA)** : Orange Money BF, Moov Money BF, SankMoney, CorisMoney, Wave (présent)
**Côte d'Ivoire (CIV)** : Orange Money CI, MTN MoMo CI, Moov Money CI, Wave CI, Push CI
**Sénégal (SEN)** : Orange Money SN, Free Money, Wave SN, Wizall, E-Money, YUP
**Mali (MLI)** : Orange Money ML, Moov Money ML, Sama Money, Wari
**Niger (NER)** : Orange Money NE, Moov Money NE, Airtel Money NE
**Bénin (BEN)** : MTN MoMo BJ, Moov Money BJ, Celtiis Cash
**Togo (TGO)** : T-Money (Moov), Mixx by Yas (Togocom), Flooz
**Guinée-Bissau (GNB)** : Orange Money GW, MTN MoMo GW
**Ghana (GHA)** : MTN MoMo GH, Vodafone Cash, AirtelTigo Money, G-Money
**Nigéria (NGA)** : OPay, PalmPay, Kuda, Moniepoint, Paga, Carbon
**Sierra Leone (SLE)** : Orange Money SL, AfriMoney
**Liberia (LBR)** : Orange Money LR, MTN MoMo LR
**Guinée (GIN)** : Orange Money GN, MTN MoMo GN
**Cap-Vert (CPV)** : Vinti4, M-Kesh
**Gambie (GMB)** : Africell Money, QMoney

#### Agrégateurs de paiement régionaux

CinetPay, InTouch, PayDunya, FedaPay, HUB2, Bizao, Semoa, Touch Pay, PaySika, Djamo (CIV), Wave Business

#### Banques majeures (réseau UEMOA/CEDEAO)

Ecobank, UBA, Bank of Africa (BOA), Société Générale, Coris Bank, Orabank, BSIC, BICIA-B, Atlantique Bank, NSIA Banque, Stanbic, GTBank, Zenith Bank, Access Bank

#### Cartes

Visa, Mastercard, GIM-UEMOA (carte interbancaire UEMOA), American Express

### 2.3 Tâches EPIC 25

| ID | Tâche | Durée |
|---|---|---|
| T25.1 | Script SQL de seed `payment_providers` (~80 providers initiaux) | 2j |
| T25.2 | Logos providers (collecte + upload bucket `payment-evidences/providers/`) | 2j |
| T25.3 | Patterns SMS pré-renseignés pour 20 opérateurs prioritaires | 5j |
| T25.4 | Templates de mapping CSV/XLSX pour 10 banques prioritaires | 4j |
| T25.5 | Page `/admin/providers` (admin plateforme uniquement) pour gestion référentiel | 2j |
| T25.6 | Sélecteur géographique dans création wallet (filtré par `country_codes`) | 1j |
| T25.7 | Support multi-devise + table de change `currency_rates` (avec API BCEAO ou fixer.io) | 3j |

```sql
CREATE TABLE currency_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency varchar(3) NOT NULL,
  quote_currency varchar(3) NOT NULL,
  rate numeric NOT NULL,
  rate_date date NOT NULL,
  source varchar(50),
  UNIQUE(base_currency, quote_currency, rate_date)
);
```

### 2.4 Critères d'acceptation EPIC 25

- [ ] Au moins 80 providers seedés couvrant les 15 pays CEDEAO
- [ ] Filtrage automatique par pays de l'entreprise à la création d'un wallet
- [ ] Support multi-devise avec conversion automatique pour reporting consolidé
- [ ] Templates de mapping CSV prêts pour les 10 banques les plus utilisées
- [ ] Tests de bout en bout avec au moins un wallet de chaque type majeur

---

## 3. EPIC 26 — CONFIGURATION IA HYBRIDE (BYOK + PLATEFORME + ORCHESTRATION)

### 3.1 Principe directeur

Trois modes coexistent et sont configurables par entreprise :

1. **Mode plateforme (par défaut, inclus dans l'abonnement)**
   - Quota mensuel d'appels IA selon le plan (Starter / Pro / Enterprise)
   - Clé OpenRouter partagée WIMRUX (déjà existante via `companies.openrouter_api_key` qui sera renommé en clé interne plateforme)
   - Modèles présélectionnés et optimisés (claude-sonnet-4.5, gpt-4o-mini, etc.)

2. **Mode BYOK (Bring Your Own Key)**
   - L'entreprise fournit sa propre clé : OpenRouter, OpenAI, Anthropic, Mistral, Google, Stirling AI, Dify, etc.
   - Aucune consommation du quota plateforme
   - Routage par tâche IA configurable

3. **Mode hybride**
   - Tâches critiques sur BYOK (qualité / souveraineté)
   - Tâches secondaires sur plateforme (économie quota)
   - Fallback automatique en cas d'erreur

### 3.2 Schéma de données

```sql
-- 1. Catalogue des fournisseurs IA supportés
CREATE TABLE ai_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) UNIQUE NOT NULL,
  name varchar(100) NOT NULL,
  type varchar(30) NOT NULL CHECK (type IN (
    'llm_gateway',      -- OpenRouter, Portkey, etc.
    'llm_direct',       -- OpenAI, Anthropic, Mistral, Google, Cohere
    'workflow_engine',  -- Dify, Stirling AI, n8n AI, LangFlow
    'vision',           -- Modèles vision dédiés
    'speech',           -- TTS/STT
    'embedding',
    'custom'
  )),
  api_base_url text NOT NULL,
  auth_method varchar(30) DEFAULT 'bearer' CHECK (auth_method IN ('bearer','api_key_header','basic','oauth2','custom')),
  auth_header_name varchar(50) DEFAULT 'Authorization',
  supports_streaming boolean DEFAULT true,
  supports_vision boolean DEFAULT false,
  supports_tools boolean DEFAULT false,
  supports_json_mode boolean DEFAULT false,
  pricing_model varchar(30),
  doc_url text,
  is_active boolean DEFAULT true,
  is_default_platform boolean DEFAULT false,    -- Marqué providers utilisés par défaut sur plateforme
  created_at timestamptz DEFAULT now()
);

-- Seeds initiales : openrouter, openai, anthropic, mistral, google_ai, cohere, groq,
-- together, fireworks, deepseek, stirling_ai, dify, langflow

-- 2. Modèles disponibles par provider
CREATE TABLE ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES ai_providers(id) ON DELETE CASCADE,
  model_code varchar(200) NOT NULL,             -- 'anthropic/claude-sonnet-4.5', 'gpt-4o', etc.
  display_name varchar(150) NOT NULL,
  context_window integer,
  max_output_tokens integer,
  supports_vision boolean DEFAULT false,
  supports_tools boolean DEFAULT false,
  supports_json_mode boolean DEFAULT false,
  cost_per_million_input_usd numeric,
  cost_per_million_output_usd numeric,
  quality_tier varchar(20) CHECK (quality_tier IN ('low','medium','high','flagship')),
  speed_tier varchar(20) CHECK (speed_tier IN ('slow','medium','fast','ultra')),
  is_active boolean DEFAULT true,
  is_recommended boolean DEFAULT false,
  UNIQUE(provider_id, model_code)
);

-- 3. Clés API des entreprises (BYOK)
CREATE TABLE company_ai_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES ai_providers(id),
  name varchar(100) NOT NULL,
  api_key_encrypted text NOT NULL,              -- AES-256 via crypto-aes256
  api_key_prefix varchar(16),                   -- Pour affichage masqué
  base_url_override text,                       -- Pour Dify self-hosted, Stirling AI on-prem, etc.
  extra_headers jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  is_default_for_provider boolean DEFAULT false,
  last_used_at timestamptz,
  last_verified_at timestamptz,
  verification_status varchar(20) DEFAULT 'unverified',
  created_by varchar(255),
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, provider_id, name)
);

-- 4. Définition des tâches IA système
CREATE TABLE ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(50) UNIQUE NOT NULL,             -- 'assistant_fiscal', 'ocr_supplier_invoice', etc.
  name varchar(150) NOT NULL,
  description text,
  category varchar(30),                         -- 'extraction','classification','generation','analysis','workflow'
  default_quality_tier varchar(20) DEFAULT 'medium',
  default_needs_vision boolean DEFAULT false,
  default_needs_tools boolean DEFAULT false,
  default_needs_json_mode boolean DEFAULT false,
  default_system_prompt text,
  estimated_input_tokens integer DEFAULT 1000,
  estimated_output_tokens integer DEFAULT 500,
  is_workflow_capable boolean DEFAULT false,    -- Compatible Dify / workflow engine
  is_active boolean DEFAULT true
);

-- Seeds : 'assistant_fiscal', 'suggestion_fiscale', 'classification_depense',
-- 'detection_anomalie', 'ocr_supplier_invoice', 'ingest_image_payment',
-- 'text_payment_extraction', 'sms_parsing', 'reconciliation_suggestion',
-- 'cashflow_forecast', 'nl_to_sql', 'document_summarization', ...

-- 5. Routage IA par tâche et par entreprise
CREATE TABLE company_ai_task_routing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES ai_tasks(id),
  -- Choix du mode
  mode varchar(20) NOT NULL DEFAULT 'platform' CHECK (mode IN ('platform','byok','hybrid','workflow')),
  -- Provider principal
  primary_credential_id uuid REFERENCES company_ai_credentials(id),
  primary_model_id uuid REFERENCES ai_models(id),
  -- Fallback
  fallback_credential_id uuid REFERENCES company_ai_credentials(id),
  fallback_model_id uuid REFERENCES ai_models(id),
  -- Workflow externe (Dify, Stirling AI...)
  workflow_provider_id uuid REFERENCES ai_providers(id),
  workflow_credential_id uuid REFERENCES company_ai_credentials(id),
  workflow_id text,                              -- ID du workflow chez le provider
  workflow_api_endpoint text,
  workflow_input_mapping jsonb,                  -- Comment mapper l'input WIMRUX vers l'input du workflow
  workflow_output_mapping jsonb,
  -- Paramètres custom
  custom_system_prompt text,
  temperature numeric DEFAULT 0.3,
  max_tokens integer,
  -- Activation
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(company_id, task_id)
);

-- 6. Quotas par plan d'abonnement
CREATE TABLE subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(30) UNIQUE NOT NULL,             -- 'free','starter','pro','enterprise'
  name varchar(100) NOT NULL,
  monthly_price_usd numeric DEFAULT 0,
  monthly_price_xof numeric DEFAULT 0,
  -- Limites métier
  max_companies integer,
  max_users integer,
  max_invoices_per_month integer,
  max_wallets integer,
  -- Quotas IA
  ai_monthly_tokens_input integer NOT NULL DEFAULT 0,
  ai_monthly_tokens_output integer NOT NULL DEFAULT 0,
  ai_monthly_cost_usd_cap numeric NOT NULL DEFAULT 0,
  ai_allowed_quality_tiers text[] DEFAULT '{low,medium}',
  ai_byok_allowed boolean DEFAULT false,
  ai_workflow_allowed boolean DEFAULT false,    -- Dify/Stirling AI
  features jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true
);

-- 7. Abonnements actifs des entreprises
CREATE TABLE company_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  status varchar(20) DEFAULT 'active' CHECK (status IN ('trial','active','suspended','cancelled','expired')),
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_start date NOT NULL,
  current_period_end date NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  -- Compteurs courants (réinitialisés en début de période)
  current_ai_tokens_input integer DEFAULT 0,
  current_ai_tokens_output integer DEFAULT 0,
  current_ai_cost_usd numeric DEFAULT 0,
  current_invoices_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(company_id, status) WHERE status = 'active'
);
```

### 3.3 Orchestrateur IA — Edge Function `ai-router`

**Edge Function unique** qui reçoit toutes les requêtes IA et applique la configuration.

```ts
// Pseudo-code de l'orchestrateur
interface AiRouterRequest {
  task_code: string;
  input: {
    messages?: Array<{role: string, content: string | unknown}>;
    images?: string[];
    variables?: Record<string, unknown>;
  };
  stream?: boolean;
  override_credential_id?: string;
}

async function aiRouter(req: AiRouterRequest, ctx: { company_id, user_id }) {
  // 1. Charger task + routing
  const task = await getTask(req.task_code);
  const routing = await getTaskRouting(ctx.company_id, task.id);

  // 2. Vérifier quota plateforme si mode != byok
  if (routing.mode !== 'byok') {
    const subscription = await getActiveSubscription(ctx.company_id);
    if (subscription.current_ai_cost_usd >= subscription.plan.ai_monthly_cost_usd_cap) {
      if (routing.mode === 'platform') {
        throw new QuotaExceededError('Quota IA plateforme atteint');
      }
      // hybrid : tenter fallback BYOK
    }
  }

  // 3. Sélection du provider à appeler
  let provider, credential, model, endpoint;
  if (routing.mode === 'workflow' && routing.workflow_id) {
    // Appel Dify / Stirling AI / Langflow
    return invokeWorkflow(routing, req);
  } else {
    credential = routing.mode === 'platform'
      ? getPlatformCredential(task)
      : await getCompanyCredential(routing.primary_credential_id);
    model = await getModel(routing.primary_model_id || task.default_model);
    provider = await getProvider(model.provider_id);
  }

  // 4. Appel LLM (compatible OpenAI API)
  try {
    const result = await callLLM(provider, credential, model, req);
    await logAiUsage(ctx, task, model, credential, result);
    if (routing.mode !== 'byok') await incrementSubscriptionUsage(ctx.company_id, result);
    return result;
  } catch (err) {
    // 5. Fallback si configuré
    if (routing.fallback_credential_id) {
      return retryWithFallback(routing, req);
    }
    throw err;
  }
}
```

**Provider adapters à implémenter** :
- `adapters/openrouter.ts`
- `adapters/openai.ts`
- `adapters/anthropic.ts`
- `adapters/mistral.ts`
- `adapters/google.ts`
- `adapters/groq.ts`
- `adapters/dify.ts` — appel workflow Dify (`/v1/workflows/run` ou `/v1/chat-messages`)
- `adapters/stirling_ai.ts` — endpoint custom configurable
- `adapters/langflow.ts`
- `adapters/generic_openai_compatible.ts` — fallback générique (vLLM, Ollama, etc.)

### 3.4 Workflow Engine (Dify, Stirling AI)

Pour les tâches complexes multi-étapes, l'entreprise peut router vers un workflow externe.

**Mode `workflow`** dans `company_ai_task_routing` :
- `workflow_provider_id` → Dify ou Stirling AI ou autre
- `workflow_id` → identifiant du workflow chez le provider
- `workflow_input_mapping` :
  ```json
  {
    "invoice_text": "$.input.messages[-1].content",
    "company_name": "$.context.company.name",
    "country": "$.context.company.country_code"
  }
  ```
- `workflow_output_mapping` :
  ```json
  {
    "extracted_data": "$.outputs.result",
    "confidence": "$.outputs.confidence_score"
  }
  ```

**Edge Function adapter `invoke-workflow`** :
- Détecte le type de workflow engine
- Sérialise input selon mapping
- Appelle endpoint approprié
- Désérialise output selon mapping
- Trace dans `ai_usage_logs` avec `model = 'workflow:dify:<workflow_id>'`

### 3.5 Pages d'administration IA

#### Page `/settings/ai/providers` (admin entreprise)
- Liste tous les providers disponibles
- Bouton "Ajouter une clé API" → modal de saisie
- Test de la clé (appel léger pour valider)
- Affichage masqué (`api_key_prefix` uniquement)

#### Page `/settings/ai/routing` (admin entreprise)
- Tableau : 1 ligne par tâche IA système
- Pour chaque tâche : mode (plateforme/BYOK/hybride/workflow) + provider + modèle + fallback
- Bouton "Réinitialiser aux défauts plateforme"

#### Page `/settings/ai/workflows` (admin entreprise)
- Configuration des workflows Dify / Stirling AI / Langflow
- Test du workflow avec un échantillon

#### Page `/settings/ai/usage` (admin entreprise)
- Consommation du mois (tokens, USD, % du quota)
- Répartition par tâche, par modèle, par mode
- Graphique évolution 30 jours
- Bouton "Acheter du quota supplémentaire" (V2)

#### Page `/admin/ai-platform` (super-admin WIMRUX)
- Gestion globale des providers
- Modèles activés sur la plateforme
- Plans d'abonnement et leurs quotas

### 3.6 Tâches détaillées EPIC 26

| ID | Tâche | Durée | Sprint |
|---|---|---|---|
| T26.1 | Migration SQL `ai_providers`, `ai_models`, `ai_tasks`, `company_ai_*`, `subscription_plans`, `company_subscriptions` | 2j | S7 |
| T26.2 | Seeds providers IA (13 providers initiaux) | 1j | S7 |
| T26.3 | Seeds modèles (~50 modèles populaires) avec coûts à jour | 1j | S7 |
| T26.4 | Seeds `ai_tasks` (toutes les tâches IA du produit) | 1j | S7 |
| T26.5 | Seeds `subscription_plans` (Free / Starter / Pro / Enterprise) | 0.5j | S7 |
| T26.6 | Edge Function `ai-router` (orchestrateur central) | 5j | S7 |
| T26.7 | Adapters par provider (10 adapters) | 6j | S7 |
| T26.8 | Adapter Dify (workflow) | 2j | S7 |
| T26.9 | Adapter Stirling AI | 2j | S7 |
| T26.10 | Refactor de toutes les Edge Functions existantes pour utiliser `ai-router` | 3j | S7 |
| T26.11 | Page `/settings/ai/providers` (CRUD credentials BYOK + test) | 3j | S7 |
| T26.12 | Page `/settings/ai/routing` (matrice tâches × providers) | 3j | S7 |
| T26.13 | Page `/settings/ai/workflows` (Dify/Stirling AI) | 3j | S7 |
| T26.14 | Page `/settings/ai/usage` (consommation + quotas) | 2j | S7 |
| T26.15 | Trigger d'incrément des compteurs `company_subscriptions` après chaque `ai_usage_logs` INSERT | 1j | S7 |
| T26.16 | Job CRON `reset-monthly-quotas` | 0.5j | S7 |
| T26.17 | Mécanisme d'alerte 80% / 100% du quota (via EPIC 16 Notifications) | 1j | S7 |
| T26.18 | Documentation utilisateur (guide BYOK, guide Dify, guide Stirling AI) | 2j | S7 |
| T26.19 | Tests unitaires + E2E sur orchestrateur et fallback | 3j | S7 |

### 3.7 Critères d'acceptation EPIC 26

- [ ] 3 modes coexistent : plateforme / BYOK / hybride / workflow
- [ ] Au moins 10 providers LLM supportés via adapter
- [ ] Dify et Stirling AI fonctionnent comme workflow engines
- [ ] Toutes les Edge Functions IA passent désormais par `ai-router`
- [ ] Quota plateforme respecté (refus / fallback si dépassement)
- [ ] BYOK ne consomme jamais le quota plateforme
- [ ] Compteurs `company_subscriptions` toujours cohérents avec `ai_usage_logs`
- [ ] Alerte automatique à 80% et 100% du quota mensuel
- [ ] Clés API stockées chiffrées (jamais en clair en DB ni en logs)
- [ ] Test de connexion provider avant sauvegarde
- [ ] Documentation utilisateur fournie

---

## 4. INTÉGRATION DANS LE PLAN PRINCIPAL — MISE À JOUR

### 4.1 Sprints touchés

| Sprint | EPIC ajouté/étendu | Durée additionnelle |
|---|---|---|
| Sprint 1 (Banque) | EPIC 24 partie API + fichiers + UI wallets | +1 semaine |
| Sprint 2 (Factures reçues) | EPIC 24 partie OCR + texte collé + rapprochement universel | +1 semaine |
| Sprint 5 (Wallets mobiles) | EPIC 24 partie SMS + EPIC 25 seeds CEDEAO/UEMOA | +1 semaine |
| Sprint 7 (IA) | EPIC 26 entièrement | +2 semaines |

**Nouvelle durée totale estimée : 25 semaines** (au lieu de 21).

### 4.2 Tables additionnelles totales

15 nouvelles tables venant s'ajouter au plan principal :

1. `payment_providers`
2. `payment_wallets`
3. `wallet_transactions`
4. `payment_evidences`
5. `sms_parsing_patterns`
6. `file_mapping_templates`
7. `known_counterparties`
8. `currency_rates`
9. `ai_providers`
10. `ai_models`
11. `ai_tasks`
12. `company_ai_credentials`
13. `company_ai_task_routing`
14. `subscription_plans`
15. `company_subscriptions`

### 4.3 Edge Functions additionnelles

- `ingest-payment` (orchestrateur)
- `ingest-api-cinetpay`, `ingest-api-intouch`, `ingest-api-paydunya`, `ingest-api-fedapay`, `ingest-api-orange-money`, `ingest-api-wave`, `ingest-api-mtn-momo`, `ingest-api-generic-bank`
- `ingest-sms`
- `ingest-text-payment`
- `ingest-image-payment`
- `ingest-statement-file`
- `ingest-email-payment` (V2)
- `cron-poll-wallets`
- `ai-router` (orchestrateur IA)
- `invoke-workflow`
- `reset-monthly-quotas`

### 4.4 Buckets Storage à créer

- `payment-evidences` (privé, accès par URL signée)

---

## 5. CHECKLIST FINALE ADDENDUM

### Couverture des points soulevés

- [x] Format PDF, CSV, SMS, XLS, OFX, QIF supportés en import
- [x] Capture d'écran (image collée ou uploadée) supportée via OCR
- [x] Texte collé manuellement supporté via parsing patterns + IA
- [x] Preuves de paiement traçables (table dédiée `payment_evidences`)
- [x] Cartes débit + crédit gérées comme wallets dédiés
- [x] Banque émettrice de carte tracée (`payment_wallets.issuing_bank_id`)
- [x] Mobile Money par pays (Orange Money, MTN MoMo, Moov Money, Wave, T-Money, Mixx, Free Money, etc.)
- [x] Wallets locaux pays-spécifiques (SankMoney BF, CorisMoney BF, etc.)
- [x] Agrégateurs API (CinetPay, InTouch, PayDunya, FedaPay, HUB2, Bizao, Semoa, etc.)
- [x] Périmètre CEDEAO/UEMOA — 15 pays, ~80 providers initiaux
- [x] Multi-devise (XOF, XAF, NGN, GHS, etc.) avec conversion
- [x] Connexion avec ou sans API (4 canaux d'ingestion garantis : API, fichier, texte/image, manuel)
- [x] IA BYOK supportée (clés entreprise chiffrées)
- [x] Quota minimum garanti par plan d'abonnement
- [x] Intégration Stirling AI (workflow engine)
- [x] Intégration Dify (workflow engine)
- [x] Architecture extensible pour tout futur provider IA (adapter pattern)
- [x] Routage IA configurable par tâche (admin entreprise)
- [x] Fallback automatique entre providers

---

*Document généré le 23 mai 2026 — Addendum au plan principal de finalisation WIMRUX® Finances. À intégrer dans la planification globale des sprints 1, 2, 5 et 7.*
