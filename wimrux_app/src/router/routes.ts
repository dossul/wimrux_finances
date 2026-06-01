import type { RouteRecordRaw } from 'vue-router';
import type { UserRole, Permission } from 'src/types';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    isAuthRoute?: boolean;
    roles?: UserRole[];
    permissions?: Permission[];
    title?: string;
  }
}

const routes: RouteRecordRaw[] = [
  // Landing page (public)
  {
    path: '/',
    name: 'landing',
    component: () => import('pages/LandingPage.vue'),
    meta: { title: 'WIMRUX FINANCES - Facturation Électronique' },
  },

  // Auth pages (no layout, public)
  {
    path: '/auth',
    component: () => import('layouts/AuthLayout.vue'),
    meta: { isAuthRoute: true },
    children: [
      { path: 'login', name: 'login', component: () => import('pages/auth/LoginPage.vue'), meta: { title: 'Connexion' } },
      { path: 'register', name: 'register', component: () => import('pages/auth/RegisterPage.vue'), meta: { title: 'Inscription' } },
      { path: 'forgot-password', name: 'forgot-password', component: () => import('pages/auth/ForgotPasswordPage.vue'), meta: { title: 'Mot de passe oublié' } },
    ],
  },

  // App pages (main layout, authenticated)
  {
    path: '/app',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('pages/IndexPage.vue'), meta: { title: 'Tableau de bord', permissions: ['dashboard.view'] } },
      { path: 'invoices', name: 'invoices', component: () => import('pages/invoices/InvoicesListPage.vue'), meta: { title: 'Factures', permissions: ['invoices.read'] } },
      { path: 'invoices/new', name: 'invoice-new', component: () => import('pages/invoices/InvoiceEditorPage.vue'), meta: { title: 'Nouvelle facture', permissions: ['invoices.create'] } },
      { path: 'invoices/:id', name: 'invoice-edit', component: () => import('pages/invoices/InvoiceEditorPage.vue'), meta: { title: 'Facture', permissions: ['invoices.read'] } },
      { path: 'clients', name: 'clients', component: () => import('pages/clients/ClientsPage.vue'), meta: { title: 'Clients', permissions: ['clients.read'] } },
      { path: 'articles', name: 'articles', component: () => import('pages/articles/ArticlesPage.vue'), meta: { title: 'Articles', permissions: ['invoices.create'] } },
      { path: 'treasury', name: 'treasury', component: () => import('pages/treasury/TreasuryPage.vue'), meta: { title: 'Trésorerie', permissions: ['treasury.read'] } },
      { path: 'reports', name: 'reports', component: () => import('pages/reports/ReportsPage.vue'), meta: { title: 'Rapports', permissions: ['reports.read'] } },
      { path: 'reports/standard',     name: 'reports-standard',     component: () => import('pages/reports/StandardReportsPage.vue'), meta: { title: 'Rapports standards', permissions: ['reports.read'] } },
      { path: 'reports/query-builder',name: 'reports-query-builder',component: () => import('pages/reports/QueryBuilderPage.vue'),    meta: { title: 'Query Builder',     permissions: ['reports.read'] } },
      { path: 'reports/dashboards',   name: 'reports-dashboards',   component: () => import('pages/reports/DashboardsPage.vue'),      meta: { title: 'Tableaux de bord',  permissions: ['reports.read'] } },
      { path: 'audit', name: 'audit', component: () => import('pages/audit/AuditLogPage.vue'), meta: { title: 'Journal d\'audit', permissions: ['audit.read'] } },
      { path: 'ai-assistant', name: 'ai-assistant', component: () => import('pages/ai/AiAssistantPage.vue'), meta: { title: 'Assistant IA', permissions: ['ai.use'] } },
      { path: 'ai/ask',       name: 'ai-ask',       component: () => import('pages/ai/AiAskPage.vue'),       meta: { title: 'Assistant IA Finances', permissions: ['ai.use'] } },
      { path: 'admin/ai-usage', name: 'admin-ai-usage', component: () => import('pages/admin/AdminAiUsagePage.vue'), meta: { title: 'Suivi IA Admin', roles: ['project_admin'] } },
      { path: 'admin/chatbot', name: 'admin-chatbot', component: () => import('pages/admin/AdminChatbotPage.vue'), meta: { title: 'Chatbot Admin', roles: ['project_admin'] } },
      { path: 'banking', name: 'banking', component: () => import('pages/banking/BankingAccountsPage.vue'), meta: { title: 'Comptes bancaires', permissions: ['treasury.read'] } },
      { path: 'banking/:id', name: 'banking-detail', component: () => import('pages/banking/BankingAccountDetailPage.vue'), meta: { title: 'Transactions', permissions: ['treasury.read'] } },
      { path: 'banking/:id/import', name: 'banking-import', component: () => import('pages/banking/BankStatementImportPage.vue'), meta: { title: 'Import relevé', permissions: ['treasury.create'] } },
      { path: 'banking/:id/reconciliation', name: 'banking-reconciliation', component: () => import('pages/banking/ReconciliationPage.vue'), meta: { title: 'Rapprochement', permissions: ['treasury.create'] } },
      { path: 'banking/import', name: 'banking-import-generic', component: () => import('pages/banking/BankStatementImportPage.vue'), meta: { title: 'Import relevé', permissions: ['treasury.create'] } },
      { path: 'banking/transfers', name: 'banking-transfers', component: () => import('pages/banking/WireTransfersPage.vue'), meta: { title: 'Ordres de virement', permissions: ['treasury.update'] } },
      { path: 'banking/checks',    name: 'banking-checks',    component: () => import('pages/banking/ChecksPage.vue'),         meta: { title: 'Chèques',            permissions: ['treasury.read'] } },
      { path: 'banking/fees',      name: 'banking-fees',      component: () => import('pages/banking/BankFeesPage.vue'),       meta: { title: 'Frais bancaires',    permissions: ['treasury.read'] } },
      { path: 'invoices/received',  name: 'invoices-received',   component: () => import('pages/invoices/ReceivedInvoicesPage.vue'), meta: { title: 'Factures reçues',    permissions: ['invoices.read'] } },
      { path: 'suppliers',           name: 'suppliers',           component: () => import('pages/invoices/SuppliersPage.vue'),        meta: { title: 'Fournisseurs',       permissions: ['invoices.read'] } },
      { path: 'receivables',         name: 'receivables',         component: () => import('pages/invoices/ReceivablesPage.vue'),      meta: { title: 'Balance âgée',       permissions: ['invoices.read'] } },
      { path: 'tax-payments',          name: 'tax-payments',        component: () => import('pages/invoices/TaxPaymentsPage.vue'),      meta: { title: 'Paiements fiscaux',  permissions: ['invoices.read'] } },
      { path: 'budgets',               name: 'budgets',              component: () => import('pages/budgets/BudgetsPage.vue'),           meta: { title: 'Budgets',            permissions: ['treasury.read'] } },
      { path: 'treasury/cashflow',       name: 'cashflow',             component: () => import('pages/treasury/CashflowPage.vue'),        meta: { title: 'Trésorerie prévisionnelle', permissions: ['treasury.read'] } },
      { path: 'assets',                  name: 'assets',               component: () => import('pages/assets/AssetsPage.vue'),            meta: { title: 'Immobilisations',     permissions: ['treasury.read'] } },
      { path: 'loans',                   name: 'loans',                component: () => import('pages/loans/LoansPage.vue'),              meta: { title: 'Emprunts',            permissions: ['treasury.read'] } },
      { path: 'investments',             name: 'investments',          component: () => import('pages/investments/InvestmentsPage.vue'),  meta: { title: 'Investissements',     permissions: ['treasury.read'] } },
      { path: 'petty-cash',              name: 'petty-cash',           component: () => import('pages/petty-cash/PettyCashPage.vue'),     meta: { title: 'Petite caisse',       permissions: ['treasury.read'] } },
      { path: 'mobile-wallets',          name: 'mobile-wallets',       component: () => import('pages/mobile-wallets/MobileWalletsPage.vue'), meta: { title: 'Wallets mobiles', permissions: ['treasury.read'] } },
      { path: 'wallets',                   name: 'wallets',              component: () => import('pages/wallets/WalletsPage.vue'),              meta: { title: 'Wallets de paiement', permissions: ['treasury.read'] } },
      { path: 'wallets/:id/transactions',  name: 'wallet-transactions',  component: () => import('pages/wallets/WalletTransactionsPage.vue'),   meta: { title: 'Transactions wallet', permissions: ['treasury.read'] } },
      { path: 'wallets/reconciliation',    name: 'wallet-reconciliation', component: () => import('pages/wallets/WalletReconciliationPage.vue'),  meta: { title: 'Rapprochement universel', permissions: ['treasury.create'] } },
      { path: 'wallets/:id/sync-settings', name: 'wallet-sync-settings', component: () => import('pages/wallets/WalletSyncSettingsPage.vue'), meta: { title: 'Synchronisation wallet', permissions: ['treasury.create'] } },
      { path: 'approvals/workflows',     name: 'approval-workflows',   component: () => import('pages/approvals/ApprovalWorkflowsPage.vue'), meta: { title: "Workflows d'approbation", permissions: ['settings.manage'] } },
      { path: 'budgets/:id',           name: 'budget-detail',       component: () => import('pages/budgets/BudgetDetailPage.vue'),      meta: { title: 'Détail budget',      permissions: ['treasury.read'] } },
      { path: 'settings', name: 'settings', component: () => import('pages/settings/SettingsPage.vue'), meta: { title: 'Paramètres', permissions: ['settings.manage'] } },
      { path: 'settings/ai/providers', name: 'ai-providers', component: () => import('pages/settings/AiProvidersPage.vue'), meta: { title: 'Fournisseurs IA', permissions: ['settings.manage'] } },
      { path: 'settings/ai/routing', name: 'ai-routing', component: () => import('pages/settings/AiRoutingPage.vue'), meta: { title: 'Routage IA', permissions: ['settings.manage'] } },
      { path: 'settings/ai/usage', name: 'ai-usage', component: () => import('pages/settings/AiUsagePage.vue'), meta: { title: 'Consommation IA', permissions: ['settings.manage'] } },
      { path: 'settings/ai/credits', name: 'ai-credits-buy', component: () => import('pages/settings/AiCreditsBuyPage.vue'), meta: { title: 'Acheter crédits IA', permissions: ['settings.manage'] } },
      { path: 'support', name: 'support', component: () => import('pages/support/SupportPage.vue'), meta: { title: 'Support', permissions: [] } },
      { path: 'settings/theme', name: 'theme', component: () => import('pages/settings/ThemePage.vue'), meta: { title: 'Personnalisation', permissions: ['settings.manage'] } },
      { path: 'settings/privacy', name: 'privacy', component: () => import('pages/settings/PrivacyPage.vue'), meta: { title: 'Confidentialité & RGPD', permissions: [] } },
      { path: 'admin/kpi', name: 'admin-kpi', component: () => import('pages/admin/AdminKpiPage.vue'), meta: { title: 'KPI', permissions: ['settings.manage'] } },
      { path: 'admin/health', name: 'admin-health', component: () => import('pages/admin/HealthcheckPage.vue'), meta: { title: 'Monitoring', permissions: ['settings.manage'] } },
      { path: 'fiscal/declarations', name: 'tax-declarations', component: () => import('pages/fiscal/TaxDeclarationsPage.vue'), meta: { title: 'Déclarations fiscales', permissions: ['treasury.read'] } },
    ],
  },

  // Pages légales (publiques)
  {
    path: '/legal',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      { path: 'terms', name: 'legal-terms', component: () => import('pages/legal/TermsPage.vue'), meta: { title: 'CGU' } },
      { path: 'privacy', name: 'legal-privacy', component: () => import('pages/legal/PrivacyPolicyPage.vue'), meta: { title: 'Politique de confidentialité' } },
    ],
  },

  // 404
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
