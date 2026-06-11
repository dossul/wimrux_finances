import { computed } from 'vue';
import { useAuthStore } from 'src/stores/auth-store-appwrite';
import type { UserProfile, UserRole, Permission } from 'src/types';

export function useAuth() {
  const authStore = useAuthStore();
  const user = computed(() => authStore.user);
  const profile = computed(() => authStore.profile);
  const isAuthenticated = computed(() => authStore.isAuthenticated);
  const isLoading = computed(() => authStore.loading);
  const role = computed(() => authStore.role);
  const companyId = computed(() => authStore.companyId);
  const fullName = computed(() => authStore.fullName);
  const phone = computed(() => authStore.phone);
  const twoFaEnabled = computed(() => authStore.twoFaEnabled);
  const permissions = computed(() => authStore.permissions);

  // Actions
  async function login(email: string, password: string) {
    return authStore.login(email, password);
  }

  async function register(email: string, password: string, name: string) {
    return authStore.register(email, password, name);
  }

  async function logout() {
    return authStore.logout();
  }

  async function forgotPassword(email: string) {
    return authStore.forgotPassword(email);
  }

  async function loadSession() {
    return authStore.loadSession();
  }

  async function refreshSession() {
    return authStore.refreshSession();
  }

  async function refreshProfile() {
    return authStore.refreshProfile();
  }

  // Permission checks
  function hasRole(requiredRole: UserRole): boolean {
    return authStore.hasRole?.(requiredRole) ?? false;
  }

  function hasAnyRole(roles: UserRole[]): boolean {
    return authStore.hasAnyRole?.(roles) ?? false;
  }

  function hasPermission(p: Permission): boolean {
    return authStore.hasPermission?.(p) ?? false;
  }

  function hasAnyPermission(ps: Permission[]): boolean {
    return authStore.hasAnyPermission?.(ps) ?? false;
  }

  async function createCompany(companyData: { name: string; ifu: string; email: string; phone?: string; address?: string }) {
    return authStore.createCompany(companyData);
  }

  return {
    // State
    user,
    profile,
    isAuthenticated,
    isLoading,
    role,
    companyId,
    fullName,
    phone,
    twoFaEnabled,
    permissions,
    backend: 'appwrite',
    useAppwrite: true,

    // Actions
    login,
    register,
    logout,
    forgotPassword,
    loadSession,
    refreshSession,
    refreshProfile,

    // Permissions
    hasRole,
    hasAnyRole,
    hasPermission,
    hasAnyPermission,

    // Appwrite specific
    createCompany,
  };
}

export default useAuth;
