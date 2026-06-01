# 03 — Workflow Développement → Déploiement

> Procédure obligatoire pour toute modification livrée en production.

---

## 🧑‍💻 Phase 1 : Développement

### 1.1 Type de modification

| Type de modif | Fichier(s) à consulter avant |
|:--|:--|
| Code frontend (Vue, TS, store) | `02-RULES-AGENT.md`, `01-STACK-ET-INFRA.md` |
| Base de données (colonne, table) | `04-DATABASE-MIGRATIONS.md`, `DB_SCHEMA_INSFORGE_WIMRUX.md` |
| Edge function (Deno) | `05-EDGE-FUNCTIONS.md` |
| Déploiement frontend | Ce fichier, `06-E2E-CHECKLIST-PROD.md` |

### 1.2 Vérification avant build (si modification TS)

```powershell
# Cwd: C:\wamp64\www\wimrux_finances\wimrux_app
npx vue-tsc --noEmit
# Doit retourner exit code 0 et aucune erreur.
```

---

## 🏗️ Phase 2 : Build local

```powershell
# Cwd: C:\wamp64\www\wimrux_finances\wimrux_app
npm run build
```

### Résultat attendu
- `Build succeeded` en vert
- Output folder : `dist/build/`
- Aucune erreur TypeScript

### Si le build échoue
1. Lire le message d'erreur
2. Corriger le code source
3. Relancer `npm run build`
4. NE PAS déployer si le build a des erreurs

---

## 📦 Phase 3 : Commit & Push

```powershell
# Cwd: C:\wamp64\www\wimrux_finances
git add .
git commit -m "feat: <description claire>"
git push origin master
```

Le push sur `master` déclenche automatiquement le build Vercel via webhook.

---

## 🚀 Phase 4 : Déploiement Vercel

### Option A — Webhook automatique (recommandé)
1. Push `master` → Vercel build auto (1-3 min)
2. Vérifier l'URL : https://wimruxapp.vercel.app

### Option B — CLI Vercel (déploiement forcé)
```powershell
# Cwd: C:\wamp64\www\wimrux_finances\wimrux_app
vercel deploy --prod --yes
```

> Si token expiré : `vercel login` puis `vercel deploy --prod --yes`

### Option C — Workflow personnalisé (si `.windsurf/workflows/deploy-vercel.md` défini)
Voir `docs/DEPLOY_VERCEL.md` pour la procédure historique complète.

---

## 🧪 Phase 5 : Vérification post-déploiement (obligatoire)

| Vérification | URL / Action |
|:--|:--|
| Page accessible | Ouvrir https://wimruxapp.vercel.app |
| Login fonctionnel | Se connecter avec un compte test |
| Landing page OK | Vérifier navbar, boutons, démo |
| Page `/settings` | Vérifier chargement des données |
| Aucune 404 dans console | F12 → Console |
| Aucune 401 sur refresh | F12 → Network → refresh page |

---

## 🗺️ Synthèse visuelle

```
Édition code
      ↓
Build local (npm run build) → exit 0 ?
      │ non → corriger
      ↓ oui
Commit + Push master
      ↓
Vercel build auto (ou CLI)
      ↓
Vérification post-déploiement
      ↓
Si mise en prod : E2E checklist (06)
```

---

## 🛠️ Commandes récapitulatives

```powershell
# Build + déploiement rapide (frontend)
# Cwd: C:\wamp64\www\wimrux_finances\wimrux_app
npm run build
vercel deploy --prod --yes

# Edge function deploy
# Cwd: C:\wamp64\www\wimrux_finances
npx @insforge/cli functions deploy <slug> --file ai_router_fn/<file>.ts

# Vérifier une edge function
npx @insforge/cli functions code <slug>

# DB query
npx @insforge/cli db query "SELECT ..."

# Liste tables
npx @insforge/cli db tables
```
