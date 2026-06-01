<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Fournisseurs</div>
        <div class="text-caption text-grey-7">Gestion du référentiel fournisseurs</div>
      </div>
      <q-space />
      <q-btn outline color="primary" icon="receipt" label="Factures reçues" no-caps :to="'/app/invoices/received'" class="q-mr-sm" />
      <q-btn color="primary" icon="add" label="Nouveau fournisseur" no-caps @click="openCreate" />
    </div>

    <!-- Recherche -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="row items-center q-gutter-sm q-py-sm">
        <q-input v-model="search" label="Rechercher" dense outlined clearable
          @update:model-value="loadSuppliers(search ? { search } : {})"
          style="min-width:250px">
          <template #prepend><q-icon name="search" /></template>
        </q-input>
        <q-toggle v-model="showInactive" label="Afficher inactifs" dense />
      </q-card-section>
    </q-card>

    <!-- Table -->
    <q-card flat bordered>
      <q-table :rows="filteredSuppliers" :columns="columns" row-key="id"
        :loading="loading" :pagination="{ rowsPerPage: 25 }" flat>

        <template #body-cell-regime_fiscal="props">
          <q-td :props="props">
            <q-badge v-if="props.value"
              :color="props.value === 'RNI' ? 'blue-7' : props.value === 'RSI' ? 'orange-7' : 'grey-6'"
              :label="props.value" />
          </q-td>
        </template>

        <template #body-cell-supplier_type="props">
          <q-td :props="props">
            <q-badge v-if="props.value"
              :color="props.value === 'foreign' ? 'purple-6' : 'teal-6'"
              :label="props.value === 'foreign' ? 'Étranger' : 'Local'" />
          </q-td>
        </template>

        <template #body-cell-is_active="props">
          <q-td :props="props">
            <q-badge :color="props.value ? 'positive' : 'grey-5'" :label="props.value ? 'Actif' : 'Inactif'" />
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round dense size="sm" icon="edit"   color="grey-7" @click="openEdit(props.row)" />
            <q-btn flat round dense size="sm" :icon="props.row.is_active ? 'visibility_off' : 'visibility'"
              :color="props.row.is_active ? 'orange' : 'positive'"
              @click="toggleActive(props.row)" />
            <q-btn flat round dense size="sm" icon="delete" color="negative"
              @click="confirmDelete(props.row)" />
          </q-td>
        </template>

        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6">
            <q-icon name="business" size="48px" class="q-mb-sm" /><br>
            Aucun fournisseur
          </div>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog Créer / Modifier -->
    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width:600px;max-width:720px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur' }}</div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <div class="q-gutter-md">

            <!-- Identité -->
            <div class="text-subtitle2 text-grey-8 q-mb-xs">Identité</div>
            <q-input v-model="form.name" label="Nom / Raison sociale *" outlined dense :rules="[v => !!v || 'Requis']" />
            <div class="row q-gutter-sm">
              <q-input v-model="form.ifu"  label="IFU"  outlined dense class="col" hint="Ex: 00014674A" />
              <q-input v-model="form.rccm" label="RCCM" outlined dense class="col" />
            </div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.supplier_code" label="Code fournisseur" outlined dense class="col" hint="Référence interne" />
              <q-select v-model="form.supplier_type"
                :options="supplierTypeOptions" emit-value map-options
                label="Type de fournisseur" outlined dense class="col" clearable />
            </div>

            <!-- Fiscal -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8 q-mb-xs">
              Informations fiscales
              <q-badge color="orange" label="Obligatoire (DGI)" class="q-ml-sm" />
            </div>
            <div class="row q-gutter-sm">
              <q-select v-model="form.regime_fiscal"
                :options="regimeFiscalOptions" emit-value map-options
                label="Régime fiscal *" outlined dense class="col"
                :rules="[v => !!v || 'Régime fiscal requis']"
                clearable>
                <template #option="{ itemProps, opt }">
                  <q-item v-bind="itemProps">
                    <q-item-section avatar>
                      <q-badge :color="opt.color" :label="opt.value" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ opt.label }}</q-item-label>
                      <q-item-label caption>{{ opt.hint }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <q-input v-model="form.division_fiscale" label="Division fiscale *" outlined dense class="col"
                :rules="[v => !!v || 'Division fiscale requise']"
                hint="Ex: DME-CV, DGE, DME-Centre" />
            </div>
            <!-- Info TVA selon régime -->
            <q-banner v-if="form.regime_fiscal && form.regime_fiscal !== 'RNI'" dense rounded class="bg-orange-1 text-orange-9 text-caption q-mt-xs">
              <template #avatar><q-icon name="info" color="orange" /></template>
              Régime {{ form.regime_fiscal }} — <strong>TVA non applicable</strong>. Les factures de ce fournisseur ne doivent pas inclure de TVA.
            </q-banner>
            <q-banner v-else-if="form.regime_fiscal === 'RNI'" dense rounded class="bg-blue-1 text-blue-9 text-caption q-mt-xs">
              <template #avatar><q-icon name="verified" color="blue" /></template>
              Régime RNI — <strong>TVA 18%</strong> obligatoire sur les factures.
            </q-banner>

            <!-- Contact -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8 q-mb-xs">Contact & Localisation</div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.phone" label="Téléphone" outlined dense class="col" />
              <q-input v-model="form.email" label="Email"     outlined dense class="col" />
            </div>
            <q-input v-model="form.address" label="Adresse" outlined dense type="textarea" rows="2" />
            <div class="row q-gutter-sm">
              <q-input v-model.number="form.payment_terms_days" label="Délai paiement (jours)" type="number" outlined dense class="col" />
              <q-input v-model="form.country" label="Pays (code 2L)" outlined dense class="col" maxlength="2" hint="BF, CI, SN…" />
            </div>

            <!-- Banque -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8 q-mb-xs">Informations bancaires</div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.bank_name" label="Banque"      outlined dense class="col" />
              <q-input v-model="form.bank_bic"  label="BIC / SWIFT" outlined dense class="col" />
            </div>
            <q-input v-model="form.bank_iban" label="IBAN / RIB" outlined dense />
            <q-input v-model="form.notes" label="Notes" outlined dense type="textarea" rows="2" />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" :label="editingSupplier ? 'Enregistrer' : 'Créer'" :loading="loading" @click="submitForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useSuppliers } from 'src/composables/useSuppliers';
import type { Supplier } from 'src/types';

const $q = useQuasar();
const { suppliers, loading, error, loadSuppliers, createSupplier, updateSupplier, deleteSupplier } = useSuppliers();

const search       = ref('');
const showInactive = ref(false);
const showForm     = ref(false);
const editingSupplier = ref<Supplier | null>(null);

const filteredSuppliers = computed(() =>
  suppliers.value.filter(s => showInactive.value ? true : (s.is_active !== false))
);

const columns = [
  { name: 'name',           label: 'Nom',           field: 'name',           align: 'left'   as const, sortable: true },
  { name: 'ifu',            label: 'IFU',            field: 'ifu',            align: 'left'   as const },
  { name: 'regime_fiscal',  label: 'Régime',         field: 'regime_fiscal',  align: 'center' as const },
  { name: 'division_fiscale', label: 'Division',     field: 'division_fiscale', align: 'left' as const },
  { name: 'supplier_type',  label: 'Type',           field: 'supplier_type',  align: 'center' as const },
  { name: 'phone',          label: 'Téléphone',      field: 'phone',          align: 'left'   as const },
  { name: 'country',        label: 'Pays',           field: 'country',        align: 'center' as const },
  { name: 'payment_terms_days', label: 'Délai (j)', field: 'payment_terms_days', align: 'center' as const },
  { name: 'is_active',      label: 'Statut',         field: 'is_active',      align: 'center' as const },
  { name: 'actions',        label: '',               field: 'id',             align: 'right'  as const },
];

const regimeFiscalOptions = [
  { value: 'RNI', label: 'RNI — Réel Normal d\'Imposition',         color: 'blue-7',   hint: 'CA ≥ 50M FCFA — TVA 18% obligatoire' },
  { value: 'RSI', label: 'RSI — Réel Simplifié d\'Imposition',       color: 'orange-7', hint: 'CA 15M–50M FCFA — Pas de TVA' },
  { value: 'CME', label: 'CME — Contribution des Micro-Entreprises', color: 'grey-6',   hint: 'CA < 15M FCFA — Pas de TVA' },
  { value: 'CSE', label: 'CSE — Contribution du Secteur Élevage',   color: 'green-7',  hint: 'Bétail, volaille, pêche' },
  { value: 'RND', label: 'RND — Régime Non Déterminé',              color: 'purple-6', hint: 'ONG, associations, admins, diplomatiques' },
];

const supplierTypeOptions = [
  { value: 'local',   label: '🇧🇫 Fournisseur Local' },
  { value: 'foreign', label: '🌍 Fournisseur Étranger' },
];

const emptyForm = () => ({
  name: '',
  ifu: null as string | null,
  rccm: null as string | null,
  address: null as string | null,
  phone: null as string | null,
  email: null as string | null,
  country: 'BF',
  payment_terms_days: 30,
  bank_name: null as string | null,
  bank_iban: null as string | null,
  bank_bic: null as string | null,
  notes: null as string | null,
  is_active: true,
  regime_fiscal: null as string | null,
  division_fiscale: null as string | null,
  supplier_code: null as string | null,
  supplier_type: null as 'local' | 'foreign' | null,
});
const form = ref(emptyForm());

function openCreate() { editingSupplier.value = null; form.value = emptyForm(); showForm.value = true; }
function openEdit(s: Supplier) {
  editingSupplier.value = s;
  form.value = { ...emptyForm(), ...s };
  showForm.value = true;
}
async function submitForm() {
  if (!form.value.name)            { $q.notify({ type: 'negative', message: 'Nom requis' }); return; }
  if (!form.value.regime_fiscal)   { $q.notify({ type: 'warning',  message: 'Régime fiscal requis (DGI)' }); return; }
  if (!form.value.division_fiscale){ $q.notify({ type: 'warning',  message: 'Division fiscale requise (DGI)' }); return; }

  if (editingSupplier.value) {
    await updateSupplier(editingSupplier.value.id, form.value);
  } else {
    await createSupplier(form.value as Parameters<typeof createSupplier>[0]);
  }
  if (!error.value) {
    showForm.value = false;
    $q.notify({ type: 'positive', message: editingSupplier.value ? 'Fournisseur modifié' : 'Fournisseur créé' });
    await loadSuppliers();
  } else {
    $q.notify({ type: 'negative', message: error.value });
  }
}
async function toggleActive(s: Supplier) {
  await updateSupplier(s.id, { is_active: !s.is_active });
}
function confirmDelete(s: Supplier) {
  $q.dialog({ title: 'Supprimer', message: `Supprimer ${s.name} ?`, cancel: true, ok: { color: 'negative' } })
    .onOk(async () => { await deleteSupplier(s.id); });
}

onMounted(() => loadSuppliers());
</script>
