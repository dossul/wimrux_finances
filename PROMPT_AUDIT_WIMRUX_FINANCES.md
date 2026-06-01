# 🔍 PROMPT D'AUDIT COMPLET — WIMRUX® FINANCES

> **À copier-coller intégralement dans Claude Code, Codex, Cursor, Windsurf ou tout agent IA codeur ayant accès à votre repo et à vos documents.**
> **Date :** 25 mai 2026
> **Version :** 1.1 (Mise à jour post-sécurité IA)
> **Cible :** Audit exhaustif code + fonctionnel + sécurité + conformité aux PRD

---

## 📋 ÉTAT ACTUEL DU PROJET (Post-Sécurité IA — Mai 2026)

Les corrections critiques suivantes ont été appliquées lors de la dernière session. **Prendre en compte ces achevés dans l'audit :**

### ✅ Sécurité P0 — RÉSOLU

| Correctif | Statut | Preuve |
|-----------|--------|--------|
| **RLS activé** sur 6 tables AI tenant | ✅ | `company_ai_credits`, `company_ai_quota_usage`, `ai_credit_transactions`, `company_ai_task_routing`, `company_ai_credentials`, `company_subscriptions` |
| **Policies RLS** créées | ✅ | 12 policies tenant (SELECT/INSERT/UPDATE/DELETE par `company_id`) |
| **Abonnements manquants** créés | ✅ | 4 subscriptions pour companies existantes (plan 'free') |
| **Secrets marqués** | ✅ | `ai_admin_settings.is_secret = true` pour toutes les clés API |
| **ai-router redeployé** | ✅ | `funding_source` corrigé selon PRD (`platform_quota`/`platform_credits`/`byok`) |

### ✅ Fonctionnalités P1 — IMPLÉMENTÉ

| Fonctionnalité | Fichier/Route | Statut |
|----------------|---------------|--------|
| **Page achat crédits IA** | `/settings/ai/credits` | ✅ `AiCreditsBuyPage.vue` créée |
| **Page consommation IA** | `/settings/ai/usage` | ✅ `AiUsagePage.vue` créée |
| **Routeurs mis à jour** | `routes.ts` | ✅ Routes ajoutées |
| **RPC crédits** | SQL function | ✅ `increment_ai_credits()` créée |

### 🔄 En attente de déploiement services IA (par opérateur)

| Service | URL cible | Statut |
|---------|-----------|--------|
| LiteLLM Proxy | `https://litellm.wimrux.com` | ⏳ Attente credentials |
| Langfuse | `https://langfuse.wimrux.com` | ⏳ Attente credentials |
| Presidio | `https://presidio.wimrux.com` | ⏳ Attente credentials |
| Dify | `https://dify.wimrux.com` | ⏳ Attente credentials |
| Stirling AI | `https://stirling.wimrux.com` | ⏳ Attente credentials |

### ⚠️ Anomalies toujours actives (à vérifier dans l'audit)

1. **TypeScript types** — Interfaces `AiUsageLog`, `CompanyAiQuotaUsage` peuvent être désynchronisées avec les champs DB réels
2. **Page usage** — Besoin de synchronisation avec types réels de la DB
3. **Integration tests** — Aucun test E2E pour les flows de crédits/achat
4. **Payment EPIC 24** — Toujours à 0% (non démarré)

---

## 🎯 RÔLE ET MISSION

Tu es un **auditeur senior expert** spécialisé dans :
- Architecture SaaS multi-tenant (PostgreSQL RLS, BaaS InsForge/Supabase)
- Stack Quasar 2 / Vue 3 / TypeScript / Pinia
- Edge Functions Deno / PostgREST
- Sécurité applicative (OWASP Top 10, RGPD, RGPD-équivalent UEMOA)
- Comptabilité OHADA SYSCOHADA et fiscalité CEDEAO/UEMOA
- Intégration IA (LiteLLM, Langfuse, Presidio, Dify)
- Paiements Mobile Money / Cartes / Wallets CEDEAO

Ta mission est de **réaliser un audit exhaustif, méthodique et impitoyable** du projet **WIMRUX® Finances** et de produire un rapport d'audit professionnel **sans rien laisser passer**.

**Ne fais AUCUNE supposition.** Si une information manque, **demande-la** ou **note-la comme manquante** dans le rapport. Ne génère **JAMAIS de fausse conformité**.

---

## 📚 DOCUMENTS DE RÉFÉRENCE (lecture obligatoire AVANT toute analyse)

Tu dois lire **intégralement** et **dans cet ordre** les documents suivants avant de commencer l'audit :

1. **`Cahier-des-Charges-WIMRUX-Finances-v1.2.pdf`** — Cahier des charges client (13 pages)
2. **`PRD_WIMRUX_FINANCES.md`** — PRD principal du produit
3. **`PRD_WIMRUX_FACTURATION.md`** — PRD module facturation (séparé, certification SECeF/MCF)
4. **`DB_SCHEMA_INSFORGE_WIMRUX.md`** — Schéma BDD existant (25 tables, 10 Edge Functions, 10 buckets)
5. **`PLAN_TACHES_WIMRUX_FINANCES.md`** — Plan principal (11 sprints, 23 EPICs, ~21 semaines)
6. **`PLAN_TACHES_WIMRUX_FINANCES_ADDENDUM_PAIEMENTS_IA.md`** — Addendum (EPIC 24, 25, 26)
7. **`PRD_INFRASTRUCTURE_IA_WIMRUX_FINANCES.md`** — PRD infra IA (Langfuse, LiteLLM, Presidio, wallet crédits)
8. **`seed_payment_providers_and_ai_tasks.sql`** — Seeds providers paiement + tâches IA
9. **`KANBAN.md`** — État actuel des tâches (TODO, IN PROGRESS, DONE)
10. **`RAPPORT_AUDIT_WIMRUX_FINANCES_2026-05-25.md`** — Rapport d'audit initial (baseline)
11. **Tout autre document `.md`, `.pdf`, `.sql` présent dans le repo** que tu identifies comme source de vérité

⚠️ **Si l'un de ces documents est introuvable, signale-le immédiatement avant de commencer.**

### 🔍 Points de contrôle spécifiques (Mai 2026)

Vérifier impérativement ces éléments qui ont fait l'objet de corrections récentes :

| Vérification | Où chercher | Critère de succès |
|--------------|-------------|-------------------|
| Tables AI avec RLS | `information_schema.tables` + `pg_class.relrowsecurity` | 6 tables avec RLS=ON |
| Policies RLS | `pg_policies` | Policies `*_tenant_policy` sur chaque table AI |
| Abonnements companies | `company_subscriptions` | 1 row par `companies.id` |
| Secrets marqués | `ai_admin_settings` | `is_secret = true` pour toutes les clés API |
| ai-router funding_source | `ai_router_fn/index.ts` | Valeurs: `platform_quota`, `platform_credits`, `byok` |
| Pages UI crédits/usage | `wimrux_app/src/pages/settings/` | `AiCreditsBuyPage.vue` + `AiUsagePage.vue` existent |
| Routes ajoutées | `wimrux_app/src/router/routes.ts` | `/settings/ai/credits` + `/settings/ai/usage` |

---

## 🗂️ PÉRIMÈTRE DE L'AUDIT

### Inclus dans l'audit ✅

- Tout le code du projet **WIMRUX Finances** (frontend Quasar + Edge Functions + migrations SQL)
- Schéma de base de données (tables, RLS policies, triggers, fonctions, indexes)
- Edge Functions Deno
- Configuration de l'infrastructure IA (`ai-router`, LiteLLM, Langfuse, Presidio)
- Système de wallet crédits IA + abonnements + BYOK
- Intégrations paiements Mobile Money / Cartes / Wallets CEDEAO/UEMOA
- Conformité multi-tenant, RGPD, audit log
- UI/UX (cohérence, accessibilité, i18n FR/EN/PT)
- Tests (unitaires, intégration, E2E)
- Documentation technique et utilisateur
- Sécurité (gestion des secrets, chiffrement BYOK, RLS)

### Exclus de l'audit ❌ (à NE PAS toucher)

- **WIMRUX Facturation** (projet séparé pour certification SECeF/MCF Eltrade CC300)
- Tables réservées à WIMRUX Facturation : `pending_certification_queue`, `devices`, `certification_devices`, `sim_invoices`, `mcf_logs`
- Edge Functions réservées : `mcf-simulator`, `fnec-simulator`
- Tout code de certification fiscale matérielle

Si tu identifies du code de Facturation **dans le repo Finances**, signale-le comme **violation de séparation des préoccupations**.

---

## 🔬 MÉTHODOLOGIE D'AUDIT (11 PHASES OBLIGATOIRES)

Exécute **chaque phase dans l'ordre**, sans en sauter aucune. Pour chaque phase, produis une section dédiée dans le rapport final.

---

### PHASE 1 — Cartographie du projet existant

**Objectif :** Inventaire exhaustif de ce qui existe réellement.

**Actions :**
1. Liste l'arborescence complète du projet (`tree -L 4 -I 'node_modules|dist'`)
2. Identifie le framework, la version, les dépendances majeures (package.json)
3. Compte : nombre de fichiers TS/Vue/SQL, lignes de code, composants, stores Pinia, Edge Functions, migrations
4. Recense les tables actuellement déployées (SELECT depuis `information_schema`)
5. Recense les Edge Functions déployées
6. Recense les buckets de storage
7. Recense les seeds appliqués
8. Identifie la branche Git active, la dernière date de commit, les contributeurs

**Livrables :**
- Tableau synthétique : `[Composant | Nombre | Statut]`
- Diagramme texte de l'arborescence
- Liste des dépendances critiques avec leur version actuelle vs dernière stable

---

### PHASE 2 — Vérification de couverture fonctionnelle (gap analysis)

**Objectif :** Détecter ce qui est demandé dans les docs mais **manquant** ou **incomplet** dans le code.

**Actions :**
1. Pour CHAQUE EPIC documenté (1 à 26+) dans `PLAN_TACHES_WIMRUX_FINANCES.md` et l'addendum :
   - Vérifier l'existence du code correspondant
   - Vérifier les tables, RLS, triggers, indexes attendus
   - Vérifier les Edge Functions attendues
   - Vérifier les composants UI attendus
   - Vérifier les tests associés
2. Pour CHAQUE module fonctionnel du cahier des charges :
   - Banque (rapprochements, imports CSV/PDF/SMS, multi-comptes)
   - Factures émises (Finances side, sans certification SECeF)
   - Factures reçues fournisseurs
   - Budgets et prévisions
   - Trésorerie et cash flow
   - Immobilisations et amortissements OHADA
   - Emprunts et crédits
   - États financiers OHADA SYSCOHADA
   - Déclarations fiscales (TVA, BIC, IS, IRPP, CFE) par pays UEMOA/CEDEAO
   - Multi-devise XOF/XAF/USD/EUR/GHS/NGN
   - Multi-tenant company isolation
   - Audit trail complet
   - Assistants IA (fiscal, comptable)
   - Wallet IA + BYOK + abonnements
   - Collecte universelle paiements (EPIC 24)
3. Établir une **matrice de couverture** :

| EPIC / Module | Documenté ? | Codé ? | Testé ? | Déployé ? | % Complétude | Bloqueurs |
|---|---|---|---|---|---|---|
| EPIC 1 — Auth multi-tenant | ✅ | ✅ | ⚠️ | ✅ | 75% | Pas de tests E2E |
| EPIC 24 — Collecte paiements | ✅ | ❌ | ❌ | ❌ | 0% | À démarrer |
| ... | ... | ... | ... | ... | ... | ... |

**Livrables :**
- Matrice de couverture exhaustive (Markdown table)
- Liste des **fonctionnalités MANQUANTES** classées par priorité (P0/P1/P2/P3)
- Liste des **fonctionnalités EN COURS** avec % d'avancement
- Liste des **fonctionnalités COMPLÈTES** vérifiées en code

---

### PHASE 3 — Audit du schéma de base de données

**Objectif :** Garantir intégrité, sécurité multi-tenant, performance et conformité OHADA.

**Actions :**

**3.1 — Intégrité structurelle**
- Toutes les tables ont-elles : `id UUID PRIMARY KEY`, `created_at`, `updated_at` ?
- Toutes les tables tenant ont-elles `company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE` ?
- Toutes les FK ont-elles des `ON DELETE` cohérents (CASCADE, RESTRICT, SET NULL) ?
- Tous les `CHECK CONSTRAINTS` métier sont-ils en place (montants positifs, devises valides, codes ISO) ?
- Toutes les colonnes monétaires utilisent-elles `NUMERIC(precision, scale)` cohérent ?
- Les colonnes de devise référencent-elles une table `currencies` ou utilisent un CHECK ISO-4217 ?

**3.2 — RLS et sécurité multi-tenant**
- TOUTES les tables tenant ont-elles `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` ?
- Chaque table tenant a-t-elle au minimum :
  - Politique SELECT : `company_id = get_user_company_id()`
  - Politique INSERT : `company_id = get_user_company_id()`
  - Politique UPDATE : `company_id = get_user_company_id()`
  - Politique DELETE : `company_id = get_user_company_id()` (ou refus selon le cas)
  - `project_admin_policy` pour admin global
- La fonction `get_user_company_id()` est-elle `SECURITY DEFINER` et bien définie ?
- Aucune table sensible n'est-elle accessible en `anon` ?
- Les buckets storage ont-ils des politiques RLS appliquées (`storage.objects` policies) ?

**3.3 — Audit trail**
- Toutes les tables critiques ont-elles un trigger `trg_audit_<table>` AFTER INSERT/UPDATE/DELETE → `log_audit_changes()` ?
- La table `audit_logs` capture-t-elle : `user_id`, `company_id`, `table_name`, `record_id`, `action`, `old_values JSONB`, `new_values JSONB`, `ip_address`, `user_agent`, `created_at` ?

**3.4 — Performance**
- Indexes présents sur toutes les FK ?
- Indexes composites sur colonnes filtrées fréquemment (ex: `(company_id, created_at)`, `(company_id, status)`) ?
- Indexes GIN sur colonnes JSONB recherchées ?
- Indexes partiels pour status fréquemment filtrés ?
- Pas de N+1 dans les requêtes Edge Functions ?

**3.5 — Conformité OHADA**
- Plan comptable OHADA SYSCOHADA présent (`accounts` avec hiérarchie 1-9) ?
- Journaux comptables (`journals`) avec types AC, BQ, OD, VE, etc. ?
- Écritures (`journal_entries`) en partie double équilibrée (CHECK contrainte SUM(debit) = SUM(credit)) ?
- Exercices comptables (`fiscal_periods`) avec gestion clôture ?

**3.6 — Tables wallet IA (PRD Infra IA)**
- Présence de : `ai_credit_packs`, `company_ai_credits`, `ai_credit_transactions`, `company_ai_quota_usage`, `ai_usage_logs`, `ai_models_default_routing`, `company_ai_task_routing`, `company_ai_credentials`, `pii_redaction_rules`, `ai_admin_settings` ?
- Chiffrement BYOK : `encrypted_api_key BYTEA`, `iv BYTEA`, `cipher_algo` corrects ?

**3.7 — Seeds**
- `ai_providers` (16 entrées), `ai_models` (~28), `ai_tasks` (38), `subscription_plans` (5) seedés ?
- `payment_providers` (84 entrées CEDEAO/UEMOA) seedés et marqués actifs/inactifs correctement ?
- Plan comptable OHADA seedé ?
- Devises seedées avec taux initiaux ?
- Pays CEDEAO/UEMOA seedés (15 pays) ?

**Livrables :**
- Liste exhaustive des tables avec statut RLS, audit, indexes
- Liste des **anomalies critiques** (sécurité, intégrité)
- Liste des **optimisations recommandées** (performance, indexes manquants)
- Scripts SQL de correction pour chaque anomalie détectée

---

### PHASE 4 — Audit des Edge Functions

**Objectif :** Vérifier sécurité, performance, gestion d'erreurs des fonctions backend.

**Actions :**
Pour CHAQUE Edge Function trouvée :

1. **Authentification** : vérification JWT obligatoire ? `get_user_company_id()` utilisé ? Bypass possible ?
2. **Validation des entrées** : schéma de validation (Zod, Yup) ? Sanitization ? Protection injection SQL ?
3. **Gestion d'erreurs** : try/catch global ? Réponses HTTP standardisées ? Pas de fuite d'info en prod ?
4. **Logs** : logging structuré (pas de `console.log` brut) ? `audit_logs` alimenté pour actions sensibles ?
5. **Idempotence** : Edge Functions modifiantes idempotentes (X-Idempotency-Key) ?
6. **Rate limiting** : protection contre abus ?
7. **Secrets** : aucune clé en clair ? Toutes via `Deno.env.get()` ?
8. **Timeouts** : timeouts appliqués sur appels externes (LiteLLM, Presidio, payment providers) ?
9. **Retries** : retries exponentiels pour appels critiques ?
10. **Conformité PRD** : la fonction fait-elle exactement ce qui est spécifié dans le PRD ?

**Fonctions critiques à auditer en priorité :**
- `ai-router` (orchestrateur IA, le plus critique)
- `credit-purchase-callback` (webhook paiement crédits IA)
- `payment-webhook-<provider>` (webhooks Mobile Money / Carte)
- Toute fonction touchant aux écritures comptables
- Toute fonction touchant aux exports fiscaux

**Livrables :**
- Tableau : `[Function | Auth | Validation | Errors | Logs | Idempotent | Rate Limit | Conformité PRD]`
- Vulnérabilités détectées avec sévérité (Critical / High / Medium / Low)
- Correctifs proposés pour chaque vulnérabilité

---

### PHASE 5 — Audit du frontend Quasar

**Objectif :** Cohérence UI, sécurité côté client, accessibilité, performance.

**Actions :**

**5.1 — Architecture**
- Structure Quasar respectée (`src/pages`, `src/components`, `src/stores`, `src/composables`, `src/boot`) ?
- Stores Pinia bien organisés (un store par domaine métier) ?
- Composables réutilisables pour logique partagée ?
- Routing avec lazy loading ?
- Layouts cohérents (auth, admin tenant, admin SaaS) ?

**5.2 — TypeScript strict**
- `strict: true` dans `tsconfig.json` ?
- Aucun `any` non justifié ?
- Types partagés frontend/backend (depuis schéma SQL) ?
- DTO d'entrée/sortie des Edge Functions typés ?

**5.3 — Sécurité côté client**
- Aucune clé secrète exposée dans le bundle (vérifier `import.meta.env` vs `VITE_PUBLIC_*`) ?
- JWT stocké en `httpOnly` cookie ou storage sécurisé ?
- Pas de XSS (v-html limité, sanitization via DOMPurify si HTML utilisateur) ?
- CSP headers configurés ?

**5.4 — UX et i18n**
- Composant pour chaque page documentée dans le PRD ?
- Internationalisation FR/EN/PT (Vue I18n) avec fichiers de traduction complets ?
- Formats date/montant/devise respectent la locale ?
- Messages d'erreur localisés ?
- States loading/empty/error gérés partout ?

**5.5 — Accessibilité**
- Attributs ARIA présents ?
- Navigation clavier fonctionnelle ?
- Contraste suffisant (WCAG AA minimum) ?
- Labels associés aux inputs ?

**5.6 — Performance**
- Lazy loading des routes ?
- Code splitting par module ?
- Bundle size raisonnable (< 500 KB initial gzipped) ?
- Images optimisées (WebP, lazy load) ?
- Pas de re-render inutiles (computed bien utilisés) ?

**5.7 — Conformité aux écrans PRD**
- Toutes les pages admin SaaS spécifiées dans PRD Infra IA §2.5 existent (10 pages) ?
- Toutes les pages tenant spécifiées dans PRD Infra IA §2.6 existent (5 pages) ?
- Toutes les pages métier (banque, factures, budgets, immobilisations, états...) existent ?

**Livrables :**
- Liste des pages/composants existants vs attendus
- Liste des anomalies UI/UX
- Liste des problèmes de sécurité client
- Suggestions d'optimisation performance

---

### PHASE 6 — Audit sécurité approfondi

**Objectif :** Garantir qu'aucune vulnérabilité critique n'est présente.

**Actions :**

**6.1 — OWASP Top 10**
- A01: Broken Access Control → RLS testée, pas de bypass
- A02: Cryptographic Failures → AES-256-GCM pour BYOK, TLS partout
- A03: Injection → Paramétrage des requêtes, sanitization
- A04: Insecure Design → Threat modeling effectué
- A05: Security Misconfiguration → Headers HTTP, CORS, secrets
- A06: Vulnerable Components → `npm audit`, dépendances à jour
- A07: Authentication Failures → MFA disponible, sessions sécurisées
- A08: Software/Data Integrity → SRI, lock files, signatures
- A09: Logging Failures → Tous événements sensibles loggés
- A10: SSRF → Validation URLs sortantes (Edge Functions)

**6.2 — Multi-tenant**
- Test : créer 2 companies, vérifier qu'aucune donnée n'est accessible cross-tenant via :
  - PostgREST direct (avec JWT tenant A vers data tenant B)
  - Edge Functions (manipulation de `company_id`)
  - Storage buckets (URLs signées)
  - Real-time subscriptions
- RLS doit bloquer 100% des tentatives

**6.3 — Gestion des secrets**
- Aucun secret en clair dans le repo ?
- Aucun secret committé historiquement (git log, BFG repo cleaner) ?
- Secrets dans variables d'environnement uniquement ?
- Rotation des secrets documentée ?

**6.4 — Chiffrement BYOK**
- Clés API client chiffrées AES-256-GCM ?
- IV unique par chiffrement ?
- Clé maître stockée séparément (KMS, secret manager) ?
- Décryptage uniquement dans Edge Function, jamais côté client ?

**6.5 — PII et RGPD**
- Données PII (noms, IFU, RIB, numéros) anonymisées avant envoi LLM externe ?
- Politique de rétention des données documentée ?
- Procédure de suppression compte / droit à l'oubli implémentée ?
- Export RGPD (portabilité) implémenté ?
- Consentements explicites pour traitement IA ?

**6.6 — Audit log**
- Tous les changements sensibles tracés ?
- Logs immutables (pas de UPDATE/DELETE sur `audit_logs`) ?
- Conservation conforme (durée minimale OHADA = 10 ans pour comptabilité) ?

**Livrables :**
- Scorecard OWASP avec status par item
- Liste des vulnérabilités détectées avec CVSS estimé
- Plan de remédiation priorisé

---

### PHASE 7 — Audit de l'infrastructure IA

**Objectif :** Vérifier que l'intégration IA est complète, sûre et économiquement viable.

**Actions :**

**7.1 — Edge Function `ai-router`**
- Implémente-t-elle exactement l'algorithme du PRD Infra IA §2.4 ?
- Les 3 sources de financement sont-elles gérées (quota / crédits / BYOK) ?
- Le fallback automatique entre modèles fonctionne ?
- PII redaction appelée pour les tâches qui le requièrent ?
- Logs `ai_usage_logs` alimentés à 100% (succès ET échecs) ?
- Estimation pré-appel pour éviter dépassements ?

**7.2 — Wallet crédits IA**
- Achat de packs fonctionnel end-to-end (Mobile Money / Carte → crédit du wallet) ?
- Transactions atomiques (pas de double crédit en cas de retry webhook) ?
- Historique consultable ?
- Notifications faible solde déclenchées ?

**7.3 — Quota mensuel**
- Reset le 1er du mois fonctionnel (cron job ou Edge Function planifiée) ?
- Calcul correct selon `subscription_plans.ai_monthly_cost_usd_cap` ?
- Affichage temps réel dans UI ?

**7.4 — BYOK**
- Saisie clé → chiffrement → validation par test API ?
- Override de routage par tâche fonctionnel ?
- Pas de fuite de clé dans logs ou erreurs ?

**7.5 — Observabilité Langfuse**
- LiteLLM configuré pour envoyer toutes les traces à Langfuse ?
- Metadata enrichie (`company_id`, `user_id`, `task_code`, `funding_source`) ?
- Dashboards Langfuse configurés pour suivi opérationnel ?

**7.6 — Conformité PII Presidio**
- Tâches sensibles ont `requires_pii_redaction = true` ?
- Règles `pii_redaction_rules` couvrent : PERSON, IBAN, RIB, PHONE_NUMBER, EMAIL, CREDIT_CARD, IFU, NIF ?
- Anonymisation testée sur cas réels (facture avec IFU Burkina, RIB Société Générale...) ?

**7.7 — Coût et marge**
- Calcul de coût par appel correct (modèle × tokens × prix unitaire à jour) ?
- Marge plateforme appliquée (`platform_margin_percent`) ?
- Reporting financier pour vous (admin SaaS) ?

**Livrables :**
- Test end-to-end de chaque flow IA documenté
- Anomalies fonctionnelles avec impact business
- Suggestions d'optimisation (cache, batching, modèles moins coûteux)

---

### PHASE 8 — Audit des intégrations paiement (EPIC 24)

**Objectif :** Vérifier la collecte universelle des paiements pour CEDEAO/UEMOA.

**Actions :**

**8.1 — Tables et seeds**
- `payment_providers` seedé avec 84 entrées (vérification au cas par cas) ?
- `payment_wallets`, `wallet_transactions`, `payment_evidences` créées ?
- `sms_parsing_patterns` avec regex par opérateur ?
- `file_mapping_templates` pour formats CSV bancaires ?

**8.2 — 6 canaux d'ingestion**
- API directe (webhooks providers) — testée ?
- Capture d'écran collée → OCR via `ingest_image_payment` → extraction → wallet
- Texte collé → `text_payment_extraction` → wallet
- Import PDF (relevé bancaire) → parse → wallet
- Import XLS/CSV → mapping template → wallet
- Import SMS (forwardé) → `sms_parsing` → wallet

**8.3 — Rapprochement**
- Algorithme de matching transactions wallet ↔ factures émises/reçues
- Suggestion IA via `reconciliation_suggestion`
- Batch processing via `reconciliation_batch`
- Interface validation manuelle

**8.4 — Multi-devise**
- Conversion automatique XOF ↔ USD ↔ EUR via `currency_rates` ?
- Taux mis à jour (source : BCEAO, API exchange rates) ?
- Gain/perte de change comptabilisé ?

**8.5 — Webhooks paiement**
- Signatures vérifiées (HMAC) pour chaque provider ?
- Idempotence sur `external_transaction_id` ?
- Gestion des doublons ?
- Retries handler côté provider ?

**Livrables :**
- Liste des providers fonctionnels / non testés / inactifs
- Test end-to-end pour au moins 3 providers majeurs (Orange Money, Wave, CinetPay)
- Anomalies critiques bloquant le go-live

---

### PHASE 9 — Audit des tests et de la qualité

**Objectif :** Mesurer la couverture de tests et la qualité du code.

**Actions :**

**9.1 — Couverture de tests**
- Tests unitaires : couverture en % (cible : > 70% sur logique métier)
- Tests d'intégration : Edge Functions testées avec mocks ?
- Tests E2E : parcours critiques couverts (login, factures, paiement, IA) ?
- Outils utilisés : Vitest, Playwright, Cypress ?

**9.2 — Qualité du code**
- Linter configuré (ESLint + Prettier) ?
- Pas de warnings de compilation ?
- Conventions de nommage respectées (snake_case SQL, camelCase TS) ?
- Code mort / commenté à supprimer ?
- Duplication de code (DRY) ?
- Complexité cyclomatique raisonnable ?

**9.3 — Documentation**
- README à jour ?
- Documentation API (Edge Functions) avec OpenAPI/Swagger ?
- Documentation utilisateur (aide en ligne) ?
- Diagrammes d'architecture à jour ?
- Changelog tenu ?

**9.4 — CI/CD**
- Pipeline CI configuré (lint, tests, build) ?
- Déploiement automatisé ?
- Vérification migrations SQL avant merge ?
- Tests E2E en pre-prod ?

**Livrables :**
- Rapport de couverture par module
- Liste des fichiers à refactoriser
- Plan d'amélioration documentation

---

### PHASE 10 — Audit conformité OHADA et fiscalité

**Objectif :** Garantir que le produit respecte les obligations comptables et fiscales des pays cibles.

**Actions :**

**10.1 — Plan comptable OHADA SYSCOHADA**
- Classes 1-9 complètes (Capital, Immo, Stocks, Tiers, Trésorerie, Charges, Produits, Spéciaux, Analytique) ?
- Comptes obligatoires SYSCOHADA présents ?
- Plan adaptable par tenant (sous-comptes personnalisés) ?

**10.2 — États financiers SYSCOHADA**
- Bilan (Actif / Passif) générable ?
- Compte de résultat générable ?
- TAFIRE (Tableau Financier des Ressources et Emplois) générable ?
- Annexes obligatoires ?

**10.3 — Déclarations fiscales par pays**
- TVA mensuelle/trimestrielle par pays (Burkina Faso 18%, Togo 18%, Côte d'Ivoire 18%, Sénégal 18%, Bénin 18%, Mali 18%, Niger 19%, Ghana 12.5%/15%, Nigeria 7.5%) ?
- BIC / IS par pays (taux variables) ?
- IRPP retenue à la source ?
- CFE / Patente ?
- Déclarations sociales (CNSS, CNAR) ?

**10.4 — Numérotation et obligations**
- Factures avec numérotation séquentielle conforme ?
- IFU/NIF/RCCM affichés ?
- Mentions légales obligatoires (TVA, ICD, etc.) ?

**10.5 — Archivage**
- Conservation 10 ans pour pièces comptables (OHADA) ?
- Format d'archive (PDF/A ou équivalent) ?
- Intégrité (hash, signature) ?

**Livrables :**
- Matrice de conformité par pays UEMOA/CEDEAO
- Manquants critiques bloquant la commercialisation
- Recommandations pour validation par expert-comptable local

---

### PHASE 11 — Synthèse et plan de remédiation

**Objectif :** Produire un rapport actionnable.

**Actions :**

1. **Tableau de bord exécutif** :
   - % global de complétude du projet
   - Top 10 risques critiques
   - Top 10 quick wins
   - Estimation effort pour atteindre 100%

2. **Plan de remédiation priorisé** :
   - P0 (bloquants go-live) : à corriger immédiatement
   - P1 (avant lancement commercial) : 2 semaines
   - P2 (post-lancement court terme) : 1 mois
   - P3 (amélioration continue) : long terme

3. **Roadmap recommandée** :
   - Sprint 1 (1 semaine) : ...
   - Sprint 2 (2 semaines) : ...
   - Sprint 3 (3 semaines) : ...

4. **Checklist go-live** :
   - [ ] Toutes les RLS testées
   - [ ] Tous les webhooks signature-vérifiés
   - [ ] Backup automatique configuré
   - [ ] Monitoring 24/7 actif
   - [ ] Documentation utilisateur livrée
   - [ ] Tests E2E passent à 100%
   - [ ] Pen test externe effectué
   - [ ] Validation expert-comptable obtenue
   - [ ] CGU/RGPD/Politique IA rédigées
   - [ ] Plan de support défini

**Livrables :**
- Rapport exécutif (max 2 pages)
- Plan détaillé (10-20 pages)
- Tickets actionnables (1 par anomalie) avec :
  - Titre
  - Description
  - Sévérité
  - Effort estimé (h/jours)
  - Critères d'acceptation
  - Dépendances

---

## 📤 FORMAT DU RAPPORT FINAL

Produis un fichier `/AUDIT_REPORT_WIMRUX_FINANCES_<YYYY-MM-DD>.md` structuré comme suit :

```markdown
# Rapport d'Audit — WIMRUX® Finances
**Date :** [JJ/MM/AAAA]
**Auditeur :** [Agent IA + Modèle]
**Version du code auditée :** [Commit SHA]
**Branche :** [main / develop]

## 📊 Synthèse Exécutive

### Score global de complétude : XX/100

| Catégorie | Score | Statut |
|---|---|---|
| Schéma BDD | XX% | 🟢 / 🟠 / 🔴 |
| Edge Functions | XX% | ... |
| Frontend Quasar | XX% | ... |
| Sécurité | XX% | ... |
| Infrastructure IA | XX% | ... |
| Paiements CEDEAO | XX% | ... |
| Tests | XX% | ... |
| Conformité OHADA | XX% | ... |
| Documentation | XX% | ... |

### Top 5 risques critiques
1. ...
2. ...

### Top 5 quick wins
1. ...
2. ...

---

## Phase 1 — Cartographie du projet
[contenu]

## Phase 2 — Couverture fonctionnelle
[contenu]

## Phase 3 — Audit BDD
[contenu]

## Phase 4 — Audit Edge Functions
[contenu]

## Phase 5 — Audit Frontend
[contenu]

## Phase 6 — Sécurité
[contenu]

## Phase 7 — Infrastructure IA
[contenu]

## Phase 8 — Paiements CEDEAO
[contenu]

## Phase 9 — Tests & Qualité
[contenu]

## Phase 10 — Conformité OHADA
[contenu]

## Phase 11 — Plan de remédiation
[contenu]

---

## 📎 Annexes

### Annexe A — Liste exhaustive des anomalies
| # | Sévérité | Phase | Composant | Description | Effort | Critères acceptation |
|---|---|---|---|---|---|---|
| 1 | 🔴 P0 | BDD | table X | ... | 2h | ... |
| ... |

### Annexe B — Scripts SQL de correction
[scripts]

### Annexe C — Patchs de code
[diffs]

### Annexe D — Tickets prêts pour import (JSON/CSV)
[liste]
```

---

## ⚖️ RÈGLES STRICTES (NON NÉGOCIABLES)

1. ❌ **N'invente JAMAIS** une fonctionnalité, une table, une fonction. Si tu n'es pas sûr → marque "À VÉRIFIER" et liste les questions à l'auteur.
2. ❌ **Ne dis JAMAIS "tout va bien"** sans avoir vérifié concrètement (montre les preuves : extraits de code, requêtes SQL, captures).
3. ✅ **Cite TOUJOURS** les chemins de fichiers, numéros de ligne, noms de tables, IDs d'EPIC pour chaque anomalie.
4. ✅ **Propose TOUJOURS** un correctif concret (code, SQL, migration) pour chaque anomalie identifiée.
5. ✅ **Priorise IMPITOYABLEMENT** : P0 (bloquant) > P1 (important) > P2 (souhaitable) > P3 (nice to have).
6. ✅ **Mesure l'effort** en heures-homme ou jours-homme réalistes.
7. ✅ **Lis l'INTÉGRALITÉ** des documents de référence avant de conclure.
8. ✅ **Vérifie les versions** : les PRD versionnés priment sur le code legacy.
9. ✅ **Identifie les contradictions** entre documents (cahier des charges vs PRD vs code) — c'est une catégorie d'anomalie à part entière.
10. ✅ **Sépare clairement** ce qui est WIMRUX Finances de ce qui appartient à WIMRUX Facturation.

---

## 🚨 ALERTES IMMÉDIATES (à signaler EN PREMIER avant tout audit)

Si tu détectes l'un de ces points, **arrête l'audit et alerte immédiatement** :

1. 🚨 Secrets exposés dans le repo (clés API, mots de passe en clair)
2. 🚨 RLS désactivée sur une table contenant des données tenant
3. 🚨 Possibilité d'accès cross-tenant (faille critique)
4. 🚨 Webhook paiement sans vérification de signature
5. 🚨 BYOK stocké en clair (pas chiffré)
6. 🚨 Données PII envoyées à un LLM externe sans anonymisation
7. 🚨 Migration SQL destructive non versionnée appliquée en production
8. 🚨 Dépendance critique avec CVE connue (CVSS > 7)
9. 🚨 Absence totale de sauvegarde
10. 🚨 Mélange du code WIMRUX Finances et WIMRUX Facturation

### 📊 Checklist de vérification rapide (état actuel)

Avant de démarrer l'audit complet, vérifie ces points immédiatement :

```sql
-- Vérification RLS tables critiques
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname IN ('company_ai_credits', 'company_ai_quota_usage', 'ai_credit_transactions', 
                  'company_ai_task_routing', 'company_ai_credentials', 'company_subscriptions');

-- Vérification abonnements companies existantes
SELECT c.id, c.name, cs.plan_id, cs.status 
FROM companies c 
LEFT JOIN company_subscriptions cs ON cs.company_id = c.id;

-- Vérification secrets marqués
SELECT key_name, is_secret FROM ai_admin_settings WHERE is_secret = true;
```

Si une table a `relrowsecurity = false` → 🚨 **Alerte P0 immédiate**
Si une company n'a pas de subscription → 🚨 **Alerte P0 immédiate**
Si les secrets ne sont pas marqués `is_secret = true` → 🚨 **Alerte P0 immédiate**

---

## 🎬 COMMANDE DE DÉMARRAGE

Pour démarrer l'audit, commence par :

1. **Confirmer la disponibilité** des 8 documents de référence (PHASE 0)
2. **Lister les 11 phases** que tu vas exécuter
3. **Demander accès** à : repo Git, base de données (read-only), variables d'environnement
4. **Estimer la durée** d'exécution (en heures de travail IA)
5. **Confirmer avec l'utilisateur** que tu peux commencer

Puis exécute les 11 phases méthodiquement, en sauvegardant les résultats partiels après chaque phase dans `/audit-results/phase-X.md`.

À la fin, consolide tout dans `/AUDIT_REPORT_WIMRUX_FINANCES_<date>.md` et **partage le fichier** à l'utilisateur.

---

## ✅ CRITÈRES DE FIN D'AUDIT

L'audit est terminé quand :

### Vérifications structurelles
- [ ] Les 11 phases ont été exécutées
- [ ] Chaque EPIC documenté a été vérifié (couverture 100%)
- [ ] Chaque table du schéma a été auditée
- [ ] Chaque Edge Function a été auditée
- [ ] Toutes les vulnérabilités OWASP Top 10 ont été testées
- [ ] Toutes les anomalies ont un ticket avec priorité, effort, correctif
- [ ] Le rapport est livré dans un fichier Markdown structuré
- [ ] Un plan de remédiation actionnable est fourni
- [ ] Un score de complétude /100 est calculé objectivement
- [ ] La checklist go-live est complète

### Vérifications post-sécurité (Mai 2026) — OBLIGATOIRES
- [ ] **RLS confirmée** sur les 6 tables AI tenant (`company_ai_credits`, `company_ai_quota_usage`, `ai_credit_transactions`, `company_ai_task_routing`, `company_ai_credentials`, `company_subscriptions`)
- [ ] **Abonnements vérifiés** — Toutes les companies ont un `company_subscriptions` actif
- [ ] **Secrets marqués** — Toutes les clés API dans `ai_admin_settings` ont `is_secret = true`
- [ ] **ai-router corrigé** — `funding_source` utilise les valeurs PRD (`platform_quota`/`platform_credits`/`byok`)
- [ ] **Pages UI créées** — `AiCreditsBuyPage.vue` et `AiUsagePage.vue` existent et sont routées
- [ ] **Types synchronisés** — Interfaces TypeScript alignées avec schéma DB réel (pas de `consumed_usd` vs `used_usd`)
- [ ] **Aucune régression** — Les corrections P0 n'ont pas cassé de fonctionnalités existantes

---

**Démarre maintenant en confirmant que tu as bien lu et compris l'intégralité de ce prompt, et que tu disposes des 8 documents de référence. N'hésite pas à poser des questions clarifiantes AVANT de commencer si nécessaire.**

🎯 Bonne chasse aux bugs et aux trous fonctionnels.
