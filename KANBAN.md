# KANBAN — WIMRUX FINANCES
> Suivi visuel par sprint | Mis à jour manuellement ou par l'agent après chaque tâche
> Source de vérité : `rapport_implementation/RESTE_A_FAIRE.md` + `rapport_implementation/FAIT.md`

**Légende** : 🔲 À faire | 🔄 En cours | ✅ Terminé | ⛔ Bloqué (voir DEMANDES.md)

---

## SPRINT 0 — Stabilisation (P0)
*Durée : 1 semaine*

| ID | Tâche | Statut | Ticket |
|---|---|---|---|
| T0.1 | Finaliser éditeur de factures `/invoices` | ✅ | Workflow 8 statuts, PDF, RBAC |
| T0.2 | Tableau de bord principal `/dashboard` | ✅ | CA 12 mois, top5 clients, filtre période |
| T0.3 | Sélecteur d'entreprise multi-tenant | ✅ | Header desktop + menu mobile |

**Progression** : 3 / 3 (100%)

---

## SPRINT 1 — Module Banque (P1 BLOQUANT)
*Durée : 3 semaines*

| ID | Tâche | Statut | Ticket |
|---|---|---|---|
| T1.1 | Schéma DB Module Banque (migration SQL) | ✅ | 7 tables + RLS + triggers + `auto_reconcile()` |
| T1.2 | Pages Vue gestion comptes bancaires | ✅ | `BankingAccountsPage`, `BankingAccountDetailPage`, composables, routes, nav |
| T1.3 | Import relevés OFX/CSV/QIF/PDF/XLSX | ✅ | CSV natif multi-banques AF, OFX, QIF + Stirling PDF OCR → IA → JSON |
| T1.4 | Rapprochement bancaire manuel & auto | ✅ | `auto_reconcile()` SQL (levenshtein, 3 règles) + `useReconciliation.ts` + `ReconciliationPage.vue` split-view + règles CRUD |
| T1.5 | Ordres de virement + SEPA XML | ✅ | `useWireTransfers.ts` + `useWireTransferExport.ts` (SEPA pacs.008 + PDF) + `WireTransfersPage.vue` workflow complet + route `/banking/transfers` |
| T1.6 | Gestion des chèques | ✅ | `useChecks.ts` (CRUD + 5 statuts + stats + alertes échéances) + `ChecksPage.vue` (filtres, badges, dialog, alerte 7 jours) + route `/banking/checks` |
| T1.7 | Vue frais bancaires | ✅ | `useBankFees.ts` (join `transaction_categories.type=bank_fee`, agrégation mensuelle + par catégorie, stats YTD/N-1, export CSV) + `BankFeesPage.vue` (graphique barre, KPI, détail) + route `/banking/fees` |

**Progression** : 7 / 7 (100%) ✅ SPRINT 1 TERMINÉ

---

## ADDENDUM — EPIC 24 / 25 / 26 (Paiements universels + CEDEAO + IA)
*Inséré dans Sprints 1, 2, 5, 7 — voir `PLAN_TACHES_WIMRUX_FINANCES_ADDENDUM_PAIEMENTS_IA.md`*

| ID | Tâche | Statut | Notes |
|---|---|---|---|
| DB-ADD | **15 nouvelles tables** SQL EPIC 24/25/26 | ✅ | `payment_providers`, `payment_wallets`, `wallet_transactions`, `payment_evidences`, `sms_parsing_patterns`, `file_mapping_templates`, `known_counterparties`, `currency_rates`, `ai_providers`, `ai_models`, `ai_tasks`, `company_ai_credentials`, `company_ai_task_routing`, `subscription_plans`, `company_subscriptions` |
| SEED-ADD | **Seeds référentiels** | ✅ | 87 payment_providers CEDEAO/UEMOA, 16 ai_providers, 24 ai_models, 40 ai_tasks, 5 subscription_plans |
| T24.1 | Edge Function `ingest-payment` (orchestrateur) | ✅ | `ingest-payment.ts` : orchestration text/image/SMS via ai-router + insert wallet_transactions + dédup SHA-256 |
| T24.4 | Composant `<PaymentEvidencePasteZone>` + `ingest-text-payment` | ✅ | `PaymentEvidencePasteZone.vue` + `useIngestPayment.ts` : 3 modes (texte/image/fichier) |
| T24.5 | Edge Function `ingest-image-payment` (OCR capture) | ✅ | `ingest-image-payment.ts` : upload storage + délégation ingest-payment |
| T24.6 | Edge Function `ingest-statement-file` (PDF/CSV/XLSX/OFX/QIF) | ✅ | `ingest-statement-file.ts` : Stirling PDF + ai-router + batch insert + dédup |
| T24.8 | Composable `useUniversalReconciliation` + UI `/reconciliation` | ✅ | `useUniversalReconciliation.ts` + `WalletReconciliationPage.vue` + route `/app/wallets/reconciliation` |
| T24.9 | Page `/wallets` (CRUD payment_wallets) | ✅ | `WalletsPage.vue` + `usePaymentWallets.ts` + route `/app/wallets` |
| T24.10 | Page `/wallets/:id/transactions` | ✅ | `WalletTransactionsPage.vue` + route `/app/wallets/:id/transactions` |
| T25.3 | Patterns SMS 20 opérateurs prioritaires | ✅ | 24 patterns insérés en DB (Orange/Moov/Wave/MTN/Telecel/Airtel/T-Money BF/CI/SN/ML/TG/BJ/NE/GH) |
| T26.6 | Edge Function `ai-router` (orchestrateur IA) | ✅ | `ai_router_fn/index.ts` : routing adaptatif, PII Presidio, quota/crédits, LiteLLM + fallback, Langfuse |
| T26.11 | Page `/settings/ai/providers` (BYOK CRUD) | ✅ | `AiProvidersPage.vue` + route `/app/settings/ai/providers` |
| T26.12 | Page `/settings/ai/routing` (matrice tâches × providers) | ✅ | `AiRoutingPage.vue` + route `/app/settings/ai/routing` |

---

## SPRINT 2 — Factures reçues & Créances (P1 BLOQUANT)
*Durée : 3 semaines*

| ID | Tâche | Statut | Ticket |
|---|---|---|---|
| T2.1 | Extension schéma invoices (direction, supplier…) | ✅ | Table `suppliers` + `ALTER TABLE invoices` (direction, supplier_id, payment_status, paid_amount, due_date, fiscal_compliance_*) + types TS Sprint 2 |
| T2.2 | Pages Factures Reçues | ✅ | `useReceivedInvoices.ts` + `useSuppliers.ts` + `ReceivedInvoicesPage.vue` (filtres, KPIs, dialog CRUD, paiement) + `SuppliersPage.vue` (CRUD) + routes + nav |
| T2.3 | OCR factures fournisseurs (PDF/image → champs auto) | ✅ | `useSupplierInvoiceOcr.ts` : Stirling → ai-router (ocr_supplier_invoice/Gemini Flash) → pré-remplissage formulaire. Dialog OCR dans `ReceivedInvoicesPage.vue` (drag&drop, étapes, prévisualisation résultat) |
| T2.4 | Import reçus fiscaux + eSyntas | ✅ | Table `tax_payments` + `esyntas_field_mappings`. `useTaxPayments.ts` : CRUD + validation + `parseEsyntasCSV()` + `bulkImportFromEsyntas()` + `saveEsyntasMapping()`. `TaxPaymentsPage.vue` : wizard 4 étapes. **Scraper eSyntas via Dify** : workflow Dify dédié pour scraper le portail eSyntas DGI BF → extraction automatique des états fiscaux (déclarations, paiements, soldes) → alimentation `tax_payments`. Appel via `ai-router` task `esyntas_scrape`. Route `/app/tax-payments`. |
| T2.5 | Import exports eSyntas (plateforme DGI BF) | ✅ | Couvert par T2.4 — mapping dynamique des colonnes + mémorisation des mappings appris par format (table `esyntas_field_mappings`) + 14 types d'impôts BF |
| T2.6 | Conformité fiscale universelle (multi-pays) | ✅ | Table `country_fiscal_configs` (16 pays UEMOA/CEDEAO) : regex validation par pays, TVA, devise, SYSCOHADA. `fiscalCompliance.ts` : `getCountryFiscalConfig()` (cache), `validateTaxIdForCountry()` (async), `verifyTaxIdOnline()` (Edge Fn). Edge Fn `verify-tax-id`. **Vérification IFU DGI BF via Dify scraper** : workflow Dify → POST `https://dgi.bf/verification/verification-ifu` → extraction résultat HTML → retour `valid/invalid/pending`. Extensible : ajouter `verification_type='dify_workflow'` + `dify_workflow_id` dans `country_fiscal_configs` pour chaque pays qui obtient un portail scrapable. |
| T3.1 | Cycle paiement + invoice_payments | ✅ | Table `invoice_payments` + trigger `update_invoice_payment_status()` + composable `useInvoicePayments.ts` |
| T3.2 | Balance âgée créances + vue SQL | ✅ | Vue `v_client_receivables` (tranches 0-30/31-60/61-90/>90j) + `useReceivables.ts` + `ReceivablesPage.vue` (barre visuelle + export CSV) |
| T3.3 | Relances automatiques + templates | ✅ | Tables `reminder_templates` + `reminder_logs` + CRUD dans `useReceivables.ts` + dialog relance dans `ReceivablesPage.vue` (interpolation `{{var}}`) |

**Progression** : 9 / 9 (100%) ✅ SPRINT 2 TERMINé | T2.3 OCR + T2.4 eSyntas scraper + T2.6 IFU scraper = via **Dify workflows** (dépendance credentials IA)

---

## SPRINT 3 — Budgets & Trésorerie prévisionnelle (P1)
*Durée : 2 semaines*

| ID | Tâche | Statut | Ticket |
|---|---|---|---|
| T4.1 | Schéma budgets + budget_lines + vue SQL | ✅ | Tables `budgets` + `budget_lines` + Vue `v_budget_vs_actual` (computed_actual depuis bank_transactions par catégorie/période). |
| T4.2 | Pages budgets | ✅ | `useBudgets.ts` (CRUD + duplicate + stats). `BudgetsPage.vue` (liste + filtres + duplication). `BudgetDetailPage.vue` (KPIs + graph consommation + 3 onglets Dépenses/Recettes/Écarts). Triggers alertes 80%. Routes `/app/budgets` + nav. |
| T5.1 | Schéma cashflow_forecasts + scenarios | ✅ | Tables `cashflow_forecasts` (horizon, method, data jsonb, totaux, low_cash_alert) + `cashflow_scenarios` (assumptions jsonb, result jsonb, total_impact). Fonction `public.set_updated_at()` créée. |
| T5.2 | Algorithme prévision (historique/hybride/ML) | ✅ | `useCashflowForecast.ts` : méthode `historical` (moyenne mobile pondérée par semaine), méthode `hybrid` (factures dues + dépenses récurrentes détectées automatiquement + solde bancaire réel). Méthode `ml` = stub → fallback hybride jusqu'aux credentials IA. `detectRecurring()` : détection espacement moyen ≤35j ± 7j. |
| T5.3 | Simulation de scénarios | ✅ | `CashflowPage.vue` : liste prévisions (cards), graphique barres entrées/sorties + courbe solde SVG, agrégation mensuelle (table), KPIs (solde final, entrées, sorties, jours à risque). Panel scénarios : ajout hypothèses (retard client/fourn., dépense, variation CA), `runScenario()` + `saveScenario()`. Route `/app/treasury/cashflow` + nav menu. |

**Progression** : 5 / 5 (100%) ✅ SPRINT 3 TERMINÉ | T5.2 méthode ML = stub en attente credentials IA

---

## SPRINT 4 — Immobilisations, Emprunts, Investissements (P2)
*Durée : 2 semaines*

| ID | Tâche | Statut | Ticket |
|---|---|---|---|
| T6.1 | Schéma immobilisations | ✅ | Tables `asset_categories` + `fixed_assets` + `asset_depreciation_entries`. RLS + triggers updated_at. |
| T6.2 | Calcul amortissement + pages | ✅ | `useDepreciation.ts` : méthodes linéaire, dégressif (coef fiscal BF auto : N≤4→1.5, 5-6→2, ≥7→2.5), bascule linéaire/dégressif, prorata 1ère année. `AssetsPage.vue` : CRUD + dialog tableau amortissement + cession. |
| T7.1 | Schéma emprunts (loans, loan_schedule) | ✅ | Tables `loans` + `loan_schedule`. Vue `v_debt_ratio` (dette / CA 12m). RLS + triggers. |
| T7.2 | Calcul échéanciers + KPI endettement | ✅ | `useLoans.ts` : 3 méthodes amortissement (annuité constante, capital constant, bullet/in fine), 4 fréquences (mensuel/trim/semestre/annuel), `markInstallmentPaid()` recalcule outstanding_balance. `LoansPage.vue` : CRUD + échéancier + ratio endettement. |
| T8.1 | Schéma investissements + valorisations | ✅ | Tables `investments` + `investment_valuations`. `useInvestments.ts` : CRUD + `addValuation()` + `computeReturn()` (absolu, %, annualisé). `InvestmentsPage.vue` : barre répartition portefeuille + 5 KPIs + vente. |

**Progression** : 5 / 5 (100%) ✅ SPRINT 4 TERMINÉ

---

## SPRINT 5 — Petite caisse, Wallets, Workflows (P2)
*Durée : 2 semaines*

| ID | Tâche | Statut | Ticket |
|---|---|---|---|
| T9.1 | Schéma petite caisse + approvisionnement | ✅ | Tables `petty_cash_accounts`, `petty_cash_movements`, `replenishment_requests`, `replenishment_approvals`, `approval_workflows`. RLS via `user_role_assignments`. Triggers `set_updated_at`. Vue `v_petty_cash_summary` (solde + agrégats). |
| T9.2 | Pages petite caisse + workflows approbation | ✅ | `usePettyCash.ts` : CRUD caisses + mouvements (in/out avec mise à jour solde), demandes d'appro multi-niveaux, `approve()`/`reject()` cascadent les statuts (`approved_l1` → `approved_l2` → `approved_final`), `disburse()` crée mouvement d'entrée. `PettyCashPage.vue` : KPIs (caisses actives, solde total, demandes en cours), table caisses avec progress vs plafond, dialogs mouvement/appro/liste demandes. `useApprovalWorkflow.ts` + `ApprovalWorkflowsPage.vue` : configuration règles par domaine + seuil + 1-3 niveaux. |
| T10.1 | Schéma wallets mobiles | ✅ | Tables `mobile_wallets` (6 providers: orange_money, moov_money, wave, mtn_momo, airtel_money, other) + `mobile_wallet_transactions` (6 types). Contrainte unicité (company, provider, phone). Vue `v_mobile_wallet_summary` (solde + totaux + frais). |
| T10.2 | Pages wallets + import CSV opérateur | ✅ | `useMobileWallets.ts` : CRUD wallets, transactions avec `computeBalanceDelta()` (déduit frais sur deposit/transfer_in, ajoute sur withdrawal/transfer_out/payment), import CSV via `importFromCsv()` (parsing avec en-tête `date,type,amount,fees,counterparty_phone,counterparty_name,external_id`). `MobileWalletsPage.vue` : KPIs par provider, table wallets avec toggle actif, dialog transaction (6 types), dialog liste transactions, dialog import CSV. Routes `/app/petty-cash` + `/app/mobile-wallets` + `/app/approvals/workflows`. |

**Progression** : 4 / 4 (100%) ✅ SPRINT 5 TERMINÉ

---

## SPRINT 6 — Reporting & Exports (P2)
*Durée : 2 semaines*

| ID | Tâche | Statut | Ticket |
|---|---|---|---|
| T11.1 | Bilan comptable (vue SQL) | ✅ | Vue `v_balance_sheet_current` (CTE multi-tables : `fixed_assets`, `invoices` direction='issued'/'received', `bank_accounts`, `petty_cash_accounts`, `mobile_wallets`, `investments`, `loans`). Calcule actif (immo nettes, créances clients, 3 trésoreries, placements) + passif (dettes fournisseurs, dettes financières, capitaux propres = équilibre). |
| T11.2 | Compte de résultat | ✅ | Vues `v_income_statement_monthly` (FULL OUTER JOIN sur 5 CTE : revenue/expenses depuis `invoices`, depreciation depuis `asset_depreciation_entries`, interest depuis `loan_schedule.is_paid`, taxes depuis `tax_payments`) + `v_income_statement_yearly` (agrégat). Renvoie CA, charges externes, dotations, charges financières, impôts, résultat net par mois ou année. |
| T11.4 | Page `/reports/standard` | ✅ | `useFinancialReports.ts` : `loadBalanceSheet()`, `loadIncomeStatementMonthly(year?)`, `loadIncomeStatementYearly()`, computed `currentYearStats` (CA, croissance YoY, marge nette), `balanceSheetRatios` (ratio liquidité, endettement, capitaux propres). `StandardReportsPage.vue` : 3 onglets (Bilan/Résultat/Historique exports), KPIs colorés conditionnels, tables Actif/Passif côte à côte, switch annuel/mensuel pour résultat. |
| T12.1 | Visual Query Builder + saved_queries | ✅ | Table `saved_queries` (source_table, fields jsonb, filters jsonb avec 12 opérateurs, group_by, order_by, aggregations sum/avg/count/min/max, chart_type, is_shared, is_favorite). Whitelist `QUERY_BUILDER_TABLES` (13 tables autorisées). `useSavedQueries.ts` : `runQuery()` construit dynamiquement la query PostgREST + `applyFilter` switch sur 12 opérateurs (eq/neq/gt/.../like/ilike/in/is_null/not_null/between) + agrégation client-side avec `aggregateRows()`. `QueryBuilderPage.vue` : panneau gauche (source + chips fields/group_by + filtres dynamiques + agrégations) et panneau droit résultats avec export CSV. |
| T12.2 | Tableaux de bord personnalisables | ✅ | Table `custom_dashboards` (layout jsonb stockant tableau de `DashboardWidget`), 5 types de widgets (kpi, chart, table, saved_query, text). `useDashboards.ts` : `addWidget()`, `removeWidget()`, `updateWidget()`, `setDefault()` (unset puis set). `DashboardsPage.vue` : grille flex avec largeur en /12, KPI affiché en gros chiffre formaté, chart SVG barres custom (12 points max), table dense, refresh par widget en exécutant la `saved_query` source. |
| T13.1 | Edge Function `export-report` | ✅ | Edge function `export-report` déployée sur InsForge. 7 types × 4 formats (CSV/JSON/HTML/PDF). Auth JWT, `client.database.from()`, upload bucket privé `report-exports` + URL signée 1h. Contenu inline ≤500 lignes. `exportViaEdgeFunction()` ajoutée dans `useReportExports.ts`. `verify-tax-id` corrigé sur InsForge (contenu corrompu remplacé). |

**Progression** : 6 / 6 (100%) ✅ SPRINT 6 TERMINé — T13.1 edge function `export-report` déployée sur InsForge

---

## SPRINT 7 — IA avancée & NL→SQL (P2)
*Durée : 2 semaines*

| ID | Tâche | Statut | Ticket |
|---|---|---|---|
| T14.1 | Détection d'anomalies avancée | ✅ | `detect-anomalies.ts` (règles déterministes + Claude Haiku IA) + `useAnomalyDetection.ts` : doublons, montants ronds suspects, overdue, non-conformité fiscale |
| T14.2 | Prévision IA entrées/sorties | ✅ | `cashflow-forecast.ts` (Claude Sonnet 4.5) + `runAiForecast()` dans `useCashflowForecast.ts` — analyse 90j historique + factures ouvertes → projection hebdo |
| T15.1 | Edge Function `nl-to-sql` + garde-fous | ✅ | `nl-to-sql.ts` : whitelist 18 tables, SELECT-only, ban injections/commentaires/pg_catalog, filtre company_id systématique |
| T15.2 | Page `/ai/ask` | ✅ | `useAiChat.ts` + `AiAskPage.vue` : 3 modes (fiscal/comptable/SQL), suggestions contextuelles, résultats tabulaires, historique messages |

**Progression** : 4 / 4 (100%) ✅ SPRINT 7 TERMINÉ

---

## SPRINT 8 — Notifications, Aide, Personnalisation (P3)
*Durée : 1 semaine*

| ID | Tâche | Statut | Ticket |
|---|---|---|---|
| T16.1 | Schéma notifications + preferences | ✅ | `todos/S8-T16.1-db-notifs.md` |
| T16.2 | Triggers/CRON de notifications | ✅ | `todos/S8-T16.2-notif-triggers.md` |
| T16.3 | UI cloche + drawer | ✅ | `todos/S8-T16.3-ui-notifs.md` |
| T17.1 | Centre d'aide `/help` | ✅ | `todos/S8-T17.1-aide.md` |
| T17.2 | Système de tickets support | ✅ | `todos/S8-T17.2-tickets.md` |
| T17.3 | Feedback flottant | ✅ | `todos/S8-T17.3-feedback.md` |
| T18.1 | Thème UI par entreprise | ✅ | `todos/S8-T18.1-theme.md` |
| T18.2 | Templates factures multiples | ✅ | `todos/S8-T18.2-templates-factures.md` |

**Progression** : 8 / 8 (100%) ✅

---

## SPRINT 9 — Sécurité, RGPD, Monitoring (P3)
*Durée : 2 semaines*

| ID | Tâche | Statut | Ticket |
|---|---|---|---|
| T19.1 | 2FA TOTP + backup codes | ⛔ Q3 | `todos/S9-T19.1-2fa.md` |
| T19.2 | Force mots de passe + meter | ✅ | `todos/S9-T19.2-passwords.md` |
| T20.1 | Consentement RGPD + user_consents | ✅ | `todos/S9-T20.1-rgpd-consent.md` |
| T20.2 | Edge Functions export/suppression RGPD | ✅ | `todos/S9-T20.2-rgpd-droits.md` |
| T20.3 | Pages légales privacy + CGU | ✅ | `todos/S9-T20.3-legal.md` |
| T21.1 | Page KPI utilisateurs + vues SQL | ✅ | `todos/S9-T21.1-user-kpi.md` |
| T21.2 | Monitoring Sentry + healthcheck | ✅ | `todos/S9-T21.2-monitoring.md` |

**Progression** : 6 / 7 (86%) | ⛔ T19.1 bloqué (2FA InsForge Q3)

---

## SPRINT 10 — Intégrations fiscales & Multi-langue (P3)
*Durée : 1 semaine*

| ID | Tâche | Statut | Ticket |
|---|---|---|---|
| T22.1 | Retenues à la source + TVA déclaratives | ✅ | `todos/S10-T22.1-retenues.md` |
| T22.2 | Page déclaratifs fiscaux DGI BF | ✅ | `todos/S10-T22.2-declaratifs.md` |
| T23.1 | Setup i18n Quasar (fr/en/pt) | ✅ | `todos/S10-T23.1-i18n.md` |

**Progression** : 3 / 3 (100%) ✅

---

## PROGRESSION GLOBALE

| Sprint | Tâches | Faites | % |
|---|---|---|---|
| S0 | 3 | 3 | 100% ✅ |
| S1 | 7 | 7 | 100% ✅ |
| S2 | 9 | 9 | 100% ✅ |
| S3 | 5 | 5 | 100% ✅ |
| S4 | 5 | 5 | 100% ✅ |
| S5 | 4 | 4 | 100% ✅ |
| S6 | 6 | 6 | 100% ✅ |
| S7 | 4 | 4 | 100% ✅ |
| S8 | 8 | 8 | 100% ✅ |
| S9 | 7 | 6 | 86% (T19.1 bloqué 2FA InsForge Q3) |
| S10 | 3 | 3 | 100% ✅ |
| ADDENDUM | 12 | 12 | 100% ✅ |
| **TOTAL** | **73** | **72** | **99%** (1 bloqué : T19.1 2FA InsForge Q3) |

---

## POINTS EN SUSPENS (bloquants)

| ID | Question | Impact |
|---|---|---|
| Q1 | API DGI BF vérification IFU — URL + auth | Bloque T2.4 |
| Q2 | API DGI BF stickers — disponible ? | Bloque T2.6 |
| Q3 | InsForge 2FA natif ? | Bloque T19.1 |
| Q4 | Format relevés bancaires BF (OFX ou CSV propriétaire ?) | Bloque T1.3 partiellement |
| Q5 | Taux amortissement dégressif fiscal BF par catégorie | Bloque T6.2 partiellement |

---

## HOTFIXES POST-DÉPLOIEMENT

| Date | ID | Description | Fichier migration |
|---|---|---|---|
| 2026-05-26 | HF-01 | **Fix RLS circulaire `user_profiles_select`** — Login produisait page blanche (profile=null, role=null, redirect loop). Policy SELECT corrigée : ajout `user_id::text = auth.uid()::text` en condition OU. | `migrations/20260526010000_fix-user-profiles-rls-select-policy.sql` |

---

*Kanban créé le 2026-05-23 | Mis à jour le 2026-05-26 — HF-01 fix RLS login page blanche résolu. Sprint 7 complet (T14.1, T14.2, T15.1, T15.2), T2.3 OCR fournisseurs, ADDENDUM 100% (T24.1, T24.4, T24.5, T24.6, T24.8, T26.6) | Déployé sur https://wimruxapp.vercel.app*
