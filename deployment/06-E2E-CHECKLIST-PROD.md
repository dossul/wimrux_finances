# 06 — Checklist E2E avant mise en production

> **OBLIGATOIRE** avant chaque déploiement en production. Aucune mise en prod sans validation de cette checklist.

---

## 🔐 Prérequis

- [ ] Commit sur `master` poussé
- [ ] Build local `npm run build` → **exit 0**
- [ ] Déploiement Vercel terminé (URL accessible)
- [ ] Identifiants test : `CREDENTIALS_WIMRUX.md`

---

## ✅ 1. Authentification

| # | Test | Procédure | Attendu |
|:--|:--|:--|:--|
| 1.1 | Login admin | admin@wimrux.app + MDP → soumettre | Dashboard chargé |
| 1.2 | Login test1 | test1@wimrux.app + MDP | Dashboard ILTIC |
| 1.3 | Login test2 | test2@wimrux.app + MDP | Dashboard WESTAGO |
| 1.4 | 2FA WhatsApp activé | Connexion avec compte activé | OTP envoyé sur WhatsApp |
| 1.5 | 2FA WhatsApp désactivé | Paramètres → désactiver → reconnecter | Connexion directe sans OTP |
| 1.6 | Déconnexion | Cliquer "Déconnexion" | Redirection login |

---

## ✅ 2. Landing page & Navigation

| # | Test | Procédure | Attendu |
|:--|:--|:--|:--|
| 2.1 | Navbar visible | Page accueil | Menu sur une seule ligne |
| 2.2 | Liens navbar | Fonctionnalités, Avantages, WIMRUX Facturation, Tarifs | Scroll correct |
| 2.3 | Bouton Connexion | Clic → /auth/login | Page login chargée |
| 2.4 | Bouton Démo | Clic → modal vidéo | Modal s'affiche |

---

## ✅ 3. Facturation

| # | Test | Procédure | Attendu |
|:--|:--|:--|:--|
| 3.1 | Liste factures | Naviguer /invoices | Liste chargée sans 404 |
| 3.2 | Créer FV | Nouvelle → type FV → remplir → sauvegarder | Facture créée |
| 3.3 | Valider facture | Clic "Valider" | Statut → `validated` |
| 3.4 | Certifier MCF | Clic "Certifier" | Statut → `certified`, UID généré |
| 3.5 | PDF | Clic "PDF" | Téléchargement OK, QR code présent |
| 3.6 | Numérotation | Créer 2 FV consécutives | Numéros consécutifs (FVI-0001, FVI-0002) |

---

## ✅ 4. Clients

| # | Test | Procédure | Attendu |
|:--|:--|:--|:--|
| 4.1 | Créer PM | Type Personne Morale, IFU renseigné | Créé avec IFU |
| 4.2 | Créer CC | Type Consommateur, sans IFU | Créé |
| 4.3 | Rechercher | Taper un nom dans la recherche | Filtre OK |

---

## ✅ 5. Trésorerie

| # | Test | Procédure | Attendu |
|:--|:--|:--|:--|
| 5.1 | Créer compte | Type bank, solde initial | Compte créé |
| 5.2 | Crédit | Nouveau mouvement crédit | Solde incrémenté |
| 5.3 | Débit | Nouveau mouvement débit | Solde décrémenté |
| 5.4 | Solde cohérent | Vérifier total | Initial + crédits - débits |

---

## ✅ 6. Rapports

| # | Test | Procédure | Attendu |
|:--|:--|:--|:--|
| 6.1 | Synthèse | /reports → période ce mois | KPIs cohérents |
| 6.2 | Répartition taxes | Groupes A, B, C affichés | Montants cohérents |
| 6.3 | Rapport Z | /fiscal-reports → Z | Généré sans erreur |
| 6.4 | Rapport X | /fiscal-reports → X | Compteurs OK |

---

## ✅ 7. Journal d'Audit

| # | Test | Procédure | Attendu |
|:--|:--|:--|:--|
| 7.1 | Entrées visibles | /audit | Liste des actions |
| 7.2 | Badge inaltérable | Chaque entrée | Badge présent |
| 7.3 | Filtrage | Filtre INSERT | Affiche INSERT uniquement |
| 7.4 | Détail | Clic sur une entrée | JSON avant/après visible |

---

## ✅ 8. Paramètres

| # | Test | Procédure | Attendu |
|:--|:--|:--|:--|
| 8.1 | Profil entreprise | /settings → données | Chargées correctement |
| 8.2 | Modifier profil | Changer adresse → sauvegarder | Message positif |
| 8.3 | Toggle 2FA | /settings → Désactiver → Enregistrer | Prochain login sans OTP |

---

## ✅ 9. Edge Functions

| # | Test | Procédure | Attendu |
|:--|:--|:--|:--|
| 9.1 | send-otp-whatsapp | Login avec 2FA activé | Message WhatsApp reçu |
| 9.2 | verify-otp | Saisir code → soumettre | Connexion réussie |

---

## ✅ 10. Base de données & RLS

| # | Test | Procédure | Attendu |
|:--|:--|:--|:--|
| 10.1 | RLS actif | `node migrations/audit_rls.mjs` | **22/22 tables OK** |
| 10.2 | Tables existantes | `npx @insforge/cli db tables` | Aucune table critique manquante |

---

## ✅ 11. Régression (éviter les bugs passés)

| # | Test | Procédure | Attendu |
|:--|:--|:--|:--|
| 11.1 | Pas de `ANON_KEY is not defined` | F12 → Console après login | Aucune ReferenceError |
| 11.2 | Pas de `client.db is undefined` | Déployer edge fn → vérifier | Pas d'erreur 500 |
| 11.3 | Pas de 404 sur `/api/database/records/invoices` | F12 → Network | Aucun 404 sur les API |
| 11.4 | Pas de 401 refresh token | F12 → Network au chargement | Aucun 401 répété |

---

## 🏁 Validation finale

| Critère | Statut |
|:--|:--|
| Build local OK | ⬜ |
| Déploiement Vercel OK | ⬜ |
| Login OK (au moins 1 compte) | ⬜ |
| 2FA WhatsApp OK (ON et OFF) | ⬜ |
| Facture créée + validée + certifiée | ⬜ |
| Client créé | ⬜ |
| Trésorerie OK | ⬜ |
| Rapports OK | ⬜ |
| Audit log OK | ⬜ |
| RLS 22/22 | ⬜ |
| Console navigateur propre (0 erreur critique) | ⬜ |

> **Déploiement en production validé uniquement si TOUTES les cases sont cochées.**

---

## 👤 Validation

| | |
|:---|:---|
| **Validateur** | _______________ |
| **Date** | _______________ |
| **Commit SHA** | _______________ |
| **URL déployée** | _______________ |
| **Signature** | _______________ |
