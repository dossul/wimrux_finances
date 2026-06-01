<template>
  <q-page padding>
    <!-- Header avec filtre période -->
    <div class="row items-center q-mb-md">
      <div class="text-h5">Tableau de bord</div>
      <q-space />
      <q-btn-toggle
        v-model="period"
        :options="periodOptions"
        toggle-color="primary"
        outline
        dense
        no-caps
        @update:model-value="loadDashboard"
      />
    </div>

    <!-- KPI Cards avec skeleton -->
    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3" v-for="kpi in kpis" :key="kpi.label">
        <q-card flat bordered>
          <q-card-section>
            <div class="row items-center no-wrap">
              <q-icon :name="kpi.icon" :color="kpi.color" size="40px" class="q-mr-md" />
              <div class="full-width">
                <q-skeleton v-if="loading" type="text" width="80px" height="32px" />
                <div v-else class="text-h5 text-weight-bold">{{ kpi.value }}</div>
                <div class="text-caption text-grey-7">{{ kpi.label }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Rangée : graphique CA 12 mois + Top 5 clients -->
    <div class="row q-gutter-md q-mb-md">

      <!-- Graphique CA 12 mois -->
      <div class="col-12 col-md-7">
        <q-card flat bordered style="height: 280px">
          <q-card-section class="q-pb-none">
            <div class="text-subtitle1 text-weight-medium">Évolution CA — 12 derniers mois</div>
          </q-card-section>
          <q-card-section class="q-pt-sm" style="height: 210px">
            <q-skeleton v-if="loading" height="160px" />
            <div v-else class="row items-end full-height q-gutter-xs" style="overflow-x:auto">
              <div
                v-for="bar in caChart"
                :key="bar.label"
                class="col column items-center"
                style="min-width: 36px"
              >
                <div class="text-caption text-grey-7 q-mb-xs" style="font-size:9px; white-space:nowrap">
                  {{ fmtShort(bar.value) }}
                </div>
                <div
                  class="rounded-borders bg-primary"
                  style="width: 24px; transition: height 0.3s ease; min-height: 4px"
                  :style="{ height: bar.height + 'px' }"
                >
                  <q-tooltip>{{ bar.label }} : {{ fmtCur(bar.value) }}</q-tooltip>
                </div>
                <div class="text-caption text-grey-6 q-mt-xs" style="font-size:9px">{{ bar.label }}</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Top 5 clients -->
      <div class="col-12 col-md-4">
        <q-card flat bordered style="height: 280px">
          <q-card-section class="q-pb-xs">
            <div class="text-subtitle1 text-weight-medium">Top 5 clients</div>
          </q-card-section>
          <q-card-section class="q-pt-xs">
            <template v-if="loading">
              <q-skeleton v-for="n in 5" :key="n" type="text" class="q-mb-sm" />
            </template>
            <div v-else>
              <div v-for="(c, idx) in top5Clients" :key="c.id" class="q-mb-sm">
                <div class="row items-center q-mb-xs">
                  <q-avatar size="20px" :color="clientColors[idx]" text-color="white" class="q-mr-sm" style="font-size:10px">
                    {{ idx + 1 }}
                  </q-avatar>
                  <div class="text-caption text-weight-medium ellipsis" style="max-width:130px">{{ c.name }}</div>
                  <q-space />
                  <div class="text-caption text-primary text-weight-bold">{{ fmtShort(c.total) }}</div>
                </div>
                <q-linear-progress
                  :value="top5Max > 0 ? c.total / top5Max : 0"
                  :color="clientColors[idx]"
                  size="4px"
                  rounded
                />
              </div>
              <div v-if="top5Clients.length === 0" class="text-grey-5 text-caption text-center q-mt-lg">
                Aucune donnée sur la période
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Rangée : Factures récentes + Factures en attente -->
    <div class="row q-gutter-md q-mb-md">

      <!-- Factures récentes -->
      <div class="col-12 col-md-7">
        <q-card flat bordered>
          <q-card-section>
            <div class="row items-center q-mb-sm">
              <div class="text-subtitle1 text-weight-medium">Dernières factures</div>
              <q-space />
              <q-btn flat dense size="sm" color="primary" label="Voir tout" no-caps to="/app/invoices" />
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
              <template v-slot:loading>
                <q-inner-loading showing>
                  <q-spinner-dots size="40px" color="primary" />
                </q-inner-loading>
              </template>
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-badge :color="statusColor(props.row.status)" :label="statusLabel(props.row.status)" />
                </q-td>
              </template>
              <template v-slot:body-cell-total_ttc="props">
                <q-td :props="props" class="text-weight-bold text-right">
                  {{ fmtCur(props.row.total_ttc) }}
                </q-td>
              </template>
              <template v-slot:body-cell-reference="props">
                <q-td :props="props">
                  <router-link :to="`/app/invoices/${props.row.id}`" class="text-primary">
                    {{ props.row.reference }}
                  </router-link>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>

      <!-- Factures en attente d'action -->
      <div class="col-12 col-md-4">
        <q-card flat bordered>
          <q-card-section>
            <div class="row items-center q-mb-sm">
              <div class="text-subtitle1 text-weight-medium">En attente d'action</div>
              <q-badge color="orange" :label="pendingInvoices.length" class="q-ml-sm" v-if="pendingInvoices.length > 0" />
            </div>
            <template v-if="loading">
              <q-skeleton v-for="n in 4" :key="n" type="rect" height="48px" class="q-mb-sm rounded-borders" />
            </template>
            <div v-else>
              <div v-for="inv in pendingInvoices.slice(0, 6)" :key="inv.id">
                <router-link :to="`/app/invoices/${inv.id}`" class="text-decoration-none">
                  <q-item dense clickable class="rounded-borders q-mb-xs bg-orange-1">
                    <q-item-section avatar>
                      <q-icon name="hourglass_top" color="orange" size="sm" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label class="text-caption text-weight-medium">{{ inv.reference }}</q-item-label>
                      <q-item-label caption>{{ fmtCur(inv.total_ttc) }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <q-badge :color="statusColor(inv.status)" :label="statusLabel(inv.status)" />
                    </q-item-section>
                  </q-item>
                </router-link>
              </div>
              <div v-if="pendingInvoices.length === 0" class="text-grey-5 text-caption text-center q-pa-md">
                Aucune facture en attente ✓
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Actions rapides -->
    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Actions rapides</div>
        <div class="row q-gutter-sm">
          <q-btn color="primary" icon="receipt_long" label="Nouvelle facture" no-caps to="/app/invoices" />
          <q-btn outline color="primary" icon="people" label="Ajouter un client" no-caps to="/app/clients" />
          <q-btn outline color="primary" icon="assessment" label="Rapports" no-caps to="/app/reports" />
          <q-btn outline color="teal" icon="account_balance" label="Trésorerie" no-caps to="/app/treasury" />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { insforge } from 'src/boot/insforge';
import type { Invoice } from 'src/types';

type Period = 'month' | 'quarter' | 'year';

const loading = ref(false);
const period = ref<Period>('month');

const periodOptions = [
  { label: 'Mois', value: 'month' },
  { label: 'Trimestre', value: 'quarter' },
  { label: 'Année', value: 'year' },
];

const clientColors = ['primary', 'teal', 'deep-orange', 'indigo', 'purple'];

const recentInvoices = ref<Invoice[]>([]);
const pendingInvoices = ref<Invoice[]>([]);
const allInvoices12m = ref<Invoice[]>([]);

interface ClientTotal { id: string; name: string; total: number }
const top5Clients = ref<ClientTotal[]>([]);
const top5Max = computed(() => top5Clients.value[0]?.total ?? 1);

const kpis = ref([
  { label: 'Factures (période)', value: '0', icon: 'receipt_long', color: 'blue' },
  { label: 'CA TTC certifié', value: '0 FCFA', icon: 'trending_up', color: 'green' },
  { label: 'En attente d\'approbation', value: '0', icon: 'hourglass_empty', color: 'amber' },
  { label: 'Solde trésorerie', value: '0 FCFA', icon: 'account_balance', color: 'teal' },
]);

interface CaBar { label: string; value: number; height: number }
const caChart = ref<CaBar[]>([]);

const invoiceColumns = [
  { name: 'reference', label: 'Référence', field: 'reference', align: 'left' as const },
  { name: 'type', label: 'Type', field: 'type', align: 'center' as const },
  { name: 'status', label: 'Statut', field: 'status', align: 'center' as const },
  { name: 'total_ttc', label: 'TTC', field: 'total_ttc', align: 'right' as const },
];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Brouillon', pending_validation: 'En attente', approved: 'Approuvée',
  validated: 'Validée', certified: 'Certifiée', cancelled: 'Annulée',
  sent: 'Envoyée', accepted: 'Acceptée', rejected: 'Refusée',
};
const STATUS_COLORS: Record<string, string> = {
  draft: 'grey', pending_validation: 'orange', approved: 'blue',
  validated: 'amber-8', certified: 'green', cancelled: 'red',
  sent: 'teal', accepted: 'green-7', rejected: 'deep-orange',
};

function statusColor(s: string) { return STATUS_COLORS[s] ?? 'grey'; }
function statusLabel(s: string) { return STATUS_LABELS[s] ?? s; }

function fmtCur(n: number) {
  return new Intl.NumberFormat('fr-BF', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);
}

function fmtShort(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'k';
  return String(Math.round(n));
}

function getPeriodStart(p: Period): string {
  const now = new Date();
  if (p === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  if (p === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), q * 3, 1).toISOString();
  }
  return new Date(now.getFullYear(), 0, 1).toISOString();
}

function buildCaChart(invoices: Invoice[]) {
  const now = new Date();
  const months: CaBar[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
    const value = invoices
      .filter(inv => {
        const dt = new Date(inv.created_at ?? '');
        return dt.getFullYear() === d.getFullYear() && dt.getMonth() === d.getMonth()
          && inv.status === 'certified';
      })
      .reduce((sum, inv) => sum + (inv.total_ttc || 0), 0);
    months.push({ label, value, height: 0 });
  }
  const maxVal = Math.max(...months.map(m => m.value), 1);
  months.forEach(m => { m.height = Math.max(4, Math.round((m.value / maxVal) * 140)); });
  caChart.value = months;
}

async function loadDashboard() {
  loading.value = true;
  try {
    const periodStart = getPeriodStart(period.value);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const [periodRes, allRes, pendingRes, treasuryRes] = await Promise.all([
      insforge.database
        .from('invoices')
        .select('id, reference, type, status, total_ttc, client_id, created_at')
        .gte('created_at', periodStart)
        .order('created_at', { ascending: false }),
      insforge.database
        .from('invoices')
        .select('id, status, total_ttc, client_id, created_at')
        .gte('created_at', twelveMonthsAgo.toISOString()),
      insforge.database
        .from('invoices')
        .select('id, reference, type, status, total_ttc')
        .in('status', ['pending_validation', 'approved'])
        .order('created_at', { ascending: false }),
      insforge.database
        .from('treasury_accounts')
        .select('balance'),
    ]);

    const periodInvoices = (periodRes.data || []) as Invoice[];
    const allInv = (allRes.data || []) as Invoice[];
    allInvoices12m.value = allInv;
    pendingInvoices.value = (pendingRes.data || []) as Invoice[];

    const certified = periodInvoices.filter(i => i.status === 'certified');
    const totalCA = certified.reduce((s, i) => s + (i.total_ttc || 0), 0);
    const soldeTreso = ((treasuryRes.data || []) as { balance: number }[])
      .reduce((s, a) => s + (a.balance || 0), 0);

    kpis.value[0]!.value = String(periodInvoices.length);
    kpis.value[1]!.value = fmtCur(totalCA);
    kpis.value[2]!.value = String(pendingInvoices.value.length);
    kpis.value[3]!.value = fmtCur(soldeTreso);

    recentInvoices.value = periodInvoices.slice(0, 5);

    // Top 5 clients sur la période
    const clientMap: Record<string, number> = {};
    periodInvoices.filter(i => i.status === 'certified' && i.client_id).forEach(i => {
      clientMap[i.client_id!] = (clientMap[i.client_id!] ?? 0) + (i.total_ttc || 0);
    });

    const clientIds = Object.keys(clientMap);
    if (clientIds.length > 0) {
      const { data: clientsData } = await insforge.database
        .from('clients')
        .select('id, name')
        .in('id', clientIds.slice(0, 20));
      const clientNames: Record<string, string> = {};
      (clientsData || []).forEach((c: { id: string; name: string }) => { clientNames[c.id] = c.name; });
      top5Clients.value = Object.entries(clientMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, total]) => ({ id, name: clientNames[id] ?? id.slice(0, 8), total }));
    } else {
      top5Clients.value = [];
    }

    buildCaChart(allInv);
  } finally {
    loading.value = false;
  }
}

onMounted(() => { void loadDashboard(); });
</script>
