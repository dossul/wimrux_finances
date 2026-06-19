---
description: Corriger les erreurs Appwrite courantes (created_at, OR queries)
---

# Fix Erreurs Appwrite Courantes

Ce workflow corrige les erreurs 400 les plus fréquentes sur Appwrite 1.5.7.

## Erreur 1 : `created_at` → `$createdAt`

**Symptôme console:**
```
AppwriteException: Invalid query: Attribute not found in schema: created_at
```

**Cause:** Appwrite n'a pas d'attribut custom `created_at`. Le timestamp natif est `$createdAt`.

**Fix automatique:**

// turbo
```bash
cd c:\wamp64\www\wimrux_finances\wimrux_app
python scripts\fix-created-at.py
```

**Ce que le script corrige:**
- `.order('created_at'` → `.order('$createdAt'`
- `Query.orderDesc('created_at')` → `Query.orderDesc('$createdAt')`
- `Query.greaterThanEqual('created_at'` → `Query.greaterThanEqual('$createdAt'`
- `.gte('created_at'` / `.lte('created_at'` → `$createdAt`
- `consented_at`, `requested_at` → `$createdAt`

## Erreur 2 : OR queries invalides

**Symptôme console:**
```
AppwriteException: Invalid query: Or queries require at least two queries
```

**Cause:** La méthode `.in()` dans `appwrite-db.ts` générait `or([equal("status", ["val1"]), equal("status", ["val2"])])` qui est rejeté par Appwrite.

**Fix:** Utiliser `Query.equal(column, values)` qui accepte un tableau natif.

Vérifier que `src/services/appwrite-db.ts` contient :
```typescript
in(column: string, values: any[]): DbQueryBuilder {
  if (values.length === 0) return this;
  this.queries.push(Query.equal(column, values));
  return this;
}
```

**NOT:** `Query.equal("status", ["pending", "approved"])` → Appwrite traite ça comme IN.

## Erreur 3 : queryOr avec tableau vide

**Symptôme:** OR queries silencieusement invalides ou rejetées.

**Fix dans `appwrite-db.ts`:**
```typescript
function queryOr(queries: string[]): string | null {
  if (queries.length === 0) return null;
  if (queries.length === 1) return queries[0]!;
  return `or([${queries.join(',')}])`;
}
```

`.or()` et `.in()` doivent ignorer les tableaux vides.

## Rebuild & Deploy

// turbo
```bash
cd c:\wamp64\www\wimrux_finances\wimrux_app
npm run build
vercel deploy --prod --yes
```

## Vérification

Lancer le test E2E pour confirmer 0 erreur console :
```bash
npx playwright test specs/test2-all-workflows.spec.ts --grep "02" --reporter=list
```
