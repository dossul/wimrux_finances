# PRD — WIMRUX® FINANCES
**Document de Référence Produit**
**Horodatage de rédaction : 23 mai 2026 — basé sur l'inspection du code source et de la base de données**

---

## 1. Identité du produit

| Champ | Valeur |
|---|---|
| Nom commercial | WIMRUX® FINANCES |
| Type | Application Web SaaS (Single Page Application) |
| Framework | Quasar 2 + Vue 3 (Composition API) + TypeScript |
| Backend | InsForge BaaS (PostgreSQL + PostgREST) — `gfe4bd9y.eu-central.insforge.app` |
| URL de production | https://wimruxapp.vercel.app |
| Hébergement frontend | Vercel |
| Marché cible | Entreprises du Burkina Faso soumises à la réglementation fiscale DGI |

---

## 2. Ce que le produit fait réellement (constaté dans le code)

### 2.1 Gestion de la facturation

L'application gère un cycle de vie complet de factures avec les types suivants, conformes à la nomenclature DGI Burkina Faso :

| Code | Désignation |
|---|---|
| FV | Facture de vente |
| FT | Facture d'acompte |
| FA | Facture d'avoir |
| EV | Facture export vente |
| ET | Facture export acompte |
| EA | Facture export avoir |
| PF | Proforma |

**Cycle de vie des factures (workflow implémenté) :**

```
draft → pending_validation → approved → validated → certified
                  ↓ (rejet)
                draft
```

Chaque transition est tracée (champ `submitted_by`, `approved_by`, `rejected_by`, `validated_at`, `certified_at`).

**Mécanisme anti-fraude :** l'utilisateur qui soumet une facture ne peut pas l'approuver lui-même (vérification `submitted_by !== currentUserId`).

**Proforma :** suit un cycle distinct `draft → pending_validation → approved → sent → accepted/rejected`. Une proforma acceptée peut être convertie automatiquement en FV (copie automatique des lignes).

**Références factures :** générées par la fonction PostgreSQL `next_invoice_reference` (séquence atomique par type/entreprise/année). Format : `FV-2026-00001`.

### 2.2 Calcul fiscal BF (implémenté)

Le moteur fiscal est entièrement implémenté dans `useTaxCalculation.ts` :

- **16 groupes de taxation A à P** selon la nomenclature SECeF BF ST 1.0 :
  - Groupe A : exonéré (TVA 0%, PSVB 2%)
  - Groupe B : TVA 18%, PSVB 2%
  - Groupe C : TVA 10%, PSVB 2%
  - Groupes D-P : régimes dérogatoires, exportation, tourisme, etc.
- **Arrondi fiscal** : 2 décimales, règle ≥ 0.005 → arrondi supérieur
- **Timbre quittance** (stamp duty) : calculé par tranches configurables
- **PSVB** (Prélèvement Spécial sur les Ventes de Boissons) : activable/désactivable
- **Modes de prix** : HT ou TTC (avec conversion automatique)
- **Types de clients** : CC (comptant), PM (personne morale), PP (personne physique), PC (public/État)
- **Types d'articles** : LOCBIE (biens locaux), LOCSER (services locaux), IMPBIE (biens importés), IMPSER (services importés)

### 2.3 RBAC — Contrôle d'accès granulaire

Système de rôles et permissions entièrement implémenté dans `usePermissions.ts` et `types/index.ts`.

**Rôles système (9 rôles)** :

| Rôle | Profil |
|---|---|
| `admin` | Toutes les permissions |
| `superviseur` | Lecture + approbation + validation + rapports |
| `comptable` | Création + soumission + trésorerie + rapports |
| `tresorier` | Trésorerie + rapports (lecture factures) |
| `caissier` | Création + soumission de factures |
| `manager` | Lecture seule (factures, clients, trésorerie, rapports) |
| `auditeur` | Lecture + journal d'audit + IA |
| `controleur` | Lecture étendue + audit |
| `consultant` | Lecture minimale |
| `project_admin` | Bypass total (toutes permissions) |

**18 permissions granulaires** :
`dashboard.view`, `invoices.create`, `invoices.read`, `invoices.submit`, `invoices.approve`, `invoices.validate`, `clients.create`, `clients.read`, `clients.update`, `clients.delete`, `treasury.read`, `treasury.create`, `treasury.update`, `reports.read`, `audit.read`, `ai.use`, `settings.manage`, `users.manage`

**Multi-rôle (fusion) :** un utilisateur peut avoir plusieurs rôles simultanément (rôle primaire + assignations supplémentaires avec date d'expiration). Les permissions sont l'union de tous les rôles actifs.

**Overrides par entreprise :** chaque entreprise peut personnaliser les permissions de chaque rôle via la table `company_role_permissions` (grant/revoke par permission, avec expiration).

**Rôles personnalisés :** création de rôles métier sur mesure via `company_custom_roles`.

### 2.4 Gestion des clients

Tables : `clients` — types CC, PM, PP, PC. Champs : nom, IFU, RCCM, adresse cadastrale, téléphone, email.

### 2.5 Trésorerie

Module de suivi des flux financiers. Tables : `treasury_accounts` (banque, caisse, mobile money) et `treasury_movements` (crédit/débit). Modes de paiement : espèces, chèques, mobile money, carte bancaire, virement, crédit, autre.

### 2.6 Génération de PDF

Moteur PDF implémenté dans `useInvoicePdf.ts` (bibliothèques : jsPDF + jspdf-autotable + qrcode) :
- Mise en page conforme DGI BF (SFE §2.22-2.26)
- QR code intégré (pour factures certifiées)
- Personnalisation des couleurs par entreprise (8 couleurs configurables : fond entête, texte, lignes paires/impaires, totaux)
- Logo entreprise (gauche/centre/droite)
- Tous types de factures pris en charge
- Montant en lettres (français)
- Stockage PDF via InsForge Storage (bucket `company-logos`)

### 2.7 Assistant IA — 6 modes de tâche

Implémenté dans `useAiAssistant.ts` via OpenRouter. **6 modes distincts** :

| Mode | Modèle principal | Description |
|---|---|---|
| `assistant_fiscal` | claude-sonnet-4.5 | Questions fiscales BF, TVA, PSVB, DGI |
| `analyse_facture` | gpt-4o-mini | Détection d'erreurs dans les factures |
| `resume_rapport` | gpt-4o-mini | Résumé exécutif de rapports financiers |
| `suggestion_fiscale` | gpt-4o-mini | Optimisation fiscale et alertes |
| `classification_depense` | gpt-4o-mini | Classification OHADA des dépenses |
| `detection_anomalie` | gpt-4o-mini | Détection de doublons et patterns suspects |

Chaque tâche a un modèle principal et un modèle de fallback configurables par entreprise. La clé OpenRouter est stockée chiffrée (`openrouter_api_key` dans `companies`).

Tracking de l'utilisation IA : table `ai_usage_logs` (tokens input/output, coût USD, latence, statut, modération).

### 2.8 API Chatbot intégré

Infrastructure complète dans `useChatbotConfig.ts` et types dédiés :

- **Clés API** générées côté client (format `wmrx_cb_<32 hex>`) avec préfixe `wmrx_cb_`
- **Canaux supportés** : WhatsApp, Telegram, Email, SMS, API REST, Webhook
- **10 actions disponibles** : `view_invoices`, `create_invoice`, `view_clients`, `create_client`, `view_treasury`, `create_treasury_movement`, `view_reports`, `view_audit_log`, `ai_assistant`, `view_dashboard`
- **Permissions par clé** : chaque clé API peut avoir ses actions activées/désactivées avec plage de validité et rate limit par heure
- **Historique** : conversations (`chatbot_conversations`) et messages (`chatbot_messages`) stockés avec rôle, action, résultat, tokens

### 2.9 Journal d'audit

Table `audit_logs` : chaque INSERT/UPDATE/DELETE sur les tables sensibles est tracé avec user_id, timestamp, table, avant/après, adresse IP, company_id.

### 2.10 Rapport A (rapprochement fiscal)

Implémenté dans `useAReport.ts` — référence spec SFE §2.33 :
- Agrégation des factures certifiées par période
- Totaux par type (FV, FT, FA, EV, ET, EA)
- Totaux HT, TVA, PSVB, TTC, timbre
- Sauvegarde dans `fiscal_a_reports` (upsert par période)

### 2.11 Gestion multi-entreprise

Le modèle de données supporte plusieurs entreprises (chaque table a `company_id`). Chaque entreprise configure :
- Profil fiscal (`BF` ou `GENERIC`)
- Config fiscale détaillée (groupes de taxe, timbre, PSVB, types de factures)
- Paramètres de facture (couleurs, logo, position)
- Modèles IA et clé OpenRouter
- URL QR scan (`qr_scan_base_url`)

### 2.12 Pages de l'application (routes existantes)

| Route | Module |
|---|---|
| `/` | Landing page |
| `/auth/*` | Authentification (login, register, reset) |
| `/invoices/*` | Liste + éditeur de factures |
| `/clients` | Gestion clients |
| `/treasury` | Trésorerie |
| `/reports` | Rapports |
| `/audit` | Journal d'audit |
| `/ai` | Assistant IA |
| `/articles` | Catalogue articles |
| `/settings` | Paramètres entreprise + utilisateurs + permissions |
| `/admin/*` | Administration (project_admin) |

---

## 3. Stack technique exact

| Composant | Technologie |
|---|---|
| Framework UI | Quasar 2 / Vue 3 / TypeScript |
| State management | Pinia |
| Backend | InsForge (PostgreSQL + PostgREST) |
| Auth | InsForge Auth (email/password) |
| Storage | InsForge Storage |
| IA | OpenRouter (multi-modèles) |
| PDF | jsPDF + jspdf-autotable |
| QR Code | `qrcode` npm |
| Déploiement | Vercel (projet `wimrux_app`) |

---

## 4. Ce qui N'est PAS encore livré (lacunes constatées)

- La page Factures (`/invoices`) existe mais l'éditeur complet est partiellement implémenté
- La certification SECeF (connexion physique MCF) a été retirée du workflow — les factures peuvent atteindre l'état `certified` dans la base mais il n'y a plus de bouton de certification dans l'interface
- L'intégration chatbot existe en infrastructure mais le connecteur WhatsApp/Telegram n'est pas présent dans le code source

---

## 5. Tables de base de données identifiées dans le code

`invoices`, `invoice_items`, `invoice_sequences`, `clients`, `companies`, `user_profiles`, `user_role_assignments`, `company_role_permissions`, `company_custom_roles`, `treasury_accounts`, `treasury_movements`, `audit_logs`, `ai_usage_logs`, `chatbot_api_keys`, `chatbot_permissions`, `chatbot_conversations`, `chatbot_messages`, `fiscal_a_reports`, `articles`

---

*Document produit par inspection directe du code source — c:\wamp64\www\wimrux_finances\wimrux_app — 23 mai 2026*
