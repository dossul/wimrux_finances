<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Tableaux de bord</div>
        <div class="text-caption text-grey-7">Dashboards personnalisables avec widgets KPI et graphiques</div>
      </div>
      <q-space />
      <q-select v-if="dashboards.length" v-model="selectedDashboardId" :options="dashboardOptions"
        emit-value map-options outlined dense style="min-width:220px" class="q-mr-sm"
        @update:model-value="onSelectDashboard" />
      <q-btn outline color="primary" icon="add" label="Nouveau" no-caps @click="openCreate" class="q-mr-sm" />
      <q-btn v-if="currentDashboard" outline color="grey-8" icon="edit" no-caps label="Renommer" @click="openRename" class="q-mr-sm" />
      <q-btn v-if="currentDashboard" outline color="negative" icon="delete" no-caps label="Supprimer" @click="confirmDelete" />
    </div>

    <!-- Empty state -->
    <q-card v-if="!dashboards.length" flat bordered class="text-center q-pa-xl">
      <q-icon name="dashboard" size="80px" color="grey-5" />
      <div class="text-h6 q-mt-md text-grey-8">Aucun tableau de bord</div>
      <div class="text-grey-6 q-mb-md">Créez votre premier dashboard pour suivre vos indicateurs clés</div>
      <q-btn color="primary" icon="add" label="Créer un dashboard" no-caps @click="openCreate" />
    </q-card>

    <!-- Dashboard grid -->
    <div v-else-if="currentDashboard">
      <div class="row items-center q-mb-md">
        <div class="text-subtitle1 text-weight-medium">{{ currentDashboard.name }}</div>
        <q-badge v-if="currentDashboard.is_default" color="amber" text-color="dark" class="q-ml-sm">Par défaut</q-badge>
        <q-space />
        <q-btn v-if="!currentDashboard.is_default" flat icon="star" label="Définir par défaut" no-caps size="sm" @click="onSetDefault" />
        <q-btn color="primary" icon="add" label="Ajouter widget" no-caps size="sm" @click="openAddWidget" />
      </div>

      <div v-if="!currentDashboard.layout.length" class="text-center q-pa-xl text-grey-6">
        <q-icon name="widgets" size="64px" /><br>
        <div class="q-mt-md">Aucun widget</div>
        <q-btn color="primary" icon="add" label="Ajouter votre premier widget" no-caps class="q-mt-md" @click="openAddWidget" />
      </div>

      <div v-else class="dashboard-grid">
        <q-card v-for="widget in currentDashboard.layout" :key="widget.id" flat bordered class="widget-card"
          :style="widgetStyle(widget)">
          <q-card-section class="row items-center q-py-sm bg-grey-2">
            <q-icon :name="widgetIcon(widget.type)" :color="widgetColor(widget.type)" size="20px" class="q-mr-sm" />
            <div class="text-subtitle2">{{ widget.title }}</div>
            <q-space />
            <q-btn flat round dense size="sm" icon="refresh" @click="refreshWidget(widget.id)" />
            <q-btn flat round dense size="sm" icon="edit" @click="openEditWidget(widget)" />
            <q-btn flat round dense size="sm" icon="close" color="negative" @click="onRemoveWidget(widget.id)" />
          </q-card-section>
          <q-separator />
          <q-card-section>
            <!-- KPI -->
            <div v-if="widget.type === 'kpi'" class="text-center q-py-md">
              <div class="text-h4 text-weight-bold" :style="{ color: (widget.config?.color as string) || '#1976d2' }">
                {{ widgetData[widget.id]?.value ?? '—' }}
              </div>
              <div v-if="widget.config?.subtitle" class="text-caption text-grey-7 q-mt-xs">{{ widget.config.subtitle }}</div>
            </div>
            <!-- Saved query result table -->
            <div v-else-if="widget.type === 'saved_query' || widget.type === 'table'">
              <q-spinner v-if="loadingWidgets[widget.id]" color="primary" />
              <q-table v-else-if="widgetData[widget.id]?.rows?.length"
                :rows="widgetData[widget.id]!.rows!" :columns="widgetData[widget.id]!.columns!"
                row-key="_idx" flat dense :pagination="{ rowsPerPage: 10 }" />
              <div v-else class="text-grey-6 text-center q-pa-md">Aucune donnée</div>
            </div>
            <!-- Chart placeholder (svg bar) -->
            <div v-else-if="widget.type === 'chart'">
              <q-spinner v-if="loadingWidgets[widget.id]" color="primary" />
              <svg v-else-if="widgetData[widget.id]?.chartPoints?.length" :viewBox="`0 0 ${chartViewBox(widget).w} ${chartViewBox(widget).h}`"
                :style="{ width: '100%', height: '180px' }">
                <rect v-for="(p, i) in widgetData[widget.id]!.chartPoints!" :key="i"
                  :x="i * 30 + 10" :y="chartViewBox(widget).h - p.value / chartMax(widget) * (chartViewBox(widget).h - 30)"
                  :width="20" :height="p.value / chartMax(widget) * (chartViewBox(widget).h - 30)"
                  fill="#1976d2" />
                <text v-for="(p, i) in widgetData[widget.id]!.chartPoints!" :key="'l-' + i"
                  :x="i * 30 + 20" :y="chartViewBox(widget).h - 5" font-size="9" text-anchor="middle" fill="#666">
                  {{ p.label.slice(0, 6) }}
                </text>
              </svg>
              <div v-else class="text-grey-6 text-center q-pa-md">Aucune donnée</div>
            </div>
            <!-- Text -->
            <div v-else-if="widget.type === 'text'" class="text-body2" style="white-space: pre-wrap;">
              {{ widget.config?.text || '' }}
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Dialog : créer/renommer dashboard -->
    <q-dialog v-model="showDashboardForm" persistent>
      <q-card style="min-width:420px">
        <q-card-section><div class="text-h6">{{ editingDashboardId ? 'Renommer' : 'Nouveau' }} dashboard</div></q-card-section>
        <q-card-section>
          <q-input v-model="dashboardForm.name" label="Nom *" outlined dense class="q-mb-sm" autofocus />
          <q-input v-model="dashboardForm.description" label="Description" type="textarea" rows="2" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" :label="editingDashboardId ? 'Mettre à jour' : 'Créer'" @click="submitDashboardForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog : widget (ajouter / éditer) -->
    <q-dialog v-model="showWidgetForm" persistent>
      <q-card style="min-width:520px">
        <q-card-section><div class="text-h6">{{ editingWidgetId ? 'Modifier' : 'Ajouter' }} widget</div></q-card-section>
        <q-card-section>
          <q-select v-model="widgetForm.type" :options="widgetTypeOptions" label="Type *"
            emit-value map-options outlined dense class="q-mb-sm" />
          <q-input v-model="widgetForm.title" label="Titre *" outlined dense class="q-mb-sm" />

          <q-select v-if="['saved_query','table','chart','kpi'].includes(widgetForm.type)"
            v-model="widgetForm.saved_query_id" :options="queryOptions" label="Requête source"
            emit-value map-options outlined dense clearable class="q-mb-sm" />

          <q-input v-if="widgetForm.type === 'kpi'" v-model="widgetForm.kpiField"
            label="Champ à afficher (KPI)" outlined dense class="q-mb-sm" />
          <q-input v-if="widgetForm.type === 'kpi'" v-model="widgetForm.subtitle"
            label="Sous-titre" outlined dense class="q-mb-sm" />

          <q-input v-if="widgetForm.type === 'chart'" v-model="widgetForm.chartLabelField"
            label="Champ libellé (axe X)" outlined dense class="q-mb-sm" />
          <q-input v-if="widgetForm.type === 'chart'" v-model="widgetForm.chartValueField"
            label="Champ valeur (axe Y)" outlined dense class="q-mb-sm" />

          <q-input v-if="widgetForm.type === 'text'" v-model="widgetForm.text"
            label="Texte" type="textarea" rows="4" outlined dense class="q-mb-sm" />

          <div class="row q-gutter-sm">
            <q-input v-model.number="widgetForm.w" type="number" label="Largeur (1-12)" outlined dense class="col" />
            <q-input v-model.number="widgetForm.h" type="number" label="Hauteur (lignes)" outlined dense class="col" />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" :label="editingWidgetId ? 'Mettre à jour' : 'Ajouter'" @click="submitWidgetForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useQuasar } from 'quasar';
import { useDashboards } from 'src/composables/useDashboards';
import { useSavedQueries } from 'src/composables/useSavedQueries';
import type { DashboardWidget, DashboardWidgetType, SavedQuery } from 'src/types';

const $q = useQuasar();
const {
  dashboards, currentDashboard,
  loadDashboards, loadDashboard, createDashboard, updateDashboard, deleteDashboard, setDefault,
  addWidget, removeWidget, updateWidget, generateWidgetId,
} = useDashboards();
const { queries, loadQueries, runQuery } = useSavedQueries();

const widgetTypeOptions = [
  { label: 'KPI (chiffre)', value: 'kpi' },
  { label: 'Tableau', value: 'table' },
  { label: 'Graphique (barres)', value: 'chart' },
  { label: 'Requête sauvegardée', value: 'saved_query' },
  { label: 'Texte / Note', value: 'text' },
];

const selectedDashboardId = ref<string | null>(null);

const dashboardOptions = computed(() => dashboards.value.map(d => ({ label: d.name, value: d.id })));
const queryOptions = computed(() => queries.value.map(q => ({ label: q.name, value: q.id })));

const showDashboardForm = ref(false);
const editingDashboardId = ref<string | null>(null);
const dashboardForm = reactive({ name: '', description: '' });

const showWidgetForm = ref(false);
const editingWidgetId = ref<string | null>(null);
const widgetForm = reactive({
  type: 'kpi' as DashboardWidgetType,
  title: '',
  saved_query_id: null as string | null,
  kpiField: '',
  subtitle: '',
  chartLabelField: '',
  chartValueField: '',
  text: '',
  w: 4,
  h: 2,
});

interface ColumnDef { name: string; label: string; field: string; align: 'left'; sortable: boolean }
interface WidgetData {
  value?: string;
  rows?: Record<string, unknown>[];
  columns?: ColumnDef[];
  chartPoints?: { label: string; value: number }[];
}
const widgetData = ref<Record<string, WidgetData>>({});
const loadingWidgets = ref<Record<string, boolean>>({});

// --- Dashboard CRUD ---
function openCreate() {
  editingDashboardId.value = null;
  dashboardForm.name = '';
  dashboardForm.description = '';
  showDashboardForm.value = true;
}

function openRename() {
  if (!currentDashboard.value) return;
  editingDashboardId.value = currentDashboard.value.id;
  dashboardForm.name = currentDashboard.value.name;
  dashboardForm.description = currentDashboard.value.description || '';
  showDashboardForm.value = true;
}

async function submitDashboardForm() {
  if (!dashboardForm.name.trim()) {
    $q.notify({ type: 'warning', message: 'Nom requis' }); return;
  }
  const payload = {
    name: dashboardForm.name.trim(),
    description: dashboardForm.description.trim() || null,
  };
  const ok = editingDashboardId.value
    ? await updateDashboard(editingDashboardId.value, payload)
    : await createDashboard(payload);
  if (ok) {
    $q.notify({ type: 'positive', message: editingDashboardId.value ? 'Mis à jour' : 'Créé' });
    showDashboardForm.value = false;
    if (!editingDashboardId.value && dashboards.value.length) {
      const last = dashboards.value[0]!;
      selectedDashboardId.value = last.id;
      await loadDashboard(last.id);
    }
  } else {
    $q.notify({ type: 'negative', message: 'Erreur' });
  }
}

function confirmDelete() {
  if (!currentDashboard.value) return;
  $q.dialog({
    title: 'Supprimer ce dashboard ?',
    message: `"${currentDashboard.value.name}" et tous ses widgets seront supprimés.`,
    cancel: true, persistent: true,
  }).onOk(async () => {
    const id = currentDashboard.value!.id;
    const ok = await deleteDashboard(id);
    if (ok) {
      selectedDashboardId.value = dashboards.value[0]?.id || null;
      if (selectedDashboardId.value) await loadDashboard(selectedDashboardId.value);
    }
    $q.notify({ type: ok ? 'positive' : 'negative', message: ok ? 'Supprimé' : 'Erreur' });
  });
}

async function onSetDefault() {
  if (!currentDashboard.value) return;
  const ok = await setDefault(currentDashboard.value.id);
  $q.notify({ type: ok ? 'positive' : 'negative', message: ok ? 'Défini par défaut' : 'Erreur' });
}

async function onSelectDashboard(id: string) {
  if (!id) return;
  await loadDashboard(id);
  await refreshAllWidgets();
}

// --- Widget CRUD ---
function openAddWidget() {
  editingWidgetId.value = null;
  widgetForm.type = 'kpi';
  widgetForm.title = '';
  widgetForm.saved_query_id = null;
  widgetForm.kpiField = '';
  widgetForm.subtitle = '';
  widgetForm.chartLabelField = '';
  widgetForm.chartValueField = '';
  widgetForm.text = '';
  widgetForm.w = 4;
  widgetForm.h = 2;
  showWidgetForm.value = true;
}

function openEditWidget(w: DashboardWidget) {
  editingWidgetId.value = w.id;
  widgetForm.type = w.type;
  widgetForm.title = w.title;
  widgetForm.saved_query_id = w.saved_query_id || null;
  widgetForm.kpiField = (w.config?.kpiField as string) || '';
  widgetForm.subtitle = (w.config?.subtitle as string) || '';
  widgetForm.chartLabelField = (w.config?.chartLabelField as string) || '';
  widgetForm.chartValueField = (w.config?.chartValueField as string) || '';
  widgetForm.text = (w.config?.text as string) || '';
  widgetForm.w = w.w;
  widgetForm.h = w.h;
  showWidgetForm.value = true;
}

async function submitWidgetForm() {
  if (!widgetForm.title.trim()) {
    $q.notify({ type: 'warning', message: 'Titre requis' }); return;
  }
  const config: Record<string, unknown> = {};
  if (widgetForm.kpiField)        config.kpiField        = widgetForm.kpiField;
  if (widgetForm.subtitle)        config.subtitle        = widgetForm.subtitle;
  if (widgetForm.chartLabelField) config.chartLabelField = widgetForm.chartLabelField;
  if (widgetForm.chartValueField) config.chartValueField = widgetForm.chartValueField;
  if (widgetForm.text)            config.text            = widgetForm.text;

  const widget: DashboardWidget = {
    id: editingWidgetId.value || generateWidgetId(),
    type: widgetForm.type,
    title: widgetForm.title.trim(),
    x: 0,
    y: 0,
    w: Math.max(1, Math.min(12, widgetForm.w)),
    h: Math.max(1, widgetForm.h),
    saved_query_id: widgetForm.saved_query_id || null,
    config,
  };

  const ok = editingWidgetId.value
    ? await updateWidget(editingWidgetId.value, widget)
    : await addWidget(widget);
  if (ok) {
    $q.notify({ type: 'positive', message: editingWidgetId.value ? 'Modifié' : 'Ajouté' });
    showWidgetForm.value = false;
    await refreshWidget(widget.id);
  } else {
    $q.notify({ type: 'negative', message: 'Erreur' });
  }
}

async function onRemoveWidget(id: string) {
  $q.dialog({
    title: 'Supprimer ce widget ?', cancel: true, persistent: true,
  }).onOk(async () => {
    const ok = await removeWidget(id);
    if (ok) delete widgetData.value[id];
    $q.notify({ type: ok ? 'positive' : 'negative', message: ok ? 'Supprimé' : 'Erreur' });
  });
}

// --- Widget data refresh ---
async function refreshAllWidgets() {
  if (!currentDashboard.value) return;
  for (const w of currentDashboard.value.layout) {
    await refreshWidget(w.id);
  }
}

async function refreshWidget(widgetId: string) {
  if (!currentDashboard.value) return;
  const widget = currentDashboard.value.layout.find(w => w.id === widgetId);
  if (!widget) return;

  loadingWidgets.value[widgetId] = true;
  try {
    if (widget.type === 'text') {
      widgetData.value[widgetId] = {};
      return;
    }
    if (!widget.saved_query_id) {
      widgetData.value[widgetId] = {};
      return;
    }
    const q: SavedQuery | undefined = queries.value.find(qu => qu.id === widget.saved_query_id);
    if (!q) {
      widgetData.value[widgetId] = {};
      return;
    }
    const rows = await runQuery({
      source_table: q.source_table,
      fields: q.fields,
      filters: q.filters,
      group_by: q.group_by,
      order_by: q.order_by,
      aggregations: q.aggregations,
    });
    const cleaned: Record<string, unknown>[] = rows.map((r, i) => ({ ...r, _idx: i }));

    if (widget.type === 'kpi') {
      const field = (widget.config?.kpiField as string) || (q.aggregations[0]?.alias || `${q.aggregations[0]?.fn}_${q.aggregations[0]?.field}`);
      const v = field && cleaned.length ? cleaned[0]![field] : null;
      widgetData.value[widgetId] = {
        value: v !== null && v !== undefined ? new Intl.NumberFormat('fr-FR').format(Number(v)) : '—',
      };
    } else if (widget.type === 'chart') {
      const labelField = (widget.config?.chartLabelField as string) || q.group_by[0] || '';
      const valueField = (widget.config?.chartValueField as string)
        || (q.aggregations[0]?.alias || `${q.aggregations[0]?.fn}_${q.aggregations[0]?.field}`);
      const points = cleaned.slice(0, 12).map(r => ({
        label: String(r[labelField] ?? ''),
        value: Number(r[valueField] ?? 0),
      }));
      widgetData.value[widgetId] = { chartPoints: points };
    } else {
      // table or saved_query
      const headers = cleaned.length ? Object.keys(cleaned[0]!).filter(h => h !== '_idx') : [];
      widgetData.value[widgetId] = {
        rows: cleaned,
        columns: headers.map(h => ({ name: h, label: h, field: h, align: 'left' as const, sortable: true })),
      };
    }
  } finally {
    loadingWidgets.value[widgetId] = false;
  }
}

// --- Layout helpers ---
function widgetStyle(w: DashboardWidget): Record<string, string> {
  const colWidth = `${(w.w / 12) * 100}%`;
  return {
    width: `calc(${colWidth} - 8px)`,
    minHeight: `${w.h * 100}px`,
  };
}

function widgetIcon(t: DashboardWidgetType): string {
  return ({ kpi: 'speed', chart: 'bar_chart', table: 'table_view', saved_query: 'query_stats', text: 'notes' })[t] || 'widgets';
}

function widgetColor(t: DashboardWidgetType): string {
  return ({ kpi: 'primary', chart: 'blue', table: 'teal', saved_query: 'purple', text: 'grey-7' })[t] || 'grey';
}

function chartViewBox(w: DashboardWidget): { w: number; h: number } {
  return { w: 360, h: w.h * 80 };
}

function chartMax(w: DashboardWidget): number {
  const pts = widgetData.value[w.id]?.chartPoints || [];
  const max = Math.max(...pts.map(p => p.value), 1);
  return max;
}

onMounted(async () => {
  await loadQueries();
  await loadDashboards();
  if (currentDashboard.value) {
    selectedDashboardId.value = currentDashboard.value.id;
    await refreshAllWidgets();
  }
});
</script>

<style scoped>
.dashboard-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.widget-card {
  flex-grow: 0;
  flex-shrink: 0;
}
</style>
