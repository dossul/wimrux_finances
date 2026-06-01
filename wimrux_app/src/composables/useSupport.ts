// =============================================================================
// WIMRUX® FINANCES — Composable Support (T17.x)
// Tickets, messages, feedback
// =============================================================================
import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import { useAuthStore } from 'src/stores/auth-store';
import { useEmailService } from 'src/composables/useEmailService';

export interface SupportTicket {
  id: string;
  company_id: string;
  user_id: string;
  subject: string;
  description: string;
  category: 'general' | 'bug' | 'feature' | 'billing' | 'other';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: 'user' | 'support' | 'system';
  sender_id: string | null;
  message: string;
  created_at: string;
}

export interface UserFeedback {
  id: string;
  company_id: string;
  user_id: string;
  type: 'suggestion' | 'bug' | 'praise' | 'other';
  page_url: string | null;
  message: string;
  rating: number | null;
  status: 'new' | 'reviewed' | 'actioned' | 'dismissed';
  created_at: string;
}

export function useSupport() {
  const companyStore = useCompanyStore();
  const authStore = useAuthStore();
  const emailService = useEmailService();
  const companyId = computed(() => companyStore.company?.id ?? '');
  const userId = computed(() => authStore.user?.id ?? '');

  const tickets = ref<SupportTicket[]>([]);
  const messages = ref<TicketMessage[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // ---------------------------------------------------------------------------
  // TICKETS
  // ---------------------------------------------------------------------------
  async function loadTickets() {
    loading.value = true;
    try {
      const { data, error: err } = await insforge.database
        .from('support_tickets')
        .select('*')
        .eq('company_id', companyId.value)
        .eq('user_id', userId.value)
        .order('created_at', { ascending: false });
      if (err) { error.value = err.message; return; }
      tickets.value = data || [];
    } finally { loading.value = false; }
  }

  async function createTicket(payload: { subject: string; description: string; category?: string; priority?: string }) {
    loading.value = true;
    try {
      const { data, error: err } = await insforge.database
        .from('support_tickets')
        .insert([{
          company_id: companyId.value,
          user_id: userId.value,
          ...payload,
        }])
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) {
        tickets.value.unshift(data);
        // E07 — Confirmation email ticket créé
        const userEmail = authStore.user?.email;
        const userName = authStore.fullName;
        if (userEmail) {
          try {
            await emailService.sendSupportTicketEmail({
              to: userEmail,
              name: userName || userEmail,
              ticketRef: (data as SupportTicket).id.slice(0, 8).toUpperCase(),
              subject: payload.subject,
              priority: payload.priority ?? 'low',
              category: payload.category ?? 'general',
            });
          } catch { /* non bloquant */ }
        }
      }
      return data as SupportTicket;
    } finally { loading.value = false; }
  }

  async function closeTicket(id: string) {
    await insforge.database
      .from('support_tickets')
      .update({ status: 'closed', resolved_at: new Date().toISOString() })
      .eq('id', id);
    const idx = tickets.value.findIndex(t => t.id === id);
    if (idx !== -1) tickets.value[idx] = { ...tickets.value[idx]!, status: 'closed' };
  }

  // ---------------------------------------------------------------------------
  // MESSAGES
  // ---------------------------------------------------------------------------
  async function loadMessages(ticketId: string) {
    const { data } = await insforge.database
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    messages.value = data || [];
  }

  async function sendMessage(ticketId: string, message: string) {
    const { data, error: err } = await insforge.database
      .from('support_ticket_messages')
      .insert([{
        ticket_id: ticketId,
        sender_type: 'user',
        sender_id: userId.value,
        message,
      }])
      .select()
      .single();
    if (err) { error.value = err.message; return null; }
    if (data) messages.value.push(data);
    return data;
  }

  // ---------------------------------------------------------------------------
  // FEEDBACK
  // ---------------------------------------------------------------------------
  async function submitFeedback(payload: { type: string; message: string; page_url?: string; rating?: number }) {
    const { data, error: err } = await insforge.database
      .from('user_feedback')
      .insert([{
        company_id: companyId.value,
        user_id: userId.value,
        ...payload,
      }])
      .select()
      .single();
    if (err) { error.value = err.message; return null; }
    return data as UserFeedback;
  }

  // ---------------------------------------------------------------------------
  // STATS
  // ---------------------------------------------------------------------------
  const openTickets = computed(() => tickets.value.filter(t => t.status === 'open' || t.status === 'in_progress').length);

  return {
    tickets, messages, loading, error, openTickets,
    loadTickets, createTicket, closeTicket,
    loadMessages, sendMessage,
    submitFeedback,
  };
}
