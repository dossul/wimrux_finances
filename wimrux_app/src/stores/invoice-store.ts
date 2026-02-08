import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import type { Invoice, InvoiceItem, InvoiceType, InvoiceStatus } from 'src/types';

export const useInvoiceStore = defineStore('invoice', () => {
  const invoices = ref<Invoice[]>([]);
  const currentInvoice = ref<Invoice | null>(null);
  const currentItems = ref<InvoiceItem[]>([]);
  const loading = ref(false);

  const draftCount = computed(() => invoices.value.filter(i => i.status === 'draft').length);
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
      let query = insforge.database
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.type) query = query.eq('type', filters.type);
      if (filters?.limit) query = query.limit(filters.limit);

      const { data, error } = await query;
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
      insforge.database.from('invoices').select('*').eq('id', id).single(),
      insforge.database.from('invoice_items').select('*').eq('invoice_id', id).order('sort_order', { ascending: true }),
    ]);

    if (invRes.data) currentInvoice.value = invRes.data as Invoice;
    if (itemsRes.data) currentItems.value = itemsRes.data as InvoiceItem[];

    return { invoice: invRes, items: itemsRes };
  }

  async function createDraft(type: InvoiceType, companyId: string, operatorName: string) {
    const year = new Date().getFullYear();
    const count = invoices.value.filter(i => i.type === type).length + 1;
    const reference = `${type}-${year}-${String(count).padStart(5, '0')}`;

    const { data, error } = await insforge.database
      .from('invoices')
      .insert({
        company_id: companyId,
        type,
        reference,
        status: 'draft',
        price_mode: 'TTC',
        operator_name: operatorName,
      })
      .select()
      .single();

    if (!error && data) {
      const created = data as Invoice;
      invoices.value.unshift(created);
      currentInvoice.value = created;
    }
    return { data, error };
  }

  async function updateInvoice(id: string, updates: Partial<Invoice>) {
    const { data, error } = await insforge.database
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      const updated = data as Invoice;
      currentInvoice.value = updated;
      const idx = invoices.value.findIndex(i => i.id === id);
      if (idx >= 0) invoices.value[idx] = updated;
    }
    return { data, error };
  }

  async function saveItems(invoiceId: string, items: Partial<InvoiceItem>[]) {
    // Delete existing items and re-insert
    await insforge.database.from('invoice_items').delete().eq('invoice_id', invoiceId);

    if (items.length === 0) return { data: null, error: null };

    const { data, error } = await insforge.database.from('invoice_items').insert(
      items.map((item, idx) => ({
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
      }))
    );

    return { data, error };
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
    certifiedCount,
    totalTTCThisMonth,
    loadInvoices,
    loadInvoiceById,
    createDraft,
    updateInvoice,
    saveItems,
    clearCurrent,
  };
});
