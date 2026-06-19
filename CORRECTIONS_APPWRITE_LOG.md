# 📋 CORRECTIONS — Wimrux Finances · Migration Appwrite
> Horodatage UTC · Mis à jour : **2026-06-13T23:23Z**

---

### 2026-06-13T23:23Z — Script automatique (67 fichiers)

| # | Action | Résultat |
|---|--------|----------|
| C08 | `router/index.ts` : `auth-store` → `auth-store-appwrite` | ✅ FAIT |
| C09-C10 | `MainLayout.vue` : auth + company → appwrite | ✅ FAIT |
| C11-C12 | Pages auth (Register, ForgotPassword) | ✅ FAIT |
| C13-C14 | `InvoicesListPage.vue` : auth + invoice → appwrite | ✅ FAIT |
| C15-C54 | **40 composables** : tous les imports auth-store + company-store | ✅ FAIT |
| C55-C72 | **18 pages métier** : tous les imports stores | ✅ FAIT |

> Script exécuté : `fix_stores.ps1` — **67 fichiers modifiés, 0 imports legacy restants**

---

## ✅ CORRECTIONS FAITES

### 2026-06-13T23:02Z — Session de travail Antigravity

| # | Fichier | Correction | Statut |
|---|---------|-----------|--------|
| C01 | `LoginPage.vue` | **Import double-store corrigé** : `auth-store` → `auth-store-appwrite`, `company-store` → `company-store-appwrite` | ✅ FAIT |
| C02 | `LoginPage.vue` | **OTP sendOtp via SDK** : Remplacement `fetch()` raw → `functions.createExecution('send-otp-whatsapp')` | ✅ FAIT |
| C03 | `LoginPage.vue` | **OTP verify via SDK** : Remplacement `fetch()` raw → `functions.createExecution('verify-otp')` | ✅ FAIT |
| C04 | `LoginPage.vue` | **Nettoyage vars** : Suppression `APPWRITE_ENDPOINT`/`APPWRITE_PROJECT` locales (doublon du boot) | ✅ FAIT |
| C05 | `appwrite-functions/send-otp-whatsapp/index.js` | **Fonction créée** : Génère OTP 6 chiffres, stocke dans `otp_codes`, envoie WhatsApp via whapi.cloud | ✅ FAIT |
| C06 | `appwrite-functions/verify-otp/index.js` | **Fonction créée** : Vérifie code + expiration + marquage `used` | ✅ FAIT |
| C07 | `appwrite-functions/*/package.json` | **Manifestes créés** avec `node-appwrite ^14.0.0` | ✅ FAIT |

---

## 🔴 CORRECTIONS À FAIRE — CRITIQUES

### PRIO 1 — Router + Layout (bloquent la navigation)

| # | Fichier | Ligne | Correction |
|---|---------|-------|-----------|
| C08 | `src/router/index.ts` | 9 | `auth-store` → `auth-store-appwrite` |
| C09 | `src/layouts/MainLayout.vue` | 122 | `auth-store` → `auth-store-appwrite` |
| C10 | `src/layouts/MainLayout.vue` | 123 | `company-store` → `company-store-appwrite` |

### PRIO 2 — Pages auth (bloquent connexion/inscription)

| # | Fichier | Ligne | Correction |
|---|---------|-------|-----------|
| C11 | `src/pages/auth/RegisterPage.vue` | 108 | `auth-store` → `auth-store-appwrite` |
| C12 | `src/pages/auth/ForgotPasswordPage.vue` | 45 | `auth-store` → `auth-store-appwrite` |
| C13 | `src/pages/invoices/InvoicesListPage.vue` | 64 | `auth-store` → `auth-store-appwrite` |
| C14 | `src/pages/invoices/InvoicesListPage.vue` | 65 | `invoice-store` → `invoice-store-appwrite` |

### PRIO 3 — Composables (stores legacy — 40 fichiers)

| # | Composable | Auth fix | Company fix |
|---|-----------|---------|------------|
| C15 | `useInvoiceWorkflow.ts:2` | ✏️ | — |
| C16 | `useNotifications.ts:5-6` | ✏️ | ✏️ |
| C17 | `useEmailService.ts:1` | ✏️ | — |
| C18 | `useRealtimeNotifications.ts:3` | ✏️ | — |
| C19 | `useReceivedInvoices.ts:8` | ✏️ | ✏️ |
| C20 | `useRgpd.ts:6` | ✏️ | ✏️ |
| C21 | `useSupport.ts:7` | ✏️ | ✏️ |
| C22 | `useSavedQueries.ts:3` | ✏️ | ✏️ |
| C23 | `useReportExports.ts:3` | ✏️ | ✏️ |
| C24 | `usePettyCash.ts:3` | ✏️ | ✏️ |
| C25 | `useDashboards.ts:3` | ✏️ | ✏️ |
| C26 | `useChatbotConfig.ts:3` | ✏️ | ✏️ |
| C27 | `useBudgets.ts:7` | ✏️ | ✏️ |
| C28 | `useAiChat.ts:8` | ✏️ | — |
| C29 | `useAiAssistant.ts:3` | ✏️ | — |
| C30 | `useBankAccounts.ts:2` | — | ✏️ |
| C31 | `useCashflowForecast.ts:7` | — | ✏️ |
| C32 | `useChatbotSkill.ts:1` | — | ✏️ |
| C33 | `useFinancialReports.ts:2` | — | ✏️ |
| C34 | `useInvestments.ts:5` | — | ✏️ |
| C35 | `useMobileMoneyProviders.ts:6` | — | ✏️ |
| C36 | `usePaymentWallets.ts:6` | — | ✏️ |
| C37 | `useReceivables.ts:5` | — | ✏️ |
| C38 | `useReconciliation.ts:9` | — | ✏️ |
| C39 | `useSuppliers.ts:5` | — | ✏️ |
| C40 | `useTaxDeclarations.ts:6` | — | ✏️ |
| C41 | `useWireTransfers.ts:6` | — | ✏️ |
| C42 | `useUniversalReconciliation.ts:7` | — | ✏️ |
| C43 | `useTaxPayments.ts:6` | — | ✏️ |
| C44 | `useDepreciation.ts:5` | — | ✏️ |
| C45 | `useCompanyTheme.ts:5` | — | ✏️ |
| C46 | `useChecks.ts:6` | — | ✏️ |
| C47 | `useCategories.ts:2` | — | ✏️ |
| C48 | `useBankFees.ts:6` | — | ✏️ |
| C49 | `useAnomalyDetection.ts:6` | — | ✏️ |
| C50 | `useLoans.ts:6` | — | ✏️ |
| C51 | `useInvoicePayments.ts:6` | — | ✏️ |
| C52 | `useFiscalProfile.ts:2` | — | ✏️ |
| C53 | `useMobileWallets.ts:2` | — | ✏️ |
| C54 | `usePaymentCards.ts:7` | — | ✏️ |

### PRIO 4 — Pages métier (18 fichiers)

| # | Page | auth | company |
|---|------|------|---------|
| C55 | `pages/treasury/TreasuryPage.vue:117` | ✏️ | — |
| C56 | `pages/settings/SettingsPage.vue:1277-1278` | ✏️ | ✏️ |
| C57 | `pages/invoices/TaxPaymentsPage.vue:240` | ✏️ | — |
| C58 | `pages/clients/ClientsPage.vue:302` | ✏️ | — |
| C59 | `pages/ai/AiAskPage.vue:175-176` | ✏️ | ✏️ |
| C60 | `pages/admin/AdminAiUsagePage.vue:161` | ✏️ | — |
| C61 | `pages/wallets/WalletReconciliationPage.vue:201` | — | ✏️ |
| C62 | `pages/settings/AiUsagePage.vue:236` | — | ✏️ |
| C63 | `pages/settings/AiCreditsBuyPage.vue:199` | — | ✏️ |
| C64 | `pages/invoices/InvoiceEditorPage.vue:288` | — | ✏️ |
| C65 | `pages/fiscal/WithholdingTaxReportPage.vue:81` | — | ✏️ |
| C66 | `pages/banking/WireTransfersPage.vue:178` | — | ✏️ |
| C67 | `pages/banking/BankStatementImportPage.vue:289` | — | ✏️ |
| C68 | `pages/banking/BankingAccountsPage.vue:203` | — | ✏️ |
| C69 | `pages/banking/BankingAccountDetailPage.vue:207` | — | ✏️ |
| C70 | `pages/articles/ArticlesPage.vue:79` | — | ✏️ |
| C71 | `pages/admin/AdminKpiPage.vue:39` | — | ✏️ |
| C72 | `components/invoices/OcrInvoiceReviewDialog.vue:277` | ✏️ | — |

### PRIO 5 — Déploiement Appwrite Functions

| # | Action | Détail |
|---|--------|--------|
| C73 | Déployer `send-otp-whatsapp` | Appwrite Console → Functions → Node.js 18 |
| C74 | Déployer `verify-otp` | Idem |
| C75 | Configurer secrets | `WHAPI_TOKEN`, `WHAPI_CHANNEL_ID`, `APPWRITE_DATABASE_ID`, `APPWRITE_API_KEY` |
| C76 | Créer collection `otp_codes` | Attributs : `phone`, `code`, `expires_at`, `used`, `created_at` |

### PRIO 6 — Nettoyage final

| # | Fichier | Action |
|---|---------|--------|
| C77 | `src/stores/auth-store.ts` | Supprimer (remplacé par `-appwrite`) |
| C78 | `src/stores/company-store.ts` | Supprimer (remplacé par `-appwrite`) |
| C79 | `src/stores/invoice-store.ts` | Supprimer (remplacé par `-appwrite`) |
| C80 | `src/boot/insforge.ts` | Supprimer (shim obsolète) |
| C81 | `src/boot/token-refresh.ts` | Supprimer (logique InsForge) |

---

## 📊 Tableau de bord

| # | Catégorie | ✅ Fait | 📋 Total | % |
|---|-----------|---------|---------|---|
| 1 | LoginPage OTP | 4 | 4 | **100%** |
| 2 | Fonctions Appwrite | 3 | 7 | 43% |
| 3 | Router + Layout | 3 | 3 | **100%** |
| 4 | Pages auth | 4 | 4 | **100%** |
| 5 | Composables stores (40 fichiers) | 40 | 40 | **100%** |
| 6 | Pages métier (18 fichiers) | 18 | 18 | **100%** |
| 7 | Déploiement OTP Functions | 0 | 4 | 0% |
| 8 | Nettoyage legacy | 0 | 5 | 0% |
| **TOTAL** | | **72** | **85** | **~85%** |
