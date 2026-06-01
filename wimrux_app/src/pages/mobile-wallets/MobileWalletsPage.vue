<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Wallets mobiles</div>
        <div class="text-caption text-grey-7">Orange Money · Wave · MTN MoMo · Moov · Airtel</div>
      </div>
      <q-space />
      <q-btn color="secondary" outline icon="upload_file" label="Importer CSV" no-caps @click="openImport" class="q-mr-sm" />
      <q-btn color="primary" icon="add" label="Nouveau wallet" no-caps @click="openCreate" />
    </div>

    <div class="row q-gutter-md q-mb-lg">
      <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Wallets actifs</div>
        <div class="text-h5 text-weight-bold text-primary">{{ activeCount }}</div>
      </q-card-section></q-card>
      <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Solde total</div>
        <div class="text-h6 text-weight-bold text-positive">{{ fmt(totalBalance) }}</div>
      </q-card-section></q-card>
      <q-card v-for="(amount, prov) in balanceByProvider" :key="prov" flat bordered class="col-auto kpi">
        <q-card-section class="q-pa-md text-center">
          <div class="text-caption text-grey-6">{{ providerLabel(prov as MobileWalletProvider) }}</div>
          <div class="text-h6 text-weight-bold">{{ fmt(amount) }}</div>
        </q-card-section>
      </q-card>
    </div>

    <q-card flat bordered>
      <q-table :rows="summaries" :columns="columns" row-key="id" :loading="loading" flat :pagination="{ rowsPerPage: 15 }">
        <template #body-cell-provider="props">
          <q-td :props="props">
            <q-chip dense :color="providerColor(props.value)" text-color="white" :label="providerLabel(props.value)" />
          </q-td>
        </template>
        <template #body-cell-balance="props">
          <q-td :props="props"><div class="text-weight-bold text-positive">{{ fmt(props.value) }}</div></q-td>
        </template>
        <template #body-cell-active="props">
          <q-td :props="props">
            <q-toggle :model-value="props.value" @update:model-value="(v) => onToggleActive(props.row.id, v as boolean)" />
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round dense size="sm" icon="receipt_long" color="primary" @click="viewTransactions(props.row)" title="Transactions" />
            <q-btn flat round dense size="sm" icon="add_circle" color="positive" @click="openTx(props.row, 'deposit')" title="Depot" />
            <q-btn flat round dense size="sm" icon="remove_circle" color="negative" @click="openTx(props.row, 'withdrawal')" title="Retrait" />
            <q-btn flat round dense size="sm" icon="edit" color="grey-7" @click="openEdit(props.row)" />
            <q-btn flat round dense size="sm" icon="delete" color="negative" @click="confirmDelete(props.row)" />
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6"><q-icon name="smartphone" size="48px" /><br>Aucun wallet</div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width:480px">
        <q-card-section><div class="text-h6">{{ editingId ? 'Modifier' : 'Nouveau' }} wallet</div></q-card-section>
        <q-card-section>
          <q-select v-model="form.provider" :options="providerOptions" label="Operateur *" outlined dense emit-value map-options class="q-mb-sm" />
          <q-input v-model="form.phone_number" label="Numero *" outlined dense class="q-mb-sm" />
          <q-input v-model="form.account_name" label="Nom du compte" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" :label="editingId ? 'Mettre a jour' : 'Creer'" @click="submitForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showTxDlg" persistent>
      <q-card style="min-width:480px">
        <q-card-section><div class="text-h6">{{ txTypeLabel(txForm.type) }} - {{ selectedWallet?.account_name || selectedWallet?.phone_number }}</div></q-card-section>
        <q-card-section>
          <q-select v-model="txForm.type" :options="txTypeOptions" label="Type *" outlined dense emit-value map-options class="q-mb-sm" />
          <q-input v-model.number="txForm.amount" type="number" label="Montant *" outlined dense class="q-mb-sm" />
          <q-input v-model.number="txForm.fees" type="number" label="Frais" outlined dense class="q-mb-sm" />
          <q-input v-model="txForm.transaction_date" type="datetime-local" label="Date *" outlined dense class="q-mb-sm" />
          <q-input v-model="txForm.counterparty_phone" label="N contrepartie" outlined dense class="q-mb-sm" />
          <q-input v-model="txForm.counterparty_name" label="Nom contrepartie" outlined dense class="q-mb-sm" />
          <q-input v-model="txForm.external_transaction_id" label="ID externe" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" label="Enregistrer" @click="submitTx" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showTxList" persistent>
      <q-card style="min-width:900px; max-width:95vw">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Transactions - {{ selectedWallet?.account_name || selectedWallet?.phone_number }}</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-table :rows="transactions" :columns="txColumns" row-key="id" flat dense :pagination="{ rowsPerPage: 25 }">
            <template #body-cell-type="props">
              <q-td :props="props"><q-badge :color="txTypeColor(props.value)" :label="txTypeLabel(props.value)" /></q-td>
            </template>
            <template #body-cell-actions="props">
              <q-td :props="props" class="text-right">
                <q-btn flat round dense size="sm" icon="delete" color="negative" @click="confirmDeleteTx(props.row)" />
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showImportDlg" persistent>
      <q-card style="min-width:580px">
        <q-card-section><div class="text-h6">Importer releve CSV</div></q-card-section>
        <q-card-section>
          <q-select v-model="importForm.wallet_id" :options="walletOptions" label="Wallet *" outlined dense emit-value map-options class="q-mb-md" />
          <div class="text-caption text-grey-7 q-mb-sm">Format: <code>date,type,amount,fees,counterparty_phone,counterparty_name,external_id</code></div>
          <q-input v-model="importForm.csv" type="textarea" rows="10" label="Contenu CSV" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" label="Importer" @click="runImport" :loading="loading" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useQuasar } from 'quasar';
import { useMobileWallets } from 'src/composables/useMobileWallets';
import type {
  MobileWalletSummary, MobileWalletTransaction,
  MobileWalletProvider, MobileWalletTransactionType,
} from 'src/types';

const $q = useQuasar();
const {
  summaries, transactions,
  loading, totalBalance, balanceByProvider,
  loadSummaries, createWallet, updateWallet, deleteWallet, toggleActive,
  loadTransactions, addTransaction, deleteTransaction,
  importFromCsv, providerLabel,
} = useMobileWallets();

const activeCount = computed(() => summaries.value.filter(s => s.is_active).length);

const providerOptions = [
  { label: 'Orange Money', value: 'orange_money' },
  { label: 'Moov Money', value: 'moov_money' },
  { label: 'Wave', value: 'wave' },
  { label: 'MTN MoMo', value: 'mtn_momo' },
  { label: 'Airtel Money', value: 'airtel_money' },
  { label: 'Autre', value: 'other' },
];

const txTypeOptions = [
  { label: 'Depot', value: 'deposit' },
  { label: 'Retrait', value: 'withdrawal' },
  { label: 'Transfert entrant', value: 'transfer_in' },
  { label: 'Transfert sortant', value: 'transfer_out' },
  { label: 'Paiement', value: 'payment' },
  { label: 'Frais', value: 'fee' },
];

const columns = [
  { name: 'provider', label: 'Operateur', field: 'provider', align: 'left' as const, sortable: true },
  { name: 'phone_number', label: 'N', field: 'phone_number', align: 'left' as const },
  { name: 'account_name', label: 'Compte', field: 'account_name', align: 'left' as const },
  { name: 'balance', label: 'Solde', field: 'current_balance', align: 'right' as const },
  { name: 'transaction_count', label: 'Tx', field: 'transaction_count', align: 'center' as const },
  { name: 'last_transaction_date', label: 'Derniere tx', field: (r: MobileWalletSummary) => r.last_transaction_date?.slice(0, 10) || '-', align: 'left' as const },
  { name: 'active', label: 'Actif', field: 'is_active', align: 'center' as const },
  { name: 'actions', label: '', field: '', align: 'right' as const },
];

const txColumns = [
  { name: 'transaction_date', label: 'Date', field: (r: MobileWalletTransaction) => r.transaction_date?.slice(0, 16).replace('T', ' '), align: 'left' as const },
  { name: 'type', label: 'Type', field: 'type', align: 'center' as const },
  { name: 'amount', label: 'Montant', field: (r: MobileWalletTransaction) => fmt(r.amount), align: 'right' as const },
  { name: 'fees', label: 'Frais', field: (r: MobileWalletTransaction) => fmt(r.fees), align: 'right' as const },
  { name: 'counterparty', label: 'Contrepartie', field: (r: MobileWalletTransaction) => r.counterparty_name || r.counterparty_phone || '-', align: 'left' as const },
  { name: 'external_transaction_id', label: 'ID externe', field: 'external_transaction_id', align: 'left' as const },
  { name: 'actions', label: '', field: '', align: 'right' as const },
];

const walletOptions = computed(() =>
  summaries.value.map(s => ({
    label: `${providerLabel(s.provider)} - ${s.phone_number}`,
    value: s.id,
  }))
);

const showForm = ref(false);
const showTxDlg = ref(false);
const showTxList = ref(false);
const showImportDlg = ref(false);
const editingId = ref<string | null>(null);
const selectedWallet = ref<MobileWalletSummary | null>(null);

const form = reactive({
  provider: 'orange_money' as MobileWalletProvider,
  phone_number: '',
  account_name: '',
});

const txForm = reactive({
  type: 'deposit' as MobileWalletTransactionType,
  amount: 0,
  fees: 0,
  transaction_date: new Date().toISOString().slice(0, 16),
  counterparty_phone: '',
  counterparty_name: '',
  external_transaction_id: '',
});

const importForm = reactive({ wallet_id: '', csv: '' });

function openCreate() {
  editingId.value = null;
  form.provider = 'orange_money';
  form.phone_number = '';
  form.account_name = '';
  showForm.value = true;
}

function openEdit(row: MobileWalletSummary) {
  editingId.value = row.id;
  form.provider = row.provider;
  form.phone_number = row.phone_number;
  form.account_name = row.account_name || '';
  showForm.value = true;
}

async function submitForm() {
  if (!form.phone_number.trim()) { $q.notify({ type: 'warning', message: 'Numero requis' }); return; }
  const payload = {
    provider: form.provider,
    phone_number: form.phone_number.trim(),
    account_name: form.account_name.trim() || null,
  };
  const result = editingId.value
    ? await updateWallet(editingId.value, payload)
    : await createWallet(payload);
  if (result) {
    $q.notify({ type: 'positive', message: editingId.value ? 'Wallet mis a jour' : 'Wallet cree' });
    showForm.value = false;
  } else {
    $q.notify({ type: 'negative', message: 'Erreur' });
  }
}

function confirmDelete(row: MobileWalletSummary) {
  $q.dialog({
    title: 'Supprimer ce wallet ?',
    message: `${providerLabel(row.provider)} - ${row.phone_number} et toutes ses transactions ?`,
    cancel: true, persistent: true,
  }).onOk(async () => {
    const ok = await deleteWallet(row.id);
    $q.notify({ type: ok ? 'positive' : 'negative', message: ok ? 'Supprime' : 'Erreur' });
  });
}

async function onToggleActive(id: string, isActive: boolean) {
  const ok = await toggleActive(id, isActive);
  if (!ok) $q.notify({ type: 'negative', message: 'Erreur' });
}

async function viewTransactions(row: MobileWalletSummary) {
  selectedWallet.value = row;
  await loadTransactions(row.id);
  showTxList.value = true;
}

function openTx(row: MobileWalletSummary, type: MobileWalletTransactionType) {
  selectedWallet.value = row;
  txForm.type = type;
  txForm.amount = 0;
  txForm.fees = 0;
  txForm.transaction_date = new Date().toISOString().slice(0, 16);
  txForm.counterparty_phone = '';
  txForm.counterparty_name = '';
  txForm.external_transaction_id = '';
  showTxDlg.value = true;
}

async function submitTx() {
  if (!selectedWallet.value || !txForm.amount) {
    $q.notify({ type: 'warning', message: 'Montant requis' }); return;
  }
  const result = await addTransaction({
    wallet_id: selectedWallet.value.id,
    type: txForm.type,
    amount: txForm.amount,
    fees: txForm.fees || 0,
    transaction_date: new Date(txForm.transaction_date).toISOString(),
    counterparty_phone: txForm.counterparty_phone.trim() || null,
    counterparty_name: txForm.counterparty_name.trim() || null,
    external_transaction_id: txForm.external_transaction_id.trim() || null,
  });
  if (result) {
    $q.notify({ type: 'positive', message: 'Transaction enregistree' });
    showTxDlg.value = false;
  } else {
    $q.notify({ type: 'negative', message: 'Erreur' });
  }
}

function confirmDeleteTx(tx: MobileWalletTransaction) {
  $q.dialog({
    title: 'Supprimer cette transaction ?',
    message: `${txTypeLabel(tx.type)} de ${fmt(tx.amount)}`,
    cancel: true, persistent: true,
  }).onOk(async () => {
    const ok = await deleteTransaction(tx);
    $q.notify({ type: ok ? 'positive' : 'negative', message: ok ? 'Supprime' : 'Erreur' });
  });
}

function openImport() {
  importForm.wallet_id = '';
  importForm.csv = '';
  showImportDlg.value = true;
}

async function runImport() {
  if (!importForm.wallet_id || !importForm.csv.trim()) {
    $q.notify({ type: 'warning', message: 'Wallet et CSV requis' }); return;
  }
  const result = await importFromCsv(importForm.wallet_id, importForm.csv);
  $q.notify({
    type: result.inserted > 0 ? 'positive' : 'warning',
    message: `${result.inserted} importe(s), ${result.failed} echec(s)`,
  });
  if (result.inserted > 0) showImportDlg.value = false;
}

function fmt(v: number): string {
  return new Intl.NumberFormat('fr-FR').format(v || 0) + ' FCFA';
}

function providerColor(p: MobileWalletProvider): string {
  const map: Record<string, string> = {
    orange_money: 'orange',
    moov_money: 'blue',
    wave: 'cyan',
    mtn_momo: 'amber',
    airtel_money: 'red',
    other: 'grey',
  };
  return map[p] || 'grey';
}

function txTypeColor(t: MobileWalletTransactionType): string {
  const map: Record<string, string> = {
    deposit: 'positive',
    transfer_in: 'positive',
    withdrawal: 'negative',
    transfer_out: 'negative',
    payment: 'orange',
    fee: 'grey',
  };
  return map[t] || 'grey';
}

function txTypeLabel(t: MobileWalletTransactionType): string {
  const map: Record<string, string> = {
    deposit: 'Depot',
    withdrawal: 'Retrait',
    transfer_in: 'Transfert in',
    transfer_out: 'Transfert out',
    payment: 'Paiement',
    fee: 'Frais',
  };
  return map[t] || t;
}

onMounted(async () => {
  await loadSummaries();
});
</script>

<style scoped>
.kpi { min-width: 160px; }
</style>
