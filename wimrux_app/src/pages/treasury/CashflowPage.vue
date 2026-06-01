<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Trésorerie prévisionnelle</div>
        <div class="text-caption text-grey-7">Prévisions de flux · détection risques · simulation scénarios</div>
      </div>
      <q-space />
      <q-btn color="primary" icon="add_chart" label="Nouvelle prévision" no-caps @click="openGenerateDialog" />
    </div>

    <!-- Liste des prévisions + KPI -->
    <div class="row q-gutter-md q-mb-lg" v-if="forecasts.length">
      <q-card v-for="f in forecasts.slice(0, 4)" :key="f.id" flat bordered class="forecast-card cursor-pointer"
        :class="selectedForecast?.id === f.id ? 'border-primary' : ''"
        @click="selectForecast(f)">
        <q-card-section class="q-pa-md">
          <div class="row items-start no-wrap">
            <div class="col">
              <div class="text-subtitle2 text-weight-bold ellipsis">{{ f.name }}</div>
              <div class="text-caption text-grey-6">{{ fmtDate(f.base_date) }} · {{ f.horizon_days }}j · {{ methodLabel(f.method) }}</div>
            </div>
            <q-btn flat round dense icon="delete" size="xs" color="grey-5" @click.stop="confirmDeleteForecast(f)" />
          </div>
          <div class="row q-gutter-xs q-mt-sm">
            <q-chip dense size="sm" color="green-2" text-color="green-9" icon="trending_up">
              +{{ fmtAmount(f.total_inflows) }}
            </q-chip>
            <q-chip dense size="sm" color="red-2" text-color="red-9" icon="trending_down">
              -{{ fmtAmount(f.total_outflows) }}
            </q-chip>
          </div>
          <div v-if="f.low_cash_alert" class="q-mt-xs">
            <q-badge color="orange" icon="warning" label="Risque trésorerie détecté" />
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Graphique + Détail prévision sélectionnée -->
    <template v-if="selectedForecast && selectedPoints.length">
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="row items-center q-mb-md">
            <div class="text-subtitle1 text-weight-bold">{{ selectedForecast.name }}</div>
            <q-space />
            <!-- KPIs inline -->
            <div class="row q-gutter-lg text-center">
              <div>
                <div class="text-caption text-grey-6">Solde final</div>
                <div class="text-weight-bold" :class="selectedForecast.ending_balance >= 0 ? 'text-positive' : 'text-negative'">
                  {{ fmtAmount(selectedForecast.ending_balance) }}
                </div>
              </div>
              <div>
                <div class="text-caption text-grey-6">Entrées</div>
                <div class="text-weight-bold text-positive">+{{ fmtAmount(summaryStats.totalIn) }}</div>
              </div>
              <div>
                <div class="text-caption text-grey-6">Sorties</div>
                <div class="text-weight-bold text-negative">-{{ fmtAmount(summaryStats.totalOut) }}</div>
              </div>
              <div v-if="summaryStats.riskCount > 0">
                <div class="text-caption text-orange-7">Jours risque</div>
                <div class="text-weight-bold text-orange">{{ summaryStats.riskCount }}</div>
              </div>
            </div>
          </div>

          <!-- Graphique CSS simplifié (barres) -->
          <div class="cashflow-chart q-mb-md">
            <div class="chart-legend row q-gutter-md q-mb-sm">
              <div class="row items-center q-gutter-xs"><div class="legend-dot bg-positive" /><span class="text-caption">Entrées</span></div>
              <div class="row items-center q-gutter-xs"><div class="legend-dot bg-negative" /><span class="text-caption">Sorties</span></div>
              <div class="row items-center q-gutter-xs"><div class="legend-dot bg-primary" /><span class="text-caption">Solde cumulé</span></div>
            </div>
            <div class="chart-container">
              <div v-for="p in chartPoints" :key="p.date" class="chart-day"
                :class="p.is_risk ? 'risk-day' : ''" :title="fmtChartTooltip(p)">
                <div class="bar-in" :style="{ height: barHeight(p.inflows, maxFlow) + '%' }" />
                <div class="bar-out" :style="{ height: barHeight(p.outflows, maxFlow) + '%' }" />
              </div>
            </div>
            <!-- Ligne solde (SVG simple) -->
            <svg v-if="chartPoints.length" class="balance-line" :viewBox="`0 0 ${chartPoints.length * 8} 60`" preserveAspectRatio="none">
              <polyline
                :points="balancePolyline"
                fill="none" stroke="#1976d2" stroke-width="1.5" stroke-linejoin="round"
              />
            </svg>
          </div>

          <!-- Table résumé mensuel -->
          <q-table :rows="monthlyAgg" :columns="monthlyColumns" flat dense row-key="month"
            :pagination="{ rowsPerPage: 12 }">
            <template #body-cell-balance="props">
              <q-td :props="props" :class="props.value >= 0 ? 'text-positive' : 'text-negative'">
                {{ (props.value >= 0 ? '+' : '') + fmtAmount(props.value) }}
              </q-td>
            </template>
            <template #body-cell-risk="props">
              <q-td :props="props" class="text-center">
                <q-icon v-if="props.value > 0" name="warning" color="orange" size="18px" :title="`${props.value} jours à risque`" />
                <q-icon v-else name="check_circle" color="positive" size="18px" />
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>

      <!-- Scénarios -->
      <q-card flat bordered>
        <q-card-section class="row items-center q-pb-sm">
          <div class="text-subtitle1 text-weight-bold">Simulations scénarios</div>
          <q-space />
          <q-btn outline color="teal" icon="science" label="Nouveau scénario" no-caps size="sm" @click="openScenarioDialog" />
        </q-card-section>
        <q-card-section v-if="scenariosForForecast.length">
          <div class="row q-gutter-md">
            <q-card v-for="sc in scenariosForForecast" :key="sc.id" flat bordered class="scenario-card">
              <q-card-section class="q-pa-md">
                <div class="row items-center no-wrap">
                  <div class="col">
                    <div class="text-subtitle2">{{ sc.name }}</div>
                    <div class="text-caption text-grey-6">{{ sc.assumptions.length }} hypothèse(s)</div>
                  </div>
                  <div class="text-right">
                    <div class="text-caption text-grey-6">Impact total</div>
                    <div class="text-weight-bold" :class="sc.total_impact >= 0 ? 'text-positive' : 'text-negative'">
                      {{ sc.total_impact >= 0 ? '+' : '' }}{{ fmtAmount(sc.total_impact) }}
                    </div>
                  </div>
                  <q-btn flat round dense icon="delete" size="xs" color="grey-5" class="q-ml-sm"
                    @click="deleteScenario(sc.id)" />
                </div>
                <div class="q-mt-sm">
                  <q-chip v-for="a in sc.assumptions" :key="a.label" dense size="xs" color="grey-3" text-color="grey-8">
                    {{ assumptionLabel(a) }}
                  </q-chip>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </q-card-section>
        <q-card-section v-else class="text-center text-grey-6 q-pa-lg">
          <q-icon name="science" size="36px" class="q-mb-sm" /><br>
          Aucun scénario. Simulez l'impact d'un retard de paiement, d'une dépense imprévue, etc.
        </q-card-section>
      </q-card>
    </template>

    <!-- État vide -->
    <template v-else-if="!loading && !forecasts.length">
      <q-card flat bordered class="text-center q-pa-xl">
        <q-icon name="show_chart" size="64px" color="grey-4" class="q-mb-md" /><br>
        <div class="text-h6 text-grey-6 q-mb-sm">Aucune prévision générée</div>
        <div class="text-caption text-grey-5 q-mb-lg">Générez votre première prévision de trésorerie pour anticiper les flux.</div>
        <q-btn color="primary" icon="add_chart" label="Générer une prévision" no-caps @click="openGenerateDialog" />
      </q-card>
    </template>

    <!-- Dialog Générer prévision -->
    <q-dialog v-model="showGenerateDialog" persistent>
      <q-card style="min-width:460px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Nouvelle prévision</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <div class="q-gutter-md">
            <q-input v-model="genForm.name" label="Nom de la prévision *" outlined dense />
            <div class="row q-gutter-sm">
              <q-select v-model="genForm.method" :options="methodOptions" label="Méthode *"
                emit-value map-options outlined dense class="col" />
              <q-input v-model.number="genForm.horizon_days" label="Horizon (jours) *"
                type="number" outlined dense class="col" hint="7–365" />
            </div>
            <q-input v-model="genForm.base_date" label="Date de base *" type="date" outlined dense />
            <q-input v-model.number="genForm.low_cash_threshold" label="Seuil alerte trésorerie basse (XOF)"
              type="number" outlined dense hint="0 = pas d'alerte" />
            <q-input v-model="genForm.notes" label="Notes" outlined dense type="textarea" rows="2" />
            <div v-if="genForm.method === 'ml'" class="q-pa-sm bg-orange-1 rounded-borders">
              <q-icon name="info" color="orange" /> La méthode ML nécessite les credentials IA. Elle utilisera la méthode hybride en attendant.
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" icon="play_arrow" label="Générer" :loading="loading" @click="doGenerate" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog Scénario -->
    <q-dialog v-model="showScenarioDialog" persistent>
      <q-card style="min-width:500px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Nouveau scénario</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <div class="q-gutter-md">
            <q-input v-model="scForm.name" label="Nom du scénario *" outlined dense />
            <q-input v-model="scForm.description" label="Description" outlined dense type="textarea" rows="2" />

            <div class="text-subtitle2 q-mt-sm">Hypothèses</div>
            <div v-for="(a, i) in scForm.assumptions" :key="i" class="row items-end q-gutter-sm q-mb-sm bg-grey-1 q-pa-sm rounded-borders">
              <q-select v-model="a.type" :options="assumptionTypeOptions" label="Type" emit-value map-options outlined dense class="col-4" />
              <q-input v-model="a.label" label="Libellé" outlined dense class="col" />
              <q-input v-if="['new_expense','revenue_change','new_loan'].includes(a.type ?? '')"
                v-model.number="a.amount" label="Montant / %" type="number" outlined dense class="col-3" />
              <q-input v-if="['payment_delay','supplier_delay'].includes(a.type ?? '')"
                v-model.number="a.days" label="Nb jours" type="number" outlined dense class="col-2" />
              <q-input v-if="['new_expense'].includes(a.type ?? '')"
                v-model="a.start_date" label="Date début" type="date" outlined dense class="col-3" />
              <q-btn flat round dense icon="delete" color="negative" size="sm" @click="scForm.assumptions.splice(i, 1)" />
            </div>
            <q-btn outline color="primary" icon="add" label="Ajouter hypothèse" no-caps size="sm"
              @click="scForm.assumptions.push({ type: 'payment_delay', label: '', days: 7 })" />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="teal" icon="science" label="Simuler" :loading="loading" @click="doRunScenario" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useCashflowForecast } from 'src/composables/useCashflowForecast';
import type { CashflowForecast, CashflowDataPoint, CashflowForecastInput, ScenarioAssumption } from 'src/types';

const $q = useQuasar();
const {
  forecasts, scenarios, loading,
  loadForecasts, generateForecast, deleteForecast,
  loadScenarios, deleteScenario,
  getSummaryStats,
} = useCashflowForecast();

const selectedForecast = ref<CashflowForecast | null>(null);
const selectedPoints   = computed<CashflowDataPoint[]>(() => selectedForecast.value?.data ?? []);

function selectForecast(f: CashflowForecast) {
  selectedForecast.value = f;
  void loadScenarios(f.id);
}

const scenariosForForecast = computed(() =>
  scenarios.value.filter(s => s.forecast_id === selectedForecast.value?.id)
);

// ---------------------------------------------------------------------------
// Stats & graph
// ---------------------------------------------------------------------------
const summaryStats = computed(() => getSummaryStats(selectedPoints.value));
const maxFlow = computed(() => Math.max(...selectedPoints.value.map(p => Math.max(p.inflows, p.outflows)), 1));

// Agrégation mensuelle
const monthlyAgg = computed(() => {
  const map = new Map<string, { month: string; inflows: number; outflows: number; balance: number; risk: number }>();
  for (const p of selectedPoints.value) {
    const month = p.date.substring(0, 7);
    if (!map.has(month)) map.set(month, { month, inflows: 0, outflows: 0, balance: p.cumulative_balance, risk: 0 });
    const m = map.get(month)!;
    m.inflows += p.inflows;
    m.outflows += p.outflows;
    m.balance = p.cumulative_balance;
    if (p.is_risk) m.risk++;
  }
  return Array.from(map.values());
});

const monthlyColumns = [
  { name: 'month', label: 'Mois', field: 'month', align: 'left' as const },
  { name: 'inflows', label: 'Entrées', field: 'inflows', align: 'right' as const, format: (v: number) => fmtAmount(v) },
  { name: 'outflows', label: 'Sorties', field: 'outflows', align: 'right' as const, format: (v: number) => fmtAmount(v) },
  { name: 'balance', label: 'Solde fin', field: 'balance', align: 'right' as const },
  { name: 'risk', label: 'Risque', field: 'risk', align: 'center' as const },
];

// Graphique — afficher max 90 points
const chartPoints = computed(() => {
  const pts = selectedPoints.value;
  if (pts.length <= 90) return pts;
  const step = Math.ceil(pts.length / 90);
  return pts.filter((_, i) => i % step === 0);
});

const minBal = computed(() => Math.min(...chartPoints.value.map(p => p.cumulative_balance)));
const maxBal = computed(() => Math.max(...chartPoints.value.map(p => p.cumulative_balance)));
const balRange = computed(() => (maxBal.value - minBal.value) || 1);

const balancePolyline = computed(() => {
  return chartPoints.value
    .map((p, i) => {
      const x = i * 8 + 4;
      const y = 60 - ((p.cumulative_balance - minBal.value) / balRange.value) * 55;
      return `${x},${y}`;
    })
    .join(' ');
});

function barHeight(val: number, max: number): number { return max > 0 ? Math.max((val / max) * 100, 1) : 0; }
function fmtChartTooltip(p: CashflowDataPoint): string {
  return `${p.date}\nEntrées: ${fmtAmount(p.inflows)}\nSorties: ${fmtAmount(p.outflows)}\nSolde: ${fmtAmount(p.cumulative_balance)}`;
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------
function fmtAmount(n: number): string { return Number(n).toLocaleString('fr-FR'); }
function fmtDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-FR') : ''; }
function methodLabel(m: string): string {
  const map: Record<string, string> = { historical: 'Historique', hybrid: 'Hybride', manual: 'Manuel', ml: 'IA' };
  return map[m] ?? m;
}
function assumptionLabel(a: ScenarioAssumption): string {
  const map: Record<string, string> = {
    payment_delay: `Retard client +${a.days}j`,
    supplier_delay: `Report fourn. +${a.days}j`,
    new_expense: `Dépense ${fmtAmount(a.amount ?? 0)}`,
    revenue_change: `CA ${a.amount ?? 0}%`,
    new_loan: `Emprunt ${fmtAmount(a.amount ?? 0)}`,
    custom: a.label,
  };
  return map[a.type] ?? a.label;
}

// ---------------------------------------------------------------------------
// Génération
// ---------------------------------------------------------------------------
const showGenerateDialog = ref(false);
const today = new Date().toISOString().split('T')[0] as string;
const emptyGenForm = (): CashflowForecastInput => ({
  name: `Prévision ${new Date().toLocaleDateString('fr-FR')}`,
  horizon_days: 90,
  method: 'hybrid',
  base_date: today,
  low_cash_threshold: 0,
  notes: null,
});
const genForm = ref<CashflowForecastInput>(emptyGenForm());
const methodOptions = [
  { label: 'Hybride (recommandé)', value: 'hybrid' },
  { label: 'Historique (moyenne mobile)', value: 'historical' },
  { label: 'Manuel', value: 'manual' },
  { label: 'IA (LiteLLM)', value: 'ml' },
];

function openGenerateDialog() { genForm.value = emptyGenForm(); showGenerateDialog.value = true; }
async function doGenerate() {
  if (!genForm.value.name) { $q.notify({ type: 'negative', message: 'Nom requis' }); return; }
  const { forecast } = await generateForecast(genForm.value);
  if (forecast) {
    showGenerateDialog.value = false;
    selectForecast(forecast);
    $q.notify({ type: 'positive', message: 'Prévision générée' });
  }
}

function confirmDeleteForecast(f: CashflowForecast) {
  $q.dialog({ title: 'Supprimer', message: `Supprimer "${f.name}" ?`, cancel: true, ok: { color: 'negative' } })
    .onOk(() => {
      void deleteForecast(f.id);
      if (selectedForecast.value?.id === f.id) selectedForecast.value = forecasts.value[0] ?? null;
    });
}

// ---------------------------------------------------------------------------
// Scénarios
// ---------------------------------------------------------------------------
const showScenarioDialog = ref(false);
const scForm = ref<{ name: string; description: string; assumptions: Partial<ScenarioAssumption>[] }>({
  name: '', description: '', assumptions: [],
});
const assumptionTypeOptions = [
  { label: 'Retard client', value: 'payment_delay' },
  { label: 'Report fournisseur', value: 'supplier_delay' },
  { label: 'Nouvelle dépense', value: 'new_expense' },
  { label: 'Variation CA (%)', value: 'revenue_change' },
  { label: 'Emprunt', value: 'new_loan' },
  { label: 'Personnalisé', value: 'custom' },
];
function openScenarioDialog() { scForm.value = { name: '', description: '', assumptions: [] }; showScenarioDialog.value = true; }
async function doRunScenario() {
  if (!scForm.value.name || !scForm.value.assumptions.length) {
    $q.notify({ type: 'negative', message: 'Nom et au moins une hypothèse requis' }); return;
  }
  const basePoints = selectedPoints.value;
  const { runScenario, saveScenario } = useCashflowForecast();
  const input = {
    forecast_id: selectedForecast.value!.id,
    name: scForm.value.name,
    description: scForm.value.description || null,
    assumptions: scForm.value.assumptions as ScenarioAssumption[],
  };
  const simulated = runScenario(basePoints, input);
  await saveScenario(input, simulated, basePoints);
  showScenarioDialog.value = false;
  $q.notify({ type: 'positive', message: 'Scénario simulé et sauvegardé' });
}

onMounted(async () => {
  await loadForecasts();
  if (forecasts.value.length) selectForecast(forecasts.value[0]!);
});
</script>

<style scoped>
.forecast-card { min-width: 200px; flex: 1; max-width: 280px; transition: border-color 0.2s; }
.forecast-card.border-primary { border: 2px solid #1976d2; }
.scenario-card { flex: 1; min-width: 260px; }
.legend-dot { width: 12px; height: 12px; border-radius: 50%; }
.cashflow-chart { position: relative; }
.chart-container {
  display: flex; align-items: flex-end; gap: 1px;
  height: 100px; overflow-x: auto;
  background: #f5f5f5; border-radius: 4px; padding: 4px;
}
.chart-day { display: flex; align-items: flex-end; gap: 1px; min-width: 6px; }
.chart-day.risk-day { background: rgba(255,152,0,0.15); border-radius: 2px; }
.bar-in  { width: 3px; background: #21ba45; border-radius: 1px 1px 0 0; transition: height 0.3s; }
.bar-out { width: 3px; background: #c10015; border-radius: 1px 1px 0 0; transition: height 0.3s; }
.balance-line { width: 100%; height: 60px; display: block; margin-top: -60px; position: relative; z-index: 1; pointer-events: none; }
</style>
