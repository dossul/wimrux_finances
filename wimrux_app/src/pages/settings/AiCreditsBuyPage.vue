<template>
  <q-page padding>
    <div class="row items-center q-mb-lg">
      <div>
        <div class="text-h5 text-weight-bold">Acheter des crédits IA</div>
        <div class="text-caption text-grey-7">Recharger votre solde pour les appels IA</div>
      </div>
      <q-space />
      <q-btn flat icon="arrow_back" label="Retour" no-caps @click="$router.back()" />
    </div>

    <!-- Solde actuel -->
    <q-card flat bordered class="q-mb-lg">
      <q-card-section>
        <div class="row items-center q-gutter-md">
          <div class="col-auto">
            <q-icon name="account_balance_wallet" size="48px" color="primary" />
          </div>
          <div class="col">
            <div class="text-caption text-grey-7">Solde crédits actuel</div>
            <div class="text-h4 text-weight-bold text-primary">
              {{ formatCurrency(creditBalance) }}
            </div>
          </div>
          <div class="col-auto" v-if="lowBalance">
            <q-badge color="negative" class="q-pa-sm">
              <q-icon name="warning" left />
              Solde faible
            </q-badge>
          </div>
        </div>
      </q-card-section>
    </q-card>

    <!-- Packs disponibles -->
    <div class="text-subtitle1 text-weight-medium q-mb-md">Choisissez un pack</div>
    <div class="row q-col-gutter-md q-mb-lg">
      <div v-for="pack in creditPacks" :key="pack.id" class="col-12 col-sm-6 col-md-3">
        <q-card 
          flat 
          bordered 
          class="cursor-pointer pack-card"
          :class="{ 'selected-pack': selectedPack?.id === pack.id }"
          @click="selectPack(pack)"
        >
          <q-card-section class="text-center">
            <div class="text-overline text-uppercase text-grey-7">{{ pack.code }}</div>
            <div class="text-h5 text-weight-bold text-primary">{{ pack.name }}</div>
            <q-separator class="q-my-md" />
            <div class="text-h4 text-weight-bold">${{ pack.credits_usd }}</div>
            <div class="text-caption text-grey-7">crédits IA</div>
          </q-card-section>
          <q-card-section class="bg-grey-1">
            <div class="row items-center justify-between">
              <div class="text-body2">Prix</div>
              <div class="text-h6 text-weight-bold">{{ formatXOF(pack.price_xof) }}</div>
            </div>
            <div class="text-caption text-grey-7 text-right">~${{ pack.price_usd }}</div>
          </q-card-section>
          <div class="absolute-top-right q-ma-sm" v-if="selectedPack?.id === pack.id">
            <q-icon name="check_circle" color="positive" size="28px" />
          </div>
        </q-card>
      </div>
    </div>

    <!-- Détails du pack sélectionné -->
    <q-slide-transition>
      <div v-show="selectedPack">
        <q-card flat bordered class="q-mb-lg">
          <q-card-section>
            <div class="text-subtitle1 text-weight-medium q-mb-md">Récapitulatif</div>
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-6">
                <q-list dense>
                  <q-item>
                    <q-item-section>Pack sélectionné</q-item-section>
                    <q-item-section side class="text-weight-bold">{{ selectedPack?.name }}</q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>Crédits IA</q-item-section>
                    <q-item-section side class="text-weight-bold">${{ selectedPack?.credits_usd }}</q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>Prix (XOF)</q-item-section>
                    <q-item-section side class="text-weight-bold">{{ formatXOF(selectedPack?.price_xof) }}</q-item-section>
                  </q-item>
                  <q-item>
                    <q-item-section>Prix (USD)</q-item-section>
                    <q-item-section side>${{ selectedPack?.price_usd }}</q-item-section>
                  </q-item>
                </q-list>
              </div>
              <div class="col-12 col-md-6">
                <div class="text-caption text-grey-7 q-mb-sm">Mode de paiement</div>
                <q-btn-toggle
                  v-model="paymentMethod"
                  spread
                  no-caps
                  toggle-color="primary"
                  color="grey-3"
                  text-color="black"
                  :options="[
                    { label: 'Mobile Money', value: 'mobile_money' },
                    { label: 'Carte bancaire', value: 'card' },
                  ]"
                  class="q-mb-md"
                />
                <div class="text-caption text-grey-7">
                  <q-icon name="info" size="16px" class="q-mr-xs" />
                  Le paiement sera traité via notre partenaire sécurisé.
                </div>
              </div>
            </div>
          </q-card-section>
          <q-separator />
          <q-card-actions align="right">
            <q-btn flat label="Annuler" no-caps @click="selectedPack = null" />
            <q-btn 
              color="primary" 
              icon="payment" 
              label="Procéder au paiement" 
              no-caps 
              :loading="processing"
              @click="initiatePayment"
            />
          </q-card-actions>
        </q-card>
      </div>
    </q-slide-transition>

    <!-- Historique récent -->
    <q-card flat bordered>
      <q-card-section>
        <div class="text-subtitle1 text-weight-medium">Historique des achats récents</div>
      </q-card-section>
      <q-separator />
      <q-table
        :rows="transactions"
        :columns="transactionColumns"
        row-key="id"
        flat
        :loading="loading"
        :pagination="{ rowsPerPage: 5 }"
        no-data-label="Aucun achat effectué"
      >
        <template #body-cell-type="props">
          <q-td :props="props">
            <q-badge :color="getTypeColor(props.row.type)" :label="getTypeLabel(props.row.type)" />
          </q-td>
        </template>
        <template #body-cell-amount="props">
          <q-td :props="props">
            <span :class="props.row.amount_usd >= 0 ? 'text-positive' : 'text-negative'">
              {{ props.row.amount_usd >= 0 ? '+' : '' }}${{ props.row.amount_usd }}
            </span>
          </q-td>
        </template>
        <template #body-cell-created="props">
          <q-td :props="props">
            {{ formatDate(props.row.created_at) }}
          </q-td>
        </template>
      </q-table>
    </q-card>

    <!-- Dialog confirmation -->
    <q-dialog v-model="showConfirm" persistent>
      <q-card style="min-width: 400px">
        <q-card-section class="row items-center">
          <q-icon name="verified" color="positive" size="32px" class="q-mr-md" />
          <div>
            <div class="text-h6">Paiement confirmé !</div>
            <div class="text-caption text-grey-7">Votre solde a été crédité</div>
          </div>
        </q-card-section>
        <q-card-section>
          <div class="text-center q-pa-md">
            <div class="text-h4 text-weight-bold text-positive q-mb-sm">
              +${{ selectedPack?.credits_usd }}
            </div>
            <div class="text-body2 text-grey-7">
              ont été ajoutés à votre compte
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Fermer" no-caps v-close-popup @click="refreshData" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import type { AiCreditPack, CompanyAiCredits } from 'src/types';

const $q = useQuasar();
const $router = useRouter();
const companyStore = useCompanyStore();

// State
const creditPacks = ref<AiCreditPack[]>([]);
const transactions = ref<any[]>([]);
const creditBalance = ref(0);
const selectedPack = ref<AiCreditPack | null>(null);
const paymentMethod = ref('mobile_money');
const loading = ref(false);
const processing = ref(false);
const showConfirm = ref(false);

// Computed
const lowBalance = computed(() => creditBalance.value < 1);

const transactionColumns = [
  { name: 'type', label: 'Type', align: 'left' as const, field: 'type' },
  { name: 'description', label: 'Description', align: 'left' as const, field: 'description' },
  { name: 'amount', label: 'Montant', align: 'right' as const, field: 'amount_usd' },
  { name: 'created', label: 'Date', align: 'left' as const, field: 'created_at' },
];

// Methods
function formatCurrency(value: number | undefined) {
  if (value === undefined) return '$0.00';
  return `$${value.toFixed(2)}`;
}

function formatXOF(value: number | undefined) {
  if (value === undefined) return '0 FCFA';
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTypeColor(type: string) {
  switch (type) {
    case 'purchase': return 'positive';
    case 'consumption': return 'negative';
    case 'refund': return 'info';
    case 'bonus': return 'accent';
    default: return 'grey';
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'purchase': return 'Achat';
    case 'consumption': return 'Consommation';
    case 'refund': return 'Remboursement';
    case 'bonus': return 'Bonus';
    default: return type;
  }
}

function selectPack(pack: AiCreditPack) {
  selectedPack.value = pack;
}

async function loadData() {
  loading.value = true;
  try {
    const companyId = companyStore.company?.id;
    if (!companyId) return;

    // Load credit packs
    const { data: packs } = await insforge.database
      .from('ai_credit_packs')
      .select('*')
      .eq('is_active', true)
      .order('price_xof');
    creditPacks.value = packs || [];

    // Load credit balance
    const { data: credits } = await insforge.database
      .from('company_ai_credits')
      .select('*')
      .eq('company_id', companyId)
      .single();
    if (credits) {
      creditBalance.value = credits.balance_usd;
    }

    // Load transactions
    const { data: txs } = await insforge.database
      .from('ai_credit_transactions')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(10);
    transactions.value = txs || [];
  } finally {
    loading.value = false;
  }
}

async function initiatePayment() {
  if (!selectedPack.value) return;

  processing.value = true;
  try {
    // TODO: Integrate with EPIC 24 payment flow
    // For now, simulate payment success and credit the account
    
    const companyId = companyStore.company?.id;
    if (!companyId) throw new Error('No company selected');

    // Create transaction record
    const { error: txError } = await insforge.database
      .from('ai_credit_transactions')
      .insert([{
        company_id: companyId,
        type: 'purchase',
        amount_usd: selectedPack.value.credits_usd,
        amount_xof: selectedPack.value.price_xof,
        description: `Achat pack ${selectedPack.value.code}`,
        status: 'completed',
        payment_method: paymentMethod.value,
        metadata: {
          pack_id: selectedPack.value.id,
          pack_code: selectedPack.value.code,
        },
      }]);

    if (txError) throw txError;

    // Update credit balance
    const { error: creditError } = await insforge.database
      .rpc('increment_ai_credits', {
        p_company_id: companyId,
        p_amount_usd: selectedPack.value.credits_usd,
      });

    if (creditError) {
      // Fallback: manual update if RPC doesn't exist
      const { data: current } = await insforge.database
        .from('company_ai_credits')
        .select('*')
        .eq('company_id', companyId)
        .single();
      
      if (current) {
        await insforge.database
          .from('company_ai_credits')
          .update({
            balance_usd: current.balance_usd + selectedPack.value.credits_usd,
            total_purchased_usd: current.total_purchased_usd + selectedPack.value.credits_usd,
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId);
      }
    }

    showConfirm.value = true;
    $q.notify({
      type: 'positive',
      message: `Pack ${selectedPack.value.code} acheté avec succès !`,
    });
  } catch (err: any) {
    $q.notify({
      type: 'negative',
      message: `Erreur: ${err.message || 'Paiement échoué'}`,
    });
  } finally {
    processing.value = false;
  }
}

function refreshData() {
  selectedPack.value = null;
  loadData();
}

onMounted(() => loadData());
</script>

<style scoped>
.pack-card {
  transition: all 0.3s ease;
  border: 2px solid transparent;
}
.pack-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
.selected-pack {
  border-color: var(--q-primary);
  background: rgba(var(--q-primary-rgb), 0.05);
}
</style>
