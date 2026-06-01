<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Confidentialité & RGPD</div>
        <div class="text-caption text-grey-7">Consentements · droits d'accès · suppression</div>
      </div>
    </div>

    <!-- Consentements -->
    <q-card flat bordered class="q-mb-lg">
      <q-card-section class="text-subtitle1 text-weight-medium">Mes consentements</q-card-section>
      <q-separator />
      <q-list separator>
        <q-item v-for="ct in consentTypes" :key="ct.value">
          <q-item-section>
            <q-item-label>{{ ct.label }}</q-item-label>
            <q-item-label caption>
              <span v-if="ct.required" class="text-negative text-weight-medium">Obligatoire</span>
              <span v-else class="text-grey">Optionnel</span>
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-toggle
              :model-value="hasConsent(ct.value)"
              :disable="ct.required && hasConsent(ct.value)"
              @update:model-value="(v: boolean) => onToggleConsent(ct.value, v, ct.required)"
              color="positive"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <!-- Droit d'accès / suppression -->
    <q-card flat bordered class="q-mb-lg">
      <q-card-section class="text-subtitle1 text-weight-medium">Droits RGPD</q-card-section>
      <q-separator />
      <q-card-section>
        <div class="row q-gutter-md">
          <q-btn color="primary" icon="download" label="Exporter mes données" no-caps :loading="loading" @click="onExport" />
          <q-btn color="negative" icon="delete_forever" label="Demander la suppression" no-caps outline @click="onDelete" />
        </div>
      </q-card-section>
    </q-card>

    <!-- Historique demandes -->
    <q-card v-if="exportRequests.length" flat bordered>
      <q-card-section class="text-subtitle1 text-weight-medium">Historique des demandes</q-card-section>
      <q-separator />
      <q-table :rows="exportRequests" :columns="exportCols" row-key="id" flat :pagination="{ rowsPerPage: 10 }">
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.row.status)" :label="props.row.status" />
          </q-td>
        </template>
        <template #body-cell-download="props">
          <q-td :props="props">
            <q-btn v-if="props.row.download_url" flat icon="download" size="sm" :href="props.row.download_url" target="_blank" />
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useRgpd, CONSENT_TYPES } from 'src/composables/useRgpd';

const $q = useQuasar();
const {
  exportRequests, loading, hasConsent,
  loadConsents, giveConsent, revokeConsent,
  loadExportRequests, requestDataExport, requestDataDeletion,
} = useRgpd();

const consentTypes = CONSENT_TYPES;

const exportCols = [
  { name: 'type', label: 'Type', align: 'left' as const, field: 'request_type' },
  { name: 'status', label: 'Statut', align: 'center' as const, field: 'status' },
  { name: 'date', label: 'Date', align: 'left' as const, field: 'requested_at', format: (v: string) => new Date(v).toLocaleDateString('fr-FR') },
  { name: 'download', label: '', align: 'center' as const, field: 'download_url' },
];

function statusColor(s: string) {
  return { pending: 'orange', processing: 'blue', completed: 'positive', rejected: 'negative' }[s] ?? 'grey';
}

async function onToggleConsent(type: string, val: boolean, required: boolean) {
  if (val) {
    await giveConsent(type);
    $q.notify({ type: 'positive', message: 'Consentement enregistré' });
  } else if (!required) {
    await revokeConsent(type);
    $q.notify({ type: 'info', message: 'Consentement retiré' });
  }
}

async function onExport() {
  const r = await requestDataExport();
  if (r) $q.notify({ type: 'positive', message: 'Demande d\'export créée. Vous serez notifié quand vos données seront prêtes.' });
}

async function onDelete() {
  $q.dialog({
    title: 'Suppression de vos données',
    message: 'Cette action est irréversible. Toutes vos données personnelles seront supprimées sous 30 jours conformément au RGPD.',
    cancel: true,
    persistent: true,
    ok: { label: 'Confirmer la suppression', color: 'negative' },
  }).onOk(async () => {
    const r = await requestDataDeletion();
    if (r) $q.notify({ type: 'info', message: 'Demande de suppression enregistrée.' });
  });
}

onMounted(() => Promise.all([loadConsents(), loadExportRequests()]));
</script>
