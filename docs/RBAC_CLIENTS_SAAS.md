# RBAC des Clients SaaS — WIMRUX FINANCES

> Document de conception. Aucune implémentation n'est faite ici.
> Objectif : définir la structure des rôles pour les entreprises clientes du SaaS.

---

## 1. Contexte

WIMRUX FINANCES est un SaaS multi-tenant. Chaque entreprise cliente dispose de ses propres utilisateurs, isolés par `company_id` + RLS. Le **project_admin** (WIMRUX SaaS) gère les entreprises et crée les premiers comptes. Ensuite, l'**admin** de chaque entreprise gère ses propres utilisateurs.

La séparation des pouvoirs est un impératif :
> **Jamais la même personne ne doit créer, valider, payer et auditer dans le même workflow.**

---

## 2. Rôles — Vue d'ensemble

### Niveau Opérationnel

| Rôle | Description |
|---|---|
| **Caissier** | Saisie terrain, encaissements, décaissements simples, reçus |
| **Trésorier** | Gestion comptes bancaires, virements, rapprochements, prévisions cash |

### Niveau Comptable

| Rôle | Description |
|---|---|
| **Comptable** | Écritures, journaux, rapprochements comptables |
| **Superviseur** | Validation écritures, clôtures mensuelles, supervision comptes, corrections contrôlées |

### Niveau Pilotage

| Rôle | Description |
|---|---|
| **Manager** | Tableau de bord, KPI, résultats, cash-flow, exports — **lecture seule, pas d'édition** |

### Niveau Contrôle

| Rôle | Description |
|---|---|
| **Auditeur** | Lecture transversale : rapports, journal d'audit, historiques |
| **Contrôleur** | Journaux d'audit, logs utilisateurs, alertes anomalies, vérification procédures |

### Niveau Système

| Rôle | Description |
|---|---|
| **Admin** | Paramétrage entreprise, gestion utilisateurs/droits, configuration SFE, chatbot |
| **Consultant** | Accès externe temporaire, lecture limitée, export contrôlé, période définie |

---

## 3. Matrice d'accès détaillée

Légende : **C** = Créer, **L** = Lire, **M** = Modifier, **V** = Valider, **E** = Exporter, **S** = Supprimer

| Module | Admin | Superviseur | Comptable | Trésorier | Caissier | Manager | Auditeur | Contrôleur | Consultant |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Tableau de bord** | CLME | LME | LE | LE | L | LE | LE | LE | LE |
| **Factures** | CLMVES | CLMVE | CLME | L | CLE | LE | L | L | LE |
| **Clients** | CLMS | CLM | L | — | CL | L | L | L | L |
| **Trésorerie** | CLMVES | CLMVE | L | CLMVE | — | LE | L | L | LE |
| **Rapports** | LE | LE | LE | LE | — | LE | LE | LE | LE |
| **Rapports fiscaux** | LE | LE | LE | — | — | LE | — | L | LE |
| **Journal d'audit** | L | L | L | — | — | L | L | L | L |
| **Assistant IA** | L | L | L | L | L | L | L | L | — |
| **Suivi IA** | L | — | — | — | — | — | — | — | — |
| **Chatbot API** | CLMS | — | — | — | — | — | — | — | — |
| **Paramètres** | CLM | — | — | — | — | — | — | — | — |
| **Gestion utilisateurs** | CLMS | — | — | — | — | — | — | — | — |

---

## 4. Hiérarchie logique

```
Caissier --> Comptable --> Superviseur --> Admin
    |             |
Trésorier    Contrôleur

Manager = pilotage transversal (lecture seule)
Auditeur = contrôle transversal (lecture seule)
Consultant = accès externe temporaire (lecture limitée)
```

---

## 5. Rôles implémentés

| Rôle | Statut |
|---|---|
| `admin` | Implémenté |
| `superviseur` | Implémenté |
| `comptable` | Implémenté |
| `tresorier` | Implémenté |
| `caissier` | Implémenté |
| `manager` | Implémenté |
| `auditeur` | Implémenté |
| `controleur` | Implémenté |
| `consultant` | Implémenté |
| `project_admin` | Implémenté (SaaS uniquement) |

---

## 6. Workflow de validation — Cycle de vie de la facture

### 6.1 États de la facture

```
Brouillon (draft)
  → Soumise pour validation (pending_validation)     [Caissier, Comptable]
    → Approuvée (approved)                            [Superviseur, Admin]
    → Rejetée → retour Brouillon (draft)              [Superviseur, Admin]
      → Validée (validated)                           [Superviseur, Admin]
        → Certifiée FNEC (certified)                  [Système / Admin]
```

### 6.2 Étapes détaillées

| # | Étape | Qui agit | Actions |
|---|---|---|---|
| 1 | **Création brouillon** | Caissier, Comptable | Saisie lignes, client, mode prix, commentaires |
| 2 | **Soumission pour validation** | Caissier, Comptable | Enregistre le brouillon puis le soumet (status → `pending_validation`) |
| 3 | **Contrôle comptable / fiscal** | Comptable | Vérifie cohérence comptes, TVA, PSVB, totaux |
| 4 | **Approbation** | Superviseur, Admin | Approuve (→ `approved`) ou rejette avec motif (→ `draft`) |
| 5 | **Validation définitive** | Superviseur, Admin | Verrouille la facture (→ `validated`), point de non-retour |
| 6 | **Certification FNEC** | Système (API SFE) | Envoi au SFE, réception N° fiscal, QR code, signature (→ `certified`) |
| 7 | **Envoi au client** | Caissier, Front-office | PDF, email, portail |
| 8 | **Archivage + audit** | Auditeur, Contrôleur | Lecture seule, vérification logs |

### 6.3 Règle anti-fraude

> **Celui qui soumet NE PEUT PAS approuver sa propre facture.**
>
> Le composable `useInvoiceWorkflow` vérifie `submitted_by !== currentUser`
> avant d'autoriser l'approbation.

### 6.4 Colonnes DB ajoutées (`invoices`)

| Colonne | Type | Description |
|---|---|---|
| `submitted_by` | varchar(255) | Nom de celui qui a soumis |
| `submitted_at` | timestamptz | Date de soumission |
| `approved_by` | varchar(255) | Nom de l'approbateur |
| `approved_at` | timestamptz | Date d'approbation |
| `rejected_by` | varchar(255) | Nom du rejeteur |
| `rejected_at` | timestamptz | Date de rejet |
| `rejection_reason` | text | Motif du rejet |

### 6.5 Rôles par transition

| Transition | Rôles autorisés |
|---|---|
| `draft` → `pending_validation` | caissier, comptable, admin, superviseur |
| `pending_validation` → `approved` | superviseur, admin |
| `pending_validation` → `draft` (rejet) | superviseur, admin |
| `approved` → `validated` | superviseur, admin |
| `validated` → `certified` | admin, superviseur (via FNEC) |
| `draft` → `cancelled` | admin, superviseur |

### 6.6 Rôles en lecture seule (aucune action workflow)

- **Manager** — voit tout, ne modifie rien
- **Auditeur** — lecture rapports, logs
- **Contrôleur** — audit logs, anomalies
- **Consultant** — lecture limitée, export

---

## 7. Principes de conception

1. **Séparation des pouvoirs** — Un workflow financier (création → validation → paiement → audit) doit impliquer au minimum 2 personnes différentes avec des rôles distincts.

2. **Principe du moindre privilège** — Chaque rôle n'a accès qu'au strict nécessaire pour sa mission.

3. **Lecture seule par défaut** — Les rôles de pilotage et contrôle (Manager, Auditeur, Contrôleur, Consultant) ne peuvent jamais modifier de données.

4. **Isolation par entreprise** — Tous les rôles sont scopés à une seule `company_id` via RLS. Un utilisateur ne peut appartenir qu'à une seule entreprise.

5. **project_admin bypass** — Le rôle `project_admin` (WIMRUX SaaS) a accès à toutes les entreprises et contourne les RLS. Il ne doit jamais être assigné à un client.

6. **Accès temporaire** — Le rôle Consultant devra supporter des dates de validité (`valid_from` / `valid_until`) pour limiter l'accès dans le temps.

---

## 8. Impact technique (notes pour l'implémentation future)

- **`UserRole` type** — Ajouter les nouveaux rôles au type TypeScript
- **`user_profiles.role`** — varchar(20), pas de contrainte CHECK en DB → flexible
- **`routes.ts`** — Ajouter les rôles dans le `meta.roles` de chaque route
- **`MainLayout.vue`** — Ajouter les rôles dans `navItems.roles`
- **`hasAnyRole()`** — Fonctionne déjà avec n'importe quel rôle (array-based), pas de changement nécessaire
- **RLS** — Les politiques existantes filtrent par `company_id`, pas par rôle → pas d'impact DB
- **Granularité lecture/écriture** — Pour les rôles en lecture seule (Manager, Auditeur), ajouter des guards côté composant (désactiver boutons d'édition, masquer actions CRUD)

---

*Document créé le 08/02/2026 — WIMRUX FINANCES SaaS*
