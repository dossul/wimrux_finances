import { useAuthStore } from 'src/stores/auth-store';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT as string;

export type EmailTemplate =
  | 'otp'
  | 'welcome'
  | 'reset_password'
  | 'reminder'
  | 'invoice_sent'
  | 'payment_confirmed'
  | 'support_ticket'
  | 'budget_alert'
  | 'custom';

export interface SendEmailOptions {
  to: string;
  template: EmailTemplate;
  vars?: Record<string, string>;
  subject?: string;
  html_body?: string;
}

export function useEmailService() {
  const authStore = useAuthStore();

  async function sendEmail(opts: SendEmailOptions): Promise<void> {
    const token = authStore.accessToken as string | undefined;
    const res = await fetch(`${APPWRITE_ENDPOINT}/functions/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(opts),
    });
    if (!res.ok) {
      const err = await res.json() as { error?: string };
      throw new Error(err.error ?? 'Envoi email échoué');
    }
  }

  async function sendOtpEmail(to: string, code: string, name?: string) {
    return sendEmail({ to, template: 'otp', vars: { code, name: name ?? '' } });
  }

  async function sendWelcomeEmail(to: string, name: string) {
    return sendEmail({ to, template: 'welcome', vars: { name } });
  }

  async function sendResetPasswordEmail(to: string, resetUrl: string, name?: string) {
    return sendEmail({ to, template: 'reset_password', vars: { reset_url: resetUrl, name: name ?? '' } });
  }

  async function sendReminderEmail(opts: {
    to: string;
    clientName: string;
    invoiceRef: string;
    amount: string;
    currency?: string;
    dueDate: string;
    customMessage?: string;
    subject?: string;
  }) {
    return sendEmail({
      to: opts.to,
      template: 'reminder',
      vars: {
        client_name: opts.clientName,
        invoice_ref: opts.invoiceRef,
        amount: opts.amount,
        currency: opts.currency ?? 'FCFA',
        due_date: opts.dueDate,
        custom_message: opts.customMessage ?? '',
        subject: opts.subject ?? `Rappel de paiement — ${opts.invoiceRef}`,
      },
    });
  }

  async function sendInvoiceEmail(opts: {
    to: string;
    clientName: string;
    invoiceRef: string;
    amount: string;
    currency?: string;
    dueDate?: string;
    companyName: string;
    customMessage?: string;
    subject?: string;
  }) {
    return sendEmail({
      to: opts.to,
      template: 'invoice_sent',
      vars: {
        client_name: opts.clientName,
        invoice_ref: opts.invoiceRef,
        amount: opts.amount,
        currency: opts.currency ?? 'FCFA',
        due_date: opts.dueDate ?? 'À réception',
        company_name: opts.companyName,
        custom_message: opts.customMessage ?? '',
        subject: opts.subject ?? `Votre facture ${opts.invoiceRef} — ${opts.companyName}`,
      },
    });
  }

  async function sendPaymentConfirmedEmail(opts: {
    to: string;
    clientName: string;
    invoiceRef: string;
    amount: string;
    currency?: string;
    paymentDate?: string;
    paymentMethod?: string;
  }) {
    return sendEmail({
      to: opts.to,
      template: 'payment_confirmed',
      vars: {
        client_name: opts.clientName,
        invoice_ref: opts.invoiceRef,
        amount: opts.amount,
        currency: opts.currency ?? 'FCFA',
        payment_date: opts.paymentDate ?? new Date().toLocaleDateString('fr-FR'),
        ...(opts.paymentMethod ? { payment_method: opts.paymentMethod } : {}),
      },
    });
  }

  async function sendSupportTicketEmail(opts: {
    to: string;
    name: string;
    ticketRef: string;
    subject: string;
    priority?: string;
    category?: string;
  }) {
    return sendEmail({
      to: opts.to,
      template: 'support_ticket',
      vars: {
        name: opts.name,
        ticket_ref: opts.ticketRef,
        subject: opts.subject,
        priority: opts.priority ?? 'Normale',
        category: opts.category ?? '',
      },
    });
  }

  async function sendBudgetAlertEmail(opts: {
    to: string;
    name: string;
    budgetName: string;
    allocated: string;
    consumed: string;
    percent: string;
    currency?: string;
    period?: string;
  }) {
    return sendEmail({
      to: opts.to,
      template: 'budget_alert',
      vars: {
        name: opts.name,
        budget_name: opts.budgetName,
        allocated: opts.allocated,
        consumed: opts.consumed,
        percent: opts.percent,
        currency: opts.currency ?? 'FCFA',
        ...(opts.period ? { period: opts.period } : {}),
      },
    });
  }

  return {
    sendEmail,
    sendOtpEmail,
    sendWelcomeEmail,
    sendResetPasswordEmail,
    sendReminderEmail,
    sendInvoiceEmail,
    sendPaymentConfirmedEmail,
    sendSupportTicketEmail,
    sendBudgetAlertEmail,
  };
}
