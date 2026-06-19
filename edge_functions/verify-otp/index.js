const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://appwrite.benga.live/v1";
const APPWRITE_PROJECT   = process.env.APPWRITE_PROJECT || "";
const APPWRITE_KEY       = process.env.APPWRITE_API_KEY || "";
const DATABASE_ID        = process.env.APPWRITE_DATABASE || "wimrux_finances";

module.exports = async function (context) {
  const { req, res, log, error } = context;

  if (req.method === "OPTIONS") {
    return res.send("", 204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type",
    });
  }

  const userId = req.headers["x-appwrite-user-id"] || "";
  if (!userId) return res.json({ error: "Unauthorized" }, 401);

  try {
    let body = req.bodyJson || {};
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (_) { body = {}; }
    }
    if (!body.code && req.bodyText) {
      try { body = JSON.parse(req.bodyText); } catch (_) {}
    }
    const code = (body.code || "").trim();
    if (!code) return res.json({ error: "code requis" }, 400);

    const now = new Date().toISOString();

    // Fetch active OTP via Appwrite REST API
    const query = `queries[]=${encodeURIComponent(`Query.equal("user_id", ["${userId}"])`)}&queries[]=${encodeURIComponent(`Query.equal("purpose", ["login_2fa"])`)}&queries[]=${encodeURIComponent(`Query.equal("used", [false])`)}&queries[]=${encodeURIComponent(`Query.greaterThan("expires_at", "${now}")`)}&queries[]=${encodeURIComponent(`Query.orderDesc("created_at")`)}&queries[]=${encodeURIComponent(`Query.limit(1)`)}`;

    const fetchRes = await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/otp_codes/documents?${query}`, {
      headers: {
        "X-Appwrite-Project": APPWRITE_PROJECT,
        "X-Appwrite-Key": APPWRITE_KEY,
      },
    });
    if (!fetchRes.ok) {
      const errText = await fetchRes.text();
      log("Fetch OTP failed: " + errText);
      return res.json({ error: "Fetch OTP failed", detail: errText }, 500);
    }
    const data = await fetchRes.json();
    const rows = data.documents || [];
    if (!rows.length) return res.json({ success: false, error: "Code invalide ou expiré" }, 400);

    const row = rows[0];
    if (row.code !== code) return res.json({ success: false, error: "Code incorrect" }, 400);

    // Mark used=true via Appwrite REST
    await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/otp_codes/documents/${row.$id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": APPWRITE_PROJECT,
        "X-Appwrite-Key": APPWRITE_KEY,
      },
      body: JSON.stringify({ data: { used: true } }),
    });

    return res.json({ success: true, message: "OTP vérifié" });

  } catch (e) {
    error(String(e));
    return res.json({ error: String(e) }, 500);
  }
};
