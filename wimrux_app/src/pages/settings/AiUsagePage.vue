<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Consommation IA</div>
        <div class="text-caption text-grey-7">Suivi de votre quota et crédits</div>
      </div>
      <q-space />
      <q-btn color="primary" icon="add_shopping_cart" label="Acheter crédits" no-caps @click="$router.push('/app/settings/ai/credits')" />
    </div>

    <!-- KPI Cards -->
    <div class="row q-gutter-md q-mb-lg">
      <!-- Quota mensuel -->
      <q-card flat bordered class="col-12 col-sm-6 col-md-3">
        <q-card-section>
          <div class="row items-center q-mb-sm">
            <q-icon name="event_available" color="primary" size="24px" class="q-mr-sm" />
            <span class="text-caption text-grey-7 text-uppercase">Quota mensuel</span>
          </div>
          <div class="text-h5 text-weight-bold">
            ${{ quotaUsage?.used_usd?.toFixed(2) ?? '0.00' }} / ${{ quotaUsage?.monthly_quota_usd?.toFixed(2) ?? '0.50' }}
          </div>
          <q-linear-progress 
            :value="quotaPercent / 100" 
            :color="quotaColor" 
            class="q-mt-sm" 
            rounded 
            size="8px"
          />
          <div class="text-caption text-grey-7 q-mt-xs">
            {{ quotaPercent }}% utilisé · Réinit. {{ daysUntilReset }}j
          </div>
        </q-card-section>
      </q-card>

      <!-- Solde crédits -->
      <q-card flat bordered class="col-12 col-sm-6 col-md-3">
        <q-card-section>
          <div class="row items-center q-mb-sm">
            <q-icon name="account_balance_wallet" color="accent" size="24px" class="q-mr-sm" />
            <span class="text-caption text-grey-7 text-uppercase">Solde crédits</span>
          </div>
          <div class="text-h5 text-weight-bold" :class="{ 'text-negative': lowCredits }">
            ${{ credits?.balance_usd?.toFixed(2) ?? '0.00' }}
          </div>
          <div class="text-caption text-grey-7 q-mt-xs">
            {{ lowCredits ? '⚠️ Solde faible' : 'Crédits disponibles' }}
          </div>
        </q-card-section>
      </q-card>

      <!-- Appels ce mois -->
      <q-card flat bordered class="col-12 col-sm-6 col-md-3">
        <q-card-section>
          <div class="row items-center q-mb-sm">
            <q-icon name="smart_toy" color="positive" size="24px" class="q-mr-sm" />
            <span class="text-caption text-grey-7 text-uppercase">Appels ce mois</span>
          </div>
          <div class="text-h5 text-weight-bold">{{ stats.callsThisMonth }}</div>
          <div class="text-caption text-grey-7 q-mt-xs">
            {{ stats.successRate.toFixed(0) }}% succès
          </div>
        </q-card-section>
      </q-card>

      <!-- Coût moyen -->
      <q-card flat bordered class="col-12 col-sm-6 col-md-3">
        <q-card-section>
          <div class="row items-center q-mb-sm">
            <q-icon name="trending_up" color="info" size="24px" class="q-mr-sm" />
            <span class="text-caption text-grey-7 text-uppercase">Coût moyen/appel</span>
          </div>
          <div class="text-h5 text-weight-bold">${{ stats.avgCostPerCall.toFixed(4) }}</div>
          <div class="text-caption text-grey-7 q-mt-xs">
            Total: ${{ stats.totalCostThisMonth.toFixed(2) }}
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Usage Chart -->
    <q-card flat bordered class="q-mb-lg">
      <q-card-section>
        <div class="row items-center">
          <div class="text-subtitle1 text-weight-medium">Consommation sur 30 jours</div>
          <q-space />
          <q-btn-toggle
            v-model="chartPeriod"
            no-caps
            dense
            toggle-color="primary"
            color="grey-3"
            text-color="black"
            :options="[
              { label: '7 jours', value: 7 },
              { label: '30 jours', value: 30 },
            ]"
          />
        </div>
      </q-card-section>
      <q-separator />
      <q-card-section>
        <div class="chart-placeholder row items-center justify-center" style="height: 200px;">
          <div class="text-center text-grey-7">
            <q-icon name="bar_chart" size="48px" />
            <div class="text-caption q-mt-sm">Graphique de consommation (à intégrer)</div>
            <div class="text-caption">{{ chartData.length }} points de données disponibles</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Top Tasks -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-md-6">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium">Top tâches consommatrices</div>
          </q-card-section>
          <q-separator />
          <q-list separator>
            <q-item v-for="task in topTasks" :key="task.code">
              <q-item-section>
                <q-item-label>{{ task.name }}</q-item-label>
                <q-item-label caption>{{ task.calls }} appels · {{ task.tokens }} tokens</q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="text-weight-bold">${{ task.cost.toFixed(3) }}</div>
              </q-item-section>
            </q-item>
            <q-item v-if="topTasks.length === 0">
              <q-item-section class="text-grey-7 text-center">
                Aucune donnée disponible
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium">Répartition par modèle</div>
          </q-card-section>
          <q-separator />
          <q-list separator>
            <q-item v-for="model in modelStats" :key="model.name">
              <q-item-section avatar>
                <q-icon name="psychology" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ model.name }}</q-item-label>
                <q-item-label caption>{{ model.calls }} appels</q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="text-weight-bold">${{ model.cost.toFixed(3) }}</div>
              </q-item-section>
            </q-item>
            <q-item v-if="modelStats.length === 0">
              <q-item-section class="text-grey-7 text-center">
                Aucune donnée disponible
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>

    <!-- Usage Logs Table -->
    <q-card flat bordered>
      <q-card-section>
        <div class="row items-center">
          <div class="text-subtitle1 text-weight-medium">Historique détaillé</div>
          <q-space />
          <q-input
            v-model="searchFilter"
            dense
            outlined
            placeholder="Rechercher une tâche..."
            class="q-mr-sm"
            style="width: 250px"
          >
            <template #append>
              <q-icon name="search" />
            </template>
          </q-input>
          <q-btn flat icon="refresh" @click="loadData" :loading="loading" />
        </div>
      </q-card-section>
      <q-separator />
      <q-table
        :rows="filteredLogs"
        :columns="logColumns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 10 }"
        no-data-label="Aucune consommation enregistrée"
      >
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="props.row.status === 'success' ? 'positive' : 'negative'">
              {{ props.row.status }}
            </q-badge>
          </q-td>
        </template>
        <template #body-cell-cost="props">
          <q-td :props="props">
            <span :class="props.row.funding_source === 'byok' ? 'text-grey-7' : 'text-weight-medium'">
              {{ props.row.funding_source === 'byok' ? 'BYOK' : '$' + props.row.cost_billed_usd }}
            </span>
          </q-td>
        </template>
        <template #body-cell-funding="props">
          <q-td :props="props">
            <q-badge 
              :color="getFundingColor(props.row.funding_source)" 
              :label="getFundingLabel(props.row.funding_source)"
              outline
            />
          </q-td>
        </template>
        <template #body-cell-created="props">
          <q-td :props="props">
            {{ formatDate(props.row.created_at) }}
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import type { 
  CompanyAiQuotaUsage, 
  CompanyAiCredits, 
  AiUsageLog,
  AiTask 
} from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';

const companyStore = useCompanyStore();

// State
const quotaUsage = ref<CompanyAiQuotaUsage | null>(null);
const credits = ref<CompanyAiCredits | null>(null);
const usageLogs = ref<AiUsageLog[]>([]);
const tasks = ref<AiTask[]>([]);
const loading = ref(false);
const chartPeriod = ref(30);
const searchFilter = ref('');

// Computed
const companyId = computed(() => companyStore.company?.id);

const quotaPercent = computed(() => {
  if (!quotaUsage.value?.quota_cap_usd) return 0;
  const consumed = quotaUsage.value.consumed_usd ?? quotaUsage.value.used_usd ?? 0;
  return Math.min(100, Math.round(
    (consumed / quotaUsage.value.quota_cap_usd) * 100
  ));
});

const quotaColor = computed(() => {
  if (quotaPercent.value >= 90) return 'negative';
  if (quotaPercent.value >= 70) return 'warning';
  return 'positive';
});

const daysUntilReset = computed(() => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const diff = nextMonth.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

const lowCredits = computed(() => {
  return (credits.value?.balance_usd ?? 0) < 1;
});

const stats = computed(() => {
  const logs = usageLogs.value;
  const thisMonth = logs.filter(l => {
    const logDate = new Date(l.created_at);
    const now = new Date();
    return logDate.getMonth() === now.getMonth() && 
           logDate.getFullYear() === now.getFullYear();
  });

  const calls = thisMonth.length;
  const success = thisMonth.filter(l => l.status === 'success').length;
  const totalCost = thisMonth.reduce((sum, l) => sum + (l.cost_billed_usd || 0), 0);
  
  return {
    callsThisMonth: calls,
    successRate: calls > 0 ? (success / calls) * 100 : 0,
    totalCostThisMonth: totalCost,
    avgCostPerCall: calls > 0 ? totalCost / calls : 0,
  };
});

const chartData = computed(() => {
  // Group by date for the selected period
  const days = chartPeriod.value;
  const data: { date: string; cost: number; calls: number }[] = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayLogs = usageLogs.value.filter(l => 
      l.created_at?.startsWith(dateStr || '')
    );
    
    data.push({
      date: dateStr || '',
      cost: dayLogs.reduce((sum, l) => sum + (l.cost_billed_usd || l.cost_usd || 0), 0),
      calls: dayLogs.length,
    });
  }
  
  return data;
});

const topTasks = computed(() => {
  const taskStats: Record<string, { code: string; name: string; calls: number; cost: number; tokens: number }> = {};
  
  usageLogs.value.forEach(log => {
    const taskKey = log.task_code || log.task || 'unknown';
    if (!taskStats[taskKey]) {
      const task = tasks.value.find(t => t.code === taskKey);
      taskStats[taskKey] = {
        code: taskKey,
        name: task?.name || taskKey,
        calls: 0,
        cost: 0,
        tokens: 0,
      };
    }
    taskStats[taskKey].calls++;
    taskStats[taskKey].cost += log.cost_billed_usd || log.cost_usd || 0;
    taskStats[taskKey].tokens += log.tokens_total || 0;
  });
  
  return Object.values(taskStats)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);
});

const modelStats = computed(() => {
  const modelStats: Record<string, { name: string; calls: number; cost: number }> = {};
  
  usageLogs.value.forEach(log => {
    const modelName = log.model_name || log.model || 'unknown';
    if (!modelStats[modelName]) {
      modelStats[modelName] = {
        name: modelName,
        calls: 0,
        cost: 0,
      };
    }
    modelStats[modelName].calls++;
    modelStats[modelName].cost += log.cost_billed_usd || log.cost_usd || 0;
  });
  
  return Object.values(modelStats)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);
});

const filteredLogs = computed(() => {
  if (!searchFilter.value) return usageLogs.value;
  const filter = searchFilter.value.toLowerCase();
  return usageLogs.value.filter(log => 
    (log.task_code || log.task)?.toLowerCase().includes(filter) ||
    (log.model_name || log.model)?.toLowerCase().includes(filter)
  );
});

const logColumns = [
  { name: 'task', label: 'Tâche', align: 'left' as const, field: (row: any) => row.task_code || row.task },
  { name: 'model', label: 'Modèle', align: 'left' as const, field: (row: any) => row.model_name || row.model },
  { name: 'tokens', label: 'Tokens', align: 'right' as const, field: 'tokens_total' },
  { name: 'cost', label: 'Coût', align: 'right' as const, field: (row: any) => row.cost_billed_usd || row.cost_usd || 0 },
  { name: 'funding', label: 'Source', align: 'center' as const, field: 'funding_source' },
  { name: 'status', label: 'Statut', align: 'center' as const, field: 'status' },
  { name: 'created', label: 'Date', align: 'left' as const, field: 'created_at' },
];

// Methods
function formatDate(date: string) {
  return new Date(date || new Date()).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFundingColor(source: string) {
  switch (source) {
    case 'platform_quota': return 'positive';
    case 'platform_credits': return 'accent';
    case 'byok': return 'grey';
    default: return 'grey';
  }
}

function getFundingLabel(source: string) {
  switch (source) {
    case 'platform_quota': return 'Quota';
    case 'platform_credits': return 'Crédits';
    case 'byok': return 'BYOK';
    default: return source;
  }
}

async function loadData() {
  if (!companyId.value) return;
  
  loading.value = true;
  try {
    // Load quota
    const { data: quota } = await appwriteDb
      .from('company_ai_quota_usage')
      .select('*')
      .eq('company_id', companyId.value)
      .single();
    quotaUsage.value = quota || null;

    // Load credits
    const { data: creds } = await appwriteDb
      .from('company_ai_credits')
      .select('*')
      .eq('company_id', companyId.value)
      .single();
    credits.value = creds || null;

    // Load usage logs (last 100)
    const { data: logs } = await appwriteDb
      .from('ai_usage_logs')
      .select('*')
      .eq('company_id', companyId.value)
      .order('$createdAt', { ascending: false })
      .limit(100);
    usageLogs.value = logs || [];

    // Load tasks for names
    const { data: taskList } = await appwriteDb
      .from('ai_tasks')
      .select('id, code, name');
    tasks.value = taskList || [];
  } finally {
    loading.value = false;
  }
}

onMounted(() => loadData());
</script>

<style scoped>
.chart-placeholder {
  background: linear-gradient(135deg, #f5f5f5 0%, #fafafa 100%);
  border-radius: 8px;
}
</style>
