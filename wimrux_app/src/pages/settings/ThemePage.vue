<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Personnalisation</div>
        <div class="text-caption text-grey-7">Thème UI · logo · templates factures</div>
      </div>
    </div>

    <!-- Thème -->
    <q-card flat bordered class="q-mb-lg">
      <q-card-section class="text-subtitle1 text-weight-medium">Thème de l'entreprise</q-card-section>
      <q-separator />
      <q-card-section>
        <div class="row q-gutter-md">
          <div class="col-12 col-sm-4">
            <div class="text-caption q-mb-xs">Couleur principale</div>
            <q-input v-model="themeForm.primary_color" outlined dense>
              <template #prepend><div :style="{ width: '20px', height: '20px', borderRadius: '4px', background: themeForm.primary_color }" /></template>
            </q-input>
          </div>
          <div class="col-12 col-sm-4">
            <div class="text-caption q-mb-xs">Couleur secondaire</div>
            <q-input v-model="themeForm.secondary_color" outlined dense>
              <template #prepend><div :style="{ width: '20px', height: '20px', borderRadius: '4px', background: themeForm.secondary_color }" /></template>
            </q-input>
          </div>
          <div class="col-12 col-sm-4">
            <div class="text-caption q-mb-xs">Couleur accent</div>
            <q-input v-model="themeForm.accent_color" outlined dense>
              <template #prepend><div :style="{ width: '20px', height: '20px', borderRadius: '4px', background: themeForm.accent_color }" /></template>
            </q-input>
          </div>
        </div>
        <q-toggle v-model="themeForm.dark_mode" label="Mode sombre" class="q-mt-md" />
        <q-input v-model="themeForm.logo_url" label="URL du logo" outlined dense class="q-mt-md" />
      </q-card-section>
      <q-card-actions>
        <q-btn color="primary" label="Enregistrer le thème" no-caps :loading="loading" @click="onSaveTheme" />
      </q-card-actions>
    </q-card>

    <!-- Templates factures -->
    <q-card flat bordered>
      <q-card-section class="row items-center">
        <div class="text-subtitle1 text-weight-medium">Templates de factures</div>
        <q-space />
        <q-btn color="primary" icon="add" label="Nouveau template" no-caps size="sm" @click="openTemplateCreate" />
      </q-card-section>
      <q-separator />
      <q-table :rows="templates" :columns="tplCols" row-key="id" flat :loading="loading" :pagination="{ rowsPerPage: 10 }">
        <template #body-cell-is_default="props">
          <q-td :props="props">
            <q-badge v-if="props.row.is_default" color="positive" label="Défaut" />
            <q-btn v-else flat size="xs" label="Définir par défaut" no-caps @click="makeDefault(props.row.id)" />
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props">
            <q-btn flat icon="edit" size="sm" @click="editTpl(props.row)" />
            <q-btn flat icon="delete" size="sm" color="negative" @click="removeTpl(props.row.id)" />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog template -->
    <q-dialog v-model="showTplDialog" persistent>
      <q-card style="min-width:550px">
        <q-card-section class="text-h6">{{ tplForm.id ? 'Modifier' : 'Nouveau' }} template</q-card-section>
        <q-card-section class="q-gutter-md">
          <q-input v-model="tplForm.name" label="Nom" outlined dense />
          <q-input v-model="tplForm.description" label="Description" outlined dense />
          <q-input v-model="tplForm.html_template" label="HTML template" type="textarea" outlined rows="8" />
          <q-input v-model="tplForm.css_styles" label="CSS (optionnel)" type="textarea" outlined rows="3" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" @click="showTplDialog = false" />
          <q-btn color="primary" label="Enregistrer" :loading="loading" @click="saveTpl" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useCompanyTheme, type InvoiceTemplate } from 'src/composables/useCompanyTheme';

const $q = useQuasar();
const {
  theme, templates, loading,
  loadTheme, saveTheme, loadTemplates, createTemplate, updateTemplate, deleteTemplate, setDefaultTemplate,
} = useCompanyTheme();

const themeForm = ref({
  primary_color: '#1976D2',
  secondary_color: '#26A69A',
  accent_color: '#9C27B0',
  dark_mode: false,
  logo_url: '',
});

const showTplDialog = ref(false);
const tplForm = ref({ id: '', name: '', description: '', html_template: '', css_styles: '' });

const tplCols = [
  { name: 'name', label: 'Nom', align: 'left' as const, field: 'name', sortable: true },
  { name: 'description', label: 'Description', align: 'left' as const, field: 'description' },
  { name: 'is_default', label: 'Défaut', align: 'center' as const, field: 'is_default' },
  { name: 'updated', label: 'Modifié le', align: 'left' as const, field: 'updated_at', format: (v: string) => new Date(v).toLocaleDateString('fr-FR') },
  { name: 'actions', label: '', align: 'center' as const, field: 'id' },
];

async function onSaveTheme() {
  await saveTheme(themeForm.value);
  $q.notify({ type: 'positive', message: 'Thème enregistré' });
}

function openTemplateCreate() {
  tplForm.value = { id: '', name: '', description: '', html_template: '', css_styles: '' };
  showTplDialog.value = true;
}

function editTpl(tpl: InvoiceTemplate) {
  tplForm.value = { id: tpl.id, name: tpl.name, description: tpl.description ?? '', html_template: tpl.html_template, css_styles: tpl.css_styles ?? '' };
  showTplDialog.value = true;
}

async function saveTpl() {
  if (!tplForm.value.name || !tplForm.value.html_template) {
    $q.notify({ type: 'warning', message: 'Nom et HTML requis' });
    return;
  }
  if (tplForm.value.id) {
    await updateTemplate(tplForm.value.id, { name: tplForm.value.name, description: tplForm.value.description, html_template: tplForm.value.html_template, css_styles: tplForm.value.css_styles });
  } else {
    await createTemplate({ name: tplForm.value.name, html_template: tplForm.value.html_template, css_styles: tplForm.value.css_styles, description: tplForm.value.description });
  }
  showTplDialog.value = false;
  $q.notify({ type: 'positive', message: 'Template enregistré' });
}

async function removeTpl(id: string) {
  $q.dialog({ title: 'Supprimer', message: 'Supprimer ce template ?', cancel: true })
    .onOk(async () => {
      await deleteTemplate(id);
      $q.notify({ type: 'positive', message: 'Template supprimé' });
    });
}

async function makeDefault(id: string) {
  await setDefaultTemplate(id);
  $q.notify({ type: 'positive', message: 'Template par défaut mis à jour' });
}

onMounted(async () => {
  await Promise.all([loadTheme(), loadTemplates()]);
  if (theme.value) {
    themeForm.value = {
      primary_color: theme.value.primary_color,
      secondary_color: theme.value.secondary_color,
      accent_color: theme.value.accent_color,
      dark_mode: theme.value.dark_mode,
      logo_url: theme.value.logo_url ?? '',
    };
  }
});
</script>
