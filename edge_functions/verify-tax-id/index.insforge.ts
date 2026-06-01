// =============================================================================
// WIMRUX® FINANCES — Edge Function : verify-tax-id  (InsForge format)
// Vérification universelle d'identifiant fiscal par pays
// BF : scraping POST DGI BF (https://dgi.bf/verification/verification-ifu)
// Autres : validation locale par regex uniquement (manuel)
// =============================================================================
import { createClient } from "npm:@insforge/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  country_code: string;
  tax_id: string;
}

interface VerifyResult {
  country_code: string;
  tax_id: string;
  tax_id_label: string;
  format_valid: boolean;
  format_message: string;
  online_check: "not_available" | "pending" | "valid" | "invalid" | "error";
  online_message: string | null;
  verification_type: string;
  manual_required: boolean;
  fiscal_platform_name: string | null;
  fiscal_platform_url: string | null;
}

export default async function(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const client = createClient({
      baseUrl: Deno.env.get("INSFORGE_BASE_URL") ?? "",
      anonKey: Deno.env.get("ANON_KEY") ?? "",
    });

    const body: VerifyRequest = await req.json();
    const { country_code, tax_id } = body;

    if (!country_code || !tax_id) {
      return new Response(
        JSON.stringify({ error: "country_code et tax_id requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: config, error: configErr } = await client.database
      .from("country_fiscal_configs")
      .select("*")
      .eq("country_code", country_code.toUpperCase())
      .eq("is_active", true)
      .single();

    if (configErr || !config) {
      return new Response(
        JSON.stringify({
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
        } satisfies VerifyResult),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    let online_check: VerifyResult["online_check"] = "not_available";
    let online_message: string | null = null;

    if (config.verification_type === "web_scrape" && config.verification_url && format_valid) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
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
        clearTimeout(timeout);
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
    } else if (config.verification_type === "manual") {
      online_check = "not_available";
      online_message = config.fiscal_platform_url
        ? `Vérification manuelle : ${config.fiscal_platform_url}`
        : "Vérification manuelle uniquement — pas d'API disponible";
    }

    const result: VerifyResult = {
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
    };

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
