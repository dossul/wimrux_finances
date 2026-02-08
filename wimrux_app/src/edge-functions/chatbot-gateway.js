/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@insforge/sdk');

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
    const client = createClient({
      baseUrl: process.env.INSFORGE_BASE_URL || process.env.BASE_URL,
      anonKey: process.env.ANON_KEY,
    });

    // 1. Authenticate API key
    const { data: keyData, error: keyErr } = await client.database
      .from('chatbot_api_keys')
      .select('*')
      .eq('api_key_hash', apiKeyRaw)
      .eq('is_active', true)
      .single();

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
    const { data: companyData } = await client.database
      .from('companies')
      .select('id, name, chatbot_enabled, openrouter_api_key, ai_model')
      .eq('id', keyData.company_id)
      .single();

    if (!companyData || !companyData.chatbot_enabled) {
      return new Response(JSON.stringify({ error: 'Chatbot is disabled for this company' }), { status: 403, headers: CORS_HEADERS });
    }

    // Update last_used_at
    await client.database.from('chatbot_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', keyData.id);

    // 2. Load permissions
    const { data: permsData } = await client.database
      .from('chatbot_permissions')
      .select('*')
      .eq('api_key_id', keyData.id);

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
      const { data: convData } = await client.database
        .from('chatbot_conversations')
        .insert([{
          company_id: keyData.company_id,
          api_key_id: keyData.id,
          channel: channel,
          external_id: externalId,
          external_user: externalUser,
          status: 'active',
        }])
        .select()
        .single();
      if (convData) convId = convData.id;
    } else {
      // Update last_message_at
      await client.database.from('chatbot_conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', convId);
    }

    // 4. Log user message
    await client.database.from('chatbot_messages').insert([{
      conversation_id: convId,
      company_id: keyData.company_id,
      role: 'user',
      content: message,
    }]);

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
        const { data: decData } = await client.functions.invoke('crypto-aes256', {
          body: { action: 'decrypt', data: orApiKey },
        });
        if (decData && decData.plaintext) orApiKey = decData.plaintext;
      } catch { /* use as-is */ }
    }

    const aiModel = companyData.ai_model || 'openai/gpt-4o-mini';

    // Get conversation history for context
    let conversationHistory = [];
    if (convId) {
      const { data: histData } = await client.database
        .from('chatbot_messages')
        .select('role, content')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
        .limit(10);
      if (histData) {
        conversationHistory = histData.filter(m => m.role !== 'system').map(m => ({
          role: m.role,
          content: m.content,
        }));
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
          actionResult = await executeAction(client, keyData.company_id, detectedAction, parsed.params || {});
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
    await client.database.from('chatbot_messages').insert([{
      conversation_id: convId,
      company_id: keyData.company_id,
      role: 'assistant',
      content: reply,
      action_requested: detectedAction || null,
      action_payload: parsed.params || null,
      action_result: actionResult,
      action_status: actionStatus,
      tokens_used: tokensUsed,
    }]);

    // Log to ai_usage_logs
    await client.database.from('ai_usage_logs').insert([{
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
    }]);

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
async function executeAction(client, companyId, action, params) {
  switch (action) {
    case 'view_invoices': {
      let query = client.database.from('invoices').select('id, reference, type, status, total_ttc, created_at').eq('company_id', companyId).order('created_at', { ascending: false }).limit(params.limit || 10);
      if (params.status) query = query.eq('status', params.status);
      if (params.type) query = query.eq('type', params.type);
      const { data } = await query;
      return { data, summary: `${(data || []).length} facture(s) trouvée(s).` };
    }

    case 'view_clients': {
      let query = client.database.from('clients').select('id, name, type, ifu, phone, email').eq('company_id', companyId).order('name', { ascending: true }).limit(params.limit || 20);
      if (params.search) query = query.ilike('name', `%${params.search}%`);
      const { data } = await query;
      return { data, summary: `${(data || []).length} client(s) trouvé(s).` };
    }

    case 'create_client': {
      if (!params.name || !params.type) return { error: 'name et type requis' };
      const { data, error } = await client.database.from('clients').insert([{
        company_id: companyId,
        name: params.name,
        type: params.type,
        ifu: params.ifu || null,
        phone: params.phone || null,
        email: params.email || null,
        address: params.address || null,
      }]).select().single();
      if (error) throw new Error(error.message);
      return { data, summary: `Client "${params.name}" créé avec succès.` };
    }

    case 'view_treasury': {
      const { data: accounts } = await client.database.from('treasury_accounts').select('*').eq('company_id', companyId);
      const totalBalance = (accounts || []).reduce((s, a) => s + (a.balance || 0), 0);
      return { data: accounts, summary: `${(accounts || []).length} compte(s), solde total : ${totalBalance.toLocaleString('fr-FR')} FCFA.` };
    }

    case 'create_treasury_movement': {
      if (!params.account_id || !params.amount || !params.type) return { error: 'account_id, amount et type requis' };
      const { data, error } = await client.database.from('treasury_movements').insert([{
        company_id: companyId,
        account_id: params.account_id,
        amount: params.amount,
        type: params.type,
        description: params.description || '',
        payment_type: params.payment_type || 'AUTRE',
      }]).select().single();
      if (error) throw new Error(error.message);
      return { data, summary: `Mouvement de ${params.amount} FCFA enregistré.` };
    }

    case 'view_reports': {
      const { data: invoices } = await client.database.from('invoices').select('total_ttc, status, type').eq('company_id', companyId);
      const total = (invoices || []).reduce((s, i) => s + (i.total_ttc || 0), 0);
      const certified = (invoices || []).filter(i => i.status === 'certified').length;
      return {
        data: { total_invoices: (invoices || []).length, total_ttc: total, certified },
        summary: `${(invoices || []).length} facture(s), total TTC : ${total.toLocaleString('fr-FR')} FCFA, ${certified} certifiée(s).`,
      };
    }

    case 'view_audit_log': {
      const { data } = await client.database.from('audit_log').select('*').eq('company_id', companyId).order('timestamp', { ascending: false }).limit(params.limit || 10);
      return { data, summary: `${(data || []).length} entrée(s) d'audit.` };
    }

    case 'view_dashboard': {
      const { data: invoices } = await client.database.from('invoices').select('total_ttc, status').eq('company_id', companyId);
      const { data: clients } = await client.database.from('clients').select('id').eq('company_id', companyId);
      const { data: accounts } = await client.database.from('treasury_accounts').select('balance').eq('company_id', companyId);

      const totalRevenue = (invoices || []).reduce((s, i) => s + (i.total_ttc || 0), 0);
      const totalBalance = (accounts || []).reduce((s, a) => s + (a.balance || 0), 0);

      return {
        data: {
          invoices_count: (invoices || []).length,
          clients_count: (clients || []).length,
          total_revenue: totalRevenue,
          total_balance: totalBalance,
        },
        summary: `Tableau de bord : ${(invoices || []).length} factures, ${(clients || []).length} clients, CA : ${totalRevenue.toLocaleString('fr-FR')} FCFA, Trésorerie : ${totalBalance.toLocaleString('fr-FR')} FCFA.`,
      };
    }

    case 'ai_assistant': {
      return { data: null, summary: 'Question traitée par l\'assistant IA.' };
    }

    default:
      return { data: null, summary: `Action "${action}" non implémentée.` };
  }
}
