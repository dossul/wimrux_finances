<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Ordres de virement</div>
        <div class="text-caption text-grey-7">Création, approbation et export SEPA XML</div>
      </div>
      <q-space />
      <q-btn
        v-if="selected.length > 0"
        outline color="primary" icon="download" label="Export SEPA XML"
        class="q-mr-sm"
        @click="exportSelected"
        data-testid="wire-transfer-export-sepa-btn"
      />
      <q-btn color="primary" icon="add" label="Nouveau virement" @click="openCreate" data-testid="wire-transfer-new-btn" />
    </div>

    <!-- Filtres -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-gutter-sm items-end q-py-sm">
        <q-select
          v-model="filterStatus"
          :options="statusOptions"
          label="Statut" emit-value map-options
          clearable dense outlined style="min-width:160px"
        />
        <q-select
          v-model="filterAccount"
          :options="accountOptions"
          label="Compte source" emit-value map-options
          clearable dense outlined style="min-width:200px"
        />
        <q-input v-model="filterDateFrom" label="Du" type="date" dense outlined style="min-width:140px" />
        <q-input v-model="filterDateTo"   label="Au" type="date" dense outlined style="min-width:140px" />
        <q-btn flat icon="filter_alt" color="primary" label="Filtrer" @click="applyFilters" />
        <q-btn flat icon="clear" color="grey" @click="resetFilters" />
      </q-card-section>
    </q-card>

    <!-- KPI cards -->
    <div class="row q-gutter-md q-mb-md">
      <q-card flat bordered class="kpi-card" v-for="k in kpis" :key="k.label">
        <q-card-section class="text-center q-pa-sm">
          <div :class="`text-h6 text-weight-bold text-${k.color}`">{{ k.value }}</div>
          <div class="text-caption text-grey-7">{{ k.label }}</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Table -->
    <q-card flat bordered data-testid="wire-transfers-table">
      <q-table
        :rows="transfers"
        :columns="columns"
        row-key="id"
        :loading="loading"
        selection="multiple"
        v-model:selected="selected"
        :pagination="{ rowsPerPage: 15 }"
        flat
      >
        <!-- Statut badge -->
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.value)" :label="statusLabel(props.value)" />
          </q-td>
        </template>

        <!-- Montant -->
        <template #body-cell-amount="props">
          <q-td :props="props" class="text-right">
            <span class="text-weight-medium">{{ fmtAmount(props.row.amount) }}</span>
            <span class="text-caption text-grey-6 q-ml-xs">{{ props.row.currency }}</span>
          </q-td>
        </template>

        <!-- Actions -->
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round dense size="sm" icon="print"
              title="Imprimer ordre"
              @click.stop="printOrder(props.row)" />

            <q-btn flat round dense size="sm" icon="check_circle" color="positive"
              title="Approuver"
              v-if="props.row.status === 'draft'"
              @click.stop="confirmApprove(props.row)" />

            <q-btn flat round dense size="sm" icon="send" color="primary"
              title="Marquer envoyé"
              v-if="props.row.status === 'approved'"
              @click.stop="confirmSent(props.row)" />

            <q-btn flat round dense size="sm" icon="task_alt" color="teal"
              title="Marquer exécuté"
              v-if="props.row.status === 'sent'"
              @click.stop="confirmExecuted(props.row)" />

            <q-btn flat round dense size="sm" icon="error" color="negative"
              title="Marquer échoué"
              v-if="props.row.status === 'sent'"
              @click.stop="confirmFailed(props.row)" />

            <q-btn flat round dense size="sm" icon="edit" color="grey-7"
              title="Modifier"
              v-if="props.row.status === 'draft'"
              @click.stop="openEdit(props.row)" />

            <q-btn flat round dense size="sm" icon="cancel" color="negative"
              title="Annuler"
              v-if="['draft','approved','sent'].includes(props.row.status)"
              @click.stop="confirmCancel(props.row)" />
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6">
            <q-icon name="swap_horiz" size="48px" class="q-mb-sm" /><br>
            Aucun virement trouvé
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog Créer / Modifier -->
    <q-dialog v-model="showForm" persistent data-testid="wire-transfer-dialog">
      <q-card style="min-width:520px; max-width:600px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingTransfer ? 'Modifier le virement' : 'Nouveau virement' }}</div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="q-gutter-md">
            <q-select
              v-model="form.source_bank_account_id"
              :options="accountOptions"
              label="Compte source *"
              emit-value map-options
              outlined dense
              :rules="[v => !!v || 'Requis']"
              data-testid="wire-transfer-source-account"
            />
            <q-input v-model="form.beneficiary_name" label="Nom du bénéficiaire *" outlined dense
              :rules="[v => !!v || 'Requis']" data-testid="wire-transfer-beneficiary" />
            <div class="row q-gutter-sm">
              <q-input v-model="form.beneficiary_iban" label="IBAN / Numéro compte" outlined dense class="col" data-testid="wire-transfer-iban" />
              <q-input v-model="form.beneficiary_bic"  label="BIC / SWIFT" outlined dense class="col-4" data-testid="wire-transfer-bic" />
            </div>
            <q-input v-model="form.beneficiary_bank" label="Banque bénéficiaire" outlined dense data-testid="wire-transfer-bank" />
            <div class="row q-gutter-sm">
              <q-input v-model.number="form.amount" label="Montant *" type="number" outlined dense class="col"
                :rules="[v => v > 0 || 'Montant > 0']" data-testid="wire-transfer-amount" />
              <q-select v-model="form.currency" :options="currencies" label="Devise" outlined dense class="col-4" data-testid="wire-transfer-currency" />
            </div>
            <q-input v-model="form.motif" label="Motif / Référence" outlined dense type="textarea" rows="2" data-testid="wire-transfer-motif" />
            <q-input v-model="form.scheduled_date" label="Date d'exécution prévue" type="date" outlined dense data-testid="wire-transfer-scheduled-date" />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" :label="editingTransfer ? 'Enregistrer' : 'Créer'" :loading="loading"
            @click="submitForm" data-testid="wire-transfer-save-btn" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useWireTransfers } from 'src/composables/useWireTransfers';
import { downloadSEPAXml, printWireTransferOrder } from 'src/composables/useWireTransferExport';
import { useBankAccounts } from 'src/composables/useBankAccounts';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import type { WireTransfer, WireTransferStatus } from 'src/types';

const $q           = useQuasar();
const companyStore = useCompanyStore();
const {
  transfers, loading, error,
  loadTransfers, createTransfer, updateTransfer,
  approveTransfer, markAsSent, markAsExecuted, markAsFailed, cancelTransfer,
  generateReference,
} = useWireTransfers();
const { accounts, loadAccounts } = useBankAccounts();

// --- Filtres ---
const filterStatus   = ref<WireTransferStatus | null>(null);
const filterAccount  = ref<string | null>(null);
const filterDateFrom = ref('');
const filterDateTo   = ref('');

// --- Sélection pour export ---
const selected = ref<WireTransfer[]>([]);

// --- Dialog ---
const showForm        = ref(false);
const editingTransfer = ref<WireTransfer | null>(null);
const emptyForm = () => ({
  reference: generateReference(),
  source_bank_account_id: '',
  beneficiary_name: '',
  beneficiary_iban: null as string | null,
  beneficiary_bic:  null as string | null,
  beneficiary_bank: null as string | null,
  amount: 0,
  currency: 'XOF',
  motif: null as string | null,
  scheduled_date: null as string | null,
  invoice_id: null as string | null,
  created_by: null as string | null,
});
const form = ref(emptyForm());

const currencies = ['XOF', 'XAF', 'GNF', 'GMD', 'GHS', 'NGN', 'EUR', 'USD'];

// --- Options ---
const accountOptions = computed(() =>
  accounts.value.map(a => ({ label: `${a.account_number} — ${a.bank_name}`, value: a.id }))
);
const statusOptions = [
  { label: 'Brouillon',  value: 'draft' },
  { label: 'Approuvé',   value: 'approved' },
  { label: 'Envoyé',     value: 'sent' },
  { label: 'Exécuté',    value: 'executed' },
  { label: 'Échoué',     value: 'failed' },
  { label: 'Annulé',     value: 'cancelled' },
];

// --- KPIs ---
const kpis = computed(() => {
  const all = transfers.value;
  const total = (s: WireTransferStatus) => all.filter(t => t.status === s).reduce((sum, t) => sum + Number(t.amount), 0);
  return [
    { label: 'Brouillons',      value: all.filter(t => t.status === 'draft').length,    color: 'grey-7' },
    { label: 'En attente appro',value: all.filter(t => t.status === 'approved').length, color: 'orange' },
    { label: 'Envoyés',         value: all.filter(t => t.status === 'sent').length,     color: 'blue' },
    { label: 'Exécutés (XOF)', value: fmtAmount(total('executed')),                     color: 'positive' },
  ];
});

// --- Colonnes ---
const columns = [
  { name: 'reference',        label: 'Référence',     field: 'reference',        align: 'left'  as const, sortable: true },
  { name: 'beneficiary_name', label: 'Bénéficiaire',  field: 'beneficiary_name', align: 'left'  as const, sortable: true },
  { name: 'beneficiary_bank', label: 'Banque',         field: 'beneficiary_bank', align: 'left'  as const },
  { name: 'amount',           label: 'Montant',        field: 'amount',           align: 'right' as const, sortable: true },
  { name: 'scheduled_date',   label: 'Date prévue',    field: 'scheduled_date',   align: 'center'as const, sortable: true },
  { name: 'status',           label: 'Statut',         field: 'status',           align: 'center'as const, sortable: true },
  { name: 'approved_by',      label: 'Approuvé par',   field: 'approved_by',      align: 'left'  as const },
  { name: 'actions',          label: '',               field: 'id',               align: 'right' as const },
];

// --- Helpers ---
function statusColor(s: WireTransferStatus): string {
  const m: Record<WireTransferStatus, string> = {
    draft: 'grey', approved: 'orange', sent: 'blue',
    executed: 'positive', failed: 'negative', cancelled: 'grey-4',
  };
  return m[s] ?? 'grey';
}
function statusLabel(s: WireTransferStatus): string {
  const m: Record<WireTransferStatus, string> = {
    draft: 'Brouillon', approved: 'Approuvé', sent: 'Envoyé',
    executed: 'Exécuté', failed: 'Échoué', cancelled: 'Annulé',
  };
  return m[s] ?? s;
}
function fmtAmount(n: number | string): string {
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0 });
}

// --- Chargement ---
async function applyFilters() {
  const opts: Parameters<typeof loadTransfers>[0] = {};
  if (filterStatus.value)   opts.status = filterStatus.value;
  if (filterAccount.value)  opts.source_bank_account_id = filterAccount.value;
  if (filterDateFrom.value) opts.date_from = filterDateFrom.value;
  if (filterDateTo.value)   opts.date_to   = filterDateTo.value;
  await loadTransfers(opts);
}
function resetFilters() {
  filterStatus.value = null;
  filterAccount.value = null;
  filterDateFrom.value = '';
  filterDateTo.value = '';
  void applyFilters();
}

// --- Formulaire ---
function openCreate() {
  editingTransfer.value = null;
  form.value = emptyForm();
  showForm.value = true;
}
function openEdit(t: WireTransfer) {
  editingTransfer.value = t;
  form.value = {
    reference: t.reference,
    source_bank_account_id: t.source_bank_account_id,
    beneficiary_name: t.beneficiary_name,
    beneficiary_iban: t.beneficiary_iban,
    beneficiary_bic:  t.beneficiary_bic,
    beneficiary_bank: t.beneficiary_bank,
    amount: t.amount,
    currency: t.currency,
    motif: t.motif,
    scheduled_date: t.scheduled_date,
    invoice_id: t.invoice_id,
    created_by: t.created_by,
  };
  showForm.value = true;
}
async function submitForm() {
  if (!form.value.source_bank_account_id || !form.value.beneficiary_name || form.value.amount <= 0) {
    $q.notify({ type: 'negative', message: 'Veuillez remplir tous les champs obligatoires' });
    return;
  }
  if (editingTransfer.value) {
    await updateTransfer(editingTransfer.value.id, form.value);
  } else {
    await createTransfer(form.value);
  }
  if (!error.value) {
    showForm.value = false;
    $q.notify({ type: 'positive', message: editingTransfer.value ? 'Virement modifié' : 'Virement créé' });
  } else {
    $q.notify({ type: 'negative', message: error.value });
  }
}

// --- Actions workflow ---
function confirmApprove(t: WireTransfer) {
  $q.dialog({ title: 'Approuver', message: `Approuver le virement ${t.reference} (${fmtAmount(t.amount)} ${t.currency}) ?`, cancel: true })
    .onOk(async () => {
      await approveTransfer(t.id, companyStore.company?.name ?? 'Admin');
      $q.notify({ type: 'positive', message: 'Virement approuvé' });
    });
}
function confirmSent(t: WireTransfer) {
  $q.dialog({ title: 'Marquer comme envoyé', message: `Confirmer l'envoi du virement ${t.reference} ?`, cancel: true })
    .onOk(async () => { await markAsSent(t.id); });
}
function confirmExecuted(t: WireTransfer) {
  $q.dialog({ title: 'Marquer exécuté', message: `Confirmer l'exécution du virement ${t.reference} ?`, cancel: true })
    .onOk(async () => { await markAsExecuted(t.id); });
}
function confirmFailed(t: WireTransfer) {
  $q.dialog({ title: 'Marquer échoué', message: `Marquer le virement ${t.reference} comme échoué ?`, cancel: true, ok: { color: 'negative', label: 'Échoué' } })
    .onOk(async () => { await markAsFailed(t.id); });
}
function confirmCancel(t: WireTransfer) {
  $q.dialog({ title: 'Annuler le virement', message: `Annuler définitivement ${t.reference} ?`, cancel: true, ok: { color: 'negative', label: 'Annuler le virement' } })
    .onOk(async () => { await cancelTransfer(t.id); });
}

// --- Export SEPA ---
function exportSelected() {
  if (!companyStore.company) return;
  const approved = selected.value.filter(t => ['approved', 'sent'].includes(t.status));
  if (approved.length === 0) {
    $q.notify({ type: 'warning', message: 'Sélectionnez des virements approuvés ou envoyés pour l\'export SEPA' });
    return;
  }
  downloadSEPAXml(approved, companyStore.company);
  $q.notify({ type: 'positive', message: `SEPA XML généré (${approved.length} virement(s))` });
}

// --- Impression ordre ---
function printOrder(t: WireTransfer) {
  if (!companyStore.company) return;
  printWireTransferOrder(t, companyStore.company);
}

onMounted(async () => {
  await Promise.all([loadAccounts(), applyFilters()]);
});
</script>

<style scoped>
.kpi-card { min-width: 150px; flex: 1; }
</style>
