/**
 * Script d'initialisation du compte Admin SaaS WIMRUX® FINANCES
 * Usage: node scripts/create-admin.js
 *
 * Requires: npm install node-appwrite
 */

import { Client, Account, Databases, ID, Query } from 'node-appwrite';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT  = process.env.APPWRITE_PROJECT || '6a29285200015cd421c7';
const APPWRITE_API_KEY  = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID       = process.env.APPWRITE_DATABASE || 'wimrux_finances';

const ADMIN_EMAIL    = 'admin@wimrux.bf';
const ADMIN_PASSWORD = 'WimruxAdmin2026!';
const ADMIN_NAME     = 'Admin WIMRUX SaaS';
const COMPANY_ID     = 'b05de79e-4326-40f5-81ed-643e3c8a1117';

async function createAdminAccount() {
  console.log('🚀 Création du compte Admin SaaS WIMRUX® FINANCES...\n');

  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT)
    .setKey(APPWRITE_API_KEY);

  const account = new Account(client);
  const databases = new Databases(client);

  let userId = null;

  // 1. Créer ou récupérer l'utilisateur
  console.log('1️⃣ Vérification/Création du compte Appwrite Auth...');
  try {
    const user = await account.create(ID.unique(), ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME);
    userId = user.$id;
    console.log(`✅ Compte créé: ${userId}`);
  } catch (err) {
    if (err.code === 409) {
      // Existe déjà — chercher par email
      const users = await fetch(`${APPWRITE_ENDPOINT}/users`, {
        method: 'GET',
        headers: {
          'X-Appwrite-Project': APPWRITE_PROJECT,
          'X-Appwrite-Key': APPWRITE_API_KEY,
        }
      });
      const data = await users.json();
      const found = data.users?.find(u => u.email === ADMIN_EMAIL);
      if (found) {
        userId = found.$id;
        console.log(`✅ Compte existant trouvé: ${userId}`);
      }
    } else {
      console.error('❌ Erreur Auth:', err.message);
      process.exit(1);
    }
  }

  if (!userId) {
    console.error('❌ Impossible de récupérer l\'ID utilisateur');
    process.exit(1);
  }

  // 2. Vérifier/créer le profil
  console.log('\n2️⃣ Vérification/Création du profil Admin SaaS...');
  try {
    await databases.getDocument(DATABASE_ID, 'user_profiles', userId);
    console.log(`✅ Profil existant: ${userId}`);
  } catch {
    await databases.createDocument(DATABASE_ID, 'user_profiles', userId, {
      company_id: COMPANY_ID,
      role: 'project_admin',
      full_name: ADMIN_NAME,
      email: ADMIN_EMAIL,
    });
    console.log(`✅ Profil créé: ${userId}`);
  }

  // 3. Résumé
  console.log('\n' + '='.repeat(50));
  console.log('🎉 COMPTE ADMIN SAAS PRÊT!');
  console.log('='.repeat(50));
  console.log(`📧 Email:        ${ADMIN_EMAIL}`);
  console.log(`🔑 Mot de passe: ${ADMIN_PASSWORD}`);
  console.log(`👤 Rôle:         project_admin`);
  console.log(`🏢 Entreprise:   WIMRUX FINANCES SaaS`);
  console.log('='.repeat(50));
  console.log('\n👉 Connectez-vous sur https://wimruxapp.vercel.app/auth/login');
}

createAdminAccount().catch(console.error);
