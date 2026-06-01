// =============================================================================
// WIMRUX® FINANCES — Edge Function: nl-to-sql
// Langage naturel → SQL sécurisé via ai-router (nl_to_sql → Claude Sonnet 4.5)
// Garde-fous : SELECT uniquement, tables whitelist, injection prevention
// =============================================================================
import { createClient } from 'npm:@insforge/sdk@latest';

const client = createClient({
  baseUrl: Deno.env.get('INSFORGE_BASE_URL') ?? '',
  anonKey:  Deno.env.get('INSFORGE_ANON_KEY') ?? '',
});

// ── Whitelist des tables accessibles ──────────────────────────────────────
const ALLOWED_TABLES = new Set([
  'invoices', 'invoice_payments', 'clients', 'suppliers',
  'wallet_transactions', 'payment_wallets', 'treasury_movements',
  'transaction_categories', 'bank_accounts', 'payment_evidences',
  'anomaly_alerts', 'budgets', 'budget_lines', 'assets', 'loans',
  'investments', 'petty_cash_entries', 'mobile_wallet_transactions',
]);

const FORBIDDEN_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXECUTE|EXEC|CALL|DO|BEGIN|COMMIT|ROLLBACK|SET\s+search_path)\b/i;

// ── Schéma simplifié pour le prompt IA ───────────────────────────────────
const SCHEMA_SUMMARY = `
Tables disponibles (schéma public, toutes avec company_id) :
- invoices(id, number, client_id, direction, status, total_ht, total_tva, total_ttc, due_date, payment_status, paid_amount, created_at)
- clients(id, name, email, phone, ifu)
- suppliers(id, name, email, ifu)
- wallet_transactions(id, wallet_id, direction, amount, currency, label, counterparty_name, transaction_date, reconciliation_status, source_channel)
- payment_wallets(id, name, provider_code, current_balance, currency, is_active)
- treasury_movements(id, account_id, type, amount, date, label, category)
- bank_accounts(id, account_number, bank_name, current_balance, currency)
- transaction_categories(id, name, type)
- anomaly_alerts(id, anomaly_type, severity, description, entity_type, is_resolved, detected_at)
- budgets(id, name, period_start, period_end, total_amount)
- budget_lines(id, budget_id, category_id, planned_amount, actual_amount)
`.trim();

function validateSql(sql: string): { valid: boolean; reason?: string } {
  const upper = sql.toUpperCase().trim();

  // Doit commencer par SELECT
  if (!upper.startsWith('SELECT')) return { valid: false, reason: 'Seules les requêtes SELECT sont autorisées' };

  // Mots clés interdits
  if (FORBIDDEN_KEYWORDS.test(sql)) return { valid: false, reason: 'Opération non autorisée détectée' };

  // Tables non whitelistées
  const tableRefs = sql.match(/\bFROM\s+(\w+)|\bJOIN\s+(\w+)/gi) ?? [];
  for (const ref of tableRefs) {
    const table = ref.replace(/\b(FROM|JOIN)\s+/i, '').split(/\s/)[0]?.toLowerCase().replace(/[^a-z_]/g, '') ?? '';
    if (table && !ALLOWED_TABLES.has(table)) {
      return { valid: false, reason: `Table non autorisée : ${table}` };
    }
  }

  // Injection via -- ou /*
  if (/--|\/\*/.test(sql)) return { valid: false, reason: 'Commentaires SQL non autorisés' };

  // Sous-requêtes sur system catalogs
  if (/\bpg_\w+\b|\binformation_schema\b/i.test(sql)) return { valid: false, reason: 'Accès aux catalogues système interdit' };

  return { valid: true };
}

export default async function(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: { user }, error: authErr } = await client.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) return new Response(JSON.stringify({ success: false, message: 'Non autorisé' }), { status: 401, headers: corsHeaders });

    const { question, company_id, execute = false } = await req.json().catch(() => ({})) as { question?: string; company_id?: string; execute?: boolean };

    if (!question?.trim()) return new Response(JSON.stringify({ success: false, message: 'question requise' }), { status: 400, headers: corsHeaders });
    if (!company_id)        return new Response(JSON.stringify({ success: false, message: 'company_id requis' }), { status: 400, headers: corsHeaders });

    // ── Génération SQL via IA ──────────────────────────────────────────────
    const prompt = `Tu es expert SQL PostgreSQL. Tu dois traduire la question suivante en SQL SELECT sécurisé.

${SCHEMA_SUMMARY}

RÈGLES ABSOLUES :
1. Retourner UNIQUEMENT du SQL SELECT — jamais INSERT/UPDATE/DELETE/DROP
2. Toujours filtrer par : company_id = '${company_id}'
3. Limiter à 100 lignes maximum (ajouter LIMIT 100 si absent)
4. Ne jamais accéder à pg_* ou information_schema
5. Utiliser des alias clairs pour les colonnes
6. Traiter les montants en XOF (diviser par 1 = déjà en XOF)

QUESTION : "${question}"

Retourne UNIQUEMENT le SQL, sans explication, sans markdown, sans backticks.`;

    const { data: aiData, error: aiErr } = await client.functions.invoke('ai-router', {
      body: { task_code: 'nl_to_sql', input: { text: prompt }, options: { language: 'fr', bypass_pii: true } },
    });

    if (aiErr || !aiData?.success) throw new Error(aiErr?.message ?? 'ai-router error');

    let sql = (aiData.data?.content ?? '') as string;
    // Nettoyer : retirer les backticks ou bloc ```sql
    sql = sql.replace(/```sql\s*/gi, '').replace(/```\s*/g, '').trim();

    // ── Garde-fous ────────────────────────────────────────────────────────
    const validation = validateSql(sql);
    if (!validation.valid) {
      return new Response(JSON.stringify({
        success: false,
        message: `SQL refusé : ${validation.reason}`,
        sql,
        model_used: aiData.data?.model_used ?? null,
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Exécution optionnelle ──────────────────────────────────────────────
    let rows: unknown[] | null = null;
    let execError: string | null = null;
    if (execute) {
      try {
        const { data: execData, error: execErr } = await client.database.rpc('run_tenant_query', {
          p_sql:        sql,
          p_company_id: company_id,
        });
        if (execErr) execError = execErr.message;
        else rows = execData as unknown[];
      } catch (e) {
        execError = e instanceof Error ? e.message : 'Erreur exécution';
      }
    }

    return new Response(JSON.stringify({
      success: true,
      sql,
      rows,
      exec_error: execError,
      model_used: aiData.data?.model_used ?? null,
      question,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne';
    return new Response(JSON.stringify({ success: false, message: msg }), { status: 500, headers: corsHeaders });
  }
}
