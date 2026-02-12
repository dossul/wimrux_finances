import { ref } from 'vue';
import { insforge } from 'src/boot/insforge';
import type { Permission, CompanyRolePermission, UserRoleAssignment } from 'src/types';
import { DEFAULT_ROLE_PERMISSIONS, ALL_PERMISSIONS } from 'src/types';

// ============================================================================
// Granular RBAC + Multi-Role Fusion — WIMRUX® FINANCES
// ============================================================================
//
// Resolution order for hasPermission():
// 1. project_admin → all permissions (bypass)
// 2. admin → all permissions (bypass)
// 3. Collect ALL roles for the current user (primary + assigned)
// 4. For each role, compute effective permissions:
//    a. Start from DEFAULT_ROLE_PERMISSIONS
//    b. Apply company overrides (company_role_permissions, respecting expires_at)
// 5. Union all effective permissions across all user roles
//
// Multi-role: a user can hold multiple roles simultaneously.
// user_profiles.role = primary role
// user_role_assignments = additional roles (with optional expiry)
// Permissions are the UNION of all roles' effective permissions.
// ============================================================================

const companyOverrides = ref<CompanyRolePermission[]>([]);
const userRoleAssignments = ref<UserRoleAssignment[]>([]);
const loaded = ref(false);
const loading = ref(false);

// These are set by the auth-store after profile loads (avoids circular dep)
let _currentRole: string | null = null;
let _currentUserId: string | null = null;
let _companyId: string | null = null;
let _fullName: string | null = null;

export function usePermissions() {

  function setContext(role: string | null, userId: string | null, companyId: string | null, fullName: string | null) {
    _currentRole = role;
    _currentUserId = userId;
    _companyId = companyId;
    _fullName = fullName;
  }

  // Load all company overrides + user role assignments
  async function loadCompanyPermissions(): Promise<void> {
    if (!_companyId) return;
    loading.value = true;
    try {
      const [permRes, assignRes] = await Promise.all([
        insforge.database
          .from('company_role_permissions')
          .select('*')
          .eq('company_id', _companyId),
        insforge.database
          .from('user_role_assignments')
          .select('*')
          .eq('company_id', _companyId),
      ]);

      if (!permRes.error && permRes.data) {
        companyOverrides.value = permRes.data as CompanyRolePermission[];
      }
      if (!assignRes.error && assignRes.data) {
        userRoleAssignments.value = assignRes.data as UserRoleAssignment[];
      }
      loaded.value = true;
    } finally {
      loading.value = false;
    }
  }

  // All roles assigned to a specific user (primary + additional, excluding expired)
  function getUserRoles(userId: string): string[] {
    const now = new Date().toISOString();
    const roles = new Set<string>();

    // Additional roles from assignments
    for (const a of userRoleAssignments.value) {
      if (a.user_id !== userId) continue;
      if (a.expires_at && a.expires_at < now) continue;
      roles.add(a.role);
    }

    return [...roles];
  }

  // Get effective permissions for a specific role (with company overrides)
  function getEffectivePermissions(role: string): Permission[] {
    const now = new Date().toISOString();
    const defaults = (DEFAULT_ROLE_PERMISSIONS as Record<string, Permission[]>)[role] ?? [];
    const effective = new Set<Permission>(defaults);

    const overrides = companyOverrides.value.filter(o => o.role === role);
    for (const o of overrides) {
      if (o.expires_at && o.expires_at < now) continue;
      if (o.granted) {
        effective.add(o.permission);
      } else {
        effective.delete(o.permission);
      }
    }

    return [...effective];
  }

  // Get the UNION of effective permissions across ALL roles held by a user
  function getUserEffectivePermissions(userId: string, primaryRole: string): Permission[] {
    const allRoles = [primaryRole, ...getUserRoles(userId)];
    const union = new Set<Permission>();
    for (const role of allRoles) {
      for (const p of getEffectivePermissions(role)) {
        union.add(p);
      }
    }
    return [...union];
  }

  // Check if the current user has a specific permission
  function hasPermission(permission: Permission): boolean {
    if (!_currentRole) return false;
    if (_currentRole === 'project_admin') return true;
    if (_currentRole === 'admin') return true;

    const perms = getUserEffectivePermissions(_currentUserId || '', _currentRole);
    return perms.includes(permission);
  }

  function hasAnyPermission(permissions: Permission[]): boolean {
    return permissions.some(p => hasPermission(p));
  }

  function hasAllPermissions(permissions: Permission[]): boolean {
    return permissions.every(p => hasPermission(p));
  }

  // ---------- Admin management functions ----------

  async function bulkSetPermissions(
    role: string,
    permissions: { permission: Permission; granted: boolean; expires_at?: string | null }[],
  ): Promise<{ error?: string }> {
    if (!_companyId) return { error: 'Pas de company_id' };

    const grantedBy = _fullName || _currentUserId || '';
    const now = new Date().toISOString();

    const rows = permissions.map(p => ({
      company_id: _companyId,
      role,
      permission: p.permission,
      granted: p.granted,
      expires_at: p.expires_at || null,
      granted_by: grantedBy,
      updated_at: now,
    }));

    const { error } = await insforge.database
      .from('company_role_permissions')
      .upsert(rows, { onConflict: 'company_id,role,permission' });

    if (error) return { error: error.message };
    await loadCompanyPermissions();
    return {};
  }

  async function resetRoleToDefaults(role: string): Promise<{ error?: string }> {
    if (!_companyId) return { error: 'Pas de company_id' };

    const { error } = await insforge.database
      .from('company_role_permissions')
      .delete()
      .eq('company_id', _companyId)
      .eq('role', role);

    if (error) return { error: error.message };
    await loadCompanyPermissions();
    return {};
  }

  // ---- Multi-role assignment management ----

  async function assignRole(
    userId: string,
    role: string,
    expiresAt?: string | null,
  ): Promise<{ error?: string }> {
    if (!_companyId) return { error: 'Pas de company_id' };

    const { error } = await insforge.database
      .from('user_role_assignments')
      .upsert({
        user_id: userId,
        company_id: _companyId,
        role,
        is_primary: false,
        assigned_by: _fullName || _currentUserId || '',
        expires_at: expiresAt || null,
      }, { onConflict: 'user_id,company_id,role' });

    if (error) return { error: error.message };
    await loadCompanyPermissions();
    return {};
  }

  async function revokeRole(userId: string, role: string): Promise<{ error?: string }> {
    if (!_companyId) return { error: 'Pas de company_id' };

    const { error } = await insforge.database
      .from('user_role_assignments')
      .delete()
      .eq('user_id', userId)
      .eq('company_id', _companyId)
      .eq('role', role);

    if (error) return { error: error.message };
    await loadCompanyPermissions();
    return {};
  }

  function getAssignmentsForUser(userId: string): UserRoleAssignment[] {
    return userRoleAssignments.value.filter(a => a.user_id === userId);
  }

  return {
    loaded,
    loading,
    companyOverrides,
    userRoleAssignments,
    setContext,
    loadCompanyPermissions,
    getUserRoles,
    getEffectivePermissions,
    getUserEffectivePermissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    bulkSetPermissions,
    resetRoleToDefaults,
    assignRole,
    revokeRole,
    getAssignmentsForUser,
    ALL_PERMISSIONS,
  };
}
