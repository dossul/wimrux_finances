# WIMRUX® FINANCES — Scénarios de Test E2E

> **Date**: 8 Février 2026  
> **Compte test**: admin@westago.bf / Admin123!  
> **Entreprise**: WESTAGO SARL (IFU: 00089946R)

---

## Test 1: Authentification ✅

### 1.1 Inscription Admin
- [ ] Naviguer vers `/auth/register`
- [ ] Saisir IFU `00089946R` → Entreprise "WESTAGO SARL" affichée
- [ ] Remplir: nom, email, mot de passe, rôle "admin"
- [ ] Soumettre → Redirection vers login ou dashboard

### 1.2 Connexion
- [ ] Naviguer vers `/auth/login`
- [ ] Saisir email + mot de passe
- [ ] Soumettre → Redirection vers dashboard
- [ ] Vérifier nom utilisateur affiché dans le header

### 1.3 Déconnexion
- [ ] Cliquer sur menu utilisateur
- [ ] Cliquer "Déconnexion"
- [ ] Vérifier redirection vers login

---

## Test 2: Clients

### 2.1 Créer Client Personne Morale
- [ ] Naviguer vers `/clients`
- [ ] Cliquer "Nouveau client"
- [ ] Type: **PM** (Personne Morale)
- [ ] Nom: `TECHNO SOLUTIONS SARL`
- [ ] IFU: `00123456A`
- [ ] Adresse: `Zone Industrielle, Ouagadougou`
- [ ] Téléphone: `+226 70 00 00 01`
- [ ] Sauvegarder → Client affiché dans la liste

### 2.2 Créer Client Consommateur
- [ ] Cliquer "Nouveau client"
- [ ] Type: **CC** (Consommateur)
- [ ] Nom: `Client Comptoir`
- [ ] Sauvegarder

### 2.3 Rechercher Client
- [ ] Taper "TECHNO" dans la recherche
- [ ] Vérifier filtrage correct

---

## Test 3: Factures

### 3.1 Créer Facture de Vente
- [ ] Naviguer vers `/invoices`
- [ ] Cliquer "Nouvelle facture"
- [ ] Type: **FV** (Facture de Vente)
- [ ] Client: `TECHNO SOLUTIONS SARL`
- [ ] Mode prix: **HT**

### 3.2 Ajouter Articles
| Désignation | Qté | Prix HT | Groupe Taxe |
|-------------|-----|---------|-------------|
| Ordinateur portable | 2 | 450000 | A (18% TVA) |
| Licence logiciel | 5 | 50000 | B (18% TVA) |
| Formation | 1 | 150000 | C (0% TVA) |

- [ ] Vérifier calcul automatique TVA
- [ ] Vérifier total TTC

### 3.3 Valider Facture
- [ ] Cliquer "Valider"
- [ ] Statut passe à `validated`

### 3.4 Certifier Facture (MCF)
- [ ] Cliquer "Certifier"
- [ ] Attendre réponse MCF
- [ ] Vérifier:
  - Statut `certified`
  - UID MCF affiché
  - Signature générée

### 3.5 Générer PDF
- [ ] Cliquer "PDF"
- [ ] Vérifier téléchargement
- [ ] Ouvrir PDF: QR Code présent, données correctes

### 3.6 Exporter CSV
- [ ] Retour liste factures
- [ ] Cliquer "Exporter CSV"
- [ ] Vérifier fichier téléchargé

---

## Test 4: Trésorerie

### 4.1 Créer Compte Bancaire
- [ ] Naviguer vers `/treasury`
- [ ] Cliquer "Nouveau compte"
- [ ] Type: **bank**
- [ ] Nom: `Compte BOA Principal`
- [ ] Solde initial: `5000000`
- [ ] Sauvegarder

### 4.2 Créer Mouvement Crédit
- [ ] Cliquer "Nouveau mouvement"
- [ ] Type: **credit**
- [ ] Compte: `Compte BOA Principal`
- [ ] Montant: `1500000`
- [ ] Mode: `bank_transfer`
- [ ] Référence: `Règlement facture TECHNO`
- [ ] Sauvegarder
- [ ] Vérifier solde mis à jour: `6500000`

### 4.3 Créer Mouvement Débit
- [ ] Cliquer "Nouveau mouvement"
- [ ] Type: **debit**
- [ ] Montant: `200000`
- [ ] Mode: `cash`
- [ ] Référence: `Achat fournitures`
- [ ] Sauvegarder
- [ ] Vérifier solde: `6300000`

---

## Test 5: Rapports

### 5.1 Consulter Synthèse
- [ ] Naviguer vers `/reports`
- [ ] Sélectionner période: **Ce mois**
- [ ] Vérifier KPIs:
  - Nombre factures
  - CA HT total
  - TVA collectée
  - Total TTC

### 5.2 Répartition par Type
- [ ] Vérifier tableau par type de facture
- [ ] FV doit apparaître avec les totaux

### 5.3 Répartition par Groupe Taxe
- [ ] Vérifier groupes A, B, C
- [ ] Montants cohérents avec factures créées

### 5.4 Export CSV Rapport
- [ ] Cliquer "Exporter"
- [ ] Vérifier téléchargement

---

## Test 6: Rapports Fiscaux

### 6.1 Générer Rapport Z
- [ ] Naviguer vers `/fiscal-reports`
- [ ] Cliquer "Rapport Z"
- [ ] Sélectionner date du jour
- [ ] Générer → Vérifier données

### 6.2 Générer Rapport X
- [ ] Cliquer "Rapport X"
- [ ] Générer → Vérifier compteurs

---

## Test 7: Journal d'Audit

### 7.1 Consulter Entrées
- [ ] Naviguer vers `/audit`
- [ ] Vérifier entrées:
  - INSERT clients
  - INSERT invoices
  - UPDATE invoices (certification)

### 7.2 Badge INALTÉRABLE
- [ ] Vérifier badge affiché sur chaque entrée

### 7.3 Filtrer par Action
- [ ] Sélectionner filtre "INSERT"
- [ ] Vérifier filtrage correct

### 7.4 Détail Entrée
- [ ] Cliquer sur une entrée
- [ ] Vérifier dialog avec données avant/après (JSON)

---

## Test 8: Assistant IA

### 8.1 Envoyer Message
- [ ] Naviguer vers `/ai`
- [ ] Taper: "Quel est le total de mes factures ce mois?"
- [ ] Attendre réponse IA
- [ ] Vérifier réponse cohérente

### 8.2 Suggestions
- [ ] Cliquer sur une suggestion pré-configurée
- [ ] Vérifier réponse

---

## Test 9: Paramètres

### 9.1 Profil Entreprise
- [ ] Naviguer vers `/settings`
- [ ] Vérifier données entreprise affichées
- [ ] Modifier adresse
- [ ] Sauvegarder

### 9.2 Configuration IA
- [ ] Onglet "IA"
- [ ] Vérifier options modèle
- [ ] Configurer clé OpenRouter (si disponible)

### 9.3 Appareils SFE
- [ ] Onglet "Appareils"
- [ ] Vérifier appareil listé avec NIM

### 9.4 Utilisateurs
- [ ] Onglet "Utilisateurs"
- [ ] Vérifier admin listé

---

## Test 10: Chatbot API (Optionnel)

### 10.1 Activer Chatbot
- [ ] Onglet "Chatbot API"
- [ ] Activer toggle
- [ ] Sauvegarder

### 10.2 Créer Clé API
- [ ] Cliquer "Nouvelle clé"
- [ ] Nom: `Test WhatsApp`
- [ ] Canal: `whatsapp`
- [ ] Sauvegarder
- [ ] Copier clé générée

### 10.3 Définir Permissions
- [ ] Cliquer icône permissions
- [ ] Activer: `view_invoices`, `view_clients`, `view_dashboard`
- [ ] Sauvegarder

### 10.4 Exporter Skill
- [ ] Cliquer "Exporter Skill"
- [ ] Vérifier fichier .md téléchargé

### 10.5 Tester Endpoint (cURL)
```bash
curl -X POST https://gfe4bd9y.eu-central.insforge.app/functions/chatbot-gateway \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <CLE_API>" \
  -d '{"message": "Liste mes factures", "channel": "whatsapp"}'
```
- [ ] Vérifier réponse JSON avec liste factures

---

## Résultats

| Module | Statut | Notes |
|--------|--------|-------|
| Authentification | ⬜ | |
| Clients | ⬜ | |
| Factures | ⬜ | |
| Trésorerie | ⬜ | |
| Rapports | ⬜ | |
| Rapports Fiscaux | ⬜ | |
| Audit | ⬜ | |
| Assistant IA | ⬜ | |
| Paramètres | ⬜ | |
| Chatbot API | ⬜ | |

---

**Validateur**: _______________  
**Date**: _______________  
**Signature**: _______________
