<template>
  <q-page padding>
    <div class="row items-center justify-between q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Wallets de paiement</div>
        <div class="text-caption text-grey-7">Mobile Money, cartes prépayées, e-wallets</div>
      </div>
      <q-btn color="primary" icon="add" label="Nouveau wallet" no-caps @click="openCreate" />
    </div>

    <!-- KPI Row -->
    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section>
            <div class="text-caption text-grey-7">Total wallets</div>
            <div class="text-h5 text-weight-bold">{{ wallets.length }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section>
            <div class="text-caption text-grey-7">Actifs</div>
            <div class="text-h5 text-weight-bold text-positive">{{ activeCount }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section>
            <div class="text-caption text-grey-7">Solde total (XOF)</div>
            <div class="text-h5 text-weight-bold text-primary">{{ fmtAmount(totalBalance) }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="kpi-card">
          <q-card-section>
            <div class="text-caption text-grey-7">Mobile Money</div>
            <div class="text-h5 text-weight-bold">{{ mobileMoneyCount }}</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Wallets Grid -->
    <div v-if="loading" class="row q-col-gutter-md">
      <div v-for="n in 4" :key="n" class="col-12 col-md-6 col-lg-4">
        <q-skeleton type="rect" height="120px" />
      </div>
    </div>
    <div v-else-if="wallets.length === 0" class="text-center q-pa-xl text-grey-6">
      <q-icon name="account_balance_wallet" size="64px" class="q-mb-md" />
      <div class="text-subtitle1">Aucun wallet configuré</div>
      <q-btn color="primary" label="Créer un wallet" no-caps class="q-mt-md" @click="openCreate" />
    </div>
    <div v-else class="row q-col-gutter-md">
      <div v-for="w in wallets" :key="w.id" class="col-12 col-md-6 col-lg-4">
        <q-card flat bordered :class="w.is_active ? '' : 'opacity-60'">
          <q-card-section>
            <div class="row items-center q-mb-sm">
              <q-icon :name="categoryIcon(w.category)" size="28px" color="primary" class="q-mr-sm" />
              <div class="col">
                <div class="text-subtitle2 text-weight-bold">{{ w.display_name }}</div>
                <div class="text-caption text-grey-7">{{ categoryLabel(w.category) }}</div>
              </div>
              <q-badge :color="w.is_active ? 'positive' : 'grey'" :label="w.is_active ? 'Actif' : 'Inactif'" />
            </div>
            <div class="row items-center q-gutter-sm q-mt-xs">
              <div class="col">
                <div class="text-caption text-grey-7">Solde</div>
                <div class="text-subtitle1 text-weight-bold text-primary">{{ fmtAmount(w.current_balance ?? 0) }} {{ w.currency }}</div>
              </div>
              <div v-if="w.identifier_masked" class="col">
                <div class="text-caption text-grey-7">Identifiant</div>
                <div class="text-caption text-weight-medium">{{ w.identifier_masked }}</div>
              </div>
            </div>
            <div v-if="w.account_holder" class="text-caption text-grey-6 q-mt-xs">{{ w.account_holder }}</div>
          </q-card-section>
          <q-separator />
          <q-card-actions align="right">
            <q-btn flat icon="list_alt" size="sm" color="primary" label="Transactions" no-caps
              :to="`/app/wallets/${w.id}/transactions`" />
            <q-btn flat icon="edit" size="sm" color="grey-7" @click="openEdit(w)" />
            <q-btn flat icon="delete" size="sm" color="negative" @click="confirmDelete(w)" />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <!-- Dialog création/édition -->
    <q-dialog v-model="showDialog" persistent>
      <q-card style="min-width: 420px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editTarget ? 'Modifier' : 'Nouveau wallet' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-md">
          <q-select v-model="form.category" :options="categoryOptions" label="Catégorie *" emit-value map-options outlined dense />
          <q-input v-model="form.display_name" label="Nom d'affichage *" outlined dense />
          <q-input v-model="form.account_holder" label="Titulaire du compte" outlined dense />
          <q-input v-model="form.identifier" label="Identifiant (N° de compte / téléphone)" outlined dense />
          <q-select v-model="form.currency" :options="['XOF', 'XAF', 'EUR', 'USD', 'GHS', 'NGN']" label="Devise" outlined dense />
          <q-select v-model="form.country_code" :options="countryOptions" label="Pays" emit-value map-options outlined dense clearable />
          <q-input v-model.number="form.current_balance" label="Solde initial (XOF)" type="number" outlined dense />
          <q-input v-model="form.notes" label="Notes" outlined dense type="textarea" rows="2" />
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" :label="editTarget ? 'Enregistrer' : 'Créer'" no-caps :loading="loading" @click="onSubmit" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { usePaymentWallets } from 'src/composables/usePaymentWallets';
import type { PaymentWallet, PaymentWalletInput } from 'src/composables/usePaymentWallets';

const $q = useQuasar();
const { wallets, loading, error, loadWallets, createWallet, updateWallet, deleteWallet, categoryIcon, categoryLabel } = usePaymentWallets();

const activeCount    = computed(() => wallets.value.filter(w => w.is_active).length);
const totalBalance   = computed(() => wallets.value.reduce((s, w) => s + (w.current_balance ?? 0), 0));
const mobileMoneyCount = computed(() => wallets.value.filter(w => w.category === 'mobile_money').length);

function fmtAmount(n: number): string { return Number(n).toLocaleString('fr-FR'); }

const categoryOptions = [
  { label: 'Mobile Money', value: 'mobile_money' },
  { label: 'Visa Prépayé', value: 'visa_prepaid' },
  { label: 'Mastercard Prépayé', value: 'mastercard_prepaid' },
  { label: 'Cryptomonnaie', value: 'crypto' },
  { label: 'PayPal', value: 'paypal' },
  { label: 'Stripe', value: 'stripe' },
  { label: 'Autre', value: 'other' },
];
const countryOptions = [
  { label: 'Burkina Faso', value: 'BF' },
  { label: 'Côte d\'Ivoire', value: 'CI' },
  { label: 'Sénégal', value: 'SN' },
  { label: 'Mali', value: 'ML' },
  { label: 'Togo', value: 'TG' },
  { label: 'Bénin', value: 'BJ' },
  { label: 'Guinée', value: 'GN' },
  { label: 'Cameroun', value: 'CM' },
  { label: 'Niger', value: 'NE' },
  { label: 'France', value: 'FR' },
];

const showDialog  = ref(false);
const editTarget  = ref<PaymentWallet | null>(null);
const emptyForm   = (): PaymentWalletInput => ({
  category: 'mobile_money', display_name: '', identifier: null,
  account_holder: null, currency: 'XOF', country_code: null, current_balance: 0, notes: null,
});
const form = ref<PaymentWalletInput>(emptyForm());

function openCreate() { editTarget.value = null; form.value = emptyForm(); showDialog.value = true; }
function openEdit(w: PaymentWallet) {
  editTarget.value = w;
  form.value = {
    category: w.category, display_name: w.display_name, identifier: w.identifier,
    account_holder: w.account_holder, currency: w.currency, country_code: w.country_code,
    current_balance: w.current_balance ?? 0, notes: w.notes,
  };
  showDialog.value = true;
}

async function onSubmit() {
  if (!form.value.display_name) { $q.notify({ type: 'negative', message: 'Nom requis' }); return; }
  if (editTarget.value) {
    const ok = await updateWallet(editTarget.value.id, form.value);
    if (ok) { showDialog.value = false; $q.notify({ type: 'positive', message: 'Wallet modifié' }); }
    else $q.notify({ type: 'negative', message: error.value ?? 'Erreur' });
  } else {
    const w = await createWallet(form.value);
    if (w) { showDialog.value = false; $q.notify({ type: 'positive', message: 'Wallet créé' }); }
    else $q.notify({ type: 'negative', message: error.value ?? 'Erreur' });
  }
}

function confirmDelete(w: PaymentWallet) {
  $q.dialog({ title: 'Supprimer', message: `Supprimer "${w.display_name}" et toutes ses transactions ?`, cancel: true, ok: { color: 'negative', label: 'Supprimer' } })
    .onOk(() => {
      void deleteWallet(w.id).then(ok => {
        if (ok) $q.notify({ type: 'positive', message: 'Wallet supprimé' });
        else $q.notify({ type: 'negative', message: error.value ?? 'Erreur' });
      });
    });
}

onMounted(() => { void loadWallets(); });
</script>

<style scoped>
.kpi-card { min-width: 100px; }
</style>
