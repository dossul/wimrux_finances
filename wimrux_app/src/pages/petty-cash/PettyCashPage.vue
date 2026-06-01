<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Petite caisse</div>
        <div class="text-caption text-grey-7">Caisses physiques · mouvements · demandes d'approvisionnement</div>
      </div>
      <q-space />
      <q-btn color="secondary" outline icon="request_quote" label="Demandes d'appro" no-caps @click="showRequests = true" class="q-mr-sm" />
      <q-btn color="primary" icon="add" label="Nouvelle caisse" no-caps @click="openCreate" />
    </div>

    <!-- KPIs -->
    <div class="row q-gutter-md q-mb-lg">
      <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Caisses actives</div>
        <div class="text-h5 text-weight-bold text-primary">{{ activeCount }}</div>
      </q-card-section></q-card>
      <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Solde total</div>
        <div class="text-h6 text-weight-bold text-positive">{{ fmt(totalBalance) }}</div>
      </q-card-section></q-card>
      <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Demandes en cours</div>
        <div class="text-h5 text-weight-bold text-orange">{{ pendingRequestCount }}</div>
      </q-card-section></q-card>
    </div>

    <!-- Tableau caisses -->
    <q-card flat bordered>
      <q-table :rows="summaries" :columns="columns" row-key="id" :loading="loading" flat :pagination="{ rowsPerPage: 15 }">
        <template #body-cell-balance="props">
          <q-td :props="props">
            <div class="text-weight-bold" :class="balanceColor(props.row)">{{ fmt(props.value) }}</div>
            <q-linear-progress v-if="props.row.ceiling_amount"
              :value="Math.min(props.value / props.row.ceiling_amount, 1)"
              :color="props.value / props.row.ceiling_amount > 0.8 ? 'positive' : 'warning'"
              style="height:6px; width:120px" rounded />
            <div v-if="props.row.ceiling_amount" class="text-caption text-grey-6">
              Plafond : {{ fmt(props.row.ceiling_amount) }}
            </div>
          </q-td>
        </template>
        <template #body-cell-active="props">
          <q-td :props="props">
            <q-badge :color="props.value ? 'positive' : 'grey'" :label="props.value ? 'Active' : 'Inactive'" />
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round dense size="sm" icon="receipt_long" color="primary" @click="viewMovements(props.row)" title="Mouvements" />
            <q-btn flat round dense size="sm" icon="add_card" color="secondary" @click="openMovement(props.row, 'in')" title="Entrée" />
            <q-btn flat round dense size="sm" icon="money_off" color="orange" @click="openMovement(props.row, 'out')" title="Sortie" />
            <q-btn flat round dense size="sm" icon="local_atm" color="indigo" @click="openReplenish(props.row)" title="Demander appro" />
            <q-btn flat round dense size="sm" icon="edit" color="grey-7" @click="openEdit(props.row)" />
            <q-btn flat round dense size="sm" icon="delete" color="negative" @click="confirmDelete(props.row)" />
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6">
            <q-icon name="savings" size="48px" /><br>Aucune caisse créée
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog: Créer/éditer caisse -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width:480px">
        <q-card-section><div class="text-h6">{{ editingId ? 'Modifier' : 'Nouvelle' }} caisse</div></q-card-section>
        <q-card-section>
          <q-input v-model="form.name" label="Nom de la caisse *" outlined dense class="q-mb-sm" />
          <q-input v-model="form.manager_user_id" label="Gestionnaire (user id)" outlined dense class="q-mb-sm" />
          <q-input v-model.number="form.ceiling_amount" type="number" label="Plafond (FCFA)" outlined dense class="q-mb-sm" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" :label="editingId ? 'Mettre à jour' : 'Créer'" @click="submitForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Mouvement -->
    <q-dialog v-model="showMovementDlg" persistent>
      <q-card style="min-width:480px">
        <q-card-section>
          <div class="text-h6">{{ movementForm.direction === 'in' ? 'Entrée' : 'Sortie' }} — {{ selectedAccount?.name }}</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model.number="movementForm.amount" type="number" label="Montant (FCFA) *" outlined dense class="q-mb-sm" />
          <q-input v-model="movementForm.label" label="Libellé *" outlined dense class="q-mb-sm" />
          <q-input v-model="movementForm.movement_date" type="date" label="Date *" outlined dense class="q-mb-sm" />
          <q-input v-model="movementForm.supporting_doc_url" label="URL pièce justificative" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" label="Enregistrer" @click="submitMovement" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Mouvements de la caisse -->
    <q-dialog v-model="showMovementsList" persistent>
      <q-card style="min-width:800px; max-width:95vw">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Mouvements — {{ selectedAccount?.name }}</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-table :rows="movements" :columns="movementColumns" row-key="id" flat dense :pagination="{ rowsPerPage: 20 }">
            <template #body-cell-direction="props">
              <q-td :props="props">
                <q-badge :color="props.value === 'in' ? 'positive' : 'negative'" :label="props.value === 'in' ? 'Entrée' : 'Sortie'" />
              </q-td>
            </template>
            <template #body-cell-actions="props">
              <q-td :props="props" class="text-right">
                <q-btn flat round dense size="sm" icon="delete" color="negative" @click="confirmDeleteMvt(props.row)" />
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- Dialog: Demande d'appro -->
    <q-dialog v-model="showReplenishDlg" persistent>
      <q-card style="min-width:480px">
        <q-card-section><div class="text-h6">Demande d'approvisionnement — {{ selectedAccount?.name }}</div></q-card-section>
        <q-card-section>
          <q-input v-model.number="replenishForm.amount" type="number" label="Montant (FCFA) *" outlined dense class="q-mb-sm" />
          <q-input v-model="replenishForm.reason" type="textarea" rows="3" label="Motif *" outlined dense class="q-mb-sm" />
          <q-select v-model.number="replenishForm.required_levels" :options="[1,2,3]" label="Niveaux d'approbation requis" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" label="Soumettre" @click="submitReplenish" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Liste demandes d'appro -->
    <q-dialog v-model="showRequests">
      <q-card style="min-width:900px; max-width:95vw">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Demandes d'approvisionnement</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-table :rows="requests" :columns="requestColumns" row-key="id" flat dense :pagination="{ rowsPerPage: 15 }">
            <template #body-cell-status="props">
              <q-td :props="props">
                <q-badge :color="requestStatusColor(props.value)" :label="requestStatusLabel(props.value)" />
              </q-td>
            </template>
            <template #body-cell-level="props">
              <q-td :props="props">N{{ props.row.current_level }} / {{ props.row.required_levels }}</q-td>
            </template>
            <template #body-cell-actions="props">
              <q-td :props="props" class="text-right">
                <q-btn v-if="canApprove(props.row)" flat round dense size="sm" icon="check_circle" color="positive"
                  @click="approveRequest(props.row)" title="Approuver" />
                <q-btn v-if="canApprove(props.row)" flat round dense size="sm" icon="cancel" color="negative"
                  @click="rejectRequest(props.row)" title="Rejeter" />
                <q-btn v-if="props.row.status === 'approved_final'" flat round dense size="sm" icon="payments" color="primary"
                  @click="disburseRequest(props.row)" title="Décaisser" />
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useQuasar } from 'quasar';
import { usePettyCash } from 'src/composables/usePettyCash';
import type { PettyCashSummary, PettyCashMovement, ReplenishmentRequest } from 'src/types';

const $q = useQuasar();
const {
  summaries, movements, requests,
  loading, totalBalance, pendingRequestCount,
  loadSummaries, createAccount, updateAccount, deleteAccount,
  loadMovements, addMovement, deleteMovement,
  loadRequests, createRequest,
  approve, reject, disburse,
} = usePettyCash();

const activeCount = computed(() => summaries.value.filter(s => s.is_active).length);

const columns = [
  { name: 'name', label: 'Caisse', field: 'name', align: 'left' as const, sortable: true },
  { name: 'balance', label: 'Solde', field: 'current_balance', align: 'left' as const },
  { name: 'movement_count', label: 'Mouvements', field: 'movement_count', align: 'center' as const },
  { name: 'last_movement_date', label: 'Dernier mvt', field: (r: PettyCashSummary) => r.last_movement_date || '—', align: 'left' as const },
  { name: 'active', label: 'État', field: 'is_active', align: 'center' as const },
  { name: 'actions', label: '', field: '', align: 'right' as const },
];

const movementColumns = [
  { name: 'movement_date', label: 'Date', field: 'movement_date', align: 'left' as const, sortable: true },
  { name: 'direction', label: 'Sens', field: 'direction', align: 'center' as const },
  { name: 'amount', label: 'Montant', field: (r: PettyCashMovement) => fmt(r.amount), align: 'right' as const },
  { name: 'label', label: 'Libellé', field: 'label', align: 'left' as const },
  { name: 'actions', label: '', field: '', align: 'right' as const },
];

const requestColumns = [
  { name: 'requested_at', label: 'Date', field: (r: ReplenishmentRequest) => r.requested_at?.slice(0, 10), align: 'left' as const },
  { name: 'amount', label: 'Montant', field: (r: ReplenishmentRequest) => fmt(r.amount), align: 'right' as const },
  { name: 'reason', label: 'Motif', field: 'reason', align: 'left' as const },
  { name: 'level', label: 'Niveau', field: 'current_level', align: 'center' as const },
  { name: 'status', label: 'Statut', field: 'status', align: 'center' as const },
  { name: 'actions', label: '', field: '', align: 'right' as const },
];

// State
const showForm = ref(false);
const showMovementDlg = ref(false);
const showMovementsList = ref(false);
const showReplenishDlg = ref(false);
const showRequests = ref(false);
const editingId = ref<string | null>(null);
const selectedAccount = ref<PettyCashSummary | null>(null);

const form = reactive({ name: '', manager_user_id: '', ceiling_amount: null as number | null });
const movementForm = reactive({
  direction: 'in' as 'in' | 'out',
  amount: 0,
  label: '',
  movement_date: new Date().toISOString().slice(0, 10),
  supporting_doc_url: '',
});
const replenishForm = reactive({ amount: 0, reason: '', required_levels: 2 });

// --- Actions caisse ---
function openCreate() {
  editingId.value = null;
  form.name = '';
  form.manager_user_id = '';
  form.ceiling_amount = null;
  showForm.value = true;
}

function openEdit(row: PettyCashSummary) {
  editingId.value = row.id;
  form.name = row.name;
  form.manager_user_id = row.manager_user_id || '';
  form.ceiling_amount = row.ceiling_amount;
  showForm.value = true;
}

async function submitForm() {
  if (!form.name.trim()) { $q.notify({ type: 'warning', message: 'Nom requis' }); return; }
  const payload = {
    name: form.name.trim(),
    manager_user_id: form.manager_user_id.trim() || null,
    ceiling_amount: form.ceiling_amount || null,
  };
  const result = editingId.value
    ? await updateAccount(editingId.value, payload)
    : await createAccount(payload);
  if (result) {
    $q.notify({ type: 'positive', message: editingId.value ? 'Caisse mise à jour' : 'Caisse créée' });
    showForm.value = false;
  } else {
    $q.notify({ type: 'negative', message: 'Erreur enregistrement' });
  }
}

function confirmDelete(row: PettyCashSummary) {
  $q.dialog({
    title: 'Supprimer la caisse ?',
    message: `Caisse "${row.name}" et tous ses mouvements ?`,
    cancel: true, persistent: true,
  }).onOk(async () => {
    const ok = await deleteAccount(row.id);
    $q.notify({ type: ok ? 'positive' : 'negative', message: ok ? 'Supprimée' : 'Erreur' });
  });
}

// --- Mouvements ---
async function viewMovements(row: PettyCashSummary) {
  selectedAccount.value = row;
  await loadMovements(row.id);
  showMovementsList.value = true;
}

function openMovement(row: PettyCashSummary, direction: 'in' | 'out') {
  selectedAccount.value = row;
  movementForm.direction = direction;
  movementForm.amount = 0;
  movementForm.label = '';
  movementForm.movement_date = new Date().toISOString().slice(0, 10);
  movementForm.supporting_doc_url = '';
  showMovementDlg.value = true;
}

async function submitMovement() {
  if (!selectedAccount.value || !movementForm.amount || !movementForm.label.trim()) {
    $q.notify({ type: 'warning', message: 'Montant et libellé requis' }); return;
  }
  const result = await addMovement({
    petty_cash_id: selectedAccount.value.id,
    direction: movementForm.direction,
    amount: movementForm.amount,
    label: movementForm.label.trim(),
    movement_date: movementForm.movement_date,
    supporting_doc_url: movementForm.supporting_doc_url.trim() || null,
  });
  if (result) {
    $q.notify({ type: 'positive', message: 'Mouvement enregistré' });
    showMovementDlg.value = false;
  } else {
    $q.notify({ type: 'negative', message: 'Erreur enregistrement' });
  }
}

function confirmDeleteMvt(mvt: PettyCashMovement) {
  $q.dialog({
    title: 'Supprimer ce mouvement ?',
    message: `${mvt.direction === 'in' ? 'Entrée' : 'Sortie'} de ${fmt(mvt.amount)} le ${mvt.movement_date}`,
    cancel: true, persistent: true,
  }).onOk(async () => {
    const ok = await deleteMovement(mvt);
    $q.notify({ type: ok ? 'positive' : 'negative', message: ok ? 'Supprimé' : 'Erreur' });
  });
}

// --- Demandes d'appro ---
function openReplenish(row: PettyCashSummary) {
  selectedAccount.value = row;
  replenishForm.amount = 0;
  replenishForm.reason = '';
  replenishForm.required_levels = 2;
  showReplenishDlg.value = true;
}

async function submitReplenish() {
  if (!selectedAccount.value || !replenishForm.amount || !replenishForm.reason.trim()) {
    $q.notify({ type: 'warning', message: 'Montant et motif requis' }); return;
  }
  const result = await createRequest({
    target_type: 'petty_cash',
    target_id: selectedAccount.value.id,
    amount: replenishForm.amount,
    reason: replenishForm.reason.trim(),
    required_levels: replenishForm.required_levels,
  });
  if (result) {
    $q.notify({ type: 'positive', message: 'Demande soumise' });
    showReplenishDlg.value = false;
  } else {
    $q.notify({ type: 'negative', message: 'Erreur' });
  }
}

function canApprove(req: ReplenishmentRequest): boolean {
  return req.status === 'pending' || req.status.startsWith('approved_l');
}

async function approveRequest(req: ReplenishmentRequest) {
  $q.dialog({ title: 'Approuver', message: `Approuver niveau ${req.current_level} ?`, cancel: true, prompt: { model: '', label: 'Commentaire (optionnel)' } })
    .onOk(async (comment: string) => {
      const ok = await approve(req.id, req.current_level, comment);
      $q.notify({ type: ok ? 'positive' : 'negative', message: ok ? 'Approuvé' : 'Erreur' });
    });
}

async function rejectRequest(req: ReplenishmentRequest) {
  $q.dialog({ title: 'Rejeter', message: 'Motif du rejet ?', cancel: true, prompt: { model: '', label: 'Motif' } })
    .onOk(async (comment: string) => {
      const ok = await reject(req.id, req.current_level, comment);
      $q.notify({ type: ok ? 'positive' : 'negative', message: ok ? 'Rejeté' : 'Erreur' });
    });
}

async function disburseRequest(req: ReplenishmentRequest) {
  if (req.target_type !== 'petty_cash') return;
  const ok = await disburse(req.id, req.target_id, req.amount);
  $q.notify({ type: ok ? 'positive' : 'negative', message: ok ? 'Décaissé' : 'Erreur' });
}

// --- Helpers ---
function fmt(v: number): string {
  return new Intl.NumberFormat('fr-FR').format(v || 0) + ' FCFA';
}

function balanceColor(row: PettyCashSummary): string {
  if (!row.ceiling_amount) return 'text-positive';
  const ratio = row.current_balance / row.ceiling_amount;
  if (ratio < 0.2) return 'text-negative';
  if (ratio < 0.5) return 'text-warning';
  return 'text-positive';
}

function requestStatusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'orange',
    approved_l1: 'blue',
    approved_l2: 'indigo',
    approved_final: 'positive',
    disbursed: 'green-9',
    rejected: 'negative',
    cancelled: 'grey',
  };
  return map[status] || 'grey';
}

function requestStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'En attente',
    approved_l1: 'Approuvé N1',
    approved_l2: 'Approuvé N2',
    approved_final: 'Approuvé final',
    disbursed: 'Décaissé',
    rejected: 'Rejeté',
    cancelled: 'Annulé',
  };
  return map[status] || status;
}

onMounted(async () => {
  await loadSummaries();
  await loadRequests();
});
</script>

<style scoped>
.kpi { min-width: 160px; }
</style>
