<template>
  <q-page padding>
    <!-- PROJECT ADMIN VIEW: Companies on the SaaS platform -->
    <template v-if="isProjectAdmin">
      <div class="row items-center q-mb-md">
        <div class="text-h5">Entreprises SaaS</div>
        <q-space />
        <q-btn color="primary" icon="add_business" label="Nouvelle entreprise" no-caps @click="openCompanyDialog()" />
      </div>

      <q-input v-model="search" outlined dense placeholder="Rechercher par nom, IFU..." class="q-mb-md" clearable>
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
              <q-input v-model="companyForm.address_cadastral" label="Adresse cadastrale" filled />
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
              <div class="text-bold">{{ generatedCredentials.company }}</div>
            </q-banner>
            <div class="q-gutter-sm">
              <q-input :model-value="generatedCredentials.email" label="Email" filled readonly dense>
                <template v-slot:append>
                  <q-btn flat dense icon="content_copy" @click="copyToClipboard(generatedCredentials.email)">
                    <q-tooltip>Copier</q-tooltip>
                  </q-btn>
                </template>
              </q-input>
              <q-input :model-value="generatedCredentials.password" label="Mot de passe" filled readonly dense>
                <template v-slot:append>
                  <q-btn flat dense icon="content_copy" @click="copyToClipboard(generatedCredentials.password)">
                    <q-tooltip>Copier</q-tooltip>
                  </q-btn>
                </template>
              </q-input>
              <q-input :model-value="generatedCredentials.role" label="Rôle" filled readonly dense />
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
        <q-btn color="primary" icon="add" label="Nouveau client" no-caps @click="openDialog()" />
      </div>

      <q-input v-model="search" outlined dense placeholder="Rechercher par nom, IFU..." class="q-mb-md" clearable>
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
        <template v-slot:body-cell-type="props">
          <q-td :props="props">
            <q-badge :color="typeColor(props.row.type)" :label="typeLabel(props.row.type)" />
          </q-td>
        </template>
        <template v-slot:body-cell-is_active="props">
          <q-td :props="props">
            <q-toggle
              :model-value="props.row.is_active"
              color="positive"
              :label="props.row.is_active ? 'Actif' : 'Inactif'"
              dense
              @update:model-value="val => toggleClientActive(props.row, !!val)"
            />
          </q-td>
        </template>
        <template v-slot:body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat dense icon="edit" size="sm" @click="openDialog(props.row)" />
            <q-btn flat dense icon="delete" size="sm" color="negative" @click="confirmDelete(props.row)" />
          </q-td>
        </template>
      </q-table>

    <!-- Dialog create/edit -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">{{ editingClient ? 'Modifier le client' : 'Nouveau client' }}</div>
        </q-card-section>

        <q-card-section>
          <q-form @submit.prevent="saveClient" class="q-gutter-sm">
            <q-select
              v-model="form.type"
              :options="clientTypeOptions"
              label="Type de client"
              emit-value
              map-options
              filled
              :rules="[val => !!val || 'Type requis']"
            />

            <q-input v-model="form.name" label="Nom / Raison sociale" filled :rules="[val => !!val || 'Nom requis']" />

            <q-input
              v-model="form.ifu"
              label="IFU"
              filled
              :rules="ifuRules"
              :hint="['PM', 'PC'].includes(form.type) ? 'Obligatoire pour PM et PC' : 'Optionnel'"
            />

            <q-input v-model="form.rccm" label="RCCM" filled v-if="form.type === 'PM'" />

            <q-input v-model="form.address" label="Adresse" filled type="textarea" rows="2" />

            <q-input
              v-model="form.address_cadastral"
              label="Adresse cadastrale (SSSS LLL PPPP)"
              filled
              mask="#### ### ####"
              hint="Section Ilot Parcelle"
            />

            <div class="row q-gutter-sm">
              <q-input v-model="form.phone" label="Téléphone" filled class="col" />
              <q-input v-model="form.email" label="Email" filled type="email" class="col" />
            </div>

            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat label="Annuler" v-close-popup no-caps />
              <q-btn type="submit" color="primary" :label="editingClient ? 'Modifier' : 'Créer'" :loading="saving" no-caps />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar, copyToClipboard as qCopy } from 'quasar';
import { createClient } from '@insforge/sdk';
import { insforge } from 'src/boot/insforge';
import { useAuthStore } from 'src/stores/auth-store';
import type { Client, ClientType, Company, UserRole } from 'src/types';

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

const isProjectAdmin = computed(() => authStore.role === 'project_admin');

const companyForm = ref({
  name: '',
  ifu: '',
  rccm: '',
  address_cadastral: '',
  phone: '',
  email: '',
});

const userDialogOpen = ref(false);
const credentialsDialogOpen = ref(false);
const savingUser = ref(false);
const targetCompany = ref<Company | null>(null);

const userForm = ref({
  full_name: '',
  email: '',
  role: 'admin' as UserRole,
  password: '',
});

const generatedCredentials = ref({
  company: '',
  email: '',
  password: '',
  role: '',
});

const showPassword = ref(false);

// project_admin can ONLY create the company admin account.
// The company admin then manages all other roles via Settings > RBAC.
const roleOptions = [
  { label: 'Administrateur', value: 'admin' },
];

const passwordStrength = computed(() => {
  const pwd = userForm.value.password;
  if (!pwd) return { score: 0, color: 'grey', label: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  score = Math.min(score, 4);
  const levels: Record<number, { color: string; label: string }> = {
    0: { color: 'red', label: 'Très faible' },
    1: { color: 'red', label: 'Faible' },
    2: { color: 'orange', label: 'Moyen' },
    3: { color: 'light-green', label: 'Fort' },
    4: { color: 'green', label: 'Très fort' },
  };
  return { score, ...levels[score] };
});

const companyColumns = [
  { name: 'name', label: 'Raison sociale', field: 'name', align: 'left' as const, sortable: true },
  { name: 'ifu', label: 'IFU', field: 'ifu', align: 'left' as const, sortable: true },
  { name: 'rccm', label: 'RCCM', field: 'rccm', align: 'left' as const },
  { name: 'phone', label: 'Téléphone', field: 'phone', align: 'left' as const },
  { name: 'email', label: 'Email', field: 'email', align: 'left' as const },
  { name: 'is_active', label: 'Statut', field: 'is_active', align: 'center' as const, sortable: true },
  { name: 'chatbot_enabled', label: 'Chatbot', field: 'chatbot_enabled', align: 'center' as const },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' as const },
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
  ifu: '',
  rccm: '',
  address: '',
  address_cadastral: '',
  phone: '',
  email: '',
});

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
  if (['PM', 'PC'].includes(form.value.type)) {
    return [(val: string) => !!val || 'IFU obligatoire pour PM et PC'];
  }
  return [];
});

async function toggleClientActive(client: Client, val: boolean) {
  try {
    const { error } = await insforge.database
      .from('clients')
      .update({ is_active: val })
      .eq('id', client.id);

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
    const { data, error } = await insforge.database
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
    const { error } = await insforge.database
      .from('companies')
      .update({ is_active: val })
      .eq('id', company.id);

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
    const freshClient = createClient({
      baseUrl: import.meta.env.VITE_INSFORGE_URL as string,
      anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY as string,
    });

    let userId: string | undefined;

    // Step 1: Try signUp
    const { data: authData, error: authError } = await freshClient.auth.signUp({
      email: userForm.value.email,
      password: userForm.value.password,
      name: userForm.value.full_name,
    });

    if (authError) {
      const msg = (authError.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('existe')) {
        // User auth account exists — try signIn to get their ID
        const { data: loginData, error: loginError } = await freshClient.auth.signInWithPassword({
          email: userForm.value.email,
          password: userForm.value.password,
        });

        if (loginError || !loginData?.user?.id) {
          throw new Error('Cet email est déjà utilisé par un compte existant. Vérifiez le mot de passe ou utilisez un autre email.');
        }

        userId = loginData.user.id;
        // Sign out from the fresh client to avoid session conflicts
        await freshClient.auth.signOut();
      } else {
        throw new Error(authError.message || 'Erreur lors de la création du compte');
      }
    } else {
      userId = authData?.user?.id;
    }

    if (!userId) throw new Error('Impossible de récupérer l\'ID utilisateur. Vérifiez la configuration email.');

    // Step 2: Check if profile already exists for this user
    const { data: existingProfile } = await insforge.database
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
    const { error: profileError } = await insforge.database
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
  const text = `Entreprise: ${c.company}\nEmail: ${c.email}\nMot de passe: ${c.password}\nRôle: ${c.role}`;
  copyToClipboard(text);
}

async function saveCompany() {
  saving.value = true;
  try {
    const payload = { ...companyForm.value };

    if (editingCompany.value) {
      const { error } = await insforge.database
        .from('companies')
        .update(payload)
        .eq('id', editingCompany.value.id);

      if (error) throw new Error(error.message);
      $q.notify({ type: 'positive', message: 'Entreprise modifiée' });
    } else {
      const { error } = await insforge.database
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
    const { data, error } = await insforge.database
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
    form.value = {
      type: client.type,
      name: client.name,
      ifu: client.ifu || '',
      rccm: client.rccm || '',
      address: client.address || '',
      address_cadastral: client.address_cadastral || '',
      phone: client.phone || '',
      email: client.email || '',
    };
  } else {
    editingClient.value = null;
    form.value = { type: 'CC', name: '', ifu: '', rccm: '', address: '', address_cadastral: '', phone: '', email: '' };
  }
  dialogOpen.value = true;
}

async function saveClient() {
  saving.value = true;
  try {
    const payload = {
      ...form.value,
      company_id: authStore.companyId,
      ifu: form.value.ifu || null,
      rccm: form.value.rccm || null,
      address: form.value.address || null,
      address_cadastral: form.value.address_cadastral || null,
      phone: form.value.phone || null,
      email: form.value.email || null,
    };

    if (editingClient.value) {
      const { error } = await insforge.database
        .from('clients')
        .update(payload)
        .eq('id', editingClient.value.id);

      if (error) throw new Error(error.message);
      $q.notify({ type: 'positive', message: 'Client modifié' });
    } else {
      const { error } = await insforge.database
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

function confirmDelete(client: Client) {
  $q.dialog({
    title: 'Supprimer le client',
    message: `Voulez-vous supprimer "${client.name}" ?`,
    cancel: true,
    persistent: true,
  }).onOk(() => void (async () => {
    const { error } = await insforge.database
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

onMounted(() => {
  if (isProjectAdmin.value) {
    void loadCompanies();
  } else {
    void loadClients();
  }
});
</script>
