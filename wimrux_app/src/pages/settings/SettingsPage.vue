<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Paramètres</div>

    <q-tabs v-model="tab" dense align="left" class="q-mb-md text-grey" active-color="primary" indicator-color="primary">
      <q-tab name="company" label="Entreprise" icon="business" no-caps />
      <q-tab name="devices" label="Appareils SFE" icon="devices" no-caps />
      <q-tab name="users" label="Utilisateurs" icon="people" no-caps />
    </q-tabs>

    <q-tab-panels v-model="tab" animated>
      <!-- Company settings -->
      <q-tab-panel name="company">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-md">Informations de l'entreprise</div>
            <q-form @submit.prevent="saveCompany" class="q-gutter-sm">
              <div class="row q-gutter-sm">
                <q-input v-model="companyForm.name" label="Raison sociale" filled class="col" :rules="[v => !!v || 'Requis']" />
                <q-input v-model="companyForm.ifu" label="IFU" filled style="width: 200px" :rules="[v => !!v || 'Requis']" />
              </div>
              <div class="row q-gutter-sm">
                <q-input v-model="companyForm.rccm" label="RCCM" filled class="col" />
                <q-input v-model="companyForm.tax_regime" label="Régime fiscal" filled class="col" />
                <q-input v-model="companyForm.tax_office" label="Centre des impôts" filled class="col" />
              </div>
              <q-input v-model="companyForm.address_cadastral" label="Adresse cadastrale (SSSS LLL PPPP)" filled mask="#### ### ####" />
              <div class="row q-gutter-sm">
                <q-input v-model="companyForm.phone" label="Téléphone" filled class="col" />
                <q-input v-model="companyForm.email" label="Email" filled type="email" class="col" />
              </div>
              <div class="row justify-end q-mt-md">
                <q-btn type="submit" color="primary" icon="save" label="Enregistrer" no-caps :loading="saving" />
              </div>
            </q-form>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- Devices -->
      <q-tab-panel name="devices">
        <q-card flat bordered>
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="text-subtitle1 text-weight-medium">Appareils SFE enregistrés</div>
              <q-space />
              <q-btn color="primary" icon="add" label="Ajouter un appareil" no-caps size="sm" @click="deviceDialogOpen = true" />
            </div>
            <q-table
              :rows="devices"
              :columns="deviceColumns"
              row-key="id"
              :loading="loadingDevices"
              flat
              dense
              :pagination="{ rowsPerPage: 10 }"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-badge :color="props.row.status === 'active' ? 'green' : 'grey'" :label="props.row.status === 'active' ? 'Actif' : 'Inactif'" />
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- Users -->
      <q-tab-panel name="users">
        <q-card flat bordered>
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="text-subtitle1 text-weight-medium">Utilisateurs</div>
              <q-space />
              <q-btn color="primary" icon="person_add" label="Inviter" no-caps size="sm" disabled />
            </div>
            <q-table
              :rows="users"
              :columns="userColumns"
              row-key="id"
              :loading="loadingUsers"
              flat
              dense
              :pagination="{ rowsPerPage: 10 }"
            >
              <template v-slot:body-cell-role="props">
                <q-td :props="props">
                  <q-badge :color="roleColor(props.row.role)" :label="props.row.role" />
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </q-tab-panel>
    </q-tab-panels>

    <!-- Add device dialog -->
    <q-dialog v-model="deviceDialogOpen" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Ajouter un appareil SFE</div>
        </q-card-section>
        <q-card-section>
          <q-form @submit.prevent="addDevice" class="q-gutter-sm">
            <q-input v-model="deviceForm.nim" label="NIM (Numéro d'identification)" filled :rules="[v => !!v || 'NIM requis']" />
            <q-input v-model="deviceForm.name" label="Nom de l'appareil" filled />
            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat label="Annuler" v-close-popup no-caps />
              <q-btn type="submit" color="primary" label="Ajouter" :loading="saving" no-caps />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';

const $q = useQuasar();
const companyStore = useCompanyStore();

const tab = ref('company');
const saving = ref(false);
const loadingDevices = ref(false);
const loadingUsers = ref(false);
const deviceDialogOpen = ref(false);

interface Device { id: string; nim: string; name: string; status: string; created_at: string }
interface UserRow { id: string; full_name: string; role: string; created_at: string }

const companyForm = ref({
  name: '',
  ifu: '',
  rccm: '',
  address_cadastral: '',
  phone: '',
  email: '',
  tax_regime: '',
  tax_office: '',
});

const deviceForm = ref({ nim: '', name: '' });
const devices = ref<Device[]>([]);
const users = ref<UserRow[]>([]);

const deviceColumns = [
  { name: 'nim', label: 'NIM', field: 'nim', align: 'left' as const },
  { name: 'name', label: 'Nom', field: 'name', align: 'left' as const },
  { name: 'status', label: 'Statut', field: 'status', align: 'center' as const },
  { name: 'created_at', label: 'Créé le', field: 'created_at', align: 'left' as const },
];

const userColumns = [
  { name: 'full_name', label: 'Nom', field: 'full_name', align: 'left' as const },
  { name: 'role', label: 'Rôle', field: 'role', align: 'center' as const },
  { name: 'created_at', label: 'Créé le', field: 'created_at', align: 'left' as const },
];

function roleColor(r: string) {
  const map: Record<string, string> = { admin: 'red', caissier: 'blue', auditeur: 'teal' };
  return map[r] || 'grey';
}

function loadCompanyForm() {
  const c = companyStore.company;
  if (c) {
    companyForm.value = {
      name: c.name,
      ifu: c.ifu,
      rccm: c.rccm,
      address_cadastral: c.address_cadastral,
      phone: c.phone,
      email: c.email,
      tax_regime: c.tax_regime,
      tax_office: c.tax_office,
    };
  }
}

async function saveCompany() {
  saving.value = true;
  try {
    const result = await companyStore.updateCompany(companyForm.value);
    if (result?.error) {
      $q.notify({ type: 'negative', message: result.error.message });
    } else {
      $q.notify({ type: 'positive', message: 'Entreprise mise à jour' });
    }
  } finally {
    saving.value = false;
  }
}

async function loadDevices() {
  loadingDevices.value = true;
  try {
    const { data } = await insforge.database.from('devices').select('*').order('created_at', { ascending: false });
    if (data) devices.value = data as Device[];
  } finally {
    loadingDevices.value = false;
  }
}

async function loadUsers() {
  loadingUsers.value = true;
  try {
    const { data } = await insforge.database.from('user_profiles').select('*').order('full_name', { ascending: true });
    if (data) users.value = data as UserRow[];
  } finally {
    loadingUsers.value = false;
  }
}

async function addDevice() {
  saving.value = true;
  try {
    const { error } = await insforge.database.from('devices').insert({
      company_id: companyStore.company?.id,
      nim: deviceForm.value.nim,
      name: deviceForm.value.name || deviceForm.value.nim,
      status: 'active',
    });
    if (error) throw new Error(error.message);
    deviceDialogOpen.value = false;
    $q.notify({ type: 'positive', message: 'Appareil ajouté' });
    await loadDevices();
  } catch (err: unknown) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'Erreur' });
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  loadCompanyForm();
  await Promise.all([loadDevices(), loadUsers()]);
});
</script>
