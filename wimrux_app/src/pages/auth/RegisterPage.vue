<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="text-h6 text-center">Inscription</div>
    </q-card-section>

    <q-card-section>
      <q-form @submit.prevent="onSubmit" class="q-gutter-md">
        <q-input
          v-model="companyIfu"
          label="IFU de l'entreprise"
          filled
          data-testid="reg-ifu"
          hint="Saisissez l'IFU pour rejoindre votre entreprise"
          :rules="[val => !!val || 'IFU requis']"
          :error="!!ifuError"
          :error-message="ifuError"
          @update:model-value="ifuError = ''"
        >
          <template v-slot:prepend><q-icon name="business" /></template>
          <template v-slot:after>
            <q-btn flat dense icon="search" :loading="verifyingIfu" @click="verifyIfu" />
          </template>
        </q-input>

        <q-banner v-if="companyFound" class="bg-green-1 text-green-9 rounded-borders q-mb-sm" dense>
          <template v-slot:avatar><q-icon name="check_circle" color="green" /></template>
          <strong>{{ companyFound.name }}</strong><br />
          <span class="text-caption">RCCM: {{ companyFound.rccm }}</span>
        </q-banner>

        <q-input
          v-model="fullName"
          label="Nom complet"
          filled
          data-testid="reg-fullname"
          :rules="[val => !!val || 'Nom requis']"
        >
          <template v-slot:prepend><q-icon name="person" /></template>
        </q-input>

        <q-input
          v-model="email"
          label="Adresse email"
          type="email"
          filled
          data-testid="reg-email"
          :rules="[val => !!val || 'Email requis', val => /.+@.+\..+/.test(val) || 'Email invalide']"
        >
          <template v-slot:prepend><q-icon name="email" /></template>
        </q-input>

        <q-input
          v-model="password"
          label="Mot de passe"
          :type="showPassword ? 'text' : 'password'"
          filled
          data-testid="reg-password"
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

        <q-select
          v-model="role"
          :options="roleOptions"
          emit-value
          map-options
          label="Rôle"
          filled
          data-testid="reg-role"
        >
          <template v-slot:prepend><q-icon name="badge" /></template>
        </q-select>

        <q-btn
          type="submit"
          label="S'inscrire"
          data-testid="reg-submit"
          color="primary"
          class="full-width"
          size="lg"
          :loading="loading"
          :disable="!companyFound"
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
import { useEmailService } from 'src/composables/useEmailService';
import type { Company, UserRole } from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';

const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();
const emailService = useEmailService();

const companyIfu = ref('');
const companyFound = ref<Company | null>(null);
const ifuError = ref('');
const verifyingIfu = ref(false);
const fullName = ref('');
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const loading = ref(false);
const role = ref<UserRole>('caissier');

const roleOptions = [
  { label: 'Administrateur', value: 'admin' },
  { label: 'Caissier', value: 'caissier' },
  { label: 'Auditeur', value: 'auditeur' },
];

async function verifyIfu() {
  if (!companyIfu.value.trim()) return;
  verifyingIfu.value = true;
  companyFound.value = null;
  ifuError.value = '';
  try {
    const { data, error } = await appwriteDb
      .from('companies')
      .select('*')
      .eq('ifu', companyIfu.value.trim())
      .limit(1);

    if (error) throw new Error(error.message);
    const rows = data as Company[];
    if (rows.length === 0) {
      ifuError.value = 'Aucune entreprise trouvée avec cet IFU';
    } else {
      companyFound.value = rows[0] ?? null;
    }
  } catch (err: unknown) {
    ifuError.value = err instanceof Error ? err.message : 'Erreur de vérification';
  } finally {
    verifyingIfu.value = false;
  }
}

async function onSubmit() {
  if (!companyFound.value) {
    $q.notify({ type: 'warning', message: 'Veuillez d\'abord vérifier l\'IFU de votre entreprise' });
    return;
  }

  loading.value = true;
  try {
    const data = await authStore.register(email.value, password.value, fullName.value);

    // Create user_profile linked to company
    if (data) {
      const userId = (data as any)?.$id ?? (data as any)?.id ?? null;
      if (userId && companyFound.value) {
        await appwriteDb.from('user_profiles').insert({
          user_id: userId,
          company_id: companyFound.value.id,
          role: role.value,
          full_name: fullName.value,
        });
      }
    }

    // E03 — Email de bienvenue
    try {
      await emailService.sendWelcomeEmail(email.value, fullName.value);
    } catch (err) {
      console.error('[Register] Failed to send welcome email:', err);
      $q.notify({ type: 'warning', message: 'Compte créé, mais l\'email de bienvenue n\'a pas pu être envoyé' });
    }

    $q.notify({ type: 'positive', message: 'Inscription réussie ! Un email de bienvenue vous a été envoyé.' });
    await router.push('/');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur d\'inscription';
    $q.notify({ type: 'negative', message });
  } finally {
    loading.value = false;
  }
}
</script>
