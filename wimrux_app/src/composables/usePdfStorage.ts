import { insforge } from 'src/boot/insforge';
import { useInvoicePdf } from './useInvoicePdf';
import type { Invoice, InvoiceItem } from 'src/types';
import type { PdfCompanyInfo, PdfClientInfo, PdfOptions } from './useInvoicePdf';

// ============================================================================
// Stockage PDF — Upload vers InsForge Storage + lien dans la facture
// Réf. Spéc. SFE §2.37 : archivage 10 ans
// ============================================================================

const BUCKET_NAME = 'invoices-pdf';

export function usePdfStorage() {
  const { generatePdf } = useInvoicePdf();

  async function uploadAndLink(
    invoice: Invoice,
    items: InvoiceItem[],
    company?: PdfCompanyInfo,
    client?: PdfClientInfo,
    options?: PdfOptions,
  ): Promise<string | null> {
    try {
      const doc = await generatePdf(invoice, items, company, client, options);
      const pdfBlob = doc.output('blob');
      const suffix = options?.isDuplicate ? '_DUPLICATA' : '';
      const fileName = `${invoice.company_id}/${invoice.reference}${suffix}.pdf`;

      const { error: uploadError } = await insforge.storage
        .from(BUCKET_NAME)
        .upload(fileName, pdfBlob);

      if (uploadError) {
        console.error('PDF upload error:', uploadError);
        return null;
      }

      const publicUrl = insforge.storage
        .from(BUCKET_NAME)
        .getPublicUrl(fileName);

      // Update invoice with PDF URL
      if (publicUrl && !options?.isDuplicate) {
        await insforge.database
          .from('invoices')
          .update({ pdf_url: publicUrl })
          .eq('id', invoice.id);
      }

      return publicUrl;
    } catch (err) {
      console.error('PDF storage error:', err);
      return null;
    }
  }

  return { uploadAndLink };
}
