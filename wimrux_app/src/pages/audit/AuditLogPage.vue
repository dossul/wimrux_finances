<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5">Journal d'audit</div>
      <q-space />
      <q-badge color="red" label="INALTÉRABLE" class="q-px-sm q-py-xs" />
    </div>

    <div class="row q-gutter-sm q-mb-md">
      <q-input v-model="search" outlined dense placeholder="Rechercher..." class="col" clearable>
        <template v-slot:prepend><q-icon name="search" /></template>
      </q-input>
      <q-select v-model="filterTable" :options="tableOptions" outlined dense clearable placeholder="Table" style="min-width: 150px" />
      <q-select v-model="filterAction" :options="actionOptions" emit-value map-options outlined dense clearable placeholder="Action" style="min-width: 130px" />
      <q-input v-model="dateFrom" outlined dense type="date" label="Du" style="width: 160px" />
      <q-input v-model="dateTo" outlined dense type="date" label="Au" style="width: 160px" />
      <q-btn color="primary" icon="refresh" flat dense @click="loadLogs" />
    </div>

    <q-table
      :rows="filteredLogs"
      :columns="columns"
      row-key="id"
      :loading="loading"
      flat
      bordered
      :pagination="{ rowsPerPage: 25, sortBy: 'timestamp', descending: true }"
    >
      <template v-slot:body-cell-action_type="props">
        <q-td :props="props">
          <q-badge :color="actionColor(props.row.action_type)" :label="props.row.action_type" />
        </q-td>
      </template>
      <template v-slot:body-cell-timestamp="props">
        <q-td :props="props">
          {{ formatDate(props.row.timestamp) }}
        </q-td>
      </template>
      <template v-slot:body-cell-details="props">
        <q-td :props="props">
          <q-btn flat dense size="xs" icon="visibility" label="Voir" no-caps @click="showDetail(props.row)" />
        </q-td>
      </template>
    </q-table>

    <!-- Detail dialog -->
    <q-dialog v-model="detailOpen">
      <q-card style="min-width: 600px; max-width: 80vw">
        <q-card-section>
          <div class="text-h6">Détail de l'opération</div>
        </q-card-section>
        <q-card-section v-if="selectedLog">
          <div class="q-gutter-sm q-mb-md">
            <div><strong>ID:</strong> {{ selectedLog.id }}</div>
            <div><strong>Date:</strong> {{ formatDate(selectedLog.timestamp) }}</div>
            <div><strong>Action:</strong> <q-badge :color="actionColor(selectedLog.action_type)" :label="selectedLog.action_type" /></div>
            <div><strong>Table:</strong> {{ selectedLog.table_name }}</div>
            <div><strong>Enregistrement:</strong> {{ selectedLog.record_id }}</div>
          </div>
          <div v-if="selectedLog.data_before" class="q-mb-md">
            <div class="text-subtitle2">Avant:</div>
            <pre class="bg-grey-2 q-pa-sm rounded-borders" style="max-height:200px;overflow:auto;font-size:12px">{{ JSON.stringify(selectedLog.data_before, null, 2) }}</pre>
          </div>
          <div v-if="selectedLog.data_after">
            <div class="text-subtitle2">Après:</div>
            <pre class="bg-grey-2 q-pa-sm rounded-borders" style="max-height:200px;overflow:auto;font-size:12px">{{ JSON.stringify(selectedLog.data_after, null, 2) }}</pre>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Fermer" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { insforge } from 'src/boot/insforge';
import type { AuditLog } from 'src/types';

const logs = ref<AuditLog[]>([]);
const loading = ref(false);
const search = ref('');
const filterTable = ref<string | null>(null);
const filterAction = ref<string | null>(null);
const dateFrom = ref('');
const dateTo = ref('');
const detailOpen = ref(false);
const selectedLog = ref<AuditLog | null>(null);

const tableOptions = ['companies', 'clients', 'invoices', 'invoice_items', 'user_profiles'];
const actionOptions = [
  { label: 'INSERT', value: 'INSERT' },
  { label: 'UPDATE', value: 'UPDATE' },
  { label: 'DELETE', value: 'DELETE' },
];

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left' as const, sortable: true },
  { name: 'timestamp', label: 'Date/Heure', field: 'timestamp', align: 'left' as const, sortable: true },
  { name: 'user_id', label: 'Utilisateur', field: 'user_id', align: 'left' as const, sortable: true },
  { name: 'action_type', label: 'Action', field: 'action_type', align: 'center' as const, sortable: true },
  { name: 'table_name', label: 'Table', field: 'table_name', align: 'left' as const, sortable: true },
  { name: 'record_id', label: 'Enregistrement', field: 'record_id', align: 'left' as const },
  { name: 'details', label: 'Détails', field: 'details', align: 'center' as const },
];

const filteredLogs = computed(() => {
  let result = logs.value;
  if (filterTable.value) result = result.filter(l => l.table_name === filterTable.value);
  if (filterAction.value) result = result.filter(l => l.action_type === filterAction.value);
  if (search.value) {
    const q = search.value.toLowerCase();
    result = result.filter(l =>
      l.table_name.toLowerCase().includes(q) ||
      (l.record_id && l.record_id.toLowerCase().includes(q))
    );
  }
  return result;
});

function actionColor(a: string) {
  const map: Record<string, string> = { INSERT: 'green', UPDATE: 'blue', DELETE: 'red' };
  return map[a] || 'grey';
}

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function showDetail(log: AuditLog) {
  selectedLog.value = log;
  detailOpen.value = true;
}

async function loadLogs() {
  loading.value = true;
  try {
    let query = insforge.database
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(500);

    if (dateFrom.value) query = query.gte('timestamp', dateFrom.value + 'T00:00:00');
    if (dateTo.value) query = query.lte('timestamp', dateTo.value + 'T23:59:59');

    const { data, error } = await query;
    if (!error && data) {
      logs.value = data as AuditLog[];
    }
  } finally {
    loading.value = false;
  }
}

onMounted(loadLogs);
</script>
