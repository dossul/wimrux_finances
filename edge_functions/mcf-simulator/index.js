/**
 * WIMRUX FINANCES — Edge Function: mcf-simulator
 * MCF Simulator — Stub (à enrichir avec la logique métier réelle)
 * Ported from Deno/TypeScript to Node.js/Appwrite runtime
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-company-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

module.exports = async function(context) {
  const req = context.req;
  const method = req.method;
  const headers = { ...CORS };

  if (method === 'OPTIONS') return context.res.json({}, 204, headers);

  try {
    const body = req.body || {};
    const company_id = body.company_id || req.headers['x-company-id'];

    // TODO: implémenter la logique métier réelle ici
    return context.res.json({
      success: true,
      message: 'MCF Simulator — stub exécuté',
      company_id: company_id || null,
      stub: true,
    }, 200, { ...headers, 'Content-Type': 'application/json' });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne';
    return context.res.json({ success: false, message: msg }, 500, headers);
  }
};
