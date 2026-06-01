# 04 — Base de données & Migrations

> Procédure pour créer des tables, colonnes, indexes et séquences sans casser la production.

---

## 🛠️ Outil principal : InsForge CLI

```bash
npx @insforge/cli db query "<SQL>"
```

**Cwd** : `C:\wamp64\www\wimrux_finances`

---

## 📝 Ajouter une nouvelle colonne

### 1. Exécuter le DDL

```sql
ALTER TABLE <table_name>
ADD COLUMN IF NOT EXISTS <column_name> <type> [DEFAULT <value>];
```

**Exemple (réel, utilisé pour `two_fa_enabled`) :**
```bash
npx @insforge/cli db query "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN NOT NULL DEFAULT true;"
```

### 2. Vérifier la création

```bash
npx @insforge/cli db query "SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name='<table_name>' AND column_name='<column_name>';"
```

### 3. Mettre à jour le code TypeScript

Dans `wimrux_app/src/types/index.ts` :
```ts
export interface <TableInterface> {
  ...
  <column_name>?: <type>;
}
```

**Exemple :**
```ts
export interface UserProfile {
  ...
  two_fa_enabled?: boolean;
}
```

### 4. Mettre à jour le store Pinia (si applicable)

Dans le store correspondant (ex: `auth-store.ts`) :
- Ajouter un `computed` si lu par les composants.
- Mettre à jour la méthode de sauvegarde (`UPDATE`) pour inclure la nouvelle colonne.

### 5. Mettre à jour le formulaire (si applicable)

Si la colonne doit être éditée dans l'interface, ajouter l'input/champ dans la page Vue correspondante.

---

## 🗂️ Tables clés du projet

| Table | Rôle |
|:--|:--|
| `auth.users` | Utilisateurs InsForge (lecture seule via API, modification via SQL) |
| `user_profiles` | Profil étendu (entreprise, role, phone, two_fa_enabled) |
| `companies` | Entreprises (société cliente SaaS) |
| `invoices` | Factures (FV, AV, NI, ...) |
| `clients` | Clients de l'entreprise |
| `products` | Produits/services |
| `otp_codes` | Codes OTP WhatsApp 2FA |
| `treasury_accounts` | Comptes bancaires/trésorerie |
| `treasury_movements` | Mouvements débit/crédit |
| `audit_log` | Journal d'audit (inaltérable) |
| `company_configs` | Config par entreprise (IFU, taxe, logo...) |

> Pour le schéma complet : `DB_SCHEMA_INSFORGE_WIMRUX.md` à la racine.

---

## 🔒 RLS (Row Level Security)

### Vérification post-migration (obligatoire)

```bash
npx @insforge/cli db query "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT LIKE 'pg_%';"
```

Puis vérifier que chaque table a des politiques RLS actives.

### Si une table n'a pas de RLS

Ajouter immédiatement des policies ou activer `ENABLE ROW LEVEL SECURITY`.

---

## ⚠️ Interdictions

| Action | Statut |
|:--|:--|
| `DROP TABLE` sans backup | ❌ INTERDIT |
| `ALTER TABLE` sans `IF NOT EXISTS` | ❌ INTERDIT |
| `DELETE FROM` sans `WHERE` | ❌ INTERDIT |
| Modifier une colonne existante sans vérifier les dépendances | ❌ INTERDIT |
| Ajouter une colonne sensible sans RLS | ❌ INTERDIT |

---

## 🔍 Récapitulatif workflow DB

```
1. Identifier la table
2. Écrire ALTER TABLE ... IF NOT EXISTS
3. Exécuter via InsForge CLI
4. Vérifier via information_schema
5. Mettre à jour src/types/index.ts
6. Mettre à jour le store Pinia
7. Mettre à jour le formulaire Vue (si éditable)
8. Build → Test → Deploy
```
