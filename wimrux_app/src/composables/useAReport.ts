import { ref } from 'vue';
import { insforge } from 'src/boot/insforge';

// ============================================================================
// A-Rapport — Rapprochement fiscal par période
// Réf. Spéc. SFE §2.33
// ============================================================================

export interface AReportData {
  id?: string;
  company_id: string;
  period_start: string;
  period_end: string;
  total_fv: number;
  total_ft: number;
  total_fa: number;
  total_ev: number;
  total_et: number;
  total_ea: number;
  total_ht: number;
  total_tva: number;
  total_psvb: number;
  total_ttc: number;
  total_stamp_duty: number;
  invoice_count: number;
  generated_at?: string;
  report_data?: Record<string, unknown>;
}

export function useAReport() {
  const loading = ref(false);
  const report = ref<AReportData | null>(null);
  const history = ref<AReportData[]>([]);

  async function generateReport(companyId: string, periodStart: string, periodEnd: string): Promise<AReportData | null> {
    loading.value = true;
    try {
      // Aggregate certified invoices for the period
      const { data: invoices } = await insforge.database
        .from('invoices')
        .select('type, total_ht, total_tva, total_psvb, total_ttc, stamp_duty')
        .eq('company_id', companyId)
        .eq('status', 'certified')
        .gte('certified_at', periodStart)
        .lte('certified_at', periodEnd);

      if (!invoices || invoices.length === 0) return null;

      const rows = invoices as { type: string; total_ht: number; total_tva: number; total_psvb: number; total_ttc: number; stamp_duty: number }[];

      const result: AReportData = {
        company_id: companyId,
        period_start: periodStart,
        period_end: periodEnd,
        total_fv: rows.filter(r => r.type === 'FV').reduce((s, r) => s + (r.total_ttc || 0), 0),
        total_ft: rows.filter(r => r.type === 'FT').reduce((s, r) => s + (r.total_ttc || 0), 0),
        total_fa: rows.filter(r => r.type === 'FA').reduce((s, r) => s + (r.total_ttc || 0), 0),
        total_ev: rows.filter(r => r.type === 'EV').reduce((s, r) => s + (r.total_ttc || 0), 0),
        total_et: rows.filter(r => r.type === 'ET').reduce((s, r) => s + (r.total_ttc || 0), 0),
        total_ea: rows.filter(r => r.type === 'EA').reduce((s, r) => s + (r.total_ttc || 0), 0),
        total_ht: rows.reduce((s, r) => s + (r.total_ht || 0), 0),
        total_tva: rows.reduce((s, r) => s + (r.total_tva || 0), 0),
        total_psvb: rows.reduce((s, r) => s + (r.total_psvb || 0), 0),
        total_ttc: rows.reduce((s, r) => s + (r.total_ttc || 0), 0),
        total_stamp_duty: rows.reduce((s, r) => s + (r.stamp_duty || 0), 0),
        invoice_count: rows.length,
      };

      // Save to DB
      const { data: saved } = await insforge.database
        .from('fiscal_a_reports')
        .upsert({
          ...result,
          generated_at: new Date().toISOString(),
        }, { onConflict: 'company_id,period_start,period_end' })
        .select()
        .single();

      report.value = (saved as AReportData) || result;
      return report.value;
    } finally {
      loading.value = false;
    }
  }

  async function loadHistory(companyId: string) {
    loading.value = true;
    try {
      const { data } = await insforge.database
        .from('fiscal_a_reports')
        .select('*')
        .eq('company_id', companyId)
        .order('generated_at', { ascending: false })
        .limit(50);
      if (data) history.value = data as AReportData[];
    } finally {
      loading.value = false;
    }
  }

  return { loading, report, history, generateReport, loadHistory };
}
