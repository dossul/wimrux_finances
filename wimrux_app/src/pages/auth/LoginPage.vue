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

    <q-card-section v-if="step === 'credentials'" class="text-center text-caption text-grey">
      Contactez votre administrateur pour obtenir un compte
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store-appwrite';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import { functions } from 'src/boot/appwrite';
// import { useEmailService } from 'src/composables/useEmailService'; // Désactivé - SMTP non configuré



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
  const debug: string[] = [];
  try {
    debug.push('1. login start');
    await authStore.login(email.value, password.value);
    debug.push('2. login done');
    if (authStore.companyId) {
      debug.push('3. loadCompanies start');
      await companyStore.loadCompanies(authStore.companyId);
      debug.push('4. loadCompanies done');
    }

    const phone = authStore.phone as string | undefined;
    const twoFaEnabled = authStore.twoFaEnabled;
    debug.push(`5. phone=${phone}, 2fa=${twoFaEnabled}`);
    if (phone && twoFaEnabled) {
      debug.push('6. sendOtp start');
      await sendOtp(phone);
      debug.push('7. sendOtp done');
      otpPhone.value = phone.replace(/^\+?/, '');
      step.value = 'otp';
      debug.push('8. step=otp');
    } else {
      debug.push('6. finalizeLogin start');
      await finalizeLogin();
      debug.push('7. finalizeLogin done');
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur de connexion';
    debug.push(`ERROR: ${message}`);
    $q.notify({ type: 'negative', message });
  } finally {
    (window as any).__loginDebug = debug;
    loading.value = false;
  }
}

async function sendOtp(phone: string) {
  try {
    // Utilise le SDK Appwrite (session cookie incluse automatiquement)
    const result = await functions.createExecution(
      'send-otp-whatsapp',
      JSON.stringify({ phone }),
      false, // synchrone
    );
    (window as any).__sendOtpResult = result;
    if (result.responseStatusCode !== 200) {
      console.warn('[Login] sendOtp failed:', result.responseBody);
    }
  } catch (err: any) {
    // Ne pas bloquer le login si la fonction n'existe pas encore
    console.warn('[Login] sendOtp error (non-bloquant):', err?.message || err);
  }
}

async function onVerifyOtp() {
  loadingOtp.value = true;
  try {
    // Utilise le SDK Appwrite (session cookie incluse automatiquement)
    const result = await functions.createExecution(
      'verify-otp',
      JSON.stringify({ code: otpCode.value }),
      false, // synchrone
    );
    let data: { success?: boolean; error?: string } = {};
    try { data = JSON.parse(result.responseBody); } catch { /* garde {} */ }
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
</script>
