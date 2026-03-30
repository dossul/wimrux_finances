# WIMRUX® FINANCES

**Système de Facturation Électronique (SFE) homologué DGI — Burkina Faso**

Application SaaS de gestion de facturation conforme aux normes MCF/SECeF (Machine de Certification Fiscale / Système Électronique Certifié de Facturation) du Burkina Faso.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | Quasar Framework 2.x + Vue 3 Composition API + TypeScript |
| Backend | InsForge BaaS (PostgreSQL, Auth, Edge Functions, Storage, Realtime) |
| PDF | jsPDF + jspdf-autotable |
| Tests | Vitest (56 tests unitaires) |
| i18n | Français (défaut) + Anglais |

## Fonctionnalités principales

### Facturation DGI conforme
- **6 types de documents** : FV (Facture de Vente), FT (Facture Ticket), FA (Facture d'Avoir), EV (Facture Export Vente), ET (Export Ticket), EA (Export Avoir)
- **16 groupes fiscaux** (A-P) avec taux TVA et PSVB conformes DGI BF
- **Calcul automatique** : TVA, PSVB, taxe spécifique (§6.9), timbre quittance par tranche
- **Numérotation séquentielle gapless** via PostgreSQL (`next_invoice_reference` — atomique, SECURITY DEFINER)
- **Certification MCF/SECeF** : soumission, confirmation, numéro fiscal, compteurs, QR code, signature HMAC SHA-256
- **Mode dégradé** : file d'attente locale quand le serveur MCF est injoignable
- **Avoirs (FA/EA)** : validation montant ≤ facture originale, nature d'avoir obligatoire

### Gestion commerciale
- **Catalogue articles** : code, désignation, type (LOCBIE/LOCSER/IMPBIE/IMPSER), groupe fiscal, prix unitaire, taxe spécifique, stock
- **Autocomplete articles** dans l'éditeur de facture (recherche par code ou désignation)
- **Décrément stock automatique** après certification (trigger PostgreSQL)
- **Clients** : 4 types (PM, PC, PP, CC) avec validation IFU contextuelle (strict 8 chiffres pour PM, libre 1-20 car. pour PC export, optionnel pour PP/CC)
- **Adresse cadastrale** : masque SSSS LLL PPPP avec validation regex

### Workflow facture (séparation des pouvoirs)
1. **Brouillon** → Soumission (`invoices.submit`)
2. **En attente** → Approbation / Rejet (`invoices.approve`)
3. **Approuvée** → Validation (`invoices.validate`)
4. **Validée** → Certification SECeF (`invoices.certify`)
5. **Certifiée** — immutable

Anti-fraude : le soumetteur ne peut pas approuver sa propre facture.

### Trésorerie
- **Comptes** : caisse, banque, mobile money
- **Mouvements** : crédit/débit avec mode de paiement (espèces, chèque, virement, carte, mobile money)
- **Dépôts/retraits numéraires** : boutons dédiés avec marquage `is_cash_operation`
- **Filtre** : par compte, type, opérations caisse uniquement

### Rapports
- **KPIs** : CA, nombre de factures, ventilation par type
- **Rapports fiscaux** : Z (clôture journalière) et X (consultation) via API MCF
- **Rapport A** : synthèse annuelle avec détail par groupe fiscal
- **Export CSV** pour tous les rapports

### Sécurité
- **RBAC granulaire** : permissions par rôle, par entreprise
- **RLS PostgreSQL** : 22/22 tables protégées avec isolation par `company_id`
- **Audit log inaltérable** : triggers BEFORE DELETE/UPDATE sur `audit_log` et `invoices`
- **JWT** : authentification InsForge + tokens anonymes pour accès public

### Autres
- **PDF certifié** : bloc certification, mentions légales, QR code, DUPLICATA
- **Notifications temps réel** (WebSocket)
- **Gestion appareils SFE** (NIM, IFU, clé JWT)
- **Assistant IA** intégré (chatbot)

---

## Installation

```bash
npm install
cp .env.example .env
# Configurer VITE_INSFORGE_URL et VITE_INSFORGE_ANON_KEY
```

## Commandes

| Commande | Description |
|----------|-------------|
| `npx quasar dev` | Serveur de développement |
| `npm run test` | Tests unitaires (Vitest) |
| `npm run test:watch` | Tests en mode watch |
| `npm run lint` | Linting ESLint |
| `npx quasar build` | Build de production |

## Structure du projet

```
src/
├── boot/          # insforge, i18n, axios
├── composables/   # useMcfApi, useTaxCalculation, useInvoicePdf, useExportCsv,
│                  # useInvoiceWorkflow, useDegradedMode, usePdfStorage,
│                  # useRealtimeNotifications, useAiAssistant, useMcfAlert
├── i18n/          # fr/, en-US/
├── layouts/       # MainLayout, AuthLayout
├── pages/         # auth/, invoices/, clients/, treasury/, reports/,
│                  # audit/, settings/, articles/
├── router/        # routes + RBAC guard
├── stores/        # auth-store, company-store, invoice-store
├── types/         # TypeScript interfaces (Invoice, Client, Article, etc.)
└── utils/         # validators, numberToFrenchWords, taxCalculation helpers
```

## Base de données (22 tables)

| Table | Description |
|-------|-------------|
| `companies` | Entreprises (IFU, RCCM, adresse cadastrale) |
| `clients` | Clients (PM/PC/PP/CC, IFU, adresse cadastrale) |
| `articles` | Catalogue articles (code, type, groupe fiscal, stock) |
| `invoices` | Factures (workflow, certification, PDF) |
| `invoice_items` | Lignes de facture |
| `invoice_sequences` | Séquences gapless (company × type × année) |
| `devices` | Appareils SFE (NIM, IFU, JWT) |
| `fiscal_reports` | Rapports Z/X |
| `fiscal_a_reports` | Rapport A annuel |
| `treasury_accounts` | Comptes trésorerie |
| `treasury_movements` | Mouvements (+ dépôts/retraits numéraires) |
| `audit_log` | Journal d'audit inaltérable |
| `user_profiles` | Profils utilisateurs |
| `user_role_assignments` | Assignation rôles |
| `company_role_permissions` | Permissions par rôle |
| `pending_certification_queue` | File d'attente mode dégradé |
| `sim_invoices` | Simulateur MCF (edge function) |
| `chatbot_*` | Tables IA (conversations, messages, permissions, API keys) |
| `ai_usage_logs` | Logs d'utilisation IA |

## Première entreprise

**WESTAGO SARL** — IFU: 00089946R · RCCM: BF OUA 2021 M 13807

## Licence

Propriétaire — WIMRUX®
