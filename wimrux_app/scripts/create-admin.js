/**
 * Script d'initialisation du compte Admin SaaS WIMRUX® FINANCES
 * Usage: node scripts/create-admin.js
 */

import { createClient } from '@insforge/sdk';

const INSFORGE_URL = 'https://gfe4bd9y.eu-central.insforge.app';
const INSFORGE_ANON_KEY = 'sb-gfe4bd9y-anon-f47ac10b58cc4372a5670d8f64e6e6c4';

const ADMIN_EMAIL = 'admin@wimrux.bf';
const ADMIN_PASSWORD = 'WimruxAdmin2026!';
const ADMIN_NAME = 'Admin WIMRUX SaaS';
const COMPANY_ID = 'b05de79e-4326-40f5-81ed-643e3c8a1117'; // WIMRUX FINANCES SaaS

async function createAdminAccount() {
  console.log('🚀 Création du compte Admin SaaS WIMRUX® FINANCES...\n');

  const insforge = createClient({
    baseUrl: INSFORGE_URL,
    anonKey: INSFORGE_ANON_KEY,
  });

  let userId = null;

  // 1. Essayer de créer le compte Auth ou se connecter si existe
  console.log('1️⃣ Vérification/Création du compte InsForge Auth...');
  
  // D'abord essayer de se connecter
  const { data: loginData, error: loginError } = await insforge.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (loginData?.user) {
    userId = loginData.user.id;
    console.log(`✅ Compte existant trouvé: ${userId}`);
  } else {
    // Créer le compte
    const { data: authData, error: authError } = await insforge.auth.signUp({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
    });

    if (authError && !authError.message.includes('already exists')) {
      console.error('❌ Erreur Auth:', authError.message);
      process.exit(1);
    }

    userId = authData?.user?.id;
    console.log(`✅ Compte créé: ${userId || '(vérification email requise)'}`);
  }

  if (!userId) {
    console.error('❌ Impossible de récupérer l\'ID utilisateur');
    process.exit(1);
  }

  // 2. Vérifier si le profil existe déjà
  console.log('\n2️⃣ Vérification/Création du profil Admin SaaS...');
  
  const { data: existingProfile } = await insforge.database
    .from('user_profiles')
    .select()
    .eq('user_id', userId)
    .maybeSingle();

  if (existingProfile) {
    console.log(`✅ Profil existant: ${existingProfile.id}`);
  } else {
    const { data: profileData, error: profileError } = await insforge.database
      .from('user_profiles')
      .insert({
        user_id: userId,
        company_id: COMPANY_ID,
        role: 'project_admin',
        full_name: ADMIN_NAME,
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Erreur Profile:', profileError.message);
      process.exit(1);
    }

    console.log(`✅ Profil créé: ${profileData.id}`);
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
  console.log('\n👉 Connectez-vous sur http://localhost:9000/auth/login');
}

createAdminAccount().catch(console.error);
