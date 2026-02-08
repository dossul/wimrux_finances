<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="text-h6 text-center">Mot de passe oublié</div>
      <div class="text-body2 text-center text-grey-7 q-mt-sm">
        Entrez votre adresse email pour recevoir un lien de réinitialisation.
      </div>
    </q-card-section>

    <q-card-section>
      <q-form @submit.prevent="onSubmit" class="q-gutter-md">
        <q-input
          v-model="email"
          label="Adresse email"
          type="email"
          filled
          :rules="[val => !!val || 'Email requis']"
        >
          <template v-slot:prepend><q-icon name="email" /></template>
        </q-input>

        <q-btn
          type="submit"
          label="Envoyer le lien"
          color="primary"
          class="full-width"
          size="lg"
          :loading="loading"
          no-caps
        />
      </q-form>
    </q-card-section>

    <q-card-section class="text-center">
      <router-link to="/auth/login" class="text-primary">Retour à la connexion</router-link>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store';

const $q = useQuasar();
const authStore = useAuthStore();

const email = ref('');
const loading = ref(false);

async function onSubmit() {
  loading.value = true;
  try {
    await authStore.forgotPassword(email.value);
    $q.notify({ type: 'positive', message: 'Email de réinitialisation envoyé !' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur';
    $q.notify({ type: 'negative', message });
  } finally {
    loading.value = false;
  }
}
</script>
