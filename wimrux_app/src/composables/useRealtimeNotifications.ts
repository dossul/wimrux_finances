import { ref, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store-appwrite';
import { appwriteRealtime } from 'src/services/appwrite-realtime';

interface RealtimeEvent {
  id?: string;
  reference?: string;
  type?: string;
  status?: string;
  total_ttc?: number;
  fiscal_number?: string;
  action?: string;
  table_name?: string;
  record_id?: string;
  user_name?: string;
  created_at?: string;
  meta?: { messageId: string; channel: string; senderType: string; timestamp: Date };
}

export function useRealtimeNotifications() {
  const $q = useQuasar();
  const authStore = useAuthStore();
  const connected = ref(false);
  const events = ref<RealtimeEvent[]>([]);
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let retryCount = 0;
  let explicitlyDisconnected = false;

  async function connect() {
    const companyId = authStore.companyId;
    if (!companyId) return;
    if (connected.value) return;

    try {
      connected.value = true;
      retryCount = 0;


      // Subscribe to realtime invoice/audit events
      appwriteRealtime.subscribe(
        'databases.*.collections.invoices.documents',
        (payload: any) => {
          const doc = payload?.payload ?? payload;
          events.value.unshift(doc);
          if (doc?.status === 'certified') {
            $q.notify({ type: 'positive', icon: 'verified',
              message: 'Facture ' + (doc.reference ?? '') + ' certifiee', timeout: 5000 });
          } else if (doc?.status === 'validated') {
            $q.notify({ type: 'info', icon: 'check_circle',
              message: 'Facture ' + (doc.reference ?? '') + ' validee', timeout: 3000 });
          }
        }
      );
    } catch {
      connected.value = false;
      scheduleRetry();
    }
  }

  function scheduleRetry() {
    if (retryTimer || explicitlyDisconnected) return;
    retryCount++;
    // Backoff exponentiel plafonné à 60s (5s, 10s, 15s, 20s… 60s puis 60s en boucle)
    const delay = Math.min(5000 * retryCount, 60000);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void connect();
    }, delay);
  }

  function disconnect() {
    explicitlyDisconnected = true;
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    const companyId = authStore.companyId;
    if (companyId) {
      try {
          /* subscriptions cleaned up on page unmount */
      } catch { /* ignore */ }
    }
    connected.value = false;
  }

  // Reconnexion automatique quand l'onglet redevient visible
  function onVisibilityChange() {
    if (!document.hidden && !connected.value && !explicitlyDisconnected) {
      retryCount = 0;
      void connect();
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange);

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    disconnect();
  });

  return { connected, events, connect, disconnect };
}
