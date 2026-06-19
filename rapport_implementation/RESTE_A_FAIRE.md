# 🔲 CE QUI RESTE À FAIRE — WIMRUX FINANCES
> Fichier maître — Source unique de vérité sur le backlog réel
> Mis à jour le 2026-06-11 — Post-migration Appwrite

---

## ÉTAT GLOBAL : 53/53 tâches historiques ✅ + MIG-01 ✅ + PM-01/05/06/07 ✅ — EN PRODUCTION

---

## 🔴 PRIORITÉ 1 — Vérification post-migration

| ID | Tâche | Statut |
|---|---|---|
| PM-01 | **Build de production** `npm run build` sans erreur | ✅ 2026-06-11 |
| PM-02 | **Test de connexion** login/logout avec Appwrite réel | ⏳ Test manuel requis |
| PM-03 | **Test CRUD** factures : créer, modifier, supprimer | ⏳ Test manuel requis |
| PM-04 | **Test storage** upload PDF/image via `appwriteStorage.upload()` | ⏳ Test manuel requis |
| PM-05 | **Supprimer `@insforge/sdk`** de `package.json` + `npm install` | ✅ 2026-06-11 |
| PM-06 | **Scan final insforge** 1 fichier résiduel : `boot/insforge.ts` (non importé, nom legacy) | ✅ 2026-06-11 |
| PM-07 | **Déploiement Vercel** commit f1c8294 → https://www.wimrux.app | ✅ 2026-06-11 |

---

## 🟡 PRIORITÉ 2 — Prochaines fonctionnalités

---

## 📧 T54 — Envoi email transactionnel (SMTP noreply@wimrux.app)

**Priorité : HAUTE**
**Statut : ✅ TERMINÉ (2026-05-26)**

### SMTP configuré
- **Serveur** : `vmi2335626.contaboserver.net`
- **Port** : 465 (SSL)
- **Compte** : `noreply@wimrux.app`
- **Mot de passe** : `TuwCk&mzEoVL_X_n`
- À stocker comme secret InsForge : `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

### Edge Function à créer : `send-email`
- Template HTML professionnel avec logo WIMRUX® Finance (blanc sur fond #0841c8)
- Footer : adresse, liens légaux, © WIMRUX Finance
- Paramètres : `to`, `subject`, `html_body`, `template_name`

### Workflows où l'envoi email est pertinent

| # | Workflow | Déclencheur | Fichier concerné |
|---|---|---|---|
| E01 | **OTP 2FA** | Connexion si pas de téléphone OU en fallback WhatsApp | `ai_router_fn/send-otp-whatsapp.ts` → créer `send-otp-email.ts` |
| E02 | **Mot de passe oublié** | `auth.sendResetPasswordEmail()` — actuellement InsForge par défaut | `auth-store.ts:forgotPassword()` + template custom |
| E03 | **Bienvenue nouvel utilisateur** | Inscription → `RegisterPage.vue` | Créer déclencheur post-signup |
| E04 | **Relance client impayée** | `useReceivables.ts:sendReminder()` — mode démo actuellement | `useReceivables.ts` + nouvelle Edge Function `send-reminder-email` |
| E05 | **Envoi facture au client** | Workflow facture état `sent` | `useInvoiceWorkflow.ts` + `InvoiceEditorPage.vue` |
| E06 | **Confirmation de paiement reçu** | Encaissement enregistré | `useReceivables.ts` |
| E07 | **Alerte budget dépassé** | `BudgetDetailPage.vue` seuil franchi | `useNotifications.ts` channel_email actuellement `false` |
| E08 | **Notification ticket support** | Nouveau message sur ticket | `useSupport.ts:sendMessage()` |
| E09 | **Rapport périodique** | Mensuel/hebdomadaire selon préférence | `useReportExports.ts` |
| E10 | **Alerte échéance emprunt/chèque** | Échéance J-7 | `useChecks.ts`, `LoansPage` |

### Ordre d'implémentation recommandé
1. **Edge Function `send-email`** (moteur commun SMTP nodemailer/Deno)
2. **E02** Mot de passe oublié (template branded)
3. **E03** Bienvenue
4. **E01** OTP fallback email
5. **E04** Relances clients (haute valeur métier)
6. **E05** Envoi facture par email
7. E06→E10 selon priorité

---

*Dernière mise à jour : 2026-05-26 — T54 email transactionnel ajouté.*
