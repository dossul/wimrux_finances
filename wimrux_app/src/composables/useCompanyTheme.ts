// =============================================================================
// WIMRUX® FINANCES — Composable Company Theme (T18.1)
// =============================================================================
import { ref, computed } from 'vue';
import { useCompanyStore } from 'src/stores/company-store';
import { appwriteDb } from 'src/services/appwrite-db';

export interface CompanyTheme {
  id: string;
  company_id: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  dark_mode: boolean;
  logo_url: string | null;
  favicon_url: string | null;
  custom_css: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  html_template: string;
  css_styles: string | null;
  is_default: boolean;
  variables: Array<{ name: string; label: string; default_value: string }>;
  created_at: string;
  updated_at: string;
}

export function useCompanyTheme() {
  const companyStore = useCompanyStore();
  const companyId = computed(() => companyStore.company?.id ?? '');

  const theme = ref<CompanyTheme | null>(null);
  const templates = ref<InvoiceTemplate[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ---------------------------------------------------------------------------
  // THEME
  // ---------------------------------------------------------------------------
  async function loadTheme() {
    const { data } = await appwriteDb
      .from('company_themes')
      .select('*')
      .eq('company_id', companyId.value);
    theme.value = (data && data.length > 0) ? data[0] : null;
  }

  async function saveTheme(updates: Partial<CompanyTheme>) {
    loading.value = true;
    try {
      if (theme.value) {
        const { data, error: err } = await appwriteDb
          .from('company_themes')
          .update(theme.value.id, updates);
        if (err) { error.value = err.message; return; }
        theme.value = data;
      } else {
        const { data, error: err } = await appwriteDb
          .from('company_themes')
          .insert([{ company_id: companyId.value, ...updates }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
        if (err) { error.value = err.message; return; }
        theme.value = data;
      }
    } finally { loading.value = false; }
  }

  // ---------------------------------------------------------------------------
  // TEMPLATES FACTURES
  // ---------------------------------------------------------------------------
  async function loadTemplates() {
    const { data } = await appwriteDb
      .from('invoice_templates')
      .select('*')
      .eq('company_id', companyId.value)
      .order('is_default', { ascending: false });
    templates.value = data || [];
  }

  async function createTemplate(payload: { name: string; html_template: string; css_styles?: string; description?: string }) {
    loading.value = true;
    try {
      const { data, error: err } = await appwriteDb
        .from('invoice_templates')
        .insert([{ company_id: companyId.value, ...payload }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
      if (err) { error.value = err.message; return null; }
      if (data) templates.value.push(data);
      return data as InvoiceTemplate;
    } finally { loading.value = false; }
  }

  async function updateTemplate(id: string, updates: Partial<InvoiceTemplate>) {
    const { data, error: err } = await appwriteDb
      .from('invoice_templates')
      .update(id, updates);
    if (err) { error.value = err.message; return; }
    const idx = templates.value.findIndex(t => t.id === id);
    if (idx !== -1 && data) templates.value[idx] = data;
  }

  async function deleteTemplate(id: string) {
    await appwriteDb.from('invoice_templates').delete().eq('id', id);
    templates.value = templates.value.filter(t => t.id !== id);
  }

  async function setDefaultTemplate(id: string) {
    // Désactiver tous les autres
    await appwriteDb
      .from('invoice_templates')
      .updateWhere({ is_default: false })
      .eq('company_id', companyId.value);
    // Activer celui-ci
    await appwriteDb
      .from('invoice_templates')
      .update(id, { is_default: true });
    templates.value = templates.value.map(t => ({ ...t, is_default: t.id === id }));
  }

  const defaultTemplate = computed(() => templates.value.find(t => t.is_default) ?? templates.value[0] ?? null);

  return {
    theme, templates, loading, error, defaultTemplate,
    loadTheme, saveTheme,
    loadTemplates, createTemplate, updateTemplate, deleteTemplate, setDefaultTemplate,
  };
}
