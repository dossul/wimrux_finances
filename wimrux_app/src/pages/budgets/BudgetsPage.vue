<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Budgets</div>
        <div class="text-caption text-grey-7">Planification annuelle · suivi des écarts</div>
      </div>
      <q-space />
      <q-btn outline color="teal" icon="content_copy" label="Dupliquer" no-caps class="q-mr-sm" @click="openDuplicate" />
      <q-btn color="primary" icon="add" label="Nouveau budget" no-caps @click="openCreate" />
    </div>

    <!-- Filtres -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-gutter-sm items-end q-py-sm">
        <q-select v-model="filterStatus" :options="statusOptions" label="Statut" emit-value map-options clearable dense outlined style="min-width:140px" />
        <q-select v-model="filterPeriod" :options="periodOptions" label="Période" emit-value map-options clearable dense outlined style="min-width:140px" />
        <q-input v-model.number="filterYear" label="Année fiscale" type="number" dense outlined style="min-width:130px" />
        <q-btn flat icon="filter_alt" color="primary" @click="applyFilters" />
        <q-btn flat icon="clear" color="grey" @click="resetFilters" />
      </q-card-section>
    </q-card>

    <!-- Table Budgets -->
    <q-card flat bordered>
      <q-table :rows="budgets" :columns="columns" row-key="id" :loading="loading"
        :pagination="{ rowsPerPage: 15 }" flat>

        <template #body-cell-period="props">
          <q-td :props="props">
            <q-chip dense size="sm" :color="periodColor(props.row.period_type)" text-color="white">
              {{ periodLabel(props.row.period_type) }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.value)" :label="statusLabel(props.value)" />
          </q-td>
        </template>

        <template #body-cell-amounts="props">
          <q-td :props="props">
            <div class="text-caption">
              <div>Prévu : <span class="text-weight-medium">{{ fmtAmount(props.row.total_planned) }}</span></div>
              <div>Réel : <span :class="reelColor(props.row)">{{ fmtAmount(props.row.total_actual) }}</span></div>
            </div>
          </q-td>
        </template>

        <template #body-cell-period_dates="props">
          <q-td :props="props">
            {{ fmtDate(props.row.period_start) }} — {{ fmtDate(props.row.period_end) }}
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round dense size="sm" icon="visibility" color="primary"
              :to="`/app/budgets/${props.row.id}`" title="Détail" />
            <q-btn flat round dense size="sm" icon="edit" color="grey-7"
              title="Modifier" @click="openEdit(props.row)" />
            <q-btn flat round dense size="sm" icon="content_copy" color="teal"
              title="Dupliquer" @click="selectForDuplicate(props.row)" />
            <q-btn flat round dense size="sm" icon="delete" color="negative"
              title="Supprimer" @click="confirmDelete(props.row)" />
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6">
            <q-icon name="account_balance" size="48px" class="q-mb-sm" /><br>
            Aucun budget créé. Commencez par créer votre premier budget annuel.
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog Create/Edit -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width:480px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingBudget ? 'Modifier' : 'Nouveau budget' }}</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <div class="q-gutter-md">
            <q-input v-model="form.name" label="Nom du budget *" outlined dense />
            <div class="row q-gutter-sm">
              <q-select v-model="form.period_type" :options="periodOptions" label="Type de période *"
                emit-value map-options outlined dense class="col" />
              <q-input v-model.number="form.fiscal_year" label="Année fiscale *" type="number" outlined dense class="col" />
            </div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.period_start" label="Date début *" type="date" outlined dense class="col" />
              <q-input v-model="form.period_end" label="Date fin *" type="date" outlined dense class="col" />
            </div>
            <q-select v-model="form.status" :options="statusOptions" label="Statut"
              emit-value map-options outlined dense />
            <q-input v-model="form.notes" label="Notes" outlined dense type="textarea" rows="2" />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" :label="editingBudget ? 'Enregistrer' : 'Créer'" :loading="loading" @click="submitForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog Duplicate -->
    <q-dialog v-model="showDuplicate" persistent>
      <q-card style="min-width:400px">
        <q-card-section>
          <div class="text-h6">Dupliquer le budget</div>
          <div class="text-caption text-grey-7 q-mt-sm">
            Source : <strong>{{ duplicateSource?.name }}</strong> ({{ duplicateSource?.fiscal_year }})
          </div>
        </q-card-section>
        <q-card-section>
          <div class="q-gutter-md">
            <q-input v-model="duplicateForm.name" label="Nom du nouveau budget *" outlined dense />
            <q-input v-model.number="duplicateForm.fiscal_year" label="Nouvelle année fiscale *" type="number" outlined dense />
            <div class="text-caption text-grey-7">
              Les dates de période seront automatiquement ajustées selon le décalage d'année.
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="teal" icon="content_copy" label="Dupliquer" :loading="loading" @click="doDuplicate" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useBudgets } from 'src/composables/useBudgets';
import type { Budget, BudgetInput, BudgetStatus, BudgetPeriodType } from 'src/types';

const $q = useQuasar();
const { budgets, loading, loadBudgets, createBudget, updateBudget, deleteBudget, duplicateBudget } = useBudgets();

const columns = [
  { name: 'name', label: 'Budget', field: 'name', align: 'left' as const, sortable: true },
  { name: 'fiscal_year', label: 'Exercice', field: 'fiscal_year', align: 'center' as const, sortable: true },
  { name: 'period', label: 'Type', field: 'period_type', align: 'center' as const },
  { name: 'period_dates', label: 'Période', field: 'period_start', align: 'center' as const },
  { name: 'amounts', label: 'Montants (XOF)', field: 'total_planned', align: 'right' as const },
  { name: 'status', label: 'Statut', field: 'status', align: 'center' as const },
  { name: 'actions', label: '', field: 'id', align: 'right' as const },
];

const statusOptions = [
  { label: 'Brouillon', value: 'draft' },
  { label: 'Actif', value: 'active' },
  { label: 'Clôturé', value: 'closed' },
  { label: 'Archivé', value: 'archived' },
];
const periodOptions = [
  { label: 'Mensuel', value: 'monthly' },
  { label: 'Trimestriel', value: 'quarterly' },
  { label: 'Annuel', value: 'yearly' },
  { label: 'Personnalisé', value: 'custom' },
];

const filterStatus = ref<BudgetStatus | null>(null);
const filterPeriod = ref<BudgetPeriodType | null>(null);
const filterYear   = ref<number | null>(null);

function fmtAmount(n: number): string { return Number(n).toLocaleString('fr-FR'); }
function fmtDate(d: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}
function statusColor(s: string): string {
  return s === 'active' ? 'positive' : s === 'draft' ? 'grey' : s === 'closed' ? 'orange' : 'grey-6';
}
function statusLabel(s: string): string {
  const m: Record<string, string> = { draft: 'Brouillon', active: 'Actif', closed: 'Clôturé', archived: 'Archivé' };
  return m[s] ?? s;
}
function periodColor(p: string): string {
  return p === 'yearly' ? 'primary' : p === 'quarterly' ? 'secondary' : p === 'monthly' ? 'accent' : 'grey';
}
function periodLabel(p: string): string {
  const m: Record<string, string> = { yearly: 'Annuel', quarterly: 'Trimestre', monthly: 'Mois', custom: 'Perso' };
  return m[p] ?? p;
}
function reelColor(b: Budget): string {
  const ratio = b.total_planned > 0 ? b.total_actual / b.total_planned : 0;
  return ratio > 0.9 ? 'text-negative' : ratio > 0.75 ? 'text-warning' : 'text-positive';
}

async function applyFilters() {
  const opts: Parameters<typeof loadBudgets>[0] = {};
  if (filterStatus.value) opts.status = filterStatus.value;
  if (filterPeriod.value) opts.period_type = filterPeriod.value;
  if (filterYear.value)   opts.fiscal_year = filterYear.value;
  await loadBudgets(opts);
}
function resetFilters() {
  filterStatus.value = null; filterPeriod.value = null; filterYear.value = null;
  void applyFilters();
}

// Form CRUD
const showForm       = ref(false);
const editingBudget  = ref<Budget | null>(null);
const currentYear    = new Date().getFullYear();
const emptyForm = (): BudgetInput => ({
  name: '',
  period_type: 'yearly',
  fiscal_year: currentYear,
  period_start: `${currentYear}-01-01`,
  period_end: `${currentYear}-12-31`,
  status: 'draft',
  notes: null,
});
const form = ref<BudgetInput>(emptyForm());

function openCreate() { editingBudget.value = null; form.value = emptyForm(); showForm.value = true; }
function openEdit(b: Budget) {
  editingBudget.value = b;
  form.value = { name: b.name, period_type: b.period_type, fiscal_year: b.fiscal_year,
    period_start: b.period_start, period_end: b.period_end, status: b.status, notes: b.notes };
  showForm.value = true;
}
async function submitForm() {
  if (!form.value.name || !form.value.period_start || !form.value.period_end) {
    $q.notify({ type: 'negative', message: 'Champs requis manquants' }); return;
  }
  if (editingBudget.value) {
    await updateBudget(editingBudget.value.id, form.value);
  } else {
    await createBudget(form.value);
  }
  if (!loading.value) {
    showForm.value = false;
    $q.notify({ type: 'positive', message: editingBudget.value ? 'Modifié' : 'Créé' });
  }
}

// Duplicate
const showDuplicate    = ref(false);
const duplicateSource  = ref<Budget | null>(null);
const duplicateForm    = ref({ name: '', fiscal_year: currentYear + 1 });
function openDuplicate() { $q.notify({ type: 'info', message: 'Sélectionnez un budget à dupliquer dans la liste' }); }
function selectForDuplicate(b: Budget) {
  duplicateSource.value = b;
  duplicateForm.value = { name: `${b.name} (Copie)`, fiscal_year: b.fiscal_year + 1 };
  showDuplicate.value = true;
}
async function doDuplicate() {
  if (!duplicateSource.value || !duplicateForm.value.name) return;
  const result = await duplicateBudget(duplicateSource.value.id, duplicateForm.value.name, duplicateForm.value.fiscal_year);
  if (result) {
    showDuplicate.value = false;
    $q.notify({ type: 'positive', message: 'Budget dupliqué' });
  }
}

// Delete
function confirmDelete(b: Budget) {
  $q.dialog({ title: 'Confirmer', message: `Supprimer "${b.name}" ?`, cancel: true, ok: { color: 'negative' } })
    .onOk(async () => {
      await deleteBudget(b.id);
      $q.notify({ type: 'warning', message: 'Supprimé' });
    });
}

onMounted(() => loadBudgets());
</script>

<style scoped>
</style>
