// =============================================================================
// WIMRUX® FINANCES — Composable Payment Wallets (T24.9/T24.10)
// Gestion des wallets de paiement globaux + transactions
// =============================================================================
import { ref } from 'vue';
import { useCompanyStore } from 'src/stores/company-store';
import { appwriteDb } from 'src/services/appwrite-db';

export interface PaymentWallet {
  id: string;
  company_id: string;
  provider_id: string | null;
  category: string;
  display_name: string;
  identifier: string | null;
  identifier_masked: string | null;
  account_holder: string | null;
  currency: string;
  country_code: string | null;
  current_balance: number | null;
  available_balance: number | null;
  credit_limit: number | null;
  connection_mode: string | null;
  last_sync_at: string | null;
  sync_status: string | null;
  is_active: boolean | null;
  notes: string | null;
  created_at: string | null;
}

export interface PaymentWalletInput {
  category: string;
  display_name: string;
  identifier?: string | null;
  account_holder?: string | null;
  currency: string;
  country_code?: string | null;
  current_balance?: number;
  notes?: string | null;
}

export interface WalletTransaction {
  id: string;
  company_id: string;
  wallet_id: string;
  external_transaction_id: string | null;
  external_reference: string | null;
  direction: 'credit' | 'debit';
  operation_type: string;
  amount: number;
  fees: number | null;
  currency: string;
  counterparty_name: string | null;
  counterparty_identifier: string | null;
  transaction_date: string;
  value_date: string | null;
  label: string;
  description: string | null;
  source_channel: string;
  reconciliation_status: string;
  needs_human_review: boolean | null;
  created_at: string | null;
}

export interface WalletTransactionInput {
  wallet_id: string;
  direction: 'credit' | 'debit';
  operation_type: string;
  amount: number;
  fees?: number;
  currency: string;
  counterparty_name?: string | null;
  counterparty_identifier?: string | null;
  transaction_date: string;
  label: string;
  description?: string | null;
  source_channel: string;
  dedup_hash?: string;
}

export function usePaymentWallets() {
  const companyStore = useCompanyStore();
  const wallets = ref<PaymentWallet[]>([]);
  const transactions = ref<WalletTransaction[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadWallets() {
    if (!companyStore.company?.id) return;
    loading.value = true; error.value = null;
    try {
      const { data, error: err } = await appwriteDb
        .from('payment_wallets')
        .select('*')
        .eq('company_id', companyStore.company.id)
        .order('created_at', { ascending: false });
      if (err) { error.value = err.message; return; }
      wallets.value = (data || []) as PaymentWallet[];
    } finally { loading.value = false; }
  }

  async function createWallet(input: PaymentWalletInput): Promise<PaymentWallet | null> {
    if (!companyStore.company?.id) return null;
    const { data, error: err } = await appwriteDb
      .from('payment_wallets')
      .insert([{ ...input, company_id: companyStore.company.id }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
    if (err) { error.value = err.message; return null; }
    if (data) wallets.value.unshift(data as PaymentWallet);
    return data as PaymentWallet;
  }

  async function updateWallet(id: string, updates: Partial<PaymentWalletInput>): Promise<boolean> {
    const { error: err } = await appwriteDb
      .from('payment_wallets')
      .update(id, { ...updates, updated_at: new Date().toISOString() });
    if (err) { error.value = err.message; return false; }
    const idx = wallets.value.findIndex(w => w.id === id);
    if (idx >= 0) wallets.value[idx] = { ...wallets.value[idx]!, ...updates };
    return true;
  }

  async function deleteWallet(id: string): Promise<boolean> {
    const { error: err } = await appwriteDb
      .from('payment_wallets')
      .delete()
      .eq('id', id);
    if (err) { error.value = err.message; return false; }
    wallets.value = wallets.value.filter(w => w.id !== id);
    return true;
  }

  async function loadTransactions(walletId: string, limit = 100) {
    if (!companyStore.company?.id) return;
    loading.value = true; error.value = null;
    try {
      const { data, error: err } = await appwriteDb
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', walletId)
        .eq('company_id', companyStore.company.id)
        .order('transaction_date', { ascending: false })
        .limit(limit);
      if (err) { error.value = err.message; return; }
      transactions.value = (data || []) as WalletTransaction[];
    } finally { loading.value = false; }
  }

  async function createTransaction(input: WalletTransactionInput): Promise<WalletTransaction | null> {
    if (!companyStore.company?.id) return null;
    const dedupHash = input.dedup_hash
      ?? `${input.wallet_id}-${input.transaction_date}-${input.amount}-${input.direction}-${input.label}`.replace(/\s+/g, '');
    const { data, error: err } = await appwriteDb
      .from('wallet_transactions')
      .insert([{ ...input, company_id: companyStore.company.id, dedup_hash: dedupHash }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
    if (err) { error.value = err.message; return null; }
    if (data) transactions.value.unshift(data as WalletTransaction);
    return data as WalletTransaction;
  }

  function categoryIcon(category: string): string {
    const map: Record<string, string> = {
      mobile_money: 'smartphone',
      visa_prepaid: 'credit_card',
      mastercard_prepaid: 'credit_card',
      crypto: 'currency_bitcoin',
      paypal: 'account_balance_wallet',
      stripe: 'payment',
      other: 'wallet',
    };
    return map[category] ?? 'wallet';
  }

  function categoryLabel(category: string): string {
    const map: Record<string, string> = {
      mobile_money: 'Mobile Money',
      visa_prepaid: 'Visa Prépayé',
      mastercard_prepaid: 'Mastercard Prépayé',
      crypto: 'Cryptomonnaie',
      paypal: 'PayPal',
      stripe: 'Stripe',
      other: 'Autre',
    };
    return map[category] ?? category;
  }

  return {
    wallets, transactions, loading, error,
    loadWallets, createWallet, updateWallet, deleteWallet,
    loadTransactions, createTransaction,
    categoryIcon, categoryLabel,
  };
}
