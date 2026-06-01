<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <q-btn flat round icon="arrow_back" :to="'/app/budgets'" class="q-mr-sm" />
      <div>
        <div class="text-h5 text-weight-bold">{{ budget?.name }}</div>
        <div class="text-caption text-grey-7">
          {{ budget?.fiscal_year }} · {{ periodLabel(budget?.period_type) }} ·
          <q-badge :color="statusColor(budget?.status)" :label="statusLabel(budget?.status)" size="sm" />
        </div>
      </div>
      <q-space />
      <q-btn outline color="primary" icon="edit" label="Modifier" no-caps class="q-mr-sm" @click="openEditBudget" />
      <q-btn color="primary" icon="add" label="Ajouter ligne" no-caps @click="openCreateLine" />
    </div>

    <!-- KPI Cards -->
    <div class="row q-gutter-md q-mb-lg" v-if="budget">
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-md text-center">
          <div class="text-caption text-grey-6">Prévision</div>
          <div class="text-h5 text-weight-bold text-primary">{{ fmtAmount(stats.totalPlanned) }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-md text-center">
          <div class="text-caption text-grey-6">Réalisé</div>
          <div class="text-h5 text-weight-bold" :class="consumptionClass">{{ fmtAmount(stats.totalActual) }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-md text-center">
          <div class="text-caption text-grey-6">Écart</div>
          <div class="text-h5 text-weight-bold" :class="varianceClass">{{ fmtAmount(stats.totalVariance) }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-md text-center">
          <div class="text-caption text-grey-6">Consommation</div>
          <div class="text-h5 text-weight-bold" :class="consumptionClass">{{ stats.avgConsumption.toFixed(1) }}%</div>
          <q-linear-progress :value="stats.avgConsumption / 100" :color="consumptionColor" class="q-mt-xs" />
        </q-card-section>
      </q-card>
      <q-card v-if="stats.alertsCount > 0" flat bordered class="kpi-card bg-orange-1">
        <q-card-section class="q-pa-md text-center">
          <div class="text-caption text-orange-8">Alertes</div>
          <div class="text-h5 text-weight-bold text-orange">{{ stats.alertsCount }}</div>
          <div class="text-caption text-orange-7">seuils dépassés</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Graphique visuel consommation -->
    <q-card flat bordered class="q-mb-md q-pa-md" v-if="budgetActuals.length > 0">
      <div class="text-subtitle2 q-mb-sm">Répartition par catégorie</div>
      <div class="budget-bars">
        <div v-for="line in expenseLines.slice(0, 8)" :key="line.budget_line_id" class="budget-bar-row q-mb-sm">
          <div class="row items-center no-wrap" style="gap:12px">
            <div class="text-caption" style="width:140px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">
              {{ line.label || 'Sans nom' }}
            </div>
            <div class="col">
              <div class="budget-bar-bg">
                <div class="budget-bar-fill"
                  :class="getAlertColor(line.consumption_pct)"
                  :style="{ width: Math.min(line.consumption_pct, 100) + '%' }"
                  :title="`${line.consumption_pct.toFixed(1)}% consommé`" />
              </div>
            </div>
            <div class="text-caption text-right" style="width:90px">
              {{ fmtAmount(line.computed_actual) }} / {{ fmtAmount(line.planned_amount) }}
            </div>
            <q-icon v-if="line.alert_triggered" name="warning" color="orange" size="20px" />
          </div>
        </div>
      </div>
    </q-card>

    <!-- Table lignes budgétaires -->
    <q-card flat bordered>
      <q-tabs v-model="activeTab" dense class="text-grey-8" active-color="primary" indicator-color="primary">
        <q-tab name="expenses" label="Dépenses" icon="trending_down" />
        <q-tab name="income" label="Recettes" icon="trending_up" />
        <q-tab name="variance" label="Écarts" icon="compare_arrows" />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="activeTab" animated>
        <!-- Dépenses -->
        <q-tab-panel name="expenses" class="q-pa-none">
          <q-table :rows="expenseLines" :columns="lineColumns" row-key="budget_line_id" flat :pagination="{ rowsPerPage: 20 }">
            <template #body-cell-category="props">
              <q-td :props="props">{{ props.value || props.row.label || '—' }}</q-td>
            </template>
            <template #body-cell-consumption="props">
              <q-td :props="props">
                <div class="row items-center no-wrap" style="gap:8px">
                  <q-linear-progress :value="props.value / 100" :color="getAlertColor(props.value)" style="width:60px" size="8px" rounded />
                  <span :class="'text-' + getAlertColor(props.value)">{{ props.value.toFixed(1) }}%</span>
                  <q-icon v-if="props.row.alert_triggered" name="warning" color="orange" size="18px" />
                </div>
              </q-td>
            </template>
            <template #body-cell-actions="props">
              <q-td :props="props" class="text-right">
                <q-btn flat round dense size="sm" icon="edit" color="grey-7" @click="openEditLine(props.row)" />
                <q-btn flat round dense size="sm" icon="delete" color="negative" @click="confirmDeleteLine(props.row)" />
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- Recettes -->
        <q-tab-panel name="income" class="q-pa-none">
          <q-table :rows="incomeLines" :columns="lineColumns" row-key="budget_line_id" flat :pagination="{ rowsPerPage: 20 }">
            <template #body-cell-category="props">
              <q-td :props="props">{{ props.value || props.row.label || '—' }}</q-td>
            </template>
            <template #body-cell-consumption="props">
              <q-td :props="props">
                <div class="row items-center no-wrap" style="gap:8px">
                  <q-linear-progress :value="props.value / 100" :color="getAlertColor(props.value)" style="width:60px" size="8px" rounded />
                  <span :class="'text-' + getAlertColor(props.value)">{{ props.value.toFixed(1) }}%</span>
                </div>
              </q-td>
            </template>
          </q-table>
        </q-tab-panel>

        <!-- Écarts -->
        <q-tab-panel name="variance" class="q-pa-md">
          <div class="row q-gutter-md">
            <div v-for="line in highVarianceLines" :key="line.budget_line_id" class="col-12 col-md-6">
              <q-card flat bordered class="q-pa-md" :class="line.variance < 0 ? 'bg-red-1' : 'bg-green-1'">
                <div class="text-subtitle2">{{ line.label || 'Sans nom' }}</div>
                <div class="text-caption text-grey-7 q-mb-sm">{{ line.budget_name }}</div>
                <div class="row q-gutter-md">
                  <div>
                    <div class="text-caption text-grey-6">Prévu</div>
                    <div class="text-weight-medium">{{ fmtAmount(line.planned_amount) }}</div>
                  </div>
                  <div>
                    <div class="text-caption text-grey-6">Réalisé</div>
                    <div class="text-weight-medium">{{ fmtAmount(line.computed_actual) }}</div>
                  </div>
                  <div>
                    <div class="text-caption text-grey-6">Écart</div>
                    <div :class="line.variance < 0 ? 'text-negative text-weight-bold' : 'text-positive text-weight-bold'">
                      {{ line.variance > 0 ? '+' : '' }}{{ fmtAmount(line.variance) }}
                    </div>
                  </div>
                </div>
              </q-card>
            </div>
          </div>
          <div v-if="highVarianceLines.length === 0" class="text-center text-grey-6 q-pa-xl">
            <q-icon name="check_circle" color="positive" size="48px" class="q-mb-sm" /><br>
            Aucun écart significatif — le budget est bien respecté.
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>

    <!-- Dialog ligne budget -->
    <q-dialog v-model="showLineForm" persistent>
      <q-card style="min-width:480px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingLine ? 'Modifier ligne' : 'Nouvelle ligne' }}</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <div class="q-gutter-md">
            <q-select v-model="lineForm.line_type" :options="lineTypeOptions" label="Type *"
              emit-value map-options outlined dense />
            <q-select v-model="lineForm.category_id" :options="categoryOptions" label="Catégorie"
              emit-value map-options clearable outlined dense />
            <q-input v-model="lineForm.label" label="Libellé (si pas de catégorie)" outlined dense />
            <q-input v-model.number="lineForm.planned_amount" label="Montant prévu *" type="number" outlined dense />
            <q-input v-model.number="lineForm.alert_threshold_pct" label="Seuil d'alerte (%)*" type="number" outlined dense
              hint="Notification quand consommation atteint ce %" />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" :label="editingLine ? 'Enregistrer' : 'Ajouter'" :loading="loading" @click="submitLineForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useBudgets } from 'src/composables/useBudgets';
import { useCategories } from 'src/composables/useCategories';
import type { Budget, BudgetVsActual, BudgetLineInput, BudgetLineType } from 'src/types';

const $q       = useQuasar();
const route    = useRoute();
const router   = useRouter();
const budgetId = route.params.id as string;

const { budgetActuals, stats, getAlertColor, loadBudgetVsActual, checkAndSendBudgetAlerts, loading: _loadingBudget } = useBudgets();
const { categories, loadCategories } = useCategories();

const budget   = ref<Budget | null>(null);
const loading  = ref(false);
const activeTab = ref<'expenses' | 'income' | 'variance'>('expenses');

// Charger budget + lignes
async function loadAll() {
  loading.value = true;
  await Promise.all([
    loadBudgetDetail(),
    loadBudgetVsActual(budgetId),
    loadCategories(),
  ]);
  loading.value = false;
  // E08 — Alertes email si seuils dépassés
  if (budget.value) {
    const period = budget.value.fiscal_year ? String(budget.value.fiscal_year) : undefined;
    void checkAndSendBudgetAlerts(budget.value.name, period);
  }
}

async function loadBudgetDetail() {
  const { loadBudgets: load, budgets } = useBudgets();
  await load();
  const b = (budgets.value || []).find(x => x.id === budgetId) || null;
  budget.value = b;
}

const expenseLines = computed(() => budgetActuals.value.filter(l => l.line_type === 'expense'));
const incomeLines  = computed(() => budgetActuals.value.filter(l => l.line_type === 'income'));
const highVarianceLines = computed(() =>
  budgetActuals.value.filter(l => Math.abs(l.variance) > l.planned_amount * 0.1).sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
);

const consumptionClass = computed(() => {
  const c = stats.value.avgConsumption;
  return c >= 90 ? 'text-negative' : c >= 75 ? 'text-warning' : 'text-positive';
});
const consumptionColor = computed(() => {
  const c = stats.value.avgConsumption;
  return c >= 90 ? 'negative' : c >= 75 ? 'orange' : 'positive';
});
const varianceClass = computed(() => stats.value.totalVariance < 0 ? 'text-negative' : 'text-positive');

function fmtAmount(n: number): string { return Number(n).toLocaleString('fr-FR'); }
function statusColor(s?: string): string {
  return s === 'active' ? 'positive' : s === 'draft' ? 'grey' : s === 'closed' ? 'orange' : 'grey-6';
}
function statusLabel(s?: string): string {
  const m: Record<string, string> = { draft: 'Brouillon', active: 'Actif', closed: 'Clôturé', archived: 'Archivé' };
  return m[s || ''] ?? (s || '');
}
function periodLabel(p?: string): string {
  const m: Record<string, string> = { yearly: 'Annuel', quarterly: 'Trimestre', monthly: 'Mensuel', custom: 'Perso' };
  return m[p || ''] ?? (p || '');
}

const lineColumns = [
  { name: 'category', label: 'Catégorie/Libellé', field: 'label', align: 'left' as const },
  { name: 'planned', label: 'Prévu', field: 'planned_amount', align: 'right' as const, format: (v: number) => fmtAmount(v) },
  { name: 'actual', label: 'Réalisé', field: 'computed_actual', align: 'right' as const, format: (v: number) => fmtAmount(v) },
  { name: 'variance', label: 'Écart', field: 'variance', align: 'right' as const,
    format: (v: number) => (v > 0 ? '+' : '') + fmtAmount(v) },
  { name: 'consumption', label: 'Consommé', field: 'consumption_pct', align: 'center' as const },
  { name: 'actions', label: '', field: 'budget_line_id', align: 'right' as const },
];

const categoryOptions = computed(() =>
  categories.value.map((c: { id: string; name: string }) => ({ label: c.name, value: c.id }))
);
const lineTypeOptions = [
  { label: 'Dépense', value: 'expense' },
  { label: 'Recette', value: 'income' },
];

// Form ligne
const showLineForm = ref(false);
const editingLine  = ref<BudgetVsActual | null>(null);
const emptyLineForm = (): BudgetLineInput => ({
  line_type: 'expense' as BudgetLineType,
  category_id: null,
  label: null,
  planned_amount: 0,
  alert_threshold_pct: 80,
  sort_order: 0,
  notes: null,
});
const lineForm = ref<BudgetLineInput>(emptyLineForm());

function openCreateLine() {
  editingLine.value = null;
  lineForm.value = emptyLineForm();
  showLineForm.value = true;
}
function openEditLine(line: BudgetVsActual) {
  editingLine.value = line;
  lineForm.value = {
    line_type: line.line_type,
    category_id: line.category_id,
    label: line.label,
    planned_amount: line.planned_amount,
    alert_threshold_pct: line.alert_threshold_pct,
    sort_order: 0,
    notes: null,
  };
  showLineForm.value = true;
}
async function submitLineForm() {
  const { createBudgetLine, updateBudgetLine } = useBudgets();
  if (editingLine.value) {
    await updateBudgetLine(editingLine.value.budget_line_id, lineForm.value);
  } else {
    await createBudgetLine(budgetId, lineForm.value);
  }
  await loadBudgetVsActual(budgetId);
  showLineForm.value = false;
  $q.notify({ type: 'positive', message: editingLine.value ? 'Ligne modifiée' : 'Ligne ajoutée' });
}
function confirmDeleteLine(line: BudgetVsActual) {
  $q.dialog({ title: 'Confirmer', message: 'Supprimer cette ligne budgétaire ?', cancel: true, ok: { color: 'negative' } })
    .onOk(async () => {
      const { deleteBudgetLine } = useBudgets();
      await deleteBudgetLine(line.budget_line_id);
      await loadBudgetVsActual(budgetId);
      $q.notify({ type: 'warning', message: 'Ligne supprimée' });
    });
}

function openEditBudget() {
  router.push('/app/budgets'); // Retour liste pour éditer
}

onMounted(() => loadAll());
</script>

<style scoped>
.kpi-card { min-width: 120px; flex: 1; }
.budget-bar-bg { background: #e0e0e0; height: 12px; border-radius: 6px; overflow: hidden; }
.budget-bar-fill { height: 100%; transition: width 0.3s; }
.budget-bar-fill.bg-positive { background: #21ba45; }
.budget-bar-fill.bg-warning { background: #f2c037; }
.budget-bar-fill.bg-orange { background: #ff9800; }
.budget-bar-fill.bg-negative { background: #c10015; }
</style>
