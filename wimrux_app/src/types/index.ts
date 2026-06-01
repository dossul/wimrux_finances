// ============================================================================
// WIMRUX® FINANCES — TypeScript Interfaces
// ============================================================================

// --- Rôles utilisateur ---
export type UserRole =
  | 'admin'
  | 'superviseur'
  | 'comptable'
  | 'tresorier'
  | 'caissier'
  | 'manager'
  | 'auditeur'
  | 'controleur'
  | 'consultant'
  | 'project_admin';

// --- Permissions granulaires ---
export type Permission =
  | 'dashboard.view'
  | 'invoices.create'
  | 'invoices.read'
  | 'invoices.submit'
  | 'invoices.approve'
  | 'invoices.validate'
  | 'clients.create'
  | 'clients.read'
  | 'clients.update'
  | 'clients.delete'
  | 'treasury.read'
  | 'treasury.create'
  | 'treasury.update'
  | 'reports.read'
  | 'audit.read'
  | 'ai.use'
  | 'settings.manage'
  | 'users.manage';

export const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'invoices.create', 'invoices.read', 'invoices.submit',
  'invoices.approve', 'invoices.validate',
  'clients.create', 'clients.read', 'clients.update', 'clients.delete',
  'treasury.read', 'treasury.create', 'treasury.update',
  'reports.read',
  'audit.read',
  'ai.use',
  'settings.manage',
  'users.manage',
];

export const PERMISSION_LABELS: Record<Permission, { label: string; category: string; icon: string }> = {
  'dashboard.view':     { label: 'Voir le tableau de bord',     category: 'Général',      icon: 'dashboard' },
  'invoices.create':    { label: 'Créer des factures',          category: 'Facturation',  icon: 'add_circle' },
  'invoices.read':      { label: 'Consulter les factures',      category: 'Facturation',  icon: 'receipt_long' },
  'invoices.submit':    { label: 'Soumettre pour validation',   category: 'Facturation',  icon: 'send' },
  'invoices.approve':   { label: 'Approuver les factures',      category: 'Facturation',  icon: 'thumb_up' },
  'invoices.validate':  { label: 'Valider définitivement',      category: 'Facturation',  icon: 'check_circle' },
  'clients.create':     { label: 'Créer des clients',           category: 'Clients',      icon: 'person_add' },
  'clients.read':       { label: 'Consulter les clients',       category: 'Clients',      icon: 'people' },
  'clients.update':     { label: 'Modifier les clients',        category: 'Clients',      icon: 'edit' },
  'clients.delete':     { label: 'Supprimer des clients',       category: 'Clients',      icon: 'delete' },
  'treasury.read':      { label: 'Consulter la trésorerie',     category: 'Trésorerie',   icon: 'account_balance' },
  'treasury.create':    { label: 'Créer des mouvements',        category: 'Trésorerie',   icon: 'swap_horiz' },
  'treasury.update':    { label: 'Modifier la trésorerie',      category: 'Trésorerie',   icon: 'edit' },
  'reports.read':       { label: 'Consulter les rapports',      category: 'Rapports',     icon: 'assessment' },
  'audit.read':         { label: 'Journal d\'audit',            category: 'Audit',        icon: 'history' },
  'ai.use':             { label: 'Utiliser l\'assistant IA',    category: 'IA',           icon: 'smart_toy' },
  'settings.manage':    { label: 'Gérer les paramètres',        category: 'Administration', icon: 'settings' },
  'users.manage':       { label: 'Gérer les utilisateurs',      category: 'Administration', icon: 'manage_accounts' },
};

export const PERMISSION_CATEGORIES = [
  'Général', 'Facturation', 'Clients', 'Trésorerie', 'Rapports', 'Audit', 'IA', 'Administration',
] as const;

// Default permissions per built-in role (before any company override)
export const DEFAULT_ROLE_PERMISSIONS: Record<Exclude<UserRole, 'project_admin'>, Permission[]> = {
  admin: [...ALL_PERMISSIONS],
  superviseur: [
    'dashboard.view',
    'invoices.read', 'invoices.submit', 'invoices.approve', 'invoices.validate',
    'clients.read',
    'treasury.read',
    'reports.read',
    'audit.read',
    'ai.use',
  ],
  comptable: [
    'dashboard.view',
    'invoices.create', 'invoices.read', 'invoices.submit',
    'clients.create', 'clients.read', 'clients.update',
    'treasury.read', 'treasury.create', 'treasury.update',
    'reports.read',
    'audit.read',
    'ai.use',
  ],
  tresorier: [
    'dashboard.view',
    'invoices.read',
    'treasury.read', 'treasury.create', 'treasury.update',
    'reports.read',
    'ai.use',
  ],
  caissier: [
    'dashboard.view',
    'invoices.create', 'invoices.read', 'invoices.submit',
    'clients.create', 'clients.read', 'clients.update',
    'ai.use',
  ],
  manager: [
    'dashboard.view',
    'invoices.read',
    'clients.read',
    'treasury.read',
    'reports.read',
  ],
  auditeur: [
    'dashboard.view',
    'invoices.read',
    'reports.read',
    'audit.read',
    'ai.use',
  ],
  controleur: [
    'dashboard.view',
    'invoices.read',
    'clients.read',
    'treasury.read',
    'reports.read',
    'audit.read',
  ],
  consultant: [
    'dashboard.view',
    'invoices.read',
    'clients.read',
    'reports.read',
  ],
};

// Row in company_custom_roles table
export interface CompanyCustomRole {
  id: string;
  company_id: string;
  role_key: string;
  label: string;
  description: string | null;
  base_role: string | null;
  created_by: string | null;
  created_at: string;
}

// SaaS-provided role labels (used in UI alongside custom roles)
export const SAAS_ROLE_LABELS: Record<string, string> = {
  superviseur: 'Superviseur / Chef comptable',
  comptable: 'Comptable',
  tresorier: 'Trésorier',
  caissier: 'Caissier',
  manager: 'Manager / Direction',
  auditeur: 'Auditeur',
  controleur: 'Contrôleur interne',
  consultant: 'Consultant externe',
};

// Row in company_role_permissions table
export interface CompanyRolePermission {
  id: string;
  company_id: string;
  role: string;
  permission: Permission;
  granted: boolean;
  expires_at: string | null;
  granted_by: string | null;
  created_at: string;
  updated_at: string;
}

// Row in user_role_assignments table (multi-role fusion)
export interface UserRoleAssignment {
  id: string;
  user_id: string;
  company_id: string;
  role: string;
  is_primary: boolean;
  assigned_by: string | null;
  assigned_at: string;
  expires_at: string | null;
}

// --- Entreprise ---
export interface Company {
  id: string;
  name: string;
  ifu: string;
  rccm: string;
  address_cadastral: string;
  address?: string | null;
  phone: string;
  email: string;
  bank_accounts: BankAccount[];
  tax_office: string;
  fiscal_profile: FiscalProfile;
  fiscal_config: FiscalConfig | null;
  logo_url: string | null;
  invoice_settings: InvoiceSettings | null;
  ai_model: string | null;
  ai_fallback_model: string | null;
  ai_system_prompt: string | null;
  ai_enabled: boolean;
  openrouter_api_key: string | null;
  ai_routing: AiRouting | null;
  chatbot_enabled: boolean;
  qr_scan_base_url: string | null;
  stirling_api_url: string | null;
  stirling_api_key: string | null;
  is_active: boolean;
  created_at: string;
}

// --- Routage IA par tâche ---
export type AiTaskType =
  | 'assistant_fiscal'
  | 'analyse_facture'
  | 'resume_rapport'
  | 'suggestion_fiscale'
  | 'classification_depense'
  | 'detection_anomalie'
  | 'bank_statement_ocr';

export interface AiTaskRoute {
  model: string;
  fallback: string | null;
  temperature: number;
  max_tokens: number;
  enabled: boolean;
}

export type AiRouting = Record<AiTaskType, AiTaskRoute>;

// --- AI Usage Tracking ---
export interface AiUsageLog {
  id: string;
  company_id: string;
  user_id: string;
  model: string;
  task: string;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  latency_ms: number;
  status: 'success' | 'error' | 'moderated';
  is_fallback: boolean;
  error_message: string | null;
  moderation_flagged: boolean;
  moderation_reason: string | null;
  cost_usd: number;
  created_at: string;
  task_code?: string;
  model_name?: string;
  cost_billed_usd?: number;
  funding_source?: string;
  langfuse_trace_id?: string;
  litellm_request_id?: string;
  request_metadata?: Record<string, any>;
  response_metadata?: Record<string, any>;
  pii_redacted?: boolean;
  pii_entities_count?: number;
}

export interface AiUsageByModel {
  model: string;
  requests: number;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  errors: number;
  moderations: number;
  cost_usd: number;
}

export interface AiUsageByCompany {
  company_id: string;
  company_name: string;
  requests: number;
  tokens_input: number;
  tokens_output: number;
  tokens_total: number;
  errors: number;
  moderations: number;
  cost_usd: number;
  models_used: string[];
}

export interface BankAccount {
  bank_name: string;
  account_number: string;
  iban: string;
}

export interface InvoiceColors {
  primary: string;
  header_bg: string;
  header_text: string;
  row_odd_bg: string;
  row_even_bg: string;
  row_text: string;
  total_bg: string;
  total_text: string;
  cert_border: string;
  cert_title: string;
}

export interface InvoiceSettings {
  show_logo: boolean;
  logo_position: 'left' | 'center' | 'right';
  colors: Partial<InvoiceColors>;
}

// --- Profil utilisateur ---
export interface UserProfile {
  id: string;
  user_id: string;
  company_id: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  two_fa_enabled?: boolean;
  created_at: string;
}

// --- Profil fiscal modulable par SaaS ---
export type FiscalProfile = 'BF' | 'GENERIC';
export type TaxCategory = 'BIC' | 'BNC' | 'BA' | 'IS';
export type TaxSubRegime = 'RNI' | 'RSI' | 'CME' | 'CSE' | 'ND';

export interface TaxGroupConfig {
  description: string;
  tva: number;
  psvb: number;
}

export interface StampDutyThreshold {
  max: number | null;
  amount: number;
}

export interface FiscalConfig {
  country: string;
  currency: string;
  currency_label: string;
  tax_category: TaxCategory | null;
  tax_sub_regime: TaxSubRegime | null;
  tax_groups: Record<string, TaxGroupConfig>;
  psvb_enabled: boolean;
  psvb_label: string;
  stamp_duty_enabled: boolean;
  stamp_duty_thresholds: StampDutyThreshold[];
  invoice_types: string[];
  client_types: string[];
  article_types: string[];
}

// --- Types de factures ---
export type InvoiceType = 'FV' | 'FT' | 'FA' | 'EV' | 'ET' | 'EA' | 'PF';
export type InvoiceStatus =
  | 'draft'
  | 'pending_validation'
  | 'approved'
  | 'validated'
  | 'certified'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'cancelled';
export type PriceMode = 'HT' | 'TTC';

// --- Types d'articles ---
export type ArticleType = 'LOCBIE' | 'LOCSER' | 'IMPBIE' | 'IMPSER';

export interface Article {
  id: string;
  company_id: string;
  code: string;
  name: string;
  type: ArticleType;
  tax_group: TaxGroup;
  unit_price: number;
  specific_tax: number;
  is_active: boolean;
  created_at: string;
}

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
  is_active: boolean;
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
  credit_note_nature: 'COR' | 'RAN' | 'RAM' | 'RRR' | null;
  operator_name: string;
  description?: string | null;
  comments: InvoiceComment[];
  tax_calculation: TaxCalculationResult | null;
  total_ht: number;
  total_tva: number;
  total_psvb: number;
  total_ttc: number;
  stamp_duty: number;
  total_payment: number;
  mcf_uid: string | null;
  fiscal_number: string | null;
  code_secef_dgi: string | null;
  qr_code: string | null;
  signature: string | null;
  nim: string | null;
  counters: string | null;
  certification_datetime: string | null;
  proforma_converted_to: string | null;
  pdf_url: string | null;
  created_at: string;
  validated_at: string | null;
  certified_at: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
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
  totalHT: Record<string, number>;
  tva: Record<string, number>;
  psvb: Record<string, number>;
  totalTTC: number;
  stampDuty: number;
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
  company_id: string;
  account_id: string;
  invoice_id: string | null;
  amount: number;
  type: TreasuryMovementType;
  description: string;
  payment_type: string;
  reference: string | null;
  created_at: string;
}

// --- Chatbot API ---
export type ChatbotChannel = 'whatsapp' | 'telegram' | 'email' | 'sms' | 'api' | 'webhook';

export type ChatbotAction =
  | 'view_invoices'
  | 'create_invoice'
  | 'view_clients'
  | 'create_client'
  | 'view_treasury'
  | 'create_treasury_movement'
  | 'view_reports'
  | 'view_audit_log'
  | 'ai_assistant'
  | 'view_dashboard';

export const CHATBOT_ACTION_LABELS: Record<ChatbotAction, { label: string; description: string; icon: string; category: string }> = {
  view_invoices: { label: 'Consulter les factures', description: 'Lister, rechercher et voir les détails des factures', icon: 'receipt_long', category: 'Facturation' },
  create_invoice: { label: 'Créer une facture', description: 'Créer et soumettre de nouvelles factures', icon: 'add_circle', category: 'Facturation' },
  view_clients: { label: 'Consulter les clients', description: 'Lister et rechercher les clients', icon: 'people', category: 'Clients' },
  create_client: { label: 'Créer un client', description: 'Ajouter de nouveaux clients', icon: 'person_add', category: 'Clients' },
  view_treasury: { label: 'Consulter la trésorerie', description: 'Voir les comptes et soldes de trésorerie', icon: 'account_balance', category: 'Trésorerie' },
  create_treasury_movement: { label: 'Mouvement de trésorerie', description: 'Enregistrer des mouvements de trésorerie', icon: 'swap_horiz', category: 'Trésorerie' },
  view_reports: { label: 'Consulter les rapports', description: 'Voir les KPIs et rapports de synthèse', icon: 'assessment', category: 'Rapports' },
  view_audit_log: { label: 'Journal d\'audit', description: 'Consulter le journal d\'audit', icon: 'history', category: 'Audit' },
  ai_assistant: { label: 'Assistant IA', description: 'Poser des questions à l\'assistant fiscal IA', icon: 'smart_toy', category: 'IA' },
  view_dashboard: { label: 'Tableau de bord', description: 'Obtenir les KPIs du tableau de bord', icon: 'dashboard', category: 'Général' },
};

export const ALL_CHATBOT_ACTIONS: ChatbotAction[] = [
  'view_invoices', 'create_invoice', 'view_clients', 'create_client',
  'view_treasury', 'create_treasury_movement', 'view_reports',
  'view_audit_log', 'ai_assistant', 'view_dashboard',
];

export const CHATBOT_CHANNELS: { value: ChatbotChannel; label: string; icon: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
  { value: 'telegram', label: 'Telegram', icon: 'send' },
  { value: 'email', label: 'Email', icon: 'email' },
  { value: 'sms', label: 'SMS', icon: 'sms' },
  { value: 'api', label: 'API REST', icon: 'api' },
  { value: 'webhook', label: 'Webhook', icon: 'webhook' },
];

export interface ChatbotApiKey {
  id: string;
  company_id: string;
  name: string;
  api_key_hash: string;
  api_key_prefix: string;
  channels: ChatbotChannel[];
  is_active: boolean;
  expires_at: string | null;
  rate_limit_per_hour: number;
  last_used_at: string | null;
  created_at: string;
  created_by: string | null;
  permissions?: ChatbotPermission[];
}

export interface ChatbotPermission {
  id: string;
  api_key_id: string;
  company_id: string;
  action: ChatbotAction;
  enabled: boolean;
  valid_from: string | null;
  valid_until: string | null;
  rate_limit_per_hour: number | null;
  conditions: Record<string, unknown>;
  created_at: string;
}

export interface ChatbotConversation {
  id: string;
  company_id: string;
  api_key_id: string | null;
  channel: ChatbotChannel;
  external_id: string | null;
  external_user: string | null;
  status: 'active' | 'closed' | 'blocked';
  metadata: Record<string, unknown>;
  started_at: string;
  last_message_at: string;
  messages_count?: number;
}

export interface ChatbotMessage {
  id: string;
  conversation_id: string;
  company_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  action_requested: ChatbotAction | null;
  action_payload: Record<string, unknown> | null;
  action_result: Record<string, unknown> | null;
  action_status: 'pending' | 'success' | 'denied' | 'error' | null;
  tokens_used: number;
  created_at: string;
}

export interface ChatbotUsageStats {
  total_conversations: number;
  total_messages: number;
  active_keys: number;
  actions_executed: number;
  actions_denied: number;
  by_channel: Record<ChatbotChannel, number>;
  by_action: Record<string, number>;
}

// =============================================================================
// MODULE BANQUE — Sprint 1
// =============================================================================

export interface BankAccountFull {
  id: string;
  company_id: string;
  bank_name: string;
  bank_code: string | null;
  account_number: string;
  iban: string | null;
  bic: string | null;
  currency: string;
  account_holder: string | null;
  opening_balance: number;
  current_balance: number;
  is_active: boolean;
  treasury_account_id: string | null;
  created_at: string;
  updated_at: string;
}

export type TransactionDirection = 'debit' | 'credit';
export type ReconciliationStatus = 'unreconciled' | 'matched' | 'manual' | 'ignored';

export interface BankTransaction {
  id: string;
  bank_account_id: string;
  company_id: string;
  transaction_date: string;
  value_date: string | null;
  amount: number;
  direction: TransactionDirection;
  label: string;
  reference: string | null;
  category_id: string | null;
  reconciliation_status: ReconciliationStatus;
  matched_invoice_id: string | null;
  matched_movement_id: string | null;
  import_batch_id: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
  category?: TransactionCategory;
}

export interface TransactionCategory {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  type: 'income' | 'expense' | 'transfer' | 'tax' | 'bank_fee' | null;
  parent_id: string | null;
  color: string | null;
  is_system: boolean;
  created_at: string;
}

export type StatementImportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type StatementFileFormat = 'OFX' | 'CSV' | 'QIF' | 'PDF' | 'XLSX';

export interface BankStatementImport {
  id: string;
  company_id: string;
  bank_account_id: string;
  file_name: string | null;
  file_format: StatementFileFormat | null;
  total_rows: number;
  imported_rows: number;
  duplicates_count: number;
  errors_count: number;
  status: StatementImportStatus;
  imported_by: string | null;
  file_url: string | null;
  error_details: Record<string, unknown> | null;
  created_at: string;
}

export type WireTransferStatus = 'draft' | 'approved' | 'sent' | 'executed' | 'failed' | 'cancelled';

export interface WireTransfer {
  id: string;
  company_id: string;
  reference: string;
  source_bank_account_id: string;
  beneficiary_name: string;
  beneficiary_iban: string | null;
  beneficiary_bic: string | null;
  beneficiary_bank: string | null;
  amount: number;
  currency: string;
  motif: string | null;
  status: WireTransferStatus;
  scheduled_date: string | null;
  executed_date: string | null;
  invoice_id: string | null;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sepa_xml_generated_at: string | null;
  created_at: string;
}

export type CheckType = 'emitted' | 'received';
export type CheckStatus = 'in_circulation' | 'cashed' | 'bounced' | 'cancelled' | 'endorsed';

export interface Check {
  id: string;
  company_id: string;
  type: CheckType;
  check_number: string;
  bank_account_id: string | null;
  amount: number;
  issue_date: string;
  due_date: string | null;
  beneficiary_name: string | null;
  drawer_name: string | null;
  status: CheckStatus;
  cashed_date: string | null;
  invoice_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface ReconciliationRule {
  id: string;
  company_id: string;
  name: string;
  pattern_label: string | null;
  pattern_amount_min: number | null;
  pattern_amount_max: number | null;
  category_id: string | null;
  auto_match_invoice: boolean;
  priority: number;
  is_active: boolean;
  created_at: string;
}

export interface AutoReconcileResult {
  transaction_id: string;
  match_type: 'exact_reference' | 'amount_date_name' | 'user_rule';
  match_id: string;
  score: number;
  match_label: string;
}

export type MatchType = AutoReconcileResult['match_type'];

// =============================================================================
// SPRINT 2 — Factures reçues, Fournisseurs, Paiements, Créances, Relances
// =============================================================================

export type InvoiceDirection     = 'issued' | 'received';
export type InvoicePaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overpaid' | 'cancelled';
export type FiscalComplianceStatus = 'pending' | 'valid' | 'invalid' | 'unchecked';
export type InvoicePaymentMethod = 'bank_transfer' | 'cash' | 'check' | 'mobile_money' | 'card' | 'other';
export type ReminderChannel      = 'email' | 'sms' | 'whatsapp';

export interface Supplier {
  id: string;
  company_id: string;
  name: string;
  ifu: string | null;
  rccm: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  country: string;                          // code ISO 2 lettres (BF, CI, SN…)
  payment_terms_days: number;
  bank_name: string | null;
  bank_iban: string | null;
  bank_bic: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // ── Champs fiscaux (migration 2026-05-30) ───────────────────────────────────
  regime_fiscal:    string | null;          // RNI, RSI, CME, CSE, RND
  division_fiscale: string | null;          // DME-CV, DGE, DME-Centre…
  supplier_code:    string | null;          // code interne optionnel
  supplier_type:    'local' | 'foreign' | null; // Local / Étranger
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  company_id: string;
  payment_date: string;
  amount: number;
  payment_method: InvoicePaymentMethod;
  reference: string | null;
  bank_account_id: string | null;
  bank_transaction_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ReminderTemplate {
  id: string;
  company_id: string;
  name: string;
  trigger_days: number;
  channel: ReminderChannel;
  subject: string | null;
  body_template: string;
  is_active: boolean;
  send_order: number;
  created_at: string;
  updated_at: string;
}

export interface ReminderLog {
  id: string;
  company_id: string;
  invoice_id: string;
  template_id: string | null;
  channel: ReminderChannel;
  recipient: string | null;
  subject: string | null;
  body: string | null;
  status: 'sent' | 'failed' | 'delivered' | 'read';
  sent_at: string;
  error_message: string | null;
}

export interface ClientReceivable {
  client_id: string;
  company_id: string;
  client_name: string;
  client_email: string | null;
  total_invoices: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  bucket_0_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_over_90: number;
  latest_due_date: string | null;
  oldest_unpaid_due: string | null;
}

// =============================================================================
// SPRINT 3 — Budgets & Prévisionnel (T4.x)
// =============================================================================

export type BudgetStatus = 'draft' | 'active' | 'closed' | 'archived';
export type BudgetPeriodType = 'monthly' | 'quarterly' | 'yearly' | 'custom';
export type BudgetLineType = 'income' | 'expense';

export interface Budget {
  id: string;
  company_id: string;
  name: string;
  period_type: BudgetPeriodType;
  fiscal_year: number;
  period_start: string;
  period_end: string;
  total_planned: number;
  total_actual: number;
  status: BudgetStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetLine {
  id: string;
  budget_id: string;
  company_id: string;
  category_id: string | null;
  label: string | null;
  line_type: BudgetLineType;
  planned_amount: number;
  actual_amount: number;
  alert_threshold_pct: number;
  alert_sent_at: string | null;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Vue v_budget_vs_actual
export interface BudgetVsActual {
  budget_line_id: string;
  budget_id: string;
  company_id: string;
  category_id: string | null;
  label: string | null;
  line_type: BudgetLineType;
  planned_amount: number;
  stored_actual: number;
  computed_actual: number;
  variance: number;
  consumption_pct: number;
  alert_threshold_pct: number;
  alert_triggered: boolean;
  period_start: string;
  period_end: string;
  budget_name: string;
  fiscal_year: number;
  budget_status: BudgetStatus;
}

// Input forms
export interface BudgetInput {
  name: string;
  period_type: BudgetPeriodType;
  fiscal_year: number;
  period_start: string;
  period_end: string;
  status: BudgetStatus;
  notes?: string | null;
}

export interface BudgetLineInput {
  category_id?: string | null;
  label?: string | null;
  line_type: BudgetLineType;
  planned_amount: number;
  alert_threshold_pct?: number;
  sort_order?: number;
  notes?: string | null;
}

// =============================================================================
// SPRINT 3 — Trésorerie prévisionnelle (T5.x)
// =============================================================================

export type CashflowMethod = 'historical' | 'manual' | 'hybrid' | 'ml';

export interface CashflowDataPoint {
  date: string;
  inflows: number;
  outflows: number;
  net: number;
  cumulative_balance: number;
  is_risk: boolean;
  label?: string;
}

export type ScenarioAssumptionType =
  | 'payment_delay'
  | 'supplier_delay'
  | 'new_loan'
  | 'new_expense'
  | 'revenue_change'
  | 'custom';

export interface ScenarioAssumption {
  type: ScenarioAssumptionType;
  label: string;
  amount?: number;
  days?: number;
  start_date?: string;
  recurring?: boolean;
  category_id?: string;
}

export interface CashflowForecast {
  id: string;
  company_id: string;
  name: string;
  horizon_days: number;
  method: CashflowMethod;
  base_date: string;
  generated_at: string;
  data: CashflowDataPoint[];
  total_inflows: number;
  total_outflows: number;
  ending_balance: number;
  low_cash_alert: boolean;
  low_cash_threshold: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashflowScenario {
  id: string;
  company_id: string;
  forecast_id: string | null;
  name: string;
  description: string | null;
  assumptions: ScenarioAssumption[];
  result: CashflowDataPoint[] | null;
  total_impact: number;
  is_base_scenario: boolean;
  created_at: string;
  updated_at: string;
}

export interface CashflowForecastInput {
  name: string;
  horizon_days: number;
  method: CashflowMethod;
  base_date: string;
  low_cash_threshold?: number;
  notes?: string | null;
}

export interface CashflowScenarioInput {
  forecast_id?: string | null;
  name: string;
  description?: string | null;
  assumptions: ScenarioAssumption[];
  is_base_scenario?: boolean;
}

// =============================================================================
// SPRINT 4 — Immobilisations (EPIC 6)
// =============================================================================

export type DepreciationMethod = 'linear' | 'degressive' | 'units';
export type AssetStatus = 'in_service' | 'disposed' | 'sold' | 'scrapped';

export interface AssetCategory {
  id: string;
  company_id: string;
  name: string;
  default_depreciation_method: DepreciationMethod;
  default_useful_life_years: number | null;
  default_residual_value_pct: number;
  accounting_code: string | null;
  notes: string | null;
  created_at: string;
}

export interface FixedAsset {
  id: string;
  company_id: string;
  category_id: string | null;
  reference: string;
  name: string;
  description: string | null;
  acquisition_date: string;
  acquisition_value: number;
  residual_value: number;
  useful_life_years: number;
  depreciation_method: DepreciationMethod;
  degressive_rate: number;
  supplier_id: string | null;
  invoice_id: string | null;
  location: string | null;
  status: AssetStatus;
  disposal_date: string | null;
  disposal_value: number | null;
  net_book_value: number | null;
  accumulated_depreciation: number;
  created_at: string;
  updated_at: string;
}

export interface AssetDepreciationEntry {
  id: string;
  asset_id: string;
  company_id: string;
  period_year: number;
  period_month: number | null;
  annuity: number;
  accumulated: number;
  net_book_value: number;
  is_posted: boolean;
  posted_at: string | null;
  created_at: string;
}

export interface FixedAssetInput {
  category_id?: string | null;
  reference: string;
  name: string;
  description?: string | null;
  acquisition_date: string;
  acquisition_value: number;
  residual_value?: number;
  useful_life_years: number;
  depreciation_method: DepreciationMethod;
  degressive_rate?: number;
  supplier_id?: string | null;
  invoice_id?: string | null;
  location?: string | null;
}

// =============================================================================
// SPRINT 4 — Emprunts (EPIC 7)
// =============================================================================

export type LenderType = 'bank' | 'mfi' | 'government' | 'partner' | 'individual' | 'other';
export type RateType = 'fixed' | 'variable';
export type PaymentFrequency = 'monthly' | 'quarterly' | 'semiannual' | 'annual';
export type AmortizationMethod = 'constant_annuity' | 'constant_principal' | 'bullet' | 'custom';
export type LoanStatus = 'draft' | 'active' | 'paid_off' | 'defaulted' | 'restructured';

export interface Loan {
  id: string;
  company_id: string;
  reference: string;
  lender_name: string;
  lender_type: LenderType;
  principal_amount: number;
  currency: string;
  interest_rate: number;
  rate_type: RateType;
  duration_months: number;
  start_date: string;
  first_payment_date: string;
  payment_frequency: PaymentFrequency;
  amortization_method: AmortizationMethod;
  bank_account_id: string | null;
  status: LoanStatus;
  outstanding_balance: number | null;
  total_interest_paid: number;
  total_principal_paid: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanScheduleEntry {
  id: string;
  loan_id: string;
  company_id: string;
  installment_number: number;
  due_date: string;
  principal: number;
  interest: number;
  total: number;
  remaining_balance: number;
  is_paid: boolean;
  paid_at: string | null;
  paid_amount: number | null;
  bank_transaction_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface LoanInput {
  reference: string;
  lender_name: string;
  lender_type: LenderType;
  principal_amount: number;
  currency?: string;
  interest_rate: number;
  rate_type?: RateType;
  duration_months: number;
  start_date: string;
  first_payment_date: string;
  payment_frequency?: PaymentFrequency;
  amortization_method?: AmortizationMethod;
  bank_account_id?: string | null;
  notes?: string | null;
}

export interface DebtRatio {
  company_id: string;
  company_name: string;
  total_outstanding_debt: number;
  total_initial_debt: number;
  revenue_12m: number;
  debt_to_revenue_pct: number;
}

// =============================================================================
// SPRINT 4 — Investissements (EPIC 8)
// =============================================================================

export type InvestmentType = 'stocks' | 'bonds' | 'real_estate' | 'mutual_fund' | 'term_deposit' | 'crypto' | 'other';
export type InvestmentStatus = 'active' | 'sold' | 'matured' | 'defaulted';

export interface Investment {
  id: string;
  company_id: string;
  type: InvestmentType;
  name: string;
  ticker: string | null;
  quantity: number | null;
  purchase_price: number;
  purchase_date: string;
  current_price: number | null;
  current_value: number | null;
  total_invested: number;
  currency: string;
  bank_account_id: string | null;
  broker_name: string | null;
  status: InvestmentStatus;
  sold_date: string | null;
  sold_price: number | null;
  sold_value: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvestmentValuation {
  id: string;
  investment_id: string;
  company_id: string;
  valuation_date: string;
  price: number;
  total_value: number;
  source: string | null;
  notes: string | null;
  created_at: string;
}

export interface InvestmentInput {
  type: InvestmentType;
  name: string;
  ticker?: string | null;
  quantity?: number | null;
  purchase_price: number;
  purchase_date: string;
  total_invested: number;
  currency?: string;
  bank_account_id?: string | null;
  broker_name?: string | null;
  notes?: string | null;
}

// =============================================
// SPRINT 5 — Petite caisse, Wallets mobiles, Workflows
// =============================================

// --- Petite caisse ---

export interface PettyCashAccount {
  id: string;
  company_id: string;
  name: string;
  manager_user_id: string | null;
  ceiling_amount: number | null;
  current_balance: number;
  treasury_account_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PettyCashAccountInput {
  name: string;
  manager_user_id?: string | null;
  ceiling_amount?: number | null;
  treasury_account_id?: string | null;
}

export interface PettyCashMovement {
  id: string;
  petty_cash_id: string;
  company_id: string;
  direction: 'in' | 'out';
  amount: number;
  category_id: string | null;
  label: string;
  supporting_doc_url: string | null;
  movement_date: string;
  recorded_by: string | null;
  treasury_movement_id: string | null;
  created_at: string;
}

export interface PettyCashMovementInput {
  petty_cash_id: string;
  direction: 'in' | 'out';
  amount: number;
  label: string;
  movement_date: string;
  category_id?: string | null;
  supporting_doc_url?: string | null;
  recorded_by?: string | null;
}

export interface PettyCashSummary {
  id: string;
  company_id: string;
  name: string;
  manager_user_id: string | null;
  ceiling_amount: number | null;
  current_balance: number;
  is_active: boolean;
  movement_count: number;
  last_movement_date: string | null;
  total_in: number;
  total_out: number;
}

// --- Approvisionnements & Approbations ---

export type ReplenishmentStatus =
  | 'pending'
  | 'approved_l1'
  | 'approved_l2'
  | 'approved_final'
  | 'rejected'
  | 'disbursed'
  | 'cancelled';

export interface ReplenishmentRequest {
  id: string;
  company_id: string;
  target_type: 'petty_cash' | 'mobile_wallet';
  target_id: string;
  amount: number;
  reason: string;
  status: ReplenishmentStatus;
  current_level: number;
  required_levels: number;
  requested_by: string;
  requested_at: string;
  disbursed_at: string | null;
  source_account_id: string | null;
}

export interface ReplenishmentRequestInput {
  target_type: 'petty_cash' | 'mobile_wallet';
  target_id: string;
  amount: number;
  reason: string;
  required_levels?: number;
  source_account_id?: string | null;
}

export interface ReplenishmentApproval {
  id: string;
  request_id: string;
  level: number;
  approver_id: string;
  decision: 'approved' | 'rejected';
  comment: string | null;
  decided_at: string;
}

export interface ApprovalWorkflow {
  id: string;
  company_id: string;
  domain: string;
  threshold_amount: number;
  required_levels: number;
  approver_role_l1: string | null;
  approver_role_l2: string | null;
  approver_role_l3: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ApprovalWorkflowInput {
  domain: string;
  threshold_amount: number;
  required_levels: number;
  approver_role_l1?: string | null;
  approver_role_l2?: string | null;
  approver_role_l3?: string | null;
}

// --- Wallets mobiles ---

export type MobileWalletProvider =
  | 'orange_money'
  | 'moov_money'
  | 'wave'
  | 'mtn_momo'
  | 'airtel_money'
  | 'other';

export type MobileWalletTransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'transfer_in'
  | 'transfer_out'
  | 'payment'
  | 'fee';

export interface MobileWallet {
  id: string;
  company_id: string;
  provider: MobileWalletProvider;
  phone_number: string;
  account_name: string | null;
  current_balance: number;
  treasury_account_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MobileWalletInput {
  provider: MobileWalletProvider;
  phone_number: string;
  account_name?: string | null;
  treasury_account_id?: string | null;
}

export interface MobileWalletTransaction {
  id: string;
  wallet_id: string;
  company_id: string;
  type: MobileWalletTransactionType;
  amount: number;
  fees: number;
  counterparty_phone: string | null;
  counterparty_name: string | null;
  external_transaction_id: string | null;
  transaction_date: string;
  status: string;
  treasury_movement_id: string | null;
  created_at: string;
}

export interface MobileWalletTransactionInput {
  wallet_id: string;
  type: MobileWalletTransactionType;
  amount: number;
  transaction_date: string;
  fees?: number;
  counterparty_phone?: string | null;
  counterparty_name?: string | null;
  external_transaction_id?: string | null;
  status?: string;
}

export interface MobileWalletSummary {
  id: string;
  company_id: string;
  provider: MobileWalletProvider;
  phone_number: string;
  account_name: string | null;
  current_balance: number;
  is_active: boolean;
  transaction_count: number;
  last_transaction_date: string | null;
  total_in: number;
  total_out: number;
  total_fees: number;
}

// =====================================================================
// SPRINT 6 - Reporting & Exports
// =====================================================================

export interface BalanceSheet {
  company_id: string;
  company_name: string;
  // Actif
  immobilisations_nettes: number;
  creances_clients: number;
  tresorerie_banque: number;
  tresorerie_caisse: number;
  tresorerie_wallets: number;
  placements_financiers: number;
  total_actif: number;
  // Passif
  dettes_fournisseurs: number;
  dettes_financieres: number;
  capitaux_propres: number;
  total_passif: number;
  as_of: string;
}

export interface IncomeStatement {
  company_id: string;
  year: number;
  month?: number;
  chiffre_affaires: number;
  charges_externes: number;
  dotations_amortissements: number;
  charges_financieres: number;
  impots_taxes: number;
  total_produits: number;
  total_charges: number;
  resultat_net: number;
}

export type QueryFilterOperator =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'like' | 'ilike' | 'in' | 'is_null' | 'not_null'
  | 'between';

export type QueryFilterValue = string | number | null;

export interface QueryFilter {
  field: string;
  operator: QueryFilterOperator;
  value?: QueryFilterValue;
  value2?: QueryFilterValue;
}

export type QueryAggregationFn = 'sum' | 'avg' | 'count' | 'min' | 'max';

export interface QueryAggregation {
  field: string;
  fn: QueryAggregationFn;
  alias?: string;
}

export interface QueryOrderBy {
  field: string;
  direction: 'asc' | 'desc';
}

export type QueryChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'table';

export interface SavedQuery {
  id: string;
  company_id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  source_table: string;
  fields: string[];
  filters: QueryFilter[];
  group_by: string[];
  order_by: QueryOrderBy[];
  aggregations: QueryAggregation[];
  chart_type: QueryChartType | null;
  chart_config: Record<string, unknown> | null;
  is_shared: boolean;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedQueryInput {
  name: string;
  description?: string | null;
  source_table: string;
  fields?: string[];
  filters?: QueryFilter[];
  group_by?: string[];
  order_by?: QueryOrderBy[];
  aggregations?: QueryAggregation[];
  chart_type?: QueryChartType | null;
  chart_config?: Record<string, unknown> | null;
  is_shared?: boolean;
  is_favorite?: boolean;
}

export type DashboardWidgetType =
  | 'kpi' | 'chart' | 'table' | 'saved_query' | 'text';

export interface DashboardWidget {
  id: string;
  type: DashboardWidgetType;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  saved_query_id?: string | null;
  config?: Record<string, unknown>;
}

export interface CustomDashboard {
  id: string;
  company_id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  layout: DashboardWidget[];
  is_default: boolean;
  is_shared: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomDashboardInput {
  name: string;
  description?: string | null;
  layout?: DashboardWidget[];
  is_default?: boolean;
  is_shared?: boolean;
}

export type ReportType =
  | 'balance_sheet' | 'income_statement' | 'cashflow' | 'aged_receivables'
  | 'tax_summary' | 'budget_vs_actual' | 'saved_query' | 'custom';

export type ReportFormat = 'csv' | 'xlsx' | 'pdf' | 'json';

export type ReportExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'expired';

export interface ReportExport {
  id: string;
  company_id: string;
  user_id: string | null;
  report_type: ReportType;
  format: ReportFormat;
  parameters: Record<string, unknown> | null;
  file_url: string | null;
  status: ReportExportStatus;
  error_message: string | null;
  generated_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface ReportExportInput {
  report_type: ReportType;
  format: ReportFormat;
  parameters?: Record<string, unknown>;
}

// =============================================================================
// AI — Types Sprint AI pré-travail
// =============================================================================
export interface AiProvider {
  id: string;
  name: string;
  slug: string;
  base_url: string | null;
  supports_byok: boolean;
  is_active: boolean;
  logo_url: string | null;
  created_at: string;
}

export interface AiModel {
  id: string;
  provider_id: string;
  name: string;
  api_identifier: string;
  category: 'chat' | 'vision' | 'embedding' | 'image_gen';
  input_cost_per_1k: number;
  output_cost_per_1k: number;
  max_tokens: number;
  is_active: boolean;
  created_at: string;
}

export interface AiTask {
  id: string;
  code: string;
  name: string;
  category?: string;
  description?: string | null;
  default_model_id?: string;
  is_active?: boolean;
  created_at?: string;
}

export interface CompanyAiCredential {
  id: string;
  company_id: string;
  provider_id: string;
  api_key_encrypted: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CompanyAiTaskRouting {
  id: string;
  company_id: string;
  task_id: string;
  model_id: string;
  provider_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AiCreditPack {
  id: string;
  code: string;
  name: string;
  credits_usd: number;
  price_xof: number;
  price_usd?: number;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

export interface CompanyAiQuotaUsage {
  id: string;
  company_id: string;
  period_month: string;
  monthly_quota_usd: number;
  used_usd: number;
  created_at: string;
  quota_cap_usd?: number;
  consumed_usd?: number;
}

export interface CompanyAiCredits {
  id: string;
  company_id: string;
  balance_usd: number;
  last_updated_at: string;
  created_at: string;
}


