<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn flat round dense icon="arrow_back" class="q-mr-sm" to="/app/banking" />
      <div>
        <div class="text-h5">{{ account?.bank_name ?? 'Compte bancaire' }}</div>
        <div class="text-caption text-grey-7" v-if="account">{{ account.account_number }} · {{ account.currency }}</div>
      </div>
      <q-space />
      <div class="row q-gutter-sm">
        <q-btn outline color="deep-purple" icon="upload_file" label="Import relevé" no-caps :to="`/app/banking/${accountId}/import`" />
        <q-btn outline color="primary" icon="add" label="Saisie manuelle" no-caps @click="openAddDialog" />
        <q-btn outline color="teal" icon="sync" label="Rapprocher" no-caps :to="`/app/banking/${accountId}/reconciliation`" />
      </div>
    </div>

    <!-- KPI compte -->
    <div class="row q-gutter-md q-mb-md" v-if="account">
      <q-card flat bordered class="col-12 col-sm-3">
        <q-card-section>
          <div class="text-caption text-grey-7">Solde actuel</div>
          <div class="text-h5 text-weight-bold" :class="account.current_balance >= 0 ? 'text-green' : 'text-red'">
            {{ fmtCur(account.current_balance) }}
          </div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col-12 col-sm-3">
        <q-card-section>
          <div class="text-caption text-grey-7">Total crédits (filtre)</div>
          <div class="text-h6 text-green">+{{ fmtCur(totalCredit) }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col-12 col-sm-3">
        <q-card-section>
          <div class="text-caption text-grey-7">Total débits (filtre)</div>
          <div class="text-h6 text-red">-{{ fmtCur(totalDebit) }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col-12 col-sm-2">
        <q-card-section>
          <div class="text-caption text-grey-7">Non rapprochés</div>
          <div class="text-h6 text-amber-8">{{ unreconciledCount }}</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Filtres -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-gutter-sm items-end">
          <q-input v-model="filter.dateFrom" label="Du" type="date" outlined dense class="col-auto" style="min-width:140px" />
          <q-input v-model="filter.dateTo" label="Au" type="date" outlined dense class="col-auto" style="min-width:140px" />
          <q-select
            v-model="filter.direction"
            :options="[{ label: 'Tous', value: null }, { label: 'Crédit', value: 'credit' }, { label: 'Débit', value: 'debit' }]"
            emit-value map-options
            label="Sens"
            outlined dense class="col-auto" style="min-width:120px"
          />
          <q-select
            v-model="filter.reconciliation_status"
            :options="reconciliationOptions"
            emit-value map-options
            label="Rapprochement"
            outlined dense class="col-auto" style="min-width:160px"
          />
          <q-input v-model="filter.search" label="Rechercher..." outlined dense class="col" clearable>
            <template v-slot:prepend><q-icon name="search" /></template>
          </q-input>
          <q-btn color="primary" icon="filter_alt" label="Filtrer" no-caps @click="applyFilter" />
          <q-btn flat icon="clear" label="Réinitialiser" no-caps @click="resetFilter" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Table des transactions -->
    <q-card flat bordered>
      <q-table
        :rows="transactions"
        :columns="columns"
        row-key="id"
        :loading="loading"
        flat
        dense
        :pagination="{ rowsPerPage: 20 }"
        :filter="filter.search"
      >
        <template v-slot:loading>
          <q-inner-loading showing><q-spinner-dots size="40px" color="primary" /></q-inner-loading>
        </template>

        <template v-slot:body-cell-direction="props">
          <q-td :props="props">
            <q-icon
              :name="props.row.direction === 'credit' ? 'arrow_downward' : 'arrow_upward'"
              :color="props.row.direction === 'credit' ? 'green' : 'red'"
              size="sm"
            />
          </q-td>
        </template>

        <template v-slot:body-cell-amount="props">
          <q-td :props="props" :class="props.row.direction === 'credit' ? 'text-green text-weight-bold' : 'text-red text-weight-bold'">
            {{ props.row.direction === 'credit' ? '+' : '-' }}{{ fmtCur(Math.abs(props.row.amount)) }}
          </q-td>
        </template>

        <template v-slot:body-cell-reconciliation_status="props">
          <q-td :props="props">
            <q-badge :color="reconColor(props.row.reconciliation_status)" :label="reconLabel(props.row.reconciliation_status)" />
          </q-td>
        </template>

        <template v-slot:body-cell-category="props">
          <q-td :props="props">
            <q-badge
              v-if="props.row.category"
              :style="{ background: props.row.category.color ?? '#9e9e9e', color: '#fff' }"
              :label="props.row.category.name"
            />
            <span v-else class="text-grey-5">—</span>
          </q-td>
        </template>

        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat round dense icon="more_vert" size="sm">
              <q-menu>
                <q-list dense>
                  <q-item
                    clickable v-close-popup
                    v-if="props.row.reconciliation_status === 'unreconciled'"
                    @click="markManual(props.row)"
                  >
                    <q-item-section avatar><q-icon name="check" color="teal" /></q-item-section>
                    <q-item-section>Marquer rapproché manuellement</q-item-section>
                  </q-item>
                  <q-item
                    clickable v-close-popup
                    v-if="props.row.reconciliation_status !== 'unreconciled'"
                    @click="markUnreconciled(props.row)"
                  >
                    <q-item-section avatar><q-icon name="undo" color="orange" /></q-item-section>
                    <q-item-section>Annuler le rapprochement</q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup @click="markIgnored(props.row)">
                    <q-item-section avatar><q-icon name="visibility_off" color="grey" /></q-item-section>
                    <q-item-section>Ignorer</q-item-section>
                  </q-item>
                  <q-separator />
                  <q-item clickable v-close-popup @click="confirmDeleteTx(props.row)">
                    <q-item-section avatar><q-icon name="delete" color="red" /></q-item-section>
                    <q-item-section class="text-red">Supprimer</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-td>
        </template>

        <template v-slot:no-data>
          <div class="full-width text-center text-grey-5 q-pa-xl">
            <q-icon name="receipt_long" size="48px" class="q-mb-sm" /><br>
            Aucune transaction sur cette période
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog saisie manuelle -->
    <q-dialog v-model="addDialogOpen" persistent>
      <q-card style="min-width: 440px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Saisie manuelle</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <div class="row q-gutter-sm">
            <q-input v-model="txForm.transaction_date" label="Date *" type="date" outlined dense class="col-5" />
            <q-select
              v-model="txForm.direction"
              :options="[{ label: 'Crédit (+)', value: 'credit' }, { label: 'Débit (-)', value: 'debit' }]"
              emit-value map-options
              label="Sens *" outlined dense class="col-6"
            />
            <q-input v-model.number="txForm.amount" label="Montant *" type="number" outlined dense class="col-5" />
            <q-input v-model="txForm.reference" label="Référence" outlined dense class="col-6" />
            <q-input v-model="txForm.label" label="Libellé *" outlined dense class="col-12" />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" no-caps v-close-popup />
          <q-btn color="primary" label="Enregistrer" no-caps :loading="savingTx" @click="saveTransaction" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useBankTransactions } from 'src/composables/useBankTransactions';
import { useCompanyStore } from 'src/stores/company-store';
import type { BankAccountFull, BankTransaction, ReconciliationStatus } from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';

const route = useRoute();
const $q = useQuasar();
const companyStore = useCompanyStore();
const accountId = route.params['id'] as string;

const account = ref<BankAccountFull | null>(null);
const {
  transactions, loading, totalDebit, totalCredit,
  loadTransactions, addTransaction, updateReconciliation, deleteTransaction, runAutoReconcile,
} = useBankTransactions();

const reconciling = ref(false);
const addDialogOpen = ref(false);
const savingTx = ref(false);

const unreconciledCount = computed(() =>
  transactions.value.filter(t => t.reconciliation_status === 'unreconciled').length
);

const filter = reactive({
  dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
  dateTo: new Date().toISOString().slice(0, 10),
  direction: null as 'debit' | 'credit' | null,
  reconciliation_status: null as ReconciliationStatus | null,
  search: '',
});

const reconciliationOptions = [
  { label: 'Tous', value: null },
  { label: 'Non rapproché', value: 'unreconciled' },
  { label: 'Automatique', value: 'matched' },
  { label: 'Manuel', value: 'manual' },
  { label: 'Ignoré', value: 'ignored' },
];

const columns = [
  { name: 'transaction_date', label: 'Date', field: 'transaction_date', align: 'left' as const, sortable: true },
  { name: 'direction', label: '', field: 'direction', align: 'center' as const },
  { name: 'label', label: 'Libellé', field: 'label', align: 'left' as const },
  { name: 'reference', label: 'Référence', field: 'reference', align: 'left' as const },
  { name: 'amount', label: 'Montant', field: 'amount', align: 'right' as const, sortable: true },
  { name: 'category', label: 'Catégorie', field: 'category', align: 'center' as const },
  { name: 'reconciliation_status', label: 'Statut', field: 'reconciliation_status', align: 'center' as const },
  { name: 'actions', label: '', field: 'id', align: 'center' as const },
];

const RECON_LABELS: Record<string, string> = {
  unreconciled: 'Non rapproché', matched: 'Auto', manual: 'Manuel', ignored: 'Ignoré',
};
const RECON_COLORS: Record<string, string> = {
  unreconciled: 'orange', matched: 'green', manual: 'teal', ignored: 'grey',
};

function reconLabel(s: string) { return RECON_LABELS[s] ?? s; }
function reconColor(s: string) { return RECON_COLORS[s] ?? 'grey'; }

function fmtCur(n: number) {
  return new Intl.NumberFormat('fr-BF', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);
}

async function applyFilter() {
  await loadTransactions({
    accountId,
    dateFrom: filter.dateFrom || undefined,
    dateTo: filter.dateTo || undefined,
    direction: filter.direction ?? undefined,
    reconciliation_status: filter.reconciliation_status ?? undefined,
    search: filter.search || undefined,
  });
}

async function resetFilter() {
  filter.dateFrom = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  filter.dateTo = new Date().toISOString().slice(0, 10);
  filter.direction = null;
  filter.reconciliation_status = null;
  filter.search = '';
  await applyFilter();
}

async function markManual(tx: BankTransaction) {
  try {
    await updateReconciliation(tx.id, 'manual');
    $q.notify({ type: 'positive', message: 'Marqué comme rapproché manuellement' });
  } catch (e: unknown) { $q.notify({ type: 'negative', message: (e as Error).message }); }
}

async function markUnreconciled(tx: BankTransaction) {
  try {
    await updateReconciliation(tx.id, 'unreconciled', null, null);
    $q.notify({ type: 'info', message: 'Rapprochement annulé' });
  } catch (e: unknown) { $q.notify({ type: 'negative', message: (e as Error).message }); }
}

async function markIgnored(tx: BankTransaction) {
  try {
    await updateReconciliation(tx.id, 'ignored');
    $q.notify({ type: 'info', message: 'Transaction ignorée' });
  } catch (e: unknown) { $q.notify({ type: 'negative', message: (e as Error).message }); }
}

function confirmDeleteTx(tx: BankTransaction) {
  $q.dialog({
    title: 'Supprimer la transaction',
    message: `Supprimer "${tx.label}" (${fmtCur(tx.amount)}) ?`,
    cancel: { label: 'Annuler', flat: true },
    ok: { label: 'Supprimer', color: 'red' },
  }).onOk(async () => {
    try {
      await deleteTransaction(tx.id);
      $q.notify({ type: 'positive', message: 'Transaction supprimée' });
    } catch (e: unknown) { $q.notify({ type: 'negative', message: (e as Error).message }); }
  });
}

async function _runReconcile() {
  reconciling.value = true;
  try {
    const results = await runAutoReconcile(accountId);
    if (results.length === 0) {
      $q.notify({ type: 'info', message: 'Aucun rapprochement automatique trouvé' });
    } else {
      $q.dialog({
        title: `${results.length} rapprochement(s) trouvé(s)`,
        message: results.map(r => `• ${r.match_label} (score ${r.score})`).join('\n'),
        ok: { label: 'Appliquer', color: 'teal' },
        cancel: { label: 'Annuler', flat: true },
      }).onOk(async () => {
        for (const r of results) {
          await updateReconciliation(r.transaction_id, 'matched', r.match_id);
        }
        await applyFilter();
        $q.notify({ type: 'positive', message: `${results.length} transaction(s) rapprochée(s)` });
      });
    }
  } catch (e: unknown) {
    $q.notify({ type: 'negative', message: (e as Error).message });
  } finally {
    reconciling.value = false;
  }
}

const txForm = reactive({
  transaction_date: new Date().toISOString().slice(0, 10),
  direction: 'credit' as 'debit' | 'credit',
  amount: 0,
  label: '',
  reference: '',
});

function openAddDialog() {
  Object.assign(txForm, {
    transaction_date: new Date().toISOString().slice(0, 10),
    direction: 'credit',
    amount: 0,
    label: '',
    reference: '',
  });
  addDialogOpen.value = true;
}

async function saveTransaction() {
  if (!txForm.label || !txForm.amount) {
    $q.notify({ type: 'warning', message: 'Libellé et montant requis' });
    return;
  }
  savingTx.value = true;
  try {
    await addTransaction({
      bank_account_id: accountId,
      company_id: companyStore.companyId!,
      transaction_date: txForm.transaction_date,
      value_date: null,
      amount: Math.abs(txForm.amount),
      direction: txForm.direction,
      label: txForm.label,
      reference: txForm.reference || null,
      category_id: null,
      reconciliation_status: 'unreconciled',
      matched_invoice_id: null,
      matched_movement_id: null,
      import_batch_id: null,
      raw_data: null,
    });
    addDialogOpen.value = false;
    $q.notify({ type: 'positive', message: 'Transaction enregistrée' });
  } catch (e: unknown) {
    $q.notify({ type: 'negative', message: (e as Error).message });
  } finally {
    savingTx.value = false;
  }
}

async function loadAccount() {
  const { data } = await appwriteDb
    .from('bank_accounts')
    .select('*')
    .eq('id', accountId)
    .single();
  account.value = data as BankAccountFull;
}

onMounted(async () => {
  await Promise.all([loadAccount(), applyFilter()]);
});
</script>
