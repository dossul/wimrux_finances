# Cahier des Charges Complet WIMRUX FINANCE v1.3 (1).pdf

- **Fichier source:** `Cahier des Charges Complet WIMRUX FINANCE v1.3 (1).pdf`
- **Taille:** 137.4 Ko
- **Pages:** 6
- **Statut extraction:** success
- **Hash MD5:** `9d61bd17cd09e248edf1362562d201a7`
- **Date extraction:** 2026-02-08 03:51:32

---

## Page 1

CAHIER DES CHARGES (TDR) - WIMRUX®
FINANCES v1.3
Application de Gestion Financière SaaS & Système de Facturation d'Entreprise (SFE)
Information Détail
Nom de l'application WIMRUX® Finances
Version 1.3 (Conforme SECeF/SFE)
Date 21 Janvier 2026
Statut VERSION DE PRODUCTION - PRIORITÉ
HOMOLOGATION
Client WESTAGO SARL
Prestataire Technique ILTIC
1. INTRODUCTION
1.1. Présentation
WIMRUX® Finances est une application SaaS de gestion financière et de facturation conçue
pour répondre aux besoins des entreprises de l'espace UEMOA, des TPE aux Grandes
Entreprises.
1.2. Objectifs Stratégiques (Mis à jour v1.3)
L'application vise à simplifier la gestion financière tout en garantissant une conformité fiscale
totale avec la réforme de la Facture Électronique Certifiée du Burkina Faso (et sous-région).
Les objectifs sont :
1. Homologation SFE (CRITIQUE) : Être certifié par la DGI comme Système de Facturation
d'Entreprise conforme avant le 1er Juillet 2026.
2. Centralisation : Plateforme unique pour la banque, la caisse et la facturation.
3. Automatisation : Suppression des tâches manuelles (rapprochement, calcul des taxes).
4. Sécurité & Inaltérabilité : Garantir l'intégrité absolue des données financières selon les
normes légales.
5. Multi-entreprise : Gestion cloisonnée de plusieurs entités fiscales.

### Tableau 1 (Page 1)

| Information | Détail |
| --- | --- |
| Nom de l'application | WIMRUX® Finances |
| Version | 1.3 (Conforme SECeF/SFE) |
| Date | 21 Janvier 2026 |
| Statut | VERSION DE PRODUCTION - PRIORITÉ
HOMOLOGATION |
| Client | WESTAGO SARL |
| Prestataire Technique | ILTIC |

---

## Page 2

1.3. Public Cible
● Cœur de cible (2026) : Entreprises du Régime Réel Normal (CA ≥ 50 millions FCFA)
soumises à l'obligation SECeF.
● Autres : PME, TPE, Indépendants et ONGs.
2. FONCTIONNALITÉS MÉTIER
2.1 MODULE FACTURATION & CONFORMITÉ SFE (CŒUR DU SYSTÈME)
Ce module remplace et annule les spécifications génériques de la v1.2.
A. Émission de Factures (Norme SECeF)
● Typologie Stricte : Le système impose les types de documents suivants (codés en dur) :
○ FV : Facture de Vente (Standard).
○ FA : Facture d'Avoir (Annulation/Correction).
○ FT : Facture d'Acompte.
○ EV : Facture Export.
● Gestion des Taxes (Groupes A-P) :
○ Mapping obligatoire des articles vers les 16 groupes de taxation (A=Exonéré, B=TVA
18%, etc.).
○ Gestion des Prélèvements à la Source (PSVB).
● Processus de Validation SFE :
○ Avant enregistrement : Envoi des données brutes au MCF (Module de Contrôle).
○ Réception : Récupération de la Signature, du Code SECeF, de l'Heure MCF et des
Compteurs.
○ Finalisation : Verrouillage immédiat de la facture (Inaltérable).
B. Inaltérabilité & Avoirs
● Suppression Interdite : Aucune facture validée ne peut être supprimée de la base de
données.
● Gestion des Erreurs : Toute correction nécessite la création d'une Facture d'Avoir (FA)
liée obligatoirement à la facture d'origine (FV) par son ID unique.
C. Mentions Légales & Impression
● Pied de Page Fiscal (Inamovible) : Insertion automatique sur tous les PDF de :
○ Code SECeF (Chaîne alphanumérique).
○ Signature Électronique.
○ Numéro Identifiant Machine (NIM).
○ Date et Heure exactes du MCF.
○ Mention : "EXIGEZ LA FACTURE ÉLECTRONIQUE CERTIFIÉE".
● QR Code Sécurisé : Génération d'un Code QR 2D standardisé contenant les données
cryptées pour contrôle DGI.

---

## Page 3

D. Clients & IFU
● Contrôle de format de l'Identifiant Financier Unique (IFU) sur les fiches clients.
● Vérification API DGI (si disponible) pour la validité des IFU.
2.2 GESTION DE TRÉSORERIE (BANQUE & CAISSE)
● Gestion Multi-Comptes : Ajout illimité de comptes bancaires et caisses physiques.
● Import Bancaire : Formats OFX, CSV, Excel.
● Rapprochement Bancaire :
○ Manuel (pointage).
○ Semi-automatique (règles de correspondance montants/dates).
● Gestion de la Petite Caisse :
○ Journal de caisse (Entrées/Sorties).
○ Gestion des justificatifs numérisés.
● Wallets Mobiles : Suivi des comptes Mobile Money (Orange, Moov, etc.) comme des
comptes de trésorerie classiques.
2.3 RAPPORTS & CLÔTURES FISCALES
● Rapports Opérationnels : Bilan, Compte de résultat, Balance âgée.
● Rapports Fiscaux Obligatoires (Nouveau v1.3) :
○ Rapport X : État financier provisoire de la journée.
○ Rapport Z (Z-Report) : Clôture journalière fiscale (Totalisation des ventes, TVA
collectée par taux, Signature de clôture). Archivage obligatoire.
2.4 FONCTIONNALITÉS AVANCÉES (IA & PRÉDICTIF)
Note : Priorité 2 (Post-Homologation)
● Analyse Prédictive : Prévision de trésorerie basée sur l'historique.
● Assistant IA : Interface en langage naturel pour interroger les données ("Quel est mon
CA du mois dernier ?").
3. ARCHITECTURE TECHNIQUE
3.1 Stack Technologique
● Backend : Python (Django/FastAPI) pour la robustesse et le calcul.
● Frontend : Vue.js (Vuetify) ou React pour une interface réactive.
● Base de Données : PostgreSQL (Obligatoire pour la conformité ACID et l'intégrité
transactionnelle).
3.2 Composant Critique : Driver SFE-MCF (Nouveau v1.3)
● Rôle : Middleware assurant la communication entre le SaaS WIMRUX et le matériel MCF
(Physique ou Virtuel).
● Protocoles supportés :

---

## Page 4

○ Liaison Série (RS232) via agent local (si MCF physique connecté au poste client).
○ Websocket/API REST sécurisée (si MCF Virtuel/Serveur).
● Performance : Temps de traitement transactionnel < 3 secondes.
● Mode Dégradé : Gestion de la file d'attente en cas de coupure réseau (Bufferisation
stricte selon normes DGI).
3.3 Hébergement & Sécurité
● Infrastructure : Cloud Sécurisé (AWS/GCP) avec réplication des données.
● Chiffrement : AES-256 pour les données sensibles (IFU, Clés API).
● Audit Trail (Piste d'Audit) :
○ Logging immuable de TOUTES les actions utilisateurs (Création, Modification,
Impression, Connexion).
○ Conservation des logs : 10 ans (exigence fiscale).
4. INTERFACE UTILISATEUR (UI/UX)
4.1 Principes
● Rigueur Fiscale : Les champs fiscaux (Taux, Montants HT/TTC calculés) sont verrouillés
en édition.
● Clarté : Distinction visuelle immédiate entre une facture "Brouillon" (non valable) et une
facture "Certifiée" (Sécurisée).
4.2 Écrans Spécifiques
● Tableau de Bord Fiscal : État de la connexion MCF (Vert/Rouge), Quota de factures
restantes (si MCF prépayé), Alertes de maintenance.
● Module de Vente (POS) : Interface simplifiée pour la saisie rapide (Caisse) compatible
écrans tactiles.
5. DÉVELOPPEMENT ET DÉPLOIEMENT (ROADMAP
2026)
Contexte : Urgence absolue pour l'échéance du 1er Juillet 2026.
Phase 1 : Socle & Driver MCF (Février - Mars 2026)
● Mise en place de l'architecture PostgreSQL stricte.
● Développement du Driver SFE-MCF.
● Intégration des algorithmes de calcul de taxes (Groupes A-P).
Phase 2 : Métier & UI Facturation (Mars - Avril 2026)
● Interface d'édition de facture (Types FV, FA, FT).
● Génération PDF avec QR Code et Pied de page dynamique.

---

## Page 5

● Blocage des suppressions (Logique d'Avoirs).
Phase 3 : Tests & Pré-Audit (Mai 2026)
● Tests de charge.
● Simulation de contrôles fiscaux (Vérification des Z-Reports et Signatures).
● Livrable : Dossier technique pour la DGI (Manuel de contrôle).
Phase 4 : Homologation & Pilote (Juin 2026)
● Dépôt du dossier à la DGI.
● Démonstration devant le comité technique.
● Déploiement chez le premier client pilote (WESTAGO).
6. MAINTENANCE ET SUPPORT
6.1 Maintenance "Conformité DGI"
● Veille réglementaire active.
● Mise à jour automatique des taux de TVA ou des formats de QR Code en cas de
changement législatif.
6.2 Support Technique
● Support prioritaire pour les incidents liés au MCF (blocage de facturation).
● Système de tickets intégré.
7. PRÉREQUIS CLIENT (WESTAGO)
Pour le bon fonctionnement en mode "Production" :
1. MCF : Acquisition et activation d'un Module de Contrôle de Facturation auprès d'un
fournisseur agréé.
2. Identifiants : Fourniture de l'IFU et du régime fiscal pour paramétrage.
3. Réseau : Connexion Internet stable requise pour la synchronisation (bien que le mode
dégradé soit supporté temporairement).
8. CONCLUSION
Ce Cahier des Charges v1.3 annule et remplace les versions précédentes. Il constitue
l'engagement ferme de livrer un outil non seulement performant pour la gestion, mais surtout
légalement inattaquable sur le marché burkinabè dès Juillet 2026.
Approbation du Cahier des Charges
Pour WESTAGO SARL Pour ILTIC

### Tableau 1 (Page 5)

| Pour WESTAGO SARL | Pour ILTIC |
| --- | --- |

---

## Page 6

Nom : ................................... Nom : ...................................
Date : ................................... Date : 21/01/2026
Signature : Signature :

### Tableau 1 (Page 6)

| Nom : ................................... | Nom : ................................... |
| --- | --- |
| Date : ................................... | Date : 21/01/2026 |
| Signature : | Signature : |

---

