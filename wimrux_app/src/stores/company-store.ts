import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
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

  async function uploadLogo(file: File): Promise<{ url: string | null; error: Error | null }> {
    if (!company.value) return { url: null, error: new Error('No company') };
    const ext = file.name.split('.').pop() ?? 'png';
    const path = `${company.value.id}/logo.${ext}`;
    const { data, error } = await insforge.storage
      .from('company-logos')
      .upload(path, file);
    if (error || !data) return { url: null, error: error as Error };
    const url: string = (data as { url: string }).url;
    await updateCompany({ logo_url: url });
    return { url, error: null };
  }

  async function deleteLogo(): Promise<void> {
    if (!company.value?.logo_url) return;
    const path = company.value.logo_url.split('/company-logos/').pop() ?? '';
    await insforge.storage.from('company-logos').remove(path);
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
    const merged = { ...current, ...settings, colors: { ...(current as InvoiceSettings).colors, ...(settings.colors ?? {}) } };
    await updateCompany({ invoice_settings: merged as InvoiceSettings });
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
    uploadLogo,
    deleteLogo,
    updateFiscalConfig,
    updateInvoiceSettings,
  };
});
