<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5">Catalogue articles</div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nouvel article" no-caps @click="openDialog()" />
    </div>

    <!-- Filters -->
    <div class="row q-gutter-sm q-mb-md">
      <q-input v-model="search" outlined dense clearable placeholder="Rechercher..." style="min-width: 220px">
        <template #prepend><q-icon name="search" /></template>
      </q-input>
      <q-select v-model="filterType" :options="typeOptions" emit-value map-options outlined dense clearable placeholder="Type" style="min-width: 150px" />
      <q-select v-model="filterGroup" :options="groupOptions" emit-value map-options outlined dense clearable placeholder="Groupe taxe" style="min-width: 150px" />
      <q-toggle v-model="showInactive" label="Inactifs" />
    </div>

    <!-- Table -->
    <q-table
      :rows="filtered"
      :columns="columns"
      row-key="id"
      :loading="loading"
      flat
      bordered
      :pagination="{ rowsPerPage: 20, sortBy: 'code' }"
    >
      <template #body-cell-type="props">
        <q-td :props="props">
          <q-badge :color="typeColor(props.row.type)" :label="props.row.type" />
        </q-td>
      </template>
      <template #body-cell-tax_group="props">
        <q-td :props="props">
          <q-badge outline color="teal" :label="props.row.tax_group" />
        </q-td>
      </template>
      <template #body-cell-is_active="props">
        <q-td :props="props">
          <q-badge :color="props.row.is_active ? 'green' : 'grey'" :label="props.row.is_active ? 'Actif' : 'Inactif'" />
        </q-td>
      </template>
      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn flat dense icon="edit" size="sm" @click="openDialog(props.row)" />
          <q-btn flat dense icon="delete" size="sm" color="negative" @click="confirmDelete(props.row)" />
        </q-td>
      </template>
    </q-table>

    <!-- Create/Edit Dialog -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">{{ editingId ? 'Modifier article' : 'Nouvel article' }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input v-model="form.code" outlined dense label="Code article *" :rules="[v => !!v || 'Requis']" />
          <q-input v-model="form.name" outlined dense label="Désignation *" :rules="[v => !!v || 'Requis', v => v.length >= 3 || 'Min 3 caractères']" />
          <q-select v-model="form.type" :options="typeOptions" emit-value map-options outlined dense label="Type article *" />
          <q-select v-model="form.tax_group" :options="groupOptions" emit-value map-options outlined dense label="Groupe taxation *" />
          <q-input v-model.number="form.unit_price" outlined dense label="Prix unitaire (FCFA) *" type="number" min="0" :rules="[v => v >= 0 || 'Positif']" />
          <q-input v-model.number="form.specific_tax" outlined dense label="Taxe spécifique (FCFA)" type="number" min="0" />
          <q-toggle v-model="form.is_active" label="Article actif" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" no-caps @click="dialogOpen = false" />
          <q-btn color="primary" :label="editingId ? 'Enregistrer' : 'Créer'" no-caps :loading="saving" @click="save" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import type { Article, ArticleType, TaxGroup } from 'src/types';

const $q = useQuasar();
const companyStore = useCompanyStore();

const articles = ref<Article[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const editingId = ref<string | null>(null);

const search = ref('');
const filterType = ref<string | null>(null);
const filterGroup = ref<string | null>(null);
const showInactive = ref(false);

const form = ref({
  code: '',
  name: '',
  type: 'LOCBIE' as ArticleType,
  tax_group: 'B' as TaxGroup,
  unit_price: 0,
  specific_tax: 0,
  is_active: true,
});

const typeOptions = [
  { label: 'LOCBIE — Bien local', value: 'LOCBIE' },
  { label: 'LOCSER — Service local', value: 'LOCSER' },
  { label: 'IMPBIE — Bien importé', value: 'IMPBIE' },
  { label: 'IMPSER — Service importé', value: 'IMPSER' },
];

const groupOptions = 'ABCDEFGHIJKLMNOP'.split('').map(g => ({ label: `Groupe ${g}`, value: g }));

function typeColor(t: string) {
  const map: Record<string, string> = { LOCBIE: 'blue', LOCSER: 'purple', IMPBIE: 'orange', IMPSER: 'red' };
  return map[t] || 'grey';
}

const columns = [
  { name: 'code', label: 'Code', field: 'code', align: 'left' as const, sortable: true },
  { name: 'name', label: 'Désignation', field: 'name', align: 'left' as const, sortable: true },
  { name: 'type', label: 'Type', field: 'type', align: 'center' as const, sortable: true },
  { name: 'tax_group', label: 'Groupe', field: 'tax_group', align: 'center' as const, sortable: true },
  { name: 'unit_price', label: 'Prix unitaire', field: 'unit_price', align: 'right' as const, sortable: true, format: (v: number) => fmtCur(v) },
  { name: 'specific_tax', label: 'Taxe spéc.', field: 'specific_tax', align: 'right' as const, format: (v: number) => v ? fmtCur(v) : '—' },
  { name: 'is_active', label: 'Statut', field: 'is_active', align: 'center' as const },
  { name: 'actions', label: '', field: 'id', align: 'center' as const },
];

function fmtCur(n: number): string {
  return new Intl.NumberFormat('fr-BF', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);
}

const filtered = computed(() => {
  let list = articles.value;
  if (!showInactive.value) list = list.filter(a => a.is_active);
  if (filterType.value) list = list.filter(a => a.type === filterType.value);
  if (filterGroup.value) list = list.filter(a => a.tax_group === filterGroup.value);
  if (search.value) {
    const q = search.value.toLowerCase();
    list = list.filter(a => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q));
  }
  return list;
});

async function loadArticles() {
  loading.value = true;
  try {
    const { data, error } = await insforge.database
      .from('articles')
      .select('*')
      .order('code', { ascending: true });
    if (!error && data) articles.value = data as Article[];
  } finally {
    loading.value = false;
  }
}

function openDialog(article?: Article) {
  if (article) {
    editingId.value = article.id;
    form.value = {
      code: article.code,
      name: article.name,
      type: article.type,
      tax_group: article.tax_group,
      unit_price: article.unit_price,
      specific_tax: article.specific_tax,
      is_active: article.is_active,
    };
  } else {
    editingId.value = null;
    form.value = { code: '', name: '', type: 'LOCBIE', tax_group: 'B', unit_price: 0, specific_tax: 0, is_active: true };
  }
  dialogOpen.value = true;
}

async function save() {
  if (!form.value.code || !form.value.name) {
    $q.notify({ type: 'warning', message: 'Code et désignation requis' });
    return;
  }
  saving.value = true;
  try {
    const payload = {
      code: form.value.code,
      name: form.value.name,
      type: form.value.type,
      tax_group: form.value.tax_group,
      unit_price: form.value.unit_price,
      specific_tax: form.value.specific_tax || 0,
      is_active: form.value.is_active,
      company_id: companyStore.companyId,
    };

    if (editingId.value) {
      const { error } = await insforge.database.from('articles').update(payload).eq('id', editingId.value);
      if (error) throw new Error(error.message);
      $q.notify({ type: 'positive', message: 'Article modifié' });
    } else {
      const { error } = await insforge.database.from('articles').insert([payload]);
      if (error) throw new Error(error.message);
      $q.notify({ type: 'positive', message: 'Article créé' });
    }
    dialogOpen.value = false;
    await loadArticles();
  } catch (err: unknown) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'Erreur' });
  } finally {
    saving.value = false;
  }
}

function confirmDelete(article: Article) {
  $q.dialog({
    title: 'Supprimer',
    message: `Supprimer l'article "${article.name}" ?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    void (async () => {
      const { error } = await insforge.database.from('articles').delete().eq('id', article.id);
      if (error) {
        $q.notify({ type: 'negative', message: error.message });
      } else {
        $q.notify({ type: 'positive', message: 'Article supprimé' });
        await loadArticles();
      }
    })();
  });
}

onMounted(() => { void loadArticles(); });
</script>
