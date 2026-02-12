<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5">Factures</div>
      <q-space />
      <q-btn outline color="primary" icon="download" label="Export CSV" no-caps class="q-mr-sm" @click="exportCsv" />
      <q-btn-dropdown v-if="!isReadOnly" color="primary" icon="add" label="Nouvelle facture" no-caps>
        <q-list>
          <q-item clickable v-close-popup v-for="t in invoiceTypeOptions" :key="t.value" @click="createInvoice(t.value)">
            <q-item-section avatar><q-icon name="receipt_long" /></q-item-section>
            <q-item-section>
              <q-item-label>{{ t.value }}</q-item-label>
              <q-item-label caption>{{ t.label }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
    </div>

    <div class="row q-gutter-sm q-mb-md">
      <q-input v-model="search" outlined dense placeholder="Rechercher..." class="col" clearable>
        <template v-slot:prepend><q-icon name="search" /></template>
      </q-input>
      <q-select v-model="filterStatus" :options="statusOptions" emit-value map-options outlined dense clearable placeholder="Statut" style="min-width: 150px" />
      <q-select v-model="filterType" :options="invoiceTypeOptions" emit-value map-options outlined dense clearable placeholder="Type" style="min-width: 120px" />
    </div>

    <q-table
      :rows="filteredInvoices"
      :columns="columns"
      row-key="id"
      :loading="loading"
      flat
      bordered
      :pagination="{ rowsPerPage: 20, sortBy: 'created_at', descending: true }"
    >
      <template v-slot:body-cell-type="props">
        <q-td :props="props">
          <q-badge :color="typeColor(props.row.type)" :label="props.row.type" />
        </q-td>
      </template>
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-badge :color="statusColor(props.row.status)" :label="statusLabel(props.row.status)" />
        </q-td>
      </template>
      <template v-slot:body-cell-total_ttc="props">
        <q-td :props="props" class="text-weight-bold">
          {{ formatCurrency(props.row.total_ttc) }}
        </q-td>
      </template>
      <template v-slot:body-cell-created_at="props">
        <q-td :props="props">
          {{ formatDate(props.row.created_at) }}
        </q-td>
      </template>
      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn flat dense icon="visibility" size="sm" @click="$router.push(`/app/invoices/${props.row.id}`)" />
          <q-btn v-if="props.row.status === 'draft'" flat dense icon="edit" size="sm" @click="$router.push(`/app/invoices/${props.row.id}`)" />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { insforge } from 'src/boot/insforge';
import { useAuthStore } from 'src/stores/auth-store';
import { useExportCsv } from 'src/composables/useExportCsv';
import { useInvoiceWorkflow, STATUS_CONFIG } from 'src/composables/useInvoiceWorkflow';
import type { Invoice, InvoiceStatus } from 'src/types';

const router = useRouter();
const authStore = useAuthStore();
const { exportInvoices } = useExportCsv();
const { isReadOnly } = useInvoiceWorkflow();

const invoices = ref<Invoice[]>([]);
const loading = ref(false);
const search = ref('');
const filterStatus = ref<string | null>(null);
const filterType = ref<string | null>(null);

const invoiceTypeOptions = [
  { label: 'Facture de vente', value: 'FV' },
  { label: "Facture d'acompte", value: 'FT' },
  { label: "Facture d'avoir", value: 'FA' },
  { label: 'Export vente', value: 'EV' },
  { label: 'Export acompte', value: 'ET' },
  { label: 'Export avoir', value: 'EA' },
];

const statusOptions = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({
  label: cfg.label,
  value,
}));

const columns = [
  { name: 'type', label: 'Type', field: 'type', align: 'center' as const, sortable: true },
  { name: 'reference', label: 'Référence', field: 'reference', align: 'left' as const, sortable: true },
  { name: 'status', label: 'Statut', field: 'status', align: 'center' as const, sortable: true },
  { name: 'total_ttc', label: 'Montant TTC', field: 'total_ttc', align: 'right' as const, sortable: true },
  { name: 'created_at', label: 'Date', field: 'created_at', align: 'left' as const, sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' as const },
];

const filteredInvoices = computed(() => {
  let result = invoices.value;
  if (filterStatus.value) result = result.filter(i => i.status === filterStatus.value);
  if (filterType.value) result = result.filter(i => i.type === filterType.value);
  if (search.value) {
    const q = search.value.toLowerCase();
    result = result.filter(i => i.reference.toLowerCase().includes(q));
  }
  return result;
});

function typeColor(t: string) {
  const map: Record<string, string> = { FV: 'blue', FT: 'teal', FA: 'orange', EV: 'indigo', ET: 'cyan', EA: 'deep-orange' };
  return map[t] || 'grey';
}

function statusColor(s: string) {
  return STATUS_CONFIG[s as InvoiceStatus]?.color || 'grey';
}

function statusLabel(s: string) {
  return STATUS_CONFIG[s as InvoiceStatus]?.label || s;
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('fr-BF', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);
}

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function loadInvoices() {
  loading.value = true;
  try {
    const { data, error } = await insforge.database
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      invoices.value = data as Invoice[];
    }
  } finally {
    loading.value = false;
  }
}

async function createInvoice(type: string) {
  const now = new Date();
  const year = now.getFullYear();
  const count = invoices.value.filter(i => i.type === type).length + 1;
  const reference = `${type}-${year}-${String(count).padStart(5, '0')}`;

  const { data, error } = await insforge.database
    .from('invoices')
    .insert({
      company_id: authStore.companyId,
      type,
      reference,
      status: 'draft',
      price_mode: 'TTC',
      operator_name: authStore.fullName,
    })
    .select()
    .single();

  if (!error && data) {
    await router.push(`/app/invoices/${(data as Invoice).id}`);
  }
}

function exportCsv() {
  exportInvoices(filteredInvoices.value);
}

onMounted(loadInvoices);
</script>
