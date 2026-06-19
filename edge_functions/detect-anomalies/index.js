/**
 * WIMRUX FINANCES — Edge Function: detect-anomalies
 * Détection d'anomalies financières (règles + IA)
 * Ported from Deno/TypeScript to Node.js/Appwrite runtime
 */
const https = require('https');
const http = require('http');

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
    const company_id = body.company_id || req.headers['x-company-id'];
    const wallet_id = body.wallet_id;
    const days = body.days || 90;
    if (!company_id) return context.res.json({ success: false, message: 'company_id requis' }, 400, headers);

    const since = new Date(Date.now() - days * 86400000).toISOString();

    // Load transactions
    let txQueries = [
      `equal("company_id", "${company_id}")`,
      `greaterThanEqual("transaction_date", "${since}")`,
      `orderDesc("transaction_date")`,
      `limit(300)`
    ];
    if (wallet_id) txQueries.push(`equal("wallet_id", "${wallet_id}")`);
    const txQuery = encodeURIComponent(JSON.stringify(txQueries));
    const txData = await appwriteRequest('GET', `/databases/${DATABASE_ID}/collections/wallet_transactions/documents?queries[]=${txQuery}`);
    const transactions = txData.documents || [];

    // Load invoices
    const invQueries = [
      `equal("company_id", "${company_id}")`,
      `equal("direction", "received")`,
      `greaterThanEqual("$createdAt", "${since}")`,
      `limit(100)`
    ];
    const invQuery = encodeURIComponent(JSON.stringify(invQueries));
    const invData = await appwriteRequest('GET', `/databases/${DATABASE_ID}/collections/invoices/documents?queries[]=${invQuery}`);
    const invoices = invData.documents || [];

    if (!transactions.length && !invoices.length) {
      return context.res.json({ success: true, alerts: [], message: 'Aucune donnée à analyser' }, 200, { ...headers, 'Content-Type': 'application/json' });
    }

    // Deterministic alerts
    const deterministicAlerts = [];
    const txSeen = new Map();
    for (const tx of transactions) {
      const key = `${tx.amount}|${(tx.transaction_date || '').slice(0, 10)}|${tx.counterparty_name || ''}|${tx.direction}`;
      if (txSeen.has(key)) {
        deterministicAlerts.push({ type: 'potential_duplicate', severity: 'medium', description: `Transaction potentiellement en double : ${tx.label} (${tx.amount} ${tx.currency})`, entity_type: 'wallet_transaction', entity_id: tx.$id, amount: tx.amount, detected_at: new Date().toISOString() });
      }
      txSeen.set(key, tx.$id);
    }

    for (const tx of transactions) {
      if (tx.amount > 5000000 && tx.amount % 1000000 === 0) {
        deterministicAlerts.push({ type: 'large_round_amount', severity: 'high', description: `Montant rond suspect : ${tx.amount.toLocaleString()} XOF — ${tx.label}`, entity_type: 'wallet_transaction', entity_id: tx.$id, amount: tx.amount, detected_at: new Date().toISOString() });
      }
    }

    const now = new Date();
    for (const inv of invoices) {
      if (inv.due_date && inv.payment_status !== 'paid' && new Date(inv.due_date) < now) {
        const daysLate = Math.round((now.getTime() - new Date(inv.due_date).getTime()) / 86400000);
        const sev = daysLate > 60 ? 'critical' : daysLate > 30 ? 'high' : 'medium';
        deterministicAlerts.push({ type: 'overdue_invoice', severity: sev, description: `Facture en retard de ${daysLate}j — ${inv.total_ttc} XOF`, entity_type: 'invoice', entity_id: inv.$id, amount: inv.total_ttc, detected_at: new Date().toISOString() });
      }
    }

    const nonCompliant = invoices.filter(i => i.fiscal_compliance_status === 'invalid');
    if (nonCompliant.length > 0) {
      deterministicAlerts.push({ type: 'fiscal_non_compliance', severity: 'high', description: `${nonCompliant.length} facture(s) non conforme(s) fiscalement`, entity_type: 'invoice', entity_id: null, amount: null, detected_at: new Date().toISOString() });
    }

    // AI analysis
    const prompt = `Tu es auditeur financier expert en fraude et anomalies comptables en Afrique de l'Ouest.

TRANSACTIONS (${days} derniers jours) :
${JSON.stringify(transactions.slice(0, 100).map(t => ({ id: t.$id, montant: t.amount, sens: t.direction, libellé: t.label, contrepartie: t.counterparty_name, date: typeof t.transaction_date === 'string' ? t.transaction_date.slice(0, 10) : null, canal: t.source_channel })), null, 1)}

FACTURES REÇUES :
${JSON.stringify(invoices.slice(0, 50).map(i => ({ id: i.$id, montant: i.total_ttc, statut_paiement: i.payment_status, conformité: i.fiscal_compliance_status, échéance: i.due_date })), null, 1)}

Anomalies déjà détectées par règles déterministes :
${JSON.stringify(deterministicAlerts.map(a => a.type))}

Identifie les anomalies supplémentaires : patterns inhabituels, fréquences anormales, montants atypiques vs historique, transactions nocturnes suspectes, séquences fragmentées (structuring), etc.

Retourne UNIQUEMENT un tableau JSON (vide si aucune anomalie) :
[{"type":"...","severity":"low|medium|high|critical","description":"...","entity_type":"wallet_transaction|invoice|global","entity_id":"... ou null","amount": 0 ou null}]`;

    const aiRes = await appwriteRequest('POST', '/functions/v1/ai-router', {
      task_code: 'detection_anomalie', input: { text: prompt }, options: { language: 'fr', bypass_pii: false }
    }, { 'x-company-id': company_id });

    let aiAlerts = [];
    if (aiRes && aiRes.success) {
      try {
        const content = aiRes.data?.content || '';
        const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const s = cleaned.indexOf('['), e = cleaned.lastIndexOf(']');
        if (s >= 0 && e > s) {
          const parsed = JSON.parse(cleaned.slice(s, e + 1));
          aiAlerts = parsed.map(a => ({ ...a, entity_id: a.entity_id || null, amount: a.amount || null, detected_at: new Date().toISOString() }));
        }
      } catch (_) { /* ignore */ }
    }

    const allAlerts = [...deterministicAlerts, ...aiAlerts];

    // Persist in DB
    if (allAlerts.length > 0) {
      for (const a of allAlerts) {
        await appwriteRequest('POST', `/databases/${DATABASE_ID}/collections/anomaly_alerts/documents`, {
          documentId: 'unique()',
          data: {
            company_id, anomaly_type: a.type, severity: a.severity,
            description: a.description, entity_type: a.entity_type,
            entity_id: a.entity_id, amount: a.amount, is_resolved: false,
            source: ['potential_duplicate','large_round_amount','overdue_invoice','fiscal_non_compliance'].includes(a.type) ? 'rule' : 'ai',
            detected_at: a.detected_at,
          }
        }).catch(() => {});
      }
    }

    return context.res.json({
      success: true, alerts: allAlerts,
      stats: {
        total: allAlerts.length,
        critical: allAlerts.filter(a => a.severity === 'critical').length,
        high: allAlerts.filter(a => a.severity === 'high').length,
        medium: allAlerts.filter(a => a.severity === 'medium').length,
        low: allAlerts.filter(a => a.severity === 'low').length,
        ai_model: aiRes?.data?.model_used || null,
      },
    }, 200, { ...headers, 'Content-Type': 'application/json' });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne';
    return context.res.json({ success: false, message: msg }, 500, headers);
  }
};
