<template>
  <q-card flat bordered class="paste-zone">
    <q-card-section class="q-pb-none">
      <div class="text-subtitle2 text-weight-medium q-mb-xs">
        <q-icon name="add_circle" color="primary" class="q-mr-xs" />
        Ajouter une preuve de paiement
      </div>
      <div class="text-caption text-grey-6">Collez un SMS, texte, glissez une image ou un fichier</div>
    </q-card-section>

    <!-- Wallet selector -->
    <q-card-section class="q-pt-sm q-pb-xs">
      <q-select
        v-model="selectedWalletId"
        :options="walletOptions"
        option-value="id"
        option-label="label"
        emit-value
        map-options
        dense
        outlined
        label="Wallet de destination"
        :disable="!!fixedWalletId"
      />
    </q-card-section>

    <!-- Tabs: Text/SMS | Image | File -->
    <q-tabs v-model="activeTab" dense align="left" class="q-px-md" active-color="primary" indicator-color="primary">
      <q-tab name="text"  icon="notes"           label="Texte / SMS" />
      <q-tab name="image" icon="image"            label="Image"       />
      <q-tab name="file"  icon="upload_file"      label="Fichier"     />
    </q-tabs>

    <q-separator />

    <q-tab-panels v-model="activeTab" animated>
      <!-- ── TEXT / SMS ── -->
      <q-tab-panel name="text" class="q-pa-md">
        <q-input
          v-model="textContent"
          type="textarea"
          outlined
          autogrow
          :rows="4"
          placeholder="Collez ici un SMS Orange Money, Wave, MTN MoMo, un texte de virement..."
          :disable="isProcessing"
          @paste="onPaste"
        />
        <div class="row q-mt-sm q-gutter-sm">
          <q-btn-toggle
            v-model="textChannel"
            toggle-color="primary"
            :options="[{label:'Texte libre', value:'text'},{label:'SMS opérateur', value:'sms'}]"
            dense unelevated
          />
          <q-space />
          <q-btn label="Extraire" icon="auto_awesome" color="primary" unelevated dense
            :disable="!textContent.trim() || !selectedWalletId || isProcessing"
            :loading="isProcessing"
            @click="submitText"
          />
        </div>
      </q-tab-panel>

      <!-- ── IMAGE ── -->
      <q-tab-panel name="image" class="q-pa-md">
        <div
          class="drop-area column items-center justify-center q-pa-lg rounded-borders"
          :class="{ 'drop-active': isDragOver }"
          @dragover.prevent="isDragOver = true"
          @dragleave="isDragOver = false"
          @drop.prevent="onDrop"
          @click="triggerFileInput('image')"
        >
          <q-icon name="add_photo_alternate" size="48px" color="grey-5" />
          <div class="text-caption text-grey-6 q-mt-sm">Glissez ou cliquez — JPG, PNG, WebP, PDF (max 10 MB)</div>
          <div v-if="imageFile" class="text-caption text-positive q-mt-xs">{{ imageFile.name }}</div>
        </div>
        <input ref="fileInputImage" type="file" accept="image/*,application/pdf" class="hidden" @change="onImagePicked" />
        <q-btn label="Analyser l'image" icon="document_scanner" color="primary" unelevated dense class="q-mt-sm full-width"
          :disable="!imageFile || !selectedWalletId || isProcessing"
          :loading="isProcessing"
          @click="submitImage"
        />
      </q-tab-panel>

      <!-- ── FILE ── -->
      <q-tab-panel name="file" class="q-pa-md">
        <div
          class="drop-area column items-center justify-center q-pa-lg rounded-borders"
          :class="{ 'drop-active': isDragOver }"
          @dragover.prevent="isDragOver = true"
          @dragleave="isDragOver = false"
          @drop.prevent="onDrop"
          @click="triggerFileInput('file')"
        >
          <q-icon name="upload_file" size="48px" color="grey-5" />
          <div class="text-caption text-grey-6 q-mt-sm">PDF, CSV, XLSX, OFX, QIF (max 20 MB)</div>
          <div v-if="statementFile" class="text-caption text-positive q-mt-xs">{{ statementFile.name }}</div>
        </div>
        <input ref="fileInputStatement" type="file" accept=".pdf,.csv,.xlsx,.xls,.ofx,.qif,.txt" class="hidden" @change="onStatementPicked" />
        <q-btn label="Importer le relevé" icon="cloud_upload" color="primary" unelevated dense class="q-mt-sm full-width"
          :disable="!statementFile || !selectedWalletId || isProcessing"
          :loading="isProcessing"
          @click="submitFile"
        />
      </q-tab-panel>
    </q-tab-panels>

    <!-- Result banner -->
    <q-card-section v-if="job.status === 'done'" class="q-pt-none">
      <q-banner v-if="job.isDuplicate" dense rounded class="bg-orange-1 text-orange-9">
        <template #avatar><q-icon name="content_copy" /></template>
        Transaction déjà enregistrée (doublon ignoré)
      </q-banner>
      <q-banner v-else-if="job.inserted > 0 || job.transactionId" dense rounded class="bg-positive text-white">
        <template #avatar><q-icon name="check_circle" /></template>
        <span v-if="job.inserted > 1">{{ job.inserted }} transactions importées</span>
        <span v-else>1 transaction créée</span>
        <span v-if="job.skipped"> · {{ job.skipped }} doublons ignorés</span>
        <span v-if="job.modelUsed" class="text-caption q-ml-sm opacity-80">via {{ job.modelUsed }}</span>
      </q-banner>
      <q-list v-if="job.errors.length" dense class="q-mt-xs">
        <q-item v-for="(e, i) in job.errors" :key="i" dense>
          <q-item-section avatar><q-icon name="warning" color="warning" size="xs" /></q-item-section>
          <q-item-section><span class="text-caption text-warning">{{ e }}</span></q-item-section>
        </q-item>
      </q-list>
    </q-card-section>

    <q-card-section v-if="job.status === 'error'" class="q-pt-none">
      <q-banner dense rounded class="bg-negative text-white">
        <template #avatar><q-icon name="error" /></template>
        {{ job.errorMessage }}
      </q-banner>
    </q-card-section>

    <!-- Reset -->
    <q-card-actions v-if="job.status === 'done' || job.status === 'error'" align="right" class="q-pt-none">
      <q-btn flat dense label="Recommencer" icon="refresh" color="grey-7" @click="handleReset" />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useIngestPayment } from 'src/composables/useIngestPayment';

interface WalletOption { id: string; label: string; }

const props = defineProps<{
  wallets: WalletOption[];
  fixedWalletId?: string;
}>();

const emit = defineEmits<{ (e: 'ingested'): void }>();

const { job, reset, ingestText, ingestImage, ingestFile } = useIngestPayment();

const activeTab       = ref<'text' | 'image' | 'file'>('text');
const textContent     = ref('');
const textChannel     = ref<'text' | 'sms'>('text');
const imageFile       = ref<File | null>(null);
const statementFile   = ref<File | null>(null);
const isDragOver      = ref(false);
const fileInputImage  = ref<HTMLInputElement | null>(null);
const fileInputStatement = ref<HTMLInputElement | null>(null);

const selectedWalletId = ref<string>(props.fixedWalletId ?? '');

watch(() => props.fixedWalletId, v => { if (v) selectedWalletId.value = v; });

const walletOptions = computed(() => props.wallets);
const isProcessing  = computed(() => ['uploading', 'processing'].includes(job.value.status));

function onPaste(e: ClipboardEvent) {
  const text = e.clipboardData?.getData('text/plain');
  if (text) textContent.value = text;
}

function triggerFileInput(type: 'image' | 'file') {
  if (type === 'image') fileInputImage.value?.click();
  else fileInputStatement.value?.click();
}

function onImagePicked(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) imageFile.value = f;
}

function onStatementPicked(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) statementFile.value = f;
}

function onDrop(e: DragEvent) {
  isDragOver.value = false;
  const f = e.dataTransfer?.files?.[0];
  if (!f) return;
  if (activeTab.value === 'image') imageFile.value = f;
  else statementFile.value = f;
}

async function submitText() {
  await ingestText({ wallet_id: selectedWalletId.value, content: textContent.value, channel: textChannel.value });
  if (job.value.status === 'done') emit('ingested');
}

async function submitImage() {
  if (!imageFile.value) return;
  await ingestImage({ wallet_id: selectedWalletId.value, file: imageFile.value });
  if (job.value.status === 'done') emit('ingested');
}

async function submitFile() {
  if (!statementFile.value) return;
  await ingestFile({ wallet_id: selectedWalletId.value, file: statementFile.value });
  if (job.value.status === 'done') emit('ingested');
}

function handleReset() {
  reset();
  textContent.value = '';
  imageFile.value = null;
  statementFile.value = null;
}
</script>

<style scoped>
.paste-zone { border-radius: 12px; }
.drop-area {
  border: 2px dashed #ccc;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
  min-height: 120px;
}
.drop-area:hover, .drop-active { border-color: var(--q-primary); background: rgba(var(--q-primary-rgb), 0.04); }
.hidden { display: none; }
</style>
