<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Déclarations fiscales</div>
        <div class="text-caption text-grey-7">Retenues à la source · TVA · déclarations DGI BF</div>
      </div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nouvelle retenue" no-caps class="q-mr-sm" @click="showWithholding = true" />
      <q-btn color="secondary" icon="description" label="Nouvelle déclaration" no-caps @click="showDeclaration = true" />
    </div>

    <!-- KPIs -->
    <div class="row q-gutter-md q-mb-lg">
      <q-card flat bordered class="col">
        <q-card-section>
          <div class="text-caption text-grey-7">Retenues en attente</div>
          <div class="text-h5 text-weight-bold text-orange">{{ pendingWithholdings.length }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col">
        <q-card-section>
          <div class="text-caption text-grey-7">Montant total à déclarer</div>
          <div class="text-h5 text-weight-bold">{{ fmt(totalPendingTax) }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col">
        <q-card-section>
          <div class="text-caption text-grey-7">Déclarations</div>
          <div class="text-h5 text-weight-bold">{{ declarations.length }}</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Tabs -->
    <q-tabs v-model="tab" class="text-primary q-mb-md" align="left" narrow-indicator>
      <q-tab name="withholdings" label="Retenues" />
      <q-tab name="declarations" label="Déclarations" />
      <q-tab name="tva" label="TVA mensuelle" />
    </q-tabs>

    <!-- Retenues -->
    <q-tab-panels v-model="tab" animated>
      <q-tab-panel name="withholdings" class="q-pa-none">
        <q-card flat bordered>
          <q-table :rows="withholdings" :columns="whCols" row-key="id" flat :loading="loading" :pagination="{ rowsPerPage: 15 }">
            <template #body-cell-status="props">
              <q-td :props="props">
                <q-badge :color="whStatusColor(props.row.status)" :label="whStatusLabel(props.row.status)" />
              </q-td>
            </template>
            <template #body-cell-actions="props">
              <q-td :props="props">
                <q-btn v-if="props.row.status === 'pending'" flat size="sm" label="Déclarer" no-caps color="blue" @click="onDeclare(props.row.id)" />
                <q-btn v-if="props.row.status === 'declared'" flat size="sm" label="Payé" no-caps color="positive" @click="onPaid(props.row.id)" />
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>

      <q-tab-panel name="declarations" class="q-pa-none">
        <q-card flat bordered>
          <q-table :rows="declarations" :columns="declCols" row-key="id" flat :loading="loading" :pagination="{ rowsPerPage: 15 }">
            <template #body-cell-status="props">
              <q-td :props="props">
                <q-badge :color="declStatusColor(props.row.status)" :label="props.row.status" />
              </q-td>
            </template>
            <template #body-cell-actions="props">
              <q-td :props="props">
                <q-btn v-if="props.row.status === 'draft'" flat size="sm" label="Soumettre" no-caps color="primary" @click="onSubmit(props.row.id)" />
              </q-td>
            </template>
          </q-table>
        </q-card>
      </q-tab-panel>

      <q-tab-panel name="tva" class="q-pa-none">
        <q-card flat bordered>
          <q-table :rows="tvaMonthly" :columns="tvaCols" row-key="period" flat :loading="loading" :pagination="{ rowsPerPage: 12 }" />
        </q-card>
      </q-tab-panel>
    </q-tab-panels>

    <!-- Dialog retenue -->
    <q-dialog v-model="showWithholding" persistent>
      <q-card style="min-width:420px">
        <q-card-section class="text-h6">Nouvelle retenue</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select v-model="whForm.tax_type" :options="taxTypeOpts" label="Type d'impôt" emit-value map-options outlined dense />
          <q-input v-model.number="whForm.rate" label="Taux (%)" type="number" outlined dense />
          <q-input v-model.number="whForm.base_amount" label="Montant de base" type="number" outlined dense />
          <q-input v-model="whForm.period_month" label="Période (YYYY-MM)" outlined dense mask="####-##" />
          <q-input v-model="whForm.notes" label="Notes" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" @click="showWithholding = false" />
          <q-btn color="primary" label="Enregistrer" :loading="loading" @click="saveWithholding" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog déclaration -->
    <q-dialog v-model="showDeclaration" persistent>
      <q-card style="min-width:420px">
        <q-card-section class="text-h6">Nouvelle déclaration</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select v-model="declForm.declaration_type" :options="declTypeOpts" label="Type" emit-value map-options outlined dense />
          <q-input v-model="declForm.period" label="Période (YYYY-MM)" outlined dense />
          <q-input v-model.number="declForm.total_base" label="Base imposable" type="number" outlined dense />
          <q-input v-model.number="declForm.total_tax" label="Impôt calculé" type="number" outlined dense />
          <q-input v-model="declForm.notes" label="Notes" outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" @click="showDeclaration = false" />
          <q-btn color="primary" label="Créer" :loading="loading" @click="saveDeclaration" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useTaxDeclarations, TAX_TYPES, DECLARATION_TYPES } from 'src/composables/useTaxDeclarations';

const $q = useQuasar();
const {
  withholdings, declarations, tvaMonthly, loading, pendingWithholdings, totalPendingTax,
  loadWithholdings, createWithholding, markWithholdingDeclared, markWithholdingPaid,
  loadDeclarations, createDeclaration, submitDeclaration, loadTvaMonthly,
} = useTaxDeclarations();

const tab = ref('withholdings');
const showWithholding = ref(false);
const showDeclaration = ref(false);

const whForm = ref({ tax_type: 'tva', rate: 18, base_amount: 0, period_month: '', notes: '' });
const declForm = ref({ declaration_type: 'tva_mensuelle', period: '', total_base: 0, total_tax: 0, notes: '' });

const taxTypeOpts = TAX_TYPES.map(t => ({ label: t.label, value: t.value }));
const declTypeOpts = DECLARATION_TYPES.map(t => ({ label: t.label, value: t.value }));

function fmt(n: number) { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n); }
function whStatusColor(s: string) { return { pending: 'orange', declared: 'blue', paid: 'positive' }[s] ?? 'grey'; }
function whStatusLabel(s: string) { return { pending: 'En attente', declared: 'Déclaré', paid: 'Payé' }[s] ?? s; }
function declStatusColor(s: string) { return { draft: 'grey', submitted: 'blue', accepted: 'positive', rejected: 'negative' }[s] ?? 'grey'; }

const whCols = [
  { name: 'tax_type', label: 'Type', align: 'left' as const, field: 'tax_type', sortable: true },
  { name: 'rate', label: 'Taux %', align: 'center' as const, field: 'rate' },
  { name: 'base_amount', label: 'Base', align: 'right' as const, field: 'base_amount', format: (v: number) => fmt(v) },
  { name: 'tax_amount', label: 'Montant', align: 'right' as const, field: 'tax_amount', format: (v: number) => fmt(v) },
  { name: 'period_month', label: 'Période', align: 'center' as const, field: 'period_month' },
  { name: 'status', label: 'Statut', align: 'center' as const, field: 'status' },
  { name: 'actions', label: '', align: 'center' as const, field: 'id' },
];

const declCols = [
  { name: 'declaration_type', label: 'Type', align: 'left' as const, field: 'declaration_type', sortable: true },
  { name: 'period', label: 'Période', align: 'center' as const, field: 'period' },
  { name: 'total_base', label: 'Base', align: 'right' as const, field: 'total_base', format: (v: number) => fmt(v) },
  { name: 'total_tax', label: 'Impôt', align: 'right' as const, field: 'total_tax', format: (v: number) => fmt(v) },
  { name: 'status', label: 'Statut', align: 'center' as const, field: 'status' },
  { name: 'actions', label: '', align: 'center' as const, field: 'id' },
];

const tvaCols = [
  { name: 'period', label: 'Mois', align: 'left' as const, field: 'period', sortable: true },
  { name: 'tva_collectee', label: 'TVA collectée', align: 'right' as const, field: 'tva_collectee', format: (v: number) => fmt(v) },
  { name: 'tva_deductible', label: 'TVA déductible', align: 'right' as const, field: 'tva_deductible', format: (v: number) => fmt(v) },
  { name: 'tva_nette', label: 'TVA nette à payer', align: 'right' as const, field: 'tva_nette', format: (v: number) => fmt(v) },
];

async function saveWithholding() {
  if (!whForm.value.tax_type || !whForm.value.period_month) {
    $q.notify({ type: 'warning', message: 'Type et période requis' });
    return;
  }
  const taxAmount = whForm.value.base_amount * (whForm.value.rate / 100);
  await createWithholding({
    tax_type: whForm.value.tax_type,
    rate: whForm.value.rate,
    base_amount: whForm.value.base_amount,
    tax_amount: taxAmount,
    period_month: whForm.value.period_month,
    invoice_id: null,
    notes: whForm.value.notes || null,
  });
  showWithholding.value = false;
  $q.notify({ type: 'positive', message: 'Retenue enregistrée' });
}

async function saveDeclaration() {
  if (!declForm.value.declaration_type || !declForm.value.period) {
    $q.notify({ type: 'warning', message: 'Type et période requis' });
    return;
  }
  await createDeclaration(declForm.value);
  showDeclaration.value = false;
  $q.notify({ type: 'positive', message: 'Déclaration créée' });
}

async function onDeclare(id: string) {
  await markWithholdingDeclared(id);
  $q.notify({ type: 'positive', message: 'Retenue déclarée' });
}

async function onPaid(id: string) {
  $q.dialog({ title: 'N° reçu', prompt: { model: '', type: 'text' }, cancel: true })
    .onOk(async (receipt: string) => {
      await markWithholdingPaid(id, receipt);
      $q.notify({ type: 'positive', message: 'Retenue marquée payée' });
    });
}

async function onSubmit(id: string) {
  await submitDeclaration(id);
  $q.notify({ type: 'positive', message: 'Déclaration soumise' });
}

onMounted(() => Promise.all([loadWithholdings(), loadDeclarations(), loadTvaMonthly()]));
</script>
