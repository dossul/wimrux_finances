# WIMRUX® FINANCES — Credentials de Test

> **Document interne** — Ne pas partager en production

---

## 1. InsForge Backend (BaaS)

| Clé | Valeur |
|-----|--------|
| **URL API** | `https://gfe4bd9y.eu-central.insforge.app` |
| **Anon Key** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1NTAwNjN9.J71GoMBih3RietpuMmXLeLEU3664bu1jzI3KFZg3dPU` |
| **MCF Simulator** | `https://gfe4bd9y.eu-central.insforge.app/functions/v1/mcf-simulator` |

---

## 2. Entreprise WESTAGO SARL (1ère entreprise du SaaS)

| Champ | Valeur |
|-------|--------|
| **ID** | `445329bd-a896-477a-9c32-836d1d17f5de` |
| **Nom** | WESTAGO SARL |
| **IFU** | `00089946R` |
| **RCCM** | BF OUA 2021 M 13807 |
| **Adresse** | Parcelle 15, Lot 09, Section 662, Secteur 39, Ouagadougou |
| **Téléphone** | (+226) 25.65.01.51 |
| **Régime fiscal** | RNI |
| **Centre des impôts** | DME OUAGA V |

---

## 3. Appareil SFE (Certification MCF)

| Champ | Valeur |
|-------|--------|
| **NIM** | `BF01000001` |
| **IFU appareil** | `00089946R` |
| **JWT Secret** | `wimrux_test_secret_key_2026_bf` |
| **Statut** | ACTIF |
| **Nom** | Caisse Principale |
| **Company ID** | `445329bd-a896-477a-9c32-836d1d17f5de` |

---

## 4. Comment tester (première connexion)

### Étape 1 : Lancer le serveur de dev

```bash
cd wimrux_app
npx quasar dev
```

L'app sera disponible sur `http://localhost:9000`

### Étape 2 : Créer le compte administrateur

1. Aller sur la page **Inscription** (`/auth/register`)
2. Saisir l'IFU de l'entreprise : **`00089946R`**
3. Cliquer sur l'icône 🔍 pour vérifier — le bandeau vert "WESTAGO SARL" doit apparaître
4. Remplir les champs :
   - **Nom complet** : (votre nom)
   - **Email** : (votre email réel — la vérification email est activée)
   - **Mot de passe** : minimum 6 caractères
   - **Rôle** : `Administrateur`
5. Cliquer "S'inscrire"
6. **Vérifier votre email** (un code de vérification sera envoyé)
7. Se connecter avec l'email et le mot de passe

### Étape 3 : Vérifier l'accès

Une fois connecté en tant qu'Admin, vous aurez accès à :

- Tableau de bord (Dashboard)
- Factures (création, validation, certification MCF)
- Clients
- Trésorerie
- Rapports (Synthèse, Compte de résultat, Balance âgée)
- Rapports fiscaux (Z/X)
- Journal d'audit
- Assistant IA
- Paramètres (entreprise, appareils SFE, utilisateurs)

---

## 5. Edge Functions déployées

| Fonction | Slug | Description |
|----------|------|-------------|
| **MCF Simulator** | `mcf-simulator` | API MCF simulée (auth, submit, confirm, Z/X reports) |
| **Crypto AES-256** | `crypto-aes256` | Chiffrement/déchiffrement AES-256-CBC |

---

## 6. Auth — Providers OAuth configurés

- Google
- GitHub

> L'inscription par email nécessite une **vérification par code** envoyé à l'adresse email.

---

## 7. Modèles IA disponibles

| Modèle | Usage |
|--------|-------|
| `anthropic/claude-sonnet-4.5` | Assistant fiscal (défaut) |
| `openai/gpt-4o-mini` | Alternative légère |
| `deepseek/deepseek-v3.2` | Alternative |
| `google/gemini-3-pro-image-preview` | Vision + image |

---

*Dernière mise à jour : 2026-02-08*
