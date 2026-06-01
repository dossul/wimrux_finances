<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Immobilisations</div>
        <div class="text-caption text-grey-7">Suivi des actifs · amortissement linéaire & dégressif</div>
      </div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nouvelle immobilisation" no-caps @click="openCreate" />
    </div>

    <!-- KPI -->
    <div class="row q-gutter-md q-mb-lg">
      <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Actifs en service</div>
        <div class="text-h5 text-weight-bold text-primary">{{ stats.totalCount }}</div>
      </q-card-section></q-card>
      <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Valeur d'acquisition</div>
        <div class="text-h6 text-weight-bold">{{ fmt(stats.totalAcquisitionValue) }}</div>
      </q-card-section></q-card>
      <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Valeur nette comptable</div>
        <div class="text-h6 text-weight-bold text-positive">{{ fmt(stats.totalNetBookValue) }}</div>
      </q-card-section></q-card>
      <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Amort. cumulés</div>
        <div class="text-h6 text-weight-bold text-orange">{{ fmt(stats.totalAccumulated) }}</div>
      </q-card-section></q-card>
    </div>

    <!-- Table -->
    <q-card flat bordered>
      <q-table :rows="assets" :columns="columns" row-key="id" :loading="loading" flat
        :pagination="{ rowsPerPage: 20 }">
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.value)" :label="statusLabel(props.value)" />
          </q-td>
        </template>
        <template #body-cell-method="props">
          <q-td :props="props">
            <q-chip dense size="sm" color="grey-3">{{ methodLabel(props.value) }}</q-chip>
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round dense size="sm" icon="visibility" color="primary" @click="viewSchedule(props.row)" />
            <q-btn flat round dense size="sm" icon="edit" color="grey-7" @click="openEdit(props.row)" />
            <q-btn flat round dense size="sm" icon="sell" color="orange" title="Céder" @click="openDispose(props.row)" />
            <q-btn flat round dense size="sm" icon="delete" color="negative" @click="confirmDelete(props.row)" />
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6">
            <q-icon name="inventory" size="48px" /><br>Aucune immobilisation
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog Tableau d'amortissement -->
    <q-dialog v-model="showSchedule" persistent>
      <q-card style="min-width:700px; max-width:90vw">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Tableau d'amortissement — {{ selectedAsset?.name }}</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-table :rows="schedule" :columns="scheduleColumns" row-key="id" flat dense :pagination="{ rowsPerPage: 30 }" />
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Dialog Create/Edit -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width:520px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editing ? 'Modifier' : 'Nouvelle immobilisation' }}</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <div class="q-gutter-md">
            <div class="row q-gutter-sm">
              <q-input v-model="form.reference" label="Référence *" outlined dense class="col" />
              <q-input v-model="form.name" label="Nom *" outlined dense class="col-7" />
            </div>
            <q-input v-model="form.description" label="Description" outlined dense type="textarea" rows="2" />
            <div class="row q-gutter-sm">
              <q-input v-model="form.acquisition_date" label="Date d'acquisition *" type="date" outlined dense class="col" />
              <q-input v-model.number="form.acquisition_value" label="Valeur acquisition (XOF) *" type="number" outlined dense class="col" />
            </div>
            <div class="row q-gutter-sm">
              <q-input v-model.number="form.residual_value" label="Valeur résiduelle" type="number" outlined dense class="col" />
              <q-input v-model.number="form.useful_life_years" label="Durée vie utile (années) *" type="number" outlined dense class="col" />
            </div>
            <div class="row q-gutter-sm">
              <q-select v-model="form.depreciation_method" :options="methodOptions" label="Méthode *" emit-value map-options outlined dense class="col" />
              <q-input v-model="form.location" label="Localisation" outlined dense class="col" />
            </div>
            <q-input v-if="form.depreciation_method === 'degressive'" v-model.number="form.degressive_rate"
              label="Taux dégressif (%)" type="number" outlined dense hint="Laisser 0 pour calcul automatique (coef fiscal)" />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" :label="editing ? 'Enregistrer' : 'Créer'" :loading="loading" @click="submit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog Cession -->
    <q-dialog v-model="showDispose" persistent>
      <q-card style="min-width:400px">
        <q-card-section><div class="text-h6">Céder l'immobilisation</div></q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="disposeForm.date" label="Date de cession *" type="date" outlined dense />
          <q-input v-model.number="disposeForm.value" label="Valeur de cession (XOF) *" type="number" outlined dense />
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="orange" icon="sell" label="Céder" @click="doDispose" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useDepreciation } from 'src/composables/useDepreciation';
import type { FixedAsset, FixedAssetInput } from 'src/types';

const $q = useQuasar();
const { assets, schedule, loading, stats, loadAssets, createAsset, updateAsset, disposeAsset, deleteAsset, loadSchedule } = useDepreciation();

const columns = [
  { name: 'reference', label: 'Référence', field: 'reference', align: 'left' as const, sortable: true },
  { name: 'name', label: 'Nom', field: 'name', align: 'left' as const, sortable: true },
  { name: 'acquisition_date', label: 'Acquisition', field: 'acquisition_date', align: 'center' as const, sortable: true },
  { name: 'acquisition_value', label: 'Valeur acq.', field: 'acquisition_value', align: 'right' as const, format: (v: number) => fmt(v) },
  { name: 'net_book_value', label: 'VNC', field: 'net_book_value', align: 'right' as const, format: (v: number) => fmt(v) },
  { name: 'method', label: 'Méthode', field: 'depreciation_method', align: 'center' as const },
  { name: 'useful_life_years', label: 'Durée', field: 'useful_life_years', align: 'center' as const, format: (v: number) => `${v} ans` },
  { name: 'status', label: 'Statut', field: 'status', align: 'center' as const },
  { name: 'actions', label: '', field: 'id', align: 'right' as const },
];
const scheduleColumns = [
  { name: 'period_year', label: 'Année', field: 'period_year', align: 'center' as const },
  { name: 'annuity', label: 'Annuité', field: 'annuity', align: 'right' as const, format: (v: number) => fmt(v) },
  { name: 'accumulated', label: 'Cumulé', field: 'accumulated', align: 'right' as const, format: (v: number) => fmt(v) },
  { name: 'net_book_value', label: 'VNC', field: 'net_book_value', align: 'right' as const, format: (v: number) => fmt(v) },
];

const methodOptions = [
  { label: 'Linéaire', value: 'linear' },
  { label: 'Dégressif', value: 'degressive' },
  { label: 'Unités d\'œuvre', value: 'units' },
];

function fmt(n: number): string { return Number(n).toLocaleString('fr-FR'); }
function statusColor(s: string): string {
  return { in_service: 'positive', sold: 'orange', disposed: 'grey', scrapped: 'negative' }[s] ?? 'grey';
}
function statusLabel(s: string): string {
  return { in_service: 'En service', sold: 'Cédé', disposed: 'Mis au rebut', scrapped: 'Détruit' }[s] ?? s;
}
function methodLabel(m: string): string {
  return { linear: 'Linéaire', degressive: 'Dégressif', units: 'Unités' }[m] ?? m;
}

// Form
const showForm = ref(false);
const editing  = ref<FixedAsset | null>(null);
const today = new Date().toISOString().split('T')[0] as string;
const emptyForm = (): FixedAssetInput => ({
  reference: '', name: '', description: null,
  acquisition_date: today, acquisition_value: 0, residual_value: 0,
  useful_life_years: 5, depreciation_method: 'linear', degressive_rate: 0, location: null,
});
const form = ref<FixedAssetInput>(emptyForm());

function openCreate() { editing.value = null; form.value = emptyForm(); showForm.value = true; }
function openEdit(a: FixedAsset) {
  editing.value = a;
  form.value = {
    reference: a.reference, name: a.name, description: a.description,
    acquisition_date: a.acquisition_date, acquisition_value: a.acquisition_value,
    residual_value: a.residual_value, useful_life_years: a.useful_life_years,
    depreciation_method: a.depreciation_method, degressive_rate: a.degressive_rate,
    location: a.location,
  };
  showForm.value = true;
}
async function submit() {
  if (!form.value.reference || !form.value.name || !form.value.acquisition_value) {
    $q.notify({ type: 'negative', message: 'Champs requis manquants' }); return;
  }
  if (editing.value) await updateAsset(editing.value.id, form.value as Partial<FixedAsset>);
  else await createAsset(form.value);
  showForm.value = false;
  $q.notify({ type: 'positive', message: editing.value ? 'Modifié' : 'Créé' });
}

// Schedule
const showSchedule = ref(false);
const selectedAsset = ref<FixedAsset | null>(null);
async function viewSchedule(a: FixedAsset) {
  selectedAsset.value = a;
  await loadSchedule(a.id);
  showSchedule.value = true;
}

// Dispose
const showDispose = ref(false);
const disposeForm = ref({ date: today, value: 0, assetId: '' });
function openDispose(a: FixedAsset) {
  disposeForm.value = { date: today, value: 0, assetId: a.id };
  showDispose.value = true;
}
async function doDispose() {
  await disposeAsset(disposeForm.value.assetId, disposeForm.value.date, disposeForm.value.value);
  showDispose.value = false;
  $q.notify({ type: 'positive', message: 'Immobilisation cédée' });
}

function confirmDelete(a: FixedAsset) {
  $q.dialog({ title: 'Supprimer', message: `Supprimer "${a.name}" ?`, cancel: true, ok: { color: 'negative' } })
    .onOk(async () => { await deleteAsset(a.id); $q.notify({ type: 'warning', message: 'Supprimé' }); });
}

onMounted(() => loadAssets());
</script>

<style scoped>.kpi { min-width: 160px; }</style>
