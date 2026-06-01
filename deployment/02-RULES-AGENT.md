# 02 — Règles strictes pour les agents (DO / DON'T)

> Lire avant toute édition de code. Objectif : éviter les bugs déjà commis.

---

## ✅ DO (obligatoire)

### Commandes (run_command)
- Toujours utiliser le paramètre `Cwd` pour spécifier le dossier de travail.
  - Frontend build/deploy : `C:\wamp64\www\wimrux_finances\wimrux_app`
  - Git commits : `C:\wamp64\www\wimrux_finances`
  - Edge functions deploy : `C:\wamp64\www\wimrux_finances`
  - SQL/DB queries : `C:\wamp64\www\wimrux_finances`
- Ne JAMAIS inclure `cd` dans la commande.

### Frontend (Quasar + Vue + TypeScript)
- Toujours typer les nouvelles colonnes dans `src/types/index.ts`.
- Toujours exposer les valeurs dans le store Pinia si utilisées par des composants.
- Toujours `npm run build` (cwd: `wimrux_app/`) pour vérifier que le build passe.
- Toujours `npm run lint` si le projet l'inclut.

### Base de données
- Toujours utiliser `npx @insforge/cli db query "..."` pour les SELECT/UPDATE.
- Toujours utiliser `IF NOT EXISTS` dans les `ALTER TABLE`.
- Toujours récupérer les nouvelles colonnes via `information_schema` après ALTER pour confirmer.

### Edge functions (Deno)
- Toujours déclarer `Deno.env.get("ANON_KEY")` (et autres secrets) au **top du module** :
  ```ts
  const ANON_KEY = Deno.env.get("ANON_KEY") ?? "";
  const WHAPI_TOKEN = Deno.env.get("WHAPI_TOKEN") ?? "";
  ```
- Toujours ajouter les headers CORS dans la réponse.
- Toujours gérer `OPTIONS` (pre-flight) avant le reste de la logique.
- Toujours retourner un `Response` JSON avec `Content-Type: application/json`.
- Toujours logger les erreurs (`console.error`) pour débogage.

### Déploiement
- Toujours `npm run build` AVANT `vercel deploy --prod --yes`.
- Toujours vérifier l'exit code 0 du build.

---

## ❌ DON'T (interdit)

### Général
- **Ne JAMAIS hardcoder de clés API** (`ik_...`, `ANON_KEY`, tokens, etc.) dans le code source.
- **Ne JAMAIS committer** `.env`, `node_modules`, `dist/` (vérifier `.gitignore`).
- **Ne JAMAIS utiliser `cd`** dans les commandes shell (utiliser `Cwd`).
- **Ne JAMAIS supprimer un fichier** sans confirmation explicite du user.

### Frontend
- **Ne JAMAIS upgrader Tailwind CSS à v4** — rester en 3.4. (`package.json` locké.)
- **Ne JAMAIS modifier `auth.users`** via API admin — utiliser SQL direct (`psql` ou CLI InsForge).

### Edge functions
- **Ne JAMAIS utiliser `createClient` du SDK InsForge** dans une edge function pour faire du CRUD DB. Le `client.db` est souvent undefined dans le runtime Deno.
- **Ne JAMAIS utiliser `edgeFunctionToken`** pour le SDK client dans une edge function — préférer le pattern `fetch` direct :
  ```ts
  // ✅ CORRECT
  const dbRes = await fetch(`${BASE_URL}/api/database/records/otp_codes`, {
    method: "POST",
    headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${token}`, ... },
  });

  // ❌ INTERDIT
  import { createClient } from "npm:@insforge/sdk@latest";
  const client = createClient({ baseUrl: BASE_URL, anonKey: ANON_KEY });
  await client.db.insert("otp_codes", [...]); // client.db === undefined → crash
  ```

### Base de données
- **Ne JAMAIS faire de `DROP TABLE`** sans backup.
- **Ne JAMAIS modifier une colonne existante** sans vérifier les dépendances dans le code.

---

## 🔴 Bugs connus à ne pas reproduire

| Bug | Cause | Solution |
|:--|:--|:--|
| `ReferenceError: ANON_KEY is not defined` | `ANON_KEY` utilisé sans `const ANON_KEY = Deno.env.get("ANON_KEY") ?? "";` au top du module | Toujours déclarer les variables en haut |
| `client.db is undefined` (edge fn) | `createClient` avec `edgeFunctionToken` au lieu de `anonKey` dans Deno | Ne PAS utiliser le SDK dans Deno, utiliser `fetch` |
| `401 (Unauthorized)` sur refresh | Token InsForge expiré, sessionStorage corrompu | auth-store purge storage et force reconnexion |
| `404 (Not Found)` sur `/api/database/records/invoices` | Table manquante ou nom incorrect | Vérifier `npx @insforge/cli db tables` |
| `npm run build` sans erreur mais deploy KO | Oubli du build avant deploy | Toujours build → puis deploy |

---

## 🔍 Checklist rapide avant toute intervention

```
□ 02-RULES-AGENT.md lu
□ Cwd correct dans toutes les commandes
□ Pas de secret hardcodé
□ Pas de cd dans les commandes
□ Pas de `createClient` dans edge functions
```
