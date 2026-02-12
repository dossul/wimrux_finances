# WIMRUX® FINANCES — Audit Code vs Spécifications DGI Burkina Faso

> Date : 12 février 2026
> Référence : SPECIFICATIONS_FACTURATION_SECURITE_BF.md

---

## Résumé Exécutif

| Métrique | Valeur |
|----------|--------|
| **Total tâches** | 48 |
| **Phases terminées** | 6 / 12 (Phases 0–5) |
| **Tâches terminées** | 21 / 48 (44%) |
| **Tâches restantes** | 27 (dont 11 CRITIQUES pour conformité DGI) |
| **Deadline homologation** | **1er juillet 2026** (~4,5 mois) |

---

## 1. Ce qui est FAIT et CONFORME ✅

### Infrastructure
| Composant | Fichier(s) | Conforme |
|-----------|-----------|----------|
| Projet Quasar + Vue 3 + TS | `wimrux_app/` | ✅ |
| InsForge SDK | `src/boot/insforge.ts` | ✅ |
| 19 tables DB + RLS | InsForge PostgreSQL | ✅ |
| 3 Edge Functions | fnec-simulator, crypto-aes256, chatbot-gateway | ✅ |

### Types & Architecture
| Composant | Fichier | Conforme |
|-----------|---------|----------|
| 10 rôles utilisateur | `src/types/index.ts` | ✅ |
| 20 permissions granulaires | `src/types/index.ts` | ✅ |
| 6 types factures (FV/FT/FA/EV/ET/EA) | `InvoiceType` | ✅ Conforme Spéc. SFE §2.7 |
| 4 types clients (CC/PM/PP/PC) | `ClientType` | ✅ Conforme Spéc. SFE §2.14 |
| 4 types articles (LOCBIE/LOCSER/IMPBIE/IMPSER) | `ArticleType` | ✅ Conforme Spéc. SFE §2.19 |
| 16 groupes taxation (A–P) | `TaxGroup` | ✅ Conforme Spéc. SFE §2.15 |
| 7 modes paiement | `PaymentType` | ✅ Conforme Spéc. SFE §2.21 |
| RBAC multi-rôle + company overrides | `usePermissions.ts` | ✅ |
| Router guards + permissions | `router/index.ts` | ✅ |

### Calcul Fiscal
| Règle DGI | Implémentation | Conforme |
|-----------|---------------|----------|
| 16 taux TVA (0%, 10%, 18%) | `useTaxCalculation.ts` L4-21 | ✅ |
| 4 groupes PSVB (0%, 0.2%, 1%, 2%) | `TAX_GROUP_RATES` | ✅ |
| Mode HT → TTC | `calculateItemTax()` | ✅ |
| Mode TTC → HT | `calculateItemTax()` | ✅ |
| Timbre quittance (5 paliers) | `calculateStampDuty()` | ✅ Conforme Spéc. SFE §3(t) |
| Arrondi 2 décimales | `round2()` | ✅ Conforme Spéc. SFE §6.2 |
| HT + TVA = TTC strictement | Logique dans `calculateItemTax` | ✅ Conforme Spéc. SFE §6.7 |

### API FNEC
| Endpoint | Fonction | Conforme |
|----------|----------|----------|
| /auth/token | `getToken()` | ✅ |
| /status | `getStatus()` | ✅ |
| /invoices (POST) | `submitInvoice()` | ✅ |
| /invoices/:uid/confirm | `confirmInvoice()` | ✅ |
| /invoices/:uid/cancel | `cancelInvoice()` | ✅ |
| /info/taxGroups | `getTaxGroups()` | ✅ |
| /reports/z | `getZReport()` | ✅ |
| /reports/x | `getXReport()` | ✅ |
| 20 codes erreur BF001-BF099 | `ERROR_MESSAGES` | ✅ |

### Workflow Facture
| Règle | Implémentation | Conforme |
|-------|---------------|----------|
| 6 transitions (draft→...→certified) | `TRANSITION_PERMISSIONS` | ✅ |
| Séparation des pouvoirs | Anti-fraude `isSubmitter()` | ✅ |
| Permission par transition | `canTransition()` + `hasPermission()` | ✅ |
| Tracking qui fait quoi | `submitted_by`, `approved_by`, etc. | ✅ |

### Sécurité
| Mécanisme | Implémentation | Conforme |
|-----------|---------------|----------|
| AES-256-CBC chiffrement | `useCrypto.ts` + Edge Function | ✅ Conforme Spéc. SECeF §2.2.5 |
| RLS company isolation | `get_user_company_id()` sur toutes tables | ✅ |
| Trigger inaltérabilité invoices | BEFORE UPDATE/DELETE si validated/certified | ✅ |
| Trigger inaltérabilité audit_log | BEFORE UPDATE/DELETE toujours | ✅ |
| Mode dégradé + retry | `useDegradedMode.ts` | ✅ |
| Notifications temps réel | `useRealtimeNotifications.ts` | ✅ |

### Modules Métier
| Module | Page | Conforme |
|--------|------|----------|
| Dashboard | `IndexPage.vue` | ✅ |
| Clients CRUD | `ClientsPage.vue` | ✅ |
| Trésorerie | `TreasuryPage.vue` | ✅ |
| Rapports | `ReportsPage.vue` | ✅ |
| Rapports fiscaux Z/X | `FiscalReportsPage.vue` | ✅ |
| Audit log inaltérable | `AuditLogPage.vue` | ✅ |
| Assistant IA | `AiAssistantPage.vue` | ✅ |
| Settings (6 onglets) | `SettingsPage.vue` | ✅ |

---

## 2. Ce qui est MANQUANT / NON-CONFORME ❌

### CRITIQUE — Conformité PDF FEC (Phase 6)

| Réf. Spéc. SFE | Exigence | État | Tâche |
|-----------------|----------|------|-------|
| §3(b) | RCCM sur le PDF | ❌ Absent | #22 |
| §3(j) | Comptes bancaires sur le PDF | ❌ Absent | #22 |
| §3(k) | Régime d'imposition sur le PDF | ❌ Absent | #22 |
| §3(l) | Service des impôts sur le PDF | ❌ Absent | #22 |
| §2.30 | QR Code 2D réel (scannable) | ❌ Placeholder texte | #23 |
| §3(u) | Montant TTC en lettres (français) | ❌ Absent | #24 |
| — | Mention « EXIGEZ LA FEC » | ❌ Absent | #25 |
| §3(f) | Mention DUPLICATA | ❌ Absent | #25 |
| §3(g) | Mention FACTURE D'AVOIR + nature | ❌ Absent | #25 |
| §3(h) | Mention EXPORTATION | ❌ Absent | #25 |
| §3(i) | Mention D'ACOMPTE | ❌ Absent | #25 |
| §3(m) | ISF sur le PDF | ❌ Absent | #26 |
| §3(n) | Nom opérateur sur le PDF | ❌ Absent | #26 |
| §3 | Commentaires (lignes A-H) | ❌ Absent | #26 |
| §3(v) | Détail modes de paiement | ❌ Absent | #26 |

### CRITIQUE — Conformité Validation & Calcul (Phase 7)

| Réf. Spéc. SFE | Exigence | État | Tâche |
|-----------------|----------|------|-------|
| §3(c) | Format adresse cadastrale SSSS LLL PPPP | ❌ Non validé | #27 |
| §2.18 | Référence facture séquence DB ininterrompue | ❌ Comptage local | #28 |
| §6.9 | Taxe spécifique → base TVA augmentée | ❌ Logique incorrecte | #29 |
| §2.28 | Nature avoir obligatoire (COR/RAN/RAM/RRR) | ❌ Absent | #30 |
| §7 | IFU format libre pour export | ❌ Non implémenté | #31 |
| §2.11 | Duplicata facture | ❌ Non implémenté | #32 |

### IMPORTANT — Rapports & Inventaire (Phase 8)

| Réf. Spéc. SFE | Exigence | État | Tâche |
|-----------------|----------|------|-------|
| §5 | A-Rapport (détail articles) | ❌ Non implémenté | #33 |
| §2.19-2.20 | Gestion inventaire/stock | ❌ Non implémenté | #34 |
| §2.13 | Dépôts/retraits numéraires | ❌ Non implémenté | #35 |
| §2.31 | Alerte MCF hors ligne > 7 jours | ❌ Non implémenté | #36 |

### BUGS / FIXES

| Problème | Impact | Tâche |
|----------|--------|-------|
| RegisterPage.vue existe mais route absente | Inscription impossible | #38 |
| `useTaxCalculation` taxe spécifique mal calculée | Montants TVA incorrects si taxe spécifique | #29 |
| Référence facture basée sur comptage mémoire | Doublons possibles, non-conformité | #28 |

---

## 3. Planning Recommandé

### Sprint 1 (Sem. 7-8 / Fév 2026) — Conformité PDF FEC [CRITIQUE]
- **#38** Fix route Register (1h)
- **#22** Mentions vendeur PDF (4h)
- **#23** QR Code réel (4h)
- **#24** Montant en lettres (4h)
- **#25** Mentions conditionnelles (3h)
- **#26** ISF, opérateur, commentaires, paiements (4h)

### Sprint 2 (Sem. 9-10 / Mars 2026) — Conformité Validation [CRITIQUE]
- **#27** Validation adresse cadastrale (2h)
- **#28** Séquence DB factures (6h)
- **#29** Taxe spécifique calcul (2h)
- **#30** Nature avoir + workflow FA (8h)
- **#31** Export IFU libre (2h)
- **#32** Duplicata facture (4h)

### Sprint 3 (Sem. 11-12 / Mars 2026) — Rapports & Inventaire
- **#33** A-Rapport (6h)
- **#34** Gestion inventaire (16h)
- **#35** Dépôts/retraits (4h)
- **#36** Alerte MCF (3h)

### Sprint 4 (Sem. 13-14 / Avril 2026) — Storage + Tests
- **#37** Storage PDFs (4h)
- **#39** Tests unitaires (16h)
- **#40** Tests e2e (16h)
- **#41** Audit sécurité (8h)

### Sprint 5 (Sem. 15-18 / Avril-Mai 2026) — Documentation Homologation
- **#42** Guide installation (8h)
- **#43** Manuel utilisateur (16h)
- **#44** Manuel agent impôts (8h)
- **#45** Dossier homologation (16h)

### Sprint 6 (Sem. 19-22 / Mai-Juin 2026) — Production
- **#46** Multi-company UI (8h)
- **#47** PWA + performance (8h)
- **#48** Déploiement production (8h)

**Marge de sécurité : 4 semaines avant le 1er juillet 2026**

---

## 4. Détail Bug: Taxe Spécifique (Tâche #29)

### Code actuel (INCORRECT)
```typescript
// useTaxCalculation.ts L64
const lineTotal = round2(price * quantity - discount + specificTax);
// La taxe spécifique est ajoutée au total, mais la TVA est calculée sur ce total
// ce qui ne respecte pas la spec SFE §6.9
```

### Code attendu (CONFORME §6.9)
```
Prix HT = prix × quantité - remise (SANS taxe spécifique)
Base TVA = Prix HT + taxe spécifique
TVA = Base TVA × taux TVA
TTC = Prix HT + taxe spécifique + TVA
```

### Impact
Si un article a une taxe spécifique de 500 FCFA et un prix HT de 10 000 FCFA (TVA 18%) :
- **Actuel** : TVA = (10000+500) × 18% = 1890 → TTC = 12390 ← INCORRECT (la taxe spécifique est dans le lineTotal avant le split HT/TVA)
- **Attendu** : HT = 10000, baseTVA = 10500, TVA = 1890, TTC = 10000 + 500 + 1890 = 12390

Note : dans ce cas précis le résultat est le même, mais en mode TTC la décomposition est différente car le split TTC→HT ne doit pas inclure la taxe spécifique dans le dénominateur.

---

*Audit réalisé le 12/02/2026 — WIMRUX® FINANCES v3.0*
