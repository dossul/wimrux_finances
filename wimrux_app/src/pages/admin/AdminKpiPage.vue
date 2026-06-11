<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Tableau de bord KPI</div>
        <div class="text-caption text-grey-7">Indicateurs clés · activité récente</div>
      </div>
      <q-space />
      <q-btn flat icon="refresh" color="primary" @click="reload" :loading="loading" />
    </div>

    <!-- KPI Cards -->
    <div class="row q-gutter-md q-mb-lg">
      <q-card v-for="kpi in kpiCards" :key="kpi.label" flat bordered class="col-12 col-sm-6 col-md-3">
        <q-card-section>
          <div class="text-caption text-grey-7">{{ kpi.label }}</div>
          <div class="text-h5 text-weight-bold" :class="kpi.color ? `text-${kpi.color}` : ''" :data-testid="kpi.testid">{{ kpi.value }}</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Activité récente -->
    <q-card flat bordered>
      <q-card-section class="text-subtitle1 text-weight-medium">Activité récente (30 jours)</q-card-section>
      <q-separator />
      <q-table :rows="activities" :columns="actCols" row-key="entity_id" flat :loading="loading" :pagination="{ rowsPerPage: 15 }">
        <template #body-cell-entity_type="props">
          <q-td :props="props">
            <q-badge :color="typeColor(props.row.entity_type)" :label="typeLabel(props.row.entity_type)" />
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCompanyStore } from 'src/stores/company-store';
import { appwriteDb } from 'src/services/appwrite-db';

const companyStore = useCompanyStore();
const companyId = computed(() => companyStore.company?.id ?? '');

const loading = ref(false);
const kpis = ref<Record<string, number>>({});
const activities = ref<Array<{ company_id: string; entity_type: string; entity_id: string; description: string; created_at: string }>>([]);

const kpiCards = computed(() => [
  { label: 'Utilisateurs', value: kpis.value.total_users ?? 0, testid: 'kpi-users-count' },
  { label: 'Factures', value: kpis.value.total_invoices ?? 0, testid: 'kpi-invoices-count' },
  { label: 'En retard', value: kpis.value.overdue_invoices ?? 0, color: (kpis.value.overdue_invoices ?? 0) > 0 ? 'negative' : undefined, testid: 'kpi-overdue-invoices' },
  { label: 'Chiffre d\'affaires', value: fmt(kpis.value.total_revenue ?? 0), testid: 'kpi-revenue-total' },
  { label: 'Paiements reçus', value: fmt(kpis.value.total_payments ?? 0), testid: 'kpi-payments-received' },
  { label: 'Budgets', value: kpis.value.total_budgets ?? 0, testid: 'kpi-budgets' },
  { label: 'Emprunts actifs', value: kpis.value.active_loans ?? 0, testid: 'kpi-active-loans' },
  { label: 'Immobilisations', value: kpis.value.active_assets ?? 0, testid: 'kpi-active-assets' },
]);

const actCols = [
  { name: 'entity_type', label: 'Type', align: 'left' as const, field: 'entity_type' },
  { name: 'description', label: 'Description', align: 'left' as const, field: 'description' },
  { name: 'created_at', label: 'Date', align: 'left' as const, field: 'created_at', format: (v: string) => new Date(v).toLocaleString('fr-FR') },
];

function typeColor(t: string) { return { invoice: 'blue', payment: 'positive', budget: 'orange' }[t] ?? 'grey'; }
function typeLabel(t: string) { return { invoice: 'Facture', payment: 'Paiement', budget: 'Budget' }[t] ?? t; }
function fmt(n: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n); }

async function loadKpis() {
  const { data } = await appwriteDb
    .from('v_company_kpis')
    .select('*')
    .eq('company_id', companyId.value)
    .single();
  if (data) kpis.value = data;
}

async function loadActivities() {
  const { data } = await appwriteDb
    .from('v_recent_activity')
    .select('*')
    .eq('company_id', companyId.value)
    .order('created_at', { ascending: false })
    .limit(50);
  activities.value = data || [];
}

async function reload() {
  loading.value = true;
  try {
    await Promise.all([loadKpis(), loadActivities()]);
  } finally { loading.value = false; }
}

onMounted(() => reload());
</script>
