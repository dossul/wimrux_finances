import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import type { Invoice, InvoiceItem } from 'src/types';
import { TAX_GROUP_RATES } from 'src/composables/useTaxCalculation';
import { numberToFrenchWords } from 'src/utils/numberToFrenchWords';

// ============================================================================
// PDF FEC — Conforme DGI Burkina Faso / SECeF / SYGMEF
// Mentions obligatoires : SFE §2.22-2.26
// ============================================================================

function fmtCur(n: number): string {
  return new Intl.NumberFormat('fr-BF', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n || 0);
}

function fmtDate(d: string): string {
  if (!d) return '';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const TYPE_LABELS: Record<string, string> = {
  FV: 'FACTURE DE VENTE',
  FT: "FACTURE D'ACOMPTE",
  FA: "FACTURE D'AVOIR",
  EV: 'FACTURE EXPORT VENTE',
  ET: "FACTURE EXPORT ACOMPTE",
  EA: "FACTURE EXPORT AVOIR",
};

const CREDIT_NOTE_NATURE_LABELS: Record<string, string> = {
  COR: 'Correction',
  RAN: 'Retour de marchandises (avant livraison)',
  RAM: 'Retour de marchandises (après livraison)',
  RRR: 'Rabais / Remise / Ristourne',
};

export interface PdfCompanyInfo {
  name: string;
  ifu: string;
  rccm: string;
  address_cadastral: string;
  phone: string;
  email: string;
  tax_regime?: string;
  tax_office?: string;
  bank_name?: string;
  bank_account?: string;
  iban?: string;
  isf_number?: string;
}

export interface PdfClientInfo {
  name: string;
  ifu?: string | null;
  type: string;
  address?: string | null;
  phone?: string | null;
}

export interface PdfOptions {
  isDuplicate?: boolean | undefined;
  operatorName?: string | undefined;
  comments?: string | undefined;
  payments?: { type: string; amount: number }[] | undefined;
  creditNoteNature?: string | undefined;
  originalInvoiceRef?: string | undefined;
}

async function generateQrCodeDataUrl(data: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(data, { width: 80, margin: 1 });
  } catch {
    return null;
  }
}

export function useInvoicePdf() {

  async function generatePdf(
    invoice: Invoice,
    items: InvoiceItem[],
    company?: PdfCompanyInfo,
    client?: PdfClientInfo,
    options?: PdfOptions,
  ): Promise<jsPDF> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    let y = 12;

    // --- DUPLICATA mention ---
    if (options?.isDuplicate) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 0, 0);
      doc.text('DUPLICATA', pageW - 15, y, { align: 'right' });
      doc.setTextColor(0);
    }

    // --- Header ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('WIMRUX® FINANCES — Système de Facturation Électronique', pageW / 2, y, { align: 'center' });
    y += 4;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('SFE homologué DGI Burkina Faso — SECeF/SYGMEF', pageW / 2, y, { align: 'center' });
    y += 7;

    // --- Type & Reference ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const typeLabel = TYPE_LABELS[invoice.type] || invoice.type;
    doc.text(typeLabel, pageW / 2, y, { align: 'center' });
    y += 6;
    doc.setFontSize(10);
    doc.text(`Réf: ${invoice.reference}`, pageW / 2, y, { align: 'center' });

    // Avoir: nature et référence originale
    if ((invoice.type === 'FA' || invoice.type === 'EA') && options?.creditNoteNature) {
      y += 5;
      doc.setFontSize(8);
      const natureLabel = CREDIT_NOTE_NATURE_LABELS[options.creditNoteNature] || options.creditNoteNature;
      doc.text(`Nature : ${natureLabel}`, pageW / 2, y, { align: 'center' });
      if (options?.originalInvoiceRef) {
        y += 4;
        doc.text(`Facture d'origine : ${options.originalInvoiceRef}`, pageW / 2, y, { align: 'center' });
      }
    }
    y += 7;

    // --- Company (ÉMETTEUR) & Client side by side ---
    const colW = (pageW - 35) / 2;
    const leftX = 15;
    const rightX = leftX + colW + 5;
    void 0; // company block start

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(41, 98, 255);
    doc.setTextColor(255);
    doc.roundedRect(leftX, y - 3, colW, 5, 1, 1, 'F');
    doc.text('ÉMETTEUR', leftX + 2, y);
    doc.roundedRect(rightX, y - 3, colW, 5, 1, 1, 'F');
    doc.text('CLIENT', rightX + 2, y);
    doc.setTextColor(0);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    let yL = y;
    if (company) {
      doc.setFont('helvetica', 'bold');
      doc.text(company.name, leftX, yL); yL += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.text(`IFU : ${company.ifu}`, leftX, yL); yL += 3.5;
      doc.text(`RCCM : ${company.rccm}`, leftX, yL); yL += 3.5;
      doc.text(`Adresse : ${company.address_cadastral}`, leftX, yL); yL += 3.5;
      doc.text(`Tél : ${company.phone} — ${company.email}`, leftX, yL); yL += 3.5;
      if (company.tax_regime) {
        doc.text(`Régime fiscal : ${company.tax_regime}`, leftX, yL); yL += 3.5;
      }
      if (company.tax_office) {
        doc.text(`Centre des impôts : ${company.tax_office}`, leftX, yL); yL += 3.5;
      }
      if (company.isf_number) {
        doc.text(`N° ISF : ${company.isf_number}`, leftX, yL); yL += 3.5;
      }
      if (company.bank_name || company.bank_account) {
        doc.text(`Banque : ${company.bank_name || '—'} — Compte : ${company.bank_account || '—'}`, leftX, yL); yL += 3.5;
      }
      if (company.iban) {
        doc.text(`IBAN : ${company.iban}`, leftX, yL); yL += 3.5;
      }
    }

    let yR = y;
    if (client) {
      doc.setFont('helvetica', 'bold');
      doc.text(client.name, rightX, yR); yR += 3.5;
      doc.setFont('helvetica', 'normal');
      doc.text(`Type : ${client.type}`, rightX, yR); yR += 3.5;
      if (client.ifu) {
        doc.text(`IFU : ${client.ifu}`, rightX, yR); yR += 3.5;
      } else if (invoice.type === 'EV' || invoice.type === 'ET' || invoice.type === 'EA') {
        doc.text('IFU : (export — libre)', rightX, yR); yR += 3.5;
      }
      if (client.address) {
        doc.text(`Adresse : ${client.address}`, rightX, yR); yR += 3.5;
      }
      if (client.phone) {
        doc.text(`Tél : ${client.phone}`, rightX, yR); yR += 3.5;
      }
    } else {
      doc.text('Client comptant (PP)', rightX, yR); yR += 3.5;
    }

    y = Math.max(yL, yR) + 4;

    // --- Date facture ---
    doc.setFontSize(7);
    doc.text(`Date : ${fmtDate(invoice.created_at)}    Mode de prix : ${invoice.price_mode}`, leftX, y);
    y += 5;

    // --- Items table ---
    const tableHead = [['#', 'Désignation', 'Type', 'Grp', 'Qté', 'Unité', 'P.U.', 'Remise', 'T.Spé.', 'HT', 'TVA', 'TTC']];
    const tableBody = items.map((item, idx) => [
      String(idx + 1),
      item.name,
      item.type,
      item.tax_group,
      String(item.quantity),
      item.unit || 'u.',
      fmtCur(item.price),
      fmtCur(item.discount || 0),
      fmtCur(item.specific_tax || 0),
      fmtCur(item.amount_ht),
      fmtCur(item.amount_tva),
      fmtCur(item.amount_ttc),
    ]);

    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: tableBody,
      styles: { fontSize: 6, cellPadding: 1.2 },
      headStyles: { fillColor: [41, 98, 255], textColor: 255, fontStyle: 'bold', fontSize: 6 },
      columnStyles: {
        0: { cellWidth: 7, halign: 'center' },
        1: { cellWidth: 30 },
        2: { cellWidth: 14 },
        3: { cellWidth: 8, halign: 'center' },
        4: { cellWidth: 10, halign: 'right' },
        5: { cellWidth: 10 },
        6: { cellWidth: 18, halign: 'right' },
        7: { cellWidth: 14, halign: 'right' },
        8: { cellWidth: 14, halign: 'right' },
        9: { cellWidth: 18, halign: 'right' },
        10: { cellWidth: 16, halign: 'right' },
        11: { cellWidth: 18, halign: 'right' },
      },
      margin: { left: 15, right: 15 },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;

    // --- Tax summary by group (left half) + Totals (right half) ---
    const calc = invoice.tax_calculation;
    const halfW = (pageW - 30) / 2;
    const taxSummaryX = 15;
    const totalsX = 15 + halfW + 5;

    // Tax summary table
    if (calc) {
      const taxRows: string[][] = [];
      const groups = Object.keys(TAX_GROUP_RATES) as Array<keyof typeof TAX_GROUP_RATES>;
      for (const g of groups) {
        const ht = calc.totalHT?.[g] || 0;
        const tva = calc.tva?.[g] || 0;
        const psvb = calc.psvb?.[g] || 0;
        if (ht > 0 || tva > 0) {
          taxRows.push([`${g}`, fmtCur(ht), fmtCur(tva), fmtCur(psvb)]);
        }
      }

      if (taxRows.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Grp', 'HT', 'TVA', 'PSVB']],
          body: taxRows,
          styles: { fontSize: 6, cellPadding: 1 },
          headStyles: { fillColor: [80, 80, 80], textColor: 255, fontSize: 6 },
          margin: { left: taxSummaryX, right: totalsX },
          tableWidth: halfW,
        });
      }
    }

    // Totals box (right side)
    const boxW = halfW - 5;
    doc.setDrawColor(41, 98, 255);
    doc.setFillColor(248, 248, 255);
    doc.roundedRect(totalsX, y, boxW, 36, 2, 2, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const totalsData: [string, string][] = [
      ['Total HT :', fmtCur(invoice.total_ht)],
      ['TVA :', fmtCur(invoice.total_tva)],
      ['PSVB :', fmtCur(invoice.total_psvb)],
    ];
    if (invoice.stamp_duty > 0) {
      totalsData.push(['Timbre quittance :', fmtCur(invoice.stamp_duty)]);
    }

    let ty = y + 5;
    for (const row of totalsData) {
      doc.text(row[0], totalsX + 3, ty);
      doc.text(row[1], totalsX + boxW - 3, ty, { align: 'right' });
      ty += 4.5;
    }

    doc.setDrawColor(41, 98, 255);
    doc.line(totalsX + 2, ty - 1, totalsX + boxW - 2, ty - 1);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL TTC :', totalsX + 3, ty + 3);
    doc.text(fmtCur(invoice.total_ttc), totalsX + boxW - 3, ty + 3, { align: 'right' });

    const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y;
    y = Math.max(tableEnd, y + 40) + 4;

    // --- Montant en lettres ---
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    const amountWords = numberToFrenchWords(invoice.total_ttc + (invoice.stamp_duty || 0));
    doc.text(`Arrêtée la présente facture à la somme de : ${amountWords}`, leftX, y);
    y += 5;

    // --- Payments ---
    if (options?.payments && options.payments.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('Modes de paiement :', leftX, y);
      y += 3.5;
      doc.setFont('helvetica', 'normal');
      for (const p of options.payments) {
        doc.text(`• ${p.type} : ${fmtCur(p.amount)}`, leftX + 2, y);
        y += 3.5;
      }
      y += 1;
    }

    // --- Comments / Observations ---
    if (options?.comments) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('Observations :', leftX, y);
      y += 3.5;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(options.comments, pageW - 30);
      doc.text(lines, leftX, y);
      y += lines.length * 3.5 + 2;
    }

    // --- Mentions conditionnelles ---
    doc.setFontSize(6);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);

    // Exonération
    const hasExoGroup = items.some(i => {
      const r = TAX_GROUP_RATES[i.tax_group];
      return r && r.tva === 0;
    });
    if (hasExoGroup) {
      doc.text('Exonération de TVA conformément au Code Général des Impôts du Burkina Faso', leftX, y);
      y += 3;
    }

    // Export
    if (invoice.type === 'EV' || invoice.type === 'ET' || invoice.type === 'EA') {
      doc.text('Facture export — TVA non applicable (art. 343 CGI BF)', leftX, y);
      y += 3;
    }

    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');

    // --- Opérateur ---
    if (options?.operatorName) {
      y += 2;
      doc.setFontSize(7);
      doc.text(`Opérateur : ${options.operatorName}`, leftX, y);
      y += 5;
    }

    // --- Certification block + QR Code ---
    if (invoice.status === 'certified' && invoice.fiscal_number) {
      if (y > pageH - 55) {
        doc.addPage();
        y = 15;
      }

      doc.setDrawColor(0, 150, 0);
      doc.setLineWidth(0.5);
      const certBoxH = 30;
      doc.roundedRect(15, y, pageW - 30, certBoxH, 2, 2, 'S');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 120, 0);
      doc.text('FACTURE ÉLECTRONIQUE CERTIFIÉE — SECeF / DGI BURKINA FASO', pageW / 2, y + 5, { align: 'center' });
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);

      const certLines = [
        `N° Fiscal : ${invoice.fiscal_number}    Code SECeF/DGI : ${invoice.code_secef_dgi || '—'}`,
        `NIM : ${invoice.nim || '—'}    Date certification : ${fmtDate(invoice.certification_datetime ?? '')}`,
        `UID : ${invoice.fnec_uid || '—'}    Signature : ${(invoice.signature || '').substring(0, 20)}...`,
      ];
      let cy = y + 10;
      for (const line of certLines) {
        doc.text(line, 20, cy);
        cy += 4;
      }

      // QR Code réel (image base64)
      if (invoice.qr_code) {
        const qrDataUrl = await generateQrCodeDataUrl(invoice.qr_code);
        if (qrDataUrl) {
          doc.addImage(qrDataUrl, 'PNG', pageW - 45, y + 3, 24, 24);
        }
      }

      y += certBoxH + 4;
    }

    // --- Mentions légales obligatoires (pied de facture) ---
    const legalY = pageH - 18;
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);

    doc.text('Cette facture électronique est émise conformément aux dispositions du décret N°2022-0281/PRES/PM/MINEFID', pageW / 2, legalY, { align: 'center' });
    doc.text('portant institution du Système Électronique de Certification des Factures (SECeF) au Burkina Faso.', pageW / 2, legalY + 3, { align: 'center' });
    doc.text(`Document généré par WIMRUX® FINANCES — Imprimé le ${fmtDate(new Date().toISOString())}`, pageW / 2, legalY + 6, { align: 'center' });

    if (options?.isDuplicate) {
      doc.setTextColor(200, 0, 0);
      doc.text('DUPLICATA — Ce document est une copie de la facture originale', pageW / 2, legalY + 9, { align: 'center' });
    }

    doc.setTextColor(0);

    return doc;
  }

  async function downloadPdf(
    invoice: Invoice,
    items: InvoiceItem[],
    company?: PdfCompanyInfo,
    client?: PdfClientInfo,
    options?: PdfOptions,
  ) {
    const doc = await generatePdf(invoice, items, company, client, options);
    const suffix = options?.isDuplicate ? '_DUPLICATA' : '';
    doc.save(`${invoice.reference}${suffix}.pdf`);
  }

  return { generatePdf, downloadPdf };
}
