// ============================================================================
// WIMRUX® FINANCES — TypeScript Interfaces
// ============================================================================

// --- Rôles utilisateur ---
export type UserRole = 'admin' | 'caissier' | 'auditeur';

// --- Entreprise ---
export interface Company {
  id: string;
  name: string;
  ifu: string;
  rccm: string;
  address_cadastral: string;
  phone: string;
  email: string;
  bank_accounts: BankAccount[];
  tax_regime: string;
  tax_office: string;
  logo_url: string | null;
  created_at: string;
}

export interface BankAccount {
  bank_name: string;
  account_number: string;
  iban: string;
}

// --- Profil utilisateur ---
export interface UserProfile {
  id: string;
  user_id: string;
  company_id: string;
  role: UserRole;
  full_name: string;
  created_at: string;
}

// --- Types de factures ---
export type InvoiceType = 'FV' | 'FT' | 'FA' | 'EV' | 'ET' | 'EA';
export type InvoiceStatus = 'draft' | 'validated' | 'certified' | 'cancelled';
export type PriceMode = 'HT' | 'TTC';

// --- Types d'articles ---
export type ArticleType = 'LOCBIE' | 'LOCSER' | 'IMPBIE' | 'IMPSER';

// --- Types de clients ---
export type ClientType = 'CC' | 'PM' | 'PP' | 'PC';

// --- Groupes de taxation ---
export type TaxGroup = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O' | 'P';

// --- Modes de paiement ---
export type PaymentType = 'ESPECES' | 'CHEQUES' | 'MOBILEMONEY' | 'CARTEBANCAIRE' | 'VIREMENT' | 'CREDIT' | 'AUTRE';

// --- Client ---
export interface Client {
  id: string;
  company_id: string;
  type: ClientType;
  name: string;
  ifu: string | null;
  rccm: string | null;
  address: string | null;
  address_cadastral: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

// --- Ligne de facture ---
export interface InvoiceItem {
  id: string;
  invoice_id: string;
  code: string;
  name: string;
  type: ArticleType;
  price: number;
  quantity: number;
  unit: string;
  tax_group: TaxGroup;
  specific_tax: number;
  discount: number;
  amount_ht: number;
  amount_tva: number;
  amount_psvb: number;
  amount_ttc: number;
  sort_order: number;
}

// --- Facture ---
export interface Invoice {
  id: string;
  company_id: string;
  client_id: string | null;
  type: InvoiceType;
  reference: string;
  status: InvoiceStatus;
  price_mode: PriceMode;
  original_invoice_id: string | null;
  operator_name: string;
  comments: InvoiceComment[];
  tax_calculation: TaxCalculationResult | null;
  total_ht: number;
  total_tva: number;
  total_psvb: number;
  total_ttc: number;
  stamp_duty: number;
  total_payment: number;
  fnec_uid: string | null;
  fiscal_number: string | null;
  code_secef_dgi: string | null;
  qr_code: string | null;
  signature: string | null;
  nim: string | null;
  counters: string | null;
  certification_datetime: string | null;
  pdf_url: string | null;
  created_at: string;
  validated_at: string | null;
  certified_at: string | null;
  items?: InvoiceItem[];
  client?: Client;
}

export interface InvoiceComment {
  label: string;
  content: string;
}

// --- Paiement ---
export interface Payment {
  type: PaymentType;
  amount: number;
}

// --- Calcul fiscal ---
export interface TaxGroupRates {
  group: TaxGroup;
  description: string;
  tva_rate: number;
  psvb_rate: number;
}

export interface TaxCalculationResult {
  totalHT: Record<TaxGroup, number>;
  tva: Record<TaxGroup, number>;
  psvb: Record<TaxGroup, number>;
  totalTTC: number;
  stampDuty: number;
}

// --- API FNEC ---
export interface FnecAuthRequest {
  clientId: string;
  clientSecret: string;
  nim: string;
}

export interface FnecAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  ifu: string;
  nim: string;
}

export interface FnecStatusResponse {
  status: boolean;
  version: string;
  ifu: string;
  nim: string;
  tokenValid: string;
  serverDateTime: string;
  pendingInvoicesCount: number;
  pendingInvoicesList: { date: string; uid: string }[];
  lastAuditRemote: string;
  deviceStatus: 'ACTIF' | 'BLOQUÉ' | 'DÉSACTIVÉ';
}

export interface FnecSubmitResponse {
  uid: string;
  status: 'PENDING';
  taxCalculation: TaxCalculationResult;
  serverDateTime: string;
}

export interface FnecConfirmResponse {
  uid: string;
  status: 'CERTIFIED';
  dateTime: string;
  fiscalNumber: string;
  codeSECeFDGI: string;
  qrCode: string;
  signature: string;
  counters: string;
  nim: string;
  deviceInfo: {
    nim: string;
    activationCounter: number;
    manufacturer: string;
    certificate: string;
  };
}

export interface FnecErrorResponse {
  error: true;
  code: string;
  message: string;
  details: Record<string, unknown>;
  timestamp: string;
}

// --- Audit ---
export type AuditActionType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface AuditLog {
  id: number;
  user_id: string;
  timestamp: string;
  action_type: AuditActionType;
  table_name: string;
  record_id: string;
  data_before: Record<string, unknown> | null;
  data_after: Record<string, unknown> | null;
  ip_address: string;
  company_id: string;
}

// --- Trésorerie ---
export type TreasuryAccountType = 'bank' | 'cash' | 'mobile_money';
export type TreasuryMovementType = 'credit' | 'debit';

export interface TreasuryAccount {
  id: string;
  company_id: string;
  name: string;
  type: TreasuryAccountType;
  balance: number;
  created_at: string;
}

export interface TreasuryMovement {
  id: string;
  account_id: string;
  invoice_id: string | null;
  amount: number;
  type: TreasuryMovementType;
  description: string;
  created_at: string;
}

// --- File d'attente mode dégradé ---
export interface PendingCertification {
  id: string;
  invoice_id: string;
  attempts: number;
  last_attempt_at: string | null;
  error_message: string | null;
  created_at: string;
}

// --- Rapports fiscaux ---
export type FiscalReportType = 'Z' | 'X';

export interface FiscalReport {
  id: string;
  company_id: string;
  nim: string;
  type: FiscalReportType;
  data: Record<string, unknown>;
  pdf_url: string | null;
  report_date: string;
  created_at: string;
}
