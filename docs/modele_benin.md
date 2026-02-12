Documentation Technique API MECEF Bénin
Introduction
L'API e-MECeF (Module de Contrôle Électronique de Facturation dématérialisé) est mise en place par la Direction Générale des Impôts du Bénin dans le cadre de la réforme de la facture normalisée[1]. Cette interface de programmation permet aux contribuables disposant de leur propre système de facturation d'entreprise (SFE) de communiquer avec le système de la DGI pour produire des factures normalisées sans avoir besoin d'une machine physique[2].
L'e-MECeF est une implémentation logicielle du Module de Contrôle de Facturation (MCF) du côté de la DGI. Le SFE peut communiquer avec l'e-MECeF via l'API pour obtenir des éléments de sécurité (Code MECeF/DGI, signature électronique, code QR) et produire des factures normalisées conformes à la réglementation[1][2].
Pré-requis
Pour accéder à l'API, les conditions suivantes doivent être remplies:
1.	Activation de l'e-MCF par la DGI - Une fois que l'e-MCF est activé par la DGI, il peut être utilisé pour enregistrer des factures normalisées.
2.	Obtention des jetons de sécurité - Le contribuable doit obtenir un jeton JWT pour chaque e-MCF. Ces jetons sont créés par la DGI et autorisent le SFE à accéder à l'API[2].
3.	Sécurité des jetons - Les jetons doivent rester secrets et être utilisés uniquement pour configurer le SFE. Ils ne doivent pas être partagés ou sauvegardés dans des endroits accessibles au personnel non autorisé[2].
Configuration de base
Format de données
L'API prend en charge le format de données JSON, tant dans les requêtes que dans les réponses[2].
Authentification
L'authentification est fournie par le biais d'un jeton JWT qui doit être inclus dans l'en-tête de chaque requête[2].
Les requêtes non autorisées retourneront le code d'état HTTP 401 Unauthorized.
En-tête de requête
{
"Authorization": "Bearer <JWT_TOKEN>",
"Content-Type": "application/json"
}
URLs de l'API
L'API dispose de deux serveurs pour les environnements de production et de test:
Environnement	API Facturation	API Information
Production	https://sygmef.impots.bj/emcf/api/invoice	https://sygmef.impots.bj/emcf/api/info
Test	https://developper.impots.bj/sygmef-emcf/api/invoice	https://developper.impots.bj/sygmef-emcf/api/info

Table 1: URLs des environnements MECEF
Architecture de l'API
L'API se compose de deux parties principales:
1.	API de Facturation - Utilisée pour enregistrer de nouvelles factures normalisées
2.	API d'Information - Utilisée pour obtenir des informations sur les e-MCF, les groupes de taxation, les types de factures et les types de paiement disponibles
API de Facturation
1. Demande de statut
Permet de vérifier l'état de l'API, du jeton et des factures en attente.
Endpoint: GET {API_FACTURATION_URL}/
Paramètres: Aucun
Exemple de réponse:
{
"status": true,
"version": "1.0",
"ifu": "99999000000001",
"nime": "XX01000001",
"tokenValid": "2020-11-28T00:00:00+01:00",
"serverDateTime": "2020-11-21T17:25:14.7179651+01:00",
"pendingRequestsCount": 4,
"pendingRequestsList": [
{
"date": "2020-11-20T21:45:56.523+01:00",
"uid": "437261A6-41BD-4D7B-B61B-E60C2D8089AA"
}
]
}
Champs de la réponse:
Champ	Description
status	État de l'API (true/false)
version	Version de l'API
ifu	Identifiant Fiscal Unique
nime	Numéro d'Identification de la MECeF
tokenValid	Date de validité du jeton
serverDateTime	Date et heure du serveur
pendingRequestsCount	Nombre de factures en attente
pendingRequestsList	Liste des factures en attente

Table 2: Champs de réponse du statut
2. Demande de facture
Permet de soumettre les données de la facture à l'e-MCF et d'obtenir les montants calculés.
Endpoint: POST {API_FACTURATION_URL}/
Structure de la requête:
{
"ifu": "9999900000001",
"type": "FV",
"items": [
{
"name": "Jus d'orange",
"price": 1800,
"quantity": 2,
"taxGroup": "B"
},
{
"name": "Lait 1/1 EX",
"price": 450,
"quantity": 3,
"taxGroup": "A"
}
],
"client": {
"contact": "45661122",
"ifu": "99999000000002",
"name": "Nom du client",
"address": "Rue d'ananas 23"
},
"operator": {
"id": "",
"name": "Jacques"
},
"payment": [
{
"name": "ESPECES",
"amount": 4950
}
]
}
Paramètres de la requête:
Champ	Type	Requis	Description
ifu	string	Oui	IFU du vendeur
type	string	Oui	Type de facture (FV, FA, EV, EA)
items	array	Oui	Liste des articles
client	object	Oui	Informations du client
operator	object	Non	Informations de l'opérateur
payment	array	Oui	Mode(s) de paiement

Table 3: Paramètres de la demande de facture
Types de factures:
•	FV - Facture de vente
•	FA - Facture d'avoir
•	EV - Facture de vente à l'exportation
•	EA - Facture d'avoir à l'exportation
Groupes de taxation:
•	A - AIB 1% (TVA 0%)
•	B - AIB 5% (TVA 18%)
•	C - AIB 1% (TVA 0%)
•	D - AIB 5% (TVA 18%)
•	E - Exonéré (AIB 0%, TVA 0%)
•	F - Exonéré (AIB 0%, TVA 0%)
Exemple de réponse:
{
"uid": "ac33f8fe-9735-4ed6-a9c3-df58a908ccd3",
"ta": 0,
"tb": 18,
"tc": 0,
"td": 18,
"taa": 1350,
"tab": 3600,
"tac": 0,
"tad": 0,
"tae": 0,
"taf": 0,
"hab": 3051,
"had": 0,
"vab": 549,
"vad": 0,
"total": 4950,
"aib": 0,
"ts": 0
}
Champs de la réponse:
Champ	Description
uid	Identifiant unique de la facture
ta, tb, tc, td	Taux de TVA pour chaque groupe
taa, tab, tac, tad, tae, taf	Totaux HT par groupe
hab, had	Montants HT + AIB
vab, vad	Montants de TVA
total	Montant total TTC
aib	Montant total AIB
ts	Taxe spécifique

Table 4: Champs de réponse de la facture
3. Demande de finalisation
Permet de finaliser (confirmer) ou d'annuler une facture en attente.
Endpoint: PUT {API_FACTURATION_URL}/{UID}/{ACTION}
Paramètres:
•	UID - Identifiant unique de la facture (retourné lors de la demande de facture)
•	ACTION - Action à effectuer:
–	confirm - Confirmer la facture et obtenir les éléments de sécurité
–	cancel - Annuler la facture
Exemple de requête (confirmation):
PUT https://sygmef.impots.bj/emcf/api/invoice/ac33f8fe-9735-4ed6-a9c3-df58a908ccd3/confirm
Exemple de réponse (confirmation réussie):
{
"dateTime": "23/11/2020 13:17:08",
"qrCode": "F;IN01000005;X537E4DBAJUUHHXNFWISFEKJ;9999900000001;20201123131708",
"codeMECeFDGI": "X537-E4DB-AJUU-HHXN-FWIS-FEKJ",
"counters": "64/64 FV",
"nim": "IN01000005"
}
Champs de la réponse:
Champ	Description
dateTime	Date et heure de certification
qrCode	Contenu du code QR à générer
codeMECeFDGI	Code MECeF/DGI unique de la facture
counters	Compteurs de factures
nim	Numéro d'Identification de la MECeF

Table 5: Éléments de sécurité de la facture
4. Demande de détails sur une facture en attente
Permet de vérifier les données d'une facture qui n'est pas encore finalisée.
Endpoint: GET {API_FACTURATION_URL}/{UID}
Paramètres:
•	UID - Identifiant unique de la facture
Exemple de requête:
GET https://sygmef.impots.bj/emcf/api/invoice/ac33f8fe-9735-4ed6-a9c3-df58a908ccd3
Réponse: Retourne les détails complets de la facture soumise.
API d'Information
1. Informations sur les e-MCF
Permet de vérifier l'état de l'API et d'obtenir la liste de tous les e-MCF du contribuable.
Endpoint: GET {API_INFORMATION_URL}/status
Exemple de réponse:
{
"status": true,
"version": "1.0",
"ifu": "9999900000001",
"nim": "XX01000070",
"tokenValid": "2021-01-31T00:00:00+01:00",
"serverDateTime": "2021-01-05T21:26:18.9775221+01:00",
"emcfList": [
{
"nim": "XX01000070",
"status": "Actif",
"shopName": "TEST #70",
"address1": "Boulevard 23",
"address2": null,
"address3": "Cotonou",
"contact1": "12345678",
"contact2": null,
"contact3": null
}
]
}
2. Informations sur les groupes de taxation
Permet d'obtenir les taux de TVA et d'AIB pour chaque groupe de taxation.
Endpoint: GET {API_INFORMATION_URL}/taxGroups
Exemple de réponse:
{
"a": 0,
"b": 18,
"c": 0,
"d": 18,
"e": 0,
"f": 0,
"aibA": 1,
"aibB": 5
}
Signification:
Groupe	TVA (%)	AIB (%)
A	0	1
B	18	5
C	0	1
D	18	5
E	0	0
F	0	0

Table 6: Groupes de taxation et taux applicables
3. Informations sur les types de factures
Permet d'obtenir la liste des types de factures disponibles.
Endpoint: GET {API_INFORMATION_URL}/invoiceTypes
Exemple de réponse:
[
{
"type": "FV",
"description": "Facture de vente"
},
{
"type": "FA",
"description": "Facture d'avoir"
},
{
"type": "EV",
"description": "Facture de vente à l'exportation"
},
{
"type": "EA",
"description": "Facture d'avoir à l'exportation"
}
]
4. Informations sur les types de paiement
Permet d'obtenir la liste des modes de paiement acceptés.
Endpoint: GET {API_INFORMATION_URL}/paymentTypes
Exemple de réponse:
[
{
"type": "ESPECES",
"description": "ESPECES"
},
{
"type": "CHEQUES",
"description": "CHEQUES"
},
{
"type": "MOBILEMONEY",
"description": "MOBILE MONEY"
},
{
"type": "CARTEBANCAIRE",
"description": "CARTE BANCAIRE"
},
{
"type": "VIREMENT",
"description": "VIREMENT"
},
{
"type": "CREDIT",
"description": "CREDIT"
},
{
"type": "AUTRE",
"description": "AUTRE"
}
]
Flux de travail d'enregistrement de facture
Le processus complet d'enregistrement d'une facture normalisée suit ces étapes:
1.	Vérification du statut - Appeler l'endpoint de statut pour s'assurer que l'API et le jeton sont valides
2.	Soumission de la facture - Envoyer les données de la facture via POST et recevoir l'UID et les totaux calculés
3.	Validation des données - Vérifier que les montants calculés sont corrects
4.	Finalisation - Confirmer la facture via PUT pour obtenir les éléments de sécurité (Code MECeF/DGI, QR Code)
5.	Génération de la facture - Utiliser les éléments de sécurité pour imprimer/afficher la facture normalisée avec code QR
En cas d'erreur ou d'annulation, utiliser l'action cancel au lieu de confirm lors de la finalisation.
Gestion des erreurs
L'API retourne des codes d'erreur spécifiques en cas de problème:
Code	Description
1	Le nombre maximum de factures en attente est dépassé
3	Type de facture non valide
4	La référence de la facture originale est manquante
5	La référence de la facture originale ne comporte pas 24 caractères
6	La valeur de l'AIB n'est pas valide
7	Le type de paiement n'est pas valide
8	La facture doit contenir des articles
9	Le groupe de taxation au niveau des articles n'est pas valide
10	La référence de la facture originale ne peut pas être validée, réessayer plus tard
11	La référence de la facture originale n'est pas valide (facture introuvable)
12	Le montant sur la facture d'avoir dépasse le montant de la facture originale
20	La facture n'existe pas ou elle est déjà finalisée/annulée
99	Erreur lors du traitement de la demande

Table 7: Codes d'erreur de l'API MECEF
Codes HTTP:
•	200 OK - Requête réussie
•	400 Bad Request - Requête POST sans corps de contenu ou données invalides
•	401 Unauthorized - Jeton JWT manquant ou invalide
•	404 Not Found - Ressource non trouvée
•	500 Internal Server Error - Erreur serveur
Bonnes pratiques
1.	Sécurité des jetons - Ne jamais exposer les jetons JWT dans le code client ou les logs. Les stocker de manière sécurisée côté serveur uniquement[2].
2.	Gestion des factures en attente - Vérifier régulièrement le statut pour éviter d'atteindre la limite de factures en attente. Finaliser ou annuler les factures rapidement.
3.	Validation locale - Valider les données de facturation côté client avant de les soumettre à l'API pour éviter les erreurs inutiles.
4.	Gestion des erreurs - Implémenter une gestion robuste des erreurs et des mécanismes de retry pour les erreurs temporaires (code 10, 99).
5.	Conservation des données - Sauvegarder localement l'UID et le Code MECeF/DGI de chaque facture pour référence future et traçabilité.
6.	Test avant production - Utiliser l'environnement de test pour valider l'intégration avant de passer en production.
7.	Synchronisation horaire - S'assurer que l'horloge système est synchronisée pour éviter les problèmes de validation des jetons.
8.	Impression du QR Code - Générer et afficher le code QR sur toutes les factures normalisées en utilisant la valeur du champ qrCode[3].
Exemple d'implémentation Node.js
Voici un exemple d'intégration de l'API MECEF en Node.js:
const axios = require('axios');
class MecefClient {
constructor(apiUrl, token) {
this.apiUrl = apiUrl;
this.token = token;
this.headers = {
'Authorization': Bearer ${token},
'Content-Type': 'application/json'
};
}
async getStatus() {
const response = await axios.get(${this.apiUrl}/, {
headers: this.headers
});
return response.data;
}
async submitInvoice(invoiceData) {
const response = await axios.post(${this.apiUrl}/, invoiceData, {
headers: this.headers
});
return response.data;
}
async confirmInvoice(uid) {
const response = await axios.put(
${this.apiUrl}/${uid}/confirm,
{},
{ headers: this.headers }
);
return response.data;
}
async cancelInvoice(uid) {
const response = await axios.put(
${this.apiUrl}/${uid}/cancel,
{},
{ headers: this.headers }
);
return response.data;
}
async getInvoiceDetails(uid) {
const response = await axios.get(${this.apiUrl}/${uid}, {
headers: this.headers
});
return response.data;
}
}
// Utilisation
const mecef = new MecefClient(
'https://developper.impots.bj/sygmef-emcf/api/invoice',
'VOTRE_TOKEN_JWT'
);
async function createInvoice() {
try {
// 1. Vérifier le statut
const status = await mecef.getStatus();
console.log('Statut:', status);
// 2. Soumettre la facture
const invoiceData = {
  ifu: "9999900000001",
  type: "FV",
  items: [
    {
      name: "Produit A",
      price: 5000,
      quantity: 2,
      taxGroup: "B"
    }
  ],
  client: {
    contact: "45661122",
    ifu: "99999000000002",
    name: "Client XYZ",
    address: "Cotonou"
  },
  operator: {
    name: "Opérateur"
  },
  payment: [
    {
      name: "ESPECES",
      amount: 11800
    }
  ]
};

const invoice = await mecef.submitInvoice(invoiceData);
console.log('Facture soumise:', invoice);

// 3. Confirmer la facture
const confirmation = await mecef.confirmInvoice(invoice.uid);
console.log('Code MECeF/DGI:', confirmation.codeMECeFDGI);
console.log('QR Code:', confirmation.qrCode);

return confirmation;

} catch (error) {
console.error('Erreur:', error.response?.data || error.message);
throw error;
}
}
Ressources supplémentaires
•	Plateforme de test: https://developper.impots.bj/sygmef-emcf/swagger/index.html
•	Site officiel e-MECeF: https://e-mecef.impots.bj
•	Direction Générale des Impôts: https://www.impots.finances.gouv.bj
•	Documentation Swagger: Disponible sur la plateforme de développement[3]
Conclusion
L'API e-MECeF du Bénin offre une solution moderne et efficace pour la génération de factures normalisées sans nécessiter de matériel physique[1][2]. Elle permet aux entreprises disposant de systèmes de facturation existants de se conformer aux exigences fiscales tout en maintenant leur infrastructure logicielle.
L'intégration de cette API nécessite une attention particulière à la sécurité des jetons, à la gestion des erreurs et au respect du flux de travail prescrit. Une fois correctement implémentée, elle offre un processus de facturation fluide et conforme aux normes de la DGI du Bénin[3].
References
[1] Direction Générale des Impôts. (2021). Plaquette e-MECeF. https://www.impots.finances.gouv.bj/wp-content/uploads/2021/02/Plaquette-e_MeCef_Update.pdf
[2] Direction Générale des Impôts. (2020). e-MECeF API v1.0 - Documentation technique. https://fr.scribd.com/document/539757840/e-MECeF-API-v1-0
[3] Direction Générale des Impôts. (2026). Plateforme e-MECeF. https://e-mecef.impots.bj
[4] RFI. (2020, February 16). Le Bénin à l'heure de la machine électronique certifiée de facturation. https://www.rfi.fr/fr/podcasts/20200218-bénin-à-lheure-machine-électronique-certifiée-facturation
[5] CIO Mag. (2021, February 15). Comprendre la réforme des factures normalisées au Bénin. https://cio-mag.com/comprendre-la-reforme-des-factures-normalisees-au-benin/
[6] Cresshounnoukon. (2023). MCF Invoice Reform API - GitHub Repository. https://github.com/cresshounnoukon/mcf-invoice-reform-api
