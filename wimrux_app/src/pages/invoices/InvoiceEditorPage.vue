<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn flat icon="arrow_back" @click="$router.push('/app/invoices')" />
      <q-badge :color="typeColor" :label="invoice.type" class="q-mx-sm" />
      <div class="text-h5" data-testid="invoice-number">{{ invoice.reference || 'Nouvelle facture' }}</div>
      <q-space />
      <q-badge :color="statusColor" :label="statusLabel" class="text-body2 q-px-sm q-py-xs" data-testid="invoice-status" />
    </div>

    <!-- Informations generales (pleine largeur) -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-sm">Informations generales</div>
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
            data-testid="invoice-client-select"
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
            data-testid="price-mode-ttc"
            :disable="!canEdit"
          />
        </div>
        <!-- Objet / Nature de la transaction (mention obligatoire DGI) -->
        <div class="row q-gutter-sm q-mt-sm">
          <q-input
            v-model="invoice.description"
            label="Objet / Nature de la transaction *"
            outlined
            dense
            class="col"
            :disable="!canEdit"
            data-testid="invoice-description"
            placeholder="Ex: Vente de marchandises, Prestation de services..."
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

    <!-- Articles (pleine largeur) -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row items-center q-mb-sm">
          <div class="text-subtitle1 text-weight-medium">Articles</div>
          <q-space />
          <q-btn v-if="canEdit" flat size="sm" color="primary" icon="add" label="Ajouter" no-caps data-testid="add-item-btn" @click="addItem" />
        </div>

        <q-markup-table flat bordered separator="cell" v-if="items.length > 0">
          <thead>
            <tr>
              <th class="text-left" style="min-width:250px">Designation</th>
              <th style="width:130px">Type</th>
              <th style="width:180px">Groupe</th>
              <th style="width:100px">Qte</th>
              <th style="width:130px">Prix unit.</th>
              <th style="width:120px">HT</th>
              <th style="width:110px">TVA</th>
              <th style="width:120px">TTC</th>
              <th style="width:50px" v-if="canEdit"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in items" :key="idx">
              <td>
                <q-select
                  v-model="item.name"
                  :options="articleFilteredOptions"
                  dense
                  borderless
                  use-input
                  input-debounce="100"
                  emit-value
                  map-options
                  new-value-mode="add-unique"
                  :disable="!canEdit"
                  placeholder="Rechercher ou saisir..."
                  :data-testid="`item-designation-${idx}`"
                  @filter="(val, update) => filterArticles(val, update)"
                  @update:model-value="(v) => onArticleSelected(idx, v)"
                />
              </td>
              <td>
                <q-select v-model="item.type" :options="articleTypes" dense borderless emit-value map-options :disable="!canEdit" />
              </td>
              <td>
                <q-select v-model="item.tax_group" :options="taxGroupOptions" dense borderless emit-value map-options :disable="!canEdit" :data-testid="`item-tax-${idx}`" @update:model-value="recalcItem(idx)" />
              </td>
              <td style="min-width:100px">
                <q-input v-model.number="item.quantity" type="number" dense borderless min="1" :disable="!canEdit" :data-testid="`item-qty-${idx}`" @update:model-value="recalcItem(idx)" input-class="text-center" style="width:100%" />
              </td>
              <td>
                <q-input v-model.number="item.price" type="number" dense borderless min="0" :disable="!canEdit" :data-testid="`item-price-${idx}`" @update:model-value="recalcItem(idx)" />
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

    <!-- Pied de facture : commentaires (gauche) + totaux + actions (droite) -->
    <div class="row q-gutter-md">
      <!-- Commentaires -->
      <div class="col">
        <q-card flat bordered class="q-mb-md" v-if="canEdit && invoice.comments && invoice.comments.length > 0">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-sm">Commentaires</div>
            <q-input :model-value="commentContent" @update:model-value="updateComment" outlined dense type="textarea" rows="3" placeholder="Commentaire libre..." />
          </q-card-section>
        </q-card>

        <!-- Workflow status banner -->
        <q-card v-if="invoice.submitted_by || invoice.approved_by || invoice.rejected_by" flat bordered>
          <q-card-section class="q-pa-sm">
            <div class="text-caption q-gutter-xs">
              <div v-if="invoice.submitted_by" class="row items-center q-gutter-xs">
                <q-icon name="send" size="xs" color="orange" />
                <span>Soumise par <b>{{ invoice.submitted_by }}</b></span>
              </div>
              <div v-if="invoice.approved_by" class="row items-center q-gutter-xs">
                <q-icon name="thumb_up" size="xs" color="blue" />
                <span>ApprouvÃ©e par <b>{{ invoice.approved_by }}</b></span>
              </div>
              <div v-if="invoice.rejected_by" class="row items-center q-gutter-xs text-red">
                <q-icon name="thumb_down" size="xs" />
                <span>RejetÃ©e par <b>{{ invoice.rejected_by }}</b></span>
                <span v-if="invoice.rejection_reason"> â€” {{ invoice.rejection_reason }}</span>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <!-- Totaux + Actions -->
      <div class="col-12 col-md-4">
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
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

        <!-- Actions -->
        <q-card flat bordered>
          <q-card-section class="q-gutter-sm">
            <q-btn v-if="canEdit" color="primary" icon="save" label="Enregistrer brouillon" class="full-width" no-caps data-testid="invoice-save-btn" :loading="saving" @click="() => saveDraft()" />
            <q-btn v-if="invoice.status === 'draft'" color="negative" icon="delete" label="Supprimer le brouillon" class="full-width q-mt-xs" no-caps outline data-testid="invoice-delete-draft-btn" @click="confirmDeleteDraft" />
            <template v-for="action in workflowActions" :key="action.key">
              <q-btn
                v-if="action.key !== 'certify'"
                :color="action.color"
                :icon="action.icon"
                :label="action.label"
                class="full-width"
                no-caps
                :loading="transitioning"
                :data-testid="'invoice-' + action.key + '-btn'"
                @click="action.needsReason ? openRejectDialog(action) : executeAction(action)"
              />
            </template>
            <!-- Convert Proforma â†’ any invoice type (approved, sent, accepted) -->
            <q-btn
              v-if="invoice.type === 'PF' && ['approved', 'sent', 'accepted'].includes(invoice.status || '') && !invoice.proforma_converted_to"
              color="indigo" icon="transform" label="Convertir en Facture"
              class="full-width" no-caps :loading="convertingProforma" @click="doConvertProforma"
            />
            <q-chip
              v-if="invoice.type === 'PF' && invoice.proforma_converted_to"
              icon="link" color="indigo" text-color="white" dense class="full-width"
            >Facture liÃ©e : {{ invoice.proforma_converted_to?.slice(0, 8) }}...</q-chip>
            <!-- PDF download for certified + validated/sent/accepted Proforma -->
            <q-btn v-if="invoice.status === 'certified'" color="blue" icon="picture_as_pdf" label="TÃ©lÃ©charger PDF" class="full-width" no-caps data-testid="invoice-pdf-btn" @click="downloadPdf" />
            <q-btn v-if="invoice.status === 'certified'" color="blue-grey" icon="content_copy" label="Duplicata PDF" class="full-width q-mt-xs" no-caps outline @click="downloadDuplicata" />
            <q-btn
              v-if="invoice.type === 'PF' && ['approved','sent','accepted','rejected'].includes(invoice.status || '')"
              color="purple" icon="picture_as_pdf" label="PDF Proforma"
              class="full-width" no-caps @click="downloadPdf"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

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

  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useTaxCalculation, TAX_GROUP_RATES } from 'src/composables/useTaxCalculation';
import { useInvoicePdf } from 'src/composables/useInvoicePdf';
import type { PdfCompanyInfo, PdfClientInfo } from 'src/composables/useInvoicePdf';
import { usePdfStorage } from 'src/composables/usePdfStorage';
import { useInvoiceWorkflow, STATUS_CONFIG } from 'src/composables/useInvoiceWorkflow';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import type { Invoice, InvoiceItem, InvoiceType, Client, TaxGroup, ArticleType, Article } from 'src/types';
import type { WorkflowAction } from 'src/composables/useInvoiceWorkflow';
import { appwriteDb } from 'src/services/appwrite-db';

const route = useRoute();
const router = useRouter();
const $q = useQuasar();
const companyStore = useCompanyStore();
const { calculateItemTax, calculateInvoiceTotals } = useTaxCalculation();
const { downloadPdf: pdfDownload } = useInvoicePdf();
const { uploadAndLink: _uploadPdf } = usePdfStorage();
const { getAvailableActions, executeTransition, canEditContent, convertProformaToFV } = useInvoiceWorkflow();
const convertingProforma = ref(false);

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
const catalogArticles = ref<Article[]>([]);
const articleFilteredOptions = ref<{ label: string; value: string; article: Article }[]>([]);
const certifiedInvoices = ref<Pick<Invoice, 'id' | 'reference' | 'total_ttc' | 'type' | 'status'>[]>([]);
const saving = ref(false);

const canEdit = computed(() => canEditContent(invoice.value));
const workflowActions = computed(() => getAvailableActions(invoice.value));

const companyPdfInfo = computed<PdfCompanyInfo | undefined>(() => {
  const c = companyStore.company;
  if (!c) return undefined;
    return {
      name: c.name,
      legal_form: c.legal_form || null,
      legal_form_other: c.legal_form_other || null,
      ifu: c.ifu,
      rccm: c.rccm || '',
      physical_address: c.physical_address || null,
      cadastral_address: c.cadastral_address || null,
      address_cadastral: c.address_cadastral || '',
      postal_address: c.postal_address || null,
      address: c.address || null,
      phone_country_code: c.phone_country_code || null,
      phone: c.phone || '',
      email: c.email || '',
      tax_regime: c.tax_regime || null,
      tax_division: c.tax_division || null,
      ...(c.tax_office ? { tax_office: c.tax_office } : {}),
      bank_accounts: c.bank_accounts || [],
      contacts: c.contacts || undefined,
      logo_url: c.logo_url || null,
      invoice_settings: c.invoice_settings || null,
      fiscal_config: c.fiscal_config || null,
    };
});
const commentContent = computed(() => invoice.value.comments?.[0]?.content ?? '');
function updateComment(val: string | number | null) {
  const first = invoice.value.comments?.[0];
  if (first) {
    first.content = String(val ?? '');
  }
}

const typeColor = computed(() => {
  const map: Record<string, string> = { FV: 'blue', FT: 'teal', FA: 'orange', EV: 'indigo', ET: 'cyan', EA: 'deep-orange', PF: 'purple' };
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
  label: `${key} â€” ${val.description}`,
  value: key,
}));

const clientOptions = computed(() =>
  clients.value.map(c => ({ label: `${c.name} (${c.type})`, value: c.id }))
);

const creditNoteNatureOptions = [
  { label: 'COR â€” Correction', value: 'COR' },
  { label: 'RAN â€” Retour avant livraison', value: 'RAN' },
  { label: 'RAM â€” Retour aprÃ¨s livraison', value: 'RAM' },
  { label: 'RRR â€” Rabais/Remise/Ristourne', value: 'RRR' },
];

const certifiedInvoiceOptions = computed(() =>
  certifiedInvoices.value.map(i => ({ label: `${i.reference} â€” ${fmtCur(i.total_ttc)}`, value: i.id }))
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
    unit: 'unitÃ©',
    discount: 0,
    specific_tax: 0,
    amount_ht: 0,
    amount_tva: 0,
    amount_psvb: 0,
    amount_ttc: 0,
    sort_order: items.value.length,
  });
}

function filterArticles(val: string, update: (fn: () => void) => void) {
  update(() => {
    const q = (val || '').toLowerCase();
    articleFilteredOptions.value = catalogArticles.value
      .filter(a => a.is_active && (a.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)))
      .map(a => ({ label: `${a.code} â€” ${a.name}`, value: a.name, article: a }));
  });
}

function onArticleSelected(idx: number, name: string) {
  const item = items.value[idx];
  if (!item) return;
  const found = catalogArticles.value.find(a => a.name === name);
  if (found) {
    item.code = found.code;
    item.type = found.type;
    item.tax_group = found.tax_group;
    item.price = found.unit_price;
    item.specific_tax = found.specific_tax || 0;
    recalcItem(idx);
  }
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

  const { data, error } = await appwriteDb
    .from('invoices')
    .select('*')
    .eq('id', invoiceId.value)
    .single();

  if (!error && data) {
    invoice.value = data as Invoice;
    // Appwrite stores JSON objects as strings, but the UI uses objects
    const rawComments = invoice.value.comments;
    if (typeof rawComments === 'string' && rawComments) {
      try {
        invoice.value.comments = JSON.parse(rawComments) as unknown as Array<{ label: string; content: string }>;
      } catch {
        invoice.value.comments = [{ label: '', content: rawComments }];
      }
    }
    if (!invoice.value.comments || !Array.isArray(invoice.value.comments) || invoice.value.comments.length === 0) {
      invoice.value.comments = [{ label: '', content: '' }];
    }

    const rawTax = (invoice.value as unknown as Record<string, unknown>).tax_calculation;
    if (typeof rawTax === 'string' && rawTax) {
      try {
        (invoice.value as unknown as Record<string, unknown>).tax_calculation = JSON.parse(rawTax);
      } catch {
        (invoice.value as unknown as Record<string, unknown>).tax_calculation = null;
      }
    }
  }

  const { data: itemsData } = await appwriteDb
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', invoiceId.value)
    .order('sort_order', { ascending: true });

  if (itemsData) {
    items.value = itemsData as InvoiceItem[];
  }
}

async function loadClients() {
  const { data } = await appwriteDb
    .from('clients')
    .select('*')
    .order('name', { ascending: true });

  if (data) clients.value = data as Client[];
}

function confirmDeleteDraft() {
  $q.dialog({
    title: 'Supprimer le brouillon',
    message: `Voulez-vous vraiment supprimer le brouillon ${invoice.value.reference} ? Cette action est irrÃ©versible.`,
    cancel: { label: 'Annuler', flat: true },
    ok: { label: 'Supprimer', color: 'negative' },
    persistent: true,
  }).onOk(() => {
    void (async () => {
      // Supprimer les lignes d'abord (FK)
      await appwriteDb.from('invoice_items').delete().eq('invoice_id', invoiceId.value);
      const { error } = await appwriteDb.from('invoices').delete().eq('id', invoiceId.value);
      if (error) {
        $q.notify({ type: 'negative', message: error.message || 'Erreur lors de la suppression' });
      } else {
        $q.notify({ type: 'positive', message: `Brouillon ${invoice.value.reference} supprimÃ©` });
        await router.push('/app/invoices');
      }
    })();
  });
}

async function saveDraft(silent = false): Promise<boolean> {
  saving.value = true;
  try {
    // Force-recalc all items before reading totals (évite montants à 0 au submit)
    items.value.forEach((_, idx) => recalcItem(idx));
    const t = totals.value;

    // Guard: si aucun article et totaux déjà enregistrés, conserver les montants existants
    const hasItems = items.value.length > 0;
    const existingHT  = Number(invoice.value.total_ht)  || 0;
    const existingTTC = Number(invoice.value.total_ttc) || 0;
    const finalHT  = hasItems ? t.grandTotalHT  : existingHT;
    const finalTVA = hasItems ? t.grandTotalTVA : Number(invoice.value.total_tva)  || 0;
    const finalPSVB= hasItems ? t.grandTotalPSVB: Number(invoice.value.total_psvb) || 0;
    const finalTTC = hasItems ? t.totalTTC       : existingTTC;
    const finalStamp= hasItems ? t.stampDuty     : Number(invoice.value.stamp_duty) || 0;

    // 1. Update invoice header
    const { error: invError } = await appwriteDb
      .from('invoices')
      .update(invoiceId.value, {
        client_id: invoice.value.client_id,
        price_mode: invoice.value.price_mode,
        description: invoice.value.description,
        comments: Array.isArray(invoice.value.comments)
          ? JSON.stringify(invoice.value.comments)
          : (invoice.value.comments as unknown as string | undefined) || null,
        total_ht:   finalHT,
        total_tva:  finalTVA,
        total_psvb: finalPSVB,
        total_ttc:  finalTTC,
        stamp_duty: finalStamp,
        tax_calculation: hasItems
          ? JSON.stringify(t)
          : (invoice.value.tax_calculation
            ? JSON.stringify(invoice.value.tax_calculation)
            : invoice.value.tax_calculation as unknown as string | null),
      });

    if (invError) {
      $q.notify({ type: 'negative', message: invError.message || 'Erreur lors de la mise Ã  jour de la facture' });
      return false;
    }

    // 2. Delete old items
    const { error: delError } = await appwriteDb.from('invoice_items').delete().eq('invoice_id', invoiceId.value);
    if (delError) {
      $q.notify({ type: 'negative', message: delError.message || 'Erreur lors de la suppression des lignes' });
      return false;
    }

    // 3. Re-insert items
    if (items.value.length > 0) {
      const { error: itemsError } = await appwriteDb.from('invoice_items').insert(
        items.value.map((item, idx) => ({
          invoice_id: invoiceId.value,
          company_id: invoice.value.company_id,
          code: item.code || `ART${String(idx + 1).padStart(3, '0')}`,
          name: item.name,
          type: item.type,
          price: item.price,
          quantity: item.quantity,
          unit: item.unit || 'unitÃ©',
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
      if (itemsError) {
        $q.notify({ type: 'negative', message: itemsError.message || 'Erreur lors de l\'enregistrement des lignes' });
        return false;
      }
    }

    if (!silent) $q.notify({ type: 'positive', message: 'Brouillon enregistrÃ©' });
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inattendue';
    $q.notify({ type: 'negative', message });
    return false;
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
    // Validate FA/EA: montant avoir â‰¤ montant facture originale (Â§2.28)
    if ((invoice.value.type === 'FA' || invoice.value.type === 'EA') && invoice.value.original_invoice_id) {
      const orig = certifiedInvoices.value.find(i => i.id === invoice.value.original_invoice_id);
      if (orig && totals.value.totalTTC > orig.total_ttc) {
        $q.notify({ type: 'negative', message: `Montant avoir (${fmtCur(totals.value.totalTTC)}) dÃ©passe la facture originale (${fmtCur(orig.total_ttc)})` });
        transitioning.value = false;
        return;
      }
    }

    // Save draft first if submitting from draft
    if (invoice.value.status === 'draft' && action.targetStatus === 'pending_validation') {
      const saved = await saveDraft(true);
      if (!saved) {
        transitioning.value = false;
        return;
      }
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
    $q.notify({ type: 'positive', message: action.label + ' â€” effectuÃ©' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur';
    $q.notify({ type: 'negative', message });
  } finally {
    transitioning.value = false;
  }
}

function buildPdfClientInfo(client?: Client): PdfClientInfo | undefined {
  if (!client) return undefined;
  return {
    name: client.name,
    legal_form: client.legal_form,
    legal_form_other: client.legal_form_other,
    ifu: client.ifu,
    rccm: client.rccm,
    type: client.type,
    physical_address: client.physical_address,
    cadastral_address: client.cadastral_address,
    postal_address: client.postal_address,
    address: client.address,
    phone_country_code: client.phone_country_code,
    phone: client.phone,
    email: client.email,
    tax_regime: client.tax_regime,
    tax_division: client.tax_division,
    contacts: client.contacts,
  };
}

async function downloadPdf() {
  const inv = invoice.value as Invoice;
  const client = clients.value.find(c => c.id === inv.client_id);
  await pdfDownload(
    inv,
    items.value as InvoiceItem[],
    companyPdfInfo.value,
    buildPdfClientInfo(client),
    {
      operatorName: inv.operator_name,
      creditNoteNature: inv.credit_note_nature || undefined,
      originalInvoiceRef: certifiedInvoices.value.find(i => i.id === inv.original_invoice_id)?.reference,
      ...(companyStore.company?.qr_scan_base_url ? { qrScanBaseUrl: companyStore.company.qr_scan_base_url } : {}),
    },
  );
}

async function downloadDuplicata() {
  const inv = invoice.value as Invoice;
  const client = clients.value.find(c => c.id === inv.client_id);
  await pdfDownload(
    inv,
    items.value as InvoiceItem[],
    companyPdfInfo.value,
    buildPdfClientInfo(client),
    {
      isDuplicate: true,
      operatorName: inv.operator_name,
      creditNoteNature: inv.credit_note_nature || undefined,
      originalInvoiceRef: certifiedInvoices.value.find(i => i.id === inv.original_invoice_id)?.reference,
      ...(companyStore.company?.qr_scan_base_url ? { qrScanBaseUrl: companyStore.company.qr_scan_base_url } : {}),
    },
  );
}

const convertTypeOptions = [
  { label: 'Facture de vente (FV)', value: 'FV' },
  { label: "Facture d'acompte (FT)", value: 'FT' },
  { label: "Facture d'avoir (FA)", value: 'FA' },
  { label: 'Export vente (EV)', value: 'EV' },
  { label: 'Export acompte (ET)', value: 'ET' },
  { label: 'Export avoir (EA)', value: 'EA' },
];

function doConvertProforma() {
  if (!invoice.value.id) return;
  $q.dialog({
    title: 'Convertir la Proforma',
    message: 'Choisissez le type de facture Ã  crÃ©er Ã  partir de cette Proforma :',
    options: {
      type: 'radio',
      model: 'FV',
      items: convertTypeOptions.map(o => ({ label: o.label, value: o.value })),
    },
    cancel: { label: 'Annuler', flat: true },
    ok: { label: 'Convertir', color: 'indigo' },
    persistent: true,
  }).onOk((targetType: string) => {
    void (async () => {
      convertingProforma.value = true;
      try {
        const result = await convertProformaToFV(invoice.value as Invoice, items.value, targetType as InvoiceType);
        if (!result.success) {
          $q.notify({ type: 'negative', message: result.error || 'Erreur lors de la conversion' });
          return;
        }
        invoice.value.proforma_converted_to = result.newInvoiceId ?? null;
        $q.notify({
          type: 'positive',
          message: `Facture ${targetType} crÃ©Ã©e avec succÃ¨s`,
          actions: [{ label: 'Ouvrir', color: 'white', handler: () => void router.push(`/app/invoices/${result.newInvoiceId}`) }],
          timeout: 8000,
        });
      } finally {
        convertingProforma.value = false;
      }
    })();
  });
}

async function loadCatalogArticles() {
  const { data } = await appwriteDb
    .from('articles')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (data) catalogArticles.value = data as Article[];
}

async function loadCertifiedInvoices() {
  const { data } = await appwriteDb
    .from('invoices')
    .select('id, reference, total_ttc, type, status')
    .eq('status', 'certified')
    .in('type', ['FV', 'FT', 'EV', 'ET'])
    .order('$createdAt', { ascending: false })
    .limit(200);
  if (data) certifiedInvoices.value = data as typeof certifiedInvoices.value;
}

onMounted(async () => {
  await Promise.all([loadInvoice(), loadClients(), loadCertifiedInvoices(), loadCatalogArticles()]);
  // Recalc all items on load
  items.value.forEach((_, idx) => recalcItem(idx));
});
</script>
