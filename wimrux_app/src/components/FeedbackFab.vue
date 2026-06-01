<template>
  <div>
    <q-btn fab icon="feedback" color="secondary" class="fixed-bottom-right q-ma-md" @click="showDialog = true" />

    <q-dialog v-model="showDialog">
      <q-card style="min-width: 380px">
        <q-card-section class="text-h6">Votre avis compte</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select v-model="form.type" :options="typeOpts" label="Type" emit-value map-options outlined dense />
          <q-input v-model="form.message" label="Message" type="textarea" outlined rows="3" />
          <div>
            <div class="text-caption q-mb-xs">Note (optionnel)</div>
            <q-rating v-model="form.rating" size="1.5em" color="amber" icon="star_border" icon-selected="star" />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" @click="showDialog = false" />
          <q-btn color="primary" label="Envoyer" :loading="submitting" @click="submit" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useSupport } from 'src/composables/useSupport';

const $q = useQuasar();
const { submitFeedback } = useSupport();

const showDialog = ref(false);
const submitting = ref(false);
const form = ref({ type: 'suggestion', message: '', rating: 0 });

const typeOpts = [
  { label: 'Suggestion', value: 'suggestion' },
  { label: 'Bug', value: 'bug' },
  { label: 'Bravo !', value: 'praise' },
  { label: 'Autre', value: 'other' },
];

async function submit() {
  if (!form.value.message) {
    $q.notify({ type: 'warning', message: 'Veuillez écrire un message' });
    return;
  }
  submitting.value = true;
  try {
    const result = await submitFeedback({
      type: form.value.type,
      message: form.value.message,
      page_url: window.location.pathname,
      rating: form.value.rating || 0,
    });
    if (result) {
      showDialog.value = false;
      form.value = { type: 'suggestion', message: '', rating: 0 };
      $q.notify({ type: 'positive', message: 'Merci pour votre retour !' });
    }
  } finally { submitting.value = false; }
}
</script>
