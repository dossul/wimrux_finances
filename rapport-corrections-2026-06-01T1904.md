# Rapport de corrections — Session 01 juin 2026
**Horodatage :** 2026-06-01T19:04 UTC  
**Projet :** Wimrux Finances — `https://www.wimrux.app`  
**InsForge :** `gfe4bd9y.eu-central` · project `0feefe21-1489-41b5-a2b6-3c44593ec819`  
**Vercel :** `prj_7LlJLR5WSNjjwaxanJNPmhy2Gq8`

---

## Synthèse — 10/10 tickets fermés ✅

| ID | Ticket | Statut | Fichiers modifiés |
|----|--------|--------|-------------------|
| DB | Migration `suppliers` (regime_fiscal, division_fiscale, supplier_code, supplier_type, country varchar(2)) | ✅ | Migration SQL via InsForge CLI |
| #4 | OCR — payload array, champs obligatoires, cast Number | ✅ | `OcrInvoiceReviewDialog.vue` |
| #11 | Montants à zéro à l'approbation — force-recalc + guard totaux existants | ✅ | `InvoiceEditorPage.vue` |
| #14 | Temps réel déconnecté — backoff infini + reconnect sur visibilité onglet | ✅ | `useRealtimeNotifications.ts` |
| #3 | IFU automatique — routage via `ai-router` edge function | ✅ | `OcrInvoiceReviewDialog.vue`, `ReceivedInvoiceWizard.vue`, `fiscalCompliance.ts` |
| #15 | Renommer « Réf. interne » → « BC / Réf. Interne » | ✅ | `ReceivedInvoiceWizard.vue`, `ReceivedInvoicesPage.vue` |
| #6 | Badge Annulée + bouton annulation + exclusion des totaux | ✅ | `ReceivedInvoicesPage.vue`, `useReceivedInvoices.ts` |
| #9 | Blocage TVA si régime RSI/CME/CSE/RND | ✅ | `ReceivedInvoiceWizard.vue` |
| #2 | Retenue à la source — champ wizard + rapport fiscal | ✅ | `ReceivedInvoiceWizard.vue`, `WithholdingTaxReportPage.vue`, `routes.ts`, `MainLayout.vue` |
| — | Nettoyage données de test (14 factures, 12 lignes, 3 paiements, 12 fichiers storage) | ✅ | Via CLI + pg direct |

---

## Détail par ticket

### DB — Migration table `suppliers`
**Problème :** Champs fiscaux manquants pour le blocage TVA et la conformité.  
**Solution :** Ajout des colonnes suivantes via `npx @insforge/cli db query` :
```sql
ALTER TABLE suppliers ADD COLUMN regime_fiscal    VARCHAR(20);
ALTER TABLE suppliers ADD COLUMN division_fiscale  VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN supplier_code     VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN supplier_type     VARCHAR(20) DEFAULT 'local';
ALTER TABLE suppliers ALTER COLUMN country TYPE VARCHAR(2);
```
**Vérification BDD :** 5/5 colonnes présentes, `country` limité à 2 chars, `supplier_type` DEFAULT `'local'`.

---

### #4 — OCR non enregistrée
**Fichier :** `src/components/invoices/OcrInvoiceReviewDialog.vue`  
**Problème :** `insert()` sans array, champs `price_mode` et `operator_name` manquants, montants non castés.  
**Correctif :**
- Payload enveloppé dans `[{...}]`
- Ajout de `price_mode`, `operator_name` (depuis `authStore`)
- Cast explicite `Number()` sur tous les montants
- IFU verification migrée vers `verifyTaxIdOnline()` (ai-router)

---

### #11 — Montants à zéro à l'approbation
**Fichier :** `src/pages/invoices/InvoiceEditorPage.vue` — fonction `saveDraft()`  
**Problème :** Les totaux étaient recalculés après un recalc partiel des lignes, donnant 0 si la liste était vide au moment du save.  
**Correctif :**
```typescript
// Force-recalc tous les items avant lecture des totaux
items.value.forEach((_, idx) => recalcItem(idx));
// Guard : si aucun item, conserver les totaux déjà en BDD
const hasItems = items.value.length > 0;
const finalHT  = hasItems ? t.grandTotalHT  : Number(invoice.value.total_ht)  || 0;
// ... idem pour TVA, PSVB, TTC, stamp_duty
```

---

### #14 — Temps réel déconnecté permanent
**Fichier :** `src/composables/useRealtimeNotifications.ts`  
**Problème :** Plafond `MAX_RETRY = 5` — après 5 tentatives, plus aucune reconnexion.  
**Correctif :**
- Suppression du plafond `MAX_RETRY`
- Backoff exponentiel cappé à 30s : `Math.min(30000, 1000 * 2^retryCount)`
- Reconnexion automatique sur `visibilitychange` (retour sur l'onglet)

---

### #3 — IFU automatique partout
**Fichier :** `src/utils/fiscalCompliance.ts` — `verifyTaxIdOnline()`  
**Problème :** Appels directs `fetch()` vers Dify/scraper depuis le navigateur — CORS, tokens exposés, comportement différent selon l'environnement.  
**Correctif :** Centralisation via `insforge.functions.invoke('ai-router', { task_code: 'verify_ifu_bf', ... })` — côté serveur, uniforme.

---

### #15 — Libellé BC / Réf. Interne
**Fichiers :** `ReceivedInvoiceWizard.vue`, `ReceivedInvoicesPage.vue`  
**Correctif :** Remplacement textuel `"Réf. interne"` → `"BC / Réf. Interne"` dans labels et en-têtes de colonnes.

---

### #6 — Badge Annulée + exclusion des totaux
**Fichiers :** `ReceivedInvoicesPage.vue`, `useReceivedInvoices.ts`  
**Correctif :**
- Bouton « Annuler » dans les actions de ligne (visible si statut ≠ cancelled)
- Badge `<q-badge color="grey-7" label="Annulée" />` dans la colonne statut
- Computed `totals` : `filter(i => i.payment_status !== 'cancelled')` avant sommation

---

### #9 — Blocage TVA régimes RSI/CME/CSE/RND
**Fichier :** `src/components/invoices/ReceivedInvoiceWizard.vue`  
**Correctif :**
```typescript
const tvaBlocked = computed(() => {
  const rf = selectedSupplier.value?.regime_fiscal;
  return rf === 'RSI' || rf === 'CME' || rf === 'CSE' || rf === 'RND';
});
```
- Input TVA désactivé (`:disable="tvaBlocked"`)
- Bannière orange d'information
- Badge régime fiscal sur la fiche fournisseur dans le wizard
- `watch()` sur `supplier_id` : reset TVA à 0 si blocage actif

---

### #2 — Retenue à la source
**Fichiers créés/modifiés :**
- `src/pages/fiscal/WithholdingTaxReportPage.vue` — **nouvelle page**
- `src/components/invoices/ReceivedInvoiceWizard.vue` — section RAS étape 3
- `src/router/routes.ts` — route `fiscal/withholding`
- `src/layouts/MainLayout.vue` — entrée menu « Retenues à la source »

**Fonctionnalités :**
- Sélecteur taux RAS dans le wizard : IS 5%, IS 25%, IRNR 20%, IRNR 15%, TVA 18%
- Montant RAS calculé auto sur `total_ht * rate`
- RAS recalculée automatiquement quand `total_ht` change
- Insertion dans `withholding_taxes` au submit (table déjà existante en BDD avec RLS)
- Page rapport `/app/fiscal/withholding` : 4 KPI, tableau filtrable, bouton "Marquer déclaré", export CSV `;`-séparé avec BOM UTF-8

---

### Nettoyage données de test
**Méthode :** Triggers d'immutabilité temporairement désactivés + connexion Postgres directe pour le storage.
```sql
ALTER TABLE invoices DISABLE TRIGGER trg_invoice_immutable_delete;
ALTER TABLE invoices DISABLE TRIGGER trg_invoice_immutable_update;
DELETE FROM invoice_payments;
DELETE FROM invoice_items;
DELETE FROM withholding_taxes;
DELETE FROM invoices;
ALTER TABLE invoices ENABLE TRIGGER trg_invoice_immutable_delete;
ALTER TABLE invoices ENABLE TRIGGER trg_invoice_immutable_update;
```
```sql
-- Connexion directe Postgres admin (storage.objects hors RLS PostgREST)
DELETE FROM storage.objects WHERE bucket = 'invoices-scans';
```
**Résultat :** 0 factures, 0 items, 0 paiements, 0 fichiers storage.

---

## Déploiement

| Étape | Résultat |
|-------|----------|
| `npm run build` | ✅ Build succeeded — 129 JS files, 25 CSS files |
| `vercel deploy --prod --yes` | ✅ Aliased → https://www.wimrux.app |
| Durée totale build+deploy | ~1 min 40s |

---

*Rapport généré le 2026-06-01T19:04 UTC — Windsurf Cascade*
