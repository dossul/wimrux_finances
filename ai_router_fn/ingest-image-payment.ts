import { createClient } from "npm:@insforge/sdk@latest";

// ─── Upload image to storage then forward to ingest-payment ──────────────────
// POST multipart/form-data : { file: File, wallet_id: string, language?: string }
// Returns same shape as ingest-payment

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type":                 "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

const BUCKET = "payment-evidences";
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

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

  // ── Parse multipart ────────────────────────────────────────────────────────
  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return json({ error: "Expected multipart/form-data" }, 400); }

  const file      = formData.get("file") as File | null;
  const wallet_id = formData.get("wallet_id") as string | null;
  const language  = (formData.get("language") as string | null) ?? "fr";

  if (!file)      return json({ error: "file is required" }, 400);
  if (!wallet_id) return json({ error: "wallet_id is required" }, 400);

  if (file.size > MAX_BYTES) return json({ error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` }, 413);

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
  if (!allowed.includes(file.type)) return json({ error: `Unsupported MIME type: ${file.type}` }, 415);

  // ── Upload to InsForge storage ─────────────────────────────────────────────
  const ext      = file.name.split(".").pop() ?? "jpg";
  const userId   = userData.user.id;
  const filePath = `${userId}/${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadErr } = await client.storage
    .from(BUCKET)
    .upload(filePath, arrayBuffer, { contentType: file.type });

  if (uploadErr) return json({ error: "Storage upload failed", detail: uploadErr.message }, 500);

  // ── Get public or signed URL ───────────────────────────────────────────────
  const { data: urlData } = client.storage.from(BUCKET).getPublicUrl(filePath);
  const imageUrl: string = urlData?.publicUrl ?? "";

  if (!imageUrl) return json({ error: "Could not get file URL after upload" }, 500);

  // ── Delegate to ingest-payment ─────────────────────────────────────────────
  const { data: result, error: ingestErr } = await client.functions.invoke("ingest-payment", {
    body: {
      source_channel: "image",
      wallet_id,
      image_url: imageUrl,
      file_mime: file.type,
      options: { language },
    },
  });

  if (ingestErr) return json({ error: "ingest-payment failed", detail: ingestErr.message }, 502);

  return json({ ...result, uploaded_url: imageUrl });
}
