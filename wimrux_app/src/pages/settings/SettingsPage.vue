<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Paramètres</div>

    <q-tabs v-model="tab" dense align="left" class="q-mb-md text-grey" active-color="primary" indicator-color="primary">
      <q-tab name="company" label="Entreprise" icon="business" no-caps />
      <q-tab name="devices" label="Appareils SFE" icon="devices" no-caps />
      <q-tab name="users" label="Utilisateurs" icon="people" no-caps />
      <q-tab name="ai" label="Intelligence Artificielle" icon="smart_toy" no-caps />
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
      <!-- AI Configuration -->
      <q-tab-panel name="ai">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-md">Configuration IA de l'entreprise</div>
            <q-banner class="bg-amber-1 text-amber-9 q-mb-md rounded-borders" dense>
              <template v-slot:avatar><q-icon name="vpn_key" color="amber" /></template>
              L'assistant IA utilise votre <strong>clé API OpenRouter</strong> en direct.<br />
              Obtenez votre clé sur <a href="https://openrouter.ai/keys" target="_blank" class="text-primary">openrouter.ai/keys</a> — Tous les modèles (OpenAI, Anthropic, Google, DeepSeek...) sont accessibles.
            </q-banner>

            <q-form @submit.prevent="saveAiConfig" class="q-gutter-md">
              <q-toggle v-model="aiForm.ai_enabled" label="Activer l'assistant IA" color="primary" />

              <q-input
                v-model="aiForm.openrouter_api_key"
                label="Clé API OpenRouter"
                filled
                :type="showApiKey ? 'text' : 'password'"
                :disable="!aiForm.ai_enabled"
                :rules="[v => !aiForm.ai_enabled || !!v || 'Clé API requise pour utiliser l\'IA']"
                hint="sk-or-v1-... (stockée de manière sécurisée)"
              >
                <template v-slot:prepend><q-icon name="vpn_key" /></template>
                <template v-slot:append>
                  <q-icon
                    :name="showApiKey ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showApiKey = !showApiKey"
                  />
                </template>
              </q-input>

              <q-select
                v-model="aiForm.ai_model"
                :options="availableModels"
                emit-value
                map-options
                label="Modèle IA principal"
                filled
                :disable="!aiForm.ai_enabled"
                hint="Modèle utilisé par défaut pour l'assistant fiscal"
              >
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar><q-icon :name="providerIcon(scope.opt.provider)" :color="providerColor(scope.opt.provider)" /></q-item-section>
                    <q-item-section>
                      <q-item-label>{{ scope.opt.label }}</q-item-label>
                      <q-item-label caption>{{ scope.opt.provider }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>

              <q-select
                v-model="aiForm.ai_fallback_model"
                :options="availableModels"
                emit-value
                map-options
                label="Modèle de secours (fallback)"
                filled
                :disable="!aiForm.ai_enabled"
                hint="Utilisé automatiquement si le modèle principal est indisponible"
              >
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section avatar><q-icon :name="providerIcon(scope.opt.provider)" :color="providerColor(scope.opt.provider)" /></q-item-section>
                    <q-item-section>
                      <q-item-label>{{ scope.opt.label }}</q-item-label>
                      <q-item-label caption>{{ scope.opt.provider }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>

              <q-input
                v-model="aiForm.ai_system_prompt"
                label="Prompt système personnalisé (optionnel)"
                filled
                type="textarea"
                autogrow
                :disable="!aiForm.ai_enabled"
                hint="Laissez vide pour utiliser le prompt fiscal par défaut"
              />

              <div class="row justify-end q-mt-md">
                <q-btn type="submit" color="primary" icon="save" label="Enregistrer" no-caps :loading="saving" />
              </div>
            </q-form>
          </q-card-section>
        </q-card>

        <!-- Available models reference -->
        <q-card flat bordered class="q-mt-md">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-sm">Modèles disponibles</div>
            <q-markup-table flat bordered separator="cell" dense>
              <thead>
                <tr class="bg-grey-2">
                  <th class="text-left">Fournisseur</th>
                  <th class="text-left">Modèle</th>
                  <th class="text-center">Texte</th>
                  <th class="text-center">Image</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in availableModels" :key="m.value">
                  <td>
                    <q-icon :name="providerIcon(m.provider)" :color="providerColor(m.provider)" size="xs" class="q-mr-xs" />
                    {{ m.provider }}
                  </td>
                  <td class="text-weight-medium">{{ m.label }}</td>
                  <td class="text-center"><q-icon name="check_circle" color="green" size="xs" /></td>
                  <td class="text-center">
                    <q-icon v-if="m.hasImage" name="check_circle" color="green" size="xs" />
                    <q-icon v-else name="remove" color="grey-4" size="xs" />
                  </td>
                </tr>
              </tbody>
            </q-markup-table>
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
            <q-input v-model="deviceForm.nim" label="NIM (Numéro d'identification)" filled :rules="[v => !!v || 'NIM requis']" hint="Ex: BF01000001" />
            <q-input v-model="deviceForm.ifu" label="IFU rattaché" filled :rules="[v => !!v || 'IFU requis']" />
            <q-input v-model="deviceForm.jwt_secret" label="Clé secrète (JWT Secret)" filled type="password" :rules="[v => !!v || 'Clé requise']" />
            <q-input v-model="deviceForm.name" label="Nom de l'appareil (optionnel)" filled />
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

const showApiKey = ref(false);
const aiForm = ref({
  ai_enabled: true,
  ai_model: 'anthropic/claude-sonnet-4.5',
  ai_fallback_model: 'openai/gpt-4o-mini',
  ai_system_prompt: '',
  openrouter_api_key: '',
});

interface ModelOption { label: string; value: string; provider: string; hasImage: boolean }

const availableModels: ModelOption[] = [
  { label: 'Claude Sonnet 4.5', value: 'anthropic/claude-sonnet-4.5', provider: 'Anthropic', hasImage: false },
  { label: 'Claude Haiku 3.5', value: 'anthropic/claude-3.5-haiku', provider: 'Anthropic', hasImage: false },
  { label: 'GPT-4o', value: 'openai/gpt-4o', provider: 'OpenAI', hasImage: false },
  { label: 'GPT-4o Mini', value: 'openai/gpt-4o-mini', provider: 'OpenAI', hasImage: false },
  { label: 'Gemini 2.5 Pro', value: 'google/gemini-2.5-pro', provider: 'Google', hasImage: false },
  { label: 'Gemini 2.5 Flash', value: 'google/gemini-2.5-flash-lite', provider: 'Google', hasImage: false },
  { label: 'Gemini 3 Pro Image', value: 'google/gemini-3-pro-image-preview', provider: 'Google', hasImage: true },
  { label: 'DeepSeek V3.2', value: 'deepseek/deepseek-v3.2', provider: 'DeepSeek', hasImage: false },
  { label: 'DeepSeek R1', value: 'deepseek/deepseek-r1', provider: 'DeepSeek', hasImage: false },
  { label: 'Grok 4.1 Fast', value: 'x-ai/grok-4.1-fast', provider: 'xAI', hasImage: false },
  { label: 'Minimax M2.1', value: 'minimax/minimax-m2.1', provider: 'Minimax', hasImage: false },
];

function providerIcon(p: string) {
  const map: Record<string, string> = { Anthropic: 'psychology', OpenAI: 'auto_awesome', Google: 'cloud', DeepSeek: 'science', xAI: 'bolt', Minimax: 'memory' };
  return map[p] || 'smart_toy';
}

function providerColor(p: string) {
  const map: Record<string, string> = { Anthropic: 'deep-orange', OpenAI: 'green', Google: 'blue', DeepSeek: 'indigo', xAI: 'grey-9', Minimax: 'purple' };
  return map[p] || 'grey';
}

const deviceForm = ref({ nim: '', ifu: '', jwt_secret: '', name: '' });
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
    aiForm.value = {
      ai_enabled: c.ai_enabled ?? true,
      ai_model: c.ai_model || 'anthropic/claude-sonnet-4.5',
      ai_fallback_model: c.ai_fallback_model || 'openai/gpt-4o-mini',
      ai_system_prompt: c.ai_system_prompt || '',
      openrouter_api_key: c.openrouter_api_key || '',
    };
  }
}

async function saveAiConfig() {
  saving.value = true;
  try {
    const result = await companyStore.updateCompany({
      ai_enabled: aiForm.value.ai_enabled,
      ai_model: aiForm.value.ai_model,
      ai_fallback_model: aiForm.value.ai_fallback_model,
      ai_system_prompt: aiForm.value.ai_system_prompt || null,
      openrouter_api_key: aiForm.value.openrouter_api_key || null,
    });
    if (result?.error) {
      $q.notify({ type: 'negative', message: result.error.message });
    } else {
      $q.notify({ type: 'positive', message: 'Configuration IA enregistr\u00e9e' });
    }
  } finally {
    saving.value = false;
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
      ifu: deviceForm.value.ifu,
      jwt_secret: deviceForm.value.jwt_secret,
      name: deviceForm.value.name || deviceForm.value.nim,
      status: 'ACTIF',
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
