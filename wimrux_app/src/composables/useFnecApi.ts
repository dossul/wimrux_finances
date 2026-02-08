import { insforge } from 'src/boot/insforge';
import type {
  FnecAuthRequest,
  FnecAuthResponse,
  FnecStatusResponse,
  FnecSubmitResponse,
  FnecConfirmResponse,
  FnecErrorResponse,
  TaxGroupRates,
} from 'src/types';

const MAX_RETRIES = 2;

interface FnecResult<T> {
  data: T | null;
  error: FnecErrorResponse | null;
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
  BF099: 'Erreur interne du serveur',
};

async function callFnec<T>(
  path: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  body?: Record<string, unknown>,
  headers?: Record<string, string>,
  retries = 0,
): Promise<FnecResult<T>> {
  try {
    const { data, error } = await insforge.functions.invoke('fnec-simulator', {
      method,
      body: { _path: path, _method: method, ...body },
      ...(headers ? { headers } : {}),
    });

    if (error) {
      if (retries < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * (retries + 1)));
        return callFnec<T>(path, method, body, headers, retries + 1);
      }
      return { data: null, error: { error: true, code: 'BF099', message: error.message || 'Erreur réseau', details: {}, timestamp: new Date().toISOString() } };
    }

    if (data?.error) {
      const errData = data as FnecErrorResponse;
      errData.message = ERROR_MESSAGES[errData.code] || errData.message;
      return { data: null, error: errData };
    }

    return { data: data as T, error: null };
  } catch (err: unknown) {
    if (retries < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 500 * (retries + 1)));
      return callFnec<T>(path, method, body, headers, retries + 1);
    }
    const message = err instanceof Error ? err.message : 'Erreur inconnue';
    return { data: null, error: { error: true, code: 'BF099', message, details: {}, timestamp: new Date().toISOString() } };
  }
}

export function useFnecApi() {
  let authToken: string | null = null;

  async function getToken(req: FnecAuthRequest): Promise<FnecResult<FnecAuthResponse>> {
    const result = await callFnec<FnecAuthResponse>('/bf/fnec/auth/token', 'POST', req as unknown as Record<string, unknown>);
    if (result.data?.access_token) {
      authToken = result.data.access_token;
    }
    return result;
  }

  function getAuthHeaders(): Record<string, string> {
    return authToken ? { Authorization: `Bearer ${authToken}` } : {};
  }

  async function getStatus(): Promise<FnecResult<FnecStatusResponse>> {
    return callFnec<FnecStatusResponse>('/bf/fnec/status', 'GET', undefined, getAuthHeaders());
  }

  async function submitInvoice(invoiceData: Record<string, unknown>): Promise<FnecResult<FnecSubmitResponse>> {
    return callFnec<FnecSubmitResponse>('/bf/fnec/invoices', 'POST', invoiceData, getAuthHeaders());
  }

  async function confirmInvoice(uid: string): Promise<FnecResult<FnecConfirmResponse>> {
    return callFnec<FnecConfirmResponse>(`/bf/fnec/invoices/${uid}/confirm`, 'PUT', undefined, getAuthHeaders());
  }

  async function cancelInvoice(uid: string): Promise<FnecResult<{ uid: string; status: string; dateTime: string }>> {
    return callFnec(`/bf/fnec/invoices/${uid}/cancel`, 'PUT', undefined, getAuthHeaders());
  }

  async function getInvoiceDetails(uid: string): Promise<FnecResult<Record<string, unknown>>> {
    return callFnec(`/bf/fnec/invoices/${uid}`, 'GET', undefined, getAuthHeaders());
  }

  async function getTaxGroups(): Promise<FnecResult<Record<string, TaxGroupRates>>> {
    return callFnec('/bf/fnec/info/taxGroups');
  }

  async function getInvoiceTypes(): Promise<FnecResult<{ type: string; description: string }[]>> {
    return callFnec('/bf/fnec/info/invoiceTypes');
  }

  async function getPaymentTypes(): Promise<FnecResult<string[]>> {
    return callFnec('/bf/fnec/info/paymentTypes');
  }

  async function getZReport(): Promise<FnecResult<Record<string, unknown>>> {
    return callFnec('/bf/fnec/reports/z', 'GET', undefined, getAuthHeaders());
  }

  async function getXReport(): Promise<FnecResult<Record<string, unknown>>> {
    return callFnec('/bf/fnec/reports/x', 'GET', undefined, getAuthHeaders());
  }

  return {
    getToken,
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
