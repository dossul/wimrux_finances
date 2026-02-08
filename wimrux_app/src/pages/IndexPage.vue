<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Tableau de bord</div>

    <!-- KPI Cards -->
    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3" v-for="kpi in kpis" :key="kpi.label">
        <q-card flat bordered>
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon :name="kpi.icon" :color="kpi.color" size="40px" class="q-mr-md" />
              <div>
                <div class="text-h5 text-weight-bold">{{ kpi.value }}</div>
                <div class="text-caption text-grey-7">{{ kpi.label }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Recent invoices -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row items-center q-mb-sm">
          <div class="text-subtitle1 text-weight-medium">Dernières factures</div>
          <q-space />
          <q-btn flat dense size="sm" color="primary" label="Voir tout" no-caps to="/invoices" />
        </div>
        <q-table
          :rows="recentInvoices"
          :columns="invoiceColumns"
          row-key="id"
          :loading="loading"
          flat
          dense
          :pagination="{ rowsPerPage: 5 }"
          hide-pagination
        >
          <template v-slot:body-cell-status="props">
            <q-td :props="props">
              <q-badge :color="statusColor(props.row.status)" :label="statusLabel(props.row.status)" />
            </q-td>
          </template>
          <template v-slot:body-cell-total_ttc="props">
            <q-td :props="props" class="text-weight-bold">
              {{ fmtCur(props.row.total_ttc) }}
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>

    <!-- Mode Dégradé banner -->
    <q-banner v-if="pendingQueueCount > 0" class="bg-orange-1 text-orange-9 q-mb-md rounded-borders" dense>
      <template v-slot:avatar><q-icon name="wifi_off" color="orange" /></template>
      <strong>Mode dégradé :</strong> {{ pendingQueueCount }} facture(s) en attente de certification FNEC.
      <template v-slot:action>
        <q-btn flat no-caps color="orange" label="Relancer tout" icon="replay" :loading="retrying" @click="retryAllPending" />
      </template>
    </q-banner>

    <!-- Quick actions -->
    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Actions rapides</div>
        <div class="row q-gutter-sm">
          <q-btn color="primary" icon="receipt_long" label="Nouvelle facture" no-caps to="/invoices" />
          <q-btn outline color="primary" icon="people" label="Ajouter un client" no-caps to="/clients" />
          <q-btn outline color="primary" icon="assessment" label="Rapports" no-caps to="/reports" />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { insforge } from 'src/boot/insforge';
import { useDegradedMode } from 'src/composables/useDegradedMode';
import type { Invoice } from 'src/types';

const $q = useQuasar();
const { queue: pendingQueue, loadQueue, retryAll } = useDegradedMode();
const loading = ref(false);
const retrying = ref(false);
const pendingQueueCount = ref(0);
const recentInvoices = ref<Invoice[]>([]);

const kpis = ref([
  { label: 'Factures ce mois', value: '0', icon: 'receipt_long', color: 'blue' },
  { label: 'CA du mois (TTC)', value: '0 FCFA', icon: 'trending_up', color: 'green' },
  { label: 'En attente', value: '0', icon: 'hourglass_empty', color: 'amber' },
  { label: 'Certifiées', value: '0', icon: 'verified', color: 'teal' },
]);

const invoiceColumns = [
  { name: 'reference', label: 'Référence', field: 'reference', align: 'left' as const },
  { name: 'type', label: 'Type', field: 'type', align: 'center' as const },
  { name: 'status', label: 'Statut', field: 'status', align: 'center' as const },
  { name: 'total_ttc', label: 'Montant TTC', field: 'total_ttc', align: 'right' as const },
];

function statusColor(s: string) {
  const map: Record<string, string> = { draft: 'grey', validated: 'amber-8', certified: 'green', cancelled: 'red' };
  return map[s] || 'grey';
}

function statusLabel(s: string) {
  const map: Record<string, string> = { draft: 'Brouillon', validated: 'Validée', certified: 'Certifiée', cancelled: 'Annulée' };
  return map[s] || s;
}

function fmtCur(n: number) {
  return new Intl.NumberFormat('fr-BF', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);
}

async function loadDashboard() {
  loading.value = true;
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { data: monthInvoices } = await insforge.database
      .from('invoices')
      .select('*')
      .gte('created_at', startOfMonth)
      .order('created_at', { ascending: false });

    const all = (monthInvoices || []) as Invoice[];

    const certified = all.filter(i => i.status === 'certified');
    const pending = all.filter(i => i.status === 'validated');
    const totalCA = certified.reduce((sum, i) => sum + (i.total_ttc || 0), 0);

    const k = kpis.value;
    if (k[0]) k[0].value = String(all.length);
    if (k[1]) k[1].value = fmtCur(totalCA);
    if (k[2]) k[2].value = String(pending.length);
    if (k[3]) k[3].value = String(certified.length);

    recentInvoices.value = all.slice(0, 5);
  } finally {
    loading.value = false;
  }
}

async function retryAllPending() {
  retrying.value = true;
  try {
    await retryAll();
    await loadQueue();
    pendingQueueCount.value = pendingQueue.value.length;
    if (pendingQueueCount.value === 0) {
      $q.notify({ type: 'positive', message: 'Toutes les certifications en attente ont été traitées' });
    } else {
      $q.notify({ type: 'warning', message: `${pendingQueueCount.value} certification(s) toujours en échec` });
    }
  } catch {
    $q.notify({ type: 'negative', message: 'Erreur lors de la relance' });
  } finally {
    retrying.value = false;
  }
}

onMounted(async () => {
  await loadDashboard();
  await loadQueue();
  pendingQueueCount.value = pendingQueue.value.length;
});
</script>
