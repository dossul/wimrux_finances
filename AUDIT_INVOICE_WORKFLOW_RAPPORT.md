# WIMRUX® Finances — Rapport d'audit workflow factures
**Date de livraison :** 2026-06-02 13:54 UTC  
**Environnement cible :** https://wimruxapp.vercel.app  
**Backend InsForge :** https://gfe4bd9y.eu-central.insforge.app  
**Build :** exit code 0 — 0 erreur TypeScript

---

## PHASE A — Bugs critiques

### A1 · Persistance RAS (withholding_tax_rate / withholding_tax_amount)
**Fichiers modifiés :**
- `src/composables/useReceivedInvoices.ts` — interface + createInvoice/updateInvoice
- `src/components/invoices/ReceivedInvoiceWizard.vue` — hydratation depuis BD

**Ce qui était cassé :** les champs `withholding_tax_rate` et `withholding_tax_amount` n'étaient pas sauvegardés en base (colonnes manquantes dans le payload).

**Migration SQL appliquée :** colonnes ajoutées sur la table `invoices`.

**Test manuel :**
1. Aller dans **Factures reçues** → Nouvelle facture reçue
2. Au step fiscal, saisir un taux RAS (ex. 5%) et valider
3. Fermer le wizard → rouvrir la facture en édition
4. Vérifier que le taux RAS est bien pré-rempli à 5%
5. **Attendu :** valeur persistée, non remise à zéro

---

### A2 · Guard doublon RAS + type hors_facture
**Fichiers modifiés :**
- `src/components/invoices/ReceivedInvoiceWizard.vue` — suppression de l'ancienne RAS avant recréation

**Ce qui était cassé :** à chaque sauvegarde du wizard, une nouvelle entrée `withholding_taxes` était créée en doublon.

**Test manuel :**
1. Créer une facture reçue avec RAS 5%
2. Rouvrir en édition → changer le taux à 3% → Enregistrer
3. Aller dans **Déclarations fiscales → Retenues à la source**
4. **Attendu :** une seule entrée RAS pour cette facture (pas deux)

---

### A3 · Wizard reçues read-only si statut ≠ draft
**Fichiers modifiés :**
- `src/pages/invoices/ReceivedInvoicesPage.vue` — `wizardReadOnly` basé sur le statut
- `src/components/invoices/ReceivedInvoiceWizard.vue` — prop `readOnly`, computed `isReadOnly`, bandeau visuel

**Ce qui était cassé :** une facture validée pouvait être modifiée librement.

**Test manuel :**
1. Créer une facture reçue → la soumettre → l'approuver → la valider
2. Cliquer sur l'icône ✏️ (édition) de cette facture
3. **Attendu :** wizard ouvert avec bandeau jaune **"Lecture seule"**, tous les champs désactivés, bouton Enregistrer grisé

---

### A4 · Référence séquentielle facture reçue
**Fichiers modifiés :**
- `src/components/invoices/ReceivedInvoiceWizard.vue` — appel RPC `next_invoice_reference` au step 2

**Ce qui était cassé :** les factures reçues avaient une référence UUID aléatoire au lieu d'un numéro séquentiel type `FR-2026-0001`.

**Test manuel :**
1. Créer 3 factures reçues successivement
2. **Attendu :** références `FR-2026-0001`, `FR-2026-0002`, `FR-2026-0003` (ou continuation de la séquence existante)

---

### A5 · Guard suppression si paiements enregistrés
**Fichiers modifiés :**
- `src/composables/useReceivedInvoices.ts` — `deleteInvoice()` vérifie `paid_amount > 0`

**Ce qui était cassé :** on pouvait supprimer une facture ayant déjà des paiements enregistrés.

**Test manuel :**
1. Créer une facture reçue → enregistrer un paiement partiel dessus
2. Tenter de supprimer la facture (icône 🗑️)
3. **Attendu :** message d'erreur "Impossible de supprimer : des paiements sont déjà enregistrés"

---

## PHASE B — Workflow & permissions

### B1 · Composable useReceivedInvoiceWorkflow
**Fichier créé :** `src/composables/useReceivedInvoiceWorkflow.ts`

**Ce qui a été ajouté :**
- Transitions : `draft → pending_validation → approved → validated`
- Anti-fraude : le soumetteur ne peut pas approuver sa propre facture
- Tracking : `submitted_by/at`, `approved_by/at`, `rejected_by/at`, `rejection_reason`
- Annulation bloquée si paiements > 0

---

### B2 · Permissions workflow
**Fichier modifié :** logique de permissions dans le composable workflow

**Permissions implémentées :**
| Action | Permission requise |
|--------|-------------------|
| Soumettre | `received_invoices.submit` |
| Approuver | `received_invoices.approve` |
| Valider | `received_invoices.validate` |
| Annuler | `received_invoices.cancel` |

**Test manuel :**
1. Se connecter avec un utilisateur sans permission `approve`
2. Ouvrir une facture en statut `pending_validation`
3. **Attendu :** bouton **Approuver** absent ou grisé

---

### B3 · UI workflow dans ReceivedInvoicesPage
**Fichier modifié :** `src/pages/invoices/ReceivedInvoicesPage.vue`

**Ce qui a été ajouté :**
- Badge couleur statut dans la table (draft=gris, pending=orange, approved=bleu, validated=vert)
- Boutons d'action contextuels : **Soumettre / Approuver / Valider** selon statut courant
- Dialog de confirmation avec motif de rejet obligatoire

**Test manuel :**
1. Créer une facture reçue (statut `draft`)
2. **Attendu :** bouton **"Soumettre"** visible dans la ligne → cliquer → statut passe à `pending_validation`
3. **Attendu :** bouton **"Approuver"** visible → cliquer → statut `approved`
4. **Attendu :** bouton **"Valider"** visible → cliquer → statut `validated`
5. Tester aussi le rejet : cliquer **"Rejeter"** → saisir un motif → valider
6. **Attendu :** statut repasse à `draft`, motif enregistré

---

### B4 · Remplacement validateInvoice/cancelInvoice
**Fichier modifié :** `src/composables/useReceivedInvoices.ts`

**Ce qui a changé :** `validateInvoice()` et `cancelInvoice()` passent maintenant par `executeTransition()` avec tracking complet.

---

## PHASE D1 — Paiements fiscaux & email

### D1a · Guard doublon paiement fiscal
**Fichier modifié :** `src/composables/useTaxPayments.ts` — `createTaxPayment()`

**Ce qui a été ajouté :** si le champ `dgi_receipt_number` est renseigné, vérification en base qu'aucun autre paiement n'a le même numéro de quittance pour la même date.

**Test manuel :**
1. Aller dans **Paiements fiscaux** → Saisie manuelle
2. Saisir un paiement avec N° quittance DGI = `QUI-2026-001`, date = aujourd'hui → Créer
3. Recréer un paiement avec le même N° quittance et la même date
4. **Attendu :** message d'erreur "Doublon : un paiement avec la quittance QUI-2026-001 existe déjà pour cette date"

---

### D1b · Suppression paiement fiscal
**Fichier modifié :** `src/composables/useTaxPayments.ts` — nouvelle fonction `deleteTaxPayment()`  
**Fichier modifié :** `src/pages/invoices/TaxPaymentsPage.vue` — bouton 🗑️ + dialog confirmation

**Ce qui a été ajouté :**
- Bouton **Supprimer** (icône `delete_forever` rouge) visible uniquement sur les paiements `pending`
- Dialog de confirmation avant suppression
- Guard : les paiements `validated` ou `rejected` ne peuvent pas être supprimés

**Test manuel :**
1. Créer un paiement fiscal (statut `pending`)
2. Cliquer l'icône 🗑️ → confirmer
3. **Attendu :** paiement supprimé de la liste
4. Valider un autre paiement (icône ✓) → tenter de le supprimer
5. **Attendu :** message d'erreur "Seuls les paiements en attente peuvent être supprimés"

---

### D1c · Notifications d'erreur sur actions fiscales
**Fichier modifié :** `src/pages/invoices/TaxPaymentsPage.vue`

**Ce qui a changé :** toutes les actions (valider, rejeter, supprimer, créer, modifier) affichent maintenant le message d'erreur précis du composable en cas d'échec (au lieu de ne rien afficher ou d'afficher "Erreur inconnue").

---

### D3 · Email de confirmation paiement fournisseur
**Fichier modifié :** `src/components/payments/PaymentDialog.vue`

**Ce qui a été ajouté :** quand un paiement **total** (facture soldée à 100%) est enregistré ET que le fournisseur a un email renseigné, une dialog propose d'envoyer un accusé de paiement.

**Template email utilisé :** `payment_confirmed` (function InsForge `send-email`)  
**Données transmises :** nom fournisseur, référence facture, montant, date, mode de paiement

**Test manuel :**
1. Aller dans **Factures reçues** → choisir une facture non payée dont le fournisseur a un email renseigné
2. Cliquer le bouton 💳 (Enregistrer paiement)
3. Saisir le montant exact restant dû → Enregistrer
4. **Attendu :** dialog "Envoyer un accusé de paiement ?" avec le nom et l'email du fournisseur
5. Cliquer **Envoyer**
6. **Attendu :** notification "Reçu envoyé à supplier@example.com"
7. Vérifier la boîte email du fournisseur → email avec objet "Paiement reçu — [REF]"

**Note :** si le fournisseur n'a pas d'email renseigné, la dialog n'apparaît pas.

---

## Récapitulatif des fichiers modifiés

| Fichier | Tâches |
|---------|--------|
| `src/composables/useReceivedInvoices.ts` | A1, A5, B4 |
| `src/composables/useTaxPayments.ts` | D1a, D1b |
| `src/composables/useReceivedInvoiceWorkflow.ts` | B1, B2 (créé) |
| `src/components/invoices/ReceivedInvoiceWizard.vue` | A1, A2, A3, A4 |
| `src/components/payments/PaymentDialog.vue` | D3 |
| `src/pages/invoices/ReceivedInvoicesPage.vue` | A3, B3 |
| `src/pages/invoices/TaxPaymentsPage.vue` | D1b, D1c |

---

## Déploiements effectués

| Date (UTC) | Action | Résultat |
|------------|--------|----------|
| 2026-06-02 13:50 | `npm run build` | ✅ exit 0, 0 erreur |
| 2026-06-02 13:52 | `vercel deploy --prod --yes` | ✅ Déployé → https://wimruxapp.vercel.app |

---

*Rapport généré automatiquement par Cascade / Windsurf — WIMRUX® Finances*
