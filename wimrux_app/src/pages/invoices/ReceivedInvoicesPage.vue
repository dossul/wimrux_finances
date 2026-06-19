<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Factures reçues</div>
        <div class="text-caption text-grey-7">Factures fournisseurs · décaissements</div>
      </div>
      <q-space />
      <q-btn outline color="primary" icon="people" label="Fournisseurs" no-caps :to="'/app/suppliers'" class="q-mr-sm" />
      <q-btn outline color="secondary" icon="document_scanner" label="Import OCR" no-caps class="q-mr-sm" data-testid="invoice-ocr-import-btn" @click="showOcrDialog = true" />
      <q-btn color="primary" icon="add" label="Nouvelle facture" no-caps @click="openCreate" data-testid="received-invoice-new-btn" />
    </div>

    <!-- KPI cards -->
    <div class="row q-gutter-md q-mb-md">
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-sm text-center">
          <div class="text-h6 text-weight-bold">{{ stats.total }}</div>
          <div class="text-caption text-grey-6">Total</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-sm text-center">
          <div class="text-h6 text-weight-bold text-negative">{{ fmtAmount(stats.outstandingAmt) }}</div>
          <div class="text-caption text-grey-6">Encours (FCFA)</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-sm text-center">
          <div class="text-h6 text-weight-bold text-orange">{{ stats.overdue }}</div>
          <div class="text-caption text-grey-6">En retard</div>
        </q-card-section>
      </q-card>
      <!-- Partiel : visible uniquement si au moins 1 facture partielle -->
      <q-card v-if="stats.partial > 0" flat bordered class="kpi-card kpi-card--partial"
        style="cursor:pointer" @click="filterPaymentStatus = 'partial'">
        <q-card-section class="q-pa-sm text-center">
          <div class="row items-center justify-center q-gutter-xs q-mb-xs">
            <q-icon name="hourglass_top" color="orange" size="18px" />
            <span class="text-h6 text-weight-bold text-orange">{{ stats.partial }}</span>
          </div>
          <div class="text-caption text-grey-6">Partiellement réglé</div>
          <q-linear-progress
            :value="stats.partialRate / 100"
            color="orange" track-color="orange-2"
            rounded size="5px" class="q-mt-sm"
          />
          <div class="text-caption text-orange-9 q-mt-xs">
            {{ fmtAmount(stats.partialAmt) }} FCFA restants · {{ stats.partialRate }}% réglé
          </div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-sm text-center">
          <div class="text-h6 text-weight-bold text-primary">{{ fmtAmount(stats.totalAmount) }}</div>
          <div class="text-caption text-grey-6">Montant total (FCFA)</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Filtres -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row q-gutter-sm items-end q-py-sm">
        <q-select v-model="filterPaymentStatus" :options="paymentStatusOptions" label="Statut paiement"
          emit-value map-options clearable dense outlined style="min-width:160px" />
        <q-select v-model="filterCompliance" :options="complianceOptions" label="Conformité"
          emit-value map-options clearable dense outlined style="min-width:160px" />
        <q-select v-model="filterSupplier" :options="supplierOptions" label="Fournisseur"
          emit-value map-options clearable dense outlined style="min-width:200px" />
        <q-input v-model="filterDateFrom" label="Du" type="date" dense outlined style="min-width:130px" />
        <q-input v-model="filterDateTo"   label="Au" type="date" dense outlined style="min-width:130px" />
        <q-btn flat icon="filter_alt" color="primary" @click="applyFilters" />
        <q-btn flat icon="clear" color="grey" @click="resetFilters" />
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card flat bordered data-testid="received-invoices-table">
      <q-table :rows="invoices" :columns="columns" row-key="id" :loading="loading"
        :pagination="{ rowsPerPage: 20 }" flat @row-click="(_, row) => openDetail(row as ReceivedInvoice)">

        <template #body-cell-supplier="props">
          <q-td :props="props">
            <span class="text-weight-medium">{{ props.row.suppliers?.name ?? '—' }}</span>
            <div v-if="props.row.suppliers?.ifu" class="text-caption text-grey-6">IFU : {{ props.row.suppliers.ifu }}</div>
          </q-td>
        </template>

        <template #body-cell-total_ttc="props">
          <q-td :props="props" class="text-right text-weight-medium">
            {{ fmtAmount(props.value) }} XOF
          </q-td>
        </template>

        <template #body-cell-payment_status="props">
          <q-td :props="props">
            <q-badge :color="paymentStatusColor(props.value)" :label="paymentStatusLabel(props.value)" />
            <!-- Indicateur % réglé pour paiement partiel -->
            <template v-if="props.value === 'partial' && props.row.total_ttc > 0">
              <br>
              <div class="q-mt-xs" style="min-width:90px">
                <q-linear-progress
                  :value="Number(props.row.paid_amount) / Number(props.row.total_ttc)"
                  color="orange"
                  track-color="orange-2"
                  rounded
                  size="6px"
                  class="q-mb-xs"
                />
                <span class="text-caption text-orange-9">
                  {{ fmtAmount(props.row.paid_amount) }} / {{ fmtAmount(props.row.total_ttc) }} FCFA
                  ({{ Math.round(Number(props.row.paid_amount) / Number(props.row.total_ttc) * 100) }}%)
                </span>
              </div>
            </template>
          </q-td>
        </template>

        <template #body-cell-fiscal_compliance_status="props">
          <q-td :props="props">
            <q-badge :color="complianceColor(props.value)" :label="complianceLabel(props.value)" />
          </q-td>
        </template>

        <template #body-cell-due_date="props">
          <q-td :props="props" :class="isOverdue(props.row) ? 'text-negative text-weight-bold' : ''">
            {{ props.value ?? '—' }}
            <q-badge v-if="isOverdue(props.row)" color="negative" label="Échu" class="q-ml-xs" />
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right" @click.stop>
            <!-- Visionneuse inline (sans telechargement) -->
            <q-btn
              v-if="props.row.scan_url || props.row.ocr_source_url"
              flat round dense size="sm" icon="visibility" color="teal-7"
              title="Visualiser la facture"
              @click="openInvoiceViewer(props.row)"
            />
            <!-- Lien vers la facture PDF/scan (telechargement/onglet) -->
            <q-btn
              v-if="props.row.scan_url || props.row.ocr_source_url"
              flat round dense size="sm" icon="picture_as_pdf" color="indigo-6"
              title="Ouvrir la facture"
              @click="openInvoiceFile(props.row)"
            />
            <!-- Historique des paiements -->
            <q-btn flat round dense size="sm" icon="history" color="blue-7"
              title="Historique des paiements"
              @click="openPaymentHistory(props.row)" />
            <q-btn flat round dense size="sm" icon="payments" color="positive"
              title="Enregistrer paiement" @click="openPaymentDialog(props.row)" data-testid="received-invoice-payment-btn" />
            <!-- Boutons workflow -->
            <q-btn
              v-if="props.row.status === 'draft'"
              flat round dense size="sm" icon="send" color="primary"
              title="Soumettre pour validation"
              @click="confirmSubmit(props.row)" data-testid="received-invoice-submit-btn" />
            <q-btn
              v-if="props.row.status === 'pending_validation'"
              flat round dense size="sm" icon="thumb_up" color="teal-7"
              title="Approuver"
              @click="confirmApprove(props.row)" data-testid="received-invoice-approve-btn" />
            <q-btn
              v-if="props.row.status === 'approved'"
              flat round dense size="sm" icon="verified" color="positive"
              title="Valider définitivement"
              @click="confirmValidate(props.row)" data-testid="received-invoice-validate-btn" />
            <q-btn flat round dense size="sm" icon="edit" color="grey-7"
              title="Voir / Modifier" @click="openEdit(props.row)" data-testid="received-invoice-edit-btn" />
            <!-- Annuler (visible si pas déjà annulé ou validé) -->
            <q-btn
              v-if="['draft','pending_validation','approved'].includes(props.row.status)"
              flat round dense size="sm" icon="cancel" color="orange-7"
              title="Annuler la facture"
              @click="confirmCancel(props.row)" data-testid="received-invoice-cancel-btn" />
            <!-- Supprimer (uniquement brouillon sans paiement) -->
            <q-btn
              v-if="props.row.status === 'draft' && props.row.paid_amount === 0 && props.row.payment_status === 'unpaid'"
              flat round dense size="sm" icon="delete_forever" color="negative"
              title="Supprimer la facture"
              @click="confirmDelete(props.row)" data-testid="received-invoice-delete-btn" />
          </q-td>
        </template>


        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6">
            <q-icon name="receipt" size="48px" class="q-mb-sm" /><br>
            Aucune facture reçue
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog OCR : Upload + Progression -->
    <q-dialog v-model="showOcrDialog" persistent>
      <q-card style="min-width:580px;max-width:660px">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="document_scanner" color="teal-7" class="q-mr-sm" />
          <div class="text-h6">Import facture par OCR IA</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeOcrDialog"
            :disable="['converting','analyzing','matching'].includes(ocrState.step)" />
        </q-card-section>

        <!-- IDLE: drop zone -->
        <q-card-section v-if="ocrState.step === 'idle'">
          <div class="text-caption text-grey-7 q-mb-md">
            📄 Facture scannée (PDF, JPG, PNG) — l'IA extrait les données, vous les vérifiez avant import
          </div>
          <div
            class="ocr-drop-zone column items-center justify-center q-pa-xl rounded-borders cursor-pointer"
            :class="{ 'ocr-drop-active': ocrDragOver }"
            @dragover.prevent="ocrDragOver = true"
            @dragleave="ocrDragOver = false"
            @drop.prevent="onOcrDrop"
            @click="ocrFileInput?.click()"
          >
            <q-icon name="upload_file" size="64px" color="grey-4" />
            <div class="text-subtitle2 text-grey-6 q-mt-sm">Glissez ou cliquez pour sélectionner</div>
            <div class="text-caption text-grey-5 q-mt-xs">PDF scanné, JPG, PNG, TIFF — max 15 Mo</div>
          </div>
          <input ref="ocrFileInput" data-testid="invoice-ocr-file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,image/*" class="hidden" @change="onOcrFilePicked" />
        </q-card-section>

        <!-- PROCESSING -->
        <q-card-section v-else-if="['converting','analyzing','matching'].includes(ocrState.step)" class="q-pa-lg">
          <div class="text-center q-mb-lg">
            <q-spinner-oval size="52px" color="teal-7" />
          </div>
          <q-linear-progress :value="ocrState.progress / 100" color="teal-7" class="q-mb-md" rounded />
          <div class="text-body2 text-center text-grey-7">{{ ocrState.message }}</div>
          <div class="row justify-center q-mt-lg q-gutter-sm">
            <q-chip :color="ocrState.progress >= 10 ? 'teal-7' : 'grey-3'" text-color="white" dense icon="picture_as_pdf" label="Conversion" />
            <q-chip :color="ocrState.progress >= 40 ? 'teal-7' : 'grey-3'" text-color="white" dense icon="psychology" label="IA Vision" />
            <q-chip :color="ocrState.progress >= 80 ? 'teal-7' : 'grey-3'" text-color="white" dense icon="business" label="Fournisseur" />
          </div>
        </q-card-section>

        <!-- ERROR -->
        <q-card-section v-else-if="ocrState.step === 'error'">
          <q-banner dense rounded class="bg-negative text-white q-mb-sm">
            <template #avatar><q-icon name="error_outline" /></template>
            {{ ocrState.error }}
          </q-banner>
          <q-btn flat no-caps label="Réessayer avec un autre fichier" icon="refresh" @click="ocrReset" />
        </q-card-section>

        <!-- READY : extraction terminée, invite à reviewer -->
        <q-card-section v-else-if="ocrState.step === 'ready'">
          <q-banner dense rounded class="bg-teal-1 text-teal-9 q-mb-sm">
            <template #avatar><q-icon name="check_circle" color="teal-7" /></template>
            Extraction réussie — Cliquez sur <strong>"Vérifier & Corriger"</strong> pour valider avant import
          </q-banner>
          <div class="text-caption text-grey-7">{{ ocrState.message }}</div>
        </q-card-section>

        <q-card-actions v-if="ocrState.step === 'ready'" align="right" class="q-px-md q-pb-md">
          <q-btn flat no-caps label="Annuler" @click="closeOcrDialog" />
          <q-btn flat no-caps label="Importer une autre" icon="refresh" @click="ocrReset" />
          <q-btn color="teal-8" no-caps icon="edit_note" label="Vérifier & Corriger"
            @click="openOcrReview" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog Review OCR (plein écran) -->
    <ocr-invoice-review-dialog
      v-model="showOcrReview"
      :extracted="ocrState.extracted"
      :source-file="ocrSourceFile"
      :source-url="null"
      @saved="onOcrSaved"
    />

    <!-- Visionneuse facture inline -->
    <q-dialog v-model="showViewerDialog" maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card class="column" style="background:#1a1a2e">
        <!-- Header -->
        <q-card-section class="row items-center q-py-sm" style="background:#16213e">
          <q-icon name="picture_as_pdf" color="indigo-3" size="22px" class="q-mr-sm" />
          <div class="text-white text-weight-medium">
            {{ viewingInvoice?.suppliers?.name ?? viewingInvoice?.reference }}
          </div>
          <div v-if="viewingInvoice?.reference" class="text-caption text-indigo-3 q-ml-sm">
            · {{ viewingInvoice.reference }}
          </div>
          <q-space />
          <q-btn flat round dense icon="close" color="white" v-close-popup />
        </q-card-section>
        <!-- Visionneuse -->
        <div class="col" style="position:relative">
          <iframe
            v-if="viewerUrl"
            :src="viewerUrl"
            style="width:100%;height:100%;border:none;background:#fff"
            allow="fullscreen"
          />
        </div>
      </q-card>
    </q-dialog>

    <!-- Wizard Creer/Modifier -->
    <received-invoice-wizard
      v-model="showForm"
      :invoice="editingInvoice"
      :read-only="wizardReadOnly"
      @saved="onInvoiceSaved"
    />

    <!-- Dialog Paiement (composant dédié) -->
    <payment-dialog
      v-model="showPaymentDialog"
      :invoice="payingInvoice"
      @saved="onPaymentSaved"
    />
    <!-- Dialog Historique Paiements -->
    <q-dialog v-model="showHistoryDialog">
      <q-card style="min-width:520px;max-width:640px">
        <q-card-section class="row items-center q-pb-none">
          <q-icon name="history" color="blue-7" class="q-mr-sm" size="20px" />
          <div class="text-subtitle1 text-weight-bold">Historique des paiements</div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <!-- Résumé facture -->
        <q-card-section class="q-py-sm bg-grey-1">
          <div class="row items-center q-gutter-sm">
            <q-badge color="blue-8" :label="historyInvoice?.reference ?? ''"/>
            <span class="text-caption text-grey-7">{{ historyInvoice?.suppliers?.name ?? '' }}</span>
            <q-space />
            <div class="text-caption">
              Payé : <strong class="text-positive">{{ fmtAmount(historyInvoice?.paid_amount ?? 0) }} FCFA</strong>
              / {{ fmtAmount(historyInvoice?.total_ttc ?? 0) }} FCFA
            </div>
          </div>
          <q-linear-progress
            v-if="historyInvoice && Number(historyInvoice.total_ttc) > 0"
            :value="Number(historyInvoice.paid_amount) / Number(historyInvoice.total_ttc)"
            :color="historyInvoice.payment_status === 'paid' ? 'positive' : 'orange'"
            track-color="grey-3" rounded size="8px" class="q-mt-sm"
          />
          <div class="text-caption text-right q-mt-xs">
            <span v-if="historyInvoice?.payment_status === 'partial'" class="text-orange-9">
              Restant : {{ fmtAmount(Number(historyInvoice.total_ttc) - Number(historyInvoice.paid_amount)) }} FCFA
              ({{ Math.round(Number(historyInvoice.paid_amount) / Number(historyInvoice.total_ttc) * 100) }}% réglé)
            </span>
            <span v-else-if="historyInvoice?.payment_status === 'paid'" class="text-positive">Facture soldée</span>
          </div>
        </q-card-section>
        <!-- Liste des paiements -->
        <q-card-section class="q-pa-sm" style="max-height:350px;overflow-y:auto">
          <q-inner-loading :showing="historyLoading" label="Chargement..." />
          <div v-if="!historyLoading && historyPayments.length === 0" class="text-center text-grey-6 q-pa-md">
            <q-icon name="payments" size="32px" class="q-mb-xs" /><br>
            Aucun paiement enregistré
          </div>
          <q-list separator v-else>
            <q-item v-for="p in historyPayments" :key="p.id" class="q-py-sm">
              <q-item-section avatar>
                <q-avatar :color="methodColor(p.payment_method)" text-color="white" size="36px">
                  <q-icon :name="methodIcon(p.payment_method)" size="18px" />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">
                  {{ fmtAmount(p.amount) }} FCFA
                  <q-badge :color="methodColor(p.payment_method)" :label="methodLabel(p.payment_method)" class="q-ml-xs" />
                </q-item-label>
                <q-item-label caption>{{ p.payment_date }} · {{ p.reference || 'Sans référence' }}</q-item-label>
                <q-item-label v-if="parseNotes(p.notes).text" caption class="text-grey-6">
                  {{ parseNotes(p.notes).text }}
                </q-item-label>
                <q-item-label v-if="parseNotes(p.notes).proofUrl" caption>
                  <q-icon name="attach_file" size="xs" class="q-mr-xs text-teal-7" />
                  <a :href="parseNotes(p.notes).proofUrl!" target="_blank"
                    class="text-teal-7 text-weight-medium"
                    style="text-decoration:none;cursor:pointer"
                    @click.stop>
                    {{ parseNotes(p.notes).proofName }}
                  </a>
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="text-caption text-grey-5">{{ p.payment_date }}</div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Fermer" v-close-popup />
          <q-btn v-if="historyInvoice?.payment_status !== 'paid'" color="positive" icon="payments"
            label="Ajouter un paiement" no-caps
            @click="showHistoryDialog = false; openPaymentDialog(historyInvoice!)" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useReceivedInvoices, type ReceivedInvoice } from 'src/composables/useReceivedInvoices';
import { useSuppliers } from 'src/composables/useSuppliers';
import { useBankAccounts } from 'src/composables/useBankAccounts';
import { useInvoicePayments } from 'src/composables/useInvoicePayments';
import { useSupplierInvoiceOcr } from 'src/composables/useSupplierInvoiceOcr';
import OcrInvoiceReviewDialog from 'src/components/invoices/OcrInvoiceReviewDialog.vue';
import ReceivedInvoiceWizard from 'src/components/invoices/ReceivedInvoiceWizard.vue';
import PaymentDialog from 'src/components/payments/PaymentDialog.vue';
import type { InvoicePaymentStatus, FiscalComplianceStatus } from 'src/types';

const $q = useQuasar();
const {
  invoices, loading, error, stats,
  loadInvoices, cancelInvoice, deleteInvoice,
  submitInvoice, approveInvoice, validateInvoice,
} = useReceivedInvoices();
const { state: ocrState, reset: ocrReset, extractOnly: ocrExtract } = useSupplierInvoiceOcr();

const showOcrDialog  = ref(false);
const showOcrReview  = ref(false);
const ocrDragOver   = ref(false);
const ocrFileInput  = ref<HTMLInputElement | null>(null);
const ocrSourceFile = ref<File | null>(null);

function closeOcrDialog() {
  if (['converting', 'analyzing', 'matching'].includes(ocrState.value.step)) return;
  showOcrDialog.value = false;
  ocrSourceFile.value = null;
  ocrReset();
}

async function runOcr(file: File) {
  if (file.size > 15 * 1024 * 1024) {
    $q.notify({ type: 'warning', message: 'Fichier trop grand (max 15 Mo)' }); return;
  }
  ocrSourceFile.value = file;
  await ocrExtract(file);
  // step passe à 'ready' → bouton "Vérifier & Corriger" apparaît
}

function openOcrReview() {
  showOcrDialog.value = false;
  showOcrReview.value = true;
}

async function onOcrSaved() {
  showOcrReview.value = false;
  ocrSourceFile.value = null;
  ocrReset();
  await applyFilters();
}

function onOcrFilePicked(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) void runOcr(f);
  if (ocrFileInput.value) ocrFileInput.value.value = '';
}

function onOcrDrop(e: DragEvent) {
  ocrDragOver.value = false;
  const f = e.dataTransfer?.files?.[0];
  if (f) void runOcr(f);
}


const { suppliers, loadSuppliers } = useSuppliers();
const { accounts, loadAccounts } = useBankAccounts();

// Filtres
const filterPaymentStatus = ref<InvoicePaymentStatus | null>(null);
const filterCompliance    = ref<FiscalComplianceStatus | null>(null);
const filterSupplier      = ref<string | null>(null);
const filterDateFrom      = ref('');
const filterDateTo        = ref('');

const supplierOptions = computed(() =>
  suppliers.value.map(s => ({ label: s.name, value: s.id }))
);
const accountOptions = computed(() =>
  accounts.value.map((a: { account_number: string; bank_name: string; id: string }) => ({ label: `${a.account_number} — ${a.bank_name}`, value: a.id }))
);

const paymentStatusOptions = [
  { label: 'Non payé',  value: 'unpaid' },
  { label: 'Partiel',   value: 'partial' },
  { label: 'Payé',      value: 'paid' },
  { label: 'Excédent',  value: 'overpaid' },
];
const complianceOptions = [
  { label: 'En attente', value: 'pending' },
  { label: 'Valide',     value: 'valid' },
  { label: 'Non valide', value: 'invalid' },
  { label: 'Non vérifié', value: 'unchecked' },
];
const paymentMethodOptions = [
  { label: 'Virement bancaire',  value: 'bank_transfer', icon: 'account_balance' },
  { label: 'Chèque',            value: 'check',          icon: 'edit_note' },
  { label: 'Mobile Money',      value: 'mobile_money',   icon: 'smartphone' },
  { label: 'Carte bancaire',    value: 'card',           icon: 'credit_card' },
  { label: 'Espèces',           value: 'cash',           icon: 'payments' },
  { label: 'Autre',             value: 'other',          icon: 'more_horiz' },
];

const columns = [
  { name: 'supplier',                 label: 'Fournisseur',       field: 'supplier',                    align: 'left'   as const },
  { name: 'supplier_invoice_number',  label: 'N° Fact. Fourn.',   field: 'supplier_invoice_number',     align: 'left'   as const },
  { name: 'reference',                label: 'BC / Réf. Interne', field: 'reference',                   align: 'left'   as const },
  { name: 'total_ttc',                label: 'Montant TTC',       field: 'total_ttc',                   align: 'right'  as const, sortable: true },
  { name: 'due_date',                 label: 'Échéance',          field: 'due_date',                    align: 'center' as const, sortable: true },
  { name: 'payment_status',           label: 'Paiement',          field: 'payment_status',              align: 'center' as const },
  { name: 'fiscal_compliance_status', label: 'Conformité',        field: 'fiscal_compliance_status',    align: 'center' as const },
  { name: 'actions',                  label: '',                  field: 'id',                          align: 'right'  as const },
];

function paymentStatusColor(s: InvoicePaymentStatus): string {
  const m: Record<string, string> = { unpaid: 'negative', partial: 'orange', paid: 'positive', overpaid: 'blue', cancelled: 'grey' };
  return m[s] ?? 'grey';
}
function paymentStatusLabel(s: InvoicePaymentStatus): string {
  const m: Record<string, string> = { unpaid: 'Non payé', partial: 'Partiel', paid: 'Payé', overpaid: 'Excédent', cancelled: 'Annulé' };
  return m[s] ?? s;
}
function complianceColor(s: FiscalComplianceStatus): string {
  const m: Record<string, string> = { pending: 'grey', valid: 'positive', invalid: 'negative', unchecked: 'orange' };
  return m[s] ?? 'grey';
}
function complianceLabel(s: FiscalComplianceStatus): string {
  const m: Record<string, string> = { pending: 'En attente', valid: 'Valide', invalid: 'Non valide', unchecked: 'Non vérifié' };
  return m[s] ?? s;
}
function fmtAmount(n: number): string {
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0 });
}
function isOverdue(inv: ReceivedInvoice): boolean {
  if (!inv.due_date || inv.payment_status === 'paid') return false;
  return new Date(inv.due_date) < new Date();
}

async function applyFilters() {
  const opts: Parameters<typeof loadInvoices>[0] = {};
  if (filterPaymentStatus.value) opts.payment_status            = filterPaymentStatus.value;
  if (filterCompliance.value)    opts.fiscal_compliance_status  = filterCompliance.value;
  if (filterSupplier.value)      opts.supplier_id               = filterSupplier.value;
  if (filterDateFrom.value)      opts.date_from                 = filterDateFrom.value;
  if (filterDateTo.value)        opts.date_to                   = filterDateTo.value;
  await loadInvoices(opts);
}
function resetFilters() {
  filterPaymentStatus.value = null; filterCompliance.value = null;
  filterSupplier.value = null; filterDateFrom.value = ''; filterDateTo.value = '';
  void applyFilters();
}

// Form (wizard)
const showForm       = ref(false);
const editingInvoice = ref<ReceivedInvoice | null>(null);
const wizardReadOnly = ref(false);

const READ_ONLY_STATUSES = ['validated', 'certified', 'pending_validation', 'approved'];

function openCreate() { editingInvoice.value = null; wizardReadOnly.value = false; showForm.value = true; }
function openEdit(inv: ReceivedInvoice) {
  editingInvoice.value = inv;
  wizardReadOnly.value = READ_ONLY_STATUSES.includes(inv.status);
  showForm.value = true;
}
function openDetail(inv: ReceivedInvoice) { openEdit(inv); }
function onInvoiceSaved() { void applyFilters(); }
function openInvoiceFile(inv: ReceivedInvoice) {
  const url = inv.scan_url || inv.ocr_source_url;
  if (url) window.open(url, '_blank');
}

// ── Actions workflow ─────────────────────────────────────────────────────────
function confirmSubmit(inv: ReceivedInvoice) {
  $q.dialog({
    title: 'Soumettre pour validation',
    message: `Soumettre la facture ${inv.reference ?? ''} pour validation ?`,
    cancel: true, ok: { color: 'primary', label: 'Soumettre' },
  }).onOk(async () => {
    const ok = await submitInvoice(inv.id);
    if (ok) { $q.notify({ type: 'positive', message: 'Facture soumise pour validation' }); void applyFilters(); }
    else     { $q.notify({ type: 'negative', message: 'Erreur lors de la soumission' }); }
  });
}

function confirmApprove(inv: ReceivedInvoice) {
  $q.dialog({
    title: 'Approuver la facture',
    message: `Approuver la facture ${inv.reference ?? ''} ?`,
    cancel: true, ok: { color: 'teal', label: 'Approuver' },
  }).onOk(async () => {
    const ok = await approveInvoice(inv.id);
    if (ok) { $q.notify({ type: 'positive', message: 'Facture approuvée' }); void applyFilters(); }
    else     { $q.notify({ type: 'negative', message: 'Erreur lors de l\'approbation' }); }
  });
}

function confirmValidate(inv: ReceivedInvoice) {
  $q.dialog({
    title: 'Valider la facture',
    message: `Valider définitivement la facture ${inv.reference ?? ''} ?\nElle deviendra non modifiable.`,
    cancel: true, ok: { color: 'positive', label: 'Valider' },
  }).onOk(async () => {
    const ok = await validateInvoice(inv.id);
    if (ok) { $q.notify({ type: 'positive', message: 'Facture validée' }); void applyFilters(); }
    else     { $q.notify({ type: 'negative', message: 'Erreur lors de la validation' }); }
  });
}

// ── Annuler facture ──────────────────────────────────────────────────────────
function confirmCancel(inv: ReceivedInvoice) {
  $q.dialog({
    title: 'Annuler la facture',
    message: `Annuler la facture ${inv.reference ?? inv.supplier_invoice_number ?? ''} ?\nElle restera dans le système avec le statut "Annulée".`,
    cancel: true,
    ok: { color: 'orange', label: 'Annuler la facture', flat: false },
  }).onOk(async () => {
    const ok = await cancelInvoice(inv.id);
    if (ok) {
      $q.notify({ type: 'positive', message: 'Facture annulée' });
      void applyFilters();
    } else {
      $q.notify({ type: 'negative', message: error.value || 'Erreur lors de l\'annulation' });
    }
  });
}

// ── Supprimer facture (sans paiement uniquement) ─────────────────────────────
function confirmDelete(inv: ReceivedInvoice) {
  if (inv.paid_amount > 0 || inv.payment_status !== 'unpaid') {
    $q.notify({ type: 'warning', message: 'Impossible de supprimer une facture avec des paiements enregistrés. Utilisez "Annuler" à la place.' });
    return;
  }
  if (inv.status !== 'draft') {
    $q.notify({ type: 'warning', message: 'Seules les factures en brouillon peuvent être supprimées.' });
    return;
  }
  $q.dialog({
    title: 'Supprimer définitivement',
    message: `Supprimer la facture ${inv.reference ?? ''} ?\n⚠️ Cette action est irréversible.`,
    cancel: true,
    ok: { color: 'negative', label: 'Supprimer', flat: false },
  }).onOk(async () => {
    const ok = await deleteInvoice(inv.id);
    if (ok) {
      $q.notify({ type: 'positive', message: 'Facture supprimée' });
    } else {
      $q.notify({ type: 'negative', message: error.value || 'Erreur lors de la suppression' });
    }
  });
}


// Visionneuse inline
const showViewerDialog = ref(false);
const viewingInvoice   = ref<ReceivedInvoice | null>(null);
const viewerUrl        = ref('');

function openInvoiceViewer(inv: ReceivedInvoice) {
  const url = inv.scan_url || inv.ocr_source_url;
  if (!url) return;
  viewingInvoice.value = inv;
  viewerUrl.value = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
  showViewerDialog.value = true;
}

// Payment dialog (délégué au composant PaymentDialog)
const showPaymentDialog = ref(false);
const payingInvoice     = ref<ReceivedInvoice | null>(null);

function openPaymentDialog(inv: ReceivedInvoice) {
  payingInvoice.value     = inv;
  showPaymentDialog.value = true;
}
async function onPaymentSaved() {
  await applyFilters();
}

// ── Historique des paiements ─────────────────────────────────────────────────
const { payments: historyPayments, loading: historyLoading, loadPayments } = useInvoicePayments();
const showHistoryDialog = ref(false);
const historyInvoice    = ref<ReceivedInvoice | null>(null);

async function openPaymentHistory(inv: ReceivedInvoice) {
  historyInvoice.value    = inv;
  showHistoryDialog.value = true;
  await loadPayments(inv.id);
}

// ── Helpers moyen de paiement ────────────────────────────────────────────────
const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Virement', check: 'Chèque', mobile_money: 'Mobile Money',
  card: 'Carte', cash: 'Espèces', other: 'Autre',
};
const METHOD_ICONS: Record<string, string> = {
  bank_transfer: 'account_balance', check: 'edit_note',
  mobile_money: 'smartphone', card: 'credit_card', cash: 'payments', other: 'more_horiz',
};
const METHOD_COLORS: Record<string, string> = {
  bank_transfer: 'blue-8', check: 'indigo-6', mobile_money: 'orange-8',
  card: 'purple-7', cash: 'teal-7', other: 'grey-7',
};
function methodLabel(m: string) { return METHOD_LABELS[m] ?? m; }
function methodIcon(m: string)  { return METHOD_ICONS[m]  ?? 'payments'; }
function methodColor(m: string) { return METHOD_COLORS[m] ?? 'grey-7'; }

// ── Parser les notes du paiement pour extraire le justificatif ───────────────
function parseNotes(notes: string | null | undefined): { text: string; proofUrl: string | null; proofName: string | null } {
  if (!notes) return { text: '', proofUrl: null, proofName: null };
  const parts = notes.split(' | ');
  const proofPart = parts.find(p => p.startsWith('Justificatif : '));
  const proofUrl  = proofPart ? proofPart.replace('Justificatif : ', '').trim() : null;
  let proofName: string | null = null;
  if (proofUrl) {
    // Extraire le nom du fichier depuis l'URL (dernier segment avant ?)
    const segment = proofUrl.split('/').pop()?.split('?')[0] ?? '';
    // Décoder et retirer le timestamp initial (ex: 1780064834848-nom.pdf → nom.pdf)
    const decoded = decodeURIComponent(segment).replace(/^payments[\\/]/, '').replace(/^\d+-/, '');
    proofName = decoded || 'Justificatif';
  }
  const textParts = parts.filter(p => !p.startsWith('Justificatif : '));
  return { text: textParts.join(' | '), proofUrl, proofName };
}

onMounted(async () => {
  await Promise.all([loadSuppliers(), applyFilters()]);
});
</script>

<style scoped>
.kpi-card { min-width: 130px; flex: 1; }
.kpi-card--partial { border-color: #fb8c00 !important; transition: box-shadow .2s; }
.kpi-card--partial:hover { box-shadow: 0 2px 12px rgba(251,140,0,.25) !important; }
.ocr-drop-zone {
  border: 2px dashed #ccc;
  min-height: 140px;
  transition: border-color 0.2s, background 0.2s;
}
.ocr-drop-zone:hover, .ocr-drop-active { border-color: var(--q-secondary); background: rgba(0,150,136,0.04); }
.hidden { display: none; }
</style>
