# Rapport d'audit — WIMRUX Finances
**Date :** 2026-05-25  
**Type :** Audit live (DB InsForge + déploiements + code)  
**Périmètre :** Tout le projet wimrux_finances

---

## Synthèse exécutive

| Domaine | Statut | Score | Notes |
|---------|--------|-------|-------|
| **Backend InsForge (DB)** | ⚠️ Partiel | 75% | Tables OK, mais RLS désactivé sur tables AI critiques |
| **Edge Functions** | ✅ OK | 95% | 19 fonctions actives, ai-router v2 déployé |
| **Frontend Vue** | ⚠️ Partiel | 70% | Pages principales existent, pages crédits/historique manquantes |
| **Conformité PRD IA** | ⚠️ Partiel | 65% | Gap pages admin/tenant, chiffrement BYOK à valider |
| **Sécurité** | ❌ Critique | 40% | RLS OFF sur 6 tables tenant, secrets en clair dans ai_admin_settings |
| **Déploiements** | ✅ OK | 100% | Vercel + InsForge sync |

**Verdict global :** Le projet est fonctionnel en dev/staging mais **non prêt pour production** sans correction des gaps de sécurité (RLS) et complétion des pages IA manquantes.

---

## 1. Inventaire Backend InsForge

### 1.1 Tables AI (Sprint AI-1)

| Table | Existe | Lignes | RLS | Conformité PRD |
|-------|--------|--------|-----|----------------|
| `ai_credit_packs` | ✅ | 4 | ❌ OFF | ✅ Seeds S/M/L/XL OK |
| `ai_credit_transactions` | ✅ | 0 | ❌ OFF | ✅ Structure OK |
| `company_ai_credits` | ✅ | 4 | ❌ OFF | ✅ 4 companies = 4 rows |
| `company_ai_quota_usage` | ✅ | 4 | ❌ OFF | ✅ Quota $1/mois actif |
| `ai_usage_logs` | ✅ | 0 | ✅ ON | ✅ RLS OK avec 4 policies |
| `ai_tasks` | ✅ | 42 | ❌ OFF | ✅ 42 tâches seeded |
| `ai_models` | ✅ | 24 | ❌ OFF | ✅ 24 modèles seeded |
| `ai_providers` | ✅ | 16 | ❌ OFF | ✅ 16 providers seeded |
| `ai_models_default_routing` | ✅ | 40 | ❌ OFF | ✅ Mapping task→modèle |
| `pii_redaction_rules` | ✅ | 7 | ❌ OFF | ✅ 7 règles globales actives |
| `ai_admin_settings` | ✅ | 23 | ❌ OFF | ⚠️ Valeurs mixtes ulia/wimrux |
| `company_ai_task_routing` | ✅ | 0 | ❌ OFF | ✅ Structure OK |
| `company_ai_credentials` | ✅ | 0 | ❌ OFF | ✅ Structure OK |
| `company_subscriptions` | ✅ | 0 | ❌ OFF | ❌ **Aucun abonnement actif** |
| `subscription_plans` | ✅ | 5 | ❌ OFF | ✅ 5 plans seeded |

**🚨 CRITIQUE :** 6 tables AI avec données tenant n'ont **pas de RLS activé** :
- `company_ai_credits`, `company_ai_quota_usage`, `ai_credit_transactions`
- `company_ai_task_routing`, `company_ai_credentials`, `company_subscriptions`

### 1.2 Auto-provisioning (Workflow inscription)

| Étape | Statut | Preuve |
|-------|--------|--------|
| Trigger `trg_auto_provision_ai` | ✅ Existe | `EXECUTE FUNCTION auto_provision_ai_for_new_company()` |
| Création `company_ai_credits` | ✅ Fonctionne | 4 rows pour 4 companies |
| Création `company_ai_quota_usage` | ✅ Fonctionne | 4 rows (quota $1/mois) |
| Création `company_subscriptions` | ❌ **Bloqué** | 0 rows — trigger incomplet ou bypassé |

**Impact :** Les companies n'ont pas d'abonnement formel, donc le plan allowance check dans ai-router risque de fail-open (treat as free plan).

### 1.3 Seeds vérifiés

**ai_credit_packs (4 packs) :**
| Code | Crédit USD | Prix XOF | Prix USD |
|------|------------|----------|----------|
| pack_s | $5.00 | 3,000 | $5.50 |
| pack_m | $25.00 | 15,000 | $27.00 |
| pack_l | $90.00 | 50,000 | $90.00 |
| pack_xl | $300.00 | 150,000 | $270.00 |

**subscription_plans (5 plans) :**
| Code | Cap IA USD/mois | Quality Tiers | BYOK | Workflow |
|------|-----------------|---------------|------|----------|
| free | $0.50 | low,medium | ❌ | ❌ |
| starter | $5.00 | low,medium,high | ❌ | ❌ |
| pro | $30.00 | low,medium,high | ✅ | ❌ |
| business | $150.00 | low,medium,high,flagship | ✅ | ✅ |
| enterprise | $1000.00 | low,medium,high,flagship | ✅ | ✅ |

### 1.4 AI Admin Settings — Anomalie détectée

| Clé | Valeur actuelle | Valeur attendue (PRD) | Statut |
|-----|-----------------|----------------------|--------|
| `litellm_base_url` | `https://litellm.ulia.site/v1` | `https://litellm.wimrux.com` | ⚠️ **URL ulia** |
| `langfuse_host` | `https://langfuse.ulia.site` | `https://langfuse.wimrux.com` | ⚠️ **URL ulia** |
| `presidio_analyzer_url` | `https://presidio.ulia.site/analyze` | `https://presidio.wimrux.com` | ⚠️ **URL ulia** |
| `dify_base_url` | `https://dify.wimrux.com` | `https://dify.wimrux.com` | ✅ OK |
| `stirling_base_url` | `https://pdf.ulia.site` | `https://stirling.wimrux.com` | ⚠️ **URL ulia** |

**Explication :** Les services tournent sur les URLs `.ulia.site` (déjà déployés par l'opérateur). Les URLs `.wimrux.com` sont les cibles finales mais pas encore switchées.

### 1.5 Secrets exposés

🚨 **CRITIQUE :** La table `ai_admin_settings` contient des secrets en clair :
- `litellm_master_key` = `sk-litellm-ulia-AYyHSWIztLf28PFGNoKCM9T7Dnv1a6hgx5rkdw4lb0BmiJVE`
- `langfuse_secret_key` = `sk-lf-4204e0ac-86b4-426b-9bcc-534ac4445b18`
- `presidio_auth_header` = `Basic YWRtaW46UHJlc2lkaW9fVWxpYV8yMDI2IQ==`

**Impact :** Tout accès DB (même read-only) expose les clés maîtresses. Solution : utiliser `is_secret=true` + chiffrement ou mieux : secrets InsForge (non disponibles via DB).

---

## 2. Edge Functions (19 fonctions)

| Slug | Statut | Description | Audit |
|------|--------|-------------|-------|
| `ai-router` | ✅ active | Orchestrateur IA v2 | Déployé 2026-05-25 21:57 |
| `detect-anomalies` | ✅ active | Détection anomalies | OK |
| `cashflow-forecast` | ✅ active | Prévision trésorerie IA | OK |
| `nl-to-sql` | ✅ active | NL → SQL sécurisé | OK |
| `ingest-payment` | ✅ active | Orchestrateur paiements | OK |
| `ingest-image-payment` | ✅ active | OCR capture paiement | OK |
| `ingest-statement-file` | ✅ active | PDF/CSV → transactions | OK |
| `export-report` | ✅ active | Exports financiers | OK |
| `verify-tax-id` | ✅ active | Vérification IFU | OK |
| `crypto-aes256` | ✅ active | Chiffrement AES-256 | OK |
| `mcf-simulator` | ✅ active | Simul. certification MCF | OK |
| `fnec-simulator` | ✅ active | Simul. facturation FNEC | OK |
| `chatbot-gateway` | ✅ active | Gateway WhatsApp/Telegram | OK |
| `generate-device-key` | ✅ active | Clés devices certif. | OK |
| `device-heartbeat` | ✅ active | Heartbeat devices | OK |
| `push-certified-invoice` | ✅ active | Push facture certifiée | OK |
| `pull-pending-invoices` | ✅ active | Pull factures pending | OK |
| `parse-certified-invoice` | ✅ active | Parse OCR facture cert. | OK |
| `delete-user` | ✅ active | Suppression users | OK |

### 2.1 ai-router v2 — Audit détaillé

| Feature | Implémenté | Ligne(s) code |
|---------|------------|---------------|
| Authentification JWT | ✅ | `client.auth.getCurrentUser()` |
| Plan allowance check | ✅ | `checkPlanAllowance()` l. 237-260 |
| Quota → Credits → BYOK | ✅ | `resolveQuota()` l. 262-319 |
| PII redaction Presidio | ✅ | `redactPii()` l. 89-114 |
| BYOK skip PII | ✅ | `&& quota.funding_source !== "byok"` l. 476 |
| Workflow routing Dify | ✅ | `callDify()` l. 155-187 |
| Workflow routing Stirling | ✅ | `callWorkflow()` l. 189-224 |
| Fallback modèle | ✅ | l. 513-520 |
| Débit quota SQL | ✅ | `UPDATE company_ai_quota_usage` l. 341-345 |
| Débit crédits SQL | ✅ | `UPDATE company_ai_credits` l. 347-360 |
| Transaction crédits | ✅ | `INSERT ai_credit_transactions` l. 353-359 |
| Marge 20% | ✅ | `PLATFORM_MARGIN = 0.20` l. 69 |
| Langfuse trace | ✅ | `sendLangfuseTrace()` l. 116-162 |
| session_id | ✅ | Propagé l. 505, 566 |
| model_override | ✅ | `options.model_override` l. 489 |
| Error logging | ✅ | `ai_usage_logs` insert on error l. 524-534 |

**⚠️ Gap détecté :** Le PRD mentionne `funding_source: 'platform_quota' | 'platform_credits' | 'byok'` mais le code retourne `'quota' | 'credits' | 'byok'` (sans prefix 'platform_'). Incohérence mineure avec le schéma `ai_usage_logs.funding_source` qui attend les valeurs du PRD.

---

## 3. Frontend Vue — Pages IA

### 3.1 Pages existantes (routes.ts)

| Route | Fichier | Statut | PRD Ref |
|-------|---------|--------|---------|
| `/ai/ask` | `AiAskPage.vue` | ✅ | T15.2 Assistant IA |
| `/settings/ai/providers` | `AiProvidersPage.vue` | ✅ | T26.11 BYOK CRUD |
| `/settings/ai/routing` | `AiRoutingPage.vue` | ✅ | T26.12 Matrice routing |
| `/admin/ai-usage` | `AdminAiUsagePage.vue` | ✅ | Page 10 admin |

### 3.2 Pages manquantes (vs PRD 2.6)

| Route PRD | Description | Priorité |
|-----------|-------------|----------|
| `/settings/ai/usage` | Dashboard consommation tenant | **P1** |
| `/settings/ai/credits/buy` | Achat packs crédits | **P1** — Bloque monetization |
| `/settings/ai/byok` | Liste credentials BYOK (simplifié vs providers) | P2 |
| `/settings/ai/history` | Historique usage logs | P2 |
| `/admin/ai/dashboard` | KPI globaux SaaS | P2 |
| `/admin/ai/settings` | Config endpoints IA | P2 |
| `/admin/ai/providers` | CRUD providers (global) | P2 |
| `/admin/ai/models` | CRUD modèles (global) | P2 |
| `/admin/ai/tasks` | CRUD tâches (global) | P2 |
| `/admin/ai/default-routing` | Mapping task→modèle | P2 |
| `/admin/ai/credit-packs` | CRUD packs | P2 |
| `/admin/ai/subscription-plans` | CRUD plans | P2 |
| `/admin/ai/pii-rules` | Règles PII globales | P2 |
| `/admin/ai/tenants` | Vue tenant par tenant | P2 |

---

## 4. Conformité KANBAN vs Réalité

| Ticket KANBAN | Statut déclaré | Statut réel | Écart |
|---------------|----------------|-------------|-------|
| T26.6 ai-router | ✅ | ✅ Déployé v2 | ✅ OK |
| T26.11 /settings/ai/providers | ✅ | ✅ Existe | ✅ OK |
| T26.12 /settings/ai/routing | ✅ | ✅ Existe | ✅ OK |
| **Taches crédits** | — | ❌ Manquantes | **Non dans KANBAN** |
| **Taches admin IA** | — | ❌ Manquantes | **Non dans KANBAN** |

**Conclusion KANBAN :** Le KANBAN est à jour sur ce qui a été codé, mais ne reflète pas les gaps du PRD (pages crédits, admin IA) qui n'ont pas été planifiées comme tickets séparés.

---

## 5. Gaps prioritaires

### 🔴 P0 — Bloquant production

| ID | Problème | Impact | Action corrective |
|----|----------|--------|-------------------|
| **P0-1** | RLS désactivé sur `company_ai_credits`, `company_ai_quota_usage`, `ai_credit_transactions`, `company_ai_task_routing`, `company_ai_credentials` | Fuite de données cross-tenant possible | Activer RLS + créer policies `company_id = get_user_company_id()` |
| **P0-2** | Secrets en clair dans `ai_admin_settings` | Compromission clés maîtresses | Migrer vers InsForge Secrets ou chiffrer valeur avec `is_secret=true` |
| **P0-3** | `company_subscriptions` vide (0 rows) | Pas d'abonnement formel = plan allowance check fail-open | Vérifier trigger auto-provision ou créer abonnements manuellement pour les 4 companies existantes |

### 🟡 P1 — Important

| ID | Problème | Impact | Action corrective |
|----|----------|--------|-------------------|
| **P1-1** | Page `/settings/ai/credits/buy` manquante | Impossible d'acheter crédits = pas de revenus IA | Créer page achat packs avec flux paiement EPIC 24 |
| **P1-2** | Page `/settings/ai/usage` manquante | Tenant ne voit pas sa conso | Créer dashboard consommation avec jauge quota/crédits |
| **P1-3** | URLs ulia.site au lieu de wimrux.com | Incohérence branding | Migrer services ou updater `ai_admin_settings` quand VPS wimrux prêt |
| **P1-4** | `funding_source` values mismatch | Incohérence DB vs code | Aligner code ai-router sur valeurs PRD : `'platform_quota'`, `'platform_credits'` |

### 🟢 P2 — Amélioration

| ID | Problème | Action |
|----|----------|--------|
| **P2-1** | 10 pages admin IA manquantes | Planifier Sprint dédié ou créer tickets |
| **P2-2** | Page `/settings/ai/history` manquante | Liste paginée `ai_usage_logs` |
| **P2-3** | BYOK encryption non audité | Vérifier fonction `crypto-aes256` utilisée pour chiffrement clés |
| **P2-4** | Rate limiting ai-router | Implémenter limit 100 req/min par user_id |

---

## 6. Recommandations immédiates

### Actions à faire avant production (ordre)

1. **Activer RLS** sur les 6 tables AI tenant (migration SQL)
2. **Migrer secrets** hors de `ai_admin_settings` vers InsForge Secrets ou chiffrement AES-256
3. **Créer abonnements** pour les 4 companies existantes (`INSERT INTO company_subscriptions`)
4. **Développer page achat crédits** (`/settings/ai/credits/buy`) pour débloquer monetization
5. **Switcher URLs** vers wimrux.com quand VPS prêt

### Déploiements actifs

| Service | URL | Statut |
|---------|-----|--------|
| Frontend Vercel | `https://wimruxapp.vercel.app` | ✅ Production |
| Edge Functions | `https://gfe4bd9y.functions.insforge.app` | ✅ Actives |
| InsForge Project | `gfe4bd9y.eu-central.insforge.app` | ✅ OK |

---

## Annexes

### A. Tables DB avec RLS status

```sql
-- Tables avec RLS ON (sécurisées)
ai_usage_logs

-- Tables avec RLS OFF (non sécurisées)
ai_credit_packs, ai_credit_transactions, company_ai_credits, 
company_ai_quota_usage, company_ai_task_routing, company_ai_credentials,
ai_tasks, ai_models, ai_providers, ai_models_default_routing, 
pii_redaction_rules, ai_admin_settings, subscription_plans, companies
```

### B. Edge Functions déployées (preuve)

```json
[
  {"slug": "ai-router", "status": "active", "deployedAt": "2026-05-25T21:57:38.712Z"},
  {"slug": "detect-anomalies", "status": "active"},
  {"slug": "cashflow-forecast", "status": "active"},
  {"slug": "nl-to-sql", "status": "active"}
]
```

### C. Mapping task→modèle (Bloc 3) — Extrait

| Task Code | Modèle primaire | Fallback | PII |
|-----------|-----------------|----------|-----|
| assistant_fiscal | claude-sonnet-4.5 | gpt-4o-mini | ✅ |
| assistant_comptable | claude-sonnet-4.5 | gpt-4o-mini | ✅ |
| ocr_supplier_invoice | deepseek-chat | claude-haiku | ✅ |
| cashflow_forecast | claude-sonnet-4.5 | gpt-4o | ❌ |
| detection_fraude | claude-sonnet-4.5 | gpt-4o | ✅ |

### D. PII Redaction Rules actives

| Entité | Stratégie | Tâches concernées |
|--------|-----------|-------------------|
| PERSON | replace | ocr_supplier_invoice, ocr_bank_statement, compliance_check_invoice, kyc_risk_scoring, detection_fraude |
| EMAIL_ADDRESS | mask | ocr_supplier_invoice, email_payment_parsing, kyc_risk_scoring |
| PHONE_NUMBER | mask | ocr_supplier_invoice, ocr_payment_evidence, kyc_risk_scoring |
| IBAN_CODE | redact | ocr_bank_statement, reconciliation_suggestion, reconciliation_batch |
| NIF | replace | ocr_supplier_invoice, compliance_check_invoice, compliance_check_supplier |
| CREDIT_CARD | redact | ocr_payment_evidence, ingest_image_payment |

---

*Rapport généré automatiquement par audit live InsForge + code source.*
