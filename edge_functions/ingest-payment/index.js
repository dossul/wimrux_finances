/**
 * WIMRUX FINANCES — Edge Function: ingest-payment
 * Ingestion de paiements via IA (texte, image, SMS, fichier)
 * Ported from Deno/TypeScript to Node.js/Appwrite runtime
 */
const https = require('https');
const http = require('http');
const crypto = require('crypto');

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

function taskForChannel(channel) {
  switch (channel) { case 'image': return 'ingest_image_payment'; case 'sms': return 'sms_parsing'; default: return 'text_payment_extraction'; }
}

function buildInput(body) {
  if (body.source_channel === 'image' && body.image_url) {
    return { image_url: body.image_url, text: 'Extrais les informations de ce paiement mobile money ou virement.' };
  }
  return { text: body.content || body.file_url || '' };
}

function dedupHash(walletId, ext) {
  const raw = `${walletId}|${ext.transaction_date}|${ext.amount}|${ext.direction}|${ext.external_transaction_id || ext.counterparty_identifier || ext.label}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}

module.exports = async function(context) {
  const req = context.req;
  const method = req.method;
  const headers = { ...CORS };

  if (method === 'OPTIONS') return context.res.json({}, 204, headers);
  if (method !== 'POST') return context.res.json({ error: 'Method not allowed' }, 405, headers);

  try {
    const authHeader = (req.headers['authorization'] || '');
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) return context.res.json({ error: 'Missing authorization token' }, 401, headers);

    const jwtPayload = parseJwt(token);
    if (!jwtPayload || !jwtPayload.sub) return context.res.json({ error: 'Token invalide' }, 401, headers);
    const userId = jwtPayload.sub;

    const body = req.body || {};
    const { source_channel, wallet_id, options = {} } = body;
    if (!source_channel) return context.res.json({ error: 'source_channel is required' }, 400, headers);
    if (!wallet_id) return context.res.json({ error: 'wallet_id is required' }, 400, headers);

    // Get user profile for company_id
    const profileQuery = encodeURIComponent(JSON.stringify([`equal("user_id", "${userId}")`, `limit(1)`]));
    const profileData = await appwriteRequest('GET', `/databases/${DATABASE_ID}/collections/user_profiles/documents?queries[]=${profileQuery}`);
    const profile = (profileData.documents || [])[0];
    if (!profile || !profile.company_id) return context.res.json({ error: 'Company not found' }, 403, headers);
    const company_id = profile.company_id;

    // Verify wallet belongs to company
    const walletQuery = encodeURIComponent(JSON.stringify([`equal("$id", "${wallet_id}")`, `equal("company_id", "${company_id}")`, `limit(1)`]));
    const walletData = await appwriteRequest('GET', `/databases/${DATABASE_ID}/collections/payment_wallets/documents?queries[]=${walletQuery}`);
    const wallet = (walletData.documents || [])[0];
    if (!wallet) return context.res.json({ error: 'Wallet not found or access denied' }, 404, headers);

    // Step 1: Create evidence record
    const evidencePayload = {
      documentId: 'unique()',
      data: {
        company_id, wallet_id, evidence_type: source_channel,
        pasted_content: body.content || null,
        file_url: body.file_url || body.image_url || null,
        file_mime_type: body.file_mime || null,
        processing_status: 'processing',
        uploaded_by: userId,
      }
    };
    const evidenceRes = await appwriteRequest('POST', `/databases/${DATABASE_ID}/collections/payment_evidences/documents`, evidencePayload);
    const evidenceId = evidenceRes ? evidenceRes.$id : null;

    // Step 2: Call ai-router
    const task_code = taskForChannel(source_channel);
    const input = buildInput(body);
    const lang = options.language || 'fr';

    const aiRes = await appwriteRequest('POST', '/functions/v1/ai-router', {
      task_code, input, options: { language: lang, bypass_pii: false }
    }, { 'x-company-id': company_id });

    if (!aiRes || !aiRes.success) {
      if (evidenceId) {
        await appwriteRequest('PATCH', `/databases/${DATABASE_ID}/collections/payment_evidences/documents/${evidenceId}`, {
          data: { processing_status: 'error', processing_error: (aiRes && aiRes.message) || 'ai-router error' }
        });
      }
      return context.res.json({ error: 'AI extraction failed', detail: (aiRes && aiRes.message) || 'ai-router error' }, 502, headers);
    }

    // Step 3: Parse extracted data
    let extracted = null;
    try {
      const content = aiRes.data?.content || '';
      const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}');
      if (s >= 0 && e > s) extracted = JSON.parse(cleaned.slice(s, e + 1));
    } catch { /* handled below */ }

    if (!extracted || !extracted.amount) {
      if (evidenceId) {
        await appwriteRequest('PATCH', `/databases/${DATABASE_ID}/collections/payment_evidences/documents/${evidenceId}`, {
          data: { processing_status: 'error', processing_error: 'AI returned unparseable or empty extraction', ocr_text: aiRes.data?.content || null }
        });
      }
      return context.res.json({ error: 'Could not extract payment data from content' }, 422, headers);
    }

    // Step 4: Update evidence with AI result
    if (evidenceId) {
      await appwriteRequest('PATCH', `/databases/${DATABASE_ID}/collections/payment_evidences/documents/${evidenceId}`, {
        data: { processing_status: 'done', ai_extracted_data: extracted, ai_model_used: aiRes.data?.model_used || null, ocr_text: body.content || null }
      });
    }

    // Step 5: dry_run ?
    if (options.dry_run) {
      return context.res.json({ success: true, dry_run: true, extracted, evidence_id: evidenceId }, 200, headers);
    }

    const hash = dedupHash(wallet_id, extracted);
    const balanceDelta = extracted.direction === 'credit' ? Math.abs(extracted.amount) : -Math.abs(extracted.amount);

    const txPayload = {
      documentId: 'unique()',
      data: {
        company_id, wallet_id, direction: extracted.direction,
        operation_type: extracted.operation_type || 'payment',
        amount: Math.abs(extracted.amount),
        fees: extracted.fees || 0,
        currency: extracted.currency || wallet.currency || 'XOF',
        label: extracted.label || 'Paiement importé',
        counterparty_name: extracted.counterparty_name || null,
        counterparty_identifier: extracted.counterparty_identifier || null,
        transaction_date: extracted.transaction_date || new Date().toISOString(),
        value_date: extracted.value_date || null,
        external_transaction_id: extracted.external_transaction_id || null,
        external_reference: extracted.external_reference || null,
        source_channel, source_evidence_id: evidenceId,
        confidence_score: extracted.confidence_score || 0.7,
        needs_human_review: extracted.needs_human_review || (extracted.confidence_score || 1) < 0.7,
        reconciliation_status: 'unreconciled',
        dedup_hash: hash,
        raw_payload: { ai_extracted: extracted, source_channel },
      }
    };

    const txRes = await appwriteRequest('POST', `/databases/${DATABASE_ID}/collections/wallet_transactions/documents`, txPayload);
    if (!txRes || !txRes.$id) {
      return context.res.json({ error: 'DB insert failed', detail: 'Transaction insert failed' }, 500, headers);
    }

    // Step 6: Update wallet balance (simple increment)
    const newBalance = (wallet.current_balance || 0) + balanceDelta;
    await appwriteRequest('PATCH', `/databases/${DATABASE_ID}/collections/payment_wallets/documents/${wallet_id}`, {
      data: { current_balance: newBalance }
    });

    return context.res.json({
      success: true, transaction: { id: txRes.$id, ...txPayload.data },
      evidence_id: evidenceId, model_used: aiRes.data?.model_used,
    }, 200, headers);

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne';
    return context.res.json({ error: msg }, 500, headers);
  }
};
