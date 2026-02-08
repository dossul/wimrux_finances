import type { RouteRecordRaw } from 'vue-router';
import type { UserRole } from 'src/types';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    roles?: UserRole[];
    title?: string;
  }
}

const routes: RouteRecordRaw[] = [
  // Auth pages (no layout, public)
  {
    path: '/auth',
    component: () => import('layouts/AuthLayout.vue'),
    children: [
      { path: 'login', name: 'login', component: () => import('pages/auth/LoginPage.vue'), meta: { title: 'Connexion' } },
      { path: 'register', name: 'register', component: () => import('pages/auth/RegisterPage.vue'), meta: { title: 'Inscription' } },
      { path: 'forgot-password', name: 'forgot-password', component: () => import('pages/auth/ForgotPasswordPage.vue'), meta: { title: 'Mot de passe oublié' } },
    ],
  },

  // App pages (main layout, authenticated)
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'dashboard', component: () => import('pages/IndexPage.vue'), meta: { title: 'Tableau de bord', roles: ['admin', 'caissier', 'auditeur'] } },
      { path: 'invoices', name: 'invoices', component: () => import('pages/invoices/InvoicesListPage.vue'), meta: { title: 'Factures', roles: ['admin', 'caissier'] } },
      { path: 'invoices/new', name: 'invoice-new', component: () => import('pages/invoices/InvoiceEditorPage.vue'), meta: { title: 'Nouvelle facture', roles: ['admin', 'caissier'] } },
      { path: 'invoices/:id', name: 'invoice-edit', component: () => import('pages/invoices/InvoiceEditorPage.vue'), meta: { title: 'Facture', roles: ['admin', 'caissier'] } },
      { path: 'clients', name: 'clients', component: () => import('pages/clients/ClientsPage.vue'), meta: { title: 'Clients', roles: ['admin', 'caissier'] } },
      { path: 'treasury', name: 'treasury', component: () => import('pages/treasury/TreasuryPage.vue'), meta: { title: 'Trésorerie', roles: ['admin'] } },
      { path: 'reports', name: 'reports', component: () => import('pages/reports/ReportsPage.vue'), meta: { title: 'Rapports', roles: ['admin', 'auditeur'] } },
      { path: 'reports/fiscal', name: 'fiscal-reports', component: () => import('pages/reports/FiscalReportsPage.vue'), meta: { title: 'Rapports fiscaux', roles: ['admin'] } },
      { path: 'audit', name: 'audit', component: () => import('pages/audit/AuditLogPage.vue'), meta: { title: 'Journal d\'audit', roles: ['admin', 'auditeur'] } },
      { path: 'settings', name: 'settings', component: () => import('pages/settings/SettingsPage.vue'), meta: { title: 'Paramètres', roles: ['admin'] } },
    ],
  },

  // 404
  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
