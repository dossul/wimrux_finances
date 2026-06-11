import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { appwriteAuth } from 'src/services/appwrite-auth';
import { appwriteDb } from 'src/services/appwrite-db';
import { usePermissions } from 'src/composables/usePermissions';
import type { UserProfile, UserRole, Permission } from 'src/types';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT as string || 'https://appwrite.benga.live/v1';

async function sendBrandedResetEmail(to: string, resetUrl: string, name?: string): Promise<void> {
  try {
    const res = await fetch(`${APPWRITE_ENDPOINT}/functions/send-email/executions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        body: JSON.stringify({ to, template: 'reset_password', vars: { reset_url: resetUrl, name: name ?? '' } }),
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    console.error('[Auth] Failed to send branded reset email:', err);
  }
}

interface AppUser {
  id: string;
  email: string;
  emailVerified: boolean;
  profile: { name?: string; avatar_url?: string };
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AppUser | null>(null);
  const profile = ref<UserProfile | null>(null);
  const accessToken = ref<string | null>(null);
  const loading = ref(false);
  const permissions = usePermissions();

  const isAuthenticated = computed(() => !!user.value);
  const role = computed<UserRole | null>(() => profile.value?.role ?? null);
  const companyId = computed(() => profile.value?.company_id ?? null);
  const fullName = computed(() => profile.value?.full_name ?? '');
  const phone = computed(() => profile.value?.phone ?? null);
  const twoFaEnabled = computed(() => profile.value?.two_fa_enabled ?? true);

  async function loadSession() {
    loading.value = true;
    try {
      const { user: authUser, error } = await appwriteAuth.getCurrentUser();
      if (!error && authUser) {
        user.value = authUser as unknown as AppUser;
        accessToken.value = null;
        await loadProfile();
      } else if (error) {
        const msg = String((error as { message?: string })?.message ?? error);
        if (/csrf|invalid token|jwt|expired/i.test(msg)) {
          try { localStorage.clear(); sessionStorage.clear(); } catch { /* ignore */ }
          user.value = null; accessToken.value = null; profile.value = null;
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/')) {
            window.location.href = '/auth/login';
          }
        }
      }
    } finally {
      loading.value = false;
    }
  }

  async function loadProfile() {
    if (!user.value) return;
    const { data, error } = await appwriteDb
      .from('user_profiles')
      .eq('user_id', user.value.id)
      .single();

    if (!error && data) {
      profile.value = data as UserProfile;
      permissions.setContext(profile.value.role, user.value.id, profile.value.company_id, profile.value.full_name);
      if (profile.value.company_id && user.value.id) {
        await permissions.loadCompanyPermissions();
      }
    }
  }

  async function login(email: string, password: string) {
    const { user: authUser, error } = await appwriteAuth.signIn(email, password);
    if (error) throw error;
    if (authUser) {
      user.value = authUser as unknown as AppUser;
      await loadProfile();
    }
  }

  async function refreshSession(): Promise<boolean> {
    await loadSession();
    return !!user.value;
  }

  async function register(email: string, password: string, name: string) {
    const { user: authUser, error } = await appwriteAuth.signUp(email, password, name);
    if (error) throw error;
    return authUser;
  }

  async function logout() {
    await appwriteAuth.signOut();
    user.value = null; profile.value = null; accessToken.value = null;
    permissions.companyOverrides.value = [];
    permissions.userRoleAssignments.value = [];
    permissions.customRoles.value = [];
    permissions.setContext(null, null, null, null);
  }

  async function forgotPassword(emailAddr: string) {
    const resetUrl = `${window.location.origin}/auth/reset-password`;
    await sendBrandedResetEmail(emailAddr, resetUrl);
    const { data, error } = await appwriteAuth.sendPasswordRecovery(emailAddr);
    if (error) throw error;
    return data;
  }

  function hasRole(requiredRole: UserRole): boolean { return role.value === requiredRole; }
  function hasAnyRole(roles: UserRole[]): boolean {
    if (!role.value) return false;
    if (role.value === 'project_admin') return true;
    return roles.includes(role.value);
  }
  function hasPermission(p: Permission): boolean { return permissions.hasPermission(p); }
  function hasAnyPermission(ps: Permission[]): boolean { return permissions.hasAnyPermission(ps); }

  return {
    user, profile, accessToken, loading,
    isAuthenticated, role, companyId, fullName, phone, twoFaEnabled, permissions,
    loadSession, login, register, logout, forgotPassword,
    refreshProfile: loadProfile, refreshSession,
    hasRole, hasAnyRole, hasPermission, hasAnyPermission,
  };
});
