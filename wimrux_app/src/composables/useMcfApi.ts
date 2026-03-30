import { insforge } from 'src/boot/insforge';
import type {
  McfAuthRequest,
  McfAuthResponse,
  McfStatusResponse,
  McfSubmitResponse,
  McfConfirmResponse,
  McfErrorResponse,
  TaxGroupRates,
} from 'src/types';

// ============================================================================
// API MCF (Module de Contrôle de Facturation) — WIMRUX® FINANCES
// Communication avec le simulateur MCF/SYGMEF pour la certification SECeF
// Terminologie conforme DGI Burkina Faso
// ============================================================================

const MAX_RETRIES = 2;

interface McfResult<T> {
  data: T | null;
  error: McfErrorResponse | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  BF001: 'IFU vendeur absent ou invalide',
  BF002: 'Type de facture non valide',
  BF003: 'Référence de facture manquante ou invalide',
  BF004: 'Articles manquants (minimum 1 requis)',
  BF005: 'Groupe de taxation invalide',
  BF006: 'Type de client invalide',
  BF007: 'IFU client obligatoire pour type PM ou PC',
  BF008: 'Mode de paiement invalide',
  BF009: 'Montant total paiement ≠ montant TTC',
  BF010: 'Montant article négatif ou nul',
  BF011: "Type d'article invalide",
  BF012: 'Limite de factures en attente atteinte',
  BF013: 'Facture déjà confirmée ou annulée',
  BF014: 'Facture introuvable',
  BF015: 'Dispositif SECeF bloqué',
  BF016: 'Dispositif SECeF désactivé',
  BF017: 'NIM non enregistré ou invalide',
  BF018: 'Référence de facture en double',
  BF019: 'Format adresse cadastrale invalide (SSSS LLL PPPP)',
  BF020: 'Mode de prix invalide (doit être HT ou TTC)',
  BF099: 'Erreur interne du serveur SYGMEF',
};

async function callMcf<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
  retries = 0,
): Promise<McfResult<T>> {
  try {
    const { data, error } = await insforge.functions.invoke('mcf-simulator', {
      method: 'POST',
      body: { _path: path, _method: method, ...body },
      ...(headers ? { headers } : {}),
    });

    if (error) {
      if (retries < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (retries + 1)));
        return callMcf<T>(path, method, body, headers, retries + 1);
      }
      return { data: null, error: { error: true, code: 'BF099', message: error.message || 'Erreur réseau MCF', details: {}, timestamp: new Date().toISOString() } };
    }

    if (data?.error) {
      const errData = data as McfErrorResponse;
      errData.message = ERROR_MESSAGES[errData.code] || errData.message;
      return { data: null, error: errData };
    }

    return { data: data as T, error: null };
  } catch (err: unknown) {
    if (retries < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 500 * (retries + 1)));
      return callMcf<T>(path, method, body, headers, retries + 1);
    }
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { data: null, error: { error: true, code: 'BF099', message, details: {}, timestamp: new Date().toISOString() } };
  }
}

export function useMcfApi() {
  let authToken: string | null = null;

  async function getToken(req: McfAuthRequest): Promise<McfResult<McfAuthResponse>> {
    const result = await callMcf<McfAuthResponse>('/bf/mcf/auth/token', 'POST', req as unknown as Record<string, unknown>);
    if (result.data?.access_token) {
      authToken = result.data.access_token;
    }
    return result;
  }

  function getAuthHeaders(): Record<string, string> {
    return authToken ? { 'X-MCF-Authorization': `Bearer ${authToken}` } : {};
  }

  async function ping(): Promise<McfResult<{ status: boolean; version: string; serverDateTime: string; message: string }>> {
    return callMcf<{ status: boolean; version: string; serverDateTime: string; message: string }>('/bf/mcf/ping', 'GET');
  }

  async function getStatus(): Promise<McfResult<McfStatusResponse>> {
    return callMcf<McfStatusResponse>('/bf/mcf/status', 'GET', undefined, getAuthHeaders());
  }

  async function submitInvoice(invoiceData: Record<string, unknown>): Promise<McfResult<McfSubmitResponse>> {
    return callMcf<McfSubmitResponse>('/bf/mcf/invoices', 'POST', invoiceData, getAuthHeaders());
  }

  async function confirmInvoice(uid: string): Promise<McfResult<McfConfirmResponse>> {
    return callMcf<McfConfirmResponse>(`/bf/mcf/invoices/${uid}/confirm`, 'PUT', undefined, getAuthHeaders());
  }

  async function cancelInvoice(uid: string): Promise<McfResult<{ uid: string; status: string; dateTime: string }>> {
    return callMcf(`/bf/mcf/invoices/${uid}/cancel`, 'PUT', undefined, getAuthHeaders());
  }

  async function getInvoiceDetails(uid: string): Promise<McfResult<Record<string, unknown>>> {
    return callMcf(`/bf/mcf/invoices/${uid}`, 'GET', undefined, getAuthHeaders());
  }

  async function getTaxGroups(): Promise<McfResult<Record<string, TaxGroupRates>>> {
    return callMcf('/bf/mcf/info/taxGroups');
  }

  async function getInvoiceTypes(): Promise<McfResult<{ type: string; description: string }[]>> {
    return callMcf('/bf/mcf/info/invoiceTypes');
  }

  async function getPaymentTypes(): Promise<McfResult<string[]>> {
    return callMcf('/bf/mcf/info/paymentTypes');
  }

  async function getZReport(): Promise<McfResult<Record<string, unknown>>> {
    return callMcf('/bf/mcf/reports/z', 'GET', undefined, getAuthHeaders());
  }

  async function getXReport(): Promise<McfResult<Record<string, unknown>>> {
    return callMcf('/bf/mcf/reports/x', 'GET', undefined, getAuthHeaders());
  }

  return {
    getToken,
    ping,
    getStatus,
    submitInvoice,
    confirmInvoice,
    cancelInvoice,
    getInvoiceDetails,
    getTaxGroups,
    getInvoiceTypes,
    getPaymentTypes,
    getZReport,
    getXReport,
  };
}
