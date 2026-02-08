import type { Invoice } from 'src/types';

function escapeCsv(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = typeof val === 'string' ? val : JSON.stringify(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function useExportCsv() {

  function exportInvoices(invoices: Invoice[], filename = 'factures.csv') {
    const headers = ['Référence', 'Type', 'Statut', 'Date', 'Total HT', 'TVA', 'PSVB', 'Total TTC', 'Timbre', 'N° Fiscal', 'NIM'];
    const rows = invoices.map(inv => [
      inv.reference,
      inv.type,
      inv.status,
      inv.created_at,
      inv.total_ht,
      inv.total_tva,
      inv.total_psvb,
      inv.total_ttc,
      inv.stamp_duty,
      inv.fiscal_number ?? '',
      inv.nim ?? '',
    ]);

    const csv = [
      headers.map(escapeCsv).join(','),
      ...rows.map(r => r.map(escapeCsv).join(',')),
    ].join('\n');

    downloadFile(csv, filename);
  }

  function exportGeneric(headers: string[], rows: unknown[][], filename: string) {
    const csv = [
      headers.map(escapeCsv).join(','),
      ...rows.map(r => r.map(escapeCsv).join(',')),
    ].join('\n');

    downloadFile(csv, filename);
  }

  return { exportInvoices, exportGeneric };
}
