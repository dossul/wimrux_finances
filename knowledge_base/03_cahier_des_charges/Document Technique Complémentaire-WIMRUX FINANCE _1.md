# Document Technique Complémentaire-WIMRUX FINANCE (1).pdf

- **Fichier source:** `Document Technique Complémentaire-WIMRUX FINANCE (1).pdf`
- **Taille:** 110.1 Ko
- **Pages:** 4
- **Statut extraction:** success
- **Hash MD5:** `38d0192a4ad440fd535559cc9e0a227d`
- **Date extraction:** 2026-02-08 03:52:55

---

## Page 1

ADDENDUM TECHNIQUE N°1 :
CONFORMITÉ SFE/SECeF BURKINA
FASO
Projet : WIMRUX® FINANCES
Document de Référence : Cahier des Charges v1.2 (Mise à jour vers v1.3)
Destinataire : WESTAGO SARL
Auteur : ILTIC (Partenaire Technique)
Date : 21 Janvier 2026
Statut : URGENCE ABSOLUE – Compte à rebours activé (M-6)
1. CONTEXTE ET OBJECTIFS (MISE À JOUR 2026)
Nous sommes le 21 janvier 2026. L'analyse des arrêtés ministériels et le calendrier fiscal
actuel confirment que la période de tolérance/pilote de 2025 est désormais close.
L'échéance couperet est fixée au 1er juillet 2026. À cette date, WIMRUX® Finances devra
impérativement être homologué et opérationnel en tant que Système de Facturation
d'Entreprise (SFE) pour continuer à être commercialisé auprès des contribuables du régime
réel normal.
Ce document annule et remplace les recommandations précédentes pour basculer en mode
"Commando" : mise en conformité accélérée pour une homologation au 1er Trimestre 2026.
2. ANALYSE STRATÉGIQUE ET ÉCHÉANCIER CRITIQUE
2.1. État des lieux au 21/01/2026
● Phase Pilote (2025) : Terminée.
● Date Butoir : 1er Juillet 2026.
● Temps Restant : Moins de 6 mois pour le développement, les tests et la procédure
administrative.
2.2. Nouvelle Roadmap "Flash"
La stratégie de développement séquentielle classique n'est plus viable. Nous devons opérer
en parallèle :

---

## Page 2

● Février - Mars 2026 : Développement intensif du noyau SFE et intégration MCF
(Séquences A et B).
● Avril 2026 : Tests internes et pré-audit.
● Mai 2026 : Dépôt du dossier d'homologation à la DGI (Délai de traitement : 20 jours
ouvrables).
● Juin 2026 : Déploiement chez les premiers clients pilotes avant la date fatidique.
3. AMENDEMENTS TECHNIQUES IMPÉRATIFS
Les amendements ci-dessous ne sont plus des "options", ce sont des conditions de survie du
logiciel sur le marché burkinabè.
SÉQUENCE A : CŒUR DU SYSTÈME & INTÉGRATION MATÉRIELLE
(PRIORITÉ 1)
Conditionne la légalité du logiciel. Développement immédiat requis.
1.1 Développement du "Driver SFE-MCF" (Protocole de Communication)
● Action : Implémentation urgente de la passerelle vers le Module de Contrôle de
Facturation (MCF).
● Spécificité 2026 : Le système doit être compatible avec les derniers modèles de MCF
homologués par la CCI-BF disponibles sur le marché actuellement.
● Performance : Latence < 3 secondes par transaction exigée.
1.2 Verrouillage du Modèle de Données
● Action : Bascule immédiate de la base de données (Supabase) vers les normes DGI :
○ Types : FV, FA, FT, EV (Codage en dur).
○ Taxes : Implémentation stricte des groupes A à P.
● Urgence : Toute facture émise par le logiciel sans ces métadonnées sera rejetée par le
MCF.
1.3 Inaltérabilité Totale
● Action : Suppression du code permettant la "suppression" de factures. Implémentation
de la logique comptable stricte : Erreur = Avoir.
SÉQUENCE B : VISUEL ET CONTRÔLE (PRIORITÉ 1 BIS)
2.1 Le "Pied de Page Fiscal"
● Action : Mise à jour du moteur de génération PDF pour inclure le bloc de sécurité
inamovible : Code SECeF, Signature, NIM, Heure.
● QR Code : Génération du QR Code 2D standardisé, lisible par les applications de
contrôle de la DGI déjà en circulation.
2.2 Mentions Légales 2026

---

## Page 3

● Action : Ajout obligatoire de l'IFU client (pour le B2B) et de la mention "EXIGEZ LA
FACTURE ÉLECTRONIQUE CERTIFIÉE" sur tous les templates.
SÉQUENCE C : RAPPORTS FISCAUX (PRIORITÉ 2)
3.1 Rapports Z (Clôture Journalière)
● Action : Développement du module d'archivage fiscal journalier ("Z-Report"). C'est ce
rapport qui sert de base au calcul de la TVA due.
SÉQUENCE D : HOMOLOGATION ADMINISTRATIVE
4.1 Dossier Technique
● Action : Rédaction concomitante du "Manuel de contrôle" pendant la phase de
développement pour gagner du temps lors du dépôt en Mai 2026.
4. GAP ANALYSIS : SITUATION ACTUELLE (V1.2) VS
CIBLE
Composant Cahier des Exigence Statut au 21/01/26
Charges Initial Réglementaire
(v1.2) 2026
🔴
Architecture Autonome (API Dépendante du NON
Mobile Money, IA). MCF : Pas de CONFORME
signature = Pas de
facture légale.
🔴
Intégrité Souple Rigide : NON
("Suppression Inaltérabilité CONFORME
possible"). absolue.
🔴
Délais Roadmap Deadline Juillet RISQUE ÉLEVÉ
classique. 2026 : Urgence
critique.
5. ACTIONS REQUISES CHEZ WESTAGO SARL
(IMMÉDIAT)
Pour tenir les délais, WESTAGO doit paralléliser ses actions :
1. Acquisition MCF : Acheter immédiatement un boîtier MCF de test ou une licence
virtuelle. Sans cela, nous ne pouvons pas tester le driver SFE-MCF.

### Tableau 1 (Page 3)

| Composant | Cahier des
Charges Initial
(v1.2) | Exigence
Réglementaire
2026 | Statut au 21/01/26 |
| --- | --- | --- | --- |
| Architecture | Autonome (API
Mobile Money, IA). | Dépendante du
MCF : Pas de
signature = Pas de
facture légale. | 🔴
NON
CONFORME |
| Intégrité | Souple
("Suppression
possible"). | Rigide :
Inaltérabilité
absolue. | 🔴
NON
CONFORME |
| Délais | Roadmap
classique. | Deadline Juillet
2026 : Urgence
critique. | 🔴
RISQUE ÉLEVÉ |

---

## Page 4

2. Contact DGI : Se rapprocher du guichet de la DGI pour récupérer le dernier dossier type
de demande d'homologation (version 2026).
3. Budget : Valider le devis rectificatif d'urgence pour prioriser ces développements sur
tout autre fonctionnalité (IA, Design, etc.).
6. INCIDENCES SUR LE PROJET
● Gels de fonctionnalités : Les modules non-essentiels (IA prédictive, personnalisation
avancée des thèmes) doivent être reportés à la version 2.0 (post-juillet 2026) pour
concentrer les ressources sur la conformité.
● Coût Express : La compression du planning peut engendrer des surcoûts liés à la
mobilisation intensive des développeurs.
7. CONCLUSION
Il n'y a plus de marge de manœuvre. L'objectif n'est plus de "préparer l'avenir", mais d'assurer
la viabilité légale de WIMRUX® pour le second semestre 2026.
Décision attendue : Validation immédiate du lancement du sprint de conformité.
Fait à Ouagadougou, le 21 Janvier 2026
Pour ILTIC, Le Partenaire Technique.

---

