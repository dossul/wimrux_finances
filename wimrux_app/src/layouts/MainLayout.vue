<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated class="bg-primary">
      <q-toolbar>
        <q-btn flat dense round icon="menu" aria-label="Menu" @click="toggleLeftDrawer" />

        <q-toolbar-title class="text-weight-bold">
          WIMRUX® FINANCES
        </q-toolbar-title>

        <q-space />

        <div class="q-gutter-sm row items-center no-wrap">
          <!-- Company selector -->
          <q-select
            v-if="companyOptions.length > 1"
            v-model="activeCompanyId"
            :options="companyOptions"
            emit-value
            map-options
            dense
            outlined
            dark
            hide-dropdown-icon
            style="min-width: 160px; max-width: 220px"
            class="gt-sm"
          >
            <template v-slot:prepend>
              <q-icon name="business" size="xs" />
            </template>
          </q-select>
          <div v-else-if="companyStore.companyName" class="text-body2 text-white gt-sm row items-center no-wrap">
            <q-icon name="business" size="xs" class="q-mr-xs" />
            {{ companyStore.companyName }}
          </div>

          <q-icon :name="realtimeConnected ? 'wifi' : 'wifi_off'" :color="realtimeConnected ? 'green-3' : 'red-3'" size="xs">
            <q-tooltip>{{ realtimeConnected ? 'Temps réel connecté' : 'Temps réel déconnecté' }}</q-tooltip>
          </q-icon>
          <NotificationBell />
          <span class="text-body2 gt-sm" data-testid="user-fullname">{{ authStore.fullName }}</span>
          <q-btn flat round dense icon="account_circle" data-testid="user-menu">
            <q-menu>
              <q-list style="min-width: 200px">
                <q-item-label header>{{ authStore.fullName }}</q-item-label>
                <q-item-label header class="text-caption text-grey">{{ authStore.role }}</q-item-label>
                <q-item-label v-if="companyStore.companyName" header class="text-caption text-primary q-pt-none">
                  <q-icon name="business" size="xs" class="q-mr-xs" />{{ companyStore.companyName }}
                </q-item-label>
                <!-- Switch entreprise dans le menu (mobile) -->
                <template v-if="companyOptions.length > 1">
                  <q-separator />
                  <q-item-label header class="text-caption">Changer d'entreprise</q-item-label>
                  <q-item
                    v-for="opt in companyOptions"
                    :key="opt.value"
                    clickable
                    v-close-popup
                    @click="activeCompanyId = opt.value"
                    :active="opt.value === activeCompanyId"
                    active-class="text-primary"
                  >
                    <q-item-section avatar>
                      <q-icon name="business" size="xs" />
                    </q-item-section>
                    <q-item-section>{{ opt.label }}</q-item-section>
                    <q-item-section side v-if="opt.value === activeCompanyId">
                      <q-icon name="check" color="primary" size="xs" />
                    </q-item-section>
                  </q-item>
                </template>
                <q-separator />
                <q-item clickable v-close-popup to="/app/settings">
                  <q-item-section avatar><q-icon name="settings" /></q-item-section>
                  <q-item-section>Paramètres</q-item-section>
                </q-item>
                <q-item clickable v-close-popup @click="onLogout" data-testid="logout-btn">
                  <q-item-section avatar><q-icon name="logout" /></q-item-section>
                  <q-item-section>Déconnexion</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered data-testid="main-sidebar">
      <q-list>
        <q-item-label header class="text-weight-bold text-primary">Navigation</q-item-label>

        <template v-for="nav in navItems" :key="nav.route">
          <q-item
            v-if="canAccess(nav)"
            :to="nav.route"
            exact
            clickable
            v-ripple
            active-class="text-primary bg-blue-1"
            :data-testid="'nav-' + nav.route.replace('/app/', '').replace(/\//g, '-')"
          >
            <q-item-section avatar>
              <q-icon :name="nav.icon" />
            </q-item-section>
            <q-item-section>{{ nav.label }}</q-item-section>
          </q-item>
        </template>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <FeedbackFab />
  </q-layout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store-appwrite';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import { useRealtimeNotifications } from 'src/composables/useRealtimeNotifications';
import NotificationBell from 'src/components/NotificationBell.vue';
import FeedbackFab from 'src/components/FeedbackFab.vue';
import type { Company, Permission, UserRole } from 'src/types';

const router = useRouter();
const authStore = useAuthStore();
const companyStore = useCompanyStore();
const { connect: connectRealtime, connected: realtimeConnected } = useRealtimeNotifications();
const leftDrawerOpen = ref(false);

const companyOptions = computed(() =>
  companyStore.companies.map((c: Company) => ({ label: c.name, value: c.id, company: c }))
);
const activeCompanyId = computed({
  get: () => companyStore.company?.id ?? null,
  set: (id: string | null) => {
    if (!id) return;
    const c = companyStore.companies.find((co: Company) => co.id === id);
    if (c) companyStore.setActiveCompany(c);
  },
});

interface NavItem {
  label: string;
  icon: string;
  route: string;
  permissions: Permission[];
  roleRequired?: UserRole;
}

const navItems: NavItem[] = [
  { label: 'Tableau de bord', icon: 'dashboard', route: '/app', permissions: ['dashboard.view'] },
  { label: 'Factures', icon: 'receipt_long', route: '/app/invoices', permissions: ['invoices.read'] },
  { label: 'Factures reçues', icon: 'receipt', route: '/app/invoices/received', permissions: ['invoices.read'] },
  { label: 'Fournisseurs', icon: 'business', route: '/app/suppliers', permissions: ['invoices.read'] },
  { label: 'Balance âgée', icon: 'hourglass_bottom', route: '/app/receivables', permissions: ['invoices.read'] },
  { label: 'Paiements fiscaux', icon: 'account_balance', route: '/app/tax-payments', permissions: ['invoices.read'] },
  { label: 'Budgets', icon: 'savings', route: '/app/budgets', permissions: ['treasury.read'] },
  { label: 'Trésorerie prévisionnelle', icon: 'show_chart', route: '/app/treasury/cashflow', permissions: ['treasury.read'] },
  { label: 'Immobilisations', icon: 'inventory', route: '/app/assets', permissions: ['treasury.read'] },
  { label: 'Emprunts', icon: 'request_quote', route: '/app/loans', permissions: ['treasury.read'] },
  { label: 'Investissements', icon: 'trending_up', route: '/app/investments', permissions: ['treasury.read'] },
  { label: 'Petite caisse', icon: 'savings', route: '/app/petty-cash', permissions: ['treasury.read'] },
  { label: 'Wallets mobiles', icon: 'smartphone', route: '/app/mobile-wallets', permissions: ['treasury.read'] },
  { label: 'Wallets de paiement', icon: 'account_balance_wallet', route: '/app/wallets', permissions: ['treasury.read'] },
  { label: 'Déclarations fiscales', icon: 'gavel', route: '/app/fiscal/declarations', permissions: ['treasury.read'] },
  { label: 'Retenues à la source', icon: 'account_balance_wallet', route: '/app/fiscal/withholding', permissions: ['treasury.read'] },
  { label: "Workflows d'approbation", icon: 'account_tree', route: '/app/approvals/workflows', permissions: ['settings.manage'] },
  { label: 'Articles', icon: 'inventory_2', route: '/app/articles', permissions: ['invoices.create'] },
  { label: 'Clients', icon: 'people', route: '/app/clients', permissions: ['clients.read'] },
  { label: 'Trésorerie', icon: 'account_balance', route: '/app/treasury', permissions: ['treasury.read'] },
  { label: 'Banque', icon: 'account_balance_wallet', route: '/app/banking', permissions: ['treasury.read'] },
  { label: 'Rapports', icon: 'assessment', route: '/app/reports', permissions: ['reports.read'] },
  { label: 'Bilan & Résultat', icon: 'account_balance', route: '/app/reports/standard', permissions: ['reports.read'] },
  { label: 'Query Builder', icon: 'query_stats', route: '/app/reports/query-builder', permissions: ['reports.read'] },
  { label: 'Tableaux de bord', icon: 'dashboard_customize', route: '/app/reports/dashboards', permissions: ['reports.read'] },
  { label: 'Journal d\'audit', icon: 'history', route: '/app/audit', permissions: ['audit.read'] },
  { label: 'Assistant IA', icon: 'smart_toy', route: '/app/ai-assistant', permissions: ['ai.use'] },
  { label: 'Analyse avec IA', icon: 'psychology', route: '/app/ai/ask', permissions: ['ai.use'] },
  { label: 'Consommation IA', icon: 'analytics', route: '/app/admin/ai-usage', permissions: ['settings.manage'], roleRequired: 'project_admin' },
  { label: 'Chatbot API', icon: 'hub', route: '/app/admin/chatbot', permissions: ['settings.manage'], roleRequired: 'project_admin' },
  { label: 'Paramètres', icon: 'settings', route: '/app/settings', permissions: ['settings.manage'] },
  { label: 'Confidentialité & RGPD', icon: 'security', route: '/app/settings/privacy', permissions: [] },
  { label: 'Support', icon: 'support_agent', route: '/app/support', permissions: [] },
  { label: 'KPI Admin', icon: 'bar_chart', route: '/app/admin/kpi', permissions: ['settings.manage'], roleRequired: 'project_admin' },
  { label: 'Monitoring', icon: 'monitor_heart', route: '/app/admin/health', permissions: ['settings.manage'], roleRequired: 'project_admin' },
];

function canAccess(nav: NavItem): boolean {
  if (nav.roleRequired && authStore.role !== nav.roleRequired) return false;
  return authStore.hasAnyPermission(nav.permissions);
}

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

async function onLogout() {
  await authStore.logout();
  await router.push({ name: 'login' });
}

onMounted(() => {
  void connectRealtime();
  if (authStore.companyId) {
    void companyStore.loadCompanies(authStore.companyId);
  }
});
</script>
