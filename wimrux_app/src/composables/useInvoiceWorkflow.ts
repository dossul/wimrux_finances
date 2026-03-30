import { computed } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';
import { insforge } from 'src/boot/insforge';
import type { Invoice, InvoiceStatus, InvoiceType, Permission } from 'src/types';

// ============================================================================
// Invoice Lifecycle Workflow — WIMRUX® FINANCES
// ============================================================================
//
// === Factures BF (FV/FT/FA/EV/ET/EA) ===
// draft → pending_validation [invoices.submit]
//   → approved              [invoices.approve — COMPTABLE, anti-fraude]
//   → draft (rejet)         [invoices.approve]
//     → validated           [invoices.validate]
//       → certified SECeF   [invoices.certify]
//
// === Proforma (PF) ===
// draft → pending_validation [invoices.submit]
//   → approved              [invoices.approve — COMPTABLE, anti-fraude]
//   → draft (rejet)         [invoices.approve]
//     → sent                [invoices.validate]
//       → accepted          [invoices.validate]
//       → rejected          [invoices.validate]
//         → [Convertir en FV automatiquement]
//
// Permission-based: each transition requires a specific permission key.
// ============================================================================

export interface WorkflowAction {
  key: string;
  label: string;
  icon: string;
  color: string;
  targetStatus: InvoiceStatus;
  needsReason?: boolean;
}

// Status display config
export const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: string }> = {
  draft: { label: 'Brouillon', color: 'grey', icon: 'edit_note' },
  pending_validation: { label: 'En attente de validation', color: 'orange', icon: 'hourglass_top' },
  approved: { label: 'Approuvée', color: 'blue', icon: 'thumb_up' },
  validated: { label: 'Validée', color: 'amber-8', icon: 'check_circle' },
  certified: { label: 'Certifiée SECeF', color: 'green', icon: 'verified' },
  sent: { label: 'Envoyée au client', color: 'teal', icon: 'send' },
  accepted: { label: 'Acceptée', color: 'green-7', icon: 'check_circle_outline' },
  rejected: { label: 'Refusée', color: 'deep-orange', icon: 'cancel_presentation' },
  cancelled: { label: 'Annulée', color: 'red', icon: 'cancel' },
};

// Permission required for each transition
const TRANSITION_PERMISSIONS: Record<string, Permission> = {
  'draft->pending_validation': 'invoices.submit',
  'pending_validation->approved': 'invoices.approve',
  'pending_validation->draft': 'invoices.approve',       // rejection
  'approved->validated': 'invoices.validate',            // BF invoices
  'validated->certified': 'invoices.certify',
  'approved->sent': 'invoices.validate',                 // Proforma: approved → sent
  'sent->accepted': 'invoices.validate',                 // Proforma: client accepted
  'sent->rejected': 'invoices.validate',                 // Proforma: client rejected
  'draft->cancelled': 'invoices.validate',
};

// Who CANNOT approve if they submitted (anti-fraud)
function isSubmitter(invoice: Partial<Invoice>, userId: string): boolean {
  return invoice.submitted_by === userId;
}

export function useInvoiceWorkflow() {
  const authStore = useAuthStore();

  const currentRole = computed(() => authStore.role);
  const currentUserId = computed(() => authStore.user?.id ?? '');

  function canTransition(
    invoice: Partial<Invoice>,
    from: InvoiceStatus,
    to: InvoiceStatus,
  ): boolean {
    const role = currentRole.value;
    if (!role) return false;

    // project_admin bypasses all
    if (role === 'project_admin') return true;

    const key = `${from}->${to}`;
    const requiredPerm = TRANSITION_PERMISSIONS[key];
    if (!requiredPerm) return false;

    // Check granular permission
    if (!authStore.hasPermission(requiredPerm)) return false;

    // Anti-fraud: submitter cannot approve their own invoice
    if (to === 'approved' && isSubmitter(invoice, currentUserId.value)) {
      return false;
    }

    return true;
  }

  function getAvailableActions(invoice: Partial<Invoice>): WorkflowAction[] {
    const status = invoice.status as InvoiceStatus;
    if (!status) return [];

    const actions: WorkflowAction[] = [];

    if (status === 'draft') {
      if (canTransition(invoice, 'draft', 'pending_validation')) {
        actions.push({
          key: 'submit',
          label: 'Soumettre pour validation',
          icon: 'send',
          color: 'orange',
          targetStatus: 'pending_validation',
        });
      }
      if (canTransition(invoice, 'draft', 'cancelled')) {
        actions.push({
          key: 'cancel',
          label: 'Annuler',
          icon: 'cancel',
          color: 'red',
          targetStatus: 'cancelled',
          needsReason: true,
        });
      }
    }

    if (status === 'pending_validation') {
      if (canTransition(invoice, 'pending_validation', 'approved')) {
        actions.push({
          key: 'approve',
          label: 'Approuver',
          icon: 'thumb_up',
          color: 'blue',
          targetStatus: 'approved',
        });
      }
      if (canTransition(invoice, 'pending_validation', 'draft')) {
        actions.push({
          key: 'reject',
          label: 'Rejeter (retour brouillon)',
          icon: 'thumb_down',
          color: 'red',
          targetStatus: 'draft',
          needsReason: true,
        });
      }
    }

    if (status === 'approved') {
      if (invoice.type === 'PF') {
        // Proforma: approved → sent
        if (canTransition(invoice, 'approved', 'sent')) {
          actions.push({
            key: 'send_proforma',
            label: 'Marquer comme envoyée',
            icon: 'send',
            color: 'teal',
            targetStatus: 'sent',
          });
        }
      } else {
        // Regular invoice: approved → validated
        if (canTransition(invoice, 'approved', 'validated')) {
          actions.push({
            key: 'validate',
            label: 'Valider la facture',
            icon: 'check_circle',
            color: 'amber-8',
            targetStatus: 'validated',
          });
        }
      }
    }

    if (status === 'sent' && invoice.type === 'PF') {
      if (canTransition(invoice, 'sent', 'accepted')) {
        actions.push({
          key: 'accept_proforma',
          label: 'Marquer comme acceptée',
          icon: 'check_circle_outline',
          color: 'green-7',
          targetStatus: 'accepted',
        });
      }
      if (canTransition(invoice, 'sent', 'rejected')) {
        actions.push({
          key: 'reject_proforma',
          label: 'Marquer comme refusée',
          icon: 'cancel_presentation',
          color: 'deep-orange',
          targetStatus: 'rejected',
          needsReason: true,
        });
      }
    }

    if (status === 'validated') {
      if (canTransition(invoice, 'validated', 'certified')) {
        actions.push({
          key: 'certify',
          label: 'Certifier (SECeF)',
          icon: 'verified',
          color: 'green',
          targetStatus: 'certified',
        });
      }
    }

    return actions;
  }

  async function executeTransition(
    invoiceId: string,
    invoice: Partial<Invoice>,
    targetStatus: InvoiceStatus,
    reason?: string,
  ): Promise<{ success: boolean; error?: string }> {
    const currentStatus = invoice.status as InvoiceStatus;
    if (!canTransition(invoice, currentStatus, targetStatus)) {
      return { success: false, error: 'Transition non autorisée pour votre rôle / permission' };
    }

    const now = new Date().toISOString();
    const userId = currentUserId.value;
    const userName = authStore.fullName;

    const updates: Record<string, unknown> = { status: targetStatus };

    // Track who did what
    if (targetStatus === 'pending_validation') {
      updates.submitted_by = userName || userId;
      updates.submitted_at = now;
    } else if (targetStatus === 'approved') {
      updates.approved_by = userName || userId;
      updates.approved_at = now;
    } else if (targetStatus === 'validated') {
      updates.validated_at = now;
    } else if (targetStatus === 'draft' && currentStatus === 'pending_validation') {
      // Rejection
      updates.rejected_by = userName || userId;
      updates.rejected_at = now;
      updates.rejection_reason = reason || '';
      // Clear previous approval
      updates.approved_by = null;
      updates.approved_at = null;
    } else if (targetStatus === 'cancelled') {
      updates.rejection_reason = reason || 'Annulée';
    }

    const { error } = await insforge.database
      .from('invoices')
      .update(updates)
      .eq('id', invoiceId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  // Converts an accepted Proforma to a new FV draft (automatic copy)
  async function convertProformaToFV(
    proforma: Invoice,
  ): Promise<{ success: boolean; newInvoiceId?: string; error?: string }> {
    if (proforma.type !== 'PF') return { success: false, error: 'Pas une proforma' };

    const now = new Date().toISOString();
    const year = now.slice(0, 4);

    // Get next FV reference
    const { data: refData, error: refError } = await insforge.database
      .rpc('next_invoice_reference', { p_company_id: proforma.company_id, p_type: 'FV', p_year: Number(year) });
    if (refError) return { success: false, error: refError.message };

    // Create FV draft
    const { data: newInv, error: invError } = await insforge.database
      .from('invoices')
      .insert({
        company_id: proforma.company_id,
        client_id: proforma.client_id,
        type: 'FV' as InvoiceType,
        reference: refData as string,
        status: 'draft',
        price_mode: proforma.price_mode,
        operator_name: proforma.operator_name,
        comments: proforma.comments ?? [],
        total_ht: proforma.total_ht,
        total_tva: proforma.total_tva,
        total_psvb: proforma.total_psvb,
        total_ttc: proforma.total_ttc,
        stamp_duty: proforma.stamp_duty,
        total_payment: proforma.total_payment,
        tax_calculation: proforma.tax_calculation,
        created_at: now,
      })
      .select('id')
      .single();

    if (invError || !newInv) return { success: false, error: invError?.message };

    const newId = (newInv as { id: string }).id;

    // Copy items
    if (proforma.items && proforma.items.length > 0) {
      const newItems = proforma.items.map(({ ...rest }) => ({
        ...rest,
        invoice_id: newId,
      }));
      await insforge.database.from('invoice_items').insert(newItems);
    }

    // Link proforma to new FV
    await insforge.database
      .from('invoices')
      .update({ proforma_converted_to: newId })
      .eq('id', proforma.id);

    return { success: true, newInvoiceId: newId };
  }

  // Read-only = no create/submit/approve/validate/certify permissions
  const isReadOnly = computed(() => {
    return !authStore.hasAnyPermission([
      'invoices.create', 'invoices.submit', 'invoices.approve',
      'invoices.validate', 'invoices.certify',
    ]);
  });

  // Can edit invoice content (items, client, etc.) — only in draft + has create permission
  function canEditContent(invoice: Partial<Invoice>): boolean {
    if (invoice.status !== 'draft') return false;
    return authStore.hasPermission('invoices.create');
  }

  return {
    STATUS_CONFIG,
    currentRole,
    isReadOnly,
    canTransition,
    getAvailableActions,
    executeTransition,
    canEditContent,
    convertProformaToFV,
  };
}
