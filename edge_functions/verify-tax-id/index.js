const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://appwrite.benga.live/v1";
const APPWRITE_PROJECT  = process.env.APPWRITE_PROJECT || "";
const APPWRITE_KEY      = process.env.APPWRITE_API_KEY || "";
const DATABASE_ID       = process.env.APPWRITE_DATABASE || "wimrux_finances";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

module.exports = async function (context) {
  const { req, res, log, error } = context;

  if (req.method === "OPTIONS") {
    return res.send("ok", 200, CORS);
  }

  try {
    const body = req.bodyJson || {};
    const { country_code, tax_id } = body;

    if (!country_code || !tax_id) {
      return res.json({ error: "country_code et tax_id requis" }, 400);
    }

    // Try loading country config from Appwrite
    let config = null;
    try {
      const { data } = await appwriteFetch(
        `/databases/${DATABASE_ID}/collections/country_fiscal_configs/documents?` +
        `queries[]=${encodeURIComponent(`Query.equal("country_code", ["${country_code.toUpperCase()}"])`)}&` +
        `queries[]=${encodeURIComponent(`Query.equal("is_active", [true])`)}&` +
        `queries[]=${encodeURIComponent(`Query.limit(1)`)}`
      );
      if (data && data.documents && data.documents.length > 0) {
        config = data.documents[0];
      }
    } catch (e) {
      log("Config fetch error: " + String(e));
    }

    if (!config) {
      return res.json({
        success: true,
        data: {
          country_code,
          tax_id,
          tax_id_label: "TIN/NIF/IFU",
          format_valid: tax_id.trim().length >= 7,
          format_message: `Pays ${country_code} non configuré — validation générique`,
          online_check: "not_available",
          online_message: null,
          verification_type: "manual",
          manual_required: true,
          fiscal_platform_name: null,
          fiscal_platform_url: null,
        },
      });
    }

    // 1. Local format validation
    let format_valid = true;
    let format_message = "Format valide";

    if (config.tax_id_format_regex) {
      const regex = new RegExp(config.tax_id_format_regex, "i");
      const cleaned = tax_id.trim().replace(/[\s\-]/g, "");
      format_valid = regex.test(cleaned);
      format_message = format_valid
        ? `${config.tax_id_label} : format valide (${config.tax_id_format_hint ?? "OK"})`
        : `${config.tax_id_label} invalide — ${config.tax_id_format_hint ?? "format incorrect"}`;
    }

    // 2. Online verification
    let online_check = "not_available";
    let online_message = null;

    if (config.verification_type === "web_scrape" && config.verification_url && format_valid) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);

        const formData = new URLSearchParams();
        formData.append(config.verification_field ?? "IFU", tax_id.trim());

        const response = await fetch(config.verification_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "Mozilla/5.0 (compatible; WIMRUX-Verify/1.0)",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "fr-FR,fr;q=0.9",
            "Origin": "https://dgi.bf",
            "Referer": config.verification_url,
          },
          body: formData.toString(),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (response.ok) {
          const html = await response.text();
          const htmlLower = html.toLowerCase();
          const validPattern = config.verification_valid_pattern
            ? new RegExp(config.verification_valid_pattern, "i")
            : /valid|trouvé|existe|contribuable|enregistré/i;
          const invalidPattern = /introuvable|invalide|inexistant|not found|erreur/i;

          if (validPattern.test(html)) {
            online_check = "valid";
            online_message = `${config.tax_id_label} vérifié et valide selon ${config.country_name} DGI`;
          } else if (invalidPattern.test(htmlLower)) {
            online_check = "invalid";
            online_message = `${config.tax_id_label} non trouvé dans la base DGI ${config.country_name}`;
          } else {
            online_check = "pending";
            online_message = "Réponse DGI reçue mais résultat non déterminé — vérification manuelle recommandée";
          }
        } else {
          online_check = "error";
          online_message = `Erreur DGI : HTTP ${response.status}`;
        }
      } catch (e) {
        online_check = "error";
        online_message = `Timeout ou réseau : ${e instanceof Error ? e.message : "Erreur"}`;
      }
    } else if (config.verification_type === "api_json" && config.verification_url && format_valid) {
      online_check = "not_available";
      online_message = `API ${config.country_name} configurée mais non encore activée`;
    } else if (config.verification_type === "manual") {
      online_check = "not_available";
      online_message = config.fiscal_platform_url
        ? `Vérification manuelle : ${config.fiscal_platform_url}`
        : "Vérification manuelle uniquement — pas d'API disponible";
    }

    return res.json({
      success: true,
      data: {
        country_code: config.country_code.trim(),
        tax_id: tax_id.trim(),
        tax_id_label: config.tax_id_label,
        format_valid,
        format_message,
        online_check,
        online_message,
        verification_type: config.verification_type,
        manual_required: config.verification_type === "manual" || online_check === "error" || online_check === "pending",
        fiscal_platform_name: config.fiscal_platform_name,
        fiscal_platform_url: config.fiscal_platform_url,
      },
    });

  } catch (err) {
    error(String(err));
    return res.json({ error: err instanceof Error ? err.message : "Erreur interne" }, 500);
  }
};
