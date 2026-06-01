import { createClient } from "npm:@insforge/sdk@latest";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IngestPaymentRequest {
  source_channel: "text" | "image" | "sms" | "file";
  wallet_id?: string;
  content?: string;        // texte collé / SMS
  image_url?: string;      // URL image déjà uploadée
  file_url?: string;       // URL fichier déjà uploadé
  file_mime?: string;
  options?: { language?: string; dry_run?: boolean };
}

interface ExtractedPayment {
  amount: number;
  direction: "credit" | "debit";
  operation_type: string;
  currency: string;
  transaction_date: string;
  value_date?: string | null;
  label: string;
  counterparty_name?: string | null;
  counterparty_identifier?: string | null;
  external_transaction_id?: string | null;
  external_reference?: string | null;
  fees?: number;
  confidence_score: number;
  needs_human_review: boolean;
}

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type":                 "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

// ─── Task code par channel ────────────────────────────────────────────────────

function taskForChannel(channel: string): string {
  switch (channel) {
    case "image":  return "ingest_image_payment";
    case "sms":    return "sms_parsing";
    default:       return "text_payment_extraction";
  }
}

// ─── Build ai-router input ────────────────────────────────────────────────────

function buildInput(req: IngestPaymentRequest): { messages?: unknown[]; text?: string; image_url?: string } {
  if (req.source_channel === "image" && req.image_url) {
    return { image_url: req.image_url, text: "Extrais les informations de ce paiement mobile money ou virement." };
  }
  const text = req.content ?? req.file_url ?? "";
  return { text };
}

// ─── Dedup hash ───────────────────────────────────────────────────────────────

async function dedupHash(walletId: string, ext: ExtractedPayment): Promise<string> {
  const raw = `${walletId}|${ext.transaction_date}|${ext.amount}|${ext.direction}|${ext.external_transaction_id ?? ext.counterparty_identifier ?? ext.label}`;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST")    return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const userToken  = authHeader.replace("Bearer ", "");
  if (!userToken) return json({ error: "Missing authorization token" }, 401);

  const INSFORGE_URL = Deno.env.get("INSFORGE_BASE_URL") ?? "";
  const client = createClient({ baseUrl: INSFORGE_URL, edgeFunctionToken: userToken });

  const { data: userData } = await client.auth.getCurrentUser();
  if (!userData?.user?.id) return json({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;

  const { data: profile } = await client.database
    .from("user_profiles")
    .select("company_id")
    .eq("user_id", userId)
    .single();
  if (!profile?.company_id) return json({ error: "Company not found" }, 403);
  const company_id: string = profile.company_id;

  let body: IngestPaymentRequest;
  try { body = await req.json() as IngestPaymentRequest; }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const { source_channel, wallet_id, options = {} } = body;
  if (!source_channel) return json({ error: "source_channel is required" }, 400);
  if (!wallet_id)       return json({ error: "wallet_id is required" }, 400);

  // Verify wallet belongs to company
  const { data: wallet } = await client.database
    .from("payment_wallets")
    .select("id, currency")
    .eq("id", wallet_id)
    .eq("company_id", company_id)
    .single();
  if (!wallet) return json({ error: "Wallet not found or access denied" }, 404);

  // ── Step 1 : Create evidence record ─────────────────────────────────────
  const evidencePayload = {
    company_id,
    wallet_id,
    evidence_type: source_channel,
    pasted_content: body.content ?? null,
    file_url:       body.file_url ?? body.image_url ?? null,
    file_mime_type: body.file_mime ?? null,
    processing_status: "processing",
    uploaded_by: userId,
  };

  const { data: evidence } = await client.database
    .from("payment_evidences")
    .insert([evidencePayload])
    .select("id")
    .single();

  const evidenceId: string | null = evidence?.id ?? null;

  // ── Step 2 : Call ai-router ──────────────────────────────────────────────
  const task_code = taskForChannel(source_channel);
  const input     = buildInput(body);
  const lang      = options.language ?? "fr";

  const { data: aiResult, error: aiError } = await client.functions.invoke("ai-router", {
    body: {
      task_code,
      input,
      options: { language: lang, bypass_pii: false },
    },
  });

  if (aiError || !aiResult?.success) {
    if (evidenceId) {
      await client.database.from("payment_evidences").update({
        processing_status: "error",
        processing_error: aiError?.message ?? aiResult?.message ?? "ai-router error",
      }).eq("id", evidenceId);
    }
    return json({ error: "AI extraction failed", detail: aiError?.message ?? aiResult?.message }, 502);
  }

  // ── Step 3 : Parse extracted data ────────────────────────────────────────
  let extracted: ExtractedPayment | null = null;
  try {
    const content: string = aiResult.data?.content ?? "";
    const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const start = cleaned.indexOf("{");
    const end   = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      extracted = JSON.parse(cleaned.slice(start, end + 1)) as ExtractedPayment;
    }
  } catch { /* handled below */ }

  if (!extracted || !extracted.amount) {
    if (evidenceId) {
      await client.database.from("payment_evidences").update({
        processing_status: "error",
        processing_error: "AI returned unparseable or empty extraction",
        ocr_text: aiResult.data?.content ?? null,
      }).eq("id", evidenceId);
    }
    return json({ error: "Could not extract payment data from content" }, 422);
  }

  // ── Step 4 : Update evidence with AI result ──────────────────────────────
  if (evidenceId) {
    await client.database.from("payment_evidences").update({
      processing_status: "done",
      ai_extracted_data: extracted,
      ai_model_used:     aiResult.data?.model_used ?? null,
      ocr_text:          body.content ?? null,
    }).eq("id", evidenceId);
  }

  // ── Step 5 : Insert wallet_transaction (unless dry_run) ──────────────────
  if (options.dry_run) {
    return json({ success: true, dry_run: true, extracted, evidence_id: evidenceId });
  }

  const hash = await dedupHash(wallet_id, extracted);

  // Calculate balance change
  const balanceDelta = extracted.direction === 'credit' ? Math.abs(extracted.amount) : -Math.abs(extracted.amount);
  const txPayload = {
    company_id,
    wallet_id,
    direction:              extracted.direction,
    operation_type:         extracted.operation_type || "payment",
    amount:                 Math.abs(extracted.amount),
    fees:                   extracted.fees ?? 0,
    currency:               extracted.currency || wallet.currency || "XOF",
    label:                  extracted.label || "Paiement importé",
    counterparty_name:      extracted.counterparty_name ?? null,
    counterparty_identifier: extracted.counterparty_identifier ?? null,
    transaction_date:       extracted.transaction_date || new Date().toISOString(),
    value_date:             extracted.value_date ?? null,
    external_transaction_id: extracted.external_transaction_id ?? null,
    external_reference:     extracted.external_reference ?? null,
    source_channel,
    source_evidence_id:     evidenceId,
    confidence_score:       extracted.confidence_score ?? aiResult.data?.tokens?.total ? 0.85 : 0.5,
    needs_human_review:     extracted.needs_human_review ?? (extracted.confidence_score ?? 1) < 0.7,
    reconciliation_status:  "unreconciled",
    dedup_hash:             hash,
    raw_payload:            { ai_extracted: extracted, source_channel },
  };

  const { data: tx, error: txErr } = await client.database
    .from("wallet_transactions")
    .insert([txPayload])
    .select("id")
    .single();

  if (txErr) {
    // Dedup conflict = already exists
    if (txErr.message?.includes("duplicate") || txErr.message?.includes("unique")) {
      return json({ success: false, error: "duplicate_transaction", detail: "Cette transaction existe déjà (doublon détecté)", evidence_id: evidenceId }, 409);
    }
    return json({ error: "DB insert failed", detail: txErr.message }, 500);
  }

  // ── Step 6 : Update wallet balance ─────────────────────────────────────────
  await client.database.rpc('increment_wallet_balance', {
    p_wallet_id: wallet_id,
    p_delta: balanceDelta,
  });

  return json({
    success:      true,
    transaction:  { id: tx?.id, ...txPayload },
    evidence_id:  evidenceId,
    ai_usage:     aiResult.usage,
    model_used:   aiResult.data?.model_used,
    is_fallback:  aiResult.data?.is_fallback,
  });
}
