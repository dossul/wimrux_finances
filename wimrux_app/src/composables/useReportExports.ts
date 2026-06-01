import { ref, computed } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import { useAuthStore } from 'src/stores/auth-store';
import type {
  ReportExport, ReportExportInput, ReportType, ReportFormat,
} from 'src/types';

export function useReportExports() {
  const companyStore = useCompanyStore();
  const authStore = useAuthStore();
  const companyId = computed(() => companyStore.company?.id ?? '');
  const userId = computed(() => authStore.user?.id ?? null);

  const exports = ref<ReportExport[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function loadExports(limit = 50): Promise<void> {
    loading.value = true;
    error.value = null;
    const { data, error: err } = await insforge.database
      .from('report_exports')
      .select('*')
      .eq('company_id', companyId.value)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (err) { error.value = err.message; }
    else { exports.value = (data as ReportExport[]) || []; }
    loading.value = false;
  }

  /**
   * Records an export request in the DB and triggers a client-side
   * download of the provided content (no server roundtrip needed for CSV/JSON).
   * For PDF/XLSX, the actual rendering should be done by the caller or
   * an edge function; this composable just persists the metadata.
   */
  async function recordExport(input: ReportExportInput, fileUrl?: string): Promise<ReportExport | null> {
    const { data, error: err } = await insforge.database
      .from('report_exports')
      .insert([{
        company_id: companyId.value,
        user_id: userId.value,
        report_type: input.report_type,
        format: input.format,
        parameters: input.parameters || null,
        file_url: fileUrl || null,
        status: fileUrl ? 'completed' : 'pending',
        generated_at: fileUrl ? new Date().toISOString() : null,
      }])
      .select()
      .single();
    if (err) { error.value = err.message; return null; }
    await loadExports();
    return data as ReportExport;
  }

  async function deleteExport(id: string): Promise<boolean> {
    const { error: err } = await insforge.database
      .from('report_exports')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId.value);
    if (err) { error.value = err.message; return false; }
    await loadExports();
    return true;
  }

  /**
   * Triggers a browser download from a string content (CSV/JSON/HTML/SVG).
   */
  function downloadContent(filename: string, content: string, mimeType = 'text/csv;charset=utf-8'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * High-level helper : exports a CSV string and records the export.
   */
  async function exportAndDownloadCSV(
    reportType: ReportType,
    csvContent: string,
    filename: string,
    parameters?: Record<string, unknown>,
  ): Promise<void> {
    downloadContent(filename, csvContent, 'text/csv;charset=utf-8');
    const input: ReportExportInput = parameters
      ? { report_type: reportType, format: 'csv', parameters }
      : { report_type: reportType, format: 'csv' };
    await recordExport(input);
  }

  async function exportAndDownloadJSON(
    reportType: ReportType,
    data: unknown,
    filename: string,
    parameters?: Record<string, unknown>,
  ): Promise<void> {
    downloadContent(filename, JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
    const input: ReportExportInput = parameters
      ? { report_type: reportType, format: 'json', parameters }
      : { report_type: reportType, format: 'json' };
    await recordExport(input);
  }

  /**
   * Convert array of rows to a simple HTML table string (printable / PDF-able).
   */
  function rowsToHtml(rows: Record<string, unknown>[], title?: string): string {
    if (!rows.length) return `<html><body><h1>${title || 'Rapport'}</h1><p>Aucune donnée.</p></body></html>`;
    const headers = Object.keys(rows[0]!);
    const thead = `<thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${rows.map(r =>
      `<tr>${headers.map(h => `<td>${escapeHtml(String(r[h] ?? ''))}</td>`).join('')}</tr>`
    ).join('')}</tbody>`;
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title || 'Rapport')}</title>
<style>
body { font-family: -apple-system, sans-serif; padding: 20px; color: #333; }
h1 { color: #1a73e8; }
table { border-collapse: collapse; width: 100%; margin-top: 20px; }
th { background: #f5f5f5; padding: 8px; text-align: left; border: 1px solid #ddd; }
td { padding: 6px 8px; border: 1px solid #eee; }
tr:nth-child(even) { background: #fafafa; }
.footer { margin-top: 30px; font-size: 11px; color: #999; }
</style>
</head>
<body>
<h1>${escapeHtml(title || 'Rapport')}</h1>
<div class="meta">Généré le ${new Date().toLocaleString('fr-FR')}</div>
<table>${thead}${tbody}</table>
<div class="footer">Wimrux Finances — Rapport automatique</div>
</body>
</html>`;
  }

  async function exportAndDownloadHTML(
    reportType: ReportType,
    rows: Record<string, unknown>[],
    title: string,
    filename: string,
    parameters?: Record<string, unknown>,
  ): Promise<void> {
    const html = rowsToHtml(rows, title);
    downloadContent(filename, html, 'text/html;charset=utf-8');
    const input: ReportExportInput = parameters
      ? { report_type: reportType, format: 'pdf', parameters }
      : { report_type: reportType, format: 'pdf' };
    await recordExport(input);
  }

  function escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatLabel(format: ReportFormat): string {
    const map: Record<ReportFormat, string> = {
      csv: 'CSV',
      xlsx: 'Excel',
      pdf: 'PDF',
      json: 'JSON',
    };
    return map[format] || format;
  }

  function reportTypeLabel(t: ReportType): string {
    const map: Record<ReportType, string> = {
      balance_sheet: 'Bilan comptable',
      income_statement: 'Compte de résultat',
      cashflow: 'Trésorerie prévisionnelle',
      aged_receivables: 'Balance âgée',
      tax_summary: 'Synthèse fiscale',
      budget_vs_actual: 'Budget vs Réalisé',
      saved_query: 'Requête sauvegardée',
      custom: 'Personnalisé',
    };
    return map[t] || t;
  }

  /**
   * Appelle l'edge function `export-report` pour génération serveur.
   * Retourne { file_url, content, export_id, row_count } ou null en cas d'erreur.
   * Si content est présent (≤500 lignes), déclenche automatiquement le téléchargement.
   */
  async function exportViaEdgeFunction(
    reportType: ReportType,
    format: ReportFormat,
    parameters?: Record<string, unknown>,
    autoDownload = true,
  ): Promise<{ file_url: string | null; content?: string; export_id: string | null; row_count: number } | null> {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: fnErr } = await insforge.functions.invoke('export-report', {
        body: {
          report_type: reportType,
          format,
          company_id: companyId.value,
          parameters,
        },
      });
      if (fnErr) { error.value = fnErr.message; return null; }
      if (data?.success === false) { error.value = data?.error ?? 'Erreur edge function'; return null; }

      if (autoDownload && data?.content) {
        const extMap: Record<ReportFormat, string> = { csv: 'csv', json: 'json', pdf: 'html', xlsx: 'xlsx' };
        const mimeMap: Record<ReportFormat, string> = {
          csv: 'text/csv;charset=utf-8',
          json: 'application/json;charset=utf-8',
          pdf: 'text/html;charset=utf-8',
          xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        };
        const filename = `${reportType}_${format}_${Date.now()}.${extMap[format] ?? format}`;
        downloadContent(filename, data.content, mimeMap[format]);
      } else if (autoDownload && data?.file_url) {
        window.open(data.file_url, '_blank');
      }

      await loadExports();
      return { file_url: data?.file_url ?? null, content: data?.content, export_id: data?.export_id ?? null, row_count: data?.row_count ?? 0 };
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Erreur inconnue';
      return null;
    } finally {
      loading.value = false;
    }
  }

  return {
    exports, loading, error,
    loadExports, recordExport, deleteExport,
    downloadContent, exportAndDownloadCSV, exportAndDownloadJSON, exportAndDownloadHTML,
    exportViaEdgeFunction,
    rowsToHtml, formatLabel, reportTypeLabel,
  };
}
