<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Paiements fiscaux</div>
        <div class="text-caption text-grey-7">Reçus DGI · eSyntas · quittances impôts</div>
      </div>
      <q-space />
      <q-btn outline color="teal" icon="upload_file" label="Import eSyntas / OCR" no-caps @click="showImportWizard = true" class="q-mr-sm" />
      <q-btn color="primary" icon="add" label="Saisie manuelle" no-caps @click="openCreate" />
    </div>

    <!-- KPI -->
    <div class="row q-gutter-md q-mb-md">
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-sm text-center">
          <div class="text-h6 text-weight-bold text-primary">{{ fmtAmount(stats.totalPaid) }}</div>
          <div class="text-caption text-grey-6">Total payé (XOF)</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-sm text-center">
          <div class="text-h6 text-weight-bold text-orange">{{ stats.pending }}</div>
          <div class="text-caption text-grey-6">En attente validation</div>
        </q-card-section>
      </q-card>
      <q-card v-for="bt in stats.byType.slice(0, 3)" :key="bt.code" flat bordered class="kpi-card">
        <q-card-section class="q-pa-sm text-center">
          <div class="text-h6 text-weight-bold">{{ fmtAmount(bt.total) }}</div>
          <div class="text-caption text-grey-6">{{ bt.label }}</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Filtres -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-gutter-sm items-end q-py-sm">
        <q-select v-model="filterType"   :options="typeOptions"   label="Type d'impôt" emit-value map-options clearable dense outlined style="min-width:180px" />
        <q-select v-model="filterStatus" :options="statusOptions" label="Statut"        emit-value map-options clearable dense outlined style="min-width:140px" />
        <q-input  v-model="filterFrom"   label="Du" type="date" dense outlined style="min-width:130px" />
        <q-input  v-model="filterTo"     label="Au" type="date" dense outlined style="min-width:130px" />
        <q-input  v-model="filterPeriod" label="Période fiscale" dense outlined placeholder="2026-01" style="min-width:130px" />
        <q-btn flat icon="filter_alt" color="primary" @click="applyFilters" />
        <q-btn flat icon="clear"      color="grey"    @click="resetFilters" />
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card flat bordered>
      <q-table :rows="taxPayments" :columns="columns" row-key="id" :loading="loading"
        :pagination="{ rowsPerPage: 25 }" flat>

        <template #body-cell-payment_type="props">
          <q-td :props="props">
            {{ typeLabelMap[props.value] ?? props.value }}
          </q-td>
        </template>

        <template #body-cell-amount="props">
          <q-td :props="props" class="text-right text-weight-medium">
            {{ fmtAmount(props.value) }} XOF
          </q-td>
        </template>

        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.value)" :label="statusLabel(props.value)" />
          </q-td>
        </template>

        <template #body-cell-source_type="props">
          <q-td :props="props">
            <q-chip dense :icon="sourceIcon(props.value)" size="sm" color="grey-3" text-color="grey-8">
              {{ sourceLabel(props.value) }}
            </q-chip>
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <template v-if="props.row.status === 'pending'">
              <q-btn flat round dense size="sm" icon="check_circle" color="positive"
                title="Valider" @click="validate(props.row)" />
              <q-btn flat round dense size="sm" icon="cancel" color="negative"
                title="Rejeter" @click="reject(props.row)" />
            </template>
            <q-btn flat round dense size="sm" icon="edit" color="grey-7"
              title="Modifier" @click="openEdit(props.row)" />
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6">
            <q-icon name="receipt_long" size="48px" class="q-mb-sm" /><br>
            Aucun paiement fiscal enregistré
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- =====================================================================
         WIZARD IMPORT eSyntas / OCR
         ===================================================================== -->
    <q-dialog v-model="showImportWizard" persistent full-width style="max-width:800px">
      <q-card>
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Import reçus fiscaux / eSyntas</div>
          <q-space /><q-btn flat round dense icon="close" @click="resetWizard" />
        </q-card-section>

        <!-- Stepper -->
        <q-stepper v-model="wizardStep" flat animated color="teal">

          <!-- Étape 1 : Upload -->
          <q-step name="upload" title="Fichier" icon="upload_file" :done="wizardStep !== 'upload'">
            <div class="q-gutter-md q-mt-sm">
              <q-select v-model="importSourceType"
                :options="[
                  { label: 'CSV eSyntas', value: 'esyntas_csv' },
                  { label: 'Excel eSyntas', value: 'esyntas_excel' },
                  { label: 'PDF reçu DGI', value: 'ocr_pdf' },
                  { label: 'Photo reçu', value: 'ocr_image' },
                ]"
                label="Type de fichier" emit-value map-options outlined dense />
              <q-file v-model="importFile" label="Choisir un fichier"
                :accept="importSourceType.startsWith('esyntas_csv') ? '.csv,.txt' : importSourceType === 'esyntas_excel' ? '.xlsx,.xls' : '.pdf,.jpg,.jpeg,.png,.webp'"
                outlined dense>
                <template #prepend><q-icon name="attach_file" /></template>
              </q-file>
              <div v-if="importSourceType.startsWith('ocr')" class="text-caption text-grey-7 q-pa-sm bg-blue-1 rounded-borders">
                <q-icon name="info" color="blue" /> Le fichier sera envoyé à l'OCR IA (disponible après configuration des credentials IA).
                En attendant, vous pouvez charger un CSV eSyntas.
              </div>
            </div>
            <q-stepper-navigation>
              <q-btn color="teal" label="Suivant" @click="loadImportFile" :loading="loading" />
            </q-stepper-navigation>
          </q-step>

          <!-- Étape 2 : Mapping des champs -->
          <q-step name="mapping" title="Mapping champs" icon="table_rows" :done="wizardStep === 'preview' || wizardStep === 'done'">
            <div v-if="csvHeaders.length > 0" class="q-mt-sm">
              <div class="text-caption text-grey-7 q-mb-md">
                {{ csvRows.length }} lignes détectées · {{ csvHeaders.length }} colonnes · Mappez les colonnes vers les champs cibles
              </div>
              <div class="q-gutter-sm">
                <div v-for="targetField in TARGET_FIELDS" :key="targetField.value" class="row items-center q-gutter-sm">
                  <div class="col-4 text-caption text-weight-medium">{{ targetField.label }}</div>
                  <q-select
                    v-model="fieldMapping[targetField.value]"
                    :options="[{ label: '— ignorer —', value: '' }, ...csvHeaders.map(h => ({ label: h, value: h }))]"
                    dense outlined emit-value map-options class="col"
                    :color="fieldMapping[targetField.value] ? 'positive' : 'grey'" />
                  <q-chip v-if="fieldMapping[targetField.value] && csvRows[0]" dense size="sm" color="grey-2">
                    ex: {{ (csvRows[0] as Record<string,string>)[fieldMapping[targetField.value] as string] ?? '—' }}
                  </q-chip>
                </div>
              </div>
            </div>
            <q-stepper-navigation>
              <q-btn flat label="Retour" @click="wizardStep = 'upload'" class="q-mr-sm" />
              <q-btn color="teal" label="Prévisualiser" @click="previewImport" />
            </q-stepper-navigation>
          </q-step>

          <!-- Étape 3 : Prévisualisation -->
          <q-step name="preview" title="Prévisualisation" icon="preview" :done="wizardStep === 'done'">
            <div class="text-caption text-grey-7 q-mb-sm">{{ previewRows.length }} enregistrements à importer</div>
            <q-table :rows="previewRows.slice(0, 10)" :columns="previewColumns"
              dense flat row-key="__idx" class="q-mb-md" />
            <div v-if="previewErrors.length > 0" class="text-negative text-caption q-mb-sm">
              <q-icon name="warning" /> {{ previewErrors.length }} erreur(s) : {{ previewErrors.slice(0, 3).join(' · ') }}
            </div>
            <q-stepper-navigation>
              <q-btn flat label="Retour" @click="wizardStep = 'mapping'" class="q-mr-sm" />
              <q-btn color="teal" icon="cloud_upload" label="Importer" :loading="loading" @click="doImport" />
            </q-stepper-navigation>
          </q-step>

          <!-- Étape 4 : Résultat -->
          <q-step name="done" title="Terminé" icon="check_circle">
            <div class="text-center q-pa-md">
              <q-icon name="check_circle" color="positive" size="64px" />
              <div class="text-h6 q-mt-md">{{ importResult.imported }} paiements importés</div>
              <div v-if="importResult.errors.length > 0" class="text-negative text-caption q-mt-sm">
                {{ importResult.errors.length }} erreur(s) ignorée(s)
              </div>
            </div>
            <q-stepper-navigation>
              <q-btn color="positive" label="Fermer" @click="resetWizard" />
            </q-stepper-navigation>
          </q-step>
        </q-stepper>
      </q-card>
    </q-dialog>

    <!-- Dialog saisie manuelle -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width:480px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingPayment ? 'Modifier' : 'Nouveau paiement fiscal' }}</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <div class="q-gutter-md">
            <q-select v-model="form.payment_type" :options="typeOptions" label="Type d'impôt *"
              emit-value map-options outlined dense />
            <div class="row q-gutter-sm">
              <q-input v-model="form.payment_date" label="Date paiement *" type="date" outlined dense class="col" />
              <q-input v-model.number="form.amount" label="Montant *" type="number" outlined dense class="col" />
            </div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.fiscal_period" label="Période fiscale" outlined dense class="col" placeholder="2026-01" />
              <q-input v-model="form.reference"     label="Référence"       outlined dense class="col" />
            </div>
            <q-input v-model="form.dgi_receipt_number" label="N° quittance DGI" outlined dense />
            <div class="row q-gutter-sm">
              <q-input v-model="form.dgi_bureau"     label="Bureau DGI"   outlined dense class="col" />
              <q-input v-model="form.dgi_agent_code" label="Code agent"   outlined dense class="col" />
            </div>
            <q-input v-model="form.notes" label="Notes" outlined dense type="textarea" rows="2" />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" :label="editingPayment ? 'Enregistrer' : 'Créer'" :loading="loading" @click="submitForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useTaxPayments, type TaxPayment, type TaxPaymentSource } from 'src/composables/useTaxPayments';
import { useAuthStore } from 'src/stores/auth-store';
import type { TaxPaymentCode } from 'src/utils/fiscalCompliance';

const $q       = useQuasar();
const authStore = useAuthStore();
const {
  taxPayments, loading, error, stats, taxPaymentTypes,
  loadTaxPayments, createTaxPayment, updateTaxPayment,
  validateTaxPayment, rejectTaxPayment, parseEsyntasCSV, bulkImportFromEsyntas,
} = useTaxPayments();

// Filtres
const filterType   = ref<TaxPaymentCode | null>(null);
const filterStatus = ref<string | null>(null);
const filterFrom   = ref('');
const filterTo     = ref('');
const filterPeriod = ref('');

const typeOptions   = taxPaymentTypes.map(t => ({ label: t.label, value: t.code }));
const statusOptions = [
  { label: 'En attente', value: 'pending' },
  { label: 'Validé',     value: 'validated' },
  { label: 'Rejeté',     value: 'rejected' },
];
const typeLabelMap  = Object.fromEntries(taxPaymentTypes.map(t => [t.code, t.label]));

const columns = [
  { name: 'payment_date',  label: 'Date',        field: 'payment_date',  align: 'left'   as const, sortable: true },
  { name: 'payment_type',  label: 'Type',        field: 'payment_type',  align: 'left'   as const },
  { name: 'fiscal_period', label: 'Période',     field: 'fiscal_period', align: 'center' as const },
  { name: 'amount',        label: 'Montant',     field: 'amount',        align: 'right'  as const, sortable: true },
  { name: 'dgi_receipt_number', label: 'N° Quittance', field: 'dgi_receipt_number', align: 'left' as const },
  { name: 'source_type',   label: 'Source',      field: 'source_type',   align: 'center' as const },
  { name: 'status',        label: 'Statut',      field: 'status',        align: 'center' as const },
  { name: 'actions',       label: '',            field: 'id',            align: 'right'  as const },
];

function fmtAmount(n: number): string {
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0 });
}
function statusColor(s: string): string {
  return s === 'validated' ? 'positive' : s === 'rejected' ? 'negative' : 'orange';
}
function statusLabel(s: string): string {
  return s === 'validated' ? 'Validé' : s === 'rejected' ? 'Rejeté' : 'En attente';
}
function sourceIcon(s: TaxPaymentSource): string {
  if (s === 'manual') return 'edit';
  if (s.startsWith('esyntas')) return 'computer';
  return 'photo_camera';
}
function sourceLabel(s: TaxPaymentSource): string {
  const m: Record<string, string> = { manual: 'Manuel', ocr_pdf: 'OCR PDF', ocr_image: 'OCR Photo', esyntas_csv: 'eSyntas CSV', esyntas_excel: 'eSyntas Excel', esyntas_pdf: 'eSyntas PDF' };
  return m[s] ?? s;
}

async function applyFilters() {
  const opts: Parameters<typeof loadTaxPayments>[0] = {};
  if (filterType.value)   opts.payment_type  = filterType.value;
  if (filterStatus.value) opts.status        = filterStatus.value as TaxPayment['status'];
  if (filterFrom.value)   opts.date_from     = filterFrom.value;
  if (filterTo.value)     opts.date_to       = filterTo.value;
  if (filterPeriod.value) opts.fiscal_period = filterPeriod.value;
  await loadTaxPayments(opts);
}
function resetFilters() {
  filterType.value = null; filterStatus.value = null;
  filterFrom.value = ''; filterTo.value = ''; filterPeriod.value = '';
  void applyFilters();
}

// Valider / Rejeter
async function validate(t: TaxPayment) {
  await validateTaxPayment(t.id, authStore.user?.email ?? 'admin');
  $q.notify({ type: 'positive', message: 'Validé' });
}
function reject(t: TaxPayment) {
  $q.dialog({ title: 'Rejeter', prompt: { model: '', label: 'Motif' }, cancel: true, ok: { color: 'negative' } })
    .onOk(async (motif: string) => {
      await rejectTaxPayment(t.id, motif);
      $q.notify({ type: 'warning', message: 'Rejeté' });
    });
}

// Form manuel
const showForm       = ref(false);
const editingPayment = ref<TaxPayment | null>(null);
const emptyForm = () => ({
  payment_type:       'autre_fiscal' as TaxPaymentCode,
  payment_date:       new Date().toISOString().split('T')[0] ?? '',
  amount:             0,
  fiscal_period:      null as string | null,
  reference:          null as string | null,
  dgi_receipt_number: null as string | null,
  dgi_bureau:         null as string | null,
  dgi_agent_code:     null as string | null,
  notes:              null as string | null,
  source_type:        'manual' as TaxPaymentSource,
  source_file_url:    null as string | null,
  ocr_confidence:     null as Record<string, number> | null,
  ocr_raw_text:       null as string | null,
  bank_account_id:    null as string | null,
  bank_transaction_id: null as string | null,
  created_by:         authStore.user?.email ?? null,
});
const form = ref(emptyForm());
function openCreate() { editingPayment.value = null; form.value = emptyForm(); showForm.value = true; }
function openEdit(t: TaxPayment) { editingPayment.value = t; form.value = { ...emptyForm(), ...t }; showForm.value = true; }
async function submitForm() {
  if (!form.value.payment_date || form.value.amount <= 0) {
    $q.notify({ type: 'negative', message: 'Date et montant requis' }); return;
  }
  if (editingPayment.value) {
    await updateTaxPayment(editingPayment.value.id, form.value);
  } else {
    await createTaxPayment(form.value as Parameters<typeof createTaxPayment>[0]);
  }
  if (!error.value) {
    showForm.value = false;
    $q.notify({ type: 'positive', message: editingPayment.value ? 'Modifié' : 'Créé' });
  } else {
    $q.notify({ type: 'negative', message: error.value });
  }
}

// ============================================================================
// WIZARD IMPORT
// ============================================================================
const showImportWizard = ref(false);
const wizardStep       = ref<'upload' | 'mapping' | 'preview' | 'done'>('upload');
const importSourceType = ref<TaxPaymentSource>('esyntas_csv');
const importFile       = ref<File | null>(null);
const csvHeaders       = ref<string[]>([]);
const csvRows          = ref<Record<string, string>[]>([]);
const fieldMapping     = ref<Record<string, string>>({});
const previewRows      = ref<Record<string, string | number>[]>([]);
const previewErrors    = ref<string[]>([]);
const importResult     = ref({ imported: 0, errors: [] as string[] });

const TARGET_FIELDS = [
  { label: 'Date paiement *',   value: 'payment_date' },
  { label: 'Montant *',         value: 'amount' },
  { label: 'Type d\'impôt',     value: 'payment_type' },
  { label: 'Période fiscale',   value: 'fiscal_period' },
  { label: 'Référence',         value: 'reference' },
  { label: 'N° Quittance DGI',  value: 'dgi_receipt_number' },
  { label: 'Bureau DGI',        value: 'dgi_bureau' },
  { label: 'Code agent',        value: 'dgi_agent_code' },
];

const previewColumns = computed(() =>
  TARGET_FIELDS.filter(f => fieldMapping.value[f.value])
    .map(f => ({ name: f.value, label: f.label, field: f.value, align: 'left' as const }))
);

async function loadImportFile() {
  if (!importFile.value) { $q.notify({ type: 'negative', message: 'Sélectionner un fichier' }); return; }
  if (importSourceType.value === 'esyntas_csv') {
    const text = await importFile.value.text();
    const result = parseEsyntasCSV(text);
    csvHeaders.value = result.headers;
    csvRows.value    = result.rows;
    // Pré-remplir le mapping avec les suggestions
    fieldMapping.value = {};
    for (const [targetField, sourceField] of Object.entries(result.suggestedMappings)) {
      fieldMapping.value[targetField] = sourceField;
    }
    wizardStep.value = 'mapping';
  } else {
    $q.notify({ type: 'info', message: 'OCR disponible après configuration des credentials IA. Utilisez eSyntas CSV pour l\'instant.' });
  }
}

function previewImport() {
  previewErrors.value = [];
  previewRows.value = csvRows.value.slice(0, 10).map((row, i) => {
    const r: Record<string, string | number> = { __idx: i };
    for (const f of TARGET_FIELDS) {
      const col = fieldMapping.value[f.value];
      r[f.value] = col ? row[col] ?? '' : '';
    }
    return r;
  });
  wizardStep.value = 'preview';
}

async function doImport() {
  const result = await bulkImportFromEsyntas(
    csvRows.value,
    fieldMapping.value,
    importSourceType.value,
  );
  importResult.value = result;
  wizardStep.value   = 'done';
  $q.notify({ type: 'positive', message: `${result.imported} paiements importés` });
}

function resetWizard() {
  showImportWizard.value = false;
  wizardStep.value       = 'upload';
  importFile.value       = null;
  csvHeaders.value       = [];
  csvRows.value          = [];
  fieldMapping.value     = {};
  previewRows.value      = [];
  void applyFilters();
}

onMounted(() => applyFilters());
</script>

<style scoped>
.kpi-card { min-width: 130px; flex: 1; }
</style>
