des arrivés sur la page d'acceuil
index-Rkwyub1B.js:2  POST https://gfe4bd9y.eu-central.insforge.app/api/auth/refresh 401 (Unauthorized)
request @ index-Rkwyub1B.js:2
post @ index-Rkwyub1B.js:2
getCurrentSession @ index-Rkwyub1B.js:2
await in getCurrentSession
c @ index-Rkwyub1B.js:3
C @ index-Rkwyub1B.js:2
vy @ index-Rkwyub1B.js:3
kb @ index-Rkwyub1B.js:3
await in kb
(anonymous) @ index-Rkwyub1B.js:3
Promise.then
(anonymous) @ index-Rkwyub1B.js:3
Promise.then
(anonymous) @ index-Rkwyub1B.js:3
index-Rkwyub1B.js:3 [Auth Store] Error loading session: InsForgeError: No refresh token provided
    at xf.fromApiError (index-Rkwyub1B.js:2:195504)
    at zv.request (index-Rkwyub1B.js:2:196886)
    at async Zv.getCurrentSession (index-Rkwyub1B.js:2:204455)
    at async Proxy.c (index-Rkwyub1B.js:3:17907)
    at async Array.vy (index-Rkwyub1B.js:3:7407)
    at async kb (index-Rkwyub1B.js:3:108788)


    des que je m'authentifie

    index-Rkwyub1B.js:2  GET https://gfe4bd9y.eu-central.insforge.app/api/database/records/invoices?select=id%2Creference%2Ctype%2Cstatus%2Ctotal_ttc&status=in.%28pending_validation%2Capproved%29&order=created_at.desc 404 (Not Found)
(anonymous) @ index-Rkwyub1B.js:2
then @ index-Rkwyub1B.js:2
index-Rkwyub1B.js:2  GET https://gfe4bd9y.eu-central.insforge.app/api/database/records/invoices?select=id%2Cstatus%2Ctotal_ttc%2Cclient_id%2Ccreated_at&created_at=gte.2025-05-27T09%3A59%3A44.906Z 404 (Not Found)

quand je clique sur  facture:

﻿
index-Rkwyub1B.js:2 
 GET https://gfe4bd9y.eu-central.insforge.app/api/database/records/invoices?select=*&order=created_at.desc 404 (Not Found)

---

## CORRECTIONS APPLIQUEES — 2026-06-14 (Session Playwright E2E)

### Test E2E Complet : 37/37 PASS
- Compte : test2@wimrux.app / WimruxAdmin2026!
- Fichier : `e2e/specs/test2-all-workflows.spec.ts`
- Couverture : 33 pages accessibles + 4 routes admin bloquees
- Screenshots : `e2e/screenshots/test2-workflows/`

### Bug 1 : `created_at` → `$createdAt` (FIXED)
**Erreur:** `AppwriteException: Invalid query: Attribute not found in schema: created_at`
**Cause:** Appwrite n'a pas d'attribut custom `created_at`. Le timestamp natif est `$createdAt`.
**Fix:** Script `scripts/fix-created-at.py` — 20+ fichiers corrigés.
**Fichiers touches:**
- `src/pages/IndexPage.vue`, `InvoicesListPage.vue`, `TreasuryPage.vue`
- `src/pages/settings/AiUsagePage.vue`, `AiCreditsBuyPage.vue`
- `src/composables/useSupport.ts`, `usePaymentCards.ts`, `useTaxDeclarations.ts`
- `src/stores/invoice-store-appwrite.ts`, `tax-store-appwrite.ts`, `wallet-store-appwrite.ts`
- `src/pages/admin/AdminKpiPage.vue`, `invoices/InvoiceEditorPage.vue`

### Bug 2 : Timestamps customs manquants (FIXED)
**Erreur:** `Attribute not found in schema: consented_at`, `requested_at`
**Cause:** Ces attributs n'existent pas dans le schema Appwrite.
**Fix:** Remplaces par `$createdAt` dans `src/composables/useRgpd.ts`

### Bug 3 : OR queries invalides (FIXED)
**Erreur:** `AppwriteException: Invalid query: Or queries require at least two queries`
**Cause:** `.in('status', ['val1', 'val2'])` generait `or([equal("status",["val1"]),equal("status",["val2"])])`
**Fix:** `src/services/appwrite-db.ts` — `.in()` utilise maintenant `Query.equal(column, values)` qui accepte un tableau natif.
```typescript
in(column: string, values: any[]): DbQueryBuilder {
  if (values.length === 0) return this;
  this.queries.push(Query.equal(column, values));
  return this;
}
```

### Bug 4 : queryOr protection tableau vide (FIXED)
**Fix dans `appwrite-db.ts`:**
```typescript
function queryOr(queries: string[]): string | null {
  if (queries.length === 0) return null;
  if (queries.length === 1) return queries[0]!;
  return `or([${queries.join(',')}])`;
}
```
`.or()` et `.in()` ignorent les tableaux vides.

### Deploiement
- Build : OK (0 erreur)
- Vercel deploy --prod : OK
- URL : https://www.wimrux.app

### Bug 5 : Dashboard CA = 0 / Graphique plat / Top 5 clients vide (FIXED)
**Cause racine :** Appwrite retourne `$createdAt` (propriété système) mais le code frontend utilisait `inv.created_at` (attribut custom inexistant). `new Date(undefined)` → `Invalid Date` → tous les filtres de date échouaient silencieusement.
**Fix :** `src/services/appwrite-db.ts` — ajout de `normalizeAppwriteDoc()` qui mappe `$createdAt` → `created_at`, `$updatedAt` → `updated_at`, `$id` → `id` pour chaque document retourné (list, get, insert, update). Transparent pour tout le code frontend.

### Bug 6 : Status "overdue" et "paid" non reconnus (FIXED)
**Erreur :** Les factures avec status `overdue` et `paid` s'affichaient sans label/color corrects.
**Fix :** 
- `src/types/index.ts` — ajout de `'overdue' | 'paid'` au type `InvoiceStatus`
- `src/pages/IndexPage.vue` — ajout aux mappings `STATUS_LABELS` et `STATUS_COLORS`
- `src/composables/useInvoiceWorkflow.ts` — ajout au `STATUS_CONFIG`

### Bug 7 : normalizeAppwriteDoc ne remplaçait pas null (FIXED)
**Erreur :** Quand `.select()` demande `created_at` (inexistant dans Appwrite), Appwrite retourne `null`. `normalizeAppwriteDoc` vérifiait seulement `=== undefined`, pas `=== null`. Donc `created_at` restait `null`.
**Fix :** `src/services/appwrite-db.ts` — `normalizeAppwriteDoc` utilise `!normalized.created_at` (falsy check) au lieu de `=== undefined`, ce qui capture `null`, `undefined`, et `''`.

### Bug 8 : .select() demande created_at inexistant (FIXED)
**Erreur :** Plusieurs `.select()` demandaient explicitement `created_at` qui n'existe pas dans Appwrite.
**Fix :** Retiré `created_at` des `.select()` dans :
- `src/pages/IndexPage.vue` (2 requêtes dashboard)
- `src/pages/invoices/InvoicesListPage.vue`
- `src/pages/banking/ReconciliationPage.vue`
`normalizeAppwriteDoc` ajoute `created_at` depuis `$createdAt` automatiquement après réception.

### Skills crees
- `/test-e2e-workflows` — Lancer les tests E2E complets
- `/fix-appwrite-queries` — Corriger les erreurs Appwrite courantes
- `/audit-console-errors` — Auditer les erreurs console depuis Playwright

---

## AUDIT APPWRITE — 2026-06-14 (SSH 167.86.69.104)

### ETAT DES CONTAINERS (18/18 UP)
- appwrite-main (Up 2 days)
- appwrite-mariadb (Up 4 days)
- appwrite-redis (Up 4 days)
- appwrite-realtime (Up 2 days)
- appwrite-executor (Up 2 hours, healthy)
- Tous les workers : databases, builds, deletes, certificates, functions, mails, messaging, migrations, webhooks, audits
- Schedulers : functions, messages
- Maintenance

### QUEUES REDIS (toutes a 0)
- v1-databases : 0
- v1-builds : 0
- v1-functions : 0
- v1-deletes : 0
- v1-mails : 0

### MIGRATION (rapport RAPPORT_2026-06-11_2031.md)
- Database wimrux_finances : OK
- 45 collections creees : OK
- 242 attributs available : OK
- 49 indexes : OK
- 13 buckets storage : OK
- 8/8 Edge Functions deployees et ready : OK

### RESSOURCES SYSTEME
- Disk : 338G total, 20G utilise (6%)
- RAM : 94G total, 6.1G utilise (excellent)
- Uptime : 4 jours, 17h

### PROBLEME IDENTIFIE (ROOT CAUSE)
Les logs appwrite-main montrent :
```
This domain is not connected to any Appwrite resource yet.
Please configure custom domain or function domain to allow this request.
```

Le domaine `https://wimruxapp.vercel.app` n'est PAS configure comme platform dans Appwrite Console.
C'est pourquoi toutes les requetes CORS sont bloquees.

### ACTION REQUISE
1. Se connecter a https://appwrite.benga.live/console
2. Project Settings -> Platforms -> Add Platform -> Web
3. Name : Wimrux Production
4. Hostname : wimruxapp.vercel.app
5. Sauvegarder