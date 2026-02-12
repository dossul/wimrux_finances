import { ref, onMounted, onUnmounted } from 'vue';
import { useMcfApi } from './useMcfApi';

// ============================================================================
// Alerte MCF / SECeF — Vérification périodique de la connectivité SYGMEF
// ============================================================================

const POLL_INTERVAL_MS = 60_000; // 1 minute

export function useMcfAlert() {
  const mcfApi = useMcfApi();
  const mcfOnline = ref<boolean | null>(null);
  const lastCheck = ref<string | null>(null);
  const deviceStatus = ref<string | null>(null);
  let timer: ReturnType<typeof setInterval> | null = null;

  async function checkStatus() {
    try {
      const result = await mcfApi.getStatus();
      if (result.data) {
        mcfOnline.value = result.data.status === true;
        deviceStatus.value = result.data.deviceStatus;
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
