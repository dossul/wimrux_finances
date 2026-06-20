<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="$emit('update:modelValue', $event)">
    <q-card :style="step === 4 ? 'width:92vw;max-width:1380px;min-width:900px' : 'min-width:660px;max-width:760px'">

      <!-- Header -->
      <q-card-section class="row items-center q-pb-none bg-primary text-white">
        <q-icon name="receipt_long" size="24px" class="q-mr-sm" />
        <div class="text-h6">{{ invoice ? (isReadOnly ? 'Détail facture' : 'Modifier la facture') : 'Nouvelle facture recue' }}</div>
        <q-space />
        <q-badge v-if="isReadOnly" color="orange-8" label="Lecture seule" class="q-mr-md" />
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
          data-testid="wizard-supplier-select"
        >
          <template #no-option><q-item><q-item-section class="text-grey">Aucun fournisseur</q-item-section></q-item></template>
          <template #append>
            <q-btn flat round dense icon="person_add" color="primary" title="Creer fournisseur" @click="showNewSupplier = true" data-testid="wizard-new-supplier-btn" />
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
              <q-badge v-if="selectedSupplier.tax_regime" :color="regimeColor(selectedSupplier.tax_regime)" :label="selectedSupplier.tax_regime" />
            </div>
            <div v-if="selectedSupplier.address" class="text-caption q-mt-xs">
              <q-icon name="location_on" /> {{ selectedSupplier.address }}
            </div>
          </q-card-section>
        </q-card>
        <!-- Blocage TVA si régime sans TVA -->
        <q-banner v-if="tvaBlocked" dense rounded class="bg-orange-1 text-orange-9 text-caption q-mt-sm">
          <template #avatar><q-icon name="info" color="orange" /></template>
          Fournisseur en régime {{ selectedSupplier?.tax_regime }} — <strong>TVA non applicable</strong> sur cette facture.
        </q-banner>

        <q-input v-model="form.supplier_invoice_number" label="N° facture fournisseur" outlined dense
          hint="Tel qu'il apparait sur la facture originale" data-testid="wizard-supplier-invoice-number" />
        <div class="row q-gutter-sm">
          <q-input v-model="form.received_at" label="Date reception *" type="datetime-local" outlined dense
            :rules="[v => !!v || 'Requis']" class="col" data-testid="wizard-received-at" />
          <q-select v-model="form.type" :options="typeOptions" emit-value map-options
            label="Type *" outlined dense class="col-4"
            :rules="[v => !!v || 'Requis']" data-testid="wizard-type" />
        </div>
      </q-card-section>

      <!-- ETAPE 2 : Identification -->
      <q-card-section v-show="step === 2" class="q-gutter-md">
        <div class="text-subtitle2 text-grey-7 q-mb-sm">Details de la facture</div>
        <div class="row q-gutter-sm">
          <q-input v-model="form.reference" label="Reference interne *" outlined dense class="col"
            :rules="[v => !!v || 'Requis']" hint="Generee auto si vide" data-testid="wizard-reference" />
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
            :rules="[v => v >= 0 || 'Requis']" @update:model-value="autoCalcTva" data-testid="wizard-total-ht" />
          <q-input v-model.number="form.total_tva" label="TVA (18%)" type="number" outlined dense class="col"
            :disable="tvaBlocked" :hint="tvaBlocked ? 'TVA bloquée (régime ' + selectedSupplier?.tax_regime + ')' : ''"
            @update:model-value="autoCalcTtc" data-testid="wizard-total-tva" />
        </div>
        <div class="row q-gutter-sm">
          <q-input v-model.number="form.total_psvb" label="PSVB" type="number" outlined dense class="col"
            hint="Prelevement special vehicules/biens" @update:model-value="autoCalcTtc" data-testid="wizard-total-psvb" />
          <q-input v-model.number="form.stamp_duty" label="Droit de timbre" type="number" outlined dense class="col"
            @update:model-value="autoCalcTtc" data-testid="wizard-stamp-duty" />
        </div>
        <!-- Retenue à la source -->
        <q-separator class="q-my-xs" />
        <div class="text-caption text-grey-7 q-mb-xs">Retenue à la source (RAS)</div>
        <div class="row q-gutter-sm items-center">
          <q-select v-model="form.withholding_tax_rate" :options="rasRates" emit-value map-options
            label="Taux RAS" outlined dense class="col-4" clearable
            @update:model-value="autoCalcRas" />
          <q-input v-model.number="form.withholding_tax_amount" label="Montant RAS (XOF)" type="number"
            outlined dense class="col" :disable="!!form.withholding_tax_rate"
            hint="Calculé automatiquement si taux sélectionné" />
        </div>
        <q-separator class="q-my-sm" />
        <div class="row q-gutter-sm items-center">
          <q-input v-model.number="form.total_ttc" label="Total TTC *" type="number" outlined dense class="col"
            :rules="[v => v > 0 || 'Montant > 0']"
            bg-color="blue-1" data-testid="wizard-total-ttc" />
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
              <q-input v-model="form.reference" label="BC / Réf. Interne" outlined dense class="col" />
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
        <q-btn v-if="step > 1" flat no-caps icon="arrow_back" label="Precedent" @click="step--" data-testid="wizard-prev-btn" />
        <q-btn v-if="step < 4" color="primary" no-caps icon-right="arrow_forward" label="Suivant"
          :disable="!stepValid" @click="nextStep" data-testid="wizard-next-btn" />
        <q-btn v-if="step === 4 && !isReadOnly" color="positive" no-caps icon="save" label="Enregistrer"
          :loading="loading" @click="submit" data-testid="wizard-save-btn" />
      </q-card-actions>
    </q-card>
  </q-dialog>

  <!-- Mini-dialog nouveau fournisseur -->
  <q-dialog v-model="showNewSupplier" persistent data-testid="wizard-supplier-dialog">
    <q-card style="min-width:720px;max-width:860px">
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">Nouveau fournisseur</div>
        <q-space /><q-btn flat round dense icon="close" v-close-popup />
      </q-card-section>
      <q-card-section class="q-gutter-sm">
        <q-input v-model="newSup.name" label="Nom *" outlined dense :rules="[v => !!v || 'Requis']" data-testid="wizard-supplier-name" />
        <div class="row q-gutter-sm">
          <q-select v-model="newSup.legal_form" :options="newSupLegalFormOptions" label="Forme juridique" emit-value map-options outlined dense class="col" clearable />
          <q-input v-if="newSup.legal_form === 'AUTRE'" v-model="newSup.legal_form_other" label="Préciser" outlined dense class="col" />
        </div>
        <div class="row q-gutter-sm">
          <q-input v-model="newSup.ifu" label="IFU" outlined dense class="col" data-testid="wizard-supplier-ifu" />
          <q-input v-model="newSup.rccm" label="RCCM" outlined dense class="col" data-testid="wizard-supplier-rccm" />
        </div>
        <div class="row q-gutter-sm">
          <q-file v-model="newSupFileIfu" label="Scan IFU" outlined dense clearable accept=".pdf,.jpg,.jpeg,.png" class="col">
            <template v-slot:append><q-icon v-if="newSup.ifu_scan_file_id" name="check_circle" color="positive" /></template>
          </q-file>
          <q-file v-model="newSupFileRccm" label="Scan RCCM" outlined dense clearable accept=".pdf,.jpg,.jpeg,.png" class="col">
            <template v-slot:append><q-icon v-if="newSup.rccm_scan_file_id" name="check_circle" color="positive" /></template>
          </q-file>
        </div>
        <div class="row q-gutter-sm">
          <q-select v-model="newSup.tax_regime" :options="newSupTaxRegimeOptions" label="Régime fiscal *" emit-value map-options outlined dense class="col" :rules="[v => !!v || 'Requis']" />
          <q-select
            :model-value="newSupTaxDivisionValue(newSup.tax_division)"
            @update:model-value="onNewSupTaxDivisionSelected"
            :options="newSupTaxDivisionOptions"
            label="Division fiscale *" emit-value map-options outlined dense class="col"
            :rules="[v => !!v || 'Requis']"
          />
        </div>
        <q-input v-if="newSup.tax_division?.type === 'DPI'" v-model="newSup.tax_division.province" label="Province" outlined dense :rules="[v => !!v || 'Requis']" />

        <div class="row q-gutter-sm items-center q-mt-xs">
          <q-toggle v-model="newSup.charges_vat" label="Charge la TVA" color="primary" />
          <q-input v-model="vatRateDisplay" type="number" suffix="%" outlined dense style="max-width: 140px" :min="0" :max="100" :step="0.01" :disable="!newSup.charges_vat" :rules="[v => !newSup.charges_vat || (v > 0 && v <= 100) || 'Taux entre 0 et 100%']" data-testid="wizard-supplier-vat-rate-input" />

        </div>

        <div class="text-subtitle2 text-grey-8 q-mt-sm">Adresse physique</div>
        <div class="row q-gutter-sm">
          <q-input v-model="newSup.physical_address.city" label="Ville" outlined dense class="col" />
          <q-input v-model="newSup.physical_address.district" label="Quartier" outlined dense class="col" />
          <q-input v-model="newSup.physical_address.sector" label="Secteur" outlined dense class="col" />
        </div>
        <div class="text-subtitle2 text-grey-8 q-mt-sm">Adresse postale</div>
        <div class="row q-gutter-sm">
          <q-input v-model="newSup.postal_address.post_office" label="Bureau postal" outlined dense class="col" />
          <q-input v-model="newSup.postal_address.po_box" label="Boîte postale" outlined dense class="col" />
          <q-input v-model="newSup.postal_address.postal_code" label="Code postal" outlined dense class="col" />
        </div>

        <PhoneCountryInput
          v-model:country-code="newSup.country"
          v-model:phone="newSup.phone"
          phone-label="Téléphone"
          outlined
          dense
        />
        <div class="row q-gutter-sm">
          <q-input v-model="newSup.email" label="E-mail" outlined dense class="col" type="email" data-testid="wizard-supplier-email" />
          <q-input v-model="newSup.billing_email" label="E-mail de facturation" outlined dense class="col" type="email" />
        </div>

        <div class="text-subtitle2 text-grey-8 q-mt-sm row items-center">
          Contacts
          <q-btn flat round dense icon="add" size="sm" color="primary" class="q-ml-sm" @click="newSup.contacts.push({ role: 'sales', name: '', function: '', phone: '', email: '' })" />
        </div>
        <div v-for="(contact, idx) in newSup.contacts" :key="idx" class="row q-gutter-sm items-start">
          <q-select v-model="contact.role" :options="[{ label: 'Contact vente', value: 'sales' }, { label: 'Contact comptabilité', value: 'accounting' }]" label="Rôle" emit-value map-options outlined dense class="col-3" />
          <q-input v-model="contact.name" label="Nom" outlined dense class="col" />
          <q-input v-model="contact.function" label="Fonction" outlined dense class="col" />
          <q-input v-model="contact.phone" label="Téléphone" outlined dense class="col" />
          <q-input v-model="contact.email" label="E-mail" outlined dense type="email" class="col" />
          <q-btn flat round dense icon="delete" color="negative" size="sm" class="q-mt-sm" @click="newSup.contacts.splice(idx, 1)" />
        </div>

        <div class="text-subtitle2 text-grey-8 q-mt-sm row items-center">
          Comptes bancaires (max. 5)
          <q-btn flat round dense icon="add" size="sm" color="primary" class="q-ml-sm" @click="newSup.bank_accounts.length < 5 && newSup.bank_accounts.push({ bank_name: '', account_number: '', iban: '', bic: '', is_default: false })" />
        </div>
        <div v-for="(account, idx) in newSup.bank_accounts" :key="`bank-${idx}`" class="row q-gutter-sm items-start">
          <q-input v-model="account.bank_name" label="Banque" outlined dense class="col" />
          <q-input v-model="account.account_number" label="N° compte" outlined dense class="col" />
          <q-input v-model="account.iban" label="IBAN / RIB" outlined dense class="col" />
          <q-input v-model="account.bic" label="BIC" outlined dense class="col-2" />
          <q-btn flat round dense icon="delete" color="negative" size="sm" class="q-mt-sm" @click="newSup.bank_accounts.splice(idx, 1)" />
        </div>

        <q-input v-model="newSup.notes" label="Notes internes" outlined dense type="textarea" rows="2" data-testid="wizard-supplier-notes" />
      </q-card-section>
      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Annuler" v-close-popup />
        <q-btn color="primary" no-caps label="Creer" :loading="creatingSupplier" @click="createSupplier" data-testid="wizard-supplier-create-btn" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import dayjs from 'dayjs';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import { useSuppliers } from 'src/composables/useSuppliers';
import { useReceivedInvoices, type ReceivedInvoice } from 'src/composables/useReceivedInvoices';
import type { FiscalComplianceStatus, TaxRegimeBF, TaxDivision, LegalForm, PartnerContact, PartnerBankAccount } from 'src/types';
import { TAX_REGIME_LABELS, TAX_DIVISION_OPTIONS, LEGAL_FORM_LABELS, getCountryByCode } from 'src/types';
import { verifyTaxIdOnline } from 'src/utils/fiscalCompliance';
import { isValidTaxDivision, vatFractionToPercent, vatPercentToFraction } from 'src/utils/validators';
import { appwriteDb } from 'src/services/appwrite-db';
import { appwriteStorage } from 'src/services/appwrite-storage';
import PhoneCountryInput from 'src/components/common/PhoneCountryInput.vue';

const BUCKET = 'invoices-scans';
const window = globalThis as unknown as Window & typeof globalThis;

const props = defineProps<{
  modelValue: boolean;
  invoice?: ReceivedInvoice | null;
  readOnly?: boolean;
}>();
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'saved', inv: ReceivedInvoice): void;
}>();

const $q            = useQuasar();
const companyStore  = useCompanyStore();
const { suppliers, loadSuppliers } = useSuppliers();
const { createInvoice, updateInvoice, loading } = useReceivedInvoices();

const isReadOnly = computed(() => {
  if (props.readOnly) return true;
  const status = props.invoice?.status;
  return !!status && !['draft'].includes(status);
});

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
  withholding_tax_rate:    null as number | null,
  withholding_tax_amount:  0,
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
        withholding_tax_rate:     inv.withholding_tax_rate   ?? null,
        withholding_tax_amount:   Number(inv.withholding_tax_amount) || 0,
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

// ── Régime fiscal & blocage TVA ──────────────────────────────────────────────
  const tvaBlocked = computed(() => {
    const rf = selectedSupplier.value?.tax_regime;
    return rf === 'RSI' || rf === 'CME' || rf === 'CME_DECLARATIF' || rf === 'CSE' || rf === 'RND';
  });
function regimeColor(r: string) {
  const colors: Record<string, string> = {
    RNI: 'blue-7', RSI: 'orange-7', CME: 'grey-6', CSE: 'green-7', RND: 'purple-6'
  };
  return colors[r] ?? 'grey';
}

watch(() => form.value.supplier_id, () => {
  if (tvaBlocked.value) {
    form.value.total_tva = 0;
    autoCalcTtc();
  }
});
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
    // Cle sanitisee (upload officiel Appwrite SDK)
    const safeName = file.name
      .normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_');
    const key = `${Date.now()}-${safeName}`;

    // Blob URL pour le viewer immediat
    if (scanBlobUrl.value) URL.revokeObjectURL(scanBlobUrl.value);
    scanBlobUrl.value = URL.createObjectURL(file);

    // Upload officiel Appwrite
    const { data, error } = await appwriteStorage.upload(BUCKET, file, key);

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
  const newSupFileIfu = ref<File | null>(null);
  const newSupFileRccm = ref<File | null>(null);
  const newSup = ref({
    name: '',
    legal_form: null as LegalForm | null,
    legal_form_other: '',
    physical_address: { city: '', district: '', sector: '' },
    cadastral_address: { parcel: '', lot: '', section: '' },
    postal_address: { post_office: '', po_box: '', postal_code: '' },
    country: 'BF',
    phone: '',
    email: '',
    billing_email: '',
    ifu: '',
    ifu_scan_file_id: null as string | null,
    rccm: '',
    rccm_scan_file_id: null as string | null,
    tax_regime: null as TaxRegimeBF | null,
    tax_division: null as TaxDivision | null,
    contacts: [
      { role: 'sales' as const, name: '', function: '', phone: '', email: '' },
      { role: 'accounting' as const, name: '', function: '', phone: '', email: '' },
    ] as PartnerContact[],
    bank_accounts: [] as PartnerBankAccount[],
    charges_vat: false,
    vat_rate: null as number | null,
    address: '',
    bank_name: '',
    bank_iban: '',
    bank_bic: '',
    notes: '',
  });

  const vatRateDisplay = computed({
    get: () => vatFractionToPercent(newSup.value.vat_rate) ?? 18,
    set: (val: number) => { newSup.value.vat_rate = vatPercentToFraction(val); },
  });

  watch(() => newSup.value.charges_vat, (on) => {
    if (on && !newSup.value.vat_rate) newSup.value.vat_rate = 0.18;
  });

  const newSupLegalFormOptions = Object.entries(LEGAL_FORM_LABELS).map(([value, label]) => ({ label, value }));
  const newSupTaxRegimeOptions = Object.entries(TAX_REGIME_LABELS).map(([value, label]) => ({ label, value: value as TaxRegimeBF }));
  const newSupTaxDivisionOptions = TAX_DIVISION_OPTIONS.map(o => ({
    label: o.label,
    value: `${o.type}:${o.sub || ''}:${o.type === 'DPI' ? '__PROVINCE__' : ''}`,
  }));

  function onNewSupTaxDivisionSelected(value: string) {
    const [type, sub, province] = value.split(':');
    newSup.value.tax_division = { type: type as TaxDivision['type'], sub_division: sub || undefined, province: province || undefined };
  }

  function newSupTaxDivisionValue(division?: TaxDivision | null): string {
    if (!division) return '';
    return `${division.type}:${division.sub_division || ''}:${division.type === 'DPI' ? division.province || '' : ''}`;
  }

  async function uploadNewSupScan(field: 'ifu_scan_file_id' | 'rccm_scan_file_id', file: File) {
    try {
      const safeName = file.name.normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_');
      const key = `suppliers/${Date.now()}-${safeName}`;
      const { data, error } = await appwriteStorage.upload('partner-documents', file, key);
      if (error) throw new Error(error.message);
      newSup.value[field] = ((data as unknown) as { $id: string }).$id;
      $q.notify({ type: 'positive', message: 'Document joint' });
    } catch (e: unknown) {
      $q.notify({ type: 'negative', message: e instanceof Error ? e.message : 'Erreur upload' });
    }
  }

  watch(newSupFileIfu, async (file) => { if (file) await uploadNewSupScan('ifu_scan_file_id', file); });
  watch(newSupFileRccm, async (file) => { if (file) await uploadNewSupScan('rccm_scan_file_id', file); });

  async function createSupplier() {
    if (!newSup.value.name) return;
    if (newSup.value.tax_division && !isValidTaxDivision(newSup.value.tax_division)) {
      $q.notify({ type: 'warning', message: 'Division fiscale invalide' });
      return;
    }
    if (newSup.value.tax_regime === 'RNI' && !newSup.value.charges_vat) {
      $q.notify({ type: 'warning', message: 'Un fournisseur en RNI doit charger la TVA' });
      return;
    }
    if (newSup.value.charges_vat && !newSup.value.vat_rate) {
      $q.notify({ type: 'warning', message: 'Précisez le taux de TVA' });
      return;
    }
    creatingSupplier.value = true;
    try {
      const payload = {
        company_id: companyStore.company!.id,
        name: newSup.value.name,
        legal_form: newSup.value.legal_form || null,
        legal_form_other: newSup.value.legal_form === 'AUTRE' ? (newSup.value.legal_form_other || null) : null,
        physical_address: newSup.value.physical_address.city || newSup.value.physical_address.district || newSup.value.physical_address.sector
          ? newSup.value.physical_address
          : null,
        cadastral_address: newSup.value.cadastral_address.parcel || newSup.value.cadastral_address.lot || newSup.value.cadastral_address.section
          ? newSup.value.cadastral_address
          : null,
        postal_address: newSup.value.postal_address.post_office || newSup.value.postal_address.po_box || newSup.value.postal_address.postal_code
          ? newSup.value.postal_address
          : null,
        phone_country_code: getCountryByCode(newSup.value.country)?.dial || null,
        phone: newSup.value.phone || null,
        email: newSup.value.email || null,
        billing_email: newSup.value.billing_email || null,
        ifu: newSup.value.ifu || null,
        ifu_scan_file_id: newSup.value.ifu_scan_file_id,
        rccm: newSup.value.rccm || null,
        rccm_scan_file_id: newSup.value.rccm_scan_file_id,
        tax_regime: newSup.value.tax_regime || null,
        tax_division: newSup.value.tax_division,
        contacts: newSup.value.contacts.filter(c => c.name.trim() || c.email.trim()).length > 0
          ? newSup.value.contacts.filter(c => c.name.trim() || c.email.trim())
          : null,
        bank_accounts: newSup.value.bank_accounts.length > 0 ? newSup.value.bank_accounts : null,
        charges_vat: newSup.value.charges_vat,
        vat_rate: newSup.value.charges_vat ? newSup.value.vat_rate : null,
        country: 'BF',
        is_active: true,
        payment_terms_days: 30,
        supplier_type: 'local' as const,
        notes: newSup.value.notes || null,
      };
      const { data, error } = await appwriteDb.from('suppliers').insert([payload])
        .then(r => ({ data: Array.isArray(r.data) ? r.data[0] : r.data, error: r.error }));
      if (error) { $q.notify({ type: 'negative', message: error.message }); return; }
      await loadSuppliers();
      form.value.supplier_id = (data as { id: string }).id;
      showNewSupplier.value = false;
      newSup.value = {
        name: '',
        legal_form: null,
        legal_form_other: '',
        physical_address: { city: '', district: '', sector: '' },
        cadastral_address: { parcel: '', lot: '', section: '' },
        postal_address: { post_office: '', po_box: '', postal_code: '' },
        country: 'BF',
        phone: '',
        email: '',
        billing_email: '',
        ifu: '',
        ifu_scan_file_id: null,
        rccm: '',
        rccm_scan_file_id: null,
        tax_regime: null,
        tax_division: null,
        contacts: [
          { role: 'sales', name: '', function: '', phone: '', email: '' },
          { role: 'accounting', name: '', function: '', phone: '', email: '' },
        ],
        bank_accounts: [],
        charges_vat: false,
        vat_rate: null,
        address: '',
        bank_name: '',
        bank_iban: '',
        bank_bic: '',
        notes: '',
      };
      $q.notify({ type: 'positive', message: 'Fournisseur créé' });
    } finally { creatingSupplier.value = false; }
  }

// ── Options RAS ─────────────────────────────────────────────────────────────
const rasRates = [
  { label: 'IS 5%',   value: 0.05 },
  { label: 'IS 25%',  value: 0.25 },
  { label: 'IRNR 20%', value: 0.20 },
  { label: 'IRNR 15%', value: 0.15 },
  { label: 'TVA 18%', value: 0.18 },
];
function autoCalcRas() {
  const rate = form.value.withholding_tax_rate;
  if (rate != null && rate > 0) {
    form.value.withholding_tax_amount = Math.round(form.value.total_ht * rate * 100) / 100;
  } else {
    form.value.withholding_tax_amount = 0;
  }
}

// ── Calculs montants ─────────────────────────────────────────────────────────
function autoCalcTva() {
  if (tvaBlocked.value) {
    form.value.total_tva = 0;
  } else {
    form.value.total_tva = Math.round(form.value.total_ht * 0.18 * 100) / 100;
  }
  autoCalcRas();
  autoCalcTtc();
}
function autoCalcTtc() {
  form.value.total_ttc = form.value.total_ht + form.value.total_tva + form.value.total_psvb + form.value.stamp_duty;
}
function recalcAll() {
  if (form.value.total_ttc > 0 && form.value.total_ht === 0) {
    form.value.total_ht  = Math.round(form.value.total_ttc / 1.18 * 100) / 100;
    if (!tvaBlocked.value) {
      form.value.total_tva = Math.round(form.value.total_ht * 0.18 * 100) / 100;
    }
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
  // Si le délai est 0 ou vide → effacer l'échéance
  if (days === 0) {
    form.value.payment_terms_days = 0;
    form.value.due_date = null;
    return;
  }
  const base = form.value.received_at
    ? dayjs(form.value.received_at.slice(0, 10))
    : dayjs();
  form.value.due_date = base.add(days, 'day').format('YYYY-MM-DD');
}
function onDueDateChange() {
  if (!form.value.due_date) {
    form.value.payment_terms_days = 0;
    return;
  }
  if (!form.value.received_at) return;
  const dueD = dayjs(form.value.due_date);
  const recD = dayjs(form.value.received_at.slice(0, 10));
  if (!dueD.isValid() || !recD.isValid()) return;
  const diff = dueD.diff(recD, 'day');
  // Si le diff est négatif ou absurde (received_at trop ancien), mettre 0
  if (diff < 0 || diff > 365) {
    form.value.payment_terms_days = 0;
  } else {
    form.value.payment_terms_days = diff;
  }
}

// ── Validation etape ─────────────────────────────────────────────────────────
const stepValid = computed(() => {
  if (step.value === 1) return !!form.value.supplier_id && !!form.value.received_at;
  if (step.value === 2) return true;
  if (step.value === 3) return form.value.total_ttc > 0;
  return true;
});
async function nextStep() {
  if (!stepValid.value) { $q.notify({ type: 'warning', message: 'Remplir les champs obligatoires (*)' }); return; }
  if (step.value === 2 && !form.value.reference) {
    const companyId = companyStore.company!.id;
    const year = new Date().getFullYear();
    try {
      const { data } = await appwriteDb
        .rpc('next_invoice_reference', { p_company_id: companyId, p_type: 'FR', p_year: year });
      form.value.reference = (data as string) || `FR-${year}-${Date.now().toString(36).toUpperCase()}`;
    } catch {
      form.value.reference = `FR-${year}-${Date.now().toString(36).toUpperCase()}`;
    }
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

  // A3 guard: bloquer la soumission si facture non-draft (immutabilité)
  if (props.invoice && !['draft'].includes(props.invoice.status)) {
    $q.notify({ type: 'warning', message: `Facture ${props.invoice.status} — non modifiable` });
    return;
  }

  let result;
  if (props.invoice) {
    result = await updateInvoice(props.invoice.id, payload as Partial<ReceivedInvoice>);
  } else {
    result = await createInvoice(payload as Partial<ReceivedInvoice>);
  }
  if (result) {
    // Enregistrer la retenue à la source — A2: éviter les doublons
    const rasAmount = Number(form.value.withholding_tax_amount) || 0;
    const rasRate   = form.value.withholding_tax_rate;
    const rasInvoiceId = (result as ReceivedInvoice).id;
    // Toujours supprimer l'éventuelle RAS existante pour cette facture (update safe)
    await appwriteDb.from('withholding_taxes').delete().eq('invoice_id', rasInvoiceId);
    if (rasAmount > 0 && rasRate != null) {
      const periodMonth = (form.value.received_at || new Date().toISOString()).slice(0, 7);
      await appwriteDb.from('withholding_taxes').insert([{
        company_id:   companyStore.company!.id,
        invoice_id:   rasInvoiceId,
        tax_type:     rasRates.find(r => r.value === rasRate)?.label ?? 'RAS',
        rate:         rasRate,
        base_amount:  Number(form.value.total_ht),
        tax_amount:   rasAmount,
        period_month: periodMonth,
        status:       'pending',
      }]);
    }
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

// URL Dify depuis la config Appwrite ou env
async function verifierIfuDgi() {
  const ifu = supplierIfu.value;
  if (!ifu) return;
  ifuResult.value = null;
  ifuLoading.value = true;

  try {
    const result = await verifyTaxIdOnline('BF', ifu);
    if (result.online_check === 'valid') {
      ifuResult.value = {
        nom: result.online_message || ifu, etat: 'ACTIF',
        rccm: '', regime: '', adresse: '', tel: '', email: ''
      };
      form.value.ifu_verified = true;
      form.value.fiscal_compliance_status = 'valid';
      $q.notify({ type: 'positive', icon: 'verified_user',
        message: `IFU vérifié ✓ — ${ifu}`, timeout: 5000 });
    } else if (result.online_check === 'invalid') {
      ifuResult.value = {
        nom: ifu, etat: 'INVALIDE',
        rccm: '', regime: '', adresse: '', tel: '', email: ''
      };
      $q.notify({ type: 'warning', icon: 'warning',
        message: 'IFU introuvable dans la base DGI', timeout: 5000 });
    } else {
      $q.notify({ type: 'info', icon: 'help_outline',
        message: result.online_message || 'Vérification ambiguë — page DGI ouverte', timeout: 5000 });
      globalThis.open(`https://dgi.bf/verification/verification-ifu?ifu=${encodeURIComponent(ifu)}`, '_blank');
    }
  } catch (e) {
    console.warn('[IFU] ai-router error:', e);
    globalThis.open(`https://dgi.bf/verification/verification-ifu?ifu=${encodeURIComponent(ifu)}`, '_blank');
  } finally {
    ifuLoading.value = false;
  }
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
