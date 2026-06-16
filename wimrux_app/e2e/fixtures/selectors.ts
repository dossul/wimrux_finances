/**
 * Sélecteurs centralisés data-testid — WIMRUX® Finances
 * Alignés avec les data-testid réellement présents dans les composants Vue.
 */

// ===================== AUTH =====================
export const AUTH = {
  emailInput: '[data-testid="login-email"]',
  passwordInput: '[data-testid="login-password"]',
  submitBtn: '[data-testid="login-submit"]',
  otpInput: '[data-testid="otp-input"]',
  otpSubmit: '[data-testid="otp-submit"]',
  otpPhoneDisplay: '[data-testid="otp-phone-display"]',
  forgotLink: '[data-testid="forgot-password-link"]',
  // Register
  regIfu: '[data-testid="reg-ifu"]',
  regFullname: '[data-testid="reg-fullname"]',
  regEmail: '[data-testid="reg-email"]',
  regPassword: '[data-testid="reg-password"]',
  regRole: '[data-testid="reg-role"]',
  regSubmit: '[data-testid="reg-submit"]',
} as const;

// ===================== NAVIGATION =====================
export const NAV = {
  sidebar: '[data-testid="main-sidebar"]',
  invoices: '[data-testid="nav-invoices"]',
  clients: '[data-testid="nav-clients"]',
  treasury: '[data-testid="nav-treasury"]',
  reports: '[data-testid="nav-reports"]',
  aiAssistant: '[data-testid="nav-ai-assistant"]',
  audit: '[data-testid="nav-audit"]',
  settings: '[data-testid="nav-settings"]',
  userMenu: '[data-testid="user-menu"]',
  logoutBtn: '[data-testid="logout-btn"]',
  userFullname: '[data-testid="user-fullname"]',
} as const;

// ===================== INVOICES =====================
export const INVOICE = {
  newBtn: '[data-testid="invoice-new-btn"]',
  typeSelect: '[data-testid="invoice-type-select"]',
  typeOption: (type: string) => `[data-testid="invoice-type-${type}"]`,
  clientSelect: '[data-testid="invoice-client-select"]',
  description: '[data-testid="invoice-description"]',
  priceModeHt: '[data-testid="price-mode-ht"]',
  priceModeTtc: '[data-testid="price-mode-ttc"]',
  itemDesignation: (i: number) => `[data-testid="item-designation-${i}"]`,
  itemQty: (i: number) => `[data-testid="item-qty-${i}"]`,
  itemPrice: (i: number) => `[data-testid="item-price-${i}"]`,
  itemTax: (i: number) => `[data-testid="item-tax-${i}"]`,
  addItemBtn: '[data-testid="add-item-btn"]',
  saveBtn: '[data-testid="invoice-save-btn"]',
  approveBtn: '[data-testid="invoice-approve-btn"]',
  validateBtn: '[data-testid="invoice-validate-btn"]',
  rejectBtn: '[data-testid="invoice-reject-btn"]',
  certifyBtn: '[data-testid="invoice-certify-btn"]',
  pdfBtn: '[data-testid="invoice-pdf-btn"]',
  submitBtn: '[data-testid="invoice-submit-btn"]',
  status: '[data-testid="invoice-status"]',
  number: '[data-testid="invoice-number"]',
  mcfUid: '[data-testid="mcf-uid"]',
  mcfQrcode: 'canvas[data-testid="mcf-qrcode"]',
  search: '[data-testid="invoice-search"]',
  exportCsvBtn: '[data-testid="export-csv-btn"]',
  row: '[data-testid^="invoice-row"]',
  ocrImportBtn: '[data-testid="invoice-ocr-import-btn"]',
  ocrFileInput: '[data-testid="invoice-ocr-file-input"]',
} as const;

// ===================== CLIENTS =====================
export const CLIENT = {
  newBtn: '[data-testid="client-new-btn"]',
  typePm: '[data-testid="client-type-pm"]',
  typeCc: '[data-testid="client-type-cc"]',
  name: '[data-testid="client-name"]',
  ifu: '[data-testid="client-ifu"]',
  address: '[data-testid="client-address"]',
  phone: '[data-testid="client-phone"]',
  saveBtn: '[data-testid="client-save-btn"]',
  search: '[data-testid="client-search"]',
  row: '[data-testid="client-row"]',
} as const;

// ===================== TREASURY =====================
export const TREASURY = {
  newMovementBtn: '[data-testid="treasury-new-movement-btn"]',
  movementType: '[data-testid="movement-type"]',
  movementAccount: '[data-testid="movement-account"]',
  movementAmount: '[data-testid="movement-amount"]',
  movementMode: '[data-testid="movement-mode"]',
  movementReference: '[data-testid="movement-reference"]',
  movementSaveBtn: '[data-testid="movement-save-btn"]',
  bankAccountNewBtn: '[data-testid="treasury-new-account-btn"]',
  bankAccountName: '[data-testid="bank-account-name"]',
  bankAccountType: '[data-testid="bank-account-type"]',
  bankAccountBalance: '[data-testid="bank-account-balance"]',
  bankAccountSaveBtn: '[data-testid="bank-account-save-btn"]',
} as const;

// ===================== REPORTS =====================
export const REPORT = {
  period: '[data-testid="report-period"]',
  kpiInvoiceCount: '[data-testid="kpi-invoice-count"]',
  kpiRevenueHt: '[data-testid="kpi-revenue-ht"]',
  kpiTvaCollected: '[data-testid="kpi-tva-collected"]',
  kpiTotalTtc: '[data-testid="kpi-total-ttc"]',
  chartRevenue: '[data-testid="chart-revenue"]',
  topClients: '[data-testid="top-clients"]',
  exportCsvBtn: '[data-testid="report-export-csv-btn"]',
} as const;

// ===================== SETTINGS =====================
export const SETTINGS = {
  profileFullname: '[data-testid="profile-fullname"]',
  profilePhone: '[data-testid="profile-phone"]',
  profileSaveBtn: '[data-testid="profile-save-btn"]',
  toggle2fa: '[data-testid="toggle-2fa"]',
  twoFaStatusLabel: '[data-testid="2fa-status-label"]',
  tabCompany: '[data-testid="tab-company"]',
  tabUsers: '[data-testid="tab-users"]',
  tabDevices: '[data-testid="tab-devices"]',
  tabSecurity: '[data-testid="tab-security"]',
  companyAddress: '[data-testid="company-address"]',
  companyTaxRate: '[data-testid="company-tax-rate"]',
  companyLogoInput: '[data-testid="company-logo-input"]',
  companySaveBtn: '[data-testid="company-save-btn"]',
  usersTable: '[data-testid="users-table"]',
  themeColorBlue: '[data-testid="theme-color-blue"]',
  themeSaveBtn: '[data-testid="theme-save-btn"]',
} as const;

// ===================== AI =====================
export const AI = {
  input: '[data-testid="ai-input"]',
  sendBtn: '[data-testid="ai-send-btn"]',
  response: '[data-testid="ai-response"]',
  chatInput: '[data-testid="ai-chat-input"]',
  chatSend: '[data-testid="ai-chat-send"]',
  messageAssistant: '[data-testid="ai-message-assistant"]',
  providerSelect: '[data-testid="ai-provider-select"]',
  apiKey: '[data-testid="ai-api-key"]',
  providerSaveBtn: '[data-testid="ai-provider-save-btn"]',
} as const;

// ===================== AUDIT =====================
export const AUDIT = {
  table: '[data-testid="audit-table"]',
  row: '[data-testid="audit-row"]',
  badgeImmutable: '[data-testid="audit-badge-immutable"]',
  actionFilter: '[data-testid="audit-action-filter"]',
  detailDialog: '[data-testid="audit-detail-dialog"]',
  beforeJson: '[data-testid="audit-before-json"]',
  afterJson: '[data-testid="audit-after-json"]',
} as const;

// ===================== ADMIN =====================
export const ADMIN = {
  kpiUsersCount: '[data-testid="kpi-users-count"]',
  kpiInvoicesCount: '[data-testid="kpi-invoices-count"]',
  chatbotEnabledToggle: '[data-testid="chatbot-enabled-toggle"]',
  chatbotNewKeyBtn: '[data-testid="chatbot-new-key-btn"]',
} as const;

// ===================== Quasar generic =====================
export const QUASAR = {
  notificationPositive: '.q-notification--positive',
  notificationNegative: '.q-notification--negative',
  notificationWarning: '.q-notification--warning',
  loading: '.q-loading',
  dialog: '.q-dialog .q-card',
  page: '.q-page',
  table: '.q-table',
  tableRows: '.q-table tbody tr',
} as const;
