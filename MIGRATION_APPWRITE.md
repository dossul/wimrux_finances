# Migration InsForge → Appwrite - Guide Rapide

## ✅ Statut Actuel

### Phase 1: Serveur Appwrite ✅
- [x] WebSocket config fixé
- [x] Nginx SSL configuré
- [x] Appwrite 1.5.7 stable

### Phase 2: SDK Architecture ✅
- [x] `src/boot/appwrite.ts` - Client initialization
- [x] `src/services/appwrite-db.ts` - Database adapter
- [x] `src/services/appwrite-auth.ts` - Auth adapter  
- [x] `src/services/appwrite-storage.ts` - Storage adapter
- [x] `src/services/appwrite-realtime.ts` - Realtime adapter
- [x] `src/services/index.ts` - Centralized exports

### Phase 3: Stores Migration (En cours)
- [x] `src/stores/auth-store-appwrite.ts` - Auth store (Nouveau)
- [ ] `src/stores/company-store.ts` - À migrer
- [ ] 77+ composables - À migrer

### Phase 4: Collections Appwrite (À faire)
- [ ] Créer 8 collections core (companies, user_profiles, clients, suppliers, invoices, invoice_items, bank_accounts, bank_transactions)
- [ ] Créer 87+ collections restantes
- [ ] Configurer permissions
- [ ] Créer 5 buckets storage

---

## 🚀 Démarrage Rapide

### 1. Configurer les variables d'environnement

```bash
# Copier et éditer
cp .env.example .env.local

# Ajouter:
VITE_APPWRITE_ENDPOINT=https://appwrite.benga.live/v1
VITE_APPWRITE_PROJECT=6a29285200015cd421c7
VITE_APPWRITE_DATABASE=default
```

### 2. Installer le SDK

```bash
npm install appwrite
```

### 3. Créer les collections dans Appwrite Console

1. Ouvrir https://appwrite.benga.live/console
2. Aller dans **Database**
3. Créer une base de données nommée `default`
4. Pour chaque collection du fichier `create_collections.py`:
   - Créer la collection
   - Ajouter les attributs
   - Configurer les permissions: `read("users")`, `create("users")`, `update("users")`, `delete("users")`

### 4. Créer les buckets Storage

1. Aller dans **Storage**
2. Créer 5 buckets:
   - `invoice-pdfs`
   - `company-logos`  
   - `receipts`
   - `attachments`
   - `reports`

### 5. Basculer vers le nouveau auth store

Remplacer dans `src/stores/index.ts`:
```typescript
// AVANT
export { useAuthStore } from './auth-store';

// APRÈS  
export { useAuthStore } from './auth-store-appwrite';
```

---

## 📋 Mapping InsForge → Appwrite

### Auth
```typescript
// InsForge
import { insforge } from 'src/boot/insforge';
const { data, error } = await insforge.auth.signInWithPassword({ email, password });

// Appwrite
import { appwriteAuth } from 'src/services';
const { user, session, error } = await appwriteAuth.signIn(email, password);
```

### Database - SELECT
```typescript
// InsForge
const { data, error } = await insforge.db.from('companies').select('*').eq('id', id).single();

// Appwrite
import { appwriteDb } from 'src/services';
const { data, error } = await appwriteDb.from('companies').eq('id', id).single();
```

### Database - INSERT
```typescript
// InsForge
const { data, error } = await insforge.db.from('companies').insert({ name, ifu });

// Appwrite
import { ID } from 'appwrite';
const { data, error } = await appwriteDb.from('companies').insert({ 
  id: ID.unique(),
  name, 
  ifu 
});
```

### Database - UPDATE
```typescript
// InsForge
const { data, error } = await insforge.db.from('companies').update({ name }).eq('id', id);

// Appwrite
const { data, error } = await appwriteDb.from('companies').update(id, { name });
```

### Database - DELETE
```typescript
// InsForge
const { error } = await insforge.db.from('companies').delete().eq('id', id);

// Appwrite
const { error } = await appwriteDb.deleteById('companies', id);
```

### Storage - Upload
```typescript
// InsForge
const { data, error } = await insforge.storage.upload('invoices', file, file.name);

// Appwrite
import { appwriteStorage } from 'src/services';
const { data, error } = await appwriteStorage.upload('invoice-pdfs', file, file.name);
```

### Realtime
```typescript
// InsForge
const subscription = insforge.realtime.subscribe('companies', (payload) => {
  console.log('Change:', payload);
});

// Appwrite
import { appwriteRealtime } from 'src/services';
const sub = appwriteRealtime.subscribeToTable('companies', (response) => {
  console.log('Change:', response.payload);
});
// Cleanup: sub.unsubscribe();
```

---

## 🔧 Scripts de Migration

### Vérifier Appwrite
```bash
python c:/wamp64/www/mng_cntba/deploy/skills/appwrite_install/check_appwrite.py
```

### Créer collections
```bash
python c:/wamp64/www/mng_cntba/deploy/skills/appwrite_install/create_collections.py
```

### Fix WebSocket
```bash
python c:/wamp64/www/mng_cntba/deploy/skills/appwrite_ssl/fix_websocket.py
```

---

## ⚠️ Différences Clés

| Feature | InsForge/Supabase | Appwrite |
|---------|-------------------|----------|
| Auth users | Table `auth.users` | Built-in Account API |
| User ID | `user.id` | `account.$id` |
| Relations | Foreign keys | Document references (manual) |
| RLS | PostgreSQL RLS | Collection permissions |
| Realtime | `supabase.realtime` | `client.subscribe()` |
| Functions | Edge Functions | Appwrite Functions |
| Storage | Buckets + RLS | Buckets + permissions |

---

## 📁 Fichiers SDK Appwrite

```
src/
├── boot/
│   └── appwrite.ts              # Client init
├── services/
│   ├── index.ts                 # Exports centralisés
│   ├── appwrite-db.ts           # Database adapter
│   ├── appwrite-auth.ts         # Auth adapter
│   ├── appwrite-storage.ts      # Storage adapter
│   └── appwrite-realtime.ts     # Realtime adapter
└── stores/
    ├── auth-store.ts            # InsForge (legacy)
    └── auth-store-appwrite.ts    # Appwrite (nouveau)
```

---

## 🎯 Prochaines Étapes

1. **Créer les collections** dans Appwrite Console
2. **Migrer company-store.ts** (critique)
3. **Tester l'authentification**
4. **Migrer les composables** (par ordre d'usage)
5. **Migrer les données** (script d'export/import)

---

**Besoin d'aide ?** Voir les rapports dans `c:/wamp64/www/mng_cntba/deploy/`
