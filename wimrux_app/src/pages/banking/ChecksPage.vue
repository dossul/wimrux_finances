<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Gestion des chèques</div>
        <div class="text-caption text-grey-7">Chèques émis et reçus</div>
      </div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nouveau chèque" @click="openCreate" />
    </div>

    <!-- Alerte échéances proches -->
    <q-banner v-if="stats.upcomingDue.length > 0" class="bg-orange-1 text-orange-9 q-mb-md rounded-borders" dense>
      <template #avatar><q-icon name="warning" color="orange" /></template>
      <strong>{{ stats.upcomingDue.length }} chèque(s)</strong> arrivent à échéance dans les 7 prochains jours.
      <template #action>
        <q-btn flat label="Voir" dense @click="filterStatus = 'in_circulation'" />
      </template>
    </q-banner>

    <!-- KPI cards -->
    <div class="row q-gutter-md q-mb-md">
      <q-card flat bordered class="kpi-card">
        <q-card-section class="text-center q-pa-sm">
          <div class="text-h6 text-weight-bold text-orange">{{ stats.totalInCirculation }}</div>
          <div class="text-caption text-grey-7">En circulation</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="text-center q-pa-sm">
          <div class="text-h6 text-weight-bold text-primary">{{ fmtAmount(stats.amountInCirculation) }}</div>
          <div class="text-caption text-grey-7">Montant total</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="text-center q-pa-sm">
          <div class="text-h6 text-weight-bold text-blue">{{ stats.totalEmitted }}</div>
          <div class="text-caption text-grey-7">Émis</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="text-center q-pa-sm">
          <div class="text-h6 text-weight-bold text-teal">{{ stats.totalReceived }}</div>
          <div class="text-caption text-grey-7">Reçus</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Filtres -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-gutter-sm items-end q-py-sm">
        <q-btn-toggle
          v-model="filterType"
          :options="[{label:'Tous',value:null},{label:'Émis',value:'emitted'},{label:'Reçus',value:'received'}]"
          unelevated dense no-caps color="primary" toggle-color="primary"
          class="q-mr-sm"
        />
        <q-select v-model="filterStatus" :options="statusOptions" label="Statut"
          emit-value map-options clearable dense outlined style="min-width:150px" />
        <q-select v-model="filterAccount" :options="accountOptions" label="Compte"
          emit-value map-options clearable dense outlined style="min-width:200px" />
        <q-input v-model="filterDateFrom" label="Du" type="date" dense outlined style="min-width:130px" />
        <q-input v-model="filterDateTo"   label="Au" type="date" dense outlined style="min-width:130px" />
        <q-btn flat icon="filter_alt" color="primary" @click="applyFilters" />
        <q-btn flat icon="clear"      color="grey"    @click="resetFilters" />
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card flat bordered>
      <q-table
        :rows="checks"
        :columns="columns"
        row-key="id"
        :loading="loading"
        :pagination="{ rowsPerPage: 15 }"
        flat
      >
        <!-- Type badge -->
        <template #body-cell-type="props">
          <q-td :props="props">
            <q-badge :color="props.value === 'emitted' ? 'blue' : 'teal'"
              :label="props.value === 'emitted' ? 'Émis' : 'Reçu'" />
          </q-td>
        </template>

        <!-- Statut badge -->
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.value)" :label="statusLabel(props.value)" />
          </q-td>
        </template>

        <!-- Montant -->
        <template #body-cell-amount="props">
          <q-td :props="props" class="text-right text-weight-medium">
            {{ fmtAmount(props.value) }} XOF
          </q-td>
        </template>

        <!-- Due date avec alerte -->
        <template #body-cell-due_date="props">
          <q-td :props="props">
            <span v-if="props.value">
              {{ props.value }}
              <q-badge v-if="isDueSoon(props.row)" color="negative" label="Urgent" class="q-ml-xs" />
            </span>
            <span v-else class="text-grey-5">—</span>
          </q-td>
        </template>

        <!-- Actions -->
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round dense size="sm" icon="check" color="positive"
              title="Encaissé" v-if="props.row.status === 'in_circulation'"
              @click.stop="confirmCash(props.row)" />
            <q-btn flat round dense size="sm" icon="undo" color="orange"
              title="Endossé" v-if="props.row.status === 'in_circulation'"
              @click.stop="doEndorse(props.row)" />
            <q-btn flat round dense size="sm" icon="block" color="negative"
              title="Impayé / Rejeté" v-if="props.row.status === 'in_circulation'"
              @click.stop="confirmBounce(props.row)" />
            <q-btn flat round dense size="sm" icon="edit" color="grey-7"
              title="Modifier" v-if="props.row.status === 'in_circulation'"
              @click.stop="openEdit(props.row)" />
            <q-btn flat round dense size="sm" icon="cancel" color="negative"
              title="Annuler" v-if="props.row.status === 'in_circulation'"
              @click.stop="confirmCancel(props.row)" />
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6">
            <q-icon name="check_box_outline_blank" size="48px" class="q-mb-sm" /><br>
            Aucun chèque trouvé
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog Créer / Modifier -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width:480px;max-width:560px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingCheck ? 'Modifier le chèque' : 'Nouveau chèque' }}</div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <div class="q-gutter-md">
            <q-btn-toggle
              v-model="form.type"
              :options="[{label:'Émis',value:'emitted'},{label:'Reçu',value:'received'}]"
              unelevated no-caps color="primary" toggle-color="primary"
            />
            <div class="row q-gutter-sm">
              <q-input v-model="form.check_number" label="N° chèque *" outlined dense class="col"
                :rules="[v => !!v || 'Requis']" />
              <q-input v-model.number="form.amount" label="Montant *" type="number" outlined dense class="col"
                :rules="[v => v > 0 || 'Montant > 0']" />
            </div>
            <q-input v-if="form.type === 'emitted'"
              v-model="form.beneficiary_name" label="Bénéficiaire *" outlined dense
              :rules="[v => !!v || 'Requis']" />
            <q-input v-if="form.type === 'received'"
              v-model="form.drawer_name" label="Tireur (émetteur) *" outlined dense
              :rules="[v => !!v || 'Requis']" />
            <div class="row q-gutter-sm">
              <q-input v-model="form.issue_date" label="Date d'émission *" type="date" outlined dense class="col"
                :rules="[v => !!v || 'Requis']" />
              <q-input v-model="form.due_date" label="Échéance" type="date" outlined dense class="col" />
            </div>
            <q-select v-model="form.bank_account_id" :options="accountOptions" label="Compte bancaire"
              emit-value map-options clearable outlined dense />
            <q-input v-model="form.notes" label="Notes" outlined dense type="textarea" rows="2" />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" :label="editingCheck ? 'Enregistrer' : 'Créer'" :loading="loading"
            @click="submitForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog date d'encaissement -->
    <q-dialog v-model="showCashDialog">
      <q-card style="min-width:320px">
        <q-card-section>
          <div class="text-h6">Date d'encaissement</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model="cashDate" type="date" outlined dense label="Date" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="positive" label="Confirmer" @click="doCash" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useChecks } from 'src/composables/useChecks';
import { useBankAccounts } from 'src/composables/useBankAccounts';
import type { Check, CheckType, CheckStatus } from 'src/types';

const $q = useQuasar();
const { checks, loading, error, stats, loadChecks, createCheck, updateCheck,
  markAsCashed, markAsBounced, markAsEndorsed, cancelCheck } = useChecks();
const { accounts, loadAccounts } = useBankAccounts();

// Filtres
const filterType     = ref<CheckType | null>(null);
const filterStatus   = ref<CheckStatus | null>(null);
const filterAccount  = ref<string | null>(null);
const filterDateFrom = ref('');
const filterDateTo   = ref('');

// Form
const showForm      = ref(false);
const editingCheck  = ref<Check | null>(null);
const emptyForm = () => ({
  type: 'emitted' as CheckType,
  check_number: '',
  bank_account_id: null as string | null,
  amount: 0,
  issue_date: new Date().toISOString().split('T')[0] ?? '',
  due_date: null as string | null,
  beneficiary_name: null as string | null,
  drawer_name: null as string | null,
  notes: null as string | null,
  invoice_id: null as string | null,
});
const form = ref(emptyForm());

// Cash dialog
const showCashDialog = ref(false);
const cashDate       = ref(new Date().toISOString().split('T')[0] ?? '');
const cashingId      = ref<string | null>(null);

const statusOptions = [
  { label: 'En circulation', value: 'in_circulation' },
  { label: 'Encaissé',       value: 'cashed' },
  { label: 'Impayé',         value: 'bounced' },
  { label: 'Endossé',        value: 'endorsed' },
  { label: 'Annulé',         value: 'cancelled' },
];

import { computed } from 'vue';
const accountOptions = computed(() =>
  accounts.value.map(a => ({ label: `${a.account_number} — ${a.bank_name}`, value: a.id }))
);

const columns = [
  { name: 'type',            label: 'Type',        field: 'type',            align: 'center' as const },
  { name: 'check_number',    label: 'N° Chèque',   field: 'check_number',    align: 'left'   as const, sortable: true },
  { name: 'beneficiary',     label: 'Bénéficiaire/Tireur', field: (r: Check) => r.beneficiary_name || r.drawer_name || '—', align: 'left' as const },
  { name: 'amount',          label: 'Montant',     field: 'amount',          align: 'right'  as const, sortable: true },
  { name: 'issue_date',      label: 'Émission',    field: 'issue_date',      align: 'center' as const, sortable: true },
  { name: 'due_date',        label: 'Échéance',    field: 'due_date',        align: 'center' as const, sortable: true },
  { name: 'status',          label: 'Statut',      field: 'status',          align: 'center' as const },
  { name: 'actions',         label: '',            field: 'id',              align: 'right'  as const },
];

function statusColor(s: CheckStatus): string {
  const m: Record<CheckStatus, string> = {
    in_circulation: 'orange', cashed: 'positive', bounced: 'negative',
    endorsed: 'blue', cancelled: 'grey-5',
  };
  return m[s] ?? 'grey';
}
function statusLabel(s: CheckStatus): string {
  const m: Record<CheckStatus, string> = {
    in_circulation: 'En circulation', cashed: 'Encaissé', bounced: 'Impayé',
    endorsed: 'Endossé', cancelled: 'Annulé',
  };
  return m[s] ?? s;
}
function fmtAmount(n: number): string {
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0 });
}
function isDueSoon(c: Check): boolean {
  if (!c.due_date || c.status !== 'in_circulation') return false;
  const today = new Date();
  const due   = new Date(c.due_date);
  const diff  = (due.getTime() - today.getTime()) / 86400000;
  return diff >= 0 && diff <= 7;
}

async function applyFilters() {
  const opts: Parameters<typeof loadChecks>[0] = {};
  if (filterType.value)    opts.type              = filterType.value;
  if (filterStatus.value)  opts.status            = filterStatus.value;
  if (filterAccount.value) opts.bank_account_id   = filterAccount.value;
  if (filterDateFrom.value) opts.date_from        = filterDateFrom.value;
  if (filterDateTo.value)   opts.date_to          = filterDateTo.value;
  await loadChecks(opts);
}
function resetFilters() {
  filterType.value = null; filterStatus.value = null;
  filterAccount.value = null; filterDateFrom.value = ''; filterDateTo.value = '';
  void applyFilters();
}

function openCreate() { editingCheck.value = null; form.value = emptyForm(); showForm.value = true; }
function openEdit(c: Check) {
  editingCheck.value = c;
  form.value = {
    type: c.type, check_number: c.check_number, bank_account_id: c.bank_account_id,
    amount: c.amount, issue_date: c.issue_date, due_date: c.due_date,
    beneficiary_name: c.beneficiary_name, drawer_name: c.drawer_name,
    notes: c.notes, invoice_id: c.invoice_id,
  };
  showForm.value = true;
}
async function submitForm() {
  if (!form.value.check_number || form.value.amount <= 0 || !form.value.issue_date) {
    $q.notify({ type: 'negative', message: 'Veuillez remplir tous les champs obligatoires' });
    return;
  }
  if (editingCheck.value) {
    await updateCheck(editingCheck.value.id, form.value);
  } else {
    await createCheck(form.value as Parameters<typeof createCheck>[0]);
  }
  if (!error.value) {
    showForm.value = false;
    $q.notify({ type: 'positive', message: editingCheck.value ? 'Chèque modifié' : 'Chèque créé' });
  } else {
    $q.notify({ type: 'negative', message: error.value });
  }
}

function confirmCash(c: Check) {
  cashingId.value = c.id;
  cashDate.value  = new Date().toISOString().split('T')[0] ?? '';
  showCashDialog.value = true;
}
async function doCash() {
  if (!cashingId.value) return;
  await markAsCashed(cashingId.value, cashDate.value);
  showCashDialog.value = false;
  $q.notify({ type: 'positive', message: 'Chèque marqué encaissé' });
}
async function doEndorse(c: Check) {
  await markAsEndorsed(c.id);
  $q.notify({ type: 'info', message: 'Chèque endossé' });
}
function confirmBounce(c: Check) {
  $q.dialog({ title: 'Chèque impayé', message: `Marquer le chèque ${c.check_number} comme impayé/rejeté ?`, cancel: true, ok: { color: 'negative' } })
    .onOk(async () => { await markAsBounced(c.id); $q.notify({ type: 'warning', message: 'Chèque marqué impayé' }); });
}
function confirmCancel(c: Check) {
  $q.dialog({ title: 'Annuler le chèque', message: `Annuler définitivement le chèque ${c.check_number} ?`, cancel: true, ok: { color: 'negative' } })
    .onOk(async () => { await cancelCheck(c.id); });
}

onMounted(async () => {
  await Promise.all([loadAccounts(), applyFilters()]);
});
</script>

<style scoped>
.kpi-card { min-width: 130px; flex: 1; }
</style>
