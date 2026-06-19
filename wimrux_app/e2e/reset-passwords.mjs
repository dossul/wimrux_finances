/**
 * Reset des mots de passe via l'API Admin Appwrite
 * Nécessite: APPWRITE_API_KEY avec scope users:write
 *
 * Note : Appwrite ne permet pas de set un password en clair directement.
 * Ce script utilise la méthode password recovery (createRecovery) ou
 * le endpoint PATCH /users/{userId}/password pour admin.
 */

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT  = process.env.APPWRITE_PROJECT || '6a29285200015cd421c7';
const APPWRITE_API_KEY  = process.env.APPWRITE_API_KEY || '';

const NEW_PASSWORD = 'WimruxAdmin2026!';

const EMAILS = [
  'admin@wimrux.app',
  'test1@wimrux.app',
  'test2@wimrux.app',
  'ulrich@iltic.com',
];

async function appwriteApi(method, path, body = null) {
  const res = await fetch(`${APPWRITE_ENDPOINT}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': APPWRITE_PROJECT,
      'X-Appwrite-Key': APPWRITE_API_KEY,
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (res.status === 204) return null;
  return res.json();
}

async function main() {
  console.log('============================================================');
  console.log('  WIMRUX® — Reset mots de passe → WimruxAdmin2026!');
  console.log('  (Appwrite Admin API)');
  console.log('============================================================');

  for (const email of EMAILS) {
    // 1. Chercher l'utilisateur
    const usersRes = await appwriteApi('GET', `/users?search=${encodeURIComponent(email)}`);
    const user = usersRes?.users?.find(u => u.email === email);

    if (!user) {
      console.log(`⚠️  ${email} → compte introuvable`);
      continue;
    }

    // 2. Update password via admin endpoint
    await appwriteApi('PATCH', `/users/${user.$id}/password`, { password: NEW_PASSWORD });
    console.log(`✅ ${email} → mot de passe mis à jour`);
  }

  console.log('\n✅ Tous les mots de passe ont été réinitialisés.');
}

main().catch(e => {
  console.error('❌ Erreur:', e.message);
  process.exit(1);
});
