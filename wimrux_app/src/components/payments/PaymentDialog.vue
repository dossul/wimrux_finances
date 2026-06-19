<template>
  <q-dialog v-model="open" persistent>
    <q-card style="min-width:520px;max-width:600px">

      <!-- Header -->
      <q-card-section class="row items-center q-pb-none" style="background:#f8f9fa;border-bottom:1px solid #eee">
        <q-icon name="payments" color="positive" size="22px" class="q-mr-sm" />
        <div class="text-h6 text-weight-bold">Enregistrer un paiement</div>
        <q-space />
        <q-btn flat round dense icon="close" @click="$emit('update:modelValue', false)" />
      </q-card-section>

      <q-card-section v-if="invoice" class="q-pt-md q-pb-sm">

        <!-- Recap -->
        <q-banner dense rounded class="bg-blue-1 text-blue-9 q-mb-md">
          <template #avatar><q-icon name="receipt" color="blue-7" /></template>
          <strong>{{ invoice.reference }}</strong>
          &nbsp;·&nbsp;Fournisseur : <strong>{{ invoice.suppliers?.name ?? '—' }}</strong>
          &nbsp;·&nbsp;Restant :
          <strong class="text-negative">{{ fmtAmt(invoice.total_ttc - invoice.paid_amount) }} FCFA</strong>
        </q-banner>

        <div class="q-gutter-sm">

          <!-- Date + Montant -->
          <div class="row q-gutter-sm">
            <q-input v-model="form.payment_date" label="Date *" type="date" outlined dense class="col" data-testid="payment-date" />
            <q-input v-model.number="form.amount" label="Montant * (FCFA)" type="number" outlined dense class="col" min="1" data-testid="payment-amount" />
          </div>

          <!-- Moyen de paiement -->
          <q-select v-model="form.payment_method" :options="methodOptions" label="Moyen de paiement *"
            emit-value map-options outlined dense @update:model-value="onMethodChange" data-testid="payment-method">
            <template #prepend><q-icon :name="methodIcon" color="grey-7" /></template>
          </q-select>

          <!-- ── VIREMENT / CHEQUE ── -->
          <template v-if="isBank">
            <q-input v-model="form.reference" :label="refLabel" outlined dense :hint="refHint" data-testid="payment-reference" />
            <!-- Sélect compte + bouton ajout inline -->
            <div class="row items-center q-gutter-xs">
              <q-select v-model="form.bank_account_id" :options="bankAccountOptions"
                :label="form.payment_method === 'check' ? 'Banque tirée' : 'Compte bancaire'"
                emit-value map-options clearable outlined dense class="col" data-testid="payment-bank-account" />
              <q-btn flat round dense icon="add_circle" color="primary" size="sm" title="Ajouter un compte"
                @click="showAddBank = true" data-testid="payment-add-bank-btn" />
            </div>
          </template>

          <!-- ── MOBILE MONEY ── -->
          <template v-if="form.payment_method === 'mobile_money'">
            <q-input v-model="form.reference" label="N° de transaction" outlined dense hint="Ex : MP26051200001" />
            <!-- Pays -->
            <q-select v-model="form.mm_country" :options="countryOptions" label="Pays *"
              emit-value map-options outlined dense @update:model-value="onCountryChange" />
            <!-- Opérateur -->
            <q-select v-model="form.mm_provider_id" :options="providerOptions" label="Opérateur *"
              emit-value map-options outlined dense :disable="!form.mm_country && !form.wallet_id" />
            <!-- Numéro + ajout wallet -->
            <div class="row items-center q-gutter-xs">
              <q-select v-model="form.wallet_id" :options="walletOptions" label="Numéro enregistré"
                emit-value map-options clearable outlined dense class="col"
                @update:model-value="onWalletSelect" />
              <q-btn flat round dense icon="add_circle" color="primary" size="sm" title="Ajouter un numéro"
                @click="showAddWallet = true" />
            </div>
            <q-input v-model="form.phone_number" label="Numéro de téléphone *" outlined dense
              hint="Ex : +226 70 00 00 00" />
          </template>

          <!-- ── CARTE BANCAIRE ── -->
          <template v-if="form.payment_method === 'card'">
            <q-input v-model="form.reference" label="N° de transaction" outlined dense hint="Ex : TXN-XXXX-XXXX" />
            <div class="row items-center q-gutter-xs">
              <q-select v-model="form.card_id" :options="cardOptions" label="Carte bancaire"
                emit-value map-options clearable outlined dense class="col" />
              <q-btn flat round dense icon="add_circle" color="primary" size="sm" title="Ajouter une carte"
                @click="showAddCard = true" />
            </div>
          </template>

          <!-- Notes -->
          <q-input v-model="form.notes" label="Notes" outlined dense type="textarea" rows="2" />

          <!-- Justificatif -->
          <div>
            <div class="text-caption text-grey-7 q-mb-xs">Justificatif (optionnel)</div>
            <div class="proof-zone row items-center justify-center q-pa-sm rounded-borders cursor-pointer"
              :class="{ 'proof-active': dragOver, 'proof-done': !!proofUrl }"
              @dragover.prevent="dragOver = true" @dragleave="dragOver = false"
              @drop.prevent="onDrop" @click="fileInput?.click()">
              <q-spinner-dots v-if="uploading" color="positive" size="20px" />
              <template v-else-if="proofUrl">
                <q-icon name="check_circle" color="positive" size="18px" />
                <span class="q-ml-xs text-caption text-positive">{{ proofName }}</span>
                <q-btn flat round dense icon="close" size="xs" color="grey" class="q-ml-sm" @click.stop="clearProof" />
              </template>
              <template v-else>
                <q-icon name="upload_file" color="grey-5" size="18px" />
                <span class="q-ml-xs text-caption text-grey-6">Glisser ou cliquer — PDF, JPG, PNG</span>
              </template>
            </div>
            <input ref="fileInput" type="file" accept=".pdf,.jpg,.jpeg,.png,.tiff" class="hidden" @change="onFilePick" />
          </div>
        </div>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat label="Annuler" @click="$emit('update:modelValue', false)" />
        <q-btn color="positive" icon="check" label="Enregistrer" :loading="saving || uploading" @click="submit" data-testid="payment-save-btn" />
      </q-card-actions>
    </q-card>

    <!-- ── Mini-dialog : Nouveau compte bancaire ── -->
    <q-dialog v-model="showAddBank" persistent data-testid="payment-bank-dialog">
      <q-card style="min-width:380px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-subtitle1 text-weight-bold">Nouveau compte bancaire</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input v-model="bankForm.bank_name" label="Nom de la banque *" outlined dense data-testid="payment-bank-name" />
          <q-input v-model="bankForm.account_number" label="N° de compte *" outlined dense data-testid="payment-bank-number" />
          <q-input v-model="bankForm.account_holder" label="Titulaire" outlined dense data-testid="payment-bank-holder" />
          <q-input v-model="bankForm.iban" label="IBAN" outlined dense data-testid="payment-bank-iban" />
          <q-input v-model="bankForm.bic" label="BIC / SWIFT" outlined dense data-testid="payment-bank-bic" />
          <q-select v-model="bankForm.currency" :options="['XOF','EUR','USD','GBP']"
            label="Devise" outlined dense data-testid="payment-bank-currency" />
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" label="Créer" :loading="bankLoading" @click="saveBank" data-testid="payment-bank-create-btn" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── Mini-dialog : Nouvelle carte bancaire ── -->
    <q-dialog v-model="showAddCard" persistent>
      <q-card style="min-width:380px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-subtitle1 text-weight-bold">Nouvelle carte bancaire</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <!-- Réseau -->
          <div class="row q-gutter-sm">
            <q-select v-model="cardForm.network" :options="networkOptions" label="Réseau *"
              emit-value map-options outlined dense class="col" />
            <q-select v-model="cardForm.card_type" :options="cardTypeOptions" label="Type *"
              emit-value map-options outlined dense class="col" />
          </div>
          <!-- Numéros -->
          <div class="row q-gutter-sm">
            <q-input v-model="cardForm.bin_6" label="6 premiers chiffres" outlined dense class="col"
              mask="######" hint="BIN de la carte" />
            <q-input v-model="cardForm.last_4" label="4 derniers *" outlined dense class="col"
              mask="####" />
          </div>
          <!-- Expiration -->
          <div class="row q-gutter-sm">
            <q-input v-model.number="cardForm.expiry_month" label="Mois exp. *" type="number"
              outlined dense class="col" min="1" max="12" />
            <q-input v-model.number="cardForm.expiry_year" label="Année exp. *" type="number"
              outlined dense class="col" :min="new Date().getFullYear()" />
          </div>
          <q-input v-model="cardForm.bank_name" label="Banque émettrice" outlined dense />
          <q-input v-model="cardForm.label" label="Libellé (optionnel)" outlined dense hint="Ex : Carte voyage" />
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" label="Créer" :loading="cardLoading" @click="saveCard" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- ── Mini-dialog : Nouveau wallet Mobile Money ── -->
    <q-dialog v-model="showAddWallet" persistent>
      <q-card style="min-width:380px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-subtitle1 text-weight-bold">Nouveau numéro Mobile Money</div>
          <q-space /><q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-select v-model="walletForm.mm_country" :options="countryOptions" label="Pays *"
            emit-value map-options outlined dense @update:model-value="walletForm.provider = ''" />
          <q-select v-model="walletForm.provider" :options="walletProviderOptions" label="Opérateur *"
            emit-value map-options outlined dense :disable="!walletForm.mm_country" />
          <q-input v-model="walletForm.phone_number" label="Numéro de téléphone *" outlined dense />
          <q-input v-model="walletForm.account_name" label="Nom du compte" outlined dense />
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" label="Enregistrer" :loading="walletLoading" @click="saveWallet" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useInvoicePayments } from 'src/composables/useInvoicePayments';
import { useBankAccounts } from 'src/composables/useBankAccounts';
import { usePaymentCards } from 'src/composables/usePaymentCards';
import { useMobileMoneyProviders } from 'src/composables/useMobileMoneyProviders';
import type { ReceivedInvoice } from 'src/composables/useReceivedInvoices';
import { appwriteStorage } from 'src/services/appwrite-storage';
import { functions } from 'src/boot/appwrite';

// ── Props / Emits ─────────────────────────────────────────────────────────────
const props = defineProps<{ modelValue: boolean; invoice: ReceivedInvoice | null }>();
const emit  = defineEmits<{ (e: 'update:modelValue', v: boolean): void; (e: 'saved'): void }>();
const open  = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

// ── Services ──────────────────────────────────────────────────────────────────
const $q = useQuasar();
const { addPayment } = useInvoicePayments();
const { accounts, loadAccounts, createAccount }        = useBankAccounts();
const { cards, loadCards, createCard, cardLabel }      = usePaymentCards();
const { providers, wallets, loadProviders, loadWallets, createWallet, getCountries, getProvidersByCountry } = useMobileMoneyProviders();

onMounted(() => { void Promise.all([loadAccounts(), loadCards(), loadProviders(), loadWallets()]); });

// ── Formulaire principal ──────────────────────────────────────────────────────
const form = ref({
  payment_date:   new Date().toISOString().split('T')[0] ?? '',
  amount:         0,
  payment_method: 'bank_transfer' as string,
  reference:      null as string | null,
  bank_account_id: null as string | null,
  card_id:        null as string | null,
  wallet_id:      null as string | null,
  phone_number:   null as string | null,
  mm_country:     null as string | null,
  mm_provider_id: null as string | null,
  notes:          null as string | null,
});
const saving = ref(false);

watch(() => props.invoice, (inv) => {
  if (!inv) return;
  form.value = {
    payment_date:   new Date().toISOString().split('T')[0] ?? '',
    amount:         Math.max(0, Number(inv.total_ttc) - Number(inv.paid_amount)),
    payment_method: 'bank_transfer',
    reference:      null, bank_account_id: null, card_id: null,
    wallet_id: null, phone_number: null,
    mm_country: null, mm_provider_id: null, notes: null,
  };
  proofUrl.value  = null;
  proofName.value = '';
}, { immediate: true });

function onMethodChange() {
  form.value.reference = null;
  form.value.bank_account_id = null;
  form.value.card_id = null;
  form.value.wallet_id = null;
  form.value.phone_number = null;
}

// ── Computed champs dynamiques ────────────────────────────────────────────────
const isBank = computed(() => ['bank_transfer', 'check'].includes(form.value.payment_method));

const methodOptions = [
  { label: 'Virement bancaire', value: 'bank_transfer' },
  { label: 'Chèque',            value: 'check' },
  { label: 'Mobile Money',      value: 'mobile_money' },
  { label: 'Carte bancaire',    value: 'card' },
  { label: 'Espèces',           value: 'cash' },
  { label: 'Autre',             value: 'other' },
];
const methodIcons: Record<string, string> = {
  bank_transfer: 'account_balance', check: 'edit_note',
  mobile_money: 'smartphone', card: 'credit_card', cash: 'payments', other: 'more_horiz',
};
const methodIcon = computed(() => methodIcons[form.value.payment_method] ?? 'payments');

const refLabel = computed(() => ({
  bank_transfer: 'N° de virement', check: 'N° de chèque',
  mobile_money: 'N° de transaction', card: 'N° de transaction', other: 'Référence',
}[form.value.payment_method] ?? 'Référence'));

const refHint = computed(() => ({
  bank_transfer: 'Ex : VIR-2026-00412', check: 'Ex : 0012345',
  mobile_money: 'Ex : MP26051200001', card: 'Ex : TXN-XXXX-XXXX',
}[form.value.payment_method] ?? ''));

// ── Options des sélects ───────────────────────────────────────────────────────
const bankAccountOptions = computed(() =>
  accounts.value.filter(a => a.is_active).map(a => ({
    label: `${a.bank_name} — ${a.account_number}`,
    value: a.id,
  }))
);
const cardOptions = computed(() =>
  cards.value.map(c => ({ label: cardLabel(c), value: c.id }))
);
const countryOptions = computed(() =>
  getCountries().map(c => ({ label: c.name, value: c.code }))
);
const providerOptions = computed(() => {
  // Si un pays est sélectionné → filtrer ; sinon tous les providers (pour affichage après wallet select)
  if (!form.value.mm_country) {
    return providers.value.map(p => ({ label: p.name, value: p.code }));
  }
  return getProvidersByCountry(form.value.mm_country).map(p => ({ label: p.name, value: p.code }));
});
const walletOptions = computed(() =>
  // Tous les wallets — le filtre se fait via providerOptions apres selection
  wallets.value.map(w => ({
    label: `${w.phone_number}${w.account_name ? ' · ' + w.account_name : ''}`,
    value: w.id,
  }))
);

function onCountryChange() {
  // Reset opérateur et numéro enregistré uniquement si l'utilisateur change
  // manuellement le pays (pas en cascade depuis onWalletSelect)
  form.value.mm_provider_id = null;
  form.value.wallet_id      = null;
  form.value.phone_number   = null;
}

function onWalletSelect(id: string | null) {
  if (!id) {
    // Désélection : ne pas toucher aux autres champs
    return;
  }
  const w = wallets.value.find(w => w.id === id);
  if (!w) return;
  // Trouver le provider pour déduire le pays
  const provider = providers.value.find(p => p.code === w.provider);
  const country  = provider?.country_codes?.[0] ?? null;
  // Tout remplir d'un coup — sans déclencher les watchers de cascade
  form.value.phone_number   = w.phone_number;
  form.value.mm_provider_id = w.provider;
  form.value.mm_country     = country;
}

// ── Upload justificatif ───────────────────────────────────────────────────────
const fileInput  = ref<HTMLInputElement | null>(null);
const proofUrl   = ref<string | null>(null);
const proofName  = ref('');
const uploading  = ref(false);
const dragOver   = ref(false);

async function uploadProof(file: File) {
  uploading.value = true;
  try {
    const safeName = file.name.normalize('NFKD').replace(/[^\w.\-]+/g, '_').replace(/_+/g, '_');
    const key = `payments/${Date.now()}-${safeName}`;
    const { data, error: err } = await appwriteStorage.upload('invoices-scans', file, key);
    if (err) { $q.notify({ type: 'negative', message: `Upload échoué : ${err.message}` }); return; }
    proofUrl.value  = (data as { url: string }).url;
    proofName.value = file.name;
  } finally { uploading.value = false; }
}
function onFilePick(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (f) void uploadProof(f);
  if (fileInput.value) fileInput.value.value = '';
}
function onDrop(e: DragEvent) {
  dragOver.value = false;
  const f = e.dataTransfer?.files?.[0];
  if (f) void uploadProof(f);
}
function clearProof() { proofUrl.value = null; proofName.value = ''; }

// ── Ajout inline : compte bancaire ───────────────────────────────────────────
const showAddBank = ref(false);
const bankLoading = ref(false);
const bankForm = ref({ bank_name: '', account_number: '', account_holder: '', iban: '', bic: '', currency: 'XOF' });

async function saveBank() {
  if (!bankForm.value.bank_name || !bankForm.value.account_number) {
    $q.notify({ type: 'warning', message: 'Banque et N° de compte obligatoires' }); return;
  }
  bankLoading.value = true;
  try {
    const created = await createAccount({
      bank_name:           bankForm.value.bank_name,
      account_number:      bankForm.value.account_number,
      account_holder:      bankForm.value.account_holder || null,
      iban:                bankForm.value.iban || null,
      bic:                 bankForm.value.bic || null,
      currency:            bankForm.value.currency,
      is_active:           true,
      bank_code:           null,
      opening_balance:     0,
      current_balance:     0,
      treasury_account_id: null,
    });
    form.value.bank_account_id = created.id;
    showAddBank.value = false;
    bankForm.value = { bank_name: '', account_number: '', account_holder: '', iban: '', bic: '', currency: 'XOF' };
    $q.notify({ type: 'positive', message: 'Compte créé et sélectionné' });
  } catch (e: unknown) {
    $q.notify({ type: 'negative', message: (e as Error).message });
  } finally { bankLoading.value = false; }
}

// ── Ajout inline : carte bancaire ────────────────────────────────────────────
const showAddCard  = ref(false);
const cardLoading  = ref(false);
const networkOptions   = [
  { label: 'Visa',       value: 'visa' },
  { label: 'Mastercard', value: 'mastercard' },
  { label: 'Amex',       value: 'amex' },
  { label: 'Autre',      value: 'other' },
];
const cardTypeOptions = [
  { label: 'Débit',  value: 'debit' },
  { label: 'Crédit', value: 'credit' },
];
const cardForm = ref({
  network: 'visa', card_type: 'debit', bin_6: '', last_4: '',
  expiry_month: new Date().getMonth() + 1, expiry_year: new Date().getFullYear(),
  bank_name: '', label: '',
});

async function saveCard() {
  if (!cardForm.value.last_4 || cardForm.value.last_4.length !== 4) {
    $q.notify({ type: 'warning', message: '4 derniers chiffres obligatoires' }); return;
  }
  cardLoading.value = true;
  try {
    const created = await createCard({
      network:       cardForm.value.network as 'visa' | 'mastercard' | 'amex' | 'other',
      card_type:     cardForm.value.card_type as 'debit' | 'credit',
      bin_6:         cardForm.value.bin_6 || null,
      last_4:        cardForm.value.last_4,
      expiry_month:  Number(cardForm.value.expiry_month),
      expiry_year:   Number(cardForm.value.expiry_year),
      bank_name:     cardForm.value.bank_name || null,
      label:         cardForm.value.label || null,
      bank_account_id: null,
      is_active:     true,
    });
    if (created) { form.value.card_id = created.id; showAddCard.value = false; }
    $q.notify({ type: 'positive', message: 'Carte ajoutée et sélectionnée' });
  } catch (e: unknown) {
    $q.notify({ type: 'negative', message: (e as Error).message });
  } finally { cardLoading.value = false; }
}

// ── Ajout inline : wallet Mobile Money ───────────────────────────────────────
const showAddWallet  = ref(false);
const walletLoading  = ref(false);
const walletForm = ref({ mm_country: '', provider: '', phone_number: '', account_name: '' });
const walletProviderOptions = computed(() =>
  walletForm.value.mm_country
    ? getProvidersByCountry(walletForm.value.mm_country).map(p => ({ label: p.name, value: p.code }))
    : []
);

async function saveWallet() {
  if (!walletForm.value.provider || !walletForm.value.phone_number) {
    $q.notify({ type: 'warning', message: 'Opérateur et téléphone obligatoires' }); return;
  }
  walletLoading.value = true;
  try {
    const created = await createWallet({
      provider:     walletForm.value.provider,
      phone_number: walletForm.value.phone_number,
      account_name: walletForm.value.account_name || null,
      is_active:    true,
    });
    // Sélectionner le nouveau wallet dans le formulaire principal
    form.value.wallet_id      = created.id;
    form.value.phone_number   = created.phone_number;
    form.value.mm_provider_id = created.provider;
    // Réinitialiser et fermer
    walletForm.value  = { mm_country: '', provider: '', phone_number: '', account_name: '' };
    showAddWallet.value = false;
    $q.notify({ type: 'positive', message: 'Numéro enregistré et sélectionné', icon: 'check_circle' });
  } catch (e: unknown) {
    $q.notify({ type: 'negative', message: (e as Error).message });
  } finally {
    walletLoading.value = false;
  }
}

// ── Soumission paiement ───────────────────────────────────────────────────────
async function submit() {
  if (!props.invoice || form.value.amount <= 0) {
    $q.notify({ type: 'warning', message: 'Montant invalide' }); return;
  }

  const restant = Math.max(0, Number(props.invoice.total_ttc) - Number(props.invoice.paid_amount));
  const isPartial = form.value.amount < restant;

  // Confirmation si paiement partiel
  if (isPartial) {
    const pct = Math.round((form.value.amount / restant) * 100);
    const ok = await new Promise<boolean>(resolve => {
      $q.dialog({
        title: 'Paiement partiel',
        message: `Vous réglez <strong>${fmtAmt(form.value.amount)} FCFA</strong> sur <strong>${fmtAmt(restant)} FCFA</strong> dus (<strong>${pct}%</strong>).<br>La facture passera au statut <em>Partiel</em>. Confirmer ?`,
        html: true,
        cancel: { label: 'Annuler', flat: true },
        ok: { label: 'Confirmer', color: 'orange' },
        persistent: true,
      }).onOk(() => resolve(true)).onCancel(() => resolve(false)).onDismiss(() => resolve(false));
    });
    if (!ok) return;
  }

  saving.value = true;
  try {
    const notesParts = [
      form.value.notes ?? '',
      form.value.payment_method === 'mobile_money' && form.value.phone_number
        ? `Tél : ${form.value.phone_number}` : '',
      proofUrl.value ? `Justificatif : ${proofUrl.value}` : '',
    ].filter(Boolean);

    await addPayment({
      invoice_id:      props.invoice.id,
      payment_date:    form.value.payment_date,
      amount:          form.value.amount,
      payment_method:  form.value.payment_method as never,
      reference:       form.value.reference ?? null,
      bank_account_id: isBank.value ? (form.value.bank_account_id ?? null) : null,
      notes:           notesParts.join(' | ') || null,
    });
    emit('saved');
    emit('update:modelValue', false);
    $q.notify({
      type:    'positive',
      icon:    'check_circle',
      message: isPartial ? 'Paiement partiel enregistré' : 'Facture soldée — paiement enregistré',
      timeout: 3000,
    });

    // D3 : si paiement total ET fournisseur a un email → proposer envoi reçu
    if (!isPartial) {
      const supplierEmail = props.invoice.suppliers?.email ?? null;
      if (supplierEmail) {
        $q.dialog({
          title: 'Envoyer un accusé de paiement ?',
          message: `Envoyer un reçu de paiement à <strong>${props.invoice.suppliers?.name ?? supplierEmail}</strong> (${supplierEmail}) ?`,
          html: true,
          cancel: { label: 'Non', flat: true },
          ok: { label: 'Envoyer', color: 'positive', icon: 'email' },
        }).onOk(async () => {
          try {
            await functions.createExecution('send-email', JSON.stringify({
              to: supplierEmail,
              template: 'payment_confirmed',
              vars: {
                client_name:    props.invoice!.suppliers?.name ?? '',
                invoice_ref:    props.invoice!.reference,
                amount:         fmtAmt(form.value.amount),
                currency:       'FCFA',
                payment_date:   form.value.payment_date,
                payment_method: methodOptions.find(m => m.value === form.value.payment_method)?.label ?? form.value.payment_method,
              },
            }));
            $q.notify({ type: 'positive', icon: 'email', message: `Reçu envoyé à ${supplierEmail}` });
          } catch {
            $q.notify({ type: 'warning', message: 'Paiement enregistré mais envoi email échoué.' });
          }
        });
      }
    }
  } finally { saving.value = false; }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtAmt(n: number | string) {
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 0 });
}
</script>

<style scoped>
.proof-zone {
  border: 2px dashed #ddd; min-height: 48px; border-radius: 6px;
  background: #fafafa; transition: border-color .2s, background .2s;
}
.proof-zone:hover { border-color: var(--q-positive); background: rgba(33,150,83,.04); }
.proof-active     { border-color: var(--q-positive); background: rgba(33,150,83,.08); }
.proof-done       { border-color: var(--q-positive); background: rgba(33,150,83,.04); }
.hidden { display: none; }
</style>
