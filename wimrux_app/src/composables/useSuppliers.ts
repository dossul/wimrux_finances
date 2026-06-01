// =============================================================================
// WIMRUX® FINANCES — Gestion des fournisseurs
// =============================================================================
import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import type { Supplier } from 'src/types';

export function useSuppliers() {
  const suppliers    = ref<Supplier[]>([]);
  const loading      = ref(false);
  const error        = ref<string | null>(null);
  const companyStore = useCompanyStore();

  async function loadSuppliers(opts?: { search?: string; is_active?: boolean }) {
    loading.value = true;
    error.value   = null;
    try {
      let q = insforge.database
        .from('suppliers')
        .select('*')
        .eq('company_id', companyStore.company!.id)
        .order('name');

      if (opts?.is_active !== undefined) q = q.eq('is_active', opts.is_active);
      if (opts?.search)                  q = q.ilike('name', `%${opts.search}%`);

      const { data, error: err } = await q;
      if (err) { error.value = err.message; return; }
      suppliers.value = data || [];
    } finally {
      loading.value = false;
    }
  }

  async function createSupplier(payload: Omit<Supplier, 'id' | 'company_id' | 'created_at' | 'updated_at'>) {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await insforge.database
        .from('suppliers')
        .insert([{ ...payload, company_id: companyStore.company!.id, is_active: true }])
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) suppliers.value.push(data);
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function updateSupplier(id: string, payload: Partial<Supplier>) {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await insforge.database
        .from('suppliers')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', companyStore.company!.id)
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) {
        const idx = suppliers.value.findIndex(s => s.id === id);
        if (idx !== -1) suppliers.value[idx] = data;
      }
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function deleteSupplier(id: string) {
    loading.value = true;
    error.value   = null;
    try {
      const { error: err } = await insforge.database
        .from('suppliers')
        .delete()
        .eq('id', id)
        .eq('company_id', companyStore.company!.id);
      if (err) { error.value = err.message; return false; }
      suppliers.value = suppliers.value.filter(s => s.id !== id);
      return true;
    } finally {
      loading.value = false;
    }
  }

  const activeSuppliers = computed(() => suppliers.value.filter(s => s.is_active));

  const supplierOptions = computed(() =>
    activeSuppliers.value.map(s => ({ label: s.name, value: s.id, ifu: s.ifu }))
  );

  return {
    suppliers,
    loading,
    error,
    activeSuppliers,
    supplierOptions,
    loadSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  };
}
