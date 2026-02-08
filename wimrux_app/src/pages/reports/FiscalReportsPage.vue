<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5">Rapports fiscaux (FNEC)</div>
      <q-space />
      <q-badge color="teal" label="DGI Burkina Faso" class="q-px-sm q-py-xs" />
    </div>

    <!-- Report generation -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Générer un rapport</div>
        <div class="row q-gutter-sm items-end">
          <q-btn-toggle v-model="reportType" :options="[{label:'Rapport Z (fin de journée)',value:'Z'},{label:'Rapport X (en cours)',value:'X'}]" no-caps />
          <q-space />
          <q-btn color="primary" icon="description" :label="`Générer rapport ${reportType}`" no-caps :loading="generating" @click="generateFiscalReport" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Generated report display -->
    <q-card flat bordered class="q-mb-md" v-if="currentReport">
      <q-card-section>
        <div class="row items-center q-mb-md">
          <div class="text-h6">Rapport {{ currentReport.type }} — {{ formatDate(currentReport.generated_at) }}</div>
          <q-space />
          <q-btn flat icon="print" label="Imprimer" no-caps @click="printReport" />
        </div>

        <div class="row q-gutter-md q-mb-md">
          <div class="col">
            <div class="text-caption text-grey-7">NIM</div>
            <div class="text-weight-medium">{{ currentReport.nim }}</div>
          </div>
          <div class="col">
            <div class="text-caption text-grey-7">Compteurs</div>
            <div class="text-weight-medium">{{ currentReport.counters }}</div>
          </div>
        </div>

        <q-separator class="q-mb-md" />

        <q-markup-table flat bordered separator="cell">
          <thead>
            <tr>
              <th class="text-left">Groupe</th>
              <th class="text-right">Nombre</th>
              <th class="text-right">HT</th>
              <th class="text-right">TVA</th>
              <th class="text-right">TTC</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in currentReport.details" :key="row.group">
              <td class="text-weight-medium">{{ row.group }}</td>
              <td class="text-right">{{ row.count }}</td>
              <td class="text-right">{{ fmtCur(row.ht) }}</td>
              <td class="text-right">{{ fmtCur(row.tva) }}</td>
              <td class="text-right text-weight-bold">{{ fmtCur(row.ttc) }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="text-weight-bold">
              <td>TOTAL</td>
              <td class="text-right">{{ currentReport.totalCount }}</td>
              <td class="text-right">{{ fmtCur(currentReport.totalHT) }}</td>
              <td class="text-right">{{ fmtCur(currentReport.totalTVA) }}</td>
              <td class="text-right">{{ fmtCur(currentReport.totalTTC) }}</td>
            </tr>
          </tfoot>
        </q-markup-table>
      </q-card-section>
    </q-card>

    <!-- History -->
    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Historique des rapports</div>
        <q-table
          :rows="history"
          :columns="historyColumns"
          row-key="id"
          :loading="loadingHistory"
          flat
          dense
          :pagination="{ rowsPerPage: 10 }"
        >
          <template v-slot:body-cell-type="props">
            <q-td :props="props">
              <q-badge :color="props.row.type === 'Z' ? 'blue' : 'orange'" :label="props.row.type" />
            </q-td>
          </template>
          <template v-slot:body-cell-generated_at="props">
            <q-td :props="props">{{ formatDate(props.row.generated_at) }}</q-td>
          </template>
          <template v-slot:body-cell-total_ttc="props">
            <q-td :props="props" class="text-weight-bold">{{ fmtCur(props.row.total_ttc) }}</q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat dense icon="visibility" size="sm" @click="viewReport(props.row)" />
            </q-td>
          </template>
        </q-table>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { insforge } from 'src/boot/insforge';
import { useFnecApi } from 'src/composables/useFnecApi';

interface ReportDetail {
  group: string;
  count: number;
  ht: number;
  tva: number;
  ttc: number;
}

interface FiscalReport {
  id: string;
  type: 'Z' | 'X';
  nim: string;
  counters: string;
  totalCount: number;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  details: ReportDetail[];
  generated_at: string;
  total_ttc?: number;
}

const $q = useQuasar();
const fnecApi = useFnecApi();

const reportType = ref<'Z' | 'X'>('Z');
const generating = ref(false);
const loadingHistory = ref(false);
const currentReport = ref<FiscalReport | null>(null);
const history = ref<FiscalReport[]>([]);

const historyColumns = [
  { name: 'type', label: 'Type', field: 'type', align: 'center' as const, sortable: true },
  { name: 'generated_at', label: 'Date', field: 'generated_at', align: 'left' as const, sortable: true },
  { name: 'total_ttc', label: 'Total TTC', field: 'total_ttc', align: 'right' as const },
  { name: 'actions', label: '', field: 'actions', align: 'center' as const },
];

function fmtCur(n: number) {
  return new Intl.NumberFormat('fr-BF', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);
}

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function generateFiscalReport() {
  generating.value = true;
  try {
    const result = reportType.value === 'Z'
      ? await fnecApi.getZReport()
      : await fnecApi.getXReport();

    if (result.error) {
      $q.notify({ type: 'negative', message: result.error.message });
      return;
    }

    const data = result.data;
    if (data) {
      const d = data;
      currentReport.value = {
        id: crypto.randomUUID(),
        type: reportType.value,
        nim: typeof d.nim === 'string' ? d.nim : 'BF01000001',
        counters: JSON.stringify(d.counters || {}),
        totalCount: Number(d.totalCount) || 0,
        totalHT: Number(d.totalHT) || 0,
        totalTVA: Number(d.totalTVA) || 0,
        totalTTC: Number(d.totalTTC) || 0,
        details: (d.details || []) as ReportDetail[],
        generated_at: new Date().toISOString(),
      };

      // Save to DB
      await insforge.database.from('fiscal_reports').insert({
        type: reportType.value,
        report_data: data,
        total_ttc: currentReport.value.totalTTC,
      });

      $q.notify({ type: 'positive', message: `Rapport ${reportType.value} généré` });
      await loadHistory();
    }
  } catch (err: unknown) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'Erreur' });
  } finally {
    generating.value = false;
  }
}

function viewReport(report: FiscalReport) {
  currentReport.value = report;
}

function printReport() {
  window.print();
}

async function loadHistory() {
  loadingHistory.value = true;
  try {
    const { data } = await insforge.database
      .from('fiscal_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      history.value = (data as Record<string, unknown>[]).map(r => ({
        id: r.id as string,
        type: r.type as 'Z' | 'X',
        nim: '',
        counters: '',
        totalCount: 0,
        totalHT: 0,
        totalTVA: 0,
        totalTTC: (r.total_ttc as number) || 0,
        total_ttc: (r.total_ttc as number) || 0,
        details: [],
        generated_at: r.created_at as string,
      }));
    }
  } finally {
    loadingHistory.value = false;
  }
}

onMounted(loadHistory);
</script>
