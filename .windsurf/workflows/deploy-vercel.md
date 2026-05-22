---
description: Push GitHub + déploiement Vercel production pour Wimrux Finance
---

# Déploiement Vercel — Wimrux Finance

## Contexte
- Repo GitHub : https://github.com/dossul/wimrux_finances
- URL production : https://wimruxapp.vercel.app
- Framework : Quasar (Vue 3 + Vite), dossier source : `wimrux_app/`
- Le webhook GitHub → Vercel déclenche un build automatique à chaque push sur `master`
- Le CLI Vercel permet un déploiement forcé sans attendre le webhook

## Étapes

### 1. Vérifier le build local (TypeScript)
// turbo
Run: npx vue-tsc --noEmit
Cwd: c:\wamp64\www\wimrux_finances\wimrux_app
Doit retourner exit code 0 et aucune erreur.

### 2. Commit les fichiers modifiés
Run: git add wimrux_app/src && git commit -m "feat: <description>"
Cwd: c:\wamp64\www\wimrux_finances
Adapter le message de commit à ce qui a été changé.

### 3. Push vers GitHub (déclenche Vercel automatiquement)
// turbo
Run: git push origin master
Cwd: c:\wamp64\www\wimrux_finances
Le webhook Vercel prend 1-3 minutes pour builder et déployer.

### 4. (Optionnel) Forcer le déploiement via CLI Vercel
Si le webhook n'a pas fonctionné ou pour un déploiement immédiat :
Run: npx vercel --prod --yes
Cwd: c:\wamp64\www\wimrux_finances\wimrux_app
NOTE : Si erreur "token expired", faire d'abord : npx vercel login

### 5. Vérifier le déploiement
Ouvrir https://wimruxapp.vercel.app et confirmer la version déployée.
Run: npx vercel ls 2>&1 | Select-Object -First 10
Cwd: c:\wamp64\www\wimrux_finances\wimrux_app
Compare le SHA affiché avec : git log --oneline -1

## Notes importantes
- Le token Vercel CLI est dans `C:\Users\lenovo\AppData\Roaming\com.vercel.cli\Data\auth.json`
- S'il est expiré, `npx vercel login` le renouvelle (navigateur s'ouvre)
- Le webhook GitHub suffit dans 99% des cas — le CLI est le plan B
- Ne PAS committer node_modules ni .env
