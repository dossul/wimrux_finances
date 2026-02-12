<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <q-icon name="admin_panel_settings" size="md" color="primary" class="q-mr-sm" />
      <div class="text-h5">Suivi IA — Administration</div>
      <q-space />
      <q-btn flat dense icon="refresh" label="Actualiser" no-caps @click="loadAll" :loading="loading" />
    </div>

    <!-- Period selector -->
    <div class="row q-gutter-sm q-mb-md items-center">
      <q-btn-toggle
        v-model="period"
        no-caps
        dense
        toggle-color="primary"
        :options="[
          { label: '7j', value: '7d' },
          { label: '30j', value: '30d' },
          { label: '90j', value: '90d' },
          { label: 'Tout', value: 'all' },
        ]"
        @update:model-value="loadAll"
      />
    </div>

    <!-- Global KPI Cards -->
    <div class="row q-gutter-sm q-mb-lg">
      <q-card flat bordered class="col">
        <q-card-section class="text-center q-pa-sm">
          <div class="text-grey-7 text-caption">Total requêtes</div>
          <div class="text-h4 text-weight-bold text-primary">{{ totals.requests }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col">
        <q-card-section class="text-center q-pa-sm">
          <div class="text-grey-7 text-caption">Tokens entrants</div>
          <div class="text-h4 text-weight-bold text-blue">{{ fmt(totals.tokens_input) }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col">
        <q-card-section class="text-center q-pa-sm">
          <div class="text-grey-7 text-caption">Tokens sortants</div>
          <div class="text-h4 text-weight-bold text-green">{{ fmt(totals.tokens_output) }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col">
        <q-card-section class="text-center q-pa-sm">
          <div class="text-grey-7 text-caption">Erreurs</div>
          <div class="text-h4 text-weight-bold" :class="totals.errors > 0 ? 'text-red' : 'text-grey'">{{ totals.errors }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col">
        <q-card-section class="text-center q-pa-sm">
          <div class="text-grey-7 text-caption">Modérations</div>
          <div class="text-h4 text-weight-bold" :class="totals.moderations > 0 ? 'text-orange' : 'text-grey'">{{ totals.moderations }}</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Usage by Company -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">
          <q-icon name="business" class="q-mr-xs" />Consommation par entreprise
        </div>
        <q-markup-table flat bordered separator="cell" dense>
          <thead><tr class="bg-grey-2">
            <th class="text-left">Entreprise</th>
            <th class="text-right">Requêtes</th>
            <th class="text-right">Input</th>
            <th class="text-right">Output</th>
            <th class="text-right">Total</th>
            <th class="text-center">Erreurs</th>
            <th class="text-center">Modérations</th>
            <th class="text-left">Modèles</th>
          </tr></thead>
          <tbody>
            <tr v-for="c in byCompany" :key="c.company_id">
              <td class="text-weight-medium">{{ c.company_name || c.company_id.slice(0, 8) }}</td>
              <td class="text-right">{{ c.requests }}</td>
              <td class="text-right text-blue">{{ fmt(c.tokens_input) }}</td>
              <td class="text-right text-green">{{ fmt(c.tokens_output) }}</td>
              <td class="text-right text-weight-bold">{{ fmt(c.tokens_total) }}</td>
              <td class="text-center"><q-badge v-if="c.errors > 0" color="red" :label="c.errors" /><span v-else class="text-grey-4">0</span></td>
              <td class="text-center"><q-badge v-if="c.moderations > 0" color="orange" :label="c.moderations" /><span v-else class="text-grey-4">0</span></td>
              <td><q-chip v-for="m in c.models_used" :key="m" dense size="sm" outline>{{ m.split('/')[1] || m }}</q-chip></td>
            </tr>
            <tr v-if="byCompany.length === 0"><td colspan="8" class="text-center text-grey-5 q-pa-md">Aucune donnée</td></tr>
          </tbody>
        </q-markup-table>
      </q-card-section>
    </q-card>

    <!-- Usage by Model (global) -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">
          <q-icon name="memory" class="q-mr-xs" />Consommation par modèle (global)
        </div>
        <q-markup-table flat bordered separator="cell" dense>
          <thead><tr class="bg-grey-2">
            <th class="text-left">Modèle</th>
            <th class="text-right">Requêtes</th>
            <th class="text-right">Input</th>
            <th class="text-right">Output</th>
            <th class="text-right">Total</th>
            <th class="text-center">Erreurs</th>
            <th class="text-center">Modérations</th>
          </tr></thead>
          <tbody>
            <tr v-for="m in byModel" :key="m.model">
              <td class="text-weight-medium">{{ m.model }}</td>
              <td class="text-right">{{ m.requests }}</td>
              <td class="text-right text-blue">{{ fmt(m.tokens_input) }}</td>
              <td class="text-right text-green">{{ fmt(m.tokens_output) }}</td>
              <td class="text-right text-weight-bold">{{ fmt(m.tokens_total) }}</td>
              <td class="text-center"><q-badge v-if="m.errors > 0" color="red" :label="m.errors" /><span v-else class="text-grey-4">0</span></td>
              <td class="text-center"><q-badge v-if="m.moderations > 0" color="orange" :label="m.moderations" /><span v-else class="text-grey-4">0</span></td>
            </tr>
            <tr v-if="byModel.length === 0"><td colspan="7" class="text-center text-grey-5 q-pa-md">Aucune donnée</td></tr>
          </tbody>
        </q-markup-table>
      </q-card-section>
    </q-card>

    <!-- Moderations / Bans (global) -->
    <q-card v-if="moderations.length > 0" flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium text-orange q-mb-sm">
          <q-icon name="gpp_maybe" class="q-mr-xs" />Modérations et refus de contenu (toutes entreprises)
        </div>
        <q-markup-table flat bordered separator="cell" dense>
          <thead><tr class="bg-orange-1">
            <th class="text-left">Date</th>
            <th class="text-left">Entreprise</th>
            <th class="text-left">Modèle</th>
            <th class="text-left">Tâche</th>
            <th class="text-left">Raison</th>
            <th class="text-center">Statut</th>
          </tr></thead>
          <tbody>
            <tr v-for="l in moderations" :key="l.id">
              <td class="text-caption">{{ new Date(l.created_at).toLocaleString('fr-FR') }}</td>
              <td>{{ companyNameMap[l.company_id] || l.company_id.slice(0, 8) }}</td>
              <td>{{ l.model }}</td>
              <td>{{ l.task }}</td>
              <td class="text-red text-weight-medium">{{ l.moderation_reason || l.error_message || 'Non spécifié' }}</td>
              <td class="text-center"><q-badge :color="l.status === 'moderated' ? 'orange' : 'red'" :label="l.status" /></td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAiUsage } from 'src/composables/useAiUsage';
import { useAuthStore } from 'src/stores/auth-store';

const authStore = useAuthStore();
const aiUsage = useAiUsage();
const { byModel, byCompany, loading, totals } = aiUsage;
const isProjectAdmin = computed(() => authStore.role === 'project_admin');
const moderations = aiUsage.moderationLogs;
const period = ref('30d');

const companyNameMap = computed(() => {
  const map: Record<string, string> = {};
  for (const c of byCompany.value) {
    map[c.company_id] = c.company_name;
  }
  return map;
});

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function getDateFrom(p: string): string | undefined {
  if (p === 'all') return undefined;
  const days = p === '7d' ? 7 : p === '90d' ? 90 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

async function loadAll() {
  const from = getDateFrom(period.value);
  if (isProjectAdmin.value) {
    await aiUsage.fetchAllUsage(from);
  } else {
    await aiUsage.fetchCompanyUsage(from);
  }
}

onMounted(() => loadAll());
</script>
