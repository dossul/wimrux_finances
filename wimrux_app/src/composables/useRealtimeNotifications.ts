import { ref, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { insforge } from 'src/boot/insforge';
import { useAuthStore } from 'src/stores/auth-store';

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
  const MAX_RETRY = 3;

  async function connect() {
    const companyId = authStore.companyId;
    if (!companyId) return;

    // Éviter les reconnexions en boucle (B-03 : conflit MCF / Wimrux Facturation)
    if (connected.value) return;

    try {
      await insforge.realtime.connect();
      connected.value = true;
      retryCount = 0;

      // Canaux spécifiques à Wimrux Finances
      await insforge.realtime.subscribe(`invoices:${companyId}`);
      await insforge.realtime.subscribe(`audit:${companyId}`);

      insforge.realtime.on('invoice_certified', (payload: RealtimeEvent) => {
        events.value.unshift(payload);
        $q.notify({
          type: 'positive',
          icon: 'verified',
          message: `Facture ${payload.reference ?? ''} certifiée — ${payload.fiscal_number ?? ''}`,
          timeout: 5000,
        });
      });

      insforge.realtime.on('invoice_validated', (payload: RealtimeEvent) => {
        events.value.unshift(payload);
        $q.notify({
          type: 'info',
          icon: 'check_circle',
          message: `Facture ${payload.reference ?? ''} validée`,
          timeout: 3000,
        });
      });

      insforge.realtime.on('new_audit', (payload: RealtimeEvent) => {
        events.value.unshift(payload);
      });

      insforge.realtime.on('disconnect', () => {
        connected.value = false;
        scheduleRetry();
      });

      insforge.realtime.on('connect_error', () => {
        connected.value = false;
        scheduleRetry();
      });
    } catch {
      // B-03 : La connexion Realtime échoue silencieusement (pas d'erreur visible)
      // Planifier une nouvelle tentative avec backoff exponentiel
      connected.value = false;
      scheduleRetry();
    }
  }

  function scheduleRetry() {
    if (retryTimer || retryCount >= MAX_RETRY) return;
    retryCount++;
    const delay = Math.min(5000 * retryCount, 30000); // 5s, 10s, 15s max
    retryTimer = setTimeout(() => {
      retryTimer = null;
      void connect();
    }, delay);
  }

  function disconnect() {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
    const companyId = authStore.companyId;
    if (companyId) {
      try {
        insforge.realtime.unsubscribe(`invoices:${companyId}`);
        insforge.realtime.unsubscribe(`audit:${companyId}`);
      } catch { /* ignore */ }
    }
    try { insforge.realtime.disconnect(); } catch { /* ignore */ }
    connected.value = false;
  }

  onUnmounted(() => {
    disconnect();
  });

  return { connected, events, connect, disconnect };
}
