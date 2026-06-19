/**
 * Désactiver le 2FA via l'API Appwrite (Admin API)
 *
 * Nécessite APPWRITE_API_KEY avec scope auth.users:write
 * Usage : node e2e/disable-2fa.mjs
 */

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT  = process.env.APPWRITE_PROJECT || '6a29285200015cd421c7';
const APPWRITE_API_KEY  = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID       = process.env.APPWRITE_DATABASE || 'wimrux_finances';

const ACCOUNTS = [
  { email: 'admin@wimrux.app', password: 'WimruxAdmin2026!' },
  { email: 'test1@wimrux.app', password: 'WimruxAdmin2026!' },
  { email: 'test2@wimrux.app', password: 'WimruxAdmin2026!' },
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

async function disableTwoFa(email) {
  console.log(`\n🔑 Traitement ${email}...`);

  // 1. Trouver l'utilisateur par email
  const usersRes = await appwriteApi('GET', `/users?search=${encodeURIComponent(email)}`);
  const user = usersRes?.users?.find(u => u.email === email);
  if (!user) {
    console.error(`  ❌ Utilisateur non trouvé: ${email}`);
    return false;
  }

  // 2. Désactiver 2FA (mfa: false sur Appwrite)
  try {
    await appwriteApi('PATCH', `/users/${user.$id}`, { mfa: false });
    console.log(`  ✅ 2FA/MFA désactivé pour ${email}`);
  } catch (err) {
    console.error(`  ❌ Update MFA échoué: ${err.message}`);
    return false;
  }

  return true;
}

async function main() {
  console.log('============================================');
  console.log('  WIMRUX® — Désactivation 2FA Comptes Test');
  console.log('  (Appwrite Admin API)');
  console.log('============================================');

  let success = 0;
  for (const account of ACCOUNTS) {
    const ok = await disableTwoFa(account.email);
    if (ok) success++;
  }

  console.log(`\n🏁 Résultat: ${success}/${ACCOUNTS.length} comptes mis à jour`);

  if (success === ACCOUNTS.length) {
    console.log('✅ Tous les comptes sont prêts pour les tests E2E (pas de 2FA)');
  } else {
    console.log('⚠️  Certains comptes n\'ont pas pu être mis à jour.');
  }
}

main().catch(console.error);
