# PLAN D'INSPECTION, TEST E2E COMPLET & CORRECTIONS — wimrux.app

> **Date de planification** : 2026-06-14 12:22 UTC  
> **Application cible** : https://wimruxapp.vercel.app  
> **Backend** : https://gfe4bd9y.eu-central.insforge.app  
> **Moteur de correction** : Kimi CLI K2.7 (`kimi` @ C:\Users\lenovo\.kimi-code\bin\kimi.exe)  
> **Browserless** : https://browserless.ulia.site (VPS Hostinger KVM8)  
> **Dossier source** : `c:\wamp64\www\wimrux_finances\wimrux_app`  

---

## 1. OBJECTIF

Inspecter exhaustivement **wimrux.app** en production, exécuter la suite E2E complète Playwright, connecter Browserless pour tests headless distribués, identifier **tous les bugs** (console, réseau, fonctionnels, visuels), puis les corriger via le CLI Kimi K2.7 en mode agent autonome.

---

## 2. INFRASTRUCTURE DE TEST EXISTANTE

| Élément | Statut | Chemin / URL |
|---------|--------|--------------|
| Playwright E2E | ✅ Prêt | `wimrux_app/e2e/specs/*.spec.ts` (10 modules) |
| Sélecteurs centralisés | ✅ Prêt | `e2e/fixtures/selectors.ts` (168 lignes) |
| Comptes test | ✅ Prêt | `e2e/fixtures/test-data.ts` (4 comptes, 2FA OFF) |
| Helpers auth | ✅ Prêt | `e2e/helpers/auth.helper.ts` |
| Helpers erreurs console | ✅ Prêt | `e2e/helpers/console-errors.helper.ts` |
| Config Playwright | ✅ Prêt | `playwright.config.ts` (baseURL: wimruxapp.vercel.app) |
| Browserless distant | ✅ Prêt | `browserless.ulia.site` (Chromium via Traefik) |
| Kimi CLI | ✅ Installé | v0.14.3 (Windows x64) |
| Bugs connus (pré-audit) | ⚠️ 3 items | `bugs/detected.md` |

---

## 3. PHASE 1 — INSPECTION PRÉLIMINAIRE (Manuelle + Browserless)

### 3.1 Vérification santé backend InsForge

```bash
# Depuis le terminal PowerShell
cd c:\wamp64\www\wimrux_finances\wimrux_app

# Vérifier connectivité API
curl -I https://gfe4bd9y.eu-central.insforge.app/api/health
# ou
Invoke-RestMethod -Uri "https://gfe4bd9y.eu-central.insforge.app/api/health" -Method GET
```

### 3.2 Lancement Browserless + connexion

```bash
# Vérifier que browserless répond sur le VPS
ssh root@167.86.69.104 "docker ps | grep browserless"

# Tester endpoint browserless depuis local
curl http://browserless.ulia.site:3000/json/version
# Doit retourner version Chromium + protocole
```

### 3.3 Script d'inspection rapide headless (Node.js + Puppeteer via Browserless WS)

**Fichier à créer** : `scripts/inspection-rapide.mjs`

```javascript
import puppeteer from 'puppeteer-core';

const BROWSERLESS_WS = 'ws://browserless.ulia.site:3000';
const APP_URL = 'https://wimruxapp.vercel.app';

const browser = await puppeteer.connect({ browserWSEndpoint: BROWSERLESS_WS });
const page = await browser.newPage();

const errors = [];
page.on('console', msg => msg.type() === 'error' && errors.push(msg.text()));
page.on('pageerror', err => errors.push(err.message));
page.on('response', res => res.status() >= 400 && errors.push(`${res.status()} ${res.url()}`));

// 1. Landing page
await page.goto(APP_URL, { waitUntil: 'networkidle2' });
await page.screenshot({ path: 'reports/01-landing.png', fullPage: true });

// 2. Login page
await page.goto(`${APP_URL}/auth/login`, { waitUntil: 'networkidle2' });
await page.screenshot({ path: 'reports/02-login.png', fullPage: true });

// 3. Connexion (superAdmin)
await page.type('[data-testid="login-email"]', 'admin@wimrux.app');
await page.type('[data-testid="login-password"]', 'WimruxAdmin2026!');
await page.click('[data-testid="login-submit"]');
await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });
await page.screenshot({ path: 'reports/03-dashboard.png', fullPage: true });

// 4. Audit console
console.log(JSON.stringify({ timestamp: new Date().toISOString(), errors }, null, 2));

await browser.close();
```

---

## 4. PHASE 2 — TEST E2E COMPLET PLAYWRIGHT

### 4.1 Exécution locale (avant Browserless)

```bash
cd c:\wamp64\www\wimrux_finances\wimrux_app

# Smoke test rapide
npx playwright test specs/01-auth.spec.ts --reporter=list

# Suite complète (séquentiel, workers=1)
npx playwright test

# Avec trace pour debug
npx playwright test --trace=on

# Rapport HTML
npx playwright test --reporter=html
# Ouvrir : npx playwright show-report e2e/playwright-report
```

### 4.2 Couverture des 10 modules E2E existants

| # | Module | Fichier | Ce qui est testé |
|---|--------|---------|------------------|
| 01 | Authentification | `01-auth.spec.ts` | Login, logout, routes publiques, protection |
| 02 | Navigation | `02-navigation.spec.ts` | Sidebar, routes, 404 |
| 03 | Clients | `03-clients.spec.ts` | CRUD client PM/CC, recherche |
| 04 | Factures | `04-invoices.spec.ts` | Liste, éditeur, recherche, reçues, fournisseurs |
| 05 | Trésorerie | `05-treasury.spec.ts` | Mouvements, comptes bancaires |
| 06 | Rapports | `06-reports.spec.ts` | KPI, filtres période |
| 07 | Assistant IA | `07-ai.spec.ts` | Pages IA, champ de saisie |
| 08 | Paramètres | `08-settings.spec.ts` | Profil, entreprise, 2FA, thème |
| 09 | Admin / Audit | `09-admin-audit.spec.ts` | Journal audit, badges immutables |
| 10 | Modules annexes | `10-modules.spec.ts` | Routes annexes (budgets, assets, etc.) |

### 4.3 Configuration Playwright pour Browserless (remote)

**Modifier** `playwright.config.ts` (section `use` temporaire) :

```typescript
use: {
  baseURL: 'https://wimruxapp.vercel.app',
  // Connexion à Browserless distant
  connectOptions: {
    wsEndpoint: 'ws://browserless.ulia.site:3000',
  },
  trace: 'on-first-retry',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
}
```

> **Note** : revenir à Chromium local après la phase Browserless.

---

## 5. PHASE 3 — TEST BROWSERLESS INTÉGRAL

### 5.1 Scénarios à couvrir via Browserless

| ID | Scénario | Outil | Attendu |
|----|----------|-------|---------|
| B1 | Crawl de toutes les routes publiques | Puppeteer + Browserless | 0 erreur console, 0 404 |
| B2 | Auth flow complet (login → dashboard → logout) | Puppeteer + Browserless | Cookie/session OK, pas de 401 |
| B3 | Création facture de bout en bout | Puppeteer + Browserless | Calcul TVA correct, statut brouillon |
| B4 | Certification MCF (simulation) | Browserless | QR code généré, UID présent |
| B5 | Export PDF + CSV | Browserless | Fichiers téléchargés, non vides |
| B6 | Multi-utilisateur (isolation données) | Browserless (2 sessions) | WESTAGO ne voit pas ILTIC |
| B7 | Responsive mobile | Browserless (viewport 390x844) | Pas de troncature critique |
| B8 | Performance (Lighthouse via Browserless) | `lighthouse` + Chrome | LCP < 2.5s, CLS < 0.1 |

### 5.2 Script E2E Browserless complet

**Fichier à créer** : `scripts/e2e-browserless-integral.mjs`

> Le script doit être exécuté avec `node scripts/e2e-browserless-integral.mjs`
> et produire `reports/e2e-browserless-report.json` + captures d'écran.

---

## 6. PHASE 4 — IDENTIFICATION & CATALOGUE DES BUGS

### 6.1 Format de rapport de bug

Chaque bug doit être documenté avec :

```markdown
### BUG-[ID] : [Titre]
- **Sévérité** : Critical / High / Medium / Low
- **Module** : Auth / Factures / Clients / Trésorerie / Rapports / IA / UI / Perf
- **Reproductible** : Oui / Intermittent / Non
- **Étapes** :
  1. ...
  2. ...
- **Comportement attendu** : ...
- **Comportement actuel** : ...
- **Evidence** : screenshot / console log / network HAR
- **Hypothèse cause** : ...
```

### 6.2 Bugs connus (pré-audit) — à vérifier

| ID | Bug | Symptôme | Fichier source probable |
|----|-----|----------|------------------------|
| BUG-001 | Auth refresh 401 au chargement | `POST /api/auth/refresh 401` + `No refresh token provided` | `auth-store.ts` — gestion refresh token |
| BUG-002 | Endpoint invoices 404 | `GET /api/database/records/invoices 404` | Config InsForge : table `invoices` vs `records` API |
| BUG-003 | Endpoint invoices (dashboard) 404 | `GET /api/database/records/invoices?created_at=gte... 404` | Requête dashboard sur mauvaise table/route |

### 6.3 Points de contrôle systématiques

- [ ] **Console** : 0 erreur JS non ignorée après login
- [ ] **Réseau** : 0 HTTP >= 400 sur appels API fonctionnels
- [ ] **Auth** : pas de boucle infinie refresh token
- [ ] **RLS** : isolation tenant vérifiée (WESTAGO vs ILTIC)
- [ ] **Factures** : calcul TVA A/B/C cohérent
- [ ] **PDF** : génération sans erreur, QR code lisible
- [ ] **IA** : endpoint `/functions/ai-router` répond en < 10s
- [ ] **Mobile** : sidebar responsive, pas de scroll horizontal
- [ ] **i18n** : pas de clés manquantes `[t('...')]`

---

## 7. PHASE 5 — CORRECTION VIA KIMI CLI K2.7

### 7.1 Principe de fonctionnement

Kimi CLI est un agent autonome qui peut :
- Lire/analyser le code source (`kimi` dans le dossier projet)
- Proposer et appliquer des patchs
- Exécuter des tests de validation
- Gérer le contexte Git

### 7.2 Workflow de correction itératif

```
Pour chaque BUG-[ID] :
  ┌─────────────────────────────────────┐
  │ 1. Documenter le bug dans bugs/       │
  │    → bugs/BUG-XXX-description.md    │
  ├─────────────────────────────────────┤
  │ 2. Lancer Kimi sur le fichier       │
  │    → cd wimrux_app/src              │
  │    → kimi "Corrige : [description   │
  │      du bug avec contexte]"          │
  ├─────────────────────────────────────┤
  │ 3. Kimi analyse, propose diff       │
  │    → Vérifier le diff               │
  ├─────────────────────────────────────┤
  │ 4. Appliquer si OK                  │
  │    → kimi accept                    │
  ├─────────────────────────────────────┤
  │ 5. Relancer test E2E ciblé          │
  │    → npx playwright test            │
  │      specs/XX-module.spec.ts        │
  ├─────────────────────────────────────┤
  │ 6. Si OK → commit                   │
  │    → git add . && git commit        │
  │      -m "fix(BUG-XXX): ..."        │
  │    Si KO → retour étape 2           │
  └─────────────────────────────────────┘
```

### 7.3 Commandes Kimi spécifiques par type de bug

| Type de bug | Commande Kimi suggérée |
|-------------|------------------------|
| Erreur API 404/401 | `kimi "L'appel API GET /api/database/records/invoices retourne 404. Vérifie la config client InsForge dans src/boot/ ou src/services/. La table s'appelle 'invoices' pas 'records'. Corrige l'URL et le format de requête."` |
| Auth refresh loop | `kimi "Au chargement initial, le store auth fait un refresh token sans refresh token présent, ce qui génère une 401. Ajoute une garde conditionnelle pour ne pas appeler refresh si aucun token n'est stocké. Cherche dans src/stores/auth-store.ts."` |
| Calcul TVA incorrect | `kimi "Dans le composant d'édition de facture, le calcul du total TTC pour le groupe taxe B est erroné. Vérifie la fonction computeTotals() et corrige le taux appliqué."` |
| Sélecteur E2E cassé | `kimi "Le test Playwright échoue car le data-testid='invoice-save-btn' n'existe plus dans le composant. Restaure le data-testid sur le bouton Sauvegarder dans src/pages/invoices/InvoiceEditor.vue."` |
| Performance LCP | `kimi "Le LCP sur la page /app est > 3s. Analyse le chargement des données dashboard et propose du lazy loading ou du skeleton pour les widgets."` |
| Fuite mémoire | `kimi "Des subscriptions InsForge realtime ne sont pas désabonnées dans le unmounted des composants Vue. Audit les onMounted/onUnmounted dans les pages clients et factures."` |

---

## 8. PHASE 6 — REGRESSION & DÉPLOIEMENT

### 8.1 Suite de non-régression

```bash
# Après chaque vague de corrections
cd c:\wamp64\www\wimrux_finances\wimrux_app

# 1. Lint
npm run lint

# 2. Tests unitaires (Vitest)
npm run test

# 3. Tests E2E complets
npx playwright test

# 4. Build production
npm run build

# 5. Vérifier build
# dist/spa doit contenir index.html + assets/
```

### 8.2 Déploiement Vercel (si tests OK)

```bash
cd c:\wamp64\www\wimrux_finances\wimrux_app

# Build
npm run build

# Déployer (TOUJOURS depuis wimrux_app, jamais dist/spa)
vercel deploy --prod --yes
```

> **Rappel** : `projectId: prj_7LlJLR5WSNjjwaxanJNPmhy2Gq8`  
> URL cible : `https://wimruxapp.vercel.app`

---

## 9. ARTEFACTS & LIVRABLES

| Fichier | Description |
|---------|-------------|
| `reports/inspection-rapide.json` | Résultat console + network de l'inspection Browserless |
| `reports/01-landing.png` … `09-*.png` | Captures écran par étape |
| `reports/e2e-playwright-report/` | Rapport HTML Playwright |
| `reports/e2e-browserless-report.json` | Résultats Browserless intégral |
| `bugs/BUG-001.md` … `BUG-NNN.md` | Fiches bugs individuelles |
| `bugs/RECAP-BUGS-2026-06-14.md` | Tableau récapitulatif des bugs |
| Ce fichier | Plan maître (read-only) |

---

## 10. CHECKLIST D'EXÉCUTION

### Préparation
- [ ] Vérifier connexion InsForge (backend up)
- [ ] Vérifier Browserless up (`docker ps` sur VPS)
- [ ] Vérifier comptes test OK (2FA désactivé)
- [ ] Créer dossier `wimrux_app/reports/` et `wimrux_app/bugs/`

### Phase 1 — Inspection
- [ ] Lancer `scripts/inspection-rapide.mjs`
- [ ] Documenter anomalies dans `bugs/RECAP-BUGS-2026-06-14.md`

### Phase 2 — E2E Playwright
- [ ] `npx playwright test` (tous les specs)
- [ ] Enregistrer échecs + erreurs console

### Phase 3 — Browserless intégral
- [ ] Exécuter scénarios B1 à B8
- [ ] Collecter captures + HAR

### Phase 4 — Catalogue
- [ ] Attribuer ID séquentiel à chaque bug
- [ ] Classer sévérité
- [ ] Lier à fichier source

### Phase 5 — Corrections Kimi
- [ ] Pour chaque bug High/Critical : lancer Kimi
- [ ] Valider patch → commit
- [ ] Relancer test ciblé

### Phase 6 — Livraison
- [ ] Tous les tests E2E passent (ou bugs reportés comme "known issues")
- [ ] Build OK
- [ ] Déployer sur Vercel
- [ ] Vérifier prod post-déploiement

---

## 11. COMMANDES RAPIDES (Copier-Coller)

```powershell
# === PRÉPARATION ===
mkdir -p c:\wamp64\www\wimrux_finances\wimrux_app\reports
mkdir -p c:\wamp64\www\wimrux_finances\wimrux_app\bugs

# === E2E LOCAL ===
cd c:\wamp64\www\wimrux_finances\wimrux_app
npx playwright test --reporter=list

# === E2E AVEC TRACE ===
npx playwright test --trace=on --reporter=html
npx playwright show-report e2e/playwright-report

# === KIMI CLI ===
# Analyser un bug spécifique
kimi "Dans src/stores/auth-store.ts, corrige la boucle de refresh token 401 au chargement initial"

# Audit d'un composant
kimi "Audit src/pages/invoices/InvoiceEditor.vue : recherche fuites mémoire, erreurs console, et calculs incorrects"

# === BUILD & DEPLOY ===
npm run build
vercel deploy --prod --yes
```

---

*Plan généré automatiquement le 2026-06-14 à 12:22 UTC.*  
*Prochaine étape suggérée : exécuter la Phase 1 (inspection rapide Browserless) puis documenter les résultats.*
