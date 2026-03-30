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
  | 'invoices.certify'
  | 'clients.create'
  | 'clients.read'
  | 'clients.update'
  | 'clients.delete'
  | 'treasury.read'
  | 'treasury.create'
  | 'treasury.update'
  | 'reports.read'
  | 'reports.fiscal'
  | 'audit.read'
  | 'ai.use'
  | 'settings.manage'
  | 'users.manage';

export const ALL_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'invoices.create', 'invoices.read', 'invoices.submit',
  'invoices.approve', 'invoices.validate', 'invoices.certify',
  'clients.create', 'clients.read', 'clients.update', 'clients.delete',
  'treasury.read', 'treasury.create', 'treasury.update',
  'reports.read', 'reports.fiscal',
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
  'invoices.certify':   { label: 'Certifier (SECeF)',           category: 'Facturation',  icon: 'verified' },
  'clients.create':     { label: 'Créer des clients',           category: 'Clients',      icon: 'person_add' },
  'clients.read':       { label: 'Consulter les clients',       category: 'Clients',      icon: 'people' },
  'clients.update':     { label: 'Modifier les clients',        category: 'Clients',      icon: 'edit' },
  'clients.delete':     { label: 'Supprimer des clients',       category: 'Clients',      icon: 'delete' },
  'treasury.read':      { label: 'Consulter la trésorerie',     category: 'Trésorerie',   icon: 'account_balance' },
  'treasury.create':    { label: 'Créer des mouvements',        category: 'Trésorerie',   icon: 'swap_horiz' },
  'treasury.update':    { label: 'Modifier la trésorerie',      category: 'Trésorerie',   icon: 'edit' },
  'reports.read':       { label: 'Consulter les rapports',      category: 'Rapports',     icon: 'assessment' },
  'reports.fiscal':     { label: 'Rapports fiscaux',            category: 'Rapports',     icon: 'description' },
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
    'invoices.read', 'invoices.submit', 'invoices.approve', 'invoices.validate', 'invoices.certify',
    'clients.read',
    'treasury.read',
    'reports.read', 'reports.fiscal',
    'audit.read',
    'ai.use',
  ],
  comptable: [
    'dashboard.view',
    'invoices.create', 'invoices.read', 'invoices.submit',
    'clients.create', 'clients.read', 'clients.update',
    'treasury.read', 'treasury.create', 'treasury.update',
    'reports.read', 'reports.fiscal',
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
    'reports.read', 'reports.fiscal',
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
    'reports.read', 'reports.fiscal',
    'audit.read',
  ],
  consultant: [
    'dashboard.view',
    'invoices.read',
    'clients.read',
    'reports.read', 'reports.fiscal',
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
  | 'detection_anomalie';

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
  created_at: string;
}

// --- Profil fiscal modulable par SaaS ---
export type FiscalProfile = 'BF' | 'GENERIC';
export type TaxCategory = 'BIC' | 'BNC' | 'BA' | 'IS';
export type TaxSubRegime = 'RNI' | 'RSI' | 'CME' | 'CSE' | 'ND';
export type SecefType = 'MCF' | 'EMCF';

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
  secef_enabled: boolean;
  secef_type?: SecefType;
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

// --- API MCF (Module de Contrôle de Facturation) ---
export interface McfAuthRequest {
  clientId: string;
  clientSecret: string;
  nim: string;
}

export interface McfAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  ifu: string;
  nim: string;
}

export interface McfStatusResponse {
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

export interface McfSubmitResponse {
  uid: string;
  status: 'PENDING';
  taxCalculation: TaxCalculationResult;
  serverDateTime: string;
}

export interface McfConfirmResponse {
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

export interface McfErrorResponse {
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
  | 'generate_fiscal_report'
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
  generate_fiscal_report: { label: 'Rapport fiscal', description: 'Générer des rapports Z/X fiscaux', icon: 'description', category: 'Rapports' },
  view_audit_log: { label: 'Journal d\'audit', description: 'Consulter le journal d\'audit', icon: 'history', category: 'Audit' },
  ai_assistant: { label: 'Assistant IA', description: 'Poser des questions à l\'assistant fiscal IA', icon: 'smart_toy', category: 'IA' },
  view_dashboard: { label: 'Tableau de bord', description: 'Obtenir les KPIs du tableau de bord', icon: 'dashboard', category: 'Général' },
};

export const ALL_CHATBOT_ACTIONS: ChatbotAction[] = [
  'view_invoices', 'create_invoice', 'view_clients', 'create_client',
  'view_treasury', 'create_treasury_movement', 'view_reports',
  'generate_fiscal_report', 'view_audit_log', 'ai_assistant', 'view_dashboard',
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

// --- SFE Devices & MCF Logs ---
export interface SfeDevice {
  nim: string;
  ifu: string;
  name: string | null;
  status: 'ACTIF' | 'BLOQUÉ' | 'DÉSACTIVÉ';
  simulator_enabled: boolean;
  activation_counter: number;
  last_audit_remote: string | null;
  created_at: string;
  company_id: string;
  jwt_secret: string;
}

export interface McfLog {
  id: string;
  company_id: string | null;
  nim: string | null;
  endpoint: string;
  method: string;
  request_body: Record<string, unknown> | null;
  response_body: Record<string, unknown> | null;
  status_code: number;
  duration_ms: number | null;
  user_id: string | null;
  created_at: string;
}
