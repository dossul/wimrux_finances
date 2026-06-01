<template>
  <q-page padding>
    <!-- Header -->
    <div class="row items-center q-mb-md">
      <q-btn flat round dense icon="arrow_back" class="q-mr-sm" :to="`/app/banking/${accountId}`" />
      <div>
        <div class="text-h5">Rapprochement bancaire</div>
        <div class="text-caption text-grey-7" v-if="accountName">{{ accountName }}</div>
      </div>
      <q-space />
      <!-- KPI résumé -->
      <div class="row q-gutter-md q-mr-md" v-if="!loadingStats">
        <div class="text-center">
          <div class="text-h6 text-negative text-weight-bold">{{ unreconciledCount }}</div>
          <div class="text-caption text-grey-7">Non rapprochés</div>
        </div>
        <q-separator vertical />
        <div class="text-center">
          <div class="text-h6 text-positive text-weight-bold">{{ matchedCount }}</div>
          <div class="text-caption text-grey-7">Rapprochés</div>
        </div>
        <q-separator vertical />
        <div class="text-center">
          <div class="text-h6 text-primary text-weight-bold">{{ pctReconciled }}%</div>
          <div class="text-caption text-grey-7">Taux</div>
        </div>
      </div>
    </div>

    <!-- Onglets -->
    <q-tabs v-model="tab" dense align="left" class="q-mb-md" active-color="primary" indicator-color="primary">
      <q-tab name="auto" icon="auto_fix_high" label="Auto-match" no-caps />
      <q-tab name="manual" icon="compare_arrows" label="Manuel" no-caps />
      <q-tab name="rules" icon="rule" label="Règles" no-caps />
    </q-tabs>

    <q-tab-panels v-model="tab" animated>

      <!-- ===================================================================
           ONGLET AUTO-MATCH
           =================================================================== -->
      <q-tab-panel name="auto" class="q-pa-none">
        <div class="row items-center q-mb-md q-gutter-sm">
          <q-btn color="primary" icon="auto_fix_high" label="Lancer l'auto-match" no-caps :loading="loading" @click="doAutoMatch" />
          <q-btn v-if="suggestions.length" outline color="positive" icon="check_circle" label="Tout appliquer" no-caps :loading="applyingAll" @click="applyAll" />
          <q-space />
          <div class="text-caption text-grey-7" v-if="suggestions.length">
            {{ suggestions.filter(s => !s.applied).length }} suggestion(s) en attente
          </div>
        </div>

        <div v-if="!suggestions.length && !loading" class="text-center q-pa-xl text-grey-5">
          <q-icon name="search_off" size="48px" class="q-mb-sm" />
          <div>Cliquez "Lancer l'auto-match" pour analyser les transactions</div>
        </div>

        <q-list bordered separator rounded v-else>
          <q-item v-for="s in suggestions" :key="s.transaction_id" :class="s.applied ? 'bg-green-1' : ''">
            <q-item-section avatar>
              <q-circular-progress
                :value="s.score"
                size="42px"
                :thickness="0.22"
                :color="scoreColor(s.score)"
                track-color="grey-3"
                show-value
                class="text-caption text-weight-bold"
              />
            </q-item-section>
            <q-item-section>
              <q-item-label>
                <q-icon :name="matchTypeIcon(s.match_type)" size="xs" class="q-mr-xs" />
                <span class="text-caption text-grey-7">{{ matchTypeLabel(s.match_type) }}</span>
                <q-badge :color="scoreColor(s.score)" :label="scoreLabel(s.score)" class="q-ml-sm" />
              </q-item-label>
              <q-item-label class="text-body2">{{ s.match_label }}</q-item-label>
              <q-item-label caption class="text-grey-6">ID transaction : {{ s.transaction_id.slice(0,8) }}…</q-item-label>
            </q-item-section>
            <q-item-section side>
              <div class="row q-gutter-sm" v-if="!s.applied">
                <q-btn flat dense color="positive" icon="check" label="Appliquer" no-caps size="sm"
                  @click="doApplyMatch(s)" :loading="applyingId === s.transaction_id" />
                <q-btn flat dense color="grey" icon="block" label="Ignorer" no-caps size="sm"
                  @click="doIgnore(s.transaction_id)" />
              </div>
              <q-chip v-else icon="check_circle" color="positive" text-color="white" size="sm">Appliqué</q-chip>
            </q-item-section>
          </q-item>
        </q-list>
      </q-tab-panel>

      <!-- ===================================================================
           ONGLET MANUEL (split-view)
           =================================================================== -->
      <q-tab-panel name="manual" class="q-pa-none">
        <div class="row q-gutter-md">
          <!-- Colonne gauche : transactions non rapprochées -->
          <div class="col-12 col-md-5">
            <div class="text-subtitle2 q-mb-sm row items-center">
              <q-icon name="receipt_long" class="q-mr-xs" color="negative" />
              Transactions non rapprochées
              <q-badge color="negative" :label="unreconciledTxs.length" class="q-ml-sm" />
            </div>
            <q-scroll-area style="height: 520px">
              <q-list bordered separator>
                <q-item
                  v-for="tx in unreconciledTxs"
                  :key="tx.id"
                  clickable
                  :active="selectedTx?.id === tx.id"
                  active-class="bg-blue-1"
                  @click="selectTx(tx)"
                >
                  <q-item-section avatar>
                    <q-icon
                      :name="tx.direction === 'credit' ? 'arrow_downward' : 'arrow_upward'"
                      :color="tx.direction === 'credit' ? 'positive' : 'negative'"
                    />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-body2 ellipsis">{{ tx.label }}</q-item-label>
                    <q-item-label caption>{{ tx.transaction_date }} · {{ tx.reference || '—' }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <span :class="tx.direction === 'credit' ? 'text-positive' : 'text-negative'" class="text-weight-bold">
                      {{ tx.direction === 'credit' ? '+' : '-' }}{{ fmtCur(tx.amount) }}
                    </span>
                  </q-item-section>
                </q-item>
                <q-item v-if="!unreconciledTxs.length" class="text-grey-5 text-center">
                  <q-item-section>Toutes les transactions sont rapprochées ✓</q-item-section>
                </q-item>
              </q-list>
            </q-scroll-area>
          </div>

          <!-- Flèche centrale -->
          <div class="col-auto column items-center justify-center q-px-sm">
            <q-icon name="compare_arrows" size="32px" color="grey-4" />
            <div class="text-caption text-grey-5 q-mt-xs" style="writing-mode:vertical-lr;transform:rotate(180deg)">Rapprocher</div>
          </div>

          <!-- Colonne droite : factures non payées / à matcher -->
          <div class="col-12 col-md-5">
            <div class="text-subtitle2 q-mb-sm row items-center">
              <q-icon name="description" class="q-mr-xs" color="primary" />
              Factures / éléments à matcher
              <q-input
                v-model="invoiceSearch"
                dense outlined
                placeholder="Rechercher..."
                class="q-ml-auto"
                style="width:180px"
                clearable
              >
                <template v-slot:prepend><q-icon name="search" size="xs" /></template>
              </q-input>
            </div>
            <q-scroll-area style="height: 520px">
              <q-list bordered separator>
                <q-item
                  v-for="inv in filteredInvoices"
                  :key="inv.id"
                  clickable
                  :active="selectedInvoice?.id === inv.id"
                  active-class="bg-teal-1"
                  @click="selectInvoice(inv)"
                >
                  <q-item-section avatar>
                    <q-icon name="description" color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-body2">{{ inv.reference }}</q-item-label>
                    <q-item-label caption>{{ inv.client_name ?? '—' }} · {{ inv.certification_date ?? inv.created_at?.slice(0,10) }}</q-item-label>
                  </q-item-section>
                  <q-item-section side>
                    <span class="text-weight-bold text-primary">{{ fmtCur(inv.total_ttc) }}</span>
                  </q-item-section>
                </q-item>
                <q-item v-if="!filteredInvoices.length" class="text-grey-5 text-center">
                  <q-item-section>Aucune facture trouvée</q-item-section>
                </q-item>
              </q-list>
            </q-scroll-area>
          </div>
        </div>

        <!-- Panneau de confirmation du match -->
        <q-card v-if="selectedTx && selectedInvoice" flat bordered class="q-mt-md bg-blue-grey-1">
          <q-card-section class="row items-center q-gutter-md">
            <q-icon name="link" size="sm" color="primary" />
            <div class="col">
              <span class="text-weight-bold">{{ selectedTx.label }}</span>
              <span class="text-grey-7"> ({{ fmtCur(selectedTx.amount) }}) </span>
              <q-icon name="arrow_forward" size="xs" />
              <span class="text-weight-bold q-ml-sm">{{ selectedInvoice.reference }}</span>
              <span class="text-grey-7"> — {{ selectedInvoice.client_name }}</span>
              <span class="text-primary q-ml-sm">({{ fmtCur(selectedInvoice.total_ttc) }})</span>
              <q-chip v-if="amountDiff > 0" :color="amountDiff <= 1 ? 'warning' : 'negative'" text-color="white" size="sm" class="q-ml-sm">
                Écart : {{ fmtCur(amountDiff) }}
              </q-chip>
            </div>
            <div class="row q-gutter-sm">
              <q-btn color="primary" icon="check" label="Confirmer" no-caps :loading="confirmingManual" @click="confirmManual" />
              <q-btn flat icon="close" no-caps @click="clearManualSelection" />
            </div>
          </q-card-section>
        </q-card>
      </q-tab-panel>

      <!-- ===================================================================
           ONGLET RÈGLES
           =================================================================== -->
      <q-tab-panel name="rules" class="q-pa-none">
        <div class="row items-center q-mb-md">
          <div class="text-subtitle1">Règles de rapprochement automatique</div>
          <q-space />
          <q-btn color="primary" icon="add" label="Nouvelle règle" no-caps @click="openRuleDialog()" />
        </div>

        <q-table
          :rows="rules"
          :columns="ruleCols"
          row-key="id"
          flat bordered dense
          :loading="loadingRules"
        >
          <template v-slot:body-cell-is_active="props">
            <q-td :props="props">
              <q-toggle
                :model-value="props.row.is_active"
                dense
                @update:model-value="(v) => void doToggleRule(props.row.id, v)"
              />
            </q-td>
          </template>
          <template v-slot:body-cell-pattern_amount_min="props">
            <q-td :props="props">
              <span v-if="props.row.pattern_amount_min !== null || props.row.pattern_amount_max !== null">
                {{ props.row.pattern_amount_min !== null ? fmtCur(props.row.pattern_amount_min) : '—' }}
                →
                {{ props.row.pattern_amount_max !== null ? fmtCur(props.row.pattern_amount_max) : '∞' }}
              </span>
              <span v-else class="text-grey-5">Tous montants</span>
            </q-td>
          </template>
          <template v-slot:body-cell-actions="props">
            <q-td :props="props">
              <q-btn flat dense round icon="edit" size="sm" color="primary" @click="openRuleDialog(props.row)" />
              <q-btn flat dense round icon="delete" size="sm" color="negative" @click="doDeleteRule(props.row.id)" />
            </q-td>
          </template>
          <template v-slot:no-data>
            <div class="text-center text-grey-5 q-pa-xl full-width">
              <q-icon name="rule" size="40px" class="q-mb-sm" /><br>
              Aucune règle — cliquez "Nouvelle règle" pour en créer une
            </div>
          </template>
        </q-table>
      </q-tab-panel>

    </q-tab-panels>

    <!-- Dialog règle -->
    <q-dialog v-model="ruleDialog" persistent>
      <q-card style="min-width:480px">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">{{ editingRule ? 'Modifier la règle' : 'Nouvelle règle' }}</div>
          <q-space /><q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-sm">
          <q-input v-model="ruleForm.name" label="Nom de la règle *" outlined dense :rules="[v => !!v || 'Requis']" />
          <q-input v-model="ruleForm.pattern_label" label="Mot-clé libellé (ILIKE) *" outlined dense hint="Ex: VIREMENT, CORIS, SALAIRE" bottom-slots />
          <div class="row q-gutter-sm">
            <q-input v-model.number="ruleForm.pattern_amount_min" label="Montant min" type="number" outlined dense class="col" clearable />
            <q-input v-model.number="ruleForm.pattern_amount_max" label="Montant max" type="number" outlined dense class="col" clearable />
          </div>
          <div class="row q-gutter-sm items-center">
            <q-input v-model.number="ruleForm.priority" label="Priorité" type="number" outlined dense style="width:120px" />
            <q-toggle v-model="ruleForm.is_active" label="Règle active" />
            <q-toggle v-model="ruleForm.auto_match_invoice" label="Match facture auto" />
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Annuler" v-close-popup no-caps />
          <q-btn color="primary" :label="editingRule ? 'Enregistrer' : 'Créer'" no-caps :loading="savingRule" @click="saveRule" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { insforge } from 'src/boot/insforge';
import { useReconciliation } from 'src/composables/useReconciliation';
import type { ReconciliationRule, BankTransaction } from 'src/types';
import type { ReconciliationSuggestion } from 'src/composables/useReconciliation';

interface InvoiceLite {
  id: string;
  reference: string;
  total_ttc: number;
  client_name: string | null;
  certification_date: string | null;
  created_at: string | null;
}

const route = useRoute();
const $q = useQuasar();
const accountId = route.params['id'] as string;

const {
  suggestions, rules, loading, loadingRules, error,
  runAutoMatch, applyMatch, ignoreTransaction, loadUnreconciled,
  loadRules, createRule, updateRule, deleteRule, toggleRule,
  scoreColor, scoreLabel, matchTypeLabel, matchTypeIcon,
} = useReconciliation();

const tab = ref('auto');
const accountName = ref('');
const loadingStats = ref(true);
const unreconciledCount = ref(0);
const matchedCount = ref(0);
const totalCount = ref(0);
const applyingAll = ref(false);
const applyingId = ref<string | null>(null);

const unreconciledTxs = ref<BankTransaction[]>([]);
const invoices = ref<InvoiceLite[]>([]);
const invoiceSearch = ref('');
const selectedTx = ref<BankTransaction | null>(null);
const selectedInvoice = ref<InvoiceLite | null>(null);
const confirmingManual = ref(false);

const ruleDialog = ref(false);
const editingRule = ref<ReconciliationRule | null>(null);
const savingRule = ref(false);
const ruleForm = reactive({
  name: '',
  pattern_label: '',
  pattern_amount_min: null as number | null,
  pattern_amount_max: null as number | null,
  priority: 10,
  is_active: true,
  auto_match_invoice: false,
  category_id: null as string | null,
});

const pctReconciled = computed(() =>
  totalCount.value > 0 ? Math.round((matchedCount.value / totalCount.value) * 100) : 0
);

const amountDiff = computed(() =>
  selectedTx.value && selectedInvoice.value
    ? Math.abs(selectedTx.value.amount - selectedInvoice.value.total_ttc)
    : 0
);

const filteredInvoices = computed(() =>
  invoiceSearch.value
    ? invoices.value.filter(inv =>
        inv.reference.toLowerCase().includes(invoiceSearch.value.toLowerCase()) ||
        (inv.client_name ?? '').toLowerCase().includes(invoiceSearch.value.toLowerCase())
      )
    : invoices.value
);

const ruleCols = [
  { name: 'is_active',          label: 'Actif',        field: 'is_active',          align: 'center' as const },
  { name: 'priority',           label: 'Priorité',     field: 'priority',           align: 'center' as const, sortable: true },
  { name: 'name',               label: 'Nom',          field: 'name',               align: 'left' as const },
  { name: 'pattern_label',      label: 'Mot-clé',      field: 'pattern_label',      align: 'left' as const },
  { name: 'pattern_amount_min', label: 'Montant',      field: 'pattern_amount_min', align: 'left' as const },
  { name: 'actions',            label: '',             field: 'id',                 align: 'right' as const },
];

function fmtCur(n: number) {
  return new Intl.NumberFormat('fr-BF', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);
}

async function loadStats() {
  loadingStats.value = true;
  try {
    // Nom du compte
    const { data: acc } = await insforge.database
      .from('bank_accounts').select('bank_name, account_number').eq('id', accountId).single();
    if (acc) accountName.value = `${acc.bank_name} — ${acc.account_number}`;

    // Comptages
    const { data: counts } = await insforge.database
      .from('bank_transactions')
      .select('reconciliation_status')
      .eq('bank_account_id', accountId);
    const all = counts || [];
    totalCount.value = all.length;
    unreconciledCount.value = all.filter((r: { reconciliation_status: string }) => r.reconciliation_status === 'unreconciled').length;
    matchedCount.value = all.filter((r: { reconciliation_status: string }) => r.reconciliation_status === 'matched').length;
  } finally {
    loadingStats.value = false;
  }
}

async function doAutoMatch() {
  await runAutoMatch(accountId);
  if (error.value) $q.notify({ type: 'negative', message: error.value });
  else if (!suggestions.value.length) $q.notify({ type: 'info', message: 'Aucune correspondance trouvée' });
}

async function doApplyMatch(s: ReconciliationSuggestion) {
  applyingId.value = s.transaction_id;
  try {
    await applyMatch(s.transaction_id, s.match_type !== 'user_rule' ? s.match_id : null);
    await loadStats();
    $q.notify({ type: 'positive', message: 'Rapprochement appliqué' });
  } catch (e: unknown) {
    $q.notify({ type: 'negative', message: e instanceof Error ? e.message : 'Erreur' });
  } finally {
    applyingId.value = null;
  }
}

async function applyAll() {
  applyingAll.value = true;
  let applied = 0;
  for (const s of suggestions.value.filter(s => !s.applied)) {
    try {
      await applyMatch(s.transaction_id, s.match_type !== 'user_rule' ? s.match_id : null);
      applied++;
    } catch { /* continue */ }
  }
  applyingAll.value = false;
  await loadStats();
  $q.notify({ type: 'positive', message: `${applied} rapprochement(s) appliqué(s)` });
}

async function doIgnore(txId: string) {
  try {
    await ignoreTransaction(txId);
    await loadStats();
  } catch (e: unknown) {
    $q.notify({ type: 'negative', message: e instanceof Error ? e.message : 'Erreur' });
  }
}

async function loadManualData() {
  const [txs, invData] = await Promise.all([
    loadUnreconciled(accountId),
    insforge.database
      .from('invoices')
      .select('id, reference, total_ttc, client_id, certification_datetime, created_at')
      .eq('reconciliation_status' as never, 'unreconciled' as never)
      .not('status', 'in', '("draft","cancelled")')
      .order('certification_datetime', { ascending: false })
      .limit(200),
  ]);
  unreconciledTxs.value = txs;

  // Enrichir avec noms clients
  const rawInvoices = (invData.data || []) as {
    id: string; reference: string; total_ttc: number;
    client_id: string | null; certification_datetime: string | null; created_at: string | null;
  }[];
  const clientIds = [...new Set(rawInvoices.map(i => i.client_id).filter(Boolean))] as string[];
  let clientMap: Record<string, string> = {};
  if (clientIds.length) {
    const { data: cls } = await insforge.database.from('clients').select('id, name').in('id', clientIds);
    clientMap = Object.fromEntries((cls || []).map((c: { id: string; name: string }) => [c.id, c.name]));
  }
  invoices.value = rawInvoices.map(i => ({
    id: i.id,
    reference: i.reference,
    total_ttc: i.total_ttc,
    client_name: i.client_id ? (clientMap[i.client_id] ?? null) : null,
    certification_date: i.certification_datetime?.slice(0, 10) ?? null,
    created_at: i.created_at,
  }));
}

function selectTx(tx: BankTransaction) {
  selectedTx.value = selectedTx.value?.id === tx.id ? null : tx;
}
function selectInvoice(inv: InvoiceLite) {
  selectedInvoice.value = selectedInvoice.value?.id === inv.id ? null : inv;
}
function clearManualSelection() {
  selectedTx.value = null;
  selectedInvoice.value = null;
}

async function confirmManual() {
  if (!selectedTx.value || !selectedInvoice.value) return;
  confirmingManual.value = true;
  try {
    await applyMatch(selectedTx.value.id, selectedInvoice.value.id);
    unreconciledTxs.value = unreconciledTxs.value.filter(t => t.id !== selectedTx.value!.id);
    clearManualSelection();
    await loadStats();
    $q.notify({ type: 'positive', message: 'Rapprochement manuel confirmé' });
  } catch (e: unknown) {
    $q.notify({ type: 'negative', message: e instanceof Error ? e.message : 'Erreur' });
  } finally {
    confirmingManual.value = false;
  }
}

function openRuleDialog(rule?: ReconciliationRule) {
  editingRule.value = rule ?? null;
  if (rule) {
    ruleForm.name                = rule.name;
    ruleForm.pattern_label       = rule.pattern_label ?? '';
    ruleForm.pattern_amount_min  = rule.pattern_amount_min;
    ruleForm.pattern_amount_max  = rule.pattern_amount_max;
    ruleForm.priority            = rule.priority;
    ruleForm.is_active           = rule.is_active;
    ruleForm.auto_match_invoice  = rule.auto_match_invoice;
    ruleForm.category_id         = rule.category_id;
  } else {
    ruleForm.name = ''; ruleForm.pattern_label = '';
    ruleForm.pattern_amount_min = null; ruleForm.pattern_amount_max = null;
    ruleForm.priority = 10; ruleForm.is_active = true;
    ruleForm.auto_match_invoice = false; ruleForm.category_id = null;
  }
  ruleDialog.value = true;
}

async function saveRule() {
  if (!ruleForm.name || !ruleForm.pattern_label) {
    $q.notify({ type: 'warning', message: 'Nom et mot-clé obligatoires' }); return;
  }
  savingRule.value = true;
  try {
    const payload = {
      name: ruleForm.name,
      pattern_label: ruleForm.pattern_label,
      pattern_amount_min: ruleForm.pattern_amount_min,
      pattern_amount_max: ruleForm.pattern_amount_max,
      priority: ruleForm.priority,
      is_active: ruleForm.is_active,
      auto_match_invoice: ruleForm.auto_match_invoice,
      category_id: ruleForm.category_id,
    };
    if (editingRule.value) {
      await updateRule(editingRule.value.id, payload);
      $q.notify({ type: 'positive', message: 'Règle mise à jour' });
    } else {
      await createRule(payload);
      $q.notify({ type: 'positive', message: 'Règle créée' });
    }
    ruleDialog.value = false;
  } catch (e: unknown) {
    $q.notify({ type: 'negative', message: e instanceof Error ? e.message : 'Erreur' });
  } finally {
    savingRule.value = false;
  }
}

async function doDeleteRule(id: string) {
  $q.dialog({ title: 'Supprimer', message: 'Supprimer cette règle ?', cancel: true, persistent: true })
    .onOk(async () => {
      try {
        await deleteRule(id);
        $q.notify({ type: 'positive', message: 'Règle supprimée' });
      } catch (e: unknown) {
        $q.notify({ type: 'negative', message: e instanceof Error ? e.message : 'Erreur' });
      }
    });
}

async function doToggleRule(id: string, val: boolean) {
  try { await toggleRule(id, val); }
  catch (e: unknown) { $q.notify({ type: 'negative', message: e instanceof Error ? e.message : 'Erreur' }); }
}

onMounted(async () => {
  await Promise.all([loadStats(), loadManualData(), loadRules()]);
});
</script>
