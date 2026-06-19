<template>
  <q-page padding>
    <q-breadcrumbs class="q-mb-md">
      <q-breadcrumbs-el label="Wallets" to="/wallets" />
      <q-breadcrumbs-el :label="wallet?.display_name ?? 'Wallet'" />
      <q-breadcrumbs-el label="Synchronisation" />
    </q-breadcrumbs>

    <div class="row q-col-gutter-md">
      <!-- Left: Wallet info -->
      <div class="col-12 col-md-4">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">{{ wallet?.display_name }}</div>
            <div class="text-caption text-grey-6">{{ wallet?.category }}</div>
            <q-separator class="q-my-sm" />
            <div class="row items-center q-gutter-sm">
              <q-icon name="account_balance" />
              <span>{{ wallet?.identifier_masked ?? '****' }}</span>
            </div>
            <div class="row items-center q-gutter-sm q-mt-xs">
              <q-icon name="schedule" />
              <span>Dernière sync: {{ lastSyncText }}</span>
            </div>
          </q-card-section>
        </q-card>

        <!-- Provider Info -->
        <q-card flat bordered class="q-mt-md" v-if="provider">
          <q-card-section>
            <div class="text-subtitle2">Fournisseur</div>
            <div class="text-h6">{{ provider.name }}</div>
            <q-chip dense :color="apiStatusColor" text-color="white">{{ apiStatusLabel }}</q-chip>
          </q-card-section>
          <q-card-section class="q-pt-none">
            <q-list dense>
              <q-item v-for="cap in providerCapabilities" :key="cap.code">
                <q-item-section avatar><q-icon :name="cap.icon" size="xs" /></q-item-section>
                <q-item-section>{{ cap.label }}</q-item-section>
                <q-item-section side>
                  <q-icon :name="cap.supported ? 'check_circle' : 'cancel'" :color="cap.supported ? 'positive' : 'grey-5'" size="xs" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>
        </q-card>
      </div>

      <!-- Right: Sync settings -->
      <div class="col-12 col-md-8">
        <q-card flat bordered>
          <q-card-section>
            <div class="text-h6">Mode de connexion</div>
            <div class="text-caption text-grey-6">Choisissez comment importer vos transactions</div>
          </q-card-section>

          <q-tabs v-model="connectionMode" dense align="left" class="q-px-md" active-color="primary" indicator-color="primary">
            <q-tab name="manual"      icon="edit"       label="Manuel" />
            <q-tab name="api_polling" icon="sync"       label="API Automatique" :disable="!provider?.has_official_api" />
            <q-tab name="api_webhook" icon="notifications" label="Webhook" :disable="!provider?.supports_push" />
          </q-tabs>

          <q-separator />

          <q-tab-panels v-model="connectionMode" animated>
            <!-- MANUAL -->
            <q-tab-panel name="manual">
              <q-banner dense rounded class="bg-info text-white q-mb-md">
                <template #avatar><q-icon name="info" /></template>
                Import manuel via copier-coller, upload fichier, ou saisie.
              </q-banner>
              <payment-evidence-paste-zone :wallets="[{id: walletId, label: wallet?.display_name}]" :fixed-wallet-id="walletId" @ingested="onIngested" />
            </q-tab-panel>

            <!-- API POLLING -->
            <q-tab-panel name="api_polling">
              <q-banner v-if="!hasCredentials" dense rounded class="bg-warning text-dark q-mb-md">
                <template #avatar><q-icon name="warning" /></template>
                API non configurée. Vous devez obtenir vos credentials auprès de {{ provider?.name }}.
              </q-banner>

              <q-form @submit="saveCredentials" class="q-gutter-md">
                <q-input v-model="apiConfig.api_key" outlined dense label="API Key" type="password" :disable="!canEditCredentials">
                  <template #append><q-icon name="key" /></template>
                </q-input>
                
                <q-input v-if="provider?.code === 'mtn-momo'" v-model="apiConfig.api_user" outlined dense label="API User" :disable="!canEditCredentials" />
                <q-input v-if="provider?.code === 'mtn-momo'" v-model="apiConfig.subscription_key" outlined dense label="Subscription Key" :disable="!canEditCredentials" />
                
                <q-input v-if="provider?.code === 'wave'" v-model="apiConfig.webhook_secret" outlined dense label="Webhook Secret (pour vérification signature)" type="password" :disable="!canEditCredentials" />

                <q-select v-model="syncFrequency" outlined dense label="Fréquence de synchronisation" :options="frequencyOptions" emit-value map-options />

                <div class="row q-gutter-sm">
                  <q-btn label="Sauvegarder" type="submit" color="primary" unelevated :disable="!canEditCredentials" :loading="saving" />
                  <q-btn label="Tester la connexion" color="secondary" unelevated outline :disable="!hasCredentials || testing" :loading="testing" @click="testConnection" />
                </div>
              </q-form>

              <q-separator class="q-my-md" />

              <div class="text-caption text-grey-7">
                <q-icon name="help" class="q-mr-xs" />
                <span v-if="provider?.api_doc_url">
                  <a :href="provider.api_doc_url" target="_blank">Documentation API {{ provider.name }}</a>
                </span>
                <span v-else>Documentation API non disponible</span>
              </div>
            </q-tab-panel>

            <!-- WEBHOOK -->
            <q-tab-panel name="api_webhook">
              <q-banner dense rounded class="bg-info text-white q-mb-md">
                <template #avatar><q-icon name="info" /></template>
                Les webhooks permettent une synchronisation temps réel.
              </q-banner>

              <div class="q-gutter-md">
                <q-input :model-value="webhookEndpoint" outlined dense label="Votre endpoint webhook" readonly>
                  <template #append>
                    <q-btn flat dense icon="content_copy" @click="copyWebhookUrl">
                      <q-tooltip>Copier</q-tooltip>
                    </q-btn>
                  </template>
                </q-input>

                <q-input v-model="webhookConfig.secret" outlined dense label="Secret pour signature HMAC" type="password" :disable="!canEditCredentials">
                  <template #hint>Généré automatiquement ou personnalisé</template>
                </q-input>

                <div class="row q-gutter-sm">
                  <q-btn label="Activer le webhook" color="primary" unelevated :disable="!canEditCredentials" :loading="saving" @click="enableWebhook" />
                  <q-btn label="Régénérer le secret" color="warning" unelevated outline :disable="!canEditCredentials" @click="regenerateSecret" />
                </div>
              </div>

              <q-separator class="q-mt-md" />

              <div class="text-caption text-grey-7 q-mt-sm">
                <strong>Instructions {{ provider?.name }}:</strong>
                <ol class="q-mt-xs">
                  <li>Copiez l'endpoint webhook ci-dessus</li>
                  <li>Configurez-le dans votre dashboard {{ provider?.name }}</li>
                  <li>Choisissez les événements: <code>payment.received</code>, <code>payment.sent</code></li>
                </ol>
              </div>
            </q-tab-panel>
          </q-tab-panels>
        </q-card>

        <!-- Sync history -->
        <q-card flat bordered class="q-mt-md">
          <q-card-section class="row items-center">
            <div class="text-h6">Historique des synchronisations</div>
            <q-space />
            <q-btn flat dense icon="refresh" label="Rafraîchir" @click="loadSyncHistory" />
          </q-card-section>
          <q-list separator>
            <q-item v-for="sync in syncHistory" :key="sync.id">
              <q-item-section>
                <q-item-label>{{ formatDate(sync.started_at) }}</q-item-label>
                <q-item-label caption>{{ sync.transactions_inserted }} transactions · {{ sync.transactions_skipped }} doublons</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-chip dense :color="syncStatusColor(sync.status)" text-color="white">{{ sync.status }}</q-chip>
              </q-item-section>
            </q-item>
            <q-item v-if="syncHistory.length === 0">
              <q-item-section class="text-grey-6 text-center q-py-md">Aucune synchronisation</q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import PaymentEvidencePasteZone from 'src/components/PaymentEvidencePasteZone.vue';
import { appwriteDb } from 'src/services/appwrite-db';

const $q = useQuasar();
const route = useRoute();
const walletId = computed(() => route.params.id as string);

// ─── Data ───────────────────────────────────────────────────────────────────
const wallet = ref<any>(null);
const provider = ref<any>(null);
const connectionMode = ref<'manual' | 'api_polling' | 'api_webhook'>('manual');
const syncFrequency = ref(60);
const apiConfig = ref({ api_key: '', api_user: '', subscription_key: '', webhook_secret: '' });
const webhookConfig = ref({ secret: '', enabled: false });
const syncHistory = ref<any[]>([]);
const saving = ref(false);
const testing = ref(false);
const canEditCredentials = ref(false); // Placeholder pour permissions

const frequencyOptions = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 heure', value: 60 },
  { label: '6 heures', value: 360 },
  { label: '12 heures', value: 720 },
  { label: '24 heures', value: 1440 },
];

// ─── Computed ───────────────────────────────────────────────────────────────
const hasCredentials = computed(() => !!apiConfig.value.api_key);
const apiStatusLabel = computed(() => {
  if (!provider.value?.has_official_api) return 'API non disponible';
  if (!hasCredentials.value) return 'API disponible — non configurée';
  return 'API configurée';
});
const apiStatusColor = computed(() => {
  if (!provider.value?.has_official_api) return 'grey';
  if (!hasCredentials.value) return 'warning';
  return 'positive';
});
const lastSyncText = computed(() => wallet.value?.last_sync_at ? new Date(wallet.value.last_sync_at).toLocaleString('fr-FR') : 'Jamais');
const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT as string || 'https://appwrite.benga.live/v1';
const webhookEndpoint = computed(() => `${APPWRITE_ENDPOINT}/functions/ingest-webhook-${provider.value?.code || 'generic'}?wallet=${walletId.value}`);

const providerCapabilities = computed(() => [
  { code: 'pull', label: 'API Pull (polling)', supported: provider.value?.supports_pull, icon: 'download' },
  { code: 'push', label: 'Webhooks (push)', supported: provider.value?.supports_push, icon: 'upload' },
  { code: 'send', label: 'Envoi paiement', supported: provider.value?.supports_send_payment, icon: 'send' },
  { code: 'balance', label: 'Query solde', supported: provider.value?.supports_balance_query, icon: 'account_balance_wallet' },
]);

// ─── Methods ──────────────────────────────────────────────────────────────
async function loadWallet() {
  const { data } = await appwriteDb.from('payment_wallets')
    .select('*, payment_providers(*)')
    .eq('id', walletId.value)
    .single();
  if (data) {
    wallet.value = data;
    provider.value = data.payment_providers;
    connectionMode.value = data.connection_mode || 'manual';
    syncFrequency.value = data.sync_frequency_minutes || 60;
    // apiConfig serait chargé depuis credentials chiffrés
  }
}

async function loadSyncHistory() {
  const { data } = await appwriteDb.from('wallet_sync_logs')
    .select('*')
    .eq('wallet_id', walletId.value)
    .order('started_at', { ascending: false })
    .limit(10);
  syncHistory.value = data || [];
}

async function saveCredentials() {
  saving.value = true;
  // TODO: Chiffrer et stocker via Edge Function crypto-aes256
  await new Promise(r => setTimeout(r, 800)); // Simulé
  saving.value = false;
  $q.notify({ type: 'positive', message: 'Configuration sauvegardée (simulation)' });
}

async function testConnection() {
  testing.value = true;
  // TODO: Call Edge Function de test
  await new Promise(r => setTimeout(r, 1200)); // Simulé
  testing.value = false;
  $q.notify({ type: 'info', message: 'Test de connexion simulé — API réelle à brancher' });
}

function enableWebhook() {
  $q.notify({ type: 'info', message: 'Webhook activation simulée — credentials requis' });
}

function regenerateSecret() {
  webhookConfig.value.secret = cryptoRandomString(32);
}

function copyWebhookUrl() {
  navigator.clipboard.writeText(webhookEndpoint.value);
  $q.notify({ type: 'positive', message: 'URL copiée' });
}

function onIngested() {
  $q.notify({ type: 'positive', message: 'Paiement importé avec succès' });
  loadSyncHistory();
}

function formatDate(d: string) { return new Date(d).toLocaleString('fr-FR'); }
function syncStatusColor(s: string) {
  return { success: 'positive', error: 'negative', partial: 'warning', running: 'info' }[s] || 'grey';
}

function cryptoRandomString(length: number) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ─── Lifecycle ────────────────────────────────────────────────────────────
onMounted(() => {
  loadWallet();
  loadSyncHistory();
  canEditCredentials.value = true; // TODO: permission check
});

watch(walletId, () => { loadWallet(); loadSyncHistory(); });
</script>
