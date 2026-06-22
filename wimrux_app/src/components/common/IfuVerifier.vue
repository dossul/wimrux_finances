<template>
  <div class="column q-gutter-y-xs">
    <q-toggle
      v-if="country !== 'BF'"
      :model-value="verified"
      label="Vérifié manuellement"
      :dense="dense"
      @update:model-value="onManualToggle"
    />

    <template v-else>
      <template v-if="status === 'online_valid'">
        <div class="row items-center q-gutter-x-sm">
          <q-icon name="verified_user" color="positive" />
          <span class="text-body2">{{ onlineMessage || ifu }}</span>
          <q-badge color="positive">ACTIF</q-badge>
        </div>
        <q-badge color="green">IFU vérifié en ligne ✓</q-badge>
      </template>

      <template v-else-if="status === 'online_invalid'">
        <div class="row items-center q-gutter-x-sm">
          <q-icon name="block" color="negative" />
          <span class="text-body2">{{ ifu }}</span>
          <q-badge color="negative">INVALIDE</q-badge>
        </div>
        <q-badge color="red">IFU introuvable dans la base DGI</q-badge>
      </template>

      <template v-else-if="status === 'fallback'">
        <q-badge color="orange">
          Vérification automatique indisponible — vérifiez sur dgi.bf puis confirmez
        </q-badge>
        <q-btn
          flat
          color="orange"
          icon="check_circle"
          label="J'ai vérifié manuellement sur dgi.bf"
          :dense="dense"
          :outline="outlined"
          @click="confirmManual"
        />
      </template>

      <template v-else-if="status === 'manual'">
        <div class="row items-center q-gutter-x-sm">
          <q-icon name="verified_user" color="positive" />
          <span class="text-body2">{{ ifu }}</span>
          <q-badge color="positive">ACTIF</q-badge>
        </div>
        <q-badge color="green">IFU vérifié manuellement ✓</q-badge>
      </template>

      <q-btn
        v-else-if="verified"
        flat
        color="positive"
        icon="check_circle"
        label="Vérifié"
        disabled
        :dense="dense"
        :outline="outlined"
      />

      <q-btn
        v-else
        flat
        color="primary"
        icon="verified"
        icon-right="open_in_new"
        label="Vérifier sur DGI.bf"
        :loading="status === 'loading'"
        :dense="dense"
        :outline="outlined"
        @click="verifyOnline"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { verifyTaxIdOnline } from 'src/utils/fiscalCompliance';

type VerificationStatus =
  | 'idle'
  | 'loading'
  | 'online_valid'
  | 'online_invalid'
  | 'fallback'
  | 'manual';

const props = withDefaults(
  defineProps<{
    ifu: string;
    country: string;
    userId?: string | null | undefined;
    verified: boolean;
    dense?: boolean;
    outlined?: boolean;
  }>(),
  {
    userId: null,
    dense: true,
    outlined: false,
  }
);

const emit = defineEmits<{
  update: [
    payload: {
      verified: boolean;
      verifiedAt: string | null;
      verifiedBy: string | null;
    }
  ];
}>();

const status = ref<VerificationStatus>('idle');
const onlineMessage = ref<string | null>(null);

watch([() => props.ifu, () => props.country], () => {
  status.value = 'idle';
  onlineMessage.value = null;
});

function emitVerified(value: boolean) {
  emit('update', {
    verified: value,
    verifiedAt: value ? new Date().toISOString() : null,
    verifiedBy: value ? (props.userId ?? null) : null,
  });
}

function onManualToggle(value: boolean) {
  emitVerified(value);
}

function openDgiTab() {
  const url = `https://dgi.bf/verification/verification-ifu?ifu=${encodeURIComponent(
    props.ifu
  )}`;
  globalThis.open(url, '_blank');
}

async function verifyOnline() {
  status.value = 'loading';
  onlineMessage.value = null;

  // Ouvre l'onglet DGI immédiatement (geste utilisateur synchrone)
  // pour contourner le blocage des popups navigateur
  const dgiWindow = globalThis.open(
    `https://dgi.bf/verification/verification-ifu?ifu=${encodeURIComponent(props.ifu)}`,
    '_blank'
  );

  try {
    const result = await verifyTaxIdOnline('BF', props.ifu);
    onlineMessage.value = result.online_message;

    if (result.online_check === 'valid') {
      // Ferme l'onglet DGI si on a eu une réponse automatique
      dgiWindow?.close();
      status.value = 'online_valid';
      emitVerified(true);
    } else if (result.online_check === 'invalid') {
      dgiWindow?.close();
      status.value = 'online_invalid';
      emitVerified(false);
    } else {
      // error / not_available / pending → on garde l'onglet DGI ouvert
      // (l'utilisateur doit confirmer manuellement via le bouton)
      status.value = 'fallback';
      if (!onlineMessage.value) {
        onlineMessage.value = result.online_message;
      }
    }
  } catch {
    status.value = 'fallback';
  }
}

function confirmManual() {
  status.value = 'manual';
  emitVerified(true);
}
</script>
