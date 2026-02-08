import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice, InvoiceItem } from 'src/types';
import { TAX_GROUP_RATES } from 'src/composables/useTaxCalculation';

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

export function useInvoicePdf() {

  function generatePdf(
    invoice: Invoice,
    items: InvoiceItem[],
    company?: { name: string; ifu: string; rccm: string; address_cadastral: string; phone: string; email: string },
    client?: { name: string; ifu?: string | null; type: string; address?: string | null },
  ): jsPDF {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageW = doc.internal.pageSize.getWidth();
    let y = 15;

    // --- Header ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('WIMRUX® FINANCES — Système de Facturation Electronique', pageW / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('SFE homologué DGI Burkina Faso', pageW / 2, y, { align: 'center' });
    y += 8;

    // --- Type & Reference ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(TYPE_LABELS[invoice.type] || invoice.type, pageW / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(10);
    doc.text(`Réf: ${invoice.reference}`, pageW / 2, y, { align: 'center' });
    y += 8;

    // --- Company & Client columns ---
    const colW = (pageW - 30) / 2;
    const leftX = 15;
    const rightX = leftX + colW + 10;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('ÉMETTEUR', leftX, y);
    doc.text('CLIENT', rightX, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    if (company) {
      doc.text(company.name, leftX, y); y += 4;
      doc.text(`IFU: ${company.ifu}`, leftX, y); y += 4;
      doc.text(`RCCM: ${company.rccm}`, leftX, y); y += 4;
      doc.text(`Adresse: ${company.address_cadastral}`, leftX, y); y += 4;
      doc.text(`Tél: ${company.phone} — ${company.email}`, leftX, y);
    }

    let yClient = y - (company ? 16 : 0);
    if (client) {
      doc.text(`${client.name} (${client.type})`, rightX, yClient); yClient += 4;
      if (client.ifu) { doc.text(`IFU: ${client.ifu}`, rightX, yClient); yClient += 4; }
      if (client.address) { doc.text(`Adresse: ${client.address}`, rightX, yClient); }
    } else {
      doc.text('Client comptant', rightX, yClient);
    }

    y += 10;

    // --- Items table ---
    const tableHead = [['#', 'Désignation', 'Type', 'Grp', 'Qté', 'P.U.', 'HT', 'TVA', 'TTC']];
    const tableBody = items.map((item, idx) => [
      String(idx + 1),
      item.name,
      item.type,
      item.tax_group,
      String(item.quantity),
      fmtCur(item.price),
      fmtCur(item.amount_ht),
      fmtCur(item.amount_tva),
      fmtCur(item.amount_ttc),
    ]);

    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: tableBody,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [41, 98, 255], textColor: 255, fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 45 },
        2: { cellWidth: 18 },
        3: { cellWidth: 10, halign: 'center' },
        4: { cellWidth: 12, halign: 'right' },
        5: { cellWidth: 22, halign: 'right' },
        6: { cellWidth: 22, halign: 'right' },
        7: { cellWidth: 20, halign: 'right' },
        8: { cellWidth: 22, halign: 'right' },
      },
      margin: { left: 15, right: 15 },
    });

    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

    // --- Tax summary by group ---
    const calc = invoice.tax_calculation;
    if (calc) {
      const taxRows: string[][] = [];
      const groups = Object.keys(TAX_GROUP_RATES) as Array<keyof typeof TAX_GROUP_RATES>;
      for (const g of groups) {
        const ht = calc.totalHT?.[g] || 0;
        const tva = calc.tva?.[g] || 0;
        const psvb = calc.psvb?.[g] || 0;
        if (ht > 0 || tva > 0) {
          taxRows.push([`${g} — ${TAX_GROUP_RATES[g].description}`, fmtCur(ht), fmtCur(tva), fmtCur(psvb)]);
        }
      }

      if (taxRows.length > 0) {
        autoTable(doc, {
          startY: y,
          head: [['Groupe fiscal', 'HT', 'TVA', 'PSVB']],
          body: taxRows,
          styles: { fontSize: 7, cellPadding: 1.5 },
          headStyles: { fillColor: [100, 100, 100], textColor: 255 },
          margin: { left: pageW / 2, right: 15 },
          tableWidth: pageW / 2 - 15,
        });
        y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
      }
    }

    // --- Totals box ---
    const boxX = pageW / 2;
    const boxW = pageW / 2 - 15;
    doc.setDrawColor(200);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(boxX, y, boxW, 32, 2, 2, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const totalsData = [
      ['Total HT:', fmtCur(invoice.total_ht)],
      ['TVA:', fmtCur(invoice.total_tva)],
      ['PSVB:', fmtCur(invoice.total_psvb)],
    ];
    if (invoice.stamp_duty > 0) {
      totalsData.push(['Timbre quittance:', fmtCur(invoice.stamp_duty)]);
    }

    let ty = y + 5;
    for (const row of totalsData) {
      doc.text(row[0] ?? '', boxX + 3, ty);
      doc.text(row[1] ?? '', boxX + boxW - 3, ty, { align: 'right' });
      ty += 5;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL TTC:', boxX + 3, ty + 2);
    doc.text(fmtCur(invoice.total_ttc), boxX + boxW - 3, ty + 2, { align: 'right' });

    y += 38;

    // --- Certification info ---
    if (invoice.status === 'certified' && invoice.fiscal_number) {
      doc.setDrawColor(0, 150, 0);
      doc.setLineWidth(0.5);
      doc.roundedRect(15, y, pageW - 30, 28, 2, 2, 'S');

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 120, 0);
      doc.text('FACTURE CERTIFIÉE — SYSTÈME NATIONAL DE FACTURATION ÉLECTRONIQUE', pageW / 2, y + 5, { align: 'center' });
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);

      const certLines = [
        `N° Fiscal: ${invoice.fiscal_number}    Code SECeF/DGI: ${invoice.code_secef_dgi || '—'}`,
        `NIM: ${invoice.nim || '—'}    Date certification: ${fmtDate(invoice.certification_datetime ?? '')}`,
        `UID: ${invoice.fnec_uid || '—'}`,
      ];
      let cy = y + 10;
      for (const line of certLines) {
        doc.text(line, pageW / 2, cy, { align: 'center' });
        cy += 4;
      }

      // QR placeholder
      if (invoice.qr_code) {
        const qrText = invoice.qr_code;
        doc.setFontSize(6);
        doc.text(`QR: ${qrText.substring(0, 60)}...`, pageW / 2, cy + 2, { align: 'center' });
      }
    }

    // --- Footer ---
    const footerY = doc.internal.pageSize.getHeight() - 10;
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text('Document généré par WIMRUX® FINANCES — SFE homologué DGI Burkina Faso', pageW / 2, footerY, { align: 'center' });
    doc.text(`Imprimé le ${fmtDate(new Date().toISOString())}`, pageW / 2, footerY + 3, { align: 'center' });
    doc.setTextColor(0);

    return doc;
  }

  function downloadPdf(
    invoice: Invoice,
    items: InvoiceItem[],
    company?: { name: string; ifu: string; rccm: string; address_cadastral: string; phone: string; email: string },
    client?: { name: string; ifu?: string | null; type: string; address?: string | null },
  ) {
    const doc = generatePdf(invoice, items, company, client);
    doc.save(`${invoice.reference}.pdf`);
  }

  return { generatePdf, downloadPdf };
}
