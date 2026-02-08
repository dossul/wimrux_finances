<template>
  <q-page padding class="column" style="max-height: calc(100vh - 50px)">
    <div class="row items-center q-mb-md">
      <q-icon name="smart_toy" size="md" color="primary" class="q-mr-sm" />
      <div class="text-h5">Assistant Fiscal IA</div>
      <q-chip v-if="activeModel" dense outline color="grey-7" size="sm" icon="memory" class="q-ml-sm">{{ activeModel }}</q-chip>
      <q-space />
      <q-btn flat dense icon="delete_sweep" label="Effacer" no-caps color="grey-7" @click="clearChat" :disable="messages.length === 0" />
    </div>

    <!-- Chat messages -->
    <q-scroll-area ref="scrollArea" class="col q-mb-md" style="border: 1px solid #e0e0e0; border-radius: 8px; background: #fafafa">
      <div class="q-pa-md">
        <!-- Welcome message -->
        <div v-if="messages.length === 0" class="text-center q-pa-xl text-grey-6">
          <q-icon name="smart_toy" size="64px" color="grey-4" />
          <div class="text-h6 q-mt-md">Assistant Fiscal WIMRUX®</div>
          <div class="text-body2 q-mt-sm">
            Posez vos questions sur la fiscalité burkinabè, les factures normalisées,<br />
            le calcul des taxes (TVA, PSVB), ou la réglementation DGI.
          </div>
          <div class="row justify-center q-gutter-sm q-mt-lg">
            <q-chip clickable outline color="primary" icon="help_outline" label="Quels sont les groupes de taxation ?" @click="sendSuggestion('Quels sont les 16 groupes de taxation A-P au Burkina Faso et leurs taux de TVA respectifs ?')" />
            <q-chip clickable outline color="primary" icon="help_outline" label="Exigences facture normalisée" @click="sendSuggestion('Quelles sont les exigences obligatoires pour une facture normalisée certifiée au Burkina Faso ?')" />
            <q-chip clickable outline color="primary" icon="help_outline" label="Timbre quittance" @click="sendSuggestion('Comment fonctionne le timbre de quittance au Burkina Faso ? Quand s\'applique-t-il ?')" />
          </div>
        </div>

        <!-- Messages -->
        <div v-for="(msg, idx) in messages" :key="idx" class="q-mb-md">
          <div :class="msg.role === 'user' ? 'row justify-end' : 'row justify-start'">
            <div :class="[
              'q-pa-sm q-px-md rounded-borders',
              msg.role === 'user' ? 'bg-primary text-white' : 'bg-white shadow-1',
            ]" style="max-width: 80%; white-space: pre-wrap; line-height: 1.5">
              <div class="text-caption text-weight-medium q-mb-xs" :class="msg.role === 'user' ? 'text-blue-1' : 'text-grey-6'">
                {{ msg.role === 'user' ? 'Vous' : 'Assistant IA' }}
              </div>
              {{ msg.content }}
            </div>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="loading" class="row justify-start q-mb-md">
          <div class="q-pa-sm q-px-md bg-white shadow-1 rounded-borders">
            <q-spinner-dots size="24px" color="primary" />
            <span class="text-grey-6 q-ml-sm">Réflexion en cours...</span>
          </div>
        </div>
      </div>
    </q-scroll-area>

    <!-- Input -->
    <div class="row q-gutter-sm items-end">
      <q-input
        v-model="userInput"
        outlined
        dense
        class="col"
        placeholder="Posez votre question fiscale..."
        @keyup.enter="onSend"
        :disable="loading"
        autogrow
        :maxlength="2000"
      >
        <template v-slot:prepend><q-icon name="chat" color="grey-5" /></template>
      </q-input>
      <q-btn color="primary" icon="send" :loading="loading" :disable="!userInput.trim()" @click="onSend" no-caps />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useAiAssistant } from 'src/composables/useAiAssistant';
import type { QScrollArea } from 'quasar';

const { messages, loading, activeModel, sendMessage, clearChat } = useAiAssistant();
const userInput = ref('');
const scrollArea = ref<InstanceType<typeof QScrollArea> | null>(null);

async function onSend() {
  const msg = userInput.value.trim();
  if (!msg || loading.value) return;
  userInput.value = '';
  await sendMessage(msg);
  await nextTick();
  scrollArea.value?.setScrollPercentage('vertical', 1, 300);
}

async function sendSuggestion(text: string) {
  userInput.value = '';
  await sendMessage(text);
  await nextTick();
  scrollArea.value?.setScrollPercentage('vertical', 1, 300);
}
</script>
