# ✅ CE QUI EST FAIT — WIMRUX FINANCES
> Fichier maître — Source unique de vérité sur l'avancement réel
> Mis à jour automatiquement après chaque tâche complétée et validée (100%)

---

## LÉGENDE

| Symbole | Signification |
|---|---|
| ✅ | Tâche 100% complétée, ticket supprimé de `todos/` |
| 🔗 | Lien vers rapport d'implémentation détaillé |

---

## SPRINT 0 — Stabilisation existant

| ID | Tâche | Complétée le | Notes |
|---|---|---|---|
| T0.1 | Finaliser éditeur de factures `/invoices` | 2026-05-23 | Déjà complet : workflow 8 statuts, calcul fiscal 16 groupes, PDF, proforma conversion, RBAC |
| T0.2 | Tableau de bord principal `/dashboard` | 2026-05-23 | Filtre période (mois/trim/an), graphique CA 12 mois (barres CSS), top 5 clients, KPI solde tréso, skeleton loader, factures en attente |
| T0.3 | Sélecteur d'entreprise multi-tenant | 2026-05-23 | `q-select` dans header (desktop) + menu déroulant (mobile), `companyStore.setActiveCompany()`, chargement au montage |

**Sprint 0 : 3/3 tâches ✅ (100%)**

---

## SPRINT 1 — Module Banque

| ID | Tâche | Complétée le | Notes |
|---|---|---|---|
| T1.1 | Schéma DB Module Banque | 2026-05-23 | 7 tables créées sur InsForge : `transaction_categories`, `bank_accounts`, `bank_transactions`, `bank_statement_imports`, `reconciliation_rules`, `wire_transfers`, `checks`. RLS + triggers audit + indexes + fonction `auto_reconcile()` |
| T1.2 | Pages Vue Module Banque | 2026-05-23 | `BankingAccountsPage.vue` (liste + cartes + CRUD dialog), `BankingAccountDetailPage.vue` (transactions + filtres + rapprochement manuel/auto), composables `useBankAccounts.ts` + `useBankTransactions.ts`, routes `/app/banking` + `/app/banking/:id`, nav MainLayout, types Sprint 1 dans `index.ts` |
| T1.3 | Import relevés bancaires | 2026-05-23 | `utils/bankStatementParsers.ts` : parsers CSV natifs (8 banques africaines : Coris, BHB, Ecobank, SGBF, BOA, UBA, NSIA, BIS), OFX, QIF, détection auto format+banque+pays. `composables/useBankStatementOcr.ts` : Stirling PDF OCR → IA (`bank_statement_ocr`) → JSON structuré. `BankStatementImportPage.vue` : wizard 4 étapes (upload/mapping/preview/import), déduplication batch. Migration SQL `stirling_api_url`+`stirling_api_key` dans `companies`. Onglet Paramètres > Banque/OCR. |
| T1.4 | Rapprochement bancaire manuel & auto | 2026-05-23 | `auto_reconcile()` SQL recréée avec `fuzzystrmatch` (levenshtein) — 3 règles : réf. exacte (100), montant+date±3j+client (60-90), règles utilisateur (70). Composable `useReconciliation.ts` : auto-match, applyMatch, undoMatch, ignoreTransaction, CRUD reconciliation_rules. `ReconciliationPage.vue` 3 onglets : Auto-match (suggestions scorées + appliquer tout), Manuel (split-view tx ↔ factures + confirmation), Règles (table CRUD + toggle). Route `/app/banking/:id/reconciliation`. |
| T1.5 | Ordres de virement + SEPA XML | 2026-05-23 | `useWireTransfers.ts` : CRUD + workflow 6 statuts (draft→approved→sent→executed/failed/cancelled) + `generateReference()`. `useWireTransferExport.ts` : `generateSEPACreditTransfer()` ISO 20022 pacs.008.001.08 + `downloadSEPAXml()` + `printWireTransferOrder()` (HTML print). `WireTransfersPage.vue` : table + filtres + KPI cards + dialog CRUD + actions workflow + export SEPA sélection multiple + impression PDF. Route `/app/banking/transfers` (permission `treasury.update`). Bouton "Virements" dans `BankingAccountsPage.vue`. |
| T1.6 | Gestion des chèques | 2026-05-23 | `useChecks.ts` : CRUD + 5 statuts (`in_circulation→cashed/bounced/endorsed/cancelled`) + `stats` computed (totalInCirculation, montant, émis, reçus) + `getUpcomingDue(7)`. `ChecksPage.vue` : KPI cards, alerte bannière échéances ≤7j, filtres type/statut/compte/période, table avec badge urgence `due_date`, dialog création/édition, dialog date encaissement, actions workflow. Route `/banking/checks`. Boutons nav dans `BankingAccountsPage.vue`. |
| T1.7 | Vue frais bancaires | 2026-05-23 | `useBankFees.ts` : filtre `bank_transactions JOIN transaction_categories WHERE type='bank_fee'`, `monthlyBreakdown` (12 mois), `categoryBreakdown` (par catégorie), `stats` YTD/N-1/évolution%, `exportCSV()`. `BankFeesPage.vue` : 4 KPI cards, graphique barre mensuel custom CSS, liste par catégorie, table détail, export CSV. Route `/banking/fees`. Bouton nav dans `BankingAccountsPage.vue`. |

**Sprint 1 : 7/7 tâches (100%) ✅ TERMINÉ**

---

## SPRINT 2 — Factures reçues & Créances

| ID | Tâche | Complétée le | Notes |
|---|---|---|---|
| T2.1 | Extension schéma DB | 2026-05-23 | Table `suppliers` (14 champs, RLS par company_id). `ALTER TABLE invoices` : `direction`, `supplier_id`, `payment_status`, `paid_amount`, `due_date`, `payment_terms_days`, `fiscal_compliance_status`, `fiscal_compliance_notes`, `ifu_verified*`, `ocr_source_url`, `ocr_confidence`, `received_at/by`. Types TS Sprint 2 dans `index.ts` : `Supplier`, `InvoicePayment`, `ReminderTemplate`, `ReminderLog`, `ClientReceivable` + unions. |
| T2.2 | Pages Factures Reçues + Fournisseurs | 2026-05-23 | `useReceivedInvoices.ts` (CRUD direction='received', stats). `useSuppliers.ts` (CRUD + options). `ReceivedInvoicesPage.vue` : 4 KPIs, filtres status/fournisseur/conformité/période, table badges, dialog CRUD + dialog paiement rapide, alerte dates échues. `SuppliersPage.vue` : CRUD + toggle actif/inactif. Routes + nav. |
| T2.4 | Import reçus fiscaux DGI + eSyntas | 2026-05-23 | Tables `tax_payments` + `esyntas_field_mappings`. `useTaxPayments.ts` : CRUD + `parseEsyntasCSV()` (détection auto ; , \t + heuristiques 8 champs), `bulkImportFromEsyntas()`, `saveEsyntasMapping()`. `TaxPaymentsPage.vue` : wizard 4 étapes (upload→mapping→preview→done), saisie manuelle, validation/rejet. Route `/app/tax-payments`. |
| T2.5 | Import eSyntas dynamique | 2026-05-23 | Couvert dans T2.4 — mapping colonnes mémorisé par `esyntas_field_mappings` (upsert par company_id + format + source_field) + réutilisation automatique des mappings appris. |
| T2.6 | Conformité fiscale locale (sans API DGI) | 2026-05-23 | `utils/fiscalCompliance.ts` : `validateIFU()` (3 formats : 13-14 chiffres, SECeF lettre+chiffres), `validateInvoiceNumber()` (max 32 car. SECeF), `checkReceivedInvoiceCompliance()` (6 règles : IFU, N° facture, HT+TVA=TTC, taux TVA 0%/18%, date, fournisseur → score 0-100 + statut), `TAX_PAYMENT_TYPES` (14 codes BF + compte SYSCOHADA). |
| T3.1 | Cycle paiement factures | 2026-05-23 | Table `invoice_payments` + trigger PG `update_invoice_payment_status()` (paid_amount = SUM, statut auto : unpaid/partial/paid/overpaid). `useInvoicePayments.ts` : CRUD + loadByAccount. |
| T3.2 | Balance âgée créances | 2026-05-23 | Vue SQL `v_client_receivables` (5 colonnes tranche : 0-30/31-60/61-90/>90j + oldest_unpaid_due). `useReceivables.ts` + `ReceivablesPage.vue` : barre âgée visuelle CSS, 6 KPIs, table drilldown, exportCSV(), dialog relance rapide avec interpolation `{{vars}}`. |
| T3.3 | Relances automatiques + templates | 2026-05-23 | Tables `reminder_templates` + `reminder_logs`. CRUD templates dans `useReceivables.ts` + `interpolateTemplate()`. Dialog relance intégré dans ReceivablesPage (pré-remplissage depuis template). |

**Sprint 2 : 8/9 tâches (89%) | T2.3 en attente credentials IA**

---

## SPRINT 3 — Budgets & Trésorerie prévisionnelle

| ID | Tâche | Complétée le | Notes |
|---|---|---|---|
| T4.1 | Schéma budgets | 2026-05-25 | Tables `budgets` (9 champs + totaux) + `budget_lines` (12 champs, alerte 80% défaut). Vue `v_budget_vs_actual` (computed_actual depuis `bank_transactions JOIN` par catégorie + période, variance, consumption_pct, alert_triggered). Types TS Sprint 3 : `Budget`, `BudgetLine`, `BudgetVsActual`. |
| T4.2 | Pages budgets + suivi consommation | 2026-05-25 | `useBudgets.ts` : CRUD budgets, CRUD lignes, `duplicateBudget()` (copie avec recalcul dates), `loadBudgetVsActual()`, `stats` computed (totalPlanned/Actual/Variance, avgConsumption, alertsCount). `BudgetsPage.vue` : filtres status/période/année, table avec badges, KPI montants, dialog CRUD, dialog duplication. `BudgetDetailPage.vue` : 4 KPI cards + barre consommation visuelle CSS, 3 onglets (Dépenses/Recettes/Écarts), table lignes avec jauge %, alertes visuelles. Routes `/app/budgets` + `/app/budgets/:id`. Nav menu "Budgets". |
| T4.2 | Triggers alertes budget | 2026-05-25 | Trigger `check_budget_alerts()` : recalcule consumption_pct, marque `alert_sent_at` quand seuil atteint, met à jour `budgets.total_planned/actual`. Trigger `refresh_budget_actuals()` : recalcule `actual_amount` depuis `bank_transactions` quand une transaction est catégorisée. |

| T5.1 | Schéma trésorerie prévisionnelle | 2026-05-25 | Tables `cashflow_forecasts` (method CHECK IN historical/manual/hybrid/ml, data jsonb, total_inflows/outflows, ending_balance, low_cash_alert) + `cashflow_scenarios` (assumptions jsonb, result jsonb, total_impact). `public.set_updated_at()` créée (schéma `system` protégé). Types TS : `CashflowForecast`, `CashflowScenario`, `CashflowDataPoint`, `ScenarioAssumption`. |
| T5.2 | Algorithme de prévision | 2026-05-25 | `useCashflowForecast.ts` : `historical` (aggrégation hebdo sur N mois lookback, moyenne → projection daily), `hybrid` (factures reçues dues=sorties + factures émises dues=entrées + `detectRecurring()` : label-based, espacement ≤35j ±7j de stdDev → projection récurrents), `ml` stub (fallback hybride jusqu'aux credentials IA). `applyAssumption()` : engine what-if pour 5 types d'hypothèses. |
| T5.3 | Page Trésorerie prévisionnelle + Scénarios | 2026-05-25 | `CashflowPage.vue` : cards prévisions + sélection active, graphique double barre CSS (entrées/sorties) + courbe solde SVG polyline, table agrégation mensuelle avec badge risque, 5 KPIs inline. Panel scénarios : formulaire N hypothèses (add/remove), `runScenario()` + `saveScenario()`, chips résumé. Route `/app/treasury/cashflow` + nav `show_chart`. |

**Sprint 3 : 5/5 tâches (100%) ✅ TERMINÉ** | T5.2 méthode ML = stub, activé après credentials IA

---

## ADDENDUM EPIC 24 / 25 / 26 — Paiements universels + CEDEAO + IA

| ID | Tâche | Complétée le | Notes |
|---|---|---|---|
| DB-ADD | 15 nouvelles tables SQL | 2026-05-23 | `payment_providers`, `payment_wallets`, `wallet_transactions`, `payment_evidences`, `sms_parsing_patterns`, `file_mapping_templates`, `known_counterparties`, `currency_rates`, `ai_providers`, `ai_models`, `ai_tasks`, `company_ai_credentials`, `company_ai_task_routing`, `subscription_plans`, `company_subscriptions` — créées sur InsForge |
| SEED-ADD | Seeds référentiels complets | 2026-05-23 | **87 payment_providers** couvrant 15 pays CEDEAO/UEMOA (Mobile Money, wallets locaux, agrégateurs, fintechs, cartes, banques). **16 ai_providers** (OpenRouter, OpenAI, Anthropic, Mistral, Google, Groq, DeepSeek, xAI, Dify, Stirling AI, Langflow, n8n, Ollama…). **24 ai_models** avec coûts USD/M tokens. **40 ai_tasks** couvrant : assistants conversationnels, OCR (factures, relevés, preuves paiement, chèques, pièces d'identité), ingestion multi-canal (image, SMS, texte, email), rapprochement (suggestion + batch), prévisions (CA, trésorerie, budget), conformité/fraude/KYC, NL→SQL, génération de contenu. **5 subscription_plans** (Free/Starter/Pro/Business/Enterprise) avec quotas IA. |

---

## SPRINT 4 — Immobilisations, Emprunts, Investissements

| ID | Tâche | Complétée le | Notes |
|---|---|---|---|
| T6.1 | Schéma immobilisations | 2026-05-25 | Tables `asset_categories` + `fixed_assets` (degressive_rate, net_book_value, accumulated_depreciation, FK suppliers/invoices) + `asset_depreciation_entries` (year/month, annuity, accumulated, NBV, is_posted). RLS + triggers `set_updated_at()`. Types TS : `FixedAsset`, `AssetCategory`, `AssetDepreciationEntry`, `DepreciationMethod`. |
| T6.2 | Calcul amortissement + pages | 2026-05-25 | `useDepreciation.ts` `computeSchedule()` : **linéaire** (annuité = (V-VR)/N + prorata 1ère année), **dégressif fiscal BF** (coef auto N≤4→1.5, 5-6→2, ≥7→2.5, bascule en linéaire quand avantageux, plafond VR), **units** (stub linéaire). `generateDepreciationSchedule()` regénère le tableau à la création/modification. `AssetsPage.vue` : table + dialog tableau amortissement + cession. |
| T7.1 | Schéma emprunts | 2026-05-25 | Tables `loans` (lender_type, rate_type, frequency, amortization_method) + `loan_schedule` (installment_number, due_date, principal, interest, total, remaining_balance, is_paid, bank_transaction_id). Vue `v_debt_ratio` (dette en cours / CA 12m basé sur `invoices.created_at`). RLS + triggers. Types TS : `Loan`, `LoanScheduleEntry`, `DebtRatio`. |
| T7.2 | Calcul échéanciers | 2026-05-25 | `useLoans.ts` `computeSchedule()` : **annuité constante** (K·r / (1-(1+r)^-n)), **capital constant** (K/n), **bullet/in fine** (intérêts seuls + capital final). 4 fréquences (mensuel/trim/semestriel/annuel). `markInstallmentPaid()` recalcule `outstanding_balance` automatiquement depuis les échéances impayées. `LoansPage.vue` : KPIs (capital, reste dû, ratio dette/CA), table emprunts avec barre progression remboursement, échéancier paginé. |
| T8.1 | Schéma investissements | 2026-05-25 | Tables `investments` (7 types : actions/obligations/immobilier/fonds/DAT/crypto/autre) + `investment_valuations`. `useInvestments.ts` : `computeReturn()` retourne {absolu, %, annualisé via `(V/I)^(1/years)-1`}, `addValuation()` met à jour current_price + current_value automatiquement. `InvestmentsPage.vue` : barre répartition portefeuille avec segments colorés, 5 KPIs (investis/actuel/rendement/PL réalisée), table avec rendements multi-formats, dialogs valorisation + vente. |

**Sprint 4 : 5/5 tâches (100%) ✅ TERMINÉ**

---

## SPRINT 5 — Petite caisse, Wallets, Workflows

| ID | Tâche | Complétée le | Notes |
|---|---|---|---|
| T9.1 | Schéma petite caisse + approvisionnement | 2026-05-25 | Tables `petty_cash_accounts` (manager_user_id, ceiling_amount, current_balance, treasury_account_id) + `petty_cash_movements` (direction in/out, category, supporting_doc_url, treasury_movement_id) + `replenishment_requests` (target_type, status enum 7 valeurs cascadées, current_level, required_levels, source_account_id) + `replenishment_approvals` (level, approver_id, decision, comment, decided_at) + `approval_workflows` (domain, threshold_amount, required_levels 1-3, approver_role_l1/2/3, unique(company, domain, threshold)). RLS via `user_role_assignments`. Triggers `set_updated_at`. Vue `v_petty_cash_summary` (agrégats mouvements). |
| T9.2 | Pages petite caisse + workflows approbation | 2026-05-25 | `usePettyCash.ts` : CRUD caisses + mouvements (mise à jour automatique du solde, réversible à la suppression), `createRequest()` / `approve()` / `reject()` / `disburse()` orchestrent le workflow (cascading status `pending` → `approved_l1` → `approved_l2` → `approved_final` → `disbursed`), `disburse()` crée un mouvement d'entrée sur la caisse cible. `useApprovalWorkflow.ts` : CRUD règles + `resolveWorkflow(domain, amount)` (prend la règle au seuil le plus élevé applicable) + `requiredLevelsFor()` / `approverRolesFor()`. `PettyCashPage.vue` : 3 KPIs (caisses actives, solde total, demandes en cours), table caisses avec colorisation solde et progress vs plafond, 5 dialogs (créer/éditer caisse, mouvement, liste mouvements, demande appro, liste demandes avec actions approve/reject/disburse). `ApprovalWorkflowsPage.vue` : table règles avec toggle actif + dialog conditionnel (champs L2/L3 affichés selon required_levels). |
| T10.1 | Schéma wallets mobiles | 2026-05-25 | Tables `mobile_wallets` (provider enum 6 valeurs : orange_money, moov_money, wave, mtn_momo, airtel_money, other ; phone_number + account_name ; current_balance ; treasury_account_id ; unique(company, provider, phone)) + `mobile_wallet_transactions` (type enum 6 valeurs : deposit, withdrawal, transfer_in, transfer_out, payment, fee ; fees séparés ; counterparty_phone/name ; external_transaction_id pour réconciliation ; treasury_movement_id). RLS + triggers. Vue `v_mobile_wallet_summary` (total_in, total_out, total_fees, transaction_count). |
| T10.2 | Pages wallets + import CSV opérateur | 2026-05-25 | `useMobileWallets.ts` : CRUD + `computeBalanceDelta()` (calcule le delta selon le type : deposit/transfer_in ajoute `amount - fees`, withdrawal/transfer_out/payment soustrait `amount + fees`, fee soustrait seul), `addTransaction()` / `deleteTransaction()` mettent à jour `current_balance` du wallet de façon réversible, `importFromCsv(walletId, csv)` parse l'en-tête (`date,type,amount,fees,counterparty_phone,counterparty_name,external_id`) et insère ligne par ligne en réutilisant `addTransaction()` (donc maj automatique du solde). `MobileWalletsPage.vue` : KPI total + KPI dynamique par provider (computed `balanceByProvider`), table wallets avec chips colorés par opérateur et toggle actif/inactif, 4 dialogs (créer/éditer wallet, transaction avec 6 types, liste transactions, import CSV avec textarea). Routes `/app/petty-cash`, `/app/mobile-wallets`, `/app/approvals/workflows` + nav menu (icones `savings`, `smartphone`, `account_tree`). |

**Sprint 5 : 4/4 tâches (100%) ✅ TERMINÉ**

---

## SPRINT 6 — Reporting & Exports

| ID | Tâche | Complétée le | Notes |
|---|---|---|---|
| T11.1 | Bilan comptable (vue SQL) | 2026-05-25 | Vue `v_balance_sheet_current` construite avec 8 CTE (immo, receivables, cash_bank, cash_petty, cash_wallet, invest, payables, debt) puis LEFT JOIN sur `companies` pour garantir une ligne par entreprise. Aggrège : `fixed_assets.net_book_value` (status != disposed), `invoices.total_ttc - paid_amount` séparés par direction ('issued'=créances, 'received'=dettes fournisseurs), `bank_accounts/petty_cash/mobile_wallets.current_balance` (is_active), `investments.current_value` (status='active'), `loans.outstanding_balance` (status='active'). Capitaux propres calculés par équilibre comptable simplifié (Actif - Dettes). |
| T11.2 | Compte de résultat | 2026-05-25 | Vues `v_income_statement_monthly` (FULL OUTER JOIN entre 5 CTE pour préserver les périodes ne contenant qu'un seul flux) + `v_income_statement_yearly` (SUM par année). CA depuis `invoices` direction='issued' status IN ('certified','approved'), charges externes depuis direction='received', dotations depuis `asset_depreciation_entries.annuity` (clé period_year/period_month), charges financières depuis `loan_schedule.interest` WHERE is_paid=true, impôts depuis `tax_payments.amount`. Résultat net = CA - (charges externes + dotations + charges financières + impôts). |
| T11.4 | Page rapports standards | 2026-05-25 | `useFinancialReports.ts` : `loadBalanceSheet()` / `loadIncomeStatementMonthly(year?)` / `loadIncomeStatementYearly()`, computed `currentYearStats` (compare current vs prior year → growth %, marge nette = résultat net / CA), `balanceSheetRatios` (liquidité = (créances + cash) / dettes fournisseurs, endettement = dettes / actif, capitaux propres / actif), helpers `balanceSheetToCSV()` et `incomeStatementToCSV()`. `StandardReportsPage.vue` : 3 onglets (Bilan / Résultat / Historique exports), 4 KPIs colorisés selon seuils (endettement >60% rouge, liquidité <1 rouge), tables Actif/Passif en bg-blue-1/orange-1, switch annuel/mensuel avec sélecteur d'année. |
| T12.1 | Visual Query Builder | 2026-05-25 | Table `saved_queries` avec colonnes JSONB (`fields`, `filters`, `group_by`, `order_by`, `aggregations`, `chart_config`). Whitelist `QUERY_BUILDER_TABLES` (13 tables : invoices, clients, suppliers, bank_transactions, treasury_movements, tax_payments, budgets, budget_lines, fixed_assets, loans, investments, petty_cash_movements, mobile_wallet_transactions). `useSavedQueries.ts` : `runQuery()` construit dynamiquement le SELECT (champs requis + champs des filtres/groupes/agrégations), applique automatiquement le filtre `company_id`, switch sur 12 opérateurs (eq/neq/gt/gte/lt/lte/like/ilike/in/is_null/not_null/between), agrégation client-side via `aggregateRows()` + `computeAggs()` (sum/avg/count/min/max), parsing CSV de la valeur 'in', export CSV via `resultsToCSV()`. `QueryBuilderPage.vue` : panneau gauche reactive (source + chips ajout/suppression dynamique + filtres avec opérateur conditionnel + agrégations), panneau droit avec table dense paginée et bouton download CSV. |
| T12.2 | Tableaux de bord personnalisables | 2026-05-25 | Table `custom_dashboards` (layout jsonb = tableau de `DashboardWidget` avec position x/y/w/h en grille 12 colonnes), 5 types de widgets : `kpi` (premier champ formaté en gros), `chart` (SVG barres custom 12 points max), `table`, `saved_query`, `text`. `useDashboards.ts` : `addWidget()` / `removeWidget()` / `updateWidget()` (manipulent le layout JSON puis update DB), `setDefault()` (unset l'ancien default puis set le nouveau, single-default invariant), `generateWidgetId()`. `DashboardsPage.vue` : sélecteur dashboard, grille flex avec largeur calculée en pourcentage `(w/12)*100%`, refresh par widget exécutant la saved_query source, dialog widget conditionnel (champs KPI / chart label/value / texte selon le type), badge "Par défaut" sur dashboard prioritaire. |
| T13.1 | Edge Function export-report | 2026-05-25 | **Edge function complète déployée sur InsForge.** `export-report` (slug InsForge) : 7 types de rapports × 4 formats. Auth JWT utilisateur (`edgeFunctionToken`), `client.database.from()` pour lire vues SQL (v_balance_sheet_current, v_income_statement_*) et tables (cashflow_forecasts, invoices, tax_payments, budget_lines, saved_queries). Génère CSV (`rowsToCsv`), JSON structuré (title+generated_at+row_count+data), HTML print-ready (`rowsToHtml` avec styles CSS responsive + @media print). Upload bucket privé `report-exports` (créé via MCP) + URL signée 1h via `createSignedUrl`. Contenu inline pour ≪500 lignes. Enregistre dans `report_exports` (status completed/processing). `useReportExports.ts` : ajout de `exportViaEdgeFunction(reportType, format, parameters?, autoDownload?)` qui invoque via `insforge.functions.invoke('export-report')` + download automatique depuis content inline ou file_url. Correction annexe : `verify-tax-id` sur InsForge avait `FAIT.md` en guise de code (déploiement erroné antérieur) — corrigé avec TypeScript correct + migration vers `export default async function` (format InsForge). |

**Sprint 6 : 6/6 tâches (100%) ✅ TERMINé**

**Routes ajoutées** : `/app/reports/standard`, `/app/reports/query-builder`, `/app/reports/dashboards` + 3 entrées nav menu (Bilan & Résultat, Query Builder, Tableaux de bord).

**Vérification** : `npx vue-tsc --noEmit` → 0 erreur sur tout le projet.

---

## SPRINT 7 — IA avancée & NL→SQL

| ID | Tâche | Complétée le | Notes |
|---|---|---|---|
| T14.1 | Détection d'anomalies avancée | 2026-05-25 | Edge Function `detect-anomalies.ts` : règles déterministes (doublons SHA, montants ronds suspects, overdue >90j, non-conformité fiscale) + Claude Haiku pour scoring. `useAnomalyDetection.ts` : `runDetection()`, filtres par type/sévérité, stats. |
| T14.2 | Prévision IA entrées/sorties | 2026-05-25 | Edge Function `cashflow-forecast.ts` (Claude Sonnet 4.5) : analyse 90j historique + factures ouvertes → projection hebdomadaire. `runAiForecast()` dans `useCashflowForecast.ts` avec fallback hybride si credentials absents. |
| T15.1 | Edge Function `nl-to-sql` + garde-fous | 2026-05-25 | `nl-to-sql.ts` déployé InsForge : whitelist 18 tables, SELECT-only, ban injections/commentaires/`pg_catalog`, filtre `company_id` systématique, fallback Claude Haiku. |
| T15.2 | Page `/ai/ask` | 2026-05-25 | `useAiChat.ts` : 3 modes (fiscal/comptable/nl_to_sql), historique messages, suggestions contextuelles. `AiAskPage.vue` : interface chat, résultats tabulaires SQL, badges mode. Route `/app/ai/ask`. |

**Sprint 7 : 4/4 tâches (100%) ✅ TERMINÉ**

---

## SPRINT 8 — Notifications, Aide, Personnalisation

| ID | Tâche | Complétée le | Notes |
|---|---|---|---|
| T16.1 | Schéma notifications + preferences | 2026-05-25 | Tables `notifications` (type, priority, read_at, action_url, metadata jsonb) + `notification_preferences` (canal email/push/in_app par type, quiet_hours). RLS par user_id. |
| T16.2 | Triggers/CRON notifications | 2026-05-25 | Triggers `notify_invoice_status()`, `notify_budget_alert()` (seuil 80%), `notify_check_due()` (7 jours). `useRealtimeNotifications.ts` : canal InsForge Realtime `notifications:{userId}`. |
| T16.3 | UI cloche + drawer | 2026-05-25 | `NotificationBell.vue` : badge non-lus, dropdown 10 dernières, "Tout marquer lu". `useNotifications.ts` : `loadNotifications()`, `markAsRead()`, `markAllAsRead()`. Intégré dans `MainLayout.vue`. |
| T17.1 | Centre d'aide `/help` | 2026-05-25 | Intégré dans `SupportPage.vue` : onglet FAQ (articles markdown par catégorie), onglet Contact, onglet Tickets. Route `/app/support`. |
| T17.2 | Système de tickets support | 2026-05-25 | Tables `support_tickets` + `support_ticket_messages`. `useSupport.ts` : `createTicket()`, `addMessage()`, `closeTicket()`, `reopenTicket()`. `SupportPage.vue` onglet Tickets : liste + dialog création + thread messages. |
| T17.3 | Feedback flottant | 2026-05-25 | `FeedbackFab.vue` (FAB flottant bas-droite) : type satisfaction/bug/suggestion + message, insert `user_feedback`. `useSupport.ts` : `submitFeedback()`. Enregistré dans `MainLayout.vue`. |
| T18.1 | Thème UI par entreprise | 2026-05-25 | Table `company_themes` (primary/secondary color, logo_url, favicon_url, font_family). `useCompanyTheme.ts` : `loadTheme()`, `applyTheme()` (CSS vars `:root`), `saveTheme()`. `ThemePage.vue` : color pickers + upload logo + preview live. Route `/app/settings/theme`. |
| T18.2 | Templates factures multiples | 2026-05-25 | Table `invoice_templates` (layout jsonb : colonnes, couleurs, logo position, TVA/PSVB/timbre, pied de page). `useFiscalProfile.ts` : `getActiveTemplate()`. Sélecteur template dans `InvoiceEditorPage.vue`. |

**Sprint 8 : 8/8 tâches (100%) ✅ TERMINÉ**

---

## SPRINT 9 — Sécurité, RGPD, Monitoring

| ID | Tâche | Complétée le | Notes |
|---|---|---|---|
| T19.1 | 2FA TOTP + backup codes | ⛔ BLOQUÉ | InsForge 2FA natif non disponible — prévu Q3 2026. |
| T19.2 | Force mots de passe + PasswordStrengthMeter | 2026-05-25 | `usePasswordStrength.ts` : score 0-4 (longueur, majuscules, chiffres, symboles, entropie), feedback coloré, blocage si score < 2. Intégré dans `RegisterPage.vue` + `SettingsPage.vue`. |
| T20.1 | Consentement RGPD + user_consents | 2026-05-25 | Table `user_consents` (analytics/marketing/functional, version, ip_hash, accepted_at/revoked_at). `useRgpd.ts` : `grantConsent()`, `revokeConsent()`, `hasConsent()`. Banner consentement au premier login. |
| T20.2 | Edge Functions export/suppression RGPD | 2026-05-25 | Edge Fn `rgpd-export` : ZIP JSON toutes données user. Edge Fn `rgpd-delete` : anonymisation GDPR Art. 17. `useRgpd.ts` : `requestExport()`, `requestDeletion()`. Page `/app/settings/privacy`. |
| T20.3 | Pages légales privacy + CGU | 2026-05-25 | `PrivacyPolicyPage.vue` : politique vie privée RGPD complète. `TermsPage.vue` : CGU. Routes `/legal/privacy` + `/legal/terms` (publiques). Liens dans footer `LandingPage.vue`. |
| T21.1 | Page KPI utilisateurs + vues SQL | 2026-05-25 | Vue SQL `v_user_activity_kpis`. `AdminKpiPage.vue` : users actifs, MRR, churn, modules les plus utilisés, top tenants. Route `/app/admin/kpis` (permission `admin`). |
| T21.2 | Monitoring Sentry + healthcheck | 2026-05-25 | `HealthcheckPage.vue` : ping DB/Edge Functions/Storage/Realtime → dashboard statuts. Sentry DSN via `VITE_SENTRY_DSN`. `useSentry.ts` : `captureException()`, `setUser()` au login. Route `/app/admin/health`. |

**Sprint 9 : 6/7 tâches (86%) | T19.1 ⛔ bloqué InsForge Q3**

---

## SPRINT 10 — Intégrations fiscales & Multi-langue

| ID | Tâche | Complétée le | Notes |
|---|---|---|---|
| T22.1 | Retenues à la source + TVA déclaratives | 2026-05-25 | Table `withholding_taxes` (tva_collectee/tva_deductible/bnc_15/bic_25/is_27.5, base, rate, amount, period, status). `useTaxCalculation.ts` : `computeWithholding()` selon régime fiscal BF, `generateDeclarationSummary()` par période. |
| T22.2 | Page déclaratifs fiscaux DGI BF | 2026-05-25 | `TaxDeclarationsPage.vue` : calendrier fiscal BF (TVA mensuelle, BIC/BNC trimestriel, IS annuel), KPIs montants, wizard télédéclaration XML SECeF / CSV DGI. Route `/app/fiscal/declarations`. |
| T23.1 | Setup i18n Quasar (fr/en/pt) | 2026-05-25 | `src/boot/i18n.ts` + `src/i18n/` : fichiers `fr/`, `en/`, `pt-br/`. Sélecteur langue dans `SettingsPage.vue`. Persistance localStorage. |

**Sprint 10 : 3/3 tâches (100%) ✅ TERMINÉ**

---

## HOTFIXES POST-DÉPLOIEMENT

| ID | Description | Complétée le | Notes |
|---|---|---|---|
| HF-01 | Fix RLS circulaire `user_profiles_select` | 2026-05-26 | Login → page blanche. Root cause : policy SELECT utilisait uniquement `get_user_company_id()` (dépendance circulaire). Fix : ajout `user_id::text = auth.uid()::text` en condition OU. Migration : `20260526010000_fix-user-profiles-rls-select-policy.sql`. Documenté dans `DB_SCHEMA_INSFORGE_WIMRUX.md`. |
| HF-02 | 2FA WhatsApp OTP via whapi.cloud (T19.1 workaround) | 2026-05-27 | Table `otp_codes` créée via CLI. Edge Functions `send-otp-whatsapp` et `verify-otp` déployées. `LoginPage.vue` modifié : étape 2FA si `user_profiles.phone` renseigné. Token WHAPI stocké comme secret InsForge. `auth-store.ts` : ajout `accessToken` + `phone` computed. |
| HF-03 | Credentials IA activés — ai-router URLs mises à jour | 2026-05-27 | URLs fallback mises à jour `wimrux.com` → `ulia.site` dans `ai_router_fn/index.ts`. Secrets InsForge ajoutés : `LITELLM_BASE_URL`, `LITELLM_API_KEY`, `PRESIDIO_URL`, `PRESIDIO_AUTH`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_BASE_URL`, `DIFY_BASE_URL`, `STIRLING_BASE_URL`. `ai-router` redéployé. T2.3, T5.2, T14.1, T14.2 désormais pleinement opérationnels. |

---

| MIG-01 | Migration complète InsForge → Appwrite (zéro occurrence "insforge") | 2026-06-11 | Suppression du boot InsForge, réécriture de tous les stores/composables/pages/edge-functions. Services Appwrite créés : `appwrite-db.ts` (QueryBuilder thenable), `appwrite-auth.ts`, `appwrite-storage.ts`, `appwrite-realtime.ts`. **285 → 0 erreurs TypeScript.** Patterns corrigés : `.update(id,data)`, `createExecution(JSON.stringify)`, `appwriteStorage.upload()`, types auth `{user,error}`. Scripts de migration : `fix_ts_errors.py`, `fix_ts2.py`, `fix_lot[3-10].py`. |

---

*Dernière mise à jour : 2026-06-11 — MIG-01 ✅ Migration Appwrite terminée. 0 erreur TypeScript. Projet prêt pour build de production.*
