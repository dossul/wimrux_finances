<template>
  <q-page padding>
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
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { insforge } from 'src/boot/insforge';
import { useAuthStore } from 'src/stores/auth-store';
import type { Client, ClientType } from 'src/types';

const $q = useQuasar();
const authStore = useAuthStore();

const clients = ref<Client[]>([]);
const loading = ref(false);
const saving = ref(false);
const search = ref('');
const dialogOpen = ref(false);
const editingClient = ref<Client | null>(null);

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

function typeColor(t: string) {
  const map: Record<string, string> = { CC: 'grey', PM: 'blue', PP: 'green', PC: 'orange' };
  return map[t] || 'grey';
}

function typeLabel(t: string) {
  const map: Record<string, string> = { CC: 'Comptant', PM: 'Morale', PP: 'Physique', PC: 'Phys. Commerçant' };
  return map[t] || t;
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
  }).onOk(async () => {
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
  });
}

onMounted(loadClients);
</script>
