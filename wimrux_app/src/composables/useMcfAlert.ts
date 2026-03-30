import { ref, onMounted, onUnmounted } from 'vue';
import { insforge } from 'src/boot/insforge';

// ============================================================================
// Alerte MCF / SECeF — Vérification périodique de la connectivité SYGMEF
// ============================================================================

const POLL_INTERVAL_MS = 60_000; // 1 minute

export function useMcfAlert() {
  const mcfOnline = ref<boolean | null>(null);
  const lastCheck = ref<string | null>(null);
  const deviceStatus = ref<string | null>(null);
  let timer: ReturnType<typeof setInterval> | null = null;

  async function checkStatus() {
    try {
      const { data, error } = await insforge.functions.invoke('mcf-simulator', {
        method: 'POST',
        body: { _path: '/bf/mcf/ping', _method: 'GET' },
      });
      if (!error && data && data.status === true) {
        mcfOnline.value = true;
        deviceStatus.value = 'ACTIF';
        lastCheck.value = new Date().toISOString();
      } else {
        mcfOnline.value = false;
        lastCheck.value = new Date().toISOString();
      }
    } catch {
      mcfOnline.value = false;
      lastCheck.value = new Date().toISOString();
    }
  }

  function startPolling() {
    void checkStatus();
    timer = setInterval(() => { void checkStatus(); }, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  onMounted(() => startPolling());
  onUnmounted(() => stopPolling());

  return {
    mcfOnline,
    lastCheck,
    deviceStatus,
    checkStatus,
    startPolling,
    stopPolling,
  };
}
