<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="text-h6 text-center">Connexion</div>
    </q-card-section>

    <q-card-section>
      <q-form @submit.prevent="onSubmit" class="q-gutter-md">
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
          :rules="[val => !!val || 'Mot de passe requis']"
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

        <div class="text-right">
          <router-link to="/auth/forgot-password" class="text-primary">Mot de passe oublié ?</router-link>
        </div>

        <q-btn
          type="submit"
          label="Se connecter"
          color="primary"
          class="full-width"
          size="lg"
          :loading="loading"
          no-caps
        />
      </q-form>
    </q-card-section>

    <q-separator />

    <q-card-section class="text-center">
      <div class="text-body2 q-mb-sm">Ou se connecter avec</div>
      <div class="q-gutter-sm">
        <q-btn flat round icon="img:https://www.google.com/favicon.ico" @click="loginWithOAuth('google')" />
        <q-btn flat round icon="mdi-github" @click="loginWithOAuth('github')" />
      </div>
    </q-card-section>

    <q-card-section class="text-center">
      <span class="text-body2">Pas encore de compte ?</span>
      <router-link to="/auth/register" class="text-primary q-ml-xs">S'inscrire</router-link>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store';
import { useCompanyStore } from 'src/stores/company-store';
import { insforge } from 'src/boot/insforge';

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const authStore = useAuthStore();
const companyStore = useCompanyStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);

async function onSubmit() {
  loading.value = true;
  try {
    await authStore.login(email.value, password.value);
    // Load company data after successful login
    if (authStore.companyId) {
      await companyStore.loadCompanies(authStore.companyId);
    }
    const redirect = (route.query.redirect as string) || '/';
    await router.push(redirect);
    $q.notify({ type: 'positive', message: `Bienvenue, ${authStore.fullName || 'utilisateur'}` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur de connexion';
    $q.notify({ type: 'negative', message });
  } finally {
    loading.value = false;
  }
}

async function loginWithOAuth(provider: 'google' | 'github') {
  try {
    await insforge.auth.signInWithOAuth({
      provider,
      redirectTo: window.location.origin + '/',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur OAuth';
    $q.notify({ type: 'negative', message });
  }
}
</script>
