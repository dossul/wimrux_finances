<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn flat icon="arrow_back" @click="$router.push('/invoices')" />
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
                :disable="!isDraft"
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
                :disable="!isDraft"
              />
            </div>
          </q-card-section>
        </q-card>

        <!-- Items -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="row items-center q-mb-sm">
              <div class="text-subtitle1 text-weight-medium">Articles</div>
              <q-space />
              <q-btn v-if="isDraft" flat size="sm" color="primary" icon="add" label="Ajouter" no-caps @click="addItem" />
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
                  <th style="width:50px" v-if="isDraft"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, idx) in items" :key="idx">
                  <td>
                    <q-input v-model="item.name" dense borderless placeholder="Désignation article" :disable="!isDraft" />
                  </td>
                  <td>
                    <q-select v-model="item.type" :options="articleTypes" dense borderless emit-value map-options :disable="!isDraft" />
                  </td>
                  <td>
                    <q-select v-model="item.tax_group" :options="taxGroupOptions" dense borderless emit-value map-options :disable="!isDraft" @update:model-value="recalcItem(idx)" />
                  </td>
                  <td>
                    <q-input v-model.number="item.quantity" type="number" dense borderless min="1" :disable="!isDraft" @update:model-value="recalcItem(idx)" />
                  </td>
                  <td>
                    <q-input v-model.number="item.price" type="number" dense borderless min="0" :disable="!isDraft" @update:model-value="recalcItem(idx)" />
                  </td>
                  <td class="text-right">{{ fmt(item.amount_ht) }}</td>
                  <td class="text-right">{{ fmt(item.amount_tva) }}</td>
                  <td class="text-right text-weight-bold">{{ fmt(item.amount_ttc) }}</td>
                  <td v-if="isDraft">
                    <q-btn flat dense icon="delete" size="xs" color="negative" @click="removeItem(idx)" />
                  </td>
                </tr>
              </tbody>
            </q-markup-table>

            <div v-else class="text-grey-5 text-center q-pa-lg">Aucun article. Cliquez sur "Ajouter" pour commencer.</div>
          </q-card-section>
        </q-card>

        <!-- Comments -->
        <q-card flat bordered class="q-mb-md" v-if="isDraft && invoice.comments && invoice.comments.length > 0">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-sm">Commentaires</div>
            <q-input v-model="invoice.comments[0].content" outlined dense type="textarea" rows="2" placeholder="Commentaire libre..." />
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

        <!-- Actions -->
        <q-card flat bordered>
          <q-card-section class="q-gutter-sm">
            <q-btn v-if="isDraft" color="primary" icon="save" label="Enregistrer brouillon" class="full-width" no-caps :loading="saving" @click="saveDraft" />
            <q-btn v-if="isDraft && items.length > 0" color="amber-8" icon="check" label="Valider la facture" class="full-width" no-caps @click="validateInvoice" />
            <q-btn v-if="invoice.status === 'validated'" color="green" icon="verified" label="Certifier (FNEC)" class="full-width" no-caps :loading="certifying" @click="certifyInvoice" />
            <q-btn v-if="invoice.status === 'certified'" color="blue" icon="picture_as_pdf" label="Télécharger PDF" class="full-width" no-caps />
          </q-card-section>
        </q-card>
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
import { useFnecApi } from 'src/composables/useFnecApi';
import type { Invoice, InvoiceItem, Client, TaxGroup, ArticleType } from 'src/types';

const route = useRoute();
const $q = useQuasar();
const { calculateItemTax, calculateInvoiceTotals } = useTaxCalculation();
const fnecApi = useFnecApi();

const invoiceId = computed(() => route.params.id as string);

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
const saving = ref(false);
const certifying = ref(false);

const isDraft = computed(() => invoice.value.status === 'draft');

const typeColor = computed(() => {
  const map: Record<string, string> = { FV: 'blue', FT: 'teal', FA: 'orange', EV: 'indigo', ET: 'cyan', EA: 'deep-orange' };
  return map[invoice.value.type || 'FV'] || 'grey';
});

const statusColor = computed(() => {
  const map: Record<string, string> = { draft: 'grey', validated: 'amber-8', certified: 'green', cancelled: 'red' };
  return map[invoice.value.status || 'draft'] || 'grey';
});

const statusLabel = computed(() => {
  const map: Record<string, string> = { draft: 'Brouillon', validated: 'Validée', certified: 'Certifiée', cancelled: 'Annulée' };
  return map[invoice.value.status || 'draft'] || '';
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

function validateInvoice() {
  $q.dialog({
    title: 'Valider la facture',
    message: 'ATTENTION: Une fois validée, la facture ne pourra plus être modifiée. Continuer ?',
    cancel: true,
    persistent: true,
    color: 'amber-8',
  }).onOk(() => void (async () => {
    await saveDraft();
    const { error } = await insforge.database
      .from('invoices')
      .update({ status: 'validated', validated_at: new Date().toISOString() })
      .eq('id', invoiceId.value);

    if (error) {
      $q.notify({ type: 'negative', message: error.message });
    } else {
      invoice.value.status = 'validated';
      $q.notify({ type: 'positive', message: 'Facture validée — point de non-retour' });
    }
  })());
}

async function certifyInvoice() {
  certifying.value = true;
  try {
    // 1. Authenticate with FNEC
    const authResult = await fnecApi.getToken({
      clientId: '00000000000001',
      clientSecret: 'test_secret',
      nim: 'BF01000001',
    });
    if (authResult.error) {
      $q.notify({ type: 'negative', message: `FNEC Auth: ${authResult.error.message}` });
      return;
    }

    // 2. Submit invoice
    const submitResult = await fnecApi.submitInvoice({
      ifu: '00000000000001',
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
      $q.notify({ type: 'negative', message: `FNEC Submit: ${submitResult.error.message}` });
      return;
    }

    // 3. Confirm (certify)
    const uid = submitResult.data?.uid;
    if (!uid) return;

    const confirmResult = await fnecApi.confirmInvoice(uid);
    if (confirmResult.error) {
      $q.notify({ type: 'negative', message: `FNEC Certify: ${confirmResult.error.message}` });
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
    $q.notify({ type: 'negative', message });
  } finally {
    certifying.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadInvoice(), loadClients()]);
  // Recalc all items on load
  items.value.forEach((_, idx) => recalcItem(idx));
});
</script>
