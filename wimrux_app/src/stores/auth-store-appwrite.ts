import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { appwriteAuth, appwriteDb, functions, client } from 'src/services';
import { usePermissions } from 'src/composables/usePermissions';
import type { UserProfile, UserRole, Permission } from 'src/types';
import { ID } from 'appwrite';

const APPWRITE_BASE_URL = import.meta.env.VITE_APPWRITE_ENDPOINT as string || 'https://appwrite.benga.live/v1';

async function sendBrandedResetEmail(to: string, resetUrl: string, name?: string): Promise<void> {
  try {
    // Use Appwrite Functions instead of Appwrite
    const result = await functions.createExecution(
      'send-email', // Function ID in Appwrite
      JSON.stringify({
        to,
        template: 'reset_password',
        vars: { reset_url: resetUrl, name: name ?? '' },
      })
    );
    
    if (result.responseStatusCode !== 200) {
      throw new Error(`HTTP ${result.responseStatusCode}`);
    }
  } catch (err) {
    console.error('[Auth] Failed to send branded reset email:', err);
    // Don't throw - Appwrite has built-in email recovery
    console.log('[Auth] Using Appwrite built-in recovery email as fallback');
  }
}

interface AppwriteUserMapped {
  id: string;
  email: string;
  emailVerified: boolean;
  profile: { name?: string; avatar_url?: string };
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AppwriteUserMapped | null>(null);
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
      const { user: currentUser, error } = await appwriteAuth.getCurrentUser();
      
      if (!error && currentUser) {
        user.value = {
          id: currentUser.id,
          email: currentUser.email,
          emailVerified: currentUser.emailVerified,
          profile: Object.fromEntries(
          Object.entries({
            name: currentUser.name,
            avatar_url: currentUser.avatar_url,
          }).filter(([, v]) => v !== undefined)
        ) as { name?: string; avatar_url?: string },
        };
        
        // Appwrite doesn't expose accessToken directly, we use the session
        accessToken.value = null;
        console.log('[Auth Store] Session loaded for user:', currentUser.email);
        await loadProfile();
      } else if (error) {
        console.error('[Auth Store] Error loading session:', error);
        const msg = String((error as { message?: string })?.message ?? error);
        if (/unauthorized|jwt|expired|invalid/i.test(msg)) {
          console.warn('[Auth Store] Session corrompue — purge et redirection login');
          try { localStorage.clear(); sessionStorage.clear(); } catch (_e) { /* ignore */ }
          user.value = null;
          accessToken.value = null;
          profile.value = null;
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
    
    const { profile: userProfile, error } = await appwriteAuth.loadUserProfile(user.value.id);

    if (!error && userProfile) {
      profile.value = userProfile as UserProfile;
      permissions.setContext(
        profile.value.role,
        user.value.id,
        profile.value.company_id,
        profile.value.full_name,
      );
      if (profile.value.company_id && user.value.id) {
        await permissions.loadCompanyPermissions();
      }
    } else if (error) {
      console.error('[Auth Store] Error loading user profile:', error);
    }
  }

  async function login(email: string, password: string) {
    const { user: loggedInUser, session, error } = await appwriteAuth.signIn(email, password);
    if (error) throw error;
    if (loggedInUser) {
      user.value = {
        id: loggedInUser.id,
        email: loggedInUser.email,
        emailVerified: loggedInUser.emailVerified,
        profile: Object.fromEntries(
          Object.entries({
            name: loggedInUser.name,
            avatar_url: loggedInUser.avatar_url,
          }).filter(([, v]) => v !== undefined)
        ) as { name?: string; avatar_url?: string },
      };
      // Store session info if needed
      accessToken.value = null;
      await loadProfile();
    }
  }

  async function refreshSession(): Promise<boolean> {
    try {
      const { session, error } = await appwriteAuth.refreshSession();
      if (!error && session) {
        await loadSession();
        console.log('[Auth Store] Session refreshée avec succès');
        return true;
      }
    } catch (e) {
      console.warn('[Auth Store] Refresh échoué:', e);
    }
    await loadSession();
    return !!user.value;
  }

  async function register(email: string, password: string, name: string) {
    const { user: newUser, error } = await appwriteAuth.signUp(email, password, name);
    if (error) throw error;
    
    // Create user profile
    if (newUser) {
      const { data: profileData, error: profileError } = await appwriteAuth.createUserProfile({
        user_id: newUser.id,
        company_id: '', // Will be set later during onboarding
        full_name: name,
        role: 'admin', // Default role
        phone: '',
      });
      
      if (profileError) {
        console.error('[Auth Store] Error creating user profile:', profileError);
      }
    }
    
    return newUser;
  }

  async function logout() {
    await appwriteAuth.signOut();
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
    
    // Try branded email first
    await sendBrandedResetEmail(emailAddr, resetUrl);
    
    // Use Appwrite built-in recovery
    const { error } = await appwriteAuth.resetPassword(emailAddr, resetUrl);
    if (error) throw error;
  }

  function hasRole(requiredRole: UserRole): boolean {
    return role.value === requiredRole;
  }

  function hasAnyRole(roles: UserRole[]): boolean {
    if (role.value === null) return false;
    if (role.value === 'project_admin') return true;
    return roles.includes(role.value);
  }

  function hasPermission(p: Permission): boolean {
    return permissions.hasPermission(p);
  }

  function hasAnyPermission(ps: Permission[]): boolean {
    return permissions.hasAnyPermission(ps);
  }

  // Create a new company and assign current user as admin
  async function createCompany(companyData: {
    name: string;
    ifu: string;
    email: string;
    phone?: string;
    address?: string;
  }) {
    if (!user.value) throw new Error('User not authenticated');
    
    const { data: company, error: companyError } = await appwriteDb
      .from('companies')
      .insert({
        id: ID.unique(),
        name: companyData.name,
        ifu: companyData.ifu,
        email: companyData.email,
        phone: companyData.phone || '',
        address: companyData.address || '',
        is_active: true,
        created_at: new Date().toISOString(),
        country_code: 'BF',
        locale: 'fr-BF',
        fiscal_profile: 'BF',
      });
    
    if (companyError) throw companyError;
    
    // Update user profile with company
    if (profile.value?.id) {
      const { error: updateError } = await appwriteAuth.updateUserProfile(profile.value.id, {
        company_id: (company as any).$id,
        role: 'admin',
      });
      
      if (updateError) throw updateError;
      
      await loadProfile();
    }
    
    return company;
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
    createCompany,
  };
});

export default useAuthStore;
