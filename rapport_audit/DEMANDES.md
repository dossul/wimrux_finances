# 📋 DEMANDES & DÉCISIONS — AUDIT DSA WIMRUX FINANCES
> Fichier maître — Demande utilisateur, méthodologie DSA, cadrage, décisions d'architecture
> Mis à jour : 2026-05-26

---

## DEMANDE ORIGINALE UTILISATEUR

**Date** : 2026-05-26  
**Demandeur** : Utilisateur final  
**Contexte** : Pré-production de WIMRUX® Finance — zéro tolérance d'erreur en prod

> "On va conduire une audit de complétude, de cohérence et de minutie de tout le wimrux finance sous tous les angles. Rien ne sera laissé au hasard car si en prod il y a une seule erreur l'équipe sera virée."

**Exigences** :
- Audit exhaustif avec logique **DSA (Data, State, Action)**
- Structure calquée sur `rapport_implementation/` + `todos/`
- Source de vérité = CLI InsForge (backend réel)
- Rapports : DEMANDES, FAIT, RESTE_A_FAIRE
- Todos : 1 ticket par workflow, supprimé une fois Pass

---

## MÉTHODOLOGIE DSA (Data, State, Action)

Pour CHAQUE workflow, 3 verdicts stricts :

### D — Data (Audit des Données et Contrats)
- Interfaces TypeScript Quasar ↔ schéma de base InsForge réel
- Champs manquants, types divergents, FK incohérentes ⇒ **Fail**
- Divergences documentées vs `DB_SCHEMA_INSFORGE_WIMRUX.md`

### S — State (Audit des États de l'Application)
- État initial : données vides, bouton actif
- État de transition : `loading` (spinner Quasar), bouton désactivé (anti double-clic)
- État final : succès (mise à jour UI) ou erreur (notification/toast clair)
- `try/catch` non silencieux obligatoire
- **Fail** si un appel API sans gestion d'état complet

### A — Action (Audit des Déclencheurs et Effets)
- Trace : Click UI → fonction Vue → formatage Data → appel InsForge
- Retour InsForge → action UI (notification, redirection, store update)
- **Fail** si "silence radio" de l'interface

**Verdict global** = **Pass** uniquement si D + S + A sont tous Pass.

---

## CADRAGE RETENU

| Axe | Choix |
|---|---|
| **Source de vérité Data** | InsForge CLI live (`get-backend-metadata`, `get-table-schema`, `list-edge-functions`) |
| **Périmètre** | 54 workflows en 3 vagues : P0 (22 critiques) → P1 (22 gestion) → P2 (10 admin) |
| **Profondeur** | DSA statique (code) 100% + runtime spot-checks Playwright sur P0 |
| **Livrables** | Rapport d'abord, puis fix auto sur P0. P1/P2 = rapport seul, fix sur demande. |
| **Structure** | `rapport_audit/` (DEMANDES, FAIT, RESTE_A_FAIRE) + `todos_audit/` (54 tickets) |

---

## RÈGLES DE MISE À JOUR

1. Chaque ticket `todos_audit/` est traité en entier (DSA complet)
2. Si **Pass** : ligne ajoutée dans `FAIT.md` + ticket **supprimé**
3. Si **Fail** : entrée dans `RESTE_A_FAIRE.md` avec cause + fix proposé
4. Après correction + revalidation : bascule vers `FAIT.md` + ticket supprimé
5. Checkpoints utilisateur à la fin de chaque vague (P0, P1, P2)

---

## DÉCISIONS D'ARCHITECTURE

| Date | Décision | Justification |
|---|---|---|
| 2026-05-26 | Source de vérité = CLI InsForge, pas le schéma doc | Schéma doc peut être stale ; backend réel est la vérité |
| 2026-05-26 | 3 vagues P0/P1/P2 | P0 = blocant prod, doit être fixé immédiatement. P1/P2 = important mais pas critique. |
| 2026-05-26 | Runtime checks Playwright uniquement sur P0 | P0 = flux business critiques, besoin de validation réelle. P1/P2 = audit statique suffisant. |
| 2026-05-26 | Structure calquée sur existant | Homogénéité avec le système de rapport déjà en place (`rapport_implementation/`) |

---

## LISTE DES 54 WORKFLOWS À AUDITER

### VAGUE P0 — Critique business (22 workflows)
| ID | Workflow | Fichiers clés |
|---|---|---|
| P0-01 | Auth — Login email+password | `auth-store.ts`, `LoginPage.vue` |
| P0-02 | Auth — Register + welcome email | `RegisterPage.vue`, `useEmailService.ts` |
| P0-03 | Auth — Forgot password + email branded | `ForgotPasswordPage.vue`, `auth-store.ts` |
| P0-04 | Auth — 2FA OTP WhatsApp + fallback email | `LoginPage.vue`, `send-otp-whatsapp.ts` |
| P0-05 | Auth — Profile / phone update | `SettingsPage.vue`, `user_profiles` |
| P0-06 | Facturation — Création facture | `InvoiceEditorPage.vue`, `invoice-store.ts` |
| P0-07 | Facturation — Workflow status (draft→sent→paid) | `useInvoiceWorkflow.ts` |
| P0-08 | Facturation — Envoi email facture (E05) | `useInvoiceWorkflow.ts`, `useEmailService.ts` |
| P0-09 | Facturation — Encaissement / paiement | `useInvoicePayments.ts`, `useIngestPayment.ts` |
| P0-10 | Facturation — Email confirmation paiement (E06) | `useInvoiceWorkflow.ts` |
| P0-11 | Facturation — Génération PDF | `useInvoicePdf.ts` |
| P0-12 | Facturation — Relances clients (E04) | `useReceivables.ts`, `ReceivablesPage.vue` |
| P0-13 | Trésorerie — Comptes bancaires CRUD | `useBankAccounts.ts`, `TreasuryPage.vue` |
| P0-14 | Trésorerie — Transactions bancaires | `useBankTransactions.ts` |
| P0-15 | Trésorerie — Mobile money | `useMobileWallets.ts`, `usePaymentWallets.ts` |
| P0-16 | Trésorerie — Caisse physique | `usePettyCash.ts` |
| P0-17 | Trésorerie — Rapprochement bancaire | `useReconciliation.ts`, `useUniversalReconciliation.ts` |
| P0-18 | Trésorerie — Import relevé bancaire OCR | `useBankStatementOcr.ts` |
| P0-19 | Budgets — CRUD budgets + lignes | `useBudgets.ts`, `BudgetDetailPage.vue` |
| P0-20 | Budgets — Alerte email seuil dépassé (E08) | `useBudgets.ts:checkAndSendBudgetAlerts` |
| P0-21 | IA — Chat assistant | `useAiChat.ts`, `useAiAssistant.ts`, ai-router |
| P0-22 | IA — Détection d'anomalies | `useAnomalyDetection.ts` |

### VAGUE P1 — Gestion courante (22 workflows)
| ID | Workflow | Fichiers clés |
|---|---|---|
| P1-01 | Clients & Fournisseurs CRUD | `useSuppliers.ts`, pages `clients/`, `suppliers/` |
| P1-02 | Articles & catégories | `useCategories.ts`, `ArticlesPage.vue` |
| P1-03 | Factures fournisseurs reçues | `useReceivedInvoices.ts` |
| P1-04 | OCR factures fournisseurs | `useSupplierInvoiceOcr.ts` |
| P1-05 | Chèques émis/reçus | `useChecks.ts` |
| P1-06 | Virements bancaires | `useWireTransfers.ts`, `useWireTransferExport.ts` |
| P1-07 | Frais bancaires | `useBankFees.ts` |
| P1-08 | Emprunts & amortissements | `useLoans.ts`, `useDepreciation.ts` |
| P1-09 | Investissements | `useInvestments.ts` |
| P1-10 | Immobilisations | `assets/` pages |
| P1-11 | Taxes & TVA Burkina | `useTaxCalculation.ts`, `useTaxDeclarations.ts`, `useTaxPayments.ts` |
| P1-12 | Profil fiscal | `useFiscalProfile.ts` |
| P1-13 | Rapports financiers | `useFinancialReports.ts`, `useAReport.ts`, `useReportExports.ts` |
| P1-14 | Prévision trésorerie | `useCashflowForecast.ts` |
| P1-15 | Dashboards personnalisés | `useDashboards.ts` |
| P1-16 | Requêtes sauvegardées | `useSavedQueries.ts` |
| P1-17 | Workflow approbations | `useApprovalWorkflow.ts` |
| P1-18 | Notifications in-app + realtime | `useNotifications.ts`, `useRealtimeNotifications.ts` |
| P1-19 | Support — Tickets + Email (E07) | `useSupport.ts` |
| P1-20 | Paramètres entreprise + thème | `useCompanyTheme.ts`, `SettingsPage.vue` |
| P1-21 | Permissions / rôles | `usePermissions.ts` |
| P1-22 | Export CSV générique | `useExportCsv.ts` |

### VAGUE P2 — Admin & support (10 workflows)
| ID | Workflow | Fichiers clés |
|---|---|---|
| P2-01 | Admin — Chatbot config | `useChatbotConfig.ts`, `useChatbotSkill.ts` |
| P2-02 | Admin — IA settings + usage | `useAiSettings.ts`, `useAiUsage.ts` |
| P2-03 | Admin — Healthcheck | `HealthcheckPage.vue` |
| P2-04 | Admin — KPI globaux | `AdminKpiPage.vue` |
| P2-05 | Audit log | `audit/AuditLogPage.vue` |
| P2-06 | RGPD / data export | `useRgpd.ts` |
| P2-07 | Storage PDF | `usePdfStorage.ts` |
| P2-08 | Crypto / chiffrement | `useCrypto.ts` |
| P2-09 | Pages légales (CGU, mentions, terms) | `legal/`, `TermsPage.vue` |
| P2-10 | Landing page | `LandingPage.vue` (déjà revu) |

---

*Dernière mise à jour : 2026-05-26 — Structure initialisée, début Vague P0.*
