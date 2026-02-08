<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="text-h6 text-center">Inscription</div>
    </q-card-section>

    <q-card-section>
      <q-form @submit.prevent="onSubmit" class="q-gutter-md">
        <q-input
          v-model="fullName"
          label="Nom complet"
          filled
          :rules="[val => !!val || 'Nom requis']"
        >
          <template v-slot:prepend><q-icon name="person" /></template>
        </q-input>

        <q-input
          v-model="email"
          label="Adresse email"
          type="email"
          filled
          :rules="[val => !!val || 'Email requis', val => /.+@.+\..+/.test(val) || 'Email invalide']"
        >
          <template v-slot:prepend><q-icon name="email" /></template>
        </q-input>

        <q-input
          v-model="password"
          label="Mot de passe"
          :type="showPassword ? 'text' : 'password'"
          filled
          :rules="[val => !!val || 'Mot de passe requis', val => val.length >= 8 || 'Minimum 8 caractères']"
        >
          <template v-slot:prepend><q-icon name="lock" /></template>
          <template v-slot:append>
            <q-icon
              :name="showPassword ? 'visibility_off' : 'visibility'"
              class="cursor-pointer"
              @click="showPassword = !showPassword"
            />
          </template>
        </q-input>

        <q-btn
          type="submit"
          label="S'inscrire"
          color="primary"
          class="full-width"
          size="lg"
          :loading="loading"
          no-caps
        />
      </q-form>
    </q-card-section>

    <q-card-section class="text-center">
      <span class="text-body2">Déjà un compte ?</span>
      <router-link to="/auth/login" class="text-primary q-ml-xs">Se connecter</router-link>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store';

const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();

const fullName = ref('');
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);

async function onSubmit() {
  loading.value = true;
  try {
    const data = await authStore.register(email.value, password.value, fullName.value);
    if (data?.requireEmailVerification) {
      $q.notify({ type: 'info', message: 'Veuillez vérifier votre email pour confirmer votre compte.' });
      await router.push({ name: 'login' });
    } else {
      $q.notify({ type: 'positive', message: 'Inscription réussie !' });
      await router.push('/');
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur d\'inscription';
    $q.notify({ type: 'negative', message });
  } finally {
    loading.value = false;
  }
}
</script>
