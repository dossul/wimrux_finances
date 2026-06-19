import { defineStore } from 'pinia';
import { ref } from 'vue';
import { appwriteDb } from 'src/services';
import { ID, Query } from 'appwrite';
import type { Budget, BudgetLine } from 'src/types';

export const useBudgetStore = defineStore('budget', () => {
  const budgets = ref<Budget[]>([]);
  const currentBudget = ref<Budget | null>(null);
  const budgetLines = ref<BudgetLine[]>([]);
  const loading = ref(false);

  async function loadBudgets(companyId: string) {
    loading.value = true;
    try {
      const { data, error } = await appwriteDb
        .from('budgets')
        .query([Query.equal('company_id', companyId), Query.orderDesc('fiscal_year')])
        .select();
      if (!error && data) {
        budgets.value = data as Budget[];
      }
      return { data, error };
    } finally {
      loading.value = false;
    }
  }

  async function createBudget(payload: Omit<Budget, 'id' | 'created_at'>) {
    const budgetId = ID.unique();
    const { data, error } = await appwriteDb
      .from('budgets')
      .insert({
        id: budgetId,
        ...payload,
        created_at: new Date().toISOString(),
      });
    if (!error && data) {
      budgets.value.unshift(data as Budget);
    }
    return { data, error };
  }

  return {
    budgets,
    currentBudget,
    budgetLines,
    loading,
    loadBudgets,
    createBudget,
  };
});

export default useBudgetStore;
