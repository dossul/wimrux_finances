# Correction création utilisateur - 28/02/2026

## Problème

La création d'un nouvel utilisateur via Settings > Gestion des utilisateurs échouait avec une erreur 401 Unauthorized.

## Cause

Le backend InsForge a `requireEmailVerification: true` activé. Lors de l'appel à `signUp()`:
- Si la vérification par email est requise, `signUpData.user` peut être `null`
- Le code original ne gérait pas ce cas et échouait à récupérer l'ID utilisateur

## Solution

Modification de la fonction `onCreateRbacUser` dans `SettingsPage.vue`:

1. Après l'appel à `signUp()`, vérifier si `newUserId` est disponible
2. Si `newUserId` est null (email verification requise), interroger directement la table `auth.users` par email pour récupérer l'ID
3. Insérer le profile utilisateur avec l'ID récupéré

## Fichier modifié

- `wimrux_app/src/pages/settings/SettingsPage.vue` (lignes 1750-1795)

```typescript
let newUserId = signUpData?.user?.id;

// If user ID is not available (email verification required), query by email
if (!newUserId) {
  const { data: users, error: usersErr } = await adminClient.database
    .from('users')
    .select('id')
    .eq('email', rbacUserForm.value.email)
    .limit(1);
  
  if (usersErr || !users || users.length === 0) {
    throw new Error('Utilisateur créé mais impossible de récupérer son ID.');
  }
  newUserId = users[0].id;
}
```
