# SPECIFICATIONS-TECHNIQUES-DES-SYSTEMES-ELECTRONIQUES-CERTIFIES-DE-FACTURATION.pdf

- **Fichier source:** `SPECIFICATIONS-TECHNIQUES-DES-SYSTEMES-ELECTRONIQUES-CERTIFIES-DE-FACTURATION.pdf`
- **Taille:** 3344.3 Ko
- **Pages:** 11
- **Statut extraction:** success
- **Hash MD5:** `4dd87d9631e3e3efae72862d8f539436`
- **Date extraction:** 2026-02-08 03:54:32

---

## Page 1

BURKINA FASO

MINISTERE DE L’ECONOMIE La Patrie ou la Mort, nous Vaincrons

ET DES FINANCES

#. . Ouagadougou, le 29 DEC 9995

N°2025 ed /MEF/SG/DGI/DLC/sl

%
2 NOTE DE SERVICE

Objet : spécifications techniques des systèmes
électroniques certifiés de facturation

Conformément aux dispositions des articles 1 à 3 de l'arrêté n°2025-0049/MEF/SG/DGI du
05 février 2025 portant conditions et modalités d'émission de la facture électronique
certifiée, la présente note a pour objet de préciser, de manière opérationnelle, les
spécifications techniques applicables aux systèmes électroniques certifiés de facturation
physiques (SECeF), composés de l'Unité de Facturation (UF) et du Module de Contrôle de
Facturation (MCF).

Lesdits systèmes sont obligatoirement utilisés par toute personne physique ou morale
relevant de la Direction des grandes entreprises ou des directions des moyennes
entreprises qui livre un bien ou fournit un service.

Les UF et MCF doivent :
- être conformes aux spécifications techniques édictées par l'administration ;
- permettre l'émission automatique et sécurisée des factures électroniques certifiées ;
- intégrer un mécanisme inviolable de contrôle, d’horodatage et de signature
électronique ;
- assurer la transmission régulière des données à la plateforme SYGMEF.

En outre, tout UF ou MCF doit, préalablement à sa commercialisation et à son utilisation,
être homologué par le comité d'homologation.

Enfin, les spécifications techniques de l'unité de facturation et du module de contrôle de
facturation figurent dans le document en annexe à la présente note de service. Ce document
sert de base aux procédures d'homologation.

Le Président du comité d'homologation veille à la stricte application de la présente note,
notamment à la mise à jour du registre des SECeF homologués.

La Directrice générale des impôts

01 BP : 119 OUAGADOUGOU 01 Tél : (+226) 25 30 89 85 / 87 - 25 31 60 03/05
Fax : (+226) 25 31 27 70 Site Web : www.impots.gov.bf

---

## Page 2

SPECIFICATIONS TECHNIQUES DES SYSTÈMES ÉLECTRONIQUES
CERTIFIES DE FACTURATION PHYSIQUES

. Introduction
Le système électronique certifié de facturation (SECeF) est un système ou une

machine utilisée pour produire la facture électronique certifiée (ici appelée « la
facture »), stocker toutes les données de la facture dans sa mémoire interne et
transférer les données au serveur distant de l'Administration. La facture
contient des éléments de sécurité qui prouvent l'authenticité et l'intégrité des
données de la facture.

1.1 Définitions

SECeF : Système Electronique Certifié de Facturation (SECeF).

Facture électronique certifiée : facture produite par le SECeF.

Administration : Administration fiscale.

Serveur : désigne le serveur de l'Administration qui héberge le système de
gestion des SECeF.

Utilisateur : un contribuable qui utilise le SECeF.

IFU : identifiant unique du contribuable.

NIM : numéro de série unique de SECeF.

SFE : logiciel de facturation ou une solution informatique permettant a une
entreprise de gérer tout ou partie de son processus de facturation.

ISF : identifiant de SFE.

UF : Unité de facturation. C'est une machine électronique conçue pour entrer
des données de facturation, gérer des articles, générer des rapports pour
l'utilisateur, collecter des données de factures, traiter des factures, fournir des
éléments de sécurité pour l'authentification et la vérification des factures,
imprimer des factures et des rapports, transmettre des données à distance au
serveur de l'Administration et fournir des données localement.

MCF : module de contrôle de facturation. C'est une machine électronique
conçue pour collecter des données de facture, effectuer le traitement des
données de facturation, fournir des éléments de sécurité pour l'authentification
et la vérification des factures, transmettre des données à distance au serveur
et fournir des données localement.

Éléments de sécurité (code SECeF/DGI, identificateur de SECeF, compteurs,
date et heure du MCF, code QR): données sur la facture fournies par le
SECeF, utilisées pour la vérification de l'authenticité et de l'intégrité de la
facture.

Code SECeF/DGI : code unique sur la facture fournie par le SECeF.

Audit à distance : communication bidirectionnelle entre le SECeF et le serveur
afin d'échanger les informations.

Audit local : transfert local de données de la mémoire interne de SECeF.

---

## Page 3

+ Clé de cryptage: clé numérique utilisée pour le chiffrement des données

pendent l'audit à distance et l'audit local.
+ Clé de code : clé numérique utilisée pour la génération du code SECeF/DGI.

1.2Composants de SECeF
Les SECeF peuvent être implémentés de l'une des modalités suivantes :

e Le module de contrôle de facturation, machine physique (MCF) relié au
Système de facturation d'entreprise (SFE) ;
° L'unité de facturation — machine physique (UF) autonome SECeF composée
du MCF et du SFE.
Les deux modalités fournissent la même fonctionnalité pour l'utilisateur du système
ainsi que pour l'Administration.

2. Spécifications techniques des modules de contrôle de facturation (MCF)
2.1. Exigences générales

2.1.1 Le MCF doit contenir un logiciel (firmware) évolutif qui contrôle les
fonctions indiquées dans cette directive.

212 Le MCF doit avoir un numéro d'identification (NIM) configuré pendant la
production ; le NIM doit être unique pour chaque machine et non
modifiable.

2.1.3 Le NIM doit contenir la désignation du fabricant, l'identification du certificat
et un numéro de série de fabrication. Le format NIM est donné au format
MMCCNNNNNN, où :

a) MM - désignation du fabricant (donnée par l'Administration) ;

b) CC - désignation du certificat (donnée par l'Administration), contenant
les chiffres 0-9 ;

c) NNNNNN - numéro unique (dans l'ordre croissant, donné par le
fabricant), contenant les chiffres 0-9.

2.1.4 Le MCF doit avoir une étiquette imprimée attachée au boîtier contenant
au moins les informations suivantes :

a) Etiquette "Module de contrôle de facturation" ;
b) NIM;
c) Nom du fabricant ;
d) Nom du modèle ;
e) Code QR dans le format
« BFSECEF;MCF;NIM;FABRICANT;MODELE »

2.1.5 Le MCF doit continuer à enregistrer de nouvelles factures tout en
effectuant simultanément une fonction d'audit local ou à distance.

---

## Page 4

2:1:6

24.7

Le MCF doit avoir une mémoire interne (minimale 8Go) pouvant contenir
des données internes (durée de conservation 10 ans).

Le MCF doit étre équipé des ports suivants :

a) Port A—communication avec le SFE ;
b) Port B — Port d'Audit local.

Le MCF reçoit des données de requête de SFE via le port A. Par le même
port, les données de réponse du MCF sont renvoyées au SFE. Ce port
est implémenté comme une connexion physique entre le SFE et le MCF,
en tant que port série (RS232) et/ou port USB fournissant un port COM
virtuel. Les paramètres de communication du port A sont fixés à : vitesse
115200 bits/s, nombre de bits 8, nombre de bits d'arrêt 1, parité aucune.
Le protocole d'échanges de données sur ce port est défini par
l'Administration.

En option, le MCF peut fournir un port réseau (LAN, Wi-Fi ou d'une autre
interface réseau). Le protocole d’échanges de données sur ce port est
défini par l'Administration.

2.1.10. Le MCF, via le port B, copie les données de la mémoire interne vers la

mémoire de stockage amovible (carte SD ou clé USB) lors de l'audit local.
Toutes les données doivent être cryptées.

2.1.11 Le MCF, via le module de communication interne transmet les données

de la mémoire interne au serveur en utilisant le réseau d'opérateur mobile,
effectuant l'audit à distance. Ce module doit utiliser au moins la connexion
3G de l'opérateur GSM. Toutes les données doivent être cryptées et
compressées.

2.1.12 Le MCF doit avoir une horloge en temps réel indiquant la date et l'heure

(y compris l'année, le mois, le jour, l'heure, les minutes, les secondes) en
fonction de l'heure locale. L'ajustement de la précision de l'horloge en
temps réel est autorisé via le serveur NTP. La valeur initiale de l'horloge
temps réel MCF est définie pendant la production.

2.2. Exigences de sécurité

2:21

2:2.2

Le MCF doit être fourni avec un stockage sécurisé afin que la clé de
cryptage, la clé de code et le IFU d'Utilisateur soient stockés sans
possibilité de modification après l'activation. Ces paramètres peuvent être
effacés une fois que la procédure de réinitialisation est effectuée.

La clé de cryptage et la clé de code doivent être stockées dans le MCF
sans possibilité de lecture externe.

---

## Page 5

2.2.3

2.2.4

2:25

2.2.6

Toutes les données de la mémoire interne doivent être cryptées. Toute
modification des données doit être détectée.

Toutes les données transférées lors de l'Audit à distance et local doivent
être cryptées.

Les données internes et les données d'audit doivent être cryptées avec
AES256 en mode CBC avec la Clé de cryptage.

Le MCF doit être construit de telle sorte que toute tentative d'ouverture de
la boîte soit détectée par des traces visibles.

2.3Exigence de performance

2.3.1

2.3.2

2.3.3
2.3.4

2.3.5

2.3.6

2.3.7

2.3.8

2.3:9

Le MCF doit être conforme aux normes internationales de sécurité pour
les équipements électroniques lorsque le MCF est une machine physique.

La mémoire interne doit être telle qu'elle n'a pas besoin d'énergie
électrique pour conserver les données stockées.

Le MCF conserve les données internes pendant au moins 10 ans.

Le MCF peut écraser ou effacer des données internes datant de plus de
10 ans.

Les fonctions du MCF ne doivent pas retarder de manière significative les
opérations SFE normales. Dans le cas de 100 articles sur la facture, le
temps de traitement ne doit pas dépasser 3 secondes.

Le MCF doit signaler s'il fonctionne ou non.

Le MCF doit signaler si l'audit à distance ou l'audit local est terminé ou si
une erreur s'est produite pendant cette opération.

Le MCF doit avoir un port d'alimentation dédié avec son chargeur.

Le MCF doit avoir sa propre batterie interne. La batterie pleine doit
supporter l'impression d'au moins 300 factures sans alimentation externe.

2.3.10 L'horloge de temps réel de MCF ne doit pas différer de plus de 1 minute

maximum par an à une température ambiante de 20°C.

2.3.11 Le MCF doit supporter une plage de température de fonctionnement de +

5°C à + 40°C.

2.3.12 Le MCF doit supporter une plage de température de stockage de -10°C à

+ 55°C.

2.3.13 Le MCF doit résister à une humidité de fonctionnement de 10% à 85%.

---

## Page 6

2.4Document du module de contrôle de facturation
2.4.1 Toute la documentation doit être disponible en langue française.

2.4.2 La documentation doit inclure, sans s'y limiter :

a) Guide d'installation ;

b) Manuel de l'utilisateur ;

c) Manuel de l'agent des impôts ;
d) Environnement d'exploitation ;
e) Performance

2.5Exigences fonctionnelles
2.5.1 Le MCF doit avoir des Paramètres de service configurables, y compris :

a) Adresse du Serveur (PARAM_ASURL)

b) Adresse du Server NTP (PARAM_NURL)

c) Paramètres de la carte SIM:

i. Numéro de carte SIM (PARAM_SIMNUM) ;

ii. APN (PARAM_ APN) ;
ii. APN nom d'utilisateur (PARAM_APNUSER) ;
iv. APN mot de passe (PARAM_APNPASS) ;

d) Nom commercial (PARAM_NAME)

e) Numéro d'enregistrement au registre de commerce
(PARAM_RCCM)

f) Adresses (PARAM_AD1, PARAM_AD2, PARAM_AD3)

g) Coordonnées (téléphone et email) (PARAM_CON1,
PARAM_CON2, PARAM_CON3)

h) Nom de point de vente (PARAM_H)

i) 16 groupes différents de taux d'imposition (PARAM TA —
PARAM_TP)

j) 4 groupes de taux PSVB (PARAM_PSVBA — PARAM_PSVBD)

k) 2 paramètres de blocage de la machine (PARAM_BLOCK,
PARAM_BLOCK2)

1) Date et heure

2.5.2 Le MCF doit avoir des Paramètres d'activation configurables, y compris :

a) IFU (PARAM_IFU) ;
b) Clé de cryptage (PARAM_EKEY) ;
c) Clé de code (PARAM_SKEY).

2.5.3 Le MCF doit avoir le compteur d’activation interne (PARAM_ACNT). La
valeur du compteur doit être égale à 1 lorsqu'elle est déployée du
fabricant. La valeur du compteur est automatiquement incrémentée
chaque fois que la procédure de réinitialisation est effectuée. La valeur du
compteur d'activation ne peut pas être modifiée par d’autres moyens.

2.5.4 Le MCF doit prendre en charge les états internes suivants :

---

## Page 7

a) Le MCF doit être à l'état Non-activé lorsqu'il est déployé par le fabricant.

b) Le MCF doit passer à l'état Actif lorsque la Procédure d'activation est
terminée avec succès.

c) Le MCF doit pouvoir basculer entre les états Actif et Bloqué :

i. Si la différence, en jours, entre l'heure actuelle et la dernière
heure d'audit à distance réussie est supérieure au Paramètre de
blocage de machine PARAM_BLOCK (si sa valeur n'est pas 0)
ou si le nombre de Transactions non-envoyées est supérieur au
paramètre de blocage machine PARAM_BLOCK2 (si sa valeur
n'est pas 0), MCF passe en état Bloqué ;

ii. Si la différence, en jours, entre l'heure actuelle et le dernier
temps d'audit à distance réussi est inférieure ou égale au
paramètre de blocage de machine PARAM_BLOCK (si sa valeur
n'est pas 0) et le nombre de Transactions non-envoyées est
inférieur ou égal au paramètre de blocage de machine
PARAM_BLOCkKz2 (si sa valeur n'est pas 0), MCF doit passer à
l'état Actif.

2.5.5 L'Administration et les techniciens autorisés peuvent mettre le MCF en
état Désactivé en exécutant la commande de désactivation. Seuls
l'Administration ou les techniciens autorisés peuvent réactiver le MCF
après quoi il passe à l'état Actif ou Bloqué en fonction des conditions
définies au point 7.5.

2.5.6 Si, lors de l'activation, le MCF a été configuré pour fonctionner en mode
Test, les restrictions suivantes s'appliquent :

a) Le MCF doit se désactiver automatiquement après le nombre de jours
définis par l'Administration pendant l'activation ;

b) Le MCF en mode Test ne peut pas être réactivé, il peut seulement être
réinitialisé.
2.5.7 Le MCF peut enregistrer de nouvelles Factures uniquement s'il est en état
Actif.

2.5.8 Le MCF devrait signaler à l'utilisateur s'il est en état Bloqué ou Désactivé.

2.6 Procédure de service
2.6.1 Le MCF doit fournir des moyens pour entrer dans la Procédure de service

par un technicien autorisé seulement.

2.6.2 Le MCF doit autoriser la configuration des Paramètres de service
seulement pendant la Procédure de service.

---

## Page 8

2.7 Procédure d'activation
2.7.1 Le MCF doit fournir des moyens pour entrer dans la Procédure d'activation

par un technicien autorisé seulement.

2.7.2 La Procédure d'activation ne peut être effectuée que si le MCF est à l'état
Non-activé.

2.7.3 Le MCF doit autoriser la configuration des Paramètres d'activation
uniquement pendant la Procédure d'activation.

2.7.4 Les Paramètres d'activation ne peuvent pas être modifiés une fois la
Procédure d'activation terminée avec succès, c'est-à-dire que le MCF est
considéré comme étant activé.

2.7.5 La procédure d'activation est spécifiée par l'Administration.

2.8 Procédure de réinitialisation
2.8.1 Le MCF doit fournir les moyens d'entrer dans la procédure de
réinitialisation uniquement par un technicien autorisé.

2.8.2 La procédure de réinitialisation ne peut être lancée que si toutes les
transactions sont téléchargées sur le serveur de l'Administration.

2.8.3 Le MCF doit effacer les paramètres de service, les paramètres d'activation
et toutes les données internes et définir l'état sur Non-activé après
l'exécution de la procédure de réinitialisation.

2.8.4 Le MCF incrémentera automatiquement le compteur d'activation
(PARAM_ACNT) après l'exécution de la procédure de réinitialisation.

2.9 Données internes
2.9.1 Le MCF stocke les Transactions et les Compteurs dans sa mémoire

interne.
2.9.2 Transaction peut être :

a) Facture;

b) Rapport quotidien ;

c) Rapport de changement ;
d) Rapport d'erreur.

2.9.3 Les données de Transaction doivent être dans l'ordre dans lequel elles
sont reçues ou créées.

2.9.4 Chaque Transaction a un numéro de transaction (FDOC) qui commence
à la valeur 0 et est incrémenté (de 1) pour chaque nouvelle Transaction.

---

## Page 9

2.10 Factures
2.10.1Le MCF doit enregistrer tous les types de Factures définis dans la

spécification SFE.

2.10.2 Traitement des Factures :

a) Le MCF doit recevoir et traiter les données de commande de SFE;

b) Le MCF doit envoyer les données de réponse au SFE ;

c) Le MCF doit finaliser la facture en générant des éléments de sécurité
pour chaque facture et en écrivant les données de facturation en tant
que données de Transaction dans sa mémoire interne ;

d) Le MCF ne doit pas générer d'éléments de sécurité et doit rejeter la
facture :

i. sile montant sur la facture est inférieur ou égal à 0 ;
ii. si, pour tout article sur la facture, le montant est inférieur ou égal
a0;
iii. si le numéro de facture envoyé par le SFE est égal au numéro
de la derniére facture certifiée.

2.10.3 Les Eléments de sécurité consistent a :

a) Code SECEF (code de la facture), tel que défini par l'Administration.
b) Identificateur de machine dans le format (NIM)-(ACNT), où :
i. NIM estle NIM de la machine ;
ii. ACNT est le compteur d'activation.
c) Compteurs
d) MCF date et heure
e) Code QR au format défini par l'Administration

2.10.4 Compteurs est un identifiant unique donné au format (CPIT)/(FDOC) (ITL)
où :

a) CPIT est compteur par type de facture ; dans le cas d'une copie de
facture, la valeur est égale à celle de la facture originale de vente ou
d'avoir ;

b) FDOC est le nombre total de transactions enregistrées ;

c) ITL est une étiquette de type de facture.

2.11 Rapports
2.11.1 Le MCF doit générer automatiquement un Rapport quotidien pour chaque
jour au cours duquel au moins une Facture où un Rapport de changement
est enregistré, par utilisation des données de ce jour (de 00:00:00 à

23:59:59).

2.11.2 Le MCF doit générer un Rapport de changement pour chaque Procédure
de service, chaque fois que son état change ou si la Valeur de Paramètre

de service a été modifiée.

---

## Page 10

2.11.3Le MCF doit générer un Rapport d'erreur chaque fois qu'une erreur
fonctionnelle s'est produite.

2.11.4 Les rapports quotidiens ont un numéro de rapport qui commence à 1 pour
le premier rapport et est incrémenté pour chaque nouveau rapport

quotidien.

2.11.5 Les rapports de modification ont un numéro qui commence à 1 pour le
premier rapport et est incrémenté pour chaque nouveau rapport de
modification.

2.11.6 Le format et le contenu des rapports sont définis par l'Administration.

2.12 Compteurs
2.12.1 Tous les Compteurs commencent par la valeur 0.

2.12.2 Les compteurs ne peuvent pas être réduits.
2.12.3 MCF doit mettre à jour les Compteurs pour chaque nouvelle Transaction.

2.12.4 Les Compteurs sont constitués de :

i. | Compteur total des transactions, incrémenté de 1 pour chaque Transaction

ii. | Compteur de Rapports quotidiens, incrémenté de 1 pour chaque Rapport
quotidien

iii. | Compteur de Rapports de changement, incrémenté de 1 pour chaque
Rapport de changement

iv. Compteur de Rapports d'erreur, incrémenté de 1 pour chaque Rapport
d'erreur

v. Compteur total des Factures, incrémenté de 1 pour chaque Facture

vi. Compteur par type de Facture de vente, incrémentée de 1 pour chaque
Facture de vente ou facture d'acompte

vii. Compteur par type de Facture d’avoir, incrémenté de 1 pour chaque
Facture d’avoir

viii. Compteur par type de Facture de vente à l'exportation, incrémenté de 1
pour chaque Facture de vente à l'exportation ou facture d'acompte à
l'exportation

ix. Compteur par type de Facture d’avoir à l'exportation, incrémenté de 1 pour
chaque Facture d’avoir à l'exportation
x: Date et heure du dernier Audit local, mises à jour après chaque Audit local

réussi
xi. Date et heure du dernier Audit à distance, mis à jour après chaque Audit à

distance réussi.

2.13 Audit local
2.13.1Le MCF doit copier le Fichier d'audit sur un stockage de mémoire

amovible avec le système de fichiers FAT32 lors de l'Audit local.

10

---

## Page 11

213.2 L'Audit local démarre automatiquement une fois que le stockage de
mémoire amovible est inséré dans MCF.

2.13.3 La procédure d’audit local et le format des données sont spécifiés définis
par l'Administration.

2.14 Audit à distance
2.14.1Le MCF doit envoyer le Fichier d'audit au Serveur lorsque l'Audit à

distance est effectué.

2 14.2 L'Audit à distance est exécuté automatiquement, quel que soit l'état du
MCF.

2.14.3 La procédure d’audit à distance et le format des données sont spécifiés a
l'annexe.

3. Spécifications techniques d'unités de facturation (UF)
3.1 L'UF doit satisfaire à toutes les exigences pour le SFE et le MCF, sauf
indication contraire dans la spécification de l'UF.
3.2 L'UF doit fournir :

a) Clavier intégré pour l'interaction de l'utilisateur ;

b) Écran intégré pour l'interaction de l'utilisateur ;

c) En option, un écran secondaire intégré pour le client ;
d) Imprimatur intégré.

3.3 L'UF doit avoir une étiquette imprimée attachée au boîtier contenant les
informations suivantes :

a) Etiquette "Unité de facturation" ;

b) NIM;

c) Nom du fabricant ;

d) Nom du modèle ;

e) Code QR dans le format : « BFSECEF;UF;NIM;FABRICANT;MODELE »

3.4 Le port A tels que définis pour le MCF, est un port interne.

3.5 LISF est égal à la désignation du NID (premiers 4 caractères).

3.6 L'UF ne devrait pas être en mesure de corriger où d'annuler une transaction
sans imprimer les détails sur la correction.

3.7 L'UF peut prendre en charge l'impression de factures au format A4.

3.8 L'UF peut prendre en charge la configuration et l'impression du logo du
vendeur sur la facture.

---

