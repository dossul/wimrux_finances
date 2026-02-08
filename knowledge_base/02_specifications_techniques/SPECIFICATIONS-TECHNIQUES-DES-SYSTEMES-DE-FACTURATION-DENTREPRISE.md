# SPECIFICATIONS-TECHNIQUES-DES-SYSTEMES-DE-FACTURATION-DENTREPRISE.pdf

- **Fichier source:** `SPECIFICATIONS-TECHNIQUES-DES-SYSTEMES-DE-FACTURATION-DENTREPRISE.pdf`
- **Taille:** 3146.5 Ko
- **Pages:** 10
- **Statut extraction:** success
- **Hash MD5:** `000a745082ee264112ad48355d8e723b`
- **Date extraction:** 2026-02-08 03:53:59

---

## Page 1

MINISTERE DE L’ECONOMIE
ET DES FINANCES

BURKINA FASO

La Patrie ou la Mort, nous Vaincrons

Ouagadougou, le 29 DEC 2025

NOTE DE SERVICE

Objet : spécifications techniques des systémes de facturation d’entreprise

Conformément à l'article 564 du Code général des impôts (CGI) et a l'arrêté
n°2025-0047/MEF/SG/DGI du 05 février 2025, la présente note fixe les spécifications
techniques et obligations applicables aux systèmes de facturation d'entreprise (SFE).

Les SFE sont destinés aux entreprises souhaitant utiliser un système interne pour
l'émission de factures électroniques certifiées.

La commercialisation de tout SFE est réservée aux personnes physiques ou morales
de droit burkinabè ayant obtenu une attestation de conformité et un identifiant de
système de facturation (ISF) délivrée par le Directeur général des impôts.

Les SFE doivent :

intégrer un module de certification conforme au paragraphe 2 de l’article 564
du CGI ;

garantir l'intégrité, l'inviolabilité et la traçabilité de toutes les factures émises ;
permettre la communication automatique des données de facturation avec les
modules de contrôle facturation (MCF).

La procédure d'homologation est effectuée par le comité institué à cet effet. Le respect
des spécifications techniques conditionne la délivrance de l'attestation de conformité.

Les spécifications techniques des systèmes de facturation d'entreprise figurent dans
le document en annexe à la présente note. Ce document sert de base aux procédures
d'homologation des SFE.

Le Président du comité d'homologation est chargé de veiller à l'application de la
présente note.

V4 : À Directrice générale des impôts
i ¢ | ae
\ 4 &/| Eliane T. DJIGUEMDE
NS) © Chevalier de l'Ordre de l'Etalon

01 BP : 119 OUAGADOUGOU 01 Tél : (+226) 25 30 89 85 / 87 - 25 31 60 03/05

Fax : (+226) 25 31 27 70 Site Web : www.impots.gov.bf

---

## Page 2

SPECIFICATIONS TECHNIQUES DES SYSTEMES DE FACTURATION
D'ENTREPRISE

| Version Description
| 1.0 Version initiale
2.0 Mise à jour : Extension de la désignation des articles à 64 caractères,

format libre de l'IFU pour les factures d'exportation, ajustement du
logo du vendeur sur la facture et mise en œuvre du timbre

1 Définitions

e SECeF : système Electronique Certifié de Facturation.

e Facture électronique certifiée : facture produite par le SECeF.

+ Administration : Administration fiscale.

e Serveur : serveur de l'Administration qui héberge le système de gestion des
SECer.

e Utilisateur : contribuable qui utilise le SECeF.

e IFU : identifiant unique du contribuable.

e NIM: numéro de série unique de SECer.

+ SFE: logiciel de facturation ou une solution informatique permettant à une
entreprise de gérer tout ou partie de son processus de facturation.

e ISF: identifiant de SFE.

e UF: Unité de facturation. C’est une machine électronique congue pour entrer
des données de facturation, gérer des articles, générer des rapports pour
l'utilisateur, collecter des données de factures, traiter des factures, fournir des
éléments de sécurité pour l'authentification et la vérification des factures,
imprimer des factures et des rapports, transmettre des données à distance au
serveur de l'Administration et fournir des données localement.

e MCF: module de contrôle de facturation. C'est une machine électronique
conçue pour collecter des données de facture, effectuer le traitement des
données de facturation, fournir des éléments de sécurité pour l'authentification
et la vérification des factures, transmettre des données à distance au serveur
et fournir des données localement.

e Éléments de sécurité (code SECeF/DGI, identificateur de SECeF, compteurs,
date et heure du MCF, code QR) : données sur la facture fournies par le SECeF,
utilisées pour la vérification de l'authenticité et de l'intégrité de la facture.

e Code SECeF/DGI : code unique sur la facture fourni par le SECeF.

e Audit à distance : communication bidirectionnelle entre le SECeF et le serveur
afin d'échanger les informations.

e Audit local : transfert local de données de la mémoire interne de SECeF.

---

## Page 3

e Clé de cryptage : clé numérique utilisée pour le chiffrement des données
pendant l'audit à distance et l'audit local.

* Clé de code: clé numérique utilisée pour la génération du code SECeF/DGI.

e SFE: logiciel ou système conçu pour enregistrer des données de facture, gérer
des articles, générer des rapports pour l'utilisateur, envoyer des informations
au MCF, recevoir des réponses de MCF, imprimer des factures avec des
éléments de sécurité fournis par MCF pour chaque facture.

2 Exigences générales

Dans le cas où le SFE est un système, il devrait fournir les interfaces

a) Clavier pour l'utilisateur : le clavier doit permettre la saisie de
caractères alphanumériques dans l'alphabet français (chiffres et
lettres) ; les caractères alphabétiques doivent figurer sur les

b) Ecran pour l'utilisateur
c) Capacité d'impression pour imprimer des Factures et d'autres

Dans le cas où le SFE est un logiciel, toutes les interfaces doivent être
prises en charge sur l'ordinateur hôte/le dispositif hôte.

Le SFE devrait avoir un numéro d'identification (ISF) attribué par
l'Administration unique pour chaque modèle approuvé.

Le SFE devrait être capable de générer la facture en obtenant des
éléments de sécurité de MCF et d'imprimer des éléments de sécurité sur
la facture. Les données imprimées sur la facture et les données
échangées avec MCF doivent être identiques.

Le SFE ne devrait pas être en mesure d'émettre une facture sans
éléments de sécurité fournis par le MCF.

Le SFE ne devrait pas pouvoir enregistrer la facture sans identifier les

2.1
suivantes :
touches du clavier
documents
2.2
23
2.4
2.5
2.6
articles (biens et/ou services).
2.7

2.8

Le SFE devrait être capable d'enregistrer les types de factures suivants :

2.10 Etiquette

Type de Facture 2.9 Description

FACTURE DE VENTE Facture de vente FV |

FACTURE D'ACOMPTE OU Facture d’acompte ou | FT

D'AVANCE d'avance |

FACTURE D’AVOIR | Facture d'avoir FA |

FACTURE DE VENTE A Facture de vente à EV |

L'EXPORTATION l'exportation |
]

---

## Page 4

2.8 Type de Facture 29 Description 2.10 Etiquette

FACTURE D'ACOMPTE A Facture d’acompte à ET |
L'EXPORTATION l'exportation

FACTURE D'AVOIR A Facture d’avoir à EA |
L'EXPORTATION l'exportation |

211 Le SFE devrait être capable d'enregistrer des copies de la facture
(« duplicata » de la facture) sélectionnée.

2.12 Le SFE devrait être capable de générer des rapports statistiques X, Z et
A comme défini dans les sections 2.1.4 et 2.1.5.

2.13 Le SFE devrait être capable d'enregistrer les dépôts et les retraits de
numéraires.

2.14 Le SFE doit obliger l'utilisateur à préciser le type de client selon le tableau
de paramétrage « Type de client » en annexe. Sur la base de type de
client sélectionné, le SFE devrait enregistrer l'IFU, le RCCM, le nom du
client, le numéro de téléphone, adresse et email, comme défini en annexe.

2.15 Le SFE devrait être capable d'enregistrer au moins 16 groupes de
taxation différents :

Groupe de Etiquette Description Taux dela TVA
taxation applicable

Groupe A A Exonéré -
Groupe B B TVA taxable 1 118%
Groupe C C TVA taxable 2 10%
Groupe D D Exportation de produits taxables -
Groupe E E TVA régime dérogatoire -
| Groupe F F TVA régime dérogatoire | 18%
Groupe G G TVA régime dérogatoire 10%
Groupe H H Régime synthétique -
Groupe | I Consignation d'emballage -
Groupe J J | Dépôts, garantie et caution LE
Groupe K K Débours -
Groupe L L TDT - Taxe de développement 10%
touristique
Groupe M M | Taxe de séjour hôtelier perçue par les | 10%
L communes
Groupe N N PBA - Droits fixes en fonction de la -
destination et de la classe
Groupe O O Réservé -
Groupe P P | Réservé [-

---

## Page 5

216 Le SFE devrait être en mesure d'enregistrer quatre groupes de
prélèvement à la source sur vente de biens (PSVB).

N° | Groupe | Description | Observation

1 A Rese droit commun | 2%
2 |B | PSVB dérogation 1%
3 |C | PSVB dérogation 0,2%
4 |D | PSVB réservé | 0%

2.17 Le SFE devrait être capable d'enregistrer la taxe spécifique pour chaque
article où cette taxe est applicable. Au minimum, le SFE devrait permettre
l'enregistrement du montant de la taxe spécifique. Le SFE peut permettre
l'enregistrement de la taxe spécifique proportionnelle à la quantité ou au
pourcentage du montant de l'article.

2.18 Le SFE doit pouvoir générer une référence unique pour chaque facture,
dans une série ininterrompue par année de gestion. En cas de duplicata
de la facture, le numéro de référence est le même que celui de la facture
originale.

2.19 Le SFE devrait être capable d'enregistrer et de gérer les articles (biens ou
services). Au minimum, le SFE doit enregistrer la désignation de l'article
(d'au moins 64 caractères), le code de l'article, le type d'article selon le
tableau de paramétrage « Types d'article » en annexe, le prix unitaire (soit
HT soit TTC, selon le mode sur la Facture), l'unité de mesure, la quantité,
le groupe de taxation la taxe spécifique, le cas échéant.

2.20 Le SFE devrait avoir un contrôle d'inventaire, où l'utilisateur peut, selon la
nature de son activité, entrer et/ou retirer des articles du stock et produire
un rapport indépendant indiquant l'état de l'inventaire.

2.21 Le SFE devrait être capable d'enregistrer les modes de paiements avec
différents types de moyens de paiement (virement, carte bancaire, mobile
money, chèques, espèces, crédit).

2.22 Le SFE doit s'assurer que le montant total de la facture est égal à la
somme des montants par mode de paiement.

2.23 Le SFE devrait être équipé d'un journal électronique disposant du contenu
de toutes les factures et tous les rapports générés, comportant également
le Code SECeF/DGI pour chaque facture.

2.24 Le SFE ne doit pas enregistrer de facture dont le montant est nul ou
négatif.

2.25 Le SFE ne doit pas enregistrer de facture avec l'article dont le montant est
nul ou négatif.

KE

---

## Page 6

2.26

2.27

2.28

2.29

2.30

2.31

2.32

2.33
2.34

2.35

Le SFE doit permettre la configuration des paramètres du port sur lequel
le MCF est connecté.

Le SFE doit pouvoir inscrire au moins 8 lignes de commentaire sur la
facture. Chaque ligne de commentaire contient une étiquette et un
contenu qui sont définis dans le tableau de paramétrage « Lignes de
commentaires » en annexe.

Lors de l'émission d'une facture d’avoir, le SFE doit obliger l'utilisateur a
préciser la nature de la facture d'avoir selon le tableau de paramétrage
« Nature de facture d’avoir » en annexe.

Le SFE devrait enregistrer les rabais, remise et ristourne en utilisant la
facture d'avoir avec la référence de facture originale égale à « RRR ».

Le SFE doit se conformer à toutes les exigences énoncées dans le
protocole de communication avec le MCF, y compris le format et le
contenu du code QR imprimé sur la facture. SFE doit s'assurer que le
code QR peut être scanné

Dans le cas où le MCF connecté au SFE est une machine, le SFE doit
informer l'utilisateur, quotidiennement, via l'interface utilisateur, si le MCF
connecté n'a pas été connecté à l'Administration pendant plus de 7 jours,
en exécutant la commande dédiée dans le protocole de communication.

Le SFE doit permettre la configuration de références du ou des comptes
bancaires.

Le SFE doit permettre la configuration du régime d'imposition.

Le SFE doit permettre la configuration du service des impôts de
rattachement.

Le SFE doit permettre la configuration des tableaux de paramétrage.

3 Spécifications de la facture

Le SFE doit être capable de générer des factures, qui doivent montrer, entre autres,
les mentions obligatoires suivantes :

a) Le nom de l'entreprise ;

b) IFU de l'entreprise ;

c) L'adresse à laquelle la vente a eu lieu, avec les références
cadastrales (section, ilot, parcelle) au format de SSSS LLL PPPP
(11 caractères numériques) ;

d) Informations de contact (téléphone, adresse physique, et email) de
l'entreprise ;

e) IFU et nom du client, type de client, si le client l'a demandé,
éventuellement adresse et contact du client ;

~

—

---

## Page 7

!)

En cas de copie de Facture, mention DUPLICATA ;

En cas de Facture d’avoir, mention FACTURE D’AVOIR et la nature
de facture d'avoir ;

En cas de facture à l'exportation, mention EXPORTATION ;

En cas de facture d'acompte, mention D'ACOMPTE ;

Références du ou des comptes bancaires

Régime d'imposition

Service des impôts

m) Numéro de série de la facture à partir d'un numéro ascendant

n)

2)

ininterrompu par année de gestion ;

Biens ou services vendus avec la désignation, le type de groupe
de taxation, la quantité, le prix, le montant, montrant la remise ou
toute autre modification du prix ;

Montant total des ventes (prix brute-réduction s’il y a lieu) pour
chaque groupe de taxation ;

Taux d'imposition appliqués ;

Les montants de l'impôt pour chaque groupe de taxation ;
Montant total toutes taxes comprises ;

Mention « Montant timbre quittance en cas de règlement en
espèce » suivie du montant en FCFA calculé selon les règles
applicables

Montant total en lettres ;

Modes de paiement ;

Taxe spécifique si applicable ;

Date et l'heure d'établissement de la facture ;

Identifiant du système de facturation d'entreprise ISF ;

Nom de l'opérateur ;

Eléments de sécurité.

4  Spécification des rapports statistiques (z-rapport et x-rapport)

4.1

4.2

4.3

Le SFE doit étre capable de générer un Z-rapport pour la période écoulée
depuis le dernier Z-rapport.

Le SFE doit être capable de générer un X-rapport quotidien pour la
période écoulée depuis le dernier Z-rapport et le rapport X périodique
avec période définie par l'Utilisateur.

Le Z-rapport et le X-rapport représentent un résumé de toutes les
transactions effectuées au cours de la période sélectionnée et contiennent
au moins des informations suivantes :

a) Nom commercial ;
b) IFU ;

)

Date et l'heure ;

d) L'information montrant que ceci est Z-rapport, X-rapport quotidien

ou X- rapport périodique ;

---

## Page 8

e) Période sélectionnée ;

f) ISF ;

g) Montant total, montant taxable et montant total de la taxe pour
chaque type de facture ;

h) Montant total, montant taxable et montant total de la taxe pour
chaque groupe de taxation pour chaque type de facture ;

i) Nombre de factures par type de facture ;

j) Montants totaux par mode de paiement ;

k) Toutes les réductions commerciales ;

1) D'autres enregistrements qui ont réduit les ventes de la journée et
leur montant ;

m)Nombre de ventes incomplètes.

5  Spécification de rapport des articles (A-rapport)

6

5.1 Le A-rapport contient les détails complets de chaque article, les quantités
vendues et les montants collectés pour chaque article et catégorie depuis
la génération du rapport À précédent.

5.2 Le A-rapport contient au moins des informations suivantes :

a) Nom commercial ;
b) IFU ;
c) Date et l'heure ;
d) L'information montrant que ceci est un A-rapport ;
e) ISF;
f) Code de l'article, nom de l'article, prix unitaire, taux d'impôt,
quantité vendue, quantité retournée, quantité en stock.
Calculs

6.1 Le SFE doit accepter les prix jusqu'à 2 chiffres et les quantités jusqu'à 3
chiffres après la virgule.

6.2 Le SFE doit arrondir toutes les valeurs décimales à la valeur la plus proche
avec un maximum de 2 chiffres après la virgule.

6.3 Le SFE doit permettre l'enregistrement du prix unitaire comme prix TTC
(hors taxe + TVA) ou comme prix HT (hors taxe).

6.4 Le SFE doit préciser le mode de prix unitaire (TTC ou HT) sur chaque
facture.

6.5 Le SFE doit faire les calculs sur le prix unitaire des articles.

6.6 Dans le cas du mode TTC, le SFE doit calculer le montant total imposable

pour chaque groupe de taxation sur la base du montant total du groupe
de taxation respectif. Dans le cas du mode HT, le SFE doit calculer le

4)

---

## Page 9

montant total pour chaque groupe de taxation sur la base du montant
imposable total du groupe de taxation respectif.

67 Le SFE calculera le montant total de la taxe pour chaque groupe de
taxation sur la base du montant total et du montant imposable total du
groupe respectif. Le montant imposable et le montant de la taxe doivent
totaliser le montant total. En cas d'arrondi, le montant de la taxe doit être
arrondi à une valeur supérieure pour satisfaire à cette condition.

68 Le SFE doit afficher la taxe spécifique pour chaque article, le cas échéant.

69 Le SFE doit considérer le prix hors taxe comme sans taxe spécifique. Si
la taxe spécifique est applicable, la base taxable de la TVA est augmentée
de la taxe spécifique si applicable

6.10 Le SFE doit calculer et afficher la valeur de prélèvement à la source sur
vente de biens (PSVB) et le montant de PSVB sur la base du montant
total toutes taxes comprises.

7 Annexe — tableaux de paramétrage

Types du client

Type of the Mention obligatoire sur la Champs obligatoires
client facture concernant le client
1 |CC Client [CC] Client comptant
Comptant |
2 | PM Personne [PM] Personne morale Nom (raison sociale) |
morale IFU* |
3: | RP Personne [PP] Personne physique Nom
physique
4 |PC Personne [PC] Personne physique Nom (raison sociale)
physique commerçant IFU*
_| commerçant

* Le champ « IFU du client » doit respecter le format officiel de l'IFU pour les
transactions locales, tandis que pour les exportations il peut être renseigné en
format libre.

Types d'article

Type d'article Mention obligatoire sur la facture
LOCBIE | Bien (Local) [LOCBIE] |
2 |LOCSER | Service (Local) | ILOCSER] |

[3 [IMPBIE | Bien (Importation) | [IMPBIE]

---

## Page 10

4 | IMPSERV | Service [IMPSER]
(Importation)

Nature de facture d’avoir

# Code Typede facture Mention obligatoire Description
d'avoir sur la facture
COR | Correction Correction

2 |RAN | Annulation | avnuleten

Annulation de transaction sans
paiement/fourniture des
biens/services

ristourne, rabais

|
3 | RAM | Avoir suite Avoir suite reprise | Correction/annulation de
reprise de transaction après
biens/services paiement/fourniture des
biens/services
4 |RRR | Remise, RRR

Lignes de commentaires

# Code Applicable dans le  Etiqueté
cas

A A définir Réf. exo.

Contenu

Référence du certificat
d'exonération

A définir Base juridique

Base juridique

Réservé

Réservé

Réservé

Réservé

Réservé

zlolnimlololw

Réservé

---

