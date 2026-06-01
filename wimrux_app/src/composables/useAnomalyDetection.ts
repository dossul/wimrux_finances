// =============================================================================
// WIMRUX® FINANCES — useAnomalyDetection
// Appelle l'Edge Function detect-anomalies et expose les alertes réactives
// =============================================================================
import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface AnomalyAlert {
  id?: string;
  type: string;
  severity: Severity;
  description: string;
  entity_type: 'wallet_transaction' | 'invoice' | 'global';
  entity_id: string | null;
  amount: number | null;
  detected_at: string;
  is_resolved?: boolean;
  source?: 'rule' | 'ai';
}

export interface DetectionStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  ai_model: string | null;
}

export function useAnomalyDetection() {
  const companyStore = useCompanyStore();
  const alerts       = ref<AnomalyAlert[]>([]);
  const loading      = ref(false);
  const error        = ref<string | null>(null);
  const stats        = ref<DetectionStats | null>(null);
  const lastRun      = ref<Date | null>(null);

  const unresolvedAlerts = computed(() => alerts.value.filter(a => !a.is_resolved));
  const criticalCount    = computed(() => unresolvedAlerts.value.filter(a => a.severity === 'critical').length);
  const hasAlerts        = computed(() => unresolvedAlerts.value.length > 0);

  // ── Lancer la détection via Edge Function ──────────────────────────────

  async function runDetection(walletId?: string, days = 90) {
    loading.value = true; error.value = null;
    try {
      const { data, error: fnErr } = await insforge.functions.invoke('detect-anomalies', {
        body: { company_id: companyStore.company?.id, wallet_id: walletId, days },
      });
      if (fnErr || !data?.success) throw new Error(fnErr?.message ?? data?.message ?? 'Erreur détection');
      alerts.value = data.alerts as AnomalyAlert[];
      stats.value  = data.stats as DetectionStats;
      lastRun.value = new Date();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur';
    } finally { loading.value = false; }
  }

  // ── Charger les alertes persistées depuis la DB ─────────────────────────

  async function loadAlerts(resolved = false) {
    loading.value = true; error.value = null;
    try {
      const q = insforge.database
        .from('anomaly_alerts')
        .select('*')
        .eq('company_id', companyStore.company?.id ?? '')
        .eq('is_resolved', resolved)
        .order('detected_at', { ascending: false })
        .limit(100);
      const { data, error: err } = await q;
      if (err) throw new Error(err.message);
      alerts.value = (data ?? []) as AnomalyAlert[];
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur';
    } finally { loading.value = false; }
  }

  // ── Résoudre une alerte ─────────────────────────────────────────────────

  async function resolveAlert(id: string) {
    const { error: err } = await insforge.database
      .from('anomaly_alerts')
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', id)
      .eq('company_id', companyStore.company?.id ?? '');
    if (err) { error.value = err.message; return false; }
    const idx = alerts.value.findIndex(a => a.id === id);
    if (idx !== -1) alerts.value[idx] = { ...alerts.value[idx]!, is_resolved: true };
    return true;
  }

  return {
    alerts, loading, error, stats, lastRun,
    unresolvedAlerts, criticalCount, hasAlerts,
    runDetection, loadAlerts, resolveAlert,
  };
}
