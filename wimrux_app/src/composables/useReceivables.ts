// =============================================================================
// WIMRUX® FINANCES — Balance âgée des créances (T3.2) + Relances (T3.3)
// =============================================================================
import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import { useEmailService } from 'src/composables/useEmailService';
import type { ClientReceivable, ReminderTemplate, ReminderLog, ReminderChannel } from 'src/types';

export function useReceivables() {
  const receivables       = ref<ClientReceivable[]>([]);
  const reminderTemplates = ref<ReminderTemplate[]>([]);
  const reminderLogs      = ref<ReminderLog[]>([]);
  const loading           = ref(false);
  const error             = ref<string | null>(null);
  const companyStore      = useCompanyStore();
  const emailService      = useEmailService();

  // ---------------------------------------------------------------------------
  // BALANCE ÂGÉE (vue v_client_receivables)
  // ---------------------------------------------------------------------------
  async function loadReceivables() {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await insforge.database
        .from('v_client_receivables')
        .select('*')
        .eq('company_id', companyStore.company!.id)
        .gt('outstanding_amount', 0)
        .order('outstanding_amount', { ascending: false });
      if (err) { error.value = err.message; return; }
      receivables.value = data || [];
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // STATS GLOBALES
  // ---------------------------------------------------------------------------
  const globalStats = computed(() => {
    const total       = receivables.value.reduce((s, r) => s + Number(r.outstanding_amount), 0);
    const b0_30       = receivables.value.reduce((s, r) => s + Number(r.bucket_0_30), 0);
    const b31_60      = receivables.value.reduce((s, r) => s + Number(r.bucket_31_60), 0);
    const b61_90      = receivables.value.reduce((s, r) => s + Number(r.bucket_61_90), 0);
    const bOver90     = receivables.value.reduce((s, r) => s + Number(r.bucket_over_90), 0);
    const clientCount = receivables.value.length;
    const overdueAmt  = b31_60 + b61_90 + bOver90;
    const overdueRate = total > 0 ? (overdueAmt / total) * 100 : 0;
    return { total, b0_30, b31_60, b61_90, bOver90, clientCount, overdueAmt, overdueRate };
  });

  // ---------------------------------------------------------------------------
  // TEMPLATES DE RELANCE
  // ---------------------------------------------------------------------------
  async function loadReminderTemplates() {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await insforge.database
        .from('reminder_templates')
        .select('*')
        .eq('company_id', companyStore.company!.id)
        .order('send_order');
      if (err) { error.value = err.message; return; }
      reminderTemplates.value = data || [];
    } finally {
      loading.value = false;
    }
  }

  async function createReminderTemplate(payload: Omit<ReminderTemplate, 'id' | 'company_id' | 'created_at' | 'updated_at'>) {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await insforge.database
        .from('reminder_templates')
        .insert([{ ...payload, company_id: companyStore.company!.id }])
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) reminderTemplates.value.push(data);
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function updateReminderTemplate(id: string, payload: Partial<ReminderTemplate>) {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await insforge.database
        .from('reminder_templates')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('company_id', companyStore.company!.id)
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      if (data) {
        const idx = reminderTemplates.value.findIndex(t => t.id === id);
        if (idx !== -1) reminderTemplates.value[idx] = data;
      }
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function deleteReminderTemplate(id: string) {
    loading.value = true;
    error.value   = null;
    try {
      const { error: err } = await insforge.database
        .from('reminder_templates')
        .delete()
        .eq('id', id)
        .eq('company_id', companyStore.company!.id);
      if (err) { error.value = err.message; return false; }
      reminderTemplates.value = reminderTemplates.value.filter(t => t.id !== id);
      return true;
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // ENVOYER UNE RELANCE (log + email réel)
  // ---------------------------------------------------------------------------
  async function sendReminder(opts: {
    invoice_id: string;
    template_id?: string;
    channel: ReminderChannel;
    recipient: string;
    subject: string;
    body: string;
    client_name?: string;
    invoice_ref?: string;
    amount?: string;
    due_date?: string;
  }) {
    loading.value = true;
    error.value   = null;
    try {
      // E04 — Envoi email réel si canal email
      if (opts.channel === 'email' && opts.recipient) {
        try {
          await emailService.sendReminderEmail({
            to: opts.recipient,
            clientName: opts.client_name ?? opts.recipient,
            invoiceRef: opts.invoice_ref ?? opts.invoice_id,
            amount: opts.amount ?? '',
            dueDate: opts.due_date ?? '',
            customMessage: opts.body,
            subject: opts.subject,
          });
        } catch (emailErr) {
          console.warn('Email relance failed:', emailErr);
        }
      }

      const { data, error: err } = await insforge.database
        .from('reminder_logs')
        .insert([{
          invoice_id: opts.invoice_id,
          template_id: opts.template_id,
          channel: opts.channel,
          recipient: opts.recipient,
          subject: opts.subject,
          body: opts.body,
          company_id: companyStore.company!.id,
          status: 'sent',
          sent_at: new Date().toISOString(),
        }])
        .select()
        .single();
      if (err) { error.value = err.message; return null; }
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function loadReminderLogs(invoiceId: string) {
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await insforge.database
        .from('reminder_logs')
        .select('*')
        .eq('invoice_id', invoiceId)
        .eq('company_id', companyStore.company!.id)
        .order('sent_at', { ascending: false });
      if (err) { error.value = err.message; return; }
      reminderLogs.value = data || [];
    } finally {
      loading.value = false;
    }
  }

  // ---------------------------------------------------------------------------
  // INTERPOLER un template avec les données d'une facture
  // ---------------------------------------------------------------------------
  function interpolateTemplate(
    template: string,
    vars: Record<string, string | number | null>
  ): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(vars[key] ?? `{{${key}}}`));
  }

  // ---------------------------------------------------------------------------
  // EXPORT CSV balance âgée
  // ---------------------------------------------------------------------------
  function exportReceivablesCSV(): void {
    const header = 'Client;Email;Encours total;0-30j;31-60j;61-90j;>90j;Échéance la plus ancienne\n';
    const rows   = receivables.value.map(r =>
      [
        `"${r.client_name}"`,
        r.client_email ?? '',
        Number(r.outstanding_amount).toFixed(0),
        Number(r.bucket_0_30).toFixed(0),
        Number(r.bucket_31_60).toFixed(0),
        Number(r.bucket_61_90).toFixed(0),
        Number(r.bucket_over_90).toFixed(0),
        r.oldest_unpaid_due ?? '',
      ].join(';')
    ).join('\n');
    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `balance-agee-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    receivables,
    reminderTemplates,
    reminderLogs,
    loading,
    error,
    globalStats,
    loadReceivables,
    loadReminderTemplates,
    createReminderTemplate,
    updateReminderTemplate,
    deleteReminderTemplate,
    sendReminder,
    loadReminderLogs,
    interpolateTemplate,
    exportReceivablesCSV,
  };
}
