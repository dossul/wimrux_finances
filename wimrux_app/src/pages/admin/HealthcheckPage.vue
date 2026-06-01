<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Monitoring</div>
        <div class="text-caption text-grey-7">Santé du système · services · statuts</div>
      </div>
      <q-space />
      <q-btn flat icon="refresh" color="primary" @click="checkAll" :loading="loading" />
    </div>

    <div class="row q-gutter-md">
      <q-card v-for="svc in services" :key="svc.name" flat bordered class="col-12 col-sm-6 col-md-4" data-testid="health-service">
        <q-card-section>
          <div class="row items-center q-gutter-sm">
            <q-icon :name="svc.icon" :color="svc.status === 'ok' ? 'positive' : svc.status === 'error' ? 'negative' : 'grey'" size="28px" />
            <div>
              <div class="text-subtitle1 text-weight-medium">{{ svc.label }}</div>
              <div class="text-caption" :class="svc.status === 'ok' ? 'text-positive' : svc.status === 'error' ? 'text-negative' : 'text-grey'">
                {{ svc.status === 'ok' ? 'Opérationnel' : svc.status === 'error' ? 'Erreur' : 'Vérification...' }}
              </div>
              <div v-if="svc.latency" class="text-caption text-grey-5">{{ svc.latency }}ms</div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>

    <q-card flat bordered class="q-mt-lg">
      <q-card-section class="text-subtitle1 text-weight-medium">Informations système</q-card-section>
      <q-separator />
      <q-card-section>
        <div class="row q-gutter-md">
          <div><strong>Frontend</strong> : Quasar + Vue 3</div>
          <div><strong>Backend</strong> : InsForge (PostgreSQL + PostgREST)</div>
          <div><strong>Build</strong> : {{ buildDate }}</div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { insforge } from 'src/boot/insforge';

interface ServiceCheck {
  name: string;
  label: string;
  icon: string;
  status: 'ok' | 'error' | 'pending';
  latency: number | null;
}

const loading = ref(false);
const buildDate = new Date().toISOString().slice(0, 10);

const services = ref<ServiceCheck[]>([
  { name: 'database', label: 'Base de données', icon: 'storage', status: 'pending', latency: null },
  { name: 'auth', label: 'Authentification', icon: 'lock', status: 'pending', latency: null },
  { name: 'storage', label: 'Stockage fichiers', icon: 'cloud_upload', status: 'pending', latency: null },
  { name: 'realtime', label: 'Temps réel', icon: 'wifi', status: 'pending', latency: null },
]);

async function checkService(svc: ServiceCheck) {
  const start = Date.now();
  try {
    switch (svc.name) {
      case 'database': {
        const { error } = await insforge.database.from('companies').select('id').limit(1);
        svc.status = error ? 'error' : 'ok';
        break;
      }
      case 'auth': {
        const { error } = await insforge.auth.getCurrentUser();
        svc.status = error ? 'error' : 'ok';
        break;
      }
      case 'storage': {
        const { error } = await insforge.storage.from('company-logos').list();
        svc.status = error ? 'error' : 'ok';
        break;
      }
      case 'realtime': {
        // Simple check — si le module existe c'est OK
        svc.status = insforge.realtime ? 'ok' : 'error';
        break;
      }
    }
  } catch {
    svc.status = 'error';
  }
  svc.latency = Date.now() - start;
}

async function checkAll() {
  loading.value = true;
  services.value.forEach(s => { s.status = 'pending'; s.latency = null; });
  await Promise.all(services.value.map(s => checkService(s)));
  loading.value = false;
}

onMounted(() => checkAll());
</script>
