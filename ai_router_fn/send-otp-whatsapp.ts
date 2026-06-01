const WHAPI_URL    = "https://gate.whapi.cloud/messages/text";
const INSFORGE_URL = Deno.env.get("INSFORGE_BASE_URL") ?? "";
const ANON_KEY     = Deno.env.get("ANON_KEY") ?? "";
const WHAPI_TOKEN  = Deno.env.get("WHAPI_TOKEN") ?? "";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

function generateOtp(length = 6): string {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * 10)];
  }
  return code;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

  try {
    const token = authHeader.replace("Bearer ", "");

    // Décoder le JWT pour extraire user_id
    let userId: string | null = null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userId = payload.sub ?? payload.user_id ?? null;
    } catch (_) {
      return jsonResponse({ error: "Token invalide" }, 401);
    }
    if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

    const body  = await req.json() as { phone?: string };
    const phone = body.phone?.replace(/\s+/g, "").replace(/^\+/, "");
    if (!phone) return jsonResponse({ error: "phone requis" }, 400);

    const code      = generateOtp(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Insérer OTP en base via PostgREST
    const dbRes = await fetch(`${INSFORGE_URL}/api/database/records/otp_codes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify([{ user_id: userId, phone, code, purpose: "login_2fa", used: false, expires_at: expiresAt }]),
    });
    if (!dbRes.ok) {
      const detail = await dbRes.text();
      console.error("DB insert error:", detail);
      return jsonResponse({ error: "Insert OTP échoué", detail }, 500);
    }

    const whapiRes = await fetch(WHAPI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${WHAPI_TOKEN}` },
      body: JSON.stringify({
        to:   `${phone}@s.whatsapp.net`,
        body: `🔐 WIMRUX Finances\nVotre code de vérification : *${code}*\nValable 10 minutes. Ne le partagez pas.`,
      }),
    });

    if (!whapiRes.ok) {
      const err = await whapiRes.text();
      console.error("whapi error:", err);
      return jsonResponse({ error: "Envoi WhatsApp échoué", detail: err }, 502);
    }

    return jsonResponse({ success: true, message: "OTP envoyé via WhatsApp" });

  } catch (e) {
    console.error(e);
    return jsonResponse({ error: String(e) }, 500);
  }
}
