import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import type {
  MobileWallet,
  MobileWalletInput,
  MobileWalletTransaction,
  MobileWalletTransactionInput,
  MobileWalletSummary,
  MobileWalletProvider,
} from 'src/types';

const PROVIDER_LABELS: Record<MobileWalletProvider, string> = {
  orange_money: 'Orange Money',
  moov_money: 'Moov Money',
  wave: 'Wave',
  mtn_momo: 'MTN MoMo',
  airtel_money: 'Airtel Money',
  other: 'Autre',
};

export function useMobileWallets() {
  const companyStore = useCompanyStore();
  const companyId = computed(() => companyStore.company?.id ?? '');

  const wallets = ref<MobileWallet[]>([]);
  const summaries = ref<MobileWalletSummary[]>([]);
  const transactions = ref<MobileWalletTransaction[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // --- Wallets ---

  async function loadWallets() {
    loading.value = true;
    error.value = null;
    const { data, error: err } = await insforge.database
      .from('mobile_wallets')
      .select('*')
      .eq('company_id', companyId.value)
      .order('provider');
    if (err) { error.value = err.message; }
    else { wallets.value = data as MobileWallet[]; }
    loading.value = false;
  }

  async function loadSummaries() {
    loading.value = true;
    error.value = null;
    const { data, error: err } = await insforge.database
      .from('v_mobile_wallet_summary')
      .select('*')
      .eq('company_id', companyId.value);
    if (err) { error.value = err.message; }
    else { summaries.value = data as MobileWalletSummary[]; }
    loading.value = false;
  }

  async function createWallet(input: MobileWalletInput): Promise<MobileWallet | null> {
    const { data, error: err } = await insforge.database
      .from('mobile_wallets')
      .insert([{ ...input, company_id: companyId.value }])
      .select()
      .single();
    if (err) { error.value = err.message; return null; }
    await loadSummaries();
    return data as MobileWallet;
  }

  async function updateWallet(id: string, input: Partial<MobileWalletInput>): Promise<boolean> {
    const { error: err } = await insforge.database
      .from('mobile_wallets')
      .update(input)
      .eq('id', id)
      .eq('company_id', companyId.value);
    if (err) { error.value = err.message; return false; }
    await loadSummaries();
    return true;
  }

  async function deleteWallet(id: string): Promise<boolean> {
    const { error: err } = await insforge.database
      .from('mobile_wallets')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId.value);
    if (err) { error.value = err.message; return false; }
    await loadSummaries();
    return true;
  }

  async function toggleActive(id: string, isActive: boolean): Promise<boolean> {
    const { error: err } = await insforge.database
      .from('mobile_wallets')
      .update({ is_active: isActive })
      .eq('id', id)
      .eq('company_id', companyId.value);
    if (err) { error.value = err.message; return false; }
    await loadSummaries();
    return true;
  }

  // --- Transactions ---

  async function loadTransactions(walletId: string, limit = 200) {
    loading.value = true;
    error.value = null;
    const { data, error: err } = await insforge.database
      .from('mobile_wallet_transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .eq('company_id', companyId.value)
      .order('transaction_date', { ascending: false })
      .limit(limit);
    if (err) { error.value = err.message; }
    else { transactions.value = data as MobileWalletTransaction[]; }
    loading.value = false;
  }

  function computeBalanceDelta(tx: MobileWalletTransactionInput | MobileWalletTransaction): number {
    const fees = tx.fees || 0;
    switch (tx.type) {
      case 'deposit':
      case 'transfer_in':
        return tx.amount - fees;
      case 'withdrawal':
      case 'transfer_out':
      case 'payment':
        return -(tx.amount + fees);
      case 'fee':
        return -tx.amount;
      default:
        return 0;
    }
  }

  async function addTransaction(input: MobileWalletTransactionInput): Promise<MobileWalletTransaction | null> {
    const { data, error: err } = await insforge.database
      .from('mobile_wallet_transactions')
      .insert([{ ...input, company_id: companyId.value, fees: input.fees ?? 0 }])
      .select()
      .single();
    if (err) { error.value = err.message; return null; }

    // Update wallet balance
    const wallet = wallets.value.find(w => w.id === input.wallet_id)
      || summaries.value.find(s => s.id === input.wallet_id);
    if (wallet) {
      const delta = computeBalanceDelta(input);
      await insforge.database
        .from('mobile_wallets')
        .update({ current_balance: (wallet.current_balance || 0) + delta })
        .eq('id', input.wallet_id);
    }

    await loadTransactions(input.wallet_id);
    await loadSummaries();
    return data as MobileWalletTransaction;
  }

  async function deleteTransaction(tx: MobileWalletTransaction): Promise<boolean> {
    const { error: err } = await insforge.database
      .from('mobile_wallet_transactions')
      .delete()
      .eq('id', tx.id);
    if (err) { error.value = err.message; return false; }

    // Reverse balance
    const wallet = summaries.value.find(s => s.id === tx.wallet_id);
    if (wallet) {
      const delta = -computeBalanceDelta(tx);
      await insforge.database
        .from('mobile_wallets')
        .update({ current_balance: (wallet.current_balance || 0) + delta })
        .eq('id', tx.wallet_id);
    }

    await loadTransactions(tx.wallet_id);
    await loadSummaries();
    return true;
  }

  // --- CSV import (relevé opérateur) ---
  // Expected columns: date, type, amount, fees, counterparty_phone, counterparty_name, external_id
  async function importFromCsv(walletId: string, csvText: string): Promise<{ inserted: number; failed: number }> {
    const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length < 2) return { inserted: 0, failed: 0 };

    const header = lines[0]!.split(',').map(h => h.trim().toLowerCase());
    const idx = (key: string) => header.indexOf(key);

    const iDate = idx('date');
    const iType = idx('type');
    const iAmount = idx('amount');
    const iFees = idx('fees');
    const iPhone = idx('counterparty_phone');
    const iName = idx('counterparty_name');
    const iExt = idx('external_id');

    let inserted = 0;
    let failed = 0;

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i]!.split(',').map(c => c.trim());
      try {
        const type = (cells[iType] || 'deposit') as MobileWalletTransactionInput['type'];
        const result = await addTransaction({
          wallet_id: walletId,
          type,
          amount: parseFloat(cells[iAmount] || '0'),
          fees: iFees >= 0 ? parseFloat(cells[iFees] || '0') : 0,
          counterparty_phone: iPhone >= 0 ? (cells[iPhone] || null) : null,
          counterparty_name: iName >= 0 ? (cells[iName] || null) : null,
          external_transaction_id: iExt >= 0 ? (cells[iExt] || null) : null,
          transaction_date: cells[iDate] || new Date().toISOString(),
        });
        if (result) inserted++;
        else failed++;
      } catch {
        failed++;
      }
    }

    return { inserted, failed };
  }

  // --- Stats ---
  const totalBalance = computed(() =>
    summaries.value.filter(s => s.is_active).reduce((sum, s) => sum + (s.current_balance || 0), 0)
  );

  const balanceByProvider = computed(() => {
    const map: Record<string, number> = {};
    for (const s of summaries.value.filter(s => s.is_active)) {
      map[s.provider] = (map[s.provider] || 0) + (s.current_balance || 0);
    }
    return map;
  });

  function providerLabel(p: MobileWalletProvider): string {
    return PROVIDER_LABELS[p] || p;
  }

  return {
    wallets, summaries, transactions,
    loading, error,
    totalBalance, balanceByProvider,
    loadWallets, loadSummaries,
    createWallet, updateWallet, deleteWallet, toggleActive,
    loadTransactions, addTransaction, deleteTransaction,
    importFromCsv,
    providerLabel,
  };
}
