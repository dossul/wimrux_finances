<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Support</div>
        <div class="text-caption text-grey-7">Centre d'aide · tickets · historique</div>
      </div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nouveau ticket" no-caps @click="openCreate" />
    </div>

    <!-- KPIs -->
    <div class="row q-gutter-md q-mb-lg">
      <q-card flat bordered class="col">
        <q-card-section>
          <div class="text-caption text-grey-7">Tickets ouverts</div>
          <div class="text-h5 text-weight-bold text-primary">{{ openTickets }}</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col">
        <q-card-section>
          <div class="text-caption text-grey-7">Total tickets</div>
          <div class="text-h5 text-weight-bold">{{ tickets.length }}</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Table tickets -->
    <q-card flat bordered>
      <q-table :rows="tickets" :columns="columns" row-key="id" flat :loading="loading" :pagination="{ rowsPerPage: 15 }">
        <template #body-cell-status="props">
          <q-td :props="props">
            <q-badge :color="statusColor(props.row.status)" :label="statusLabel(props.row.status)" />
          </q-td>
        </template>
        <template #body-cell-priority="props">
          <q-td :props="props">
            <q-badge outline :color="priorityColor(props.row.priority)" :label="props.row.priority" />
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat icon="chat" size="sm" @click="openConversation(props.row)" />
            <q-btn v-if="props.row.status !== 'closed'" flat icon="check_circle" size="sm" color="positive" @click="close(props.row.id)" />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog création -->
    <q-dialog v-model="showCreate" persistent>
      <q-card style="min-width:450px">
        <q-card-section class="text-h6">Nouveau ticket</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="form.subject" label="Sujet" outlined dense />
          <q-select v-model="form.category" :options="categoryOpts" label="Catégorie" emit-value map-options outlined dense />
          <q-select v-model="form.priority" :options="priorityOpts" label="Priorité" emit-value map-options outlined dense />
          <q-input v-model="form.description" label="Description" type="textarea" outlined rows="4" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" @click="showCreate = false" />
          <q-btn color="primary" label="Créer" :loading="loading" @click="submit" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Dialog conversation -->
    <q-dialog v-model="showConvo" maximized>
      <q-card>
        <q-toolbar class="bg-primary text-white">
          <q-toolbar-title class="text-subtitle1">{{ activeTicket?.subject }}</q-toolbar-title>
          <q-btn flat icon="close" @click="showConvo = false" />
        </q-toolbar>
        <q-card-section class="q-pa-none" style="height: calc(100vh - 120px); overflow-y: auto">
          <q-list>
            <q-item v-for="msg in messages" :key="msg.id" :class="msg.sender_type === 'user' ? 'bg-blue-1' : 'bg-grey-2'">
              <q-item-section avatar>
                <q-avatar :color="msg.sender_type === 'user' ? 'primary' : 'teal'" text-color="white" size="32px">
                  {{ msg.sender_type === 'user' ? 'U' : 'S' }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ msg.message }}</q-item-label>
                <q-item-label caption>{{ new Date(msg.created_at).toLocaleString('fr-FR') }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
        <q-card-section class="row q-gutter-sm items-center">
          <q-input v-model="newMessage" placeholder="Votre message..." outlined dense class="col" @keyup.enter="send" />
          <q-btn color="primary" icon="send" @click="send" :disable="!newMessage" />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useSupport, type SupportTicket } from 'src/composables/useSupport';

const $q = useQuasar();
const { tickets, messages, loading, openTickets, loadTickets, createTicket, closeTicket, loadMessages, sendMessage } = useSupport();

const showCreate = ref(false);
const showConvo = ref(false);
const activeTicket = ref<SupportTicket | null>(null);
const newMessage = ref('');
const form = ref({ subject: '', description: '', category: 'general', priority: 'medium' });

const categoryOpts = [
  { label: 'Général', value: 'general' },
  { label: 'Bug', value: 'bug' },
  { label: 'Fonctionnalité', value: 'feature' },
  { label: 'Facturation', value: 'billing' },
  { label: 'Autre', value: 'other' },
];
const priorityOpts = [
  { label: 'Basse', value: 'low' },
  { label: 'Moyenne', value: 'medium' },
  { label: 'Haute', value: 'high' },
  { label: 'Urgente', value: 'urgent' },
];

const columns = [
  { name: 'subject', label: 'Sujet', align: 'left' as const, field: 'subject', sortable: true },
  { name: 'category', label: 'Catégorie', align: 'left' as const, field: 'category' },
  { name: 'priority', label: 'Priorité', align: 'center' as const, field: 'priority' },
  { name: 'status', label: 'Statut', align: 'center' as const, field: 'status' },
  { name: 'created', label: 'Créé le', align: 'left' as const, field: 'created_at', format: (v: string) => new Date(v).toLocaleDateString('fr-FR') },
  { name: 'actions', label: '', align: 'center' as const, field: 'id' },
];

function statusColor(s: string) { return { open: 'blue', in_progress: 'orange', resolved: 'positive', closed: 'grey' }[s] ?? 'grey'; }
function statusLabel(s: string) { return { open: 'Ouvert', in_progress: 'En cours', resolved: 'Résolu', closed: 'Fermé' }[s] ?? s; }
function priorityColor(p: string) { return { low: 'grey', medium: 'blue', high: 'orange', urgent: 'negative' }[p] ?? 'grey'; }

function openCreate() {
  form.value = { subject: '', description: '', category: 'general', priority: 'medium' };
  showCreate.value = true;
}

async function submit() {
  if (!form.value.subject || !form.value.description) {
    $q.notify({ type: 'warning', message: 'Sujet et description requis' });
    return;
  }
  const t = await createTicket(form.value);
  if (t) {
    showCreate.value = false;
    $q.notify({ type: 'positive', message: 'Ticket créé' });
  }
}

async function close(id: string) {
  await closeTicket(id);
  $q.notify({ type: 'positive', message: 'Ticket fermé' });
}

async function openConversation(ticket: SupportTicket) {
  activeTicket.value = ticket;
  await loadMessages(ticket.id);
  showConvo.value = true;
}

async function send() {
  if (!newMessage.value || !activeTicket.value) return;
  await sendMessage(activeTicket.value.id, newMessage.value);
  newMessage.value = '';
}

onMounted(() => loadTickets());
</script>
