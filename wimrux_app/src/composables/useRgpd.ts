// =============================================================================
// WIMRUX® FINANCES — Composable RGPD (T20.x)
// Consentements, export/suppression données
// =============================================================================
import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useAuthStore } from 'src/stores/auth-store';
import { useCompanyStore } from 'src/stores/company-store';

export interface UserConsent {
  id: string;
  user_id: string;
  company_id: string | null;
  consent_type: string;
  version: string;
  consented: boolean;
  consented_at: string;
  revoked_at: string | null;
}

export interface DataExportRequest {
  id: string;
  user_id: string;
  company_id: string | null;
  request_type: 'export' | 'deletion';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requested_at: string;
  completed_at: string | null;
  download_url: string | null;
  notes: string | null;
}

export const CONSENT_TYPES = [
  { value: 'terms', label: "Conditions Générales d'Utilisation", required: true },
  { value: 'privacy', label: 'Politique de confidentialité', required: true },
  { value: 'cookies', label: 'Cookies analytiques', required: false },
  { value: 'marketing', label: 'Communications marketing', required: false },
  { value: 'data_processing', label: 'Traitement des données', required: true },
] as const;

export function useRgpd() {
  const authStore = useAuthStore();
  const companyStore = useCompanyStore();
  const userId = computed(() => authStore.user?.id ?? '');
  const companyId = computed(() => companyStore.company?.id ?? '');

  const consents = ref<UserConsent[]>([]);
  const exportRequests = ref<DataExportRequest[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ---------------------------------------------------------------------------
  // CONSENTEMENTS
  // ---------------------------------------------------------------------------
  async function loadConsents() {
    const { data } = await insforge.database
      .from('user_consents')
      .select('*')
      .eq('user_id', userId.value)
      .order('consented_at', { ascending: false });
    consents.value = data || [];
  }

  function getConsent(type: string): UserConsent | null {
    return consents.value.find(c => c.consent_type === type && c.consented && !c.revoked_at) ?? null;
  }

  function hasConsent(type: string): boolean {
    return !!getConsent(type);
  }

  async function giveConsent(type: string, version = '1.0') {
    loading.value = true;
    try {
      const { data, error: err } = await insforge.database
        .from('user_consents')
        .insert([{
          user_id: userId.value,
          company_id: companyId.value || null,
          consent_type: type,
          version,
          consented: true,
        }])
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) consents.value.unshift(data);
      return data;
    } finally { loading.value = false; }
  }

  async function revokeConsent(type: string) {
    const existing = getConsent(type);
    if (!existing) return;
    await insforge.database
      .from('user_consents')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', existing.id);
    const idx = consents.value.findIndex(c => c.id === existing.id);
    if (idx !== -1) consents.value[idx] = { ...consents.value[idx]!, revoked_at: new Date().toISOString() };
  }

  // ---------------------------------------------------------------------------
  // EXPORT / SUPPRESSION
  // ---------------------------------------------------------------------------
  async function loadExportRequests() {
    const { data } = await insforge.database
      .from('data_export_requests')
      .select('*')
      .eq('user_id', userId.value)
      .order('requested_at', { ascending: false });
    exportRequests.value = data || [];
  }

  async function requestDataExport() {
    loading.value = true;
    try {
      const { data, error: err } = await insforge.database
        .from('data_export_requests')
        .insert([{
          user_id: userId.value,
          company_id: companyId.value || null,
          request_type: 'export',
        }])
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) exportRequests.value.unshift(data);
      return data;
    } finally { loading.value = false; }
  }

  async function requestDataDeletion() {
    loading.value = true;
    try {
      const { data, error: err } = await insforge.database
        .from('data_export_requests')
        .insert([{
          user_id: userId.value,
          company_id: companyId.value || null,
          request_type: 'deletion',
        }])
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) exportRequests.value.unshift(data);
      return data;
    } finally { loading.value = false; }
  }

  const hasMandatoryConsents = computed(() =>
    CONSENT_TYPES.filter(c => c.required).every(c => hasConsent(c.value))
  );

  return {
    consents, exportRequests, loading, error, hasMandatoryConsents,
    loadConsents, getConsent, hasConsent, giveConsent, revokeConsent,
    loadExportRequests, requestDataExport, requestDataDeletion,
  };
}
