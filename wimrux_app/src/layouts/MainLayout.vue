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
          <q-icon :name="realtimeConnected ? 'wifi' : 'wifi_off'" :color="realtimeConnected ? 'green-3' : 'red-3'" size="xs">
            <q-tooltip>{{ realtimeConnected ? 'Temps réel connecté' : 'Temps réel déconnecté' }}</q-tooltip>
          </q-icon>
          <span class="text-body2 gt-sm">{{ authStore.fullName }}</span>
          <q-btn flat round dense icon="account_circle">
            <q-menu>
              <q-list style="min-width: 180px">
                <q-item-label header>{{ authStore.fullName }}</q-item-label>
                <q-item-label header class="text-caption text-grey">{{ authStore.role }}</q-item-label>
                <q-separator />
                <q-item clickable v-close-popup @click="onLogout">
                  <q-item-section avatar><q-icon name="logout" /></q-item-section>
                  <q-item-section>Déconnexion</q-item-section>
                </q-item>
              </q-list>
            </q-menu>
          </q-btn>
        </div>
      </q-toolbar>
    </q-header>

    <q-drawer v-model="leftDrawerOpen" show-if-above bordered>
      <q-list>
        <q-item-label header class="text-weight-bold text-primary">Navigation</q-item-label>

        <template v-for="nav in navItems" :key="nav.route">
          <q-item
            v-if="canAccess(nav.roles)"
            :to="nav.route"
            exact
            clickable
            v-ripple
            active-class="text-primary bg-blue-1"
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
  </q-layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';
import { useRealtimeNotifications } from 'src/composables/useRealtimeNotifications';
import type { UserRole } from 'src/types';

const router = useRouter();
const authStore = useAuthStore();
const { connect: connectRealtime, connected: realtimeConnected } = useRealtimeNotifications();
const leftDrawerOpen = ref(false);

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { label: 'Tableau de bord', icon: 'dashboard', route: '/', roles: ['admin', 'caissier', 'auditeur'] },
  { label: 'Factures', icon: 'receipt_long', route: '/invoices', roles: ['admin', 'caissier'] },
  { label: 'Clients', icon: 'people', route: '/clients', roles: ['admin', 'caissier'] },
  { label: 'Trésorerie', icon: 'account_balance', route: '/treasury', roles: ['admin'] },
  { label: 'Rapports', icon: 'assessment', route: '/reports', roles: ['admin', 'auditeur'] },
  { label: 'Rapports fiscaux', icon: 'description', route: '/reports/fiscal', roles: ['admin'] },
  { label: 'Journal d\'audit', icon: 'history', route: '/audit', roles: ['admin', 'auditeur'] },
  { label: 'Assistant IA', icon: 'smart_toy', route: '/ai-assistant', roles: ['admin', 'caissier', 'auditeur'] },
  { label: 'Suivi IA', icon: 'analytics', route: '/admin/ai-usage', roles: ['admin'] },
  { label: 'Chatbot API', icon: 'hub', route: '/admin/chatbot', roles: ['admin'] },
  { label: 'Paramètres', icon: 'settings', route: '/settings', roles: ['admin'] },
];

function canAccess(roles: UserRole[]): boolean {
  return authStore.hasAnyRole(roles);
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
});
</script>
