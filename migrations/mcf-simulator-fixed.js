// ============================================================================
// WIMRUX® FINANCES — API MCF/SECeF Simulée (Burkina Faso)
// Edge Function InsForge — 11 endpoints REST
// FIXED: reads _path and _method from request body for InsForge invoke routing
// NOTE: Do NOT import createClient — it's already in the InsForge edge runtime
// ============================================================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

// --- Tax Groups A-P ---
const TAX_GROUPS = {
  A: { description: 'Exonéré', tva: 0, psvb: 0.02 },
  B: { description: 'TVA taxable 1', tva: 0.18, psvb: 0.02 },
  C: { description: 'TVA taxable 2', tva: 0.10, psvb: 0.02 },
  D: { description: 'Exportation produits taxables', tva: 0, psvb: 0 },
  E: { description: 'Régime dérogatoire', tva: 0, psvb: 0.01 },
  F: { description: 'Régime dérogatoire', tva: 0.18, psvb: 0.01 },
  G: { description: 'Régime dérogatoire', tva: 0.10, psvb: 0.01 },
  H: { description: 'Régime synthétique', tva: 0, psvb: 0 },
  I: { description: 'Consignation emballage', tva: 0, psvb: 0 },
  J: { description: 'Dépôts, garantie, caution', tva: 0, psvb: 0 },
  K: { description: 'Débours', tva: 0, psvb: 0 },
  L: { description: 'Taxe développement touristique', tva: 0.10, psvb: 0 },
  M: { description: 'Taxe séjour hôtelier', tva: 0.10, psvb: 0 },
  N: { description: 'PBA (Droits fixes)', tva: 0, psvb: 0 },
  O: { description: 'Réservé', tva: 0, psvb: 0 },
  P: { description: 'Réservé', tva: 0, psvb: 0 },
};

const INVOICE_TYPES = [
  { type: 'FV', description: 'Facture de vente' },
  { type: 'FT', description: "Facture d'acompte ou d'avance" },
  { type: 'FA', description: "Facture d'avoir" },
  { type: 'EV', description: "Facture de vente à l'exportation" },
  { type: 'ET', description: "Facture d'acompte à l'exportation" },
  { type: 'EA', description: "Facture d'avoir à l'exportation" },
];

const PAYMENT_TYPES = ['ESPECES', 'CHEQUES', 'MOBILEMONEY', 'CARTEBANCAIRE', 'VIREMENT', 'CREDIT', 'AUTRE'];
const ARTICLE_TYPES = ['LOCBIE', 'LOCSER', 'IMPBIE', 'IMPSER'];
const CLIENT_TYPES = ['CC', 'PM', 'PP', 'PC'];

// --- Helpers ---
function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function errorResponse(code, message, details = {}, status = 400) {
  return new Response(JSON.stringify({
    error: true,
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  }), { status, headers: CORS_HEADERS });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS_HEADERS });
}

function calculateStampDuty(totalTTC, payments) {
  const cashAmount = payments
    .filter(p => p.type === 'ESPECES')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  if (cashAmount <= 0) return 0;
  if (totalTTC < 5000) return 0;
  if (totalTTC <= 25000) return 100;
  if (totalTTC <= 50000) return 200;
  if (totalTTC <= 100000) return 500;
  return 1000;
}

function calculateTaxes(items, priceMode) {
  const totalHT = {};
  const tva = {};
  const psvb = {};
  const groups = 'ABCDEFGHIJKLMNOP'.split('');
  groups.forEach(g => { totalHT[g] = 0; tva[g] = 0; psvb[g] = 0; });

  let grandTotalHT = 0;
  let grandTotalTVA = 0;
  let grandTotalPSVB = 0;
  let grandTotalTTC = 0;

  for (const item of items) {
    const group = TAX_GROUPS[item.taxGroup];
    if (!group) continue;
    const qty = item.quantity || 1;
    const lineTotal = round2(item.price * qty - (item.discount || 0) + (item.specificTax || 0));

    let ht, tvaMontant;
    if (priceMode === 'TTC') {
      ht = round2(lineTotal / (1 + group.tva));
      tvaMontant = round2(lineTotal - ht);
    } else {
      ht = lineTotal;
      tvaMontant = round2(ht * group.tva);
    }
    const ttc = round2(ht + tvaMontant);
    const psvbMontant = round2(ttc * group.psvb);

    totalHT[item.taxGroup] = round2(totalHT[item.taxGroup] + ht);
    tva[item.taxGroup] = round2(tva[item.taxGroup] + tvaMontant);
    psvb[item.taxGroup] = round2(psvb[item.taxGroup] + psvbMontant);

    grandTotalHT += ht;
    grandTotalTVA += tvaMontant;
    grandTotalPSVB += psvbMontant;
    grandTotalTTC += ttc;
  }

  return {
    totalHT,
    tva,
    psvb,
    grandTotalHT: round2(grandTotalHT),
    grandTotalTVA: round2(grandTotalTVA),
    grandTotalPSVB: round2(grandTotalPSVB),
    totalTTC: round2(grandTotalTTC),
    stampDuty: 0,
  };
}

function generateCodeSECeF() {
  const chars = 'ABCDEF0123456789';
  const parts = [];
  for (let p = 0; p < 6; p++) {
    let seg = '';
    for (let i = 0; i < 4; i++) seg += chars[Math.floor(Math.random() * chars.length)];
    parts.push(seg);
  }
  return 'BF' + parts.join('-').substring(0, 27);
}

function generateSignature() {
  const hex = '0123456789abcdef';
  let sig = '3045022100';
  for (let i = 0; i < 64; i++) sig += hex[Math.floor(Math.random() * hex.length)];
  return sig;
}

// --- JWT simple (simulé) ---
function createSimpleJWT(payload, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const sig = btoa(secret.substring(0, 16));
  return `${header}.${body}.${sig}`;
}

function decodeSimpleJWT(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
  } catch { return null; }
}

// --- DB client ---
function getDB() {
  return createClient({
    baseUrl: typeof Deno !== 'undefined' ? Deno.env.get('INSFORGE_BASE_URL') : process.env.INSFORGE_BASE_URL,
    anonKey: typeof Deno !== 'undefined' ? Deno.env.get('ANON_KEY') : process.env.ANON_KEY,
  });
}

// --- Route handlers ---

async function handleAuth(body) {
  if (!body.clientId || !body.clientSecret || !body.nim) {
    return errorResponse('BF001', 'IFU vendeur absent ou invalide', { required: ['clientId', 'clientSecret', 'nim'] });
  }

  const db = getDB();
  const { data: device, error } = await db.database
    .from('devices')
    .select('*')
    .eq('nim', body.nim)
    .single();

  if (error || !device) {
    return errorResponse('BF017', 'NIM non enregistré ou invalide', { nim: body.nim });
  }
  if (device.status === 'BLOQUÉ') {
    return errorResponse('BF015', 'Dispositif SECeF bloqué', { nim: body.nim });
  }
  if (device.status === 'DÉSACTIVÉ') {
    return errorResponse('BF016', 'Dispositif SECeF désactivé', { nim: body.nim });
  }

  const payload = {
    ifu: device.ifu,
    nim: device.nim,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const token = createSimpleJWT(payload, device.jwt_secret);

  return jsonResponse({
    access_token: token,
    token_type: 'Bearer',
    expires_in: 3600,
    ifu: device.ifu,
    nim: device.nim,
  });
}

async function handleStatus(claims) {
  const db = getDB();
  const { data: device } = await db.database
    .from('devices')
    .select('*')
    .eq('nim', claims.nim)
    .single();

  const { data: pending } = await db.database
    .from('sim_invoices')
    .select('uid, date_submitted')
    .eq('nim', claims.nim)
    .eq('status', 'PENDING');

  return jsonResponse({
    status: true,
    version: '1.0-BF',
    ifu: claims.ifu,
    nim: claims.nim,
    tokenValid: new Date((claims.exp || 0) * 1000).toISOString(),
    serverDateTime: new Date().toISOString(),
    pendingInvoicesCount: (pending || []).length,
    pendingInvoicesList: (pending || []).map(p => ({ date: p.date_submitted, uid: p.uid })),
    lastAuditRemote: device?.last_audit_remote || null,
    deviceStatus: device?.status || 'ACTIF',
  });
}

async function handleSubmitInvoice(body, claims) {
  // Validations
  if (!body.ifu) return errorResponse('BF001', 'IFU vendeur absent ou invalide');
  if (!body.type || !['FV','FT','FA','EV','ET','EA'].includes(body.type)) return errorResponse('BF002', 'Type de facture non valide', { value: body.type });
  if (!body.reference) return errorResponse('BF003', 'Référence de facture manquante');
  if (!body.items || body.items.length === 0) return errorResponse('BF004', 'Articles manquants (minimum 1 requis)');
  if (body.priceMode && !['HT', 'TTC'].includes(body.priceMode)) return errorResponse('BF020', 'Mode de prix invalide');

  for (let i = 0; i < body.items.length; i++) {
    const item = body.items[i];
    if (!TAX_GROUPS[item.taxGroup]) return errorResponse('BF005', `Groupe de taxation invalide: '${item.taxGroup}'`, { field: `items[${i}].taxGroup` });
    if (!ARTICLE_TYPES.includes(item.type)) return errorResponse('BF011', `Type d'article invalide: '${item.type}'`, { field: `items[${i}].type` });
    if (!item.price || item.price <= 0) return errorResponse('BF010', 'Montant article négatif ou nul', { field: `items[${i}].price` });
  }

  if (body.client) {
    if (!CLIENT_TYPES.includes(body.client.type)) return errorResponse('BF006', `Type de client invalide: '${body.client.type}'`);
    if (['PM', 'PC'].includes(body.client.type) && !body.client.ifu) return errorResponse('BF007', 'IFU client obligatoire pour type PM ou PC');
  }

  if (body.payment) {
    for (const p of body.payment) {
      if (!PAYMENT_TYPES.includes(p.type)) return errorResponse('BF008', `Mode de paiement invalide: '${p.type}'`);
    }
  }

  // Check pending limit
  const db = getDB();
  const { data: pendingCount } = await db.database
    .from('sim_invoices')
    .select('uid', { count: 'exact' })
    .eq('nim', claims.nim)
    .eq('status', 'PENDING');

  if (pendingCount && pendingCount.length >= 50) {
    return errorResponse('BF012', 'Limite de factures en attente atteinte (max 50)');
  }

  // Check duplicate reference
  const { data: existing } = await db.database
    .from('sim_invoices')
    .select('uid')
    .eq('reference', body.reference)
    .single();

  if (existing) return errorResponse('BF018', 'Référence de facture en double', { reference: body.reference });

  // Calculate taxes
  const priceMode = body.priceMode || 'TTC';
  const taxCalc = calculateTaxes(body.items, priceMode);
  if (body.payment) {
    taxCalc.stampDuty = calculateStampDuty(taxCalc.totalTTC, body.payment);
  }

  // Store in sim_invoices
  const { data: invoice, error } = await db.database
    .from('sim_invoices')
    .insert({
      nim: claims.nim,
      ifu: body.ifu,
      reference: body.reference,
      type: body.type,
      status: 'PENDING',
      data: body,
      tax_calculation: taxCalc,
    })
    .select()
    .single();

  if (error) return errorResponse('BF099', 'Erreur interne du serveur', { detail: error.message }, 500);

  return jsonResponse({
    uid: invoice.uid,
    status: 'PENDING',
    taxCalculation: {
      totalHT: taxCalc.totalHT,
      tva: taxCalc.tva,
      psvb: taxCalc.psvb,
      totalTTC: taxCalc.totalTTC,
      stampDuty: taxCalc.stampDuty,
    },
    serverDateTime: new Date().toISOString(),
  }, 201);
}

async function handleConfirmInvoice(uid, claims) {
  const db = getDB();
  const { data: invoice, error } = await db.database
    .from('sim_invoices')
    .select('*')
    .eq('uid', uid)
    .eq('nim', claims.nim)
    .single();

  if (error || !invoice) return errorResponse('BF014', 'Facture introuvable', { uid });
  if (invoice.status !== 'PENDING') return errorResponse('BF013', 'Facture déjà confirmée ou annulée', { status: invoice.status });

  // Get counter
  const { data: countData } = await db.database
    .from('sim_invoices')
    .select('uid', { count: 'exact' })
    .eq('nim', claims.nim)
    .eq('status', 'CERTIFIED');

  const counter = (countData ? countData.length : 0) + 1;
  const now = new Date();
  const year = now.getFullYear();
  const fiscalNumber = `${invoice.type}${String(counter).padStart(7, '0')}/${year}`;
  const codeSECeF = generateCodeSECeF();
  const codeSECeFClean = codeSECeF.replace(/-/g, '');
  const dtCompact = now.toISOString().replace(/[-:T]/g, '').substring(0, 14);
  const qrCode = `BF;${fiscalNumber};${codeSECeFClean};${invoice.ifu};${dtCompact}`;
  const signature = generateSignature();
  const counters = `${counter}/${counter} ${invoice.type}`;

  const { error: updateError } = await db.database
    .from('sim_invoices')
    .update({
      status: 'CERTIFIED',
      fiscal_number: fiscalNumber,
      code_secef_dgi: codeSECeF,
      qr_code: qrCode,
      signature: signature,
      date_certified: now.toISOString(),
      counters: counters,
    })
    .eq('uid', uid);

  if (updateError) return errorResponse('BF099', 'Erreur interne', { detail: updateError.message }, 500);

  const { data: device } = await db.database
    .from('devices')
    .select('nim, activation_counter')
    .eq('nim', claims.nim)
    .single();

  return jsonResponse({
    uid,
    status: 'CERTIFIED',
    dateTime: now.toISOString(),
    fiscalNumber,
    codeSECeFDGI: codeSECeF,
    qrCode,
    signature,
    counters,
    nim: claims.nim,
    deviceInfo: {
      nim: claims.nim,
      activationCounter: device?.activation_counter || 1,
      manufacturer: 'BF',
      certificate: '01',
    },
  });
}

async function handleCancelInvoice(uid, claims) {
  const db = getDB();
  const { data: invoice, error } = await db.database
    .from('sim_invoices')
    .select('*')
    .eq('uid', uid)
    .eq('nim', claims.nim)
    .single();

  if (error || !invoice) return errorResponse('BF014', 'Facture introuvable', { uid });
  if (invoice.status !== 'PENDING') return errorResponse('BF013', 'Facture déjà confirmée ou annulée', { status: invoice.status });

  await db.database
    .from('sim_invoices')
    .update({ status: 'CANCELLED' })
    .eq('uid', uid);

  return jsonResponse({ uid, status: 'CANCELLED', dateTime: new Date().toISOString() });
}

async function handleGetInvoice(uid, claims) {
  const db = getDB();
  const { data: invoice, error } = await db.database
    .from('sim_invoices')
    .select('*')
    .eq('uid', uid)
    .eq('nim', claims.nim)
    .single();

  if (error || !invoice) return errorResponse('BF014', 'Facture introuvable', { uid });
  return jsonResponse(invoice);
}

function handleTaxGroups() {
  return jsonResponse(TAX_GROUPS);
}

function handleInvoiceTypes() {
  return jsonResponse(INVOICE_TYPES);
}

function handlePaymentTypes() {
  return jsonResponse(PAYMENT_TYPES);
}

async function handleReport(type, claims) {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];

  const { data: invoices } = await db.database
    .from('sim_invoices')
    .select('*')
    .eq('nim', claims.nim)
    .eq('status', 'CERTIFIED')
    .gte('date_certified', today + 'T00:00:00')
    .lte('date_certified', today + 'T23:59:59');

  const groups = 'ABCDEFGHIJKLMNOP'.split('');
  const totals = { totalHT: {}, tva: {}, psvb: {} };
  groups.forEach(g => { totals.totalHT[g] = 0; totals.tva[g] = 0; totals.psvb[g] = 0; });

  let totalTTC = 0;
  let invoiceCount = 0;

  for (const inv of (invoices || [])) {
    invoiceCount++;
    const tc = inv.tax_calculation || {};
    if (tc.totalHT) groups.forEach(g => { totals.totalHT[g] += tc.totalHT[g] || 0; });
    if (tc.tva) groups.forEach(g => { totals.tva[g] += tc.tva[g] || 0; });
    if (tc.psvb) groups.forEach(g => { totals.psvb[g] += tc.psvb[g] || 0; });
    totalTTC += tc.totalTTC || 0;
  }

  return jsonResponse({
    type: type === 'z' ? 'Z-Rapport' : 'X-Rapport',
    date: today,
    nim: claims.nim,
    ifu: claims.ifu,
    invoiceCount,
    totalTTC: round2(totalTTC),
    byTaxGroup: totals,
    serverDateTime: new Date().toISOString(),
  });
}

// --- PING (no auth required) ---
function handlePing() {
  return jsonResponse({
    status: true,
    version: '1.0-BF',
    serverDateTime: new Date().toISOString(),
    message: 'MCF/SECeF Simulator operational',
  });
}

// --- Main router ---
// FIXED: reads _path and _method from request body for InsForge invoke routing
module.exports = async function(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  let body = {};
  let path = '';
  let method = request.method;

  // Try to parse body to extract _path and _method
  try {
    const cloned = request.clone();
    body = await cloned.json();
    if (body._path) {
      path = body._path;
    }
    if (body._method) {
      method = body._method;
    }
  } catch {
    // No body or not JSON — fall back to URL pathname
    const url = new URL(request.url);
    path = url.pathname.replace(/\/+$/, '');
  }

  // If no _path in body, use URL pathname
  if (!path) {
    const url = new URL(request.url);
    path = url.pathname.replace(/\/+$/, '');
  }

  // --- PING endpoint (no auth) ---
  if (path.endsWith('/bf/mcf/ping') || path === '/ping' || path === 'ping') {
    return handlePing();
  }

  // Auth endpoint (no JWT required)
  if (path.endsWith('/bf/mcf/auth/token') && method === 'POST') {
    return handleAuth(body);
  }

  // Info endpoints (no JWT required)
  if (path.endsWith('/bf/mcf/info/taxGroups') && method === 'GET') return handleTaxGroups();
  if (path.endsWith('/bf/mcf/info/invoiceTypes') && method === 'GET') return handleInvoiceTypes();
  if (path.endsWith('/bf/mcf/info/paymentTypes') && method === 'GET') return handlePaymentTypes();

  // All other endpoints require JWT
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorResponse('BF099', 'Token d\'authentification requis', {}, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  const claims = decodeSimpleJWT(token);
  if (!claims || !claims.nim || !claims.ifu) {
    return errorResponse('BF099', 'Token invalide ou expiré', {}, 401);
  }
  if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) {
    return errorResponse('BF099', 'Token expiré', {}, 401);
  }

  // Status
  if (path.endsWith('/bf/mcf/status') && method === 'GET') {
    return handleStatus(claims);
  }

  // Submit invoice
  if (path.endsWith('/bf/mcf/invoices') && method === 'POST') {
    return handleSubmitInvoice(body, claims);
  }

  // Confirm invoice
  const confirmMatch = path.match(/\/bf\/mcf\/invoices\/([^/]+)\/confirm$/);
  if (confirmMatch && method === 'PUT') {
    return handleConfirmInvoice(confirmMatch[1], claims);
  }

  // Cancel invoice
  const cancelMatch = path.match(/\/bf\/mcf\/invoices\/([^/]+)\/cancel$/);
  if (cancelMatch && method === 'PUT') {
    return handleCancelInvoice(cancelMatch[1], claims);
  }

  // Get invoice details
  const getMatch = path.match(/\/bf\/mcf\/invoices\/([^/]+)$/);
  if (getMatch && method === 'GET') {
    return handleGetInvoice(getMatch[1], claims);
  }

  // Reports
  if (path.endsWith('/bf/mcf/reports/z') && method === 'GET') return handleReport('z', claims);
  if (path.endsWith('/bf/mcf/reports/x') && method === 'GET') return handleReport('x', claims);

  return errorResponse('BF099', 'Endpoint non trouvé', { path, method }, 404);
};
