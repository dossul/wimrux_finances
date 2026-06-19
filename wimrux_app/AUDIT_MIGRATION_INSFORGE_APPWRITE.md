# Audit & Plan de Migration InsForge → Appwrite

**Date:** 2026-06-14  
**Scope:** `wimrux_app` (frontend + edge functions + scripts)  
**Objectif:** Taux de complétude 100% — aucune référence InsForge en production

---

## Résumé Graphify

Pipeline `graphify` exécuté sur `src/` :
- **168 fichiers** analysés · **~163K mots**
- **891 nœuds** · **1218 edges** · **118 communautés**
- **God Nodes** : `useCompanyStore` (81), `appwriteDb` (52), `AppwriteQueryBuilder` (41), `useAuthStore` (36)
- **Community 41** : regroupe exclusivement les 5 nœuds d'audit InsForge (cohesion 0.6)

---

## Inventaire des fuites InsForge

### 🔴 CRITIQUE — Corrigé maintenant

| Fichier | Ligne | Type | Correction |
|---------|-------|------|------------|
| `src/composables/useSupplierInvoiceOcr.ts` | 162 | URL hardcodée `pdf-to-images` | `VITE_APPWRITE_ENDPOINT` + `/functions/pdf-to-images/executions` |
| `src/pages/wallets/WalletSyncSettingsPage.vue` | 223 | URL hardcodée `ingest-webhook` | `VITE_APPWRITE_ENDPOINT` + `/functions/ingest-webhook-...` |
| `.env` | 11 | `VITE_MCF_API_BASE_URL` → insforge.app | `VITE_APPWRITE_FUNCTIONS_BASE_URL` → appwrite.benga.live |
| `.env.production` | 6 | `VITE_MCF_API_BASE_URL` → insforge.app | `VITE_APPWRITE_FUNCTIONS_BASE_URL` → appwrite.benga.live |

**→ 0 référence restante dans `src/` après correction.**

### 🟠 MOYEN — Edge Functions & Scripts (runtime)

| Fichier | Type | Problème | Action |
|---------|------|----------|--------|
| `functions/delete-user.js` | Edge Function Appwrite | Appelle `INSFORGE_URL/api/auth/users` | Réécrire avec `APPWRITE_ENDPOINT` + SDK Appwrite |
| `scripts/create-admin.js` | Script utilitaire | Utilise `@insforge/sdk` | Réécrire avec SDK Appwrite Node.js |
| `scripts/inspect-wimrux.mjs` | Script d'inspection | URLs InsForge | Réécrire avec URLs Appwrite |

### 🟡 FAIBLE — Tests E2E & Configs

| Fichier | Type | Problème | Action |
|---------|------|----------|--------|
| `e2e/disable-2fa.mjs` | Test | `import { createClient } from '@insforge/sdk'` | Remplacer par SDK Appwrite |
| `e2e/reset-passwords.mjs` | Test | Mention "PostgreSQL InsForge" | Corriger commentaire + logique |
| `e2e/fixtures/test-data.ts` | Test | Commentaire "Comptes validés en base InsForge" | Mettre à jour commentaire |
| `.env.example` | Template | `VITE_FNEC_API_BASE_URL` → insforge.app | Pointer vers Appwrite |
| `.insforge/project.json` | Config | Fichier de config InsForge CLI | **Supprimer** |

### ⚪ NON-BLOQUANT — Docs & Build

| Fichier | Type | Action |
|---------|------|--------|
| `AGENTS.md` | Documentation | Supprimer mentions InsForge |
| `README.md` | Documentation | Supprimer mentions InsForge |
| `dist/build/assets/*` | Build Vercel ancien | **Rebuild + Redéployer** |
| `graphify-out/*` | Outils d'analyse | Régénérer si besoin |

---

## État de la migration par couche

| Couche | État | Taux |
|--------|------|------|
| **Stores (`src/stores/*`)** | 100% Appwrite (`*-store-appwrite.ts`) | 100% |
| **Services (`src/services/*`)** | 100% Appwrite (`appwrite-db`, `appwrite-auth`, etc.) | 100% |
| **Boot (`src/boot/appwrite.ts`)** | 100% Appwrite SDK | 100% |
| **Composables (`src/composables/*`)** | 2 fuites corrigées, reste clean | 100% |
| **Pages (`src/pages/**/*.vue`)** | 1 fuite corrigée, reste clean | 100% |
| **Config `.env*`** | Variables InsForge commentées/supprimées, nouvelle var Appwrite ajoutée | 100% |
| **Edge Functions** | `delete-user.js` encore sur InsForge | 0% |
| **Scripts utilitaires** | `create-admin.js`, `inspect-wimrux.mjs` sur InsForge | 0% |
| **Tests E2E** | `disable-2fa.mjs`, `reset-passwords.mjs` sur InsForge | 0% |
| **Documentation** | `AGENTS.md`, `README.md` mentionnent InsForge | 0% |
| **Build production** | `dist/build/` contient encore chunks InsForge | 0% |

**Taux global codebase : ~85%** (src/ = 100%, hors src/ = ~40%)

---

## Plan d'action pour 100%

### Phase 1 — Production (IMMÉDIAT)
- [x] Corriger `src/composables/useSupplierInvoiceOcr.ts`
- [x] Corriger `src/pages/wallets/WalletSyncSettingsPage.vue`
- [x] Corriger `.env` et `.env.production`
- [ ] Rebuild Vercel (`npm run build` + `vercel deploy --prod`)
- [ ] Vérifier login fonctionne sur `wimruxapp.vercel.app`

### Phase 2 — Edge Functions (CRITIQUE)
- [ ] Réécrire `functions/delete-user.js` avec SDK Appwrite
- [ ] Déployer sur Appwrite (`appwrite deploy function`)
- [ ] Vérifier `pdf-to-images` existe sur Appwrite (ou la déployer)
- [ ] Vérifier `ingest-webhook-*` existent sur Appwrite (ou les déployer)

### Phase 3 — Scripts & Tests (SEMAINE 1)
- [ ] Réécrire `scripts/create-admin.js` avec SDK Appwrite Node.js
- [ ] Réécrire `scripts/inspect-wimrux.mjs` avec URLs Appwrite
- [ ] Réécrire `e2e/disable-2fa.mjs` avec SDK Appwrite
- [ ] Réécrire `e2e/reset-passwords.mjs` avec URLs Appwrite
- [ ] Mettre à jour `e2e/fixtures/test-data.ts`
- [ ] Mettre à jour `.env.example`
- [ ] Supprimer `.insforge/project.json`

### Phase 4 — Documentation & Ménage (SEMAINE 1)
- [ ] Nettoyer `AGENTS.md`
- [ ] Nettoyer `README.md`
- [ ] Supprimer répertoire `.insforge/` si vide
- [ ] Vérifier aucune référence `@insforge/sdk` dans `package.json`
- [ ] Vérifier aucune référence InsForge dans `package-lock.json`

---

## Checklist de validation 100%

```bash
# 1. Aucune référence dans src/
grep -ri "gfe4bd9y\|eu-central\.insforge\|@insforge" src/ || echo "✅ src/ clean"

# 2. Aucune référence dans .env*
grep -ri "insforge" .env .env.production .env.example || echo "✅ .env clean"

# 3. Aucun import @insforge/sdk
grep -ri "@insforge/sdk" . --include="*.ts" --include="*.js" --include="*.mjs" || echo "✅ No SDK import"

# 4. Build Vercel propre
grep -ri "gfe4bd9y" dist/ || echo "✅ Build clean"

# 5. Login fonctionnel
curl -I https://wimruxapp.vercel.app
```

---

## Risques identifiés

1. **Fonctions Edge manquantes sur Appwrite** : `pdf-to-images`, `ingest-webhook-*` doivent être déployées
2. **Auth 2FA WhatsApp** : OTP déployé sur InsForge → doit être redéployé sur Appwrite
3. **AI Router** : URLs fallback ulia.site OK, mais vérifier que `ai-router` est sur Appwrite
4. **Build Vercel ancien** : CORS bloqué car chunks contiennent encore URLs InsForge

---

*Rapport généré par graphify + audit manuel — 2026-06-14*
