<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <q-btn flat icon="arrow_back" dense to="/app/wallets" class="q-mr-sm" />
      <div>
        <div class="text-h5 text-weight-bold">{{ walletName }}</div>
        <div class="text-caption text-grey-7">Historique des transactions</div>
      </div>
      <q-space />
      <q-btn color="primary" icon="add" label="Saisir transaction" no-caps @click="openCreate" />
      <q-btn flat icon="compare_arrows" label="Rapprochement" no-caps :to="{ name: 'wallet-reconciliation' }" />
      <q-btn flat icon="upload_file" label="Importer" no-caps @click="showIngest = !showIngest" />
    </div>

    <!-- Zone ingestion IA -->
    <q-slide-transition>
      <div v-if="showIngest" class="q-mb-md">
        <PaymentEvidencePasteZone
          :wallets="[{ id: walletId, label: walletName }]"
          :fixed-wallet-id="walletId"
          @ingested="onIngested"
        />
      </div>
    </q-slide-transition>

    <!-- Filtres -->
    <div class="row q-col-gutter-sm q-mb-md items-center">
      <div class="col-12 col-sm-auto">
        <q-select v-model="filterDir" :options="dirOptions" label="Sens" outlined dense clearable style="min-width:130px" />
      </div>
      <div class="col-12 col-sm-auto">
        <q-select v-model="filterRecon" :options="reconOptions" label="Rapprochement" outlined dense clearable style="min-width:160px" />
      </div>
      <div class="col">
        <q-input v-model="filterSearch" placeholder="Rechercher libellé / contrepartie…" outlined dense clearable>
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>
    </div>

    <!-- KPI -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-6 col-md-3">
        <q-card flat bordered>
          <q-card-section class="q-pa-md">
            <div class="text-caption text-grey-7">Entrées</div>
            <div class="text-subtitle1 text-weight-bold text-positive">{{ fmtAmount(totalCredits) }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered>
          <q-card-section class="q-pa-md">
            <div class="text-caption text-grey-7">Sorties</div>
            <div class="text-subtitle1 text-weight-bold text-negative">{{ fmtAmount(totalDebits) }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered>
          <q-card-section class="q-pa-md">
            <div class="text-caption text-grey-7">Net</div>
            <div class="text-subtitle1 text-weight-bold" :class="net >= 0 ? 'text-primary' : 'text-negative'">{{ fmtAmount(net) }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered>
          <q-card-section class="q-pa-md">
            <div class="text-caption text-grey-7">Transactions</div>
            <div class="text-subtitle1 text-weight-bold">{{ filtered.length }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Tableau -->
    <q-card flat bordered>
      <q-table
        :rows="filtered"
        :columns="columns"
        row-key="id"
        :loading="loading"
        flat
        dense
        :rows-per-page-options="[25, 50, 100]"
      >
        <template #body-cell-direction="props">
          <q-td :props="props">
            <q-badge :color="props.row.direction === 'credit' ? 'positive' : 'negative'"
              :label="props.row.direction === 'credit' ? 'Entrée' : 'Sortie'" />
          </q-td>
        </template>
        <template #body-cell-amount="props">
          <q-td :props="props" class="text-right">
            <span :class="props.row.direction === 'credit' ? 'text-positive' : 'text-negative'" class="text-weight-medium">
              {{ props.row.direction === 'credit' ? '+' : '-' }}{{ fmtAmount(props.row.amount) }}
            </span>
            <span class="text-caption text-grey-6 q-ml-xs">{{ props.row.currency }}</span>
          </q-td>
        </template>
        <template #body-cell-reconciliation_status="props">
          <q-td :props="props">
            <q-badge :color="reconColor(props.row.reconciliation_status)" :label="reconLabel(props.row.reconciliation_status)" />
          </q-td>
        </template>
        <template #body-cell-transaction_date="props">
          <q-td :props="props">{{ fmtDate(props.row.transaction_date) }}</q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog saisie -->
    <q-dialog v-model="showDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Nouvelle transaction</div>
          <q-space /><q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select v-model="txForm.direction" :options="[{label:'Entrée',value:'credit'},{label:'Sortie',value:'debit'}]"
            label="Sens *" emit-value map-options outlined dense />
          <q-select v-model="txForm.operation_type" :options="operationOptions" label="Type opération" emit-value map-options outlined dense />
          <q-input v-model.number="txForm.amount" label="Montant *" type="number" outlined dense />
          <q-input v-model.number="txForm.fees" label="Frais" type="number" outlined dense />
          <q-input v-model="txForm.currency" label="Devise" outlined dense />
          <q-input v-model="txForm.transaction_date" label="Date *" type="datetime-local" outlined dense />
          <q-input v-model="txForm.label" label="Libellé *" outlined dense />
          <q-input v-model="txForm.counterparty_name" label="Contrepartie" outlined dense />
          <q-input v-model="txForm.counterparty_identifier" label="N° / ID contrepartie" outlined dense />
          <q-select v-model="txForm.source_channel" :options="channelOptions" label="Canal source" emit-value map-options outlined dense />
          <q-input v-model="txForm.description" label="Description" outlined dense type="textarea" rows="2" />
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" label="Enregistrer" no-caps :loading="loading" @click="onSubmitTx" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { usePaymentWallets } from 'src/composables/usePaymentWallets';
import PaymentEvidencePasteZone from 'src/components/PaymentEvidencePasteZone.vue';
import type { WalletTransactionInput } from 'src/composables/usePaymentWallets';

const route  = useRoute();
const $q     = useQuasar();
const walletId = route.params.id as string;

const { wallets, transactions, loading, error, loadWallets, loadTransactions, createTransaction } = usePaymentWallets();

const walletName = computed(() => wallets.value.find(w => w.id === walletId)?.display_name ?? 'Wallet');

const filterDir    = ref<string | null>(null);
const filterRecon  = ref<string | null>(null);
const filterSearch = ref('');

const dirOptions = [
  { label: 'Entrées', value: 'credit' },
  { label: 'Sorties', value: 'debit' },
];
const reconOptions = [
  { label: 'Non rapproché', value: 'unreconciled' },
  { label: 'Rapproché', value: 'reconciled' },
  { label: 'Ignoré', value: 'ignored' },
];

const filtered = computed(() => transactions.value.filter(tx => {
  if (filterDir.value && tx.direction !== filterDir.value) return false;
  if (filterRecon.value && tx.reconciliation_status !== filterRecon.value) return false;
  const s = filterSearch.value.toLowerCase();
  if (s && !tx.label.toLowerCase().includes(s) && !(tx.counterparty_name ?? '').toLowerCase().includes(s)) return false;
  return true;
}));

const totalCredits = computed(() => filtered.value.filter(t => t.direction === 'credit').reduce((s, t) => s + t.amount, 0));
const totalDebits  = computed(() => filtered.value.filter(t => t.direction === 'debit').reduce((s, t) => s + t.amount, 0));
const net          = computed(() => totalCredits.value - totalDebits.value);

const columns = [
  { name: 'transaction_date', label: 'Date', field: 'transaction_date', sortable: true, align: 'left' as const },
  { name: 'direction', label: 'Sens', field: 'direction', align: 'center' as const },
  { name: 'operation_type', label: 'Type', field: 'operation_type', align: 'left' as const },
  { name: 'label', label: 'Libellé', field: 'label', align: 'left' as const },
  { name: 'counterparty_name', label: 'Contrepartie', field: 'counterparty_name', align: 'left' as const },
  { name: 'amount', label: 'Montant', field: 'amount', sortable: true, align: 'right' as const },
  { name: 'reconciliation_status', label: 'Statut', field: 'reconciliation_status', align: 'center' as const },
];

function fmtAmount(n: number): string { return Number(n).toLocaleString('fr-FR'); }
function fmtDate(d: string): string { return d ? new Date(d).toLocaleDateString('fr-FR') : ''; }
function reconColor(s: string): string { return s === 'reconciled' ? 'positive' : s === 'ignored' ? 'grey' : 'orange'; }
function reconLabel(s: string): string { return s === 'reconciled' ? 'Rapproché' : s === 'ignored' ? 'Ignoré' : 'En attente'; }

const operationOptions = [
  { label: 'Virement entrant', value: 'incoming_transfer' },
  { label: 'Virement sortant', value: 'outgoing_transfer' },
  { label: 'Paiement marchand', value: 'merchant_payment' },
  { label: 'Retrait', value: 'withdrawal' },
  { label: 'Dépôt', value: 'deposit' },
  { label: 'Frais', value: 'fee' },
  { label: 'Remboursement', value: 'refund' },
  { label: 'Autre', value: 'other' },
];
const channelOptions = [
  { label: 'Manuel', value: 'manual' },
  { label: 'SMS', value: 'sms' },
  { label: 'API', value: 'api' },
  { label: 'Import fichier', value: 'file_import' },
];

const showDialog = ref(false);
const showIngest = ref(false);

async function onIngested() {
  showIngest.value = false;
  await loadTransactions(walletId);
  $q.notify({ type: 'positive', message: 'Transaction(s) importée(s) avec succès' });
}
const emptyTxForm = (): WalletTransactionInput => ({
  wallet_id: walletId, direction: 'credit', operation_type: 'incoming_transfer',
  amount: 0, fees: 0, currency: 'XOF', counterparty_name: null, counterparty_identifier: null,
  transaction_date: new Date().toISOString().slice(0, 16),
  label: '', description: null, source_channel: 'manual',
});
const txForm = ref<WalletTransactionInput>(emptyTxForm());

function openCreate() { txForm.value = emptyTxForm(); showDialog.value = true; }

async function onSubmitTx() {
  if (!txForm.value.amount || !txForm.value.label) {
    $q.notify({ type: 'negative', message: 'Montant et libellé requis' }); return;
  }
  const tx = await createTransaction({ ...txForm.value, transaction_date: new Date(txForm.value.transaction_date).toISOString() });
  if (tx) { showDialog.value = false; $q.notify({ type: 'positive', message: 'Transaction enregistrée' }); }
  else $q.notify({ type: 'negative', message: error.value ?? 'Erreur' });
}

onMounted(async () => {
  await Promise.all([loadWallets(), loadTransactions(walletId)]);
});
</script>
