const INSFORGE_URL = Deno.env.get("INSFORGE_BASE_URL") ?? "";
const ANON_KEY     = Deno.env.get("ANON_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Content-Type": "application/json",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

  try {
    const token = authHeader.replace("Bearer ", "");
    let userId: string | null = null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userId = payload.sub ?? payload.user_id ?? null;
    } catch (_e) {
      return jsonResponse({ error: "Token invalide" }, 401);
    }
    if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

    const body   = await req.json() as { code?: string };
    const code   = body.code?.trim();
    if (!code) return jsonResponse({ error: "code requis" }, 400);

    const now = new Date().toISOString();

    // Récupérer via REST PostgREST
    const url = `${INSFORGE_URL}/api/database/records/otp_codes?user_id=eq.${userId}&purpose=eq.login_2fa&used=eq.false&expires_at=gt.${encodeURIComponent(now)}&order=created_at.desc&limit=1`;
    const fetchRes = await fetch(url, {
      headers: { "apikey": ANON_KEY, "Authorization": `Bearer ${token}` },
    });
    if (!fetchRes.ok) {
      const errText = await fetchRes.text();
      return jsonResponse({ error: "Fetch OTP failed", detail: errText }, 500);
    }
    const rows = await fetchRes.json() as Array<{ id: string; code: string }>;
    if (!rows || rows.length === 0) return jsonResponse({ success: false, error: "Code invalide ou expiré" }, 400);

    const row = rows[0];
    if (row.code !== code) return jsonResponse({ success: false, error: "Code incorrect" }, 400);

    // Marquer used=true via REST
    await fetch(`${INSFORGE_URL}/api/database/records/otp_codes?id=eq.${row.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "apikey": ANON_KEY,
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({ used: true }),
    });

    return jsonResponse({ success: true, message: "OTP vérifié" });

  } catch (e) {
    console.error(e);
    return jsonResponse({ error: String(e) }, 500);
  }
}
