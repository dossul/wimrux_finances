<template>
  <q-page padding>
    <div class="text-h5 q-mb-md">Paramètres</div>

    <q-tabs v-model="tab" dense align="left" class="q-mb-md text-grey" active-color="primary" indicator-color="primary">
      <q-tab name="company" label="Entreprise" icon="business" no-caps />
      <q-tab name="devices" label="Appareils SFE" icon="devices" no-caps />
      <q-tab name="secef-logs" label="Logs SECeF" icon="receipt_long" no-caps />
      <q-tab name="users" label="Utilisateurs" icon="people" no-caps />
      <q-tab name="ai" label="Intelligence Artificielle" icon="smart_toy" no-caps />
      <q-tab v-if="isProjectAdmin" name="ai-usage" label="Consommation IA" icon="analytics" no-caps />
      <q-tab name="chatbot" label="Chatbot API" icon="smart_toy" no-caps />
      <q-tab name="rbac" label="RBAC / Permissions" icon="admin_panel_settings" no-caps />
      <q-tab name="fiscal" label="Profil Fiscal" icon="account_balance" no-caps />
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
                <q-input v-model="companyForm.ifu" label="IFU (8 chiffres)" filled style="width: 200px" mask="########" :rules="[v => !!v || 'Requis', v => isValidIFU(v) || 'IFU invalide (8 chiffres)']" />
              </div>
              <div class="row q-gutter-sm">
                <q-input v-model="companyForm.rccm" label="RCCM" filled class="col" />
                <q-input v-model="companyForm.tax_regime" label="Régime fiscal" filled class="col" />
                <q-input v-model="companyForm.tax_office" label="Centre des impôts" filled class="col" />
              </div>
              <q-input
                v-model="companyForm.address_cadastral"
                label="Adresse cadastrale (SSSS LLL PPPP)"
                filled
                mask="#### ### ####"
                fill-mask="_"
                reactive-rules
                :rules="[v => !v || !v.replace(/[_ ]/g, '') || isValidCadastralAddress(v.replace(/_/g, '').trim()) ? true : 'Format invalide — 11 chiffres : Section (4) Ilot (3) Parcelle (4)']"
                hint="Section (4 chiffres) Ilot (3 chiffres) Parcelle (4 chiffres)"
                bottom-slots
              />
              <q-input
                v-model="companyForm.address"
                label="Adresse postale (si différente de l'adresse cadastrale)"
                filled
                clearable
                hint="Obligatoire si différente de l'adresse cadastrale"
                bottom-slots
              />
              <div class="row q-gutter-sm">
                <q-input v-model="companyForm.phone" label="Téléphone" filled class="col" />
                <q-input v-model="companyForm.email" label="Email" filled type="email" class="col" />
              </div>
              <q-input
                v-model="companyForm.qr_scan_base_url"
                label="URL de scan QR (optionnel)"
                filled
                clearable
                hint="Préfixe URL pour le QR Code — ex: https://votre-app.com. Vide = format DGI standard BF;..."
                bottom-slots
              />

              <!-- Comptes bancaires -->
              <div class="text-subtitle2 text-weight-medium q-mt-md q-mb-xs">Comptes bancaires</div>
              <div v-for="(bank, idx) in companyForm.bank_accounts" :key="idx" class="row q-gutter-sm q-mb-sm items-center">
                <q-input v-model="bank.bank_name" label="Nom de la banque" filled class="col" />
                <q-input v-model="bank.account_number" label="Numéro de compte" filled class="col" />
                <q-input v-model="bank.iban" label="IBAN (optionnel)" filled class="col" />
                <q-btn flat round icon="delete" color="negative" @click="removeBankAccount(idx)" />
              </div>
              <q-btn flat no-caps icon="add" label="Ajouter un compte bancaire" color="primary" class="q-mb-md" @click="addBankAccount" />

              <div class="row justify-end q-mt-md">
                <q-btn type="submit" color="primary" icon="save" label="Enregistrer" no-caps :loading="saving" />
              </div>
            </q-form>
          </q-card-section>
        </q-card>

        <!-- Logo & Charte Graphique -->
        <q-card flat bordered class="q-mt-md">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-md">Logo &amp; Charte Graphique</div>

            <div class="text-subtitle2 text-weight-medium q-mb-sm">Logo de l'entreprise</div>
            <div class="row q-gutter-md items-start q-mb-md">
              <q-img
                v-if="companyStore.company?.logo_url"
                :src="companyStore.company.logo_url"
                style="width:120px;max-height:60px;object-fit:contain;border:1px solid #eee;border-radius:4px"
              />
              <div v-else class="text-grey-5 text-caption flex flex-center" style="width:120px;height:60px;border:1px dashed #bbb;border-radius:4px">
                Aucun logo
              </div>
              <div class="column q-gutter-xs">
                <q-file v-model="logoFile" label="Sélectionner un logo (PNG/JPG, max 2Mo)" accept="image/*" filled style="width:300px">
                  <template #prepend><q-icon name="image" /></template>
                </q-file>
                <div class="row q-gutter-sm">
                  <q-btn :loading="uploadingLogo" color="primary" no-caps label="Téléverser" icon="upload" size="sm" @click="handleLogoUpload" :disable="!logoFile" />
                  <q-btn v-if="companyStore.company?.logo_url" flat color="negative" no-caps label="Supprimer" icon="delete" size="sm" @click="handleLogoDelete" />
                </div>
              </div>
            </div>

            <div class="row q-gutter-lg items-center q-mb-md">
              <q-toggle v-model="invoiceSettingsForm.show_logo" label="Afficher le logo sur la facture PDF" />
              <q-btn-toggle
                v-show="invoiceSettingsForm.show_logo"
                v-model="invoiceSettingsForm.logo_position"
                :options="[{label:'Gauche',value:'left'},{label:'Centre',value:'center'},{label:'Droite',value:'right'}]"
                no-caps flat toggle-color="primary" size="sm"
              />
            </div>

            <div class="text-subtitle2 text-weight-medium q-mt-md q-mb-sm">Couleurs de la facture <span class="text-caption text-grey-6">(cliquez sur une couleur pour la modifier)</span></div>
            <div class="row q-gutter-md q-mb-md">
              <div v-for="cf in COLOR_FIELDS" :key="cf.key" class="column items-center">
                <div
                  :style="{background:invoiceSettingsForm.colors[cf.key],width:'38px',height:'38px',borderRadius:'6px',border:'1px solid #ddd',cursor:'pointer'}"
                >
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-color v-model="invoiceSettingsForm.colors[cf.key]" format-model="hex" />
                  </q-popup-proxy>
                </div>
                <div class="text-caption q-mt-xs text-center" style="max-width:80px;font-size:10px;line-height:1.2">{{ cf.label }}</div>
                <div class="text-caption text-grey" style="font-size:9px">{{ invoiceSettingsForm.colors[cf.key] }}</div>
              </div>
            </div>

            <div class="row q-gutter-sm justify-end">
              <q-btn flat no-caps label="Réinitialiser" icon="restart_alt" @click="resetColors" />
              <q-btn color="primary" no-caps label="Enregistrer charte" icon="palette" :loading="savingInvoiceSettings" @click="saveInvoiceSettings" />
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- Devices -->
      <q-tab-panel name="devices">
        <!-- Simulator control card -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="row items-center q-mb-sm">
              <q-icon name="router" size="sm" class="q-mr-sm" :color="simulatorGlobalEnabled ? 'green' : 'red'" />
              <div class="text-subtitle1 text-weight-medium">Serveur SECeF simulé</div>
              <q-space />
              <q-btn
                flat
                round
                icon="refresh"
                size="sm"
                :loading="pingLoading"
                color="grey"
                @click="doPing"
              >
                <q-tooltip>Vérifier maintenant</q-tooltip>
              </q-btn>
            </div>
            <div class="row items-center q-gutter-md">
              <q-badge
                :color="simulatorGlobalEnabled ? 'green' : 'red-7'"
                :label="simulatorGlobalEnabled ? 'ACTIF' : 'ARRÊTÉ'"
                class="text-body2 q-pa-sm"
              />
              <span v-if="pingLatency !== null" class="text-caption text-grey-7">
                Latence : {{ pingLatency }} ms
              </span>
              <span v-if="pingTime" class="text-caption text-grey-6">
                Dernière vérif. : {{ new Date(pingTime).toLocaleTimeString('fr-FR') }}
              </span>
            </div>
            <div v-if="devices.length > 0" class="q-mt-md">
              <div class="text-caption text-grey-8 q-mb-xs">Activer / désactiver par appareil :</div>
              <div v-for="d in devices" :key="d.nim" class="row items-center q-gutter-sm q-mb-xs">
                <q-toggle
                  :model-value="d.simulator_enabled !== false"
                  :label="d.name || d.nim"
                  :color="d.simulator_enabled !== false ? 'green' : 'red'"
                  :loading="togglingNim === d.nim"
                  @update:model-value="val => toggleSimulator(d.nim, val)"
                />
                <q-badge :color="d.simulator_enabled !== false ? 'green' : 'red-7'" :label="d.nim" outline />
              </div>
            </div>
          </q-card-section>
        </q-card>

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
              row-key="nim"
              :loading="loadingDevices"
              flat
              dense
              :pagination="{ rowsPerPage: 10 }"
            >
              <template v-slot:body-cell-status="props">
                <q-td :props="props">
                  <q-badge :color="props.row.status === 'ACTIF' ? 'green' : 'grey'" :label="props.row.status" />
                </q-td>
              </template>
              <template v-slot:body-cell-simulator_enabled="props">
                <q-td :props="props" class="text-center">
                  <q-icon
                    :name="props.row.simulator_enabled !== false ? 'check_circle' : 'cancel'"
                    :color="props.row.simulator_enabled !== false ? 'green' : 'red'"
                    size="xs"
                  />
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- Logs SECeF -->
      <q-tab-panel name="secef-logs">
        <q-card flat bordered>
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="text-subtitle1 text-weight-medium">Journaux d'interactions SECeF</div>
              <q-space />
              <q-btn flat no-caps size="sm" icon="download" color="primary" label="Exporter CSV" @click="exportMcfLogs" />
              <q-btn flat round icon="refresh" size="sm" color="grey" :loading="logsLoading" class="q-ml-xs" @click="loadMcfLogs" />
            </div>

            <!-- Filters -->
            <div class="row q-gutter-sm q-mb-md">
              <q-input
                v-model="logsFilter.nim"
                label="Filtrer par NIM"
                outlined
                dense
                clearable
                style="width:160px"
                @update:model-value="loadMcfLogs"
              />
              <q-select
                v-model="logsFilter.status"
                :options="logsStatusOptions"
                emit-value
                map-options
                label="Statut"
                outlined
                dense
                clearable
                style="width:140px"
                @update:model-value="loadMcfLogs"
              />
              <q-input
                v-model="logsFilter.from"
                type="date"
                label="Du"
                outlined
                dense
                style="width:160px"
                @update:model-value="loadMcfLogs"
              />
              <q-input
                v-model="logsFilter.to"
                type="date"
                label="Au"
                outlined
                dense
                style="width:160px"
                @update:model-value="loadMcfLogs"
              />
            </div>

            <q-table
              :rows="mcfLogs"
              :columns="mcfLogColumns"
              row-key="id"
              :loading="logsLoading"
              flat
              dense
              :pagination="{ rowsPerPage: 25 }"
              no-data-label="Aucun log trouvé"
            >
              <template v-slot:body-cell-status_code="props">
                <q-td :props="props">
                  <q-badge
                    :color="props.row.status_code < 300 ? 'green' : props.row.status_code < 500 ? 'orange' : 'red'"
                    :label="String(props.row.status_code)"
                  />
                </q-td>
              </template>
              <template v-slot:body-cell-endpoint="props">
                <q-td :props="props">
                  <span class="text-caption text-mono">{{ props.row.endpoint }}</span>
                </q-td>
              </template>
              <template v-slot:body-cell-duration_ms="props">
                <q-td :props="props" class="text-right">
                  <span :class="props.row.duration_ms > 1000 ? 'text-orange' : ''">
                    {{ props.row.duration_ms !== null ? props.row.duration_ms + ' ms' : '—' }}
                  </span>
                </q-td>
              </template>
              <template v-slot:body-cell-created_at="props">
                <q-td :props="props">
                  {{ new Date(props.row.created_at).toLocaleString('fr-FR') }}
                </q-td>
              </template>
              <template v-slot:body-cell-details="props">
                <q-td :props="props">
                  <q-btn flat round size="xs" icon="info" color="grey" @click="openLogDetail(props.row)">
                    <q-tooltip>Détail</q-tooltip>
                  </q-btn>
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
              <q-btn color="primary" icon="person_add" label="Nouvel utilisateur" no-caps size="sm" @click="rbacUserDialogOpen = true" />
            </div>
            <q-table
              :rows="rbacUsers"
              :columns="rbacUserColumns"
              row-key="id"
              :loading="rbacUsersLoading"
              flat
              dense
              :pagination="{ rowsPerPage: 10 }"
            >
              <template v-slot:body-cell-role="props">
                <q-td :props="props">
                  <q-badge :color="roleColor(props.row.role)" :label="props.row.role" />
                  <q-badge v-if="isCustomRole(props.row.role)" color="purple" label="personnalisé" class="q-ml-xs" outline />
                </q-td>
              </template>
              <template v-slot:body-cell-extra_roles="props">
                <q-td :props="props">
                  <template v-if="props.row.extra_roles && props.row.extra_roles.length">
                    <q-badge v-for="r in props.row.extra_roles" :key="r" :color="roleColor(r)" :label="r" class="q-mr-xs q-mb-xs" outline />
                  </template>
                  <span v-else class="text-grey-5 text-caption">—</span>
                </q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn flat dense size="sm" icon="edit" color="primary" @click="openEditUserRoleDialog(props.row)">
                    <q-tooltip>Modifier le rôle</q-tooltip>
                  </q-btn>
                  <q-btn flat dense size="sm" icon="add_circle" color="teal" @click="openAssignRoleDialog(props.row)">
                    <q-tooltip>Ajouter un rôle cumulé</q-tooltip>
                  </q-btn>
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
      <!-- RBAC / Permissions management -->
      <q-tab-panel name="rbac">
        <q-banner class="bg-blue-1 text-blue-9 q-mb-md rounded-borders" dense>
          <template v-slot:avatar><q-icon name="admin_panel_settings" color="blue" /></template>
          Gestion granulaire des permissions par rôle. Chaque entreprise gère son propre RBAC de manière isolée.<br />
          Les modifications sont <strong>immédiates</strong> et s'appliquent à tous les utilisateurs du rôle concerné.
        </q-banner>

        <!-- Role selector -->
        <div class="row items-center q-gutter-sm q-mb-md">
          <q-select
            v-model="rbacSelectedRole"
            :options="rbacRoleOptions"
            emit-value
            map-options
            label="Rôle à configurer"
            outlined
            dense
            style="min-width: 280px"
          >
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                </q-item-section>
                <q-item-section side v-if="scope.opt.isCustom">
                  <q-badge color="purple" label="personnalisé" outline />
                </q-item-section>
              </q-item>
            </template>
          </q-select>
          <q-btn flat dense icon="restart_alt" label="Réinitialiser" no-caps color="orange" @click="onResetRole" />
          <q-btn v-if="isCustomRole(rbacSelectedRole)" flat dense icon="delete" label="Supprimer ce profil" no-caps color="red" @click="onDeleteCustomRole" />
          <q-space />
          <q-btn outline color="purple" icon="add" label="Créer un profil" no-caps @click="openCustomRoleDialog" />
          <q-btn color="primary" icon="save" label="Enregistrer" no-caps :loading="rbacSaving" @click="onSaveRbac" />
        </div>

        <!-- Permission matrix -->
        <q-card flat bordered class="q-mb-md" v-for="cat in rbacCategories" :key="cat">
          <q-card-section class="q-pa-sm">
            <div class="text-subtitle2 text-weight-bold q-mb-xs">{{ cat }}</div>
            <template v-for="perm in rbacPermissionsByCategory(cat)" :key="perm">
              <div v-if="getPermEdit(perm)" class="row items-center q-py-xs" style="border-bottom: 1px solid #f0f0f0">
                <div class="col-1 text-center">
                  <q-icon :name="rbacPermLabel(perm).icon" size="xs" color="grey-7" />
                </div>
                <div class="col-5">
                  <div class="text-body2">{{ rbacPermLabel(perm).label }}</div>
                  <div class="text-caption text-grey-6">{{ perm }}</div>
                </div>
                <div class="col-2 text-center">
                  <q-toggle v-model="getPermEdit(perm)!.granted" dense color="primary" />
                </div>
                <div class="col-4">
                  <q-input
                    v-model="getPermEdit(perm)!.expires_at"
                    type="date"
                    dense
                    borderless
                    clearable
                    placeholder="Permanent"
                    hint="Expiration (vide = permanent)"
                    style="max-width: 180px"
                  />
                </div>
              </div>
            </template>
          </q-card-section>
        </q-card>

        <!-- Legend -->
        <q-card flat bordered class="q-mb-md">
          <q-card-section class="q-pa-sm">
            <div class="text-caption text-grey-7">
              <q-icon name="info" size="xs" class="q-mr-xs" />
              <strong>Légende :</strong>
              Toggle = activer/désactiver la permission.
              Date d'expiration = permission temporaire (supprimée automatiquement après la date).
              « Réinitialiser » = retour aux permissions par défaut du rôle.
            </div>
          </q-card-section>
        </q-card>

        <!-- User management section -->
        <q-separator class="q-my-lg" />
        <div class="text-subtitle1 text-weight-bold q-mb-md">
          <q-icon name="manage_accounts" class="q-mr-sm" />Gestion des utilisateurs
        </div>
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="row items-center q-mb-md">
              <div class="text-subtitle2">Utilisateurs de l'entreprise</div>
              <q-space />
              <q-btn color="primary" icon="person_add" label="Nouvel utilisateur" no-caps size="sm" @click="rbacUserDialogOpen = true" />
            </div>
            <q-table
              :rows="rbacUsers"
              :columns="rbacUserColumns"
              row-key="id"
              flat
              dense
              :loading="rbacUsersLoading"
              :pagination="{ rowsPerPage: 15 }"
            >
              <template v-slot:body-cell-role="props">
                <q-td :props="props">
                  <q-badge :color="roleColor(props.row.role)" :label="props.row.role" />
                </q-td>
              </template>
              <template v-slot:body-cell-extra_roles="props">
                <q-td :props="props">
                  <template v-if="props.row.extra_roles && props.row.extra_roles.length">
                    <q-badge v-for="r in props.row.extra_roles" :key="r" :color="roleColor(r)" :label="r" class="q-mr-xs q-mb-xs" outline>
                      <q-btn flat dense round size="xs" icon="close" class="q-ml-xs" @click="onRevokeRole(props.row, r)" />
                    </q-badge>
                  </template>
                  <span v-else class="text-grey-5 text-caption">—</span>
                </q-td>
              </template>
              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn flat dense size="sm" icon="add_circle" color="primary" @click="openAssignRoleDialog(props.row)">
                    <q-tooltip>Ajouter un rôle cumulé</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- Profil Fiscal -->
      <q-tab-panel name="fiscal">
        <q-card flat bordered class="q-mb-md">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-md">
              <q-icon name="account_balance" class="q-mr-sm" />Profil Fiscal
            </div>

            <div class="row q-gutter-md q-mb-md">
              <div class="col-12 col-md-4">
                <q-select
                  v-model="fiscalForm.fiscal_profile"
                  :options="[{ label: 'Burkina Faso (BF) — SECeF', value: 'BF' }, { label: 'Générique (autre pays)', value: 'GENERIC' }]"
                  emit-value map-options label="Profil" outlined dense
                />
              </div>
              <div class="col-12 col-md-3">
                <q-input v-model="fiscalForm.country" label="Pays (code)" outlined dense hint="Ex: BF, SN, CI" />
              </div>
              <div class="col-12 col-md-2">
                <q-input v-model="fiscalForm.currency" label="Devise (code)" outlined dense hint="Ex: XOF, EUR" />
              </div>
              <div class="col-12 col-md-2">
                <q-input v-model="fiscalForm.currency_label" label="Libellé devise" outlined dense hint="Ex: FCFA, €" />
              </div>
            </div>

            <div class="row q-gutter-md q-mb-md">
              <div class="col-12 col-md-4">
                <q-select
                  v-model="fiscalForm.tax_category"
                  :options="[{ label: 'BIC — Bénéfices Industriels et Commerciaux', value: 'BIC' }, { label: 'BNC — Bénéfices Non Commerciaux', value: 'BNC' }, { label: 'BA — Bénéfices Agricoles', value: 'BA' }, { label: 'IS — Impôt sur les Sociétés', value: 'IS' }, { label: 'Non applicable', value: null }]"
                  emit-value map-options label="Catégorie fiscale" outlined dense clearable
                />
              </div>
              <div class="col-12 col-md-3">
                <q-select
                  v-model="fiscalForm.tax_sub_regime"
                  :options="fiscalSubRegimeOptions"
                  emit-value map-options label="Sous-régime" outlined dense clearable
                />
              </div>
            </div>

            <div class="row q-gutter-md q-mb-md">
              <div class="col-auto">
                <q-toggle v-model="fiscalForm.secef_enabled" label="SECeF activé" color="green" />
              </div>
              <div class="col-auto">
                <q-toggle v-model="fiscalForm.psvb_enabled" :label="fiscalForm.psvb_label + ' activé'" color="blue" />
              </div>
              <div class="col-12 col-md-2" v-if="fiscalForm.psvb_enabled">
                <q-input v-model="fiscalForm.psvb_label" label="Libellé taxe (PSVB/AIB)" outlined dense />
              </div>
              <div class="col-auto">
                <q-toggle v-model="fiscalForm.stamp_duty_enabled" label="Timbre quittance" color="orange" />
              </div>
            </div>

            <!-- Groupes de taxation -->
            <q-separator class="q-my-md" />
            <div class="row items-center q-mb-sm">
              <div class="text-subtitle2 text-weight-medium">Groupes de taxation</div>
              <q-space />
              <q-btn outline size="sm" icon="add" label="Ajouter un groupe" no-caps color="primary" @click="addTaxGroup" />
            </div>
            <div class="row q-gutter-xs q-mb-md">
              <q-card v-for="(grp, key) in fiscalForm.tax_groups" :key="key" flat bordered class="q-pa-sm" style="min-width:220px">
                <div class="row items-center q-gutter-xs">
                  <div class="text-weight-bold col-auto" style="width:30px">{{ key }}</div>
                  <q-input v-model="grp.description" dense outlined label="Description" class="col" style="min-width:100px" />
                  <q-input v-model.number="grp.tva" dense outlined label="TVA" type="number" step="0.01" class="col" style="min-width:60px" />
                  <q-input v-model.number="grp.psvb" dense outlined :label="fiscalForm.psvb_label || 'PSVB'" type="number" step="0.001" class="col" style="min-width:60px" />
                  <q-btn flat dense icon="delete" color="red" size="sm" @click="removeTaxGroup(key)" />
                </div>
              </q-card>
            </div>

            <div class="row justify-end q-mt-md">
              <q-btn color="primary" icon="save" label="Enregistrer le profil fiscal" no-caps :loading="fiscalSaving" @click="saveFiscalConfig" />
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>
    </q-tab-panels>

    <!-- RBAC: Create user dialog -->
    <q-dialog v-model="rbacUserDialogOpen" persistent>
      <q-card style="min-width: 450px">
        <q-card-section>
          <div class="text-h6">Nouvel utilisateur</div>
        </q-card-section>
        <q-card-section>
          <q-form @submit.prevent="onCreateRbacUser" class="q-gutter-sm">
            <q-input v-model="rbacUserForm.full_name" label="Nom complet" filled :rules="[v => !!v || 'Requis']" />
            <q-input v-model="rbacUserForm.email" label="Email" filled type="email" :rules="[v => !!v || 'Requis']" />
            <q-select
              v-model="rbacUserForm.role"
              :options="rbacRoleOptions"
              emit-value
              map-options
              label="Rôle"
              filled
              :rules="[v => !!v || 'Requis']"
            />
            <q-input
              v-model="rbacUserForm.password"
              label="Mot de passe"
              filled
              :type="rbacShowPwd ? 'text' : 'password'"
              :rules="[v => !!v || 'Requis', v => v.length >= 8 || 'Min 8 caractères']"
            >
              <template v-slot:append>
                <q-btn flat dense :icon="rbacShowPwd ? 'visibility_off' : 'visibility'" @click="rbacShowPwd = !rbacShowPwd" />
                <q-btn flat dense icon="casino" @click="rbacUserForm.password = generateRbacPwd()">
                  <q-tooltip>Générer un mot de passe</q-tooltip>
                </q-btn>
              </template>
            </q-input>
            <div class="row justify-end q-gutter-sm q-mt-md">
              <q-btn flat label="Annuler" v-close-popup no-caps />
              <q-btn type="submit" color="primary" label="Créer" no-caps :loading="rbacSaving" />
            </div>
          </q-form>
        </q-card-section>
      </q-card>
    </q-dialog>

    <!-- RBAC: Assign additional role dialog -->
    <q-dialog v-model="assignRoleDialogOpen" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Ajouter un rôle cumulé</div>
          <div class="text-caption text-grey">{{ assignRoleTarget?.full_name }}</div>
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-select
            v-model="assignRoleForm.role"
            :options="assignRoleAvailableOptions"
            emit-value
            map-options
            label="Rôle à ajouter"
            filled
          />
          <q-input
            v-model="assignRoleForm.expires_at"
            type="date"
            label="Expiration (optionnel)"
            filled
            clearable
            hint="Vide = permanent"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup no-caps />
          <q-btn color="primary" label="Assigner" no-caps :loading="rbacSaving" @click="onAssignRole" />
        </q-card-actions>
      </q-card>
    </q-dialog>

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

    <!-- Create custom role dialog -->
    <q-dialog v-model="customRoleDialogOpen" persistent>
      <q-card style="min-width: 600px; max-width: 90vw">
        <q-card-section>
          <div class="text-h6">Créer un profil personnalisé</div>
          <div class="text-caption text-grey-7">Ce profil sera disponible uniquement pour votre entreprise</div>
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <div class="row q-gutter-sm">
            <q-input
              v-model="customRoleForm.role_key"
              label="Clé du profil (slug)"
              filled
              dense
              class="col"
              :rules="[v => !!v || 'Requis', v => v.length <= 20 || 'Max 20 caractères', v => /^[a-z0-9_]+$/.test(v) || 'Minuscules, chiffres et _ uniquement']"
              hint="Ex: assistant, stagiaire, directeur_adj"
            />
            <q-input v-model="customRoleForm.label" label="Nom affiché" filled dense class="col" :rules="[v => !!v || 'Requis']" hint="Ex: Assistant comptable" />
          </div>
          <q-input v-model="customRoleForm.description" label="Description (optionnel)" filled dense type="textarea" autogrow />
          <q-select
            v-model="customRoleForm.base_role"
            :options="[{ label: '(Aucun — permissions vides)', value: '' }, ...Object.entries(SAAS_ROLE_LABELS).map(([k, l]) => ({ label: l, value: k }))]"
            emit-value
            map-options
            label="Copier les permissions d'un rôle existant"
            filled
            dense
            @update:model-value="onBaseRoleChange"
          />
          <div class="text-subtitle2 q-mt-md q-mb-sm">Permissions</div>
          <div v-for="cat in PERMISSION_CATEGORIES" :key="cat" class="q-mb-sm">
            <div class="text-caption text-weight-bold text-grey-8 q-mb-xs">{{ cat }}</div>
            <div class="row">
              <div v-for="p in ALL_PERMISSIONS.filter(pp => PERMISSION_LABELS[pp].category === cat)" :key="p" class="col-6 col-md-4">
                <q-checkbox v-model="customRoleForm.permissions" :val="p" :label="PERMISSION_LABELS[p].label" dense />
              </div>
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup no-caps />
          <q-btn color="purple" icon="add" label="Créer le profil" no-caps :loading="rbacSaving" @click="onCreateCustomRole" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Edit user role dialog -->
    <q-dialog v-model="editUserRoleDialogOpen" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Modifier le rôle principal</div>
          <div class="text-caption text-grey">{{ editUserRoleTarget?.full_name }}</div>
        </q-card-section>
        <q-card-section>
          <q-select
            v-model="editUserRoleValue"
            :options="rbacRoleOptions"
            emit-value
            map-options
            label="Nouveau rôle"
            filled
          >
            <template v-slot:option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section>
                  <q-item-label>{{ scope.opt.label }}</q-item-label>
                </q-item-section>
                <q-item-section side v-if="scope.opt.isCustom">
                  <q-badge color="purple" label="personnalisé" outline />
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup no-caps />
          <q-btn color="primary" label="Enregistrer" no-caps :loading="rbacSaving" @click="onEditUserRole" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- MCF Log detail dialog -->
    <q-dialog v-model="logDetailOpen" maximized transition-show="slide-up" transition-hide="slide-down">
      <q-card>
        <q-bar>
          <q-icon name="receipt_long" />
          <div class="q-ml-sm">Détail interaction SECeF</div>
          <q-space />
          <q-btn dense flat icon="close" v-close-popup />
        </q-bar>
        <q-card-section v-if="selectedLog">
          <div class="row q-gutter-md">
            <div class="col">
              <div class="text-caption text-grey-7 q-mb-xs">Endpoint</div>
              <code class="text-body2">{{ selectedLog.method }} {{ selectedLog.endpoint }}</code>
            </div>
            <div>
              <div class="text-caption text-grey-7 q-mb-xs">Statut</div>
              <q-badge :color="selectedLog.status_code < 300 ? 'green' : selectedLog.status_code < 500 ? 'orange' : 'red'" :label="String(selectedLog.status_code)" class="text-body2" />
            </div>
            <div>
              <div class="text-caption text-grey-7 q-mb-xs">Durée</div>
              <span>{{ selectedLog.duration_ms !== null ? selectedLog.duration_ms + ' ms' : '—' }}</span>
            </div>
            <div>
              <div class="text-caption text-grey-7 q-mb-xs">Horodatage</div>
              <span>{{ new Date(selectedLog.created_at).toLocaleString('fr-FR') }}</span>
            </div>
            <div>
              <div class="text-caption text-grey-7 q-mb-xs">NIM</div>
              <span>{{ selectedLog.nim || '—' }}</span>
            </div>
          </div>
          <div class="row q-gutter-md q-mt-md">
            <div class="col">
              <div class="text-subtitle2 q-mb-sm">Requête</div>
              <pre class="bg-grey-2 rounded-borders q-pa-md overflow-auto" style="max-height:300px;font-size:12px">{{ JSON.stringify(selectedLog.request_body, null, 2) }}</pre>
            </div>
            <div class="col">
              <div class="text-subtitle2 q-mb-sm">Réponse</div>
              <pre class="bg-grey-2 rounded-borders q-pa-md overflow-auto" style="max-height:300px;font-size:12px">{{ JSON.stringify(selectedLog.response_body, null, 2) }}</pre>
            </div>
          </div>
        </q-card-section>
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
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { createClient } from '@insforge/sdk';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import { useAuthStore } from 'src/stores/auth-store';
import { usePermissions } from 'src/composables/usePermissions';
import { AI_TASK_LABELS, getDefaultRouting } from 'src/composables/useAiAssistant';
import { useAiUsage } from 'src/composables/useAiUsage';
import { useCrypto } from 'src/composables/useCrypto';
import { useChatbotConfig } from 'src/composables/useChatbotConfig';
import { useChatbotSkill } from 'src/composables/useChatbotSkill';
import { isValidIFU, isValidCadastralAddress } from 'src/utils/validators';
import type { AiTaskType, AiRouting, AiTaskRoute, ChatbotApiKey, ChatbotAction, ChatbotChannel, ChatbotConversation, Company, Permission, McfLog, SfeDevice, BankAccount, InvoiceColors, FiscalProfile, FiscalConfig, TaxGroupConfig, TaxCategory, TaxSubRegime } from 'src/types';
import { DEFAULT_INVOICE_COLORS } from 'src/composables/useInvoicePdf';
import { useFiscalProfile, DEFAULT_BF_FISCAL_CONFIG } from 'src/composables/useFiscalProfile';
import { CHATBOT_ACTION_LABELS, ALL_CHATBOT_ACTIONS, CHATBOT_CHANNELS, ALL_PERMISSIONS, PERMISSION_LABELS, PERMISSION_CATEGORIES, DEFAULT_ROLE_PERMISSIONS, SAAS_ROLE_LABELS } from 'src/types';
import type { Permission as PermissionType } from 'src/types';

const $q = useQuasar();
const companyStore = useCompanyStore();
const authStore = useAuthStore();
const rbacPerms = usePermissions();

const isProjectAdmin = computed(() => authStore.role === 'project_admin');
const { encrypt, decrypt } = useCrypto();

const tab = ref('company');
const saving = ref(false);
const loadingDevices = ref(false);
const deviceDialogOpen = ref(false);

// --- Profil Fiscal ---
const { taxSubRegimeOptions } = useFiscalProfile();
const fiscalSaving = ref(false);

const fiscalForm = reactive<{
  fiscal_profile: FiscalProfile;
  country: string;
  currency: string;
  currency_label: string;
  secef_enabled: boolean;
  tax_category: TaxCategory | null;
  tax_sub_regime: TaxSubRegime | null;
  tax_groups: Record<string, TaxGroupConfig>;
  psvb_enabled: boolean;
  psvb_label: string;
  stamp_duty_enabled: boolean;
}>({
  fiscal_profile: 'BF',
  country: 'BF',
  currency: 'XOF',
  currency_label: 'FCFA',
  secef_enabled: true,
  tax_category: 'BIC',
  tax_sub_regime: 'RNI',
  tax_groups: { ...DEFAULT_BF_FISCAL_CONFIG.tax_groups },
  psvb_enabled: true,
  psvb_label: 'PSVB',
  stamp_duty_enabled: true,
});

const fiscalSubRegimeOptions = computed(() => {
  const cat = fiscalForm.tax_category;
  if (!cat) return [];
  return taxSubRegimeOptions[cat] ?? [];
});

function initFiscalForm() {
  const cfg = companyStore.company?.fiscal_config ?? DEFAULT_BF_FISCAL_CONFIG;
  fiscalForm.fiscal_profile = companyStore.company?.fiscal_profile ?? 'BF';
  fiscalForm.country = cfg.country;
  fiscalForm.currency = cfg.currency;
  fiscalForm.currency_label = cfg.currency_label;
  fiscalForm.secef_enabled = cfg.secef_enabled;
  fiscalForm.tax_category = cfg.tax_category;
  fiscalForm.tax_sub_regime = cfg.tax_sub_regime;
  fiscalForm.tax_groups = JSON.parse(JSON.stringify(cfg.tax_groups));
  fiscalForm.psvb_enabled = cfg.psvb_enabled;
  fiscalForm.psvb_label = cfg.psvb_label;
  fiscalForm.stamp_duty_enabled = cfg.stamp_duty_enabled;
}

function addTaxGroup() {
  const existing = Object.keys(fiscalForm.tax_groups);
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const next = letters.split('').find(l => !existing.includes(l)) ?? `G${existing.length}`;
  fiscalForm.tax_groups[next] = { description: '', tva: 0, psvb: 0 };
}

function removeTaxGroup(key: string) {
  delete fiscalForm.tax_groups[key];
}

async function saveFiscalConfig() {
  fiscalSaving.value = true;
  try {
    const config: FiscalConfig = {
      country: fiscalForm.country,
      currency: fiscalForm.currency,
      currency_label: fiscalForm.currency_label,
      secef_enabled: fiscalForm.secef_enabled,
      tax_category: fiscalForm.tax_category,
      tax_sub_regime: fiscalForm.tax_sub_regime,
      tax_groups: fiscalForm.tax_groups,
      psvb_enabled: fiscalForm.psvb_enabled,
      psvb_label: fiscalForm.psvb_label,
      stamp_duty_enabled: fiscalForm.stamp_duty_enabled,
      stamp_duty_thresholds: companyStore.company?.fiscal_config?.stamp_duty_thresholds ?? DEFAULT_BF_FISCAL_CONFIG.stamp_duty_thresholds,
      invoice_types: companyStore.company?.fiscal_config?.invoice_types ?? DEFAULT_BF_FISCAL_CONFIG.invoice_types,
      client_types: companyStore.company?.fiscal_config?.client_types ?? DEFAULT_BF_FISCAL_CONFIG.client_types,
      article_types: companyStore.company?.fiscal_config?.article_types ?? DEFAULT_BF_FISCAL_CONFIG.article_types,
    };
    await companyStore.updateFiscalConfig(fiscalForm.fiscal_profile, config);
    $q.notify({ type: 'positive', message: 'Profil fiscal enregistré' });
  } catch {
    $q.notify({ type: 'negative', message: 'Erreur lors de la sauvegarde du profil fiscal' });
  } finally {
    fiscalSaving.value = false;
  }
}

interface UserRow { id: string; full_name: string; role: string; created_at: string }

const companyForm = ref<{
  name: string;
  ifu: string;
  rccm: string;
  address_cadastral: string;
  address: string;
  phone: string;
  email: string;
  tax_regime: string;
  tax_office: string;
  qr_scan_base_url: string;
  bank_accounts: BankAccount[];
}>({
  name: '',
  ifu: '',
  rccm: '',
  address_cadastral: '',
  address: '',
  phone: '',
  email: '',
  tax_regime: '',
  tax_office: '',
  qr_scan_base_url: '',
  bank_accounts: [],
});

function addBankAccount() {
  companyForm.value.bank_accounts.push({ bank_name: '', account_number: '', iban: '' });
}
function removeBankAccount(idx: number) {
  companyForm.value.bank_accounts.splice(idx, 1);
}

const COLOR_FIELDS: { label: string; key: keyof InvoiceColors }[] = [
  { label: 'Couleur principale', key: 'primary' },
  { label: 'En-tête fond', key: 'header_bg' },
  { label: 'En-tête texte', key: 'header_text' },
  { label: 'Lignes impaires', key: 'row_odd_bg' },
  { label: 'Fond totaux', key: 'total_bg' },
  { label: 'Cert. bordure', key: 'cert_border' },
  { label: 'Cert. titre', key: 'cert_title' },
];

const invoiceSettingsForm = ref<{
  show_logo: boolean;
  logo_position: 'left' | 'center' | 'right';
  colors: InvoiceColors;
}>({
  show_logo: false,
  logo_position: 'left',
  colors: { ...DEFAULT_INVOICE_COLORS },
});
const logoFile = ref<File | null>(null);
const uploadingLogo = ref(false);
const savingInvoiceSettings = ref(false);

async function handleLogoUpload() {
  if (!logoFile.value) return;
  uploadingLogo.value = true;
  try {
    const { error } = await companyStore.uploadLogo(logoFile.value);
    if (error) {
      $q.notify({ type: 'negative', message: `Erreur upload : ${error.message}` });
    } else {
      $q.notify({ type: 'positive', message: 'Logo uploadé avec succès' });
      logoFile.value = null;
    }
  } finally {
    uploadingLogo.value = false;
  }
}

async function handleLogoDelete() {
  await companyStore.deleteLogo();
  $q.notify({ type: 'positive', message: 'Logo supprimé' });
}

async function saveInvoiceSettings() {
  savingInvoiceSettings.value = true;
  try {
    await companyStore.updateInvoiceSettings(invoiceSettingsForm.value);
    $q.notify({ type: 'positive', message: 'Charte graphique enregistrée' });
  } finally {
    savingInvoiceSettings.value = false;
  }
}

function resetColors() {
  invoiceSettingsForm.value.colors = { ...DEFAULT_INVOICE_COLORS };
}

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
const devices = ref<SfeDevice[]>([]);
const togglingNim = ref<string | null>(null);
const pingLoading = ref(false);
const pingLatency = ref<number | null>(null);
const pingTime = ref<string | null>(null);

const simulatorGlobalEnabled = computed(() =>
  devices.value.length === 0 ? true : devices.value.some(d => d.simulator_enabled !== false)
);

const deviceColumns = [
  { name: 'nim', label: 'NIM', field: 'nim', align: 'left' as const },
  { name: 'name', label: 'Nom', field: 'name', align: 'left' as const },
  { name: 'status', label: 'Statut SECeF', field: 'status', align: 'center' as const },
  { name: 'simulator_enabled', label: 'Simulateur', field: 'simulator_enabled', align: 'center' as const },
  { name: 'created_at', label: 'Créé le', field: 'created_at', align: 'left' as const,
    format: (v: string) => v ? new Date(v).toLocaleDateString('fr-FR') : '' },
];

// --- MCF Logs ---
const mcfLogs = ref<McfLog[]>([]);
const logsLoading = ref(false);
const logDetailOpen = ref(false);
const selectedLog = ref<McfLog | null>(null);
const logsFilter = ref({ nim: '', status: null as string | null, from: '', to: '' });

const logsStatusOptions = [
  { label: '2xx Succès', value: '2xx' },
  { label: '4xx Client', value: '4xx' },
  { label: '5xx Serveur', value: '5xx' },
];

const mcfLogColumns = [
  { name: 'created_at', label: 'Horodatage', field: 'created_at', align: 'left' as const, sortable: true },
  { name: 'nim', label: 'NIM', field: 'nim', align: 'left' as const },
  { name: 'method', label: 'Méthode', field: 'method', align: 'center' as const },
  { name: 'endpoint', label: 'Endpoint', field: 'endpoint', align: 'left' as const },
  { name: 'status_code', label: 'Statut', field: 'status_code', align: 'center' as const, sortable: true },
  { name: 'duration_ms', label: 'Durée', field: 'duration_ms', align: 'right' as const, sortable: true },
  { name: 'details', label: '', field: 'id', align: 'center' as const },
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
      qr_scan_base_url: c.qr_scan_base_url || '',
      address_cadastral: c.address_cadastral,
      address: c.address || '',
      phone: c.phone,
      email: c.email,
      tax_regime: '',
      tax_office: c.tax_office,
      bank_accounts: c.bank_accounts ? [...c.bank_accounts] : [],
    };
    const s = c.invoice_settings;
    invoiceSettingsForm.value = {
      show_logo: s?.show_logo ?? false,
      logo_position: s?.logo_position ?? 'left',
      colors: { ...DEFAULT_INVOICE_COLORS, ...(s?.colors ?? {}) },
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
    const cleaned = {
      ...companyForm.value,
      address_cadastral: companyForm.value.address_cadastral?.replace(/_/g, '').trim() || '',
    };
    const result = await companyStore.updateCompany(cleaned);
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
    if (data) devices.value = data as SfeDevice[];
  } finally {
    loadingDevices.value = false;
  }
}

async function toggleSimulator(nim: string, enabled: boolean) {
  togglingNim.value = nim;
  try {
    const { error } = await insforge.database
      .from('devices')
      .update({ simulator_enabled: enabled })
      .eq('nim', nim);
    if (error) {
      $q.notify({ type: 'negative', message: error.message });
    } else {
      const d = devices.value.find(x => x.nim === nim);
      if (d) d.simulator_enabled = enabled;
      $q.notify({
        type: enabled ? 'positive' : 'warning',
        message: enabled ? `Simulateur SECeF activé (${nim})` : `Simulateur SECeF désactivé (${nim})`,
        icon: enabled ? 'router' : 'power_off',
      });
    }
  } finally {
    togglingNim.value = null;
  }
}

async function doPing() {
  pingLoading.value = true;
  const t0 = Date.now();
  try {
    const { data, error } = await insforge.functions.invoke('mcf-simulator', {
      method: 'POST',
      body: { _path: '/bf/mcf/ping', _method: 'GET' },
    });
    pingLatency.value = Date.now() - t0;
    pingTime.value = new Date().toISOString();
    if (!error && data?.status === true) {
      $q.notify({ type: 'positive', message: `SECeF opérationnel — ${pingLatency.value} ms`, icon: 'router' });
    } else {
      $q.notify({ type: 'warning', message: 'SECeF injoignable', icon: 'cloud_off' });
    }
  } catch {
    pingLatency.value = null;
    pingTime.value = new Date().toISOString();
    $q.notify({ type: 'negative', message: 'Erreur lors du ping SECeF' });
  } finally {
    pingLoading.value = false;
  }
}

async function loadMcfLogs() {
  logsLoading.value = true;
  try {
    let q = insforge.database
      .from('mcf_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (logsFilter.value.nim) q = q.eq('nim', logsFilter.value.nim);
    if (logsFilter.value.from) q = q.gte('created_at', logsFilter.value.from + 'T00:00:00');
    if (logsFilter.value.to) q = q.lte('created_at', logsFilter.value.to + 'T23:59:59');
    if (logsFilter.value.status === '2xx') q = q.gte('status_code', 200).lt('status_code', 300);
    else if (logsFilter.value.status === '4xx') q = q.gte('status_code', 400).lt('status_code', 500);
    else if (logsFilter.value.status === '5xx') q = q.gte('status_code', 500);

    const { data } = await q;
    if (data) mcfLogs.value = data as McfLog[];
  } finally {
    logsLoading.value = false;
  }
}

function openLogDetail(log: McfLog) {
  selectedLog.value = log;
  logDetailOpen.value = true;
}

function exportMcfLogs() {
  if (!mcfLogs.value.length) return;
  const headers = ['Horodatage', 'NIM', 'Méthode', 'Endpoint', 'Statut', 'Durée (ms)', 'User ID'];
  const rows = mcfLogs.value.map(l => [
    new Date(l.created_at).toLocaleString('fr-FR'),
    l.nim || '',
    l.method,
    l.endpoint,
    String(l.status_code),
    l.duration_ms !== null ? String(l.duration_ms) : '',
    l.user_id || '',
  ]);
  const csv = [headers, ...rows].map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mcf_logs_${new Date().toISOString().substring(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  $q.notify({ type: 'positive', message: `${mcfLogs.value.length} logs exportés` });
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

// ============================================================================
// RBAC Tab — Granular permission management + multi-role fusion
// ============================================================================
const rbacSaving = ref(false);
const rbacSelectedRole = ref<string>('superviseur');
const rbacUserDialogOpen = ref(false);
const rbacShowPwd = ref(false);
const rbacUsersLoading = ref(false);
const rbacUsers = ref<(UserRow & { user_id?: string; extra_roles?: string[] })[]>([]);

const rbacRoleOptions = computed(() => rbacPerms.getAllRoleOptions());

// Custom role creation
const customRoleDialogOpen = ref(false);
const customRoleForm = ref({ role_key: '', label: '', description: '', base_role: '' as string, permissions: [] as PermissionType[] });

// Edit user role
const editUserRoleDialogOpen = ref(false);
const editUserRoleTarget = ref<(UserRow & { user_id?: string }) | null>(null);
const editUserRoleValue = ref('');

const rbacUserColumns = [
  { name: 'full_name', label: 'Nom', field: 'full_name', align: 'left' as const, sortable: true },
  { name: 'role', label: 'Rôle principal', field: 'role', align: 'center' as const, sortable: true },
  { name: 'extra_roles', label: 'Rôles cumulés', field: 'extra_roles', align: 'left' as const },
  { name: 'created_at', label: 'Créé le', field: 'created_at', align: 'left' as const, sortable: true,
    format: (v: string) => v ? new Date(v).toLocaleDateString('fr-FR') : '' },
  { name: 'actions', label: '', field: 'actions', align: 'center' as const },
];

const rbacUserForm = ref({ full_name: '', email: '', role: 'comptable', password: '' });

const rbacCategories = PERMISSION_CATEGORIES;

function rbacPermissionsByCategory(cat: string): Permission[] {
  return ALL_PERMISSIONS.filter(p => PERMISSION_LABELS[p].category === cat);
}

function rbacPermLabel(p: Permission) {
  return PERMISSION_LABELS[p];
}

// Editable matrix: keyed by permission key
type PermEdit = { granted: boolean; expires_at: string | null };
const rbacEditMatrix = reactive<Record<string, PermEdit>>({});

function getPermEdit(p: string): PermEdit | undefined {
  return rbacEditMatrix[p];
}

function initEditMatrix() {
  const role = rbacSelectedRole.value;
  const effectivePerms = rbacPerms.getEffectivePermissions(role);
  const overrides = rbacPerms.companyOverrides.value.filter(o => o.role === role);

  for (const p of ALL_PERMISSIONS) {
    const override = overrides.find(o => o.permission === p);
    rbacEditMatrix[p] = {
      granted: effectivePerms.includes(p),
      expires_at: override?.expires_at ? override.expires_at.substring(0, 10) : null,
    };
  }
}

watch(rbacSelectedRole, () => { initEditMatrix(); });

async function onSaveRbac() {
  rbacSaving.value = true;
  try {
    const role = rbacSelectedRole.value;
    const defaultPerms = (DEFAULT_ROLE_PERMISSIONS as Record<string, Permission[]>)[role] ?? [];

    const permUpdates: { permission: Permission; granted: boolean; expires_at?: string | null }[] = [];
    for (const p of ALL_PERMISSIONS) {
      const isDefault = defaultPerms.includes(p);
      const edit = rbacEditMatrix[p];
      if (!edit) continue;
      // Save override if: different from default, or has an expiry
      if (edit.granted !== isDefault || edit.expires_at) {
        permUpdates.push({
          permission: p,
          granted: edit.granted,
          expires_at: edit.expires_at || null,
        });
      }
    }

    const result = await rbacPerms.bulkSetPermissions(role, permUpdates);
    if (result.error) {
      $q.notify({ type: 'negative', message: result.error });
    } else {
      $q.notify({ type: 'positive', message: `Permissions du rôle « ${role} » enregistrées` });
    }
  } finally {
    rbacSaving.value = false;
  }
}

function onResetRole() {
  $q.dialog({
    title: 'Réinitialiser',
    message: `Rétablir les permissions par défaut pour le rôle « ${rbacSelectedRole.value} » ?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    rbacSaving.value = true;
    void rbacPerms.resetRoleToDefaults(rbacSelectedRole.value).then((result) => {
      if (result.error) {
        $q.notify({ type: 'negative', message: result.error });
      } else {
        initEditMatrix();
        $q.notify({ type: 'positive', message: 'Permissions réinitialisées aux valeurs par défaut' });
      }
    }).finally(() => {
      rbacSaving.value = false;
    });
  });
}

// --- Custom role management ---
function openCustomRoleDialog() {
  customRoleForm.value = { role_key: '', label: '', description: '', base_role: '', permissions: [] };
  customRoleDialogOpen.value = true;
}

function onBaseRoleChange() {
  const base = customRoleForm.value.base_role;
  if (base) {
    const defaults = (DEFAULT_ROLE_PERMISSIONS as Record<string, PermissionType[]>)[base] ?? [];
    customRoleForm.value.permissions = [...defaults];
  }
}

async function onCreateCustomRole() {
  const f = customRoleForm.value;
  if (!f.role_key || !f.label) return;
  rbacSaving.value = true;
  try {
    const result = await rbacPerms.createCustomRole(
      f.role_key, f.label, f.description,
      f.base_role || null,
      f.permissions,
    );
    if (result.error) {
      $q.notify({ type: 'negative', message: result.error });
    } else {
      customRoleDialogOpen.value = false;
      $q.notify({ type: 'positive', message: `Profil « ${f.label} » créé` });
      rbacSelectedRole.value = f.role_key;
      initEditMatrix();
    }
  } finally {
    rbacSaving.value = false;
  }
}

function isCustomRole(roleKey: string): boolean {
  return rbacPerms.customRoles.value.some(r => r.role_key === roleKey);
}

function onDeleteCustomRole() {
  const role = rbacSelectedRole.value;
  if (!isCustomRole(role)) return;
  const label = rbacPerms.customRoles.value.find(r => r.role_key === role)?.label || role;
  $q.dialog({
    title: 'Supprimer le profil',
    message: `Supprimer définitivement le profil personnalisé « ${label} » et toutes ses permissions ?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    rbacSaving.value = true;
    void rbacPerms.deleteCustomRole(role).then((result) => {
      if (result.error) {
        $q.notify({ type: 'negative', message: result.error });
      } else {
        rbacSelectedRole.value = 'superviseur';
        initEditMatrix();
        $q.notify({ type: 'positive', message: `Profil « ${label} » supprimé` });
      }
    }).finally(() => {
      rbacSaving.value = false;
    });
  });
}

// --- Edit user role ---
function openEditUserRoleDialog(row: UserRow & { user_id?: string }) {
  editUserRoleTarget.value = row;
  editUserRoleValue.value = row.role;
  editUserRoleDialogOpen.value = true;
}

async function onEditUserRole() {
  if (!editUserRoleTarget.value?.user_id || !editUserRoleValue.value) return;
  rbacSaving.value = true;
  try {
    const { error } = await insforge.database
      .from('user_profiles')
      .update({ role: editUserRoleValue.value })
      .eq('user_id', editUserRoleTarget.value.user_id);
    if (error) {
      $q.notify({ type: 'negative', message: error.message });
    } else {
      editUserRoleDialogOpen.value = false;
      $q.notify({ type: 'positive', message: `Rôle modifié en « ${editUserRoleValue.value} »` });
      await loadRbacUsers();
    }
  } finally {
    rbacSaving.value = false;
  }
}

// --- User management in RBAC tab ---
async function loadRbacUsers() {
  rbacUsersLoading.value = true;
  try {
    const { data } = await insforge.database
      .from('user_profiles')
      .select('*')
      .order('full_name', { ascending: true });
    if (data) {
      rbacUsers.value = (data as (UserRow & { user_id?: string })[]).map(u => {
        const extra = rbacPerms.userRoleAssignments.value
          .filter(a => a.user_id === u.user_id && (!a.expires_at || a.expires_at > new Date().toISOString()))
          .map(a => a.role);
        return { ...u, extra_roles: extra };
      });
    }
  } finally {
    rbacUsersLoading.value = false;
  }
}

// --- Multi-role fusion ---
const assignRoleDialogOpen = ref(false);
const assignRoleTarget = ref<(UserRow & { user_id?: string; extra_roles?: string[] }) | null>(null);
const assignRoleForm = ref({ role: '', expires_at: '' as string });

const assignRoleAvailableOptions = computed(() => {
  if (!assignRoleTarget.value) return rbacRoleOptions.value;
  const primaryRole = assignRoleTarget.value.role;
  const extras = assignRoleTarget.value.extra_roles ?? [];
  const taken = new Set([primaryRole, ...extras]);
  return rbacRoleOptions.value.filter(o => !taken.has(o.value));
});

function openAssignRoleDialog(row: UserRow & { user_id?: string; extra_roles?: string[] }) {
  assignRoleTarget.value = row;
  assignRoleForm.value = { role: '', expires_at: '' };
  assignRoleDialogOpen.value = true;
}

async function onAssignRole() {
  if (!assignRoleTarget.value?.user_id || !assignRoleForm.value.role) return;
  rbacSaving.value = true;
  try {
    const result = await rbacPerms.assignRole(
      assignRoleTarget.value.user_id,
      assignRoleForm.value.role,
      assignRoleForm.value.expires_at || null,
    );
    if (result.error) {
      $q.notify({ type: 'negative', message: result.error });
    } else {
      assignRoleDialogOpen.value = false;
      $q.notify({ type: 'positive', message: `Rôle « ${assignRoleForm.value.role} » assigné` });
      await loadRbacUsers();
    }
  } finally {
    rbacSaving.value = false;
  }
}

function onRevokeRole(row: UserRow & { user_id?: string }, role: string) {
  if (!row.user_id) return;
  const userId = row.user_id;
  $q.dialog({
    title: 'Retirer le rôle',
    message: `Retirer le rôle « ${role} » de ${row.full_name} ?`,
    cancel: true,
    persistent: true,
  }).onOk(() => {
    rbacSaving.value = true;
    void rbacPerms.revokeRole(userId, role).then((result) => {
      if (result.error) {
        $q.notify({ type: 'negative', message: result.error });
      } else {
        $q.notify({ type: 'positive', message: `Rôle « ${role} » retiré` });
        return loadRbacUsers();
      }
    }).finally(() => {
      rbacSaving.value = false;
    });
  });
}

function generateRbacPwd(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let pwd = '';
  for (let i = 0; i < 14; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

async function onCreateRbacUser() {
  rbacSaving.value = true;
  try {
    const baseUrl = import.meta.env.VITE_INSFORGE_URL as string;
    const anonKey = import.meta.env.VITE_INSFORGE_ANON_KEY as string;
    const freshClient = createClient({ baseUrl, anonKey });

    let newUserId: string | undefined;

    // Step 1: Try signUp directly — handle "already exists" by signing in to get the ID
    const { data: signUpData, error: signUpErr } = await freshClient.auth.signUp({
      email: rbacUserForm.value.email,
      password: rbacUserForm.value.password,
      name: rbacUserForm.value.full_name,
    });

    if (signUpErr) {
      const msg = (signUpErr.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('exist') || (signUpErr as { statusCode?: number }).statusCode === 409) {
        // Auth account exists — sign in to retrieve the user ID
        const { data: loginData, error: loginErr } = await freshClient.auth.signInWithPassword({
          email: rbacUserForm.value.email,
          password: rbacUserForm.value.password,
        });
        if (loginErr || !loginData?.user?.id) {
          throw new Error('Cet email est déjà utilisé. Vérifiez le mot de passe ou utilisez un autre email.');
        }
        newUserId = loginData.user.id;
        await freshClient.auth.signOut();
      } else {
        throw new Error(signUpErr.message);
      }
    } else {
      newUserId = signUpData?.user?.id;
    }

    if (!newUserId) {
      // Email confirmation enabled — retrieve ID via secure RPC
      const { data: rpcId } = await insforge.database
        .rpc('get_user_id_by_email', { p_email: rbacUserForm.value.email });
      newUserId = rpcId as string | undefined;
    }

    if (!newUserId) {
      throw new Error('Impossible de récuperer l ID utilisateur. Veuillez reessayer.');
    }

    // Step 2: Check if profile already exists for this company
    const { data: existingProfile } = await insforge.database
      .from('user_profiles')
      .select('id')
      .eq('user_id', newUserId)
      .eq('company_id', companyStore.company?.id)
      .limit(1);

    if (existingProfile && existingProfile.length > 0) {
      throw new Error('Cet utilisateur appartient déjà à cette entreprise.');
    }

    // Step 3: Create user_profile
    const { error: profileErr } = await insforge.database
      .from('user_profiles')
      .insert({
        user_id: newUserId,
        company_id: companyStore.company?.id,
        full_name: rbacUserForm.value.full_name,
        role: rbacUserForm.value.role,
      });
    if (profileErr) throw new Error(profileErr.message);

    rbacUserDialogOpen.value = false;
    rbacUserForm.value = { full_name: '', email: '', role: 'comptable', password: '' };
    $q.notify({ type: 'positive', message: 'Utilisateur créé avec succès' });
    await loadRbacUsers();
  } catch (err: unknown) {
    $q.notify({ type: 'negative', message: err instanceof Error ? err.message : 'Erreur', timeout: 6000 });
  } finally {
    rbacSaving.value = false;
  }
}

// Load logs when switching to secef-logs tab
watch(tab, (newTab) => {
  if (newTab === 'secef-logs') void loadMcfLogs();
});

onMounted(async () => {
  loadCompanyForm();
  loadRoutingForm();
  loadChatbotState();
  initEditMatrix();
  initFiscalForm();
  await Promise.all([loadDevices(), chatbot.loadApiKeys(), loadRbacUsers()]);
});
</script>
