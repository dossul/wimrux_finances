// =============================================================================
// WIMRUX® FINANCES — Composable Notifications (T16.x)
// =============================================================================
import { ref, computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import { useAuthStore } from 'src/stores/auth-store-appwrite';
import { appwriteDb } from 'src/services/appwrite-db';

export interface Notification {
  id: string;
  company_id: string;
  user_id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  is_archived: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  company_id: string;
  user_id: string;
  notification_type: string;
  channel_in_app: boolean;
  channel_email: boolean;
  channel_sms: boolean;
  is_enabled: boolean;
}

export const NOTIFICATION_TYPES = [
  { value: 'invoice_due', label: 'Facture en retard' },
  { value: 'payment_received', label: 'Paiement reçu' },
  { value: 'budget_alert', label: 'Alerte budget' },
  { value: 'loan_due', label: 'Échéance emprunt' },
  { value: 'approval_needed', label: 'Approbation requise' },
  { value: 'low_cash', label: 'Trésorerie basse' },
  { value: 'system', label: 'Système' },
] as const;

export function useNotifications() {
  const companyStore = useCompanyStore();
  const authStore = useAuthStore();
  const companyId = computed(() => companyStore.company?.id ?? '');
  const userId = computed(() => authStore.user?.id ?? '');

  const notifications = ref<Notification[]>([]);
  const preferences = ref<NotificationPreference[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const unreadCount = computed(() => notifications.value.filter(n => !n.is_read && !n.is_archived).length);
  const unreadNotifications = computed(() => notifications.value.filter(n => !n.is_read && !n.is_archived));

  // ---------------------------------------------------------------------------
  // LOAD
  // ---------------------------------------------------------------------------
  async function loadNotifications(limit = 50) {
    loading.value = true;
    try {
      const { data, error: err } = await appwriteDb
        .from('notifications')
        .select('*')
        .eq('company_id', companyId.value)
        .eq('user_id', userId.value)
        .eq('is_archived', false)
        .order('$createdAt', { ascending: false })
        .limit(limit);
      if (err) { error.value = err.message; return; }
      notifications.value = data || [];
    } finally { loading.value = false; }
  }

  async function loadPreferences() {
    const { data } = await appwriteDb
      .from('notification_preferences')
      .select('*')
      .eq('company_id', companyId.value)
      .eq('user_id', userId.value);
    preferences.value = data || [];
  }

  // ---------------------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------------------
  async function markAsRead(id: string) {
    await appwriteDb
      .from('notifications')
      .update(id, { is_read: true, read_at: new Date().toISOString() });
    const idx = notifications.value.findIndex(n => n.id === id);
    if (idx !== -1) {
      notifications.value[idx] = { ...notifications.value[idx]!, is_read: true, read_at: new Date().toISOString() };
    }
  }

  async function markAllAsRead() {
    await appwriteDb
      .from('notifications')
      .updateWhere({ is_read: true, read_at: new Date().toISOString() })
      .eq('company_id', companyId.value)
      .eq('user_id', userId.value)
      .eq('is_read', false);
    notifications.value = notifications.value.map(n => ({ ...n, is_read: true, read_at: n.read_at ?? new Date().toISOString() }));
  }

  async function archiveNotification(id: string) {
    await appwriteDb
      .from('notifications')
      .update(id, { is_archived: true });
    notifications.value = notifications.value.filter(n => n.id !== id);
  }

  async function archiveAll() {
    await appwriteDb
      .from('notifications')
      .updateWhere({ is_archived: true })
      .eq('company_id', companyId.value)
      .eq('user_id', userId.value)
      .eq('is_archived', false);
    notifications.value = [];
  }

  // ---------------------------------------------------------------------------
  // PREFERENCES
  // ---------------------------------------------------------------------------
  async function updatePreference(notificationType: string, updates: Partial<NotificationPreference>) {
    const existing = preferences.value.find(p => p.notification_type === notificationType);
    if (existing) {
      await appwriteDb
        .from('notification_preferences')
        .update(existing.id, { ...updates, updated_at: new Date().toISOString() });
      const idx = preferences.value.findIndex(p => p.id === existing.id);
      if (idx !== -1) preferences.value[idx] = { ...preferences.value[idx]!, ...updates };
    } else {
      const { data } = await appwriteDb
        .from('notification_preferences')
        .insert([{
          company_id: companyId.value,
          user_id: userId.value,
          notification_type: notificationType,
          channel_in_app: true,
          channel_email: false,
          channel_sms: false,
          is_enabled: true,
          ...updates,
        }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
      if (data) preferences.value.push(data);
    }
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------
  function getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'negative';
      case 'warning': return 'orange';
      default: return 'primary';
    }
  }

  function getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'warning': return 'warning';
      default: return 'info';
    }
  }

  function getTypeLabel(type: string): string {
    return NOTIFICATION_TYPES.find(t => t.value === type)?.label ?? type;
  }

  return {
    notifications, preferences, loading, error,
    unreadCount, unreadNotifications,
    loadNotifications, loadPreferences,
    markAsRead, markAllAsRead, archiveNotification, archiveAll,
    updatePreference,
    getSeverityColor, getSeverityIcon, getTypeLabel,
  };
}
