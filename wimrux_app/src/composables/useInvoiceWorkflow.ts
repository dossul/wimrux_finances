import { computed } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';
import { insforge } from 'src/boot/insforge';
import type { Invoice, InvoiceStatus, Permission } from 'src/types';

// ============================================================================
// Invoice Lifecycle Workflow — WIMRUX® FINANCES
// ============================================================================
//
// Brouillon (draft)
//   → Soumise pour validation (pending_validation)   [invoices.submit]
//     → Approuvée (approved)                          [invoices.approve]
//     → Rejetée → retour Brouillon (draft)            [invoices.approve]
//       → Validée (validated)                         [invoices.validate]
//         → Certifiée SECeF (certified)               [invoices.certify]
//
// Séparation des pouvoirs :
//   - Celui qui crée NE valide PAS
//   - Celui qui valide NE certifie PAS (système)
//   - Celui qui paie NE crée PAS
//
// Permission-based: each transition requires a specific permission key.
// Company admins can reassign these permissions to any role.
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
  cancelled: { label: 'Annulée', color: 'red', icon: 'cancel' },
};

// Permission required for each transition
const TRANSITION_PERMISSIONS: Record<string, Permission> = {
  'draft->pending_validation': 'invoices.submit',
  'pending_validation->approved': 'invoices.approve',
  'pending_validation->draft': 'invoices.approve',       // rejection
  'approved->validated': 'invoices.validate',
  'validated->certified': 'invoices.certify',
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
  };
}
