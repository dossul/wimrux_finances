import { ref, computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import { useAuthStore } from 'src/stores/auth-store-appwrite';
import type {
  CustomDashboard, CustomDashboardInput, DashboardWidget,
} from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';

export function useDashboards() {
  const companyStore = useCompanyStore();
  const authStore = useAuthStore();
  const companyId = computed(() => companyStore.company?.id ?? '');
  const userId = computed(() => authStore.user?.id ?? null);

  const dashboards = ref<CustomDashboard[]>([]);
  const currentDashboard = ref<CustomDashboard | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadDashboards(): Promise<void> {
    loading.value = true;
    error.value = null;
    const { data, error: err } = await appwriteDb
      .from('custom_dashboards')
      .select('*')
      .eq('company_id', companyId.value)
      .order('$createdAt', { ascending: false });
    if (err) { error.value = err.message; }
    else {
      dashboards.value = (data as CustomDashboard[]) || [];
      // Auto-select default if any
      if (!currentDashboard.value) {
        currentDashboard.value = dashboards.value.find(d => d.is_default) || dashboards.value[0] || null;
      }
    }
    loading.value = false;
  }

  async function loadDashboard(id: string): Promise<void> {
    const { data, error: err } = await appwriteDb
      .from('custom_dashboards')
      .select('*')
      .eq('id', id)
      .eq('company_id', companyId.value)
      .single();
    if (err) { error.value = err.message; return; }
    currentDashboard.value = data as CustomDashboard;
  }

  async function createDashboard(input: CustomDashboardInput): Promise<CustomDashboard | null> {
    const { data, error: err } = await appwriteDb
      .from('custom_dashboards')
      .insert([{
        ...input,
        company_id: companyId.value,
        user_id: userId.value,
        layout: input.layout ?? [],
      }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
    if (err) { error.value = err.message; return null; }
    await loadDashboards();
    return data as CustomDashboard;
  }

  async function updateDashboard(id: string, input: Partial<CustomDashboardInput>): Promise<boolean> {
    const { error: err } = await appwriteDb
      .from('custom_dashboards')
      .update(id, input);
    if (err) { error.value = err.message; return false; }
    await loadDashboards();
    if (currentDashboard.value?.id === id) await loadDashboard(id);
    return true;
  }

  async function deleteDashboard(id: string): Promise<boolean> {
    const { error: err } = await appwriteDb
      .from('custom_dashboards')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId.value);
    if (err) { error.value = err.message; return false; }
    if (currentDashboard.value?.id === id) currentDashboard.value = null;
    await loadDashboards();
    return true;
  }

  async function setDefault(id: string): Promise<boolean> {
    // Unset previous default
    await appwriteDb
      .from('custom_dashboards')
      .updateWhere({ is_default: false })
      .eq('company_id', companyId.value)
      .eq('is_default', true);
    return updateDashboard(id, { is_default: true });
  }

  // --- Widget operations on current dashboard ---

  async function addWidget(widget: DashboardWidget): Promise<boolean> {
    if (!currentDashboard.value) return false;
    const newLayout = [...currentDashboard.value.layout, widget];
    return updateDashboard(currentDashboard.value.id, { layout: newLayout });
  }

  async function removeWidget(widgetId: string): Promise<boolean> {
    if (!currentDashboard.value) return false;
    const newLayout = currentDashboard.value.layout.filter(w => w.id !== widgetId);
    return updateDashboard(currentDashboard.value.id, { layout: newLayout });
  }

  async function updateWidget(widgetId: string, patch: Partial<DashboardWidget>): Promise<boolean> {
    if (!currentDashboard.value) return false;
    const newLayout = currentDashboard.value.layout.map(w =>
      w.id === widgetId ? { ...w, ...patch } : w
    );
    return updateDashboard(currentDashboard.value.id, { layout: newLayout });
  }

  async function persistLayout(layout: DashboardWidget[]): Promise<boolean> {
    if (!currentDashboard.value) return false;
    return updateDashboard(currentDashboard.value.id, { layout });
  }

  function generateWidgetId(): string {
    return 'w_' + Math.random().toString(36).slice(2, 10);
  }

  return {
    dashboards, currentDashboard, loading, error,
    loadDashboards, loadDashboard,
    createDashboard, updateDashboard, deleteDashboard, setDefault,
    addWidget, removeWidget, updateWidget, persistLayout,
    generateWidgetId,
  };
}
