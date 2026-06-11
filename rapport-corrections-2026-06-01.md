# Rapport de corrections — Wimrux Finances
**Date :** 01 juin 2026 — 17:30 UTC  
**Version déployée :** https://www.wimrux.app  
**Build :** `dist/build` (Quasar SPA, Vite)  
**Déploiement :** Vercel Production ✔ (alias www.wimrux.app)

---

## Résumé des corrections

| # | Ticket | Titre | Statut |
|---|--------|-------|--------|
| 1 | DB | Migration `suppliers` : champs fiscaux + `country` varchar(2) | ✅ Fait |
| 2 | #4 | OCR — facture non enregistrée silencieusement | ✅ Fait |
| 3 | #11 | Montants à zéro à l'approbation (`saveDraft`) | ✅ Fait |
| 4 | #14 | Temps réel déconnecté en permanence | ✅ Fait |
| 5 | #3 | IFU automatique uniquement sur un PC | ✅ Fait |
| 6 | #15 | Libellé « Réf. interne » incorrect | ✅ Fait |
| 7 | #6 | Facture annulée : bouton + badge + exclusion totaux | ✅ Fait |
| 8 | #9 | Blocage TVA fournisseur RSI/CME | ✅ Fait |
| 9 | – | Build + déploiement Vercel | ✅ Fait |
| 10 | #2 | Retenue à la source + rapport fiscal | ⏳ À faire |

---

## Détail technique

### 1 · Migration base de données `suppliers`
**Fichier :** exécuté via InsForge SQL (MCP)  
**Changements :**
- Ajout `regime_fiscal VARCHAR(20)` (valeurs : RNI, RSI, CME, CSE, RND)
- Ajout `division_fiscale VARCHAR(100)`
- Ajout `supplier_code VARCHAR(50)`
- Ajout `supplier_type VARCHAR(20)` DEFAULT `'local'`
- `country` converti de `VARCHAR(3)` → `VARCHAR(2)` (ISO 3166-1 alpha-2)

**Vérification :** schéma confirmé via `get-table-schema`.

---

### 2 · Fix #4 — OCR facture non enregistrée
**Fichier :** `src/components/invoices/OcrInvoiceReviewDialog.vue`  
**Cause :** le payload d'insert était un objet `{}` au lieu d'un tableau `[{}]` ; champs `price_mode` et `operator_name` manquants ; montants non castés en `Number`.  
**Fix :**
- Encapsulation du payload dans un tableau `[payload]`
- Ajout de `price_mode: 'HT'` et `operator_name` (via `authStore.fullName`)
- Cast explicite `Number(...)` sur tous les montants
- Import et instanciation de `useAuthStore` dans le composant

---

### 3 · Fix #11 — Montants à zéro à l'approbation
**Fichier :** `src/pages/invoices/InvoiceEditorPage.vue` — fonction `saveDraft()`  
**Cause racine :** lors du submit `draft → pending_validation`, `saveDraft(true)` était appelé avant que `recalcItem` ait été appliqué à tous les items chargés depuis la DB. Les `amount_ht/tva/ttc` de chaque ligne pouvaient être `0` si l'utilisateur n'avait pas touché aux lignes manuellement depuis le chargement.  
**Fix :**
```ts
// Force-recalc all items before reading totals
items.value.forEach((_, idx) => recalcItem(idx));
```
- Guard supplémentaire : si `items.length === 0`, conserver les montants déjà enregistrés (`invoice.value.total_ht/ttc`) plutôt d'écraser avec 0.

---

### 4 · Fix #14 — Temps réel déconnecté en permanence
**Fichier :** `src/composables/useRealtimeNotifications.ts`  
**Cause :** tentatives limitées à `MAX_RETRY = 3`, sans reconnexion après changement de visibilité de l'onglet.  
**Fix :**
- Suppression du plafond `MAX_RETRY`
- Backoff exponentiel plafonné à 60 secondes (infini)
- Reconnexion automatique sur `document.visibilitychange` (retour onglet actif)

---

### 5 · Fix #3 — IFU automatique seulement sur un PC
**Fichiers :** `OcrInvoiceReviewDialog.vue`, `ReceivedInvoiceWizard.vue`  
**Cause :** appels `fetch()` directs vers `VITE_IFU_SCRAPER_URL` et `VITE_DIFY_IFU_WORKFLOW_URL` — variables d'environnement locales uniquement, absentes en production ou sur autres machines.  
**Fix :** remplacement de toutes les vérifications IFU par `verifyTaxIdOnline()` (`src/utils/fiscalCompliance.ts`) qui route via l'edge function `ai-router` (InsForge) — côté serveur, indépendant de la machine cliente.

---

### 6 · Fix #15 — Libellé « Réf. interne » incorrect
**Fichiers :** `ReceivedInvoiceWizard.vue`, `ReceivedInvoicesPage.vue`  
**Changement :** `Réf. interne` → `BC / Réf. Interne` dans le wizard (étape recap) et dans l'en-tête de colonne de la liste des factures reçues.

---

### 7 · Fix #6 — Annuler facture : bouton + badge + exclusion des totaux
**Fichiers :** `ReceivedInvoicesPage.vue`, `useReceivedInvoices.ts`  
**Changements :**
- Bouton « Annuler » visible pour statuts `draft` et `pending_validation`
- Badge `Annulée` (couleur grise) dans la colonne statut
- `stats` computed : filtre `payment_status !== 'cancelled'` — les factures annulées sont exclues des KPI et totaux.

---

### 8 · Fix #9 — Blocage TVA fournisseur RSI/CME
**Fichier :** `src/components/invoices/ReceivedInvoiceWizard.vue`  
**Logique :**
- Computed `tvaBlocked` : `true` si `regime_fiscal` ∈ {`RSI`, `CME`, `CSE`, `RND`}
- Le champ TVA est désactivé (`:disable="tvaBlocked"`) avec hint explicatif
- `autoCalcTva()` force `total_tva = 0` si `tvaBlocked`
- `watch` sur `supplier_id` : réinitialise la TVA à 0 dès changement de fournisseur bloqué
- Badge de couleur par régime fiscal affiché dans la fiche fournisseur sélectionné
- Bannière d'avertissement orange visible à l'étape 1

---

## Déploiement

```
Build local     : ✔ npm run build (Quasar SPA, 0 erreur TypeScript)
Vercel deploy   : ✔ Production  https://www.wimrux.app
Commit Vercel   : wimrux-j9hf5dw0e-dossulrich-gmailcoms-projects.vercel.app
Temps total     : ~54 secondes
```

---

## Reste à faire

### #2 · Retenue à la source
- Ajouter colonne `withholding_tax NUMERIC DEFAULT 0` sur la table `invoices`
- Ajouter le champ dans le wizard et l'éditeur de facture
- Générer un rapport fiscal CSV/PDF : liste des factures avec RAS, totaux par fournisseur, période sélectionnable
- Préparer une page dédiée ou un onglet dans le module Rapports

---

*Rapport généré automatiquement — session Windsurf Cascade*
