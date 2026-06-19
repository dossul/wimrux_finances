<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn flat round dense icon="arrow_back" class="q-mr-sm" :to="accountId ? `/app/banking/${accountId}` : '/app/banking'" />
      <div>
        <div class="text-h5">Import de relevé bancaire</div>
        <div class="text-caption text-grey-7">CSV · OFX · QIF · PDF (OCR Stirling + IA)</div>
      </div>
    </div>

    <!-- Stepper -->
    <q-stepper v-model="step" animated flat bordered color="primary" class="q-mb-md">
      <q-step :name="1" title="Fichier" icon="upload_file" :done="step > 1">
        <!-- ÉTAPE 1 : Upload & détection format -->
        <div class="row q-gutter-md">
          <div class="col-12 col-md-6">
            <q-card flat bordered class="full-height">
              <q-card-section>
                <div class="text-subtitle1 q-mb-md">Sélectionner le fichier</div>

                <!-- Sélection compte -->
                <q-select
                  v-model="selectedAccountId"
                  :options="accountOptions"
                  emit-value map-options
                  label="Compte bancaire *"
                  outlined dense class="q-mb-md"
                />

                <!-- Drop zone -->
                <div
                  class="drop-zone q-pa-xl text-center rounded-borders cursor-pointer"
                  :class="dragOver ? 'drop-zone--active' : ''"
                  @dragover.prevent="dragOver = true"
                  @dragleave="dragOver = false"
                  @drop.prevent="onDrop"
                  @click="triggerFilePicker"
                >
                  <q-icon name="cloud_upload" size="48px" color="grey-5" class="q-mb-sm" />
                  <div class="text-body1 text-grey-7">Glisser-déposer ou cliquer pour sélectionner</div>
                  <div class="text-caption text-grey-5 q-mt-xs">CSV, OFX, QFX, QIF, PDF, XLSX</div>
                  <input ref="fileInputRef" type="file" accept=".csv,.ofx,.qfx,.qif,.pdf,.xlsx,.xls" class="hidden-input" @change="onFileChange" />
                </div>

                <div v-if="selectedFile" class="q-mt-md">
                  <q-chip icon="insert_drive_file" color="primary" text-color="white" removable @remove="clearFile">
                    {{ selectedFile.name }} ({{ fmtSize(selectedFile.size) }})
                  </q-chip>
                </div>
              </q-card-section>
            </q-card>
          </div>

          <div class="col-12 col-md-5">
            <q-card flat bordered class="full-height">
              <q-card-section>
                <div class="text-subtitle1 q-mb-md">Détection automatique</div>

                <template v-if="detectedFormat">
                  <q-list dense>
                    <q-item>
                      <q-item-section avatar><q-icon name="description" color="primary" /></q-item-section>
                      <q-item-section>
                        <q-item-label>Format</q-item-label>
                        <q-item-label caption>
                          <q-badge :color="formatColor(detectedFormat)" :label="detectedFormat" />
                        </q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item v-if="detectedBank">
                      <q-item-section avatar><q-icon name="account_balance" color="teal" /></q-item-section>
                      <q-item-section>
                        <q-item-label>Banque détectée</q-item-label>
                        <q-item-label caption class="text-teal">{{ detectedBank }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item v-if="detectedCountry">
                      <q-item-section avatar><q-icon name="flag" color="orange" /></q-item-section>
                      <q-item-section>
                        <q-item-label>Pays</q-item-label>
                        <q-item-label caption>{{ COUNTRY_LABELS[detectedCountry] ?? detectedCountry }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item v-if="csvHeaders.length">
                      <q-item-section avatar><q-icon name="table_chart" color="blue" /></q-item-section>
                      <q-item-section>
                        <q-item-label>{{ csvHeaders.length }} colonnes CSV</q-item-label>
                        <q-item-label caption>{{ csvHeaders.slice(0, 5).join(' · ') }}</q-item-label>
                      </q-item-section>
                    </q-item>
                    <q-item v-if="detectedFormat === 'PDF'">
                      <q-item-section avatar><q-icon name="smart_toy" color="purple" /></q-item-section>
                      <q-item-section>
                        <q-item-label>Traitement IA activé</q-item-label>
                        <q-item-label caption>Stirling PDF OCR → OpenRouter</q-item-label>
                      </q-item-section>
                    </q-item>
                  </q-list>

                  <q-banner v-if="detectedFormat === 'PDF' && !stirlingConfigured" class="bg-amber-1 q-mt-sm" rounded>
                    <template v-slot:avatar><q-icon name="warning" color="amber-8" /></template>
                    <span class="text-amber-9">URL Stirling PDF non configurée.</span>
                    <template v-slot:action>
                      <q-btn flat color="amber-9" label="Configurer" no-caps to="/app/settings" />
                    </template>
                  </q-banner>
                </template>

                <div v-else class="text-grey-5 text-center q-pa-lg">
                  <q-icon name="search" size="32px" />
                  <div class="text-caption q-mt-xs">Sélectionnez un fichier pour l'analyser</div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>

        <q-stepper-navigation class="q-mt-md">
          <q-btn color="primary" label="Suivant" no-caps :disable="!canProceedStep1" @click="proceedStep1" />
        </q-stepper-navigation>
      </q-step>

      <!-- ÉTAPE 2 : Mapping colonnes (CSV seulement) -->
      <q-step :name="2" title="Mapping" icon="tune" :done="step > 2" v-if="detectedFormat === 'CSV'">
        <div class="text-subtitle1 q-mb-md">Mapping des colonnes CSV</div>

        <q-banner v-if="detectedBank" class="bg-teal-1 q-mb-md" rounded>
          <template v-slot:avatar><q-icon name="check_circle" color="teal" /></template>
          Profil <strong>{{ detectedBank }}</strong> détecté automatiquement — colonnes pré-remplies
        </q-banner>

        <div class="row q-gutter-sm">
          <div class="col-12 col-sm-5">
            <q-select v-model="mapping.date" :options="csvHeaders" label="Colonne Date *" outlined dense />
          </div>
          <div class="col-12 col-sm-5">
            <q-select v-model="mapping.label" :options="csvHeaders" label="Colonne Libellé *" outlined dense />
          </div>
          <div class="col-12 col-sm-3">
            <q-select v-model="mapping.date_format" :options="dateFormats" emit-value map-options label="Format date" outlined dense />
          </div>
          <div class="col-12 col-sm-2">
            <q-select v-model="mapping.decimal_sep" :options="[{label:'Virgule (,)', value:','},{label:'Point (.)',value:'.'}]" emit-value map-options label="Décimales" outlined dense />
          </div>
          <div class="col-12 col-sm-2">
            <q-select v-model="mapping.separator" :options="separatorOptions" emit-value map-options label="Séparateur" outlined dense />
          </div>
        </div>

        <div class="text-subtitle2 q-mt-md q-mb-sm">Colonnes montants</div>
        <div class="row q-gutter-sm">
          <div class="col-12 col-sm-4">
            <q-select v-model="mapping.debit" :options="nullableHeaders" emit-value map-options label="Colonne Débit" outlined dense />
          </div>
          <div class="col-12 col-sm-4">
            <q-select v-model="mapping.credit" :options="nullableHeaders" emit-value map-options label="Colonne Crédit" outlined dense />
          </div>
          <div class="col-12 col-sm-3">
            <q-select v-model="mapping.amount" :options="nullableHeaders" emit-value map-options label="Montant signé (alt.)" outlined dense />
          </div>
          <div class="col-12 col-sm-4">
            <q-select v-model="mapping.value_date" :options="nullableHeaders" emit-value map-options label="Date valeur" outlined dense />
          </div>
          <div class="col-12 col-sm-4">
            <q-select v-model="mapping.reference" :options="nullableHeaders" emit-value map-options label="Référence" outlined dense />
          </div>
        </div>

        <q-stepper-navigation class="q-mt-md">
          <q-btn flat label="Retour" no-caps @click="step = 1" class="q-mr-sm" />
          <q-btn color="primary" label="Prévisualiser" no-caps :disable="!mapping.date || !mapping.label" @click="doPreview" />
        </q-stepper-navigation>
      </q-step>

      <!-- ÉTAPE 3 : Preview -->
      <q-step :name="3" title="Prévisualisation" icon="preview" :done="step > 3">
        <div class="row items-center q-mb-sm">
          <div class="text-subtitle1">{{ previewRows.length }} transactions détectées</div>
          <q-space />
          <div v-if="parseErrors.length" class="text-caption text-red q-mr-md">{{ parseErrors.length }} erreurs ignorées</div>
          <q-btn flat dense size="sm" icon="warning" color="red" :label="`${parseErrors.length} erreurs`" v-if="parseErrors.length" @click="errorsDialog = true" />
        </div>

        <!-- Info OCR -->
        <q-banner v-if="ocrJob.status === 'done' && (ocrJob.ocrDurationMs || ocrJob.aiDurationMs)" class="bg-purple-1 q-mb-sm" rounded dense>
          <template v-slot:avatar><q-icon name="smart_toy" color="purple" size="sm" /></template>
          OCR : {{ ocrJob.ocrDurationMs }}ms · IA : {{ ocrJob.aiDurationMs }}ms
          · {{ ocrJob.pageCount > 0 ? ocrJob.pageCount + ' page(s)' : '' }}
        </q-banner>

        <!-- Loader OCR/IA en cours -->
        <div v-if="ocrJob.status === 'ocr' || ocrJob.status === 'ai'" class="text-center q-pa-xl">
          <q-spinner-dots size="48px" color="primary" class="q-mb-md" />
          <div class="text-body1">{{ ocrJob.status === 'ocr' ? 'Extraction OCR en cours (Stirling PDF)…' : 'Normalisation IA (OpenRouter)…' }}</div>
        </div>

        <template v-else>
          <q-table
            :rows="previewRows"
            :columns="previewCols"
            row-key="raw"
            flat dense bordered
            :pagination="{ rowsPerPage: 15 }"
          >
            <template v-slot:body-cell-direction="props">
              <q-td :props="props">
                <q-icon
                  :name="props.row.direction === 'credit' ? 'arrow_downward' : 'arrow_upward'"
                  :color="props.row.direction === 'credit' ? 'green' : 'red'"
                  size="sm"
                />
              </q-td>
            </template>
            <template v-slot:body-cell-amount="props">
              <q-td :props="props" :class="props.row.direction === 'credit' ? 'text-green text-weight-bold' : 'text-red text-weight-bold'">
                {{ props.row.direction === 'credit' ? '+' : '-' }}{{ fmtCur(props.row.amount) }}
              </q-td>
            </template>
            <template v-slot:no-data>
              <div class="text-center text-grey-5 q-pa-xl">Aucune transaction valide</div>
            </template>
          </q-table>
        </template>

        <q-stepper-navigation class="q-mt-md">
          <q-btn flat label="Retour" no-caps @click="step = detectedFormat === 'CSV' ? 2 : 1" class="q-mr-sm" />
          <q-btn color="primary" label="Importer" no-caps :disable="previewRows.length === 0 || importing" :loading="importing" @click="doImport" />
        </q-stepper-navigation>
      </q-step>

      <!-- ÉTAPE 4 : Résumé -->
      <q-step :name="4" title="Résumé" icon="check_circle">
        <div class="text-center q-pa-xl">
          <q-icon name="check_circle" color="positive" size="72px" class="q-mb-md" />
          <div class="text-h5 q-mb-sm">Import terminé !</div>
          <div class="row q-gutter-md justify-center q-mt-md">
            <q-card flat bordered style="min-width:130px">
              <q-card-section class="text-center">
                <div class="text-h4 text-green text-weight-bold">{{ importResult.imported }}</div>
                <div class="text-caption">Importées</div>
              </q-card-section>
            </q-card>
            <q-card flat bordered style="min-width:130px">
              <q-card-section class="text-center">
                <div class="text-h4 text-orange text-weight-bold">{{ importResult.duplicates }}</div>
                <div class="text-caption">Doublons</div>
              </q-card-section>
            </q-card>
            <q-card flat bordered style="min-width:130px">
              <q-card-section class="text-center">
                <div class="text-h4 text-red text-weight-bold">{{ importResult.errors }}</div>
                <div class="text-caption">Erreurs</div>
              </q-card-section>
            </q-card>
          </div>
          <div class="q-mt-lg row q-gutter-sm justify-center">
            <q-btn color="primary" label="Voir les transactions" no-caps :to="`/app/banking/${selectedAccountId}`" v-if="selectedAccountId" />
            <q-btn outline label="Nouvel import" no-caps @click="resetAll" />
          </div>
        </div>
      </q-step>
    </q-stepper>

    <!-- Dialog erreurs de parsing -->
    <q-dialog v-model="errorsDialog">
      <q-card style="min-width:500px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Erreurs de parsing</div>
          <q-space /><q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <q-list dense>
            <q-item v-for="(e, i) in parseErrors" :key="i">
              <q-item-section avatar><q-icon name="error" color="red" size="sm" /></q-item-section>
              <q-item-section class="text-caption">{{ e }}</q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import { useBankAccounts } from 'src/composables/useBankAccounts';
import { useBankStatementOcr } from 'src/composables/useBankStatementOcr';
import {
  detectFileFormat, detectBankProfile, detectCsvSeparator, inferCsvMapping, parseCsv, parseOfx, parseQif,
} from 'src/utils/bankStatementParsers';
import type { ParsedTransaction, CsvColumnMapping } from 'src/utils/bankStatementParsers';
import type { BankAccountFull } from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';


const route = useRoute();
const $q = useQuasar();
const companyStore = useCompanyStore();
const { accounts, loadAccounts } = useBankAccounts();
const { job: ocrJob, processFile: ocrProcessFile } = useBankStatementOcr();

const accountId = route.params['id'] as string | undefined;

const step = ref(1);
const dragOver = ref(false);
const selectedFile = ref<File | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);
const selectedAccountId = ref<string>(accountId ?? '');
const detectedFormat = ref<'CSV' | 'OFX' | 'QIF' | 'PDF' | null>(null);
const detectedBank = ref<string | null>(null);
const detectedCountry = ref<string | null>(null);
const csvHeaders = ref<string[]>([]);
const rawContent = ref('');
const previewRows = ref<ParsedTransaction[]>([]);
const parseErrors = ref<string[]>([]);
const importing = ref(false);
const errorsDialog = ref(false);
const importResult = reactive({ imported: 0, duplicates: 0, errors: 0, batchId: '' });

const COUNTRY_LABELS: Record<string, string> = {
  BF: 'Burkina Faso', CI: 'Côte d\'Ivoire', SN: 'Sénégal', ML: 'Mali',
  TG: 'Togo', BJ: 'Bénin', GN: 'Guinée', CM: 'Cameroun',
};

const stirlingConfigured = computed(() => !!companyStore.company?.stirling_api_url);

const accountOptions = computed(() =>
  accounts.value.map((a: BankAccountFull) => ({ label: `${a.bank_name} — ${a.account_number}`, value: a.id }))
);

const canProceedStep1 = computed(() => !!selectedFile.value && !!selectedAccountId.value);

const dateFormats = [
  { label: 'JJ/MM/AAAA', value: 'DD/MM/YYYY' },
  { label: 'MM/JJ/AAAA', value: 'MM/DD/YYYY' },
  { label: 'AAAA-MM-JJ', value: 'YYYY-MM-DD' },
  { label: 'JJ-MM-AAAA', value: 'DD-MM-YYYY' },
  { label: 'JJ.MM.AAAA', value: 'DD.MM.YYYY' },
];
const separatorOptions = [
  { label: 'Point-virgule (;)', value: ';' },
  { label: 'Virgule (,)', value: ',' },
  { label: 'Tabulation', value: '\t' },
  { label: 'Pipe (|)', value: '|' },
];

const mapping = reactive<CsvColumnMapping>({
  date: '', label: '', debit: null, credit: null, amount: null,
  direction: null, value_date: null, reference: null,
  separator: ';', date_format: 'DD/MM/YYYY', decimal_sep: ',',
});

const nullableHeaders = computed(() => [{ label: '— aucun —', value: null }, ...csvHeaders.value.map(h => ({ label: h, value: h }))]);

const previewCols = [
  { name: 'transaction_date', label: 'Date', field: 'transaction_date', align: 'left' as const },
  { name: 'direction', label: '', field: 'direction', align: 'center' as const },
  { name: 'label', label: 'Libellé', field: 'label', align: 'left' as const },
  { name: 'reference', label: 'Réf.', field: 'reference', align: 'left' as const },
  { name: 'amount', label: 'Montant', field: 'amount', align: 'right' as const },
];

function fmtCur(n: number) {
  return new Intl.NumberFormat('fr-BF', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);
}
function fmtSize(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} Mo` : `${Math.round(n / 1024)} Ko`;
}
function formatColor(f: string) {
  return f === 'OFX' ? 'teal' : f === 'QIF' ? 'blue' : f === 'PDF' ? 'purple' : 'primary';
}

function triggerFilePicker() { fileInputRef.value?.click(); }

function clearFile() {
  selectedFile.value = null;
  detectedFormat.value = null;
  detectedBank.value = null;
  detectedCountry.value = null;
  csvHeaders.value = [];
  rawContent.value = '';
}

async function analyzeFile(file: File) {
  selectedFile.value = file;
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') {
    detectedFormat.value = 'PDF';
    detectedBank.value = null;
    return;
  }

  const text = await file.text();
  rawContent.value = text;
  const fmt = detectFileFormat(text);
  detectedFormat.value = fmt;

  if (fmt === 'CSV') {
    const sep = detectCsvSeparator(text.split('\n')[0] ?? '');
    const profile = detectBankProfile(text);
    detectedBank.value = profile?.bank_name ?? null;
    detectedCountry.value = profile?.country ?? null;

    // Chercher la ligne d'en-tête (jusqu'à la 10e ligne)
    const lines = text.split(/\r?\n/);
    let headerLine = lines[0] ?? '';
    for (const l of lines.slice(0, 10)) {
      if (l.split(sep).length > 2) { headerLine = l; break; }
    }
    csvHeaders.value = headerLine.split(sep).map(h => h.trim().replace(/^["']|["']$/g, ''));
    const inferred = inferCsvMapping(csvHeaders.value, profile);
    Object.assign(mapping, { ...inferred });
  } else if (fmt === 'OFX') {
    const match = text.match(/<(?:FI)?ORG>([^<]+)/i);
    detectedBank.value = match?.[1]?.trim() ?? null;
  }
}

function onFileChange(evt: Event) {
  const input = evt.target as HTMLInputElement;
  if (input.files?.[0]) void analyzeFile(input.files[0]);
}

function onDrop(evt: DragEvent) {
  dragOver.value = false;
  const file = evt.dataTransfer?.files?.[0];
  if (file) void analyzeFile(file);
}

async function proceedStep1() {
  if (detectedFormat.value === 'CSV') {
    step.value = 2;
  } else {
    await doPreview();
  }
}

async function doPreview() {
  parseErrors.value = [];
  previewRows.value = [];

  if (detectedFormat.value === 'PDF') {
    if (!stirlingConfigured.value) {
      $q.notify({ type: 'warning', message: 'Configurez d\'abord l\'URL Stirling PDF dans Paramètres' });
      return;
    }
    step.value = 3;
    const txs = await ocrProcessFile(selectedFile.value!);
    previewRows.value = txs;
    if (ocrJob.value.status === 'error') {
      $q.notify({ type: 'negative', message: ocrJob.value.errorMessage ?? 'Erreur OCR' });
    }
  } else if (detectedFormat.value === 'OFX') {
    const result = parseOfx(rawContent.value);
    previewRows.value = result.transactions;
    parseErrors.value = result.errors;
    step.value = 3;
  } else if (detectedFormat.value === 'QIF') {
    const result = parseQif(rawContent.value);
    previewRows.value = result.transactions;
    parseErrors.value = result.errors;
    step.value = 3;
  } else if (detectedFormat.value === 'CSV') {
    const result = parseCsv(rawContent.value, mapping);
    previewRows.value = result.transactions;
    parseErrors.value = result.errors;
    step.value = 3;
  }
}

async function doImport() {
  if (!selectedAccountId.value) return;
  importing.value = true;
  const batchId = crypto.randomUUID();
  importResult.imported = 0;
  importResult.duplicates = 0;
  importResult.errors = 0;
  importResult.batchId = batchId;

  const companyId = companyStore.companyId!;

  for (const tx of previewRows.value) {
    try {
      const { error } = await appwriteDb.from('bank_transactions').insert([{
        bank_account_id: selectedAccountId.value,
        company_id: companyId,
        transaction_date: tx.transaction_date,
        value_date: tx.value_date,
        amount: tx.amount,
        direction: tx.direction,
        label: tx.label,
        reference: tx.reference,
        reconciliation_status: 'unreconciled',
        import_batch_id: batchId,
        raw_data: { raw: tx.raw },
      }]);

      if (error) {
        if (error.message?.includes('unique') || error.message?.includes('23505')) {
          importResult.duplicates++;
        } else {
          importResult.errors++;
        }
      } else {
        importResult.imported++;
      }
    } catch {
      importResult.errors++;
    }
  }

  // Enregistrer l'import batch dans bank_statement_imports
  await appwriteDb.from('bank_statement_imports').insert([{
    company_id: companyId,
    bank_account_id: selectedAccountId.value,
    file_name: selectedFile.value?.name ?? null,
    file_format: detectedFormat.value,
    total_rows: previewRows.value.length,
    imported_rows: importResult.imported,
    duplicates_count: importResult.duplicates,
    errors_count: importResult.errors,
    status: 'completed',
    imported_by: companyStore.company?.name ?? null,
  }]);

  importing.value = false;
  step.value = 4;
}

function resetAll() {
  step.value = 1;
  clearFile();
  previewRows.value = [];
  parseErrors.value = [];
  Object.assign(importResult, { imported: 0, duplicates: 0, errors: 0, batchId: '' });
}

onMounted(async () => {
  await loadAccounts();
  if (accountId) selectedAccountId.value = accountId;
});
</script>

<style scoped>
.drop-zone {
  border: 2px dashed #ccc;
  transition: all 0.2s;
  min-height: 140px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.drop-zone--active {
  border-color: var(--q-primary);
  background: rgba(var(--q-primary-rgb, 25, 118, 210), 0.05);
}
.hidden-input {
  display: none;
}
</style>
