// =============================================================================
// WIMRUX® FINANCES — Cartes bancaires par locataire SaaS (payment_cards)
// Réseau : visa | mastercard | amex | other
// Type   : debit | credit
// =============================================================================
import { ref } from 'vue';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import { appwriteDb } from 'src/services/appwrite-db';

export interface PaymentCard {
  id:              string;
  company_id:      string;
  label:           string | null;
  network:         'visa' | 'mastercard' | 'amex' | 'other';
  card_type:       'debit' | 'credit';
  bin_6:           string | null;   // 6 premiers chiffres (BIN)
  last_4:          string;          // 4 derniers chiffres
  expiry_month:    number;
  expiry_year:     number;
  bank_name:       string | null;
  bank_account_id: string | null;
  is_active:       boolean;
  created_at:      string;
}

export type PaymentCardCreate = Omit<PaymentCard, 'id' | 'created_at' | 'company_id'>;

export function usePaymentCards() {
  const cards        = ref<PaymentCard[]>([]);
  const loading      = ref(false);
  const error        = ref<string | null>(null);
  const companyStore = useCompanyStore();

  async function loadCards() {
    if (!companyStore.company?.id) return;
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await appwriteDb
        .from('payment_cards')
        .select('*')
        .eq('company_id', companyStore.company.id)
        .eq('is_active', true)
        .order('$createdAt', { ascending: false });
      if (err) { error.value = err.message; return; }
      cards.value = (data || []) as PaymentCard[];
    } finally {
      loading.value = false;
    }
  }

  async function createCard(payload: PaymentCardCreate): Promise<PaymentCard | null> {
    if (!companyStore.company?.id) return null;
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await appwriteDb
        .from('payment_cards')
        .insert([{ ...payload, company_id: companyStore.company.id }]).then(r=>({data:Array.isArray(r.data)?r.data[0]:r.data,error:r.error}));
      if (err) { error.value = err.message; return null; }
      const created = data as PaymentCard;
      cards.value.unshift(created);
      return created;
    } finally {
      loading.value = false;
    }
  }

  async function updateCard(id: string, updates: Partial<PaymentCardCreate>): Promise<PaymentCard | null> {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await appwriteDb
        .from('payment_cards')
        .update(id, { ...updates, updated_at: new Date().toISOString() })
      if (err) { error.value = err.message; return null; }
      const updated = data as PaymentCard;
      const idx = cards.value.findIndex(c => c.id === id);
      if (idx !== -1) cards.value[idx] = updated;
      return updated;
    } finally {
      loading.value = false;
    }
  }

  async function deleteCard(id: string) {
    return updateCard(id, { is_active: false });
  }

  // Helper : libellé formaté pour afficher dans un select
  function cardLabel(card: PaymentCard): string {
    const net  = card.network.toUpperCase();
    const type = card.card_type === 'debit' ? 'Débit' : 'Crédit';
    const exp  = `${String(card.expiry_month).padStart(2,'0')}/${card.expiry_year}`;
    const name = card.label ?? card.bank_name ?? '';
    return `${net} ${type} •••• ${card.last_4}  ${exp}${name ? '  · ' + name : ''}`;
  }

  return { cards, loading, error, loadCards, createCard, updateCard, deleteCard, cardLabel };
}
