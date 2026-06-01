# 05 — Edge Functions (Deno Runtime)

> Pattern obligatoire pour les fonctions serveless du projet. Toutes les erreurs passées sont consignées pour ne pas les reproduire.

---

## 🏗️ Architecture

### Répertoire des fonctions
```
ai_router_fn/
├── send-otp-whatsapp.ts   # Envoi OTP WhatsApp via Whapi.cloud
└── verify-otp.ts          # Vérification OTP en base
```

### Slugs InsForge (API URL)
- `send-otp-whatsapp` → `https://gfe4bd9y.functions.insforge.app/send-otp-whatsapp`
- `verify-otp` → `https://gfe4bd9y.functions.insforge.app/verify-otp`

---

## 📜 Pattern obligatoire (template)

```ts
// 1. Secrets au TOP du module — JAMAIS oublié
const INSFORGE_URL = Deno.env.get("INSFORGE_BASE_URL") ?? "";
const ANON_KEY     = Deno.env.get("ANON_KEY") ?? "";
const WHAPI_TOKEN  = Deno.env.get("WHAPI_TOKEN") ?? "";

// 2. CORS obligatoire
const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

// 3. Handler Deno
export default async function handler(req: Request): Promise<Response> {
  // Pre-flight CORS
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  // Auth
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

  try {
    // Logique métier ici
    return jsonResponse({ success: true });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: String(e) }, 500);
  }
}
```

---

## 🔄 Opérations base de données

### ❌ INTERDIT : utiliser `createClient` du SDK

```ts
// ❌ NE PAS FAIRE
import { createClient } from "npm:@insforge/sdk@latest";
const client = createClient({ baseUrl: INSFORGE_URL, anonKey: ANON_KEY });
await client.db.insert("otp_codes", [...]); // client.db === undefined → crash 500
```

### ✅ CORRECT : `fetch` direct vers PostgREST

```ts
// ✅ FAIRE
const dbRes = await fetch(`${INSFORGE_URL}/api/database/records/otp_codes`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "apikey": ANON_KEY,
    "Authorization": `Bearer ${token}`,
  },
  body: JSON.stringify([{ /* ... */ }]),
});

if (!dbRes.ok) {
  const detail = await dbRes.text();
  console.error("DB error:", detail);
  return jsonResponse({ error: "DB failed", detail }, 500);
}
```

---

## 🚀 Déploiement

### Commande
```powershell
# Cwd: C:\wamp64\www\wimrux_finances
npx @insforge/cli functions deploy <slug> --file ai_router_fn/<fichier>.ts
```

### Exemple
```powershell
npx @insforge/cli functions deploy send-otp-whatsapp --file ai_router_fn\send-otp-whatsapp.ts
```

### Vérification post-déploiement
```powershell
npx @insforge/cli functions code <slug>
```

---

## 🔥 Erreurs connues

| Erreur | Cause | Fix |
|:--|:--|:--|
| `ReferenceError: ANON_KEY is not defined` | Variable `ANON_KEY` utilisée sans être déclarée via `Deno.env.get()` | Déclarer au top du module |
| `client.db is undefined` | Utilisation de `createClient` du SDK dans Deno | Utiliser `fetch` direct |
| `401 (Unauthorized)` sur appel edge fn | Header `Authorization` Bearer mal formé | Vérifier `req.headers.get("Authorization")` |
| `500 (Internal Server Error)` sans message | Erreur non catchée dans le handler | Toujours `try/catch` + `console.error` |
| `502 Bad Gateway` | Whapi.cloud injoignable | Vérifier `WHAPI_TOKEN` + statut Whapi |

---

## 📝 Règles récapitulatives

1. **Secrets au top** — `Deno.env.get(...)` en haut du fichier.
2. **Pas de SDK InsForge** — Utiliser `fetch` pur vers `/api/database/records/...`.
3. **CORS toujours** — `OPTIONS` + headers `Access-Control-Allow-*`.
4. **Log des erreurs** — `console.error` pour débogage côté InsForge.
5. **Vérifier après deploy** — `functions code <slug>` pour confirmer le code.
