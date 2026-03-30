<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5">A-Rapport — Rapprochement fiscal</div>
      <q-space />
      <q-badge color="teal" label="DGI Burkina Faso §2.33" class="q-px-sm q-py-xs" />
    </div>

    <!-- Generate report form -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Générer un A-Rapport</div>
        <div class="row q-gutter-sm items-end">
          <q-input v-model="periodStart" outlined dense type="date" label="Début de période" style="width: 180px" />
          <q-input v-model="periodEnd" outlined dense type="date" label="Fin de période" style="width: 180px" />
          <q-btn
            color="primary"
            icon="assessment"
            label="Générer"
            no-caps
            :loading="aReport.loading.value"
            :disable="!periodStart || !periodEnd"
            @click="generate"
          />
        </div>
      </q-card-section>
    </q-card>

    <!-- Current report -->
    <q-card flat bordered class="q-mb-md" v-if="aReport.report.value">
      <q-card-section>
        <div class="text-h6 q-mb-md">
          Période : {{ aReport.report.value.period_start }} — {{ aReport.report.value.period_end }}
        </div>

        <div class="row q-gutter-md q-mb-md">
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered class="bg-blue-1">
              <q-card-section class="text-center">
                <div class="text-caption text-grey-7">Factures certifiées</div>
                <div class="text-h5 text-weight-bold">{{ aReport.report.value.invoice_count }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered class="bg-green-1">
              <q-card-section class="text-center">
                <div class="text-caption text-grey-7">Total TTC</div>
                <div class="text-h5 text-weight-bold text-green">{{ fmtCur(aReport.report.value.total_ttc) }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered class="bg-orange-1">
              <q-card-section class="text-center">
                <div class="text-caption text-grey-7">Total TVA</div>
                <div class="text-h5 text-weight-bold text-orange">{{ fmtCur(aReport.report.value.total_tva) }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered class="bg-purple-1">
              <q-card-section class="text-center">
                <div class="text-caption text-grey-7">Total PSVB</div>
                <div class="text-h5 text-weight-bold text-purple">{{ fmtCur(aReport.report.value.total_psvb) }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <q-separator class="q-mb-md" />

        <!-- Breakdown by type -->
        <q-markup-table flat bordered separator="cell" class="q-mb-md">
          <thead>
            <tr>
              <th class="text-left">Type</th>
              <th class="text-right">Montant TTC</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="t in typeBreakdown" :key="t.code">
              <td>{{ t.code }} — {{ t.label }}</td>
              <td class="text-right text-weight-medium">{{ fmtCur(t.amount) }}</td>
            </tr>
          </tbody>
        </q-markup-table>

        <!-- Summary row -->
        <div class="row q-gutter-md">
          <div class="col">
            <div class="text-caption text-grey-7">Total HT</div>
            <div class="text-weight-medium">{{ fmtCur(aReport.report.value.total_ht) }}</div>
          </div>
          <div class="col">
            <div class="text-caption text-grey-7">Timbre quittance</div>
            <div class="text-weight-medium">{{ fmtCur(aReport.report.value.total_stamp_duty) }}</div>
          </div>
          <div class="col">
            <div class="text-caption text-grey-7">Généré le</div>
            <div class="text-weight-medium">{{ aReport.report.value.generated_at ? new Date(aReport.report.value.generated_at).toLocaleString('fr-FR') : '—' }}</div>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- History -->
    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Historique des A-Rapports</div>
      </q-card-section>
      <q-table
        :rows="aReport.history.value"
        :columns="historyColumns"
        row-key="id"
        :loading="aReport.loading.value"
        flat
        bordered
        :pagination="{ rowsPerPage: 10 }"
        no-data-label="Aucun A-Rapport généré"
      />
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useCompanyStore } from 'src/stores/company-store';
import { useAReport } from 'src/composables/useAReport';

const companyStore = useCompanyStore();
const aReport = useAReport();

const periodStart = ref('');
const periodEnd = ref('');

function fmtCur(n: number): string {
  return new Intl.NumberFormat('fr-BF', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);
}

const typeBreakdown = computed(() => {
  const r = aReport.report.value;
  if (!r) return [];
  return [
    { code: 'FV', label: 'Facture de vente', amount: r.total_fv },
    { code: 'FT', label: "Facture d'acompte", amount: r.total_ft },
    { code: 'FA', label: "Facture d'avoir", amount: r.total_fa },
    { code: 'EV', label: 'Export vente', amount: r.total_ev },
    { code: 'ET', label: 'Export acompte', amount: r.total_et },
    { code: 'EA', label: 'Export avoir', amount: r.total_ea },
  ].filter(t => t.amount !== 0);
});

const historyColumns = [
  { name: 'period_start', label: 'Début', field: 'period_start', align: 'left' as const, sortable: true },
  { name: 'period_end', label: 'Fin', field: 'period_end', align: 'left' as const, sortable: true },
  { name: 'invoice_count', label: 'Factures', field: 'invoice_count', align: 'center' as const },
  { name: 'total_ttc', label: 'Total TTC', field: 'total_ttc', align: 'right' as const, format: (v: number) => fmtCur(v) },
  { name: 'total_tva', label: 'TVA', field: 'total_tva', align: 'right' as const, format: (v: number) => fmtCur(v) },
  { name: 'generated_at', label: 'Généré le', field: 'generated_at', align: 'left' as const, format: (v: string) => v ? new Date(v).toLocaleString('fr-FR') : '—' },
];

async function generate() {
  const cid = companyStore.companyId;
  if (!cid || !periodStart.value || !periodEnd.value) return;
  await aReport.generateReport(cid, periodStart.value, periodEnd.value);
  await aReport.loadHistory(cid);
}

onMounted(async () => {
  const cid = companyStore.companyId;
  if (cid) await aReport.loadHistory(cid);
});
</script>
