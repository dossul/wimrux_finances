<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Balance âgée des créances</div>
        <div class="text-caption text-grey-7">Encours clients · suivi des impayés</div>
      </div>
      <q-space />
      <q-btn outline color="primary" icon="download" label="Export CSV" no-caps @click="exportReceivablesCSV" class="q-mr-sm" />
      <q-btn outline color="orange" icon="notifications" label="Relances" no-caps :to="'/app/reminders'" />
    </div>

    <!-- KPI globaux -->
    <div class="row q-gutter-md q-mb-lg">
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-md text-center">
          <div class="text-caption text-grey-6">Encours total</div>
          <div class="text-h5 text-weight-bold text-negative">{{ fmtAmount(globalStats.total) }}</div>
          <div class="text-caption text-grey-6">XOF</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-md text-center">
          <div class="text-caption text-grey-6">0 – 30 jours</div>
          <div class="text-h5 text-weight-bold text-orange">{{ fmtAmount(globalStats.b0_30) }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-md text-center">
          <div class="text-caption text-grey-6">31 – 60 jours</div>
          <div class="text-h5 text-weight-bold text-deep-orange">{{ fmtAmount(globalStats.b31_60) }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-md text-center">
          <div class="text-caption text-grey-6">61 – 90 jours</div>
          <div class="text-h5 text-weight-bold text-negative">{{ fmtAmount(globalStats.b61_90) }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-md text-center">
          <div class="text-caption text-grey-6">> 90 jours</div>
          <div class="text-h5 text-weight-bold text-red-10">{{ fmtAmount(globalStats.bOver90) }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="kpi-card">
        <q-card-section class="q-pa-md text-center">
          <div class="text-caption text-grey-6">Taux retard</div>
          <div class="text-h5 text-weight-bold" :class="globalStats.overdueRate > 30 ? 'text-negative' : 'text-positive'">
            {{ globalStats.overdueRate.toFixed(1) }}%
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Barre de répartition -->
    <q-card flat bordered class="q-mb-md q-pa-md">
      <div class="text-subtitle2 q-mb-sm">Répartition de l'encours</div>
      <div class="aging-bar row no-wrap" v-if="globalStats.total > 0">
        <div class="aging-segment bg-orange"     :style="{ width: pct(globalStats.b0_30) }"    :title="`0-30j : ${fmtAmount(globalStats.b0_30)} XOF`" />
        <div class="aging-segment bg-deep-orange" :style="{ width: pct(globalStats.b31_60) }"  :title="`31-60j : ${fmtAmount(globalStats.b31_60)} XOF`" />
        <div class="aging-segment bg-negative"    :style="{ width: pct(globalStats.b61_90) }"  :title="`61-90j : ${fmtAmount(globalStats.b61_90)} XOF`" />
        <div class="aging-segment bg-red-10"      :style="{ width: pct(globalStats.bOver90) }" :title="`>90j : ${fmtAmount(globalStats.bOver90)} XOF`" />
      </div>
      <div class="row q-gutter-md q-mt-xs text-caption text-grey-7">
        <span><q-badge color="orange" /> 0-30j</span>
        <span><q-badge color="deep-orange" /> 31-60j</span>
        <span><q-badge color="negative" /> 61-90j</span>
        <span><q-badge color="red-10" /> +90j</span>
      </div>
    </q-card>

    <!-- Table balance âgée -->
    <q-card flat bordered>
      <q-table :rows="receivables" :columns="columns" row-key="client_id"
        :loading="loading" :pagination="{ rowsPerPage: 25 }" flat>

        <template #body-cell-outstanding_amount="props">
          <q-td :props="props" class="text-right text-weight-bold text-negative">
            {{ fmtAmount(props.value) }}
          </q-td>
        </template>
        <template #body-cell-bucket_0_30="props">
          <q-td :props="props" class="text-right text-orange">{{ fmtAmount(props.value) }}</q-td>
        </template>
        <template #body-cell-bucket_31_60="props">
          <q-td :props="props" class="text-right text-deep-orange">{{ fmtAmount(props.value) }}</q-td>
        </template>
        <template #body-cell-bucket_61_90="props">
          <q-td :props="props" class="text-right text-negative">{{ fmtAmount(props.value) }}</q-td>
        </template>
        <template #body-cell-bucket_over_90="props">
          <q-td :props="props" class="text-right text-red-10 text-weight-bold">{{ fmtAmount(props.value) }}</q-td>
        </template>

        <template #body-cell-oldest_unpaid_due="props">
          <q-td :props="props" :class="isDangerous(props.value) ? 'text-negative text-weight-bold' : ''">
            {{ props.value ?? '—' }}
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round dense size="sm" icon="notifications" color="orange"
              title="Envoyer relance" @click="openReminderDialog(props.row)" />
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6">
            <q-icon name="check_circle" color="positive" size="48px" class="q-mb-sm" /><br>
            Aucun encours client — tout est à jour !
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog envoi relance rapide -->
    <q-dialog v-model="showReminderDialog" persistent>
      <q-card style="min-width:480px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Envoyer une relance</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section v-if="reminderTarget">
          <div class="text-caption text-grey-7 q-mb-md">
            Client : <strong>{{ reminderTarget.client_name }}</strong> ·
            Encours : <strong class="text-negative">{{ fmtAmount(reminderTarget.outstanding_amount) }} XOF</strong>
          </div>
          <div class="q-gutter-md">
            <q-select v-model="reminderForm.template_id" :options="templateOptions"
              label="Modèle de relance" emit-value map-options clearable outlined dense
              @update:model-value="applyTemplate" />
            <q-select v-model="reminderForm.channel"
              :options="[{label:'Email',value:'email'},{label:'SMS',value:'sms'},{label:'WhatsApp',value:'whatsapp'}]"
              label="Canal" emit-value map-options outlined dense />
            <q-input v-model="reminderForm.recipient" label="Destinataire (email/tél)" outlined dense />
            <q-input v-model="reminderForm.subject" label="Objet" outlined dense />
            <q-input v-model="reminderForm.body" label="Message" outlined dense type="textarea" rows="5" />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="orange" icon="send" label="Envoyer" :loading="loading" @click="submitReminder" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useReceivables } from 'src/composables/useReceivables';
import type { ClientReceivable, ReminderChannel } from 'src/types';

const $q = useQuasar();
const {
  receivables, reminderTemplates, loading, globalStats,
  loadReceivables, loadReminderTemplates,
  interpolateTemplate, exportReceivablesCSV,
} = useReceivables();

const columns = [
  { name: 'client_name',        label: 'Client',          field: 'client_name',        align: 'left'   as const, sortable: true },
  { name: 'total_invoices',     label: 'Factures',        field: 'total_invoices',      align: 'center' as const },
  { name: 'outstanding_amount', label: 'Encours (XOF)',   field: 'outstanding_amount',  align: 'right'  as const, sortable: true },
  { name: 'bucket_0_30',        label: '0–30j',           field: 'bucket_0_30',         align: 'right'  as const },
  { name: 'bucket_31_60',       label: '31–60j',          field: 'bucket_31_60',        align: 'right'  as const },
  { name: 'bucket_61_90',       label: '61–90j',          field: 'bucket_61_90',        align: 'right'  as const },
  { name: 'bucket_over_90',     label: '>90j',            field: 'bucket_over_90',      align: 'right'  as const },
  { name: 'oldest_unpaid_due',  label: 'Plus anc. échéance', field: 'oldest_unpaid_due', align: 'center' as const },
  { name: 'actions',            label: '',                field: 'client_id',           align: 'right'  as const },
];

function fmtAmount(n: number | string): string {
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0 });
}
function pct(n: number): string {
  const total = globalStats.value.total;
  return total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '0%';
}
function isDangerous(date: string | null): boolean {
  if (!date) return false;
  return (new Date().getTime() - new Date(date).getTime()) / 86400000 > 60;
}

// ---- Relance dialog --------------------------------------------------------
const showReminderDialog = ref(false);
const reminderTarget     = ref<ClientReceivable | null>(null);
const reminderForm = ref({
  template_id: null as string | null,
  channel: 'email' as ReminderChannel,
  recipient: '',
  subject: '',
  body: '',
});

const templateOptions = computed(() =>
  reminderTemplates.value.map(t => ({ label: `${t.name} (J+${t.trigger_days})`, value: t.id }))
);

function openReminderDialog(r: ClientReceivable) {
  reminderTarget.value = r;
  reminderForm.value = {
    template_id: null, channel: 'email',
    recipient: r.client_email ?? '',
    subject: `Rappel de paiement — ${r.client_name}`,
    body: '',
  };
  showReminderDialog.value = true;
}

function applyTemplate(templateId: string | null) {
  if (!templateId || !reminderTarget.value) return;
  const tpl = reminderTemplates.value.find(t => t.id === templateId);
  if (!tpl) return;
  const vars = {
    client_name:        reminderTarget.value.client_name,
    outstanding_amount: fmtAmount(reminderTarget.value.outstanding_amount),
    oldest_due:         reminderTarget.value.oldest_unpaid_due ?? '—',
  };
  reminderForm.value.channel = tpl.channel;
  reminderForm.value.subject = interpolateTemplate(tpl.subject ?? '', vars);
  reminderForm.value.body    = interpolateTemplate(tpl.body_template, vars);
}

function submitReminder() {
  if (!reminderTarget.value || !reminderForm.value.recipient) {
    $q.notify({ type: 'negative', message: 'Destinataire requis' });
    return;
  }
  // Pour la relance globale on log sans invoice_id spécifique — on prend le premier impayé
  // Dans une vraie implémentation, on enverrait une relance par facture
  $q.notify({ type: 'info', message: 'Relance enregistrée (mode démo — connecter à email/SMS provider en Sprint 7)' });
  showReminderDialog.value = false;
}

onMounted(async () => {
  await Promise.all([loadReceivables(), loadReminderTemplates()]);
});
</script>

<style scoped>
.kpi-card { min-width: 120px; flex: 1; }
.aging-bar { height: 20px; border-radius: 4px; overflow: hidden; }
.aging-segment { height: 100%; transition: width 0.3s; }
</style>
