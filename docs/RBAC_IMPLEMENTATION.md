# RBAC — Documentation Technique d'Implémentation

> WIMRUX® FINANCES — Système de Contrôle d'Accès Basé sur les Rôles (RBAC)
> Dernière mise à jour : 08/02/2026

---

## 1. Architecture Générale

Le RBAC de WIMRUX FINANCES repose sur **3 couches** :

```
┌─────────────────────────────────────────────────────────┐
│  COUCHE 1 — Rôles par défaut (code TypeScript)          │
│  DEFAULT_ROLE_PERMISSIONS dans src/types/index.ts       │
│  → Matrice statique, identique pour toutes les          │
│    entreprises, sert de base de référence               │
├─────────────────────────────────────────────────────────┤
│  COUCHE 2 — Surcharges entreprise (DB)                  │
│  Table company_role_permissions                         │
│  → Chaque entreprise peut activer/désactiver des        │
│    permissions pour un rôle donné                       │
├─────────────────────────────────────────────────────────┤
│  COUCHE 3 — Fusion multi-rôle (DB)                      │
│  Table user_role_assignments                            │
│  → Un utilisateur peut cumuler plusieurs rôles          │
│  → Les permissions finales = UNION de tous les rôles    │
└─────────────────────────────────────────────────────────┘
```

### Résolution des permissions (ordre de priorité)

1. `project_admin` → **toutes les permissions** (bypass total, réservé au SaaS WIMRUX)
2. `admin` → **toutes les permissions** (admin de l'entreprise cliente)
3. Pour tout autre rôle :
   - Collecter TOUS les rôles de l'utilisateur (primaire + assignés)
   - Pour chaque rôle, calculer les permissions effectives :
     - Partir des `DEFAULT_ROLE_PERMISSIONS`
     - Appliquer les surcharges de `company_role_permissions` (respecter `expires_at`)
   - Résultat final = **UNION** de toutes les permissions de tous les rôles

---

## 2. Rôles Disponibles

### 2.1 Rôles système

| Rôle | Description | Permissions |
|------|-------------|-------------|
| `project_admin` | Administrateur SaaS WIMRUX | Toutes (bypass) — ne peut JAMAIS être assigné à un client |
| `admin` | Administrateur de l'entreprise cliente | Toutes les 20 permissions |

### 2.2 Rôles métier (assignables par l'admin entreprise)

| Rôle | Description | Niveau |
|------|-------------|--------|
| `superviseur` | Chef comptable, validation, clôtures | Comptable |
| `comptable` | Écritures, saisie, rapprochements | Comptable |
| `tresorier` | Gestion comptes, virements, cash | Opérationnel |
| `caissier` | Saisie terrain, encaissements | Opérationnel |
| `manager` | Tableaux de bord, KPI — **lecture seule** | Pilotage |
| `auditeur` | Rapports, journal d'audit — **lecture seule** | Contrôle |
| `controleur` | Logs, anomalies, vérification — **lecture seule** | Contrôle |
| `consultant` | Accès externe temporaire, lecture limitée | Externe |

### 2.3 Type TypeScript

```typescript
// src/types/index.ts
export type UserRole =
  | 'admin'
  | 'superviseur'
  | 'comptable'
  | 'tresorier'
  | 'caissier'
  | 'manager'
  | 'auditeur'
  | 'controleur'
  | 'consultant'
  | 'project_admin';
```

---

## 3. Permissions Granulaires

### 3.1 Liste des 20 permissions

| Permission | Catégorie | Description | Icône |
|------------|-----------|-------------|-------|
| `dashboard.view` | Général | Voir le tableau de bord | dashboard |
| `invoices.create` | Facturation | Créer des factures | add_circle |
| `invoices.read` | Facturation | Consulter les factures | receipt_long |
| `invoices.submit` | Facturation | Soumettre pour validation | send |
| `invoices.approve` | Facturation | Approuver les factures | thumb_up |
| `invoices.validate` | Facturation | Valider définitivement | check_circle |
| `invoices.certify` | Facturation | Certifier via FNEC | verified |
| `clients.create` | Clients | Créer des clients | person_add |
| `clients.read` | Clients | Consulter les clients | people |
| `clients.update` | Clients | Modifier les clients | edit |
| `clients.delete` | Clients | Supprimer des clients | delete |
| `treasury.read` | Trésorerie | Consulter la trésorerie | account_balance |
| `treasury.create` | Trésorerie | Créer des mouvements | swap_horiz |
| `treasury.update` | Trésorerie | Modifier la trésorerie | edit |
| `reports.read` | Rapports | Consulter les rapports | assessment |
| `reports.fiscal` | Rapports | Rapports fiscaux | description |
| `audit.read` | Audit | Journal d'audit | history |
| `ai.use` | IA | Utiliser l'assistant IA | smart_toy |
| `settings.manage` | Administration | Gérer les paramètres | settings |
| `users.manage` | Administration | Gérer les utilisateurs | manage_accounts |

### 3.2 Matrice par défaut (avant surcharges)

| Permission | admin | superviseur | comptable | tresorier | caissier | manager | auditeur | controleur | consultant |
|------------|:-----:|:-----------:|:---------:|:---------:|:--------:|:-------:|:--------:|:----------:|:----------:|
| dashboard.view | X | X | X | X | X | X | X | X | X |
| invoices.create | X | — | X | — | X | — | — | — | — |
| invoices.read | X | X | X | X | X | X | X | X | X |
| invoices.submit | X | X | X | — | X | — | — | — | — |
| invoices.approve | X | X | — | — | — | — | — | — | — |
| invoices.validate | X | X | — | — | — | — | — | — | — |
| invoices.certify | X | X | — | — | — | — | — | — | — |
| clients.create | X | — | X | — | X | — | — | — | — |
| clients.read | X | X | X | — | X | X | — | X | X |
| clients.update | X | — | X | — | X | — | — | — | — |
| clients.delete | X | — | — | — | — | — | — | — | — |
| treasury.read | X | X | X | X | — | X | — | X | — |
| treasury.create | X | — | X | X | — | — | — | — | — |
| treasury.update | X | — | X | X | — | — | — | — | — |
| reports.read | X | X | X | X | — | X | X | X | X |
| reports.fiscal | X | X | X | — | — | X | — | X | X |
| audit.read | X | X | X | — | — | — | X | X | — |
| ai.use | X | X | X | X | X | — | X | — | — |
| settings.manage | X | — | — | — | — | — | — | — | — |
| users.manage | X | — | — | — | — | — | — | — | — |

---

## 4. Base de Données

### 4.1 Table `company_role_permissions`

Surcharges de permissions au niveau entreprise. Si un enregistrement existe, il **remplace** la valeur par défaut pour ce rôle + cette permission.

```sql
CREATE TABLE company_role_permissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  UUID NOT NULL REFERENCES companies(id),
  role        VARCHAR(50) NOT NULL,
  permission  VARCHAR(100) NOT NULL,
  granted     BOOLEAN NOT NULL DEFAULT true,
  expires_at  TIMESTAMPTZ,
  granted_by  VARCHAR(255),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id, role, permission)
);
```

**RLS** :
- `crp_company_select` — tout utilisateur de la même entreprise peut lire
- `crp_company_admin_all` — seul l'admin de l'entreprise peut INSERT/UPDATE/DELETE
- `crp_project_admin` — le project_admin a accès total (bypass)

### 4.2 Table `user_role_assignments`

Rôles supplémentaires assignés à un utilisateur (fusion multi-rôle).

```sql
CREATE TABLE user_role_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     VARCHAR(255) NOT NULL,
  company_id  UUID NOT NULL REFERENCES companies(id),
  role        VARCHAR(50) NOT NULL,
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  assigned_by VARCHAR(255),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ,
  UNIQUE (user_id, company_id, role)
);
```

**RLS** :
- `ura_company_select` — tout utilisateur de la même entreprise peut lire
- `ura_company_admin_all` — seul l'admin de l'entreprise peut INSERT/UPDATE/DELETE
- `ura_project_admin` — le project_admin a accès total (bypass)

### 4.3 Table `user_profiles` (existante)

Le rôle **primaire** de l'utilisateur est stocké dans `user_profiles.role` (VARCHAR(20)).

```sql
-- Colonnes pertinentes :
user_id     VARCHAR(255) -- FK vers auth.users.id
company_id  UUID         -- FK vers companies.id
role        VARCHAR(20)  -- Rôle primaire
full_name   VARCHAR(255)
```

---

## 5. Composable `usePermissions`

**Fichier** : `src/composables/usePermissions.ts`

### 5.1 État partagé (module-level)

```typescript
const companyOverrides = ref<CompanyRolePermission[]>([]);
const userRoleAssignments = ref<UserRoleAssignment[]>([]);
```

Ces refs sont **partagées** entre toutes les instances du composable (module-level, pas instance-level). Cela évite les requêtes redondantes.

### 5.2 Fonctions principales

| Fonction | Description |
|----------|-------------|
| `setContext(role, userId, companyId, fullName)` | Appelée par `auth-store` après le chargement du profil |
| `loadCompanyPermissions()` | Charge `company_role_permissions` + `user_role_assignments` depuis la DB |
| `getEffectivePermissions(role)` | Calcule les permissions effectives d'un rôle (défauts + surcharges entreprise) |
| `getUserEffectivePermissions(userId, primaryRole)` | UNION de toutes les permissions de tous les rôles d'un utilisateur |
| `hasPermission(p)` | Vérifie si l'utilisateur courant a une permission donnée |
| `hasAnyPermission(ps)` | Vérifie si l'utilisateur a au moins UNE des permissions |
| `hasAllPermissions(ps)` | Vérifie si l'utilisateur a TOUTES les permissions |

### 5.3 Fonctions admin

| Fonction | Description |
|----------|-------------|
| `bulkSetPermissions(role, perms)` | Upsert en masse des surcharges pour un rôle donné |
| `resetRoleToDefaults(role)` | Supprime toutes les surcharges d'un rôle (retour aux défauts) |
| `assignRole(userId, role, expiresAt?)` | Assigne un rôle supplémentaire à un utilisateur |
| `revokeRole(userId, role)` | Retire un rôle supplémentaire |
| `getAssignmentsForUser(userId)` | Liste toutes les assignations d'un utilisateur |

---

## 6. Intégration dans l'Application

### 6.1 Auth Store (`src/stores/auth-store.ts`)

```typescript
import { usePermissions } from 'src/composables/usePermissions';

const permissions = usePermissions();

// Après chargement du profil :
permissions.setContext(
  profile.value.role,
  user.value.id,
  profile.value.company_id,
  profile.value.full_name,
);
await permissions.loadCompanyPermissions();

// API exposée :
function hasPermission(p: Permission): boolean { ... }
function hasAnyPermission(ps: Permission[]): boolean { ... }
```

### 6.2 Router Guard (`src/router/index.ts`)

Les routes utilisent `meta.permissions` au lieu de `meta.roles` :

```typescript
{
  path: 'invoices',
  name: 'invoices',
  component: () => import('pages/invoices/InvoicesListPage.vue'),
  meta: {
    title: 'Factures',
    permissions: ['invoices.read'],
  },
}
```

Le guard vérifie `hasAnyPermission` en priorité, avec fallback sur `hasAnyRole` pour compatibilité legacy.

### 6.3 MainLayout Navigation (`src/layouts/MainLayout.vue`)

Chaque item de navigation déclare ses permissions requises :

```typescript
const navItems = [
  { label: 'Tableau de bord', icon: 'dashboard', to: '/app', permissions: ['dashboard.view'] },
  { label: 'Factures', icon: 'receipt_long', to: '/app/invoices', permissions: ['invoices.read'] },
  // ...
];

function canAccess(item): boolean {
  return authStore.hasAnyPermission(item.permissions);
}
```

### 6.4 Dans les composants (usage type)

```vue
<template>
  <!-- Masquer un bouton si pas la permission -->
  <q-btn v-if="authStore.hasPermission('invoices.create')" label="Nouvelle facture" />

  <!-- Désactiver un champ si lecture seule -->
  <q-input :disable="!authStore.hasPermission('clients.update')" />
</template>
```

---

## 7. UI de Gestion — Paramètres > RBAC

Accessible dans **Paramètres → onglet "RBAC / Permissions"** (rôle `admin` requis).

### 7.1 Matrice de permissions

- **Sélecteur de rôle** : dropdown avec les 8 rôles métier
- **Grille** : chaque permission est affichée avec :
  - Un **toggle** (activer/désactiver)
  - Un champ **date d'expiration** optionnel (permission temporaire)
- **Enregistrer** : upsert en masse dans `company_role_permissions`
- **Réinitialiser** : supprime toutes les surcharges du rôle sélectionné

### 7.2 Gestion des utilisateurs

- **Tableau** : nom, rôle principal (badge couleur), rôles cumulés (badges outline), date de création
- **Créer un utilisateur** : dialog avec nom, email, mot de passe, sélection du rôle
  - Crée le compte auth via `insforge.auth.signUp()`
  - Crée le profil dans `user_profiles` avec `company_id` de l'admin courant
- **Ajouter un rôle cumulé** : dialog pour assigner un rôle supplémentaire avec expiration optionnelle
- **Retirer un rôle** : bouton ✕ sur chaque badge de rôle cumulé, avec confirmation

### 7.3 Fonctionnement de la fusion multi-rôle

Exemple : un utilisateur avec le rôle primaire `comptable` reçoit également le rôle `tresorier`.

```
Permissions comptable    = { dashboard.view, invoices.create, invoices.read, invoices.submit,
                             clients.create, clients.read, clients.update,
                             treasury.read, treasury.create, treasury.update,
                             reports.read, reports.fiscal, audit.read, ai.use }

Permissions tresorier    = { dashboard.view, invoices.read,
                             treasury.read, treasury.create, treasury.update,
                             reports.read, ai.use }

UNION (permissions réelles) = comptable ∪ tresorier
                            = { dashboard.view, invoices.create, invoices.read, invoices.submit,
                                clients.create, clients.read, clients.update,
                                treasury.read, treasury.create, treasury.update,
                                reports.read, reports.fiscal, audit.read, ai.use }
```

> Les rôles se **cumulent**, jamais ne se soustraient. Un rôle supplémentaire ne peut qu'**ajouter** des permissions.

---

## 8. Workflow de Facturation et Séparation des Pouvoirs

### 8.1 Cycle de vie de la facture

```
draft → pending_validation → approved → validated → certified
                           ↘ draft (rejet)
```

| Transition | Permission requise | Rôles par défaut |
|------------|-------------------|------------------|
| `draft` → `pending_validation` | `invoices.submit` | caissier, comptable, superviseur |
| `pending_validation` → `approved` | `invoices.approve` | superviseur, admin |
| `pending_validation` → `draft` (rejet) | `invoices.approve` | superviseur, admin |
| `approved` → `validated` | `invoices.validate` | superviseur, admin |
| `validated` → `certified` | `invoices.certify` | superviseur, admin |

### 8.2 Règle anti-fraude

> **Celui qui soumet NE PEUT PAS approuver sa propre facture.**

Le composable `useInvoiceWorkflow` vérifie `submitted_by !== currentUser` avant d'autoriser l'approbation.

---

## 9. Fichiers Clés

| Fichier | Rôle |
|---------|------|
| `src/types/index.ts` (lignes 1-168) | Types `UserRole`, `Permission`, `ALL_PERMISSIONS`, `DEFAULT_ROLE_PERMISSIONS`, `CompanyRolePermission`, `UserRoleAssignment` |
| `src/composables/usePermissions.ts` | Composable RBAC : résolution des permissions, fonctions admin |
| `src/stores/auth-store.ts` | Intégration auth : `hasPermission()`, `hasAnyPermission()` |
| `src/pages/settings/SettingsPage.vue` (onglet RBAC) | UI de gestion : matrice, utilisateurs, multi-rôle |
| `src/router/routes.ts` | Routes avec `meta.permissions` |
| `src/layouts/MainLayout.vue` | Navigation conditionnelle par permissions |

---

## 10. Sécurité et Principes

1. **Isolation par entreprise** — Toutes les tables sont protégées par RLS via `get_user_company_id()`. Un admin ne peut gérer que les permissions et utilisateurs de **sa propre entreprise**.

2. **project_admin bypass** — Le rôle `project_admin` contourne toutes les vérifications. Il ne doit **jamais** être assigné à un client.

3. **admin non modifiable** — Le rôle `admin` a toujours toutes les permissions. Les surcharges entreprise ne s'appliquent pas à l'admin.

4. **Permissions temporaires** — Toute surcharge ou assignation de rôle peut avoir une date d'expiration (`expires_at`). Les permissions expirées sont ignorées automatiquement lors de la résolution.

5. **Cumul additif** — La fusion multi-rôle est strictement additive (UNION). Un rôle supplémentaire ne peut jamais **retirer** une permission du rôle primaire.

6. **Séparation des pouvoirs** — Le workflow de facturation garantit qu'au minimum 2 personnes distinctes interviennent entre la création et la certification.

7. **Audit** — Toutes les modifications de permissions et d'assignations sont tracées par les triggers d'audit existants (`audit_log`).

---

*Document technique — WIMRUX® FINANCES SaaS — Février 2026*
