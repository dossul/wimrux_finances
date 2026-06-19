<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5">Trésorerie</div>
      <q-space />
      <q-btn color="green-7" icon="arrow_downward" label="Dépôt caisse" no-caps class="q-mr-sm" @click="openCashDialog('credit')" />
      <q-btn color="red-7" icon="arrow_upward" label="Retrait caisse" no-caps class="q-mr-sm" @click="openCashDialog('debit')" />
      <q-btn color="primary" icon="add" label="Compte" no-caps class="q-mr-sm" data-testid="treasury-new-account-btn" @click="openAccountDialog()" />
      <q-btn color="primary" icon="add" label="Mouvement" no-caps data-testid="treasury-new-movement-btn" @click="openDialog()" />
    </div>

    <!-- Account summary cards -->
    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3" v-for="account in accounts" :key="account.id">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">{{ account.name }}</div>
            <div class="text-h5 text-weight-bold" :class="account.current_balance >= 0 ? 'text-green' : 'text-red'">
              {{ fmtCur(account.current_balance) }}
            </div>
            <div class="text-caption">{{ account.type }}</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-6 col-md-3" v-if="accounts.length === 0 && !loading">
        <q-card flat bordered>
          <q-card-section class="text-center text-grey-5">
            <q-icon name="account_balance" size="32px" class="q-mb-sm" />
            <div>Aucun compte</div>
            <q-btn flat size="sm" color="primary" label="Créer un compte" no-caps data-testid="bank-account-new-btn" @click="openAccountDialog()" class="q-mt-sm" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Filters -->
    <div class="row q-gutter-sm q-mb-md">
      <q-select v-model="filterAccount" :options="accountOptions" emit-value map-options outlined dense clearable placeholder="Compte" class="col" />
      <q-select v-model="filterType" :options="movementTypeOptions" emit-value map-options outlined dense clearable placeholder="Type" style="min-width: 140px" />
      <q-toggle v-model="filterCashOnly" label="Caisse uniquement" dense />
      <q-input v-model="dateFrom" outlined dense type="date" label="Du" style="width: 160px" />
      <q-input v-model="dateTo" outlined dense type="date" label="Au" style="width: 160px" />
    </div>

    <!-- Movements table -->
    <q-table
      :rows="filteredMovements"
      :columns="columns"
      row-key="id"
      :loading="loading"
      flat
      bordered
      :pagination="{ rowsPerPage: 20, sortBy: 'created_at', descending: true }"
    >
      <template v-slot:body-cell-type="props">
        <q-td :props="props">
          <q-badge :color="props.row.type === 'credit' ? 'green' : 'red'" :label="props.row.type === 'credit' ? 'Entrée' : 'Sortie'" />
        </q-td>
      </template>
      <template v-slot:body-cell-amount="props">
        <q-td :props="props" class="text-weight-bold" :class="props.row.type === 'credit' ? 'text-green' : 'text-red'">
          {{ props.row.type === 'credit' ? '+' : '-' }}{{ fmtCur(props.row.amount) }}
        </q-td>
      </template>
      <template v-slot:body-cell-created_at="props">
        <q-td :props="props">{{ formatDate(props.row.created_at) }}</q-td>
      </template>
    </q-table>

    <!-- New movement dialog -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card style="min-width: 450px">
        <q-card-section>
          <div class="text-h6">Nouveau mouvement</div>
        </q-card-section>
        <q-card-section>
          <q-form @submit.prevent="saveMovement" class="q-gutter-sm">
            <q-select v-model="form.account_id" :options="accountOptions" emit-value map-options label="Compte" filled data-testid="movement-account" :rules="[v => !!v || 'Compte requis']" />
            <q-btn-toggle v-model="form.type" :options="[{label:'Entrée (crédit)',value:'credit'},{label:'Sortie (débit)',value:'debit'}]" spread no-caps class="q-mb-sm" data-testid="movement-type" />
            <q-input v-model.number="form.amount" label="Montant (FCFA)" filled type="number" data-testid="movement-amount" :rules="[v => v > 0 || 'Montant > 0']" />
            <q-input v-model="form.description" label="Description" filled data-testid="movement-reference" :rules="[v => !!v || 'Description requise']" />
            <q-select v-model="form.payment_type" :options="paymentOptions" emit-value map-options label="Mode de paiement" filled data-testid="movement-mode" />
            <q-input v-model="form.reference" label="Référence (optionnel)" filled />
            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat label="Annuler" v-close-popup no-caps />
              <q-btn type="submit" color="primary" label="Enregistrer" data-testid="movement-save-btn" :loading="saving" no-caps />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- New account dialog -->
    <q-dialog v-model="accountDialogOpen" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Nouveau compte</div>
        </q-card-section>
        <q-card-section>
          <q-form @submit.prevent="saveAccount" class="q-gutter-sm">
            <q-input v-model="accountForm.name" label="Nom du compte" filled data-testid="bank-account-name" :rules="[v => !!v || 'Nom requis']" />
            <q-select v-model="accountForm.type" :options="['caisse','banque','mobile_money']" label="Type" filled data-testid="bank-account-type" />
            <q-input v-model.number="accountForm.opening_balance" label="Solde initial" filled type="number" data-testid="bank-account-balance" />
            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat label="Annuler" v-close-popup no-caps />
              <q-btn type="submit" color="primary" label="Créer" data-testid="bank-account-save-btn" :loading="saving" no-caps />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { ID } from 'appwrite';
import { useAuthStore } from 'src/stores/auth-store-appwrite';
import { appwriteDb } from 'src/services/appwrite-db';

interface TreasuryAccount {
  id: string;
  company_id: string;
  name: string;
  type: string;
  opening_balance: number;
  current_balance: number;
  created_at: string;
}

interface TreasuryMovement {
  id: string;
  treasury_account_id: string;
  type: 'credit' | 'debit' | 'transfer';
  amount: number;
  label: string;
  description: string | null;
  reference: string | null;
  balance_after: number | null;
  date: string;
  movement_date: string;
  created_at: string;
}

const $q = useQuasar();
const authStore = useAuthStore();

const accounts = ref<TreasuryAccount[]>([]);
const movements = ref<TreasuryMovement[]>([]);
const loading = ref(false);
const saving = ref(false);
const dialogOpen = ref(false);
const accountDialogOpen = ref(false);

const filterAccount = ref<string | null>(null);
const filterType = ref<string | null>(null);
const filterCashOnly = ref(false);
const dateFrom = ref('');
const dateTo = ref('');

const form = ref({
  account_id: '',
  type: 'credit' as 'credit' | 'debit',
  amount: 0,
  description: '',
  payment_type: 'ESPECES',
  reference: '',
});

const accountForm = ref({
  name: '',
  type: 'caisse',
  opening_balance: 0,
});

const movementTypeOptions = [
  { label: 'Entrée (crédit)', value: 'credit' },
  { label: 'Sortie (débit)', value: 'debit' },
];

const paymentOptions = [
  { label: 'Espèces', value: 'ESPECES' },
  { label: 'Chèque', value: 'CHEQUES' },
  { label: 'Mobile Money', value: 'MOBILEMONEY' },
  { label: 'Carte bancaire', value: 'CARTEBANCAIRE' },
  { label: 'Virement', value: 'VIREMENT' },
];

const accountOptions = computed(() =>
  accounts.value.map(a => ({ label: `${a.name} (${a.type})`, value: a.id }))
);

const columns = [
  { name: 'created_at', label: 'Date', field: 'created_at', align: 'left' as const, sortable: true },
  { name: 'type', label: 'Type', field: 'type', align: 'center' as const, sortable: true },
  { name: 'label', label: 'Description', field: 'label', align: 'left' as const },
  { name: 'amount', label: 'Montant', field: 'amount', align: 'right' as const, sortable: true },
  { name: 'reference', label: 'Référence', field: 'reference', align: 'left' as const },
];

const filteredMovements = computed(() => {
  let result = movements.value;
  if (filterAccount.value) result = result.filter(m => m.treasury_account_id === filterAccount.value);
  if (filterType.value) result = result.filter(m => m.type === filterType.value);
  return result;
});

function fmtCur(n: number) {
  return new Intl.NumberFormat('fr-BF', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);
}

function formatDate(d: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function openDialog() {
  form.value = { account_id: accounts.value[0]?.id || '', type: 'credit', amount: 0, description: '', payment_type: 'ESPECES', reference: '' };
  dialogOpen.value = true;
}

function openCashDialog(type: 'credit' | 'debit') {
  const cashAccount = accounts.value.find(a => a.type === 'caisse');
  form.value = {
    account_id: cashAccount?.id || accounts.value[0]?.id || '',
    type,
    amount: 0,
    description: type === 'credit' ? 'Dépôt de numéraires' : 'Retrait de numéraires',
    payment_type: 'ESPECES',
    reference: '',
  };
  dialogOpen.value = true;
}

function openAccountDialog() {
  accountForm.value = { name: '', type: 'caisse', opening_balance: 0 };
  accountDialogOpen.value = true;
}

async function loadData() {
  loading.value = true;
  try {
    const [accRes, movRes] = await Promise.all([
      appwriteDb.from('treasury_accounts').select('*').order('name', { ascending: true }),
      appwriteDb.from('treasury_movements').select('*').order('$createdAt', { ascending: false }).limit(200),
    ]);
    if (accRes.data) accounts.value = accRes.data as TreasuryAccount[];
    if (movRes.data) movements.value = movRes.data as TreasuryMovement[];
  } finally {
    loading.value = false;
  }
}

async function saveMovement() {
  saving.value = true;
  try {
    const account = accounts.value.find(a => a.id === form.value.account_id);
    if (!account) {
      throw new Error('Compte introuvable');
    }

    const delta = form.value.type === 'credit' ? form.value.amount : -form.value.amount;
    const newBalance = (account.current_balance || 0) + delta;
    const nowIso = new Date().toISOString();

    const { error } = await appwriteDb.from('treasury_movements').insert({
      id: ID.unique(),
      company_id: authStore.companyId,
      treasury_account_id: form.value.account_id,
      type: form.value.type,
      direction: form.value.type,
      amount: form.value.amount,
      label: form.value.description,
      description: form.value.description || null,
      reference: form.value.reference || null,
      balance_after: newBalance,
      date: nowIso.slice(0, 10),
      movement_date: nowIso,
    });
    if (error) throw new Error(error.message);

    await appwriteDb.from('treasury_accounts')
      .update(account.id, { current_balance: newBalance });

    dialogOpen.value = false;
    $q.notify({ type: 'positive', message: 'Mouvement enregistré' });
    await loadData();
  } catch (err: unknown) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'Erreur' });
  } finally {
    saving.value = false;
  }
}

async function saveAccount() {
  saving.value = true;
  try {
    const { error } = await appwriteDb.from('treasury_accounts').insert({
      id: ID.unique(),
      company_id: authStore.companyId,
      name: accountForm.value.name,
      type: accountForm.value.type,
      opening_balance: accountForm.value.opening_balance,
      current_balance: accountForm.value.opening_balance,
    });
    if (error) throw new Error(error.message);
    accountDialogOpen.value = false;
    $q.notify({ type: 'positive', message: 'Compte créé' });
    await loadData();
  } catch (err: unknown) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'Erreur' });
  } finally {
    saving.value = false;
  }
}

onMounted(loadData);
</script>
