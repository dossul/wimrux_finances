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
  generateBtn: '[data-testid="report-generate-btn"]',
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

// ===================== SUPPLIERS =====================
export const SUPPLIER = {
  newBtn: '[data-testid="supplier-new-btn"]',
  dialog: '[data-testid="supplier-dialog"]',
  name: '[data-testid="supplier-name"]',
  ifu: '[data-testid="supplier-ifu"]',
  rccm: '[data-testid="supplier-rccm"]',
  regime: '[data-testid="supplier-regime"]',
  division: '[data-testid="supplier-division"]',
  phone: '[data-testid="supplier-phone"]',
  email: '[data-testid="supplier-email"]',
  address: '[data-testid="supplier-address"]',
  bankName: '[data-testid="supplier-bank-name"]',
  bankIban: '[data-testid="supplier-bank-iban"]',
  bankBic: '[data-testid="supplier-bank-bic"]',
  saveBtn: '[data-testid="supplier-save-btn"]',
  table: '[data-testid="suppliers-table"]',
} as const;

// ===================== BANKING =====================
export const BANKING = {
  newAccountBtn: '[data-testid="banking-new-account-btn"]',
  accountDialog: '[data-testid="banking-account-dialog"]',
  accountBankName: '[data-testid="banking-account-bank-name"]',
  accountNumber: '[data-testid="banking-account-number"]',
  accountIban: '[data-testid="banking-account-iban"]',
  accountBic: '[data-testid="banking-account-bic"]',
  accountHolder: '[data-testid="banking-account-holder"]',
  accountCurrency: '[data-testid="banking-account-currency"]',
  accountOpeningBalance: '[data-testid="banking-account-opening-balance"]',
  accountSaveBtn: '[data-testid="banking-account-save-btn"]',
  accountCard: '[data-testid="bank-account-card"]',
} as const;

// ===================== WIRE TRANSFERS =====================
export const WIRE_TRANSFER = {
  newBtn: '[data-testid="wire-transfer-new-btn"]',
  dialog: '[data-testid="wire-transfer-dialog"]',
  sourceAccount: '[data-testid="wire-transfer-source-account"]',
  beneficiary: '[data-testid="wire-transfer-beneficiary"]',
  iban: '[data-testid="wire-transfer-iban"]',
  bic: '[data-testid="wire-transfer-bic"]',
  bank: '[data-testid="wire-transfer-bank"]',
  amount: '[data-testid="wire-transfer-amount"]',
  currency: '[data-testid="wire-transfer-currency"]',
  motif: '[data-testid="wire-transfer-motif"]',
  scheduledDate: '[data-testid="wire-transfer-scheduled-date"]',
  saveBtn: '[data-testid="wire-transfer-save-btn"]',
  table: '[data-testid="wire-transfers-table"]',
} as const;

// ===================== ARTICLES =====================
export const ARTICLE = {
  newBtn: '[data-testid="article-new-btn"]',
  dialog: '[data-testid="article-dialog"]',
  code: '[data-testid="article-code"]',
  name: '[data-testid="article-name"]',
  type: '[data-testid="article-type"]',
  taxGroup: '[data-testid="article-tax-group"]',
  unitPrice: '[data-testid="article-unit-price"]',
  saveBtn: '[data-testid="article-save-btn"]',
  table: '[data-testid="articles-table"]',
} as const;

// ===================== AI CREDITS =====================
export const AI_CREDITS = {
  balance: '[data-testid="ai-credit-balance"]',
  pack: '[data-testid="ai-credit-pack"]',
  paymentMethod: '[data-testid="ai-credit-payment-method"]',
  payBtn: '[data-testid="ai-credit-pay-btn"]',
  historyTable: '[data-testid="ai-credit-history-table"]',
  confirmDialog: '.q-dialog',
} as const;

// ===================== RECEIVED INVOICES =====================
export const RECEIVED_INVOICE = {
  newBtn: '[data-testid="received-invoice-new-btn"]',
  table: '[data-testid="received-invoices-table"]',
  paymentBtn: '[data-testid="received-invoice-payment-btn"]',
  submitBtn: '[data-testid="received-invoice-submit-btn"]',
  approveBtn: '[data-testid="received-invoice-approve-btn"]',
  validateBtn: '[data-testid="received-invoice-validate-btn"]',
} as const;

// ===================== WIZARD =====================
export const WIZARD = {
  supplierSelect: '[data-testid="wizard-supplier-select"]',
  supplierInvoiceNumber: '[data-testid="wizard-supplier-invoice-number"]',
  receivedAt: '[data-testid="wizard-received-at"]',
  reference: '[data-testid="wizard-reference"]',
  type: '[data-testid="wizard-type"]',
  totalHt: '[data-testid="wizard-total-ht"]',
  totalTva: '[data-testid="wizard-total-tva"]',
  totalTtc: '[data-testid="wizard-total-ttc"]',
  nextBtn: '[data-testid="wizard-next-btn"]',
  prevBtn: '[data-testid="wizard-prev-btn"]',
  saveBtn: '[data-testid="wizard-save-btn"]',
  newSupplierBtn: '[data-testid="wizard-new-supplier-btn"]',
  supplierDialog: '[data-testid="wizard-supplier-dialog"]',
  supplierName: '[data-testid="wizard-supplier-name"]',
  supplierCreateBtn: '[data-testid="wizard-supplier-create-btn"]',
} as const;

// ===================== PAYMENT DIALOG =====================
export const PAYMENT = {
  date: '[data-testid="payment-date"]',
  amount: '[data-testid="payment-amount"]',
  method: '[data-testid="payment-method"]',
  bankAccount: '[data-testid="payment-bank-account"]',
  reference: '[data-testid="payment-reference"]',
  saveBtn: '[data-testid="payment-save-btn"]',
  addBankBtn: '[data-testid="payment-add-bank-btn"]',
  bankDialog: '[data-testid="payment-bank-dialog"]',
  bankName: '[data-testid="payment-bank-name"]',
  bankNumber: '[data-testid="payment-bank-number"]',
  bankCreateBtn: '[data-testid="payment-bank-create-btn"]',
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
