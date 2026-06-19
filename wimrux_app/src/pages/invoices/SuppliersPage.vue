<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Fournisseurs</div>
        <div class="text-caption text-grey-7">Gestion du référentiel fournisseurs</div>
      </div>
      <q-space />
      <q-btn outline color="primary" icon="receipt" label="Factures reçues" no-caps :to="'/app/invoices/received'" class="q-mr-sm" />
      <q-btn color="primary" icon="add" label="Nouveau fournisseur" no-caps @click="openCreate" data-testid="supplier-new-btn" />
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
        :loading="loading" :pagination="{ rowsPerPage: 25 }" flat
        data-testid="suppliers-table">

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
            <q-toggle :model-value="props.value" @update:model-value="toggleActive(props.row)" :label="props.value ? 'Actif' : 'Inactif'" color="positive" />
          </q-td>
        </template>

        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round dense size="sm" icon="edit"   color="grey-7" @click="openEdit(props.row)" />
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
    <q-dialog v-model="showForm" persistent data-testid="supplier-dialog">
      <q-card style="min-width:720px;max-width:920px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingSupplier ? 'Modifier le fournisseur' : 'Nouveau fournisseur' }}</div>
          <q-space />
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>
        <q-card-section class="q-pt-md">
          <div class="q-gutter-md">

            <!-- Identité -->
            <div class="text-subtitle2 text-grey-8 q-mb-xs">Identité</div>
            <q-input v-model="form.name" label="Nom / Raison sociale *" outlined dense :rules="[v => !!v || 'Requis']" data-testid="supplier-name" />
            <div class="row q-gutter-sm">
              <q-select
                v-model="form.legal_form"
                :options="legalFormOptions" emit-value map-options
                label="Forme juridique" outlined dense class="col"
                clearable
              />
              <q-input v-if="form.legal_form === 'AUTRE'" v-model="form.legal_form_other" label="Préciser" outlined dense class="col" />
            </div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.supplier_code" label="Code fournisseur" outlined dense class="col" hint="Référence interne" data-testid="supplier-code" />
              <q-select v-model="form.supplier_type"
                :options="supplierTypeOptions" emit-value map-options
                label="Type de fournisseur" outlined dense class="col" clearable data-testid="supplier-type" />
            </div>

            <!-- Adresse physique -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8 q-mb-xs">Adresse physique</div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.physical_address.city" label="Ville" outlined dense class="col" />
              <q-input v-model="form.physical_address.district" label="Quartier" outlined dense class="col" />
              <q-input v-model="form.physical_address.sector" label="Secteur" outlined dense class="col" />
            </div>

            <!-- Adresse cadastrale -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8 q-mb-xs">Adresse cadastrale</div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.cadastral_address.parcel" label="Parcelle" outlined dense class="col" />
              <q-input v-model="form.cadastral_address.lot" label="Lot" outlined dense class="col" />
              <q-input v-model="form.cadastral_address.section" label="Section" outlined dense class="col" />
            </div>

            <!-- Adresse postale -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8 q-mb-xs">Adresse postale</div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.postal_address.post_office" label="Bureau postal" outlined dense class="col" hint="Ex: 01, 02, CMS..." />
              <q-input v-model="form.postal_address.po_box" label="N° boîte postale" outlined dense class="col" hint="Ex: BP6656" />
              <q-input v-model="form.postal_address.postal_code" label="Code postal" outlined dense class="col" hint="Ex: OUAGA01" />
            </div>

            <!-- Coordonnées -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8 q-mb-xs">Coordonnées</div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.phone_country_code" label="Indicatif pays" outlined dense class="col-3" :rules="[countryCodeRule]" hint="Ex: +226" />
              <q-input v-model="form.phone" label="Téléphone" outlined dense class="col" data-testid="supplier-phone" :rules="[phoneRule]" />
            </div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.email" label="E-mail" outlined dense class="col" data-testid="supplier-email" :rules="[emailRule]" />
              <q-input v-model="form.billing_email" label="E-mail de facturation" outlined dense class="col" :rules="[emailRule]" />
            </div>

            <!-- Fiscal -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8 q-mb-xs">
              Informations fiscales
              <q-badge color="orange" label="Obligatoire (DGI)" class="q-ml-sm" />
            </div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.ifu" label="IFU" outlined dense class="col" hint="Ex: 00014674A" data-testid="supplier-ifu" />
              <q-input v-model="form.rccm" label="RCCM" outlined dense class="col" data-testid="supplier-rccm" />
            </div>
            <div class="row q-gutter-sm q-mt-xs">
              <div class="col">
                <q-file v-model="ifuFile" label="Scan IFU" outlined dense clearable accept=".pdf,.jpg,.jpeg,.png">
                  <template v-slot:append><q-icon v-if="form.ifu_scan_file_id" name="check_circle" color="positive" /></template>
                </q-file>
              </div>
              <div class="col">
                <q-file v-model="rccmFile" label="Scan RCCM" outlined dense clearable accept=".pdf,.jpg,.jpeg,.png">
                  <template v-slot:append><q-icon v-if="form.rccm_scan_file_id" name="check_circle" color="positive" /></template>
                </q-file>
              </div>
            </div>
            <div class="row q-gutter-sm">
              <q-select v-model="form.tax_regime"
                :options="taxRegimeOptions" emit-value map-options
                label="Régime fiscal *" outlined dense class="col"
                :rules="[v => !!v || 'Régime fiscal requis']"
                clearable data-testid="supplier-regime">
                <template #option="{ itemProps, opt }">
                  <q-item v-bind="itemProps">
                    <q-item-section avatar>
                      <q-badge :color="opt.value === 'RNI' ? 'blue-7' : 'grey-6'" :label="opt.value" />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ opt.label }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
              <q-select
                :model-value="taxDivisionValue(form.tax_division)"
                @update:model-value="onTaxDivisionSelected"
                :options="taxDivisionOptions"
                label="Division fiscale *" outlined dense class="col"
                :rules="[v => !!v || 'Division fiscale requise']"
                emit-value map-options clearable data-testid="supplier-division"
              />
            </div>
            <q-input
              v-if="form.tax_division?.type === 'DPI'"
              v-model="form.tax_division.province"
              label="Province"
              outlined dense
              :rules="[v => !!v || 'Province requise pour DPI']"
            />

            <!-- TVA -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8 q-mb-xs">TVA</div>
            <div class="row q-gutter-sm items-center">
              <q-toggle v-model="form.charges_vat" label="Charge la TVA" color="primary" data-testid="supplier-vat-toggle" />
              <q-radio v-model="form.vat_rate" :val="0.18" label="18 %" :disable="!form.charges_vat" data-testid="supplier-vat-rate-18" />
              <q-radio v-model="form.vat_rate" :val="0.10" label="10 %" :disable="!form.charges_vat" data-testid="supplier-vat-rate-10" />
              <span v-if="form.tax_regime && form.tax_regime !== 'RNI'" class="text-caption text-orange-9">Ce régime ne charge pas de TVA</span>
            </div>

            <!-- Contacts -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8 q-mb-xs row items-center">
              Contacts
              <q-btn flat round dense icon="add" size="sm" color="primary" class="q-ml-sm" @click="addContact" />
            </div>
            <div v-for="(contact, idx) in form.contacts" :key="idx" class="row q-gutter-sm items-start">
              <q-select v-model="contact.role"
                :options="[{ label: 'Contact vente', value: 'sales' }, { label: 'Contact comptabilité', value: 'accounting' }]"
                label="Rôle" emit-value map-options outlined dense class="col-3" />
              <q-input v-model="contact.name" label="Nom" outlined dense class="col" />
              <q-input v-model="contact.function" label="Fonction" outlined dense class="col" />
              <q-input v-model="contact.phone" label="Téléphone" outlined dense class="col" />
              <q-input v-model="contact.email" label="E-mail" outlined dense type="email" class="col" />
              <q-btn flat round dense icon="delete" color="negative" size="sm" class="q-mt-sm" @click="removeContact(idx)" />
            </div>

            <!-- Banque -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8 q-mb-xs row items-center">
              Comptes bancaires (max. 5)
              <q-btn flat round dense icon="add" size="sm" color="primary" class="q-ml-sm" data-testid="supplier-add-bank" @click="addBankAccount" />
            </div>
            <div v-for="(account, idx) in form.bank_accounts" :key="`bank-${idx}`" class="row q-gutter-sm items-start">
              <q-input v-model="account.bank_name" label="Banque" outlined dense class="col" />
              <q-input v-model="account.account_number" label="N° compte" outlined dense class="col" />
              <q-input v-model="account.iban" label="IBAN / RIB" outlined dense class="col" />
              <q-input v-model="account.bic" label="BIC / SWIFT" outlined dense class="col-2" />
              <q-checkbox v-model="account.is_default" label="Défaut" dense class="q-mt-sm" />
              <q-btn flat round dense icon="delete" color="negative" size="sm" class="q-mt-sm" @click="removeBankAccount(idx)" />
            </div>

            <!-- Divers -->
            <q-separator class="q-my-xs" />
            <div class="row q-gutter-sm">
              <q-input v-model.number="form.payment_terms_days" label="Délai paiement (jours)" type="number" outlined dense class="col" data-testid="supplier-payment-terms" />
              <q-input v-model="form.country" label="Pays (code 2L)" outlined dense class="col" maxlength="2" hint="BF, CI, SN…" data-testid="supplier-country" />
            </div>
            <q-input v-model="form.notes" label="Notes" outlined dense type="textarea" rows="2" data-testid="supplier-notes" />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" :label="editingSupplier ? 'Enregistrer' : 'Créer'" :loading="loading" @click="submitForm" data-testid="supplier-save-btn" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useSuppliers } from 'src/composables/useSuppliers';
import type {
  Supplier,
  LegalForm,
  TaxRegimeBF,
  TaxDivision,
  PartnerContact,
  PartnerBankAccount,
} from 'src/types';
import {
  LEGAL_FORM_LABELS,
  TAX_REGIME_LABELS,
  TAX_DIVISION_OPTIONS,
} from 'src/types';
import {
  isValidCadastralAddressParts,
  isValidPostalAddress,
  isValidPhoneWithCountryCode,
  isValidEmail,
  isValidTaxDivision,
} from 'src/utils/validators';
import { appwriteStorage } from 'src/services/appwrite-storage';
import { appwriteDb } from 'src/services/appwrite-db';

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
  { name: 'tax_regime',     label: 'Régime',         field: 'tax_regime',     align: 'center' as const },
  { name: 'tax_division',   label: 'Division',       field: (row: Supplier) => row.tax_division ? `${row.tax_division.type} ${row.tax_division.sub_division || ''}` : '', align: 'left' as const },
  { name: 'supplier_type',  label: 'Type',           field: 'supplier_type',  align: 'center' as const },
  { name: 'phone',          label: 'Téléphone',      field: 'phone',          align: 'left'   as const },
  { name: 'country',        label: 'Pays',           field: 'country',        align: 'center' as const },
  { name: 'payment_terms_days', label: 'Délai (j)', field: 'payment_terms_days', align: 'center' as const },
  { name: 'is_active',      label: 'Statut',         field: 'is_active',      align: 'center' as const },
  { name: 'actions',        label: '',               field: 'id',             align: 'right'  as const },
];

const supplierTypeOptions = [
  { value: 'local',   label: 'Fournisseur Local' },
  { value: 'foreign', label: 'Fournisseur Étranger' },
];

const emptyForm = () => ({
  name: '',
  legal_form: null as LegalForm | null,
  legal_form_other: null as string | null,

  physical_address: { city: '', district: '', sector: '' } as { city: string; district: string; sector: string },
  cadastral_address: { parcel: '', lot: '', section: '' } as { parcel: string; lot: string; section: string },
  postal_address: { post_office: '', po_box: '', postal_code: '' } as { post_office: string; po_box: string; postal_code: string },

  phone_country_code: '+226',
  phone: null as string | null,
  email: null as string | null,
  billing_email: null as string | null,

  ifu: null as string | null,
  ifu_scan_file_id: null as string | null,
  rccm: null as string | null,
  rccm_scan_file_id: null as string | null,

  tax_regime: null as TaxRegimeBF | null,
  tax_division: null as TaxDivision | null,

  contacts: [
    { role: 'sales' as const, name: '', function: '', phone: '', email: '' },
    { role: 'accounting' as const, name: '', function: '', phone: '', email: '' },
  ] as PartnerContact[],

  bank_accounts: [] as PartnerBankAccount[],

  charges_vat: false,
  vat_rate: null as 0.18 | 0.10 | null,

  country: 'BF',
  payment_terms_days: 30,
  notes: null as string | null,
  is_active: true,
  supplier_code: null as string | null,
  supplier_type: 'local' as 'local' | 'foreign' | null,
});
const form = ref(emptyForm());

const legalFormOptions = Object.entries(LEGAL_FORM_LABELS).map(([value, label]) => ({ label, value }));
const taxRegimeOptions = Object.entries(TAX_REGIME_LABELS).map(([value, label]) => ({ label, value: value as TaxRegimeBF }));
const taxDivisionOptions = TAX_DIVISION_OPTIONS.map(o => ({
  label: o.label,
  value: `${o.type}:${o.sub || ''}:${o.type === 'DPI' ? '__PROVINCE__' : ''}`,
}));

function serializeSupplierForm(): Partial<Supplier> {
  return {
    name: form.value.name,
    legal_form: form.value.legal_form || null,
    legal_form_other: form.value.legal_form === 'AUTRE' ? (form.value.legal_form_other || null) : null,
    physical_address: form.value.physical_address.city || form.value.physical_address.district || form.value.physical_address.sector
      ? form.value.physical_address
      : null,
    cadastral_address: isValidCadastralAddressParts(form.value.cadastral_address) ? form.value.cadastral_address : null,
    postal_address: isValidPostalAddress(form.value.postal_address) ? form.value.postal_address : null,
    phone_country_code: form.value.phone_country_code || null,
    phone: form.value.phone || null,
    email: form.value.email || null,
    billing_email: form.value.billing_email || null,
    ifu: form.value.ifu || null,
    ifu_scan_file_id: form.value.ifu_scan_file_id,
    rccm: form.value.rccm || null,
    rccm_scan_file_id: form.value.rccm_scan_file_id,
    tax_regime: form.value.tax_regime || null,
    tax_division: form.value.tax_division,
    contacts: form.value.contacts.filter(c => c.name.trim() || c.email.trim()).length > 0
      ? form.value.contacts.filter(c => c.name.trim() || c.email.trim())
      : undefined,
    bank_accounts: form.value.bank_accounts.length > 0 ? form.value.bank_accounts : undefined,
    charges_vat: form.value.charges_vat,
    vat_rate: form.value.charges_vat ? form.value.vat_rate : null,
    country: form.value.country,
    payment_terms_days: form.value.payment_terms_days,
    notes: form.value.notes,
    is_active: form.value.is_active,
    supplier_code: form.value.supplier_code,
    supplier_type: form.value.supplier_type,
  };
}

function deserializeSupplierForm(s: Supplier) {
  form.value = {
    name: s.name,
    legal_form: s.legal_form || null,
    legal_form_other: s.legal_form_other || null,
    physical_address: s.physical_address || { city: '', district: '', sector: '' },
    cadastral_address: s.cadastral_address || { parcel: '', lot: '', section: '' },
    postal_address: s.postal_address || { post_office: '', po_box: '', postal_code: '' },
    phone_country_code: s.phone_country_code || '+226',
    phone: s.phone || null,
    email: s.email || null,
    billing_email: s.billing_email || null,
    ifu: s.ifu || null,
    ifu_scan_file_id: s.ifu_scan_file_id || null,
    rccm: s.rccm || null,
    rccm_scan_file_id: s.rccm_scan_file_id || null,
    tax_regime: s.tax_regime || null,
    tax_division: s.tax_division || null,
    contacts: s.contacts?.length
      ? s.contacts
      : [
          { role: 'sales', name: '', function: '', phone: '', email: '' },
          { role: 'accounting', name: '', function: '', phone: '', email: '' },
        ],
    bank_accounts: s.bank_accounts || [],
    charges_vat: s.charges_vat || false,
    vat_rate: s.vat_rate || null,
    country: s.country || 'BF',
    payment_terms_days: s.payment_terms_days ?? 30,
    notes: s.notes || null,
    is_active: s.is_active,
    supplier_code: s.supplier_code || null,
    supplier_type: s.supplier_type || 'local',
  };
}

const countryCodeRule = (val: string) => !val || /^\+?[0-9]{1,4}$/.test(val) || 'Indicatif invalide';
const phoneRule = (val: string | null) => !val || isValidPhoneWithCountryCode(val, form.value.phone_country_code) || 'Téléphone invalide';
const emailRule = (val: string | null) => !val || isValidEmail(val) || 'E-mail invalide';

function onTaxDivisionSelected(value: string) {
  const [type, sub, province] = value.split(':');
  form.value.tax_division = { type: type as TaxDivision['type'], sub_division: sub || undefined, province: province || undefined };
}

function taxDivisionValue(division?: TaxDivision | null): string {
  if (!division) return '';
  return `${division.type}:${division.sub_division || ''}:${division.type === 'DPI' ? division.province || '' : ''}`;
}

const ifuFile = ref<File | null>(null);
const rccmFile = ref<File | null>(null);

watch(ifuFile, async (file) => {
  if (file) await uploadScan('ifu_scan_file_id', file);
});
watch(rccmFile, async (file) => {
  if (file) await uploadScan('rccm_scan_file_id', file);
});

async function uploadScan(field: 'ifu_scan_file_id' | 'rccm_scan_file_id', file: File) {
  try {
    const safeName = file.name.normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_');
    const key = `suppliers/${Date.now()}-${safeName}`;
    const { data, error } = await appwriteStorage.upload('partner-documents', file, key);
    if (error) throw new Error(error.message);
    form.value[field] = ((data as unknown) as { $id: string }).$id;
    $q.notify({ type: 'positive', message: 'Document joint' });
  } catch (e: unknown) {
    $q.notify({ type: 'negative', message: e instanceof Error ? e.message : 'Erreur upload' });
  }
}

function addBankAccount() {
  if (form.value.bank_accounts.length >= 5) {
    $q.notify({ type: 'warning', message: 'Maximum 5 comptes bancaires' });
    return;
  }
  form.value.bank_accounts.push({ bank_name: '', account_number: '', iban: '', bic: '', is_default: false });
}

function removeBankAccount(index: number) {
  form.value.bank_accounts.splice(index, 1);
}

function addContact() {
  form.value.contacts.push({ role: 'sales', name: '', function: '', phone: '', email: '' });
}

function removeContact(index: number) {
  form.value.contacts.splice(index, 1);
}

function openCreate() { editingSupplier.value = null; form.value = emptyForm(); ifuFile.value = null; rccmFile.value = null; showForm.value = true; }
function openEdit(s: Supplier) {
  editingSupplier.value = s;
  deserializeSupplierForm(s);
  ifuFile.value = null;
  rccmFile.value = null;
  showForm.value = true;
}
async function submitForm() {
  if (!form.value.name) { $q.notify({ type: 'negative', message: 'Nom requis' }); return; }
  if (form.value.tax_regime === 'RNI' && !form.value.charges_vat) {
    $q.notify({ type: 'warning', message: 'Un fournisseur en RNI doit charger la TVA' }); return;
  }
  if (form.value.charges_vat && !form.value.vat_rate) {
    $q.notify({ type: 'warning', message: 'Précisez le taux de TVA (18 % ou 10 %)' }); return;
  }
  if (form.value.tax_division && !isValidTaxDivision(form.value.tax_division)) {
    $q.notify({ type: 'warning', message: 'Division fiscale invalide' }); return;
  }

  const payload = serializeSupplierForm();

  if (editingSupplier.value) {
    await updateSupplier(editingSupplier.value.id, payload);
  } else {
    await createSupplier(payload as Parameters<typeof createSupplier>[0]);
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
async function confirmDelete(s: Supplier) {
  try {
    const { data } = await appwriteDb
      .from('invoices')
      .select('id')
      .eq('supplier_id', s.id)
      .limit(1);
    const hasInvoices = data && data.length > 0;
    if (hasInvoices) {
      $q.dialog({
        title: 'Fournisseur utilisé',
        message: `${s.name} est référencé dans des factures. Le désactiver ?`,
        cancel: true,
        ok: { label: 'Désactiver', color: 'orange' }
      }).onOk(async () => { await updateSupplier(s.id, { is_active: false }); });
    } else {
      $q.dialog({ title: 'Supprimer', message: `Supprimer définitivement ${s.name} ?`, cancel: true, ok: { color: 'negative' } })
        .onOk(async () => { await deleteSupplier(s.id); });
    }
  } catch {
    $q.dialog({ title: 'Supprimer', message: `Supprimer ${s.name} ?`, cancel: true, ok: { color: 'negative' } })
      .onOk(async () => { await deleteSupplier(s.id); });
  }
}

onMounted(() => loadSuppliers());
</script>
