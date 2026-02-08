# 🏗️ SYNTHÈSE POUR LE DÉVELOPPEMENT - WIMRUX® FINANCES

**Généré le:** 2026-02-08 03:54:32

Ce document synthétise les exigences extraites de tous les PDFs réglementaires
et techniques pour guider le développement à 100%.

---

## 1. Exigences Réglementaires DGI

### Sources réglementaires traitées:

- **ARRETE-NÂ°2023-00216-MEFP-SG-DGI-PORTANT-CONDITIONS-D-EDITION-DE-GESTION-ET-ELEMENTS-DE-SECURITE-DE-LA-FACTURE-NORMALISEE.pdf** (3 pages)
- **ARRETE-PORTANT-COMMERCIALISATION-DE-LA-FEC.pdf** (7 pages)
- **ARRETE-PORTANT-CONDITIONS-ET-MODALITES-DEMISSION-DE-LA-FEC.pdf** (5 pages)
- **ARRETE-SUR-LES-DOCUMENTS-TENANT-LIEU-DE-LA-FEC.pdf** (2 pages)
- **CODE-GENERAL-DES-IMPOTS-A-JOUR-LOI-DE-FINANCE-2021.pdf** (380 pages)
- **COMMUNIQUE-DE-MADAME-LA-DIRECTRICE-GENERALE-DES-IMPOTS-PORTANT-AVIS-AUX-FOURNISSEURS-DE-LOGICIEL-DE-FACTURATION-ET-DES-CONTRIBUABLES-UTILISANT-LEUR-PROPRE-LOGICIEL-DE-FACTURATION.pdf** (1 pages)
- **MISE-EN-PLACE-DU-COMITE-DHOMOLOGATION-DES-SYSTEMES-ELECTRONIQUES-CERTIFIES-DE-FACTURATION-ET-DE-SYSTEMES-DE-FACTURATION-DENTREPRISES.pdf** (2 pages)
- **PROCEDURES-DHOMOLOGATION-DES-UNITES-DE-FACTURATION-DES-MODULES-DE-CONTROLE-DE-LA-FACTURE-ET-DES-SYSTEMES-DE-FACTURATION-DENTREPRISE.pdf** (8 pages)
- **ARRETE-NÂ°2023-00216-MEFP-SG-DGI-PORTANT-CONDITIONS-D-EDITION-DE-GESTION-ET-ELEMENTS-DE-SECURITE-DE-LA-FACTURE-NORMALISEE.pdf** (3 pages)
- **ARRETE-PORTANT-COMMERCIALISATION-DE-LA-FEC.pdf** (7 pages)
- **ARRETE-PORTANT-CONDITIONS-ET-MODALITES-DEMISSION-DE-LA-FEC.pdf** (5 pages)
- **ARRETE-SUR-LES-DOCUMENTS-TENANT-LIEU-DE-LA-FEC.pdf** (2 pages)
- **CODE-GENERAL-DES-IMPOTS-A-JOUR-LOI-DE-FINANCE-2021.pdf** (380 pages)
- **COMMUNIQUE-DE-MADAME-LA-DIRECTRICE-GENERALE-DES-IMPOTS-PORTANT-AVIS-AUX-FOURNISSEURS-DE-LOGICIEL-DE-FACTURATION-ET-DES-CONTRIBUABLES-UTILISANT-LEUR-PROPRE-LOGICIEL-DE-FACTURATION.pdf** (1 pages)
- **MISE-EN-PLACE-DU-COMITE-DHOMOLOGATION-DES-SYSTEMES-ELECTRONIQUES-CERTIFIES-DE-FACTURATION-ET-DE-SYSTEMES-DE-FACTURATION-DENTREPRISES.pdf** (2 pages)
- **PROCEDURES-DHOMOLOGATION-DES-UNITES-DE-FACTURATION-DES-MODULES-DE-CONTROLE-DE-LA-FACTURE-ET-DES-SYSTEMES-DE-FACTURATION-DENTREPRISE.pdf** (8 pages)

### Points Critiques (à vérifier dans chaque document):

- [x] Conditions d'édition de la facture normalisée — `InvoiceEditorPage.vue` (6 types: FV, FA, FT, EV, ET, EA)
- [x] Éléments de sécurité obligatoires sur la facture — QR Code, signature, NIM, Code SECeF, numéro fiscal
- [x] Procédures d'homologation SFE — Gestion appareils dans `SettingsPage.vue` (NIM, IFU, jwt_secret)
- [x] Spécifications du MCF (Module de Contrôle de Facturation) — `fnec-simulator` Edge Function + `useFnecApi.ts`
- [x] Format et contenu du Code SECeF — champ `code_secef_dgi` sur factures, retourné par certification
- [x] Exigences de la signature électronique — champ `signature` stocké depuis réponse MCF
- [x] Règles du mode dégradé (bufferisation) — `useDegradedMode.ts`, table `pending_certification_queue`, auto-queue + retry
- [x] Format du Z-Report (rapport de clôture journalière) — `FiscalReportsPage.vue` (rapports Z et X)
- [x] Exigences de la piste d'audit — `AuditLogPage.vue`, table `audit_log`, triggers PostgreSQL
- [x] Conditions de commercialisation de la FEC — Types facture conformes aux exigences FEC
- [x] Documents tenant lieu de FEC — Types multiples (FV, FA, FT, EV, ET, EA)

## 2. Spécifications Techniques

### Sources techniques traitées:

- **SPECIFICATIONS-TECHNIQUES-DES-SYSTEMES-DE-FACTURATION-DENTREPRISE.pdf** (10 pages)
- **SPECIFICATIONS-TECHNIQUES-DES-SYSTEMES-ELECTRONIQUES-CERTIFIES-DE-FACTURATION.pdf** (11 pages)
- **SPECIFICATIONS-TECHNIQUES-DES-SYSTEMES-DE-FACTURATION-DENTREPRISE.pdf** (10 pages)
- **SPECIFICATIONS-TECHNIQUES-DES-SYSTEMES-ELECTRONIQUES-CERTIFIES-DE-FACTURATION.pdf** (11 pages)

### Éléments Techniques Clés:

- [x] Protocole de communication SFE ↔ MCF — `useFnecApi.ts` (REST API JSON)
- [x] Format des données échangées (XML/JSON) — JSON via Edge Function API
- [x] Algorithmes de chiffrement requis — AES-256-CBC `crypto-aes256` Edge Function + `useCrypto.ts`
- [x] Format du QR Code de sécurité — champ `qr_code` dans factures, inclus dans PDF
- [x] Spécifications de la signature électronique — champ `signature` depuis certification FNEC
- [x] Séquençage des numéros de facture — Référence + `fiscal_number` du MCF
- [x] Compteurs MCF (horaire, séquentiel) — champ JSON `counters` stocké depuis certification
- [x] Exigences de performance (latence < 3s) — Flux asynchrone + mode dégradé pour timeouts
- [x] Spécifications du mode RS232 / API — Mode API implémenté (RS232 via agent local documenté)

## 3. Exigences Projet WIMRUX® FINANCES

### Sources projet traitées:

- **Cahier des Charges Complet WIMRUX FINANCE v1.3 (1).pdf** (6 pages)
- **Document Technique Complémentaire-WIMRUX FINANCE (1).pdf** (4 pages)
- **Développement de la plateforme SaaS WIMRUX® FINANCES v2 (1).pdf** (4 pages)
- **Cahier des Charges Complet WIMRUX FINANCE v1.3 (1).pdf** (6 pages)
- **Document Technique Complémentaire-WIMRUX FINANCE (1).pdf** (4 pages)
- **Développement de la plateforme SaaS WIMRUX® FINANCES v2 (1).pdf** (4 pages)

### Modules à Développer:

- [x] **Auth & RBAC** — `auth-store.ts`, `LoginPage`, `RegisterPage`, rôles admin/caissier/auditeur, guards
- [x] **Facturation** — `InvoiceEditorPage`, `InvoicesListPage`, 6 types, validation, certification FNEC
- [x] **Driver SFE-MCF** — `useFnecApi.ts` + `fnec-simulator` Edge Function (auth, submit, confirm)
- [x] **PDF Generator** — `useInvoicePdf.ts` (jsPDF + QR Code + bloc sécurité)
- [x] **Trésorerie** — `TreasuryPage.vue`, tables `treasury_accounts` / `treasury_movements`
- [x] **Taxes** — `useTaxCalculation.ts` (groupes A-P, TVA 0-18%, PSVB, timbre quittance)
- [x] **Z-Report** — `FiscalReportsPage.vue` (rapports Z clôture + X intermédiaire)
- [x] **Audit Log** — `AuditLogPage.vue`, table `audit_log`, triggers PostgreSQL automatiques
- [x] **Rapports** — `ReportsPage.vue` 3 onglets (Synthèse, Compte de résultat, Balance âgée) + CSV
- [x] **Gestion Clients** — `ClientsPage.vue`, table `clients` avec IFU
- [x] **Mode Dégradé** — `useDegradedMode.ts`, table `pending_certification_queue`, banner Dashboard
- [x] **Chiffrement** — `crypto-aes256` Edge Function AES-256-CBC + `useCrypto.ts`
- [x] **IA / Assistant** — `useAiAssistant.ts` + `AiAssistantPage.vue`, InsForge AI SDK (Claude)
- [x] **Multi-entreprise** — `companies` table, `company_id` FK sur toutes tables, RLS, isolation SaaS

## 4. Stack Technique Confirmée

| Composant | Technologie |
| --- | --- |
| **Frontend** | **Quasar Framework 2.x** — Vue 3 Composition API, TypeScript |
| **BaaS (Backend)** | **InsForge** — PostgreSQL, Auth, Storage, Edge Functions, AI |
| **Base de données** | **PostgreSQL** via InsForge (PostgREST API, ACID) |
| **Auth** | InsForge Auth — Email/Password + OAuth (Google, GitHub), RBAC |
| **Storage** | InsForge Storage — Upload/Download fichiers (logos, justificatifs) |
| **Edge Functions** | InsForge Functions — Logique serveur (calculs fiscaux, MCF bridge) |
| **IA** | InsForge AI — DeepSeek, GPT-4o-mini, Claude, Gemini (assistant fiscal) |
| **Chiffrement** | AES-256 CBC (données sensibles : IFU, clés API, données MCF) |
| **PDF** | Génération côté client ou Edge Function avec QR Code |
| **Communication MCF** | Edge Function / API REST ↔ MCF (RS232 via agent local) |
| **Realtime** | InsForge Realtime — WebSocket pub/sub (notifications, sync) |

### Pourquoi ce changement de stack ?

- **Plus de Django/Python** — Le backend est entièrement géré par InsForge (BaaS)
- **Quasar** — Framework Vue 3 complet avec PWA, SSR, Material Design, CLI intégrés
- **Composition API** — Meilleure réutilisabilité du code, TypeScript natif
- **InsForge** — Auth, DB, Storage, Functions, AI en un seul service managé
- **Avantage** — Pas de serveur à gérer, focus 100% sur la logique métier et l'UI

## 5. Roadmap Critique

| Phase | Période | Livrables |
| --- | --- | --- |
| Socle & BDD | Février 2026 | Architecture PostgreSQL, Auth, Rôles |
| Driver MCF | Mars 2026 | Pont RS232/API, simulateur MCF, chiffrement |
| Facturation | Avril 2026 | UI saisie, PDF fiscal, QR Code, Avoirs |
| Tests & Audit | Mai 2026 | Tests charge, Z-Reports, dossier DGI |
| Homologation | Juin 2026 | Dépôt DGI, démo, déploiement pilote |
| **DEADLINE** | **1er Juillet 2026** | **Production homologuée** |

---

## 6. Contenu Intégral Extrait

Consultez les fichiers Markdown individuels dans les sous-dossiers
de `knowledge_base/` pour le contenu complet de chaque document.
