import { createClient } from "npm:@insforge/sdk@latest";

// ─── ingest-statement-file ────────────────────────────────────────────────────
// POST multipart/form-data : { file: File, wallet_id: string, language?: string }
// Supports: PDF (→ Stirling OCR → DeepSeek), CSV/XLSX/OFX/QIF (→ text → DeepSeek)
// Returns: { success, inserted, skipped, errors[], evidence_id }

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type":                 "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

const STIRLING_URL = Deno.env.get("STIRLING_BASE_URL") ?? "https://pdf.ulia.site";
const INSFORGE_URL = Deno.env.get("INSFORGE_BASE_URL") ?? "";
const MAX_BYTES    = 20 * 1024 * 1024; // 20 MB
const BUCKET       = "payment-evidences";

const SUPPORTED_MIME = [
  "application/pdf",
  "text/csv", "text/plain",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/x-ofx", "application/ofx",
  "text/vnd.qif", "application/qif",
];

// ─── Extract text from PDF via Stirling ──────────────────────────────────────

async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const form = new FormData();
  form.append("fileInput", new Blob([arrayBuffer], { type: "application/pdf" }), "file.pdf");

  const res = await fetch(`${STIRLING_URL}/api/v1/misc/extract-text-from-pdf`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error(`Stirling error ${res.status}: ${await res.text().catch(() => "")}`);

  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    const j = await res.json() as { text?: string; pages?: { text: string }[] };
    if (j.pages) return j.pages.map(p => p.text).join("\n\n--- PAGE ---\n\n");
    return j.text ?? "";
  }
  return await res.text();
}

// ─── Dedup hash ───────────────────────────────────────────────────────────────

async function dedupHash(walletId: string, tx: Record<string, unknown>): Promise<string> {
  const raw = `${walletId}|${tx.transaction_date}|${tx.amount}|${tx.direction}|${tx.external_transaction_id ?? tx.label}`;
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

  const client = createClient({ baseUrl: INSFORGE_URL, edgeFunctionToken: userToken });
  const { data: userData } = await client.auth.getCurrentUser();
  if (!userData?.user?.id) return json({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;

  const { data: profile } = await client.database
    .from("user_profiles").select("company_id").eq("user_id", userId).single();
  if (!profile?.company_id) return json({ error: "Company not found" }, 403);
  const company_id: string = profile.company_id;

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return json({ error: "Expected multipart/form-data" }, 400); }

  const file      = formData.get("file") as File | null;
  const wallet_id = formData.get("wallet_id") as string | null;
  const language  = (formData.get("language") as string | null) ?? "fr";

  if (!file)      return json({ error: "file is required" }, 400);
  if (!wallet_id) return json({ error: "wallet_id is required" }, 400);
  if (file.size > MAX_BYTES) return json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` }, 413);

  const mime = file.type || "application/octet-stream";
  if (!SUPPORTED_MIME.some(m => mime.includes(m.split("/")[1]!))) {
    return json({ error: `Unsupported file type: ${mime}` }, 415);
  }

  // Verify wallet
  const { data: wallet } = await client.database
    .from("payment_wallets").select("id, currency").eq("id", wallet_id).eq("company_id", company_id).single();
  if (!wallet) return json({ error: "Wallet not found" }, 404);

  const arrayBuffer = await file.arrayBuffer();

  // ── Upload to storage ──────────────────────────────────────────────────────
  const ext      = file.name.split(".").pop() ?? "bin";
  const filePath = `${userId}/${crypto.randomUUID()}.${ext}`;
  await client.storage.from(BUCKET).upload(filePath, arrayBuffer, { contentType: mime });

  // ── Create evidence ────────────────────────────────────────────────────────
  const { data: evidence } = await client.database
    .from("payment_evidences")
    .insert([{ company_id, wallet_id, evidence_type: "file", file_url: filePath, file_mime_type: mime, processing_status: "processing", uploaded_by: userId }])
    .select("id").single();
  const evidenceId: string | null = evidence?.id ?? null;

  // ── Extract text ───────────────────────────────────────────────────────────
  let rawText = "";
  try {
    if (mime.includes("pdf")) {
      rawText = await extractTextFromPdf(arrayBuffer);
    } else {
      rawText = new TextDecoder().decode(arrayBuffer);
    }
  } catch (e) {
    if (evidenceId) await client.database.from("payment_evidences").update({ processing_status: "error", processing_error: String(e) }).eq("id", evidenceId);
    return json({ error: "Text extraction failed", detail: String(e) }, 502);
  }

  if (!rawText?.trim()) {
    if (evidenceId) await client.database.from("payment_evidences").update({ processing_status: "error", processing_error: "Empty text extracted" }).eq("id", evidenceId);
    return json({ error: "No text could be extracted from file" }, 422);
  }

  // ── Call ai-router (bank_statement_ocr → DeepSeek) ────────────────────────
  const truncated = rawText.length > 15000 ? rawText.slice(0, 15000) + "\n[... tronqué ...]" : rawText;

  const { data: aiResult, error: aiError } = await client.functions.invoke("ai-router", {
    body: {
      task_code: "bank_statement_ocr",
      input: { text: `Voici le contenu d'un relevé de paiements mobile money :\n\n${truncated}` },
      options: { language, bypass_pii: true },
    },
  });

  if (aiError || !aiResult?.success) {
    if (evidenceId) await client.database.from("payment_evidences").update({ processing_status: "error", processing_error: aiError?.message ?? "ai-router error", ocr_text: rawText.slice(0, 2000) }).eq("id", evidenceId);
    return json({ error: "AI extraction failed", detail: aiError?.message }, 502);
  }

  // ── Parse transactions array ───────────────────────────────────────────────
  let transactions: Record<string, unknown>[] = [];
  try {
    const content = (aiResult.data?.content ?? "") as string;
    const cleaned = content.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const s = cleaned.indexOf("["), e = cleaned.lastIndexOf("]");
    if (s >= 0 && e > s) transactions = JSON.parse(cleaned.slice(s, e + 1)) as Record<string, unknown>[];
  } catch { /* handled below */ }

  if (!transactions.length) {
    if (evidenceId) await client.database.from("payment_evidences").update({ processing_status: "done", ocr_text: rawText.slice(0, 2000), ai_extracted_data: { raw: aiResult.data?.content } }).eq("id", evidenceId);
    return json({ success: true, inserted: 0, skipped: 0, errors: ["No transactions found in file"], evidence_id: evidenceId });
  }

  // ── Batch insert with dedup ────────────────────────────────────────────────
  let inserted = 0;
  let skipped  = 0;
  const errors: string[] = [];
  const batchId = crypto.randomUUID();

  for (const tx of transactions) {
    try {
      const hash = await dedupHash(wallet_id, tx);
      const { error: txErr } = await client.database.from("wallet_transactions").insert([{
        company_id,
        wallet_id,
        direction:            tx.direction || "debit",
        operation_type:       tx.operation_type || "payment",
        amount:               Math.abs(Number(tx.amount) || 0),
        fees:                 Number(tx.fees ?? 0),
        currency:             (tx.currency as string) || wallet.currency || "XOF",
        label:                (tx.label as string) || "Import fichier",
        counterparty_name:    tx.counterparty_name ?? null,
        counterparty_identifier: tx.counterparty_identifier ?? null,
        transaction_date:     tx.transaction_date || new Date().toISOString(),
        value_date:           tx.value_date ?? null,
        external_transaction_id: tx.external_transaction_id ?? null,
        source_channel:       "file",
        source_evidence_id:   evidenceId,
        ingestion_batch_id:   batchId,
        confidence_score:     0.8,
        needs_human_review:   false,
        reconciliation_status: "unreconciled",
        dedup_hash:           hash,
        raw_payload:          tx,
      }]);
      if (txErr?.message?.includes("duplicate") || txErr?.message?.includes("unique")) {
        skipped++;
      } else if (txErr) {
        errors.push(`${tx.label}: ${txErr.message}`);
      } else {
        inserted++;
      }
    } catch (e) {
      errors.push(String(e));
    }
  }

  if (evidenceId) {
    await client.database.from("payment_evidences").update({
      processing_status: "done",
      ocr_text: rawText.slice(0, 2000),
      ai_extracted_data: { batch_id: batchId, total: transactions.length, inserted, skipped },
      ai_model_used: aiResult.data?.model_used ?? null,
    }).eq("id", evidenceId);
  }

  return json({ success: true, inserted, skipped, errors, evidence_id: evidenceId, batch_id: batchId, ai_usage: aiResult.usage });
}
