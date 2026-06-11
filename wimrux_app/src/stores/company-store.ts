import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { appwriteDb } from 'src/services/appwrite-db';
import { appwriteStorage } from 'src/services/appwrite-storage';
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
      const { data, error } = await appwriteDb.from('companies').eq('id', userCompanyId).select('*');
      if (!error && data) {
        companies.value = data as Company[];
        if (companies.value.length > 0) company.value = companies.value[0] ?? null;
      }
    } finally { loading.value = false; }
  }

  function setActiveCompany(c: Company) { company.value = c; }

  async function updateCompany(updates: Partial<Company>) {
    if (!company.value) return;
    const { data, error } = await appwriteDb.from('companies').update(company.value.id, updates);
    if (!error && data) company.value = data as Company;
    return { data, error };
  }

  async function uploadLogo(file: File): Promise<{ url: string | null; error: Error | null }> {
    if (!company.value) return { url: null, error: new Error('No company') };
    const ext = file.name.split('.').pop() ?? 'png';
    const fileName = `${company.value.id}/logo.${ext}`;
    const { data, error } = await appwriteStorage.upload('company-logos', file, fileName);
    if (error || !data) return { url: null, error: error as Error };
    await updateCompany({ logo_url: data.url });
    return { url: data.url, error: null };
  }

  async function deleteLogo(): Promise<void> {
    if (!company.value?.logo_url) return;
    const fileId = company.value.logo_url.split('/').pop() ?? '';
    await appwriteStorage.remove('company-logos', fileId);
    await updateCompany({ logo_url: null });
  }

  async function updateFiscalConfig(profile: FiscalProfile, config: FiscalConfig): Promise<void> {
    await updateCompany({ fiscal_profile: profile, fiscal_config: config });
  }

  async function updateInvoiceSettings(settings: Partial<InvoiceSettings>): Promise<void> {
    if (!company.value) return;
    const current = company.value.invoice_settings ?? {};
    const merged = { ...current, ...settings, colors: { ...(current as InvoiceSettings).colors, ...(settings.colors ?? {}) } };
    await updateCompany({ invoice_settings: merged as InvoiceSettings });
  }

  async function createCompany(newCompany: Omit<Company, 'id' | 'created_at'>) {
    const { data, error } = await appwriteDb.from('companies').insert(newCompany);
    if (!error && data) {
      const created = data as Company;
      companies.value.push(created);
      company.value = created;
    }
    return { data, error };
  }

  return {
    company, companies, loading, companyId, companyName, companyIfu,
    loadCompanies, setActiveCompany, updateCompany, createCompany,
    uploadLogo, deleteLogo, updateFiscalConfig, updateInvoiceSettings,
  };
});
