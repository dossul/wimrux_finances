<template>
  <q-page class="flex flex-center bg-grey-1" padding>
    <div style="max-width: 600px; width: 100%">
      <!-- Header -->
      <div class="text-center q-mb-lg">
        <div class="text-h6 text-weight-bold text-primary">WIMRUX® FINANCES</div>
        <div class="text-caption text-grey-7">Vérification de Facture Électronique Certifiée — DGI Burkina Faso</div>
      </div>

      <!-- Search input (manual entry) -->
      <q-card flat bordered class="q-mb-md">
        <q-card-section>
          <div class="text-subtitle2 q-mb-sm">Scanner ou saisir les données du QR Code</div>
          <q-input
            v-model="rawInput"
            label="Données QR Code (BF;N°Fiscal;Code;IFU;DateHeure)"
            filled
            clearable
            autofocus
            @keyup.enter="verifyFromInput"
          >
            <template #append>
              <q-btn flat round icon="search" color="primary" @click="verifyFromInput" />
            </template>
          </q-input>
        </q-card-section>
      </q-card>

      <!-- Result: loading -->
      <div v-if="loading" class="text-center q-pa-lg">
        <q-spinner-dots color="primary" size="40px" />
        <div class="text-caption q-mt-sm">Vérification en cours…</div>
      </div>

      <!-- Result: error / invalid format -->
      <q-banner v-else-if="parseError" class="bg-red-1 text-red-9 q-mb-md" rounded>
        <template #avatar><q-icon name="error" color="negative" /></template>
        {{ parseError }}
      </q-banner>

      <!-- Result: not found -->
      <q-card v-else-if="verified === false" flat bordered class="bg-orange-1 q-mb-md">
        <q-card-section class="row items-center q-gutter-md">
          <q-icon name="warning" color="warning" size="40px" />
          <div>
            <div class="text-subtitle1 text-weight-bold text-orange-9">Facture introuvable</div>
            <div class="text-caption text-grey-7">Aucune facture certifiée ne correspond à ces données dans notre système.</div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Result: verified -->
      <q-card v-else-if="verified === true && invoiceData" flat bordered class="bg-green-1">
        <q-card-section>
          <div class="row items-center q-gutter-md q-mb-md">
            <q-icon name="verified" color="positive" size="48px" />
            <div>
              <div class="text-h6 text-positive text-weight-bold">Facture Authentique</div>
              <div class="text-caption text-grey-7">Cette facture est certifiée et enregistrée dans le système SECeF/DGI</div>
            </div>
          </div>

          <q-separator class="q-mb-md" />

          <div class="q-gutter-y-xs">
            <div class="row">
              <div class="col-5 text-caption text-grey-7">N° Fiscal</div>
              <div class="col text-caption text-weight-medium">{{ invoiceData.fiscal_number }}</div>
            </div>
            <div class="row">
              <div class="col-5 text-caption text-grey-7">Code SECeF/DGI</div>
              <div class="col text-caption text-weight-medium" style="word-break: break-all">{{ invoiceData.code_secef_dgi }}</div>
            </div>
            <div class="row">
              <div class="col-5 text-caption text-grey-7">NIM Machine</div>
              <div class="col text-caption text-weight-medium">{{ invoiceData.nim }}</div>
            </div>
            <div class="row">
              <div class="col-5 text-caption text-grey-7">IFU Émetteur</div>
              <div class="col text-caption text-weight-medium">{{ parsedIfu }}</div>
            </div>
            <div class="row">
              <div class="col-5 text-caption text-grey-7">Date de certification</div>
              <div class="col text-caption text-weight-medium">{{ fmtDate(invoiceData.certification_datetime) }}</div>
            </div>
            <div class="row">
              <div class="col-5 text-caption text-grey-7">Compteurs</div>
              <div class="col text-caption text-weight-medium">{{ invoiceData.counters || '—' }}</div>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <!-- Format help -->
      <div class="text-caption text-grey-6 q-mt-md text-center">
        Format QR DGI : <code>BF;N°Fiscal;CodeSECeF;IFU;DateHeure</code>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { insforge } from 'src/boot/insforge';

interface CertInvoice {
  fiscal_number: string;
  code_secef_dgi: string;
  nim: string;
  certification_datetime: string | null;
  counters: string | null;
}

const route = useRoute();

const rawInput = ref('');
const loading = ref(false);
const parseError = ref<string | null>(null);
const verified = ref<boolean | null>(null);
const invoiceData = ref<CertInvoice | null>(null);
const parsedIfu = ref('');

function fmtDate(d: string | null): string {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d;
  }
}

function parseDgiQr(raw: string): { fiscalNumber: string; codeSECeF: string; ifu: string; dateTime: string } | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith('BF;')) return null;
  const parts = trimmed.split(';');
  if (parts.length < 5) return null;
  return {
    fiscalNumber: parts[1] ?? '',
    codeSECeF: parts[2] ?? '',
    ifu: parts[3] ?? '',
    dateTime: parts[4] ?? '',
  };
}

async function verify(dgiData: string) {
  parseError.value = null;
  verified.value = null;
  invoiceData.value = null;

  const parsed = parseDgiQr(dgiData);
  if (!parsed) {
    parseError.value = 'Format invalide. Le QR Code doit commencer par "BF;" et contenir 5 segments séparés par ";"';
    return;
  }

  parsedIfu.value = parsed.ifu;
  loading.value = true;
  try {
    const codeSECeF = parsed.codeSECeF.replace(/-/g, '');
    const { data } = await insforge.database
      .from('invoices')
      .select('fiscal_number, code_secef_dgi, nim, certification_datetime, counters')
      .eq('fiscal_number', parsed.fiscalNumber)
      .eq('status', 'certified')
      .limit(1);

    if (data && data.length > 0) {
      const inv = data[0] as CertInvoice;
      const storedCode = (inv.code_secef_dgi || '').replace(/-/g, '');
      if (storedCode === codeSECeF) {
        invoiceData.value = inv;
        verified.value = true;
      } else {
        verified.value = false;
      }
    } else {
      verified.value = false;
    }
  } finally {
    loading.value = false;
  }
}

function verifyFromInput() {
  if (rawInput.value.trim()) {
    void verify(rawInput.value.trim());
  }
}

onMounted(() => {
  const q = route.query['q'];
  if (typeof q === 'string' && q) {
    rawInput.value = q;
    void verify(q);
  }
});
</script>
