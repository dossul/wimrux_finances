/**
 * Désactiver le 2FA via le SDK InsForge (même méthode que SettingsPage.vue)
 * 
 * Le SDK InsForge utilise POST /api/auth/sessions pour le login
 * et PATCH /api/database/records/user_profiles pour l'update.
 * 
 * Usage : node e2e/disable-2fa.mjs
 */

import { createClient } from '@insforge/sdk';

const insforge = createClient({
  baseUrl: 'https://gfe4bd9y.eu-central.insforge.app',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTAwNjN9.J71GoMBih3RietpuMmXLeLEU3664bu1jzI3KFZg3dPU',
});

const ACCOUNTS = [
  { email: 'admin@wimrux.app', password: 'WimruxAdmin2026!' },
  { email: 'test1@wimrux.app', password: 'WimruxAdmin2026!' },
  { email: 'test2@wimrux.app', password: 'WimruxAdmin2026!' },
];

async function disableTwoFa(email, password) {
  console.log(`\n🔑 Login ${email}...`);

  // 1. Sign in via SDK
  const { data, error: loginErr } = await insforge.auth.signInWithPassword({ email, password });

  if (loginErr) {
    console.error(`  ❌ Login échoué: ${loginErr.message}`);
    return false;
  }

  const userId = data?.user?.id;
  const accessToken = data?.accessToken;
  console.log(`  ✅ Connecté (user_id: ${userId?.substring(0, 8)}...)`);

  // 2. Update user_profiles via SDK database module
  const { error: updateErr } = await insforge.database
    .from('user_profiles')
    .update({ two_fa_enabled: false })
    .eq('user_id', userId);

  if (updateErr) {
    console.error(`  ❌ Update échoué: ${updateErr.message}`);
    return false;
  }

  console.log(`  ✅ 2FA désactivé pour ${email}`);

  // Logout to clean session
  await insforge.auth.signOut();
  return true;
}

async function main() {
  console.log('============================================');
  console.log('  WIMRUX® — Désactivation 2FA Comptes Test');
  console.log('============================================');

  let success = 0;
  for (const account of ACCOUNTS) {
    const ok = await disableTwoFa(account.email, account.password);
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
