---
description: Déployer wimrux_app sur Vercel (wimruxapp.vercel.app)
---

## Projet Vercel

- **Nom** : `wimrux_app`
- **URL production** : https://wimruxapp.vercel.app
- **Project ID** : `prj_7LlJLR5WSNjjwaxanJNPmhy2Gq8`
- **Org ID** : `team_03JxxUz0bxSyYnLhQ3TUJ3UW`
- **Fichier de lien** : `c:\wamp64\www\wimrux_finances\wimrux_app\.vercel\project.json`

## ⚠️ RÈGLES ABSOLUES — NE JAMAIS ENFREINDRE

1. **Ne JAMAIS déployer depuis `dist/spa`** — cela crée un nouveau projet "spa"
2. **Toujours déployer depuis `wimrux_app`** (le dossier source)
3. **Ne JAMAIS créer un nouveau projet Vercel** — le projet `wimrux_app` existe déjà
4. **Ne JAMAIS utiliser `npx vercel`** sans que `.vercel/project.json` soit correct

## Étapes de déploiement

1. Build du projet Quasar
// turbo
2. `npm run build` dans `wimrux_app`

3. Déployer sur Vercel
// turbo
4. `vercel deploy --prod --yes` dans `wimrux_app` (PAS dans `dist/spa`)

## Commandes exactes (copier-coller)

```powershell
# Étape 1 : Build
cd c:\wamp64\www\wimrux_finances\wimrux_app
npm run build

# Étape 2 : Deploy sur le bon projet
vercel deploy --prod --yes
```

## En cas d'erreur "Project deleted or no access"

Le `.vercel/project.json` dans `wimrux_app` doit contenir exactement :
```json
{"projectId":"prj_7LlJLR5WSNjjwaxanJNPmhy2Gq8","orgId":"team_03JxxUz0bxSyYnLhQ3TUJ3UW","projectName":"wimrux_app"}
```
