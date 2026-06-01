import { createClient } from "npm:@insforge/sdk@latest";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IngestSmsRequest {
  wallet_id: string;
  sms_body: string;
  sender: string;
  received_at: string; // ISO 8601
  options?: { language?: string; dry_run?: boolean };
}

interface SmsPattern {
  id: string;
  provider_id: string;
  country_code: string;
  template_name: string;
  regex_pattern: string;
  field_mappings: Record<string, string>;
  operation_type: string | null;
  direction: "credit" | "debit" | null;
}

interface ExtractedPayment {
  amount: number;
  direction: "credit" | "debit";
  operation_type: string;
  currency: string;
  transaction_date: string;
  counterparty_name?: string | null;
  external_reference?: string | null;
  fees?: number;
  balance?: number;
  confidence_score: number;
  needs_human_review: boolean;
  matched_pattern_id?: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

// ─── Parse regex pattern with named groups ────────────────────────────────────

function createRegexFromPattern(pattern: string): RegExp | null {
  try {
    // Convert Python-style (?P<name>) to JavaScript-style (?<name>)
    const jsPattern = pattern.replace(/\(\?P<([^>]+)>/g, "(?<$1>");
    return new RegExp(jsPattern, "i");
  } catch {
    return null;
  }
}

function normalizeAmount(amountStr: string): number {
  // Remove spaces and convert comma to dot
  const cleaned = amountStr.replace(/\s/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

// ─── Try match against SMS patterns ───────────────────────────────────────────

async function tryMatchPattern(
  client: ReturnType<typeof createClient>,
  smsBody: string,
  sender: string
): Promise<{ match: ExtractedPayment | null; pattern: SmsPattern | null }> {
  // Fetch all active patterns
  const { data: patterns, error } = await client.database
    .from("sms_parsing_patterns")
    .select("*")
    .eq("is_active", true)
    .order("priority", { ascending: true });

  if (error || !patterns || patterns.length === 0) {
    return { match: null, pattern: null };
  }

  for (const p of patterns as SmsPattern[]) {
    const regex = createRegexFromPattern(p.regex_pattern);
    if (!regex) continue;

    const match = smsBody.match(regex);
    if (match && match.groups) {
      const groups = match.groups;
      const mappings = p.field_mappings;

      // Extract fields according to mappings
      const amount = normalizeAmount(groups[mappings.amount] || groups["amount"] || "0");
      const balance = groups[mappings.balance || "balance"]
        ? normalizeAmount(groups[mappings.balance || "balance"])
        : undefined;
      const reference = groups[mappings.reference || mappings.external_reference || "reference"] || null;
      const counterparty = groups[mappings.counterparty || mappings.counterparty_name || "counterparty"] || null;

      if (amount > 0) {
        const direction = p.direction || detectDirection(smsBody);
        const operationType = p.operation_type || detectOperationType(smsBody);

        return {
          match: {
            amount,
            direction,
            operation_type: operationType,
            currency: "XOF", // Default for CEDEAO/UEMOA
            transaction_date: new Date().toISOString(),
            counterparty_name: counterparty,
            external_reference: reference,
            balance,
            confidence_score: 0.9, // High confidence for pattern match
            needs_human_review: false,
            matched_pattern_id: p.id,
          },
          pattern: p,
        };
      }
    }
  }

  return { match: null, pattern: null };
}

function detectDirection(text: string): "credit" | "debit" {
  const lower = text.toLowerCase();
  const creditKeywords = ["recu", "reçu", "reception", "depose", "depot", "credit"];
  const debitKeywords = ["envoye", "envoyé", "envoi", "retrait", "paye", "debit"];

  for (const kw of creditKeywords) {
    if (lower.includes(kw)) return "credit";
  }
  for (const kw of debitKeywords) {
    if (lower.includes(kw)) return "debit";
  }
  return "debit"; // Default
}

function detectOperationType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("transfert") || lower.includes("envoi")) return "transfer_out";
  if (lower.includes("reçu") || lower.includes("recu")) return "payment_received";
  if (lower.includes("depot") || lower.includes("depose")) return "deposit";
  if (lower.includes("retrait")) return "withdrawal";
  return "payment_sent";
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const userToken = authHeader.replace("Bearer ", "");
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

  let body: IngestSmsRequest;
  try { body = await req.json() as IngestSmsRequest; }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const { wallet_id, sms_body, sender, received_at, options = {} } = body;
  if (!wallet_id || !sms_body || !sender) {
    return json({ error: "wallet_id, sms_body, and sender are required" }, 400);
  }

  // Verify wallet belongs to company
  const { data: wallet } = await client.database
    .from("payment_wallets")
    .select("id, currency")
    .eq("id", wallet_id)
    .eq("company_id", company_id)
    .single();
  if (!wallet) return json({ error: "Wallet not found or access denied" }, 404);

  // ── Step 1 : Try match against SMS patterns ──────────────────────────────
  const { match: patternMatch, pattern } = await tryMatchPattern(client, sms_body, sender);

  if (patternMatch) {
    // Direct pattern match - call ingest-payment with high confidence
    const { data: result, error } = await client.functions.invoke("ingest-payment", {
      body: {
        source_channel: "sms",
        wallet_id,
        content: JSON.stringify({
          amount: patternMatch.amount,
          direction: patternMatch.direction,
          operation_type: patternMatch.operation_type,
          currency: patternMatch.currency,
          transaction_date: received_at || new Date().toISOString(),
          counterparty_name: patternMatch.counterparty_name,
          external_reference: patternMatch.external_reference,
          fees: patternMatch.fees || 0,
          confidence_score: patternMatch.confidence_score,
          needs_human_review: false,
          matched_pattern_id: patternMatch.matched_pattern_id,
        }),
        options,
      },
    });

    if (error) {
      return json({ error: "Ingest payment failed", detail: error.message }, 502);
    }

    return json({
      success: true,
      extracted: patternMatch,
      matched_pattern: pattern?.template_name,
      method: "regex",
      result,
    });
  }

  // ── Step 2 : No pattern match - fallback to AI via ingest-payment ────────
  const { data: aiResult, error: aiError } = await client.functions.invoke("ingest-payment", {
    body: {
      source_channel: "sms",
      wallet_id,
      content: sms_body,
      options: { ...options, language: options.language ?? "fr" },
    },
  });

  if (aiError) {
    return json({ error: "AI extraction failed", detail: aiError.message }, 502);
  }

  return json({
    success: true,
    extracted: aiResult?.extracted,
    method: "ai",
    result: aiResult,
  });
}
