# 01 — Stack & Infrastructure

> Toutes les URLs, IDs, clés et secrets utilisés par le projet.

---

## 🏗️ Stack technique

### Frontend
| Composant | Version | Rôle |
|:--|:--|:--|
| **Quasar Framework** | 2.18.6 | Framework UI |
| **Vue** | 3.x | Reactive framework |
| **Vite** | 7.3.1 | Bundler |
| **TypeScript** | strict | Typage |
| **Pinia** | latest | State management |
| **Vue Router** | 4 | Routing (history mode) |
| **@insforge/sdk** | latest | Client backend |
| **Tailwind CSS** | **3.4 (NE PAS UPGRADE en v4)** | Utility CSS |

### Backend
| Composant | Détails |
|:--|:--|
| **InsForge** | BaaS (PostgreSQL + PostgREST + Edge Functions Deno + Storage) |
| **Région** | `eu-central` |
| **Auth** | Email/password + JWT + refresh tokens |
| **Storage** | Bucket `invoices-pdf` (privé) |

### Hosting frontend
| Plateforme | Vercel |
|:--|:--|
| **URL prod** | https://wimruxapp.vercel.app |
| **Alias custom** | https://www.wimrux.app |
| **Repo GitHub** | https://github.com/dossul/wimrux_finances |
| **Branche prod** | `master` |
| **Webhook** | Push `master` → build auto Vercel |

### Hosting edge functions
| Plateforme | InsForge |
|:--|:--|
| **Runtime** | Deno |
| **Base URL** | `https://<slug>.functions.insforge.app` |

---

## 🔐 Identifiants infra

> **Ne JAMAIS hardcoder ces valeurs dans le code.** Utiliser `.env` (frontend) ou les secrets InsForge (edge functions).

### InsForge Project
| Paramètre | Valeur |
|:--|:--|
| **Project ID** | `0feefe21-1489-41b5-a2b6-3c44593ec819` |
| **API Key (admin)** | `ik_1358be6dcbccff7c0d6636b011559406` |
| **Base URL API** | `https://gfe4bd9y.eu-central.insforge.app` |
| **DB Host** | `gfe4bd9y.eu-central.database.insforge.app` |
| **DB Port** | `5432` |
| **DB Name** | `insforge` |
| **DB User** | `postgres` |
| **DB Password** | `290c65e488556b72e1136ce0c6278319` |
| **DB SSL** | requis (`?sslmode=require`) |

### Anon Key (frontend public)
Récupérable via :
```bash
npx @insforge/cli backend metadata
```
Variable d'environnement frontend : `VITE_INSFORGE_ANON_KEY`

---

## 🔑 Secrets edge functions

Configurés dans le dashboard InsForge → Edge Functions → Secrets :

| Secret | Usage |
|:--|:--|
| `ANON_KEY` | Header `apikey` PostgREST |
| `INSFORGE_BASE_URL` | URL base API InsForge |
| `WHAPI_TOKEN` | Token Whapi.cloud pour WhatsApp |

**Récupération dans le code Deno :**
```ts
const ANON_KEY = Deno.env.get("ANON_KEY") ?? "";
```

---

## 📁 Arborescence projet

```
wimrux_finances/                # Racine repo Git
├── wimrux_app/                 # App Quasar (frontend)
│   ├── src/
│   │   ├── pages/              # Pages routées
│   │   ├── stores/             # Pinia stores
│   │   ├── types/              # TypeScript types
│   │   └── boot/               # Init Quasar (insforge client)
│   ├── package.json
│   ├── quasar.config.js
│   └── .env                    # NON committé
├── ai_router_fn/               # Edge functions Deno
│   ├── send-otp-whatsapp.ts
│   └── verify-otp.ts
├── migrations/                 # Scripts SQL/migrations
├── deployment/                 # 👈 Ce dossier
├── docs/                       # Docs métier
├── AGENTS.md                   # Règles SDK
└── .env                        # NON committé
```

---

## 🌐 Endpoints publics utilisés

| Service | URL |
|:--|:--|
| InsForge REST DB | `${BASE_URL}/api/database/records/<table>` |
| InsForge Auth | `${BASE_URL}/api/auth/*` |
| InsForge Storage | `${BASE_URL}/api/storage/*` |
| Edge fn `send-otp-whatsapp` | `https://gfe4bd9y.functions.insforge.app/send-otp-whatsapp` |
| Edge fn `verify-otp` | `https://gfe4bd9y.functions.insforge.app/verify-otp` |
| Whapi.cloud | `https://gate.whapi.cloud/messages/text` |

---

## 📧 Comptes de test (dev/staging uniquement)

Voir `CREDENTIALS_WIMRUX.md` à la racine.

| Email | Mot de passe | WhatsApp 2FA |
|:--|:--|:--|
| `admin@wimrux.app` | `WimruxAdmin2026!` | +226 65 59 91 95 |
| `test1@wimrux.app` | `WimruxAdmin2026!` | +226 65 75 10 89 |
| `test2@wimrux.app` | `WimruxAdmin2026!` | +226 75 53 25 39 |
