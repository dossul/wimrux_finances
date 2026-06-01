<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Fournisseurs IA</div>
        <div class="text-caption text-grey-7">Clés API BYOK · gestion des providers</div>
      </div>
      <q-space />
      <q-btn color="primary" icon="add" label="Ajouter une clé" no-caps @click="openAdd" />
    </div>

    <!-- Quota & Credits KPIs -->
    <div class="row q-gutter-md q-mb-lg">
      <q-card flat bordered class="col">
        <q-card-section>
          <div class="text-caption text-grey-7">Quota mensuel</div>
          <div class="text-h6">{{ quotaUsage?.used_usd?.toFixed(4) ?? '0' }} / {{ quotaUsage?.monthly_quota_usd?.toFixed(2) ?? '0' }} USD</div>
          <q-linear-progress :value="quotaPercent / 100" :color="quotaPercent > 80 ? 'negative' : 'primary'" class="q-mt-sm" rounded />
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col">
        <q-card-section>
          <div class="text-caption text-grey-7">Packs crédits</div>
          <div class="text-h6">{{ creditPacks.length }} packs disponibles</div>
        </q-card-section>
      </q-card>
      <q-card flat bordered class="col">
        <q-card-section>
          <div class="text-caption text-grey-7">Clés BYOK configurées</div>
          <div class="text-h6">{{ credentials.length }}</div>
        </q-card-section>
      </q-card>
    </div>

    <!-- Providers catalogue -->
    <q-card flat bordered class="q-mb-md">
      <q-card-section class="text-subtitle1 text-weight-medium">Providers disponibles</q-card-section>
      <q-separator />
      <q-list separator>
        <q-item v-for="p in providers" :key="p.id">
          <q-item-section avatar>
            <q-avatar color="grey-3" text-color="dark" size="40px">
              <span class="text-weight-bold">{{ p.name.substring(0, 2).toUpperCase() }}</span>
            </q-avatar>
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ p.name }}</q-item-label>
            <q-item-label caption>{{ p.slug }} · BYOK {{ p.supports_byok ? 'oui' : 'non' }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-badge :color="p.is_active ? 'positive' : 'grey'" :label="p.is_active ? 'Actif' : 'Inactif'" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <!-- Mes clés BYOK -->
    <q-card flat bordered>
      <q-card-section class="text-subtitle1 text-weight-medium">Mes clés API (BYOK)</q-card-section>
      <q-separator />
      <q-table :rows="credentials" :columns="credCols" row-key="id" flat :loading="loading" :pagination="{ rowsPerPage: 10 }">
        <template #body-cell-provider="props">
          <q-td :props="props">{{ getProviderName(props.row.provider_id) }}</q-td>
        </template>
        <template #body-cell-active="props">
          <q-td :props="props">
            <q-toggle :model-value="props.row.is_active" @update:model-value="(v: boolean) => toggleCred(props.row.id, v)" color="positive" />
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat icon="delete" color="negative" size="sm" @click="removeCred(props.row.id)" />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog ajouter clé -->
    <q-dialog v-model="showAdd" persistent>
      <q-card style="min-width:400px">
        <q-card-section class="text-h6">Ajouter une clé API</q-card-section>
        <q-card-section>
          <q-select v-model="form.provider_id" :options="byokProviders" option-value="id" option-label="name" emit-value map-options label="Provider" outlined dense class="q-mb-md" />
          <q-input v-model="form.label" label="Label (optionnel)" outlined dense class="q-mb-md" />
          <q-input v-model="form.api_key" label="Clé API" outlined dense type="password" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" @click="showAdd = false" />
          <q-btn color="primary" label="Enregistrer" :loading="loading" @click="saveCred" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useAiSettings } from 'src/composables/useAiSettings';

const $q = useQuasar();
const {
  providers, credentials, creditPacks, quotaUsage, quotaPercent, loading,
  loadAll, saveCredential, deleteCredential, toggleCredential,
} = useAiSettings();

const showAdd = ref(false);
const form = ref({ provider_id: '', label: '', api_key: '' });

const byokProviders = computed(() => providers.value.filter(p => p.supports_byok));

const credCols = [
  { name: 'provider', label: 'Provider', align: 'left' as const, field: 'provider_id' },
  { name: 'label', label: 'Label', align: 'left' as const, field: 'label' },
  { name: 'active', label: 'Actif', align: 'center' as const, field: 'is_active' },
  { name: 'created', label: 'Ajouté le', align: 'left' as const, field: 'created_at', format: (v: string) => new Date(v).toLocaleDateString('fr-FR') },
  { name: 'actions', label: '', align: 'center' as const, field: 'id' },
];

function getProviderName(id: string) {
  return providers.value.find(p => p.id === id)?.name ?? id;
}

function openAdd() {
  form.value = { provider_id: '', label: '', api_key: '' };
  showAdd.value = true;
}

async function saveCred() {
  if (!form.value.provider_id || !form.value.api_key) {
    $q.notify({ type: 'warning', message: 'Provider et clé API requis' });
    return;
  }
  const result = await saveCredential({
    provider_id: form.value.provider_id,
    api_key_encrypted: form.value.api_key,
    label: form.value.label || '',
    is_active: true,
  });
  if (result) {
    showAdd.value = false;
    $q.notify({ type: 'positive', message: 'Clé enregistrée' });
  }
}

async function removeCred(id: string) {
  $q.dialog({ title: 'Supprimer', message: 'Supprimer cette clé API ?', cancel: true })
    .onOk(async () => {
      await deleteCredential(id);
      $q.notify({ type: 'positive', message: 'Clé supprimée' });
    });
}

async function toggleCred(id: string, val: boolean) {
  await toggleCredential(id, val);
}

onMounted(() => loadAll());
</script>
