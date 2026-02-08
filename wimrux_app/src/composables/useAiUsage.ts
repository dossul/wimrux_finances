import { ref } from 'vue';
import { insforge } from 'src/boot/insforge';
import type { AiUsageLog, AiUsageByModel, AiUsageByCompany } from 'src/types';

export function useAiUsage() {
  const logs = ref<AiUsageLog[]>([]);
  const byModel = ref<AiUsageByModel[]>([]);
  const byCompany = ref<AiUsageByCompany[]>([]);
  const moderationLogs = ref<AiUsageLog[]>([]);
  const loading = ref(false);
  const totals = ref({ requests: 0, tokens_input: 0, tokens_output: 0, errors: 0, moderations: 0, cost_usd: 0 });

  /** Fetch usage logs for the current company (with optional date range) */
  async function fetchCompanyUsage(from?: string, to?: string) {
    loading.value = true;
    try {
      let query = insforge.database
        .from('ai_usage_logs')
        .select('*')
        .order('created_at', { ascending: false });
      if (from) query = query.gte('created_at', from);
      if (to) query = query.lte('created_at', to);
      const { data } = await query;
      logs.value = (data || []) as AiUsageLog[];
      aggregateByModel(logs.value);
      extractModerations(logs.value);
      computeTotals(logs.value);
    } finally {
      loading.value = false;
    }
  }

  /** Admin: fetch usage across ALL companies (requires admin RLS bypass or service role) */
  async function fetchAllUsage(from?: string, to?: string) {
    loading.value = true;
    try {
      let query = insforge.database
        .from('ai_usage_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5000);
      if (from) query = query.gte('created_at', from);
      if (to) query = query.lte('created_at', to);
      const { data } = await query;
      const allLogs = (data || []) as AiUsageLog[];
      logs.value = allLogs;
      aggregateByModel(allLogs);
      extractModerations(allLogs);
      computeTotals(allLogs);
      await aggregateByCompanyFromLogs(allLogs);
    } finally {
      loading.value = false;
    }
  }

  function aggregateByModel(source: AiUsageLog[]) {
    const map = new Map<string, AiUsageByModel>();
    for (const log of source) {
      const existing = map.get(log.model) || {
        model: log.model, requests: 0, tokens_input: 0, tokens_output: 0,
        tokens_total: 0, errors: 0, moderations: 0, cost_usd: 0,
      };
      existing.requests++;
      existing.tokens_input += log.tokens_input;
      existing.tokens_output += log.tokens_output;
      existing.tokens_total += log.tokens_input + log.tokens_output;
      if (log.status === 'error') existing.errors++;
      if (log.moderation_flagged) existing.moderations++;
      existing.cost_usd += Number(log.cost_usd) || 0;
      map.set(log.model, existing);
    }
    byModel.value = Array.from(map.values()).sort((a, b) => b.tokens_total - a.tokens_total);
  }

  function extractModerations(source: AiUsageLog[]) {
    moderationLogs.value = source.filter(l => l.moderation_flagged);
  }

  function computeTotals(source: AiUsageLog[]) {
    totals.value = source.reduce((acc, l) => ({
      requests: acc.requests + 1,
      tokens_input: acc.tokens_input + l.tokens_input,
      tokens_output: acc.tokens_output + l.tokens_output,
      errors: acc.errors + (l.status === 'error' ? 1 : 0),
      moderations: acc.moderations + (l.moderation_flagged ? 1 : 0),
      cost_usd: acc.cost_usd + (Number(l.cost_usd) || 0),
    }), { requests: 0, tokens_input: 0, tokens_output: 0, errors: 0, moderations: 0, cost_usd: 0 });
  }

  async function aggregateByCompanyFromLogs(source: AiUsageLog[]) {
    const companyMap = new Map<string, AiUsageByCompany>();
    for (const log of source) {
      const existing = companyMap.get(log.company_id) || {
        company_id: log.company_id, company_name: '', requests: 0,
        tokens_input: 0, tokens_output: 0, tokens_total: 0,
        errors: 0, moderations: 0, cost_usd: 0, models_used: [],
      };
      existing.requests++;
      existing.tokens_input += log.tokens_input;
      existing.tokens_output += log.tokens_output;
      existing.tokens_total += log.tokens_input + log.tokens_output;
      if (log.status === 'error') existing.errors++;
      if (log.moderation_flagged) existing.moderations++;
      existing.cost_usd += Number(log.cost_usd) || 0;
      if (!existing.models_used.includes(log.model)) existing.models_used.push(log.model);
      companyMap.set(log.company_id, existing);
    }

    // Resolve company names
    const ids = Array.from(companyMap.keys());
    if (ids.length) {
      const { data: companies } = await insforge.database
        .from('companies')
        .select('id, name')
        .in('id', ids);
      if (companies) {
        for (const c of companies as { id: string; name: string }[]) {
          const entry = companyMap.get(c.id);
          if (entry) entry.company_name = c.name;
        }
      }
    }
    byCompany.value = Array.from(companyMap.values()).sort((a, b) => b.tokens_total - a.tokens_total);
  }

  return {
    logs, byModel, byCompany, moderationLogs, loading, totals,
    fetchCompanyUsage, fetchAllUsage,
  };
}
