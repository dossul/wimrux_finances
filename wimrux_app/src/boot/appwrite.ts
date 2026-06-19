import { boot } from 'quasar/wrappers';
import { Client, Account, Databases, Storage, Functions, Teams } from 'appwrite';

// Appwrite configuration
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT as string || 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT = import.meta.env.VITE_APPWRITE_PROJECT as string || '6a29285200015cd421c7';

if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT) {
  console.warn(
    '[WIMRUX] Appwrite endpoint or project ID not configured. Check your .env file.'
  );
}

// Initialize Appwrite client
export const client = new Client();
client
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT);

// Export services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);
export const functions = new Functions(client);
export const teams = new Teams(client);

// Database ID
export const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE as string || 'wimrux_finances';

// Collection IDs mapping (will be created in Appwrite)
export const COLLECTIONS = {
  COMPANIES: 'companies',
  USER_PROFILES: 'user_profiles',
  CLIENTS: 'clients',
  SUPPLIERS: 'suppliers',
  INVOICES: 'invoices',
  INVOICE_ITEMS: 'invoice_items',
  INVOICE_PAYMENTS: 'invoice_payments',
  BANK_ACCOUNTS: 'bank_accounts',
  BANK_TRANSACTIONS: 'bank_transactions',
  ARTICLES: 'articles',
  CATEGORIES: 'categories',
  TAX_DECLARATIONS: 'tax_declarations',
  MOBILE_WALLETS: 'mobile_wallets',
  AUDIT_LOG: 'audit_log',
  NOTIFICATIONS: 'notifications',
  CHATBOT_CONVERSATIONS: 'chatbot_conversations',
  CHATBOT_MESSAGES: 'chatbot_messages',
  AI_USAGE_LOGS: 'ai_usage_logs',
  COMPANY_AI_CREDITS: 'company_ai_credits',
} as const;

// Bucket IDs for storage
export const BUCKETS = {
  INVOICE_PDFS: 'invoice-pdfs',
  COMPANY_LOGOS: 'company-logos',
  RECEIPTS: 'receipts',
  ATTACHMENTS: 'attachments',
  REPORTS: 'reports',
  CHATBOT_ASSETS: 'chatbot-assets',
} as const;

export default boot(async ({ app, store }) => {
  app.provide('appwrite', client);
  app.provide('appwrite-account', account);
  app.provide('appwrite-databases', databases);
  app.provide('appwrite-storage', storage);
  app.provide('appwrite-functions', functions);
  app.provide('appwrite-teams', teams);

  // Expose for Playwright debug
  if (typeof window !== 'undefined') {
    (window as any).__appwriteClient = client;
    (window as any).__appwriteAccount = account;
    (window as any).__appwriteDatabases = databases;
    (window as any).__appwriteDatabaseId = DATABASE_ID;
    (window as any).__appwriteFunctions = functions;
  }

  console.log('[Appwrite Boot] Client initialized for project:', APPWRITE_PROJECT);

  // Load session on boot
  const { useAuthStore } = await import('src/stores/auth-store-appwrite');
  const authStore = useAuthStore(store);
  await authStore.loadSession();

  if (authStore.isAuthenticated && authStore.companyId) {
    const { useCompanyStore } = await import('src/stores/company-store-appwrite');
    const companyStore = useCompanyStore(store);
    await companyStore.loadCompanies(authStore.companyId);
  }
});

// Helper function to generate unique ID (compatible with Appwrite pattern)
export function generateId(): string {
  return crypto.randomUUID();
}
