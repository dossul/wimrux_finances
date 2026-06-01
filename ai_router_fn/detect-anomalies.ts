// =============================================================================
// WIMRUX® FINANCES — Edge Function: detect-anomalies
// Détection d'anomalies financières via ai-router (detection_anomalie → Claude Haiku)
// Analyse : wallet_transactions + invoices des 90 derniers jours
// =============================================================================
import { createClient } from 'npm:@insforge/sdk@latest';

const client = createClient({
  baseUrl: Deno.env.get('INSFORGE_BASE_URL') ?? '',
  anonKey:  Deno.env.get('INSFORGE_ANON_KEY') ?? '',
});

interface AnomalyAlert {
  type:        string;
  severity:    'low' | 'medium' | 'high' | 'critical';
  description: string;
  entity_type: 'wallet_transaction' | 'invoice' | 'global';
  entity_id:   string | null;
  amount:      number | null;
  detected_at: string;
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

    const { company_id, wallet_id, days = 90 } = await req.json().catch(() => ({})) as { company_id?: string; wallet_id?: string; days?: number };
    if (!company_id) return new Response(JSON.stringify({ success: false, message: 'company_id requis' }), { status: 400, headers: corsHeaders });

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // ── Charger transactions ───────────────────────────────────────────────
    let txQuery = client.database
      .from('wallet_transactions')
      .select('id,wallet_id,direction,amount,currency,label,counterparty_name,transaction_date,source_channel,reconciliation_status')
      .eq('company_id', company_id)
      .gte('transaction_date', since)
      .order('transaction_date', { ascending: false })
      .limit(300);
    if (wallet_id) txQuery = txQuery.eq('wallet_id', wallet_id);

    const { data: txData } = await txQuery;
    const transactions = txData ?? [];

    // ── Charger factures reçues récentes ──────────────────────────────────
    const { data: invData } = await client.database
      .from('invoices')
      .select('id,direction,supplier_id,total_ttc,due_date,payment_status,fiscal_compliance_status,created_at')
      .eq('company_id', company_id)
      .eq('direction', 'received')
      .gte('created_at', since)
      .limit(100);
    const invoices = invData ?? [];

    if (!transactions.length && !invoices.length) {
      return new Response(JSON.stringify({ success: true, alerts: [], message: 'Aucune donnée à analyser' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── Règles déterministes rapides (hors IA) ────────────────────────────
    const deterministicAlerts: AnomalyAlert[] = [];

    // Transactions en double (même montant + même date + même contrepartie, hors hash)
    const txSeen = new Map<string, string>();
    for (const tx of transactions) {
      const key = `${tx.amount}|${tx.transaction_date?.slice(0, 10)}|${tx.counterparty_name ?? ''}|${tx.direction}`;
      if (txSeen.has(key)) {
        deterministicAlerts.push({ type: 'potential_duplicate', severity: 'medium', description: `Transaction potentiellement en double : ${tx.label} (${tx.amount} ${tx.currency})`, entity_type: 'wallet_transaction', entity_id: tx.id, amount: tx.amount, detected_at: new Date().toISOString() });
      }
      txSeen.set(key, tx.id);
    }

    // Montants ronds très élevés (> 5 000 000 XOF)
    for (const tx of transactions) {
      if (tx.amount > 5_000_000 && tx.amount % 1_000_000 === 0) {
        deterministicAlerts.push({ type: 'large_round_amount', severity: 'high', description: `Montant rond suspect : ${tx.amount.toLocaleString()} XOF — ${tx.label}`, entity_type: 'wallet_transaction', entity_id: tx.id, amount: tx.amount, detected_at: new Date().toISOString() });
      }
    }

    // Factures overdue non payées
    const now = new Date();
    for (const inv of invoices) {
      if (inv.due_date && inv.payment_status !== 'paid' && new Date(inv.due_date) < now) {
        const daysLate = Math.round((now.getTime() - new Date(inv.due_date).getTime()) / 86400000);
        deterministicAlerts.push({ type: 'overdue_invoice', severity: daysLate > 60 ? 'critical' : daysLate > 30 ? 'high' : 'medium', description: `Facture en retard de ${daysLate}j — ${inv.total_ttc} XOF`, entity_type: 'invoice', entity_id: inv.id, amount: inv.total_ttc, detected_at: new Date().toISOString() });
      }
    }

    // Factures non conformes
    const nonCompliant = invoices.filter((i: Record<string, unknown>) => i.fiscal_compliance_status === 'invalid');
    if (nonCompliant.length > 0) {
      deterministicAlerts.push({ type: 'fiscal_non_compliance', severity: 'high', description: `${nonCompliant.length} facture(s) non conforme(s) fiscalement`, entity_type: 'invoice', entity_id: null, amount: null, detected_at: new Date().toISOString() });
    }

    // ── Analyse IA approfondie ─────────────────────────────────────────────
    const prompt = `Tu es auditeur financier expert en fraude et anomalies comptables en Afrique de l'Ouest.

TRANSACTIONS (${days} derniers jours) :
${JSON.stringify(transactions.slice(0, 100).map((t: Record<string, unknown>) => ({ id: t.id, montant: t.amount, sens: t.direction, libellé: t.label, contrepartie: t.counterparty_name, date: typeof t.transaction_date === 'string' ? t.transaction_date.slice(0, 10) : null, canal: t.source_channel })), null, 1)}

FACTURES REÇUES :
${JSON.stringify(invoices.slice(0, 50).map((i: Record<string, unknown>) => ({ id: i.id, montant: i.total_ttc, statut_paiement: i.payment_status, conformité: i.fiscal_compliance_status, échéance: i.due_date })), null, 1)}

Anomalies déjà détectées par règles déterministes :
${JSON.stringify(deterministicAlerts.map(a => a.type))}

Identifie les anomalies supplémentaires : patterns inhabituels, fréquences anormales, montants atypiques vs historique, transactions nocturnes suspectes, séquences fragmentées (structuring), etc.

Retourne UNIQUEMENT un tableau JSON (vide si aucune anomalie) :
[{"type":"...","severity":"low|medium|high|critical","description":"...","entity_type":"wallet_transaction|invoice|global","entity_id":"... ou null","amount": 0 ou null}]`;

    const { data: aiData, error: aiErr } = await client.functions.invoke('ai-router', {
      body: { task_code: 'detection_anomalie', input: { text: prompt }, options: { language: 'fr', bypass_pii: false } },
    });

    let aiAlerts: AnomalyAlert[] = [];
    if (!aiErr && aiData?.success) {
      try {
        const content: string = aiData.data?.content ?? '';
        const cleaned = content.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
        const s = cleaned.indexOf('['), e = cleaned.lastIndexOf(']');
        if (s >= 0 && e > s) {
          const parsed = JSON.parse(cleaned.slice(s, e + 1)) as Array<Omit<AnomalyAlert, 'detected_at'>>;
          aiAlerts = parsed.map((a: Omit<AnomalyAlert, 'detected_at'>) => ({ ...a, entity_id: a.entity_id ?? null, amount: a.amount ?? null, detected_at: new Date().toISOString() }));
        }
      } catch (_) { /* ignore parse errors */ }
    }

    const allAlerts = [...deterministicAlerts, ...aiAlerts];

    // ── Persister en DB ───────────────────────────────────────────────────
    if (allAlerts.length > 0) {
      const rows = allAlerts.map((a: AnomalyAlert) => ({
        company_id,
        anomaly_type:  a.type,
        severity:      a.severity,
        description:   a.description,
        entity_type:   a.entity_type,
        entity_id:     a.entity_id,
        amount:        a.amount,
        is_resolved:   false,
        source:        a.type === 'potential_duplicate' || a.type === 'large_round_amount' || a.type === 'overdue_invoice' || a.type === 'fiscal_non_compliance' ? 'rule' : 'ai',
        detected_at:   a.detected_at,
      }));
      await client.database.from('anomaly_alerts').upsert(rows, { ignoreDuplicates: true });
    }

    return new Response(JSON.stringify({
      success: true,
      alerts: allAlerts,
      stats: {
        total:    allAlerts.length,
        critical: allAlerts.filter(a => a.severity === 'critical').length,
        high:     allAlerts.filter(a => a.severity === 'high').length,
        medium:   allAlerts.filter(a => a.severity === 'medium').length,
        low:      allAlerts.filter(a => a.severity === 'low').length,
        ai_model: aiData?.data?.model_used ?? null,
      },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur interne';
    return new Response(JSON.stringify({ success: false, message: msg }), { status: 500, headers: corsHeaders });
  }
}
