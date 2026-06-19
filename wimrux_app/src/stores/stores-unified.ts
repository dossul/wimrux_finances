// Appwrite backend — single source of truth
export { useAuthStore } from './auth-store-appwrite';
export { useCompanyStore } from './company-store-appwrite';
export { useInvoiceStore } from './invoice-store-appwrite';
export { useBudgetStore } from './budget-store-appwrite';
export { useLoanStore } from './loan-store-appwrite';
export { useTaxStore } from './tax-store-appwrite';
export { useWalletStore } from './wallet-store-appwrite';

export const backend = { type: 'appwrite', useAppwrite: true };

