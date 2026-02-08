import { boot } from 'quasar/wrappers';
import { createClient } from '@insforge/sdk';
import { useAuthStore } from 'src/stores/auth-store';
import { useCompanyStore } from 'src/stores/company-store';

const insforgeUrl = import.meta.env.VITE_INSFORGE_URL as string;
const insforgeAnonKey = import.meta.env.VITE_INSFORGE_ANON_KEY as string;

if (!insforgeUrl || !insforgeAnonKey) {
  console.warn(
    '[WIMRUX] InsForge URL or Anon Key not configured. Check your .env file.'
  );
}

export const insforge = createClient({
  baseUrl: insforgeUrl,
  anonKey: insforgeAnonKey,
});

export default boot(async ({ app, store }) => {
  app.provide('insforge', insforge);

  const authStore = useAuthStore(store);
  await authStore.loadSession();

  // Auto-load company data if user is authenticated
  if (authStore.isAuthenticated && authStore.companyId) {
    const companyStore = useCompanyStore(store);
    await companyStore.loadCompanies(authStore.companyId);
  }
});
