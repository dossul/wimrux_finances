<template>
  <q-dialog :model-value="modelValue" persistent maximized transition-show="slide-up" transition-hide="slide-down"
    @update:model-value="$emit('update:modelValue', $event)">
    <q-layout view="hHh lpR fFf" container style="height:100vh">

      <!-- ── Toolbar ── -->
      <q-header class="bg-teal-8 text-white">
        <q-toolbar>
          <q-icon name="document_scanner" size="22px" class="q-mr-sm" />
          <q-toolbar-title>
            Révision OCR — Vérifiez et corrigez avant import
            <q-badge v-if="ocr?.needs_human_review" color="orange" label="Vérification recommandée" class="q-ml-sm" />
            <q-badge v-if="ocr" :color="confColor" :label="`IA : ${Math.round((ocr.confidence ?? 0) * 100)}%`" class="q-ml-xs" />
          </q-toolbar-title>
          <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
        </q-toolbar>
        <!-- Barre progression IA -->
        <q-linear-progress v-if="ocr" :value="ocr.confidence ?? 0" :color="confColor" track-color="teal-6" size="3px" />
      </q-header>

      <!-- ── Corps split ── -->
      <q-page-container>
        <q-page class="row no-wrap" style="height:calc(100vh - 50px); overflow:hidden">

          <!-- ══ GAUCHE : Formulaire éditable ══ -->
          <div class="col q-pa-md overflow-auto" style="max-height:100%;background:#f4f6f9;border-right:2px solid #b2dfdb">

            <!-- Alerte review -->
            <q-banner v-if="ocr?.needs_human_review" dense rounded class="bg-orange-1 text-orange-9 q-mb-md">
              <template #avatar><q-icon name="warning" color="orange" /></template>
              L'IA a détecté des incertitudes — vérifiez attentivement les données ci-dessous.
            </q-banner>

            <!-- Fournisseur -->
            <q-card flat bordered class="q-mb-md" style="border-radius:8px">
              <q-card-section class="q-pb-sm">
                <div class="text-subtitle2 text-teal-8 q-mb-sm row items-center">
                  <q-icon name="business" class="q-mr-xs" />Fournisseur
                  <q-badge v-if="extracted?.supplier_created" color="teal" label="Nouveau" class="q-ml-sm" />
                </div>
                <div class="row q-gutter-sm">
                  <q-select v-model="form.supplier_id" :options="supplierOptions" label="Fournisseur *"
                    emit-value map-options outlined dense class="col" use-input input-debounce="0"
                    @filter="filterSuppliers" bg-color="white">
                    <template #no-option>
                      <q-item><q-item-section class="text-grey">Aucun</q-item-section></q-item>
                    </template>
                    <template #append>
                      <q-btn flat round dense icon="person_add" color="teal" size="sm"
                        title="Créer fournisseur" @click="showNewSupplier = true" />
                    </template>
                  </q-select>
                  <q-input v-model="form.supplier_invoice_number" label="N° facture fourn." outlined dense class="col-4" bg-color="white" />
                </div>
              </q-card-section>
            </q-card>

            <!-- Identification -->
            <q-card flat bordered class="q-mb-md" style="border-radius:8px">
              <q-card-section class="q-pb-sm">
                <div class="text-subtitle2 text-teal-8 q-mb-sm row items-center">
                  <q-icon name="receipt" class="q-mr-xs" />Identification
                </div>
                <div class="row q-gutter-sm q-mb-sm">
                  <q-input v-model="form.received_at" label="Date réception *" type="datetime-local" outlined dense class="col" bg-color="white"
                    :rules="[v => !!v || 'Requis']" />
                  <q-select v-model="form.type" :options="typeOptions" emit-value map-options
                    label="Type *" outlined dense class="col-4" bg-color="white" />
                </div>
                <div class="row q-gutter-sm">
                  <q-input v-model="form.due_date" label="Échéance" type="date" outlined dense class="col" bg-color="white"
                    @update:model-value="onDueDateChange" />
                  <q-input v-model.number="form.payment_terms_days" label="Délai (j)" type="number"
                    outlined dense class="col-3" bg-color="white" @update:model-value="onDelayChange" />
                </div>
              </q-card-section>
            </q-card>

            <!-- Montants -->
            <q-card flat bordered class="q-mb-md" style="border-radius:8px">
              <q-card-section class="q-pb-sm">
                <div class="text-subtitle2 text-teal-8 q-mb-sm row items-center">
                  <q-icon name="payments" class="q-mr-xs" />Montants (FCFA)
                </div>
                <div class="row q-gutter-sm q-mb-sm">
                  <q-input v-model.number="form.total_ht" label="Total HT" type="number" outlined dense class="col" bg-color="white"
                    @update:model-value="autoCalcTva" />
                  <q-input v-model.number="form.total_tva" label="TVA (18%)" type="number" outlined dense class="col" bg-color="white"
                    @update:model-value="autoCalcTtc" />
                </div>
                <div class="row q-gutter-sm q-mb-sm">
                  <q-input v-model.number="form.total_psvb" label="PSVB" type="number" outlined dense class="col" bg-color="white"
                    @update:model-value="autoCalcTtc" />
                  <q-input v-model.number="form.total_bic" label="BIC (2%)" type="number" outlined dense class="col" bg-color="white"
                    @update:model-value="autoCalcTtc" />
                  <q-input v-model.number="form.stamp_duty" label="Timbre" type="number" outlined dense class="col" bg-color="white"
                    @update:model-value="autoCalcTtc" />
                </div>
                <q-input v-model.number="form.total_ttc" label="Total TTC *" type="number" outlined dense
                  :bg-color="montantInconsistant ? 'orange-1' : 'teal-1'"
                  :rules="[v => v > 0 || 'Montant > 0']">
                  <template #append>
                    <q-icon v-if="montantInconsistant" name="warning" color="orange" />
                    <q-icon v-else name="check_circle" color="positive" />
                    <q-btn flat dense size="xs" icon="calculate" title="Recalculer" @click="recalcAll" />
                  </template>
                </q-input>
                <q-banner v-if="montantInconsistant" dense rounded class="bg-orange-1 text-orange-9 text-caption q-mt-xs">
                  <template #avatar><q-icon name="warning" /></template>
                  HT + TVA + PSVB + BIC + Timbre ≠ TTC — vérifier les montants
                </q-banner>
              </q-card-section>
            </q-card>

            <!-- Conformité fiscale -->
            <q-card flat bordered class="q-mb-sm" style="border-radius:8px">
              <q-card-section class="q-pb-sm">
                <div class="text-subtitle2 text-teal-8 q-mb-sm row items-center">
                  <q-icon name="verified" class="q-mr-xs" />Conformité fiscale
                </div>

                <!-- IFU : identique au wizard manuel -->
                <div class="row q-gutter-sm items-center q-mb-sm">
                  <q-select v-model="form.fiscal_compliance_status"
                    :options="complianceOptions" emit-value map-options
                    label="Statut" outlined dense class="col" bg-color="white" />
                  <div class="col-auto column items-center">
                    <q-toggle v-model="form.ifu_verified" label="IFU vérifié" color="positive" dense />
                    <q-btn v-if="effectiveIfu"
                      unelevated no-caps color="indigo-7" icon="verified_user" icon-right="open_in_new"
                      label="Vérifier sur DGI.bf"
                      :loading="ifuLoading"
                      @click="verifierIfuDgi"
                      class="q-mt-sm"
                      style="font-size:0.78rem;padding:6px 14px;border-radius:8px;font-weight:600;letter-spacing:0.3px"
                    >
                      <template #loading>
                        <q-spinner-dots size="18px" />&nbsp;Vérification...
                      </template>
                    </q-btn>
                  </div>
                </div>
                <!-- Saisie manuelle si aucun IFU détecté -->
                <div v-if="!effectiveIfu" class="row q-gutter-sm q-mb-sm items-center">
                  <q-input v-model="manualIfu" label="Saisir IFU manuellement" outlined dense class="col"
                    placeholder="ex: 00014674A" bg-color="white" clearable
                    hint="IFU non détecté par l'IA ni dans la fiche fournisseur" />
                  <q-btn v-if="manualIfu"
                    unelevated no-caps color="indigo-7" icon="verified_user" icon-right="open_in_new"
                    label="Vérifier sur DGI.bf"
                    :loading="ifuLoading"
                    @click="verifierIfuDgi"
                    style="font-size:0.78rem;padding:6px 14px;border-radius:8px;font-weight:600;letter-spacing:0.3px"
                  >
                    <template #loading>
                      <q-spinner-dots size="18px" />&nbsp;Vérification...
                    </template>
                  </q-btn>
                </div>

                <!-- Résultat IFU -->
                <template v-if="ifuResult">
                  <div class="row items-center q-mt-xs q-gutter-xs">
                    <q-icon
                      :name="ifuResult.etat === 'ACTIF' ? 'verified_user' : ifuResult.etat === 'DESACTIVE' ? 'block' : 'help_outline'"
                      :color="ifuResult.etat === 'ACTIF' ? 'positive' : ifuResult.etat === 'DESACTIVE' ? 'orange' : 'grey'"
                      size="20px" />
                    <span class="text-caption text-weight-bold">{{ ifuResult.nom || effectiveIfu }}</span>
                    <q-badge
                      :color="ifuResult.etat === 'ACTIF' ? 'positive' : ifuResult.etat === 'DESACTIVE' ? 'orange-8' : 'grey'"
                      :label="ifuResult.etat" />
                  </div>
                  <q-expansion-item
                    v-if="ifuResult.champs && ifuResult.champs.length"
                    dense dense-toggle icon="table_rows" label="Détails DGI complets"
                    :header-class="ifuResult.etat === 'ACTIF' ? 'text-positive' : 'text-orange-8'"
                    class="q-mt-xs rounded-borders" style="border:1px solid #e0e0e0;border-radius:6px"
                  >
                    <q-list dense separator>
                      <q-item v-for="champ in ifuResult.champs" :key="champ.label" dense class="q-pa-xs">
                        <q-item-section class="text-caption text-grey-7" style="min-width:140px;max-width:140px">{{ champ.label }}</q-item-section>
                        <q-item-section class="text-caption" :class="champ.actif ? 'text-dark' : 'text-orange-8'">
                          <span v-if="champ.actif">{{ champ.valeur }}</span>
                          <span v-else class="text-italic">—</span>
                        </q-item-section>
                      </q-item>
                    </q-list>
                  </q-expansion-item>
                </template>

                <q-input v-model="form.fiscal_compliance_notes" label="Notes fiscales (sticker DGI...)"
                  outlined dense type="textarea" rows="2" class="q-mb-sm" bg-color="white" />
                <q-input v-model="form.description" label="Description" outlined dense type="textarea" rows="2" bg-color="white" />
              </q-card-section>
            </q-card>
          </div><!-- fin col gauche -->

          <!-- ══ DROITE : Viewer PDF/Image ══ -->
          <div class="col-5" style="background:#525659;display:flex;flex-direction:column;height:100%;min-height:0">
            <div class="row items-center q-px-md q-py-sm bg-teal-9" style="border-bottom:2px solid #00695c;flex-shrink:0">
              <q-icon name="picture_as_pdf" color="white" class="q-mr-sm" />
              <span class="text-caption text-weight-bold text-white">Facture originale</span>
              <q-space />
              <q-btn v-if="previewUrl" flat round dense icon="open_in_new" size="xs" color="white"
                :href="previewUrl" target="_blank" title="Ouvrir dans un onglet" />
            </div>

            <!-- PDF -->
            <iframe v-if="previewUrl && previewIsPdf"
              :src="previewUrl"
              style="flex:1;width:100%;border:none;min-height:0" />
            <!-- Image -->
            <div v-else-if="previewUrl && previewIsImage"
              style="flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;padding:12px">
              <img :src="previewUrl"
                style="max-width:100%;max-height:100%;object-fit:contain;border-radius:4px;box-shadow:0 4px 20px rgba(0,0,0,.5)" />
            </div>
            <!-- Aucun document -->
            <div v-else style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:#9e9e9e">
              <q-icon name="picture_as_pdf" size="72px" />
              <div class="text-h6">Aperçu non disponible</div>
              <div class="text-caption">Le document sera joint après import</div>
            </div>
          </div>

        </q-page>
      </q-page-container>

      <!-- ── Footer actions ── -->
      <q-footer class="bg-white" style="border-top:1px solid #e0e0e0">
        <q-toolbar>
          <q-btn flat no-caps label="Annuler" icon="close" @click="$emit('update:modelValue', false)" />
          <q-space />
          <div class="text-caption text-grey-6 q-mr-md">
            Vérifiez toutes les données avant de confirmer l'import
          </div>
          <q-btn color="teal-8" no-caps icon="save" label="Confirmer & Importer"
            :loading="importing" :disable="!canSubmit" @click="submit" />
        </q-toolbar>
      </q-footer>

    </q-layout>
  </q-dialog>

  <!-- Dialog nouveau fournisseur -->
  <q-dialog v-model="showNewSupplier" persistent>
    <q-card style="min-width:480px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Nouveau fournisseur</div>
        <q-space /><q-btn flat round dense icon="close" v-close-popup />
      </q-card-section>
      <q-card-section class="q-gutter-sm">
        <q-input v-model="newSup.name" label="Nom *" outlined dense :rules="[v => !!v || 'Requis']" />
        <div class="row q-gutter-sm">
          <q-input v-model="newSup.ifu" label="IFU" outlined dense class="col" />
          <q-input v-model="newSup.rccm" label="RCCM" outlined dense class="col" />
        </div>
        <div class="row q-gutter-sm">
          <q-input v-model="newSup.phone" label="Téléphone" outlined dense class="col" />
          <q-input v-model="newSup.email" label="Email" outlined dense class="col" type="email" />
        </div>
        <q-input v-model="newSup.address" label="Adresse" outlined dense type="textarea" rows="2" />
      </q-card-section>
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Annuler" v-close-popup />
        <q-btn color="teal" no-caps label="Créer" :loading="creatingSupplier" @click="createSupplier" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import dayjs from 'dayjs';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import { useSuppliers } from 'src/composables/useSuppliers';
import { useReceivedInvoices } from 'src/composables/useReceivedInvoices';
import {
  useSupplierInvoiceOcr,
  type OcrInvoiceData,
  type OcrExtractResult,
} from 'src/composables/useSupplierInvoiceOcr';
import type { FiscalComplianceStatus } from 'src/types';

// ── Props / Emits ─────────────────────────────────────────────────────────────
const props = defineProps<{
  modelValue: boolean;
  extracted:  OcrExtractResult | null;
  sourceFile: File | null;      // fichier original pour le viewer
  sourceUrl:  string | null;    // URL InsForge Storage si déjà uploadé
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'saved'): void;
}>();

const $q           = useQuasar();
const companyStore = useCompanyStore();
const { suppliers, loadSuppliers } = useSuppliers();
const { createInvoice } = useReceivedInvoices();
const { createReceivedInvoice } = useSupplierInvoiceOcr();

const importing = ref(false);

// ── Viewer PDF/Image ──────────────────────────────────────────────────────────
const blobUrl = ref('');

watch(() => props.sourceFile, (f) => {
  if (blobUrl.value) URL.revokeObjectURL(blobUrl.value);
  blobUrl.value = f ? URL.createObjectURL(f) : '';
}, { immediate: true });

const previewUrl = computed(() => blobUrl.value || props.sourceUrl || '');
const previewIsPdf = computed(() => {
  const u = previewUrl.value;
  return /\.pdf$/i.test(props.sourceFile?.name ?? '') || /\.pdf(\?|$)/i.test(u);
});
const previewIsImage = computed(() => {
  const u = previewUrl.value;
  return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(u) ||
    /\.(jpg|jpeg|png|gif|webp)$/i.test(props.sourceFile?.name ?? '');
});

// ── Confiance IA ──────────────────────────────────────────────────────────────
const ocr = computed<OcrInvoiceData | null>(() => props.extracted?.ocr ?? null);
const confColor = computed(() => {
  const c = ocr.value?.confidence ?? 0;
  return c >= 0.85 ? 'positive' : c >= 0.65 ? 'orange' : 'negative';
});

// IFU effectif : OCR → DB fournisseur → saisie manuelle
const manualIfu = ref<string>('');
const effectiveIfu = computed(() => {
  const fromOcr = ocr.value?.supplier_ifu;
  if (fromOcr && fromOcr !== 'null') return fromOcr;
  const sup = suppliers.value.find(s => s.id === form.value.supplier_id);
  if (sup?.ifu) return sup.ifu;
  return manualIfu.value || null;
});

// ── Formulaire ────────────────────────────────────────────────────────────────
const emptyForm = () => ({
  supplier_id:              null as string | null,
  supplier_invoice_number:  null as string | null,
  received_at:              dayjs().format('YYYY-MM-DDTHH:mm'),
  type:                     'FT',
  due_date:                 null as string | null,
  payment_terms_days:       30,
  total_ht:                 0,
  total_tva:                0,
  total_psvb:               0,
  total_bic:                0,
  stamp_duty:               0,
  total_ttc:                0,
  fiscal_compliance_status: 'pending' as FiscalComplianceStatus,
  fiscal_compliance_notes:  null as string | null,
  ifu_verified:             false,
  description:              null as string | null,
  scan_url:                 null as string | null,
  ocr_source_url:           null as string | null,
});

const form = ref(emptyForm());

// Pré-remplir depuis l'extraction OCR quand le dialog s'ouvre
watch(() => props.modelValue, async (open) => {
  if (!open) return;
  await loadSuppliers();

  const o = props.extracted?.ocr;
  form.value = emptyForm();

  if (props.extracted) {
    form.value.supplier_id = props.extracted.supplier_id;
  }
  if (o) {
    form.value.supplier_invoice_number = o.supplier_invoice_number ?? null;
    form.value.received_at = o.invoice_date
      ? dayjs(o.invoice_date).format('YYYY-MM-DD') + 'T00:00'
      : dayjs().format('YYYY-MM-DDTHH:mm');
    form.value.due_date = o.due_date ? dayjs(o.due_date).format('YYYY-MM-DD') : null;

    // Montants
    const ttc = Number(o.total_ttc) || 0;
    const ht  = Number(o.total_ht)  || 0;
    const tva = Number(o.total_tva) || 0;

    form.value.total_ttc = ttc;
    if (ht > 0) {
      form.value.total_ht  = ht;
      form.value.total_tva = tva > 0 ? tva : Math.round(ht * 0.18);
    } else if (ttc > 0) {
      form.value.total_ht  = Math.round(ttc / 1.18);
      form.value.total_tva = ttc - form.value.total_ht;
    }

    form.value.description = (o.description && o.description !== 'null') ? o.description : null;
    const stickerRef = (o.fiscal_sticker_ref && o.fiscal_sticker_ref !== 'null')
      ? o.fiscal_sticker_ref : null;
    form.value.fiscal_compliance_notes = stickerRef
      ? `Sticker fiscal DGI : ${stickerRef}` : null;
    form.value.ifu_verified = !!(o.supplier_ifu && o.supplier_ifu !== 'null');
    // Calcul du délai avec dayjs
    if (o.due_date && o.invoice_date) {
      form.value.payment_terms_days = Math.max(
        0, dayjs(o.due_date).diff(dayjs(o.invoice_date), 'day')
      );
    }
  }
  form.value.ocr_source_url = props.sourceUrl ?? null;
});

// ── Fournisseurs ──────────────────────────────────────────────────────────────
const supplierSearch = ref('');
const supplierOptions = computed(() =>
  suppliers.value
    .filter(s => s.is_active !== false)
    .filter(s => !supplierSearch.value ||
      s.name.toLowerCase().includes(supplierSearch.value.toLowerCase()))
    .map(s => ({ label: `${s.name}${s.ifu ? ' · ' + s.ifu : ''}`, value: s.id }))
);
function filterSuppliers(val: string, update: (fn: () => void) => void) {
  update(() => { supplierSearch.value = val; });
}

// ── Nouveau fournisseur ───────────────────────────────────────────────────────
const showNewSupplier  = ref(false);
const creatingSupplier = ref(false);
const newSup = ref({ name: '', ifu: '', rccm: '', phone: '', email: '', address: '' });

async function createSupplier() {
  if (!newSup.value.name) return;
  creatingSupplier.value = true;
  try {
    const { data, error } = await insforge.database.from('suppliers').insert({
      company_id: companyStore.company!.id,
      name: newSup.value.name,
      ifu:  newSup.value.ifu  || null,
      rccm: newSup.value.rccm || null,
      phone: newSup.value.phone || null,
      email: newSup.value.email || null,
      address: newSup.value.address || null,
      is_active: true, country: 'BF',
    }).select('id, name').single();
    if (error) { $q.notify({ type: 'negative', message: error.message }); return; }
    await loadSuppliers();
    form.value.supplier_id = (data as { id: string }).id;
    showNewSupplier.value = false;
    newSup.value = { name: '', ifu: '', rccm: '', phone: '', email: '', address: '' };
    $q.notify({ type: 'positive', message: 'Fournisseur créé' });
  } finally { creatingSupplier.value = false; }
}

// ── Calculs montants ──────────────────────────────────────────────────────────
function autoCalcTva() {
  form.value.total_tva = Math.round(form.value.total_ht * 0.18 * 100) / 100;
  autoCalcTtc();
}
function autoCalcTtc() {
  form.value.total_ttc = form.value.total_ht + form.value.total_tva +
    form.value.total_psvb + form.value.total_bic + form.value.stamp_duty;
}
function recalcAll() {
  if (form.value.total_ttc > 0 && form.value.total_ht === 0) {
    form.value.total_ht  = Math.round(form.value.total_ttc / 1.18 * 100) / 100;
    form.value.total_tva = Math.round(form.value.total_ht * 0.18 * 100) / 100;
  } else { autoCalcTtc(); }
}
const montantInconsistant = computed(() => {
  if (!form.value.total_ttc) return false;
  const calc = form.value.total_ht + form.value.total_tva +
    form.value.total_psvb + form.value.total_bic + form.value.stamp_duty;
  return Math.abs(calc - form.value.total_ttc) > 1;
});

// ── Échéance auto (dayjs) ───────────────────────────────────────────────────
function onDelayChange() {
  const days = Number(form.value.payment_terms_days);
  if (!days || days <= 0) return;
  const base = form.value.received_at
    ? dayjs(form.value.received_at.slice(0, 10))
    : dayjs();
  form.value.due_date = base.add(days, 'day').format('YYYY-MM-DD');
}
function onDueDateChange() {
  if (!form.value.due_date || !form.value.received_at) return;
  const diff = dayjs(form.value.due_date).diff(
    dayjs(form.value.received_at.slice(0, 10)), 'day'
  );
  form.value.payment_terms_days = Math.max(0, diff);
}

// ── Validation ────────────────────────────────────────────────────────────────
const canSubmit = computed(() =>
  !!form.value.supplier_id && !!form.value.received_at && form.value.total_ttc > 0
);

// ── Soumission ────────────────────────────────────────────────────────────────
async function submit() {
  if (!canSubmit.value) {
    $q.notify({ type: 'warning', message: 'Fournisseur, date réception et montant TTC requis' });
    return;
  }

  // ── Vérification doublon ────────────────────────────────────────────────────
  if (form.value.supplier_id && form.value.supplier_invoice_number) {
    const { data: existingList } = await insforge.database
      .from('invoices')
      .select('id, reference, received_at')
      .eq('supplier_id', form.value.supplier_id)
      .eq('supplier_invoice_number', form.value.supplier_invoice_number)
      .limit(1);

    const existing = (existingList as { id: string; reference: string; received_at: string }[] | null)?.[0];
    if (existing) {
      const continueImport = await new Promise<boolean>(resolve => {
        $q.dialog({
          title: '⚠️ Doublon détecté',
          message: `Une facture avec le N° <strong>${form.value.supplier_invoice_number}</strong> existe déjà pour ce fournisseur.<br>
            Réf. interne : <strong>${existing.reference}</strong><br>
            Date : ${existing.received_at?.slice(0, 10) ?? '—'}<br><br>
            Voulez-vous quand même importer cette facture ?`,
          html: true,
          cancel: { label: 'Annuler', flat: true },
          ok: { label: 'Importer quand même', color: 'orange' },
          persistent: true,
        }).onOk(() => resolve(true)).onCancel(() => resolve(false)).onDismiss(() => resolve(false));
      });
      if (!continueImport) return;
    }
  }

  importing.value = true;
  try {
    const ref = `FR-${Date.now().toString(36).toUpperCase()}`;
    const payload = {
      company_id:              companyStore.company!.id,
      direction:               'received' as const,
      supplier_id:             form.value.supplier_id!,
      supplier_invoice_number: form.value.supplier_invoice_number,
      reference:               ref,
      status:                  'draft',
      total_ht:                form.value.total_ht,
      total_tva:               form.value.total_tva,
      total_psvb:              form.value.total_psvb || 0,
      stamp_duty:              form.value.stamp_duty || 0,
      total_ttc:               form.value.total_ttc,
      due_date:                form.value.due_date,
      received_at:             form.value.received_at
                                 ? new Date(form.value.received_at).toISOString()
                                 : new Date().toISOString(),
      type:                    form.value.type,
      description:             form.value.description,
      payment_status:          'unpaid',
      paid_amount:             0,
      ifu_verified:            form.value.ifu_verified,
      fiscal_compliance_status: form.value.fiscal_compliance_status,
      fiscal_compliance_notes:  form.value.fiscal_compliance_notes,
      scan_url:                form.value.scan_url || props.sourceUrl,
      ocr_source_url:          props.sourceUrl,
      ocr_confidence:          ocr.value ? { global: ocr.value.confidence } : null,
    };

    const { error } = await insforge.database
      .from('invoices')
      .insert(payload);

    if (error) throw new Error(error.message);

    $q.notify({ type: 'positive', icon: 'check_circle',
      message: `Facture importée : ${ref}${
        props.extracted?.supplier_created ? ' · Nouveau fournisseur créé' : ''}` });
    emit('saved');
    emit('update:modelValue', false);
  } catch (e) {
    $q.notify({ type: 'negative', message: `Erreur : ${e instanceof Error ? e.message : 'inconnue'}` });
  } finally {
    importing.value = false;
  }
}
// ── Vérification IFU DGI.bf (identique au wizard manuel) ───────────────────
interface IfuResult {
  nom:     string;
  etat:    string;
  rccm:    string;
  regime:  string;
  adresse: string;
  tel:     string;
  email:   string;
  champs?: { label: string; valeur: string; actif: boolean }[];
}

const ifuResult  = ref<IfuResult | null>(null);
const ifuLoading = ref(false);

const DIFY_IFU_WORKFLOW = import.meta.env.VITE_DIFY_IFU_WORKFLOW_URL  as string | undefined;
const IFU_SCRAPER_URL   = import.meta.env.VITE_IFU_SCRAPER_URL        as string | undefined;

async function verifierIfuDgi() {
  const ifu = effectiveIfu.value;
  if (!ifu) return;
  ifuResult.value  = null;
  ifuLoading.value = true;

  // Mode 1 : scraper Browserless
  if (IFU_SCRAPER_URL) {
    try {
      const res = await fetch(`${IFU_SCRAPER_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ifu }),
      });
      if (res.ok) {
        const json = await res.json() as {
          statut: string;
          resultat?: { etat?: string; nom?: string; rccm?: string; regime?: string; adresse?: string;
            champs?: { label: string; valeur: string; actif: boolean }[] };
          message?: string;
        };
        if (json.statut === 'ok' && json.resultat) {
          const r = json.resultat;
          ifuResult.value = { nom: r.nom ?? '', etat: r.etat ?? 'INCONNU', rccm: r.rccm ?? '',
            regime: r.regime ?? '', adresse: r.adresse ?? '', tel: '', email: '', champs: r.champs ?? [] };
          if (r.etat === 'ACTIF') {
            form.value.ifu_verified = true;
            form.value.fiscal_compliance_status = 'valid';
            $q.notify({ type: 'positive', icon: 'verified_user',
              message: `IFU vérifié ✓ — ${r.nom || ifu}`, timeout: 5000 });
          } else {
            $q.notify({ type: 'warning', message: json.message ?? 'IFU : statut ambigu' });
          }
        }
      }
    } catch (e) { console.warn('[IFU] Scraper:', e); }
    finally { ifuLoading.value = false; }
    if (ifuResult.value) return;
  }

  // Mode 2 : workflow Dify
  if (DIFY_IFU_WORKFLOW) {
    try {
      const res = await fetch(DIFY_IFU_WORKFLOW, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: { ifu }, response_mode: 'blocking', user: 'wimrux' }),
      });
      if (res.ok) {
        const json = await res.json() as { data?: { outputs?: { nom?: string; etat?: string; rccm?: string; regime?: string; adresse?: string } } };
        const out = json.data?.outputs;
        if (out) {
          ifuResult.value = { nom: out.nom ?? '', etat: out.etat ?? 'INCONNU',
            rccm: out.rccm ?? '', regime: out.regime ?? '', adresse: out.adresse ?? '', tel: '', email: '' };
          if (out.etat === 'ACTIVE') { form.value.ifu_verified = true; form.value.fiscal_compliance_status = 'valid'; }
        }
      }
    } catch (e) { console.warn('[IFU] Dify:', e); }
    finally { ifuLoading.value = false; }
    if (ifuResult.value) return;
  }

  // Mode 3 : ouverture manuelle
  ifuLoading.value = false;
  globalThis.open(`https://dgi.bf/verification/verification-ifu?ifu=${encodeURIComponent(ifu)}`, '_blank');
}

const complianceOptions = [
  { label: 'En attente', value: 'pending' },
  { label: 'Valide',     value: 'valid' },
  { label: 'Non valide', value: 'invalid' },
  { label: 'Non vérifié', value: 'unchecked' },
];
const typeOptions = [
  { label: 'FV — Facture de vente',  value: 'FV' },
  { label: "FT — Facture d'acompte", value: 'FT' },
  { label: "FA — Facture d'avoir",   value: 'FA' },
  { label: 'EV — Export vente',      value: 'EV' },
  { label: 'PF — Proforma',          value: 'PF' },
];
</script>

<style scoped>
.overflow-auto { overflow-y: auto; }
</style>
