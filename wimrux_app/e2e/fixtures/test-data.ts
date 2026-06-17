/**
 * Données de test centralisées — WIMRUX® Finances
 * Source de vérité unique pour tous les tests E2E.
 *
 * Comptes validés en base Appwrite (27/05/2026) :
 * - Mot de passe UNIFIÉ : WimruxAdmin2026!
 * - 2FA : DÉSACTIVÉ sur tous les comptes
 */

export const TEST_ACCOUNTS = {
  /** project_admin — accès total */
  superAdmin: {
    email: 'admin@wimrux.app',
    password: 'WimruxAdmin2026!',
    phone: '+226 65 59 91 95',
    role: 'project_admin' as const,
    fullName: 'Admin WIMRUX SaaS',
  },
  /** admin ILTIC */
  adminIltic: {
    email: 'test1@wimrux.app',
    password: 'WimruxAdmin2026!',
    phone: '+226 65 75 10 89',
    role: 'admin' as const,
    fullName: 'Admin ILTIC',
  },
  /** admin WESTAGO */
  adminWestago: {
    email: 'test2@wimrux.app',
    password: 'WimruxAdmin2026!',
    phone: '+226 75 53 25 39',
    role: 'admin' as const,
    fullName: 'Admin WESTAGO',
  },
  /** ulrich — admin ILTIC (compte historique) */
  ulrich: {
    email: 'ulrich@iltic.com',
    password: 'WimruxAdmin2026!',
    role: 'admin' as const,
    fullName: 'Ulrich ILTIC',
  },
} as const;

/** Compte par défaut pour les tests automatisés */
export const DEFAULT_ACCOUNT = TEST_ACCOUNTS.superAdmin;

export const TEST_CLIENTS = {
  pm: {
    type: 'PM' as const,
    name: 'TECHNO SOLUTIONS SARL (E2E-TEST)',
    ifu: '12345678',
    address: 'Zone Industrielle, Ouagadougou',
    phone: '+22670000001',
  },
  cc: {
    type: 'CC' as const,
    name: 'Client Comptoir (E2E-TEST)',
  },
};

export const TEST_INVOICE = {
  type: 'FV' as const,
  clientName: 'TECHNO SOLUTIONS SARL (E2E-TEST)',
  items: [
    { designation: 'Ordinateur portable (E2E)', qty: 2, priceHt: 450000, taxGroup: 'A' as const },
    { designation: 'Licence logiciel (E2E)', qty: 5, priceHt: 50000, taxGroup: 'B' as const },
    { designation: 'Formation (E2E)', qty: 1, priceHt: 150000, taxGroup: 'C' as const },
  ],
};

export const TEST_BANK_ACCOUNT = {
  name: 'Compte BOA Principal (E2E-TEST)',
  type: 'banque' as const,
  initialBalance: 5000000,
};

export const TEST_TREASURY_MOVEMENT = {
  credit: {
    type: 'credit' as const,
    amount: 1500000,
    mode: 'bank_transfer' as const,
    reference: 'Règlement facture TECHNO (E2E-TEST)',
  },
  debit: {
    type: 'debit' as const,
    amount: 200000,
    mode: 'cash' as const,
    reference: 'Achat fournitures (E2E-TEST)',
  },
};

/**
 * Marqueur unique pour identifier les données de test
 * Utilisé pour le nettoyage automatique (teardown)
 */
export const TEST_MARKER = '(E2E-TEST)';

/**
 * Toutes les routes authentifiées de l'application
 * Utilisé par le smoke test pour naviguer sur chaque page
 */
export const ALL_APP_ROUTES = [
  { path: '/app', name: 'Tableau de bord' },
  { path: '/app/invoices', name: 'Factures' },
  { path: '/app/clients', name: 'Clients' },
  { path: '/app/articles', name: 'Articles' },
  { path: '/app/treasury', name: 'Trésorerie' },
  { path: '/app/banking', name: 'Comptes bancaires' },
  { path: '/app/banking/transfers', name: 'Ordres de virement' },
  { path: '/app/banking/checks', name: 'Chèques' },
  { path: '/app/banking/fees', name: 'Frais bancaires' },
  { path: '/app/reports', name: 'Rapports' },
  { path: '/app/reports/standard', name: 'Rapports standards' },
  { path: '/app/reports/query-builder', name: 'Query Builder' },
  { path: '/app/reports/dashboards', name: 'Tableaux de bord' },
  { path: '/app/audit', name: 'Journal d\'audit' },
  { path: '/app/ai-assistant', name: 'Assistant IA' },
  { path: '/app/ai/ask', name: 'IA Ask' },
  { path: '/app/budgets', name: 'Budgets' },
  { path: '/app/treasury/cashflow', name: 'Trésorerie prévisionnelle' },
  { path: '/app/assets', name: 'Immobilisations' },
  { path: '/app/loans', name: 'Emprunts' },
  { path: '/app/investments', name: 'Investissements' },
  { path: '/app/petty-cash', name: 'Petite caisse' },
  { path: '/app/mobile-wallets', name: 'Wallets mobiles' },
  { path: '/app/wallets', name: 'Wallets de paiement' },
  { path: '/app/invoices/received', name: 'Factures reçues' },
  { path: '/app/suppliers', name: 'Fournisseurs' },
  { path: '/app/receivables', name: 'Balance âgée' },
  { path: '/app/tax-payments', name: 'Paiements fiscaux' },
  { path: '/app/approvals/workflows', name: 'Workflows d\'approbation' },
  { path: '/app/fiscal/declarations', name: 'Déclarations fiscales' },
  { path: '/app/settings', name: 'Paramètres' },
  { path: '/app/settings/ai/providers', name: 'Fournisseurs IA' },
  { path: '/app/settings/ai/routing', name: 'Routage IA' },
  { path: '/app/settings/ai/usage', name: 'Consommation IA' },
  { path: '/app/settings/ai/credits', name: 'Acheter crédits IA' },
  { path: '/app/settings/theme', name: 'Personnalisation' },
  { path: '/app/settings/privacy', name: 'Confidentialité & RGPD' },
  { path: '/app/support', name: 'Support' },
] as const;

/** Routes admin (nécessitent project_admin) */
export const ADMIN_ROUTES = [
  { path: '/app/admin/kpi', name: 'KPI Admin' },
  { path: '/app/admin/health', name: 'Monitoring' },
  { path: '/app/admin/ai-usage', name: 'Suivi IA Admin' },
  { path: '/app/admin/chatbot', name: 'Chatbot Admin' },
] as const;

/** Routes publiques */
export const PUBLIC_ROUTES = [
  { path: '/', name: 'Landing page' },
  { path: '/auth/login', name: 'Connexion' },
  { path: '/auth/register', name: 'Inscription' },
  { path: '/auth/forgot-password', name: 'Mot de passe oublié' },
  { path: '/legal/terms', name: 'CGU' },
  { path: '/legal/privacy', name: 'Politique de confidentialité' },
] as const;
