import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { appwriteDb } from 'src/services/appwrite-db';
import { functions } from 'src/boot/appwrite';
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
      let q = appwriteDb.from('invoices').order('created_at', { ascending: false });
      if (filters?.status) q = q.eq('status', filters.status) as typeof q;
      if (filters?.type) q = q.eq('type', filters.type) as typeof q;
      if (filters?.limit) q = q.limit(filters.limit) as typeof q;
      const { data, error } = await q.select('*');
      if (!error && data) invoices.value = data as Invoice[];
      return { data, error };
    } finally { loading.value = false; }
  }

  async function loadInvoiceById(id: string) {
    const [invRes, itemsRes] = await Promise.all([
      appwriteDb.from('invoices').eq('id', id).single(),
      appwriteDb.from('invoice_items').eq('invoice_id', id).order('sort_order', { ascending: true }).select('*'),
    ]);
    if (invRes.data) currentInvoice.value = invRes.data as Invoice;
    if (itemsRes.data) currentItems.value = itemsRes.data as InvoiceItem[];
    return { invoice: invRes, items: itemsRes };
  }

  async function getNextReference(type: InvoiceType, companyId: string): Promise<string> {
    const year = new Date().getFullYear();
    try {
      const resp = await functions.createExecution(
        'next_invoice_reference',
        JSON.stringify({ p_company_id: companyId, p_type: type, p_year: year })
      );
      if (resp.responseBody) return JSON.parse(resp.responseBody) as string;
    } catch { /* fallback */ }
    const count = invoices.value.filter(i => i.type === type).length + 1;
    return `${type}-${year}-${String(count).padStart(5, '0')}`;
  }

  async function createDraft(type: InvoiceType, companyId: string, operatorName: string) {
    const reference = await getNextReference(type, companyId);
    const { data, error } = await appwriteDb.from('invoices').insert({
      company_id: companyId, type, reference, status: 'draft',
      price_mode: 'TTC', operator_name: operatorName,
    });
    if (!error && data) {
      const created = data as Invoice;
      invoices.value.unshift(created);
      currentInvoice.value = created;
    }
    return { data, error };
  }

  async function updateInvoice(id: string, updates: Partial<Invoice>) {
    const { data, error } = await appwriteDb.from('invoices').update(id, updates);
    if (!error && data) {
      const updated = data as Invoice;
      currentInvoice.value = updated;
      const idx = invoices.value.findIndex(i => i.id === id);
      if (idx >= 0) invoices.value[idx] = updated;
    }
    return { data, error };
  }

  async function saveItems(invoiceId: string, items: Partial<InvoiceItem>[]) {
    const { data: existing } = await appwriteDb.from('invoice_items').eq('invoice_id', invoiceId).select('$id');
    for (const doc of (existing as Array<{ $id: string }> | null) ?? []) {
      const { databases, DATABASE_ID } = await import('src/boot/appwrite');
      await databases.deleteDocument(DATABASE_ID, 'invoice_items', doc.$id);
    }
    if (items.length === 0) return { data: null, error: null };
    return appwriteDb.from('invoice_items').insert(
      items.map((item, idx) => ({
        invoice_id: invoiceId,
        code: item.code || `ART${String(idx + 1).padStart(3, '0')}`,
        name: item.name, type: item.type, price: item.price, quantity: item.quantity,
        unit: item.unit || 'unité', tax_group: item.tax_group,
        specific_tax: item.specific_tax || 0, discount: item.discount || 0,
        amount_ht: item.amount_ht, amount_tva: item.amount_tva,
        amount_psvb: item.amount_psvb, amount_ttc: item.amount_ttc, sort_order: idx,
      }))
    );
  }

  async function deleteDraft(id: string) {
    const target = invoices.value.find(i => i.id === id);
    if (target && target.status !== 'draft') {
      return { data: null, error: { message: 'Seuls les brouillons peuvent être supprimés' } };
    }
    const { data: items } = await appwriteDb.from('invoice_items').eq('invoice_id', id).select('$id');
    const { databases, DATABASE_ID } = await import('src/boot/appwrite');
    for (const doc of (items as Array<{ $id: string }> | null) ?? []) {
      await databases.deleteDocument(DATABASE_ID, 'invoice_items', doc.$id);
    }
    const { error } = await databases.deleteDocument(DATABASE_ID, 'invoices', id).then(
      () => ({ error: null }), (e: Error) => ({ error: e })
    );
    if (!error) {
      invoices.value = invoices.value.filter(i => i.id !== id);
      if (currentInvoice.value?.id === id) { currentInvoice.value = null; currentItems.value = []; }
    }
    return { data: null, error };
  }

  function clearCurrent() { currentInvoice.value = null; currentItems.value = []; }

  return {
    invoices, currentInvoice, currentItems, loading,
    draftCount, pendingCount, approvedCount, certifiedCount, totalTTCThisMonth,
    loadInvoices, loadInvoiceById, createDraft, updateInvoice, saveItems, deleteDraft, clearCurrent,
  };
});
