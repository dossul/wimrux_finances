# Utilisateurs InsForge - WIMRUX FINANCES

## Comptes Auth (auth.users)

| Email | Nom | Email vérifié | Project Admin | Créé le |
|-------|-----|---------------|----------------|---------|
| admin@example.com | Administrator | ✅ | ✅ | 07/02/2026 |
| anon@example.com | Anonymous | ❌ | ❌ | 07/02/2026 |
| admin@wimrux.bf | Admin WIMRUX | ✅ | ✅ | 08/02/2026 |
| ulrich@iltic.com | Admin ulrich | ✅ | ❌ | 08/02/2026 |
| admin@westago.bf | Admin WESTAGO | ✅ | ❌ | 19/02/2026 |
| admin@iltic.bf | Admin ILTIC | ✅ | ❌ | 19/02/2026 |

---

## Profils Utilisateurs (user_profiles)

| Nom complet | Email | Rôle | Entreprise | Créé le |
|-------------|-------|------|------------|---------|
| Admin WIMRUX SaaS | admin@wimrux.bf | project_admin | WIMRUX FINANCES SaaS | 08/02/2026 |
| Admin WESTAGO | admin@westago.bf | admin | WESTAGO SARL | 19/02/2026 |
| Ulrich ILTIC | ulrich@iltic.com | admin | ILTIC | 19/02/2026 |
| Admin ILTIC | admin@iltic.bf | admin | ILTIC | 19/02/2026 |

---

## Comptes sans profil entreprise

| Email | Nom | Statut |
|-------|-----|--------|
| admin@example.com | Administrator | Compte système (project_admin) |
| anon@example.com | Anonymous | Compte anonyme système |

---

## Résumé

- **6 comptes auth.users** actifs
- **4 profils user_profiles** actifs
- **3 entreprises** : WIMRUX FINANCES SaaS, ILTIC, WESTAGO SARL
- **2 project_admin** : admin@example.com, admin@wimrux.bf
- **3 admins** répartis dans ILTIC (2) et WESTAGO (1)

---

## Comptes supprimés (01/03/2026)

| Email | User ID | Statut |
|-------|---------|--------|
| dossulrich@gmail.com | 790b70c3-1571-4df5-b7de-dceb56bbcf4c | ✅ Supprimé définitivement |
| urlish2002@yahoo.fr | 06bdffdd-3c11-4113-ac83-6d059d78f26d | ✅ Supprimé définitivement |

> **Méthode de suppression** : Fonction RPC `delete_auth_users(TEXT[])` avec `SECURITY DEFINER` qui contourne les restrictions RLS.
