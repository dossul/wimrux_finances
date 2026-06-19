---
description: Auditer les erreurs console Appwrite depuis Playwright MCP
---

# Audit Erreurs Console Appwrite

Ce workflow utilise Playwright pour capturer les erreurs console de l'application en production et identifier les bugs Appwrite.

## Lancer l'audit

// turbo
```bash
cd c:\wamp64\www\wimrux_finances\wimrux_app
npx playwright test specs/test2-all-workflows.spec.ts --reporter=list 2>&1 | tee audit-log.txt
```

## Patterns d'erreurs à rechercher

// turbo
```powershell
cd c:\wamp64\www\wimrux_finances\wimrux_app
Select-String -Path audit-log.txt -Pattern "AppwriteException|Invalid query|Attribute not found|Or queries require"
```

## Erreurs connues et leurs fixes

| Erreur | Fix | Fichier |
|--------|-----|---------|
| `Attribute not found: created_at` | Remplacer par `$createdAt` | `scripts/fix-created-at.py` |
| `Or queries require at least two queries` | `.in()` → `Query.equal(col, array)` | `src/services/appwrite-db.ts` |
| `Attribute not found: consented_at` | Remplacer par `$createdAt` | `src/composables/useRgpd.ts` |
| `Attribute not found: requested_at` | Remplacer par `$createdAt` | `src/composables/useRgpd.ts` |

## Inspection rapide via navigateur

```bash
cd c:\wamp64\www\wimrux_finances\wimrux_app
node scripts\inspect-wimrux.mjs
```

Ce script crawle les routes, capture les erreurs console et les références Appwrite.

## Déployer après correction

// turbo
```bash
cd c:\wamp64\www\wimrux_finances\wimrux_app
npm run build
vercel deploy --prod --yes
```

## Règles Appwrite 1.5.7

- `required: true` + `default` interdit → choisir l'un ou l'autre
- `maximumFileSize` dans buckets → ne pas passer si `_APP_STORAGE_LIMIT=0`
- Indexes à créer APRÈS que attrs soient `available`
- `.equal()` accepte un tableau pour IN semantics (pas besoin de `or()`)
- Timestamps natifs: `$createdAt`, `$updatedAt` (pas `created_at`, `updated_at`)
