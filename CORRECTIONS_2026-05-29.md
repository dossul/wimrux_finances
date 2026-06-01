# 📋 WIMRUX® FINANCES — Corrections & Améliorations
> Session de test : **29/05/2026 · 18h46–19h42 (heure locale)**
> Participants : Iltic (dev), Eric Belisle (testeur)
> Priorités : 🔴 Bloquant · 🟠 Important · 🟡 Mineur

---

## 🔴 BLOQUANTS

### B-01 · Montants tombent à zéro lors de la soumission pour approbation
- **Constaté** : 19h14 — Eric Belisle
- **Symptôme** : Quand on soumet une facture pour approbation (workflow d'approbation), les montants (HT, TVA, TTC) passent à 0 même si la facture n'est pas payée.
- **Module** : Workflow d'approbation → `ReceivedInvoiceWizard` ou page de modification de facture
- **Action** : Identifier le handler `onSubmitForApproval` ou équivalent et vérifier qu'il ne réinitialise pas le payload des montants.

### B-02 · Déconnexion automatique fréquente
- **Constaté** : 19h27 — Eric Belisle
- **Symptôme** : L'utilisateur se déconnecte fréquemment en cours de session, perdant potentiellement des saisies en cours.
- **Lien** : Peut être lié à l'expiration du token InsForge ou au manque de refresh automatique.
- **Action** : Vérifier le `token-refresh` et le `useAuthStore` — s'assurer que le refresh silencieux fonctionne bien. Tester en navigation privée.

### B-03 · "Temps réel déconnecté" s'affiche toujours
- **Constaté** : 19h22 — Eric Belisle
- **Symptôme** : Le badge "Temps réel déconnecté" apparaît en permanence même quand la connexion est fonctionnelle.
- **Cause probable** : Séparation Wimrux / Wimrux Facturation — certains canaux Realtime n'ont pas été correctement migrés.
- **Action** : Vérifier la souscription au canal Realtime InsForge dans `useReceivedInvoices` ou le composable Realtime.

### B-04 · Upload de pièce jointe (PDF) échoue
- **Constaté** : 19h26 — Eric Belisle
- **Symptôme** : Le PDF ne passe pas lors de l'ajout d'un justificatif de paiement.
- **Action** : Vérifier les erreurs console, contrôler la taille max acceptée par le bucket InsForge `invoices-scans` et la politique CORS.

---

## 🟠 IMPORTANTS

### I-01 · Fournisseur non existant via OCR → cas non géré
- **Constaté** : 18h46 — Eric Belisle / Iltic
- **Comportement actuel** : Un nouveau fournisseur est créé automatiquement ("Nouveau fournisseur créé : MAC SERVICES"). Les champs requis ne sont pas tous renseignés.
- **Attendu** : 
  1. Après création automatique, rediriger l'utilisateur vers la fiche fournisseur pour complétion des champs obligatoires.
  2. OU bloquer la création si les champs minimums sont absents et proposer la saisie inline dans la dialog OCR.

### I-02 · Champs obligatoires manquants dans la fiche Fournisseur
- **Constaté** : 18h59 — Eric Belisle
- **Champs à rendre obligatoires** :
  - **Division Fiscale** (ex : DME-CV, DME-Centre, DGE...)
  - **Régime Fiscal** : obligatoire — valeurs possibles :
    - `RSI` (Régime Simplifié d'Imposition) → **interdiction automatique de charger la TVA**
    - `RNI` (Régime Normal d'Imposition) → TVA facturée
    - `CME` (Contribution des Micro-Entreprises) → **pas de TVA**
    - + autres régimes si besoin
- **Impact** : Le régime fiscal doit aussi figurer sur la facture (obligation légale BF).
- **Action** : Ajouter `regime_fiscal` et `division_fiscale` dans le schéma `suppliers` + formulaire fournisseur + validation.

### I-03 · Régime fiscal doit apparaître sur la facture
- **Constaté** : 19h02 — Eric Belisle
- **Attendu** : Le régime d'imposition du fournisseur doit être affiché dans la fenêtre/aperçu de la facture reçue (obligation légale).
- **Action** : Ajouter dans la fiche de visualisation facture les champs `regime_fiscal` et `division_fiscale` du fournisseur.

### I-04 · TVA automatiquement bloquée selon le régime fiscal
- **Constaté** : 19h00 — Eric Belisle
- **Règle métier** : Si régime = RSI ou CME → TVA = 0 et le champ TVA doit être désactivé/verrouillé lors de la saisie de facture.
- **Action** : Dans `ReceivedInvoiceWizard` et `OcrInvoiceReviewDialog`, détecter le régime du fournisseur sélectionné et appliquer la règle.

### I-05 · Suppression de facture — autoriser uniquement si aucun paiement
- **Constaté** : 18h48 — Iltic
- **Règle** : La suppression d'une facture ne doit être possible que si `paid_amount = 0` et aucun paiement enregistré.
- **Action** : Ajouter un guard dans la fonction de suppression + afficher le bouton supprimer seulement si ces conditions sont remplies.

### I-06 · Statut "Annulée" pour une facture
- **Constaté** : 18h49 — Eric Belisle
- **Demande** : Pouvoir annuler une facture sans la supprimer. La facture reste dans le système avec un statut `cancelled` / "Annulée".
- **Action** : Ajouter le statut `cancelled` à l'enum `status` des invoices + bouton "Annuler la facture" dans le menu d'actions + badge visuel dans la liste.

### I-07 · Échéance disparaît sur la 1ère ligne de la liste
- **Constaté** : 19h37 — Eric Belisle
- **Symptôme** : Après création d'une facture, la colonne "Échéance" est vide sur certaines lignes (visible sur la facture E.G.S.N-WP : `—`).
- **Action** : Vérifier le calcul et l'enregistrement de `due_date` dans `useReceivedInvoices` et `ReceivedInvoiceWizard`.

### I-08 · Champ "Code fournisseur" manquant
- **Constaté** : 19h18 — Eric Belisle
- **Demande** : Ajouter un champ `code_fournisseur` (référence interne) dans la fiche Fournisseur.
- **Action** : Ajouter colonne `supplier_code` dans la table `suppliers` + champ dans le formulaire fournisseur.

### I-09 · Type de fournisseur : Local / Étranger
- **Constaté** : 19h21 — Eric Belisle
- **Demande** : Ajouter un menu sélectif **Fournisseur Local / Fournisseur Étranger** dans la fiche fournisseur.
- **Note** : Les fournisseurs étrangers ont des particularités fiscales (retenue à la source, TVA import...) à définir dans une prochaine phase.
- **Action** : Ajouter `supplier_type ENUM('local', 'foreign')` dans `suppliers` + champ select dans le formulaire.

---

## 🟡 MINEURS (UI/UX)

### M-01 · Libellé "Réf. Interne" → "BC / Réf. Interne"
- **Constaté** : 19h41 — Eric Belisle
- **Demande** : Renommer le champ "Réf. Interne" en **"Bon de Commande"** ou **"BC / Réf. Interne"** dans la liste des factures reçues et les formulaires.

### M-02 · Pays : code 3L → code 2L
- **Constaté** : 19h42 — Eric Belisle
- **Demande** : Remplacer le code pays 3 lettres (ex : `BFA`) par le code 2 lettres (ex : `BF`) dans le formulaire fournisseur.

---

## ✅ DÉJÀ CORRIGÉ (session du 29/05)

| # | Correction | Heure |
|---|---|---|
| ✅ | Justificatif de paiement : lien cliquable (nom fichier) au lieu de l'URL brute | 17h59 |
| ✅ | Anti-doublon OCR : avertissement si même N° facture + fournisseur | 18h04 |
| ✅ | IFU non détecté par OCR → fallback fournisseur DB → saisie manuelle | 17h53 |
| ✅ | IFU "null" (string) affiché → corrigé avec guard `!== 'null'` | 17h42 |
| ✅ | Prompt OCR renforcé pour détection IFU burkinabè (format BF) | 17h35 |
| ✅ | Workflow vérification IFU DGI.bf identique au wizard manuel | 17h27 |

---

*Généré le 2026-05-29 à 20:25 UTC*
