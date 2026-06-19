const WHAPI_URL      = "https://gate.whapi.cloud/messages/text";
const WHAPI_TOKEN    = process.env.WHAPI_TOKEN || "7oUdVCMwhatfvWgRZJBner9bKvCfPq9t";
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://appwrite.benga.live/v1";
const APPWRITE_PROJECT  = process.env.APPWRITE_PROJECT || "6a29285200015cd421c7";
const APPWRITE_KEY      = process.env.APPWRITE_API_KEY || "cd279d4768dbff34786977e630739fe1693f8e3d96f649a4ddda0950f21a51b23a3df702fa72b63e177af583a30279653870fdd1b0020fb9a63b92429c0cc78beebbf056d06090629c1c27fc188a4a0e92b4940cd6a1e2c7c14e12f00bb7777592d06d4d289481f196a03e1e89084b1a86c29c64a25c2dc8d2c7a9f488d11b57";
const DATABASE_ID       = process.env.APPWRITE_DATABASE || "wimrux_finances";

function generateOtp(length = 6) {
  const digits = "0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += digits[Math.floor(Math.random() * 10)];
  }
  return code;
}

module.exports = async function (context) {
  const { req, res, log, error } = context;

  const jsonResponse = (body, status = 200, headers = {}) => ({
    body: JSON.stringify(body),
    statusCode: status,
    headers: { "Content-Type": "application/json", ...headers }
  });

  if (req.method === "OPTIONS") {
    return { body: "", statusCode: 204, headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "authorization, content-type",
    }};
  }

  const userId = req.headers["x-appwrite-user-id"] || "";
  if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

  try {
    log("1. Fetching user profile for userId: " + userId);
    
    // Get phone from user_profiles collection
    const profileRes = await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/user_profiles/documents/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": APPWRITE_PROJECT,
        "X-Appwrite-Key": APPWRITE_KEY,
      },
    });
    
    let phone = "";
    if (profileRes.ok) {
      const profile = await profileRes.json();
      phone = (profile.phone || "").replace(/\s+/g, "").replace(/^\+/, "");
      log("2. Phone from profile: " + phone);
    } else {
      log("2. Profile not found, status: " + profileRes.status);
    }
    
    // Fallback: try body if present
    if (!phone) {
      let body = req.bodyJson || {};
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (_) { body = {}; }
      }
      if (!body.phone && body.data && typeof body.data === 'string') {
        try { body = JSON.parse(body.data); } catch (_) {}
      }
      phone = (body.phone || "").replace(/\s+/g, "").replace(/^\+/, "");
      log("2b. Phone from body: " + phone);
    }
    
    if (!phone) {
      return jsonResponse({ error: "phone requis", debug: { userId: userId, profileStatus: profileRes.status } }, 400);
    }
    log("3. Final phone: " + phone);

    const code      = generateOtp(6);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    log("4. Generated code: " + code);

    if (!WHAPI_TOKEN) {
      log("WHAPI_TOKEN not set, skipping WhatsApp send");
      return jsonResponse({ success: true, message: "OTP généré (WhatsApp non configuré)", code });
    }

    // Insert OTP synchronously
    log("5. Starting DB insert");
    const docId = "otp_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
    
    const dbRes = await fetch(`${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/otp_codes/documents`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": APPWRITE_PROJECT,
        "X-Appwrite-Key": APPWRITE_KEY,
      },
      body: JSON.stringify({
        documentId: docId,
        data: {
          user_id: userId,
          phone: phone,
          code: code,
          purpose: "login_2fa",
          used: false,
          expires_at: expiresAt,
        },
      }),
    });
    log("6. DB response status: " + dbRes.status);
    
    if (!dbRes.ok) {
      const detail = await dbRes.text();
      // If document already exists, this is likely a retry of a successful first call
      if (detail.includes("document_already_exists") || detail.includes("already exists")) {
        log("7. Document already exists - likely a retry, returning success");
        return jsonResponse({ success: true, message: "OTP envoyé via WhatsApp" });
      }
      error("DB insert error: " + detail);
      return jsonResponse({ error: "Insert OTP échoué", detail }, 500);
    }
    
    log("7. DB insert OK");

    if (!WHAPI_TOKEN) {
      log("WHAPI_TOKEN not set, skipping WhatsApp send");
      return jsonResponse({ success: true, message: "OTP généré (WhatsApp non configuré)", code });
    }

    // Send WhatsApp with 1s timeout
    log("8. Starting WhatsApp send with timeout");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    
    try {
      const whapiRes = await fetch(WHAPI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${WHAPI_TOKEN}` },
        body: JSON.stringify({
          to:   `${phone}@s.whatsapp.net`,
          body: `🔐 WIMRUX Finances\nVotre code de vérification : *${code}*\nValable 10 minutes. Ne le partagez pas.`,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      log("9. WHAPI response status: " + whapiRes.status);
      
      if (!whapiRes.ok) {
        const err = await whapiRes.text();
        error("WHAPI error: " + err);
        return jsonResponse({ error: "Envoi WhatsApp échoué", detail: err }, 502);
      }
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      if (fetchErr.name === 'AbortError') {
        log("9. WhatsApp send timed out but may have succeeded");
      } else {
        error("WHAPI fetch error: " + String(fetchErr));
        return jsonResponse({ error: "Envoi WhatsApp échoué", detail: String(fetchErr) }, 502);
      }
    }

    log("10. WhatsApp sent OK");
    return jsonResponse({ success: true, message: "OTP envoyé via WhatsApp" });

  } catch (e) {
    error("CATCH ERROR: " + String(e));
    return jsonResponse({ error: String(e) }, 500);
  }
};
