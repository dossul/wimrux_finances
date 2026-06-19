import { defineStore } from 'pinia';
import { ref } from 'vue';
import { appwriteDb } from 'src/services';
import { Query } from 'appwrite';
import type { PaymentWallet, WalletTransaction } from 'src/composables/usePaymentWallets';

export const useWalletStore = defineStore('wallet', () => {
  const wallets = ref<PaymentWallet[]>([]);
  const transactions = ref<WalletTransaction[]>([]);
  const loading = ref(false);

  async function loadWallets(companyId: string) {
    loading.value = true;
    try {
      const { data, error } = await appwriteDb
        .from('payment_wallets')
        .query([Query.equal('company_id', companyId), Query.orderDesc('$createdAt')])
        .select();
      if (!error && data) {
        wallets.value = data as PaymentWallet[];
      }
      return { data, error };
    } finally {
      loading.value = false;
    }
  }

  async function loadTransactions(walletId: string, companyId: string) {
    loading.value = true;
    try {
      const { data, error } = await appwriteDb
        .from('wallet_transactions')
        .query([
          Query.equal('wallet_id', walletId),
          Query.equal('company_id', companyId),
          Query.orderDesc('transaction_date')
        ])
        .select();
      if (!error && data) {
        transactions.value = data as WalletTransaction[];
      }
      return { data, error };
    } finally {
      loading.value = false;
    }
  }

  return {
    wallets,
    transactions,
    loading,
    loadWallets,
    loadTransactions,
  };
});

export default useWalletStore;
