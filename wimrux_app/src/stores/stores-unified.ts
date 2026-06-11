// Appwrite backend — single source of truth
export { useAuthStore } from './auth-store-appwrite';
export { useCompanyStore } from './company-store-appwrite';
export { useInvoiceStore } from './invoice-store-appwrite';

export const backend = { type: 'appwrite', useAppwrite: true };
