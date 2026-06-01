import { FullConfig } from '@playwright/test';

/**
 * Global Setup — exécuté une fois avant toute la suite de tests
 * Prérequis : 2FA désactivé, données propres
 */
async function globalSetup(config: FullConfig) {
  console.log('[E2E Setup] Préparation de l\'environnement de test...');

  // Vérifier URL accessible
  const baseURL = config.projects[0]?.use?.baseURL || 'https://wimruxapp.vercel.app';
  try {
    const res = await fetch(baseURL);
    if (!res.ok) {
      throw new Error(`URL ${baseURL} non accessible (status ${res.status})`);
    }
    console.log(`[E2E Setup] ✅ URL accessible : ${baseURL}`);
  } catch (e) {
    console.error(`[E2E Setup] ❌ URL inaccessible : ${baseURL}`);
    throw e;
  }

  // NOTE : Pour un setup complet, il faudrait :
  // 1. Reset 2FA sur les comptes de test via SQL
  // 2. Supprimer les données "(TEST)" et "(REGRESSION)" précédentes
  // 3. Créer un compte temporaire si besoin

  console.log('[E2E Setup] ✅ Prêt');
}

export default globalSetup;
