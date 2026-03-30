# Changelog — Conformité DGI Burkina Faso

Historique des modifications pour la mise en conformité avec les spécifications DGI BF / SECeF.

---

## v1.0.0 — Conformité DGI complète (2026-02-13)

### Sprint 1 — Conformité DGI critique

- **Task 27 — Validation adresse cadastrale SSSS LLL PPPP**
  - Masque de saisie `#### ### ####` sur les formulaires client et entreprise
  - Validation regex `^\d{4}\s\d{3}\s\d{4}$` dans `validators.ts`
  - Appliqué sur `ClientsPage.vue` (client + company forms) et `SettingsPage.vue`

- **Task 28 — Séquence DB ininterrompue par année**
  - Table `invoice_sequences` (company_id × type × year, UNIQUE)
  - Fonction PostgreSQL `next_invoice_reference()` — SECURITY DEFINER, atomique, INSERT ON CONFLICT
  - Format : `{TYPE}-{YEAR}-{00001}` — gapless, multi-concurrent

- **Task 30 — FA/EA : credit_note_nature + validation montant**
  - Validation dans `InvoiceEditorPage.vue` : montant avoir (TTC) ≤ montant facture originale (TTC)
  - Notification utilisateur si dépassement avec montants formatés
  - Colonne `credit_note_nature` et `original_invoice_id` vérifiées en DB

- **Task 31 — IFU libre pour export (EV/ET/EA)**
  - Validation IFU contextuelle par type de client :
    - PM (local) : strict 8 chiffres (`isValidIFU`)
    - PC (étranger) : libre 1-20 caractères (`isValidExportIFU`)
    - PP/CC (individu) : optionnel, format DGI si renseigné
  - `ifuRules` computed property dans `ClientsPage.vue`

### Sprint 2 — Fonctionnalités métier

- **Task 34.3 — Autocomplete articles dans InvoiceEditor**
  - Remplacement `q-input` par `q-select` avec `use-input` et `new-value-mode`
  - Chargement catalogue articles depuis DB à l'ouverture
  - Auto-remplissage : type, groupe fiscal, prix unitaire, taxe spécifique
  - Recherche par code ou désignation

- **Task 34.4 — Trigger stock après certification**
  - Colonne `stock_quantity` ajoutée à `articles`
  - Trigger PostgreSQL `trg_decrement_stock_on_certification` (AFTER UPDATE ON invoices)
  - Fonction `decrement_stock_on_certification()` — SECURITY DEFINER
  - Décrément par matching `articles.code = invoice_items.code`

- **Task 35 — Dépôts/retraits numéraires**
  - Colonne `is_cash_operation` ajoutée à `treasury_movements`
  - Boutons dédiés « Dépôt caisse » / « Retrait caisse » dans `TreasuryPage.vue`
  - Présélection compte caisse, description et mode de paiement automatiques
  - Filtre « Caisse uniquement » (toggle)

### Sprint 3 — Tests et sécurité

- **Task 39 — Tests unitaires Vitest**
  - 56 tests, 4 fichiers :
    - `useTaxCalculation.test.ts` (21 tests) : groupes fiscaux, TVA, PSVB, timbre, totaux
    - `validators.test.ts` (16 tests) : IFU, cadastral, NIM, référence facture
    - `useInvoiceWorkflow.test.ts` (8 tests) : transitions, anti-fraude, STATUS_CONFIG
    - `numberToFrenchWords.test.ts` (11 tests) : conversion montants en lettres
  - Configuration Vitest + happy-dom

- **Task 41 — Audit sécurité RLS/triggers**
  - **22/22 tables** avec RLS activé ✅
  - Toutes les tables ont au moins une politique RLS
  - `sim_invoices` corrigé (RLS était OFF)
  - Triggers vérifiés : audit, immutabilité, stock, realtime

### Sprint 4 — Documentation

- **Task 42 — README fonctionnel** : guide complet (stack, features, DB, commandes)
- **Task 43 — Guide déploiement** : `DEPLOYMENT.md` (env, migrations, build, Nginx, checklist)
- **Task 44 — Changelog DGI** : ce fichier

---

## Conformité DGI — Référence croisée

| Spécification DGI | Implémentation | Fichier(s) |
|-------------------|----------------|------------|
| §2.1 Types de facture (FV/FT/FA/EV/ET/EA) | 6 types supportés | `types/index.ts` |
| §2.4 Numérotation séquentielle | `next_invoice_reference` atomique | `invoice_sequences` table + RPC |
| §2.13 Dépôts/retraits numéraires | `is_cash_operation` + UI dédiée | `TreasuryPage.vue` |
| §2.28 Montant avoir ≤ originale | Validation `executeAction()` | `InvoiceEditorPage.vue` |
| §6.9 Base TVA + taxe spécifique | `calculateItemTax()` | `useTaxCalculation.ts` |
| §6.10 Timbre quittance par tranche | `calculateStampDuty()` | `useTaxCalculation.ts` |
| §7 Types client (PM/PC/PP/CC) | Validation IFU contextuelle | `ClientsPage.vue`, `validators.ts` |
| §8 Adresse cadastrale SSSS LLL PPPP | Masque + regex | `validators.ts`, formulaires |
| §9 16 groupes fiscaux A-P | `TAX_GROUP_RATES` | `useTaxCalculation.ts` |
| §10 Certification MCF/SECeF | API MCF + QR + signature HMAC | `useMcfApi.ts`, Edge Function |
| §11 Mode dégradé | File d'attente locale | `useDegradedMode.ts` |
| §12 Rapports Z/X | Clôture + consultation | `ReportsPage.vue` |
| §13 Rapport A | Synthèse annuelle | `AReportPage.vue` |
| §14 PDF certifié | Bloc certification + mentions | `useInvoicePdf.ts` |
| §15 Séparation des pouvoirs | RBAC + anti-fraude | `useInvoiceWorkflow.ts` |
| §16 Audit inaltérable | Triggers BEFORE DELETE/UPDATE | `audit_log` triggers |
| §17 RLS isolation données | 22/22 tables protégées | PostgreSQL policies |
