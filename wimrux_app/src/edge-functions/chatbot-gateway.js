/* eslint-disable @typescript-eslint/no-require-imports */
const { Client, Databases, Functions, ID, Query } = require('node-appwrite');

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Channel',
  'Content-Type': 'application/json',
};

// All available chatbot actions
const VALID_ACTIONS = [
  'view_invoices', 'create_invoice', 'view_clients', 'create_client',
  'view_treasury', 'create_treasury_movement', 'view_reports',
  'generate_fiscal_report', 'view_audit_log', 'ai_assistant', 'view_dashboard',
];

const ACTION_DESCRIPTIONS = {
  view_invoices: 'Lister ou rechercher des factures',
  create_invoice: 'Créer une nouvelle facture',
  view_clients: 'Lister ou rechercher des clients',
  create_client: 'Créer un nouveau client',
  view_treasury: 'Voir les comptes de trésorerie et soldes',
  create_treasury_movement: 'Enregistrer un mouvement de trésorerie',
  view_reports: 'Voir les KPIs et rapports',
  generate_fiscal_report: 'Générer un rapport fiscal Z ou X',
  view_audit_log: 'Consulter le journal d\'audit',
  ai_assistant: 'Poser une question à l\'assistant IA fiscal',
  view_dashboard: 'Obtenir les KPIs du tableau de bord',
};

module.exports = async function(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const body = await request.json();
    const apiKeyRaw = request.headers.get('X-API-Key') || body.api_key;
    const channel = request.headers.get('X-Channel') || body.channel || 'api';
    const message = body.message;
    const conversationId = body.conversation_id || null;
    const externalId = body.external_id || null;
    const externalUser = body.external_user || null;

    if (!apiKeyRaw) {
      return new Response(JSON.stringify({ error: 'API key required (X-API-Key header or api_key body field)' }), { status: 401, headers: CORS_HEADERS });
    }
    if (!message) {
      return new Response(JSON.stringify({ error: 'message field required' }), { status: 400, headers: CORS_HEADERS });
    }

    // Create admin client for DB operations
    const appwriteClient = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://appwrite.benga.live/v1')
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || '6a29285200015cd421c7')
      .setKey(process.env.APPWRITE_API_KEY || '');
    const db = new Databases(appwriteClient);
    const fnClient = new Functions(appwriteClient);
    const DB_ID = process.env.APPWRITE_DATABASE_ID || 'wimrux_finances';

    // Helper: list documents with queries
    async function dbList(collection, queries = []) {
      const res = await db.listDocuments(DB_ID, collection, queries);
      return { data: res.documents, error: null };
    }
    async function dbGet(collection, id) {
      try { return { data: await db.getDocument(DB_ID, collection, id), error: null }; }
      catch (e) { return { data: null, error: e }; }
    }
    async function dbInsert(collection, doc) {
      try { return { data: await db.createDocument(DB_ID, collection, doc.id || ID.unique(), doc), error: null }; }
      catch (e) { return { data: null, error: e }; }
    }
    async function dbUpdate(collection, id, updates) {
      try { return { data: await db.updateDocument(DB_ID, collection, id, updates), error: null }; }
      catch (e) { return { data: null, error: e }; }
    }

    // 1. Authenticate API key
    const { data: keyDocs, error: keyErr } = await dbList('chatbot_api_keys', [
      Query.equal('api_key_hash', apiKeyRaw),
      Query.equal('is_active', true),
      Query.limit(1),
    ]);
    const keyData = keyDocs?.[0] ?? null;

    if (keyErr || !keyData) {
      return new Response(JSON.stringify({ error: 'Invalid or inactive API key' }), { status: 401, headers: CORS_HEADERS });
    }

    // Check expiry
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'API key expired' }), { status: 401, headers: CORS_HEADERS });
    }

    // Check channel
    if (keyData.channels.length > 0 && !keyData.channels.includes(channel)) {
      return new Response(JSON.stringify({ error: `Channel '${channel}' not allowed for this key` }), { status: 403, headers: CORS_HEADERS });
    }

    // Check company chatbot enabled
    const { data: companyData } = await dbGet('companies', keyData.company_id);

    if (!companyData || !companyData.chatbot_enabled) {
      return new Response(JSON.stringify({ error: 'Chatbot is disabled for this company' }), { status: 403, headers: CORS_HEADERS });
    }

    // Update last_used_at
    await dbUpdate('chatbot_api_keys', keyData.$id, { last_used_at: new Date().toISOString() });

    // 2. Load permissions
    const { data: permsData } = await dbList('chatbot_permissions', [
      Query.equal('api_key_id', keyData.$id),
    ]);

    const permissions = (permsData || []).filter(p => {
      if (!p.enabled) return false;
      const now = new Date();
      if (p.valid_from && new Date(p.valid_from) > now) return false;
      if (p.valid_until && new Date(p.valid_until) < now) return false;
      return true;
    });

    const allowedActions = permissions.map(p => p.action);

    if (allowedActions.length === 0) {
      return new Response(JSON.stringify({
        error: 'No actions are permitted for this API key at this time',
        reply: 'Aucune action n\'est autorisée pour cette clé API actuellement.',
      }), { status: 403, headers: CORS_HEADERS });
    }

    // 3. Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const { data: convData } = await dbInsert('chatbot_conversations', {
        company_id: keyData.company_id,
        api_key_id: keyData.$id,
        channel,
        external_id: externalId,
        external_user: externalUser,
        status: 'active',
      });
      if (convData) convId = convData.$id;
    } else {
      await dbUpdate('chatbot_conversations', convId, { last_message_at: new Date().toISOString() });
    }

    // 4. Log user message
    await dbInsert('chatbot_messages', {
      conversation_id: convId,
      company_id: keyData.company_id,
      role: 'user',
      content: message,
    });

    // 5. Use AI to interpret intent and execute
    const allowedDesc = allowedActions.map(a => `- ${a}: ${ACTION_DESCRIPTIONS[a] || a}`).join('\n');

    const systemPrompt = `Tu es un assistant chatbot pour l'entreprise "${companyData.name}" sur la plateforme WIMRUX® Finances (gestion comptable et fiscale).

Tu peux exécuter UNIQUEMENT les actions suivantes :
${allowedDesc}

Quand l'utilisateur demande quelque chose :
1. Identifie l'action la plus appropriée parmi celles autorisées
2. Réponds au format JSON strict suivant :
{
  "action": "<nom_action>" ou null si c'est une conversation générale,
  "params": { ... paramètres pour l'action },
  "reply": "Réponse en français à l'utilisateur"
}

Si l'action demandée n'est pas dans la liste autorisée, réponds avec action=null et explique poliment que cette action n'est pas autorisée.
Si c'est une question générale ou salutation, réponds normalement avec action=null.
Réponds TOUJOURS en JSON valide.`;

    // Decrypt OpenRouter key if needed
    let orApiKey = companyData.openrouter_api_key || '';
    if (orApiKey.includes(':')) {
      try {
        const decResp = await fnClient.createExecution('crypto-aes256', JSON.stringify({ action: 'decrypt', data: orApiKey }));
        const decData = JSON.parse(decResp.responseBody || '{}');
        if (decData.plaintext) orApiKey = decData.plaintext;
      } catch { /* use as-is */ }
    }

    const aiModel = companyData.ai_model || 'openai/gpt-4o-mini';

    // Get conversation history for context
    let conversationHistory = [];
    if (convId) {
      const { data: histData } = await dbList('chatbot_messages', [
        Query.equal('conversation_id', convId),
        Query.orderAsc('$createdAt'),
        Query.limit(10),
      ]);
      if (histData) {
        conversationHistory = histData.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }));
      }
    }

    const aiMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-8),
      { role: 'user', content: message },
    ];

    // Call OpenRouter
    const aiResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${orApiKey}`,
      },
      body: JSON.stringify({
        model: aiModel,
        messages: aiMessages,
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    });

    const aiResult = await aiResponse.json();
    let aiContent = aiResult.choices?.[0]?.message?.content || '{}';

    let parsed;
    try {
      parsed = JSON.parse(aiContent);
    } catch {
      parsed = { action: null, params: {}, reply: aiContent };
    }

    const detectedAction = parsed.action;
    let actionResult = null;
    let actionStatus = null;
    let reply = parsed.reply || 'Je n\'ai pas compris votre demande.';

    // 6. Execute action if detected and allowed
    if (detectedAction && VALID_ACTIONS.includes(detectedAction)) {
      if (!allowedActions.includes(detectedAction)) {
        actionStatus = 'denied';
        reply = `L'action "${detectedAction}" n'est pas autorisée pour votre clé API.`;
      } else {
        try {
          actionResult = await executeAction(dbList, dbInsert, keyData.company_id, detectedAction, parsed.params || {});
          actionStatus = 'success';
          // Enrich reply with data if needed
          if (actionResult && actionResult.summary) {
            reply = reply + '\n\n' + actionResult.summary;
          }
        } catch (execErr) {
          actionStatus = 'error';
          actionResult = { error: execErr.message || 'Erreur d\'exécution' };
          reply = `Erreur lors de l'exécution : ${execErr.message}`;
        }
      }
    }

    // 7. Log assistant message
    const tokensUsed = aiResult.usage?.total_tokens || 0;
    await dbInsert('chatbot_messages', {
      conversation_id: convId,
      company_id: keyData.company_id,
      role: 'assistant',
      content: reply,
      action_requested: detectedAction || null,
      action_payload: parsed.params || null,
      action_result: actionResult,
      action_status: actionStatus,
      tokens_used: tokensUsed,
    });

    // Log to ai_usage_logs
    await dbInsert('ai_usage_logs', {
      company_id: keyData.company_id,
      user_id: 'chatbot',
      model: aiModel,
      task: 'chatbot_' + (detectedAction || 'conversation'),
      tokens_input: aiResult.usage?.prompt_tokens || 0,
      tokens_output: aiResult.usage?.completion_tokens || 0,
      tokens_total: tokensUsed,
      latency_ms: 0,
      status: 'success',
      is_fallback: false,
      moderation_flagged: false,
    });

    return new Response(JSON.stringify({
      conversation_id: convId,
      reply: reply,
      action: detectedAction || null,
      action_status: actionStatus,
      action_result: actionResult,
      tokens_used: tokensUsed,
    }), { status: 200, headers: CORS_HEADERS });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), { status: 500, headers: CORS_HEADERS });
  }
};

// ── Action Executor ──
async function executeAction(dbList, dbInsert, companyId, action, params) {
  switch (action) {
    case 'view_invoices': {
      const queries = [Query.equal('company_id', companyId), Query.orderDesc('$createdAt'), Query.limit(params.limit || 10)];
      if (params.status) queries.push(Query.equal('status', params.status));
      if (params.type) queries.push(Query.equal('type', params.type));
      const { data } = await dbList('invoices', queries);
      return { data, summary: `${(data || []).length} facture(s) trouvée(s).` };
    }

    case 'view_clients': {
      const queries = [Query.equal('company_id', companyId), Query.orderAsc('name'), Query.limit(params.limit || 20)];
      if (params.search) queries.push(Query.search('name', params.search));
      const { data } = await dbList('clients', queries);
      return { data, summary: `${(data || []).length} client(s) trouvé(s).` };
    }

    case 'create_client': {
      if (!params.name || !params.type) return { error: 'name et type requis' };
      const { data, error } = await dbInsert('clients', {
        company_id: companyId, name: params.name, type: params.type,
        ifu: params.ifu || null, phone: params.phone || null,
        email: params.email || null, address: params.address || null,
      });
      if (error) throw new Error(error.message);
      return { data, summary: `Client "${params.name}" créé avec succès.` };
    }

    case 'view_treasury': {
      const { data: accounts } = await dbList('treasury_accounts', [Query.equal('company_id', companyId)]);
      const totalBalance = (accounts || []).reduce((s, a) => s + (a.balance || 0), 0);
      return { data: accounts, summary: `${(accounts || []).length} compte(s), solde total : ${totalBalance.toLocaleString('fr-FR')} FCFA.` };
    }

    case 'create_treasury_movement': {
      if (!params.account_id || !params.amount || !params.type) return { error: 'account_id, amount et type requis' };
      const { data, error } = await dbInsert('treasury_movements', {
        company_id: companyId, account_id: params.account_id,
        amount: params.amount, type: params.type,
        description: params.description || '', payment_type: params.payment_type || 'AUTRE',
      });
      if (error) throw new Error(error.message);
      return { data, summary: `Mouvement de ${params.amount} FCFA enregistré.` };
    }

    case 'view_reports': {
      const { data: invoices } = await dbList('invoices', [Query.equal('company_id', companyId)]);
      const total = (invoices || []).reduce((s, i) => s + (i.total_ttc || 0), 0);
      const certified = (invoices || []).filter(i => i.status === 'certified').length;
      return {
        data: { total_invoices: (invoices || []).length, total_ttc: total, certified },
        summary: `${(invoices || []).length} facture(s), total TTC : ${total.toLocaleString('fr-FR')} FCFA, ${certified} certifiée(s).`,
      };
    }

    case 'view_audit_log': {
      const { data } = await dbList('audit_log', [Query.equal('company_id', companyId), Query.orderDesc('$createdAt'), Query.limit(params.limit || 10)]);
      return { data, summary: `${(data || []).length} entrée(s) d'audit.` };
    }

    case 'view_dashboard': {
      const [{ data: invoices }, { data: clients }, { data: accounts }] = await Promise.all([
        dbList('invoices', [Query.equal('company_id', companyId)]),
        dbList('clients', [Query.equal('company_id', companyId)]),
        dbList('treasury_accounts', [Query.equal('company_id', companyId)]),
      ]);
      const totalRevenue = (invoices || []).reduce((s, i) => s + (i.total_ttc || 0), 0);
      const totalBalance = (accounts || []).reduce((s, a) => s + (a.balance || 0), 0);
      return {
        data: { invoices_count: (invoices || []).length, clients_count: (clients || []).length, total_revenue: totalRevenue, total_balance: totalBalance },
        summary: `Tableau de bord : ${(invoices || []).length} factures, ${(clients || []).length} clients, CA : ${totalRevenue.toLocaleString('fr-FR')} FCFA, Trésorerie : ${totalBalance.toLocaleString('fr-FR')} FCFA.`,
      };
    }

    case 'ai_assistant':
      return { data: null, summary: 'Question traitée par l\'assistant IA.' };

    default:
      return { data: null, summary: `Action "${action}" non implémentée.` };
  }
}
