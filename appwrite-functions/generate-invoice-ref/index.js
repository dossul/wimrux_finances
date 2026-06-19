/**
 * Appwrite Function: generate-invoice-ref
 * Génère le prochain numéro de référence de facture pour une entreprise
 *
 * Body attendu: { p_company_id: "xxx", p_type: "FV", p_year: 2026 }
 * Retour: "FV-2026-0042" (string brut)
 */
import { Client, Databases, Query } from 'node-appwrite';

export default async ({ req, res, log, error }) => {
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const databases = new Databases(client);

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.json({ error: 'Corps invalide' }, 400);
  }

  const { p_company_id, p_type, p_year } = body;
  if (!p_company_id || !p_type || !p_year) {
    return res.json({ error: 'Paramètres manquants: p_company_id, p_type, p_year' }, 400);
  }

  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'wimrux_finances';
  const prefix = `${p_type}-${p_year}`;

  try {
    // Compter les factures existantes du même type/année/entreprise
    const existing = await databases.listDocuments(DATABASE_ID, 'invoices', [
      Query.equal('company_id', p_company_id),
      Query.equal('type', p_type),
      Query.startsWith('reference', prefix),
      Query.orderDesc('reference'),
      Query.limit(1),
    ]);

    const nextNum = (existing.total + 1).toString().padStart(4, '0');
    const reference = `${prefix}-${nextNum}`;

    log(`Generated reference: ${reference} (total existing: ${existing.total})`);

    // Retourner juste la string (compatible avec l'usage dans useInvoiceWorkflow.ts)
    return res.text(reference);
  } catch (err) {
    error('generate-invoice-ref error:', err.message);
    return res.json({ error: err.message }, 500);
  }
};
