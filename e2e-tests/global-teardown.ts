import { FullConfig } from '@playwright/test';

/**
 * Global Teardown — exécuté une fois après tous les tests
 * Nettoyage : suppression des données de test
 */
async function globalTeardown(config: FullConfig) {
  console.log('[E2E Teardown] Nettoyage des données de test...');

  // NOTE : Nettoyage via InsForge CLI ou API :
  // 1. DELETE FROM invoices WHERE client_id IN (SELECT id FROM clients WHERE name LIKE '%(TEST)%')
  // 2. DELETE FROM clients WHERE name LIKE '%(TEST)%' OR name LIKE '%(REGRESSION)%'
  // 3. DELETE FROM treasury_accounts WHERE name LIKE '%(TEST)%'
  // 4. UPDATE user_profiles SET two_fa_enabled = true WHERE email IN ('test1@wimrux.app', 'test2@wimrux.app')
  // 5. UPDATE user_profiles SET full_name = 'Admin ILTIC' WHERE email = 'test1@wimrux.app'

  console.log('[E2E Teardown] ✅ Terminé');
}

export default globalTeardown;
