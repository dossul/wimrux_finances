// =============================================================================
// WIMRUX® FINANCES — Edge Function : export-report
// Génère et stocke des exports (CSV / JSON / HTML) pour les rapports financiers
// Formats : csv, json, html, pdf (HTML imprimable)
// Sources  : balance_sheet, income_statement, cashflow, aged_receivables,
//            tax_summary, budget_vs_actual, saved_query
// Stockage : bucket privé "report-exports" → URL signée 1h
// =============================================================================
import { createClient } from "npm:@insforge/sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SIGNED_URL_EXPIRY = 3600; // 1 heure
const BASE_URL = () => Deno.env.get("INSFORGE_BASE_URL") ?? "";
const ANON_KEY  = () => Deno.env.get("ANON_KEY") ?? "";

type ReportFormat = "csv" | "json" | "html" | "pdf";
type ReportType =
  | "balance_sheet"
  | "income_statement"
  | "cashflow"
  | "aged_receivables"
  | "tax_summary"
  | "budget_vs_actual"
  | "saved_query";

interface ExportRequest {
  report_type: ReportType;
  format: ReportFormat;
  company_id: string;
  parameters?: Record<string, unknown>;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonError(401, "Authorization header manquant");
  }
  const userToken = authHeader.replace("Bearer ", "");

  // Client utilisateur (RLS respecté)
  const client = createClient({
    baseUrl: BASE_URL(),
    edgeFunctionToken: userToken,
  });

  // Vérifier l'authentification
  const { data: userData, error: authErr } = await client.auth.getCurrentUser();
  const user = userData?.user;
  if (authErr || !user?.id) {
    return jsonError(401, "Token invalide ou expiré");
  }

  // Client public (pour storage upload côté serveur)
  const anonClient = createClient({
    baseUrl: BASE_URL(),
    anonKey: ANON_KEY(),
    edgeFunctionToken: userToken,
  });

  try {
    const body: ExportRequest = await req.json();
    const { report_type, format, company_id, parameters } = body;

    if (!report_type || !format || !company_id) {
      return jsonError(400, "Champs requis manquants : report_type, format, company_id");
    }

    const ALLOWED_FORMATS: ReportFormat[] = ["csv", "json", "html", "pdf"];
    if (!ALLOWED_FORMATS.includes(format)) {
      return jsonError(400, `Format non supporté : ${format}. Valeurs : ${ALLOWED_FORMATS.join(", ")}`);
    }

    // ── Récupérer les données ─────────────────────────────────────────────
    const { rows, title } = await fetchReportData(client, report_type, company_id, parameters);

    // ── Générer le contenu ────────────────────────────────────────────────
    const { content, mimeType, extension } = generateContent(rows, title, format);

    // ── Upload dans le bucket (optionnel) ────────────────────────────────
    const filename = `${report_type}_${format}_${Date.now()}.${extension}`;
    const storagePath = `${company_id}/${filename}`;
    const bytes = new TextEncoder().encode(content);

    let fileUrl: string | null = null;
    try {
      const { error: uploadErr } = await anonClient.storage
        .from("report-exports")
        .upload(storagePath, bytes, { contentType: mimeType, upsert: false });

      if (!uploadErr) {
        const { data: signedData } = await anonClient.storage
          .from("report-exports")
          .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);
        fileUrl = signedData?.signedUrl ?? null;
      } else {
        console.warn("[export-report] Storage upload skipped:", uploadErr.message);
      }
    } catch (e) {
      console.warn("[export-report] Storage unavailable:", e);
    }

    // ── Enregistrer dans report_exports ───────────────────────────────────
    const status = fileUrl ? "completed" : "processing";
    const { data: exportRecord, error: insertErr } = await client.database
      .from("report_exports")
      .insert([{
        company_id,
        user_id: user.id,
        report_type,
        format,
        parameters: parameters ?? null,
        file_url: fileUrl,
        status,
        generated_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (insertErr) {
      console.error("[export-report] Insert error:", insertErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        export_id: exportRecord?.id ?? null,
        file_url: fileUrl,
        filename,
        row_count: rows.length,
        format,
        report_type,
        status,
        // Contenu inline pour les petits rapports (≤ 500 lignes)
        content: rows.length <= 500 ? content : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur interne";
    console.error("[export-report] Error:", message);
    return jsonError(500, message);
  }
}

// ── Helpers HTTP ──────────────────────────────────────────────────────────────

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Récupération des données par type de rapport ──────────────────────────────

// deno-lint-ignore-file no-explicit-any
async function fetchReportData(
  client: any,
  reportType: ReportType,
  companyId: string,
  parameters?: Record<string, unknown>,
): Promise<{ rows: Record<string, unknown>[]; title: string }> {
  let rows: Record<string, unknown>[] = [];
  let title = "Rapport";

  switch (reportType) {
    case "balance_sheet": {
      const { data, error } = await client.database
        .from("v_balance_sheet_current")
        .select("*")
        .eq("company_id", companyId);
      if (error) throw new Error(`balance_sheet: ${error.message}`);
      rows = data ?? [];
      title = "Bilan comptable";
      break;
    }

    case "income_statement": {
      const year = parameters?.year as number | undefined;
      const monthly = parameters?.monthly !== false;
      const view = monthly ? "v_income_statement_monthly" : "v_income_statement_yearly";
      let q = client.database.from(view).select("*").eq("company_id", companyId);
      if (year) q = q.eq("year", year);
      const orderCol = monthly ? "month" : "year";
      const { data, error } = await q.order(orderCol, { ascending: true }); // q already has .database chained
      if (error) throw new Error(`income_statement: ${error.message}`);
      rows = data ?? [];
      title = monthly
        ? `Compte de résultat mensuel${year ? ` ${year}` : ""}`
        : "Compte de résultat annuel";
      break;
    }

    case "cashflow": {
      const { data, error } = await client.database
        .from("cashflow_forecasts")
        .select("*")
        .eq("company_id", companyId)
        .order("forecast_date", { ascending: true });
      if (error) throw new Error(`cashflow: ${error.message}`);
      rows = data ?? [];
      title = "Trésorerie prévisionnelle";
      break;
    }

    case "aged_receivables": {
      const { data, error } = await client.database
        .from("invoices")
        .select("id,reference,client_id,total_ttc,paid_amount,due_date,payment_status,direction")
        .eq("company_id", companyId)
        .eq("direction", "issued")
        .neq("payment_status", "paid")
        .order("due_date", { ascending: true });
      if (error) throw new Error(`aged_receivables: ${error.message}`);
      rows = data ?? [];
      title = "Balance âgée clients";
      break;
    }

    case "tax_summary": {
      const { data, error } = await client.database
        .from("tax_payments")
        .select("*")
        .eq("company_id", companyId)
        .order("payment_date", { ascending: false });
      if (error) throw new Error(`tax_summary: ${error.message}`);
      rows = data ?? [];
      title = "Synthèse fiscale";
      break;
    }

    case "budget_vs_actual": {
      const { data, error } = await client.database
        .from("budget_lines")
        .select("id,budget_id,category,planned_amount,actual_amount,variance")
        .eq("company_id", companyId);
      if (error) throw new Error(`budget_vs_actual: ${error.message}`);
      rows = data ?? [];
      title = "Budget vs Réalisé";
      break;
    }

    case "saved_query": {
      const queryId = parameters?.query_id as string | undefined;
      if (!queryId) throw new Error("Paramètre query_id requis pour saved_query");
      const { data: qData, error: qErr } = await client.database
        .from("saved_queries")
        .select("source_table,fields,name")
        .eq("id", queryId)
        .single();
      if (qErr || !qData) throw new Error(qErr?.message ?? "Requête introuvable");
      const sq = qData as { source_table: string; fields: string[]; name: string };
      const selectFields = sq.fields?.length ? sq.fields.join(",") : "*";
      const limit = (parameters?.limit as number | undefined) ?? 1000;
      const { data, error } = await client.database
        .from(sq.source_table)
        .select(selectFields)
        .eq("company_id", companyId)
        .limit(limit);
      if (error) throw new Error(`saved_query(${sq.source_table}): ${error.message}`);
      rows = data ?? [];
      title = sq.name ?? "Requête sauvegardée";
      break;
    }

    default:
      throw new Error(`Type de rapport non supporté : ${reportType}`);
  }

  return { rows, title };
}

// ── Génération du contenu selon le format ────────────────────────────────────

function generateContent(
  rows: Record<string, unknown>[],
  title: string,
  format: ReportFormat,
): { content: string; mimeType: string; extension: string } {
  switch (format) {
    case "csv":
      return {
        content: rowsToCsv(rows),
        mimeType: "text/csv;charset=utf-8",
        extension: "csv",
      };
    case "json":
      return {
        content: JSON.stringify(
          {
            title,
            generated_at: new Date().toISOString(),
            row_count: rows.length,
            data: rows,
          },
          null,
          2
        ),
        mimeType: "application/json;charset=utf-8",
        extension: "json",
      };
    case "html":
    case "pdf":
      return {
        content: rowsToHtml(rows, title),
        mimeType: "text/html;charset=utf-8",
        extension: "html",
      };
    default:
      throw new Error(`Format non supporté : ${format}`);
  }
}

// ── CSV ───────────────────────────────────────────────────────────────────────

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const esc = (v: unknown): string => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ].join("\n");
}

// ── HTML ──────────────────────────────────────────────────────────────────────

function rowsToHtml(rows: Record<string, unknown>[], title: string): string {
  const safeTitle = escapeHtml(title);
  if (!rows.length) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${safeTitle}</title></head>` +
      `<body><h1>${safeTitle}</h1><p>Aucune donnée.</p></body></html>`;
  }
  const headers = Object.keys(rows[0]!);
  const thead = `<thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${rows
    .map(
      (r) =>
        `<tr>${headers
          .map((h) => `<td>${escapeHtml(String(r[h] ?? ""))}</td>`)
          .join("")}</tr>`
    )
    .join("")}</tbody>`;
  const now = new Date().toLocaleString("fr-FR");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${safeTitle}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;color:#333;max-width:1200px;margin:0 auto}
  h1{color:#1a73e8;margin-bottom:4px;font-size:22px}
  .meta{color:#888;font-size:12px;margin-bottom:20px}
  table{border-collapse:collapse;width:100%;font-size:13px}
  th{background:#f0f4ff;padding:10px 12px;text-align:left;border:1px solid #d0d8f0;font-weight:600;white-space:nowrap}
  td{padding:8px 12px;border:1px solid #eee;white-space:nowrap}
  tr:nth-child(even) td{background:#fafbff}
  .footer{margin-top:32px;font-size:11px;color:#bbb;border-top:1px solid #eee;padding-top:12px}
  @media print{body{padding:10px}tr:nth-child(even) td{background:#f9f9ff}}
</style>
</head>
<body>
<h1>${safeTitle}</h1>
<div class="meta">Généré le ${now} &nbsp;|&nbsp; ${rows.length} ligne(s)</div>
<table>${thead}${tbody}</table>
<div class="footer">© Wimrux Finances &mdash; Export automatique &mdash; ${now}</div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
