# WIMRUX® FINANCES — Spécifications Facturation & Sécurité

> Référentiel technique consolidé — Terminologie DGI Burkina Faso
> Sources : Note n°2025/MEF/SG/DGI/DLC (Spéc. SECeF), Note n°2025-0047/MEF/SG/DGI (Spéc. SFE),
> Arrêté n°2023-00216/MEFP/SG/DGI, Arrêté n°2025-0049/MEF/SG/DGI, Art. 564 CGI
> Dernière mise à jour : 12/02/2026

---

## Table des Matières

1. [Glossaire officiel DGI](#1-glossaire-officiel-dgi)
2. [Cadre légal et réglementaire](#2-cadre-légal-et-réglementaire)
3. [Architecture SECeF / SFE / MCF](#3-architecture-secef--sfe--mcf)
4. [Spécifications du SFE (WIMRUX)](#4-spécifications-du-sfe-wimrux)
5. [Facture Électronique Certifiée — Mentions obligatoires](#5-facture-électronique-certifiée--mentions-obligatoires)
6. [Éléments de sécurité](#6-éléments-de-sécurité)
7. [Types de factures](#7-types-de-factures)
8. [Types de clients](#8-types-de-clients)
9. [Types d'articles](#9-types-darticles)
10. [Groupes de taxation (A–P)](#10-groupes-de-taxation-ap)
11. [PSVB — Prélèvement à la Source sur Vente de Biens](#11-psvb--prélèvement-à-la-source-sur-vente-de-biens)
12. [Règles de calcul fiscal](#12-règles-de-calcul-fiscal)
13. [Rapports statistiques (Z, X, A)](#13-rapports-statistiques-z-x-a)
14. [Protocole de communication SFE ↔ MCF](#14-protocole-de-communication-sfe--mcf)
15. [Exigences de sécurité et chiffrement](#15-exigences-de-sécurité-et-chiffrement)
16. [Mode dégradé (bufferisation)](#16-mode-dégradé-bufferisation)
17. [Inaltérabilité et piste d'audit](#17-inaltérabilité-et-piste-daudit)
18. [Homologation DGI](#18-homologation-dgi)
19. [Correspondance WIMRUX ↔ Spécifications DGI](#19-correspondance-wimrux--spécifications-dgi)

---

## 1. Glossaire Officiel DGI

> Terminologie extraite des notes de service n°2025/MEF/SG/DGI/DLC du 29 décembre 2025.

| Sigle | Désignation complète | Définition |
|-------|---------------------|------------|
| **SECeF** | Système Électronique Certifié de Facturation | Système ou machine utilisé pour produire la Facture Électronique Certifiée (FEC), stocker les données en mémoire interne et les transmettre au serveur de l'Administration (SYGMEF) |
| **FEC** | Facture Électronique Certifiée | Facture produite par le SECeF, portant les éléments de sécurité prouvant son authenticité et son intégrité |
| **SFE** | Système de Facturation d'Entreprise | Logiciel ou solution informatique permettant à une entreprise de gérer tout ou partie de son processus de facturation. WIMRUX® FINANCES est un SFE |
| **MCF** | Module de Contrôle de Facturation | Machine électronique (physique) qui collecte les données de facture, fournit les éléments de sécurité, transmet les données au serveur et fournit les données localement |
| **UF** | Unité de Facturation | Machine autonome intégrant à la fois le SFE et le MCF (SECeF = UF **ou** SFE + MCF) |
| **NIM** | Numéro d'Identification Machine | Numéro de série unique du SECeF, format **MMCCNNNNNN** (10 caractères) |
| **ISF** | Identifiant de Système de Facturation | Identifiant unique attribué par l'Administration à chaque modèle de SFE homologué. ISF = 4 premiers caractères du NIM |
| **IFU** | Identifiant Fiscal Unique | Identifiant unique du contribuable auprès de la DGI |
| **RCCM** | Registre du Commerce et du Crédit Mobilier | Numéro d'immatriculation au registre du commerce |
| **Code SECeF/DGI** | Code unique de la facture | Code de sécurité unique fourni par le MCF pour chaque facture (24 caractères, format XXXX-XXXX-XXXX-XXXX-XXXX-XXXX) |
| **SYGMEF** | Système de Gestion des MEF | Serveur de l'Administration hébergeant le système de gestion des SECeF |
| **PSVB** | Prélèvement à la Source sur Vente de Biens | Taxe prélevée à la source sur les ventes de biens |
| **TVA** | Taxe sur la Valeur Ajoutée | Impôt indirect sur la consommation (taux : 0%, 10%, 18%) |
| **FDOC** | Numéro de transaction | Compteur total des transactions enregistrées dans le MCF |
| **CPIT** | Compteur par type de facture | Compteur incrémenté pour chaque type de facture |
| **ACNT** | Compteur d'activation | Compteur incrémenté à chaque réinitialisation du MCF (valeur initiale = 1) |

### Format du NIM : MMCCNNNNNN

| Position | Signification | Attribution |
|----------|--------------|-------------|
| **MM** (2 car.) | Désignation du fabricant | Attribuée par l'Administration |
| **CC** (2 car.) | Désignation du certificat | Attribuée par l'Administration (chiffres 0-9) |
| **NNNNNN** (6 car.) | Numéro de série unique | Attribué par le fabricant (ordre croissant, chiffres 0-9) |

---

## 2. Cadre Légal et Réglementaire

### 2.1 Base légale

- **Article 564 du Code Général des Impôts** — Obligation de facturation normalisée pour toute personne physique ou morale relevant de la DGE ou des DME qui livre un bien ou fournit un service
- **Arrêté n°2023-00216/MEFP/SG/DGI** — Conditions d'édition, de gestion et éléments de sécurité de la facture normalisée
- **Arrêté n°2025-0049/MEF/SG/DGI** — Conditions et modalités d'émission de la FEC
- **Arrêté n°2025-0047/MEF/SG/DGI** — Spécifications techniques des SFE
- **Note de service du 29/12/2025** — Spécifications techniques des SECeF physiques

### 2.2 Obligations

- Tout SFE doit être **homologué** par le Comité d'homologation avant commercialisation
- L'homologation délivre une **attestation de conformité** et un **ISF**
- La commercialisation est réservée aux **personnes physiques ou morales de droit burkinabè**
- Les SECeF doivent permettre l'émission **automatique et sécurisée** des FEC
- Les SECeF doivent intégrer un **mécanisme inviolable** de contrôle, d'horodatage et de signature électronique
- Les SECeF doivent assurer la **transmission régulière** des données à la plateforme **SYGMEF**

### 2.3 Format de la facture

- Format **A4** (29,7 × 21 cm) ou **A5** (14,85 × 21 cm) au choix du contribuable (Arrêté n°2023-00216, Art. 2)
- Sécurisation par **sticker** spécifique au régime d'imposition (Art. 3) — sera remplacé par les éléments de sécurité électroniques du SECeF
- Régime RNI/ND : sticker 38 mm × 14 mm
- Régime RSI/CME/CSE : sticker 37,5 mm × 13,5 mm

### 2.4 Deadline

> **1er Juillet 2026** — Date limite de mise en conformité SECeF pour toutes les entreprises relevant de la DGE et des DME.

---

## 3. Architecture SECeF / SFE / MCF

```
┌────────────────────────────────────────────────────────────────┐
│                     DEUX MODALITÉS SECeF                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  MODALITÉ 1: SFE + MCF (séparés)                              │
│  ┌──────────────┐    Port A (RS232/USB/LAN)   ┌───────────┐   │
│  │   WIMRUX®    │◄──────────────────────────►│    MCF    │   │
│  │   FINANCES   │   Protocole DGI             │ (machine  │   │
│  │   (SFE)      │                             │ physique) │   │
│  └──────────────┘                             └─────┬─────┘   │
│                                                     │          │
│  MODALITÉ 2: UF (autonome)                     3G/4G/WiFi     │
│  ┌──────────────────────────┐                       │          │
│  │  UF = SFE + MCF intégrés │                       ▼          │
│  │  (machine autonome)       │              ┌──────────────┐   │
│  └──────────────────────────┘              │   SYGMEF     │   │
│                                            │  (Serveur     │   │
│                                            │   DGI/Admin.) │   │
│                                            └──────────────┘   │
└────────────────────────────────────────────────────────────────┘
```

### Rôles respectifs

| Composant | Responsabilité |
|-----------|---------------|
| **SFE** (WIMRUX) | Saisie des données, gestion articles/clients, calcul fiscal, impression factures, envoi des données au MCF, réception des éléments de sécurité, génération du QR Code |
| **MCF** (machine physique) | Traitement cryptographique, génération du Code SECeF/DGI, horodatage certifié, stockage en mémoire interne (min. 8 Go, 10 ans), transmission au SYGMEF |
| **SYGMEF** (serveur DGI) | Réception et archivage des données fiscales, gestion des activations/blocages, audit à distance |

---

## 4. Spécifications du SFE (WIMRUX)

> Extraites de la Note de service n°2025-0047/MEF/SG/DGI — Spécifications SFE v2.0

### 4.1 Exigences fonctionnelles

| Réf. | Exigence | Implémentation WIMRUX |
|------|----------|----------------------|
| 2.4 | Générer la facture en obtenant les éléments de sécurité du MCF | `useFnecApi.confirmInvoice()` → reçoit Code SECeF/DGI, QR Code, compteurs |
| 2.5 | Interdiction d'émettre une facture SANS éléments de sécurité du MCF | Status `certified` requis, `code_secef_dgi` NOT NULL pour impression |
| 2.6 | Interdiction d'enregistrer une facture sans identifier les articles | Validation formulaire : ≥ 1 article requis |
| 2.7 | Support des 6 types de factures (FV, FT, FA, EV, ET, EA) | Type `InvoiceType` dans `src/types/index.ts` |
| 2.11 | Enregistrement des duplicatas | Mention `DUPLICATA` sur la copie, même référence que l'original |
| 2.12 | Génération rapports X, Z et A | Endpoints `/reports/z` et `/reports/x` via `useFnecApi` |
| 2.14 | Type de client obligatoire (CC, PM, PP, PC) | Type `ClientType`, IFU obligatoire pour PM/PC |
| 2.15 | 16 groupes de taxation (A–P) | `useTaxCalculation.ts` — 16 groupes complets |
| 2.16 | 4 groupes PSVB (A, B, C, D) | Calcul PSVB intégré dans `useTaxCalculation` |
| 2.18 | Référence unique, série ininterrompue par année | `reference` format `TYPE-YYYY-NNNNN`, séquence auto |
| 2.19 | Articles : désignation ≥ 64 car., code, type, prix, unité, quantité, groupe | Interface `InvoiceItem` complète |
| 2.21 | Modes de paiement multiples | Type `PaymentType` : ESPECES, CHEQUES, MOBILEMONEY, CARTEBANCAIRE, VIREMENT, CREDIT, AUTRE |
| 2.22 | Montant total facture = somme des paiements | Validation dans le composable `useInvoiceWorkflow` |
| 2.23 | Journal électronique avec Code SECeF/DGI | Table `audit_log` + `invoices.code_secef_dgi` |
| 2.24 | Interdiction facture montant nul ou négatif | Validation côté client + code erreur BF010 côté MCF |
| 2.25 | Interdiction article montant nul ou négatif | Validation côté client + code erreur BF010 |
| 2.27 | ≥ 8 lignes de commentaire sur la facture | Champ `comments JSONB` (étiquette + contenu) |
| 2.28 | Facture d'avoir : nature obligatoire (COR, RAN, RAM, RRR) | Sélection dans le formulaire de facture d'avoir |
| 2.29 | RRR (Rabais, Remise, Ristourne) = FA avec référence « RRR » | Logique dans `useInvoiceWorkflow` |
| 2.30 | QR Code conforme au protocole MCF, scannable | Génération via `useInvoicePdf.ts` |
| 2.32 | Configuration des comptes bancaires | Champ `bank_accounts JSONB` dans `companies` |
| 2.33 | Configuration du régime d'imposition | Champ `tax_regime` dans `companies` |
| 2.34 | Configuration du service des impôts de rattachement | Champ `tax_office` dans `companies` |

### 4.2 Exigences de calcul (Section 6 des spécifications SFE)

| Réf. | Règle | Détail |
|------|-------|--------|
| 6.1 | Prix jusqu'à 2 décimales, quantités jusqu'à 3 décimales | Validation d'input |
| 6.2 | Arrondi à 2 décimales (valeur la plus proche) | `Math.round(v * 100) / 100` |
| 6.3 | Mode prix HT ou TTC | Champ `price_mode` sur chaque facture |
| 6.4 | Mention du mode de prix sur chaque facture | Affiché sur le PDF |
| 6.6 | **Mode TTC** : montant HT = TTC / (1 + taux TVA) | `useTaxCalculation.ts` |
| 6.6 | **Mode HT** : montant TTC = HT × (1 + taux TVA) | `useTaxCalculation.ts` |
| 6.7 | HT + Taxe = TTC strictement (arrondi TVA vers le haut si nécessaire) | Égalité stricte garantie |
| 6.9 | Prix HT = sans taxe spécifique. Si taxe spécifique applicable, base TVA augmentée | Logique dans le composable |
| 6.10 | PSVB calculé sur le montant TTC | Taux par groupe PSVB |

---

## 5. Facture Électronique Certifiée — Mentions Obligatoires

> Section 3 des spécifications SFE + Section 4 du PRD WIMRUX

### 5.1 Bloc Vendeur

| Mention | Source | Champ WIMRUX |
|---------|--------|-------------|
| Nom de l'entreprise | Spéc. SFE 3(a) | `companies.name` |
| IFU de l'entreprise | Spéc. SFE 3(b) | `companies.ifu` |
| Adresse avec réf. cadastrales (SSSS LLL PPPP) | Spéc. SFE 3(c) | `companies.address_cadastral` |
| Contact (téléphone, email) | Spéc. SFE 3(d) | `companies.phone`, `companies.email` |
| Référence(s) de(s) compte(s) bancaire(s) | Spéc. SFE 3(j) | `companies.bank_accounts` |
| Régime d'imposition | Spéc. SFE 3(k) | `companies.tax_regime` |
| Service des impôts de rattachement | Spéc. SFE 3(l) | `companies.tax_office` |

### 5.2 Bloc Client

| Mention | Condition | Champ WIMRUX |
|---------|-----------|-------------|
| Type de client (CC, PM, PP, PC) | Toujours | `invoices.client.type` |
| IFU du client | Obligatoire si PM ou PC (format libre pour exportation) | `clients.ifu` |
| Nom / Raison sociale | Obligatoire si PM, PP, PC | `clients.name` |
| RCCM | Optionnel (PM) | `clients.rccm` |
| Adresse, contact | Si le client le demande | `clients.address`, `clients.phone` |

### 5.3 Bloc Facture

| Mention | Détail |
|---------|--------|
| Numéro de série (série ininterrompue/année) | `invoices.reference` |
| Date et heure d'établissement | `invoices.created_at` |
| Type de facture | FV, FT, FA, EV, ET, EA |
| Mention **DUPLICATA** | Si copie |
| Mention **FACTURE D'AVOIR** + nature (COR/RAN/RAM/RRR) | Si FA ou EA |
| Mention **EXPORTATION** | Si EV, ET, EA |
| Mention **D'ACOMPTE** | Si FT ou ET |
| Nom de l'opérateur | `invoices.operator_name` |
| ISF (identifiant du système de facturation) | ISF du SFE WIMRUX |

### 5.4 Bloc Articles

| Mention | Champ |
|---------|-------|
| Désignation (≥ 64 car.) | `invoice_items.name` |
| Code article | `invoice_items.code` |
| Type d'article (LOCBIE, LOCSER, IMPBIE, IMPSER) | `invoice_items.type` |
| Quantité + unité de mesure | `invoice_items.quantity`, `invoice_items.unit` |
| Prix unitaire (HT ou TTC selon mode) | `invoice_items.price` |
| Groupe de taxation | `invoice_items.tax_group` |
| Montant | `invoice_items.amount_ht` / `amount_ttc` |
| Réduction éventuelle | `invoice_items.discount` |
| Taxe spécifique si applicable | `invoice_items.specific_tax` |

### 5.5 Bloc Fiscal

| Mention | Détail |
|---------|--------|
| Mode de prix (HT ou TTC) | `invoices.price_mode` |
| Montant total HT par groupe de taxation | `invoices.tax_calculation.totalHT` |
| Taux d'imposition appliqués | Selon groupes A–P |
| Montants TVA par groupe | `invoices.tax_calculation.tva` |
| Montants PSVB si applicable | `invoices.tax_calculation.psvb` |
| Taxe spécifique si applicable | Par article |
| Montant total TTC | `invoices.total_ttc` |
| « Montant timbre quittance » + montant si espèces | `invoices.stamp_duty` |
| Montant total en lettres (français) | Généré dans `useInvoicePdf` |
| Modes de paiement + montants | `invoices.payments` |

### 5.6 Bloc Sécurité (éléments fournis par le MCF)

| Mention | Format | Champ WIMRUX |
|---------|--------|-------------|
| **Code SECeF/DGI** | XXXX-XXXX-XXXX-XXXX-XXXX-XXXX (24 car. + tirets) | `invoices.code_secef_dgi` |
| **NIM** | MMCCNNNNNN (10 car.) | `invoices.nim` |
| **ISF** | 4 premiers caractères du NIM | Dérivé du NIM |
| **Compteurs** | CPIT/FDOC TYPE | `invoices.counters` |
| **Date et heure MCF** | Horodatage du MCF (pas du serveur) | `invoices.certification_datetime` |
| **QR Code 2D** | `BF;{fiscalNumber};{codeSECeF_sans_tirets};{IFU};{dateTime_compact}` | `invoices.qr_code` |
| **Mention légale** | « EXIGEZ LA FACTURE ÉLECTRONIQUE CERTIFIÉE » | Texte fixe sur chaque facture |

### 5.7 Bloc Commentaires

| # | Code | Étiquette | Utilisation |
|---|------|-----------|-------------|
| 1 | A | Réf. exo. | Référence du certificat d'exonération |
| 2 | B | Base juridique | Base juridique de l'exonération |
| 3–8 | C–H | Réservé | Usage futur par la DGI |

---

## 6. Éléments de Sécurité

> Spéc. SECeF, section 2.10.3

Les éléments de sécurité sont générés par le **MCF** pour chaque facture certifiée. Ils prouvent l'**authenticité** et l'**intégrité** des données.

### 6.1 Composition

| Élément | Description | Génération |
|---------|-------------|------------|
| **Code SECeF/DGI** | Code unique de la facture | Généré par le MCF via la **clé de code** (PARAM_SKEY) |
| **Identificateur machine** | Format NIM-ACNT | Identifie la machine et son compteur d'activation |
| **Compteurs** | Format CPIT/FDOC ITL | Compteur par type + compteur total + étiquette type |
| **Date et heure MCF** | Horloge temps réel du MCF | Précision ±1 minute/an, synchronisation NTP |
| **QR Code** | Code QR 2D scannable | Format défini par l'Administration |

### 6.2 Format du QR Code

```
BF;{fiscalNumber};{codeSECeF_sans_tirets};{IFU_vendeur};{dateTime_YYYYMMDDHHMMSS}
```

Exemple :
```
BF;FV0000123/2026;BF45A7C389DEF2B14C5E90AB;00089946R;20260208103745
```

### 6.3 Clés cryptographiques (stockées dans le MCF)

| Clé | Usage | Stockage |
|-----|-------|----------|
| **Clé de cryptage** (PARAM_EKEY) | Chiffrement AES-256 CBC des données internes et d'audit | Stockée sans possibilité de lecture externe |
| **Clé de code** (PARAM_SKEY) | Génération du Code SECeF/DGI | Stockée sans possibilité de lecture externe |

> Ces clés sont configurées lors de la **procédure d'activation** et ne peuvent plus être modifiées ensuite.

---

## 7. Types de Factures

| Code | Étiquette | Description | Particularités |
|------|-----------|-------------|----------------|
| **FV** | FACTURE DE VENTE | Facture de vente standard | Type principal |
| **FT** | FACTURE D'ACOMPTE OU D'AVANCE | Acompte avant livraison | Mention « D'ACOMPTE » obligatoire |
| **FA** | FACTURE D'AVOIR | Avoir sur facture de vente | Référence FV obligatoire, nature (COR/RAN/RAM/RRR), montant ≤ FV originale |
| **EV** | FACTURE DE VENTE À L'EXPORTATION | Vente à l'exportation | Mention « EXPORTATION », IFU client format libre |
| **ET** | FACTURE D'ACOMPTE À L'EXPORTATION | Acompte export | Mentions « EXPORTATION » + « D'ACOMPTE » |
| **EA** | FACTURE D'AVOIR À L'EXPORTATION | Avoir sur vente export | Référence EV obligatoire |

### Natures de facture d'avoir

| Code | Type | Description |
|------|------|-------------|
| **COR** | Correction | Correction d'une erreur sur la facture originale |
| **RAN** | Annulation | Annulation de transaction sans paiement/fourniture |
| **RAM** | Avoir suite reprise biens/services | Correction/annulation après paiement/fourniture |
| **RRR** | Remise, Rabais, Ristourne | Réduction commerciale (référence originale = « RRR ») |

---

## 8. Types de Clients

| Code | Type | Mention sur facture | IFU | Nom | Champs obligatoires |
|------|------|-------------------|-----|-----|-------------------|
| **CC** | Client Comptant | [CC] Client comptant | — | — | Mention seulement |
| **PM** | Personne Morale | [PM] Personne morale | **Obligatoire*** | Raison sociale | IFU + Nom |
| **PP** | Personne Physique | [PP] Personne physique | — | **Obligatoire** | Nom |
| **PC** | Pers. Physique Commerçant | [PC] Personne physique commerçant | **Obligatoire*** | Raison sociale | IFU + Nom |

> *Pour les transactions locales, l'IFU doit respecter le format officiel DGI. Pour les exportations, le format est libre.

---

## 9. Types d'Articles

| Code | Type | Mention obligatoire sur facture |
|------|------|-------------------------------|
| **LOCBIE** | Bien (Local) | [LOCBIE] |
| **LOCSER** | Service (Local) | [LOCSER] |
| **IMPBIE** | Bien (Importation) | [IMPBIE] |
| **IMPSER** | Service (Importation) | [IMPSER] |

---

## 10. Groupes de Taxation (A–P)

> 16 groupes définis par la DGI, configurables via les paramètres PARAM_TA à PARAM_TP du MCF.

| Groupe | Étiquette | Description | TVA (%) | PSVB |
|--------|-----------|-------------|---------|------|
| **A** | Exonéré | Biens/services exonérés | 0 | Groupe A (2%) |
| **B** | TVA taxable 1 | Taux normal | 18 | Groupe A (2%) |
| **C** | TVA taxable 2 | Taux réduit | 10 | Groupe A (2%) |
| **D** | Exportation produits taxables | Export | 0 | Groupe D (0%) |
| **E** | Régime dérogatoire | Dérogation sans TVA | 0 | Groupe B (1%) |
| **F** | Régime dérogatoire | Dérogation avec TVA 18% | 18 | Groupe B (1%) |
| **G** | Régime dérogatoire | Dérogation avec TVA 10% | 10 | Groupe B (1%) |
| **H** | Régime synthétique | Contribuables au forfait | 0 | Groupe D (0%) |
| **I** | Consignation d'emballage | Emballages consignés | 0 | Groupe D (0%) |
| **J** | Dépôts, garantie, caution | Opérations de dépôt | 0 | Groupe D (0%) |
| **K** | Débours | Remboursement de frais | 0 | Groupe D (0%) |
| **L** | TDT | Taxe de développement touristique | 10 | Groupe D (0%) |
| **M** | Taxe de séjour hôtelier | Perçue par les communes | 10 | Groupe D (0%) |
| **N** | PBA — Droits fixes | Selon destination et classe | 0 | Groupe D (0%) |
| **O** | Réservé | Usage futur DGI | 0 | Groupe D (0%) |
| **P** | Réservé | Usage futur DGI | 0 | Groupe D (0%) |

---

## 11. PSVB — Prélèvement à la Source sur Vente de Biens

> 4 groupes de PSVB définis dans les spécifications SFE (réf. 2.16).

| N° | Groupe PSVB | Description | Taux |
|----|-------------|-------------|------|
| 1 | **A** | PSVB droit commun | **2%** |
| 2 | **B** | PSVB dérogation | **1%** |
| 3 | **C** | PSVB dérogation | **0,2%** |
| 4 | **D** | PSVB réservé / non applicable | **0%** |

### Calcul

```
PSVB = Montant TTC × Taux PSVB du groupe applicable
```

### Correspondance Groupe de taxation → Groupe PSVB

| Groupes taxation | Groupe PSVB | Taux |
|-----------------|-------------|------|
| A, B, C | A | 2% |
| E, F, G | B | 1% |
| D, H, I, J, K, L, M, N, O, P | D | 0% |

---

## 12. Règles de Calcul Fiscal

### 12.1 Mode TTC (prix incluant TVA)

```
Montant HT = Prix TTC ÷ (1 + Taux TVA)
Montant TVA = Prix TTC − Montant HT
```

### 12.2 Mode HT (prix hors TVA)

```
Montant TVA = Prix HT × Taux TVA
Montant TTC = Prix HT + Montant TVA
```

### 12.3 Taxe spécifique

Si applicable, la **base taxable de la TVA est augmentée** de la taxe spécifique :
```
Base TVA = Montant HT + Taxe spécifique
Montant TVA = Base TVA × Taux TVA
```

### 12.4 Timbre quittance (paiements en espèces uniquement)

| Montant TTC | Timbre |
|-------------|--------|
| < 5 000 FCFA | 0 FCFA |
| 5 000 – 25 000 FCFA | 100 FCFA |
| 25 001 – 50 000 FCFA | 200 FCFA |
| 50 001 – 100 000 FCFA | 500 FCFA |
| > 100 000 FCFA | 1 000 FCFA |

### 12.5 Règle d'arrondi

- Maximum **2 chiffres** après la virgule
- En cas d'arrondi fiscal : **HT + Taxe = TTC** (toujours). Si arrondi nécessaire, la taxe est arrondie vers le haut pour satisfaire cette égalité
- Monnaie d'affichage : **FCFA** (pas de centimes dans l'affichage UI)

---

## 13. Rapports Statistiques (Z, X, A)

### 13.1 Z-Rapport (clôture)

- Résumé de toutes les transactions depuis le dernier Z-Rapport
- **Définitif** — une fois généré, une nouvelle période commence
- Contenu minimal :
  - Nom commercial, IFU, date/heure, ISF
  - Montant total, montant taxable, montant taxe **par type de facture**
  - Montant total, montant taxable, montant taxe **par groupe de taxation et par type**
  - Nombre de factures par type
  - Montants totaux par mode de paiement
  - Réductions commerciales
  - Nombre de ventes incomplètes

### 13.2 X-Rapport (intermédiaire)

- Même structure que le Z-Rapport
- **Non définitif** — consultation en cours de journée
- Deux variantes : X-rapport **quotidien** et X-rapport **périodique** (période définie par l'utilisateur)

### 13.3 A-Rapport (articles)

- Détail complet de chaque article : code, nom, prix unitaire, taux d'impôt, quantité vendue, quantité retournée, quantité en stock
- Depuis le dernier A-rapport

---

## 14. Protocole de Communication SFE ↔ MCF

### 14.1 Port physique (MCF machine)

| Paramètre | Valeur |
|-----------|--------|
| Interface | RS232 et/ou USB (port COM virtuel) |
| Vitesse | 115 200 bits/s |
| Bits de données | 8 |
| Bits d'arrêt | 1 |
| Parité | Aucune |
| Option | Port réseau (LAN, Wi-Fi) |

> Le protocole d'échanges de données est défini par l'Administration.

### 14.2 Flux de certification d'une facture

```
SFE (WIMRUX)                          MCF                           SYGMEF
     │                                 │                               │
     │ 1. Envoi données facture ──────►│                               │
     │    (articles, client, paiement) │                               │
     │                                 │ 2. Validation données         │
     │                                 │    Calcul fiscal              │
     │                                 │    Génération éléments        │
     │                                 │    de sécurité                │
     │◄── 3. Réponse + éléments ──────│                               │
     │    (Code SECeF/DGI, QR Code,    │                               │
     │     compteurs, horodatage)       │                               │
     │                                 │                               │
     │ 4. Impression facture avec      │ 5. Audit à distance ────────►│
     │    éléments de sécurité          │    (données chiffrées AES-256)│
     │                                 │                               │
```

### 14.3 Exigences de performance

| Critère | Valeur |
|---------|--------|
| Temps de traitement max (100 articles) | **3 secondes** |
| Traitement concurrent facture + audit | **Obligatoire** (le MCF ne doit pas bloquer) |

---

## 15. Exigences de Sécurité et Chiffrement

### 15.1 Chiffrement des données

| Donnée | Algorithme | Clé |
|--------|-----------|-----|
| Mémoire interne MCF | **AES-256 CBC** | Clé de cryptage (PARAM_EKEY) |
| Données d'audit local | **AES-256 CBC** | Clé de cryptage (PARAM_EKEY) |
| Données d'audit à distance | **AES-256 CBC** + compression | Clé de cryptage (PARAM_EKEY) |
| Communication SFE → SYGMEF | TLS (HTTPS) | Certificat serveur |

### 15.2 Stockage sécurisé (MCF)

- Clé de cryptage, clé de code, IFU : stockés **sans possibilité de modification** après activation
- Clés **non lisibles de l'extérieur**
- Toute modification des données internes doit être **détectée**
- Toute tentative d'ouverture physique du boîtier MCF doit laisser des **traces visibles**

### 15.3 Chiffrement côté SFE (WIMRUX)

| Donnée sensible | Chiffrement | Lieu |
|-----------------|-------------|------|
| IFU entreprise (stocké) | AES-256 CBC | Edge Function `useCrypto` |
| Clés API (OpenRouter, etc.) | AES-256 CBC | Edge Function `useCrypto` |
| JWT secrets des devices | AES-256 CBC | Edge Function `useCrypto` |
| Données MCF en transit | TLS (HTTPS) | Transport |

### 15.4 Conservation des données

- Mémoire interne MCF : **minimum 8 Go**, conservation **10 ans**
- Mémoire non volatile (pas besoin d'énergie pour conserver les données)
- Possibilité d'effacer les données de plus de 10 ans

---

## 16. Mode Dégradé (Bufferisation)

> Si le MCF est inaccessible (panne, réseau, blocage), le SFE doit pouvoir continuer à fonctionner.

### 16.1 Conditions de blocage du MCF

Le MCF passe en état **Bloqué** si :
- La différence entre l'heure actuelle et le dernier audit à distance réussi > **PARAM_BLOCK** jours
- **OU** le nombre de transactions non-envoyées > **PARAM_BLOCK2**

### 16.2 Implémentation WIMRUX

| Composant | Détail |
|-----------|--------|
| Table | `pending_certification_queue` (invoice_id, attempts, last_attempt_at, error_message) |
| Détection | Timeout 3 secondes sur l'appel MCF → bascule mode dégradé |
| File d'attente | Factures validées mises en queue PostgreSQL |
| Retry | Processus automatique périodique |
| Notification | InsForge Realtime (WebSocket) quand certification réussie |
| UI | Badge « En attente de certification » sur la facture |

### 16.3 Règles

- Une facture en mode dégradé est **validée** mais **pas encore certifiée**
- Elle ne porte PAS encore les éléments de sécurité
- Elle ne peut PAS être imprimée comme FEC tant que le MCF n'a pas répondu
- Le SFE doit informer l'utilisateur quotidiennement si le MCF n'est pas connecté depuis plus de 7 jours (Spéc. SFE 2.31)

---

## 17. Inaltérabilité et Piste d'Audit

### 17.1 Règle d'or (NON-NÉGOCIABLE)

> **INTERDICTION ABSOLUE** de modifier ou supprimer :
> - Une facture dont le statut est `validated` ou `certified`
> - Un enregistrement du journal d'audit (`audit_log`)

### 17.2 Mécanismes d'inaltérabilité

| Mécanisme | Table | Implémentation |
|-----------|-------|---------------|
| Trigger BEFORE UPDATE/DELETE | `invoices` | REJETER si `status IN ('validated', 'certified')` |
| Trigger BEFORE UPDATE/DELETE | `audit_log` | REJETER **TOUJOURS** |
| RLS | `audit_log` | INSERT par système uniquement, SELECT par admin/auditeur, AUCUN UPDATE/DELETE |
| Compteurs MCF | `invoices.counters` | Séquence monotone croissante, non réductible |
| Numérotation factures | `invoices.reference` | Série ininterrompue par année — aucun trou autorisé |

### 17.3 Journal d'audit

| Champ | Description |
|-------|-------------|
| `user_id` | Utilisateur ayant effectué l'action |
| `timestamp` | Horodatage de l'action |
| `action_type` | INSERT, UPDATE, DELETE |
| `table_name` | Table concernée |
| `record_id` | ID de l'enregistrement |
| `data_before` | État AVANT modification (JSONB) |
| `data_after` | État APRÈS modification (JSONB) |
| `company_id` | Isolation multi-tenant |

---

## 18. Homologation DGI

### 18.1 Procédure

1. **Dépôt de dossier** auprès du Comité d'homologation
2. **Tests de conformité** selon les spécifications techniques (ce document)
3. **Délivrance** de l'attestation de conformité et de l'**ISF**
4. **Inscription** au registre des SECeF/SFE homologués

### 18.2 Exigences documentaires

- Guide d'installation
- Manuel de l'utilisateur
- Manuel de l'agent des impôts
- Environnement d'exploitation
- Documentation de performance
- **Toute la documentation en langue française**

### 18.3 Deadline

> **1er Juillet 2026** — Mise en conformité obligatoire

---

## 19. Correspondance WIMRUX ↔ Spécifications DGI

| Spécification DGI | Fichier WIMRUX | Statut |
|-------------------|----------------|--------|
| Communication SFE ↔ MCF | `src/composables/useFnecApi.ts` | Simulateur (Edge Function), migration API DGI prévue |
| Calcul fiscal 16 groupes | `src/composables/useTaxCalculation.ts` | Implémenté (A–P, TVA, PSVB, timbre) |
| Génération PDF FEC | `src/composables/useInvoicePdf.ts` | Implémenté (jsPDF + autoTable, QR Code, bloc sécurité) |
| Éléments de sécurité | `invoices` table (code_secef_dgi, qr_code, nim, counters, signature) | Stockés après certification |
| Inaltérabilité | Triggers PostgreSQL + RLS | Implémenté |
| Piste d'audit | `audit_log` table + triggers | Implémenté (JSONB, inaltérable) |
| Mode dégradé | `pending_certification_queue` + Realtime | Implémenté |
| Z/X-Rapports | `useFnecApi.getZReport()`, `getXReport()` + `fiscal_reports` table | Implémenté |
| Types factures (6) | `InvoiceType` dans `src/types/index.ts` | FV, FT, FA, EV, ET, EA |
| Types clients (4) | `ClientType` dans `src/types/index.ts` | CC, PM, PP, PC |
| Types articles (4) | `ArticleType` dans `src/types/index.ts` | LOCBIE, LOCSER, IMPBIE, IMPSER |
| RBAC + séparation des pouvoirs | `usePermissions.ts`, `auth-store.ts` | 10 rôles, 20 permissions, multi-rôle |
| Chiffrement AES-256 | `src/composables/useCrypto.ts` | IFU, clés API, secrets |
| Multi-entreprise + isolation | RLS `get_user_company_id()` sur toutes les tables | Implémenté |
| ISF sur facture | Dérivé des 4 premiers caractères du NIM | À configurer après homologation |
| Mention légale FEC | « EXIGEZ LA FACTURE ÉLECTRONIQUE CERTIFIÉE » | Imprimé sur chaque PDF |

---

*Document technique — WIMRUX® FINANCES SaaS — Février 2026*
*Sources : DGI Burkina Faso, Notes de service 2025, Art. 564 CGI, PRD WIMRUX v3.0*
