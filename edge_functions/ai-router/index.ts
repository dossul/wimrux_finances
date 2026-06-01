// =============================================================================
// WIMRUX® FINANCES — Edge Function ai-router (squelette)
// Orchestrateur IA unifié — en attente des credentials LiteLLM/Langfuse/Presidio
// POST /functions/v1/ai-router
// =============================================================================
import { createClient } from 'npm:@insforge/sdk';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-company-id',
};

interface AiRouterPayload {
  task_code: string;
  input: {
    messages?: Array<{ role: string; content: string }>;
    text?: string;
    image_url?: string;
    file_url?: string;
  };
  options?: {
    max_tokens?: number;
    temperature?: number;
    stream?: boolean;
    bypass_pii?: boolean;
    funding_source?: 'quota' | 'credits' | 'byok';
  };
}

interface AiRouterResponse {
  success: boolean;
  data?: {
    content: string;
    tokens: { input: number; output: number; total: number };
    model_used: string;
    funding_source: 'quota' | 'credits' | 'byok';
    cost_usd: number;
  };
  usage?: {
    quota_remaining_usd: number;
    credits_balance_usd: number;
  };
  error?: string;
}

export default async function (req: Request): Promise<Response> {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
  }

  // Auth
  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return jsonResponse({ success: false, error: 'Missing Authorization header' }, 401);
  }

  const baseUrl = Deno.env.get('INSFORGE_BASE_URL') ?? '';
  const anonKey = Deno.env.get('ANON_KEY') ?? '';

  const client = createClient({ baseUrl, anonKey, edgeFunctionToken: token });

  // Parse payload
  let payload: AiRouterPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { task_code, input, options } = payload;

  if (!task_code || !input) {
    return jsonResponse({ success: false, error: 'Missing task_code or input' }, 400);
  }

  // Vérifier que le task_code existe dans ai_tasks
  const { data: task, error: taskErr } = await client.database
    .from('ai_tasks')
    .select('id, code, name, category, default_model_id')
    .eq('code', task_code)
    .single();

  if (taskErr || !task) {
    return jsonResponse({ success: false, error: `Unknown task_code: ${task_code}` }, 400);
  }

  // Récupérer le company_id depuis le header ou le contexte utilisateur
  const companyId = req.headers.get('x-company-id') ?? '';
  if (!companyId) {
    return jsonResponse({ success: false, error: 'Missing x-company-id header' }, 400);
  }

  // -------------------------------------------------------------------------
  // ÉTAPE 1 : Résolution du modèle (routing)
  // -------------------------------------------------------------------------
  let modelId = task.default_model_id;

  // Vérifier si le tenant a un routing personnalisé
  const { data: customRouting } = await client.database
    .from('company_ai_task_routing')
    .select('model_id, provider_id')
    .eq('company_id', companyId)
    .eq('task_id', task.id)
    .eq('is_active', true)
    .single();

  if (customRouting?.model_id) {
    modelId = customRouting.model_id;
  }

  // Récupérer les infos du modèle
  const { data: model } = await client.database
    .from('ai_models')
    .select('id, name, api_identifier, provider_id, input_cost_per_1k, output_cost_per_1k')
    .eq('id', modelId)
    .single();

  if (!model) {
    return jsonResponse({ success: false, error: 'Model not found for this task' }, 500);
  }

  // -------------------------------------------------------------------------
  // ÉTAPE 2 : Vérification quota / crédits
  // -------------------------------------------------------------------------
  const { data: quota } = await client.database
    .from('company_ai_quota_usage')
    .select('monthly_quota_usd, used_usd')
    .eq('company_id', companyId)
    .single();

  const { data: credits } = await client.database
    .from('company_ai_credits')
    .select('balance_usd')
    .eq('company_id', companyId)
    .single();

  const quotaRemaining = (quota?.monthly_quota_usd ?? 0) - (quota?.used_usd ?? 0);
  const creditsBalance = credits?.balance_usd ?? 0;

  // Déterminer la source de financement
  let fundingSource: 'quota' | 'credits' | 'byok' = 'quota';
  if (options?.funding_source) {
    fundingSource = options.funding_source;
  } else if (quotaRemaining <= 0) {
    fundingSource = creditsBalance > 0 ? 'credits' : 'byok';
  }

  // Vérifier capacité de paiement (estimation conservatrice : 0.01 USD par requête)
  const estimatedCost = 0.01;
  if (fundingSource === 'quota' && quotaRemaining < estimatedCost) {
    if (creditsBalance > estimatedCost) {
      fundingSource = 'credits';
    } else {
      return jsonResponse({
        success: false,
        error: 'Insufficient quota and credits. Please purchase a credit pack.',
        usage: { quota_remaining_usd: quotaRemaining, credits_balance_usd: creditsBalance },
      }, 402);
    }
  }

  if (fundingSource === 'credits' && creditsBalance < estimatedCost) {
    return jsonResponse({
      success: false,
      error: 'Insufficient credits balance.',
      usage: { quota_remaining_usd: quotaRemaining, credits_balance_usd: creditsBalance },
    }, 402);
  }

  // -------------------------------------------------------------------------
  // ÉTAPE 3 : Appel LLM via LiteLLM proxy
  // ⚠️ EN ATTENTE DES CREDENTIALS — retourne un placeholder
  // -------------------------------------------------------------------------
  const LITELLM_BASE_URL = Deno.env.get('LITELLM_BASE_URL') ?? '';
  const LITELLM_API_KEY = Deno.env.get('LITELLM_API_KEY') ?? '';

  if (!LITELLM_BASE_URL || !LITELLM_API_KEY) {
    // Mode squelette : retourner une réponse stub
    const stubResponse: AiRouterResponse = {
      success: false,
      error: 'AI infrastructure not configured yet. LiteLLM credentials pending.',
      usage: {
        quota_remaining_usd: quotaRemaining,
        credits_balance_usd: creditsBalance,
      },
    };
    return jsonResponse(stubResponse, 503);
  }

  // --- Appel réel LiteLLM (activé après credentials) ---
  try {
    const messages = input.messages ?? [{ role: 'user', content: input.text ?? '' }];

    const llmResponse = await fetch(`${LITELLM_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LITELLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: model.api_identifier,
        messages,
        max_tokens: options?.max_tokens ?? 2048,
        temperature: options?.temperature ?? 0.3,
      }),
    });

    if (!llmResponse.ok) {
      const errBody = await llmResponse.text();
      return jsonResponse({ success: false, error: `LiteLLM error: ${llmResponse.status} - ${errBody}` }, 502);
    }

    const llmData = await llmResponse.json();
    const usage = llmData.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const content = llmData.choices?.[0]?.message?.content ?? '';

    // Calculer le coût réel
    const inputCost = (usage.prompt_tokens / 1000) * Number(model.input_cost_per_1k ?? 0);
    const outputCost = (usage.completion_tokens / 1000) * Number(model.output_cost_per_1k ?? 0);
    const totalCost = inputCost + outputCost;
    const platformCost = totalCost * 1.2; // marge 20%

    // -----------------------------------------------------------------------
    // ÉTAPE 4 : Déduction + logging
    // -----------------------------------------------------------------------
    if (fundingSource === 'quota') {
      await client.database
        .from('company_ai_quota_usage')
        .update({ used_usd: (quota?.used_usd ?? 0) + platformCost })
        .eq('company_id', companyId);
    } else if (fundingSource === 'credits') {
      await client.database
        .from('company_ai_credits')
        .update({ balance_usd: creditsBalance - platformCost })
        .eq('company_id', companyId);

      // Enregistrer la transaction de crédit
      await client.database.from('ai_credit_transactions').insert([{
        company_id: companyId,
        type: 'usage',
        amount_usd: -platformCost,
        description: `Task: ${task_code} | Model: ${model.api_identifier}`,
      }]);
    }

    // Log usage
    await client.database.from('ai_usage_logs').insert([{
      company_id: companyId,
      task_code,
      model_id: model.id,
      model_name: model.api_identifier,
      input_tokens: usage.prompt_tokens,
      output_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      cost_usd: platformCost,
      funding_source: fundingSource,
      status: 'success',
    }]);

    // Réponse
    const response: AiRouterResponse = {
      success: true,
      data: {
        content,
        tokens: { input: usage.prompt_tokens, output: usage.completion_tokens, total: usage.total_tokens },
        model_used: model.api_identifier,
        funding_source: fundingSource,
        cost_usd: platformCost,
      },
      usage: {
        quota_remaining_usd: fundingSource === 'quota' ? quotaRemaining - platformCost : quotaRemaining,
        credits_balance_usd: fundingSource === 'credits' ? creditsBalance - platformCost : creditsBalance,
      },
    };

    return jsonResponse(response, 200);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return jsonResponse({ success: false, error: `AI router error: ${msg}` }, 500);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
