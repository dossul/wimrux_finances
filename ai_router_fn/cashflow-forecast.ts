// =============================================================================
// WIMRUX® FINANCES — Edge Function: cashflow-forecast
// Prévision trésorerie IA via ai-router (cashflow_forecast → Claude Sonnet 4.5)
// Analyse les 90 derniers jours → projette sur 30/60/90 jours
// =============================================================================
import { createClient } from 'npm:@insforge/sdk@latest';

const client = createClient({
  baseUrl: Deno.env.get('INSFORGE_BASE_URL') ?? '',
  anonKey:  Deno.env.get('INSFORGE_ANON_KEY') ?? '',
});

interface ForecastPoint {
  date:             string;
  predicted_inflow: number;
  predicted_outflow: number;
  predicted_balance: number;
  confidence:       number;
  drivers:          string[];
}

interface ForecastResult {
  horizon_days:     number;
  current_balance:  number;
  currency:         string;
  points:           ForecastPoint[];
  summary:          string;
  risks:            string[];
  opportunities:    string[];
  model_used:       string | null;
}

export default async function(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: { user }, error: authErr } = await client.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) return new Response(JSON.stringify({ success: false, message: 'Non autorisé' }), { status: 401, headers: corsHeaders });

    const { company_id, horizon_days = 90, currency = 'XOF' } = await req.json().catch(() => ({})) as { company_id?: string; horizon_days?: number; currency?: string };
    if (!company_id) return new Response(JSON.stringify({ success: false, message: 'company_id requis' }), { status: 400, headers: corsHeaders });

    const since90d = new Date(Date.now() - 90 * 86400000).toISOString();
    const now      = new Date();

    // ── Données historiques ───────────────────────────────────────────────
    const [{ data: txData }, { data: invoiceData }, { data: walletData }] = await Promise.all([
      client.database.from('wallet_transactions')
        .select('direction,amount,transaction_date,label,source_channel')
        .eq('company_id', company_id)
        .gte('transaction_date', since90d)
        .order('transaction_date', { ascending: true })
        .limit(500),
      client.database.from('invoices')
        .select('direction,total_ttc,due_date,payment_status,status')
        .eq('company_id', company_id)
        .in('payment_status', ['unpaid', 'partial'])
        .not('due_date', 'is', null)
        .limit(100),
      client.database.from('payment_wallets')
        .select('id,name,current_balance,currency')
        .eq('company_id', company_id)
        .eq('is_active', true)
        .limit(20),
    ]);

    const transactions = txData ?? [];
    const openInvoices = invoiceData ?? [];
    const wallets      = walletData ?? [];

    // Solde courant total
    const currentBalance = (wallets as Array<Record<string, unknown>>).reduce((s, w) => s + Number(w.current_balance ?? 0), 0);

    // Résumé mensuel pour le prompt
    const monthlyMap: Record<string, { in: number; out: number }> = {};
    for (const tx of transactions as Array<Record<string, unknown>>) {
      const month = typeof tx.transaction_date === 'string' ? tx.transaction_date.slice(0, 7) : '';
      if (!month) continue;
      if (!monthlyMap[month]) monthlyMap[month] = { in: 0, out: 0 };
      if (tx.direction === 'credit') monthlyMap[month].in  += Number(tx.amount);
      else                           monthlyMap[month].out += Number(tx.amount);
    }

    // Encaissements et décaissements attendus (factures ouvertes)
    const expectedInflows  = (openInvoices as Array<Record<string, unknown>>).filter(i => i.direction === 'issued').map(i => ({ amount: Number(i.total_ttc), due_date: i.due_date }));
    const expectedOutflows = (openInvoices as Array<Record<string, unknown>>).filter(i => i.direction === 'received').map(i => ({ amount: Number(i.total_ttc), due_date: i.due_date }));

    const prompt = `Tu es expert en prévision de trésorerie pour les PME en Afrique de l'Ouest (UEMOA/CFA).

CONTEXTE :
- Solde actuel total wallets : ${currentBalance.toLocaleString()} ${currency}
- Devise : ${currency}
- Horizon de prévision : ${horizon_days} jours (de ${now.toISOString().slice(0, 10)})

HISTORIQUE MENSUEL (entrées/sorties wallet) :
${JSON.stringify(monthlyMap, null, 1)}

FACTURES OUVERTES (encaissements attendus) :
${JSON.stringify(expectedInflows.slice(0, 20), null, 1)}

DÉCAISSEMENTS ATTENDUS (factures fournisseurs à payer) :
${JSON.stringify(expectedOutflows.slice(0, 20), null, 1)}

Génère une prévision de trésorerie sur ${horizon_days} jours en points hebdomadaires.
Prends en compte : saisonnalité, tendances historiques, factures dues.

Retourne UNIQUEMENT un objet JSON :
{
  "points": [
    {"date":"YYYY-MM-DD","predicted_inflow":0,"predicted_outflow":0,"predicted_balance":0,"confidence":0.85,"drivers":["..."]}
  ],
  "summary": "Résumé 2-3 phrases",
  "risks": ["risque 1", "risque 2"],
  "opportunities": ["opportunité 1"]
}`;

    const { data: aiData, error: aiErr } = await client.functions.invoke('ai-router', {
      body: { task_code: 'cashflow_forecast', input: { text: prompt }, options: { language: 'fr', bypass_pii: true } },
    });

    if (aiErr || !aiData?.success) throw new Error(aiErr?.message ?? 'ai-router error');

    const content: string = aiData.data?.content ?? '';
    const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}');
    if (s < 0 || e < 0) throw new Error("Réponse IA non JSON");

    const parsed = JSON.parse(cleaned.slice(s, e + 1)) as { points: ForecastPoint[]; summary: string; risks: string[]; opportunities: string[] };

    const result: ForecastResult = {
      horizon_days,
      current_balance: currentBalance,
      currency,
      points:          parsed.points ?? [],
      summary:         parsed.summary ?? '',
      risks:           parsed.risks ?? [],
      opportunities:   parsed.opportunities ?? [],
      model_used:      aiData.data?.model_used ?? null,
    };

    return new Response(JSON.stringify({ success: true, forecast: result }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne';
    return new Response(JSON.stringify({ success: false, message: msg }), { status: 500, headers: corsHeaders });
  }
}
