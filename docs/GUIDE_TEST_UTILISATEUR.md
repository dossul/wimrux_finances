# Guide de Test Utilisateur — WIMRUX® FINANCES

## Scénario de test complet pas-à-pas

Ce guide simule une journée de travail réaliste d'une entreprise burkinabè utilisant WIMRUX FINANCES pour sa facturation électronique certifiée DGI.

> **Prérequis** : Application lancée (`npx quasar dev`) sur `http://localhost:9000`

---

## Étape 1 — Connexion

1. Ouvrir `http://localhost:9000`
2. La **Landing Page** s'affiche avec la présentation WIMRUX FINANCES
3. Cliquer sur **« Se connecter »**
4. Saisir les identifiants :
   - Email : `admin@wimrux.bf`
   - Mot de passe : `WimruxAdmin2026!`
5. Cliquer **« Connexion »**

**Résultat attendu** : Redirection vers le **Tableau de bord** (`/app`). Les 4 KPIs s'affichent (Factures du mois, CA TTC, En attente, Certifiées). L'alerte MCF/SECeF en mode dégradé peut apparaître en rouge — c'est normal en développement.

---

## Étape 2 — Vérifier les paramètres entreprise

1. Menu latéral → **Paramètres**
2. Onglet **« Entreprise »** : vérifier que les informations sont renseignées :
   - Raison sociale : `WESTAGO SARL`
   - IFU : `00089946R` (8 caractères)
   - RCCM : `BF OUA 2021 M 13807`
   - Adresse cadastrale au format `SSSS LLL PPPP` (ex : `1234 567 8901`)
3. Tester la validation : effacer l'IFU, taper `123` → le message d'erreur « IFU invalide (8 chiffres) » doit apparaître
4. Remettre la bonne valeur et cliquer **« Enregistrer »**

**Résultat attendu** : Notification verte « Entreprise mise à jour ».

---

## Étape 3 — Enregistrer un appareil SFE

1. Toujours dans **Paramètres** → onglet **« Appareils SFE »**
2. Cliquer **« Ajouter un appareil »**
3. Renseigner :
   - NIM : `BF00000001` (10 caractères)
   - Nom : `Poste de caisse principal`
4. Enregistrer

**Résultat attendu** : L'appareil apparaît dans la liste avec son NIM.

---

## Étape 4 — Créer des articles au catalogue

1. Menu latéral → **Factures** (une entrée « Articles » peut exister, sinon accéder via `/app/articles`)
2. Cliquer **« Nouvel article »**
3. Créer **3 articles** :

| Code | Désignation | Type | Groupe fiscal | Prix unitaire | Taxe spéc. |
|------|-------------|------|---------------|---------------|------------|
| `SRV001` | Consultation comptable | LOCSER | A | 50 000 | 0 |
| `BIE001` | Ordinateur portable HP | LOCBIE | A | 450 000 | 0 |
| `BIE002` | Ramette papier A4 | LOCBIE | B | 3 500 | 200 |

4. Pour chaque article : remplir le formulaire → cliquer **« Créer »**
5. Vérifier que les 3 articles apparaissent dans le tableau
6. Tester les filtres : taper `HP` dans la recherche → seul `BIE001` doit rester visible
7. Filtrer par type `LOCBIE` → 2 résultats (`BIE001` + `BIE002`)

**Résultat attendu** : 3 articles créés, filtres fonctionnels.

---

## Étape 5 — Créer des clients

1. Menu latéral → **Clients**
2. Cliquer **« Nouveau client »** et créer **4 clients** (un par type) :

### Client 1 — Personne Morale (PM)
- Type : `PM`
- Nom : `SOCIETE ALPHA SARL`
- IFU : `12345678` (obligatoire, 8 chiffres strict)
- RCCM : `BF OUA 2024 B 12345`
- Adresse cadastrale : `1234 567 8901`
- Téléphone : `+226 70 11 22 33`
- Email : `contact@alpha.bf`

### Client 2 — Personne Physique Commerçant (PC / export)
- Type : `PC`
- Nom : `TRADING INTERNATIONAL LLC`
- IFU : `US-EXP-2024-001` (libre 1-20 caractères pour export)
- Adresse : `123 Business Blvd, New York`

### Client 3 — Personne Physique (PP)
- Type : `PP`
- Nom : `OUEDRAOGO Jean-Pierre`
- IFU : (laisser vide — optionnel pour PP)
- Téléphone : `+226 76 00 11 22`

### Client 4 — Client Comptant (CC)
- Type : `CC`
- Nom : `Client de passage`
- (Pas d'IFU nécessaire)

3. Pour chaque client, vérifier les validations :
   - PM : essayer un IFU `123` → erreur « IFU invalide »
   - PC : un IFU libre comme `US-EXP-2024-001` est accepté
   - PP : le champ IFU est optionnel
4. Vérifier que les 4 clients apparaissent dans la liste

**Résultat attendu** : 4 clients créés, validations IFU contextuelles respectées.

---

## Étape 6 — Créer la première facture (FV)

1. Menu latéral → **Factures** → **« Nouvelle facture »** (ou bouton rapide sur le dashboard)
2. Type de facture : **FV** (Facture de Vente)
3. Sélectionner le client : `SOCIETE ALPHA SARL`
4. Mode de prix : **TTC**
5. Ajouter des lignes :

### Ligne 1
- Désignation : commencer à taper `Consult` → l'**autocomplete** propose `Consultation comptable`
- Sélectionner → les champs se remplissent automatiquement (type, groupe A, prix 50 000)
- Quantité : `3`

### Ligne 2
- Désignation : taper `Ramette` → autocomplete → `Ramette papier A4`
- Quantité : `10`
- Vérifier que la taxe spécifique (200 FCFA) est pré-remplie

6. Vérifier le calcul automatique en bas :
   - Total HT
   - TVA (18% pour groupe A, 0% pour groupe B)
   - PSVB (1% pour groupe A)
   - Timbre de quittance (selon tranche du montant TTC)
   - **Total TTC**
   - Montant en lettres (en français)
7. Cliquer **« Enregistrer »** (brouillon)

**Résultat attendu** : Facture sauvée en statut **Brouillon**, référence générée automatiquement au format `FV-2026-00001`.

---

## Étape 7 — Workflow de validation (séparation des pouvoirs)

### 7a. Soumettre la facture
1. Sur la facture ouverte, cliquer **« Soumettre »**
2. Le statut passe à **« En attente de validation »** (jaune)

### 7b. Approuver la facture
1. Cliquer **« Approuver »**
2. Le statut passe à **« Approuvée »** (bleu)

> **Note anti-fraude** : En production avec des comptes séparés, le soumetteur ne peut pas approuver sa propre facture. En mode admin, cette restriction peut être contournée.

### 7c. Valider la facture
1. Cliquer **« Valider »**
2. Le statut passe à **« Validée »** (orange)

### 7d. Certifier la facture (SECeF)
1. Cliquer **« Certifier »**
2. L'application envoie la facture à l'API MCF/SECeF (simulateur en dev)
3. Le statut passe à **« Certifiée »** (vert avec icône ✓)
4. Vérifier les données de certification :
   - Numéro fiscal affiché
   - QR code généré
   - Date/heure de certification
   - Compteurs MCF
5. La facture est maintenant **immutable** — aucun bouton d'édition ne doit être visible

**Résultat attendu** : Facture certifiée avec toutes les données MCF. PDF disponible avec bloc certification.

---

## Étape 8 — Générer le PDF

1. Sur la facture certifiée, cliquer **« PDF »** ou **« Télécharger »**
2. Vérifier le contenu du PDF :
   - En-tête avec logo et infos entreprise (IFU, RCCM)
   - Infos client
   - Tableau des lignes avec détail fiscal par groupe
   - Totaux : HT, TVA, PSVB, timbre, TTC
   - Montant en lettres : ex. « Cent quatre-vingt-cinq mille francs CFA »
   - **Bloc certification** : numéro fiscal, QR code, signature, compteurs
   - Mention légale : « EXIGEZ LA FACTURE ÉLECTRONIQUE CERTIFIÉE »
   - Si c'est un duplicata : mention **DUPLICATA** visible

**Résultat attendu** : PDF conforme DGI avec toutes les mentions obligatoires.

---

## Étape 9 — Créer une facture d'avoir (FA)

1. **Factures** → **Nouvelle facture** → Type : **FA** (Facture d'Avoir)
2. Sélectionner la **nature d'avoir** : `Retour de marchandise` (RAN)
3. Sélectionner la **facture originale** : la FV certifiée à l'étape 7
4. Ajouter une ligne de remboursement :
   - Désignation : `Ramette papier A4` (autocomplete)
   - Quantité : `5` (retour de 5 sur les 10)
   - Prix : `3 500`
5. Vérifier que le total TTC de l'avoir est **inférieur ou égal** au total de la facture originale
6. Tester la validation : mettre un prix énorme → le message « Montant avoir dépasse le montant de la facture originale » doit apparaître
7. Corriger et soumettre → Certifier le parcours complet

**Résultat attendu** : Avoir FA certifié, montant ≤ facture originale respecté.

---

## Étape 10 — Créer une facture export (EV)

1. **Factures** → **Nouvelle facture** → Type : **EV** (Export)
2. Client : `TRADING INTERNATIONAL LLC` (PC — IFU libre)
3. Ajouter une ligne :
   - Désignation : `Ordinateur portable HP`
   - Quantité : `2`
4. Vérifier que la TVA export est correcte (peut être 0% selon le groupe)
5. Soumettre → Certifier

**Résultat attendu** : Facture export EV certifiée avec IFU libre du client export.

---

## Étape 11 — Trésorerie

### 11a. Créer un compte de trésorerie
1. Menu → **Trésorerie**
2. Si aucun compte n'existe, en créer :
   - **Caisse principale** (type : Caisse)
   - **Banque BOA** (type : Banque)

### 11b. Enregistrer un encaissement
1. Cliquer **« Nouveau mouvement »**
2. Type : **Crédit** (encaissement)
3. Compte : `Caisse principale`
4. Montant : `185 000` (montant de la facture FV)
5. Mode de paiement : `ESPECES`
6. Description : `Encaissement facture FV-2026-00001`
7. Enregistrer

### 11c. Dépôt en caisse
1. Cliquer le bouton **« Dépôt caisse »** (action rapide)
2. Montant : `100 000`
3. Le formulaire est pré-rempli (compte caisse, description, mode espèces)
4. Enregistrer

### 11d. Retrait de caisse
1. Cliquer **« Retrait caisse »**
2. Montant : `50 000`
3. Enregistrer

### 11e. Filtre caisse
1. Activer le toggle **« Caisse uniquement »**
2. Vérifier que seuls les mouvements marqués `is_cash_operation` sont affichés

**Résultat attendu** : 3 mouvements créés, filtre caisse fonctionnel, soldes mis à jour.

---

## Étape 12 — Rapports

### 12a. Rapports généraux
1. Menu → **Rapports**
2. Vérifier les KPIs :
   - Nombre de factures (au moins 3 : FV + FA + EV)
   - CA TTC du mois
   - Ventilation par type de facture (histogramme ou tableau)
   - Ventilation par groupe fiscal

### 12b. Rapports fiscaux Z et X
1. Menu → **Rapports fiscaux**
2. Cliquer **« Rapport X »** (consultation) → les données de la session s'affichent
3. Cliquer **« Rapport Z »** (clôture) → attention, cela remet les compteurs à zéro
4. Vérifier que le rapport contient les totaux par type et groupe fiscal

### 12c. Rapport A (annuel)
1. Menu → **Rapports fiscaux** ou naviguer vers `/app/reports/a-report`
2. Sélectionner l'année : `2026`
3. Générer → le rapport A affiche la synthèse annuelle avec détail par groupe fiscal A-P

### 12d. Export CSV
1. Sur n'importe quel rapport, cliquer **« Exporter CSV »**
2. Vérifier que le fichier CSV se télécharge avec les bonnes données

**Résultat attendu** : Rapports affichés correctement, exports CSV fonctionnels.

---

## Étape 13 — Journal d'audit

1. Menu → **Journal d'audit**
2. Vérifier que toutes les actions précédentes sont tracées :
   - INSERT sur `clients` (4 entrées)
   - INSERT sur `articles` (3 entrées)
   - INSERT sur `invoices` (3 entrées)
   - UPDATE sur `invoices` (changements de statut)
   - INSERT sur `treasury_movements` (3 entrées)
3. Cliquer sur une entrée pour voir les détails (données avant/après)
4. Vérifier que le journal est **inaltérable** — aucun bouton de suppression ou modification

**Résultat attendu** : Traçabilité complète, toutes les opérations sont journalisées.

---

## Étape 14 — Vérifier le décrément stock

1. Retourner dans **Articles** (`/app/articles`)
2. Vérifier les stocks :
   - `SRV001` (Consultation comptable) : services n'ont pas de stock physique
   - `BIE002` (Ramette papier A4) : le stock a dû être décrémenté de 10 (FV) puis incrémenté de 5 (FA retour) → vérifier la cohérence si le trigger est configuré

**Résultat attendu** : Stock mis à jour automatiquement après certification.

---

## Étape 15 — Assistant IA

1. Menu → **Assistant IA**
2. Poser une question fiscale : « Quel est le taux de TVA pour le groupe fiscal B au Burkina Faso ? »
3. Vérifier que l'assistant répond (si la clé OpenRouter est configurée)
4. Tester : « Résume les factures du mois »

> **Note** : L'assistant IA nécessite une clé API OpenRouter configurée dans Paramètres → IA.

**Résultat attendu** : Chat fonctionnel avec réponses contextuelles.

---

## Étape 16 — Mode dégradé

1. Observer la barre d'alerte MCF en bas du dashboard : « Alerte SECeF : Le serveur MCF/SYGMEF est injoignable. Les certifications utiliseront le mode dégradé. »
2. En mode dégradé, les factures soumises pour certification sont placées dans une **file d'attente locale** (`pending_certification_queue`)
3. Quand le serveur MCF redevient disponible, cliquer **« Revérifier »** pour relancer la certification

**Résultat attendu** : Mode dégradé opérationnel, file d'attente visible.

---

## Étape 17 — Gestion des utilisateurs et RBAC

1. **Paramètres** → onglet **« Utilisateurs »**
2. Vérifier la liste des utilisateurs et leurs rôles
3. Onglet **« RBAC / Permissions »** :
   - Voir les permissions par rôle (admin, comptable, caissier, etc.)
   - Vérifier que chaque rôle a les bonnes permissions

> En production, créer un utilisateur `comptable` et vérifier qu'il ne peut pas approuver ses propres factures (anti-fraude).

**Résultat attendu** : RBAC configurable, permissions granulaires par rôle.

---

## Étape 18 — Vérifier la numérotation séquentielle

1. Créer 3 factures FV rapidement (brouillons)
2. Vérifier les références :
   - `FV-2026-00002`
   - `FV-2026-00003`
   - `FV-2026-00004`
3. La numérotation doit être **gapless** (sans trou) et **séquentielle**
4. Créer une facture FT → la référence doit être `FT-2026-00001` (séquence séparée par type)

**Résultat attendu** : Séquences indépendantes par type et par année, sans trou.

---

## Étape 19 — Notifications temps réel

1. Ouvrir l'application dans **2 onglets** du navigateur
2. Dans l'onglet 1 : créer une facture et la soumettre
3. Dans l'onglet 2 : vérifier qu'une notification apparaît (si WebSocket activé)

**Résultat attendu** : Notifications en temps réel via WebSocket InsForge.

---

## Étape 20 — Déconnexion et sécurité

1. Cliquer sur le profil utilisateur (coin supérieur droit) → **« Déconnexion »**
2. Vérifier la redirection vers la page de connexion
3. Essayer d'accéder directement à `/app/invoices` → redirection automatique vers `/auth/login`
4. Tester un mot de passe incorrect → message d'erreur approprié

**Résultat attendu** : Déconnexion propre, routes protégées, accès non-authentifié bloqué.

---

## Checklist de validation finale

| # | Fonctionnalité | Vérifié |
|---|----------------|---------|
| 1 | Connexion / Déconnexion | ☐ |
| 2 | Paramètres entreprise (IFU, RCCM, adresse cadastrale) | ☐ |
| 3 | Appareils SFE (NIM) | ☐ |
| 4 | Catalogue articles (CRUD, filtres, stock) | ☐ |
| 5 | Clients 4 types (PM/PC/PP/CC) + validation IFU | ☐ |
| 6 | Facture FV (autocomplete, calcul fiscal, brouillon) | ☐ |
| 7 | Workflow 5 étapes (brouillon → certifiée) | ☐ |
| 8 | PDF certifié (QR, mentions, bloc certification) | ☐ |
| 9 | Facture d'avoir FA (nature, montant ≤ originale) | ☐ |
| 10 | Facture export EV (IFU libre) | ☐ |
| 11 | Trésorerie (comptes, mouvements, dépôt/retrait caisse) | ☐ |
| 12 | Rapports (KPIs, Z/X, Rapport A, export CSV) | ☐ |
| 13 | Journal d'audit (traçabilité, inaltérable) | ☐ |
| 14 | Stock décrémenté après certification | ☐ |
| 15 | Assistant IA | ☐ |
| 16 | Mode dégradé MCF | ☐ |
| 17 | RBAC / Permissions | ☐ |
| 18 | Numérotation séquentielle gapless | ☐ |
| 19 | Notifications temps réel | ☐ |
| 20 | Sécurité (routes protégées, auth) | ☐ |

---

## Résumé des données de test créées

| Entité | Nombre | Détail |
|--------|--------|--------|
| Articles | 3 | SRV001, BIE001, BIE002 |
| Clients | 4 | PM, PC, PP, CC |
| Factures | 6+ | FV, FA, EV, FT + brouillons |
| Mouvements trésorerie | 3 | Encaissement + dépôt + retrait |
| Comptes trésorerie | 2 | Caisse + Banque |
| Appareil SFE | 1 | NIM BF00000001 |

> **Durée estimée du test complet** : 45 minutes à 1 heure
