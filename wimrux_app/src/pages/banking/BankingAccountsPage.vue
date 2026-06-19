<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div class="text-h5">Comptes bancaires</div>
      <q-space />
      <q-btn flat outline color="primary" icon="swap_horiz"      label="Virements"        no-caps :to="'/app/banking/transfers'" class="q-mr-sm" />
      <q-btn flat outline color="primary" icon="check_box"       label="Chèques"          no-caps :to="'/app/banking/checks'"    class="q-mr-sm" />
      <q-btn flat outline color="primary" icon="receipt_long"    label="Frais bancaires"  no-caps :to="'/app/banking/fees'"      class="q-mr-sm" />
      <q-btn color="primary" icon="add" label="Nouveau compte" no-caps @click="openDialog()" data-testid="banking-new-account-btn" />
    </div>

    <!-- Stats rapides -->
    <div class="row q-gutter-md q-mb-lg">
      <div class="col-12 col-sm-4">
        <q-card flat bordered>
          <q-card-section class="row items-center no-wrap">
            <q-icon name="account_balance" color="primary" size="36px" class="q-mr-sm" />
            <div>
              <div class="text-h6 text-weight-bold">{{ accounts.length }}</div>
              <div class="text-caption text-grey-7">Comptes actifs</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card flat bordered>
          <q-card-section class="row items-center no-wrap">
            <q-icon name="trending_up" color="green" size="36px" class="q-mr-sm" />
            <div>
              <div class="text-h6 text-weight-bold text-green">{{ fmtCur(totalBalance) }}</div>
              <div class="text-caption text-grey-7">Solde total</div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <!-- Liste des comptes -->
    <div class="row q-gutter-md">
      <div class="col-12 col-sm-6 col-md-4" v-for="acc in accounts" :key="acc.id"
        data-testid="bank-account-card">
        <q-card flat bordered :class="acc.is_active ? '' : 'opacity-50'">
          <q-card-section>
            <div class="row items-start no-wrap">
              <q-icon name="account_balance" color="primary" size="32px" class="q-mr-sm q-mt-xs" />
              <div class="full-width">
                <div class="text-subtitle1 text-weight-bold">{{ acc.bank_name }}</div>
                <div class="text-caption text-grey-7">{{ acc.account_number }}</div>
                <div class="text-caption text-grey-6" v-if="acc.iban">IBAN : {{ acc.iban }}</div>
              </div>
              <q-btn flat round dense icon="more_vert">
                <q-menu>
                  <q-list>
                    <q-item clickable v-close-popup :to="`/app/banking/${acc.id}`">
                      <q-item-section avatar><q-icon name="visibility" /></q-item-section>
                      <q-item-section>Voir les transactions</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="openDialog(acc)">
                      <q-item-section avatar><q-icon name="edit" /></q-item-section>
                      <q-item-section>Modifier</q-item-section>
                    </q-item>
                    <q-item clickable v-close-popup @click="toggleActive(acc)">
                      <q-item-section avatar>
                        <q-icon :name="acc.is_active ? 'visibility_off' : 'visibility'" />
                      </q-item-section>
                      <q-item-section>{{ acc.is_active ? 'Désactiver' : 'Activer' }}</q-item-section>
                    </q-item>
                    <q-separator />
                    <q-item clickable v-close-popup @click="confirmDelete(acc)">
                      <q-item-section avatar><q-icon name="delete" color="red" /></q-item-section>
                      <q-item-section class="text-red">Supprimer</q-item-section>
                    </q-item>
                  </q-list>
                </q-menu>
              </q-btn>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-section class="q-pt-sm q-pb-sm">
            <div class="row items-center justify-between">
              <div>
                <div class="text-caption text-grey-6">Solde actuel</div>
                <div
                  class="text-h6 text-weight-bold"
                  :class="acc.current_balance >= 0 ? 'text-green' : 'text-red'"
                >
                  {{ fmtCur(acc.current_balance) }}
                </div>
              </div>
              <div class="text-right">
                <div class="text-caption text-grey-6">Devise</div>
                <q-badge color="grey-4" text-color="dark" :label="acc.currency" />
              </div>
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat dense size="sm" color="primary" label="Transactions" no-caps :to="`/app/banking/${acc.id}`" />
          </q-card-actions>
        </q-card>
      </div>

      <div v-if="accounts.length === 0 && !loading" class="col-12 text-center text-grey-5 q-pa-xl">
        <q-icon name="account_balance" size="64px" class="q-mb-md" />
        <div class="text-h6">Aucun compte bancaire</div>
        <div class="text-body2 q-mb-md">Ajoutez votre premier compte pour commencer</div>
        <q-btn color="primary" icon="add" label="Ajouter un compte" no-caps @click="openDialog()" />
      </div>
    </div>

    <!-- Dialog création/édition -->
    <q-dialog v-model="dialogOpen" persistent data-testid="banking-account-dialog">
      <q-card style="min-width: 480px; max-width: 560px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editTarget ? 'Modifier le compte' : 'Nouveau compte bancaire' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section class="q-pt-md">
          <div class="row q-gutter-sm">
            <q-input
              v-model="form.bank_name"
              label="Nom de la banque *"
              outlined
              dense
              class="col-12"
              :rules="[v => !!v || 'Requis']"
              data-testid="banking-account-bank-name"
            />
            <q-input
              v-model="form.bank_code"
              label="Code banque"
              outlined
              dense
              class="col-5"
              data-testid="banking-account-bank-code"
            />
            <q-input
              v-model="form.account_number"
              label="Numéro de compte *"
              outlined
              dense
              class="col-6"
              :rules="[v => !!v || 'Requis']"
              data-testid="banking-account-number"
            />
            <q-input
              v-model="form.iban"
              label="IBAN"
              outlined
              dense
              class="col-12"
              data-testid="banking-account-iban"
            />
            <q-input
              v-model="form.bic"
              label="BIC / SWIFT"
              outlined
              dense
              class="col-5"
              data-testid="banking-account-bic"
            />
            <q-input
              v-model="form.account_holder"
              label="Titulaire du compte"
              outlined
              dense
              class="col-6"
              data-testid="banking-account-holder"
            />
            <q-select
              v-model="form.currency"
              :options="['XOF', 'EUR', 'USD', 'GBP']"
              label="Devise"
              outlined
              dense
              class="col-4"
              data-testid="banking-account-currency"
            />
            <q-input
              v-model.number="form.opening_balance"
              label="Solde d'ouverture"
              outlined
              dense
              type="number"
              class="col-7"
              suffix="FCFA"
              data-testid="banking-account-opening-balance"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" no-caps v-close-popup />
          <q-btn
            color="primary"
            :label="editTarget ? 'Enregistrer' : 'Créer le compte'"
            no-caps
            :loading="saving"
            @click="saveAccount"
            data-testid="banking-account-save-btn"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, reactive } from 'vue';
import { useQuasar } from 'quasar';
import { useBankAccounts } from 'src/composables/useBankAccounts';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import type { BankAccountFull } from 'src/types';

const $q = useQuasar();
const companyStore = useCompanyStore();
const { accounts, loading, loadAccounts, createAccount, updateAccount, toggleActive: doToggle, deleteAccount } = useBankAccounts();

const totalBalance = computed(() => accounts.value.filter(a => a.is_active).reduce((s, a) => s + a.current_balance, 0));

const dialogOpen = ref(false);
const saving = ref(false);
const editTarget = ref<BankAccountFull | null>(null);

const defaultForm = () => ({
  bank_name: '',
  bank_code: '',
  account_number: '',
  iban: '',
  bic: '',
  account_holder: '',
  currency: 'XOF',
  opening_balance: 0,
  current_balance: 0,
  is_active: true,
  treasury_account_id: null as string | null,
});

const form = reactive(defaultForm());

function fmtCur(n: number) {
  return new Intl.NumberFormat('fr-BF', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);
}

function openDialog(acc?: BankAccountFull) {
  editTarget.value = acc ?? null;
  if (acc) {
    Object.assign(form, {
      bank_name: acc.bank_name,
      bank_code: acc.bank_code ?? '',
      account_number: acc.account_number,
      iban: acc.iban ?? '',
      bic: acc.bic ?? '',
      account_holder: acc.account_holder ?? '',
      currency: acc.currency,
      opening_balance: acc.opening_balance,
      current_balance: acc.current_balance,
      is_active: acc.is_active,
      treasury_account_id: acc.treasury_account_id,
    });
  } else {
    Object.assign(form, defaultForm());
  }
  dialogOpen.value = true;
}

async function saveAccount() {
  if (!form.bank_name || !form.account_number) {
    $q.notify({ type: 'warning', message: 'Remplissez les champs obligatoires' });
    return;
  }
  saving.value = true;
  try {
    const payload = {
      company_id: companyStore.companyId!,
      bank_name: form.bank_name,
      bank_code: form.bank_code || null,
      account_number: form.account_number,
      iban: form.iban || null,
      bic: form.bic || null,
      account_holder: form.account_holder || null,
      currency: form.currency,
      opening_balance: form.opening_balance,
      current_balance: editTarget.value ? form.current_balance : form.opening_balance,
      is_active: true,
      treasury_account_id: form.treasury_account_id,
    };
    if (editTarget.value) {
      await updateAccount(editTarget.value.id, payload);
      $q.notify({ type: 'positive', message: 'Compte mis à jour' });
    } else {
      await createAccount(payload);
      $q.notify({ type: 'positive', message: 'Compte créé' });
    }
    dialogOpen.value = false;
  } catch (e: unknown) {
    $q.notify({ type: 'negative', message: (e as Error).message });
  } finally {
    saving.value = false;
  }
}

async function toggleActive(acc: BankAccountFull) {
  try {
    await doToggle(acc.id, !acc.is_active);
    $q.notify({ type: 'positive', message: acc.is_active ? 'Compte désactivé' : 'Compte activé' });
  } catch (e: unknown) {
    $q.notify({ type: 'negative', message: (e as Error).message });
  }
}

function confirmDelete(acc: BankAccountFull) {
  $q.dialog({
    title: 'Supprimer le compte',
    message: `Supprimer "${acc.bank_name} — ${acc.account_number}" ? Cette action est irréversible.`,
    cancel: { label: 'Annuler', flat: true },
    ok: { label: 'Supprimer', color: 'red', flat: false },
  }).onOk(async () => {
    try {
      await deleteAccount(acc.id);
      $q.notify({ type: 'positive', message: 'Compte supprimé' });
    } catch (e: unknown) {
      $q.notify({ type: 'negative', message: (e as Error).message });
    }
  });
}

onMounted(() => { void loadAccounts(); });
</script>
