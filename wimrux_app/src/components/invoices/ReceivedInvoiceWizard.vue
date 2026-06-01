<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="$emit('update:modelValue', $event)">
    <q-card :style="step === 4 ? 'width:92vw;max-width:1380px;min-width:900px' : 'min-width:660px;max-width:760px'">

      <!-- Header -->
      <q-card-section class="row items-center q-pb-none bg-primary text-white">
        <q-icon name="receipt_long" size="24px" class="q-mr-sm" />
        <div class="text-h6">{{ invoice ? 'Modifier la facture' : 'Nouvelle facture recue' }}</div>
        <q-space />
        <q-btn flat round dense icon="close" color="white" @click="$emit('update:modelValue', false)" />
      </q-card-section>

      <!-- Step indicator -->
      <q-linear-progress :value="step / 4" color="primary" />
      <div class="row q-px-md q-pt-sm q-pb-xs">
        <template v-for="(s, i) in stepLabels" :key="i">
          <div class="col text-center">
            <q-chip
              :color="step > i + 1 ? 'positive' : step === i + 1 ? 'primary' : 'grey-3'"
              :text-color="step >= i + 1 ? 'white' : 'grey-6'"
              dense size="sm"
              :icon="step > i + 1 ? 'check' : s.icon"
              :label="s.label"
            />
          </div>
        </template>
      </div>

      <q-separator />

      <!-- ETAPE 1 : Fournisseur -->
      <q-card-section v-show="step === 1" class="q-gutter-md">
        <div class="text-subtitle2 text-grey-7 q-mb-sm">Identification du fournisseur</div>
        <q-select
          v-model="form.supplier_id"
          :options="supplierOptions"
          label="Fournisseur *"
          emit-value map-options outlined use-input input-debounce="0"
          :rules="[v => !!v || 'Requis']"
          @filter="filterSuppliers"
        >
          <template #no-option><q-item><q-item-section class="text-grey">Aucun fournisseur</q-item-section></q-item></template>
          <template #append>
            <q-btn flat round dense icon="person_add" color="primary" title="Creer fournisseur" @click="showNewSupplier = true" />
          </template>
        </q-select>

        <!-- Infos fournisseur selectionne -->
        <q-card v-if="selectedSupplier" flat bordered class="bg-blue-1">
          <q-card-section class="q-pa-sm">
            <div class="row q-gutter-sm text-caption">
              <span v-if="selectedSupplier.ifu"><q-icon name="fingerprint" /> IFU: <strong>{{ selectedSupplier.ifu }}</strong></span>
              <span v-if="selectedSupplier.rccm"><q-icon name="business" /> RCCM: {{ selectedSupplier.rccm }}</span>
              <span v-if="selectedSupplier.phone"><q-icon name="phone" /> {{ selectedSupplier.phone }}</span>
              <span v-if="selectedSupplier.email"><q-icon name="email" /> {{ selectedSupplier.email }}</span>
            </div>
            <div v-if="selectedSupplier.address" class="text-caption q-mt-xs">
              <q-icon name="location_on" /> {{ selectedSupplier.address }}
            </div>
          </q-card-section>
        </q-card>

        <q-input v-model="form.supplier_invoice_number" label="N° facture fournisseur" outlined dense
          hint="Tel qu'il apparait sur la facture originale" />
        <div class="row q-gutter-sm">
          <q-input v-model="form.received_at" label="Date reception *" type="datetime-local" outlined dense
            :rules="[v => !!v || 'Requis']" class="col" />
          <q-select v-model="form.type" :options="typeOptions" emit-value map-options
            label="Type *" outlined dense class="col-4"
            :rules="[v => !!v || 'Requis']" />
        </div>
      </q-card-section>

      <!-- ETAPE 2 : Identification -->
      <q-card-section v-show="step === 2" class="q-gutter-md">
        <div class="text-subtitle2 text-grey-7 q-mb-sm">Details de la facture</div>
        <div class="row q-gutter-sm">
          <q-input v-model="form.reference" label="Reference interne *" outlined dense class="col"
            :rules="[v => !!v || 'Requis']" hint="Generee auto si vide" />
          <q-select v-model="form.price_mode" :options="['TTC','HT']" label="Mode prix" outlined dense class="col-3" />
        </div>
        <div class="row q-gutter-sm">
          <q-input v-model="form.due_date" label="Echeance (calculee)" type="date" outlined dense class="col"
            hint="Auto = date reception + delai" @update:model-value="onDueDateChange" />
          <q-input v-model.number="form.payment_terms_days" label="Delai paiement (jours)"
            type="number" outlined dense class="col" @update:model-value="onDelayChange" />
        </div>

        <!-- Upload document (facture papier scannee) -->
        <div class="text-caption text-grey-7 q-mt-sm">Document de la facture (optionnel)</div>
        <div
          class="upload-zone row items-center justify-center q-pa-md rounded-borders cursor-pointer"
          :class="{ 'upload-zone--active': uploadDragOver, 'upload-zone--done': !!form.scan_url }"
          @dragover.prevent="uploadDragOver = true"
          @dragleave="uploadDragOver = false"
          @drop.prevent="onFileDrop"
          @click="docFileInput?.click()"
        >
          <template v-if="uploading">
            <q-spinner-oval color="primary" size="28px" class="q-mr-sm" />
            <span class="text-body2 text-grey-7">Upload en cours...</span>
          </template>
          <template v-else-if="form.scan_url">
            <q-icon name="check_circle" color="positive" size="28px" class="q-mr-sm" />
            <div>
              <div class="text-body2 text-positive">Fichier enregistre</div>
              <div class="text-caption text-grey-6">{{ uploadFileName }}</div>
            </div>
            <q-space />
            <q-btn flat round dense icon="close" color="grey" size="sm"
              @click.stop="form.scan_url = null; uploadFileName = ''"
              title="Supprimer" />
            <q-btn flat round dense icon="open_in_new" color="primary" size="sm"
              @click.stop="window.open(form.scan_url, '_blank')"
              title="Voir le document" />
          </template>
          <template v-else>
            <q-icon name="upload_file" size="36px" color="grey-4" class="q-mr-sm" />
            <div>
              <div class="text-body2 text-grey-6">Glissez ou cliquez pour joindre la facture</div>
              <div class="text-caption text-grey-5">PDF, JPG, PNG — max 15 Mo</div>
            </div>
          </template>
        </div>
        <input ref="docFileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff,image/*" class="hidden" @change="onFilePickedUpload" />
      </q-card-section>

      <!-- ETAPE 3 : Montants -->
      <q-card-section v-show="step === 3" class="q-gutter-md">
        <div class="text-subtitle2 text-grey-7 q-mb-sm">Montants et taxes</div>
        <div class="row q-gutter-sm">
          <q-input v-model.number="form.total_ht" label="Total HT *" type="number" outlined dense class="col"
            :rules="[v => v >= 0 || 'Requis']" @update:model-value="autoCalcTva" />
          <q-input v-model.number="form.total_tva" label="TVA (18%)" type="number" outlined dense class="col"
            @update:model-value="autoCalcTtc" />
        </div>
        <div class="row q-gutter-sm">
          <q-input v-model.number="form.total_psvb" label="PSVB" type="number" outlined dense class="col"
            hint="Prelevement special vehicules/biens" @update:model-value="autoCalcTtc" />
          <q-input v-model.number="form.stamp_duty" label="Droit de timbre" type="number" outlined dense class="col"
            @update:model-value="autoCalcTtc" />
        </div>
        <q-separator class="q-my-sm" />
        <div class="row q-gutter-sm items-center">
          <q-input v-model.number="form.total_ttc" label="Total TTC *" type="number" outlined dense class="col"
            :rules="[v => v > 0 || 'Montant > 0']"
            bg-color="blue-1" />
          <div class="col-auto text-caption text-grey-6">
            <q-btn flat dense size="sm" icon="calculate" label="Recalculer" @click="recalcAll" />
          </div>
        </div>
        <q-banner v-if="montantInconsistant" dense rounded class="bg-orange-1 text-orange-9 text-caption">
          <template #avatar><q-icon name="warning" /></template>
          HT + TVA + PSVB + Timbre = {{ fmtN(form.total_ht + form.total_tva + form.total_psvb + form.stamp_duty) }}
          ne correspond pas au TTC {{ fmtN(form.total_ttc) }} — verifier les montants
        </q-banner>
      </q-card-section>

      <!-- ETAPE 4 : Recap + Visualisateur -->
      <div v-show="step === 4" class="row" style="min-height:540px;overflow:hidden">

        <!-- ── Gauche : Recap editable ── -->
        <div class="col q-pa-md" style="overflow-y:auto;max-height:600px;border-right:1px solid #e0e0e0">

          <!-- Section Fournisseur -->
          <div class="recap-section">
            <div class="recap-title"><q-icon name="business" class="q-mr-xs" />Fournisseur</div>
            <div class="row q-gutter-sm">
              <q-select v-model="form.supplier_id" :options="supplierOptions" label="Fournisseur *"
                emit-value map-options outlined dense class="col" use-input input-debounce="0"
                @filter="filterSuppliers">
                <template #no-option><q-item><q-item-section class="text-grey">Aucun</q-item-section></q-item></template>
              </q-select>
              <q-input v-model="form.supplier_invoice_number" label="N° facture fourn." outlined dense class="col-4" />
            </div>
            <div class="row q-gutter-sm q-mt-xs">
              <q-input v-model="form.received_at" label="Date reception" type="datetime-local" outlined dense class="col" />
            </div>
          </div>

          <q-separator class="q-my-sm" />

          <!-- Section Identification -->
          <div class="recap-section">
            <div class="recap-title"><q-icon name="receipt" class="q-mr-xs" />Identification</div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.reference" label="Reference" outlined dense class="col" />
              <q-select v-model="form.type" :options="typeOptions" emit-value map-options
                label="Type" outlined dense class="col-4" />
              <q-select v-model="form.price_mode" :options="['TTC','HT']" label="Mode" outlined dense class="col-3" />
            </div>
            <div class="row q-gutter-sm q-mt-xs">
              <q-input v-model="form.due_date" label="Echeance" type="date" outlined dense class="col"
                @update:model-value="onDueDateChange" />
              <q-input v-model.number="form.payment_terms_days" label="Delai (j)" type="number" outlined dense class="col-3"
                @update:model-value="onDelayChange" />
            </div>
          </div>

          <q-separator class="q-my-sm" />

          <!-- Section Montants -->
          <div class="recap-section">
            <div class="recap-title"><q-icon name="payments" class="q-mr-xs" />Montants (XOF)</div>
            <div class="row q-gutter-xs">
              <q-input v-model.number="form.total_ht" label="HT" type="number" outlined dense class="col" />
              <q-input v-model.number="form.total_tva" label="TVA" type="number" outlined dense class="col" />
              <q-input v-model.number="form.total_psvb" label="PSVB" type="number" outlined dense class="col" />
              <q-input v-model.number="form.stamp_duty" label="Timbre" type="number" outlined dense class="col" />
            </div>
            <q-input v-model.number="form.total_ttc" label="Total TTC" type="number" outlined dense class="col q-mt-xs"
              :bg-color="montantInconsistant ? 'orange-1' : 'green-1'">
              <template #append>
                <q-icon v-if="montantInconsistant" name="warning" color="orange" size="xs" />
                <q-icon v-else name="check_circle" color="positive" size="xs" />
              </template>
            </q-input>
          </div>

          <q-separator class="q-my-sm" />

          <!-- Section Conformite -->
          <div class="recap-section">
            <div class="recap-title"><q-icon name="verified" class="q-mr-xs" />Conformite fiscale</div>
            <div class="row q-gutter-sm items-center">
              <q-select v-model="form.fiscal_compliance_status"
                :options="complianceOptions" emit-value map-options
                label="Statut" outlined dense class="col" />
              <div class="col-auto column items-center">
                <q-toggle v-model="form.ifu_verified" label="IFU verifie" color="positive" dense />
                <q-btn v-if="supplierIfu"
                  unelevated no-caps color="indigo-7" icon="verified_user" icon-right="open_in_new"
                  label="Vérifier sur DGI.bf"
                  :loading="ifuLoading"
                  @click="verifierIfuDgi"
                  class="q-mt-sm"
                  style="font-size:0.78rem;padding:6px 14px;border-radius:8px;font-weight:600;letter-spacing:0.3px"
                >
                  <template #loading>
                    <q-spinner-dots size="18px" />
                    &nbsp;Vérification...
                  </template>
                </q-btn>
              </div>
            </div>
            <!-- Resultat IFU — accordeon replie par defaut -->
            <template v-if="ifuResult">
              <!-- Bandeau statut -->
              <div class="row items-center q-mt-xs q-gutter-xs">
                <q-icon
                  :name="ifuResult.etat === 'ACTIF' ? 'verified_user' : ifuResult.etat === 'DESACTIVE' ? 'block' : 'help_outline'"
                  :color="ifuResult.etat === 'ACTIF' ? 'positive' : ifuResult.etat === 'DESACTIVE' ? 'orange' : 'grey'"
                  size="20px" />
                <span class="text-caption text-weight-bold">{{ ifuResult.nom || supplierIfu }}</span>
                <q-badge
                  :color="ifuResult.etat === 'ACTIF' ? 'positive' : ifuResult.etat === 'DESACTIVE' ? 'orange-8' : 'grey'"
                  :label="ifuResult.etat" />
              </div>
              <!-- Accordeon — replie par defaut -->
              <q-expansion-item
                v-if="ifuResult.champs && ifuResult.champs.length"
                dense dense-toggle
                icon="table_rows"
                label="Détails DGI complets"
                :header-class="ifuResult.etat === 'ACTIF' ? 'text-positive' : 'text-orange-8'"
                class="q-mt-xs rounded-borders"
                style="border:1px solid #e0e0e0;border-radius:6px"
              >
                <q-list dense separator>
                  <q-item v-for="champ in ifuResult.champs" :key="champ.label" dense class="q-pa-xs">
                    <q-item-section class="text-caption text-grey-7" style="min-width:140px;max-width:140px">
                      {{ champ.label }}
                    </q-item-section>
                    <q-item-section class="text-caption" :class="champ.actif ? 'text-dark' : 'text-orange-8'">
                      <span v-if="champ.actif">{{ champ.valeur }}</span>
                      <span v-else class="text-italic">—</span>
                    </q-item-section>
                  </q-item>
                </q-list>
              </q-expansion-item>
            </template>

            <q-input v-model="form.fiscal_compliance_notes" label="Notes fiscales" outlined dense
              type="textarea" rows="2" class="q-mt-xs" hint="Sticker DGI, anomalies..." />
            <q-input v-model="form.description" label="Description" outlined dense type="textarea" rows="2" class="q-mt-xs" />
          </div>

          <q-separator class="q-my-sm" />

          <!-- Notes complementaires -->
          <div class="recap-section">
            <div class="recap-title"><q-icon name="notes" class="q-mr-xs" />Notes complementaires</div>
            <div v-for="(c, i) in form.comments" :key="i" class="row q-gutter-sm items-center q-mb-xs">
              <q-input v-model="c.label" label="Rubrique" outlined dense class="col-3" />
              <q-input v-model="c.content" label="Contenu" outlined dense class="col" />
              <q-btn flat round dense icon="delete" color="negative" size="xs" @click="removeComment(i)" />
            </div>
            <q-btn flat no-caps size="sm" icon="add" label="Ajouter une note" color="primary"
              @click="form.comments.push({ label: '', content: '' })" />
          </div>

        </div>

        <!-- ── Droite : Visualisateur de document ── -->
        <div class="col-5 column" style="min-height:540px;background:#f5f5f5">
          <!-- En-tete viewer -->
          <div class="row items-center q-px-md q-py-sm bg-grey-2" style="border-bottom:1px solid #e0e0e0">
            <q-icon name="picture_as_pdf" color="negative" class="q-mr-sm" />
            <span class="text-caption text-weight-bold">Document joint</span>
            <q-space />
            <q-btn v-if="form.scan_url" flat round dense icon="open_in_new" size="xs"
              color="primary" :href="form.scan_url" target="_blank" title="Ouvrir dans un nouvel onglet" />
            <q-btn v-if="form.scan_url" flat round dense icon="link_off" size="xs"
              color="negative" title="Retirer le document" @click="form.scan_url = null; uploadFileName = ''" />
          </div>

          <!-- Viewer PDF -->
          <div v-if="scanBlobUrl && scanIsPdf" class="col">
            <iframe :src="scanBlobUrl" style="width:100%;height:100%;min-height:480px;border:none" />
          </div>

          <!-- Viewer Image -->
          <div v-else-if="scanBlobUrl && scanIsImage"
            class="col column items-center justify-center q-pa-sm">
            <img :src="scanBlobUrl" style="max-width:100%;max-height:480px;object-fit:contain;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,.15)" />
          </div>

          <!-- Aucun document / apercu non disponible -->
          <div v-else-if="form.scan_url" class="col column items-center justify-center q-gutter-sm">
            <q-icon name="check_circle" size="56px" color="positive" />
            <div class="text-caption text-grey-6">Document enregistre</div>
            <div class="text-caption text-grey-5">{{ uploadFileName }}</div>
          </div>

          <!-- Aucun document -->
          <div v-else class="col column items-center justify-center q-gutter-xs text-grey-5">
            <q-icon name="picture_as_pdf" size="64px" />
            <div class="text-body2">Aucun document joint</div>
            <div class="text-caption">Joignez la facture a l'etape 2</div>
            <q-btn outline size="sm" color="primary" icon="arrow_back" label="Retourner a l'etape 2"
              class="q-mt-sm" @click="step = 2" />
          </div>

        </div>
      </div>

      <!-- Actions -->
      <q-separator />
      <q-card-actions class="q-px-md q-py-sm">
        <q-btn flat no-caps label="Annuler" @click="$emit('update:modelValue', false)" />
        <q-space />
        <q-btn v-if="step > 1" flat no-caps icon="arrow_back" label="Precedent" @click="step--" />
        <q-btn v-if="step < 4" color="primary" no-caps icon-right="arrow_forward" label="Suivant"
          :disable="!stepValid" @click="nextStep" />
        <q-btn v-if="step === 4" color="positive" no-caps icon="save" label="Enregistrer"
          :loading="loading" @click="submit" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Mini-dialog nouveau fournisseur -->
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
          <q-input v-model="newSup.phone" label="Telephone" outlined dense class="col" />
          <q-input v-model="newSup.email" label="Email" outlined dense class="col" type="email" />
        </div>
        <q-input v-model="newSup.address" label="Adresse" outlined dense type="textarea" rows="2" />
        <div class="row q-gutter-sm">
          <q-input v-model="newSup.bank_name" label="Banque" outlined dense class="col" />
          <q-input v-model="newSup.bank_iban" label="IBAN / N° compte" outlined dense class="col" />
          <q-input v-model="newSup.bank_bic" label="BIC/SWIFT" outlined dense class="col-3" />
        </div>
        <q-input v-model="newSup.notes" label="Notes internes" outlined dense type="textarea" rows="2" />
      </q-card-section>
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Annuler" v-close-popup />
        <q-btn color="primary" no-caps label="Creer" :loading="creatingSupplier" @click="createSupplier" />
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
import { useReceivedInvoices, type ReceivedInvoice } from 'src/composables/useReceivedInvoices';
import type { FiscalComplianceStatus } from 'src/types';

const BUCKET = 'invoices-scans';
const window = globalThis as unknown as Window & typeof globalThis;

const props = defineProps<{
  modelValue: boolean;
  invoice?: ReceivedInvoice | null;
}>();
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'saved', inv: ReceivedInvoice): void;
}>();

const $q            = useQuasar();
const companyStore  = useCompanyStore();
const { suppliers, loadSuppliers } = useSuppliers();
const { createInvoice, updateInvoice, loading } = useReceivedInvoices();

// ── Wizard ──────────────────────────────────────────────────────────────────
const step = ref(1);
const stepLabels = [
  { label: 'Fournisseur', icon: 'business' },
  { label: 'Identification', icon: 'receipt' },
  { label: 'Montants', icon: 'payments' },
  { label: 'Conformite', icon: 'verified' },
];

// ── Formulaire ───────────────────────────────────────────────────────────────
const emptyForm = () => ({
  supplier_id:             null as string | null,
  supplier_invoice_number: null as string | null,
  received_at:             dayjs().format('YYYY-MM-DDTHH:mm'),
  reference:               '',
  type:                    'FT',   // Facture d'acompte (defaut factures recues)
  price_mode:              'TTC',
  due_date:                null as string | null,
  payment_terms_days:      30,
  scan_url:                null as string | null,
  ocr_source_url:          null as string | null,
  total_ht:                0,
  total_tva:               0,
  total_psvb:              0,
  stamp_duty:              0,
  total_ttc:               0,
  fiscal_compliance_status: 'pending' as FiscalComplianceStatus,
  fiscal_compliance_notes: null as string | null,
  ifu_verified:            false,
  description:             null as string | null,
  comments:                [] as { label: string; content: string }[],
  status:                  'draft',
});
const form = ref(emptyForm());

watch(() => props.modelValue, (open) => {
  if (open) {
    step.value = 1;
    if (props.invoice) {
      const inv = props.invoice;

      // ══ DEBUG DATES ════════════════════════════════════════════════════════
      console.group('[WIMRUX] Édition facture — DEBUG DATES');
      console.log('ref                  :', inv.reference);
      console.log('received_at (RAW BD) :', inv.received_at);
      console.log('due_date    (RAW BD) :', inv.due_date);
      console.log('payment_terms_days BD:', inv.payment_terms_days);
      // ═══════════════════════════════════════════════════════════════════════

      // Calcul du délai — priorité à la valeur BD, sinon diff des dates
      const receivedStr  = inv.received_at ? dayjs(inv.received_at).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD');
      const dueStr       = inv.due_date    ? dayjs(inv.due_date).format('YYYY-MM-DD')    : null;

      // Utiliser payment_terms_days de la BD s'il existe et est raisonnable,
      // sinon recalculer via le diff (mais plafonner à 365 jours max)
      let computedDays: number;
      if (inv.payment_terms_days != null && inv.payment_terms_days >= 0 && inv.payment_terms_days <= 365) {
        computedDays = inv.payment_terms_days;
      } else if (dueStr) {
        const diff = dayjs(dueStr).diff(dayjs(receivedStr), 'day');
        computedDays = Math.max(0, Math.min(diff, 365));
      } else {
        computedDays = 30; // défaut raisonnable
      }

      // ══ DEBUG DATES (suite) ════════════════════════════════════════════════
      console.log('receivedStr (dayjs)  :', receivedStr);
      console.log('dueStr      (dayjs)  :', dueStr);
      console.log('payment_terms_days BD:', inv.payment_terms_days);
      console.log('computedDays (final) :', computedDays);
      console.groupEnd();
      // ═══════════════════════════════════════════════════════════════════════

      form.value = {
        supplier_id:              inv.supplier_id,
        supplier_invoice_number:  inv.supplier_invoice_number,
        received_at:              receivedStr + 'T00:00',
        reference:                inv.reference ?? '',
        type:                     inv.type ?? 'FT',
        price_mode:               inv.price_mode ?? 'TTC',
        due_date:                 dueStr,
        payment_terms_days:       computedDays,
        scan_url:                 inv.scan_url,
        ocr_source_url:           inv.ocr_source_url,
        total_ht:                 Number(inv.total_ht)    || 0,
        total_tva:                Number(inv.total_tva)   || 0,
        total_psvb:               Number(inv.total_psvb)  || 0,
        stamp_duty:               Number(inv.stamp_duty)  || 0,
        total_ttc:                Number(inv.total_ttc)   || 0,
        fiscal_compliance_status: inv.fiscal_compliance_status ?? 'pending',
        fiscal_compliance_notes:  inv.fiscal_compliance_notes,
        ifu_verified:             inv.ifu_verified ?? false,
        description:              inv.description,
        comments:                 inv.comments ?? [],
        status:                   inv.status ?? 'draft',
      };
    } else {
      form.value = emptyForm();
    }
    void loadSuppliers();
  }
});

// ── Fournisseurs ─────────────────────────────────────────────────────────────
const supplierSearch = ref('');
const supplierOptions = computed(() => {
  const list = suppliers.value
    .filter(s => s.is_active !== false)
    .filter(s => !supplierSearch.value || s.name.toLowerCase().includes(supplierSearch.value.toLowerCase()));
  return list.map(s => ({ label: `${s.name}${s.ifu ? ' · ' + s.ifu : ''}`, value: s.id }));
});
const selectedSupplier = computed(() =>
  suppliers.value.find(s => s.id === form.value.supplier_id) ?? null
);
function filterSuppliers(val: string, update: (fn: () => void) => void) {
  update(() => { supplierSearch.value = val; });
}
// ── Upload document facture ───────────────────────────────────────────────────
// Le SDK upload() DOIT etre utilise. L'erreur "uploaded_via" est TROMPEUSE (cf. SKILL.md)
// et survient en realite quand l'upload S3 echoue (ex: fichier vide).
// Le fichier etait vide car l'input HTML etait reinitialise de maniere synchrone
// AVANT que l'upload asynchrone n'ait le temps de lire le Blob, ce qui detruisait le fichier.
const uploading      = ref(false);
const uploadDragOver = ref(false);
const uploadFileName = ref('');
const scanBlobUrl    = ref('');
const docFileInput   = ref<HTMLInputElement | null>(null);

async function uploadFile(file: File) {
  if (file.size > 15 * 1024 * 1024) {
    $q.notify({ type: 'warning', message: 'Fichier trop grand (max 15 Mo)' }); return;
  }
  uploading.value = true;
  try {
    // Cle sanitisee (upload officiel InsForge SDK)
    const safeName = file.name
      .normalize('NFKD').replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_');
    const key = `${Date.now()}-${safeName}`;

    // Blob URL pour le viewer immediat
    if (scanBlobUrl.value) URL.revokeObjectURL(scanBlobUrl.value);
    scanBlobUrl.value = URL.createObjectURL(file);

    // Upload officiel InsForge
    const { data, error } = await insforge.storage
      .from(BUCKET)
      .upload(key, file);

    if (error) throw new Error(error.message);

    form.value.scan_url  = (data as { url: string }).url;
    uploadFileName.value = file.name;
    $q.notify({ type: 'positive', message: 'Document joint avec succes', icon: 'check_circle' });
  } catch (e: unknown) {
    if (scanBlobUrl.value) { URL.revokeObjectURL(scanBlobUrl.value); scanBlobUrl.value = ''; }
    $q.notify({ type: 'negative', message: `Erreur: ${e instanceof Error ? e.message : 'inconnue'}` });
  } finally {
    uploading.value = false;
  }
}

async function onFilePickedUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    await uploadFile(file); // ATTENDRE la fin de l'upload AVANT de reset !
  }
  if (docFileInput.value) docFileInput.value.value = '';
}
async function onFileDrop(e: DragEvent) {
  uploadDragOver.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file) {
    await uploadFile(file);
  }
}
const showNewSupplier  = ref(false);
const creatingSupplier = ref(false);
const newSup = ref({ name: '', ifu: '', rccm: '', phone: '', email: '', address: '', bank_name: '', bank_iban: '', bank_bic: '', notes: '' });

async function createSupplier() {
  if (!newSup.value.name) return;
  creatingSupplier.value = true;
  try {
    const { data, error } = await insforge.database.from('suppliers').insert([{
      company_id: companyStore.company!.id,
      name: newSup.value.name,
      ifu: newSup.value.ifu || null,
      rccm: newSup.value.rccm || null,
      phone: newSup.value.phone || null,
      email: newSup.value.email || null,
      address: newSup.value.address || null,
      bank_name: newSup.value.bank_name || null,
      bank_iban: newSup.value.bank_iban || null,
      bank_bic: newSup.value.bank_bic || null,
      notes: newSup.value.notes || null,
      is_active: true, country: 'BF',
    }]).select('id, name').single();
    if (error) { $q.notify({ type: 'negative', message: error.message }); return; }
    await loadSuppliers();
    form.value.supplier_id = (data as { id: string }).id;
    showNewSupplier.value = false;
    newSup.value = { name: '', ifu: '', rccm: '', phone: '', email: '', address: '', bank_name: '', bank_iban: '', bank_bic: '', notes: '' };
    $q.notify({ type: 'positive', message: 'Fournisseur cree' });
  } finally { creatingSupplier.value = false; }
}

// ── Calculs montants ─────────────────────────────────────────────────────────
function autoCalcTva() {
  form.value.total_tva = Math.round(form.value.total_ht * 0.18 * 100) / 100;
  autoCalcTtc();
}
function autoCalcTtc() {
  form.value.total_ttc = form.value.total_ht + form.value.total_tva + form.value.total_psvb + form.value.stamp_duty;
}
function recalcAll() {
  if (form.value.total_ttc > 0 && form.value.total_ht === 0) {
    form.value.total_ht  = Math.round(form.value.total_ttc / 1.18 * 100) / 100;
    form.value.total_tva = Math.round(form.value.total_ht * 0.18 * 100) / 100;
  } else { autoCalcTtc(); }
}
const montantInconsistant = computed(() => {
  if (!form.value.total_ttc) return false;
  const calc = form.value.total_ht + form.value.total_tva + form.value.total_psvb + form.value.stamp_duty;
  return Math.abs(calc - form.value.total_ttc) > 1;
});
function fmtN(n: number) { return Number(n).toLocaleString('fr-FR'); }

// ── Calcul automatique échéance (dayjs) ───────────────────────────────────────
function onDelayChange() {
  let days = Number(form.value.payment_terms_days);
  if (isNaN(days) || days < 0) days = 0;
  if (days > 365) { form.value.payment_terms_days = 365; days = 365; }
  if (days === 0) return;
  const base = form.value.received_at
    ? dayjs(form.value.received_at.slice(0, 10))
    : dayjs();
  form.value.due_date = base.add(days, 'day').format('YYYY-MM-DD');
}
function onDueDateChange() {
  if (!form.value.due_date || !form.value.received_at) return;
  const dueD = dayjs(form.value.due_date);
  const recD = dayjs(form.value.received_at.slice(0, 10));
  if (!dueD.isValid() || !recD.isValid()) return;
  const diff = dueD.diff(recD, 'day');
  // Plafonner le délai à une valeur raisonnable (0-365 jours)
  form.value.payment_terms_days = Math.max(0, Math.min(diff, 365));
}

// ── Validation etape ─────────────────────────────────────────────────────────
const stepValid = computed(() => {
  if (step.value === 1) return !!form.value.supplier_id && !!form.value.received_at;
  if (step.value === 2) return true;
  if (step.value === 3) return form.value.total_ttc > 0;
  return true;
});
function nextStep() {
  if (!stepValid.value) { $q.notify({ type: 'warning', message: 'Remplir les champs obligatoires (*)' }); return; }
  if (step.value === 2 && !form.value.reference) {
    form.value.reference = `FR-${Date.now().toString(36).toUpperCase()}`;
  }
  step.value++;
}

// ── Notes ────────────────────────────────────────────────────────────────────
function removeComment(i: number) { form.value.comments.splice(i, 1); }

// ── Soumission ────────────────────────────────────────────────────────────────
async function submit() {
  // B-01 Guard: s'assurer que les montants ne sont jamais envoyés à 0 si non intentionnel
  const payload = { ...form.value };

  // Forcer la conversion numérique explicite (protection v-model.number NaN)
  payload.total_ht    = Number(payload.total_ht)    || 0;
  payload.total_tva   = Number(payload.total_tva)   || 0;
  payload.total_psvb  = Number(payload.total_psvb)  || 0;
  payload.stamp_duty  = Number(payload.stamp_duty)  || 0;
  payload.total_ttc   = Number(payload.total_ttc)   || 0;

  // Si en mode ÉDITION, restaurer les montants de la BD si l'utilisateur les a mis à 0 accidentellement
  if (props.invoice && payload.total_ttc === 0 && Number(props.invoice.total_ttc) > 0) {
    payload.total_ht   = Number(props.invoice.total_ht);
    payload.total_tva  = Number(props.invoice.total_tva);
    payload.total_psvb = Number(props.invoice.total_psvb);
    payload.stamp_duty = Number(props.invoice.stamp_duty);
    payload.total_ttc  = Number(props.invoice.total_ttc);
  }

  let result;
  if (props.invoice) {
    result = await updateInvoice(props.invoice.id, payload as Partial<ReceivedInvoice>);
  } else {
    result = await createInvoice(payload as Partial<ReceivedInvoice>);
  }
  if (result) {
    $q.notify({ type: 'positive', message: props.invoice ? 'Facture modifiee' : 'Facture cree avec succes' });
    emit('saved', result as ReceivedInvoice);
    emit('update:modelValue', false);
  } else {
    $q.notify({ type: 'negative', message: 'Erreur — verifier les champs' });
  }
}


// ── Verification IFU DGI.bf ───────────────────────────────────────────────────
interface IfuResult {
  nom:      string;
  etat:     string;
  rccm:     string;
  regime:   string;
  adresse:  string;
  tel:      string;
  email:    string;
  // Tableau complet ordonné pour l'accordéon (depuis le scraper Browserless)
  champs?:  { label: string; valeur: string; actif: boolean }[];
}

const ifuResult   = ref<IfuResult | null>(null);
const ifuLoading  = ref(false);

const supplierIfu = computed(() =>
  suppliers.value.find(s => s.id === form.value.supplier_id)?.ifu ?? null
);

// URL Dify depuis la config InsForge ou env
const DIFY_IFU_WORKFLOW  = import.meta.env.VITE_DIFY_IFU_WORKFLOW_URL  as string | undefined;
const IFU_SCRAPER_URL    = import.meta.env.VITE_IFU_SCRAPER_URL        as string | undefined;

async function verifierIfuDgi() {
  const ifu = supplierIfu.value;
  if (!ifu) return;
  ifuResult.value = null;

  // ── MODE 1 : Scraper Browserless (serveur Node.js + Puppeteer) ────────────
  if (IFU_SCRAPER_URL) {
    ifuLoading.value = true;
    try {
      const res = await fetch(`${IFU_SCRAPER_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ifu }),
      });
      if (res.ok) {
        const json = await res.json() as {
          statut: string;
          resultat?: {
            etat?: string; nom?: string; rccm?: string; regime?: string; adresse?: string;
            champs?: { label: string; valeur: string; actif: boolean }[];
          };
          message?: string;
        };
        if (json.statut === 'ok' && json.resultat) {
          const r = json.resultat;
          ifuResult.value = {
            nom:     r.nom    ?? '',
            etat:    r.etat   ?? 'INCONNU',
            rccm:    r.rccm   ?? '',
            regime:  r.regime ?? '',
            adresse: r.adresse ?? '',
            tel:     '',
            email:   '',
            champs:  r.champs ?? [],
          };
          if (r.etat === 'ACTIF') {
            form.value.ifu_verified = true;
            form.value.fiscal_compliance_status = 'valid';
            $q.notify({ type: 'positive', icon: 'verified_user',
              message: `IFU vérifié ✓ — ${r.nom || ifu}`, timeout: 5000 });
          } else if (r.etat === 'INVALIDE') {
            $q.notify({ type: 'warning', icon: 'warning',
              message: `IFU introuvable dans la base DGI`, timeout: 5000 });
          } else {
            $q.notify({ type: 'info', icon: 'help_outline',
              message: `IFU : résultat ambigu — vérification manuelle recommandée`, timeout: 5000 });
          }
        } else {
          $q.notify({ type: 'warning', message: json.message ?? 'Scraper IFU : réponse inattendue' });
        }
      }
    } catch (e) {
      console.warn('[IFU] Scraper error:', e);
      $q.notify({ type: 'warning', message: 'Service IFU indisponible — page DGI ouverte manuellement' });
    } finally {
      ifuLoading.value = false;
    }
    // Pas d'ouverture d'onglet si le scraper a répondu
    if (ifuResult.value) return;
  }

  // ── MODE 2 : Workflow Dify (fallback si pas de scraper) ───────────────────
  if (DIFY_IFU_WORKFLOW) {
    ifuLoading.value = true;
    try {
      const res = await fetch(DIFY_IFU_WORKFLOW, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: { ifu }, response_mode: 'blocking', user: 'wimrux' }),
      });
      if (res.ok) {
        const json = await res.json() as { data?: { outputs?: { nom?: string; etat?: string; rccm?: string; regime?: string; adresse?: string; tel?: string; email?: string } } };
        const out = json.data?.outputs;
        if (out) {
          ifuResult.value = {
            nom:     out.nom    ?? '',
            etat:    out.etat   ?? 'INCONNU',
            rccm:    out.rccm   ?? '',
            regime:  out.regime ?? '',
            adresse: out.adresse ?? '',
            tel:     out.tel    ?? '',
            email:   out.email  ?? '',
          };
          if (out.etat === 'ACTIVE') {
            form.value.ifu_verified = true;
            form.value.fiscal_compliance_status = 'valid';
          }
        }
      }
    } catch (e) {
      console.warn('[IFU] Dify workflow error:', e);
    } finally {
      ifuLoading.value = false;
    }
    if (ifuResult.value) return;
  }

  // ── MODE 3 : Ouverture manuelle dans un onglet (dernier recours) ──────────
  globalThis.open(`https://dgi.bf/verification/verification-ifu?ifu=${encodeURIComponent(ifu)}`, '_blank');
}

// ── Options ───────────────────────────────────────────────────────────────────
const complianceOptions = [
  { label: 'En attente', value: 'pending' },
  { label: 'Valide',     value: 'valid' },
  { label: 'Non valide', value: 'invalid' },
  { label: 'Non verifie', value: 'unchecked' },
];

// Types officiels DGI Burkina Faso (CHECK constraint BD)
const typeOptions = [
  { label: 'FV — Facture de vente',         value: 'FV' },
  { label: 'FT — Facture d’acompte',        value: 'FT' },
  { label: 'FA — Facture d’avoir',          value: 'FA' },
  { label: 'EV — Export vente',             value: 'EV' },
  { label: 'ET — Export acompte',           value: 'ET' },
  { label: 'EA — Export avoir',             value: 'EA' },
  { label: 'PF — Proforma',                value: 'PF' },
];

// ── Viewer document (etape 4) ─────────────────────────────────────────────────
// scanBlobUrl est cree depuis le stableFile lors de l'upload
const scanIsPdf = computed(() => {
  if (uploadFileName.value) {
    return /\.pdf$/i.test(uploadFileName.value);
  }
  return /\.pdf(\?|$)/i.test(form.value.scan_url ?? '');
});
const scanIsImage = computed(() => {
  if (uploadFileName.value) {
    return /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(uploadFileName.value);
  }
  return /\.(jpg|jpeg|png|gif|webp|bmp)(\?|$)/i.test(form.value.scan_url ?? '');
});
</script>

<style scoped>
.upload-zone {
  border: 2px dashed #ccc;
  min-height: 80px;
  transition: border-color 0.2s, background 0.2s;
  background: #fafafa;
}
.upload-zone:hover,
.upload-zone--active {
  border-color: var(--q-primary);
  background: rgba(25, 118, 210, 0.04);
}
.upload-zone--done {
  border-color: var(--q-positive);
  background: rgba(39, 174, 96, 0.04);
  border-style: solid;
}
.hidden { display: none; }

/* ── Etape 4 : Recap layout ───────────────────────────────── */
.recap-section {
  margin-bottom: 4px;
}
.recap-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #546e7a;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
}
</style>
