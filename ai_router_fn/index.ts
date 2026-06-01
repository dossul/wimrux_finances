import { createClient } from "npm:@insforge/sdk@latest";

// ─── Types ───────────────────────────────────────────────────────────────────

interface AiRouterRequest {
  task_code: string;
  input: {
    messages?: Array<{ role: string; content: string }>;
    text?: string;
    image_url?: string;
    file_url?: string;
    metadata?: Record<string, unknown>;
  };
  options?: {
    language?: string;
    stream?: boolean;
    bypass_pii?: boolean;
    max_tokens?: number;
    temperature?: number;
    model_override?: string;
    session_id?: string;
  };
}

interface RoutingConfig {
  primary_model_name: string;
  fallback_model_name: string | null;
  requires_pii_redaction: boolean;
  temperature: number;
  max_tokens_output: number;
}

interface QuotaState {
  funding_source: "platform_quota" | "platform_credits" | "byok";
  quota_remaining_usd: number;
  credits_balance_usd: number;
  allowed: boolean;
  byok_api_key?: string;
  byok_base_url?: string;
}

interface WorkflowRouting {
  provider_code: string | null;
  workflow_id: string | null;
  workflow_api_endpoint: string | null;
  workflow_credential_api_key: string | null;
}

interface LlmResult {
  content: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  litellm_request_id: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const LITELLM_BASE_URL = Deno.env.get("LITELLM_BASE_URL") ?? "https://litellm.ulia.site/v1";
const LITELLM_API_KEY  = Deno.env.get("LITELLM_API_KEY")  ?? Deno.env.get("LITELLM_MASTER_KEY") ?? "";
const PRESIDIO_URL     = Deno.env.get("PRESIDIO_URL")     ?? "https://presidio.ulia.site";
const PRESIDIO_AUTH    = Deno.env.get("PRESIDIO_AUTH")    ?? "";
const LANGFUSE_PK      = Deno.env.get("LANGFUSE_PUBLIC_KEY") ?? "";
const LANGFUSE_SK      = Deno.env.get("LANGFUSE_SECRET_KEY") ?? "";
const LANGFUSE_URL     = Deno.env.get("LANGFUSE_BASE_URL") ?? "https://langfuse.ulia.site";
const DIFY_BASE_URL    = Deno.env.get("DIFY_BASE_URL")    ?? "https://dify.ulia.site";
const STIRLING_BASE_URL = Deno.env.get("STIRLING_BASE_URL") ?? "https://pdf.ulia.site";
const INSFORGE_URL     = Deno.env.get("INSFORGE_BASE_URL") ?? "";
const PLATFORM_MARGIN  = Number(Deno.env.get("PLATFORM_MARGIN_PERCENT") ?? "20") / 100;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type":                 "application/json",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

// ─── Presidio PII redaction ───────────────────────────────────────────────────

async function redactPii(text: string, language = "fr"): Promise<{ redacted: string; count: number }> {
  if (!PRESIDIO_AUTH || !text?.trim()) return { redacted: text, count: 0 };

  const authHeader = "Basic " + btoa(PRESIDIO_AUTH);
  try {
    const analyzeRes = await fetch(`${PRESIDIO_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ text, language }),
    });
    if (!analyzeRes.ok) return { redacted: text, count: 0 };
    const entities = await analyzeRes.json() as Array<{ entity_type: string; start: number; end: number }>;
    if (!entities.length) return { redacted: text, count: 0 };

    const anonymizeRes = await fetch(`${PRESIDIO_URL}/anonymize`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ text, analyzer_results: entities }),
    });
    if (!anonymizeRes.ok) return { redacted: text, count: 0 };
    const result = await anonymizeRes.json() as { text: string };
    return { redacted: result.text, count: entities.length };
  } catch {
    return { redacted: text, count: 0 };
  }
}

// ─── Langfuse trace (fire-and-forget) ────────────────────────────────────────

async function sendLangfuseTrace(payload: {
  traceId: string;
  name: string;
  company_id: string;
  task_code: string;
  model: string;
  input: unknown;
  output: string;
  tokens_input: number;
  tokens_output: number;
  latency_ms: number;
  cost_usd: number;
  pii_redacted: boolean;
  status: string;
  session_id?: string;
}): Promise<void> {
  if (!LANGFUSE_PK || !LANGFUSE_SK) return;
  const auth = "Basic " + btoa(`${LANGFUSE_PK}:${LANGFUSE_SK}`);
  try {
    await fetch(`${LANGFUSE_URL}/api/public/ingestion`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({
        batch: [{
          id: crypto.randomUUID(),
          type: "trace-create",
          timestamp: new Date().toISOString(),
          body: {
            id: payload.traceId,
            name: payload.name,
            sessionId: payload.session_id,
            metadata: {
              company_id: payload.company_id,
              task_code: payload.task_code,
              model: payload.model,
              cost_usd: payload.cost_usd,
              pii_redacted: payload.pii_redacted,
            },
            input: payload.input,
            output: payload.output,
            tags: [payload.task_code, payload.model, payload.status],
          },
        }, {
          id: crypto.randomUUID(),
          type: "generation-create",
          timestamp: new Date().toISOString(),
          body: {
            traceId: payload.traceId,
            name: `${payload.task_code}-generation`,
            model: payload.model,
            promptTokens: payload.tokens_input,
            completionTokens: payload.tokens_output,
            totalTokens: payload.tokens_input + payload.tokens_output,
            latency: payload.latency_ms / 1000,
            statusMessage: payload.status,
            input: payload.input,
            output: payload.output,
          },
        }],
      }),
    });
  } catch { /* non-blocking */ }
}

// ─── Plan allowance check ─────────────────────────────────────────────────────

async function checkPlanAllowance(
  adminClient: ReturnType<typeof createClient>,
  company_id: string,
  task_quality_tier: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const { data: sub } = await adminClient.database
    .from("company_subscriptions")
    .select("plan_id, status, subscription_plans(ai_allowed_quality_tiers, ai_monthly_cost_usd_cap)")
    .eq("company_id", company_id)
    .eq("status", "active")
    .single();

  if (!sub) {
    // No subscription = treat as free plan — allow low/medium quality only
    if (task_quality_tier === "high" || task_quality_tier === "premium") {
      return { allowed: false, reason: "task_not_allowed_for_plan" };
    }
    return { allowed: true };
  }

  const plan = Array.isArray(sub.subscription_plans)
    ? sub.subscription_plans[0]
    : sub.subscription_plans;

  if (!plan) return { allowed: true };

  const allowedTiers: string[] = plan.ai_allowed_quality_tiers ?? ["low", "medium"];
  if (!allowedTiers.includes(task_quality_tier)) {
    return { allowed: false, reason: "task_not_allowed_for_plan" };
  }

  return { allowed: true };
}

// ─── Resolve quota + BYOK routing ────────────────────────────────────────────

async function resolveQuota(
  adminClient: ReturnType<typeof createClient>,
  company_id: string,
  task_id: string,
): Promise<QuotaState> {
  const period = currentPeriod();

  // 1. Check BYOK override for this task
  const { data: taskRouting } = await adminClient.database
    .from("company_ai_task_routing")
    .select("mode, primary_credential_id")
    .eq("company_id", company_id)
    .eq("task_id", task_id)
    .eq("is_active", true)
    .single();

  if (taskRouting?.mode === "byok" && taskRouting?.primary_credential_id) {
    const { data: cred } = await adminClient.database
      .from("company_ai_credentials")
      .select("api_key_encrypted, base_url_override")
      .eq("id", taskRouting.primary_credential_id)
      .eq("is_active", true)
      .single();

    if (cred?.api_key_encrypted) {
      return {
        funding_source: "byok",
        quota_remaining_usd: 999,
        credits_balance_usd: 0,
        allowed: true,
        byok_api_key: cred.api_key_encrypted,
        byok_base_url: cred.base_url_override ?? undefined,
      };
    }
  }

  // 2. Check platform quota
  const { data: quota } = await adminClient.database
    .from("company_ai_quota_usage")
    .select("quota_cap_usd, consumed_usd")
    .eq("company_id", company_id)
    .eq("period_month", period)
    .single();

  const quotaRemaining = quota ? Math.max(0, Number(quota.quota_cap_usd) - Number(quota.consumed_usd)) : 0;
  const { data: credits } = await adminClient.database
    .from("company_ai_credits")
    .select("balance_usd")
    .eq("company_id", company_id)
    .single();
  const creditsBalance = Number(credits?.balance_usd ?? 0);

  if (quotaRemaining > 0.0001) {
    return {
      funding_source: "platform_quota",
      quota_remaining_usd: quotaRemaining,
      credits_balance_usd: creditsBalance,
      allowed: true,
    };
  }

  // 3. Check purchased credits
  if (creditsBalance > 0.0001) {
    return {
      funding_source: "platform_credits",
      quota_remaining_usd: 0,
      credits_balance_usd: creditsBalance,
      allowed: true,
    };
  }

  return {
    funding_source: "platform_quota",
    quota_remaining_usd: 0,
    credits_balance_usd: 0,
    allowed: false,
  };
}

// ─── Workflow routing resolution ──────────────────────────────────────────────

async function resolveWorkflowRouting(
  adminClient: ReturnType<typeof createClient>,
  company_id: string,
  task_id: string,
): Promise<WorkflowRouting> {
  const { data: taskRouting } = await adminClient.database
    .from("company_ai_task_routing")
    .select("mode, workflow_provider_id, workflow_id, workflow_api_endpoint, workflow_credential_id")
    .eq("company_id", company_id)
    .eq("task_id", task_id)
    .eq("is_active", true)
    .single();

  if (!taskRouting || taskRouting.mode !== "workflow" || !taskRouting.workflow_provider_id) {
    return { provider_code: null, workflow_id: null, workflow_api_endpoint: null, workflow_credential_api_key: null };
  }

  // Resolve provider code
  const { data: provider } = await adminClient.database
    .from("ai_providers")
    .select("code")
    .eq("id", taskRouting.workflow_provider_id)
    .single();

  let workflowCredKey: string | null = null;
  if (taskRouting.workflow_credential_id) {
    const { data: cred } = await adminClient.database
      .from("company_ai_credentials")
      .select("api_key_encrypted")
      .eq("id", taskRouting.workflow_credential_id)
      .eq("is_active", true)
      .single();
    workflowCredKey = cred?.api_key_encrypted ?? null;
  }

  return {
    provider_code: (provider as { code?: string })?.code ?? null,
    workflow_id: taskRouting.workflow_id ?? null,
    workflow_api_endpoint: taskRouting.workflow_api_endpoint ?? null,
    workflow_credential_api_key: workflowCredKey,
  };
}

// ─── Debit usage ──────────────────────────────────────────────────────────────

async function debitUsage(
  adminClient: ReturnType<typeof createClient>,
  company_id: string,
  user_id: string,
  funding_source: string,
  cost_usd_raw: number,
): Promise<void> {
  const billed = cost_usd_raw * (1 + PLATFORM_MARGIN);
  const period = currentPeriod();

  if (funding_source === "platform_quota") {
    // Read current consumed, then write new value
    const { data: current } = await adminClient.database
      .from("company_ai_quota_usage")
      .select("consumed_usd, quota_cap_usd")
      .eq("company_id", company_id)
      .eq("period_month", period)
      .single();

    if (current) {
      await adminClient.database
        .from("company_ai_quota_usage")
        .update({ consumed_usd: Number(current.consumed_usd) + billed })
        .eq("company_id", company_id)
        .eq("period_month", period);
    } else {
      await adminClient.database
        .from("company_ai_quota_usage")
        .insert([{
          company_id,
          period_month: period,
          quota_cap_usd: 1,
          consumed_usd: billed,
        }]);
    }
  } else if (funding_source === "platform_credits") {
    // Read current balance, then write new value + record transaction
    const { data: current } = await adminClient.database
      .from("company_ai_credits")
      .select("balance_usd, total_consumed_usd")
      .eq("company_id", company_id)
      .single();

    if (current) {
      const newBalance = Math.max(0, Number(current.balance_usd) - billed);
      const newConsumed = Number(current.total_consumed_usd ?? 0) + billed;

      await adminClient.database
        .from("company_ai_credits")
        .update({ balance_usd: newBalance, total_consumed_usd: newConsumed })
        .eq("company_id", company_id);

      // Record credit transaction
      await adminClient.database
        .from("ai_credit_transactions")
        .insert([{
          company_id,
          user_id,
          type: "consumption",
          amount_usd: -billed,
          balance_before: Number(current.balance_usd),
          balance_after: newBalance,
        }]);
    }
  }
}

// ─── LiteLLM call ─────────────────────────────────────────────────────────────

async function callLiteLLM(params: {
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens: number;
  temperature: number;
  api_key?: string;
  base_url?: string;
  trace_id?: string;
  task_code?: string;
  company_id?: string;
  session_id?: string;
}): Promise<LlmResult> {
  const baseUrl = params.base_url ?? LITELLM_BASE_URL;
  const apiKey  = params.api_key  ?? LITELLM_API_KEY;

  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    max_tokens: params.max_tokens,
    temperature: params.temperature,
  };

  const extraHeaders: Record<string, string> = {
    "Authorization":  `Bearer ${apiKey}`,
    "Content-Type":   "application/json",
  };
  if (params.trace_id) {
    extraHeaders["X-Langfuse-Trace-Id"] = params.trace_id;
    extraHeaders["X-Langfuse-Session-Id"] = params.session_id ?? params.company_id ?? "";
    extraHeaders["X-Langfuse-Tags"] = params.task_code ?? "";
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: extraHeaders,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LiteLLM error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json() as {
    choices: Array<{ message: { content: string } }>;
    usage: { prompt_tokens: number; completion_tokens: number };
    id: string;
    _hidden_params?: { response_cost?: number };
  };

  return {
    content: data.choices?.[0]?.message?.content ?? "",
    tokens_input: data.usage?.prompt_tokens ?? 0,
    tokens_output: data.usage?.completion_tokens ?? 0,
    cost_usd: data._hidden_params?.response_cost ?? 0,
    litellm_request_id: data.id ?? "",
  };
}

// ─── Dify workflow call ───────────────────────────────────────────────────────

async function callDify(params: {
  workflow_id: string;
  endpoint?: string | null;
  api_key?: string | null;
  input: AiRouterRequest["input"];
  task_code: string;
}): Promise<LlmResult> {
  const base   = params.endpoint ?? DIFY_BASE_URL;
  const apiKey = params.api_key ?? Deno.env.get("DIFY_API_KEY") ?? "";
  const t0 = Date.now();

  const payload: Record<string, unknown> = {
    workflow_id: params.workflow_id,
    inputs: {
      text: params.input.text ?? "",
      messages: params.input.messages ?? [],
      task_code: params.task_code,
      ...((params.input.metadata as Record<string, unknown>) ?? {}),
    },
    response_mode: "blocking",
    user: "wimrux-ai-router",
  };

  const res = await fetch(`${base}/v1/workflows/run`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Dify error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json() as {
    data?: { outputs?: { text?: string }; usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number } };
  };

  const content     = data?.data?.outputs?.text ?? "";
  const tokIn       = data?.data?.usage?.prompt_tokens ?? 0;
  const tokOut      = data?.data?.usage?.completion_tokens ?? 0;

  return { content, tokens_input: tokIn, tokens_output: tokOut, cost_usd: 0, litellm_request_id: "" };
}

// ─── Stirling / Generic workflow call ────────────────────────────────────────

async function callWorkflow(params: {
  provider_code: string;
  workflow_id: string;
  endpoint?: string | null;
  api_key?: string | null;
  input: AiRouterRequest["input"];
}): Promise<LlmResult> {
  const base   = params.endpoint ?? STIRLING_BASE_URL;
  const apiKey = params.api_key ?? Deno.env.get("STIRLING_API_KEY") ?? "";

  const payload = {
    workflow: params.workflow_id,
    input: {
      text: params.input.text ?? "",
      messages: params.input.messages ?? [],
    },
  };

  const res = await fetch(`${base}/api/run`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Workflow (${params.provider_code}) error ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json() as { output?: string; content?: string };
  const content = data?.output ?? data?.content ?? "";
  return { content, tokens_input: 0, tokens_output: 0, cost_usd: 0, litellm_request_id: "" };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST")    return jsonResponse({ error: "Method not allowed" }, 405);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization") ?? "";
  const userToken  = authHeader.replace("Bearer ", "");
  if (!userToken) return jsonResponse({ error: "Missing authorization token" }, 401);

  const client = createClient({ baseUrl: INSFORGE_URL, edgeFunctionToken: userToken });
  const { data: userData } = await client.auth.getCurrentUser();
  if (!userData?.user?.id) return jsonResponse({ error: "Unauthorized" }, 401);

  const userId = userData.user.id;

  const adminClient = createClient({
    baseUrl: INSFORGE_URL,
    edgeFunctionToken: userToken,
  });

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: AiRouterRequest;
  try {
    body = await req.json() as AiRouterRequest;
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { task_code, input, options = {} } = body;
  if (!task_code) return jsonResponse({ error: "task_code is required" }, 400);

  // ── Get company_id ────────────────────────────────────────────────────────
  const { data: profile } = await client.database
    .from("user_profiles")
    .select("company_id")
    .eq("user_id", userId)
    .single();

  if (!profile?.company_id) return jsonResponse({ error: "Company not found for user" }, 403);
  const company_id: string = profile.company_id;

  // ── Load task info ────────────────────────────────────────────────────────
  const { data: taskInfo } = await adminClient.database
    .from("ai_tasks")
    .select("id, default_system_prompt, default_quality_tier, is_active")
    .eq("code", task_code)
    .single();

  if (!taskInfo || !taskInfo.is_active) {
    return jsonResponse({ error: `Unknown or inactive task_code: ${task_code}` }, 400);
  }

  const task_id: string = taskInfo.id;

  // ── Plan allowance check ──────────────────────────────────────────────────
  const allowance = await checkPlanAllowance(adminClient, company_id, taskInfo.default_quality_tier ?? "medium");
  if (!allowance.allowed) {
    return jsonResponse({
      success: false,
      error: { code: "task_not_allowed", message: "Cette tâche IA n'est pas disponible pour votre plan. Passez à un plan supérieur.", suggested_action: "upgrade_plan" },
    }, 403);
  }

  // ── Load default routing config ───────────────────────────────────────────
  const { data: routingData } = await adminClient.database
    .from("ai_models_default_routing")
    .select("primary_model_name, fallback_model_name, requires_pii_redaction, temperature, max_tokens_output")
    .eq("task_code", task_code)
    .eq("is_active", true)
    .single();

  if (!routingData) {
    return jsonResponse({ error: `No routing config found for task_code: ${task_code}` }, 400);
  }

  const routing = routingData as RoutingConfig;

  // ── Check quota / funding source ──────────────────────────────────────────
  const quota = await resolveQuota(adminClient, company_id, task_id);
  if (!quota.allowed) {
    return jsonResponse({
      success: false,
      error: { code: "quota_exhausted", message: "Quota mensuel épuisé. Achetez des crédits IA pour continuer.", suggested_action: "buy_credits" },
      usage: { quota_remaining_usd: 0, credits_balance_usd: quota.credits_balance_usd },
    }, 402);
  }

  // ── Check workflow routing override ──────────────────────────────────────
  const workflowRouting = await resolveWorkflowRouting(adminClient, company_id, task_id);

  // ── Build messages ────────────────────────────────────────────────────────
  const lang    = options.language ?? "fr";
  const traceId = crypto.randomUUID();
  let messages  = input.messages ?? [];

  if (!messages.length) {
    if (input.text) {
      messages = [{ role: "user", content: input.text }];
    } else if (input.image_url) {
      messages = [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: input.image_url } },
          { type: "text",      text: input.text ?? "Analyse cette image et extrais les informations structurées." },
        ] as unknown as string,
      }];
    }
  }

  // Prepend system prompt from ai_tasks if none provided
  if (!messages.find(m => m.role === "system") && taskInfo.default_system_prompt) {
    messages = [{ role: "system", content: taskInfo.default_system_prompt }, ...messages];
  }

  // ── PII redaction (Presidio) ──────────────────────────────────────────────
  let pii_redacted      = false;
  let pii_entities_count = 0;

  if (routing.requires_pii_redaction && !options.bypass_pii && quota.funding_source !== "byok") {
    const newMessages = [];
    for (const msg of messages) {
      if (msg.role !== "system" && typeof msg.content === "string" && msg.content.length > 0) {
        const { redacted, count } = await redactPii(msg.content, lang);
        newMessages.push({ ...msg, content: redacted });
        pii_entities_count += count;
        if (count > 0) pii_redacted = true;
      } else {
        newMessages.push(msg);
      }
    }
    messages = newMessages;
  }

  // ── Dispatch: workflow (Dify/Stirling) or LiteLLM ────────────────────────
  const t0 = Date.now();
  let content            = "";
  let tokens_input       = 0;
  let tokens_output      = 0;
  let cost_usd           = 0;
  let litellm_request_id = "";
  let model_used         = options.model_override ?? routing.primary_model_name;
  let is_fallback        = false;
  let call_status        = "success";
  let error_message: string | null = null;

  try {
    if (workflowRouting.provider_code && workflowRouting.workflow_id) {
      // ── Workflow call (Dify or Stirling) ────────────────────────────────
      if (workflowRouting.provider_code === "dify") {
        const res = await callDify({
          workflow_id: workflowRouting.workflow_id,
          endpoint: workflowRouting.workflow_api_endpoint,
          api_key: workflowRouting.workflow_credential_api_key,
          input,
          task_code,
        });
        ({ content, tokens_input, tokens_output, cost_usd, litellm_request_id } = res);
        model_used = `dify:${workflowRouting.workflow_id}`;
      } else {
        const res = await callWorkflow({
          provider_code: workflowRouting.provider_code,
          workflow_id: workflowRouting.workflow_id,
          endpoint: workflowRouting.workflow_api_endpoint,
          api_key: workflowRouting.workflow_credential_api_key,
          input,
        });
        ({ content, tokens_input, tokens_output, cost_usd, litellm_request_id } = res);
        model_used = `${workflowRouting.provider_code}:${workflowRouting.workflow_id}`;
      }
    } else {
      // ── LiteLLM call with fallback ──────────────────────────────────────
      const callParams = {
        messages,
        max_tokens:  options.max_tokens  ?? routing.max_tokens_output,
        temperature: options.temperature ?? routing.temperature,
        trace_id:    traceId,
        task_code,
        company_id,
        session_id:  options.session_id,
        api_key:     quota.byok_api_key,
        base_url:    quota.byok_base_url,
      };

      try {
        const res = await callLiteLLM({ model: model_used, ...callParams });
        ({ content, tokens_input, tokens_output, cost_usd, litellm_request_id } = res);
      } catch (primaryErr) {
        if (routing.fallback_model_name) {
          model_used  = routing.fallback_model_name;
          is_fallback = true;
          const res = await callLiteLLM({ model: routing.fallback_model_name, ...callParams });
          ({ content, tokens_input, tokens_output, cost_usd, litellm_request_id } = res);
        } else {
          throw primaryErr;
        }
      }
    }
  } catch (err) {
    call_status   = "error";
    error_message = String(err).slice(0, 500);

    // Log error call
    await adminClient.database.from("ai_usage_logs").insert([{
      company_id, user_id: userId,
      model: model_used, model_name: model_used,
      task: task_code, task_code, task_id,
      tokens_input: 0, tokens_output: 0, tokens_total: 0,
      latency_ms: Date.now() - t0,
      status: "error", error_message,
      cost_usd: 0, cost_billed_usd: 0,
      funding_source: quota.funding_source,
      pii_redacted, pii_entities_count,
    }]);

    return jsonResponse({
      success: false,
      error: { code: "llm_error", message: "Appel LLM/workflow échoué.", detail: error_message },
    }, 502);
  }

  const latency_ms = Date.now() - t0;

  // ── Debit cost ────────────────────────────────────────────────────────────
  if (cost_usd > 0 && quota.funding_source !== "byok") {
    await debitUsage(adminClient, company_id, userId, quota.funding_source, cost_usd);
  }

  const cost_billed_usd = quota.funding_source === "byok" ? 0 : cost_usd * (1 + PLATFORM_MARGIN);

  // ── Log to ai_usage_logs ──────────────────────────────────────────────────
  await adminClient.database.from("ai_usage_logs").insert([{
    company_id,
    user_id:      userId,
    model:        model_used,
    model_name:   model_used,
    task:         task_code,
    task_code,
    task_id,
    tokens_input,
    tokens_output,
    tokens_total:     tokens_input + tokens_output,
    latency_ms,
    status:           call_status,
    is_fallback,
    error_message,
    cost_usd,
    cost_billed_usd,
    funding_source:   quota.funding_source,
    langfuse_trace_id: traceId,
    litellm_request_id,
    pii_redacted,
    pii_entities_count,
    request_metadata:  { task_code, lang, bypass_pii: options.bypass_pii ?? false, session_id: options.session_id },
    response_metadata: { model_used, is_fallback, workflow: workflowRouting.provider_code },
  }]);

  // ── Langfuse trace (async, non-blocking) ──────────────────────────────────
  sendLangfuseTrace({
    traceId,
    name:       `wimrux-${task_code}`,
    company_id,
    task_code,
    model:      model_used,
    input:      messages,
    output:     content,
    tokens_input,
    tokens_output,
    latency_ms,
    cost_usd:   cost_billed_usd,
    pii_redacted,
    status:     call_status,
    session_id: options.session_id,
  });

  // ── Return ────────────────────────────────────────────────────────────────
  const quotaUsed = quota.funding_source === "platform_quota"   ? cost_billed_usd : 0;
  const credUsed  = quota.funding_source === "platform_credits" ? cost_billed_usd : 0;

  return jsonResponse({
    success: true,
    data: {
      content,
      tokens:    { input: tokens_input, output: tokens_output, total: tokens_input + tokens_output },
      model_used,
      funding_source: quota.funding_source,
      cost_usd:       cost_billed_usd,
      is_fallback,
      pii_redacted,
      pii_entities_count,
      langfuse_trace_id: traceId,
      langfuse_trace_url: LANGFUSE_PK ? `${LANGFUSE_URL}/trace/${traceId}` : undefined,
    },
    usage: {
      quota_remaining_usd:  Math.max(0, quota.quota_remaining_usd - quotaUsed),
      credits_balance_usd:  Math.max(0, quota.credits_balance_usd - credUsed),
      period_end: (() => { const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(1); return d.toISOString().slice(0, 10); })(),
    },
  });
}
