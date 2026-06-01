<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Rapports standards</div>
        <div class="text-caption text-grey-7">Bilan comptable · Compte de résultat · Exports</div>
      </div>
      <q-space />
      <q-btn-dropdown color="primary" icon="download" label="Exporter" no-caps>
        <q-list>
          <q-item clickable v-close-popup @click="exportBilanCSV">
            <q-item-section avatar><q-icon name="description" /></q-item-section>
            <q-item-section>Bilan en CSV</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="exportBilanPDF">
            <q-item-section avatar><q-icon name="picture_as_pdf" /></q-item-section>
            <q-item-section>Bilan en PDF (HTML)</q-item-section>
          </q-item>
          <q-separator />
          <q-item clickable v-close-popup @click="exportResultatCSV">
            <q-item-section avatar><q-icon name="description" /></q-item-section>
            <q-item-section>Compte de résultat CSV</q-item-section>
          </q-item>
          <q-item clickable v-close-popup @click="exportResultatPDF">
            <q-item-section avatar><q-icon name="picture_as_pdf" /></q-item-section>
            <q-item-section>Compte de résultat PDF</q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
    </div>

    <!-- Onglets -->
    <q-tabs v-model="activeTab" align="left" dense narrow-indicator class="q-mb-md text-primary">
      <q-tab name="bilan" icon="account_balance" label="Bilan" />
      <q-tab name="resultat" icon="trending_up" label="Compte de résultat" />
      <q-tab name="historique" icon="history" label="Historique exports" />
    </q-tabs>
    <q-separator class="q-mb-md" />

    <!-- BILAN -->
    <div v-if="activeTab === 'bilan'">
      <div v-if="!balanceSheet && !loading" class="text-center q-pa-xl text-grey-6">
        <q-icon name="account_balance" size="64px" /><br>
        <div class="q-mt-md">Aucune donnée disponible</div>
      </div>

      <div v-if="balanceSheet" class="row q-col-gutter-md">
        <!-- KPIs -->
        <div class="col-12">
          <div class="row q-gutter-md q-mb-md">
            <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
              <div class="text-caption text-grey-6">Total Actif</div>
              <div class="text-h6 text-weight-bold text-primary">{{ fmt(balanceSheet.total_actif) }}</div>
            </q-card-section></q-card>
            <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
              <div class="text-caption text-grey-6">Capitaux propres</div>
              <div class="text-h6 text-weight-bold" :class="balanceSheet.capitaux_propres >= 0 ? 'text-positive' : 'text-negative'">
                {{ fmt(balanceSheet.capitaux_propres) }}
              </div>
            </q-card-section></q-card>
            <q-card v-if="ratios" flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
              <div class="text-caption text-grey-6">Ratio d'endettement</div>
              <div class="text-h6 text-weight-bold" :class="ratios.debtRatio > 60 ? 'text-negative' : 'text-positive'">
                {{ ratios.debtRatio.toFixed(1) }}%
              </div>
            </q-card-section></q-card>
            <q-card v-if="ratios && ratios.liquidityRatio !== null" flat bordered class="col-auto kpi">
              <q-card-section class="q-pa-md text-center">
                <div class="text-caption text-grey-6">Ratio de liquidité</div>
                <div class="text-h6 text-weight-bold" :class="ratios.liquidityRatio < 1 ? 'text-negative' : 'text-positive'">
                  {{ ratios.liquidityRatio.toFixed(2) }}
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <!-- ACTIF -->
        <div class="col-12 col-md-6">
          <q-card flat bordered>
            <q-card-section class="bg-blue-1">
              <div class="text-h6 text-weight-bold text-primary">ACTIF</div>
            </q-card-section>
            <q-list separator>
              <q-item><q-item-section>Immobilisations nettes</q-item-section>
                <q-item-section side><span class="text-weight-medium">{{ fmt(balanceSheet.immobilisations_nettes) }}</span></q-item-section></q-item>
              <q-item><q-item-section>Créances clients</q-item-section>
                <q-item-section side><span class="text-weight-medium">{{ fmt(balanceSheet.creances_clients) }}</span></q-item-section></q-item>
              <q-item><q-item-section>Trésorerie - Banque</q-item-section>
                <q-item-section side><span class="text-weight-medium">{{ fmt(balanceSheet.tresorerie_banque) }}</span></q-item-section></q-item>
              <q-item><q-item-section>Trésorerie - Petite caisse</q-item-section>
                <q-item-section side><span class="text-weight-medium">{{ fmt(balanceSheet.tresorerie_caisse) }}</span></q-item-section></q-item>
              <q-item><q-item-section>Trésorerie - Wallets mobiles</q-item-section>
                <q-item-section side><span class="text-weight-medium">{{ fmt(balanceSheet.tresorerie_wallets) }}</span></q-item-section></q-item>
              <q-item><q-item-section>Placements financiers</q-item-section>
                <q-item-section side><span class="text-weight-medium">{{ fmt(balanceSheet.placements_financiers) }}</span></q-item-section></q-item>
              <q-item class="bg-blue-1"><q-item-section><span class="text-weight-bold">TOTAL ACTIF</span></q-item-section>
                <q-item-section side><span class="text-h6 text-weight-bold text-primary">{{ fmt(balanceSheet.total_actif) }}</span></q-item-section></q-item>
            </q-list>
          </q-card>
        </div>

        <!-- PASSIF -->
        <div class="col-12 col-md-6">
          <q-card flat bordered>
            <q-card-section class="bg-orange-1">
              <div class="text-h6 text-weight-bold text-orange-9">PASSIF</div>
            </q-card-section>
            <q-list separator>
              <q-item><q-item-section>Capitaux propres</q-item-section>
                <q-item-section side>
                  <span class="text-weight-medium" :class="balanceSheet.capitaux_propres >= 0 ? '' : 'text-negative'">
                    {{ fmt(balanceSheet.capitaux_propres) }}
                  </span>
                </q-item-section></q-item>
              <q-item><q-item-section>Dettes financières (emprunts)</q-item-section>
                <q-item-section side><span class="text-weight-medium">{{ fmt(balanceSheet.dettes_financieres) }}</span></q-item-section></q-item>
              <q-item><q-item-section>Dettes fournisseurs</q-item-section>
                <q-item-section side><span class="text-weight-medium">{{ fmt(balanceSheet.dettes_fournisseurs) }}</span></q-item-section></q-item>
              <q-item class="bg-orange-1"><q-item-section><span class="text-weight-bold">TOTAL PASSIF</span></q-item-section>
                <q-item-section side><span class="text-h6 text-weight-bold text-orange-9">{{ fmt(balanceSheet.total_passif) }}</span></q-item-section></q-item>
            </q-list>
          </q-card>
        </div>
      </div>
    </div>

    <!-- COMPTE DE RESULTAT -->
    <div v-if="activeTab === 'resultat'">
      <q-card flat bordered class="q-mb-md">
        <q-card-section class="row items-center q-gutter-md">
          <q-select v-model="viewMode" :options="viewModeOptions" label="Vue" outlined dense
            emit-value map-options style="min-width:160px" @update:model-value="onViewModeChange" />
          <q-select v-if="viewMode === 'monthly'" v-model="filterYear" :options="availableYears"
            label="Année" outlined dense @update:model-value="loadResultat" style="min-width:120px" />
          <q-space />
          <div v-if="currentYear" class="text-caption text-grey-7">
            Marge nette : <span class="text-weight-bold" :class="currentYear.margin >= 0 ? 'text-positive' : 'text-negative'">
              {{ currentYear.margin.toFixed(1) }}%
            </span>
            <span v-if="currentYear.growth !== null" class="q-ml-md">
              Croissance CA : <span class="text-weight-bold" :class="currentYear.growth >= 0 ? 'text-positive' : 'text-negative'">
                {{ currentYear.growth >= 0 ? '+' : '' }}{{ currentYear.growth.toFixed(1) }}%
              </span>
            </span>
          </div>
        </q-card-section>
      </q-card>

      <q-card flat bordered>
        <q-table :rows="resultatRows" :columns="resultatColumns" row-key="row_key" flat dense
          :pagination="{ rowsPerPage: 24 }" :loading="loading">
          <template #body-cell-resultat_net="props">
            <q-td :props="props">
              <span class="text-weight-bold" :class="(props.row.resultat_net as number) >= 0 ? 'text-positive' : 'text-negative'">
                {{ fmt(props.row.resultat_net as number) }}
              </span>
            </q-td>
          </template>
          <template #no-data>
            <div class="full-width text-center q-pa-xl text-grey-6">
              <q-icon name="trending_up" size="48px" /><br>Aucune donnée pour cette période
            </div>
          </template>
        </q-table>
      </q-card>
    </div>

    <!-- HISTORIQUE EXPORTS -->
    <div v-if="activeTab === 'historique'">
      <q-card flat bordered>
        <q-table :rows="exportsList" :columns="exportColumns" row-key="id" flat dense
          :pagination="{ rowsPerPage: 25 }" :loading="loading">
          <template #body-cell-status="props">
            <q-td :props="props"><q-badge :color="exportStatusColor(props.value)" :label="props.value" /></q-td>
          </template>
          <template #body-cell-actions="props">
            <q-td :props="props" class="text-right">
              <q-btn v-if="props.row.file_url" flat round dense size="sm" icon="download" color="primary"
                :href="props.row.file_url" target="_blank" />
              <q-btn flat round dense size="sm" icon="delete" color="negative" @click="confirmDeleteExport(props.row.id)" />
            </q-td>
          </template>
          <template #no-data>
            <div class="full-width text-center q-pa-xl text-grey-6">
              <q-icon name="history" size="48px" /><br>Aucun export
            </div>
          </template>
        </q-table>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useFinancialReports } from 'src/composables/useFinancialReports';
import { useReportExports } from 'src/composables/useReportExports';

const $q = useQuasar();
const {
  balanceSheet, incomeStatementMonthly, incomeStatementYearly,
  loading, currentYearStats, balanceSheetRatios,
  loadBalanceSheet, loadIncomeStatementMonthly, loadIncomeStatementYearly,
  balanceSheetToCSV, incomeStatementToCSV,
} = useFinancialReports();

const {
  exports: exportsList,
  loadExports, deleteExport,
  exportAndDownloadCSV, exportAndDownloadHTML,
  rowsToHtml, downloadContent,
  reportTypeLabel,
} = useReportExports();

const activeTab = ref<'bilan' | 'resultat' | 'historique'>('bilan');
const viewMode = ref<'monthly' | 'yearly'>('yearly');
const filterYear = ref<number>(new Date().getFullYear());

const viewModeOptions = [
  { label: 'Annuel', value: 'yearly' },
  { label: 'Mensuel', value: 'monthly' },
];

const ratios = computed(() => balanceSheetRatios.value);
const currentYear = computed(() => currentYearStats.value);

const availableYears = computed(() => {
  const years = new Set(incomeStatementYearly.value.map(s => s.year));
  years.add(new Date().getFullYear());
  return Array.from(years).sort((a, b) => b - a);
});

const resultatRows = computed(() => {
  const rows = viewMode.value === 'yearly' ? incomeStatementYearly.value : incomeStatementMonthly.value;
  return rows.map((r, i) => ({
    ...r,
    row_key: `${r.year}_${r.month ?? 'all'}_${i}`,
    period_label: viewMode.value === 'yearly'
      ? String(r.year)
      : `${monthLabel(r.month)} ${r.year}`,
  }));
});

const resultatColumns = computed(() => {
  const cols = [
    { name: 'period_label', label: 'Période', field: 'period_label', align: 'left' as const, sortable: true },
    { name: 'chiffre_affaires', label: 'CA', field: 'chiffre_affaires', align: 'right' as const,
      format: (v: number) => fmt(v) },
    { name: 'charges_externes', label: 'Charges ext.', field: 'charges_externes', align: 'right' as const,
      format: (v: number) => fmt(v) },
    { name: 'dotations_amortissements', label: 'Dotations', field: 'dotations_amortissements', align: 'right' as const,
      format: (v: number) => fmt(v) },
    { name: 'charges_financieres', label: 'Charges fin.', field: 'charges_financieres', align: 'right' as const,
      format: (v: number) => fmt(v) },
    { name: 'impots_taxes', label: 'Impôts', field: 'impots_taxes', align: 'right' as const,
      format: (v: number) => fmt(v) },
    { name: 'resultat_net', label: 'Résultat net', field: 'resultat_net', align: 'right' as const },
  ];
  return cols;
});

const exportColumns = [
  { name: 'created_at', label: 'Date', field: (r: { created_at: string }) => r.created_at?.slice(0, 16).replace('T', ' '), align: 'left' as const },
  { name: 'report_type', label: 'Type', field: (r: { report_type: 'balance_sheet' | 'income_statement' | 'cashflow' | 'aged_receivables' | 'tax_summary' | 'budget_vs_actual' | 'saved_query' | 'custom' }) => reportTypeLabel(r.report_type), align: 'left' as const },
  { name: 'format', label: 'Format', field: (r: { format: string }) => r.format.toUpperCase(), align: 'center' as const },
  { name: 'status', label: 'Statut', field: 'status', align: 'center' as const },
  { name: 'actions', label: '', field: '', align: 'right' as const },
];

async function loadResultat() {
  if (viewMode.value === 'yearly') {
    await loadIncomeStatementYearly();
  } else {
    await loadIncomeStatementMonthly(filterYear.value);
  }
}

async function onViewModeChange() {
  await loadResultat();
}

// --- Exports ---
async function exportBilanCSV() {
  if (!balanceSheet.value) { $q.notify({ type: 'warning', message: 'Aucun bilan à exporter' }); return; }
  const csv = balanceSheetToCSV();
  const filename = `bilan_${new Date().toISOString().slice(0, 10)}.csv`;
  await exportAndDownloadCSV('balance_sheet', csv, filename);
  $q.notify({ type: 'positive', message: 'Bilan exporté' });
}

async function exportBilanPDF() {
  if (!balanceSheet.value) { $q.notify({ type: 'warning', message: 'Aucun bilan à exporter' }); return; }
  const b = balanceSheet.value;
  const rows = [
    { Poste: 'Immobilisations nettes', Montant: fmt(b.immobilisations_nettes) },
    { Poste: 'Créances clients', Montant: fmt(b.creances_clients) },
    { Poste: 'Trésorerie banque', Montant: fmt(b.tresorerie_banque) },
    { Poste: 'Trésorerie caisse', Montant: fmt(b.tresorerie_caisse) },
    { Poste: 'Trésorerie wallets', Montant: fmt(b.tresorerie_wallets) },
    { Poste: 'Placements financiers', Montant: fmt(b.placements_financiers) },
    { Poste: 'TOTAL ACTIF', Montant: fmt(b.total_actif) },
    { Poste: 'Dettes fournisseurs', Montant: fmt(b.dettes_fournisseurs) },
    { Poste: 'Dettes financières', Montant: fmt(b.dettes_financieres) },
    { Poste: 'Capitaux propres', Montant: fmt(b.capitaux_propres) },
    { Poste: 'TOTAL PASSIF', Montant: fmt(b.total_passif) },
  ];
  const filename = `bilan_${new Date().toISOString().slice(0, 10)}.html`;
  await exportAndDownloadHTML('balance_sheet', rows, 'Bilan comptable', filename);
  $q.notify({ type: 'positive', message: 'Bilan exporté (HTML imprimable)' });
}

async function exportResultatCSV() {
  const rows = viewMode.value === 'yearly' ? incomeStatementYearly.value : incomeStatementMonthly.value;
  if (!rows.length) { $q.notify({ type: 'warning', message: 'Aucune donnée' }); return; }
  const csv = incomeStatementToCSV(rows);
  const filename = `compte_resultat_${viewMode.value}_${new Date().toISOString().slice(0, 10)}.csv`;
  await exportAndDownloadCSV('income_statement', csv, filename);
  $q.notify({ type: 'positive', message: 'Compte de résultat exporté' });
}

async function exportResultatPDF() {
  const rows = resultatRows.value.map(r => ({
    'Période': r.period_label,
    'CA': fmt(r.chiffre_affaires),
    'Charges externes': fmt(r.charges_externes),
    'Dotations': fmt(r.dotations_amortissements),
    'Charges fin.': fmt(r.charges_financieres),
    'Impôts': fmt(r.impots_taxes),
    'Résultat net': fmt(r.resultat_net),
  }));
  if (!rows.length) { $q.notify({ type: 'warning', message: 'Aucune donnée' }); return; }
  const filename = `compte_resultat_${new Date().toISOString().slice(0, 10)}.html`;
  await exportAndDownloadHTML('income_statement', rows, 'Compte de résultat', filename);
  $q.notify({ type: 'positive', message: 'Exporté (HTML imprimable)' });
}

function confirmDeleteExport(id: string) {
  $q.dialog({
    title: 'Supprimer cet export ?',
    message: 'Cette action est irréversible.',
    cancel: true, persistent: true,
  }).onOk(async () => {
    const ok = await deleteExport(id);
    $q.notify({ type: ok ? 'positive' : 'negative', message: ok ? 'Supprimé' : 'Erreur' });
  });
}

// --- Helpers ---
function fmt(v: number): string {
  return new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' FCFA';
}

function monthLabel(m?: number): string {
  if (!m) return '';
  return ['Jan','Fév','Mars','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc'][m - 1] || String(m);
}

function exportStatusColor(s: string): string {
  return ({ pending: 'orange', processing: 'blue', completed: 'positive', failed: 'negative', expired: 'grey' }[s]) || 'grey';
}

// Suppress unused warnings
void rowsToHtml; void downloadContent;

onMounted(async () => {
  await Promise.all([
    loadBalanceSheet(),
    loadIncomeStatementYearly(),
    loadExports(),
  ]);
});
</script>

<style scoped>
.kpi { min-width: 180px; }
</style>
