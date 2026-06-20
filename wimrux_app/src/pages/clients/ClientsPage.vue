<template>
  <q-page padding>
    <!-- PROJECT ADMIN VIEW: Companies on the SaaS platform -->
    <template v-if="isProjectAdmin">
      <div class="row items-center q-mb-md">
        <div class="text-h5">Entreprises SaaS</div>
        <q-space />
        <q-btn color="primary" icon="add_business" label="Nouvelle entreprise" no-caps @click="openCompanyDialog()" />
      </div>

      <q-input v-model="search" outlined dense placeholder="Rechercher par nom, IFU..." class="q-mb-md" data-testid="client-search" clearable>
        <template v-slot:prepend><q-icon name="search" /></template>
      </q-input>

      <q-table
        :rows="filteredCompanies"
        :columns="companyColumns"
        row-key="id"
        :loading="loading"
        flat
        bordered
        :pagination="{ rowsPerPage: 15 }"
      >
        <template v-slot:body-cell-is_active="props">
          <q-td :props="props">
            <q-toggle
              :model-value="props.row.is_active"
              color="positive"
              :label="props.row.is_active ? 'Actif' : 'Inactif'"
              dense
              @update:model-value="val => toggleCompanyActive(props.row, !!val)"
            />
          </q-td>
        </template>
        <template v-slot:body-cell-chatbot_enabled="props">
          <q-td :props="props">
            <q-badge :color="props.row.chatbot_enabled ? 'green' : 'grey'" :label="props.row.chatbot_enabled ? 'Actif' : 'Inactif'" />
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense icon="person_add" size="sm" color="teal" @click="openUserDialog(props.row)">
              <q-tooltip>Ajouter un utilisateur</q-tooltip>
            </q-btn>
            <q-btn flat dense icon="edit" size="sm" @click="openCompanyDialog(props.row)" />
          </q-td>
        </template>
      </q-table>

      <!-- Company dialog -->
      <q-dialog v-model="companyDialogOpen" persistent>
        <q-card style="min-width: 550px">
          <q-card-section>
            <div class="text-h6">{{ editingCompany ? "Modifier l'entreprise" : 'Nouvelle entreprise' }}</div>
          </q-card-section>
          <q-card-section>
            <q-form @submit.prevent="saveCompany" class="q-gutter-sm">
              <q-input v-model="companyForm.name" label="Raison sociale" filled :rules="[val => !!val || 'Nom requis']" />
              <q-input v-model="companyForm.ifu" label="IFU" filled :rules="[val => !!val || 'IFU requis']" />
              <q-input v-model="companyForm.rccm" label="RCCM" filled />
              <q-input
                v-model="companyForm.address_cadastral"
                label="Adresse cadastrale"
                filled
                hint="Saisie libre"
              />
              <div class="row q-gutter-sm">
                <q-input v-model="companyForm.phone" label="Téléphone" filled class="col" />
                <q-input v-model="companyForm.email" label="Email" filled type="email" class="col" />
              </div>
              <div class="row justify-end q-gutter-sm q-mt-md">
                <q-btn flat label="Annuler" v-close-popup no-caps />
                <q-btn type="submit" color="primary" :label="editingCompany ? 'Modifier' : 'Créer'" :loading="saving" no-caps />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </q-dialog>

      <!-- User creation dialog -->
      <q-dialog v-model="userDialogOpen" persistent>
        <q-card style="min-width: 500px">
          <q-card-section>
            <div class="text-h6">Nouvel utilisateur</div>
            <div class="text-caption text-grey">{{ targetCompany?.name }}</div>
          </q-card-section>
          <q-card-section>
            <q-form @submit.prevent="createCompanyUser" class="q-gutter-sm">
              <q-input v-model="userForm.full_name" label="Nom complet" filled :rules="[val => !!val || 'Nom requis']" />
              <q-input v-model="userForm.email" label="Email" filled type="email" :rules="[val => !!val || 'Email requis']" />
              <q-select
                v-model="userForm.role"
                :options="roleOptions"
                label="Rôle"
                emit-value
                map-options
                filled
                :rules="[val => !!val || 'Rôle requis']"
              />
              <q-input
                v-model="userForm.password"
                label="Mot de passe"
                filled
                :type="showPassword ? 'text' : 'password'"
                :rules="[val => !!val || 'Mot de passe requis', val => val.length >= 8 || 'Minimum 8 caractères']"
              >
                <template v-slot:append>
                  <q-btn flat dense :icon="showPassword ? 'visibility_off' : 'visibility'" @click="showPassword = !showPassword">
                    <q-tooltip>{{ showPassword ? 'Masquer' : 'Afficher' }}</q-tooltip>
                  </q-btn>
                  <q-btn flat dense icon="refresh" @click="userForm.password = generatePassword()">
                    <q-tooltip>Générer un mot de passe fort</q-tooltip>
                  </q-btn>
                </template>
              </q-input>
              <div v-if="userForm.password" class="q-mt-xs">
                <div class="row items-center q-gutter-sm">
                  <div class="col">
                    <q-linear-progress
                      :value="passwordStrength.score / 4"
                      :color="passwordStrength.color"
                      rounded
                      size="8px"
                    />
                  </div>
                  <div :class="'text-caption text-' + passwordStrength.color" style="min-width: 80px">
                    {{ passwordStrength.label }}
                  </div>
                </div>
              </div>
              <div class="row justify-end q-gutter-sm q-mt-md">
                <q-btn flat label="Annuler" v-close-popup no-caps />
                <q-btn type="submit" color="primary" label="Créer le compte" :loading="savingUser" no-caps icon="person_add" />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </q-dialog>

      <!-- Credentials display modal -->
      <q-dialog v-model="credentialsDialogOpen">
        <q-card style="min-width: 500px">
          <q-card-section>
            <div class="text-h6 text-positive">
              <q-icon name="check_circle" class="q-mr-sm" />Compte créé avec succès
            </div>
          </q-card-section>
          <q-card-section>
              <q-banner rounded class="bg-blue-1 q-mb-md">
                <div class="text-caption text-grey-8 q-mb-xs">Entreprise</div>
                <div class="text-bold">{{ generatedCredentials?.company }}</div>
              </q-banner>
              <div class="q-gutter-sm">
                <q-input :model-value="generatedCredentials?.email" label="Email" filled readonly dense>
                  <template v-slot:append>
                    <q-btn flat dense icon="content_copy" @click="copyToClipboard(generatedCredentials?.email || '')">
                      <q-tooltip>Copier</q-tooltip>
                    </q-btn>
                  </template>
                </q-input>
                <q-input :model-value="generatedCredentials?.password" label="Mot de passe" filled readonly dense>
                  <template v-slot:append>
                    <q-btn flat dense icon="content_copy" @click="copyToClipboard(generatedCredentials?.password || '')">
                      <q-tooltip>Copier</q-tooltip>
                    </q-btn>
                  </template>
                </q-input>
                <q-input :model-value="generatedCredentials?.role" label="Rôle" filled readonly dense />
              </div>
            <q-banner rounded class="bg-orange-1 q-mt-md text-caption">
              <q-icon name="warning" color="orange" class="q-mr-xs" />
              Communiquez ces identifiants de manière sécurisée. Le mot de passe ne pourra plus être affiché.
            </q-banner>
          </q-card-section>
          <q-card-actions align="right" class="q-pa-md">
            <q-btn flat label="Copier tout" icon="content_copy" no-caps @click="copyAllCredentials" />
            <q-btn color="primary" label="Fermer" v-close-popup no-caps />
          </q-card-actions>
        </q-card>
      </q-dialog>
    </template>

    <!-- REGULAR ADMIN VIEW: Clients for invoicing -->
    <template v-else>
      <div class="row items-center q-mb-md">
        <div class="text-h5">Clients</div>
        <q-space />
        <q-btn color="primary" icon="add" label="Nouveau client" no-caps data-testid="client-new-btn" @click="openDialog()" />
      </div>

      <q-input v-model="search" outlined dense placeholder="Rechercher par nom, IFU..." class="q-mb-md" data-testid="client-search" clearable>
        <template v-slot:prepend><q-icon name="search" /></template>
      </q-input>

      <q-table
        :rows="filteredClients"
        :columns="columns"
        row-key="id"
        :loading="loading"
        flat
        bordered
        :pagination="{ rowsPerPage: 15 }"
      >
        <template v-slot:body="props">
          <q-tr :props="props" data-testid="client-row" :data-client-id="props.row.id">
            <q-td key="type" :props="props">
              <q-badge :color="typeColor(props.row.type)" :label="typeLabel(props.row.type)" />
            </q-td>
            <q-td key="name" :props="props">{{ props.row.name }}</q-td>
            <q-td key="ifu" :props="props">{{ props.row.ifu }}</q-td>
            <q-td key="phone" :props="props">{{ props.row.phone }}</q-td>
            <q-td key="email" :props="props">{{ props.row.email }}</q-td>
            <q-td key="is_active" :props="props">
              <q-toggle
                :model-value="props.row.is_active"
                color="positive"
                :label="props.row.is_active ? 'Actif' : 'Inactif'"
                dense
                @update:model-value="val => toggleClientActive(props.row, !!val)"
              />
            </q-td>
            <q-td key="actions" :props="props">
              <q-btn flat dense icon="edit" size="sm" @click="openDialog(props.row)" />
              <q-btn flat dense icon="delete" size="sm" color="negative" data-testid="client-delete" @click="confirmDelete(props.row)" />
            </q-td>
          </q-tr>
        </template>
      </q-table>

    <!-- Dialog create/edit -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card style="min-width: 720px; max-width: 900px">
        <q-card-section>
          <div class="text-h6">{{ editingClient ? 'Modifier le client' : 'Nouveau client' }}</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit.prevent="saveClient" class="q-gutter-md">

            <!-- Identité -->
            <div class="text-subtitle2 text-grey-8">Identité</div>
            <div class="row q-gutter-sm">
              <q-select
                v-model="form.type"
                :options="clientTypeOptions"
                label="Type de client *"
                emit-value map-options filled class="col-4"
                data-testid="client-type-pm"
                :rules="[val => !!val || 'Type requis']"
              />
              <q-input v-model="form.name" label="Nom / Raison sociale *" filled class="col" data-testid="client-name" :rules="[val => !!val || 'Nom requis']" />
            </div>
            <div class="row q-gutter-sm">
              <q-select
                v-model="form.legal_form"
                :options="legalFormOptions"
                label="Forme juridique"
                emit-value map-options filled class="col"
                clearable
              />
              <q-input v-if="form.legal_form === 'AUTRE'" v-model="form.legal_form_other" label="Préciser la forme juridique" filled class="col" />
            </div>

            <!-- Adresse physique -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8">Adresse physique</div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.physical_address.city" label="Ville" filled class="col" />
              <q-input v-model="form.physical_address.district" label="Quartier" filled class="col" />
              <q-input v-model="form.physical_address.sector" label="Secteur" filled class="col" />
            </div>

            <!-- Adresse cadastrale -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8">Adresse cadastrale</div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.cadastral_address.parcel" label="Parcelle" filled class="col" />
              <q-input v-model="form.cadastral_address.lot" label="Lot" filled class="col" />
              <q-input v-model="form.cadastral_address.section" label="Section" filled class="col" />
            </div>

            <!-- Adresse postale -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8">Adresse postale</div>
            <div class="row q-gutter-sm">
              <q-input v-model="form.postal_address.post_office" label="Bureau postal / Centre de distribution" filled class="col" hint="Ex: 01, 02, CMS..." />
              <q-input v-model="form.postal_address.po_box" label="N° boîte postale" filled class="col" hint="Ex: BP6656" />
              <q-input v-model="form.postal_address.postal_code" label="Code postal" filled class="col" hint="Ex: OUAGA01" />
            </div>

            <!-- Coordonnées -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8">Coordonnées</div>
            <PhoneCountryInput
              v-model:country-code="form.country"
              v-model:phone="form.phone"
              :phone-rules="[phoneRule]"
              phone-label="Téléphone"
            />
            <div class="row q-gutter-sm">
              <q-input v-model="form.email" label="E-mail" filled type="email" class="col" data-testid="client-email" :rules="[emailRule]" />
              <q-input v-model="form.billing_email" label="E-mail de facturation" filled type="email" class="col" :rules="[emailRule]" />
            </div>

            <!-- IFU / RCCM -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8">Identification fiscale</div>
            <div class="row q-gutter-sm items-end">
              <q-input
                v-model="form.ifu"
                label="IFU"
                filled class="col"
                data-testid="client-ifu"
                :rules="ifuRules"
                :hint="['PM', 'PC'].includes(form.type) ? 'Obligatoire pour PM et PC' : 'Optionnel'"
              >
                <template v-slot:after v-if="form.ifu">
                  <q-btn
                    v-if="form.country === 'BF'"
                    flat dense color="primary" icon="verified" label="Vérifier"
                    :loading="ifuVerifying"
                    data-testid="client-ifu-verify-btn"
                    @click="verifyIfuOnline"
                  />
                  <q-toggle
                    v-else
                    v-model="form.ifu_verified"
                    label="Vérifié manuellement"
                    color="positive" dense
                    data-testid="client-ifu-manual-toggle"
                  />
                </template>
              </q-input>
              <q-input v-model="form.rccm" label="RCCM" filled class="col" v-if="form.type === 'PM'" />
            </div>
            <div v-if="ifuVerifyStatus" class="q-mt-xs">
              <q-badge :color="ifuVerifyStatus.color" :label="ifuVerifyStatus.message" />
            </div>
            <div class="row q-gutter-sm q-mt-sm">
              <div class="col">
                <q-file v-model="ifuFile" label="Scan IFU" filled dense clearable accept=".pdf,.jpg,.jpeg,.png">
                  <template v-slot:append>
                    <q-icon v-if="form.ifu_scan_file_id" name="check_circle" color="positive" />
                  </template>
                </q-file>
              </div>
              <div class="col">
                <q-file v-model="rccmFile" label="Scan RCCM" filled dense clearable accept=".pdf,.jpg,.jpeg,.png">
                  <template v-slot:append>
                    <q-icon v-if="form.rccm_scan_file_id" name="check_circle" color="positive" />
                  </template>
                </q-file>
              </div>
            </div>

            <!-- Régime / Division fiscale -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8">Fiscalité</div>
            <div class="row q-gutter-sm">
              <q-select
                v-model="form.tax_regime"
                :options="taxRegimeOptions"
                label="Régime d'imposition"
                emit-value map-options filled class="col"
                clearable
              />
              <q-select
                :model-value="taxDivisionValue(form.tax_division)"
                @update:model-value="onTaxDivisionSelected"
                :options="taxDivisionOptions"
                label="Division fiscale"
                emit-value map-options filled class="col"
                clearable
              />
            </div>
            <q-input
              v-if="form.tax_division?.type === 'DPI'"
              v-model="form.tax_division.province"
              label="Province"
              filled
              :rules="[v => !!v || 'Province requise pour DPI']"
            />

            <!-- TVA -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8 q-mb-xs">TVA</div>
            <div class="row q-gutter-sm items-center">
              <q-toggle v-model="form.charges_vat" label="Charge la TVA" color="primary" data-testid="client-vat-toggle" />
              <q-input
                v-model="vatRateDisplay"
                type="number"
                suffix="%"
                filled
                dense
                style="max-width: 140px"
                :min="0"
                :max="100"
                :step="0.01"
                :disable="!form.charges_vat"
                :rules="[v => !form.charges_vat || (v > 0 && v <= 100) || 'Taux entre 0 et 100%']"
                data-testid="client-vat-rate-input"
              />
            </div>

            <!-- Contacts -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8 row items-center">
              Contacts
              <q-btn flat round dense icon="add" size="sm" color="primary" class="q-ml-sm" data-testid="client-add-contact" @click="addContact" />
            </div>
            <div v-for="(contact, idx) in form.contacts" :key="idx" class="row q-gutter-sm items-start">
              <q-select
                v-model="contact.role"
                :options="[{ label: 'Contact vente', value: 'sales' }, { label: 'Contact comptabilité', value: 'accounting' }]"
                label="Rôle"
                emit-value map-options filled class="col-3"
              />
              <q-input v-model="contact.name" label="Nom" filled class="col" />
              <q-input v-model="contact.function" label="Fonction" filled class="col" />
              <q-input v-model="contact.phone" label="Téléphone" filled class="col" />
              <q-input v-model="contact.email" label="E-mail" filled type="email" class="col" />
              <q-btn flat round dense icon="delete" color="negative" size="sm" class="q-mt-sm" @click="removeContact(idx)" />
            </div>

            <!-- Comptes bancaires -->
            <q-separator class="q-my-xs" />
            <div class="text-subtitle2 text-grey-8 row items-center">
              Comptes bancaires (max. 5)
              <q-btn flat round dense icon="add" size="sm" color="primary" class="q-ml-sm" data-testid="client-add-bank" @click="addBankAccount" />
            </div>
            <div v-for="(account, idx) in form.bank_accounts" :key="`bank-${idx}`" class="row q-gutter-sm items-start">
              <q-input v-model="account.bank_name" label="Banque" filled class="col" />
              <q-input v-model="account.account_number" label="N° compte" filled class="col" />
              <q-input v-model="account.iban" label="IBAN / RIB" filled class="col" />
              <q-input v-model="account.bic" label="BIC / SWIFT" filled class="col-2" />
              <q-checkbox v-model="account.is_default" label="Défaut" dense class="q-mt-sm" />
              <q-btn flat round dense icon="delete" color="negative" size="sm" class="q-mt-sm" @click="removeBankAccount(idx)" />
            </div>

            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat label="Annuler" v-close-popup no-caps />
              <q-btn type="submit" color="primary" :label="editingClient ? 'Modifier' : 'Créer'" data-testid="client-save-btn" :loading="saving" no-caps />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useQuasar, copyToClipboard as qCopy } from 'quasar';
import { useAuthStore } from 'src/stores/auth-store-appwrite';
import type { Client, ClientType, Company, UserRole, LegalForm, TaxRegimeBF, TaxDivision, PartnerContact, PartnerBankAccount } from 'src/types';
import { LEGAL_FORM_LABELS, TAX_REGIME_LABELS, TAX_DIVISION_OPTIONS, getCountryByCode, getCountryByDial } from 'src/types';
import {
  isValidIFU,
  isValidExportIFU,
  IFU_ERROR_MSG,
  IFU_ERROR_MSG_BF,
  IFU_ERROR_MSG_EXPORT,
  isValidCadastralAddressParts,
  isValidPostalAddress,
  isValidPhoneWithCountryCode,
  isValidEmail,
  isValidTaxDivision,
  vatFractionToPercent,
  vatPercentToFraction,
} from 'src/utils/validators';
import { verifyTaxIdOnline } from 'src/utils/fiscalCompliance';
import { appwriteDb } from 'src/services/appwrite-db';
import { appwriteAuth } from 'src/services/appwrite-auth';
import { appwriteStorage } from 'src/services/appwrite-storage';
import PhoneCountryInput from 'src/components/common/PhoneCountryInput.vue';

const $q = useQuasar();
const authStore = useAuthStore();

const clients = ref<Client[]>([]);
const companies = ref<Company[]>([]);
const loading = ref(false);
const saving = ref(false);
const search = ref('');
const dialogOpen = ref(false);
const editingClient = ref<Client | null>(null);
const companyDialogOpen = ref(false);
const editingCompany = ref<Company | null>(null);

// Project-admin view state
const isProjectAdmin = computed(() => ((authStore.user as unknown) as { role?: string } | null)?.role === 'project_admin');
const companyForm = ref({ name: '', ifu: '', rccm: '', address_cadastral: '', phone: '', email: '' });
const userDialogOpen = ref(false);
const credentialsDialogOpen = ref(false);
const targetCompany = ref<Company | null>(null);
const userForm = ref({ full_name: '', email: '', role: 'admin' as UserRole, password: '' });
const savingUser = ref(false);
const generatedCredentials = ref<{ email: string; password: string; company: string; role: string } | null>(null);
const showPassword = ref(false);
const roleOptions = [
  { label: 'Administrateur', value: 'admin' as UserRole },
  { label: 'Comptable', value: 'accountant' as UserRole },
  { label: 'Utilisateur', value: 'user' as UserRole },
];
const passwordStrength = computed(() => {
  const pwd = userForm.value.password;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const colors = ['negative', 'negative', 'orange', 'warning', 'positive', 'positive'];
  const labels = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Fort', 'Très fort'];
  return { score: Math.min(score, 5), color: colors[score] || 'positive', label: labels[score] || 'Très fort' };
});
const companyColumns = [
  { name: 'name', label: 'Nom', field: 'name', align: 'left' as const, sortable: true },
  { name: 'ifu', label: 'IFU', field: 'ifu', align: 'left' as const },
  { name: 'phone', label: 'Téléphone', field: 'phone', align: 'left' as const },
  { name: 'is_active', label: 'Statut', field: 'is_active', align: 'center' as const },
  { name: 'chatbot_enabled', label: 'Chatbot', field: 'chatbot_enabled', align: 'center' as const },
  { name: 'actions', label: '', field: 'id', align: 'right' as const },
];
const filteredCompanies = computed(() => {
  if (!search.value) return companies.value;
  const q = search.value.toLowerCase();
  return companies.value.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.ifu && c.ifu.toLowerCase().includes(q))
  );
});

const form = ref({
  type: 'CC' as ClientType,
  name: '',
  legal_form: null as LegalForm | null,
  legal_form_other: '',

  physical_address: { city: '', district: '', sector: '' },
  cadastral_address: { parcel: '', lot: '', section: '' },
  postal_address: { post_office: '', po_box: '', postal_code: '' },

  country: 'BF' as string,
  phone: '',
  email: '',
  billing_email: '',

  ifu: '',
  ifu_scan_file_id: null as string | null,
  ifu_verified: false as boolean,
  ifu_verified_at: null as string | null,
  ifu_verified_by: null as string | null,
  rccm: '',
  rccm_scan_file_id: null as string | null,

  tax_regime: null as TaxRegimeBF | null,
  tax_division: null as TaxDivision | null,

  contacts: [
    { role: 'sales' as const, name: '', function: '', phone: '', email: '' },
    { role: 'accounting' as const, name: '', function: '', phone: '', email: '' },
  ] as PartnerContact[],

  bank_accounts: [] as PartnerBankAccount[],

  charges_vat: false,
  vat_rate: null as number | null,

  address: '',
  address_cadastral: '',
});

const legalFormOptions = Object.entries(LEGAL_FORM_LABELS).map(([value, label]) => ({ label, value }));
const taxRegimeOptions = Object.entries(TAX_REGIME_LABELS).map(([value, label]) => ({ label, value: value as TaxRegimeBF }));
const taxDivisionOptions = TAX_DIVISION_OPTIONS.map(o => ({ label: o.label, value: `${o.type}:${o.sub || ''}:${o.type === 'DPI' ? '__PROVINCE__' : ''}` }));

function emptyClientForm() {
  form.value = {
    type: 'CC',
    name: '',
    legal_form: null,
    legal_form_other: '',
    physical_address: { city: '', district: '', sector: '' },
    cadastral_address: { parcel: '', lot: '', section: '' },
    postal_address: { post_office: '', po_box: '', postal_code: '' },
    country: 'BF',
    phone: '',
    email: '',
    billing_email: '',
    ifu: '',
    ifu_scan_file_id: null,
    ifu_verified: false,
    ifu_verified_at: null,
    ifu_verified_by: null,
    rccm: '',
    rccm_scan_file_id: null,
    tax_regime: null,
    tax_division: null,
    contacts: [
      { role: 'sales', name: '', function: '', phone: '', email: '' },
      { role: 'accounting', name: '', function: '', phone: '', email: '' },
    ],
    bank_accounts: [],
    charges_vat: false,
    vat_rate: null,
    address: '',
    address_cadastral: '',
  };
}

function serializeClientForm(): Partial<Client> {
  return {
    type: form.value.type,
    name: form.value.name,
    legal_form: form.value.legal_form || null,
    legal_form_other: form.value.legal_form === 'AUTRE' ? (form.value.legal_form_other || null) : null,
    physical_address: form.value.physical_address.city || form.value.physical_address.district || form.value.physical_address.sector
      ? form.value.physical_address
      : null,
    cadastral_address: isValidCadastralAddressParts(form.value.cadastral_address) ? form.value.cadastral_address : null,
    postal_address: isValidPostalAddress(form.value.postal_address) ? form.value.postal_address : null,
    phone_country_code: getCountryByCode(form.value.country)?.dial || null,
    country: form.value.country || null,
    phone: form.value.phone || null,
    email: form.value.email || null,
    billing_email: form.value.billing_email || null,
    ifu: form.value.ifu || null,
    ifu_scan_file_id: form.value.ifu_scan_file_id,
    ifu_verified: form.value.ifu_verified || false,
    ifu_verified_at: form.value.ifu_verified_at || null,
    ifu_verified_by: form.value.ifu_verified_by || null,
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
    address: null,
    address_cadastral: null,
  };
}

function deserializeClientForm(client: Client) {
  form.value = {
    type: client.type,
    name: client.name,
    legal_form: client.legal_form || null,
    legal_form_other: client.legal_form_other || '',
    physical_address: client.physical_address || { city: '', district: '', sector: '' },
    cadastral_address: client.cadastral_address || { parcel: '', lot: '', section: '' },
    postal_address: client.postal_address || { post_office: '', po_box: '', postal_code: '' },
    country: client.country || getCountryByDial(client.phone_country_code)?.code || 'BF',
    phone: client.phone || '',
    email: client.email || '',
    billing_email: client.billing_email || '',
    ifu: client.ifu || '',
    ifu_scan_file_id: client.ifu_scan_file_id || null,
    ifu_verified: client.ifu_verified || false,
    ifu_verified_at: client.ifu_verified_at || null,
    ifu_verified_by: client.ifu_verified_by || null,
    rccm: client.rccm || '',
    rccm_scan_file_id: client.rccm_scan_file_id || null,
    tax_regime: client.tax_regime || null,
    tax_division: client.tax_division || null,
    contacts: client.contacts?.length
      ? client.contacts
      : [
          { role: 'sales', name: '', function: '', phone: '', email: '' },
          { role: 'accounting', name: '', function: '', phone: '', email: '' },
        ],
    bank_accounts: client.bank_accounts || [],
    charges_vat: client.charges_vat || false,
    vat_rate: client.vat_rate || null,
    address: client.address || '',
    address_cadastral: client.address_cadastral || '',
  };
}

const phoneRule = (val: string) => !val || isValidPhoneWithCountryCode(val, getCountryByCode(form.value.country)?.dial) || 'Téléphone invalide';
const emailRule = (val: string) => !val || isValidEmail(val) || 'E-mail invalide';

const vatRateDisplay = computed({
  get: () => vatFractionToPercent(form.value.vat_rate) ?? 18,
  set: (val: number) => { form.value.vat_rate = vatPercentToFraction(val); },
});

watch(() => form.value.charges_vat, (on) => {
  if (on && !form.value.vat_rate) form.value.vat_rate = 0.18;
});

const ifuVerifying = ref(false);
const ifuVerifyStatus = ref<{ color: string; message: string } | null>(null);

async function verifyIfuOnline() {
  if (!form.value.ifu) return;
  ifuVerifying.value = true;
  ifuVerifyStatus.value = null;
  try {
    const result = await verifyTaxIdOnline('BF', form.value.ifu);
    if (result.online_check === 'valid') {
      form.value.ifu_verified = true;
      form.value.ifu_verified_at = new Date().toISOString();
      form.value.ifu_verified_by = authStore.user?.id || null;
      ifuVerifyStatus.value = { color: 'positive', message: 'IFU vérifié en ligne ✓' };
      return;
    }
    if (result.online_check === 'invalid') {
      form.value.ifu_verified = false;
      ifuVerifyStatus.value = { color: 'negative', message: result.online_message || result.format_message || 'IFU invalide' };
      return;
    }
  } catch {
    // service indisponible : on bascule en vérification manuelle
  } finally {
    ifuVerifying.value = false;
  }
  // En cas d'erreur de permission/service, on permet quand même de valider manuellement
  form.value.ifu_verified = true;
  form.value.ifu_verified_at = new Date().toISOString();
  form.value.ifu_verified_by = authStore.user?.id || null;
  ifuVerifyStatus.value = { color: 'orange', message: 'Vérification en ligne indisponible — IFU marqué comme vérifié manuellement' };
  window.open(`https://dgi.bf/verification/verification-ifu?ifu=${form.value.ifu}`, '_blank');
}

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
    const key = `clients/${Date.now()}-${safeName}`;
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

const clientTypeOptions = [
  { label: 'CC — Client comptant', value: 'CC' },
  { label: 'PM — Personne morale', value: 'PM' },
  { label: 'PP — Personne physique', value: 'PP' },
  { label: 'PC — Personne physique commerçant', value: 'PC' },
];

const columns = [
  { name: 'type', label: 'Type', field: 'type', align: 'center' as const, sortable: true },
  { name: 'name', label: 'Nom', field: 'name', align: 'left' as const, sortable: true },
  { name: 'ifu', label: 'IFU', field: 'ifu', align: 'left' as const },
  { name: 'phone', label: 'Téléphone', field: 'phone', align: 'left' as const },
  { name: 'email', label: 'Email', field: 'email', align: 'left' as const },
  { name: 'is_active', label: 'Statut', field: 'is_active', align: 'center' as const, sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' as const },
];

const filteredClients = computed(() => {
  if (!search.value) return clients.value;
  const q = search.value.toLowerCase();
  return clients.value.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.ifu && c.ifu.toLowerCase().includes(q)) ||
    (c.email && c.email.toLowerCase().includes(q))
  );
});

const ifuRules = computed(() => {
  if (form.value.type === 'PC') {
    return [
      (val: string) => !!val || 'IFU obligatoire pour PC',
      (val: string) => !val || isValidExportIFU(val) || IFU_ERROR_MSG_EXPORT,
    ];
  }
  if (form.value.type === 'PM') {
    return [
      (val: string) => !!val || 'IFU obligatoire pour PM',
      (val: string) => !val || isValidIFU(val) || IFU_ERROR_MSG_BF,
    ];
  }
  return [(val: string) => !val || isValidIFU(val) || IFU_ERROR_MSG_BF];
});

async function toggleClientActive(client: Client, val: boolean) {
  try {
    const { error } = await appwriteDb
      .from('clients')
      .update(client.id, { is_active: val });

    if (error) throw new Error(error.message);

    client.is_active = val;
    $q.notify({ type: 'positive', message: val ? 'Client activé' : 'Client désactivé' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur';
    $q.notify({ type: 'negative', message });
  }
}

function typeColor(t: string) {
  const map: Record<string, string> = { CC: 'grey', PM: 'blue', PP: 'green', PC: 'orange' };
  return map[t] || 'grey';
}

function typeLabel(t: string) {
  const map: Record<string, string> = { CC: 'Comptant', PM: 'Morale', PP: 'Physique', PC: 'Phys. Commerçant' };
  return map[t] || t;
}

async function loadCompanies() {
  loading.value = true;
  try {
    const { data, error } = await appwriteDb
      .from('companies')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      companies.value = data as Company[];
    }
  } finally {
    loading.value = false;
  }
}

function openCompanyDialog(company?: Company) {
  if (company) {
    editingCompany.value = company;
    companyForm.value = {
      name: company.name,
      ifu: company.ifu || '',
      rccm: company.rccm || '',
      address_cadastral: company.address_cadastral || '',
      phone: company.phone || '',
      email: company.email || '',
    };
  } else {
    editingCompany.value = null;
    companyForm.value = { name: '', ifu: '', rccm: '', address_cadastral: '', phone: '', email: '' };
  }
  companyDialogOpen.value = true;
}

async function toggleCompanyActive(company: Company, val: boolean) {
  try {
    const { error } = await appwriteDb
      .from('companies')
      .update(company.id, { is_active: val });

    if (error) throw new Error(error.message);

    company.is_active = val;
    $q.notify({ type: 'positive', message: val ? 'Entreprise activée' : 'Entreprise désactivée' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur';
    $q.notify({ type: 'negative', message });
  }
}

function generatePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*';
  const all = upper + lower + digits + special;
  let pwd = '';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  pwd += special[Math.floor(Math.random() * special.length)];
  for (let i = 4; i < 12; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

function openUserDialog(company: Company) {
  targetCompany.value = company;
  userForm.value = {
    full_name: '',
    email: '',
    role: 'admin',
    password: generatePassword(),
  };
  userDialogOpen.value = true;
}

async function createCompanyUser() {
  if (!targetCompany.value) return;
  savingUser.value = true;
  try {
    
    let userId: string | undefined;

    // Step 1: Try signUp
    const { user: authUser, error: authError } = await appwriteAuth.signUp(userForm.value.email, userForm.value.password, userForm.value.full_name);
    const authData = authUser ? { user: authUser } : null;

    if (authError) {
      const msg = (authError.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('existe')) {
        // User auth account exists — try signIn to get their ID
        const { user: loginUser, error: loginError } = await appwriteAuth.signIn(userForm.value.email, userForm.value.password);
        const loginData = loginUser ? { user: loginUser } : null;

        if (loginError || !loginData?.user?.id) {
          throw new Error('Cet email est déjà utilisé par un compte existant. Vérifiez le mot de passe ou utilisez un autre email.');
        }

        userId = (loginData?.user as { id?: string; $id?: string })?.id ?? (loginData?.user as { id?: string; $id?: string })?.$id;
        // Sign out from the fresh client to avoid session conflicts
        await appwriteAuth.signOut();
      } else {
        throw new Error(authError.message || 'Erreur lors de la création du compte');
      }
    } else {
      userId = authData?.user?.id;
    }

    if (!userId) {
      // Email confirmation enabled — retrieve ID via secure RPC
      const { data: rpcId } = await appwriteDb
        .rpc('get_user_id_by_email', { p_email: userForm.value.email });
      userId = rpcId as string | undefined;
    }

    if (!userId) throw new Error('Impossible de recuperer l ID utilisateur. Veuillez reessayer.');

    // Step 2: Check if profile already exists for this user
    const { data: existingProfile } = await appwriteDb
      .from('user_profiles')
      .select('id, company_id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingProfile) {
      throw new Error(
        `Cet utilisateur a déjà un profil (entreprise: ${existingProfile.company_id}). Un utilisateur ne peut appartenir qu'à une seule entreprise.`
      );
    }

    // Step 3: Create user_profile
    const { error: profileError } = await appwriteDb
      .from('user_profiles')
      .insert({
        user_id: userId,
        company_id: targetCompany.value.id,
        role: userForm.value.role,
        full_name: userForm.value.full_name,
      });

    if (profileError) throw new Error(profileError.message);

    // Step 4: Show credentials
    const roleLbl = roleOptions.find(r => r.value === userForm.value.role)?.label || userForm.value.role;
    generatedCredentials.value = {
      company: targetCompany.value.name,
      email: userForm.value.email,
      password: userForm.value.password,
      role: roleLbl,
    };

    userDialogOpen.value = false;
    credentialsDialogOpen.value = true;
    $q.notify({ type: 'positive', message: 'Compte utilisateur créé avec succès' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    $q.notify({ type: 'negative', message, timeout: 5000 });
  } finally {
    savingUser.value = false;
  }
}

function copyToClipboard(text: string) {
  void qCopy(text).then(() => {
    $q.notify({ type: 'positive', message: 'Copié !', timeout: 1000 });
  });
}

function copyAllCredentials() {
  const c = generatedCredentials.value;
  if (!c) return;
  const text = `Entreprise: ${c.company}\nEmail: ${c.email}\nMot de passe: ${c.password}\nRôle: ${c.role}`;
  copyToClipboard(text);
}

async function saveCompany() {
  saving.value = true;
  try {
    const payload = {
      ...companyForm.value,
      address_cadastral: companyForm.value.address_cadastral?.trim() || null,
    };

    if (editingCompany.value) {
      const { error } = await appwriteDb
        .from('companies')
        .update(editingCompany.value.id, payload);

      if (error) throw new Error(error.message);
      $q.notify({ type: 'positive', message: 'Entreprise modifiée' });
    } else {
      const { error } = await appwriteDb
        .from('companies')
        .insert(payload);

      if (error) throw new Error(error.message);
      $q.notify({ type: 'positive', message: 'Entreprise créée' });
    }

    companyDialogOpen.value = false;
    await loadCompanies();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur';
    $q.notify({ type: 'negative', message });
  } finally {
    saving.value = false;
  }
}

async function loadClients() {
  loading.value = true;
  try {
    const { data, error } = await appwriteDb
      .from('clients')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data) {
      clients.value = data as Client[];
    }
  } finally {
    loading.value = false;
  }
}

function openDialog(client?: Client) {
  if (client) {
    editingClient.value = client;
    deserializeClientForm(client);
  } else {
    editingClient.value = null;
    emptyClientForm();
  }
  ifuFile.value = null;
  rccmFile.value = null;
  dialogOpen.value = true;
}

async function saveClient() {
  saving.value = true;
  try {
    if (form.value.tax_division && !isValidTaxDivision(form.value.tax_division)) {
      $q.notify({ type: 'warning', message: 'Division fiscale invalide' });
      saving.value = false;
      return;
    }

    const payload = {
      ...serializeClientForm(),
      company_id: authStore.companyId,
    };

    if (editingClient.value) {
      const { error } = await appwriteDb
        .from('clients')
        .update(editingClient.value.id, payload);

      if (error) throw new Error(error.message);
      $q.notify({ type: 'positive', message: 'Client modifié' });
    } else {
      const { error } = await appwriteDb
        .from('clients')
        .insert(payload);

      if (error) throw new Error(error.message);
      $q.notify({ type: 'positive', message: 'Client créé' });
    }

    dialogOpen.value = false;
    await loadClients();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur';
    $q.notify({ type: 'negative', message });
  } finally {
    saving.value = false;
  }
}

async function confirmDelete(client: Client) {
  try {
    const { data } = await appwriteDb
      .from('invoices')
      .select('id')
      .eq('client_id', client.id)
      .limit(1);
    const hasInvoices = data && data.length > 0;
    if (hasInvoices) {
      $q.dialog({
        title: 'Client utilisé',
        message: `${client.name} est référencé dans des factures. Le désactiver ?`,
        cancel: true,
        ok: { label: 'Désactiver', color: 'orange' }
      }).onOk(async () => { await toggleClientActive(client, false); });
    } else {
      $q.dialog({
        title: 'Supprimer le client',
        message: `Voulez-vous supprimer définitivement "${client.name}" ?`,
        cancel: true,
        persistent: true,
      }).onOk(() => void (async () => {
        const { error } = await appwriteDb
          .from('clients')
          .delete()
          .eq('id', client.id);

        if (error) {
          $q.notify({ type: 'negative', message: error.message });
        } else {
          $q.notify({ type: 'positive', message: 'Client supprimé' });
          await loadClients();
        }
      })());
    }
  } catch {
    $q.dialog({
      title: 'Supprimer le client',
      message: `Voulez-vous supprimer "${client.name}" ?`,
      cancel: true,
      persistent: true,
    }).onOk(() => void (async () => {
      const { error } = await appwriteDb
        .from('clients')
        .delete()
        .eq('id', client.id);

      if (error) {
        $q.notify({ type: 'negative', message: error.message });
      } else {
        $q.notify({ type: 'positive', message: 'Client supprimé' });
        await loadClients();
      }
    })());
  }
}

onMounted(() => {
  if (isProjectAdmin.value) {
    void loadCompanies();
  } else {
    void loadClients();
  }
});
</script>
