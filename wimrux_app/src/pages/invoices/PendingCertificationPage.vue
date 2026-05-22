<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5">Factures en attente de certification</div>
      <q-space />
      <q-btn
        flat
        round
        icon="refresh"
        :loading="loading"
        @click="loadPendingInvoices"
      >
        <q-tooltip>Rafraîchir</q-tooltip>
      </q-btn>
    </div>

    <!-- Info banner — message adapté au mode de certification -->
    <q-banner class="bg-info text-white q-mb-md" v-if="!hideInfo">
      <template v-slot:avatar>
        <q-icon name="info" />
      </template>
      <span v-if="isDeviceMode">
        Les factures validées apparaissent ici en attente de certification via WIMRUX FACTURATION (Electron).
        Utilisez le bouton <q-icon name="send" size="xs" /> pour les envoyer au dispositif.
      </span>
      <span v-else-if="isManualMode">
        Les factures validées apparaissent ici en attente de certification manuelle.
        Utilisez le bouton <q-icon name="edit_note" size="xs" /> pour saisir les données de certification.
      </span>
      <span v-else>
        La certification est désactivée. Ces factures resteront au statut "Validée".
      </span>
      <template v-slot:action>
        <q-btn flat label="Compris" @click="hideInfo = true" />
      </template>
    </q-banner>

    <!-- Stats -->
    <div class="row q-gutter-md q-mb-md">
      <q-card class="col" flat bordered>
        <q-card-section class="bg-yellow-1">
          <div class="text-h6">{{ stats.pending }}</div>
          <div class="text-caption">En attente</div>
        </q-card-section>
      </q-card>
      <q-card class="col" flat bordered>
        <q-card-section class="bg-green-1">
          <div class="text-h6">{{ stats.certified }}</div>
          <div class="text-caption">Certifiées (session)</div>
        </q-card-section>
      </q-card>
      <q-card class="col" flat bordered>
        <q-card-section class="bg-red-1">
          <div class="text-h6">{{ stats.failed }}</div>
          <div class="text-caption">Échouées</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Filters -->
    <div class="row q-gutter-sm q-mb-md">
      <q-input
        v-model="filter.reference"
        label="Référence"
        outlined
        dense
        clearable
        style="width: 200px"
      />
      <q-input
        v-model="filter.client"
        label="Client"
        outlined
        dense
        clearable
        style="width: 200px"
      />
      <q-date-input
        v-model="filter.dateFrom"
        label="Du"
        outlined
        dense
        style="width: 150px"
      />
      <q-date-input
        v-model="filter.dateTo"
        label="Au"
        outlined
        dense
        style="width: 150px"
      />
      <q-space />
      <q-btn flat label="Réinitialiser" @click="resetFilters" />
    </div>

    <!-- Data table -->
    <q-table
      :rows="filteredInvoices"
      :columns="columns"
      row-key="id"
      :loading="loading"
      flat
      bordered
      :pagination="{ rowsPerPage: 10 }"
    >
      <template v-slot:body-cell-total="props">
        <q-td :props="props" class="text-right">
          {{ formatAmount(props.row.total_ttc) }}
        </q-td>
      </template>

      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-badge color="orange" label="En attente certification" />
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <div class="row q-gutter-xs">
            <q-btn
              v-if="isDeviceMode"
              flat round dense icon="send" color="primary"
              @click="sendToDevice(props.row)"
            ><q-tooltip>Envoyer au device de certification</q-tooltip></q-btn>
            <q-btn
              v-if="isManualMode"
              flat round dense icon="edit_note" color="teal"
              @click="openManualDialog(props.row)"
            ><q-tooltip>Saisir certification manuelle</q-tooltip></q-btn>
            <q-btn
              flat round dense icon="visibility" color="grey"
              :to="`/app/invoices/${props.row.id}`"
            ><q-tooltip>Voir la facture</q-tooltip></q-btn>
            <q-btn
              flat round dense icon="undo" color="negative"
              @click="cancelPending(props.row)"
            ><q-tooltip>Retour à validée</q-tooltip></q-btn>
          </div>
        </q-td>
      </template>

      <template v-slot:no-data>
        <div class="text-center q-pa-md">
          <q-icon name="check_circle" size="48px" color="green" />
          <div class="text-h6 q-mt-sm">Aucune facture en attente</div>
          <div class="text-caption text-grey">
            Toutes les factures validées ont été certifiées ou sont en cours
          </div>
        </div>
      </template>
    </q-table>

    <!-- Dialog: Send to device -->
    <q-dialog v-model="showSendDialog">
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-icon name="send" color="primary" size="32px" class="q-mr-md" />
          <div>
            <div class="text-h6">Envoyer au device</div>
            <div class="text-caption">
              {{ selectedInvoice?.reference }} - {{ formatAmount(selectedInvoice?.total_ttc || 0) }}
            </div>
          </div>
        </q-card-section>

        <q-card-section>
          <p>
            Cette facture sera transmise à WIMRUX FACTURATION (Electron) pour certification.
          </p>
          <q-list dense>
            <q-item>
              <q-item-section side>Numéro:</q-item-section>
              <q-item-section>{{ selectedInvoice?.reference }}</q-item-section>
            </q-item>
            <q-item>
              <q-item-section side>Client:</q-item-section>
              <q-item-section>{{ selectedInvoice?.client?.name }}</q-item-section>
            </q-item>
            <q-item>
              <q-item-section side>Montant:</q-item-section>
              <q-item-section class="text-weight-bold text-primary">
                {{ formatAmount(selectedInvoice?.total_ttc || 0) }}
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            color="primary"
            label="Confirmer l'envoi"
            @click="confirmSend"
            :loading="sending"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog: Manual certification -->
    <q-dialog v-model="showManualDialog" persistent>
      <q-card style="min-width: 500px; max-width: 700px">
        <q-card-section class="row items-center bg-primary text-white">
          <q-icon name="verified" size="32px" class="q-mr-md" />
          <div class="text-h6">Certification manuelle</div>
        </q-card-section>

        <q-card-section>
          <p class="text-caption">
            Utilisez cette option si la facture a été certifiée hors du système (MCF physique, etc.)
          </p>

          <q-form @submit.prevent="confirmManualCertify" class="q-gutter-md">
            <q-input
              v-model="manualForm.nim"
              label="NIM (Numéro d'Identification du MCF)"
              outlined
              :rules="[v => !!v || 'Requis']"
            />
            <q-input
              v-model="manualForm.code_secef"
              label="Code SECeF"
              outlined
              :rules="[v => !!v || 'Requis']"
            />
            <q-input
              v-model="manualForm.fiscal_number"
              label="Numéro fiscal"
              outlined
            />
            <q-input
              v-model="manualForm.qr_code"
              label="QR Code (contenu complet)"
              outlined
              type="textarea"
              rows="3"
            />
            <q-file
              v-model="manualForm.scan_file"
              label="Scan de la facture certifiée (PDF)"
              outlined
              accept=".pdf"
              hint="Optionnel mais recommandé"
            />
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            color="primary"
            label="Certifier manuellement"
            @click="confirmManualCertify"
            :loading="manualCertifying"
            :disable="!manualForm.nim || !manualForm.code_secef"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { insforge } from 'src/boot/insforge';
import { useFiscalProfile } from 'src/composables/useFiscalProfile';

const $q = useQuasar();
const { isDeviceMode, isManualMode } = useFiscalProfile();

// State
const loading = ref(false);
const hideInfo = ref(false);
const invoices = ref<any[]>([]);
const filter = ref({
  reference: '',
  client: '',
  dateFrom: '',
  dateTo: '',
});

const stats = ref({
  pending: 0,
  certified: 0,
  failed: 0,
});

// Dialog state
const showSendDialog = ref(false);
const showManualDialog = ref(false);
const selectedInvoice = ref<any>(null);
const sending = ref(false);
const manualCertifying = ref(false);

const manualForm = ref({
  nim: '',
  code_secef: '',
  fiscal_number: '',
  qr_code: '',
  scan_file: null,
});

// Table columns
const columns = [
  { name: 'reference', label: 'Référence', field: 'reference', align: 'left' as const, sortable: true },
  { name: 'date', label: 'Date', field: 'date', align: 'left' as const, sortable: true, format: (val: string) => new Date(val).toLocaleDateString('fr-FR') },
  { name: 'client', label: 'Client', field: (row: Record<string, unknown>) => (row.client as { name?: string })?.name || '-', align: 'left' as const, sortable: true },
  { name: 'total', label: 'Total TTC', field: 'total_ttc', align: 'right' as const, sortable: true },
  { name: 'status', label: 'Statut', field: 'status', align: 'center' as const },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' as const },
];

// Computed
const filteredInvoices = computed(() => {
  return invoices.value.filter((inv: any) => {
    if (filter.value.reference && !inv.reference?.toLowerCase().includes(filter.value.reference.toLowerCase())) {
      return false;
    }
    if (filter.value.client && !inv.client?.name?.toLowerCase().includes(filter.value.client.toLowerCase())) {
      return false;
    }
    return true;
  });
});

// Methods
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-BF', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(amount || 0);
}

function resetFilters() {
  filter.value = { reference: '', client: '', dateFrom: '', dateTo: '' };
}

async function loadPendingInvoices() {
  loading.value = true;
  try {
    const { data, error } = await insforge.database
      .from('invoices')
      .select('*, client:clients(name, ifu)')
      .eq('status', 'validated')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    invoices.value = data || [];
    stats.value.pending = invoices.value.length;
  } catch (error: any) {
    $q.notify({ type: 'negative', message: `Erreur chargement: ${error.message}` });
  } finally {
    loading.value = false;
  }
}

function sendToDevice(invoice: any) {
  selectedInvoice.value = invoice;
  showSendDialog.value = true;
}

function openManualDialog(invoice: any) {
  selectedInvoice.value = invoice;
  manualForm.value = { nim: '', code_secef: '', fiscal_number: '', qr_code: '', scan_file: null };
  showManualDialog.value = true;
}

async function confirmSend() {
  if (!selectedInvoice.value) return;
  sending.value = true;
  try {
    const { error } = await insforge.database
      .from('invoices')
      .update({ status: 'pending_certification' })
      .eq('id', selectedInvoice.value.id);

    if (error) throw new Error(error.message);

    $q.notify({ type: 'positive', message: `Facture ${selectedInvoice.value.reference} envoyée au device` });
    invoices.value = invoices.value.filter((inv) => inv.id !== selectedInvoice.value.id);
    stats.value.pending--;
    stats.value.certified++;
    showSendDialog.value = false;
  } catch (error: any) {
    $q.notify({ type: 'negative', message: `Erreur envoi: ${error.message}` });
  } finally {
    sending.value = false;
  }
}

function cancelPending(invoice: any) {
  $q.dialog({
    title: 'Retour à validée',
    message: `Retourner la facture ${invoice.reference} au statut "Validée" ?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      const { error } = await insforge.database
        .from('invoices')
        .update({ status: 'validated' })
        .eq('id', invoice.id);

      if (error) throw new Error(error.message);
      invoices.value = invoices.value.filter((inv) => inv.id !== invoice.id);
      stats.value.pending--;
      $q.notify({ type: 'positive', message: 'Facture retournée au statut Validée' });
    } catch (error: any) {
      $q.notify({ type: 'negative', message: `Erreur: ${error.message}` });
    }
  });
}

async function confirmManualCertify() {
  if (!selectedInvoice.value || !manualForm.value.nim || !manualForm.value.code_secef) return;
  manualCertifying.value = true;
  try {
    const now = new Date().toISOString();
    const { error } = await insforge.database
      .from('invoices')
      .update({
        status: 'certified',
        nim: manualForm.value.nim,
        code_secef_dgi: manualForm.value.code_secef,
        fiscal_number: manualForm.value.fiscal_number || null,
        qr_code: manualForm.value.qr_code || null,
        certified_at: now,
        certification_datetime: now,
      })
      .eq('id', selectedInvoice.value.id);

    if (error) throw new Error(error.message);
    $q.notify({ type: 'positive', message: `Facture ${selectedInvoice.value.reference} certifiée manuellement` });
    showManualDialog.value = false;
    stats.value.certified++;
    await loadPendingInvoices();
  } catch (error: any) {
    $q.notify({ type: 'negative', message: `Erreur certification: ${error.message}` });
  } finally {
    manualCertifying.value = false;
  }
}

// Lifecycle
onMounted(() => {
  loadPendingInvoices();
});
</script>

<style scoped>
.q-banner {
  border-radius: 8px;
}
</style>
