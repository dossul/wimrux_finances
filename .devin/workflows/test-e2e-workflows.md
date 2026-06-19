---
description: Lancer les tests E2E Playwright pour tous les workflows avec test2
---

# Test E2E — Tous les workflows (test2@wimrux.app)

Exécute la suite E2E complète couvrant les 33 pages accessibles + 4 routes admin bloquées.

## Prérequis

- 2FA désactivé sur test2@wimrux.app
- VITE_APPWRITE_ENDPOINT pointe vers https://appwrite.benga.live/v1
- Tests dans `e2e/specs/test2-all-workflows.spec.ts`

## Lancer les tests

```bash
cd c:\wamp64\www\wimrux_finances\wimrux_app
npx playwright test specs/test2-all-workflows.spec.ts --reporter=list
```

// turbo
## Lancer un test spécifique par numéro

```bash
cd c:\wamp64\www\wimrux_finances\wimrux_app
npx playwright test specs/test2-all-workflows.spec.ts --grep "02" --reporter=list
```

## Lancer plusieurs tests (ex: Dashboard + Factures)

```bash
cd c:\wamp64\www\wimrux_finances\wimrux_app
npx playwright test specs/test2-all-workflows.spec.ts --grep "02 |03 |04 " --reporter=list
```

## Structure du fichier de test

| Test | Section | Route |
|------|---------|-------|
| 01 | Auth | Login + profil |
| 02 | Dashboard | /app |
| 03-10 | Facturation | /app/invoices, /app/articles, /app/clients... |
| 11-20 | Trésorerie | /app/treasury, /app/banking, /app/budgets... |
| 21-22 | Fiscale | /app/fiscal/* |
| 23-26 | Rapports | /app/reports/* |
| 27 | Audit | /app/audit |
| 28 | Approbation | /app/approvals/workflows |
| 29-30 | IA | /app/ai-assistant, /app/ai/ask |
| 31-32 | Paramètres | /app/settings, /app/settings/privacy |
| 33 | Support | /app/support |
| 34-37 | Restricted (bloqués) | /app/admin/* |

## Captures d'écran

Les screenshots sont sauvegardés dans `e2e/screenshots/test2-workflows/`.

## Compte de test

- **Email:** test2@wimrux.app
- **Password:** WimruxAdmin2026!
- **Rôle:** admin (WESTAGO)
- **WhatsApp:** +226 75 53 25 39
