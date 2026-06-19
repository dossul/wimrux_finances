/**
 * WIMRUX FINANCES — Edge Function: nl-to-sql
 * Langage naturel → SQL sécurisé via ai-router
 * Ported from Deno/TypeScript to Node.js/Appwrite runtime
 */
const https = require('https');
const http = require('http');

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || '6a29285200015cd421c7';
const APPWRITE_KEY = process.env.APPWRITE_KEY || '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-company-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function appwriteRequest(method, path, body, customHeaders = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(APPWRITE_ENDPOINT + path);
    const data = body ? JSON.stringify(body) : null;
    const req = (url.protocol === 'https:' ? https : http).request({
      hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      method, headers: { 'Content-Type': 'application/json', 'X-Appwrite-Project': APPWRITE_PROJECT, 'X-Appwrite-Key': APPWRITE_KEY, ...customHeaders },
      timeout: 30000, rejectUnauthorized: false,
    }, (res) => { let c = ''; res.on('data', (d) => c += d); res.on('end', () => { try { resolve(JSON.parse(c)); } catch { resolve({}); } }); });
    req.on('error', reject); if (data) req.write(data); req.end();
  });
}

function parseJwt(token) {
  try { const p = token.split('.'); if (p.length !== 3) return null; return JSON.parse(Buffer.from(p[1], 'base64url').toString()); }
  catch { return null; }
}

const ALLOWED_TABLES = new Set([
  'invoices', 'invoice_payments', 'clients', 'suppliers',
  'wallet_transactions', 'payment_wallets', 'treasury_movements',
  'transaction_categories', 'bank_accounts', 'payment_evidences',
  'anomaly_alerts', 'budgets', 'budget_lines', 'assets', 'loans',
  'investments', 'petty_cash_entries', 'mobile_wallet_transactions',
]);

const FORBIDDEN_KEYWORDS = /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXECUTE|EXEC|CALL|DO|BEGIN|COMMIT|ROLLBACK|SET\s+search_path)\b/i;

const SCHEMA_SUMMARY = `Tables disponibles (schéma public, toutes avec company_id) :
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
- budget_lines(id, budget_id, category_id, planned_amount, actual_amount)`;

function validateSql(sql) {
  const upper = sql.toUpperCase().trim();
  if (!upper.startsWith('SELECT')) return { valid: false, reason: 'Seules les requêtes SELECT sont autorisées' };
  if (FORBIDDEN_KEYWORDS.test(sql)) return { valid: false, reason: 'Opération non autorisée détectée' };
  const tableRefs = sql.match(/\bFROM\s+(\w+)|\bJOIN\s+(\w+)/gi) || [];
  for (const ref of tableRefs) {
    const table = ref.replace(/\b(FROM|JOIN)\s+/i, '').split(/\s/)[0].toLowerCase().replace(/[^a-z_]/g, '');
    if (table && !ALLOWED_TABLES.has(table)) return { valid: false, reason: `Table non autorisée : ${table}` };
  }
  if (/--|\/\*/.test(sql)) return { valid: false, reason: 'Commentaires SQL non autorisés' };
  if (/\bpg_\w+\b|\binformation_schema\b/i.test(sql)) return { valid: false, reason: 'Accès aux catalogues système interdit' };
  return { valid: true };
}

module.exports = async function(context) {
  const req = context.req;
  const method = req.method;
  const headers = { ...CORS };

  if (method === 'OPTIONS') return context.res.json({}, 204, headers);

  try {
    const authHeader = (req.headers['authorization'] || '');
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return context.res.json({ success: false, message: 'Non autorisé' }, 401, headers);

    const jwtPayload = parseJwt(token);
    if (!jwtPayload || !jwtPayload.sub) return context.res.json({ success: false, message: 'Token invalide' }, 401, headers);

    const body = req.body || {};
    const question = body.question;
    const company_id = body.company_id || req.headers['x-company-id'];
    const execute = body.execute || false;

    if (!question || !question.trim()) return context.res.json({ success: false, message: 'question requise' }, 400, headers);
    if (!company_id) return context.res.json({ success: false, message: 'company_id requis' }, 400, headers);

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

    const aiRes = await appwriteRequest('POST', '/functions/v1/ai-router', {
      task_code: 'nl_to_sql', input: { text: prompt }, options: { language: 'fr', bypass_pii: true }
    }, { 'x-company-id': company_id });

    if (!aiRes || !aiRes.success) throw new Error((aiRes && aiRes.message) || 'ai-router error');

    let sql = aiRes.data?.content || '';
    sql = sql.replace(/```sql\s*/gi, '').replace(/```\s*/g, '').trim();

    const validation = validateSql(sql);
    if (!validation.valid) {
      return context.res.json({ success: false, message: `SQL refusé : ${validation.reason}`, sql, model_used: aiRes.data?.model_used || null }, 400, headers);
    }

    // Note: Execution requires a PostgreSQL RPC which is not available in Appwrite 1.5.7 REST API
    let rows = null;
    let execError = null;
    if (execute) {
      execError = 'SQL execution via run_tenant_query is not available in Appwrite 1.5.7. Use the generated SQL in a backend query.';
    }

    return context.res.json({
      success: true, sql, rows, exec_error: execError,
      model_used: aiRes.data?.model_used || null, question,
    }, 200, { ...headers, 'Content-Type': 'application/json' });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne';
    return context.res.json({ success: false, message: msg }, 500, headers);
  }
};
