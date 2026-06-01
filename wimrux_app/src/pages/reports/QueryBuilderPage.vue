<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Visual Query Builder</div>
        <div class="text-caption text-grey-7">Construire des requêtes sur mesure · sauvegarder · exporter</div>
      </div>
      <q-space />
      <q-btn outline color="primary" icon="folder_open" label="Mes requêtes" no-caps @click="showSavedDialog = true" class="q-mr-sm" />
      <q-btn color="primary" icon="play_arrow" label="Exécuter" no-caps @click="execute" :disable="!builderForm.source_table" :loading="loading" />
    </div>

    <div class="row q-col-gutter-md">
      <!-- Builder pane -->
      <div class="col-12 col-md-4">
        <q-card flat bordered>
          <q-card-section><div class="text-subtitle1 text-weight-bold">Construction</div></q-card-section>
          <q-separator />
          <q-card-section>
            <!-- Source table -->
            <q-select v-model="builderForm.source_table" :options="QUERY_BUILDER_TABLES" label="Source de données *"
              outlined dense emit-value map-options option-label="label" option-value="value"
              class="q-mb-md" @update:model-value="onTableChange" />

            <!-- Field picker: dropdown from schema -->
            <div class="text-caption text-grey-7 q-mb-xs">Champs à afficher
              <q-badge v-if="builderForm.fields.length" :label="`${builderForm.fields.length} sélectionné(s)`" color="primary" class="q-ml-sm" />
            </div>

            <template v-if="availableFields.length">
              <!-- Quick select -->
              <div class="row q-gutter-xs q-mb-xs">
                <q-btn flat dense size="xs" label="Tout" no-caps color="primary" @click="selectAllFields" />
                <q-btn flat dense size="xs" label="Aucun" no-caps color="grey-7" @click="builderForm.fields = []" />
              </div>
              <!-- Checkboxes by field -->
              <div class="q-mb-md field-picker">
                <q-checkbox
                  v-for="f in availableFields" :key="f.value"
                  v-model="builderForm.fields"
                  :val="f.value" :label="f.label"
                  dense size="sm" color="primary"
                  class="field-checkbox"
                />
              </div>
            </template>
            <div v-else-if="builderForm.source_table" class="text-caption text-grey-5 q-mb-md">
              Schéma non disponible — laissez vide pour sélectionner tous les champs
            </div>

            <q-separator class="q-my-sm" />
            <div class="text-caption text-grey-7 q-mb-xs">Filtres</div>
            <div v-for="(f, i) in builderForm.filters" :key="i" class="row items-end q-gutter-xs q-mb-xs bg-grey-2 q-pa-xs rounded-borders">
              <q-select v-if="availableFields.length"
                v-model="f.field" :options="availableFields" emit-value map-options
                option-label="label" option-value="value"
                label="Champ" dense outlined class="col" />
              <q-input v-else v-model="f.field" label="Champ" dense outlined class="col" />
              <q-select v-model="f.operator" :options="filterOperators" emit-value map-options dense outlined class="col-4" />
              <q-input v-if="!['is_null','not_null'].includes(f.operator)"
                v-model="f.value" label="Valeur" dense outlined class="col" />
              <q-btn flat round dense size="sm" icon="close" color="negative" @click="builderForm.filters.splice(i, 1)" />
            </div>
            <q-btn outline size="sm" icon="add" label="Filtre" no-caps @click="addFilter" class="q-mb-md" />

            <q-separator class="q-my-sm" />
            <div class="text-caption text-grey-7 q-mb-xs">Group by</div>
            <q-input v-model="newGroupBy" placeholder="Champ de groupement" outlined dense @keyup.enter="addGroupBy" class="q-mb-xs">
              <template #append><q-btn flat round dense icon="add" color="primary" @click="addGroupBy" /></template>
            </q-input>
            <div class="q-mb-md">
              <q-chip v-for="(g, i) in builderForm.group_by" :key="i" removable @remove="builderForm.group_by.splice(i, 1)"
                dense color="purple" text-color="white">{{ g }}</q-chip>
            </div>

            <q-separator class="q-my-sm" />
            <div class="text-caption text-grey-7 q-mb-xs">Agrégations</div>
            <div v-for="(a, i) in builderForm.aggregations" :key="i" class="row items-end q-gutter-xs q-mb-xs bg-grey-2 q-pa-xs rounded-borders">
              <q-select v-model="a.fn" :options="aggFns" dense outlined class="col-3" />
              <q-select v-if="availableFields.length"
                v-model="a.field" :options="availableFields.filter(f => f.type === 'number')" emit-value map-options
                option-label="label" option-value="value"
                label="Champ" dense outlined class="col" />
              <q-input v-else v-model="a.field" label="Champ" dense outlined class="col" />
              <q-input v-model="a.alias" label="Alias" dense outlined class="col-3" />
              <q-btn flat round dense size="sm" icon="close" color="negative" @click="builderForm.aggregations.splice(i, 1)" />
            </div>
            <q-btn outline size="sm" icon="add" label="Agrégation" no-caps @click="addAgg" class="q-mb-md" />

            <q-separator class="q-my-sm" />
            <q-select v-model="builderForm.chart_type" :options="chartTypes" label="Type de visualisation"
              outlined dense emit-value map-options clearable />
          </q-card-section>
          <q-separator />
          <q-card-actions align="between">
            <q-btn flat icon="refresh" label="Réinitialiser" no-caps @click="resetBuilder" />
            <q-btn color="secondary" icon="save" label="Sauvegarder" no-caps @click="openSaveDialog" />
          </q-card-actions>
        </q-card>
      </div>

      <!-- Results pane -->
      <div class="col-12 col-md-8">
        <q-card flat bordered>
          <q-card-section class="row items-center q-pb-none">
            <div class="text-subtitle1 text-weight-bold">Résultats</div>
            <q-space />
            <div v-if="lastResults.length" class="text-caption text-grey-7">{{ lastResults.length }} ligne(s)</div>
            <q-btn v-if="lastResults.length" flat round dense icon="download" color="primary" @click="downloadCSV" class="q-ml-sm">
              <q-tooltip>Télécharger CSV</q-tooltip>
            </q-btn>
          </q-card-section>
          <q-separator class="q-my-sm" />
          <q-card-section v-if="loading" class="text-center q-pa-xl">
            <q-spinner color="primary" size="32px" />
            <div class="text-caption text-grey-6 q-mt-sm">Exécution en cours...</div>
          </q-card-section>
          <q-card-section v-else-if="!lastResults.length" class="text-center q-pa-xl text-grey-6">
            <q-icon name="query_stats" size="64px" /><br>
            <div class="q-mt-md">Sélectionnez une source puis cliquez sur <strong>Exécuter</strong></div>
            <div class="text-caption q-mt-sm text-grey-5">Laissez "Champs à afficher" vide pour récupérer toutes les colonnes</div>
          </q-card-section>
          <q-card-section v-else>
            <q-table :rows="lastResults" :columns="resultColumns" row-key="_idx" flat dense
              :pagination="{ rowsPerPage: 25 }"
              class="results-table"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Dialog : sauvegarder requête -->
    <q-dialog v-model="showSaveDialog" persistent>
      <q-card style="min-width:480px">
        <q-card-section><div class="text-h6">Sauvegarder la requête</div></q-card-section>
        <q-card-section>
          <q-input v-model="saveForm.name" label="Nom *" outlined dense class="q-mb-sm" />
          <q-input v-model="saveForm.description" label="Description" type="textarea" rows="2" outlined dense class="q-mb-sm" />
          <q-toggle v-model="saveForm.is_shared" label="Partager avec l'équipe" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" label="Sauvegarder" @click="doSave" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog : liste des requêtes sauvegardées -->
    <q-dialog v-model="showSavedDialog">
      <q-card style="min-width:700px; max-width:95vw">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Requêtes sauvegardées</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-list separator>
            <q-item v-for="q in queries" :key="q.id" clickable @click="loadIntoBuilder(q)">
              <q-item-section>
                <q-item-label>{{ q.name }}</q-item-label>
                <q-item-label caption>
                  {{ q.source_table }} · {{ q.fields.length }} champ(s) · {{ q.filters.length }} filtre(s)
                  <span v-if="q.is_shared" class="text-info">· Partagé</span>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn flat round dense size="sm" icon="star" :color="q.is_favorite ? 'amber' : 'grey'"
                  @click.stop="onToggleFavorite(q.id, !q.is_favorite)" />
                <q-btn flat round dense size="sm" icon="delete" color="negative" @click.stop="confirmDeleteQuery(q.id)" />
              </q-item-section>
            </q-item>
            <q-item v-if="!queries.length">
              <q-item-section><div class="text-grey-6 text-center q-pa-md">Aucune requête sauvegardée</div></q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useSavedQueries, QUERY_BUILDER_TABLES, TABLE_SCHEMAS } from 'src/composables/useSavedQueries';
import { useReportExports } from 'src/composables/useReportExports';
import type {
  SavedQuery, QueryFilter, QueryAggregation, QueryChartType,
} from 'src/types';


const $q = useQuasar();
const {
  queries, lastResults, loading,
  loadQueries, createQuery, deleteQuery, toggleFavorite,
  runQuery, resultsToCSV,
} = useSavedQueries();
const { exportAndDownloadCSV } = useReportExports();

const filterOperators = [
  { label: '=', value: 'eq' }, { label: '≠', value: 'neq' },
  { label: '>', value: 'gt' }, { label: '>=', value: 'gte' },
  { label: '<', value: 'lt' }, { label: '<=', value: 'lte' },
  { label: 'contient', value: 'ilike' },
  { label: 'dans', value: 'in' },
  { label: 'est nul', value: 'is_null' },
  { label: 'non nul', value: 'not_null' },
  { label: 'entre', value: 'between' },
];

const aggFns = [
  { label: 'SUM', value: 'sum' },
  { label: 'AVG', value: 'avg' },
  { label: 'COUNT', value: 'count' },
  { label: 'MIN', value: 'min' },
  { label: 'MAX', value: 'max' },
];

const chartTypes = [
  { label: 'Tableau', value: 'table' },
  { label: 'Barres', value: 'bar' },
  { label: 'Lignes', value: 'line' },
  { label: 'Camembert', value: 'pie' },
  { label: 'Anneau', value: 'doughnut' },
  { label: 'Aires', value: 'area' },
];

const builderForm = reactive({
  source_table: '',
  fields: [] as string[],
  filters: [] as QueryFilter[],
  group_by: [] as string[],
  aggregations: [] as QueryAggregation[],
  chart_type: null as QueryChartType | null,
});

const newGroupBy = ref('');
const showSaveDialog = ref(false);
const showSavedDialog = ref(false);
const editingId = ref<string | null>(null);
const saveForm = reactive({ name: '', description: '', is_shared: false });

// ─── Schema-aware field picker ────────────────────────────────────────────────
const availableFields = computed(() => TABLE_SCHEMAS[builderForm.source_table] || []);

function onTableChange() {
  // Reset field selection when table changes
  builderForm.fields = [];
  builderForm.filters = [];
  builderForm.group_by = [];
  builderForm.aggregations = [];
  lastResults.value = [];
}

function selectAllFields() {
  builderForm.fields = availableFields.value.map(f => f.value);
}

// ─── Result columns with human-readable labels ────────────────────────────────
const resultColumns = computed(() => {
  if (!lastResults.value.length) return [];
  const schema = TABLE_SCHEMAS[builderForm.source_table] || [];
  const schemaMap = Object.fromEntries(schema.map(f => [f.value, f.label]));
  const headers = Object.keys(lastResults.value[0]!).filter(h => h !== '_idx');
  return headers.map(h => ({
    name: h,
    label: schemaMap[h] || h,  // Use human-readable label if available
    field: h,
    align: 'left' as const,
    sortable: true,
  }));
});

function addGroupBy() {
  if (newGroupBy.value.trim()) {
    builderForm.group_by.push(newGroupBy.value.trim());
    newGroupBy.value = '';
  }
}
function addFilter() {
  builderForm.filters.push({ field: '', operator: 'eq', value: '' });
}
function addAgg() {
  builderForm.aggregations.push({ field: '', fn: 'sum' });
}

function resetBuilder() {
  builderForm.source_table = '';
  builderForm.fields = [];
  builderForm.filters = [];
  builderForm.group_by = [];
  builderForm.aggregations = [];
  builderForm.chart_type = null;
  editingId.value = null;
}

async function execute() {
  if (!builderForm.source_table) {
    $q.notify({ type: 'warning', message: 'Choisissez une source' }); return;
  }
  const rows = await runQuery({
    source_table: builderForm.source_table,
    fields: builderForm.fields,
    filters: builderForm.filters,
    group_by: builderForm.group_by,
    order_by: [],
    aggregations: builderForm.aggregations,
  });
  // add _idx for unique row keys
  lastResults.value = rows.map((r, i) => ({ ...r, _idx: i }));
  if (!rows.length) $q.notify({ type: 'info', message: 'Aucun résultat' });
}

function openSaveDialog() {
  if (!builderForm.source_table) {
    $q.notify({ type: 'warning', message: 'Construisez une requête avant de sauvegarder' }); return;
  }
  saveForm.name = '';
  saveForm.description = '';
  saveForm.is_shared = false;
  showSaveDialog.value = true;
}

async function doSave() {
  if (!saveForm.name.trim()) {
    $q.notify({ type: 'warning', message: 'Nom requis' }); return;
  }
  const result = await createQuery({
    name: saveForm.name.trim(),
    description: saveForm.description.trim() || null,
    source_table: builderForm.source_table,
    fields: builderForm.fields,
    filters: builderForm.filters,
    group_by: builderForm.group_by,
    aggregations: builderForm.aggregations,
    chart_type: builderForm.chart_type,
    is_shared: saveForm.is_shared,
  });
  if (result) {
    $q.notify({ type: 'positive', message: 'Requête sauvegardée' });
    showSaveDialog.value = false;
  } else {
    $q.notify({ type: 'negative', message: 'Erreur' });
  }
}

function loadIntoBuilder(q: SavedQuery) {
  editingId.value = q.id;
  builderForm.source_table = q.source_table;
  builderForm.fields = [...q.fields];
  builderForm.filters = q.filters.map(f => ({ ...f }));
  builderForm.group_by = [...q.group_by];
  builderForm.aggregations = q.aggregations.map(a => ({ ...a }));
  builderForm.chart_type = q.chart_type;
  showSavedDialog.value = false;
  $q.notify({ type: 'info', message: `Requête "${q.name}" chargée` });
}

async function onToggleFavorite(id: string, value: boolean) {
  await toggleFavorite(id, value);
}

function confirmDeleteQuery(id: string) {
  $q.dialog({
    title: 'Supprimer cette requête ?',
    message: 'Action irréversible.',
    cancel: true, persistent: true,
  }).onOk(async () => {
    const ok = await deleteQuery(id);
    $q.notify({ type: ok ? 'positive' : 'negative', message: ok ? 'Supprimée' : 'Erreur' });
  });
}

async function downloadCSV() {
  if (!lastResults.value.length) return;
  const cleaned = lastResults.value.map(r => {
    const { _idx, ...rest } = r as Record<string, unknown> & { _idx?: number };
    void _idx;
    return rest;
  });
  const csv = resultsToCSV(cleaned);
  const filename = `requete_${builderForm.source_table}_${new Date().toISOString().slice(0, 10)}.csv`;
  await exportAndDownloadCSV('saved_query', csv, filename, { source_table: builderForm.source_table });
  $q.notify({ type: 'positive', message: 'CSV téléchargé' });
}

onMounted(async () => { await loadQueries(); });
</script>
