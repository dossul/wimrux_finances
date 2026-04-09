import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import type { Invoice, InvoiceItem, InvoiceColors, InvoiceSettings, FiscalConfig } from 'src/types';
import { TAX_GROUP_RATES } from 'src/composables/useTaxCalculation';
import { numberToFrenchWords } from 'src/utils/numberToFrenchWords';

// ============================================================================
// PDF FEC — Conforme DGI Burkina Faso / SECeF / SYGMEF
// Mentions obligatoires : SFE §2.22-2.26
// ============================================================================

function makeFmtCur(currencyLabel: string) {
  return function fmtCur(n: number): string {
    const val = Math.round(n || 0);
    const abs = Math.abs(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u0020');
    return (val < 0 ? '-' : '') + abs + ' ' + currencyLabel;
  };
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
  PF: 'PROFORMA',
};

const CREDIT_NOTE_NATURE_LABELS: Record<string, string> = {
  COR: 'Correction',
  RAN: 'Retour de marchandises (avant livraison)',
  RAM: 'Retour de marchandises (après livraison)',
  RRR: 'Rabais / Remise / Ristourne',
};

export const DEFAULT_INVOICE_COLORS: InvoiceColors = {
  primary:     '#2962FF',
  header_bg:   '#2962FF',
  header_text: '#FFFFFF',
  row_odd_bg:  '#F5F5F5',
  row_even_bg: '#FFFFFF',
  row_text:    '#000000',
  total_bg:    '#E3F2FD',
  total_text:  '#000000',
  cert_border: '#009600',
  cert_title:  '#007800',
};

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function resolveColors(settings?: InvoiceSettings | null): InvoiceColors {
  return { ...DEFAULT_INVOICE_COLORS, ...(settings?.colors || {}) };
}

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
  logo_url?: string | null;
  invoice_settings?: InvoiceSettings | null;
  fiscal_config?: FiscalConfig | null;
}

export interface PdfClientInfo {
  name: string;
  ifu?: string | null;
  rccm?: string | null;
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
  qrScanBaseUrl?: string | undefined;
}

async function generateQrCodeDataUrl(data: string, baseUrl?: string): Promise<string | null> {
  try {
    const content = baseUrl ? `${baseUrl.replace(/\/$/, '')}/verify?q=${encodeURIComponent(data)}` : data;
    return await QRCode.toDataURL(content, { width: 80, margin: 1 });
  } catch {
    return null;
  }
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
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
    const colors = resolveColors(company?.invoice_settings);
    const fiscalCfg = company?.fiscal_config ?? null;
    const isProforma = invoice.type === 'PF';
    const isBF = !fiscalCfg || fiscalCfg.country === 'BF';
    const currencyLabel = fiscalCfg?.currency_label ?? 'FCFA';
    const psvbLabel = fiscalCfg?.psvb_label ?? 'PSVB';
    const fmtCur = makeFmtCur(currencyLabel);
    let y = 12;

    // --- Logo de l'entreprise ---
    const logoUrl = company?.logo_url ?? null;
    if (company?.invoice_settings?.show_logo && logoUrl) {
      const logoDataUrl = await fetchImageAsDataUrl(logoUrl);
      if (logoDataUrl) {
        const logoH = 16;
        const logoW = 40;
        const pos = company?.invoice_settings?.logo_position ?? 'left';
        const logoX = pos === 'right' ? pageW - 15 - logoW : pos === 'center' ? pageW / 2 - logoW / 2 : 15;
        doc.addImage(logoDataUrl, logoX, y - 2, logoW, logoH);
        y += logoH + 2;
      }
    }

    // --- DUPLICATA mention ---
    if (options?.isDuplicate) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(200, 0, 0);
      doc.text('DUPLICATA', pageW - 15, y, { align: 'right' });
      doc.setTextColor(0);
    }

    // --- Header ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('WIMRUX® FINANCES — Système de Facturation Électronique', pageW / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('SFE homologué DGI Burkina Faso — SECeF/SYGMEF', pageW / 2, y, { align: 'center' });
    y += 8;

    // --- Type & Reference ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const typeLabel = TYPE_LABELS[invoice.type] || invoice.type;
    doc.text(typeLabel, pageW / 2, y, { align: 'center' });
    y += 7;
    doc.setFontSize(12);
    doc.text(`Réf: ${invoice.reference}`, pageW / 2, y, { align: 'center' });

    // Avoir: nature et référence originale
    if ((invoice.type === 'FA' || invoice.type === 'EA') && options?.creditNoteNature) {
      y += 6;
      doc.setFontSize(10);
      const natureLabel = CREDIT_NOTE_NATURE_LABELS[options.creditNoteNature] || options.creditNoteNature;
      doc.text(`Nature : ${natureLabel}`, pageW / 2, y, { align: 'center' });
      if (options?.originalInvoiceRef) {
        y += 5;
        doc.text(`Facture d'origine : ${options.originalInvoiceRef}`, pageW / 2, y, { align: 'center' });
      }
    }
    y += 8;

    // --- Company (ÉMETTEUR) & Client side by side ---
    const colW = (pageW - 35) / 2;
    const leftX = 15;
    const rightX = leftX + colW + 5;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255);
    doc.setFillColor(colors.primary);
    doc.roundedRect(leftX, y - 4, colW, 6, 1, 1, 'F');
    doc.text('ÉMETTEUR', leftX + 2, y);
    doc.setFillColor(colors.primary);
    doc.roundedRect(rightX, y - 4, colW, 6, 1, 1, 'F');
    doc.text('DESTINATAIRE', rightX + 2, y);
    doc.setTextColor(0);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const ls = 5;
    let yL = y;
    if (company) {
      doc.setFont('helvetica', 'bold');
      doc.text(company.name, leftX, yL); yL += ls;
      doc.setFont('helvetica', 'normal');
      doc.text(`IFU : ${company.ifu}`, leftX, yL); yL += ls;
      doc.text(`RCCM : ${company.rccm}`, leftX, yL); yL += ls;
      const addrLinesL = doc.splitTextToSize(`Adresse : ${company.address_cadastral}`, colW - 4) as string[];
      for (const ln of addrLinesL) { doc.text(ln, leftX, yL); yL += ls; }
      const telLinesL = doc.splitTextToSize(`Tél : ${company.phone}${company.email ? ' — ' + company.email : ''}`, colW - 4) as string[];
      for (const ln of telLinesL) { doc.text(ln, leftX, yL); yL += ls; }
      if (fiscalCfg?.tax_category) {
        const subRegime = fiscalCfg.tax_sub_regime ? ` — ${fiscalCfg.tax_sub_regime}` : '';
        doc.text(`Catégorie : ${fiscalCfg.tax_category}${subRegime}`, leftX, yL); yL += ls;
      } else if (company.tax_regime) {
        doc.text(`Régime fiscal : ${company.tax_regime}`, leftX, yL); yL += ls;
      }
      if (company.tax_office) {
        doc.text(`Centre des impôts : ${company.tax_office}`, leftX, yL); yL += ls;
      }
      if (company.isf_number) {
        doc.text(`N° ISF : ${company.isf_number}`, leftX, yL); yL += ls;
      }
      if (company.bank_name || company.bank_account) {
        const bankLines = doc.splitTextToSize(`Banque : ${company.bank_name || '—'} — Compte : ${company.bank_account || '—'}`, colW - 4) as string[];
        for (const ln of bankLines) { doc.text(ln, leftX, yL); yL += ls; }
      }
      if (company.iban) {
        const ibanLines = doc.splitTextToSize(`IBAN : ${company.iban}`, colW - 4) as string[];
        for (const ln of ibanLines) { doc.text(ln, leftX, yL); yL += ls; }
      }
    }

    let yR = y;
    if (client) {
      doc.setFont('helvetica', 'bold');
      doc.text(client.name, rightX, yR); yR += ls;
      doc.setFont('helvetica', 'normal');
      doc.text(`Type : ${client.type}`, rightX, yR); yR += ls;
      if (client.ifu) {
        doc.text(`IFU : ${client.ifu}`, rightX, yR); yR += ls;
      } else if (invoice.type === 'EV' || invoice.type === 'ET' || invoice.type === 'EA') {
        doc.text('IFU : (export — libre)', rightX, yR); yR += ls;
      }
      if (client.rccm) {
        doc.text(`RCCM : ${client.rccm}`, rightX, yR); yR += ls;
      }
      if (client.address) {
        const addrLinesR = doc.splitTextToSize(`Adresse : ${client.address}`, colW - 4) as string[];
        for (const ln of addrLinesR) { doc.text(ln, rightX, yR); yR += ls; }
      }
      if (client.phone) {
        doc.text(`Tél : ${client.phone}`, rightX, yR); yR += ls;
      }
    } else {
      doc.text('Client comptant (PP)', rightX, yR); yR += ls;
    }

    y = Math.max(yL, yR) + 5;

    // --- Date facture ---
    doc.setFontSize(10);
    doc.text(`Date : ${fmtDate(invoice.created_at)}    Mode de prix : ${invoice.price_mode}`, leftX, y);
    y += 6;

    // --- Items table ---
    const tableHead = [['#', 'Code', 'Désignation', 'Type', 'Grp/Taux', 'Qté', 'Unité', 'P.U.', 'HT', 'TVA', 'TTC']];
    const tableBody = items.map((item, idx) => {
      let designation = item.name;
      if (item.discount && item.discount > 0) designation += ` (-${fmtCur(item.discount)})`;
      if (item.specific_tax && item.specific_tax > 0) designation += ` [T.Sp: ${fmtCur(item.specific_tax)}]`;
      // Get TVA rate for display
      const groupCfg = fiscalCfg?.tax_groups?.[item.tax_group];
      const tvaRate = groupCfg ? `${(groupCfg.tva * 100).toFixed(0)}%` : '';
      const groupWithRate = tvaRate ? `${item.tax_group}-${tvaRate}` : item.tax_group;
      return [
        String(idx + 1),
        item.code || '—',
        designation,
        item.type,
        groupWithRate,
        String(item.quantity),
        item.unit || 'u.',
        fmtCur(item.price),
        fmtCur(item.amount_ht),
        fmtCur(item.amount_tva),
        fmtCur(item.amount_ttc),
      ];
    });

    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: tableBody,
      styles: { fontSize: 9, cellPadding: 1.5, overflow: 'linebreak', textColor: hexToRgb(colors.row_text) },
      headStyles: { fillColor: hexToRgb(colors.header_bg), textColor: hexToRgb(colors.header_text), fontStyle: 'bold', fontSize: 9 },
      alternateRowStyles: { fillColor: hexToRgb(colors.row_odd_bg) },
      columnStyles: {
        0: { cellWidth: 5, halign: 'center' },
        1: { cellWidth: 14 },
        2: { cellWidth: 34 },
        3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 14, halign: 'center' },
        5: { cellWidth: 9, halign: 'right' },
        6: { cellWidth: 9 },
        7: { cellWidth: 22, halign: 'right' },
        8: { cellWidth: 20, halign: 'right' },
        9: { cellWidth: 20, halign: 'right' },
        10: { cellWidth: 21, halign: 'right' },
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
      const configGroups = fiscalCfg?.tax_groups ? Object.keys(fiscalCfg.tax_groups) : Object.keys(TAX_GROUP_RATES);
      for (const g of configGroups) {
        const ht = calc.totalHT?.[g] || 0;
        const tva = calc.tva?.[g] || 0;
        const psvb = calc.psvb?.[g] || 0;
        if (ht > 0 || tva > 0) {
          const groupCfg = fiscalCfg?.tax_groups?.[g];
          const tvaRate = groupCfg ? `${(groupCfg.tva * 100).toFixed(0)}%` : '';
          if (isBF) {
            taxRows.push([`${g}`, tvaRate, fmtCur(ht), fmtCur(tva), fmtCur(psvb)]);
          } else {
            taxRows.push([tvaRate, fmtCur(ht), fmtCur(tva)]);
          }
        }
      }

      if (taxRows.length > 0) {
        const taxHead = isBF ? [['Grp', 'Taux', 'HT', 'TVA', psvbLabel]] : [['Taux', 'HT', 'TVA']];
        autoTable(doc, {
          startY: y,
          head: taxHead,
          body: taxRows,
          styles: { fontSize: 8, cellPadding: 1.5 },
          headStyles: { fillColor: [80, 80, 80], textColor: 255, fontSize: 8 },
          margin: { left: taxSummaryX, right: totalsX },
          tableWidth: halfW,
        });
      }
    }

    // Totals box (right side)
    const boxW = halfW - 5;
    doc.setDrawColor(colors.primary);
    doc.setFillColor(colors.total_bg);
    doc.roundedRect(totalsX, y, boxW, 44, 2, 2, 'FD');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const totalsData: [string, string][] = [
      ['Total HT :', fmtCur(invoice.total_ht)],
      ['TVA :', fmtCur(invoice.total_tva)],
    ];
    if (isBF && invoice.total_psvb > 0) {
      totalsData.push([`${psvbLabel} :`, fmtCur(invoice.total_psvb)]);
    }
    if (invoice.stamp_duty > 0) {
      totalsData.push(['Timbre quittance :', fmtCur(invoice.stamp_duty)]);
    }

    let ty = y + 6;
    for (const row of totalsData) {
      doc.text(row[0], totalsX + 3, ty);
      doc.text(row[1], totalsX + boxW - 3, ty, { align: 'right' });
      ty += 6;
    }

    doc.setDrawColor(colors.primary);
    doc.line(totalsX + 2, ty - 1, totalsX + boxW - 2, ty - 1);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL TTC :', totalsX + 3, ty + 5);
    doc.text(fmtCur(invoice.total_ttc), totalsX + boxW - 3, ty + 5, { align: 'right' });

    const tableEnd = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y;
    y = Math.max(tableEnd, y + 48) + 5;

    // --- Montant en lettres ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    const amountWords = numberToFrenchWords(invoice.total_ttc + (invoice.stamp_duty || 0));
    doc.text(`Arrêtée la présente facture à la somme de : ${amountWords}`, leftX, y);
    y += 6;

    // --- Payments ---
    if (options?.payments && options.payments.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Modes de paiement :', leftX, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      for (const p of options.payments) {
        doc.text(`• ${p.type} : ${fmtCur(p.amount)}`, leftX + 3, y);
        y += 5;
      }
      y += 2;
    }

    // --- Comments / Observations ---
    if (options?.comments) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Observations :', leftX, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(options.comments, pageW - 30);
      doc.text(lines, leftX, y);
      y += lines.length * 5 + 2;
    }

    // --- Mentions conditionnelles ---
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100);

    // Proforma mention
    if (isProforma) {
      doc.setFont('helvetica', 'bold');
      doc.text('Document non contractuel — Ce document n\'est pas une facture définitive.', leftX, y);
      doc.setFont('helvetica', 'italic');
      y += 4;
    }

    // Exonération (BF uniquement)
    if (isBF) {
      const hasExoGroup = items.some(i => {
        const r = fiscalCfg?.tax_groups?.[i.tax_group] ?? TAX_GROUP_RATES[i.tax_group];
        return r?.tva === 0;
      });
      if (hasExoGroup) {
        doc.text('Exonération de TVA conformément au Code Général des Impôts du Burkina Faso', leftX, y);
        y += 4;
      }
    }

    // Export
    if (invoice.type === 'EV' || invoice.type === 'ET' || invoice.type === 'EA') {
      doc.text('Facture export — TVA non applicable (art. 343 CGI BF)', leftX, y);
      y += 4;
    }

    doc.setTextColor(0);
    doc.setFont('helvetica', 'normal');

    // --- Opérateur ---
    if (options?.operatorName) {
      y += 2;
      doc.setFontSize(10);
      doc.text(`Opérateur : ${options.operatorName}`, leftX, y);
      y += 6;
    }

    // --- Certification block + QR Code (BF certified, not Proforma) ---
    if (!isProforma && invoice.status === 'certified' && invoice.fiscal_number) {
      if (y > pageH - 60) {
        doc.addPage();
        y = 15;
      }

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const isf = invoice.nim ? invoice.nim.substring(0, 4) : '—';
      const qrX = pageW - 46;
      const qrSize = 28;

      // Left column width: space before QR code
      const certColW = qrX - 20 - 4; // ~140mm

      // Cert data lines — wrapped within left column
      const certDataLinesRaw: string[] = [
        `N° Fiscal : ${invoice.fiscal_number}    Code SECeF/DGI : ${invoice.code_secef_dgi || '—'}`,
        `NIM : ${invoice.nim || '—'}    ISF : ${isf}    Compteurs : ${invoice.counters || '—'}`,
        `Date certification : ${fmtDate(invoice.certification_datetime ?? '')}    UID : ${invoice.mcf_uid || '—'}`,
      ];
      const certDataWrapped: string[] = certDataLinesRaw.flatMap(
        l => doc.splitTextToSize(l, certColW) as string[],
      );

      // Signature: manual char chunking (hex has no spaces — splitTextToSize cannot break it)
      // ~1.65mm/char at fontSize 9 helvetica → certColW(140mm) / 1.65 ≈ 84 chars
      const sigValue = invoice.signature || '—';
      const sigLabel = 'Signature : ';
      const charsPerLine = 84;
      const sigLines: string[] = [];
      if (sigValue.length <= charsPerLine - sigLabel.length) {
        sigLines.push(sigLabel + sigValue);
      } else {
        const firstCap = charsPerLine - sigLabel.length;
        sigLines.push(sigLabel + sigValue.substring(0, firstCap));
        for (let off = firstCap; off < sigValue.length; off += charsPerLine) {
          sigLines.push(sigValue.substring(off, off + charsPerLine));
        }
      }

      const allCertLines = [...certDataWrapped, ...sigLines];
      const certBoxH = Math.max(13 + allCertLines.length * 5 + 4, 4 + qrSize + 8);

      doc.setDrawColor(colors.cert_border);
      doc.setLineWidth(0.5);
      doc.roundedRect(15, y, pageW - 30, certBoxH, 2, 2, 'S');

      // Title
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(colors.cert_title);
      const certTitleCX = (15 + qrX) / 2;
      const certTitleMaxW = qrX - 15 - 4;
      doc.text('FACTURE ÉLECTRONIQUE CERTIFIÉE — SECeF / DGI BURKINA FASO', certTitleCX, y + 6, { align: 'center', maxWidth: certTitleMaxW });
      doc.setTextColor(0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      // All lines in left column
      let cy = y + 13;
      for (const line of allCertLines) {
        doc.text(line, 20, cy);
        cy += 5;
      }

      // QR Code
      if (invoice.qr_code) {
        const qrDataUrl = await generateQrCodeDataUrl(invoice.qr_code, options?.qrScanBaseUrl);
        if (qrDataUrl) {
          doc.addImage(qrDataUrl, 'PNG', qrX, y + 4, qrSize, qrSize);
        }
      }

      y += certBoxH + 5;
    }

    // --- Mentions légales obligatoires (pied de facture) ---
    const legalY = pageH - 20;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);

    if (isProforma) {
      doc.setFont('helvetica', 'bold');
      doc.text('DOCUMENT PROFORMA — NON CONTRACTUEL', pageW / 2, legalY, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text('Ce document est établi à titre informatif. Il ne constitue pas une facture définitive et ne génère aucune obligation fiscale.', pageW / 2, legalY + 4, { align: 'center', maxWidth: pageW - 30 });
    } else if (isBF) {
      doc.setFont('helvetica', 'bold');
      doc.text('EXIGEZ LA FACTURE ÉLECTRONIQUE CERTIFIÉE', pageW / 2, legalY, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.text("Émise conformément à l'Arrêté n°2023-00216/MEFP/SG/DGI et à l'Arrêté n°2025-0049/MEF/SG/DGI — SECeF Burkina Faso.", pageW / 2, legalY + 4, { align: 'center' });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.text(`Document généré par WIMRUX® FINANCES`, pageW / 2, legalY, { align: 'center' });
    }
    doc.text(`Imprimé le ${fmtDate(new Date().toISOString())}`, pageW / 2, legalY + 8, { align: 'center' });

    if (options?.isDuplicate) {
      doc.setTextColor(200, 0, 0);
      doc.text('DUPLICATA — Ce document est une copie de la facture originale', pageW / 2, legalY + 12, { align: 'center' });
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
