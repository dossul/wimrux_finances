/**
 * Business Logic: Invoice Payment Status Sync
 * Port of PostgreSQL trigger: update_invoice_payment_status()
 */
import { databases } from 'src/boot/appwrite';
import { Query } from 'appwrite';

const DATABASE_ID = 'wimrux_finances';
const INVOICES_COLLECTION = 'invoices';
const PAYMENTS_COLLECTION = 'invoice_payments';

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
}

export interface Invoice {
  id: string;
  total_ttc: number;
  paid_amount: number;
  payment_status: 'unpaid' | 'partial' | 'paid';
}

/**
 * Calculate payment status based on amounts
 */
export function calculatePaymentStatus(
  totalTTC: number,
  totalPaid: number
): { paid_amount: number; payment_status: 'unpaid' | 'partial' | 'paid' } {
  const paid_amount = Math.max(0, totalPaid);
  
  let payment_status: 'unpaid' | 'partial' | 'paid';
  if (paid_amount >= totalTTC) {
    payment_status = 'paid';
  } else if (paid_amount > 0) {
    payment_status = 'partial';
  } else {
    payment_status = 'unpaid';
  }
  
  return { paid_amount, payment_status };
}

/**
 * Recalculate invoice payment status from all payments
 * Should be called after any payment change (insert/update/delete)
 */
export async function recalculateInvoicePaymentStatus(
  invoiceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get all payments for this invoice
    const paymentsResponse = await databases.listDocuments(
      DATABASE_ID,
      PAYMENTS_COLLECTION,
      [Query.equal('invoice_id', invoiceId)]
    );
    
    const totalPaid = paymentsResponse.documents.reduce(
      (sum, payment) => sum + (payment.amount || 0),
      0
    );
    
    // Get invoice to check total
    const invoiceResponse = await databases.getDocument(
      DATABASE_ID,
      INVOICES_COLLECTION,
      invoiceId
    );
    
    const totalTTC = invoiceResponse.total_ttc || 0;
    
    // Calculate new status
    const { paid_amount, payment_status } = calculatePaymentStatus(totalTTC, totalPaid);
    
    // Update invoice
    await databases.updateDocument(
      DATABASE_ID,
      INVOICES_COLLECTION,
      invoiceId,
      {
        paid_amount,
        payment_status,
      }
    );
    
    return { success: true };
  } catch (error) {
    console.error(`[Payment Status] Error recalculating for invoice ${invoiceId}:`, error);
    return { success: false, error: String(error) };
  }
}

/**
 * Hook to call after creating a payment
 */
export async function afterPaymentCreate(payment: Payment): Promise<void> {
  await recalculateInvoicePaymentStatus(payment.invoice_id);
}

/**
 * Hook to call after updating a payment
 */
export async function afterPaymentUpdate(
  payment: Payment,
  oldAmount: number
): Promise<void> {
  // Recalculate regardless of amount change (simpler logic)
  await recalculateInvoicePaymentStatus(payment.invoice_id);
}

/**
 * Hook to call after deleting a payment
 */
export async function afterPaymentDelete(
  invoiceId: string,
  _deletedAmount: number
): Promise<void> {
  await recalculateInvoicePaymentStatus(invoiceId);
}
