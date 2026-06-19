import { defineStore } from 'pinia';
import { ref } from 'vue';
import { appwriteDb } from 'src/services';
import { ID, Query } from 'appwrite';
import type { Loan } from 'src/types';

export const useLoanStore = defineStore('loan', () => {
  const loans = ref<Loan[]>([]);
  const loading = ref(false);

  async function loadLoans(companyId: string) {
    loading.value = true;
    try {
      const { data, error } = await appwriteDb
        .from('loans')
        .query([Query.equal('company_id', companyId), Query.orderDesc('start_date')])
        .select();
      if (!error && data) {
        loans.value = data as Loan[];
      }
      return { data, error };
    } finally {
      loading.value = false;
    }
  }

  async function createLoan(payload: Omit<Loan, 'id' | 'created_at'>) {
    const loanId = ID.unique();
    const { data, error } = await appwriteDb
      .from('loans')
      .insert({
        id: loanId,
        ...payload,
        created_at: new Date().toISOString(),
      });
    if (!error && data) {
      loans.value.unshift(data as Loan);
    }
    return { data, error };
  }

  return {
    loans,
    loading,
    loadLoans,
    createLoan,
  };
});

export default useLoanStore;
