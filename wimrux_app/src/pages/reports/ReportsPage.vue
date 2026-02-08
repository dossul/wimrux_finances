<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5">Rapports</div>
      <q-space />
      <q-btn outline color="primary" icon="download" label="Export CSV" no-caps size="sm" @click="exportReportCsv" />
    </div>

    <!-- Filters -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-gutter-sm items-end">
          <q-select v-model="period" :options="periodOptions" emit-value map-options outlined dense label="Période" style="min-width: 180px" />
          <q-input v-model="dateFrom" outlined dense type="date" label="Du" style="width: 160px" />
          <q-input v-model="dateTo" outlined dense type="date" label="Au" style="width: 160px" />
          <q-btn color="primary" icon="refresh" label="Générer" no-caps @click="generateReport" :loading="loading" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Tabs -->
    <q-tabs v-model="activeTab" dense class="text-grey q-mb-md" active-color="primary" indicator-color="primary" align="left" narrow-indicator>
      <q-tab name="summary" label="Synthèse" icon="bar_chart" no-caps />
      <q-tab name="income" label="Compte de résultat" icon="receipt_long" no-caps />
      <q-tab name="aging" label="Balance âgée" icon="schedule" no-caps />
    </q-tabs>

    <q-tab-panels v-model="activeTab" animated>
      <!-- Summary tab -->
      <q-tab-panel name="summary" class="q-pa-none">
        <!-- Summary KPIs -->
        <div class="row q-gutter-md q-mb-lg">
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-caption text-grey-7">Total factures</div>
                <div class="text-h5 text-weight-bold">{{ report.totalCount }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-caption text-grey-7">CA HT</div>
                <div class="text-h5 text-weight-bold text-blue">{{ fmtCur(report.totalHT) }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-caption text-grey-7">TVA collectée</div>
                <div class="text-h5 text-weight-bold text-orange">{{ fmtCur(report.totalTVA) }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="col-12 col-sm-6 col-md-3">
            <q-card flat bordered>
              <q-card-section>
                <div class="text-caption text-grey-7">CA TTC</div>
                <div class="text-h5 text-weight-bold text-green">{{ fmtCur(report.totalTTC) }}</div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- Breakdown by type -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-sm">Répartition par type de facture</div>
            <q-markup-table flat bordered separator="cell">
              <thead>
                <tr>
                  <th class="text-left">Type</th>
                  <th class="text-right">Nombre</th>
                  <th class="text-right">HT</th>
                  <th class="text-right">TVA</th>
                  <th class="text-right">TTC</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in report.byType" :key="row.type">
                  <td><q-badge :color="typeColor(row.type)" :label="row.type" /> {{ row.label }}</td>
                  <td class="text-right">{{ row.count }}</td>
                  <td class="text-right">{{ fmtCur(row.ht) }}</td>
                  <td class="text-right">{{ fmtCur(row.tva) }}</td>
                  <td class="text-right text-weight-bold">{{ fmtCur(row.ttc) }}</td>
                </tr>
              </tbody>
            </q-markup-table>
          </q-card-section>
        </q-card>

        <!-- Breakdown by tax group -->
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-sm">Répartition par groupe de taxation</div>
            <q-markup-table flat bordered separator="cell">
              <thead>
                <tr>
                  <th class="text-left">Groupe</th>
                  <th class="text-right">HT</th>
                  <th class="text-right">TVA</th>
                  <th class="text-right">PSVB</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in report.byTaxGroup" :key="row.group" v-show="row.ht > 0 || row.tva > 0">
                  <td class="text-weight-medium">{{ row.group }} — {{ row.description }}</td>
                  <td class="text-right">{{ fmtCur(row.ht) }}</td>
                  <td class="text-right">{{ fmtCur(row.tva) }}</td>
                  <td class="text-right">{{ fmtCur(row.psvb) }}</td>
                </tr>
              </tbody>
            </q-markup-table>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- Income Statement tab -->
      <q-tab-panel name="income" class="q-pa-none">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-md">Compte de résultat simplifié</div>
            <q-markup-table flat bordered separator="horizontal">
              <thead>
                <tr class="bg-grey-2">
                  <th class="text-left">Poste</th>
                  <th class="text-right">Montant (XOF)</th>
                </tr>
              </thead>
              <tbody>
                <tr class="text-weight-bold bg-blue-1">
                  <td>PRODUITS</td>
                  <td class="text-right">{{ fmtCur(income.totalRevenue) }}</td>
                </tr>
                <tr>
                  <td class="q-pl-lg">Ventes de biens et services (HT)</td>
                  <td class="text-right">{{ fmtCur(income.salesHT) }}</td>
                </tr>
                <tr>
                  <td class="q-pl-lg">Avoirs émis (déduction)</td>
                  <td class="text-right text-red">- {{ fmtCur(income.creditNotes) }}</td>
                </tr>
                <tr class="text-weight-bold bg-orange-1">
                  <td>CHARGES FISCALES</td>
                  <td class="text-right">{{ fmtCur(income.totalTax) }}</td>
                </tr>
                <tr>
                  <td class="q-pl-lg">TVA collectée</td>
                  <td class="text-right">{{ fmtCur(income.tvaCollected) }}</td>
                </tr>
                <tr>
                  <td class="q-pl-lg">PSVB</td>
                  <td class="text-right">{{ fmtCur(income.psvbTotal) }}</td>
                </tr>
                <tr>
                  <td class="q-pl-lg">Timbre quittance</td>
                  <td class="text-right">{{ fmtCur(income.stampDuty) }}</td>
                </tr>
                <tr class="text-weight-bold text-h6 bg-green-1">
                  <td>RÉSULTAT NET (CA TTC)</td>
                  <td class="text-right">{{ fmtCur(income.netResult) }}</td>
                </tr>
              </tbody>
            </q-markup-table>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- Aging Balance tab -->
      <q-tab-panel name="aging" class="q-pa-none">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-md">Balance âgée des créances clients</div>
            <q-markup-table flat bordered separator="cell">
              <thead>
                <tr class="bg-grey-2">
                  <th class="text-left">Client</th>
                  <th class="text-right">Total dû (TTC)</th>
                  <th class="text-right">0-30 jours</th>
                  <th class="text-right">31-60 jours</th>
                  <th class="text-right">61-90 jours</th>
                  <th class="text-right">&gt; 90 jours</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in aging" :key="row.clientId">
                  <td class="text-weight-medium">{{ row.clientName }}</td>
                  <td class="text-right text-weight-bold">{{ fmtCur(row.total) }}</td>
                  <td class="text-right">{{ fmtCur(row.d30) }}</td>
                  <td class="text-right">{{ fmtCur(row.d60) }}</td>
                  <td class="text-right" :class="{ 'text-orange': row.d90 > 0 }">{{ fmtCur(row.d90) }}</td>
                  <td class="text-right" :class="{ 'text-red text-weight-bold': row.d90plus > 0 }">{{ fmtCur(row.d90plus) }}</td>
                </tr>
                <tr v-if="aging.length === 0">
                  <td colspan="6" class="text-center text-grey-5">Aucune créance en attente</td>
                </tr>
                <tr class="text-weight-bold bg-grey-2" v-if="aging.length > 0">
                  <td>TOTAL</td>
                  <td class="text-right">{{ fmtCur(agingTotals.total) }}</td>
                  <td class="text-right">{{ fmtCur(agingTotals.d30) }}</td>
                  <td class="text-right">{{ fmtCur(agingTotals.d60) }}</td>
                  <td class="text-right">{{ fmtCur(agingTotals.d90) }}</td>
                  <td class="text-right">{{ fmtCur(agingTotals.d90plus) }}</td>
                </tr>
              </tbody>
            </q-markup-table>
          </q-card-section>
        </q-card>
      </q-tab-panel>
    </q-tab-panels>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { insforge } from 'src/boot/insforge';
import { TAX_GROUP_RATES } from 'src/composables/useTaxCalculation';
import { useExportCsv } from 'src/composables/useExportCsv';
import type { Invoice, Client, TaxGroup } from 'src/types';

const loading = ref(false);
const dateFrom = ref('');
const dateTo = ref('');
const period = ref('month');
const activeTab = ref('summary');
const { exportGeneric } = useExportCsv();

const periodOptions = [
  { label: 'Ce mois', value: 'month' },
  { label: 'Ce trimestre', value: 'quarter' },
  { label: 'Cette année', value: 'year' },
  { label: 'Personnalisé', value: 'custom' },
];

interface TypeRow { type: string; label: string; count: number; ht: number; tva: number; ttc: number }
interface TaxRow { group: string; description: string; ht: number; tva: number; psvb: number }
interface AgingRow { clientId: string; clientName: string; total: number; d30: number; d60: number; d90: number; d90plus: number }

const allInvoices = ref<Invoice[]>([]);
const allClients = ref<Client[]>([]);

const report = ref({
  totalCount: 0,
  totalHT: 0,
  totalTVA: 0,
  totalTTC: 0,
  byType: [] as TypeRow[],
  byTaxGroup: [] as TaxRow[],
});

const income = ref({
  salesHT: 0,
  creditNotes: 0,
  totalRevenue: 0,
  tvaCollected: 0,
  psvbTotal: 0,
  stampDuty: 0,
  totalTax: 0,
  netResult: 0,
});

const aging = ref<AgingRow[]>([]);

const agingTotals = computed(() => {
  const t = { total: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 };
  for (const r of aging.value) {
    t.total += r.total; t.d30 += r.d30; t.d60 += r.d60; t.d90 += r.d90; t.d90plus += r.d90plus;
  }
  return t;
});

const typeLabels: Record<string, string> = {
  FV: 'Facture de vente', FT: "Facture d'acompte", FA: "Facture d'avoir",
  EV: 'Export vente', ET: 'Export acompte', EA: 'Export avoir',
};

function typeColor(t: string) {
  const map: Record<string, string> = { FV: 'blue', FT: 'teal', FA: 'orange', EV: 'indigo', ET: 'cyan', EA: 'deep-orange' };
  return map[t] || 'grey';
}

function fmtCur(n: number) {
  return new Intl.NumberFormat('fr-BF', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);
}

function getDateRange() {
  const now = new Date();
  if (period.value === 'custom') {
    return { from: dateFrom.value ? dateFrom.value + 'T00:00:00' : '', to: dateTo.value ? dateTo.value + 'T23:59:59' : '' };
  }
  let start: Date;
  if (period.value === 'quarter') {
    const q = Math.floor(now.getMonth() / 3) * 3;
    start = new Date(now.getFullYear(), q, 1);
  } else if (period.value === 'year') {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { from: start.toISOString(), to: now.toISOString() };
}

function computeIncome(invoices: Invoice[]) {
  const sales = invoices.filter(i => i.type === 'FV' || i.type === 'FT' || i.type === 'EV' || i.type === 'ET');
  const credits = invoices.filter(i => i.type === 'FA' || i.type === 'EA');

  income.value.salesHT = sales.reduce((s, i) => s + (i.total_ht || 0), 0);
  income.value.creditNotes = credits.reduce((s, i) => s + (i.total_ht || 0), 0);
  income.value.totalRevenue = income.value.salesHT - income.value.creditNotes;
  income.value.tvaCollected = invoices.reduce((s, i) => s + (i.total_tva || 0), 0);
  income.value.psvbTotal = invoices.reduce((s, i) => s + (i.total_psvb || 0), 0);
  income.value.stampDuty = invoices.reduce((s, i) => s + (i.stamp_duty || 0), 0);
  income.value.totalTax = income.value.tvaCollected + income.value.psvbTotal + income.value.stampDuty;
  income.value.netResult = invoices.reduce((s, i) => s + (i.total_ttc || 0), 0);
}

function computeAging(invoices: Invoice[], clients: Client[]) {
  const now = Date.now();
  // Only validated (not yet paid/certified) invoices represent outstanding receivables
  const unpaid = invoices.filter(i => i.status === 'validated' && i.client_id);
  const byClient = new Map<string, AgingRow>();

  for (const inv of unpaid) {
    const cid = inv.client_id || '';
    if (!byClient.has(cid)) {
      const client = clients.find(c => c.id === cid);
      byClient.set(cid, { clientId: cid, clientName: client?.name || 'Inconnu', total: 0, d30: 0, d60: 0, d90: 0, d90plus: 0 });
    }
    const row = byClient.get(cid);
    if (!row) continue;
    const amount = inv.total_ttc || 0;
    const days = Math.floor((now - new Date(inv.created_at).getTime()) / 86400000);
    row.total += amount;
    if (days <= 30) row.d30 += amount;
    else if (days <= 60) row.d60 += amount;
    else if (days <= 90) row.d90 += amount;
    else row.d90plus += amount;
  }
  aging.value = [...byClient.values()].sort((a, b) => b.total - a.total);
}

async function generateReport() {
  loading.value = true;
  try {
    const range = getDateRange();

    // Load invoices
    let query = insforge.database
      .from('invoices')
      .select('*')
      .in('status', ['validated', 'certified']);
    if (range.from) query = query.gte('created_at', range.from);
    if (range.to) query = query.lte('created_at', range.to);
    const { data } = await query;
    const invoices = (data || []) as Invoice[];
    allInvoices.value = invoices;

    // Load clients for aging
    const { data: clientData } = await insforge.database.from('clients').select('id, name');
    allClients.value = (clientData || []) as Client[];

    // Summary
    report.value.totalCount = invoices.length;
    report.value.totalHT = invoices.reduce((s, i) => s + (i.total_ht || 0), 0);
    report.value.totalTVA = invoices.reduce((s, i) => s + (i.total_tva || 0), 0);
    report.value.totalTTC = invoices.reduce((s, i) => s + (i.total_ttc || 0), 0);

    // By type
    const types = ['FV', 'FT', 'FA', 'EV', 'ET', 'EA'];
    report.value.byType = types.map(t => {
      const group = invoices.filter(i => i.type === t);
      return {
        type: t,
        label: typeLabels[t] || t,
        count: group.length,
        ht: group.reduce((s, i) => s + (i.total_ht || 0), 0),
        tva: group.reduce((s, i) => s + (i.total_tva || 0), 0),
        ttc: group.reduce((s, i) => s + (i.total_ttc || 0), 0),
      };
    });

    // By tax group
    const groups: TaxGroup[] = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P'];
    report.value.byTaxGroup = groups.map(g => {
      let ht = 0, tva = 0, psvb = 0;
      for (const inv of invoices) {
        const calc = inv.tax_calculation;
        if (calc) {
          ht += calc.totalHT?.[g] || 0;
          tva += calc.tva?.[g] || 0;
          psvb += calc.psvb?.[g] || 0;
        }
      }
      return { group: g, description: TAX_GROUP_RATES[g].description, ht, tva, psvb };
    });

    // Income statement + aging
    computeIncome(invoices);
    computeAging(invoices, allClients.value);
  } finally {
    loading.value = false;
  }
}

function exportReportCsv() {
  const rows = report.value.byType.map(r => ({
    Type: r.type, Label: r.label, Nombre: r.count, HT: r.ht, TVA: r.tva, TTC: r.ttc,
  }));
  exportGeneric(
    ['Type', 'Label', 'Nombre', 'HT', 'TVA', 'TTC'],
    rows.map(r => [r.Type, r.Label, r.Nombre, r.HT, r.TVA, r.TTC]),
    `rapport_${period.value}.csv`,
  );
}

onMounted(generateReport);
</script>
