<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Paramètres</div>

    <q-tabs v-model="tab" dense align="left" class="q-mb-md text-grey" active-color="primary" indicator-color="primary">
      <q-tab name="company" label="Entreprise" icon="business" no-caps />
      <q-tab name="devices" label="Appareils SFE" icon="devices" no-caps />
      <q-tab name="users" label="Utilisateurs" icon="people" no-caps />
      <q-tab name="ai" label="Intelligence Artificielle" icon="smart_toy" no-caps />
      <q-tab name="ai-usage" label="Consommation IA" icon="analytics" no-caps />
      <q-tab name="chatbot" label="Chatbot API" icon="smart_toy" no-caps />
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

        <!-- Routing table -->
        <q-card flat bordered class="q-mt-md">
          <q-card-section>
            <div class="row items-center q-mb-md">
              <q-icon name="alt_route" size="sm" color="primary" class="q-mr-sm" />
              <div class="text-subtitle1 text-weight-medium">Routage IA par tâche</div>
              <q-space />
              <q-btn flat dense size="sm" color="grey" icon="restart_alt" label="Réinitialiser" no-caps @click="resetRouting" />
            </div>
            <q-banner class="bg-grey-2 q-mb-md rounded-borders" dense>
              Chaque tâche peut utiliser un modèle différent avec son propre fallback, température et limite de tokens.
            </q-banner>

            <div v-for="(taskKey) in aiTaskKeys" :key="taskKey" class="q-mb-md">
              <q-expansion-item
                :icon="taskLabels[taskKey].icon"
                :label="taskLabels[taskKey].label"
                :caption="taskLabels[taskKey].description"
                header-class="bg-grey-1 rounded-borders"
                dense
              >
                <q-card flat class="q-pa-md">
                  <div class="row q-gutter-sm">
                    <q-toggle
                      v-model="routingForm[taskKey].enabled"
                      :label="routingForm[taskKey].enabled ? 'Activé' : 'Désactivé'"
                      color="primary"
                      class="col-12"
                    />
                    <q-select
                      v-model="routingForm[taskKey].model"
                      :options="availableModels"
                      emit-value
                      map-options
                      label="Modèle principal"
                      filled
                      dense
                      class="col-12 col-md-5"
                      :disable="!routingForm[taskKey].enabled"
                    />
                    <q-select
                      v-model="routingForm[taskKey].fallback"
                      :options="fallbackOptions"
                      emit-value
                      map-options
                      label="Fallback"
                      filled
                      dense
                      class="col-12 col-md-5"
                      :disable="!routingForm[taskKey].enabled"
                    />
                    <q-input
                      v-model.number="routingForm[taskKey].temperature"
                      label="Temp."
                      filled
                      dense
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      class="col-5 col-md"
                      :disable="!routingForm[taskKey].enabled"
                    />
                    <q-input
                      v-model.number="routingForm[taskKey].max_tokens"
                      label="Max tokens"
                      filled
                      dense
                      type="number"
                      step="256"
                      min="256"
                      max="8192"
                      class="col-5 col-md"
                      :disable="!routingForm[taskKey].enabled"
                    />
                  </div>
                </q-card>
              </q-expansion-item>
            </div>

            <div class="row justify-end q-mt-md">
              <q-btn color="primary" icon="save" label="Enregistrer le routage" no-caps :loading="saving" @click="saveRouting" />
            </div>
          </q-card-section>
        </q-card>

        <!-- Available models reference -->
        <q-card flat bordered class="q-mt-md">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-sm">Modèles disponibles (OpenRouter)</div>
            <q-markup-table flat bordered separator="cell" dense>
              <thead>
                <tr class="bg-grey-2">
                  <th class="text-left">Fournisseur</th>
                  <th class="text-left">Modèle</th>
                  <th class="text-left">ID</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="m in availableModels" :key="m.value">
                  <td>
                    <q-icon :name="providerIcon(m.provider)" :color="providerColor(m.provider)" size="xs" class="q-mr-xs" />
                    {{ m.provider }}
                  </td>
                  <td class="text-weight-medium">{{ m.label }}</td>
                  <td class="text-caption text-grey-7">{{ m.value }}</td>
                </tr>
              </tbody>
            </q-markup-table>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- AI Usage Stats -->
      <q-tab-panel name="ai-usage">
        <div class="row items-center q-mb-md">
          <q-icon name="analytics" size="sm" color="primary" class="q-mr-sm" />
          <div class="text-subtitle1 text-weight-medium">Consommation IA</div>
          <q-space />
          <q-btn flat dense size="sm" icon="refresh" label="Actualiser" no-caps @click="loadUsageStats" :loading="usageLoading" />
        </div>

        <!-- Period selector -->
        <div class="row q-gutter-sm q-mb-md items-center">
          <q-btn-toggle
            v-model="usagePeriod"
            no-caps
            dense
            toggle-color="primary"
            :options="[
              { label: '7j', value: '7d' },
              { label: '30j', value: '30d' },
              { label: '90j', value: '90d' },
              { label: 'Tout', value: 'all' },
            ]"
            @update:model-value="loadUsageStats"
          />
        </div>

        <!-- KPI Cards -->
        <div class="row q-gutter-sm q-mb-md">
          <q-card flat bordered class="col">
            <q-card-section class="text-center q-pa-sm">
              <div class="text-grey-7 text-caption">Requêtes</div>
              <div class="text-h5 text-weight-bold text-primary">{{ usageTotals.requests }}</div>
            </q-card-section>
          </q-card>
          <q-card flat bordered class="col">
            <q-card-section class="text-center q-pa-sm">
              <div class="text-grey-7 text-caption">Tokens entrants</div>
              <div class="text-h5 text-weight-bold text-blue">{{ formatTokens(usageTotals.tokens_input) }}</div>
            </q-card-section>
          </q-card>
          <q-card flat bordered class="col">
            <q-card-section class="text-center q-pa-sm">
              <div class="text-grey-7 text-caption">Tokens sortants</div>
              <div class="text-h5 text-weight-bold text-green">{{ formatTokens(usageTotals.tokens_output) }}</div>
            </q-card-section>
          </q-card>
          <q-card flat bordered class="col">
            <q-card-section class="text-center q-pa-sm">
              <div class="text-grey-7 text-caption">Erreurs</div>
              <div class="text-h5 text-weight-bold" :class="usageTotals.errors > 0 ? 'text-red' : 'text-grey'">{{ usageTotals.errors }}</div>
            </q-card-section>
          </q-card>
          <q-card flat bordered class="col">
            <q-card-section class="text-center q-pa-sm">
              <div class="text-grey-7 text-caption">Modérations</div>
              <div class="text-h5 text-weight-bold" :class="usageTotals.moderations > 0 ? 'text-orange' : 'text-grey'">{{ usageTotals.moderations }}</div>
            </q-card-section>
          </q-card>
        </div>

        <!-- Usage by model -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle2 text-weight-medium q-mb-sm">Consommation par modèle</div>
            <q-markup-table flat bordered separator="cell" dense>
              <thead><tr class="bg-grey-2">
                <th class="text-left">Modèle</th>
                <th class="text-right">Requêtes</th>
                <th class="text-right">Input</th>
                <th class="text-right">Output</th>
                <th class="text-right">Total</th>
                <th class="text-center">Erreurs</th>
                <th class="text-center">Modérations</th>
              </tr></thead>
              <tbody>
                <tr v-for="m in usageByModel" :key="m.model">
                  <td class="text-weight-medium">{{ m.model }}</td>
                  <td class="text-right">{{ m.requests }}</td>
                  <td class="text-right text-blue">{{ formatTokens(m.tokens_input) }}</td>
                  <td class="text-right text-green">{{ formatTokens(m.tokens_output) }}</td>
                  <td class="text-right text-weight-bold">{{ formatTokens(m.tokens_total) }}</td>
                  <td class="text-center"><q-badge v-if="m.errors > 0" color="red" :label="m.errors" /><span v-else class="text-grey-4">0</span></td>
                  <td class="text-center"><q-badge v-if="m.moderations > 0" color="orange" :label="m.moderations" /><span v-else class="text-grey-4">0</span></td>
                </tr>
                <tr v-if="usageByModel.length === 0"><td colspan="7" class="text-center text-grey-5 q-pa-md">Aucune donnée</td></tr>
              </tbody>
            </q-markup-table>
          </q-card-section>
        </q-card>

        <!-- Moderations / Bans -->
        <q-card v-if="usageModerations.length > 0" flat bordered class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle2 text-weight-medium text-orange q-mb-sm">
              <q-icon name="gpp_maybe" class="q-mr-xs" />Modérations et refus de contenu
            </div>
            <q-markup-table flat bordered separator="cell" dense>
              <thead><tr class="bg-orange-1">
                <th class="text-left">Date</th>
                <th class="text-left">Modèle</th>
                <th class="text-left">Tâche</th>
                <th class="text-left">Raison</th>
                <th class="text-center">Statut</th>
              </tr></thead>
              <tbody>
                <tr v-for="l in usageModerations" :key="l.id">
                  <td class="text-caption">{{ new Date(l.created_at).toLocaleString('fr-FR') }}</td>
                  <td>{{ l.model }}</td>
                  <td>{{ l.task }}</td>
                  <td class="text-red text-weight-medium">{{ l.moderation_reason || l.error_message || 'Non spécifié' }}</td>
                  <td class="text-center"><q-badge :color="l.status === 'moderated' ? 'orange' : 'red'" :label="l.status" /></td>
                </tr>
              </tbody>
            </q-markup-table>
          </q-card-section>
        </q-card>

        <!-- Recent logs -->
        <q-card flat bordered>
          <q-card-section>
            <div class="text-subtitle2 text-weight-medium q-mb-sm">Historique récent (dernières 50 requêtes)</div>
            <q-markup-table flat bordered separator="cell" dense wrap-cells>
              <thead><tr class="bg-grey-2">
                <th class="text-left">Date</th>
                <th class="text-left">Modèle</th>
                <th class="text-left">Tâche</th>
                <th class="text-right">Input</th>
                <th class="text-right">Output</th>
                <th class="text-right">Latence</th>
                <th class="text-center">Statut</th>
              </tr></thead>
              <tbody>
                <tr v-for="l in usageLogs.slice(0, 50)" :key="l.id">
                  <td class="text-caption">{{ new Date(l.created_at).toLocaleString('fr-FR') }}</td>
                  <td>{{ l.model }}<q-badge v-if="l.is_fallback" color="amber" label="FB" class="q-ml-xs" /></td>
                  <td>{{ l.task }}</td>
                  <td class="text-right">{{ l.tokens_input }}</td>
                  <td class="text-right">{{ l.tokens_output }}</td>
                  <td class="text-right">{{ l.latency_ms }}ms</td>
                  <td class="text-center">
                    <q-badge :color="l.status === 'success' ? 'green' : l.status === 'moderated' ? 'orange' : 'red'" :label="l.status" />
                  </td>
                </tr>
                <tr v-if="usageLogs.length === 0"><td colspan="7" class="text-center text-grey-5 q-pa-md">Aucune requête enregistrée</td></tr>
              </tbody>
            </q-markup-table>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- Chatbot API -->
      <q-tab-panel name="chatbot">
        <!-- Activation toggle -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="row items-center">
              <div>
                <div class="text-subtitle1 text-weight-medium">Chatbot API</div>
                <div class="text-caption text-grey-7">Permettez l'accès à votre système via WhatsApp, Telegram, Email ou API REST</div>
              </div>
              <q-space />
              <q-toggle v-model="chatbotEnabled" label="Activer" @update:model-value="toggleChatbot" />
            </div>
          </q-card-section>
        </q-card>

        <template v-if="chatbotEnabled">
          <!-- API Keys -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="row items-center q-mb-md">
                <div class="text-subtitle1 text-weight-medium">Clés API</div>
                <q-space />
                <q-btn color="primary" icon="add" label="Nouvelle clé" no-caps size="sm" @click="newKeyDialog = true" />
              </div>

              <q-banner v-if="newKeyRaw" class="bg-green-1 q-mb-md" rounded>
                <template v-slot:avatar><q-icon name="vpn_key" color="green" /></template>
                <div class="text-weight-medium">Clé API créée — copiez-la maintenant, elle ne sera plus affichée :</div>
                <code class="text-body2">{{ newKeyRaw }}</code>
                <template v-slot:action>
                  <q-btn flat label="Copier" icon="content_copy" color="green" no-caps @click="copyKey" />
                  <q-btn flat label="Fermer" no-caps @click="newKeyRaw = ''" />
                </template>
              </q-banner>

              <q-markup-table flat bordered separator="horizontal" v-if="chatbotKeys.length > 0">
                <thead>
                  <tr class="bg-grey-2">
                    <th class="text-left">Nom</th>
                    <th class="text-left">Préfixe</th>
                    <th class="text-center">Canaux</th>
                    <th class="text-center">Statut</th>
                    <th class="text-center">Expiration</th>
                    <th class="text-center">Limite/h</th>
                    <th class="text-center">Dernier usage</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="k in chatbotKeys" :key="k.id">
                    <td class="text-left text-weight-medium">{{ k.name }}</td>
                    <td class="text-left"><code>{{ k.api_key_prefix }}...</code></td>
                    <td class="text-center">
                      <q-badge v-for="ch in k.channels" :key="ch" :label="ch" color="blue-grey" class="q-mr-xs" />
                    </td>
                    <td class="text-center">
                      <q-badge :color="k.is_active ? 'green' : 'red'" :label="k.is_active ? 'Active' : 'Inactive'" />
                    </td>
                    <td class="text-center">{{ k.expires_at ? new Date(k.expires_at).toLocaleDateString('fr-FR') : '∞' }}</td>
                    <td class="text-center">{{ k.rate_limit_per_hour }}</td>
                    <td class="text-center text-caption">{{ k.last_used_at ? new Date(k.last_used_at).toLocaleString('fr-FR') : '—' }}</td>
                    <td class="text-right">
                      <q-btn flat round size="sm" :icon="k.is_active ? 'pause' : 'play_arrow'" :color="k.is_active ? 'orange' : 'green'" @click="onToggleKey(k)">
                        <q-tooltip>{{ k.is_active ? 'Désactiver' : 'Activer' }}</q-tooltip>
                      </q-btn>
                      <q-btn flat round size="sm" icon="tune" color="primary" @click="openPermissions(k)">
                        <q-tooltip>Permissions</q-tooltip>
                      </q-btn>
                      <q-btn flat round size="sm" icon="download" color="teal" @click="exportSkillForKey(k)">
                        <q-tooltip>Exporter Skill .md</q-tooltip>
                      </q-btn>
                      <q-btn flat round size="sm" icon="delete" color="red" @click="onDeleteKey(k)">
                        <q-tooltip>Supprimer</q-tooltip>
                      </q-btn>
                    </td>
                  </tr>
                </tbody>
              </q-markup-table>
              <div v-else class="text-center text-grey-5 q-pa-lg">Aucune clé API créée</div>
            </q-card-section>
          </q-card>

          <!-- Skill export -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="row items-center">
                <div>
                  <div class="text-subtitle1 text-weight-medium">Skill Chatbot (.md)</div>
                  <div class="text-caption text-grey-7">Exportez un fichier Markdown complet à utiliser comme base de connaissances pour votre chatbot IA</div>
                </div>
                <q-space />
                <q-btn color="teal" icon="download" label="Exporter le Skill complet" no-caps @click="exportFullSkill" />
              </div>
            </q-card-section>
          </q-card>

          <!-- Endpoint info -->
          <q-card flat bordered class="q-mb-md">
            <q-card-section>
              <div class="text-subtitle1 text-weight-medium q-mb-sm">Point d'accès API</div>
              <div class="text-body2 q-mb-sm">Envoyez un POST à l'endpoint suivant avec votre clé API :</div>
              <code class="text-body2 bg-grey-2 q-pa-sm" style="border-radius:4px; display:block">
POST {{ gatewayUrl }}
Headers: X-API-Key: &lt;votre_clé&gt;, X-Channel: whatsapp|telegram|email|api
Body: { "message": "...", "conversation_id": "..." (optionnel) }
              </code>
            </q-card-section>
          </q-card>

          <!-- Recent conversations -->
          <q-card flat bordered>
            <q-card-section>
              <div class="row items-center q-mb-md">
                <div class="text-subtitle1 text-weight-medium">Conversations récentes</div>
                <q-space />
                <q-btn flat icon="refresh" size="sm" @click="loadChatbotConversations" :loading="chatbotLoading" />
              </div>
              <q-markup-table flat bordered separator="horizontal" v-if="chatbotConversations.length > 0">
                <thead>
                  <tr class="bg-grey-2">
                    <th class="text-left">Canal</th>
                    <th class="text-left">Utilisateur</th>
                    <th class="text-center">Statut</th>
                    <th class="text-left">Début</th>
                    <th class="text-left">Dernier message</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="c in chatbotConversations" :key="c.id">
                    <td><q-badge :label="c.channel" color="blue-grey" /></td>
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
        </template>
      </q-tab-panel>
    </q-tab-panels>

    <!-- Create API key dialog -->
    <q-dialog v-model="newKeyDialog" persistent>
      <q-card style="min-width: 500px">
        <q-card-section>
          <div class="text-h6">Nouvelle clé API Chatbot</div>
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input v-model="newKeyForm.name" label="Nom de la clé" filled :rules="[v => !!v || 'Requis']" hint="Ex: WhatsApp Production" />
          <q-select v-model="newKeyForm.channels" :options="channelOptions" label="Canaux autorisés" filled multiple emit-value map-options use-chips option-label="label" option-value="value" />
          <q-input v-model="newKeyForm.expires_at" label="Date d'expiration (optionnel)" filled type="date" clearable />
          <q-input v-model.number="newKeyForm.rate_limit" label="Limite requêtes/heure" filled type="number" :rules="[v => v > 0 || 'Min 1']" />

          <div class="text-subtitle2 q-mt-md q-mb-sm">Permissions</div>
          <div v-for="cat in permissionCategories" :key="cat" class="q-mb-sm">
            <div class="text-caption text-weight-medium text-grey-8 q-mb-xs">{{ cat }}</div>
            <div v-for="act in actionsByCategory(cat)" :key="act" class="row items-center q-ml-sm">
              <q-checkbox v-model="newKeyForm.permissions" :val="act" :label="actionLabel(act)" dense />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup no-caps />
          <q-btn color="primary" label="Créer la clé" no-caps :loading="saving" @click="onCreateKey" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Permissions dialog -->
    <q-dialog v-model="permDialog" persistent>
      <q-card style="min-width: 600px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">Permissions — {{ editingKey?.name }}</div>
        </q-card-section>
        <q-card-section>
          <q-markup-table flat bordered separator="horizontal" dense>
            <thead>
              <tr class="bg-grey-2">
                <th class="text-left">Action</th>
                <th class="text-center" style="width:80px">Activée</th>
                <th class="text-center">Valide du</th>
                <th class="text-center">Valide jusqu'au</th>
                <th class="text-center" style="width:100px">Limite/h</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in editingPerms" :key="p.action">
                <td class="text-left">
                  <q-icon :name="actionIcon(p.action)" class="q-mr-xs" size="xs" />
                  {{ actionLabel(p.action) }}
                </td>
                <td class="text-center"><q-toggle v-model="p.enabled" dense /></td>
                <td class="text-center"><q-input v-model="p.valid_from" type="date" dense borderless clearable style="max-width:140px" /></td>
                <td class="text-center"><q-input v-model="p.valid_until" type="date" dense borderless clearable style="max-width:140px" /></td>
                <td class="text-center"><q-input v-model.number="p.rate_limit_per_hour" type="number" dense borderless clearable style="max-width:80px" placeholder="∞" /></td>
              </tr>
            </tbody>
          </q-markup-table>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup no-caps />
          <q-btn color="primary" label="Enregistrer" no-caps :loading="saving" @click="savePermissions" />
        </q-card-actions>
      </q-card>
    </q-dialog>

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
import { ref, reactive, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import { AI_TASK_LABELS, getDefaultRouting } from 'src/composables/useAiAssistant';
import { useAiUsage } from 'src/composables/useAiUsage';
import { useCrypto } from 'src/composables/useCrypto';
import { useChatbotConfig } from 'src/composables/useChatbotConfig';
import { useChatbotSkill } from 'src/composables/useChatbotSkill';
import type { AiTaskType, AiRouting, AiTaskRoute, ChatbotApiKey, ChatbotAction, ChatbotChannel, ChatbotConversation, Company } from 'src/types';
import { CHATBOT_ACTION_LABELS, ALL_CHATBOT_ACTIONS, CHATBOT_CHANNELS } from 'src/types';

const $q = useQuasar();
const companyStore = useCompanyStore();
const { encrypt, decrypt } = useCrypto();

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

const fallbackOptions = [
  { label: '(Aucun)', value: null },
  ...availableModels,
];

const taskLabels = AI_TASK_LABELS;
const aiTaskKeys: AiTaskType[] = [
  'assistant_fiscal', 'analyse_facture', 'resume_rapport',
  'suggestion_fiscale', 'classification_depense', 'detection_anomalie',
];

const routingForm = reactive<Record<AiTaskType, AiTaskRoute>>(getDefaultRouting());

function loadRoutingForm() {
  const c = companyStore.company;
  const routing = c?.ai_routing;
  if (routing) {
    for (const key of aiTaskKeys) {
      if (routing[key]) {
        routingForm[key] = { ...routingForm[key], ...routing[key] };
      }
    }
  }
}

function resetRouting() {
  const defaults = getDefaultRouting();
  for (const key of aiTaskKeys) {
    routingForm[key] = defaults[key];
  }
  $q.notify({ type: 'info', message: 'Routage réinitialisé aux valeurs par défaut (non sauvegardé)' });
}

async function saveRouting() {
  saving.value = true;
  try {
    const routingData: AiRouting = {} as AiRouting;
    for (const key of aiTaskKeys) {
      routingData[key] = { ...routingForm[key] };
    }
    const result = await companyStore.updateCompany({ ai_routing: routingData });
    if (result?.error) {
      $q.notify({ type: 'negative', message: result.error.message });
    } else {
      $q.notify({ type: 'positive', message: 'Routage IA enregistré' });
    }
  } finally {
    saving.value = false;
  }
}

// --- AI Usage ---
const aiUsage = useAiUsage();
const usageLogs = aiUsage.logs;
const usageByModel = aiUsage.byModel;
const usageModerations = aiUsage.moderationLogs;
const usageTotals = aiUsage.totals;
const usageLoading = aiUsage.loading;
const usagePeriod = ref('30d');

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function getUsageDateFrom(period: string): string | undefined {
  if (period === 'all') return undefined;
  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

async function loadUsageStats() {
  const from = getUsageDateFrom(usagePeriod.value);
  await aiUsage.fetchCompanyUsage(from);
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
      openrouter_api_key: '',
    };
    // Decrypt the stored key for display
    if (c.openrouter_api_key) {
      void decryptApiKey(c.openrouter_api_key);
    }
  }
}

async function decryptApiKey(ciphertext: string) {
  const { plaintext, error } = await decrypt(ciphertext);
  if (!error && plaintext) {
    aiForm.value.openrouter_api_key = plaintext;
  } else {
    // Fallback: maybe stored unencrypted (legacy)
    aiForm.value.openrouter_api_key = ciphertext;
  }
}

async function saveAiConfig() {
  saving.value = true;
  try {
    // Encrypt the API key before saving
    let encryptedKey: string | null = null;
    if (aiForm.value.openrouter_api_key) {
      const { ciphertext, error: encErr } = await encrypt(aiForm.value.openrouter_api_key);
      if (encErr) {
        $q.notify({ type: 'negative', message: `Chiffrement échoué : ${encErr}` });
        saving.value = false;
        return;
      }
      encryptedKey = ciphertext;
    }
    const result = await companyStore.updateCompany({
      ai_enabled: aiForm.value.ai_enabled,
      ai_model: aiForm.value.ai_model,
      ai_fallback_model: aiForm.value.ai_fallback_model,
      ai_system_prompt: aiForm.value.ai_system_prompt || null,
      openrouter_api_key: encryptedKey || null,
    });
    if (result?.error) {
      $q.notify({ type: 'negative', message: result.error.message });
    } else {
      $q.notify({ type: 'positive', message: 'Configuration IA enregistrée' });
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

// --- Chatbot API ---
const skill = useChatbotSkill();
const chatbot = useChatbotConfig();
const chatbotEnabled = ref(false);
const chatbotKeys = chatbot.apiKeys;
const chatbotConversations = ref<ChatbotConversation[]>([]);
const chatbotLoading = chatbot.loading;
const newKeyDialog = ref(false);
const newKeyRaw = ref('');
const permDialog = ref(false);
const editingKey = ref<ChatbotApiKey | null>(null);
const editingPerms = ref<{ action: ChatbotAction; enabled: boolean; valid_from: string | null; valid_until: string | null; rate_limit_per_hour: number | null }[]>([]);

const insforgeUrl = import.meta.env.VITE_INSFORGE_URL as string || '';
const gatewayUrl = `${insforgeUrl}/functions/chatbot-gateway`;
const channelOptions = CHATBOT_CHANNELS;

const newKeyForm = ref({
  name: '',
  channels: [] as ChatbotChannel[],
  expires_at: '' as string,
  rate_limit: 60,
  permissions: [...ALL_CHATBOT_ACTIONS] as ChatbotAction[],
});

const permissionCategories = [...new Set(ALL_CHATBOT_ACTIONS.map(a => CHATBOT_ACTION_LABELS[a].category))];

function actionsByCategory(cat: string): ChatbotAction[] {
  return ALL_CHATBOT_ACTIONS.filter(a => CHATBOT_ACTION_LABELS[a].category === cat);
}

function actionLabel(a: ChatbotAction): string {
  return CHATBOT_ACTION_LABELS[a]?.label || a;
}

function actionIcon(a: ChatbotAction): string {
  return CHATBOT_ACTION_LABELS[a]?.icon || 'smart_toy';
}

async function toggleChatbot(val: boolean) {
  const result = await companyStore.updateCompany({ chatbot_enabled: val } as Partial<Company>);
  if (result?.error) {
    $q.notify({ type: 'negative', message: result.error.message });
    chatbotEnabled.value = !val;
  } else {
    $q.notify({ type: 'positive', message: val ? 'Chatbot activé' : 'Chatbot désactivé' });
  }
}

async function onCreateKey() {
  if (!newKeyForm.value.name) return;
  saving.value = true;
  try {
    const { rawKey, error } = await chatbot.createApiKey({
      name: newKeyForm.value.name,
      channels: newKeyForm.value.channels,
      expires_at: newKeyForm.value.expires_at || null,
      rate_limit_per_hour: newKeyForm.value.rate_limit,
      permissions: newKeyForm.value.permissions,
    });
    if (error) {
      $q.notify({ type: 'negative', message: error });
    } else {
      newKeyRaw.value = rawKey || '';
      newKeyDialog.value = false;
      newKeyForm.value = { name: '', channels: [], expires_at: '', rate_limit: 60, permissions: [...ALL_CHATBOT_ACTIONS] };
      $q.notify({ type: 'positive', message: 'Clé API créée' });
    }
  } finally {
    saving.value = false;
  }
}

function copyKey() {
  void navigator.clipboard.writeText(newKeyRaw.value);
  $q.notify({ type: 'positive', message: 'Clé copiée' });
}

async function onToggleKey(k: ChatbotApiKey) {
  const err = await chatbot.toggleApiKey(k.id, !k.is_active);
  if (err) $q.notify({ type: 'negative', message: err });
  else $q.notify({ type: 'info', message: k.is_active ? 'Clé désactivée' : 'Clé activée' });
}

function onDeleteKey(k: ChatbotApiKey) {
  $q.dialog({ title: 'Supprimer', message: `Supprimer la clé "${k.name}" ?`, cancel: true, persistent: true })
    .onOk(() => {
      void chatbot.deleteApiKey(k.id).then(err => {
        if (err) $q.notify({ type: 'negative', message: err });
        else $q.notify({ type: 'positive', message: 'Clé supprimée' });
      });
    });
}

async function openPermissions(k: ChatbotApiKey) {
  editingKey.value = k;
  const perms = await chatbot.loadPermissions(k.id);
  editingPerms.value = ALL_CHATBOT_ACTIONS.map(action => {
    const existing = perms.find(p => p.action === action);
    return {
      action,
      enabled: existing?.enabled ?? false,
      valid_from: existing?.valid_from ? existing.valid_from.substring(0, 10) : null,
      valid_until: existing?.valid_until ? existing.valid_until.substring(0, 10) : null,
      rate_limit_per_hour: existing?.rate_limit_per_hour ?? null,
    };
  });
  permDialog.value = true;
}

async function savePermissions() {
  if (!editingKey.value) return;
  saving.value = true;
  try {
    const err = await chatbot.bulkUpdatePermissions(editingKey.value.id, editingPerms.value);
    if (err) {
      $q.notify({ type: 'negative', message: err });
    } else {
      $q.notify({ type: 'positive', message: 'Permissions enregistrées' });
      permDialog.value = false;
    }
  } finally {
    saving.value = false;
  }
}

async function loadChatbotConversations() {
  await chatbot.loadConversations();
  chatbotConversations.value = chatbot.conversations.value;
}

async function exportSkillForKey(k: ChatbotApiKey) {
  const md = await skill.generateSkillForKey(k);
  const safeName = k.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  skill.downloadSkill(md, `skill_chatbot_${safeName}.md`);
  $q.notify({ type: 'positive', message: `Skill exporté pour "${k.name}"` });
}

function exportFullSkill() {
  const md = skill.generateFullSkill();
  const companyName = (companyStore.company?.name || 'entreprise').replace(/[^a-zA-Z0-9_-]/g, '_');
  skill.downloadSkill(md, `skill_chatbot_complet_${companyName}.md`);
  $q.notify({ type: 'positive', message: 'Skill complet exporté' });
}

function loadChatbotState() {
  chatbotEnabled.value = companyStore.company?.chatbot_enabled ?? false;
}

onMounted(async () => {
  loadCompanyForm();
  loadRoutingForm();
  loadChatbotState();
  await Promise.all([loadDevices(), loadUsers(), chatbot.loadApiKeys()]);
});
</script>
