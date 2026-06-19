import { ref } from 'vue';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import type { BankAccountFull } from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';

export function useBankAccounts() {
  const accounts      = ref<BankAccountFull[]>([]);
  const loading       = ref(false);
  const error         = ref<string | null>(null);
  const companyStore  = useCompanyStore();

  async function loadAccounts() {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await appwriteDb
        .from('bank_accounts')
        .select('*')
        .order('bank_name');
      if (err) { error.value = err.message; return; }
      accounts.value = (data || []) as BankAccountFull[];
    } finally {
      loading.value = false;
    }
  }

  async function createAccount(payload: Omit<BankAccountFull, 'id' | 'created_at' | 'updated_at' | 'company_id'>) {
    const company_id = companyStore.company?.id;
    if (!company_id) throw new Error('Entreprise non chargée');
    const { data, error: err } = await appwriteDb
      .from('bank_accounts')
      .insert([{ ...payload, company_id }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
    if (err) throw new Error(err.message);
    const created = data as BankAccountFull;
    accounts.value.push(created);
    return created;
  }

  async function updateAccount(id: string, updates: Partial<BankAccountFull>) {
    const { data, error: err } = await appwriteDb
      .from('bank_accounts')
      .update(id, { ...updates, updated_at: new Date().toISOString() })
    if (err) throw new Error(err.message);
    const updated = data as BankAccountFull;
    const idx = accounts.value.findIndex(a => a.id === id);
    if (idx !== -1) accounts.value[idx] = updated;
    return updated;
  }

  async function toggleActive(id: string, is_active: boolean) {
    return updateAccount(id, { is_active });
  }

  async function deleteAccount(id: string) {
    const { error: err } = await appwriteDb
      .from('bank_accounts')
      .delete()
      .eq('id', id);
    if (err) throw new Error(err.message);
    accounts.value = accounts.value.filter(a => a.id !== id);
  }

  return {
    accounts,
    loading,
    error,
    loadAccounts,
    createAccount,
    updateAccount,
    toggleActive,
    deleteAccount,
  };
}
