# 🗺️ Plan de Migration Appwrite — Wimrux Finances
> Objectif : **100% de complétion** · Créé : 2026-06-13T23:16Z

---

## État actuel : ~8% complété

Le projet est dans un état de migration partielle dangereuse :
- Appwrite Boot ✅ configuré
- Services Appwrite ✅ créés (`appwrite-db`, `appwrite-auth`, `appwrite-storage`, `appwrite-realtime`)
- Stores `-appwrite` ✅ créés mais **non utilisés** par 80% du code
- 85 fichiers pointent encore vers les anciens stores

---

## ❓ Appwrite 1.5.7 — Est-ce la meilleure version ?

### Réponse courte : **Non. La version 1.6.x est supérieure.**

| Critère | 1.5.7 (actuel) | 1.6.x (stable) |
|---------|---------------|----------------|
| **Statut** | EOL (fin de support prévu) | ✅ Active |
| **`createEmailSession`** | ✅ disponible | Déprécié → `createEmailPasswordSession()` |
| **Auth tokens** | Session cookie | Session cookie + OAuth amélioré |
| **Functions runtime** | Node.js 18 | Node.js 18, 21 + Bun |
| **WebSocket Realtime** | Présent (buggy SSL) | Amélioré + reconnexion auto |
| **Indexes DB** | Limité | Amélioré |
| **Breaking change ?** | Non → 1.6.x | Méthode `createEmailSession` → `createEmailPasswordSession` |

> [!WARNING]
> **`account.createEmailSession()` est déprécié en 1.6.x**. Si tu mets à jour, tu devras remplacer cette méthode dans `appwrite-auth.ts` (ligne 64 et 80).

> [!IMPORTANT]
> **Recommandation** : Reste sur **1.5.7** jusqu'à la fin de la migration des stores. Mets à jour vers 1.6.x ensuite — c'est un changement d'une seule ligne dans `appwrite-auth.ts`.

---

## Phase 1 — Fix immédiat : Stores (2h) ⚡

> Ces corrections débloqueront immédiatement la navigation et les pages.

### Action : Remplacement en masse des imports legacy

La correction est **identique** partout : changer 1 ou 2 lignes d'import.

**Règle** :
```
'src/stores/auth-store'    → 'src/stores/auth-store-appwrite'
'src/stores/company-store' → 'src/stores/company-store-appwrite'
'src/stores/invoice-store' → 'src/stores/invoice-store-appwrite'
```

#### Fichiers à corriger (par ordre de priorité) :

**Groupe A — Critique (navigation/layout) :**
1. `src/router/index.ts` — ligne 9
2. `src/layouts/MainLayout.vue` — lignes 122-123

**Groupe B — Auth pages :**
3. `src/pages/auth/RegisterPage.vue` — ligne 108
4. `src/pages/auth/ForgotPasswordPage.vue` — ligne 45

**Groupe C — 40 composables :**
- Voir liste complète dans `corrections_appwrite_log.md` (C15→C54)

**Groupe D — 18 pages métier :**
- Voir liste complète dans `corrections_appwrite_log.md` (C55→C72)

---

## Phase 2 — Déploiement Fonctions OTP (1h)

### 2.1 Créer la collection `otp_codes` dans Appwrite

Aller dans Appwrite Console → Database `wimrux_finances` → Créer collection :

| Attribut | Type | Requis |
|----------|------|--------|
| `phone` | String 20 | ✅ |
| `code` | String 6 | ✅ |
| `expires_at` | Datetime | ✅ |
| `used` | Boolean | ✅ (défaut: false) |
| `created_at` | Datetime | ✅ |

**Permissions** : Create/Read/Update → `users` (rôle Appwrite)

**Index** : `phone` (key index) + `expires_at` (key index)

### 2.2 Déployer les fonctions

```bash
# Dans la console Appwrite ou via CLI
appwrite functions create \
  --name "send-otp-whatsapp" \
  --runtime "node-18.0" \
  --entrypoint "index.js"

appwrite functions create \
  --name "verify-otp" \
  --runtime "node-18.0" \
  --entrypoint "index.js"
```

### 2.3 Configurer les secrets (Variables d'environnement)

Pour chaque fonction, dans Appwrite Console → Variables :

| Variable | Valeur |
|----------|--------|
| `WHAPI_TOKEN` | Token whapi.cloud |
| `WHAPI_CHANNEL_ID` | ID canal WhatsApp |
| `APPWRITE_DATABASE_ID` | `wimrux_finances` |
| `APPWRITE_API_KEY` | Clé API Appwrite (admin) |

### 2.4 Uploader le code

```bash
cd appwrite-functions/send-otp-whatsapp
npm install
zip -r ../send-otp-whatsapp.zip .

cd ../verify-otp
npm install
zip -r ../verify-otp.zip .
```

Puis uploader via Console → Functions → Deploy.

---

## Phase 3 — Vérification des Collections Appwrite (2h)

### 3.1 Collections nécessaires (à créer si manquantes)

Le code utilise ces tables via `appwriteDb.from(...)` — **toutes doivent exister** dans Appwrite Console :

| Collection | Critique | Utilisée par |
|-----------|---------|-------------|
| `companies` | 🔴 | Partout |
| `user_profiles` | 🔴 | Auth, permissions |
| `clients` | 🔴 | Factures |
| `suppliers` | 🔴 | Achats |
| `invoices` | 🔴 | Module principal |
| `invoice_items` | 🔴 | Éditeur factures |
| `invoice_payments` | 🔴 | Paiements |
| `bank_accounts` | 🟠 | Banque |
| `bank_transactions` | 🟠 | Trésorerie |
| `notifications` | 🟠 | Header |
| `notification_preferences` | 🟡 | Paramètres |
| `otp_codes` | 🔴 | 2FA WhatsApp |
| `articles` | 🟡 | Catalogue |
| `categories` | 🟡 | Classement |
| `tax_declarations` | 🟡 | Fiscal |
| `mobile_wallets` | 🟡 | Portefeuilles |
| `audit_log` | 🟡 | Traçabilité |
| `chatbot_conversations` | 🟡 | IA |
| `chatbot_messages` | 🟡 | IA |
| `ai_usage_logs` | 🟡 | IA |
| `company_ai_credits` | 🟡 | IA |

### 3.2 Permissions pour chaque collection

```
Read:   role:users
Create: role:users
Update: role:users
Delete: role:users
```

---

## Phase 4 — Nettoyage RPC (méthodes non supportées par Appwrite) (3h)

### Problème critique : `appwriteDb.rpc()` et `updateWhere()`

`useInvoiceWorkflow.ts` ligne 308 appelle :
```typescript
appwriteDb.rpc('next_invoice_reference', {...})
```

Appwrite n'a **pas de RPC PostgreSQL natif**. Cette logique doit être déplacée dans une **Appwrite Function**.

### Actions requises :

| # | Méthode legacy | Fichier | Solution Appwrite |
|---|---------------|---------|-------------------|
| R01 | `.rpc('next_invoice_reference')` | `useInvoiceWorkflow.ts:308` | Créer function `generate-invoice-ref` |
| R02 | `.updateWhere()` | `useNotifications.ts:104,121` | Remplacer par boucle ou function |
| R03 | `.select('*').order().limit()` | Nombreux | Vérifier que `appwrite-db.ts` les supporte |

### Créer la fonction `generate-invoice-ref`

```javascript
// appwrite-functions/generate-invoice-ref/index.js
// Génère le prochain numéro de référence de facture
// Ex: FV-2026-0042
export default async ({ req, res }) => {
  const { company_id, type, year } = JSON.parse(req.body);
  const databases = new Databases(client);
  
  // Compter les factures existantes du même type/année
  const existing = await databases.listDocuments(DB_ID, 'invoices', [
    Query.equal('company_id', company_id),
    Query.equal('type', type),
    Query.startsWith('reference', `${type}-${year}`),
    Query.orderDesc('reference'),
    Query.limit(1),
  ]);
  
  const nextNum = (existing.total + 1).toString().padStart(4, '0');
  return res.json({ reference: `${type}-${year}-${nextNum}` });
};
```

---

## Phase 5 — Mise à jour `appwrite-auth.ts` pour Appwrite 1.6.x (optionnel)

> À faire **après** stabilisation de la migration, si tu passes à 1.6.x

```typescript
// AVANT (1.5.7)
const session = await account.createEmailSession(email, password);

// APRÈS (1.6.x)
const session = await account.createEmailPasswordSession(email, password);
```

**Fichier** : `src/services/appwrite-auth.ts` — Lignes 64 et 80

---

## Phase 6 — Nettoyage et validation finale (1h)

### 6.1 Supprimer les fichiers legacy

```bash
rm src/stores/auth-store.ts
rm src/stores/company-store.ts
rm src/stores/invoice-store.ts
rm src/boot/insforge.ts
rm src/boot/token-refresh.ts
```

### 6.2 Validation

```bash
# Build complet
npm run build

# Vérifier zéro imports legacy
grep -r "from 'src/stores/auth-store'" src/ | grep -v appwrite
grep -r "from 'src/stores/company-store'" src/ | grep -v appwrite
grep -r "from 'src/stores/invoice-store'" src/ | grep -v appwrite
```

### 6.3 Tests E2E

```bash
npx playwright test e2e/
```

---

## Checklist 100% Complétion

```
Phase 1 — Stores
[ ] C08 router/index.ts
[ ] C09-C10 MainLayout.vue
[ ] C11-C12 Pages auth
[ ] C13-C14 InvoicesListPage
[ ] C15-C54 40 composables (auth + company-store)
[ ] C55-C72 18 pages métier

Phase 2 — OTP
[ ] C73 Collection otp_codes créée
[ ] C74 Fonction send-otp-whatsapp déployée
[ ] C75 Fonction verify-otp déployée
[ ] C76 Secrets configurés

Phase 3 — Collections
[ ] Toutes les 21 collections créées dans Appwrite Console
[ ] Permissions configurées

Phase 4 — RPC
[ ] R01 generate-invoice-ref function créée
[ ] R02 updateWhere() remplacé dans useNotifications
[ ] R03 Audit des queries builder

Phase 5 — Optionnel
[ ] Migration vers Appwrite 1.6.x (createEmailPasswordSession)

Phase 6 — Nettoyage
[ ] C77-C81 Fichiers legacy supprimés
[ ] Build sans erreurs
[ ] Tests E2E passants
```

---

## Estimation de temps total

| Phase | Durée estimée |
|-------|--------------|
| Phase 1 — Stores (imports) | 2h (répétitif) |
| Phase 2 — OTP déploiement | 1h |
| Phase 3 — Collections | 2-3h (manuel en console) |
| Phase 4 — RPC / logique | 3-4h |
| Phase 5 — Upgrade 1.6.x | 30min |
| Phase 6 — Nettoyage + tests | 1h |
| **Total** | **~10-11h de travail** |

> [!TIP]
> **La Phase 1 peut être automatisée** : un simple `Find & Replace` global dans VS Code sur tout le projet prend 5 minutes, pas 2h. Utilise : `Ctrl+Shift+H` → `from 'src/stores/auth-store'` → `from 'src/stores/auth-store-appwrite'` avec l'option "Fichiers .ts et .vue".
