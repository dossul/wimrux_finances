<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Rapports</div>

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
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { insforge } from 'src/boot/insforge';
import { TAX_GROUP_RATES } from 'src/composables/useTaxCalculation';
import type { Invoice, TaxGroup } from 'src/types';

const loading = ref(false);
const dateFrom = ref('');
const dateTo = ref('');
const period = ref('month');

const periodOptions = [
  { label: 'Ce mois', value: 'month' },
  { label: 'Ce trimestre', value: 'quarter' },
  { label: 'Cette année', value: 'year' },
  { label: 'Personnalisé', value: 'custom' },
];

interface TypeRow { type: string; label: string; count: number; ht: number; tva: number; ttc: number }
interface TaxRow { group: string; description: string; ht: number; tva: number; psvb: number }

const report = ref({
  totalCount: 0,
  totalHT: 0,
  totalTVA: 0,
  totalTTC: 0,
  byType: [] as TypeRow[],
  byTaxGroup: [] as TaxRow[],
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

async function generateReport() {
  loading.value = true;
  try {
    const range = getDateRange();
    let query = insforge.database
      .from('invoices')
      .select('*')
      .in('status', ['validated', 'certified']);

    if (range.from) query = query.gte('created_at', range.from);
    if (range.to) query = query.lte('created_at', range.to);

    const { data } = await query;
    const invoices = (data || []) as Invoice[];

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

    // By tax group (from tax_calculation JSON)
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
  } finally {
    loading.value = false;
  }
}

onMounted(generateReport);
</script>
