<template>
  <q-page padding>
    <div class="row items-center q-mb-md q-gutter-sm">
      <q-icon name="compare_arrows" size="28px" color="primary" />
      <div>
        <div class="text-h6 text-weight-bold">Rapprochement universel</div>
        <div class="text-caption text-grey-6">Wallet transactions ↔ Factures — suggestion IA (Claude Sonnet)</div>
      </div>
      <q-space />
      <q-select
        v-model="filterWalletId"
        :options="walletOptions"
        option-value="id"
        option-label="label"
        emit-value map-options clearable
        dense outlined
        label="Filtrer par wallet"
        style="min-width:200px"
        @update:model-value="onWalletFilter"
      />
      <q-btn icon="auto_awesome" label="Suggestions IA" color="primary" unelevated dense
        :loading="aiLoading"
        :disable="!unreconciledTxs.length"
        @click="getAiSuggestions()"
      />
      <q-btn icon="refresh" flat dense round @click="reload" />
    </div>

    <!-- Stats KPIs -->
    <div class="row q-gutter-md q-mb-md">
      <q-card flat bordered class="kpi-card">
        <q-card-section class="text-center q-pa-sm">
          <div class="text-h5 text-weight-bold text-primary">{{ stats.total }}</div>
          <div class="text-caption text-grey-6">Total</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="text-center q-pa-sm">
          <div class="text-h5 text-weight-bold text-positive">{{ stats.reconciled }}</div>
          <div class="text-caption text-grey-6">Rapprochées</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="text-center q-pa-sm">
          <div class="text-h5 text-weight-bold text-orange">{{ stats.unreconciled }}</div>
          <div class="text-caption text-grey-6">Non rapprochées</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="text-center q-pa-sm">
          <div class="text-h5 text-weight-bold text-warning">{{ stats.needs_review }}</div>
          <div class="text-caption text-grey-6">À réviser</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card flex-grow">
        <q-card-section class="q-pa-sm">
          <div class="row items-center q-gutter-xs">
            <div class="text-body2 text-weight-medium">Progression</div>
            <q-space />
            <div class="text-body2 text-weight-bold text-primary">{{ stats.pct }}%</div>
          </div>
          <q-linear-progress :value="stats.pct / 100" color="primary" rounded size="8px" class="q-mt-xs" />
        </q-card-section>
      </q-card>
    </div>

    <!-- AI suggestions banner -->
    <q-banner v-if="suggestions.length" dense rounded class="bg-blue-1 text-blue-9 q-mb-md">
      <template #avatar><q-icon name="auto_awesome" color="blue" /></template>
      {{ suggestions.length }} suggestion(s) IA générées
      <span v-if="lastAiModel" class="text-caption q-ml-xs opacity-70">via {{ lastAiModel }}</span>
      <template #action>
        <q-btn flat dense label="Appliquer tout" @click="applyAllSuggestions" />
        <q-btn flat dense label="Ignorer" @click="suggestions = []" />
      </template>
    </q-banner>

    <!-- Error -->
    <q-banner v-if="error" dense rounded class="bg-negative text-white q-mb-md">
      <template #avatar><q-icon name="error" /></template>
      {{ error }}
    </q-banner>

    <!-- Transactions table -->
    <q-card flat bordered>
      <q-table
        :rows="transactions"
        :columns="columns"
        row-key="id"
        :loading="loading"
        dense
        flat
        :pagination="{ rowsPerPage: 25 }"
        :filter="tableFilter"
      >
        <template #top-right>
          <q-input v-model="tableFilter" dense outlined placeholder="Rechercher..." debounce="200">
            <template #append><q-icon name="search" /></template>
          </q-input>
        </template>

        <template #body-cell-reconciliation_status="{ row }">
          <q-td>
            <q-chip
              dense
              :color="statusColor(row.reconciliation_status)"
              text-color="white"
              :label="statusLabel(row.reconciliation_status)"
              size="sm"
            />
            <q-icon v-if="row.needs_human_review && row.reconciliation_status === 'unreconciled'"
              name="flag" color="warning" size="xs" class="q-ml-xs" />
          </q-td>
        </template>

        <template #body-cell-suggestion="{ row }">
          <q-td>
            <template v-if="getSuggestion(row.id)">
              <div class="row items-center q-gutter-xs">
                <q-chip dense color="blue" text-color="white" icon="auto_awesome"
                  :label="getSuggestion(row.id)!.invoice_number"
                  size="sm"
                />
                <span class="text-caption text-grey-6">{{ (getSuggestion(row.id)!.match_score * 100).toFixed(0) }}%</span>
                <q-btn flat dense icon="check" color="positive" size="xs"
                  @click="confirmSuggestion(row.id)"
                />
                <q-btn flat dense icon="close" color="grey" size="xs"
                  @click="rejectSuggestion(row.id)"
                />
              </div>
            </template>
            <span v-else class="text-caption text-grey-5">—</span>
          </q-td>
        </template>

        <template #body-cell-actions="{ row }">
          <q-td>
            <q-btn v-if="row.reconciliation_status === 'unreconciled'"
              flat dense icon="link" color="primary" size="xs"
              @click="openMatchDialog(row)"
            >
              <q-tooltip>Rapprocher manuellement</q-tooltip>
            </q-btn>
            <q-btn v-if="row.reconciliation_status === 'reconciled'"
              flat dense icon="link_off" color="orange" size="xs"
              @click="undoMatch(row.id)"
            >
              <q-tooltip>Annuler le rapprochement</q-tooltip>
            </q-btn>
            <q-btn v-if="row.reconciliation_status === 'unreconciled'"
              flat dense icon="block" color="grey" size="xs"
              @click="excludeTx(row.id)"
            >
              <q-tooltip>Exclure</q-tooltip>
            </q-btn>
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Manual match dialog -->
    <q-dialog v-model="matchDialog">
      <q-card style="min-width:420px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Rapprocher manuellement</div>
          <q-space /><q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section v-if="selectedTx">
          <div class="q-mb-sm text-body2">
            <b>{{ selectedTx.label }}</b> — {{ formatAmount(selectedTx.amount, selectedTx.currency) }}
            <span class="text-caption text-grey-6 q-ml-xs">{{ selectedTx.transaction_date.slice(0, 10) }}</span>
          </div>
          <q-select
            v-model="selectedInvoiceId"
            :options="invoiceOptions"
            option-value="id"
            option-label="label"
            emit-value map-options
            outlined dense
            label="Facture à rapprocher"
            use-input
            input-debounce="200"
            @filter="filterInvoices"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn unelevated label="Confirmer" color="primary"
            :disable="!selectedInvoiceId"
            @click="confirmManualMatch"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import { useUniversalReconciliation, type WalletTx } from 'src/composables/useUniversalReconciliation';

const companyStore = useCompanyStore();
const {
  transactions, suggestions, loading, aiLoading, error, stats,
  unreconciledTxs, lastAiModel,
  loadTransactions, getAiSuggestions, applyMatch, excludeTx, undoMatch,
} = useUniversalReconciliation();

const filterWalletId = ref<string | null>(null);
const tableFilter    = ref('');
const walletOptions  = ref<{ id: string; label: string }[]>([]);
const matchDialog    = ref(false);
const selectedTx     = ref<WalletTx | null>(null);
const selectedInvoiceId = ref<string | null>(null);
const allInvoices    = ref<{ id: string; label: string }[]>([]);
const invoiceOptions = ref<{ id: string; label: string }[]>([]);

const columns = [
  { name: 'transaction_date', label: 'Date',          field: 'transaction_date', sortable: true, format: (v: string) => v?.slice(0, 10) },
  { name: 'source_channel',   label: 'Canal',         field: 'source_channel',   sortable: true },
  { name: 'direction',        label: 'Sens',          field: 'direction',        sortable: true },
  { name: 'amount',           label: 'Montant',       field: 'amount',           sortable: true, format: (v: number, r: WalletTx) => formatAmount(v, r.currency) },
  { name: 'label',            label: 'Libellé',       field: 'label',            sortable: true },
  { name: 'counterparty_name',label: 'Contrepartie',  field: 'counterparty_name',sortable: false },
  { name: 'reconciliation_status', label: 'Statut',   field: 'reconciliation_status', sortable: true },
  { name: 'suggestion',       label: 'Suggestion IA', field: 'id',               sortable: false },
  { name: 'actions',          label: '',              field: 'id',               sortable: false },
];

function formatAmount(v: number, currency: string) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency || 'XOF', maximumFractionDigits: 0 }).format(v);
}

function statusColor(s: string) {
  return s === 'reconciled' ? 'positive' : s === 'excluded' ? 'grey' : s === 'partial' ? 'orange' : 'warning';
}

function statusLabel(s: string) {
  return s === 'reconciled' ? 'Rapprochée' : s === 'excluded' ? 'Exclue' : s === 'partial' ? 'Partiel' : 'Non rapprochée';
}

function getSuggestion(txId: string) {
  return suggestions.value.find(s => s.wallet_tx_id === txId && s.invoice_id) ?? null;
}

async function confirmSuggestion(txId: string) {
  const s = getSuggestion(txId);
  if (s?.invoice_id) await applyMatch(txId, s.invoice_id);
}

function rejectSuggestion(txId: string) {
  suggestions.value = suggestions.value.filter(s => s.wallet_tx_id !== txId);
}

async function applyAllSuggestions() {
  for (const s of suggestions.value.filter(x => x.invoice_id)) {
    await applyMatch(s.wallet_tx_id, s.invoice_id);
  }
}

function openMatchDialog(tx: WalletTx) {
  selectedTx.value = tx;
  selectedInvoiceId.value = null;
  matchDialog.value = true;
}

function filterInvoices(val: string, update: (fn: () => void) => void) {
  update(() => {
    const v = val.toLowerCase();
    invoiceOptions.value = v ? allInvoices.value.filter(i => i.label.toLowerCase().includes(v)) : allInvoices.value;
  });
}

async function confirmManualMatch() {
  if (!selectedTx.value || !selectedInvoiceId.value) return;
  await applyMatch(selectedTx.value.id, selectedInvoiceId.value);
  matchDialog.value = false;
}

async function onWalletFilter(id: string | null) {
  await loadTransactions(id ?? undefined);
}

async function reload() {
  await loadTransactions(filterWalletId.value ?? undefined);
}

onMounted(async () => {
  // Load wallets
  const { data: wallets } = await insforge.database
    .from('payment_wallets')
    .select('id,name,provider_code')
    .eq('company_id', companyStore.company?.id ?? '')
    .eq('is_active', true);
  walletOptions.value = (wallets ?? []).map((w: Record<string, unknown>) => ({
    id: w.id as string,
    label: `${w.name} (${w.provider_code})`,
  }));

  // Load open invoices for manual match
  const { data: inv } = await insforge.database
    .from('invoices')
    .select('id,number,total_ttc,client_name')
    .eq('company_id', companyStore.company?.id ?? '')
    .in('status', ['sent', 'partial', 'overdue'])
    .limit(100);
  allInvoices.value = (inv ?? []).map((i: Record<string, unknown>) => ({
    id: i.id as string,
    label: `${i.number} — ${i.client_name} — ${i.total_ttc} XOF`,
  }));
  invoiceOptions.value = allInvoices.value;

  await loadTransactions();
});
</script>

<style scoped>
.kpi-card { min-width: 110px; }
.flex-grow { flex: 1; }
</style>
