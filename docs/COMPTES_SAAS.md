# WIMRUX FINANCES — Comptes SaaS & Données de test

> **URL de l'application** : `http://localhost:9000`
> **Date de création** : 19 février 2026

---

## 1. Comptes utilisateurs

### WIMRUX FINANCES SaaS (Propriétaire de la plateforme)

| Champ | Valeur |
|-------|--------|
| **Email** | `admin@wimrux.bf` |
| **Mot de passe** | `WimruxAdmin2026!` |
| **Nom complet** | Admin WIMRUX SaaS |
| **Rôle** | `project_admin` |
| **Entreprise** | WIMRUX FINANCES SaaS |
| **IFU** | WIMRUX2026 |
| **RCCM** | WIMRUX-SAAS-001 |

> C'est le **super-administrateur** de la plateforme. Il gère sa propre comptabilité
> (facture ses clients SaaS : ILTIC, WESTAGO, etc.) ET administre la plateforme.

---

### ILTIC (Client SaaS — Société IT)

| Champ | Valeur |
|-------|--------|
| **Email** | `admin@iltic.bf` |
| **Mot de passe** | `IlticAdmin2026!` |
| **Nom complet** | Admin ILTIC |
| **Rôle** | `admin` |
| **Entreprise** | ILTIC |
| **IFU** | 00080170C |
| **RCCM** | 123456789 |

> Comptes alternatifs ILTIC (mots de passe définis lors de l'inscription manuelle) :
> - `dossulrich@gmail.com` (Ulrich DOSS, admin)
> - `ulrich@iltic.com` (Ulrich ILTIC, admin)

---

### WESTAGO SARL (Client SaaS — Commerce / BTP)

| Champ | Valeur |
|-------|--------|
| **Email** | `admin@westago.bf` |
| **Mot de passe** | `WestagoAdmin2026!` |
| **Nom complet** | Admin WESTAGO |
| **Rôle** | `admin` |
| **Entreprise** | WESTAGO SARL |
| **IFU** | 00089946R |
| **RCCM** | BF OUA 2021 M 13807 |

---

## 2. Données par entreprise

### ILTIC — 5 clients, 10 articles

**Clients :**

| Nom | Type | IFU |
|-----|------|-----|
| Mairie de Ouagadougou | PM | 00045230A |
| ONATEL SA | PM | 00012345B |
| Coris Bank International | PM | 00078901C |
| OUEDRAOGO Adama | PP | 00098001D |
| WIMRUX FINANCES SaaS | PM | WIMRUX2026 |

**Articles (Services IT) :**

| Code | Désignation | Prix HT (FCFA) | Type |
|------|------------|-----------------|------|
| DEV-WEB | Développement site web | 500 000 | Service |
| DEV-MOB | Développement application mobile | 750 000 | Service |
| MAINT-AN | Maintenance annuelle serveur | 300 000 | Service |
| HEBERGMT | Hébergement cloud / mois | 25 000 | Service |
| FORM-IT | Formation informatique / jour | 150 000 | Service |
| CONSUL-IT | Consultation IT / heure | 50 000 | Service |
| LIC-SOFT | Licence logiciel (annuelle) | 200 000 | Bien (stock: 50) |
| PC-PORT | Ordinateur portable | 450 000 | Bien (stock: 20) |
| CABLE-RES | Câblage réseau / point | 35 000 | Bien (stock: 500) |
| SEC-AUDIT | Audit sécurité informatique | 1 000 000 | Service |

---

### WESTAGO SARL — 6 clients, 10 articles

**Clients :**

| Nom | Type | IFU |
|-----|------|-----|
| SONABHY | PM | 00034567E |
| Groupe EBOMAF | PM | 00056789F |
| ILTIC | PM | 00080170C |
| KABORE Fatimata | PP | 00087654G |
| Société des Mines de Poura | PM | 00023456H |
| WIMRUX FINANCES SaaS | PM | WIMRUX2026 |

**Articles (Commerce / BTP) :**

| Code | Désignation | Prix HT (FCFA) | Stock |
|------|------------|-----------------|-------|
| CIM-50KG | Ciment CPA 50kg | 5 500 | 2 000 |
| FER-12MM | Fer à béton 12mm (barre 12m) | 6 500 | 1 500 |
| TOLE-BG | Tôle bac galvanisée 0.35mm | 4 500 | 3 000 |
| GRAV-M3 | Gravier concassé / m³ | 12 000 | 500 |
| SABLE-M3 | Sable de rivière / m³ | 8 000 | 800 |
| PEINTURE | Peinture acrylique 20L | 35 000 | 200 |
| TRANSP-T | Transport marchandise / tonne | 15 000 | — |
| CARBU-L | Carburant gasoil / litre | 750 | 10 000 |
| MAIN-OEU | Main d'œuvre journalière | 5 000 | — |
| BRIQUE-PL | Brique pleine 15x20x40 | 350 | 5 000 |

---

### WIMRUX FINANCES SaaS — 5 clients, 10 articles

**Clients :**

| Nom | Type | IFU |
|-----|------|-----|
| ILTIC | PM | 00080170C |
| WESTAGO SARL | PM | 00089946R |
| Pharmacie du Centre | PM | 00041122I |
| Hotel Splendide BF | PM | 00067890J |
| TRAORE Moussa | PP | 00099887K |

**Articles (Abonnements SaaS & Services) :**

| Code | Désignation | Prix HT (FCFA) |
|------|------------|-----------------|
| ABO-BASIC | Abonnement WIMRUX Basic / mois | 25 000 |
| ABO-PRO | Abonnement WIMRUX Pro / mois | 75 000 |
| ABO-ENTER | Abonnement WIMRUX Enterprise / mois | 150 000 |
| SETUP-INIT | Mise en place initiale | 200 000 |
| FORM-USR | Formation utilisateur / jour | 100 000 |
| FORM-ADM | Formation administrateur / jour | 150 000 |
| CONSULT-H | Consulting technique / heure | 50 000 |
| MIGR-DATA | Migration de données | 500 000 |
| CUSTOM-DEV | Développement personnalisé / jour | 250 000 |
| SUPPORT-PR | Support prioritaire / mois | 50 000 |

---

## 3. Architecture multi-tenant

```
WIMRUX FINANCES (Plateforme SaaS)
│
├── WIMRUX FINANCES SaaS ─── admin@wimrux.bf (project_admin)
│   └── Facture ILTIC & WESTAGO pour les abonnements SaaS
│
├── ILTIC ─── admin@iltic.bf (admin)
│   └── Facture Mairie, ONATEL, Coris Bank pour du dev IT
│
└── WESTAGO SARL ─── admin@westago.bf (admin)
    └── Facture SONABHY, EBOMAF, Mines de Poura pour du BTP
```

**Isolation des données** : Chaque entreprise ne voit que ses propres clients,
articles et factures grâce au champ `company_id` présent sur toutes les tables.

**Relations croisées** :
- WIMRUX facture ILTIC et WESTAGO (abonnements SaaS)
- ILTIC facture WIMRUX (développement IT)
- WESTAGO facture ILTIC et WIMRUX (fournitures BTP)

---

## 4. Scénarios de test rapide

### Test 1 : Espace WIMRUX (propriétaire)
1. Se connecter avec `admin@wimrux.bf` / `WimruxAdmin2026!`
2. Aller dans **Clients** → vérifier que seuls les 5 clients WIMRUX apparaissent
3. Créer une facture pour **ILTIC** → article `ABO-PRO` (75 000 FCFA/mois × 12)
4. Certifier la facture → vérifier MCF + PDF

### Test 2 : Espace ILTIC (client SaaS)
1. Se déconnecter, se connecter avec `admin@iltic.bf` / `IlticAdmin2026!`
2. Vérifier que les clients ILTIC apparaissent (pas ceux de WESTAGO)
3. Créer une facture pour **Coris Bank** → article `DEV-WEB` (500 000 FCFA)
4. Vérifier l'isolation : aucune facture WIMRUX visible

### Test 3 : Espace WESTAGO (client SaaS)
1. Se déconnecter, se connecter avec `admin@westago.bf` / `WestagoAdmin2026!`
2. Vérifier les 6 clients WESTAGO + les 10 articles BTP
3. Créer une facture pour **SONABHY** → `CIM-50KG` × 500 + `FER-12MM` × 200
4. Vérifier que le stock diminue après certification

---

## 5. Informations techniques

| Paramètre | Valeur |
|-----------|--------|
| **API InsForge** | `https://gfe4bd9y.eu-central.insforge.app` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiI...J71GoMBi...dPU` |
| **API Key (admin)** | `ik_1358be6dcbccff7c0d6636b011559406` |
| **Edge Function MCF** | `mcf-simulator` |
| **Framework** | Quasar (Vue 3) + TypeScript |
| **Base de données** | PostgreSQL via InsForge |
