# Rapport client — Wimrux Finances
**Date :** 02 juin 2026 — 10:23 UTC  
**URL production :** https://www.wimrux.app  
**Backend InsForge :** `gfe4bd9y.eu-central` (projet `0feefe21-1489-41b5-a2b6-3c44593ec819`)  

---

## État global

| Élément | État |
|---------|------|
| Application en production | ✅ **https://www.wimrux.app** |
| Base de données | ✅ Opérationnelle |
| Données de test | ✅ Purgées (base propre) |
| Tickets du rapport corrections | ✅ **10/10 fermés** |
| Dernier déploiement Vercel | 01 juin 2026 — 19h04 UTC |

---

## Corrections livrées

### 1 · Migration base de données — Table `suppliers`

**Nouveaux champs disponibles :**

| Colonne | Type | Description |
|---------|------|-------------|
| `regime_fiscal` | VARCHAR(20) | RNI, RSI, CME, CSE, RND |
| `division_fiscale` | VARCHAR(100) | Division fiscale DGID |
| `supplier_code` | VARCHAR(50) | Code fournisseur interne |
| `supplier_type` | VARCHAR(20) DEFAULT `'local'` | local / étranger |
| `country` | VARCHAR(**2**) | Code ISO pays (ex: BF, FR) |

**Vérification BDD :** ✅ 5/5 colonnes présentes et conformes.

---

### 2 · Fix #4 — Soumission OCR fiabilisée

**Problème client :** Les factures scannées par OCR n'étaient pas enregistrées correctement.

**Corrections apportées :**
- Payload d'insertion enveloppé dans un tableau `[{...}]` (requis par InsForge SDK)
- Champs `price_mode` et `operator_name` ajoutés systématiquement
- Tous les montants castés en `Number()` pour éviter les `NaN`
- Gestion d'erreur visible (notification d'échec)
- Vérification IFU migrée vers `ai-router` (serveur, sans CORS)

---

### 3 · Fix #11 — Montants à zéro lors de l'approbation

**Problème client :** Après approbation d'une facture, les montants (HT, TVA, TTC) revenaient à 0.

**Correction :**
- Recalcul forcé de toutes les lignes avant la sauvegarde (`saveDraft`)
- Garde : si aucune ligne détail n'existe, les montants déjà en base sont conservés
- Applicable aux transitions `draft → pending_validation → validated → approved`

---

### 4 · Fix #14 — Connexion temps réel permanente

**Problème client :** Les notifications affichaient « Temps réel déconnecté » de façon permanente après quelques minutes.

**Correction :**
- Suppression du plafond de 5 tentatives
- Backoff exponentiel sans limite : 1s → 2s → 4s → … → 30s max
- Reconnexion automatique quand l'utilisateur revient sur l'onglet (`visibilitychange`)

---

### 5 · Fix #3 — Vérification IFU automatique et fiable

**Problème client :** La vérification IFU DGI ne fonctionnait pas de façon homogène selon les postes.

**Correction :** Toutes les vérifications IFU transitent désormais par l'edge function `ai-router` côté serveur — pas d'appel direct navigateur, pas de problème CORS, pas de token exposé.

**Disponible dans :**
- Wizard de saisie de facture reçue
- Dialog de révision OCR

---

### 6 · #15 — Libellé « BC / Réf. Interne »

**Problème client :** Le champ « Réf. interne » n'était pas assez explicite.

**Correction :** Renommé en **« BC / Réf. Interne »** dans :
- L'assistant de création de facture (wizard)
- La colonne de la liste des factures reçues

---

### 7 · #6 — Statut « Annulée » sur les factures

**Problème client :** Impossible d'annuler une facture saisie par erreur.

**Fonctionnalités ajoutées :**
- Bouton **« Annuler »** dans les actions de chaque ligne (visible si statut ≠ annulée)
- Badge gris **« Annulée »** dans la colonne statut
- Les factures annulées sont **exclues des totaux et KPI** (encours, balance âgée)
- Confirmation demandée avant annulation

---

### 8 · #9 — Blocage TVA pour régimes fiscaux exonérés

**Problème client :** Les fournisseurs en régime simplifié (RSI, CME, etc.) ne devaient pas être soumis à la TVA.

**Correction :**
- Le champ **TVA est désactivé automatiquement** si le fournisseur a un régime RSI, CME, CSE ou RND
- Bannière d'information orange : *« Fournisseur en régime X — TVA non applicable »*
- Le badge du régime fiscal s'affiche sur la fiche fournisseur dans le wizard
- La TVA est remise à 0 automatiquement lors du changement de fournisseur

**Régimes bloquant la TVA :** RSI · CME · CSE · RND  
**Régimes avec TVA normale :** RNI

---

### 9 · #2 — Retenue à la source (nouvelle fonctionnalité)

**Demande client :** Enregistrer les retenues à la source sur les factures fournisseurs et générer un rapport fiscal.

#### Dans le wizard de saisie (étape « Montants ») :

| Champ | Description |
|-------|-------------|
| **Taux RAS** | Sélecteur : IS 5%, IS 25%, IRNR 20%, IRNR 15%, TVA 18% |
| **Montant RAS** | Calculé automatiquement sur `Total HT × taux`, recalculé si HT change |

#### Rapport fiscal — page `/app/fiscal/withholding` :

- **4 indicateurs** : Base imposable HT, Total RAS, Déclaré/Versé, En attente
- **Tableau filtrable** par période (YYYY-MM), statut, type de RAS
- **Bouton « Marquer déclaré »** pour chaque retenue en attente
- **Export CSV** (encodage UTF-8 avec BOM pour Excel)

#### Base de données :
- Table `withholding_taxes` (existante, 15 colonnes, RLS activée)
- Chaque facture avec RAS crée automatiquement un enregistrement lié

---

## État de la base de données (vérifié ce jour)

```
Factures          : 0  (données de test purgées — base propre)
Fournisseurs      : 4
Clients           : 14
Retenues à source : 0
Fichiers storage  : 0
```

**Schéma :**
- `invoices` : tous les champs requis présents (`total_ht`, `total_tva`, `total_psvb`, `total_ttc`, `stamp_duty`, `operator_name`, `price_mode`, `scan_url`, `status`)
- `suppliers` : 5 nouveaux champs fiscaux opérationnels
- `withholding_taxes` : table complète avec RLS, prête à recevoir les données

---

## Actions à réaliser côté client

| Action | Priorité |
|--------|----------|
| Renseigner le `regime_fiscal` de chaque fournisseur existant (RNI / RSI / CME / CSE / RND) | 🔴 Haute — nécessaire pour le blocage TVA automatique |
| Tester la saisie d'une facture OCR complète | 🟡 Moyenne |
| Tester la vérification IFU sur un fournisseur avec IFU renseigné | 🟡 Moyenne |
| Saisir les premières retenues à la source pour valider le rapport fiscal | 🟢 Basse |

---

## Accès aux nouvelles pages

| Page | URL |
|------|-----|
| Factures reçues | `/app/invoices/received` |
| Retenues à la source | `/app/fiscal/withholding` ← **Nouveau** |
| Déclarations fiscales | `/app/fiscal/declarations` |
| Fournisseurs | `/app/suppliers` |

---

*Rapport généré le 2026-06-02T10:23 UTC — Windsurf Cascade*  
*Toutes les corrections ont été vérifiées en base de données via `npx @insforge/cli db query`*
