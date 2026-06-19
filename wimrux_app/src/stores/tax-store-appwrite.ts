import { defineStore } from 'pinia';
import { ref } from 'vue';
import { appwriteDb } from 'src/services';
import { Query } from 'appwrite';
import type { WithholdingTax, TaxDeclaration } from 'src/composables/useTaxDeclarations';

export const useTaxStore = defineStore('tax', () => {
  const withholdings = ref<WithholdingTax[]>([]);
  const declarations = ref<TaxDeclaration[]>([]);
  const loading = ref(false);

  async function loadWithholdings(companyId: string) {
    loading.value = true;
    try {
      const { data, error } = await appwriteDb
        .from('withholding_taxes')
        .query([Query.equal('company_id', companyId), Query.orderDesc('$createdAt')])
        .select();
      if (!error && data) {
        withholdings.value = data as WithholdingTax[];
      }
      return { data, error };
    } finally {
      loading.value = false;
    }
  }

  async function loadDeclarations(companyId: string) {
    loading.value = true;
    try {
      const { data, error } = await appwriteDb
        .from('tax_declarations')
        .query([Query.equal('company_id', companyId), Query.orderDesc('$createdAt')])
        .select();
      if (!error && data) {
        declarations.value = data as TaxDeclaration[];
      }
      return { data, error };
    } finally {
      loading.value = false;
    }
  }

  return {
    withholdings,
    declarations,
    loading,
    loadWithholdings,
    loadDeclarations,
  };
});

export default useTaxStore;
