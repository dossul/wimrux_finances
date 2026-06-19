/**
 * Business Logic: Invoice Workflow Guards
 * Ports of PostgreSQL triggers:
 * - allow_certification_update()
 * - prevent_invoice_modification()
 */

export type InvoiceStatus = 
  | 'draft' 
  | 'pending_validation' 
  | 'approved' 
  | 'validated' 
  | 'certified' 
  | 'cancelled' 
  | 'sent' 
  | 'accepted' 
  | 'rejected';

export type InvoiceType = 'FV' | 'FT' | 'FA' | 'EV' | 'ET' | 'EA' | 'PF';

interface Invoice {
  id: string;
  status: InvoiceStatus;
  type: InvoiceType;
  reference: string;
}

/**
 * Valid status transitions according to workflow rules
 */
const VALID_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  'draft': ['pending_validation', 'approved', 'certified'],
  'pending_validation': ['approved', 'draft', 'certified'],
  'approved': ['validated', 'certified'],
  'sent': ['accepted', 'rejected'],  // Only for PF (proforma)
  'validated': ['certified'],
  'certified': [],  // No transitions allowed - immutable
  'cancelled': [],  // No transitions allowed - immutable
  'accepted': [],
  'rejected': [],
};

/**
 * Special rule: approved PF can go to sent
 */
function isValidTransition(
  from: InvoiceStatus, 
  to: InvoiceStatus, 
  type: InvoiceType
): boolean {
  // Same status is always allowed (no-op)
  if (from === to) return true;
  
  // Special case: approved PF can go to sent
  if (from === 'approved' && to === 'sent' && type === 'PF') {
    return true;
  }
  
  // Check standard transitions
  const allowed = VALID_TRANSITIONS[from] || [];
  return allowed.includes(to);
}

/**
 * Guard function to check if a status transition is allowed
 * Throws if not allowed
 */
export function guardStatusTransition(
  invoice: Invoice,
  newStatus: InvoiceStatus,
  userId: string
): void {
  const currentStatus = invoice.status;
  
  // Certified and cancelled are completely immutable
  if (currentStatus === 'certified') {
    throw new Error(
      `INTERDIT: Modification non autorisée sur facture ${invoice.reference} (status: ${currentStatus})`
    );
  }
  
  if (currentStatus === 'cancelled') {
    throw new Error(
      `INTERDIT: Facture ${invoice.reference} immuable (status: ${currentStatus})`
    );
  }
  
  // Check transition validity
  if (!isValidTransition(currentStatus, newStatus, invoice.type)) {
    throw new Error(
      `INTERDIT: Transition non autorisée ${currentStatus} → ${newStatus} pour facture ${invoice.reference}`
    );
  }
}

/**
 * Check if an invoice can be deleted
 */
export function canDeleteInvoice(invoice: Invoice): boolean {
  // Cannot delete validated or certified invoices
  return !['validated', 'certified'].includes(invoice.status);
}

/**
 * Guard function for delete operations
 */
export function guardDeleteInvoice(invoice: Invoice): void {
  if (!canDeleteInvoice(invoice)) {
    throw new Error(
      `INTERDIT: Suppression non autorisée sur facture ${invoice.reference} (status: ${invoice.status})`
    );
  }
}

/**
 * Get next allowed statuses for an invoice
 */
export function getAllowedNextStatuses(
  currentStatus: InvoiceStatus,
  type: InvoiceType
): InvoiceStatus[] {
  const base = [...(VALID_TRANSITIONS[currentStatus] || [])];
  
  // Add special case for PF
  if (currentStatus === 'approved' && type === 'PF') {
    base.push('sent');
  }
  
  return base;
}
