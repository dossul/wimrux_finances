<template>
  <q-page class="suivi-ia-page column" padding>

    <!-- Header -->
    <div class="row items-center q-mb-md">
      <div>
        <div class="row items-center q-gutter-sm">
          <q-icon name="psychology" size="32px" color="primary" />
          <div>
            <div class="text-h5 text-weight-bold">Intelligence Financière</div>
            <div class="text-caption text-grey-6">Interrogez vos données en langage naturel</div>
          </div>
        </div>
      </div>
      <q-space />
      <q-chip v-if="scopeLabel" dense :color="isAdmin ? 'deep-purple' : 'blue'" text-color="white" :icon="isAdmin ? 'admin_panel_settings' : 'business'" :label="scopeLabel" />
      <q-btn flat round dense icon="delete_sweep" color="grey-6" title="Nouvelle conversation" class="q-ml-sm" @click="clearHistory" />
    </div>

    <!-- Mode tabs -->
    <div class="row q-mb-md q-gutter-sm">
      <q-btn
        v-for="m in modes" :key="m.value"
        :outline="activeMode !== m.value"
        :unelevated="activeMode === m.value"
        :color="activeMode === m.value ? m.color : 'grey-6'"
        :icon="m.icon" :label="m.label"
        no-caps dense size="sm"
        @click="activeMode = m.value"
      />
    </div>

    <!-- Chat window -->
    <q-card flat bordered class="col column chat-card">
      <q-scroll-area ref="scrollArea" class="col" style="min-height:0">
        <div class="q-pa-md q-gutter-sm column">

          <!-- Empty state -->
          <div v-if="!chatMessages.length" class="text-center q-py-xl">
            <q-icon :name="currentMode.icon" size="64px" :color="currentMode.color" class="q-mb-md" style="opacity:0.3" />
            <div class="text-h6 text-weight-medium text-grey-7 q-mb-sm">{{ currentMode.label }}</div>
            <div class="text-body2 text-grey-5 q-mb-lg">{{ currentMode.description }}</div>
            <!-- Suggestions -->
            <div class="row justify-center q-gutter-sm">
              <q-chip
                v-for="(s, i) in currentMode.suggestions" :key="i"
                clickable outline :color="currentMode.color" size="sm"
                @click="useSuggestion(s)"
              >{{ s }}</q-chip>
            </div>
          </div>

          <!-- Messages -->
          <div v-for="msg in chatMessages" :key="msg.id" class="row" :class="msg.role === 'user' ? 'justify-end' : 'justify-start'">
            <!-- User bubble -->
            <div v-if="msg.role === 'user'" class="user-bubble">
              <div class="text-caption text-blue-1 text-weight-medium q-mb-xs">Vous</div>
              <!-- Hide raw EXECUTE: prefix — show clean label instead -->
              <template v-if="msg.content.startsWith('EXECUTE:')">
                <span class="text-caption text-blue-1">
                  <q-icon name="play_arrow" size="xs" /> Exécution de la requête SQL
                </span>
              </template>
              <template v-else>{{ msg.content }}</template>
              <div class="row justify-end q-mt-xs">
                <q-btn flat dense round size="xs" icon="content_copy" color="blue-1" @click="copyText(msg.content)"><q-tooltip>Copier</q-tooltip></q-btn>
              </div>
            </div>


            <!-- Assistant bubble -->
            <div v-else class="assistant-bubble column">
              <div class="row items-center justify-between q-mb-xs">
                <div class="row items-center q-gutter-xs">
                  <q-avatar size="20px" color="primary" text-color="white" icon="psychology" />
                  <span class="text-caption text-grey-6 text-weight-medium">Intelligence Financière</span>
                  <q-badge v-if="msg.mode" :color="modeColor(msg.mode)" :label="modeLabel(msg.mode)" size="xs" />
                </div>
                <q-btn flat dense round size="xs" icon="content_copy" color="grey-6" @click="copyText(msg.content)"><q-tooltip>Copier</q-tooltip></q-btn>
              </div>

              <!-- Rendered answer -->
              <div class="ai-markdown-body" v-html="renderMd(msg.content)" />

              <!-- SQL block (hidden by default, toggle on demand) -->
              <template v-if="msg.sql">
                <div class="q-mt-sm">
                  <q-btn flat dense size="xs" icon="code" :label="msg._showSql ? 'Cacher la requête' : 'Voir la requête SQL'" no-caps color="grey-6"
                    @click="msg._showSql = !msg._showSql" />
                  <q-btn flat dense size="xs" icon="content_copy" color="grey-6" class="q-ml-xs" @click="copyText(msg.sql!)">
                    <q-tooltip>Copier la requête</q-tooltip>
                  </q-btn>
                  <q-btn v-if="msg._showSql" flat dense size="xs" icon="play_arrow" color="primary" label="Ré-exécuter" no-caps class="q-ml-xs"
                    :loading="loading" @click="execSql(msg.sql!)" />
                </div>
                <pre v-if="msg._showSql" class="sql-block q-mt-xs">{{ msg.sql }}</pre>
              </template>

              <!-- Data table results -->
              <template v-if="msg.rows && msg.rows.length">
                <q-separator class="q-my-sm" />
                <div class="row items-center justify-between q-mb-xs">
                  <div class="text-caption text-grey-6">{{ msg.rows.length }} résultat(s)</div>
                  <q-btn flat dense size="xs" icon="download" label="CSV" color="grey-6" @click="exportCsv(msg.rows)" />
                </div>
                <div class="results-table-wrapper">
                  <table class="results-table">
                    <thead><tr><th v-for="col in Object.keys((msg.rows[0] as Record<string,unknown>))" :key="col">{{ col }}</th></tr></thead>
                    <tbody>
                      <tr v-for="(row, i) in (msg.rows as Record<string,unknown>[])" :key="i">
                        <td v-for="col in Object.keys(row)" :key="col">{{ row[col] }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>

              <!-- Error -->
              <div v-if="msg.error" class="text-caption text-negative q-mt-xs">
                <q-icon name="warning" size="xs" /> {{ msg.error }}
              </div>

              <div class="text-caption text-grey-5 q-mt-xs">{{ fmtTime(msg.created_at) }}</div>
            </div>
          </div>

          <!-- Loading -->
          <div v-if="loading" class="row justify-start">
            <div class="assistant-bubble row items-center q-gutter-sm">
              <q-spinner-dots size="24px" color="primary" />
              <span class="text-caption text-grey-6">Analyse en cours...</span>
            </div>
          </div>
        </div>
      </q-scroll-area>

      <q-separator />
      <div class="input-area q-pa-md">
        <div class="row items-end q-gutter-sm">
          <q-input
            v-model="inputText"
            outlined dense autogrow :rows="1"
            :placeholder="currentMode.placeholder"
            class="col"
            data-testid="ai-chat-input"
            :disable="loading"
            @keydown.enter.prevent="onEnter"
            @keydown.shift.enter.stop
            bg-color="white"
          />
          <div class="column q-gutter-xs" style="padding-bottom:2px">
            <q-btn round unelevated color="primary" icon="send" :loading="loading"
              data-testid="ai-chat-send"
              :disable="!inputText.trim()"
              @click="submit"
              size="md"
            >
              <q-tooltip>Envoyer (Entrée)</q-tooltip>
            </q-btn>
          </div>
        </div>
        <div class="text-caption text-grey-5 q-mt-xs">
          Entrée pour envoyer · Maj+Entrée pour saut de ligne
        </div>
      </div>

    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useQuasar, QScrollArea } from 'quasar';
import { useAiChat } from 'src/composables/useAiChat';
import { useAuthStore } from 'src/stores/auth-store-appwrite';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import { marked } from 'marked';

const $q = useQuasar();
const authStore = useAuthStore();
const companyStore = useCompanyStore();
const { messages: chatMessages, loading, mode: chatMode, sendMessage, clearHistory } = useAiChat();

const inputText = ref('');
const scrollArea = ref<InstanceType<typeof QScrollArea> | null>(null);
const activeMode = ref('fiscal');

// ─── Scope / Role ──────────────────────────────────────────────────────────────
const isAdmin = computed(() => {
  const role = authStore.role;
  return role === 'project_admin' || role === 'admin';
});

const scopeLabel = computed(() => {
  if (authStore.role === 'project_admin') return 'Accès SaaS global';
  return companyStore.company?.name || 'Mon entreprise';
});

// ─── Modes ────────────────────────────────────────────────────────────────────
const modes = [
  {
    value: 'fiscal',
    label: 'Fiscal & Réglementaire',
    icon: 'account_balance',
    color: 'blue',
    description: 'Posez des questions sur la fiscalité burkinabè (TVA, PSVB, DGI, timbre...)',
    placeholder: 'Ex: Quels sont mes obligations déclaratives du trimestre ?',
    suggestions: [
      'Quelles sont mes obligations TVA ce trimestre ?',
      'Comment calculer la PSVB sur mes factures ?',
      'Quel est le taux de timbre de quittance applicable ?',
      'Mon chiffre d\'affaires dépasse-t-il le seuil RNI ?',
    ],
  },
  {
    value: 'data',
    label: 'Données financières',
    icon: 'analytics',
    color: 'teal',
    description: 'Interrogez vos données en langage naturel : factures, trésorerie, clients...',
    placeholder: 'Ex: Quel est mon engagement financier pour les 3 prochains mois ?',
    suggestions: [
      'Quel est mon engagement financier pour les 3 prochains mois ?',
      'Quelles sont mes 5 plus grosses factures ce mois ?',
      'Total des encaissements par client ce trimestre',
      'Factures impayées depuis plus de 30 jours',
      'Évolution de ma trésorerie sur les 6 derniers mois',
    ],
  },
  {
    value: 'comptable',
    label: 'Comptabilité OHADA',
    icon: 'calculate',
    color: 'deep-orange',
    description: 'Questions sur le plan comptable OHADA, journaux, bilans...',
    placeholder: 'Ex: Comment enregistrer un avoir fournisseur ?',
    suggestions: [
      'Comment enregistrer un avoir fournisseur ?',
      'Différence entre charges et immobilisations',
      'Comment calculer le BFR ?',
      'Règles de lettrage des comptes clients OHADA',
    ],
  },
];

const currentMode = computed(() => modes.find(m => m.value === activeMode.value) || modes[0]!);
function modeColor(val: string) { return modes.find(m => m.value === val)?.color || 'grey'; }
function modeLabel(val: string) { return modes.find(m => m.value === val)?.label || val; }

// Sync internal mode with useAiChat mode
watch(activeMode, (val) => {
  chatMode.value = val === 'data' ? 'nl_to_sql' : val === 'comptable' ? 'assistant_comptable' : 'assistant_fiscal';
}, { immediate: true });

// ─── Markdown rendering ───────────────────────────────────────────────────────
marked.setOptions({ breaks: true, gfm: true });
function renderMd(text: string): string {
  try { return marked.parse(text) as string; } catch { return text; }
}

// ─── Time ─────────────────────────────────────────────────────────────────────
function fmtTime(d: Date): string {
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Actions ──────────────────────────────────────────────────────────────────
function useSuggestion(s: string) { inputText.value = s; }

function onEnter(e: KeyboardEvent) { if (!e.shiftKey) submit(); }

// In data mode: always auto-execute. In other modes: standard chat.
async function submit() {
  const text = inputText.value.trim();
  if (!text) return;
  inputText.value = '';
  // Mode 'data' (nl_to_sql) auto-executes the query — user never sees the button
  const shouldExecute = activeMode.value === 'data';
  await sendMessage(text, shouldExecute);
  await nextTick();
  scrollArea.value?.setScrollPercentage('vertical', 1, 200);
}

async function execSql(sql: string) {
  await sendMessage(`EXECUTE: ${sql}`, true);
  await nextTick();
  scrollArea.value?.setScrollPercentage('vertical', 1, 200);
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    $q.notify({ type: 'positive', message: 'Copié !', timeout: 1500, position: 'bottom-right' });
  }).catch(() => {});
}

function exportCsv(rows: unknown[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0] as Record<string, unknown>);
  const csv = [keys.join(','), ...(rows as Record<string, unknown>[]).map(r => keys.map(k => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `resultats_${Date.now()}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  $q.notify({ type: 'positive', message: 'CSV exporté', timeout: 1500 });
}

// Auto-scroll
watch(chatMessages, async () => { await nextTick(); scrollArea.value?.setScrollPercentage('vertical', 1, 150); }, { deep: true });
</script>

<style scoped>
.suivi-ia-page { height: calc(100vh - 100px); }
.chat-card { min-height: 0; overflow: hidden; }

.user-bubble {
  max-width: 80%;
  background: #1565c0;
  color: white;
  border-radius: 16px 16px 4px 16px;
  padding: 10px 16px;
}
.assistant-bubble {
  max-width: 88%;
  background: white;
  border-radius: 4px 16px 16px 16px;
  padding: 12px 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

/* Markdown styles */
.ai-markdown-body { line-height: 1.65; color: #2c3e50; word-break: break-word; }
:deep(.ai-markdown-body h1) { font-size: 1.25em; font-weight: 700; color: #1565c0; margin: 10px 0 5px; border-bottom: 2px solid #e3f2fd; padding-bottom: 3px; }
:deep(.ai-markdown-body h2) { font-size: 1.1em; font-weight: 700; color: #1976d2; margin: 8px 0 4px; }
:deep(.ai-markdown-body h3) { font-size: 1em; font-weight: 600; color: #1976d2; margin: 6px 0 3px; }
:deep(.ai-markdown-body p) { margin: 5px 0; }
:deep(.ai-markdown-body ul), :deep(.ai-markdown-body ol) { padding-left: 18px; margin: 5px 0; }
:deep(.ai-markdown-body li) { margin: 2px 0; }
:deep(.ai-markdown-body strong) { color: #1a237e; }
:deep(.ai-markdown-body code) { background: #f0f4ff; border: 1px solid #c5cae9; border-radius: 4px; padding: 1px 5px; font-size: 0.87em; color: #c62828; font-family: monospace; }
:deep(.ai-markdown-body pre) { background: #1e1e2e; color: #cdd6f4; border-radius: 8px; padding: 12px; overflow-x: auto; margin: 8px 0; }
:deep(.ai-markdown-body pre code) { background: none; border: none; color: inherit; padding: 0; }
:deep(.ai-markdown-body blockquote) { border-left: 4px solid #90caf9; background: #e3f2fd; padding: 8px 12px; border-radius: 0 8px 8px 0; margin: 6px 0; color: #1565c0; }
:deep(.ai-markdown-body table) { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 0.91em; }
:deep(.ai-markdown-body th) { background: #e3f2fd; border: 1px solid #90caf9; padding: 5px 10px; color: #1565c0; }
:deep(.ai-markdown-body td) { border: 1px solid #e0e0e0; padding: 5px 10px; }
:deep(.ai-markdown-body tr:nth-child(even)) { background: #f8f9fa; }

.sql-block {
  background: #1e1e2e; color: #cdd6f4;
  padding: 10px 12px; border-radius: 8px;
  font-size: 0.8em; overflow-x: auto;
  white-space: pre-wrap; word-break: break-all; margin: 0;
}
.results-table-wrapper { overflow-x: auto; max-height: 280px; overflow-y: auto; border-radius: 6px; border: 1px solid #e0e0e0; }
.results-table { border-collapse: collapse; font-size: 0.78em; width: 100%; }
.results-table th { background: #e3f2fd; padding: 5px 10px; text-align: left; white-space: nowrap; color: #1565c0; border-bottom: 1px solid #90caf9; position: sticky; top: 0; }
.results-table td { padding: 4px 10px; border-top: 1px solid rgba(0,0,0,0.05); white-space: nowrap; }
.results-table tr:nth-child(even) { background: #f8f9fa; }
</style>
