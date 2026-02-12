# WIMRUX® FINANCES — Master Spec v2.0

**Version :** 2.0 (Conformité SFE/SECeF)
**Date :** 08 Février 2026
**Statut :** PRODUCTION CRITIQUE — HOMOLOGATION DGI OBLIGATOIRE
**Deadline Absolue :** 1er Juillet 2026 (Mise en production homologuée)

---

## 1. VISION ET OBJECTIF SUPRÊME

Ce document est la source unique de vérité. Il fusionne les exigences commerciales de WESTAGO SARL et les contraintes légales impératives de la Direction Générale des Impôts (DGI) du Burkina Faso.

**L'objectif n'est pas seulement de créer un SaaS de facturation, mais de livrer un Système de Facturation d'Entreprise (SFE) homologué.**

### La Règle d'Or (Non-Négociable)
Le logiciel doit garantir l'**inaltérabilité**, la **sécurisation**, la **conservation** et l'**archivage** des données de facturation.
**Toute fonctionnalité permettant la suppression d'une facture validée ou la modification d'un log fiscal est STRICTEMENT INTERDITE.**

---

## 2. STACK TECHNIQUE

### 2.1 Architecture : Frontend + BaaS (Backend-as-a-Service)

```
┌─────────────────────────────────────────────────────────┐
│                    UTILISATEUR                           │
│              (Navigateur / PWA / Mobile)                 │
└─────────────────┬───────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────┐
│              QUASAR FRAMEWORK (Frontend)                 │
│  Vue 3 Composition API · TypeScript · Quasar Components  │
│  PWA · SSR · Material Design · Responsive Mobile-First   │
└─────────────────┬───────────────────────────────────────┘
                  │ SDK @insforge/sdk
┌─────────────────▼───────────────────────────────────────┐
│                  INSFORGE (BaaS)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │PostgreSQL│ │   Auth   │ │ Storage  │ │   AI     │   │
│  │PostgREST │ │OAuth/RBAC│ │ Fichiers │ │GPT/Claude│   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│  ┌──────────┐ ┌──────────┐                               │
│  │Edge Func │ │ Realtime │                               │
│  │MCF Bridge│ │WebSocket │                               │
│  └──────────┘ └──────────┘                               │
└─────────────────┬───────────────────────────────────────┘
                  │ Edge Function (API REST)
┌─────────────────▼───────────────────────────────────────┐
│           DRIVER SFE-MCF (Agent Local)                   │
│      Communication RS232 / API avec boîtier MCF          │
│      Signature, Code SECeF, NIM, QR Code                 │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Technologies

| Composant | Technologie |
| :--- | :--- |
| **Frontend** | Quasar Framework 2.x — Vue 3 Composition API, TypeScript |
| **BaaS** | InsForge — PostgreSQL, Auth, Storage, Functions, AI, Realtime |
| **Base de données** | PostgreSQL via InsForge (PostgREST API, conformité ACID) |
| **Auth** | InsForge Auth — Email/Password + OAuth (Google, GitHub) |
| **Storage** | InsForge Storage — Fichiers (logos, justificatifs, PDFs) |
| **Edge Functions** | InsForge Functions — Calculs fiscaux, MCF bridge, Z-Reports |
| **IA** | InsForge AI — DeepSeek, GPT-4o-mini, Claude, Gemini |
| **Realtime** | InsForge Realtime — WebSocket pub/sub |
| **Chiffrement** | AES-256 CBC (IFU, clés API, données MCF) |
| **PDF** | Génération côté client/Edge Function avec QR Code |
| **MCF** | Edge Function ↔ Agent local RS232/API |

### 2.3 InsForge — Services Disponibles

- **Auth** : OAuth (Google, GitHub), Email/Password, vérification email par code
- **Database** : PostgreSQL avec PostgREST API, RLS (Row Level Security)
- **Storage** : Buckets de fichiers
- **Edge Functions** : Fonctions serverless (Deno runtime)
- **AI** : DeepSeek v3.2, GPT-4o-mini, Claude Sonnet 4.5, Gemini 3 Pro, Grok 4.1, MiniMax M2.1
- **Realtime** : WebSocket pub/sub (événements DB + client)

---

## 3. MODÈLE DE DONNÉES ET RÈGLES MÉTIER

### 3.1 Typologie des Documents (Codage en dur)

| Code | Type de Document | Description | Règle de Gestion |
| :--- | :--- | :--- | :--- |
| **FV** | Facture de Vente | Vente standard de biens/services | Génère du CA et de la TVA |
| **FA** | Facture d'Avoir | Annulation ou correction | Référence obligatoire à la FV d'origine |
| **FT** | Facture d'Acompte | Paiement partiel avant livraison | TVA exigible |
| **EV** | Facture Export | Vente hors territoire | TVA 0% |
| **ET** | Facture d'Acompte Export | Acompte hors territoire | TVA 0% |
| **EA** | Facture d'Avoir Export | Avoir hors territoire | TVA 0% |

### 3.2 Groupes de Taxation (A-P)

| Groupe | Description | Taux TVA |
| :--- | :--- | :--- |
| **A** | Exonéré | 0% |
| **B** | Taxable (Taux Normal) | 18% |
| **C** | Taxable (Taux Réduit) | 10% |
| **D** | Exportation | 0% |
| **E-P** | Réservés / Régimes dérogatoires | Variable |

### 3.3 Clients et IFU
- **IFU** obligatoire pour B2B. Format validé par Regex.
- Prévoir hook API DGI pour vérification en temps réel.

---

## 4. PROCESSUS DE FACTURATION SÉCURISÉ

1. **Saisie (Brouillon)** — L'utilisateur crée sa facture
2. **Validation (Point de non-retour)** — Document figé, aucune modification possible
3. **Appel MCF** — Edge Function envoie les données au Driver SFE-MCF
4. **Réception Signature** — MCF renvoie : Signature, Code SECeF, NIM, Compteurs
5. **Finalisation** — Métadonnées enregistrées, facture passe en "Certifiée"

**Mode Dégradé :** File d'attente sécurisée si MCF inaccessible. Latence max : 3 secondes.

---

## 5. FORMAT PDF — BLOC DE SÉCURITÉ

Le PDF doit contenir :
1. **Code SECeF** — Chaîne alphanumérique du MCF
2. **Signature Électronique** — Hash cryptographique
3. **NIM** — Numéro Identifiant Machine
4. **Date/Heure MCF** — Celle du MCF, pas du serveur
5. **Compteurs** — N° de signature séquentiel
6. **QR Code 2D** — Données sécurisées lisibles par scanners DGI
7. **Mention** — "EXIGEZ LA FACTURE ÉLECTRONIQUE CERTIFIÉE"

---

## 6. API FNEC SIMULÉE (Module Fondateur)

L'API officielle de la DGI Burkina Faso n'est pas encore publiée. Pour permettre le développement et les tests du SFE, une **API FNEC (Facture Normalisée Électronique Certifiée) simulée** sera implémentée en s'inspirant du modèle e-MECeF du Bénin, mais en respectant strictement la terminologie et les spécifications du Burkina Faso.

### 6.1 Architecture de l'API Simulée

```
┌──────────────────────────────────────────────────────────────┐
│                    SFE (WIMRUX FINANCES)                      │
│               Quasar Frontend + InsForge SDK                  │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTP REST (JSON)
┌──────────────────────▼───────────────────────────────────────┐
│              API FNEC SIMULÉE (Edge Function InsForge)        │
│                                                               │
│  POST /bf/fnec/auth/token          → Authentication JWT       │
│  GET  /bf/fnec/status              → Statut système           │
│  POST /bf/fnec/invoices            → Soumission facture       │
│  PUT  /bf/fnec/invoices/{UID}/confirm → Certification         │
│  PUT  /bf/fnec/invoices/{UID}/cancel  → Annulation            │
│  GET  /bf/fnec/invoices/{UID}      → Détails facture          │
│  GET  /bf/fnec/info/taxGroups      → Groupes taxation A-P     │
│  GET  /bf/fnec/info/invoiceTypes   → Types factures           │
│  GET  /bf/fnec/info/paymentTypes   → Modes paiement           │
│  GET  /bf/fnec/reports/z           → Z-Rapport journalier     │
│  GET  /bf/fnec/reports/x           → X-Rapport intermédiaire  │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Différences Bénin vs Burkina Faso

| Aspect | Bénin (e-MECeF) | Burkina Faso (FNEC) |
| :--- | :--- | :--- |
| Identifiant fiscal | IFU (13 chiffres) | IFU (format BF officiel) |
| Code certification | Code MECeF/DGI | **Code SECeF/DGI** |
| Identifiant machine | NIM | **NIM (MMCCNNNNNN, 10 car.)** |
| Types factures | FV, FA, EV, EA | **FV, FT, FA, EV, ET, EA** |
| Groupes taxation | 6 groupes (A-F) | **16 groupes (A-P)** |
| TVA taux | 18% unique | **18% (B,F), 10% (C,G,L,M)** |
| Taxe additionnelle | AIB (1%, 5%) | **PSVB (0%, 0.2%, 1%, 2%)** |
| Plateforme serveur | e-MECeF / SYGMEF | **SYGMEF** |
| Types articles | — | **LOCBIE, LOCSER, IMPBIE, IMPSER** |
| Types clients | — | **CC, PM, PP, PC** |
| Mode prix | — | **HT ou TTC** |
| Timbre quittance | — | **Barème progressif (espèces)** |
| Adresse cadastrale | — | **SSSS LLL PPPP (11 chiffres)** |

### 6.3 Groupes de Taxation (16 groupes A-P)

| Groupe | Description | TVA (%) | PSVB (%) |
| :--- | :--- | :--- | :--- |
| **A** | Exonéré | 0 | 2 |
| **B** | TVA taxable 1 | 18 | 2 |
| **C** | TVA taxable 2 | 10 | 2 |
| **D** | Exportation produits taxables | 0 | 0 |
| **E** | Régime dérogatoire | 0 | 1 |
| **F** | Régime dérogatoire | 18 | 1 |
| **G** | Régime dérogatoire | 10 | 1 |
| **H** | Régime synthétique | 0 | 0 |
| **I** | Consignation emballage | 0 | 0 |
| **J** | Dépôts, garantie, caution | 0 | 0 |
| **K** | Débours | 0 | 0 |
| **L** | Taxe développement touristique | 10 | 0 |
| **M** | Taxe séjour hôtelier | 10 | 0 |
| **N** | PBA (Droits fixes) | 0 | 0 |
| **O** | Réservé | 0 | 0 |
| **P** | Réservé | 0 | 0 |

### 6.4 Flux de Certification

1. `POST /auth/token` → JWT (IFU + NIM + secret)
2. `GET /status` → Vérifier état système + factures en attente
3. `POST /invoices` → Soumettre facture → reçoit UID + calculs fiscaux (totalHT par groupe, TVA, PSVB, TTC, timbre)
4. `PUT /invoices/{UID}/confirm` → Certifier → reçoit **Code SECeF/DGI, QR Code, Signature, NIM, Compteurs, N° fiscal**
5. Le SFE imprime la facture avec les éléments de sécurité

### 6.5 Codes d'Erreur FNEC

| Code | Description |
| :--- | :--- |
| BF001 | IFU vendeur absent ou invalide |
| BF002 | Type de facture non valide |
| BF003 | Référence facture manquante |
| BF004 | Articles manquants (min 1) |
| BF005 | Groupe de taxation invalide |
| BF006 | Type de client invalide |
| BF007 | IFU client obligatoire (PM/PC) |
| BF008 | Mode de paiement invalide |
| BF009 | Montant paiement ≠ TTC |
| BF010-BF020 | Validations diverses |
| BF099 | Erreur interne |

### 6.6 Timbre Quittance (paiements espèces)

| Montant TTC | Timbre |
| :--- | :--- |
| < 5 000 FCFA | 0 FCFA |
| 5 000 – 25 000 | 100 FCFA |
| 25 001 – 50 000 | 200 FCFA |
| 50 001 – 100 000 | 500 FCFA |
| > 100 000 | 1 000 FCFA |

### 6.7 Stratégie de Migration

L'API simulée est conçue pour être **remplacée à chaud** par l'API officielle DGI :
- URLs configurées via variables d'environnement
- Logique d'appel API isolée dans un module dédié (`composables/useFnecApi.ts`)
- Interfaces TypeScript communes (pas de couplage fort)
- Couche de mapping pour adapter les différences

---

## 7. MODULES À DÉVELOPPER

| # | Module | Description | Priorité |
| :--- | :--- | :--- | :--- |
| 0 | **API FNEC Simulée** | Simulateur API FNEC Burkina (Edge Function InsForge) | **Fondateur** |
| 1 | **Auth & RBAC** | Auth InsForge, rôles Admin/Caissier/Auditeur | Critique |
| 2 | **Multi-Entreprise** | Isolation données, sélecteur entreprise | Critique |
| 3 | **Facturation** | CRUD factures, validation, types FV/FA/FT/EV/ET/EA | Critique |
| 4 | **Driver SFE-FNEC** | Composable Vue ↔ API FNEC, signature, certification | Critique |
| 5 | **PDF Generator** | PDF fiscal avec QR Code, bloc sécurité, NIM | Critique |
| 6 | **Taxes** | Groupes A-P, calcul TVA/PSVB, timbre quittance | Critique |
| 7 | **Audit Log** | Piste d'audit inaltérable (RLS + triggers) | Critique |
| 8 | **Z-Report / X-Report** | Clôture journalière, rapports intermédiaires, archivage | Haute |
| 9 | **Trésorerie** | Multi-comptes (Banque, Caisse, Mobile Money) | Haute |
| 10 | **Gestion Clients** | IFU, RCCM, types CC/PM/PP/PC, validation | Haute |
| 11 | **Mode Dégradé** | File d'attente sécurisée si API FNEC inaccessible | Haute |
| 12 | **Rapports** | Bilan, compte de résultat, balance âgée, dashboards | Moyenne |
| 13 | **Chiffrement** | AES-256 CBC pour données sensibles | Haute |
| 14 | **IA / Assistant** | Assistant fiscal NLP via InsForge AI | Moyenne |

---

## 8. SÉCURITÉ ET PISTE D'AUDIT

- **Audit Log** — Chaque action loggée : `User ID`, `Timestamp`, `Action`, `Data Before`, `Data After`, `IP`
- **Inaltérabilité** — RLS PostgreSQL + triggers pour bloquer UPDATE/DELETE sur factures validées
- **Sauvegardes** — Quotidiennes via InsForge

---

## 9. ROADMAP (MODE COMMANDO)

| Phase | Période | Livrables |
| :--- | :--- | :--- |
| **0. API FNEC Simulée** | Février 2026 | Edge Function simulateur FNEC, endpoints, calculs fiscaux |
| **1. Socle & BDD** | Février 2026 | Schema PostgreSQL InsForge, Auth, Rôles, Quasar scaffold |
| **2. Driver SFE-FNEC** | Mars 2026 | Composable useFnecApi, intégration API simulée, chiffrement |
| **3. Facturation** | Avril 2026 | UI Quasar facturation, PDF QR Code, Avoirs |
| **4. Tests & Audit** | Mai 2026 | Tests charge, Z-Reports, dossier technique DGI |
| **5. Homologation** | Juin 2026 | Dépôt DGI, démo comité, déploiement pilote |
| **DEADLINE** | **1er Juillet 2026** | **Production homologuée** |

---

## 10. CHECKLIST DÉVELOPPEUR

1. [ ] Est-ce que je permets de supprimer une facture ? → **NON**
2. [ ] Est-ce que je calcule la TVA moi-même ? → **TAUX FIXES** (Groupes A-P)
3. [ ] Est-ce que le PDF contient le QR Code et le NIM ? → **OUI**
4. [ ] Est-ce que l'action est loggée dans l'audit ? → **OUI**
5. [ ] Est-ce que l'IFU du client est stocké ? → **OUI**
6. [ ] Est-ce que j'utilise le SDK InsForge (pas d'appels directs) ? → **OUI**

---

## 11. GLOSSAIRE

- **SFE** — Système de Facturation d'Entreprise (ce logiciel)
- **MCF** — Module de Contrôle de Facturation (boîtier DGI)
- **SECeF** — Système de Facture Électronique Certifiée
- **NIM** — Numéro d'Identification de la Machine
- **ISF** — Identifiant de SFE (attribué par la DGI)
- **Z-Report** — Rapport de clôture journalière
- **IFU** — Identifiant Financier Unique
- **FEC** — Facture Électronique Certifiée
- **FNEC** — Facture Normalisée Électronique Certifiée (API simulée)
- **PSVB** — Prélèvement à la Source sur Vente de Biens
- **SYGMEF** — Plateforme serveur DGI pour la facturation
- **InsForge** — Backend-as-a-Service utilisé pour ce projet
- **Quasar** — Framework Vue 3 pour le frontend
- **LOCBIE/LOCSER** — Bien local / Service local (types d'articles)
- **IMPBIE/IMPSER** — Bien importé / Service importé (types d'articles)
- **CC/PM/PP/PC** — Client comptant / Personne morale / Personne physique / Personne physique commerçant

---

## 12. STRUCTURE PROJET

```
wimrux_finances/
├── docs/                     # PDFs réglementaires DGI + cahiers des charges
├── knowledge_base/           # Base de connaissances extraite (Markdown + JSON)
│   ├── INDEX.md
│   ├── SYNTHESE_DEVELOPPEMENT.md
│   ├── 01_reglementation_dgi/
│   ├── 02_specifications_techniques/
│   └── 03_cahier_des_charges/
├── script/                   # Scripts utilitaires Python
│   └── extract_knowledge_base.py
├── src/                      # Code source Quasar (à créer)
├── readme.md                 # Ce fichier
└── AGENTS.md                 # Instructions IA/MCP
```
