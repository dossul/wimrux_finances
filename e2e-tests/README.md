# E2E Tests — WIMRUX® Finances

> **Guide complet pour tester 100% des fonctionnalites avec Playwright.**  
> Ce dossier est concu pour qu'un agent IA ou un humain puisse ecrire et executer les tests sans ambiguity.

---

## 🎯 Objectif

Couvrir **toutes** les fonctionnalites de l'application :
- Auth (login/register/2FA/forgot)
- Facturation (CRUD, certification MCF, PDF, numerotation)
- Clients (PM, CC, recherche)
- Trésorerie (comptes, mouvements, rapprochement, virements, chèques)
- Banque (import relevé, OCR, frais)
- Rapports (synthese, Z, X, query builder, dashboards)
- IA (assistant, chat, OCR factures fournisseurs, OCR relevés bancaires)
- Paramètres (profil, entreprise, theme, IA, chatbot, 2FA)
- Admin (KPI, suivi IA, chatbot admin)
- Immobilisations, Emprunts, Investissements, Budgets
- Wallets mobiles, Petite caisse, Crypto
- Workflow d'approbation, Audit log
- Landing page, pages legales

---

## 📂 Structure du dossier

```
e2e-tests/
├── README.md                        # Ce fichier
├── playwright.config.ts             # Config Playwright (baseURL, retries, workers)
├── 01-SETUP.md                      # Installation et configuration
├── 02-AUTH-TESTS.md               # Auth + 2FA WhatsApp
├── 03-LANDING-TESTS.md            # Landing page + navigation
├── 04-INVOICES-TESTS.md           # Facturation (CRUD + MCF + PDF)
├── 05-CLIENTS-TESTS.md            # Clients PM + CC
├── 06-TREASURY-TESTS.md           # Trésorerie + banque + wallets
├── 07-REPORTS-TESTS.md            # Rapports fiscaux + standards
├── 08-AI-TESTS.md                 # Assistant IA + OCR + Chatbot
├── 09-SETTINGS-TESTS.md           # Paramètres utilisateur + entreprise
├── 10-ADMIN-TESTS.md              # Pages admin (KPI, health, AI usage)
├── 11-FISCAL-TESTS.md             # Déclarations fiscales + rapports Z/X
├── 12-APPROVALS-TESTS.md          # Workflows d'approbation
├── 13-AUDIT-TESTS.md              # Journal d'audit
├── 14-FULL-REGRESSION.md          # Suite complete de regression
├── fixtures/
│   ├── test-data.ts               # Données de test reutilisables
│   └── selectors.ts               # Sélecteurs CSS/XPath par page
└── helpers/
    ├── auth-helper.ts             # Login/logout automatique
    ├── wait-helper.ts             # Attentes conditionnelles
    └── pdf-helper.ts              # Verification de PDF telecharges
```

---

## 🛠️ Stack de test

| Outil | Version | Usage |
|:--|:--|:--|
| **Playwright** | latest | Tests E2E navigateur |
| **@playwright/test** | latest | Runner + assertions |
| **TypeScript** | strict | Typage des tests |

---

## 🔐 Comptes de test

Voir `CREDENTIALS_WIMRUX.md` à la racine du projet.

| Compte | Email | Role | Entreprise |
|:---|:---|:---|:---|
| Super Admin | `admin@wimrux.app` | `project_admin` | WIMRUX SaaS |
| Admin ILTIC | `test1@wimrux.app` | `admin` | ILTIC |
| Admin WESTAGO | `test2@wimrux.app` | `admin` | WESTAGO |

**Mot de passe commun** : `WimruxAdmin2026!`

---

## 🚀 Lancer les tests

```bash
# Tous les tests
npx playwright test

# Un seul fichier
npx playwright test auth.spec.ts

# Avec UI
npx playwright test --ui

# En mode debug (navigateur visible)
npx playwright test --debug

# Headed (voir le navigateur)
npx playwright test --headed
```

---

## 📝 Convention de nommage

Les fichiers de test Playwright :
```
<module>.spec.ts          # Ex: auth.spec.ts, invoices.spec.ts
```

Les fichiers de description (ce dossier) :
```
<NN>-<MODULE>-TESTS.md    # Ex: 02-AUTH-TESTS.md
```

---

## 🧠 Pour les agents qui ecriront les tests

Chaque fichier `NN-*.md` contient :
1. **Contexte** — Page(s) concernees, composables, stores
2. **Données de test** — Valeurs exactes à utiliser
3. **Sélecteurs CSS** — Identifiants precis des elements UI
4. **Scénarios** — Etapes detaillees, une par une
5. **Assertions** — Ce qu'il faut verifier à chaque etape
6. **Nettoyage** — Données à supprimer apres le test

**Règle d'or** : Si un sélecteur n'est pas documenté, utiliser `data-testid="..."` dans le composant Vue correspondant.

---

## 🐛 Signalement de bug

Si un test echoue :
1. Verifier si c'est un bug produit (ajouter à `bugs/detected.md`)
2. Si c'est un flaky test, ajouter `retry: 2` dans la config
3. Documenter dans le fichier de test avec commentaire `// BUG: ...`
