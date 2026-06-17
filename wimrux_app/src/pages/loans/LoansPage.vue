<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Emprunts</div>
        <div class="text-caption text-grey-7">Suivi crédits · échéanciers · ratio endettement</div>
      </div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nouvel emprunt" no-caps @click="openCreate" />
    </div>

    <!-- KPI -->
    <div class="row q-gutter-md q-mb-lg">
      <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Emprunts actifs</div>
        <div class="text-h5 text-weight-bold text-primary">{{ stats.activeCount }}</div>
      </q-card-section></q-card>
      <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Capital initial</div>
        <div class="text-h6 text-weight-bold">{{ fmt(stats.totalPrincipal) }}</div>
      </q-card-section></q-card>
      <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Reste à devoir</div>
        <div class="text-h6 text-weight-bold text-orange">{{ fmt(stats.totalOutstanding) }}</div>
      </q-card-section></q-card>
      <q-card v-if="debtRatio && debtRatio.debt_to_revenue_pct != null" flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Ratio dette / CA 12m</div>
        <div class="text-h6 text-weight-bold" :class="ratioColor(debtRatio.debt_to_revenue_pct)">
          {{ debtRatio.debt_to_revenue_pct?.toFixed(1) }}%
        </div>
      </q-card-section></q-card>
    </div>

    <!-- Table -->
    <q-card flat bordered>
      <q-table :rows="loans" :columns="columns" row-key="id" :loading="loading" flat :pagination="{ rowsPerPage: 15 }">
        <template #body-cell-status="props">
          <q-td :props="props"><q-badge :color="statusColor(props.value)" :label="statusLabel(props.value)" /></q-td>
        </template>
        <template #body-cell-progress="props">
          <q-td :props="props">
            <q-linear-progress :value="(props.row.principal_amount - (props.row.outstanding_balance ?? 0)) / props.row.principal_amount"
              color="positive" style="height:10px; width:120px" rounded />
            <div class="text-caption text-grey-6">
              {{ Math.round((1 - (props.row.outstanding_balance ?? 0) / props.row.principal_amount) * 100) }}% remboursé
            </div>
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round dense size="sm" icon="event" color="primary" @click="viewSchedule(props.row)" title="Échéancier" />
            <q-btn flat round dense size="sm" icon="edit" color="grey-7" @click="openEdit(props.row)" />
            <q-btn flat round dense size="sm" icon="delete" color="negative" @click="confirmDelete(props.row)" />
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6"><q-icon name="account_balance" size="48px" /><br>Aucun emprunt</div>
        </template>
      </q-table>
    </q-card>

    <!-- Échéancier -->
    <q-dialog v-model="showSchedule" persistent>
      <q-card style="min-width:800px; max-width:95vw">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Échéancier — {{ selectedLoan?.reference }}</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-table :rows="schedule" :columns="scheduleColumns" row-key="id" flat dense :pagination="{ rowsPerPage: 24 }">
            <template #body-cell-paid="props">
              <q-td :props="props">
                <q-icon v-if="props.row.is_paid" name="check_circle" color="positive" size="20px" />
                <q-btn v-else flat round dense size="sm" icon="payments" color="primary" @click="payInstallment(props.row)" />
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Form -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width:540px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editing ? 'Modifier' : 'Nouvel emprunt' }}</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <div class="q-gutter-md">
            <div class="row q-gutter-sm">
              <q-input v-model="form.reference" label="Référence *" outlined dense class="col" />
              <q-input v-model="form.lender_name" label="Prêteur *" outlined dense class="col-7" />
            </div>
            <div class="row q-gutter-sm">
              <q-select v-model="form.lender_type" :options="lenderTypeOptions" label="Type prêteur" emit-value map-options outlined dense class="col" />
              <q-input v-model.number="form.principal_amount" label="Capital (XOF) *" type="number" outlined dense class="col" />
            </div>
            <div class="row q-gutter-sm">
              <q-input v-model.number="form.interest_rate" label="Taux annuel (%) *" type="number" step="0.01" outlined dense class="col" />
              <q-select v-model="form.rate_type" :options="[{label:'Fixe',value:'fixed'},{label:'Variable',value:'variable'}]"
                label="Type taux" emit-value map-options outlined dense class="col" />
              <q-input v-model.number="form.duration_months" label="Durée (mois) *" type="number" outlined dense class="col" />
            </div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.start_date" label="Date départ *" type="date" outlined dense class="col" />
              <q-input v-model="form.first_payment_date" label="1ère échéance *" type="date" outlined dense class="col" />
            </div>
            <div class="row q-gutter-sm">
              <q-select v-model="form.payment_frequency" :options="freqOptions" label="Fréquence" emit-value map-options outlined dense class="col" />
              <q-select v-model="form.amortization_method" :options="amorOptions" label="Méthode amort." emit-value map-options outlined dense class="col" />
            </div>
            <q-input v-model="form.notes" label="Notes" outlined dense type="textarea" rows="2" />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" :label="editing ? 'Enregistrer' : 'Créer'" :loading="loading" @click="submit" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useLoans } from 'src/composables/useLoans';
import type { Loan, LoanInput, LoanScheduleEntry } from 'src/types';

const $q = useQuasar();
const { loans, schedule, debtRatio, loading, stats, loadLoans, createLoan, updateLoan, deleteLoan, loadSchedule, markInstallmentPaid, loadDebtRatio } = useLoans();

const columns = [
  { name: 'reference', label: 'Référence', field: 'reference', align: 'left' as const },
  { name: 'lender_name', label: 'Prêteur', field: 'lender_name', align: 'left' as const },
  { name: 'principal_amount', label: 'Capital', field: 'principal_amount', align: 'right' as const, format: (v: number) => fmt(v) },
  { name: 'outstanding_balance', label: 'Reste dû', field: 'outstanding_balance', align: 'right' as const, format: (v: number) => fmt(v) },
  { name: 'interest_rate', label: 'Taux', field: 'interest_rate', align: 'center' as const, format: (v: number) => `${v}%` },
  { name: 'duration_months', label: 'Durée', field: 'duration_months', align: 'center' as const, format: (v: number) => `${v} mois` },
  { name: 'progress', label: 'Progression', field: 'principal_amount', align: 'center' as const },
  { name: 'status', label: 'Statut', field: 'status', align: 'center' as const },
  { name: 'actions', label: '', field: 'id', align: 'right' as const },
];
const scheduleColumns = [
  { name: 'installment_number', label: '#', field: 'installment_number', align: 'center' as const },
  { name: 'due_date', label: 'Échéance', field: 'due_date', align: 'center' as const },
  { name: 'principal', label: 'Capital', field: 'principal', align: 'right' as const, format: (v: number) => fmt(v) },
  { name: 'interest', label: 'Intérêts', field: 'interest', align: 'right' as const, format: (v: number) => fmt(v) },
  { name: 'total', label: 'Mensualité', field: 'total', align: 'right' as const, format: (v: number) => fmt(v) },
  { name: 'remaining_balance', label: 'CRD', field: 'remaining_balance', align: 'right' as const, format: (v: number) => fmt(v) },
  { name: 'paid', label: 'Payé', field: 'is_paid', align: 'center' as const },
];

const lenderTypeOptions = [
  { label: 'Banque', value: 'bank' }, { label: 'IMF', value: 'mfi' },
  { label: 'État', value: 'government' }, { label: 'Partenaire', value: 'partner' },
  { label: 'Particulier', value: 'individual' }, { label: 'Autre', value: 'other' },
];
const freqOptions = [
  { label: 'Mensuel', value: 'monthly' }, { label: 'Trimestriel', value: 'quarterly' },
  { label: 'Semestriel', value: 'semiannual' }, { label: 'Annuel', value: 'annual' },
];
const amorOptions = [
  { label: 'Annuité constante', value: 'constant_annuity' },
  { label: 'Capital constant', value: 'constant_principal' },
  { label: 'In fine (bullet)', value: 'bullet' },
];

function fmt(n: number): string { return Number(n).toLocaleString('fr-FR'); }
function statusColor(s: string): string {
  return { active: 'positive', paid_off: 'grey', draft: 'grey-6', defaulted: 'negative', restructured: 'orange' }[s] ?? 'grey';
}
function statusLabel(s: string): string {
  return { active: 'Actif', paid_off: 'Soldé', draft: 'Brouillon', defaulted: 'Défaut', restructured: 'Restructuré' }[s] ?? s;
}
function ratioColor(r: number): string {
  return r < 30 ? 'text-positive' : r < 60 ? 'text-warning' : 'text-negative';
}

// Form
const showForm = ref(false);
const editing  = ref<Loan | null>(null);
const today = new Date().toISOString().split('T')[0] as string;
const emptyForm = (): LoanInput => ({
  reference: '', lender_name: '', lender_type: 'bank',
  principal_amount: 0, currency: 'XOF',
  interest_rate: 5, rate_type: 'fixed', duration_months: 60,
  start_date: today, first_payment_date: today,
  payment_frequency: 'monthly', amortization_method: 'constant_annuity',
  notes: null,
});
const form = ref<LoanInput>(emptyForm());

function openCreate() { editing.value = null; form.value = emptyForm(); showForm.value = true; }
function openEdit(l: Loan) {
  editing.value = l;
  form.value = {
    reference: l.reference, lender_name: l.lender_name, lender_type: l.lender_type,
    principal_amount: l.principal_amount, currency: l.currency,
    interest_rate: l.interest_rate, rate_type: l.rate_type, duration_months: l.duration_months,
    start_date: l.start_date, first_payment_date: l.first_payment_date,
    payment_frequency: l.payment_frequency, amortization_method: l.amortization_method,
    notes: l.notes,
  };
  showForm.value = true;
}
async function submit() {
  if (!form.value.reference || !form.value.lender_name || !form.value.principal_amount) {
    $q.notify({ type: 'negative', message: 'Champs requis manquants' }); return;
  }
  if (editing.value) await updateLoan(editing.value.id, form.value as Partial<Loan>);
  else await createLoan(form.value);
  showForm.value = false;
  $q.notify({ type: 'positive', message: editing.value ? 'Modifié' : 'Créé · échéancier généré' });
}

const showSchedule = ref(false);
const selectedLoan = ref<Loan | null>(null);
async function viewSchedule(l: Loan) {
  selectedLoan.value = l;
  await loadSchedule(l.id);
  showSchedule.value = true;
}
async function payInstallment(row: LoanScheduleEntry) {
  await markInstallmentPaid(row.id, row.total);
  if (selectedLoan.value) await loadSchedule(selectedLoan.value.id);
  $q.notify({ type: 'positive', message: 'Échéance marquée payée' });
}

function confirmDelete(l: Loan) {
  $q.dialog({ title: 'Supprimer', message: `Supprimer "${l.reference}" ?`, cancel: true, ok: { color: 'negative' } })
    .onOk(async () => { await deleteLoan(l.id); $q.notify({ type: 'warning', message: 'Supprimé' }); });
}

onMounted(() => { void loadLoans(); void loadDebtRatio(); });
</script>

<style scoped>.kpi { min-width: 160px; }</style>
