<template>
  <div>
    <q-btn flat round icon="notifications" @click="drawer = true">
      <q-badge v-if="unreadCount > 0" floating color="negative" :label="unreadCount > 99 ? '99+' : unreadCount" />
    </q-btn>

    <!-- Drawer notifications -->
    <q-drawer v-model="drawer" side="right" bordered overlay :width="380" class="bg-white">
      <q-toolbar class="bg-primary text-white">
        <q-toolbar-title class="text-subtitle1">Notifications</q-toolbar-title>
        <q-btn flat dense icon="done_all" @click="markAllRead" v-if="unreadCount > 0">
          <q-tooltip>Tout marquer comme lu</q-tooltip>
        </q-btn>
        <q-btn flat dense icon="close" @click="drawer = false" />
      </q-toolbar>

      <q-scroll-area style="height: calc(100vh - 50px)">
        <q-list v-if="notifications.length" separator>
          <q-item
            v-for="notif in notifications"
            :key="notif.id"
            clickable
            :class="{ 'bg-blue-1': !notif.is_read }"
            @click="onClickNotif(notif)"
          >
            <q-item-section avatar>
              <q-icon :name="getSeverityIcon(notif.severity)" :color="getSeverityColor(notif.severity)" />
            </q-item-section>
            <q-item-section>
              <q-item-label :class="{ 'text-weight-bold': !notif.is_read }">{{ notif.title }}</q-item-label>
              <q-item-label caption lines="2">{{ notif.body }}</q-item-label>
              <q-item-label caption class="text-grey-5">{{ timeAgo(notif.created_at) }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn flat round size="sm" icon="archive" @click.stop="archive(notif.id)">
                <q-tooltip>Archiver</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>

        <div v-else class="q-pa-lg text-center text-grey-5">
          <q-icon name="notifications_none" size="48px" class="q-mb-sm" />
          <div>Aucune notification</div>
        </div>
      </q-scroll-area>
    </q-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNotifications, type Notification } from 'src/composables/useNotifications';

const router = useRouter();
const {
  notifications, unreadCount,
  loadNotifications, markAsRead, markAllAsRead, archiveNotification,
  getSeverityColor, getSeverityIcon,
} = useNotifications();

const drawer = ref(false);

async function onClickNotif(notif: Notification) {
  if (!notif.is_read) await markAsRead(notif.id);
  if (notif.link) {
    drawer.value = false;
    router.push(notif.link);
  }
}

async function markAllRead() {
  await markAllAsRead();
}

async function archive(id: string) {
  await archiveNotification(id);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

onMounted(() => { void loadNotifications(); });
</script>
