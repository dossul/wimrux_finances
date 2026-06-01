<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5">Factures</div>
      <q-space />
      <q-btn outline color="primary" icon="download" label="Export CSV" no-caps class="q-mr-sm" data-testid="export-csv-btn" @click="exportCsv" />
      <q-btn-dropdown v-if="!isReadOnly" color="primary" icon="add" label="Nouvelle facture" no-caps data-testid="invoice-new-btn">
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
      <q-input v-model="search" outlined dense placeholder="Rechercher..." class="col" data-testid="invoice-search" clearable>
        <template v-slot:prepend><q-icon name="search" /></template>
      </q-input>
      <q-select v-model="filterStatus" :options="statusOptions" emit-value map-options outlined dense clearable placeholder="Statut" data-testid="invoice-status-filter" style="min-width: 150px" />
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
      <template v-slot:body="props">
        <q-tr :props="props" :data-testid="'invoice-row-' + props.row.status">
          <q-td key="type" :props="props">
            <q-badge :color="typeColor(props.row.type)" :label="props.row.type" />
          </q-td>
          <q-td key="reference" :props="props">{{ props.row.reference }}</q-td>
          <q-td key="client" :props="props">{{ props.row.client?.name }}</q-td>
          <q-td key="status" :props="props">
            <q-badge :color="statusColor(props.row.status)" :label="statusLabel(props.row.status)" />
          </q-td>
          <q-td key="total_ttc" :props="props" class="text-weight-bold">{{ formatCurrency(props.row.total_ttc) }}</q-td>
          <q-td key="created_at" :props="props">{{ formatDate(props.row.created_at) }}</q-td>
          <q-td key="actions" :props="props">
            <q-btn flat dense icon="visibility" size="sm" data-testid="invoice-menu-btn" @click="$router.push(`/app/invoices/${props.row.id}`)" />
            <q-btn v-if="props.row.status === 'draft'" flat dense icon="edit" size="sm" data-testid="invoice-edit-btn" @click="$router.push(`/app/invoices/${props.row.id}`)" />
            <q-btn v-if="props.row.status === 'draft'" flat dense icon="delete" size="sm" color="negative" data-testid="invoice-delete-draft-btn" @click="confirmDeleteDraft(props.row)" />
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { insforge } from 'src/boot/insforge';
import { useAuthStore } from 'src/stores/auth-store';
import { useInvoiceStore } from 'src/stores/invoice-store';
import { useExportCsv } from 'src/composables/useExportCsv';
import { useInvoiceWorkflow, STATUS_CONFIG } from 'src/composables/useInvoiceWorkflow';
import type { Invoice, InvoiceStatus } from 'src/types';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const authStore = useAuthStore();
const invoiceStore = useInvoiceStore();
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
  { label: 'Proforma', value: 'PF' },
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
  const map: Record<string, string> = { FV: 'blue', FT: 'teal', FA: 'orange', EV: 'indigo', ET: 'cyan', EA: 'deep-orange', PF: 'purple' };
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
      .select('id, type, reference, status, total_ttc, created_at, client_id, client:clients(name)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      invoices.value = data as unknown as Invoice[];
    }
  } finally {
    loading.value = false;
  }
}

async function createInvoice(type: string) {
  const now = new Date();
  const year = now.getFullYear();

  const { data: refData, error: refError } = await insforge.database
    .rpc('next_invoice_reference', { p_company_id: authStore.companyId, p_type: type, p_year: year });

  if (refError) {
    $q.notify({ type: 'negative', message: 'Erreur lors de la génération de la référence' });
    return;
  }

  const { data, error } = await insforge.database
    .from('invoices')
    .insert({
      company_id: authStore.companyId,
      type,
      reference: refData as string,
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

async function doDeleteDraft(inv: Invoice) {
  const { error } = await invoiceStore.deleteDraft(inv.id);
  if (error) {
    $q.notify({ type: 'negative', message: error.message || 'Erreur lors de la suppression' });
  } else {
    invoices.value = invoices.value.filter(i => i.id !== inv.id);
    $q.notify({ type: 'positive', message: `Brouillon ${inv.reference} supprimé` });
  }
}

function confirmDeleteDraft(inv: Invoice) {
  $q.dialog({
    title: 'Supprimer le brouillon',
    message: `Voulez-vous vraiment supprimer le brouillon ${inv.reference} ? Cette action est irréversible.`,
    cancel: { label: 'Annuler', flat: true },
    ok: { label: 'Supprimer', color: 'negative' },
    persistent: true,
  }).onOk(() => { void doDeleteDraft(inv); });
}

function exportCsv() {
  exportInvoices(filteredInvoices.value);
}

onMounted(loadInvoices);

// Recharger quand on revient sur cette page (navigation arrière)
watch(() => route.fullPath, (newPath) => {
  if (newPath === '/app/invoices') {
    void loadInvoices();
  }
});
</script>
