<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <q-icon name="account_balance" size="28px" color="primary" class="q-mr-sm" />
      <div class="text-h5 text-weight-medium">Retenues à la source</div>
      <q-space />
      <q-btn flat dense icon="download" label="Exporter CSV" color="primary" @click="exportCsv" />
    </div>

    <div class="row q-gutter-sm q-mb-md">
      <q-select v-model="filterMonth" :options="monthOptions" label="Période"
        outlined dense clearable style="min-width:180px" emit-value map-options />
      <q-select v-model="filterStatus" :options="statusOptions" label="Statut"
        outlined dense clearable style="min-width:160px" emit-value map-options />
      <q-select v-model="filterType" :options="typeOptions" label="Type RAS"
        outlined dense clearable style="min-width:160px" emit-value map-options />
    </div>

    <div class="row q-gutter-md q-mb-md">
      <q-card flat bordered class="col">
        <q-card-section class="q-pa-sm text-center">
          <div class="text-h6 text-primary">{{ fmtN(totalBase) }}</div>
          <div class="text-caption text-grey-6">Base imposable HT</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col">
        <q-card-section class="q-pa-sm text-center">
          <div class="text-h6 text-orange-8">{{ fmtN(totalRas) }}</div>
          <div class="text-caption text-grey-6">Total RAS (XOF)</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col">
        <q-card-section class="q-pa-sm text-center">
          <div class="text-h6 text-positive">{{ fmtN(totalPaid) }}</div>
          <div class="text-caption text-grey-6">Déclaré / Versé</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col">
        <q-card-section class="q-pa-sm text-center">
          <div class="text-h6 text-negative">{{ fmtN(totalPending) }}</div>
          <div class="text-caption text-grey-6">En attente</div>
        </q-card-section>
      </q-card>
    </div>

    <q-card flat bordered>
      <q-table
        :rows="filteredRows" :columns="columns" row-key="id"
        flat dense :loading="loading"
        no-data-label="Aucune retenue à la source enregistrée"
        :pagination="{ rowsPerPage: 25 }"
      >
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.value)" :label="props.value" />
          </q-td>
        </template>
        <template #body-cell-tax_amount="props">
          <q-td :props="props" class="text-right text-weight-medium">{{ fmtN(props.value) }}</q-td>
        </template>
        <template #body-cell-base_amount="props">
          <q-td :props="props" class="text-right">{{ fmtN(props.value) }}</q-td>
        </template>
        <template #body-cell-rate="props">
          <q-td :props="props">{{ (props.value * 100).toFixed(0) }}%</q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn v-if="props.row.status === 'pending'" flat dense icon="check_circle"
              color="positive" size="sm" title="Marquer déclaré"
              @click="markDeclared(props.row)" />
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import { useQuasar } from 'quasar';
import { appwriteDb } from 'src/services/appwrite-db';

const $q = useQuasar();
const companyStore = useCompanyStore();

interface WithholdingTax {
  id: string;
  invoice_id: string | null;
  tax_type: string;
  rate: number;
  base_amount: number;
  tax_amount: number;
  period_month: string;
  status: string;
  declared_at: string | null;
  paid_at: string | null;
  receipt_number: string | null;
  created_at: string;
}

const loading = ref(false);
const rows    = ref<WithholdingTax[]>([]);
const filterMonth  = ref<string | null>(null);
const filterStatus = ref<string | null>(null);
const filterType   = ref<string | null>(null);

const columns = [
  { name: 'period_month', label: 'Période',    field: 'period_month', sortable: true,  align: 'left'   as const },
  { name: 'tax_type',     label: 'Type RAS',   field: 'tax_type',     sortable: true,  align: 'left'   as const },
  { name: 'rate',         label: 'Taux',        field: 'rate',         sortable: true,  align: 'left'   as const },
  { name: 'base_amount',  label: 'Base HT',     field: 'base_amount',  sortable: true,  align: 'right'  as const },
  { name: 'tax_amount',   label: 'Montant RAS', field: 'tax_amount',   sortable: true,  align: 'right'  as const },
  { name: 'status',       label: 'Statut',      field: 'status',       sortable: true,  align: 'left'   as const },
  { name: 'declared_at',  label: 'Déclaré le',  field: 'declared_at',  sortable: false, align: 'left'   as const },
  { name: 'actions',      label: '',            field: 'id',           sortable: false, align: 'center' as const },
];

const statusOptions = [
  { label: 'En attente', value: 'pending'  },
  { label: 'Déclaré',    value: 'declared' },
  { label: 'Versé',      value: 'paid'     },
];
const monthOptions = computed(() =>
  [...new Set(rows.value.map(r => r.period_month))].sort().reverse()
    .map(m => ({ label: m, value: m }))
);
const typeOptions = computed(() =>
  [...new Set(rows.value.map(r => r.tax_type))].sort()
    .map(t => ({ label: t, value: t }))
);

const filteredRows = computed(() => rows.value.filter(r => {
  if (filterMonth.value  && r.period_month !== filterMonth.value)  return false;
  if (filterStatus.value && r.status       !== filterStatus.value) return false;
  if (filterType.value   && r.tax_type     !== filterType.value)   return false;
  return true;
}));

const totalBase    = computed(() => filteredRows.value.reduce((s, r) => s + Number(r.base_amount), 0));
const totalRas     = computed(() => filteredRows.value.reduce((s, r) => s + Number(r.tax_amount),  0));
const totalPaid    = computed(() => filteredRows.value.filter(r => r.status !== 'pending').reduce((s, r) => s + Number(r.tax_amount), 0));
const totalPending = computed(() => filteredRows.value.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.tax_amount), 0));

function statusColor(s: string) {
  if (s === 'paid')     return 'positive';
  if (s === 'declared') return 'blue-6';
  return 'orange-6';
}
function fmtN(n: number) {
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

async function load() {
  if (!companyStore.company?.id) return;
  loading.value = true;
  const { data, error } = await appwriteDb
    .from('withholding_taxes')
    .select('*')
    .eq('company_id', companyStore.company.id)
    .order('period_month', { ascending: false });
  loading.value = false;
  if (!error && data) rows.value = data as WithholdingTax[];
}

async function markDeclared(row: WithholdingTax) {
  const { error } = await appwriteDb
    .from('withholding_taxes')
    .update(row.id, { status: 'declared', declared_at: new Date().toISOString() });
  if (!error) {
    $q.notify({ type: 'positive', message: 'Marqué comme déclaré' });
    await load();
  }
}

function exportCsv() {
  const headers = ['Période', 'Type RAS', 'Taux', 'Base HT', 'Montant RAS', 'Statut', 'Déclaré le'];
  const csvRows = filteredRows.value.map(r => [
    r.period_month,
    r.tax_type,
    (r.rate * 100).toFixed(0) + '%',
    r.base_amount,
    r.tax_amount,
    r.status,
    r.declared_at ?? '',
  ]);
  const csv = [headers, ...csvRows].map(row => row.join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `ras-${filterMonth.value ?? 'all'}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

onMounted(load);
</script>
