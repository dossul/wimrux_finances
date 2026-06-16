# Checklist de préparation production — WIMRUX® Finances

Cette liste regroupe les vérifications que l'E2E automatisé ne couvre pas (effets de bord réels, intégrations tierces, sécurité, procédures).

## Automatisation E2E (DoD technique)

- [ ] `npm run test:e2e:smoke` passe à 100 % (navigation sans 404/500)
- [ ] `npm run test:e2e:functional` passe à 100 % (parcours métier)
- [ ] 0 erreur réseau critique (4xx/5xx non attendues) dans le collecteur
- [ ] `npm run build` réussit sans erreur

## Vérifications manuelles obligatoires

### Fiscal & certification

- [ ] Certification DGI réelle (API FNEC/MCF, pas le simulateur) sur 1 facture test
  - Vérifier le retour MCF, le MCF UID et l'horodatage dans `INVOICE.mcfUid`
  - Ne pas exécuter via l'E2E automatisé (effet fiscal irréversible)

### Authentification & notifications

- [ ] Réception OTP WhatsApp réelle (activer 2FA sur un compte, login complet)
- [ ] Test de connexion depuis un navigateur en navigation privée

### Rendu documentaire

- [ ] Rendu PDF facture : sticker fiscal, QR code (`INVOICE.mcfQrcode`), mentions légales, logo société
- [ ] Rendu PDF duplicata

### Paiements & crédits

- [ ] Achat crédits IA / gateway paiement (flux réel bout-en-bout en sandbox puis prod)
- [ ] Vérifier la mise à jour du solde crédits IA après paiement

### Permissions & sécurité

- [ ] Permissions par rôle : `admin` vs `project_admin`
  - Les routes `/app/admin/*` doivent être bloquées pour le rôle `admin`
  - Le rôle `project_admin` doit y avoir accès
- [ ] RLS Appwrite : un utilisateur d'une société ne voit pas les données d'une autre
  - Tester avec deux comptes sur deux `company_id` différents

### Infrastructure & ops

- [ ] Sauvegarde + test de restauration base Appwrite
- [ ] Plan de rollback Vercel documenté (git revert + `vercel --prod` précédent)
- [ ] Variables d'environnement de prod vérifiées (Appwrite endpoint, clés IA, gateway paiement)

## Definition of Done (prêt prod)

| Couche | Cible | Commande de vérification |
| --- | --- | --- |
| Smoke navigation | 100 % pages sans 404/500 | `npm run test:e2e:smoke` |
| E2E fonctionnels | Tous parcours métier verts | `npm run test:e2e:functional` |
| Erreurs réseau | 0 erreur 4xx/5xx non attendue | Collecteur critique |
| Régression dashboard | CA ≠ 0, graphe non plat | Spec `03-dashboard-integrity.spec.ts` |
| Checklist manuelle | 100 % items cochés | Ce fichier |

## Gate de déploiement

```bash
npm run test:e2e:smoke
npm run test:e2e:functional
# Si les deux commandes retournent 0 :
npm run build
vercel deploy --prod --yes
```

> Règle : échec fonctionnel = pas de déploiement.

## Bugs bloquants corrigés lors de la mise en place E2E

| Bug | Fichier(s) | Correction |
| --- | --- | --- |
| `comments` et `tax_calculation` stockés comme `string` en Appwrite mais manipulés comme objets/tableaux dans l'éditeur de facture | `src/pages/invoices/InvoiceEditorPage.vue` | Sérialisation JSON à l'envoi, parsing JSON au chargement |
| `company_id` manquant à l'insertion des lignes de facture dans `saveDraft` | `src/pages/invoices/InvoiceEditorPage.vue` | Ajout de `company_id` dans le payload `invoice_items` |
| `appwrite-db.ts` ne remplissait pas l'attribut `id` requis par les index uniques `*_pkey` | `src/services/appwrite-db.ts` | Injection systématique de `id` dans `insert()` |
| Permissions Appwrite insuffisantes sur `treasury_movements` (lecture seule) | Collection Appwrite `treasury_movements` | `read/create/update/delete("users")` via l'API Appwrite |
| Nettoyage E2E utilisait `account_id` au lieu de `treasury_account_id` | `e2e/helpers/cleanup.helper.ts` | Utilisation de `treasury_account_id` avec fallback |
| Workflow facture flaky car doubles clics pendant `saveDraft` | `e2e/specs/functional/02-invoice-lifecycle.spec.ts` | `clickUntilStatus` avec retry et attente du statut |
| Dashboard KPI interprétait "1 500 000" comme "0" | `e2e/specs/functional/03-dashboard-integrity.spec.ts` | Assertion par regex sur montant non nul |
| Trésorerie : solde lu avant mise à jour asynchrone | `e2e/specs/functional/04-treasury.spec.ts` | `expect.poll` sur le solde avant/après reload |
| `appwriteDb.in([])` listait toute la collection | `src/services/appwrite-db.ts` | Query impossible (`__empty_in_list__`) quand le tableau est vide |
| Helper E2E `createInvoiceViaApi` autorisait `status: 'certified'` sans métadonnées | `e2e/helpers/invoices.helper.ts` | Refus de `'certified'` dans `createInvoiceViaApi` ; nouveau `createCertifiedInvoiceViaApi` dédié |
| Helper E2E écrivait `type: 'Bien local'` (valeur invalide) | `e2e/helpers/invoices.helper.ts` | Utilisation de `'LOCBIE'` |
| Helper E2E omettait `operator_name`, `comments`, PSVB | `e2e/helpers/invoices.helper.ts` | Ajout systématique dans les payloads |
| Documents legacy sans `id` dans `companies`/`user_profiles` | Appwrite DB | Backfill `id = $id` effectué le 2026-06-16 |
