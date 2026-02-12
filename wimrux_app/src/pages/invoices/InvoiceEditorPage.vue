<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn flat icon="arrow_back" @click="$router.push('/app/invoices')" />
      <q-badge :color="typeColor" :label="invoice.type" class="q-mx-sm" />
      <div class="text-h5">{{ invoice.reference || 'Nouvelle facture' }}</div>
      <q-space />
      <q-badge :color="statusColor" :label="statusLabel" class="text-body2 q-px-sm q-py-xs" />
    </div>

    <div class="row q-gutter-md">
      <!-- Left column: form -->
      <div class="col-12 col-md-8">
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-sm">Informations générales</div>
            <div class="row q-gutter-sm">
              <q-select
                v-model="invoice.client_id"
                :options="clientOptions"
                emit-value
                map-options
                label="Client"
                outlined
                dense
                clearable
                class="col"
                :disable="!canEdit"
              />
              <q-select
                v-model="invoice.price_mode"
                :options="[{label:'TTC',value:'TTC'},{label:'HT',value:'HT'}]"
                emit-value
                map-options
                label="Mode prix"
                outlined
                dense
                style="width: 120px"
                :disable="!canEdit"
              />
            </div>

            <!-- Nature avoir (FA/EA uniquement) -->
            <template v-if="invoice.type === 'FA' || invoice.type === 'EA'">
              <div class="row q-gutter-sm q-mt-sm">
                <q-select
                  v-model="invoice.credit_note_nature"
                  :options="creditNoteNatureOptions"
                  emit-value
                  map-options
                  label="Nature de l'avoir *"
                  outlined
                  dense
                  class="col"
                  :disable="!canEdit"
                  :rules="[v => !!v || 'Nature d\'avoir obligatoire pour FA/EA']"
                />
                <q-select
                  v-model="invoice.original_invoice_id"
                  :options="certifiedInvoiceOptions"
                  emit-value
                  map-options
                  label="Facture d'origine *"
                  outlined
                  dense
                  class="col"
                  :disable="!canEdit"
                  :rules="[v => !!v || 'Facture d\'origine obligatoire']"
                />
              </div>
            </template>
          </q-card-section>
        </q-card>

        <!-- Items -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="row items-center q-mb-sm">
              <div class="text-subtitle1 text-weight-medium">Articles</div>
              <q-space />
              <q-btn v-if="canEdit" flat size="sm" color="primary" icon="add" label="Ajouter" no-caps @click="addItem" />
            </div>

            <q-markup-table flat bordered separator="cell" v-if="items.length > 0">
              <thead>
                <tr>
                  <th class="text-left">Désignation</th>
                  <th style="width:80px">Type</th>
                  <th style="width:80px">Groupe</th>
                  <th style="width:80px">Qté</th>
                  <th style="width:100px">Prix unit.</th>
                  <th style="width:100px">HT</th>
                  <th style="width:80px">TVA</th>
                  <th style="width:100px">TTC</th>
                  <th style="width:50px" v-if="canEdit"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in items" :key="idx">
                  <td>
                    <q-input v-model="item.name" dense borderless placeholder="Désignation article" :disable="!canEdit" />
                  </td>
                  <td>
                    <q-select v-model="item.type" :options="articleTypes" dense borderless emit-value map-options :disable="!canEdit" />
                  </td>
                  <td>
                    <q-select v-model="item.tax_group" :options="taxGroupOptions" dense borderless emit-value map-options :disable="!canEdit" @update:model-value="recalcItem(idx)" />
                  </td>
                  <td>
                    <q-input v-model.number="item.quantity" type="number" dense borderless min="1" :disable="!canEdit" @update:model-value="recalcItem(idx)" />
                  </td>
                  <td>
                    <q-input v-model.number="item.price" type="number" dense borderless min="0" :disable="!canEdit" @update:model-value="recalcItem(idx)" />
                  </td>
                  <td class="text-right">{{ fmt(item.amount_ht) }}</td>
                  <td class="text-right">{{ fmt(item.amount_tva) }}</td>
                  <td class="text-right text-weight-bold">{{ fmt(item.amount_ttc) }}</td>
                  <td v-if="canEdit">
                    <q-btn flat dense icon="delete" size="xs" color="negative" @click="removeItem(idx)" />
                  </td>
                </tr>
              </tbody>
            </q-markup-table>

            <div v-else class="text-grey-5 text-center q-pa-lg">Aucun article. Cliquez sur "Ajouter" pour commencer.</div>
          </q-card-section>
        </q-card>

        <!-- Comments -->
        <q-card flat bordered class="q-mb-md" v-if="canEdit && invoice.comments && invoice.comments.length > 0">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-sm">Commentaires</div>
            <q-input :model-value="commentContent" @update:model-value="updateComment" outlined dense type="textarea" rows="2" placeholder="Commentaire libre..." />
          </q-card-section>
        </q-card>
      </div>

      <!-- Right column: totals + actions -->
      <div class="col-12 col-md-4">
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-sm">Totaux</div>
            <q-list dense separator>
              <q-item>
                <q-item-section>Total HT</q-item-section>
                <q-item-section side class="text-weight-medium">{{ fmtCur(totals.grandTotalHT) }}</q-item-section>
              </q-item>
              <q-item>
                <q-item-section>TVA</q-item-section>
                <q-item-section side>{{ fmtCur(totals.grandTotalTVA) }}</q-item-section>
              </q-item>
              <q-item>
                <q-item-section>PSVB</q-item-section>
                <q-item-section side>{{ fmtCur(totals.grandTotalPSVB) }}</q-item-section>
              </q-item>
              <q-item v-if="totals.stampDuty > 0">
                <q-item-section>Timbre quittance</q-item-section>
                <q-item-section side>{{ fmtCur(totals.stampDuty) }}</q-item-section>
              </q-item>
              <q-separator />
              <q-item>
                <q-item-section class="text-h6">Total TTC</q-item-section>
                <q-item-section side class="text-h6 text-primary">{{ fmtCur(totals.totalTTC) }}</q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>

        <!-- Workflow status banner -->
        <q-card v-if="invoice.submitted_by || invoice.approved_by || invoice.rejected_by" flat bordered class="q-mb-md">
          <q-card-section class="q-pa-sm">
            <div class="text-caption q-gutter-xs">
              <div v-if="invoice.submitted_by" class="row items-center q-gutter-xs">
                <q-icon name="send" size="xs" color="orange" />
                <span>Soumise par <b>{{ invoice.submitted_by }}</b></span>
              </div>
              <div v-if="invoice.approved_by" class="row items-center q-gutter-xs">
                <q-icon name="thumb_up" size="xs" color="blue" />
                <span>Approuvée par <b>{{ invoice.approved_by }}</b></span>
              </div>
              <div v-if="invoice.rejected_by" class="row items-center q-gutter-xs text-red">
                <q-icon name="thumb_down" size="xs" />
                <span>Rejetée par <b>{{ invoice.rejected_by }}</b></span>
                <span v-if="invoice.rejection_reason"> — {{ invoice.rejection_reason }}</span>
              </div>
            </div>
          </q-card-section>
        </q-card>

        <!-- Actions -->
        <q-card flat bordered>
          <q-card-section class="q-gutter-sm">
            <q-btn v-if="canEdit" color="primary" icon="save" label="Enregistrer brouillon" class="full-width" no-caps :loading="saving" @click="saveDraft" />
            <template v-for="action in workflowActions" :key="action.key">
              <q-btn
                v-if="action.key !== 'certify'"
                :color="action.color"
                :icon="action.icon"
                :label="action.label"
                class="full-width"
                no-caps
                :loading="transitioning"
                @click="action.needsReason ? openRejectDialog(action) : executeAction(action)"
              />
            </template>
            <q-btn v-if="workflowActions.some(a => a.key === 'certify')" color="green" icon="verified" label="Certifier (SECeF)" class="full-width" no-caps :loading="certifying" @click="certifyInvoice" />
            <q-btn v-if="invoice.status === 'certified'" color="blue" icon="picture_as_pdf" label="Télécharger PDF" class="full-width" no-caps @click="downloadPdf" />
            <q-btn v-if="invoice.status === 'certified'" color="blue-grey" icon="content_copy" label="Duplicata PDF" class="full-width q-mt-xs" no-caps outline @click="downloadDuplicata" />
          </q-card-section>
        </q-card>

    <!-- Rejection reason dialog -->
    <q-dialog v-model="rejectDialogOpen" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ pendingAction?.label }}</div>
        </q-card-section>
        <q-card-section>
          <q-input v-model="rejectReason" label="Motif" filled type="textarea" rows="3" :rules="[v => !!v || 'Motif obligatoire']" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup no-caps />
          <q-btn color="red" label="Confirmer" no-caps :loading="transitioning" @click="confirmReject" />
        </q-card-actions>
      </q-card>
    </q-dialog>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { insforge } from 'src/boot/insforge';
import { useTaxCalculation, TAX_GROUP_RATES } from 'src/composables/useTaxCalculation';
import { useInvoicePdf } from 'src/composables/useInvoicePdf';
import { useMcfApi } from 'src/composables/useMcfApi';
import { useDegradedMode } from 'src/composables/useDegradedMode';
import { useInvoiceWorkflow, STATUS_CONFIG } from 'src/composables/useInvoiceWorkflow';
import type { Invoice, InvoiceItem, Client, TaxGroup, ArticleType } from 'src/types';
import type { WorkflowAction } from 'src/composables/useInvoiceWorkflow';

interface SfeDevice { nim: string; ifu: string; jwt_secret: string; status: string }

const route = useRoute();
const $q = useQuasar();
const { calculateItemTax, calculateInvoiceTotals } = useTaxCalculation();
const { downloadPdf: pdfDownload } = useInvoicePdf();
const mcfApi = useMcfApi();
const { enqueue: queueForRetry } = useDegradedMode();
const activeDevice = ref<SfeDevice | null>(null);
const { getAvailableActions, executeTransition, canEditContent } = useInvoiceWorkflow();

const invoiceId = computed(() => route.params.id as string);
const transitioning = ref(false);
const rejectDialogOpen = ref(false);
const rejectReason = ref('');
const pendingAction = ref<WorkflowAction | null>(null);

const invoice = ref<Partial<Invoice>>({
  type: 'FV',
  reference: '',
  status: 'draft',
  price_mode: 'TTC',
  client_id: null,
  operator_name: '',
  comments: [{ label: '', content: '' }],
});

const items = ref<Partial<InvoiceItem>[]>([]);
const clients = ref<Client[]>([]);
const certifiedInvoices = ref<Pick<Invoice, 'id' | 'reference' | 'total_ttc' | 'type' | 'status'>[]>([]);
const saving = ref(false);
const certifying = ref(false);

const canEdit = computed(() => canEditContent(invoice.value));
const workflowActions = computed(() => getAvailableActions(invoice.value));
const commentContent = computed(() => invoice.value.comments?.[0]?.content ?? '');
function updateComment(val: string | number | null) {
  const first = invoice.value.comments?.[0];
  if (first) {
    first.content = String(val ?? '');
  }
}

const typeColor = computed(() => {
  const map: Record<string, string> = { FV: 'blue', FT: 'teal', FA: 'orange', EV: 'indigo', ET: 'cyan', EA: 'deep-orange' };
  return map[invoice.value.type || 'FV'] || 'grey';
});

const statusColor = computed(() => {
  const s = invoice.value.status || 'draft';
  return STATUS_CONFIG[s]?.color || 'grey';
});

const statusLabel = computed(() => {
  const s = invoice.value.status || 'draft';
  return STATUS_CONFIG[s]?.label || '';
});

const articleTypes = [
  { label: 'Bien local', value: 'LOCBIE' },
  { label: 'Service local', value: 'LOCSER' },
  { label: 'Bien import', value: 'IMPBIE' },
  { label: 'Service import', value: 'IMPSER' },
];

const taxGroupOptions = Object.entries(TAX_GROUP_RATES).map(([key, val]) => ({
  label: `${key} — ${val.description}`,
  value: key,
}));

const clientOptions = computed(() =>
  clients.value.map(c => ({ label: `${c.name} (${c.type})`, value: c.id }))
);

const creditNoteNatureOptions = [
  { label: 'COR — Correction', value: 'COR' },
  { label: 'RAN — Retour avant livraison', value: 'RAN' },
  { label: 'RAM — Retour après livraison', value: 'RAM' },
  { label: 'RRR — Rabais/Remise/Ristourne', value: 'RRR' },
];

const certifiedInvoiceOptions = computed(() =>
  certifiedInvoices.value.map(i => ({ label: `${i.reference} — ${fmtCur(i.total_ttc)}`, value: i.id }))
);

const totals = computed(() => {
  return calculateInvoiceTotals(
    items.value.map(i => ({
      price: i.price || 0,
      quantity: i.quantity || 1,
      tax_group: i.tax_group || 'B',
      discount: i.discount || 0,
      specific_tax: i.specific_tax || 0,
    })),
    invoice.value.price_mode || 'TTC',
  );
});

function fmt(n: number | undefined) {
  return (n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 0 });
}

function fmtCur(n: number) {
  return new Intl.NumberFormat('fr-BF', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n);
}

function addItem() {
  items.value.push({
    name: '',
    type: 'LOCBIE' as ArticleType,
    tax_group: 'B' as TaxGroup,
    price: 0,
    quantity: 1,
    unit: 'unité',
    discount: 0,
    specific_tax: 0,
    amount_ht: 0,
    amount_tva: 0,
    amount_psvb: 0,
    amount_ttc: 0,
    sort_order: items.value.length,
  });
}

function removeItem(idx: number) {
  items.value.splice(idx, 1);
}

function recalcItem(idx: number) {
  const item = items.value[idx];
  if (!item) return;
  const result = calculateItemTax(
    item.price || 0,
    item.quantity || 1,
    item.tax_group || 'B',
    invoice.value.price_mode || 'TTC',
    item.discount || 0,
    item.specific_tax || 0,
  );
  item.amount_ht = result.amountHT;
  item.amount_tva = result.amountTVA;
  item.amount_psvb = result.amountPSVB;
  item.amount_ttc = result.amountTTC;
}

// Recalculate all items when price_mode changes
watch(() => invoice.value.price_mode, () => {
  items.value.forEach((_, idx) => recalcItem(idx));
});

async function loadInvoice() {
  if (!invoiceId.value) return;

  const { data, error } = await insforge.database
    .from('invoices')
    .select('*')
    .eq('id', invoiceId.value)
    .single();

  if (!error && data) {
    invoice.value = data as Invoice;
    if (!invoice.value.comments || !Array.isArray(invoice.value.comments) || invoice.value.comments.length === 0) {
      invoice.value.comments = [{ label: '', content: '' }];
    }
  }

  const { data: itemsData } = await insforge.database
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId.value)
    .order('sort_order', { ascending: true });

  if (itemsData) {
    items.value = itemsData as InvoiceItem[];
  }
}

async function loadClients() {
  const { data } = await insforge.database
    .from('clients')
    .select('id, name, type')
    .order('name', { ascending: true });

  if (data) clients.value = data as Client[];
}

async function saveDraft() {
  saving.value = true;
  try {
    const t = totals.value;
    await insforge.database
      .from('invoices')
      .update({
        client_id: invoice.value.client_id,
        price_mode: invoice.value.price_mode,
        comments: invoice.value.comments,
        total_ht: t.grandTotalHT,
        total_tva: t.grandTotalTVA,
        total_psvb: t.grandTotalPSVB,
        total_ttc: t.totalTTC,
        stamp_duty: t.stampDuty,
        tax_calculation: t,
      })
      .eq('id', invoiceId.value);

    // Delete old items and re-insert
    await insforge.database.from('invoice_items').delete().eq('invoice_id', invoiceId.value);

    if (items.value.length > 0) {
      await insforge.database.from('invoice_items').insert(
        items.value.map((item, idx) => ({
          invoice_id: invoiceId.value,
          code: item.code || `ART${String(idx + 1).padStart(3, '0')}`,
          name: item.name,
          type: item.type,
          price: item.price,
          quantity: item.quantity,
          unit: item.unit || 'unité',
          tax_group: item.tax_group,
          specific_tax: item.specific_tax || 0,
          discount: item.discount || 0,
          amount_ht: item.amount_ht,
          amount_tva: item.amount_tva,
          amount_psvb: item.amount_psvb,
          amount_ttc: item.amount_ttc,
          sort_order: idx,
        }))
      );
    }

    $q.notify({ type: 'positive', message: 'Brouillon enregistré' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur';
    $q.notify({ type: 'negative', message });
  } finally {
    saving.value = false;
  }
}

function openRejectDialog(action: WorkflowAction) {
  pendingAction.value = action;
  rejectReason.value = '';
  rejectDialogOpen.value = true;
}

async function confirmReject() {
  if (!pendingAction.value || !rejectReason.value) return;
  await executeAction(pendingAction.value, rejectReason.value);
  rejectDialogOpen.value = false;
}

async function executeAction(action: WorkflowAction, reason?: string) {
  transitioning.value = true;
  try {
    // Save draft first if submitting from draft
    if (invoice.value.status === 'draft' && action.targetStatus === 'pending_validation') {
      await saveDraft();
    }

    const result = await executeTransition(
      invoiceId.value,
      invoice.value,
      action.targetStatus,
      reason,
    );

    if (!result.success) {
      $q.notify({ type: 'negative', message: result.error || 'Erreur transition' });
      return;
    }

    // Reload to get fresh data with all tracking fields
    await loadInvoice();
    $q.notify({ type: 'positive', message: action.label + ' — effectué' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur';
    $q.notify({ type: 'negative', message });
  } finally {
    transitioning.value = false;
  }
}

async function certifyInvoice() {
  certifying.value = true;
  try {
    // 0. Load active device if not loaded
    if (!activeDevice.value) {
      const { data } = await insforge.database.from('devices').select('*').eq('status', 'ACTIF').limit(1);
      const rows = data as SfeDevice[] | null;
      activeDevice.value = rows?.[0] ?? null;
    }
    if (!activeDevice.value) {
      $q.notify({ type: 'negative', message: 'Aucun appareil SFE actif. Configurez-en un dans Param\u00e8tres.' });
      return;
    }
    const dev = activeDevice.value;

    // 1. Authentification MCF
    const authResult = await mcfApi.getToken({
      clientId: dev.ifu,
      clientSecret: dev.jwt_secret,
      nim: dev.nim,
    });
    if (authResult.error) {
      $q.notify({ type: 'negative', message: `MCF Auth: ${authResult.error.message}` });
      return;
    }

    // 2. Submit invoice
    const submitResult = await mcfApi.submitInvoice({
      ifu: dev.ifu,
      type: invoice.value.type,
      reference: invoice.value.reference,
      items: items.value.map(i => ({
        code: i.code || 'ART001',
        name: i.name,
        type: i.type,
        price: i.price,
        quantity: i.quantity,
        unit: i.unit || 'unité',
        taxGroup: i.tax_group,
        specificTax: i.specific_tax || 0,
      })),
      priceMode: invoice.value.price_mode,
    });

    if (submitResult.error) {
      $q.notify({ type: 'negative', message: `MCF Soumission: ${submitResult.error.message}` });
      return;
    }

    // 3. Confirm (certify)
    const uid = submitResult.data?.uid;
    if (!uid) return;

    const confirmResult = await mcfApi.confirmInvoice(uid);
    if (confirmResult.error) {
      $q.notify({ type: 'negative', message: `MCF Certification: ${confirmResult.error.message}` });
      return;
    }

    // 4. Update local invoice with certification data
    const cert = confirmResult.data;
    if (cert) {
      await insforge.database
        .from('invoices')
        .update({
          status: 'certified',
          fnec_uid: uid,
          fiscal_number: cert.fiscalNumber,
          code_secef_dgi: cert.codeSECeFDGI,
          qr_code: cert.qrCode,
          signature: cert.signature,
          nim: cert.nim,
          counters: cert.counters,
          certification_datetime: cert.dateTime,
          certified_at: new Date().toISOString(),
        })
        .eq('id', invoiceId.value);

      invoice.value.status = 'certified';
      $q.notify({ type: 'positive', message: `Facture certifiée — ${cert.fiscalNumber}` });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur certification';
    // Mode dégradé: queue for retry if certification fails
    if (invoiceId.value) {
      await queueForRetry(invoiceId.value, message);
      $q.notify({
        type: 'warning',
        icon: 'wifi_off',
        message: 'Certification échouée — facture mise en file d\'attente (mode dégradé)',
        caption: message,
        timeout: 8000,
      });
    } else {
      $q.notify({ type: 'negative', message });
    }
  } finally {
    certifying.value = false;
  }
}

async function downloadPdf() {
  const inv = invoice.value as Invoice;
  const client = clients.value.find(c => c.id === inv.client_id);
  await pdfDownload(
    inv,
    items.value as InvoiceItem[],
    undefined,
    client ? { name: client.name, ifu: client.ifu, type: client.type, address: client.address } : undefined,
    {
      operatorName: inv.operator_name,
      creditNoteNature: inv.credit_note_nature || undefined,
      originalInvoiceRef: certifiedInvoices.value.find(i => i.id === inv.original_invoice_id)?.reference,
    },
  );
}

async function downloadDuplicata() {
  const inv = invoice.value as Invoice;
  const client = clients.value.find(c => c.id === inv.client_id);
  await pdfDownload(
    inv,
    items.value as InvoiceItem[],
    undefined,
    client ? { name: client.name, ifu: client.ifu, type: client.type, address: client.address } : undefined,
    {
      isDuplicate: true,
      operatorName: inv.operator_name,
      creditNoteNature: inv.credit_note_nature || undefined,
      originalInvoiceRef: certifiedInvoices.value.find(i => i.id === inv.original_invoice_id)?.reference,
    },
  );
}

async function loadCertifiedInvoices() {
  const { data } = await insforge.database
    .from('invoices')
    .select('id, reference, total_ttc, type, status')
    .eq('status', 'certified')
    .in('type', ['FV', 'FT', 'EV', 'ET'])
    .order('created_at', { ascending: false })
    .limit(200);
  if (data) certifiedInvoices.value = data as typeof certifiedInvoices.value;
}

onMounted(async () => {
  await Promise.all([loadInvoice(), loadClients(), loadCertifiedInvoices()]);
  // Recalc all items on load
  items.value.forEach((_, idx) => recalcItem(idx));
});
</script>
