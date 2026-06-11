import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { appwriteDb, appwriteStorage } from 'src/services';
import { ID, Query } from 'appwrite';
import type { Company, InvoiceSettings, FiscalProfile, FiscalConfig } from 'src/types';


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
      // Appwrite Query uses Query.equal() syntax
      const { data, error } = await appwriteDb
        .from('companies')
        .query([Query.equal('$id', userCompanyId)])
        .select();

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

  // Load all companies for a user (via user profile company_id)
  async function loadUserCompanies(companyIds: string[]) {
    loading.value = true;
    try {
      const { data, error } = await appwriteDb
        .from('companies')
        .query([Query.equal('$id', companyIds)])
        .select();

      if (!error && data) {
        companies.value = data as Company[];
        if (companies.value.length > 0 && !company.value) {
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
    
    // Appwrite update requires the document ID as first param
    const { data, error } = await appwriteDb
      .from('companies')
      .update(company.value.id, updates);

    if (!error && data) {
      company.value = { ...company.value, ...(data as Company) };
    }
    return { data, error };
  }

  async function uploadLogo(file: File): Promise<{ url: string | null; error: Error | null }> {
    if (!company.value) return { url: null, error: new Error('No company') };
    
    const ext = file.name.split('.').pop() ?? 'png';
    const fileId = ID.unique();
    const fileName = `logo-${company.value.id}.${ext}`;
    
    const { data, error } = await appwriteStorage.upload(
      'company-logos',
      file,
      fileName
    );
    
    if (error || !data) return { url: null, error };
    
    await updateCompany({ logo_url: data.url });
    return { url: data.url, error: null };
  }

  async function deleteLogo(): Promise<void> {
    if (!company.value?.logo_url) return;
    
    // Extract file ID from URL
    const urlParts = company.value.logo_url.split('/');
    const fileId = urlParts[urlParts.length - 1];
    
    if (fileId) {
      await appwriteStorage.delete('company-logos', fileId);
    }
    
    await updateCompany({ logo_url: null });
  }

  async function updateFiscalConfig(
    profile: FiscalProfile,
    config: FiscalConfig,
  ): Promise<void> {
    await updateCompany({ fiscal_profile: profile, fiscal_config: config });
  }

  async function updateInvoiceSettings(settings: Partial<InvoiceSettings>): Promise<void> {
    if (!company.value) return;
    const current = company.value.invoice_settings ?? {};
    const merged = { 
      ...current, 
      ...settings, 
      colors: { 
        ...(current as InvoiceSettings).colors, 
        ...(settings.colors ?? {}) 
      } 
    };
    await updateCompany({ invoice_settings: merged as InvoiceSettings });
  }

  async function createCompany(newCompany: Omit<Company, 'id' | 'created_at'>) {
    // Appwrite requires explicit ID generation
    const companyId = ID.unique();
    
    const { data, error } = await appwriteDb
      .from('companies')
      .insert({
        id: companyId,
        ...newCompany,
        created_at: new Date().toISOString(),
      });

    if (!error && data) {
      const created = { ...newCompany, id: companyId, created_at: new Date().toISOString() } as Company;
      companies.value.push(created);
      company.value = created;
    }
    return { data, error };
  }

  // Load company by ID (for admin operations)
  async function getCompanyById(id: string): Promise<Company | null> {
    const { data, error } = await appwriteDb.getById('companies', id);
    if (error || !data) return null;
    return data as Company;
  }

  // Search companies by name
  async function searchCompanies(searchTerm: string, limit = 20): Promise<Company[]> {
    const { data, error } = await appwriteDb
      .from('companies')
      .query([Query.search('name', searchTerm), Query.limit(limit)])
      .select();
    
    if (error || !data) return [];
    return data as Company[];
  }

  return {
    company,
    companies,
    loading,
    companyId,
    companyName,
    companyIfu,
    loadCompanies,
    loadUserCompanies,
    setActiveCompany,
    updateCompany,
    createCompany,
    getCompanyById,
    searchCompanies,
    uploadLogo,
    deleteLogo,
    updateFiscalConfig,
    updateInvoiceSettings,
  };
});

export default useCompanyStore;
