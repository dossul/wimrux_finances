import { createClient } from "npm:@insforge/sdk@latest";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IngestTextRequest {
  wallet_id: string;
  pasted_text: string;
  options?: { language?: string; dry_run?: boolean };
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
  confidence_score: number;
  needs_human_review: boolean;
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

// ─── Normalize amount from text ─────────────────────────────────────────────

function normalizeAmount(amountStr: string): number {
  const cleaned = amountStr.replace(/\s/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

// ─── Try simple heuristic extraction first ───────────────────────────────────

function tryHeuristicExtraction(text: string): ExtractedPayment | null {
  const lower = text.toLowerCase();
  
  const amountPatterns = [
    /([\d\s]+(?:[.,]\d+)?)\s*(?:FCFA|XOF|F\.?C\.?F\.?A?|francs?|EUR|USD)/i,
    /montant[\s:]+([\d\s]+(?:[.,]\d+)?)/i,
    /amount[\s:]+([\d\s]+(?:[.,]\d+)?)/i,
    /total[\s:]+([\d\s]+(?:[.,]\d+)?)/i,
    /pay[éeé]\s*:\s*([\d\s]+(?:[.,]\d+)?)/i,
    /transfert\s+(?:de|d')?\s*([\d\s]+(?:[.,]\d+)?)/i,
    /([\d\s]+(?:[.,]\d+)?)\s*F$/im,
  ];

  let amount = 0;
  for (const pattern of amountPatterns) {
    const match = text.match(pattern);
    if (match) {
      amount = normalizeAmount(match[1] || match[0].replace(/[^\d.,\s]/g, ""));
      if (amount > 0) break;
    }
  }

  if (amount === 0) return null;

  const creditKeywords = ["recu", "reçu", "reception", "depose", "depot", "credit", "received", "credit"];
  const debitKeywords = ["envoye", "envoyé", "envoi", "retrait", "paye", "debit", "sent", "paid", "withdrawal"];
  
  let direction: "credit" | "debit" = "debit";
  for (const kw of creditKeywords) {
    if (lower.includes(kw)) { direction = "credit"; break; }
  }

  let operation_type = "payment_sent";
  if (lower.includes("transfert") || lower.includes("transfer")) operation_type = direction === "credit" ? "transfer_in" : "transfer_out";
  else if (lower.includes("depos") || lower.includes("versement")) operation_type = "deposit";
  else if (lower.includes("retrait") || lower.includes("withdrawal")) operation_type = "withdrawal";
  else if (direction === "credit") operation_type = "payment_received";

  const counterpartyPatterns = [
    /(?:de|from|par)\s*[:\s]*(.+?)(?:\.|$|montant|amount)/i,
    /(?:vers|to|a|à)\s*[:\s]*(.+?)(?:\.|$|montant|amount)/i,
    /(?:destinataire|beneficiaire|recipient)[:\s]*(.+?)(?:\.|$|\n)/i,
    /(?:expediteur|emetteur|sender)[:\s]*(.+?)(?:\.|$|\n)/i,
  ];

  let counterparty_name: string | null = null;
  for (const pattern of counterpartyPatterns) {
    const match = text.match(pattern);
    if (match) {
      counterparty_name = match[1]?.trim()?.substring(0, 100) || null;
      if (counterparty_name) break;
    }
  }

  const refPatterns = [
    /(?:ref|reference|reférence|id|code)[:\s]*([A-Z0-9]{4,})/i,
    /(?:transaction|transfert|operation)\s*(?:id|n[°o])?[:\s]*([A-Z0-9]{4,})/i,
  ];
  
  let external_reference: string | null = null;
  for (const pattern of refPatterns) {
    const match = text.match(pattern);
    if (match) {
      external_reference = match[1];
      break;
    }
  }

  let transaction_date = new Date().toISOString();
  const datePatterns = [
    /(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/,
    /(\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})/,
    /(\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|jan|fev|mar|avr|mai|jun|jul|aou|sep|oct|nov|dec)\s+\d{4})/i,
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const parsed = new Date(match[1].replace(/\//g, "-"));
      if (!isNaN(parsed.getTime())) {
        transaction_date = parsed.toISOString();
        break;
      }
    }
  }

  let confidence_score = 0.5;
  if (amount > 0) confidence_score += 0.2;
  if (counterparty_name) confidence_score += 0.15;
  if (external_reference) confidence_score += 0.15;
  if (direction !== "debit" || text.length > 50) confidence_score += 0.1;

  return {
    amount,
    direction,
    operation_type,
    currency: "XOF",
    transaction_date,
    counterparty_name,
    external_reference,
    confidence_score: Math.min(confidence_score, 0.85),
    needs_human_review: confidence_score < 0.7,
  };
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

  let body: IngestTextRequest;
  try { body = await req.json() as IngestTextRequest; }
  catch { return json({ error: "Invalid JSON" }, 400); }

  const { wallet_id, pasted_text, options = {} } = body;
  if (!wallet_id || !pasted_text) {
    return json({ error: "wallet_id and pasted_text are required" }, 400);
  }

  // Verify wallet belongs to company
  const { data: wallet } = await client.database
    .from("payment_wallets")
    .select("id, currency")
    .eq("id", wallet_id)
    .eq("company_id", company_id)
    .single();
  if (!wallet) return json({ error: "Wallet not found or access denied" }, 404);

  // ── Step 1 : Try heuristic extraction ────────────────────────────────────
  const heuristic = tryHeuristicExtraction(pasted_text);

  // ── Step 2 : Create evidence record ─────────────────────────────────────
  const { data: evidence } = await client.database
    .from("payment_evidences")
    .insert([{
      company_id,
      wallet_id,
      evidence_type: "pasted_text",
      pasted_content: pasted_text.substring(0, 5000),
      processing_status: "processing",
      uploaded_by: userId,
    }])
    .select("id")
    .single();

  const evidenceId = evidence?.id ?? null;

  // ── Step 3 : If heuristic good enough, use it ─────────────────────────
  if (heuristic && heuristic.confidence_score >= 0.85) {
    // Update evidence
    if (evidenceId) {
      await client.database.from("payment_evidences").update({
        processing_status: "extracted",
        ai_extracted_data: heuristic,
      }).eq("id", evidenceId);
    }

    // Call ingest-payment with extracted data
    const { data: result, error } = await client.functions.invoke("ingest-payment", {
      body: {
        source_channel: "text",
        wallet_id,
        content: JSON.stringify(heuristic),
        options: { ...options, dry_run: options.dry_run },
      },
    });

    if (error) {
      return json({ error: "Ingest payment failed", detail: error.message }, 502);
    }

    return json({
      success: true,
      extracted: heuristic,
      method: "heuristic",
      result,
    });
  }

  // ── Step 4 : Fallback to AI via ingest-payment ─────────────────────────
  const { data: aiResult, error: aiError } = await client.functions.invoke("ingest-payment", {
    body: {
      source_channel: "text",
      wallet_id,
      content: pasted_text,
      options: { ...options, language: options.language ?? "fr" },
    },
  });

  if (aiError) {
    // Update evidence with error
    if (evidenceId) {
      await client.database.from("payment_evidences").update({
        processing_status: "error",
        processing_error: aiError.message,
      }).eq("id", evidenceId);
    }
    return json({ error: "AI extraction failed", detail: aiError.message }, 502);
  }

  // Update evidence with success
  if (evidenceId) {
    await client.database.from("payment_evidences").update({
      processing_status: "extracted",
      ai_extracted_data: aiResult?.extracted ?? aiResult?.transaction,
    }).eq("id", evidenceId);
  }

  return json({
    success: true,
    extracted: aiResult?.extracted ?? aiResult?.transaction,
    method: "ai",
    result: aiResult,
  });
}
