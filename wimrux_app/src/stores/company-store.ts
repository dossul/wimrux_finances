import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import type { Company } from 'src/types';

export const useCompanyStore = defineStore('company', () => {
  const company = ref<Company | null>(null);
  const companies = ref<Company[]>([]);
  const loading = ref(false);

  const companyId = computed(() => company.value?.id ?? null);
  const companyName = computed(() => company.value?.name ?? '');
  const companyIfu = computed(() => company.value?.ifu ?? '');

  async function loadCompanies(userCompanyId: string) {
    loading.value = true;
    try {
      const { data, error } = await insforge.database
        .from('companies')
        .select('*')
        .eq('id', userCompanyId);

      if (!error && data) {
        companies.value = data as Company[];
        if (companies.value.length > 0) {
          company.value = companies.value[0] ?? null;
        }
      }
    } finally {
      loading.value = false;
    }
  }

  function setActiveCompany(c: Company) {
    company.value = c;
  }

  async function updateCompany(updates: Partial<Company>) {
    if (!company.value) return;
    const { data, error } = await insforge.database
      .from('companies')
      .update(updates)
      .eq('id', company.value.id)
      .select()
      .single();

    if (!error && data) {
      company.value = data as Company;
    }
    return { data, error };
  }

  async function createCompany(newCompany: Omit<Company, 'id' | 'created_at'>) {
    const { data, error } = await insforge.database
      .from('companies')
      .insert(newCompany)
      .select()
      .single();

    if (!error && data) {
      const created = data as Company;
      companies.value.push(created);
      company.value = created;
    }
    return { data, error };
  }

  return {
    company,
    companies,
    loading,
    companyId,
    companyName,
    companyIfu,
    loadCompanies,
    setActiveCompany,
    updateCompany,
    createCompany,
  };
});
