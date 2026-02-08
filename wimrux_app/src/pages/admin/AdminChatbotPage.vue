<template>
  <q-page padding>
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5">Chatbot API — Administration</div>
        <div class="text-caption text-grey-7">Vue globale des intégrations chatbot de toutes les entreprises</div>
      </div>
      <q-space />
      <q-btn-toggle v-model="period" no-caps rounded toggle-color="primary" :options="[{label:'7j',value:'7d'},{label:'30j',value:'30d'},{label:'90j',value:'90d'},{label:'Tout',value:'all'}]" class="q-mr-sm" />
      <q-btn flat icon="refresh" @click="loadAll" :loading="loading" />
    </div>

    <!-- KPI Cards -->
    <div class="row q-gutter-md q-mb-lg">
      <q-card flat bordered class="col">
        <q-card-section class="text-center">
          <q-icon name="vpn_key" size="md" color="primary" />
          <div class="text-h4 text-weight-bold q-mt-xs">{{ stats.active_keys }}</div>
          <div class="text-caption text-grey-7">Clés actives</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col">
        <q-card-section class="text-center">
          <q-icon name="forum" size="md" color="teal" />
          <div class="text-h4 text-weight-bold q-mt-xs">{{ stats.total_conversations }}</div>
          <div class="text-caption text-grey-7">Conversations</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col">
        <q-card-section class="text-center">
          <q-icon name="chat" size="md" color="blue" />
          <div class="text-h4 text-weight-bold q-mt-xs">{{ stats.total_messages }}</div>
          <div class="text-caption text-grey-7">Messages</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col">
        <q-card-section class="text-center">
          <q-icon name="check_circle" size="md" color="green" />
          <div class="text-h4 text-weight-bold q-mt-xs">{{ stats.actions_executed }}</div>
          <div class="text-caption text-grey-7">Actions exécutées</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col">
        <q-card-section class="text-center">
          <q-icon name="block" size="md" color="red" />
          <div class="text-h4 text-weight-bold q-mt-xs">{{ stats.actions_denied }}</div>
          <div class="text-caption text-grey-7">Actions refusées</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Companies with chatbot -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-md">Entreprises avec Chatbot</div>
        <q-markup-table flat bordered separator="horizontal">
          <thead>
            <tr class="bg-grey-2">
              <th class="text-left">Entreprise</th>
              <th class="text-center">Chatbot</th>
              <th class="text-center">Clés actives</th>
              <th class="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in companiesWithChatbot" :key="c.id">
              <td class="text-left text-weight-medium">{{ c.name }}</td>
              <td class="text-center">
                <q-badge :color="c.chatbot_enabled ? 'green' : 'grey'" :label="c.chatbot_enabled ? 'Activé' : 'Désactivé'" />
              </td>
              <td class="text-center">{{ c.activeKeys }}</td>
              <td class="text-center">
                <q-btn flat size="sm" icon="toggle_on" :color="c.chatbot_enabled ? 'red' : 'green'" :label="c.chatbot_enabled ? 'Désactiver' : 'Activer'" no-caps @click="adminToggleChatbot(c)" />
              </td>
            </tr>
            <tr v-if="companiesWithChatbot.length === 0">
              <td colspan="4" class="text-center text-grey-5 q-pa-md">Aucune entreprise</td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card-section>
    </q-card>

    <!-- All API Keys -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-md">Toutes les clés API ({{ allKeys.length }})</div>
        <q-markup-table flat bordered separator="horizontal" v-if="allKeys.length > 0">
          <thead>
            <tr class="bg-grey-2">
              <th class="text-left">Entreprise</th>
              <th class="text-left">Nom</th>
              <th class="text-center">Canaux</th>
              <th class="text-center">Statut</th>
              <th class="text-center">Limite/h</th>
              <th class="text-center">Dernier usage</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="k in allKeys" :key="k.id">
              <td class="text-left">{{ companyNameById(k.company_id) }}</td>
              <td class="text-left text-weight-medium">{{ k.name }}</td>
              <td class="text-center">
                <q-badge v-for="ch in k.channels" :key="ch" :label="ch" color="blue-grey" class="q-mr-xs" />
              </td>
              <td class="text-center">
                <q-badge :color="k.is_active ? 'green' : 'red'" :label="k.is_active ? 'Active' : 'Inactive'" />
              </td>
              <td class="text-center">{{ k.rate_limit_per_hour }}</td>
              <td class="text-center text-caption">{{ k.last_used_at ? new Date(k.last_used_at).toLocaleString('fr-FR') : '—' }}</td>
            </tr>
          </tbody>
        </q-markup-table>
        <div v-else class="text-center text-grey-5 q-pa-md">Aucune clé API</div>
      </q-card-section>
    </q-card>

    <!-- Usage by channel -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-md">Usage par canal</div>
        <div class="row q-gutter-md">
          <q-card v-for="(count, ch) in stats.by_channel" :key="ch" flat bordered class="col-auto" style="min-width:120px">
            <q-card-section class="text-center q-pa-sm">
              <div class="text-h5 text-weight-bold">{{ count }}</div>
              <q-badge :label="String(ch)" color="blue-grey" />
            </q-card-section>
          </q-card>
          <div v-if="Object.keys(stats.by_channel).length === 0" class="text-grey-5">Aucune donnée</div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Recent conversations -->
    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium q-mb-md">Conversations récentes (toutes entreprises)</div>
        <q-markup-table flat bordered separator="horizontal" v-if="allConversations.length > 0">
          <thead>
            <tr class="bg-grey-2">
              <th class="text-left">Entreprise</th>
              <th class="text-center">Canal</th>
              <th class="text-left">Utilisateur</th>
              <th class="text-center">Statut</th>
              <th class="text-left">Début</th>
              <th class="text-left">Dernier msg</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in allConversations" :key="c.id">
              <td class="text-left">{{ companyNameById(c.company_id) }}</td>
              <td class="text-center"><q-badge :label="c.channel" color="blue-grey" /></td>
              <td>{{ c.external_user || c.external_id || '—' }}</td>
              <td class="text-center"><q-badge :color="c.status === 'active' ? 'green' : c.status === 'blocked' ? 'red' : 'grey'" :label="c.status" /></td>
              <td class="text-caption">{{ new Date(c.started_at).toLocaleString('fr-FR') }}</td>
              <td class="text-caption">{{ new Date(c.last_message_at).toLocaleString('fr-FR') }}</td>
            </tr>
          </tbody>
        </q-markup-table>
        <div v-else class="text-center text-grey-5 q-pa-md">Aucune conversation</div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { insforge } from 'src/boot/insforge';
import { useChatbotConfig } from 'src/composables/useChatbotConfig';
import type { ChatbotApiKey, ChatbotConversation, ChatbotUsageStats } from 'src/types';

const $q = useQuasar();
const chatbot = useChatbotConfig();
const loading = ref(false);
const period = ref('30d');

interface CompanyRow { id: string; name: string; chatbot_enabled: boolean; activeKeys: number }

const companiesWithChatbot = ref<CompanyRow[]>([]);
const allKeys = ref<ChatbotApiKey[]>([]);
const allConversations = ref<ChatbotConversation[]>([]);
const stats = ref<ChatbotUsageStats>({
  total_conversations: 0,
  total_messages: 0,
  active_keys: 0,
  actions_executed: 0,
  actions_denied: 0,
  by_channel: {} as Record<string, number>,
  by_action: {},
});
const companyMap = ref<Record<string, string>>({});

function getDateFrom(p: string): string | undefined {
  if (p === 'all') return undefined;
  const days = p === '7d' ? 7 : p === '90d' ? 90 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function companyNameById(id: string): string {
  return companyMap.value[id] || id.substring(0, 8);
}

async function loadAll() {
  loading.value = true;
  try {
    const from = getDateFrom(period.value);

    // Load companies
    const { data: compData } = await insforge.database.from('companies').select('id, name, chatbot_enabled');
    const companies = (compData || []) as { id: string; name: string; chatbot_enabled: boolean }[];
    const cMap: Record<string, string> = {};
    for (const c of companies) cMap[c.id] = c.name;
    companyMap.value = cMap;

    // Load all keys
    allKeys.value = await chatbot.loadAllApiKeys();

    // Count active keys per company
    companiesWithChatbot.value = companies.map(c => ({
      ...c,
      activeKeys: allKeys.value.filter(k => k.company_id === c.id && k.is_active).length,
    }));

    // Load conversations
    allConversations.value = await chatbot.loadAllConversations(50);

    // Load stats
    stats.value = await chatbot.loadAllStats(from);
  } finally {
    loading.value = false;
  }
}

async function adminToggleChatbot(c: CompanyRow) {
  const newVal = !c.chatbot_enabled;
  const { error } = await insforge.database
    .from('companies')
    .update({ chatbot_enabled: newVal })
    .eq('id', c.id);
  if (error) {
    $q.notify({ type: 'negative', message: error.message });
  } else {
    c.chatbot_enabled = newVal;
    $q.notify({ type: 'positive', message: `Chatbot ${newVal ? 'activé' : 'désactivé'} pour ${c.name}` });
  }
}

watch(period, () => { void loadAll(); });

onMounted(() => { void loadAll(); });
</script>
