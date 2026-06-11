// =============================================================================
// WIMRUX® FINANCES — Composable AI Settings (Sprint AI pré-travail)
// Gestion providers BYOK + routing tâches × modèles par tenant
// =============================================================================
import { ref, computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store';
import type {
  AiProvider, AiModel, AiTask, CompanyAiCredential,
  CompanyAiTaskRouting, AiCreditPack, CompanyAiQuotaUsage
} from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';

export function useAiSettings() {
  const companyStore = useCompanyStore();
  const companyId = computed(() => companyStore.company?.id ?? '');

  const providers   = ref<AiProvider[]>([]);
  const models      = ref<AiModel[]>([]);
  const tasks       = ref<AiTask[]>([]);
  const credentials = ref<CompanyAiCredential[]>([]);
  const routings    = ref<CompanyAiTaskRouting[]>([]);
  const creditPacks = ref<AiCreditPack[]>([]);
  const quotaUsage  = ref<CompanyAiQuotaUsage | null>(null);
  const loading     = ref(false);
  const error       = ref<string | null>(null);

  // ---------------------------------------------------------------------------
  // GLOBAL DATA (read-only for tenants)
  // ---------------------------------------------------------------------------
  async function loadProviders() {
    const { data } = await appwriteDb
      .from('ai_providers')
      .select('*')
      .order('name');
    providers.value = data || [];
  }

  async function loadModels() {
    const { data } = await appwriteDb
      .from('ai_models')
      .select('*')
      .order('display_name');
    models.value = data || [];
  }

  async function loadTasks() {
    const { data } = await appwriteDb
      .from('ai_tasks')
      .select('*')
      .order('category, name');
    tasks.value = data || [];
  }

  async function loadCreditPacks() {
    const { data } = await appwriteDb
      .from('ai_credit_packs')
      .select('*')
      .eq('is_active', true)
      .order('price_xof');
    creditPacks.value = data || [];
  }

  // ---------------------------------------------------------------------------
  // COMPANY-SPECIFIC : credentials BYOK
  // ---------------------------------------------------------------------------
  async function loadCredentials() {
    const { data } = await appwriteDb
      .from('company_ai_credentials')
      .select('*')
      .eq('company_id', companyId.value)
      .order('created_at', { ascending: false });
    credentials.value = data || [];
  }

  async function saveCredential(payload: {
    provider_id: string;
    api_key_encrypted: string;
    label?: string;
    is_active?: boolean;
  }) {
    loading.value = true;
    try {
      const { data, error: err } = await appwriteDb
        .from('company_ai_credentials')
        .insert([{
          ...payload,
          company_id: companyId.value,
        }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
      if (err) { error.value = err.message; return null; }
      if (data) credentials.value.unshift(data);
      return data;
    } finally { loading.value = false; }
  }

  async function deleteCredential(id: string) {
    const { error: err } = await appwriteDb
      .from('company_ai_credentials')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId.value);
    if (err) { error.value = err.message; return false; }
    credentials.value = credentials.value.filter(c => c.id !== id);
    return true;
  }

  async function toggleCredential(id: string, isActive: boolean) {
    const { error: err } = await appwriteDb
      .from('company_ai_credentials')
      .update(id, { is_active: isActive });
    if (err) { error.value = err.message; return; }
    const idx = credentials.value.findIndex(c => c.id === id);
    if (idx !== -1) credentials.value[idx] = { ...credentials.value[idx]!, is_active: isActive };
  }

  // ---------------------------------------------------------------------------
  // COMPANY-SPECIFIC : routing personnalisé (tâche → modèle)
  // ---------------------------------------------------------------------------
  async function loadRoutings() {
    const { data } = await appwriteDb
      .from('company_ai_task_routing')
      .select('*')
      .eq('company_id', companyId.value)
      .order('created_at', { ascending: false });
    routings.value = data || [];
  }

  async function setRouting(taskId: string, modelId: string, providerId?: string) {
    loading.value = true;
    try {
      // Upsert : supprimer l'ancien routing pour cette tâche, insérer le nouveau
      await appwriteDb
        .from('company_ai_task_routing')
        .delete()
        .eq('company_id', companyId.value)
        .eq('task_id', taskId);

      const { data, error: err } = await appwriteDb
        .from('company_ai_task_routing')
        .insert([{
          company_id: companyId.value,
          task_id: taskId,
          model_id: modelId,
          provider_id: providerId ?? null,
          is_active: true,
        }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
      if (err) { error.value = err.message; return null; }
      // Mettre à jour local
      routings.value = routings.value.filter(r => r.task_id !== taskId);
      if (data) routings.value.push(data);
      return data;
    } finally { loading.value = false; }
  }

  async function removeRouting(taskId: string) {
    await appwriteDb
      .from('company_ai_task_routing')
      .delete()
      .eq('company_id', companyId.value)
      .eq('task_id', taskId);
    routings.value = routings.value.filter(r => r.task_id !== taskId);
  }

  // ---------------------------------------------------------------------------
  // QUOTA & CREDITS
  // ---------------------------------------------------------------------------
  async function loadQuotaUsage() {
    const { data } = await appwriteDb
      .from('company_ai_quota_usage')
      .select('*')
      .eq('company_id', companyId.value)
      .single();
    quotaUsage.value = data || null;
  }

  const quotaPercent = computed(() => {
    if (!quotaUsage.value) return 0;
    const { monthly_quota_usd, used_usd } = quotaUsage.value;
    if (!monthly_quota_usd) return 0;
    return Math.min(100, Math.round((used_usd / monthly_quota_usd) * 100));
  });

  // ---------------------------------------------------------------------------
  // INIT
  // ---------------------------------------------------------------------------
  async function loadAll() {
    loading.value = true;
    try {
      await Promise.all([
        loadProviders(), loadModels(), loadTasks(),
        loadCredentials(), loadRoutings(), loadQuotaUsage(), loadCreditPacks(),
      ]);
    } finally { loading.value = false; }
  }

  return {
    providers, models, tasks, credentials, routings, creditPacks, quotaUsage,
    loading, error, quotaPercent,
    loadAll, loadProviders, loadModels, loadTasks, loadCreditPacks,
    loadCredentials, saveCredential, deleteCredential, toggleCredential,
    loadRoutings, setRouting, removeRouting,
    loadQuotaUsage,
  };
}
