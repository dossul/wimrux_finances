<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5">Trésorerie</div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nouveau mouvement" no-caps @click="openDialog()" />
    </div>

    <!-- Account summary cards -->
    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12 col-sm-6 col-md-3" v-for="account in accounts" :key="account.id">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-caption text-grey-7">{{ account.name }}</div>
            <div class="text-h5 text-weight-bold" :class="account.balance >= 0 ? 'text-green' : 'text-red'">
              {{ fmtCur(account.balance) }}
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
            <q-btn flat size="sm" color="primary" label="Créer un compte" no-caps @click="openAccountDialog()" class="q-mt-sm" />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Filters -->
    <div class="row q-gutter-sm q-mb-md">
      <q-select v-model="filterAccount" :options="accountOptions" emit-value map-options outlined dense clearable placeholder="Compte" class="col" />
      <q-select v-model="filterType" :options="movementTypeOptions" emit-value map-options outlined dense clearable placeholder="Type" style="min-width: 140px" />
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
            <q-select v-model="form.account_id" :options="accountOptions" emit-value map-options label="Compte" filled :rules="[v => !!v || 'Compte requis']" />
            <q-btn-toggle v-model="form.type" :options="[{label:'Entrée (crédit)',value:'credit'},{label:'Sortie (débit)',value:'debit'}]" spread no-caps class="q-mb-sm" />
            <q-input v-model.number="form.amount" label="Montant (FCFA)" filled type="number" :rules="[v => v > 0 || 'Montant > 0']" />
            <q-input v-model="form.description" label="Description" filled :rules="[v => !!v || 'Description requise']" />
            <q-select v-model="form.payment_type" :options="paymentOptions" emit-value map-options label="Mode de paiement" filled />
            <q-input v-model="form.reference" label="Référence (optionnel)" filled />
            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat label="Annuler" v-close-popup no-caps />
              <q-btn type="submit" color="primary" label="Enregistrer" :loading="saving" no-caps />
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
            <q-input v-model="accountForm.name" label="Nom du compte" filled :rules="[v => !!v || 'Nom requis']" />
            <q-select v-model="accountForm.type" :options="['caisse','banque','mobile_money']" label="Type" filled />
            <q-input v-model.number="accountForm.balance" label="Solde initial" filled type="number" />
            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat label="Annuler" v-close-popup no-caps />
              <q-btn type="submit" color="primary" label="Créer" :loading="saving" no-caps />
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
import { insforge } from 'src/boot/insforge';
import { useAuthStore } from 'src/stores/auth-store';

interface TreasuryAccount {
  id: string;
  company_id: string;
  name: string;
  type: string;
  balance: number;
  created_at: string;
}

interface TreasuryMovement {
  id: string;
  account_id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  payment_type: string;
  reference: string | null;
  invoice_id: string | null;
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
  balance: 0,
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
  { name: 'description', label: 'Description', field: 'description', align: 'left' as const },
  { name: 'payment_type', label: 'Mode', field: 'payment_type', align: 'center' as const },
  { name: 'amount', label: 'Montant', field: 'amount', align: 'right' as const, sortable: true },
  { name: 'reference', label: 'Référence', field: 'reference', align: 'left' as const },
];

const filteredMovements = computed(() => {
  let result = movements.value;
  if (filterAccount.value) result = result.filter(m => m.account_id === filterAccount.value);
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

function openAccountDialog() {
  accountForm.value = { name: '', type: 'caisse', balance: 0 };
  accountDialogOpen.value = true;
}

async function loadData() {
  loading.value = true;
  try {
    const [accRes, movRes] = await Promise.all([
      insforge.database.from('treasury_accounts').select('*').order('name', { ascending: true }),
      insforge.database.from('treasury_movements').select('*').order('created_at', { ascending: false }).limit(200),
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
    const { error } = await insforge.database.from('treasury_movements').insert({
      company_id: authStore.companyId,
      account_id: form.value.account_id,
      type: form.value.type,
      amount: form.value.amount,
      description: form.value.description,
      payment_type: form.value.payment_type,
      reference: form.value.reference || null,
    });
    if (error) throw new Error(error.message);

    // Update account balance
    const account = accounts.value.find(a => a.id === form.value.account_id);
    if (account) {
      const delta = form.value.type === 'credit' ? form.value.amount : -form.value.amount;
      await insforge.database.from('treasury_accounts')
        .update({ balance: account.balance + delta })
        .eq('id', account.id);
    }

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
    const { error } = await insforge.database.from('treasury_accounts').insert({
      company_id: authStore.companyId,
      name: accountForm.value.name,
      type: accountForm.value.type,
      balance: accountForm.value.balance,
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
