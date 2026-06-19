/**
 * WIMRUX FINANCES — Edge Function: cashflow-forecast
 * Prévision trésorerie IA via ai-router
 * Ported from Deno/TypeScript to Node.js/Appwrite runtime
 */
const https = require('https');
const http = require('http');
const jwt = require('jsonwebtoken');

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://appwrite.benga.live/v1';
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || '6a29285200015cd421c7';
const APPWRITE_KEY = process.env.APPWRITE_KEY || '';
const DATABASE_ID = process.env.APPWRITE_DATABASE || 'wimrux_finances';

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
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT,
        'X-Appwrite-Key': APPWRITE_KEY,
        ...customHeaders,
      },
      timeout: 30000,
      rejectUnauthorized: false,
    }, (res) => {
      let chunks = '';
      res.on('data', (c) => chunks += c);
      res.on('end', () => {
        try { resolve(JSON.parse(chunks)); } catch { resolve({}); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

function parseJwt(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  } catch { return null; }
}

module.exports = async function(context) {
  const req = context.req;
  const method = req.method;
  const headers = { ...CORS };

  if (method === 'OPTIONS') {
    return context.res.json({}, 204, headers);
  }

  try {
    const authHeader = (req.headers['authorization'] || '');
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return context.res.json({ success: false, message: 'Non autorisé' }, 401, headers);

    const jwtPayload = parseJwt(token);
    if (!jwtPayload || !jwtPayload.sub) return context.res.json({ success: false, message: 'Token invalide' }, 401, headers);

    const body = req.body || {};
    const company_id = body.company_id || req.headers['x-company-id'];
    const horizon_days = body.horizon_days || 90;
    const currency = body.currency || 'XOF';

    if (!company_id) return context.res.json({ success: false, message: 'company_id requis' }, 400, headers);

    const since90d = new Date(Date.now() - 90 * 86400000).toISOString();
    const now = new Date();

    // Query wallet transactions
    const txQuery = encodeURIComponent(JSON.stringify([
      `equal("company_id", "${company_id}")`,
      `greaterThanEqual("transaction_date", "${since90d}")`,
      `limit(500)`
    ]));
    const txData = await appwriteRequest('GET', `/databases/${DATABASE_ID}/collections/wallet_transactions/documents?queries[]=${txQuery}`);

    // Query invoices
    const invQuery = encodeURIComponent(JSON.stringify([
      `equal("company_id", "${company_id}")`,
      `equal("payment_status", "unpaid")`,
      `limit(100)`
    ]));
    const invoiceData = await appwriteRequest('GET', `/databases/${DATABASE_ID}/collections/invoices/documents?queries[]=${invQuery}`);

    // Query wallets
    const walletQuery = encodeURIComponent(JSON.stringify([
      `equal("company_id", "${company_id}")`,
      `equal("is_active", true)`,
      `limit(20)`
    ]));
    const walletData = await appwriteRequest('GET', `/databases/${DATABASE_ID}/collections/payment_wallets/documents?queries[]=${walletQuery}`);

    const transactions = txData.documents || [];
    const openInvoices = invoiceData.documents || [];
    const wallets = walletData.documents || [];

    const currentBalance = wallets.reduce((s, w) => s + Number(w.current_balance || 0), 0);

    const monthlyMap = {};
    for (const tx of transactions) {
      const month = typeof tx.transaction_date === 'string' ? tx.transaction_date.slice(0, 7) : '';
      if (!month) continue;
      if (!monthlyMap[month]) monthlyMap[month] = { in: 0, out: 0 };
      if (tx.direction === 'credit') monthlyMap[month].in += Number(tx.amount);
      else monthlyMap[month].out += Number(tx.amount);
    }

    const expectedInflows = openInvoices.filter(i => i.direction === 'issued').map(i => ({ amount: Number(i.total_ttc), due_date: i.due_date }));
    const expectedOutflows = openInvoices.filter(i => i.direction === 'received').map(i => ({ amount: Number(i.total_ttc), due_date: i.due_date }));

    const prompt = `Tu es expert en prévision de trésorerie pour les PME en Afrique de l'Ouest (UEMOA/CFA).

CONTEXTE :
- Solde actuel total wallets : ${currentBalance.toLocaleString()} ${currency}
- Devise : ${currency}
- Horizon de prévision : ${horizon_days} jours (de ${now.toISOString().slice(0, 10)})

HISTORIQUE MENSUEL (entrées/sorties wallet) :
${JSON.stringify(monthlyMap, null, 1)}

FACTURES OUVERTES (encaissements attendus) :
${JSON.stringify(expectedInflows.slice(0, 20), null, 1)}

DÉCAISSEMENTS ATTENDUS (factures fournisseurs à payer) :
${JSON.stringify(expectedOutflows.slice(0, 20), null, 1)}

Génère une prévision de trésorerie sur ${horizon_days} jours en points hebdomadaires.
Prends en compte : saisonnalité, tendances historiques, factures dues.

Retourne UNIQUEMENT un objet JSON :
{
  "points": [
    {"date":"YYYY-MM-DD","predicted_inflow":0,"predicted_outflow":0,"predicted_balance":0,"confidence":0.85,"drivers":["..."]}
  ],
  "summary": "Résumé 2-3 phrases",
  "risks": ["risque 1", "risque 2"],
  "opportunities": ["opportunité 1"]
}`;

    // Call ai-router
    const aiRes = await appwriteRequest('POST', '/functions/v1/ai-router', {
      task_code: 'cashflow_forecast',
      input: { text: prompt },
      options: { language: 'fr', bypass_pii: true }
    }, { 'x-company-id': company_id });

    if (!aiRes.success) throw new Error(aiRes.message || 'ai-router error');

    const content = aiRes.data?.content || '';
    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}');
    if (s < 0 || e < 0) throw new Error("Réponse IA non JSON");

    const parsed = JSON.parse(cleaned.slice(s, e + 1));

    const result = {
      horizon_days,
      current_balance: currentBalance,
      currency,
      points: parsed.points || [],
      summary: parsed.summary || '',
      risks: parsed.risks || [],
      opportunities: parsed.opportunities || [],
      model_used: aiRes.data?.model_used || null,
    };

    return context.res.json({ success: true, forecast: result }, 200, { ...headers, 'Content-Type': 'application/json' });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne';
    return context.res.json({ success: false, message: msg }, 500, headers);
  }
};
