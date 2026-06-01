<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Routage IA</div>
        <div class="text-caption text-grey-7">Matrice tâches IA &times; modèles par défaut</div>
      </div>
      <q-space />
      <q-btn flat icon="refresh" color="primary" @click="reload" :loading="loading" />
    </div>

    <!-- Info banner -->
    <q-banner class="q-mb-md bg-blue-1 text-blue-9" rounded>
      <template #avatar><q-icon name="info" color="blue" /></template>
      Chaque tâche IA utilise un modèle par défaut. Vous pouvez personnaliser le modèle pour votre entreprise.
      Si non personnalisé, le modèle global est utilisé.
    </q-banner>

    <!-- Filtres par catégorie -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-gutter-sm items-center q-py-sm">
        <q-btn-toggle v-model="filterCategory" :options="categoryOptions" no-caps outline toggle-color="primary" />
        <q-space />
        <q-input v-model="search" placeholder="Rechercher..." dense outlined clearable style="max-width:250px">
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </q-card-section>
    </q-card>

    <!-- Table routing -->
    <q-card flat bordered>
      <q-table :rows="filteredTasks" :columns="columns" row-key="id" flat :loading="loading" :pagination="{ rowsPerPage: 25 }">
        <template #body-cell-category="props">
          <q-td :props="props">
            <q-badge :color="getCategoryColor(props.row.category)" :label="props.row.category" />
          </q-td>
        </template>
        <template #body-cell-default_model="props">
          <q-td :props="props">
            <span class="text-grey-7">{{ getModelName(props.row.default_model_id) }}</span>
          </q-td>
        </template>
        <template #body-cell-custom_model="props">
          <q-td :props="props">
            <q-select
              :model-value="getCustomModelId(props.row.id)"
              :options="modelOptions"
              option-value="id"
              option-label="name"
              emit-value
              map-options
              dense
              outlined
              clearable
              placeholder="(défaut global)"
              style="min-width:200px"
              @update:model-value="(v: string | null) => onRoutingChange(props.row.id, v)"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAiSettings } from 'src/composables/useAiSettings';

const {
  tasks, models, routings, loading,
  loadAll, setRouting, removeRouting,
} = useAiSettings();

const filterCategory = ref('all');
const search = ref('');

const categories = computed(() => {
  const cats = [...new Set(tasks.value.map(t => t.category).filter(Boolean))];
  return cats.sort();
});

const categoryOptions = computed(() => [
  { label: 'Toutes', value: 'all' },
  ...categories.value.filter((c): c is string => Boolean(c)).map(c => ({ label: c, value: c })),
]);

const modelOptions = computed(() => models.value.filter(m => m.is_active));

const filteredTasks = computed(() => {
  let list = tasks.value;
  if (filterCategory.value !== 'all') {
    list = list.filter(t => t.category === filterCategory.value);
  }
  if (search.value) {
    const q = search.value.toLowerCase();
    list = list.filter(t => t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q));
  }
  return list;
});

const columns = [
  { name: 'code', label: 'Code', align: 'left' as const, field: 'code', sortable: true },
  { name: 'name', label: 'Tâche', align: 'left' as const, field: 'name', sortable: true },
  { name: 'category', label: 'Catégorie', align: 'left' as const, field: 'category', sortable: true },
  { name: 'default_model', label: 'Modèle global', align: 'left' as const, field: 'default_model_id' },
  { name: 'custom_model', label: 'Modèle personnalisé', align: 'left' as const, field: 'id' },
];

function getModelName(modelId: string): string {
  return models.value.find(m => m.id === modelId)?.name ?? '—';
}

function getCustomModelId(taskId: string): string | null {
  const routing = routings.value.find(r => r.task_id === taskId && r.is_active);
  return routing?.model_id ?? null;
}

async function onRoutingChange(taskId: string, modelId: string | null) {
  if (modelId) {
    await setRouting(taskId, modelId);
  } else {
    await removeRouting(taskId);
  }
}

function getCategoryColor(cat: string): string {
  const map: Record<string, string> = {
    ocr: 'teal', assistant: 'indigo', classification: 'orange',
    detection: 'red', reconciliation: 'purple', report: 'blue',
    compliance: 'green', parsing: 'brown',
  };
  return map[cat] ?? 'grey';
}

function reload() { void loadAll(); }

onMounted(() => { void loadAll(); });
</script>
