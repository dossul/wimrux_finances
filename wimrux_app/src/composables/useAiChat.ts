// =============================================================================
// WIMRUX® FINANCES — useAiChat
// Chat fiscal/comptable + NL-to-SQL
// Calls OpenRouter directly (same pattern as useAiAssistant) to avoid 403.
// =============================================================================
import { ref } from 'vue';
import { useCompanyStore } from 'src/stores/company-store-appwrite';
import { useAuthStore } from 'src/stores/auth-store-appwrite';
import { useCrypto } from 'src/composables/useCrypto';
import type { AiRouting } from 'src/types';
import { appwriteDb } from 'src/services/appwrite-db';
import { functions } from 'src/boot/appwrite';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export type MessageRole = 'user' | 'assistant' | 'system';
export type ChatMode = 'assistant_fiscal' | 'assistant_comptable' | 'nl_to_sql';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  sql?: string;
  rows?: unknown[];
  model_used?: string;
  is_fallback?: boolean;
  error?: string;
  mode?: string;
  _showSql?: boolean;   // UI toggle — hidden by default
  created_at: Date;
}

// ─── System prompts per mode ──────────────────────────────────────────────────
const SYSTEM_PROMPTS: Record<ChatMode, string> = {
  assistant_fiscal: `Tu es un assistant fiscal expert pour le Burkina Faso et la zone UEMOA.
Tu aides les utilisateurs de WIMRUX® FINANCES avec :
- La réglementation fiscale burkinabè (TVA 18%, PSVB, timbre quittance, groupes A-P)
- Les factures normalisées et les exigences DGI
- Le calcul des taxes et la conformité fiscale
- Les déclarations (mensuelle, trimestrielle, annuelle)
- Les régimes RNI, RSI et leurs seuils
Réponds toujours en français. Sois précis et actionnable.`,

  assistant_comptable: `Tu es un expert-comptable OHADA spécialisé en gestion d'entreprise.
Tu aides avec :
- Le plan comptable OHADA et les journaux comptables
- Les écritures de régularisation, d'inventaire et de clôture
- Le calcul du BFR, de la trésorerie nette, du fonds de roulement
- L'analyse des états financiers (bilan, compte de résultat)
Réponds en français avec des écritures comptables concrètes quand c'est pertinent.`,

  nl_to_sql: `Tu es un expert SQL PostgreSQL pour une application de gestion financière africaine (WIMRUX® FINANCES).
L'utilisateur pose des questions en français sur ses données. Tu génères la requête SQL SELECT optimale.

RÈGLES STRICTES :
- Réponds UNIQUEMENT avec le SQL brut, sans explication, sans bloc markdown, sans commentaires
- Toujours filtrer par company_id = '[ID_COMPANY]' (sera remplacé dynamiquement)
- Ne jamais utiliser UPDATE, DELETE, INSERT, DROP, ALTER
- Limiter à 200 lignes max par défaut (LIMIT 200)
- Utiliser UNIQUEMENT les colonnes listées ci-dessous pour chaque table

SCHÉMA EXACT DES TABLES :

TABLE invoices (factures émises) :
  id, company_id, invoice_number, client_name, client_id, issue_date, due_date,
  total_ht, total_ttc, tax_amount, status (draft/sent/paid/cancelled/overdue),
  currency, payment_date, notes, created_at

TABLE clients :
  id, company_id, name, email, phone, ifu, city, country, client_type, created_at

TABLE suppliers (fournisseurs) :
  id, company_id, name, email, phone, ifu, city, created_at

TABLE bank_transactions (transactions bancaires) :
  id, company_id, transaction_date, label, amount, direction (debit/credit),
  balance, bank_name, reference, created_at

TABLE treasury_movements (mouvements de trésorerie) :
  id, company_id, movement_date, label, amount, type, category, created_at

TABLE tax_payments (paiements fiscaux) :
  id, company_id, payment_date, tax_type, amount, period, status, created_at

TABLE budgets :
  id, company_id, name, start_date, end_date, total_budget, status, created_at

TABLE loans (emprunts) :
  id, company_id, lender_name, amount, interest_rate, start_date, end_date,
  remaining_balance, status, created_at

TABLE investments (investissements) :
  id, company_id, name, amount, current_value, investment_date, type, created_at

TABLE petty_cash_movements (petite caisse) :
  id, company_id, movement_date, label, amount, direction (in/out), created_at

TABLE mobile_wallet_transactions :
  id, company_id, transaction_date, label, amount, direction (debit/credit),
  wallet_provider, reference, created_at

EXEMPLES :
- "factures impayées" → SELECT invoice_number, client_name, due_date, total_ttc FROM invoices WHERE company_id='[ID]' AND status='overdue' ORDER BY due_date LIMIT 200
- "trésorerie du mois" → SELECT movement_date, label, amount, type FROM treasury_movements WHERE company_id='[ID]' AND movement_date >= DATE_TRUNC('month', CURRENT_DATE) ORDER BY movement_date DESC LIMIT 200`,
};


// ─── Default models per mode ──────────────────────────────────────────────────
const DEFAULT_MODELS: Record<ChatMode, { model: string; fallback: string }> = {
  assistant_fiscal:    { model: 'anthropic/claude-sonnet-4-5', fallback: 'openai/gpt-4o-mini' },
  assistant_comptable: { model: 'openai/gpt-4o-mini',          fallback: 'deepseek/deepseek-v3' },
  nl_to_sql:           { model: 'openai/gpt-4o-mini',          fallback: 'deepseek/deepseek-v3' },
};

// ─── Tables whitelisted for direct DB execution ───────────────────────────────
const SAFE_TABLES = [
  'invoices', 'clients', 'suppliers', 'bank_transactions', 'treasury_movements',
  'tax_payments', 'budgets', 'budget_lines', 'fixed_assets', 'loans',
  'investments', 'petty_cash_movements', 'mobile_wallet_transactions',
];

// ─── Module-level singleton — persists across navigation ──────────────────────
const _messages = ref<ChatMessage[]>([]);
const _loading  = ref(false);
const _error    = ref<string | null>(null);
const _mode     = ref<ChatMode>('assistant_fiscal');

export function useAiChat() {
  const companyStore = useCompanyStore();
  const authStore    = useAuthStore();
  const { decrypt }  = useCrypto();

  const messages = _messages;
  const loading  = _loading;
  const error    = _error;
  const mode     = _mode;

  // ─── Key resolution ───────────────────────────────────────────────────────
  async function resolvePlatformKey(): Promise<string> {
    try {
      const { data } = await appwriteDb
        .from('companies')
        .select('openrouter_api_key')
        .eq('is_platform_provider', true)
        .limit(1);
      const row = (data as { openrouter_api_key?: string | null }[] | null)?.[0];
      return row?.openrouter_api_key || '';
    } catch { return ''; }
  }

  async function resolveApiKey(): Promise<string | null> {
    const company = companyStore.company;
    let encryptedKey = company?.openrouter_api_key || '';
    if (!encryptedKey) encryptedKey = await resolvePlatformKey();
    if (!encryptedKey) return null;
    const { plaintext, error: decErr } = await decrypt(encryptedKey);
    return (!decErr && plaintext) ? plaintext : encryptedKey;
  }

  function getModels(): { model: string; fallback: string } {
    const company = companyStore.company;
    const routing = company?.ai_routing as AiRouting | null;
    if (!routing) return DEFAULT_MODELS[mode.value] ?? DEFAULT_MODELS.assistant_fiscal;
    const taskMap: Record<ChatMode, keyof AiRouting> = {
      assistant_fiscal:    'assistant_fiscal',
      assistant_comptable: 'assistant_fiscal',
      nl_to_sql:           'assistant_fiscal',
    };
    const route = routing[taskMap[mode.value]];
    if (route) return { model: route.model, fallback: route.fallback || '' };
    return DEFAULT_MODELS[mode.value] ?? DEFAULT_MODELS.assistant_fiscal;
  }

  // ─── Usage logging ────────────────────────────────────────────────────────
  async function logUsage(params: {
    model: string; task: string;
    tokens_input: number; tokens_output: number;
    latency_ms: number; status: string; is_fallback: boolean;
    error_message: string | null;
    moderation_flagged: boolean; moderation_reason: string | null;
  }) {
    try {
      const companyId = companyStore.company?.id;
      const userId    = authStore.user?.id;
      if (!companyId || !userId) return;
      await appwriteDb.from('ai_usage_logs').insert([{
        company_id: companyId, user_id: userId, ...params,
      }]);
    } catch { /* silent */ }
  }

  // ─── OpenRouter direct call ───────────────────────────────────────────────
  async function callOpenRouter(
    apiKey: string,
    modelId: string,
    apiMessages: { role: string; content: string }[],
    taskLabel = mode.value as string,
    isFallbackCall = false,
  ): Promise<{ content: string; model_used: string; is_fallback: boolean }> {
    const startMs = Date.now();
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'WIMRUX FINANCES',
      },
      body: JSON.stringify({ model: modelId, messages: apiMessages, temperature: 0.3, max_tokens: 2048 }),
    });
    const latency_ms = Date.now() - startMs;

    if (!response.ok) {
      const { fallback } = getModels();
      if (fallback && fallback !== modelId && !isFallbackCall) {
        return callOpenRouter(apiKey, fallback, apiMessages, taskLabel, true)
          .then(r => ({ ...r, is_fallback: true }));
      }
      const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
      const errMsg = err.error?.message || `OpenRouter ${response.status}`;
      void logUsage({ model: modelId, task: taskLabel, tokens_input: 0, tokens_output: 0,
        latency_ms, status: 'error', is_fallback: isFallbackCall,
        error_message: errMsg, moderation_flagged: false, moderation_reason: null });
      throw new Error(errMsg);
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string; refusal?: string } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      moderation?: { flagged?: boolean; categories?: string[] };
    };
    const content    = data.choices?.[0]?.message?.content || 'Pas de réponse.';
    const refusal    = data.choices?.[0]?.message?.refusal;
    const modFlagged = !!data.moderation?.flagged || !!refusal;
    const modReason  = refusal || data.moderation?.categories?.join(', ') || null;
    const tIn        = data.usage?.prompt_tokens     || 0;
    const tOut       = data.usage?.completion_tokens || 0;

    void logUsage({ model: modelId, task: taskLabel, tokens_input: tIn, tokens_output: tOut,
      latency_ms, status: modFlagged ? 'moderated' : 'success', is_fallback: isFallbackCall,
      error_message: null, moderation_flagged: modFlagged, moderation_reason: modReason });

    return { content, model_used: modelId, is_fallback: isFallbackCall };
  }

  // ─── Safe SQL executor via Appwrite DB ────────────────────────────────────
  /**
   * Extracts the table name from the SQL, validates it against the whitelist,
   * and runs a scoped SELECT via Appwrite database (always filtered by company_id).
   */
  async function executeSqlDirect(sql: string): Promise<unknown[]> {
    const tableMatch = sql.match(/FROM\s+["']?(\w+)["']?/i);
    if (!tableMatch) throw new Error('Impossible de déterminer la table cible dans la requête.');

    const tableName = (tableMatch[1] || '').toLowerCase();
    if (!SAFE_TABLES.includes(tableName)) {
      throw new Error(`Table "${tableName}" non autorisée.`);
    }

    const companyId = companyStore.company?.id;
    if (!companyId) throw new Error('Entreprise non chargée.');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = appwriteDb
      .from(tableName)
      .select('*')
      .eq('company_id', companyId)
      .limit(200);

    // Best-effort WHERE clause parsing (exclude company_id, already applied)
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER BY|\s+GROUP BY|\s+LIMIT|;|$)/is);
    if (whereMatch) {
      const whereClause = whereMatch[1] || '';
      for (const cond of whereClause.split(/\bAND\b/i)) {
        const t = cond.trim();
        if (/company_id/i.test(t)) continue;

        // col = 'val'  or  col = val
        const eq = t.match(/^(\w+)\s*=\s*['"]?([^'"]+)['"]?\s*$/);
        if (eq) { query = query.eq(eq[1] || '', (eq[2] || '').trim()); continue; }

        // col >= val
        const gte = t.match(/^(\w+)\s*>=\s*['"]?([^'"]+)['"]?\s*$/);
        if (gte) { query = query.gte(gte[1] || '', (gte[2] || '').trim()); continue; }

        // col <= val
        const lte = t.match(/^(\w+)\s*<=\s*['"]?([^'"]+)['"]?\s*$/);
        if (lte) { query = query.lte(lte[1] || '', (lte[2] || '').trim()); continue; }

        // col ILIKE '%val%'
        const like = t.match(/^(\w+)\s+I?LIKE\s+['"]?([^'"]+)['"]?\s*$/i);
        if (like) { query = query.ilike(like[1] || '', (like[2] || '').trim()); continue; }
      }
    }

    // Best-effort ORDER BY
    const orderMatch = sql.match(/ORDER BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      const col = orderMatch[1] || 'id';
      const asc = (orderMatch[2] || 'ASC').toUpperCase() === 'ASC';
      query = query.order(col, { ascending: asc });
    }

    const { data, error: dbErr } = await query;
    if (dbErr) throw new Error(dbErr.message);
    return (data as unknown[]) || [];
  }

  // ─── NL-to-SQL : generate SQL or execute it ───────────────────────────────
  async function callNlToSql(question: string, execute: boolean): Promise<{
    content: string; sql?: string; rows?: unknown[];
  }> {
    const companyId = companyStore.company?.id || '';

    // ── Case 1: Execute existing SQL (EXECUTE: prefix) ────────────────────
    // The button "Exécuter" sends `EXECUTE: SELECT ...` — run directly.
    if (question.startsWith('EXECUTE:')) {
      const sqlToRun = question.slice('EXECUTE:'.length).trim();
      try {
        const rows = await executeSqlDirect(sqlToRun);

        // Ask AI to interpret/summarise the results
        const apiKey = await resolveApiKey();
        let interpretation = `**${rows.length} enregistrement(s) retourné(s)**`;

        if (apiKey && rows.length > 0) {
          try {
            const { model } = getModels();
            const sample = JSON.stringify(rows.slice(0, 5), null, 2);
            const aiResult = await callOpenRouter(apiKey, model, [
              {
                role: 'system',
                content: 'Tu es un assistant financier. Interprète brièvement ces données en français (2-3 phrases, chiffres clés). Sois concis et utile.',
              },
              {
                role: 'user',
                content: `Résultats (${rows.length} lignes, aperçu 5 premières) :\n${sample}\n\nFais une synthèse utile.`,
              },
            ], 'nl_to_sql');
            interpretation = aiResult.content;
          } catch { /* interprétation optionnelle, ne bloque pas */ }
        }

        return { content: interpretation, sql: sqlToRun, rows };
      } catch (e) {
        const errMsg = e instanceof Error ? e.message : 'Erreur d\'exécution';
        return { content: `⚠️ Erreur d'exécution : ${errMsg}`, sql: sqlToRun };
      }
    }

    // ── Case 2: Generate SQL from natural language ─────────────────────────
    const apiKey = await resolveApiKey();

    // Try Appwrite function first (it may work for some tenants)
    try {
      const { data, error: fnErr } = await (async () => { try { const r = await functions.createExecution('nl-to-sql', JSON.stringify({ question, company_id: companyId, execute, api_key: apiKey })); return { data: (() => { try { return JSON.parse(r.responseBody); } catch { return r.responseBody; } })(), error: null }; } catch(e) { return { data: null, error: e as Error }; } })();
      if (!fnErr && data?.success) {
        if (execute && data.rows) {
          const r: { content: string; sql?: string; rows?: unknown[] } = {
            content: `**${(data.rows as unknown[]).length} enregistrement(s) retourné(s)**`,
            rows: data.rows as unknown[],
          };
          if (data.sql) r.sql = data.sql as string;
          return r;
        }
        const r: { content: string; sql?: string } = { content: 'Requête SQL générée :' };
        if (data.sql) r.sql = data.sql as string;
        return r;
      }
    } catch { /* function not available — fallback to direct OpenRouter */ }

    // Fallback: generate SQL via OpenRouter
    if (!apiKey) throw new Error('Aucune clé API configurée.');

    const { model } = getModels();
    const result = await callOpenRouter(apiKey, model, [
      {
        role: 'system',
        content: SYSTEM_PROMPTS.nl_to_sql + `\n\nL'ID de l'entreprise est : ${companyId}`,
      },
      { role: 'user', content: question },
    ], 'nl_to_sql');

    const sql = result.content
      .replace(/```sql\n?/gi, '')
      .replace(/```\n?/gi, '')
      .trim();

    // If execute was requested immediately, run the generated SQL
    if (execute && sql) {
      try {
        const rows = await executeSqlDirect(sql);
        return { content: `**${rows.length} enregistrement(s) retourné(s)**`, sql, rows };
      } catch { /* fallback — show SQL without execution */ }
    }

    return { content: 'Requête SQL générée :', sql };
  }

  // ─── State helpers ────────────────────────────────────────────────────────
  function clearHistory() { messages.value = []; }

  function pushMessage(msg: Omit<ChatMessage, 'id' | 'created_at'>): ChatMessage {
    const m: ChatMessage = { ...msg, id: crypto.randomUUID(), created_at: new Date() };
    messages.value.push(m);
    return m;
  }

  // ─── Main send ────────────────────────────────────────────────────────────
  async function sendMessage(text: string, executeSQL = false) {
    if (!text.trim()) return;
    loading.value = true;
    error.value   = null;

    pushMessage({ role: 'user', content: text });

    try {
      if (mode.value === 'nl_to_sql') {
        const result = await callNlToSql(text, executeSQL);
        const msg: Omit<ChatMessage, 'id' | 'created_at'> = {
          role: 'assistant',
          content: result.content,
          mode: mode.value,
        };
        if (result.sql  !== undefined) msg.sql  = result.sql;
        if (result.rows !== undefined) msg.rows = result.rows;
        pushMessage(msg);
      } else {
        const apiKey = await resolveApiKey();
        if (!apiKey) {
          pushMessage({
            role: 'assistant',
            content: '⚠️ Aucune clé API OpenRouter configurée. Contactez votre administrateur ou ajoutez votre clé dans Paramètres → Intelligence Artificielle.',
            mode: mode.value,
          });
          return;
        }

        const history = messages.value.slice(-12).map(m => ({ role: m.role, content: m.content }));
        const { model } = getModels();
        const systemPrompt = SYSTEM_PROMPTS[mode.value];

        const apiMessages = [
          { role: 'system', content: systemPrompt },
          ...history.filter(m => m.role !== 'system'),
        ];

        const result = await callOpenRouter(apiKey, model, apiMessages);
        pushMessage({
          role: 'assistant',
          content: result.content,
          model_used: result.model_used,
          is_fallback: result.is_fallback,
          mode: mode.value,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      error.value = msg;
      pushMessage({
        role: 'assistant',
        content: `⚠️ Erreur : ${msg}`,
        error: msg,
        mode: mode.value,
      });
    } finally {
      loading.value = false;
    }
  }

  return { messages, loading, error, mode, sendMessage, clearHistory };
}
