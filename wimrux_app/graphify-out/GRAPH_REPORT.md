# Graph Report - wimrux_app/src  (2026-06-14)

## Corpus Check
- 168 files · ~163,426 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 891 nodes · 1218 edges · 118 communities (105 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]

## God Nodes (most connected - your core abstractions)
1. `useCompanyStore` - 81 edges
2. `appwriteDb` - 52 edges
3. `AppwriteQueryBuilder` - 41 edges
4. `useAuthStore` - 36 edges
5. `functions` - 12 edges
6. `useEmailService()` - 10 edges
7. `Invoice` - 9 edges
8. `databases` - 7 edges
9. `useCrypto()` - 7 edges
10. `InvoiceItem` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Migration Plan: InsForge -> Appwrite 100%` --addresses--> `InsForge Leak: pdf-to-images URL`  [INFERRED]
  GRAPH_REPORT.md → src/composables/useSupplierInvoiceOcr.ts
- `Migration Plan: InsForge -> Appwrite 100%` --addresses--> `InsForge Leak: webhook endpoint URL`  [INFERRED]
  GRAPH_REPORT.md → src/pages/wallets/WalletSyncSettingsPage.vue
- `InsForge Leak: VITE_MCF_API_BASE_URL` --must_migrate_to--> `Appwrite Backend`  [EXTRACTED]
  .env.production → src/boot/appwrite.ts
- `Migration Plan: InsForge -> Appwrite 100%` --addresses--> `InsForge Leak: VITE_MCF_API_BASE_URL`  [INFERRED]
  GRAPH_REPORT.md → .env.production
- `useAiSettings()` --calls--> `useCompanyStore`  [EXTRACTED]
  src/composables/useAiSettings.ts → src/stores/company-store-appwrite.ts

## Communities (118 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (40): authStore, email, loading, $q, form, $q, showDialog, { submitFeedback } (+32 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (37): buildDate, loading, account, authStore, BUCKETS, client, COLLECTIONS, companyStore (+29 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (40): functions, _activeModel, _activeTask, AI_TASK_LABELS, AiCallResult, ChatMessage, DEFAULT_ROUTING, _error (+32 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (4): AppwriteQueryBuilder, DbQueryBuilder, DbResult, queryOr()

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (33): DEFAULT_BF_FISCAL_CONFIG, useFiscalProfile(), FiscalCalcConfig, ItemTaxResult, TAX_GROUP_RATES, TaxSummary, useTaxCalculation(), activeTab (+25 more)

### Community 5 - "Community 5"
Cohesion: 0.05
Nodes (41): AuditActionType, AuditLog, BankAccount, BankStatementImport, BudgetLineType, CashflowMethod, CHATBOT_CHANNELS, ClientType (+33 more)

### Community 6 - "Community 6"
Cohesion: 0.07
Nodes (25): CREDIT_NOTE_NATURE_LABELS, DEFAULT_INVOICE_COLORS, PdfClientInfo, PdfCompanyInfo, PdfOptions, TYPE_LABELS, useInvoicePdf(), usePdfStorage() (+17 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (32): articleTypes, { calculateItemTax, calculateInvoiceTotals }, canEdit, certifiedInvoiceOptions, client, clientOptions, commentContent, companyStore (+24 more)

### Community 8 - "Community 8"
Cohesion: 0.08
Nodes (24): useAuth(), companyOverrides, customRoles, loaded, loading, usePermissions(), userRoleAssignments, authStore (+16 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (13): authStore, columns, { exportInvoices }, filteredInvoices, invoiceStore, invoiceTypeOptions, { isReadOnly }, loading (+5 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (18): authStore, companyStore, email, finalizeLogin(), loading, loadingOtp, loadingResend, onSubmit() (+10 more)

### Community 11 - "Community 11"
Cohesion: 0.13
Nodes (18): FieldMapping, TaxPayment, TaxPaymentSource, TaxPaymentStatus, useTaxPayments(), checkReceivedInvoiceCompliance(), ComplianceCheck, ComplianceResult (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (16): ACTION_DESCRIPTIONS, aiMessages, allowedActions, allowedDesc, appwriteClient, { Client, Databases, Functions, ID, Query }, conversationHistory, CORS_HEADERS (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.16
Nodes (12): AnomalyAlert, DetectionStats, Severity, useAnomalyDetection(), useBankAccounts(), useCategories(), useFinancialReports(), useCompanyStore (+4 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (9): channelOptions, columns, emptyTxForm(), net, openCreate(), operationOptions, showDialog, showIngest (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.18
Nodes (11): useChatbotConfig(), useChatbotSkill(), ALL_CHATBOT_ACTIONS, CHATBOT_ACTION_LABELS, ChatbotAction, ChatbotApiKey, ChatbotChannel, ChatbotConversation (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.19
Nodes (9): AFRICAN_BANK_PROFILES, AfricanBankProfile, CsvColumnMapping, detectBankProfile(), parseAmount(), parseCsv(), parseDate(), parseQif() (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (7): columns, emptyForm(), form, openCreate(), openEdit(), regimeFiscalOptions, supplierTypeOptions

### Community 18 - "Community 18"
Cohesion: 0.18
Nodes (7): useCashflowForecast(), CashflowDataPoint, CashflowForecast, CashflowForecastInput, CashflowScenario, CashflowScenarioInput, ScenarioAssumption

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (9): ScheduleRow, useLoans(), useLoanStore, AmortizationMethod, DebtRatio, Loan, LoanInput, LoanScheduleEntry (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.24
Nodes (8): canDeleteInvoice(), guardDeleteInvoice(), guardStatusTransition(), Invoice, InvoiceStatus, InvoiceType, isValidTransition(), VALID_TRANSITIONS

### Community 21 - "Community 21"
Cohesion: 0.2
Nodes (6): TransactionFilter, ReconciliationSuggestion, AutoReconcileResult, BankTransaction, ReconciliationRule, ReconciliationStatus

### Community 22 - "Community 22"
Cohesion: 0.24
Nodes (7): STATUS_CONFIG, TRANSITION_PERMISSIONS, WorkflowAction, useInvoiceStore, InvoiceItem, InvoiceStatus, InvoiceType

### Community 23 - "Community 23"
Cohesion: 0.2
Nodes (9): usePettyCash(), PettyCashAccount, PettyCashAccountInput, PettyCashMovement, PettyCashMovementInput, PettyCashSummary, ReplenishmentApproval, ReplenishmentRequest (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.22
Nodes (8): useBudgetStore, Budget, BudgetInput, BudgetLine, BudgetLineInput, BudgetPeriodType, BudgetStatus, BudgetVsActual

### Community 25 - "Community 25"
Cohesion: 0.22
Nodes (4): AReportData, useSuppliers(), appwriteDb, Supplier

### Community 26 - "Community 26"
Cohesion: 0.25
Nodes (7): DECLARATION_TYPES, TAX_TYPES, TaxDeclaration, TvaMonthly, useTaxDeclarations(), WithholdingTax, useTaxStore

### Community 27 - "Community 27"
Cohesion: 0.22
Nodes (8): useAiSettings(), AiCreditPack, AiModel, AiProvider, AiTask, CompanyAiCredential, CompanyAiQuotaUsage, CompanyAiTaskRouting

### Community 28 - "Community 28"
Cohesion: 0.22
Nodes (8): ScheduleRow, useDepreciation(), AssetCategory, AssetDepreciationEntry, AssetStatus, DepreciationMethod, FixedAsset, FixedAssetInput

### Community 29 - "Community 29"
Cohesion: 0.22
Nodes (8): PROVIDER_LABELS, useMobileWallets(), MobileWallet, MobileWalletInput, MobileWalletProvider, MobileWalletSummary, MobileWalletTransaction, MobileWalletTransactionInput

### Community 30 - "Community 30"
Cohesion: 0.29
Nodes (6): PaymentWallet, PaymentWalletInput, usePaymentWallets(), WalletTransaction, WalletTransactionInput, useWalletStore

### Community 31 - "Community 31"
Cohesion: 0.46
Nodes (6): formatCadastralAddress(), isValidCadastralAddress(), isValidExportIFU(), isValidIFU(), isValidInvoiceReference(), isValidNIM()

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (6): DefineDateTimeFormat, DefineLocaleMessage, DefineNumberFormat, i18n, MessageLanguages, MessageSchema

### Community 33 - "Community 33"
Cohesion: 0.29
Nodes (6): notesParts, pct, provider, restant, safeName, w

### Community 34 - "Community 34"
Cohesion: 0.29
Nodes (5): blob, content, html, msg, win

### Community 35 - "Community 35"
Cohesion: 0.29
Nodes (5): invalidTransitions, invoice, statuses, validKeys, validTransitions

### Community 36 - "Community 36"
Cohesion: 0.33
Nodes (5): CheckStats, useChecks(), Check, CheckStatus, CheckType

### Community 37 - "Community 37"
Cohesion: 0.33
Nodes (5): COUNTRY_NAMES, CountryOption, MobileMoneyProvider, MobileWallet, useMobileMoneyProviders()

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (4): existing, extra, isDefault, taken

### Community 39 - "Community 39"
Cohesion: 0.33
Nodes (5): useInvestments(), Investment, InvestmentInput, InvestmentType, InvestmentValuation

### Community 40 - "Community 40"
Cohesion: 0.33
Nodes (5): useReceivables(), ClientReceivable, ReminderChannel, ReminderLog, ReminderTemplate

### Community 41 - "Community 41"
Cohesion: 0.6
Nodes (5): Appwrite Backend, InsForge Leak: VITE_MCF_API_BASE_URL, InsForge Leak: pdf-to-images URL, InsForge Leak: webhook endpoint URL, Migration Plan: InsForge -> Appwrite 100%

### Community 42 - "Community 42"
Cohesion: 0.4
Nodes (4): APPROVAL_DOMAINS, useApprovalWorkflow(), ApprovalWorkflow, ApprovalWorkflowInput

### Community 43 - "Community 43"
Cohesion: 0.4
Nodes (4): CategoryFee, FeeRow, MonthlyFee, useBankFees()

### Community 44 - "Community 44"
Cohesion: 0.4
Nodes (4): Notification, NOTIFICATION_TYPES, NotificationPreference, useNotifications()

### Community 45 - "Community 45"
Cohesion: 0.4
Nodes (4): CONSENT_TYPES, DataExportRequest, UserConsent, useRgpd()

### Community 46 - "Community 46"
Cohesion: 0.4
Nodes (4): ReconciliationMatch, RecoStats, useUniversalReconciliation(), WalletTx

### Community 47 - "Community 47"
Cohesion: 0.4
Nodes (3): { createBudgetLine, updateBudgetLine }, { deleteBudgetLine }, { loadBudgets: load, budgets }

### Community 49 - "Community 49"
Cohesion: 0.4
Nodes (3): AiUsageByCompany, AiUsageByModel, AiUsageLog

### Community 50 - "Community 50"
Cohesion: 0.5
Nodes (3): CompanyTheme, InvoiceTemplate, useCompanyTheme()

### Community 51 - "Community 51"
Cohesion: 0.5
Nodes (3): PaymentCard, PaymentCardCreate, usePaymentCards()

### Community 52 - "Community 52"
Cohesion: 0.5
Nodes (3): useInvoicePayments(), InvoicePayment, InvoicePaymentMethod

### Community 53 - "Community 53"
Cohesion: 0.5
Nodes (3): useWireTransfers(), WireTransfer, WireTransferStatus

### Community 55 - "Community 55"
Cohesion: 0.5
Nodes (3): ImportMeta, ImportMetaEnv, ProcessEnv

### Community 57 - "Community 57"
Cohesion: 0.5
Nodes (3): logDate, now, task

## Knowledge Gaps
- **339 isolated node(s):** `teams`, `authStore`, `companyStore`, `ComponentCustomProperties`, `api` (+334 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `appwriteDb` connect `Community 25` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 8`, `Community 9`, `Community 11`, `Community 13`, `Community 15`, `Community 18`, `Community 19`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 36`, `Community 37`, `Community 39`, `Community 40`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 53`?**
  _High betweenness centrality (0.221) - this node is a cross-community bridge._
- **Why does `useCompanyStore` connect `Community 13` to `Community 0`, `Community 2`, `Community 4`, `Community 6`, `Community 7`, `Community 10`, `Community 11`, `Community 15`, `Community 18`, `Community 19`, `Community 21`, `Community 23`, `Community 24`, `Community 25`, `Community 26`, `Community 27`, `Community 28`, `Community 29`, `Community 30`, `Community 36`, `Community 37`, `Community 39`, `Community 40`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 50`, `Community 51`, `Community 52`, `Community 53`?**
  _High betweenness centrality (0.112) - this node is a cross-community bridge._
- **What connects `teams`, `authStore`, `companyStore` to the rest of the system?**
  _339 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._