import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import { usePermissions } from 'src/composables/usePermissions';
import type { UserProfile, UserRole, Permission } from 'src/types';

const INSFORGE_BASE_URL = import.meta.env.VITE_INSFORGE_URL as string;

async function sendBrandedResetEmail(to: string, resetUrl: string, name?: string): Promise<void> {
  try {
    const res = await fetch(`${INSFORGE_BASE_URL}/functions/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to,
        template: 'reset_password',
        vars: { reset_url: resetUrl, name: name ?? '' },
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
  } catch (err) {
    console.error('[Auth] Failed to send branded reset email:', err);
    throw new Error('Envoi de l\'email de réinitialisation échoué');
  }
}

interface InsForgeUser {
  id: string;
  email: string;
  emailVerified: boolean;
  profile: { name?: string; avatar_url?: string };
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<InsForgeUser | null>(null);
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
      const { data, error } = await insforge.auth.getCurrentUser();
      if (!error && data?.user) {
        user.value = data.user as InsForgeUser;
        accessToken.value = null;
        console.log('[Auth Store] Session loaded for user:', user.value.email);
        await loadProfile();
      } else if (error) {
        console.error('[Auth Store] Error loading session:', error);
        const msg = String((error as { message?: string })?.message ?? error);
        if (/csrf|invalid token|jwt|expired/i.test(msg)) {
          console.warn('[Auth Store] Session corrompue — purge et redirection login');
          try { localStorage.clear(); sessionStorage.clear(); } catch (_e) { /* ignore */ }
          user.value = null;
          accessToken.value = null;
          profile.value = null;
          // Rediriger vers login si pas deja dessus
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/auth/')) {
            window.location.href = '/auth/login';
          }
        }
      } else {
        console.log('[Auth Store] No active session found');
      }
    } finally {
      loading.value = false;
    }
  }

  async function loadProfile() {
    if (!user.value) return;
    const { data, error } = await insforge.database
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.value.id)
      .single();

    if (!error && data) {
      profile.value = data as UserProfile;
      // Set permission context and load granular permissions
      permissions.setContext(
        profile.value.role,
        user.value.id,
        profile.value.company_id,
        profile.value.full_name,
      );
      // Only load permissions if we have both user_id and company_id
      if (profile.value.company_id && user.value.id) {
        await permissions.loadCompanyPermissions();
      }
    } else if (error) {
      console.error('[Auth Store] Error loading user profile:', error);
    }
  }

  async function login(email: string, password: string) {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data) {
      user.value = data.user as InsForgeUser;
      accessToken.value = (data as unknown as { accessToken?: string }).accessToken ?? null;
      await loadProfile();
    }
  }

  /**
   * Tente de renouveler le JWT via le refresh token InsForge.
   * Appelé automatiquement par le boot 401-interceptor.
   * Retourne true si le refresh a réussi.
   */
  async function refreshSession(): Promise<boolean> {
    try {
      // InsForge SDK refresh
      const result = await (insforge.auth as unknown as {
        refreshSession?: () => Promise<{ data?: { session?: { user?: unknown; accessToken?: string } }; error?: unknown }>;
      }).refreshSession?.();

      if (result?.data?.session?.user) {
        user.value = result.data.session.user as InsForgeUser;
        accessToken.value = result.data.session.accessToken ?? null;
        await loadProfile();
        console.log('[Auth Store] Session refreshée avec succès');
        return true;
      }
    } catch (e) {
      console.warn('[Auth Store] Refresh échoué:', e);
    }
    // Si le refresh echoue, recharger depuis getCurrentUser (parfois suffisant)
    await loadSession();
    return !!user.value;
  }

  async function register(email: string, password: string, name: string) {
    const { data, error } = await insforge.auth.signUp({
      email,
      password,
      name,
    });
    if (error) throw error;
    return data;
  }

  async function logout() {
    await insforge.auth.signOut();
    user.value = null;
    profile.value = null;
    accessToken.value = null;
    permissions.companyOverrides.value = [];
    permissions.userRoleAssignments.value = [];
    permissions.customRoles.value = [];
    permissions.setContext(null, null, null, null);
  }

  async function forgotPassword(emailAddr: string) {
    const resetUrl = `${window.location.origin}/auth/reset-password`;
    // E02 — Envoyer notre email branded WIMRUX (contient le lien de réinitialisation)
    await sendBrandedResetEmail(emailAddr, resetUrl);
    // Déclencher aussi le reset natif InsForge (backend token)
    const { data, error } = await insforge.auth.sendResetPasswordEmail({ email: emailAddr });
    if (error) throw error;
    return data;
  }

  function hasRole(requiredRole: UserRole): boolean {
    return role.value === requiredRole;
  }

  function hasAnyRole(roles: UserRole[]): boolean {
    if (role.value === null) return false;
    // project_admin has access to everything
    if (role.value === 'project_admin') return true;
    return roles.includes(role.value);
  }

  // Granular permission checks (delegates to usePermissions)
  function hasPermission(p: Permission): boolean {
    return permissions.hasPermission(p);
  }

  function hasAnyPermission(ps: Permission[]): boolean {
    return permissions.hasAnyPermission(ps);
  }

  return {
    user,
    profile,
    accessToken,
    loading,
    isAuthenticated,
    role,
    companyId,
    fullName,
    phone,
    twoFaEnabled,
    permissions,
    loadSession,
    login,
    register,
    logout,
    forgotPassword,
    refreshProfile: loadProfile,
    refreshSession,
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,
  };
});
