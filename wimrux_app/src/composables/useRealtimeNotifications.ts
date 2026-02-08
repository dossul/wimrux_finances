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

  async function connect() {
    const companyId = authStore.companyId;
    if (!companyId) return;

    try {
      await insforge.realtime.connect();
      connected.value = true;

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
      });

      insforge.realtime.on('connect_error', () => {
        connected.value = false;
      });
    } catch {
      connected.value = false;
    }
  }

  function disconnect() {
    const companyId = authStore.companyId;
    if (companyId) {
      insforge.realtime.unsubscribe(`invoices:${companyId}`);
      insforge.realtime.unsubscribe(`audit:${companyId}`);
    }
    insforge.realtime.disconnect();
    connected.value = false;
  }

  onUnmounted(() => {
    disconnect();
  });

  return { connected, events, connect, disconnect };
}
