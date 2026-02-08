import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import type { UserProfile, UserRole } from 'src/types';

interface InsForgeUser {
  id: string;
  email: string;
  emailVerified: boolean;
  profile: { name?: string; avatar_url?: string };
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<InsForgeUser | null>(null);
  const profile = ref<UserProfile | null>(null);
  const loading = ref(false);

  const isAuthenticated = computed(() => !!user.value);
  const role = computed<UserRole | null>(() => profile.value?.role ?? null);
  const companyId = computed(() => profile.value?.company_id ?? null);
  const fullName = computed(() => profile.value?.full_name ?? '');

  async function loadSession() {
    loading.value = true;
    try {
      const { data, error } = await insforge.auth.getCurrentSession();
      if (!error && data?.session?.user) {
        user.value = data.session.user as InsForgeUser;
        await loadProfile();
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
    }
  }

  async function login(email: string, password: string) {
    const { data, error } = await insforge.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data) {
      user.value = data.user as InsForgeUser;
      await loadProfile();
    }
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
  }

  async function forgotPassword(email: string) {
    const { data, error } = await insforge.auth.sendResetPasswordEmail({ email });
    if (error) throw error;
    return data;
  }

  function hasRole(requiredRole: UserRole): boolean {
    return role.value === requiredRole;
  }

  function hasAnyRole(roles: UserRole[]): boolean {
    return role.value !== null && roles.includes(role.value);
  }

  return {
    user,
    profile,
    loading,
    isAuthenticated,
    role,
    companyId,
    fullName,
    loadSession,
    login,
    register,
    logout,
    forgotPassword,
    hasRole,
    hasAnyRole,
  };
});
