<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="text-h6 text-center">
        {{ step === 'credentials' ? 'Connexion' : 'Vérification WhatsApp' }}
      </div>
    </q-card-section>

    <!-- Étape 1 : Email / Mot de passe -->
    <q-card-section v-if="step === 'credentials'">
      <q-form @submit.prevent="onSubmit" class="q-gutter-md">
        <q-input
          v-model="email"
          label="Adresse email"
          type="email"
          filled
          data-testid="login-email"
          :rules="[val => !!val || 'Email requis', val => /.+@.+\..+/.test(val) || 'Email invalide']"
        >
          <template v-slot:prepend><q-icon name="email" /></template>
        </q-input>

        <q-input
          v-model="password"
          label="Mot de passe"
          :type="showPassword ? 'text' : 'password'"
          filled
          data-testid="login-password"
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
          <router-link to="/auth/forgot-password" class="text-primary" data-testid="forgot-password-link">Mot de passe oublié ?</router-link>
        </div>

        <q-btn
          type="submit"
          label="Se connecter"
          color="primary"
          class="full-width"
          size="lg"
          data-testid="login-submit"
          :loading="loading"
          no-caps
        />
      </q-form>
    </q-card-section>

    <!-- Étape 2 : OTP WhatsApp -->
    <q-card-section v-else-if="step === 'otp'">
      <div class="text-body2 text-grey q-mb-md text-center" data-testid="otp-phone-display">
        <q-icon name="whatsapp" color="green" size="sm" class="q-mr-xs" />
        Code envoyé au <strong>+{{ otpPhone }}</strong>
      </div>
      <q-form @submit.prevent="onVerifyOtp" class="q-gutter-md">
        <q-input
          v-model="otpCode"
          label="Code de vérification (6 chiffres)"
          filled
          maxlength="6"
          inputmode="numeric"
          autofocus
          data-testid="otp-input"
          :rules="[val => !!val || 'Code requis', val => /^\d{6}$/.test(val) || '6 chiffres requis']"
        >
          <template v-slot:prepend><q-icon name="verified" /></template>
        </q-input>

        <q-btn
          type="submit"
          label="Vérifier"
          color="positive"
          class="full-width"
          size="lg"
          data-testid="otp-submit"
          :loading="loadingOtp"
          no-caps
        />

        <div class="text-center">
          <q-btn flat dense no-caps label="Renvoyer le code" @click="resendOtp" :loading="loadingResend" />
          <q-btn flat dense no-caps label="Annuler" color="grey" @click="cancelOtp" class="q-ml-sm" />
        </div>
      </q-form>
    </q-card-section>

    <q-separator v-if="step === 'credentials'" />

    <q-card-section v-if="step === 'credentials'" class="text-center">
      <div class="text-body2 q-mb-sm">Ou se connecter avec</div>
      <div class="q-gutter-sm">
        <q-btn flat round icon="img:https://www.google.com/favicon.ico" @click="loginWithOAuth('google')" />
        <q-btn flat round icon="mdi-github" @click="loginWithOAuth('github')" />
      </div>
    </q-card-section>

    <q-card-section v-if="step === 'credentials'" class="text-center text-caption text-grey">
      Contactez votre administrateur pour obtenir un compte
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store';
import { useCompanyStore } from 'src/stores/company-store';
import { appwriteAuth } from 'src/services/appwrite-auth';
// import { useEmailService } from 'src/composables/useEmailService'; // Désactivé - SMTP non configuré

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT as string;

const router = useRouter();
const route = useRoute();
const $q = useQuasar();
const authStore = useAuthStore();
const companyStore = useCompanyStore();
// const emailService = useEmailService(); // Désactivé - SMTP non configuré

const email       = ref('');
const password    = ref('');
const showPassword = ref(false);
const loading     = ref(false);

const step        = ref<'credentials' | 'otp'>('credentials');
const otpPhone    = ref('');
// const otpEmail    = ref(''); // Désactivé - fallback email OTP supprimé
const otpCode     = ref('');
const loadingOtp  = ref(false);
const loadingResend = ref(false);

async function onSubmit() {
  loading.value = true;
  try {
    await authStore.login(email.value, password.value);
    if (authStore.companyId) {
      await companyStore.loadCompanies(authStore.companyId);
    }

    const phone = authStore.phone as string | undefined;
    const twoFaEnabled = authStore.twoFaEnabled;
    if (phone && twoFaEnabled) {
      await sendOtp(phone);
      otpPhone.value = phone.replace(/^\+?/, '');
      step.value = 'otp';
    } else {
      // ⚠️ Fallback email OTP désactivé (problème SMTP - mail.wimrux.app non configuré)
      // TODO: Réactiver quand le SMTP sera opérationnel
      // Pour l'instant, connexion directe sans 2FA si pas de téléphone
      console.warn('[2FA] Email OTP désactivé - connexion directe (pas de téléphone configuré)');
      await finalizeLogin();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur de connexion';
    $q.notify({ type: 'negative', message });
  } finally {
    loading.value = false;
  }
}

async function sendOtp(phone: string) {
  const token = authStore.accessToken as string;
  const res = await fetch(`${APPWRITE_ENDPOINT}/functions/send-otp-whatsapp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) {
    const err = await res.json() as { error?: string };
    throw new Error(err.error || 'Envoi OTP échoué');
  }
}

async function onVerifyOtp() {
  loadingOtp.value = true;
  try {
    const token = authStore.accessToken as string;
    const res = await fetch(`${APPWRITE_ENDPOINT}/functions/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ code: otpCode.value }),
    });
    const data = await res.json() as { success?: boolean; error?: string };
    if (!data.success) throw new Error(data.error || 'Code invalide');
    await finalizeLogin();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur vérification OTP';
    $q.notify({ type: 'negative', message });
  } finally {
    loadingOtp.value = false;
  }
}

async function resendOtp() {
  loadingResend.value = true;
  try {
    await sendOtp(otpPhone.value);
    $q.notify({ type: 'info', message: 'Nouveau code envoyé via WhatsApp' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur renvoi OTP';
    $q.notify({ type: 'negative', message });
  } finally {
    loadingResend.value = false;
  }
}

function cancelOtp() {
  authStore.logout();
  step.value = 'credentials';
  otpCode.value = '';
}

async function finalizeLogin() {
  const redirect = (route.query.redirect as string) || '/app';
  await router.push(redirect);
  $q.notify({ type: 'positive', message: `Bienvenue, ${authStore.fullName || 'utilisateur'}` });
}

async function loginWithOAuth(provider: 'google' | 'github') {
  try {
    await appwriteAuth.signInWithOAuth(provider);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur OAuth';
    $q.notify({ type: 'negative', message });
  }
}
</script>
