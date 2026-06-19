import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { appwriteDb } from 'src/services';
import { ID, Query } from 'appwrite';
import type { Invoice, InvoiceItem, InvoiceType, InvoiceStatus } from 'src/types';

export const useInvoiceStore = defineStore('invoice', () => {
  const invoices = ref<Invoice[]>([]);
  const currentInvoice = ref<Invoice | null>(null);
  const currentItems = ref<InvoiceItem[]>([]);
  const loading = ref(false);

  const draftCount = computed(() => invoices.value.filter(i => i.status === 'draft').length);
  const pendingCount = computed(() => invoices.value.filter(i => i.status === 'pending_validation').length);
  const approvedCount = computed(() => invoices.value.filter(i => i.status === 'approved').length);
  const certifiedCount = computed(() => invoices.value.filter(i => i.status === 'certified').length);
  const totalTTCThisMonth = computed(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return invoices.value
      .filter(i => i.status === 'certified' && new Date(i.created_at) >= start)
      .reduce((sum, i) => sum + (i.total_ttc || 0), 0);
  });

  async function loadInvoices(filters?: { status?: InvoiceStatus; type?: InvoiceType; limit?: number }) {
    loading.value = true;
    try {
      const queries: string[] = [];
      
      if (filters?.status) queries.push(Query.equal('status', filters.status));
      if (filters?.type) queries.push(Query.equal('type', filters.type));
      
      queries.push(Query.orderDesc('$createdAt'));
      if (filters?.limit) queries.push(Query.limit(filters.limit));

      const { data, error } = await appwriteDb
        .from('invoices')
        .query(queries)
        .select();

      if (!error && data) {
        invoices.value = data as Invoice[];
      }
      return { data, error };
    } finally {
      loading.value = false;
    }
  }

  async function loadInvoiceById(id: string) {
    const [invRes, itemsRes] = await Promise.all([
      appwriteDb.getById('invoices', id),
      appwriteDb
        .from('invoice_items')
        .query([Query.equal('invoice_id', id), Query.orderAsc('sort_order')])
        .select(),
    ]);

    if (invRes.data) currentInvoice.value = invRes.data as Invoice;
    if (itemsRes.data) currentItems.value = itemsRes.data as InvoiceItem[];

    return { invoice: invRes, items: itemsRes };
  }

  // Generate next invoice reference
  // Note: For production, this should be handled by an Appwrite Function
  // to ensure atomic increment without race conditions
  async function getNextReference(type: InvoiceType, companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    
    try {
      // Query to count existing invoices of this type this year
      const { data: existing } = await appwriteDb
        .from('invoices')
        .query([
          Query.equal('type', type),
          Query.equal('company_id', companyId),
          Query.greaterThanEqual('$createdAt', `${year}-01-01T00:00:00.000Z`),
          Query.lessThanEqual('$createdAt', `${year}-12-31T23:59:59.999Z`),
        ])
        .select();
      
      const count = existing?.length || 0;
      return `${type}-${year}-${String(count + 1).padStart(5, '0')}`;
    } catch (err) {
      console.warn('[InvoiceStore] Error generating reference:', err);
      // Fallback
      const count = invoices.value.filter(i => i.type === type).length + 1;
      return `${type}-${year}-${String(count).padStart(5, '0')}`;
    }
  }

  async function createDraft(type: InvoiceType, companyId: string, operatorName: string) {
    const reference = await getNextReference(type, companyId);
    const invoiceId = ID.unique();

    const { data, error } = await appwriteDb
      .from('invoices')
      .insert({
        id: invoiceId,
        company_id: companyId,
        type,
        reference,
        status: 'draft',
        price_mode: 'TTC',
        operator_name: operatorName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (!error && data) {
      // Build invoice object with all required fields
      const now = new Date().toISOString();
      const created = { 
        id: invoiceId, 
        company_id: companyId,
        type,
        reference,
        status: 'draft',
        price_mode: 'TTC',
        operator_name: operatorName,
        created_at: now,
        // Required Invoice fields with defaults
        client_id: null,
        original_invoice_id: null,
        credit_note_nature: null,
        comments: [],
        tax_calculation: null,
        total_ht: 0,
        total_tva: 0,
        total_psvb: 0,
        total_ttc: 0,
        stamp_duty: 0,
        total_payment: 0,
        mcf_uid: null,
        fiscal_number: null,
        code_secef_dgi: null,
        qr_code: null,
        signature: null,
        nim: null,
        counters: null,
        certification_datetime: null,
        proforma_converted_to: null,
        pdf_url: null,
        validated_at: null,
        certified_at: null,
        submitted_by: null,
        submitted_at: null,
        approved_by: null,
        approved_at: null,
        rejected_by: null,
        rejected_at: null,
        rejection_reason: null,
      } as Invoice;
      invoices.value.unshift(created);
      currentInvoice.value = created;
    }
    return { data, error };
  }

  async function updateInvoice(id: string, updates: Partial<Invoice>) {
    const { data, error } = await appwriteDb
      .from('invoices')
      .update(id, {
        ...updates,
        updated_at: new Date().toISOString(),
      });

    if (!error && data) {
      const updated = { ...currentInvoice.value, ...updates } as Invoice;
      currentInvoice.value = updated;
      const idx = invoices.value.findIndex(i => i.id === id);
      if (idx >= 0) invoices.value[idx] = updated;
    }
    return { data, error };
  }

  async function saveItems(invoiceId: string, items: Partial<InvoiceItem>[]) {
    // Delete existing items first
    const { data: existingItems } = await appwriteDb
      .from('invoice_items')
      .query([Query.equal('invoice_id', invoiceId)])
      .select();
    
    if (existingItems) {
      for (const item of existingItems) {
        await appwriteDb.deleteById('invoice_items', item.id);
      }
    }

    if (items.length === 0) return { data: null, error: null };

    // Insert new items
    const itemsToInsert = items.map((item, idx) => ({
      id: ID.unique(),
      invoice_id: invoiceId,
      code: item.code || `ART${String(idx + 1).padStart(3, '0')}`,
      name: item.name,
      type: item.type,
      price: item.price,
      quantity: item.quantity,
      unit: item.unit || 'unité',
      tax_group: item.tax_group,
      specific_tax: item.specific_tax || 0,
      discount: item.discount || 0,
      amount_ht: item.amount_ht,
      amount_tva: item.amount_tva,
      amount_psvb: item.amount_psvb,
      amount_ttc: item.amount_ttc,
      sort_order: idx,
      created_at: new Date().toISOString(),
    }));

    const results = [];
    for (const item of itemsToInsert) {
      const result = await appwriteDb.from('invoice_items').insert(item);
      if (result.data) results.push(result.data);
    }

    return { data: results, error: null };
  }

  async function deleteDraft(id: string) {
    // Security: only drafts can be deleted
    const target = invoices.value.find(i => i.id === id);
    if (target && target.status !== 'draft') {
      return { data: null, error: { message: 'Seuls les brouillons peuvent être supprimés' } };
    }

    // Delete items first (FK relationship)
    const { data: items } = await appwriteDb
      .from('invoice_items')
      .query([Query.equal('invoice_id', id)])
      .select();
    
    if (items) {
      for (const item of items) {
        await appwriteDb.deleteById('invoice_items', item.id);
      }
    }

    // Delete invoice
    const { error } = await appwriteDb.deleteById('invoices', id);

    if (!error) {
      invoices.value = invoices.value.filter(i => i.id !== id);
      if (currentInvoice.value?.id === id) {
        currentInvoice.value = null;
        currentItems.value = [];
      }
    }
    return { data: null, error };
  }

  function clearCurrent() {
    currentInvoice.value = null;
    currentItems.value = [];
  }

  return {
    invoices,
    currentInvoice,
    currentItems,
    loading,
    draftCount,
    pendingCount,
    approvedCount,
    certifiedCount,
    totalTTCThisMonth,
    loadInvoices,
    loadInvoiceById,
    createDraft,
    updateInvoice,
    saveItems,
    deleteDraft,
    clearCurrent,
  };
});

export default useInvoiceStore;
