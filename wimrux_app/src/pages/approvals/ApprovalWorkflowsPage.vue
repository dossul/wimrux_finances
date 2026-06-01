<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Workflows d'approbation</div>
        <div class="text-caption text-grey-7">Regles multi-niveaux par domaine et seuil de montant</div>
      </div>
      <q-space />
      <q-btn color="primary" icon="add" label="Nouvelle regle" no-caps @click="openCreate" />
    </div>

    <q-card flat bordered>
      <q-table :rows="workflows" :columns="columns" row-key="id" :loading="loading" flat :pagination="{ rowsPerPage: 20 }">
        <template #body-cell-domain="props">
          <q-td :props="props"><q-chip dense color="primary" text-color="white" :label="domainLabel(props.value)" /></q-td>
        </template>
        <template #body-cell-threshold="props">
          <q-td :props="props">{{ fmt(props.value) }}</q-td>
        </template>
        <template #body-cell-active="props">
          <q-td :props="props">
            <q-toggle :model-value="props.value" @update:model-value="(v) => onToggle(props.row.id, v as boolean)" />
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat round dense size="sm" icon="edit" color="grey-7" @click="openEdit(props.row)" />
            <q-btn flat round dense size="sm" icon="delete" color="negative" @click="confirmDelete(props.row)" />
          </q-td>
        </template>
        <template #no-data>
          <div class="full-width text-center q-pa-xl text-grey-6">
            <q-icon name="account_tree" size="48px" /><br>Aucune regle d'approbation configuree
          </div>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="showForm" persistent>
      <q-card style="min-width:520px">
        <q-card-section><div class="text-h6">{{ editingId ? 'Modifier' : 'Nouvelle' }} regle</div></q-card-section>
        <q-card-section>
          <q-select v-model="form.domain" :options="APPROVAL_DOMAINS" label="Domaine *" outlined dense
            emit-value map-options class="q-mb-sm" />
          <q-input v-model.number="form.threshold_amount" type="number" label="Seuil de montant (FCFA) *"
            hint="La regle s'applique quand le montant >= ce seuil" outlined dense class="q-mb-sm" />
          <q-select v-model.number="form.required_levels" :options="[1,2,3]" label="Niveaux requis *"
            outlined dense class="q-mb-sm" />
          <q-input v-model="form.approver_role_l1" label="Role approbateur N1" outlined dense class="q-mb-sm" />
          <q-input v-if="form.required_levels >= 2" v-model="form.approver_role_l2" label="Role approbateur N2"
            outlined dense class="q-mb-sm" />
          <q-input v-if="form.required_levels >= 3" v-model="form.approver_role_l3" label="Role approbateur N3"
            outlined dense />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn color="primary" :label="editingId ? 'Mettre a jour' : 'Creer'" @click="submitForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { useQuasar } from 'quasar';
import { useApprovalWorkflow, APPROVAL_DOMAINS } from 'src/composables/useApprovalWorkflow';
import type { ApprovalWorkflow } from 'src/types';

const $q = useQuasar();
const {
  workflows, loading,
  loadWorkflows, createWorkflow, updateWorkflow, deleteWorkflow, toggleActive,
} = useApprovalWorkflow();

const columns = [
  { name: 'domain', label: 'Domaine', field: 'domain', align: 'left' as const, sortable: true },
  { name: 'threshold', label: 'Seuil', field: 'threshold_amount', align: 'right' as const, sortable: true },
  { name: 'required_levels', label: 'Niveaux', field: 'required_levels', align: 'center' as const },
  { name: 'approver_role_l1', label: 'N1', field: (r: ApprovalWorkflow) => r.approver_role_l1 || '-', align: 'left' as const },
  { name: 'approver_role_l2', label: 'N2', field: (r: ApprovalWorkflow) => r.approver_role_l2 || '-', align: 'left' as const },
  { name: 'approver_role_l3', label: 'N3', field: (r: ApprovalWorkflow) => r.approver_role_l3 || '-', align: 'left' as const },
  { name: 'active', label: 'Active', field: 'is_active', align: 'center' as const },
  { name: 'actions', label: '', field: '', align: 'right' as const },
];

const showForm = ref(false);
const editingId = ref<string | null>(null);
const form = reactive({
  domain: 'petty_cash_replenishment',
  threshold_amount: 0,
  required_levels: 2,
  approver_role_l1: '',
  approver_role_l2: '',
  approver_role_l3: '',
});

function openCreate() {
  editingId.value = null;
  form.domain = 'petty_cash_replenishment';
  form.threshold_amount = 0;
  form.required_levels = 2;
  form.approver_role_l1 = '';
  form.approver_role_l2 = '';
  form.approver_role_l3 = '';
  showForm.value = true;
}

function openEdit(row: ApprovalWorkflow) {
  editingId.value = row.id;
  form.domain = row.domain;
  form.threshold_amount = row.threshold_amount;
  form.required_levels = row.required_levels;
  form.approver_role_l1 = row.approver_role_l1 || '';
  form.approver_role_l2 = row.approver_role_l2 || '';
  form.approver_role_l3 = row.approver_role_l3 || '';
  showForm.value = true;
}

async function submitForm() {
  if (!form.domain || form.threshold_amount < 0) {
    $q.notify({ type: 'warning', message: 'Domaine et seuil valides requis' }); return;
  }
  const payload = {
    domain: form.domain,
    threshold_amount: form.threshold_amount,
    required_levels: form.required_levels,
    approver_role_l1: form.approver_role_l1.trim() || null,
    approver_role_l2: form.required_levels >= 2 ? (form.approver_role_l2.trim() || null) : null,
    approver_role_l3: form.required_levels >= 3 ? (form.approver_role_l3.trim() || null) : null,
  };
  const result = editingId.value
    ? await updateWorkflow(editingId.value, payload)
    : await createWorkflow(payload);
  if (result) {
    $q.notify({ type: 'positive', message: editingId.value ? 'Regle mise a jour' : 'Regle creee' });
    showForm.value = false;
  } else {
    $q.notify({ type: 'negative', message: 'Erreur' });
  }
}

function confirmDelete(row: ApprovalWorkflow) {
  $q.dialog({
    title: 'Supprimer cette regle ?',
    message: `${domainLabel(row.domain)} - seuil ${fmt(row.threshold_amount)}`,
    cancel: true, persistent: true,
  }).onOk(async () => {
    const ok = await deleteWorkflow(row.id);
    $q.notify({ type: ok ? 'positive' : 'negative', message: ok ? 'Supprime' : 'Erreur' });
  });
}

async function onToggle(id: string, isActive: boolean) {
  const ok = await toggleActive(id, isActive);
  if (!ok) $q.notify({ type: 'negative', message: 'Erreur' });
}

function fmt(v: number): string {
  return new Intl.NumberFormat('fr-FR').format(v || 0) + ' FCFA';
}

function domainLabel(d: string): string {
  return APPROVAL_DOMAINS.find(x => x.value === d)?.label || d;
}

onMounted(async () => { await loadWorkflows(); });
</script>
