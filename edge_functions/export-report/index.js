/**
 * WIMRUX FINANCES — Edge Function: export-report
 * Génère des exports CSV/JSON/HTML/PDF et les stocke
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

function escapeHtml(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function rowsToCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v) => { const s = v == null ? '' : String(v); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
  return [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
}

function rowsToHtml(rows, title) {
  const safeTitle = escapeHtml(title);
  if (!rows.length) return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title></head><body><h1>${safeTitle}</h1><p>Aucune donnée.</p></body></html>`;
  const headers = Object.keys(rows[0]);
  const thead = `<thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${rows.map(r => `<tr>${headers.map(h => `<td>${escapeHtml(String(r[h] ?? ''))}</td>`).join('')}</tr>`).join('')}</tbody>`;
  const now = new Date().toLocaleString('fr-FR');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;color:#333;max-width:1200px;margin:0 auto}h1{color:#1a73e8;margin-bottom:4px;font-size:22px}.meta{color:#888;font-size:12px;margin-bottom:20px}table{border-collapse:collapse;width:100%;font-size:13px}th{background:#f0f4ff;padding:10px 12px;text-align:left;border:1px solid #d0d8f0;font-weight:600;white-space:nowrap}td{padding:8px 12px;border:1px solid #eee;white-space:nowrap}tr:nth-child(even) td{background:#fafbff}.footer{margin-top:32px;font-size:11px;color:#bbb;border-top:1px solid #eee;padding-top:12px}@media print{body{padding:10px}tr:nth-child(even) td{background:#f9f9ff}}</style></head><body><h1>${safeTitle}</h1><div class="meta">Généré le ${now} &nbsp;|&nbsp; ${rows.length} ligne(s)</div><table>${thead}${tbody}</table><div class="footer">&copy; Wimrux Finances &mdash; Export automatique &mdash; ${now}</div></body></html>`;
}

function generateContent(rows, title, format) {
  switch (format) {
    case 'csv': return { content: rowsToCsv(rows), mimeType: 'text/csv;charset=utf-8', extension: 'csv' };
    case 'json': return { content: JSON.stringify({ title, generated_at: new Date().toISOString(), row_count: rows.length, data: rows }, null, 2), mimeType: 'application/json;charset=utf-8', extension: 'json' };
    case 'html':
    case 'pdf': return { content: rowsToHtml(rows, title), mimeType: 'text/html;charset=utf-8', extension: 'html' };
    default: throw new Error(`Format non supporté : ${format}`);
  }
}

async function fetchReportData(reportType, companyId, parameters) {
  let rows = [], title = 'Rapport';
  switch (reportType) {
    case 'balance_sheet': {
      const data = await appwriteRequest('GET', `/databases/${DATABASE_ID}/collections/v_balance_sheet_current/documents?queries[]=${encodeURIComponent(JSON.stringify([`equal("company_id", "${companyId}")`, `limit(1000)`]))}`);
      rows = data.documents || []; title = 'Bilan comptable'; break;
    }
    case 'income_statement': {
      const year = parameters?.year;
      const monthly = parameters?.monthly !== false;
      const view = monthly ? 'v_income_statement_monthly' : 'v_income_statement_yearly';
      const q = [`equal("company_id", "${companyId}")`, `limit(1000)`];
      if (year) q.push(`equal("year", "${year}")`);
      const data = await appwriteRequest('GET', `/databases/${DATABASE_ID}/collections/${view}/documents?queries[]=${encodeURIComponent(JSON.stringify(q))}`);
      rows = data.documents || [];
      title = monthly ? `Compte de résultat mensuel${year ? ` ${year}` : ''}` : 'Compte de résultat annuel';
      break;
    }
    case 'cashflow': {
      const data = await appwriteRequest('GET', `/databases/${DATABASE_ID}/collections/cashflow_forecasts/documents?queries[]=${encodeURIComponent(JSON.stringify([`equal("company_id", "${companyId}")`, `limit(1000)`]))}`);
      rows = data.documents || []; title = 'Trésorerie prévisionnelle'; break;
    }
    case 'aged_receivables': {
      const data = await appwriteRequest('GET', `/databases/${DATABASE_ID}/collections/invoices/documents?queries[]=${encodeURIComponent(JSON.stringify([`equal("company_id", "${companyId}")`, `equal("direction", "issued")`, `notEqual("payment_status", "paid")`, `limit(1000)`]))}`);
      rows = data.documents || []; title = 'Balance âgée clients'; break;
    }
    case 'tax_summary': {
      const data = await appwriteRequest('GET', `/databases/${DATABASE_ID}/collections/tax_payments/documents?queries[]=${encodeURIComponent(JSON.stringify([`equal("company_id", "${companyId}")`, `limit(1000)`]))}`);
      rows = data.documents || []; title = 'Synthèse fiscale'; break;
    }
    case 'budget_vs_actual': {
      const data = await appwriteRequest('GET', `/databases/${DATABASE_ID}/collections/budget_lines/documents?queries[]=${encodeURIComponent(JSON.stringify([`equal("company_id", "${companyId}")`, `limit(1000)`]))}`);
      rows = data.documents || []; title = 'Budget vs Réalisé'; break;
    }
    case 'saved_query': {
      const queryId = parameters?.query_id;
      if (!queryId) throw new Error('Paramètre query_id requis pour saved_query');
      const qData = await appwriteRequest('GET', `/databases/${DATABASE_ID}/collections/saved_queries/documents/${queryId}`);
      if (!qData) throw new Error('Requête introuvable');
      const sq = qData;
      const limit = parameters?.limit || 1000;
      const data = await appwriteRequest('GET', `/databases/${DATABASE_ID}/collections/${sq.source_table}/documents?queries[]=${encodeURIComponent(JSON.stringify([`equal("company_id", "${companyId}")`, `limit(${limit})`]))}`);
      rows = data.documents || []; title = sq.name || 'Requête sauvegardée'; break;
    }
    default: throw new Error(`Type de rapport non supporté : ${reportType}`);
  }
  return { rows, title };
}

module.exports = async function(context) {
  const req = context.req;
  const method = req.method;
  const headers = { ...CORS };

  if (method === 'OPTIONS') return context.res.text('ok', 200, headers);

  try {
    const authHeader = (req.headers['authorization'] || '');
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return context.res.json({ error: 'Authorization header manquant' }, 401, headers);

    const jwtPayload = parseJwt(token);
    if (!jwtPayload || !jwtPayload.sub) return context.res.json({ error: 'Token invalide ou expiré' }, 401, headers);
    const userId = jwtPayload.sub;

    const body = req.body || {};
    const { report_type, format, company_id, parameters } = body;
    if (!report_type || !format || !company_id) return context.res.json({ error: 'Champs requis manquants : report_type, format, company_id' }, 400, headers);

    const ALLOWED_FORMATS = ['csv', 'json', 'html', 'pdf'];
    if (!ALLOWED_FORMATS.includes(format)) return context.res.json({ error: `Format non supporté : ${format}` }, 400, headers);

    // Fetch data
    const { rows, title } = await fetchReportData(report_type, company_id, parameters);

    // Generate content
    const { content, mimeType, extension } = generateContent(rows, title, format);

    // Upload to storage bucket
    const filename = `${report_type}_${format}_${Date.now()}.${extension}`;
    const storagePath = `${company_id}/${filename}`;
    let fileUrl = null;

    try {
      // Create file in Appwrite storage
      const fileData = Buffer.from(content, 'utf-8');
      const boundary = '----FormBoundary' + Date.now();
      const multipartBody = Buffer.concat([
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="fileId"\r\n\r\nunique()\r\n`),
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${mimeType}\r\n\r\n`),
        fileData,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const uploadRes = await new Promise((resolve, reject) => {
        const url = new URL(`${APPWRITE_ENDPOINT}/storage/buckets/reports/files`);
        const req2 = (url.protocol === 'https:' ? https : http).request({
          hostname: url.hostname, port: url.port, path: url.pathname + url.search,
          method: 'POST', headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'X-Appwrite-Project': APPWRITE_PROJECT, 'X-Appwrite-Key': APPWRITE_KEY },
          timeout: 30000, rejectUnauthorized: false,
        }, (res) => { let c = ''; res.on('data', (d) => c += d); res.on('end', () => { try { resolve(JSON.parse(c)); } catch { resolve({}); } }); });
        req2.on('error', reject); req2.write(multipartBody); req2.end();
      });

      if (uploadRes && uploadRes.$id) {
        fileUrl = `${APPWRITE_ENDPOINT}/storage/buckets/reports/files/${uploadRes.$id}/view?project=${APPWRITE_PROJECT}`;
      }
    } catch (e) {
      console.warn('[export-report] Storage unavailable:', e.message || e);
    }

    // Save report export record
    const status = fileUrl ? 'completed' : 'processing';
    let exportRecord = null;
    try {
      const insertRes = await appwriteRequest('POST', `/databases/${DATABASE_ID}/collections/report_exports/documents`, {
        documentId: 'unique()',
        data: { company_id, user_id: userId, report_type, format, parameters: parameters || null, file_url: fileUrl, status, generated_at: new Date().toISOString() }
      });
      exportRecord = insertRes;
    } catch (e) {
      console.error('[export-report] Insert error:', e.message || e);
    }

    return context.res.json({
      success: true, export_id: exportRecord ? exportRecord.$id : null,
      file_url: fileUrl, filename, row_count: rows.length, format, report_type, status,
      content: rows.length <= 500 ? content : undefined,
    }, 200, { ...headers, 'Content-Type': 'application/json' });

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur interne';
    console.error('[export-report] Error:', message);
    return context.res.json({ error: message }, 500, headers);
  }
};
