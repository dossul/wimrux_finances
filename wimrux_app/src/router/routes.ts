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
      { path: 'reports/fiscal', name: 'fiscal-reports', component: () => import('pages/reports/FiscalReportsPage.vue'), meta: { title: 'Rapports fiscaux', permissions: ['reports.fiscal'] } },
      { path: 'reports/a-report', name: 'a-report', component: () => import('pages/reports/AReportPage.vue'), meta: { title: 'A-Rapport', permissions: ['reports.fiscal'] } },
      { path: 'audit', name: 'audit', component: () => import('pages/audit/AuditLogPage.vue'), meta: { title: 'Journal d\'audit', permissions: ['audit.read'] } },
      { path: 'ai-assistant', name: 'ai-assistant', component: () => import('pages/ai/AiAssistantPage.vue'), meta: { title: 'Assistant IA', permissions: ['ai.use'] } },
      { path: 'admin/ai-usage', name: 'admin-ai-usage', component: () => import('pages/admin/AdminAiUsagePage.vue'), meta: { title: 'Suivi IA Admin', roles: ['project_admin'] } },
      { path: 'admin/chatbot', name: 'admin-chatbot', component: () => import('pages/admin/AdminChatbotPage.vue'), meta: { title: 'Chatbot Admin', roles: ['project_admin'] } },
      { path: 'settings', name: 'settings', component: () => import('pages/settings/SettingsPage.vue'), meta: { title: 'Paramètres', permissions: ['settings.manage'] } },
    ],
  },

  // Public invoice verification (QR scan)
  {
    path: '/verify',
    name: 'verify',
    component: () => import('pages/VerifyPage.vue'),
    meta: { title: 'Vérification de facture' },
  },

  // 404
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
