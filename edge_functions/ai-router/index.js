const crypto = require("crypto");

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://appwrite.benga.live/v1";
const APPWRITE_PROJECT  = process.env.APPWRITE_PROJECT || "";
const APPWRITE_KEY      = process.env.APPWRITE_API_KEY || "";
const DATABASE_ID       = process.env.APPWRITE_DATABASE || "wimrux_finances";

const LITELLM_BASE_URL = process.env.LITELLM_BASE_URL || "";
const LITELLM_API_KEY  = process.env.LITELLM_API_KEY || "";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-company-id",
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonResponse(body, status) {
  return JSON.stringify(body);
}

async function appwriteFetch(path, opts = {}) {
  const url = APPWRITE_ENDPOINT + path;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-Project": APPWRITE_PROJECT,
      "X-Appwrite-Key": APPWRITE_KEY,
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  return { ok: res.ok, status: res.status, data };
}

async function listDocuments(collection, queries = []) {
  const qs = queries.map((q, i) => `queries[${i}]=${encodeURIComponent(q)}`).join("&");
  const res = await appwriteFetch(`/databases/${DATABASE_ID}/collections/${collection}/documents?${qs}`);
  if (!res.ok) return { data: null, error: res.data };
  return { data: res.data.documents || [], error: null };
}

async function getDocument(collection, docId) {
  const res = await appwriteFetch(`/databases/${DATABASE_ID}/collections/${collection}/documents/${docId}`);
  if (!res.ok) return { data: null, error: res.data };
  return { data: res.data, error: null };
}

async function updateDocument(collection, docId, data) {
  const res = await appwriteFetch(`/databases/${DATABASE_ID}/collections/${collection}/documents/${docId}`, {
    method: "PATCH",
    body: JSON.stringify({ data }),
  });
  if (!res.ok) return { data: null, error: res.data };
  return { data: res.data, error: null };
}

async function createDocument(collection, data) {
  const res = await appwriteFetch(`/databases/${DATABASE_ID}/collections/${collection}/documents`, {
    method: "POST",
    body: JSON.stringify({ documentId: "unique()", data }),
  });
  if (!res.ok) return { data: null, error: res.data };
  return { data: res.data, error: null };
}

// ─── Main handler ───────────────────────────────────────────────────────────

module.exports = async function (context) {
  const { req, res, log, error } = context;

  if (req.method === "OPTIONS") {
    return res.send("", 204, CORS_HEADERS);
  }
  if (req.method !== "POST") {
    return res.json({ success: false, error: "Method not allowed" }, 405);
  }

  let payload;
  try {
    payload = req.bodyJson || {};
  } catch {
    return res.json({ success: false, error: "Invalid JSON body" }, 400);
  }

  const { task_code, input, options = {} } = payload;
  if (!task_code || !input) {
    return res.json({ success: false, error: "Missing task_code or input" }, 400);
  }

  const companyId = req.headers["x-company-id"] || "";
  if (!companyId) {
    return res.json({ success: false, error: "Missing x-company-id header" }, 400);
  }

  // ── Load task ──────────────────────────────────────────────────────────
  const { data: tasks, error: taskErr } = await listDocuments("ai_tasks", [
    `Query.equal("code", ["${task_code}"])`,
    `Query.limit(1)`,
  ]);
  if (taskErr || !tasks || tasks.length === 0) {
    return res.json({ success: false, error: `Unknown task_code: ${task_code}` }, 400);
  }
  const task = tasks[0];

  // ── Resolve model routing ──────────────────────────────────────────────
  let modelId = task.default_model_id;
  const { data: routings } = await listDocuments("company_ai_task_routing", [
    `Query.equal("company_id", ["${companyId}"])`,
    `Query.equal("task_id", ["${task.$id}"])`,
    `Query.equal("is_active", [true])`,
    `Query.limit(1)`,
  ]);
  if (routings && routings.length > 0 && routings[0].model_id) {
    modelId = routings[0].model_id;
  }

  const { data: models } = await listDocuments("ai_models", [
    `Query.equal("$id", ["${modelId}"])`,
    `Query.limit(1)`,
  ]);
  if (!models || models.length === 0) {
    return res.json({ success: false, error: "Model not found for this task" }, 500);
  }
  const model = models[0];

  // ── Check quota / credits ──────────────────────────────────────────────
  const { data: quotaDocs } = await listDocuments("company_ai_quota_usage", [
    `Query.equal("company_id", ["${companyId}"])`,
    `Query.limit(1)`,
  ]);
  const { data: creditDocs } = await listDocuments("company_ai_credits", [
    `Query.equal("company_id", ["${companyId}"])`,
    `Query.limit(1)`,
  ]);

  const quota = quotaDocs && quotaDocs[0] ? quotaDocs[0] : null;
  const credits = creditDocs && creditDocs[0] ? creditDocs[0] : null;

  const quotaRemaining = (quota?.monthly_quota_usd ?? 0) - (quota?.used_usd ?? 0);
  const creditsBalance = credits?.balance_usd ?? 0;

  let fundingSource = options.funding_source || "quota";
  if (fundingSource === "quota" && quotaRemaining <= 0) {
    fundingSource = creditsBalance > 0 ? "credits" : "byok";
  }

  const estimatedCost = 0.01;
  if (fundingSource === "quota" && quotaRemaining < estimatedCost) {
    if (creditsBalance > estimatedCost) {
      fundingSource = "credits";
    } else {
      return res.json({
        success: false,
        error: "Insufficient quota and credits. Please purchase a credit pack.",
        usage: { quota_remaining_usd: quotaRemaining, credits_balance_usd: creditsBalance },
      }, 402);
    }
  }
  if (fundingSource === "credits" && creditsBalance < estimatedCost) {
    return res.json({
      success: false,
      error: "Insufficient credits balance.",
      usage: { quota_remaining_usd: quotaRemaining, credits_balance_usd: creditsBalance },
    }, 402);
  }

  // ── LiteLLM call ────────────────────────────────────────────────────────
  if (!LITELLM_BASE_URL || !LITELLM_API_KEY) {
    return res.json({
      success: false,
      error: "AI infrastructure not configured yet. LiteLLM credentials pending.",
      usage: { quota_remaining_usd: quotaRemaining, credits_balance_usd: creditsBalance },
    }, 503);
  }

  try {
    const messages = input.messages ?? [{ role: "user", content: input.text ?? "" }];

    const llmRes = await fetch(`${LITELLM_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LITELLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: model.api_identifier,
        messages,
        max_tokens: options.max_tokens ?? 2048,
        temperature: options.temperature ?? 0.3,
      }),
    });

    if (!llmRes.ok) {
      const errBody = await llmRes.text();
      return res.json({ success: false, error: `LiteLLM error: ${llmRes.status} - ${errBody}` }, 502);
    }

    const llmData = await llmRes.json();
    const usage = llmData.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    const content = llmData.choices?.[0]?.message?.content ?? "";

    const inputCost = (usage.prompt_tokens / 1000) * Number(model.input_cost_per_1k ?? 0);
    const outputCost = (usage.completion_tokens / 1000) * Number(model.output_cost_per_1k ?? 0);
    const totalCost = inputCost + outputCost;
    const platformCost = totalCost * 1.2;

    // ── Debit + log ──────────────────────────────────────────────────────
    if (fundingSource === "quota" && quota) {
      await updateDocument("company_ai_quota_usage", quota.$id, {
        used_usd: (quota.used_usd ?? 0) + platformCost,
      });
    } else if (fundingSource === "credits" && credits) {
      await updateDocument("company_ai_credits", credits.$id, {
        balance_usd: (credits.balance_usd ?? 0) - platformCost,
      });
      await createDocument("ai_credit_transactions", {
        company_id: companyId,
        type: "usage",
        amount_usd: -platformCost,
        description: `Task: ${task_code} | Model: ${model.api_identifier}`,
      });
    }

    await createDocument("ai_usage_logs", {
      company_id: companyId,
      task_code,
      model_id: model.$id,
      model_name: model.api_identifier,
      input_tokens: usage.prompt_tokens,
      output_tokens: usage.completion_tokens,
      total_tokens: usage.total_tokens,
      cost_usd: platformCost,
      funding_source: fundingSource,
      status: "success",
    });

    return res.json({
      success: true,
      data: {
        content,
        tokens: { input: usage.prompt_tokens, output: usage.completion_tokens, total: usage.total_tokens },
        model_used: model.api_identifier,
        funding_source: fundingSource,
        cost_usd: platformCost,
      },
      usage: {
        quota_remaining_usd: fundingSource === "quota" ? quotaRemaining - platformCost : quotaRemaining,
        credits_balance_usd: fundingSource === "credits" ? creditsBalance - platformCost : creditsBalance,
      },
    });

  } catch (e) {
    error("AI router error: " + String(e));
    return res.json({ success: false, error: "AI router error: " + String(e) }, 500);
  }
};
