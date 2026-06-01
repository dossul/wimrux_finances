<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Frais bancaires</div>
        <div class="text-caption text-grey-7">Analyse des frais et commissions bancaires</div>
      </div>
      <q-space />
      <q-btn outline color="primary" icon="download" label="Export CSV" @click="exportCSV" />
    </div>

    <!-- Filtres -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-gutter-sm items-end q-py-sm">
        <q-select v-model="filterAccount" :options="accountOptions" label="Compte"
          emit-value map-options clearable dense outlined style="min-width:200px" />
        <q-input v-model="filterDateFrom" label="Du" type="date" dense outlined style="min-width:130px" />
        <q-input v-model="filterDateTo"   label="Au" type="date" dense outlined style="min-width:130px" />
        <q-btn flat icon="filter_alt" color="primary" @click="applyFilters" />
        <q-btn flat icon="clear" color="grey" @click="resetFilters" />
      </q-card-section>
    </q-card>

    <!-- KPI YTD -->
    <div class="row q-gutter-md q-mb-lg">
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-md">
          <div class="text-caption text-grey-6 q-mb-xs">Total frais {{ stats.yearNow }}</div>
          <div class="text-h5 text-weight-bold text-negative">{{ fmtAmount(stats.ytd) }} <span class="text-caption">XOF</span></div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-md">
          <div class="text-caption text-grey-6 q-mb-xs">Total frais {{ stats.yearPrev }}</div>
          <div class="text-h5 text-weight-bold text-grey-7">{{ fmtAmount(stats.prev) }} <span class="text-caption">XOF</span></div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-md">
          <div class="text-caption text-grey-6 q-mb-xs">Évolution N / N-1</div>
          <div class="text-h5 text-weight-bold" :class="evolutionClass">
            {{ stats.evolution !== null ? (stats.evolution > 0 ? '+' : '') + stats.evolution.toFixed(1) + '%' : '—' }}
          </div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-md">
          <div class="text-caption text-grey-6 q-mb-xs">Nb transactions</div>
          <div class="text-h5 text-weight-bold text-grey-8">{{ fees.length }}</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Graphique mensuel -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-md">Évolution mensuelle des frais</div>
        <div v-if="monthlyBreakdown.length === 0" class="text-grey-5 text-center q-pa-lg">
          Aucune donnée disponible
        </div>
        <div v-else class="monthly-chart">
          <div v-for="m in monthlyBreakdown" :key="m.month" class="bar-col">
            <div class="bar-label-top text-caption text-grey-7">{{ fmtAmountK(m.total) }}</div>
            <div
              class="bar-fill bg-negative"
              :style="{ height: barHeight(m.total) + 'px' }"
              :title="`${m.label} : ${fmtAmount(m.total)} XOF`"
            />
            <div class="bar-label text-caption text-grey-7">{{ m.label }}</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Répartition par catégorie -->
    <div class="row q-gutter-md q-mb-md">
      <q-card flat bordered class="col">
        <q-card-section>
          <div class="text-subtitle1 text-weight-medium q-mb-sm">Par catégorie</div>
          <q-list dense separator>
            <q-item v-for="cat in categoryBreakdown" :key="cat.category_id ?? 'none'">
              <q-item-section>
                <q-item-label>{{ cat.category_name }}</q-item-label>
                <q-item-label caption>{{ cat.count }} transaction(s)</q-item-label>
              </q-item-section>
              <q-item-section side>
                <span class="text-weight-medium text-negative">{{ fmtAmount(cat.total) }} XOF</span>
              </q-item-section>
            </q-item>
            <q-item v-if="categoryBreakdown.length === 0">
              <q-item-section class="text-grey-5 text-center">Aucune donnée</q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </div>

    <!-- Table détail -->
    <q-card flat bordered>
      <q-card-section class="q-pb-none">
        <div class="text-subtitle1 text-weight-medium">Détail des transactions</div>
      </q-card-section>
      <q-table
        :rows="fees"
        :columns="columns"
        row-key="id"
        :loading="loading"
        :pagination="{ rowsPerPage: 20 }"
        flat
      >
        <template #body-cell-amount="props">
          <q-td :props="props" class="text-right text-negative text-weight-medium">
            {{ fmtAmount(Math.abs(Number(props.value))) }} XOF
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6">
            <q-icon name="account_balance" size="48px" class="q-mb-sm" /><br>
            Aucun frais bancaire trouvé.<br>
            <span class="text-caption">Assurez-vous que vos transactions sont catégorisées avec le type <code>bank_fee</code>.</span>
          </div>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useBankFees } from 'src/composables/useBankFees';
import { useBankAccounts } from 'src/composables/useBankAccounts';

const { fees, loading, stats, monthlyBreakdown, categoryBreakdown, loadFees, exportCSV } = useBankFees();
const { accounts, loadAccounts } = useBankAccounts();

const filterAccount  = ref<string | null>(null);
const filterDateFrom = ref('');
const filterDateTo   = ref('');

const accountOptions = computed(() =>
  accounts.value.map(a => ({ label: `${a.account_number} — ${a.bank_name}`, value: a.id }))
);

const evolutionClass = computed(() => {
  if (stats.value.evolution === null) return 'text-grey-7';
  return stats.value.evolution > 0 ? 'text-negative' : 'text-positive';
});

const columns = [
  { name: 'transaction_date', label: 'Date',      field: 'transaction_date', align: 'center' as const, sortable: true },
  { name: 'label',            label: 'Libellé',   field: 'label',            align: 'left'   as const },
  { name: 'category_name',    label: 'Catégorie', field: 'category_name',    align: 'left'   as const },
  { name: 'amount',           label: 'Montant',   field: 'amount',           align: 'right'  as const, sortable: true },
  { name: 'reference',        label: 'Référence', field: 'reference',        align: 'left'   as const },
];

function fmtAmount(n: number): string {
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0 });
}
function fmtAmountK(n: number): string {
  return n >= 1000 ? (n / 1000).toFixed(0) + 'k' : String(Math.round(n));
}

const maxMonthly = computed(() =>
  Math.max(...monthlyBreakdown.value.map(m => m.total), 1)
);
function barHeight(total: number): number {
  return Math.max(4, Math.round((total / maxMonthly.value) * 120));
}

async function applyFilters() {
  const opts: Parameters<typeof loadFees>[0] = {};
  if (filterAccount.value)  opts.bank_account_id = filterAccount.value;
  if (filterDateFrom.value) opts.date_from        = filterDateFrom.value;
  if (filterDateTo.value)   opts.date_to          = filterDateTo.value;
  await loadFees(opts);
}
function resetFilters() {
  filterAccount.value = null; filterDateFrom.value = ''; filterDateTo.value = '';
  void applyFilters();
}

onMounted(async () => {
  await Promise.all([loadAccounts(), applyFilters()]);
});
</script>

<style scoped>
.kpi-card { min-width: 150px; flex: 1; }
.monthly-chart {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  height: 160px;
  overflow-x: auto;
  padding-bottom: 24px;
}
.bar-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 48px;
  flex: 1;
}
.bar-label-top { font-size: 10px; margin-bottom: 2px; }
.bar-fill { width: 32px; border-radius: 4px 4px 0 0; transition: height 0.3s; }
.bar-label { font-size: 10px; margin-top: 4px; text-align: center; white-space: nowrap; }
</style>
