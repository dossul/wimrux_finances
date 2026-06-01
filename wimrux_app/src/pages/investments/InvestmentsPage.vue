<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Investissements</div>
        <div class="text-caption text-grey-7">Portefeuille · valorisation · rendement</div>
      </div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nouvel investissement" no-caps @click="openCreate" />
    </div>

    <!-- KPI -->
    <div class="row q-gutter-md q-mb-lg">
      <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Investissements actifs</div>
        <div class="text-h5 text-weight-bold text-primary">{{ stats.activeCount }}</div>
      </q-card-section></q-card>
      <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Total investi</div>
        <div class="text-h6 text-weight-bold">{{ fmt(stats.totalInvested) }}</div>
      </q-card-section></q-card>
      <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Valeur actuelle</div>
        <div class="text-h6 text-weight-bold">{{ fmt(stats.currentValue) }}</div>
      </q-card-section></q-card>
      <q-card flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">Rendement</div>
        <div class="text-h6 text-weight-bold" :class="stats.totalReturn >= 0 ? 'text-positive' : 'text-negative'">
          {{ stats.totalReturn >= 0 ? '+' : '' }}{{ fmt(stats.totalReturn) }}
          ({{ stats.returnPct.toFixed(1) }}%)
        </div>
      </q-card-section></q-card>
      <q-card v-if="stats.realizedPL !== 0" flat bordered class="col-auto kpi"><q-card-section class="q-pa-md text-center">
        <div class="text-caption text-grey-6">+/- Value réalisée</div>
        <div class="text-h6 text-weight-bold" :class="stats.realizedPL >= 0 ? 'text-positive' : 'text-negative'">
          {{ fmt(stats.realizedPL) }}
        </div>
      </q-card-section></q-card>
    </div>

    <!-- Répartition portefeuille -->
    <q-card v-if="portfolioBreakdown.length" flat bordered class="q-mb-md q-pa-md">
      <div class="text-subtitle2 q-mb-sm">Répartition du portefeuille</div>
      <div class="portfolio-bar row">
        <div v-for="b in portfolioBreakdown" :key="b.type"
          class="portfolio-segment" :class="'bg-' + typeColor(b.type)"
          :style="{ width: pct(b.value, stats.currentValue) + '%' }"
          :title="`${typeLabel(b.type)} : ${fmt(b.value)} (${pct(b.value, stats.currentValue)}%)`">
        </div>
      </div>
      <div class="row q-gutter-md q-mt-sm">
        <div v-for="b in portfolioBreakdown" :key="b.type" class="row items-center q-gutter-xs">
          <div class="legend-dot" :class="'bg-' + typeColor(b.type)" />
          <span class="text-caption">{{ typeLabel(b.type) }} : {{ pct(b.value, stats.currentValue) }}%</span>
        </div>
      </div>
    </q-card>

    <!-- Table -->
    <q-card flat bordered>
      <q-table :rows="investments" :columns="columns" row-key="id" :loading="loading" flat :pagination="{ rowsPerPage: 20 }">
        <template #body-cell-type="props">
          <q-td :props="props">
            <q-chip dense size="sm" :color="typeColor(props.value)" text-color="white">{{ typeLabel(props.value) }}</q-chip>
          </q-td>
        </template>
        <template #body-cell-return="props">
          <q-td :props="props">
            <div class="text-caption" :class="getReturn(props.row).absolute >= 0 ? 'text-positive' : 'text-negative'">
              {{ getReturn(props.row).absolute >= 0 ? '+' : '' }}{{ fmt(getReturn(props.row).absolute) }}
            </div>
            <div class="text-caption text-grey-7">
              {{ getReturn(props.row).pct.toFixed(1) }}% / {{ getReturn(props.row).annualized.toFixed(1) }}%/an
            </div>
          </q-td>
        </template>
        <template #body-cell-status="props">
          <q-td :props="props"><q-badge :color="statusColor(props.value)" :label="statusLabel(props.value)" /></q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round dense size="sm" icon="trending_up" color="primary" @click="openValuation(props.row)" title="Valorisation" />
            <q-btn flat round dense size="sm" icon="sell" color="orange" @click="openSell(props.row)" title="Vendre" v-if="props.row.status === 'active'" />
            <q-btn flat round dense size="sm" icon="edit" color="grey-7" @click="openEdit(props.row)" />
            <q-btn flat round dense size="sm" icon="delete" color="negative" @click="confirmDelete(props.row)" />
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6"><q-icon name="show_chart" size="48px" /><br>Aucun investissement</div>
        </template>
      </q-table>
    </q-card>

    <!-- Form -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width:480px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editing ? 'Modifier' : 'Nouvel investissement' }}</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <div class="q-gutter-md">
            <div class="row q-gutter-sm">
              <q-select v-model="form.type" :options="typeOptions" label="Type *" emit-value map-options outlined dense class="col" />
              <q-input v-model="form.name" label="Nom *" outlined dense class="col-7" />
            </div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.ticker" label="Ticker" outlined dense class="col" />
              <q-input v-model.number="form.quantity" label="Quantité" type="number" step="0.0001" outlined dense class="col" />
            </div>
            <div class="row q-gutter-sm">
              <q-input v-model.number="form.purchase_price" label="Prix unitaire *" type="number" outlined dense class="col" />
              <q-input v-model.number="form.total_invested" label="Total investi (XOF) *" type="number" outlined dense class="col" />
            </div>
            <q-input v-model="form.purchase_date" label="Date d'achat *" type="date" outlined dense />
            <q-input v-model="form.broker_name" label="Courtier" outlined dense />
            <q-input v-model="form.notes" label="Notes" outlined dense type="textarea" rows="2" />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" :label="editing ? 'Enregistrer' : 'Créer'" :loading="loading" @click="submit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Valorisation -->
    <q-dialog v-model="showVal" persistent>
      <q-card style="min-width:400px">
        <q-card-section><div class="text-h6">Mise à jour valorisation</div></q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="valForm.date" label="Date *" type="date" outlined dense />
          <q-input v-model.number="valForm.price" label="Prix unitaire actuel *" type="number" outlined dense />
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" icon="save" label="Enregistrer" @click="doValuation" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Vente -->
    <q-dialog v-model="showSell" persistent>
      <q-card style="min-width:400px">
        <q-card-section><div class="text-h6">Vendre l'investissement</div></q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="sellForm.date" label="Date vente *" type="date" outlined dense />
          <q-input v-model.number="sellForm.price" label="Prix unitaire vente *" type="number" outlined dense />
          <q-input v-model.number="sellForm.total" label="Total reçu (XOF) *" type="number" outlined dense />
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="orange" icon="sell" label="Vendre" @click="doSell" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useInvestments } from 'src/composables/useInvestments';
import type { Investment, InvestmentInput, InvestmentType } from 'src/types';

const $q = useQuasar();
const { investments, loading, stats, portfolioBreakdown, loadInvestments, createInvestment, updateInvestment, deleteInvestment, sellInvestment, addValuation, computeReturn } = useInvestments();

const columns = [
  { name: 'type', label: 'Type', field: 'type', align: 'center' as const },
  { name: 'name', label: 'Nom', field: 'name', align: 'left' as const, sortable: true },
  { name: 'ticker', label: 'Ticker', field: 'ticker', align: 'center' as const },
  { name: 'purchase_date', label: 'Achat', field: 'purchase_date', align: 'center' as const, sortable: true },
  { name: 'total_invested', label: 'Investi', field: 'total_invested', align: 'right' as const, format: (v: number) => fmt(v) },
  { name: 'current_value', label: 'Actuel', field: 'current_value', align: 'right' as const, format: (v: number) => fmt(v) },
  { name: 'return', label: 'Rendement', field: 'id', align: 'right' as const },
  { name: 'status', label: 'Statut', field: 'status', align: 'center' as const },
  { name: 'actions', label: '', field: 'id', align: 'right' as const },
];

const typeOptions = [
  { label: 'Actions', value: 'stocks' }, { label: 'Obligations', value: 'bonds' },
  { label: 'Immobilier', value: 'real_estate' }, { label: 'Fonds', value: 'mutual_fund' },
  { label: 'Dépôt à terme', value: 'term_deposit' }, { label: 'Crypto', value: 'crypto' },
  { label: 'Autre', value: 'other' },
];

function fmt(n: number): string { return Number(n).toLocaleString('fr-FR'); }
function pct(v: number, total: number): number { return total > 0 ? Math.round((v / total) * 100) : 0; }
function typeColor(t: string): string {
  return { stocks: 'primary', bonds: 'secondary', real_estate: 'green', mutual_fund: 'purple',
    term_deposit: 'teal', crypto: 'orange', other: 'grey' }[t] ?? 'grey';
}
function typeLabel(t: string): string {
  return { stocks: 'Actions', bonds: 'Obligations', real_estate: 'Immobilier', mutual_fund: 'Fonds',
    term_deposit: 'DAT', crypto: 'Crypto', other: 'Autre' }[t] ?? t;
}
function statusColor(s: string): string {
  return { active: 'positive', sold: 'grey', matured: 'orange', defaulted: 'negative' }[s] ?? 'grey';
}
function statusLabel(s: string): string {
  return { active: 'Actif', sold: 'Vendu', matured: 'Échu', defaulted: 'Défaut' }[s] ?? s;
}
function getReturn(inv: Investment) { return computeReturn(inv); }

// Form
const showForm = ref(false);
const editing  = ref<Investment | null>(null);
const today = new Date().toISOString().split('T')[0] as string;
const emptyForm = (): InvestmentInput => ({
  type: 'stocks' as InvestmentType, name: '', ticker: null, quantity: null,
  purchase_price: 0, purchase_date: today, total_invested: 0, currency: 'XOF',
  bank_account_id: null, broker_name: null, notes: null,
});
const form = ref<InvestmentInput>(emptyForm());

function openCreate() { editing.value = null; form.value = emptyForm(); showForm.value = true; }
function openEdit(i: Investment) {
  editing.value = i;
  form.value = {
    type: i.type, name: i.name, ticker: i.ticker, quantity: i.quantity,
    purchase_price: i.purchase_price, purchase_date: i.purchase_date,
    total_invested: i.total_invested, currency: i.currency,
    broker_name: i.broker_name, notes: i.notes,
  };
  showForm.value = true;
}
async function submit() {
  if (!form.value.name || !form.value.total_invested) { $q.notify({ type: 'negative', message: 'Champs requis manquants' }); return; }
  if (editing.value) await updateInvestment(editing.value.id, form.value as Partial<Investment>);
  else await createInvestment(form.value);
  showForm.value = false;
  $q.notify({ type: 'positive', message: editing.value ? 'Modifié' : 'Créé' });
}

// Valorisation
const showVal = ref(false);
const valForm = ref({ id: '', date: today, price: 0 });
function openValuation(i: Investment) { valForm.value = { id: i.id, date: today, price: i.current_price ?? i.purchase_price }; showVal.value = true; }
async function doValuation() {
  await addValuation(valForm.value.id, valForm.value.date, valForm.value.price);
  showVal.value = false;
  $q.notify({ type: 'positive', message: 'Valorisation enregistrée' });
}

// Vente
const showSell = ref(false);
const sellForm = ref({ id: '', date: today, price: 0, total: 0 });
function openSell(i: Investment) { sellForm.value = { id: i.id, date: today, price: i.current_price ?? 0, total: i.current_value ?? 0 }; showSell.value = true; }
async function doSell() {
  await sellInvestment(sellForm.value.id, sellForm.value.date, sellForm.value.price, sellForm.value.total);
  showSell.value = false;
  $q.notify({ type: 'positive', message: 'Investissement vendu' });
}

function confirmDelete(i: Investment) {
  $q.dialog({ title: 'Supprimer', message: `Supprimer "${i.name}" ?`, cancel: true, ok: { color: 'negative' } })
    .onOk(async () => { await deleteInvestment(i.id); $q.notify({ type: 'warning', message: 'Supprimé' }); });
}

onMounted(() => loadInvestments());
</script>

<style scoped>
.kpi { min-width: 160px; }
.portfolio-bar { display: flex; height: 24px; border-radius: 12px; overflow: hidden; background: #e0e0e0; }
.portfolio-segment { height: 100%; transition: width 0.3s; }
.legend-dot { width: 12px; height: 12px; border-radius: 50%; }
</style>
