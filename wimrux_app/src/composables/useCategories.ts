import { ref, computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import type { TransactionCategory } from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';

export function useCategories() {
  const companyStore = useCompanyStore();
  const companyId = computed(() => companyStore.company?.id ?? '');

  const categories = ref<TransactionCategory[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadCategories(typeFilter?: TransactionCategory['type']) {
    loading.value = true;
    error.value = null;
    let query = appwriteDb
      .from('transaction_categories')
      .select('*')
      .eq('company_id', companyId.value)
      .order('name');
    if (typeFilter) query = query.eq('type', typeFilter);
    const { data, error: err } = await query;
    if (err) { error.value = err.message; }
    else { categories.value = (data as TransactionCategory[]) || []; }
    loading.value = false;
  }

  async function createCategory(input: Partial<TransactionCategory>): Promise<TransactionCategory | null> {
    const { data, error: err } = await appwriteDb
      .from('transaction_categories')
      .insert([{ ...input, company_id: companyId.value }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
    if (err) { error.value = err.message; return null; }
    await loadCategories();
    return data as TransactionCategory;
  }

  async function updateCategory(id: string, input: Partial<TransactionCategory>): Promise<boolean> {
    const { error: err } = await appwriteDb
      .from('transaction_categories')
      .update(id, input);
    if (err) { error.value = err.message; return false; }
    await loadCategories();
    return true;
  }

  async function deleteCategory(id: string): Promise<boolean> {
    const { error: err } = await appwriteDb
      .from('transaction_categories')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId.value);
    if (err) { error.value = err.message; return false; }
    await loadCategories();
    return true;
  }

  const expenseCategories = computed(() =>
    categories.value.filter(c => c.type === 'expense' || c.type === 'bank_fee' || c.type === 'tax')
  );
  const incomeCategories = computed(() => categories.value.filter(c => c.type === 'income'));

  return {
    categories, loading, error,
    expenseCategories, incomeCategories,
    loadCategories, createCategory, updateCategory, deleteCategory,
  };
}
