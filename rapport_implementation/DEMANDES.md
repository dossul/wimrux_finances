# 📋 DEMANDES & DÉCISIONS — WIMRUX FINANCES
> Fichier maître — Historique des demandes utilisateur, décisions d'architecture, clarifications
> Chaque agent codeur DOIT consulter ce fichier avant d'implémenter quoi que ce soit

---

## RÈGLES DE MISE À JOUR

- Chaque nouvelle demande utilisateur est ajoutée en haut avec horodatage
- Les décisions d'architecture sont documentées avec justification
- Les clarifications obtenues (ex : API DGI, format DGI BF) sont archivées ici
- Les exceptions aux règles du plan sont documentées ici

---

## DEMANDES EN ATTENTE DE TRAITEMENT

_(aucune demande en attente)_

---

## HISTORIQUE DES DEMANDES

---

### [2026-05-23] — Mise en place du système de gestion des tâches

**Demandé par** : Utilisateur (session 23 mai 2026)
**Statut** : ✅ EXECUTÉ

**Description** :
Découper le plan `PLAN_TACHES_WIMRUX_FINANCES.md` en tickets locaux dans `todos/`, créer un système de rapports maîtres dans `rapport_implementation/`, et générer :
1. Tickets `todos/` — un fichier `.md` par tâche
2. Fichiers maîtres : `FAIT.md`, `RESTE_A_FAIRE.md`, `DEMANDES.md`
3. Migrations SQL Sprint 1 complètes
4. Kanban Markdown par sprint

**Règle de cycle d'implémentation** :
1. Agent exécute une tâche depuis `todos/`
2. Vérifie à 100% (tests, DB, UI, critères acceptation)
3. Crée rapport dans `rapport_implementation/` (fichier détaillé optionnel)
4. Met à jour `FAIT.md` (ajoute la tâche) + `RESTE_A_FAIRE.md` (coche la case)
5. **Supprime** le fichier de `todos/`

**Résultat** : Fichiers créés ✅

---

### [2026-05-23] — Génération du schéma DB InsForge complet

**Demandé par** : Utilisateur (session 23 mai 2026)
**Statut** : ✅ EXECUTÉ

**Résultat** : `DB_SCHEMA_INSFORGE_WIMRUX.md` — 25 tables, 12 triggers, 16 fonctions PostgreSQL, 10 Edge Functions, 10 buckets

---

## DÉCISIONS D'ARCHITECTURE

---

### [2026-05-23] — Séparation FINANCES vs FACTURATION

**Décision** : WIMRUX FINANCES ne touche PAS à :
- `pending_certification_queue`, `devices`, `certification_devices`
- `sim_invoices`, `mcf_logs`, `fiscal_reports` (type Z/X)
- Edge Functions : `generate-device-key`, `device-heartbeat`, `push-certified-invoice`, `pull-pending-invoices`, `mcf-simulator`, `fnec-simulator`

**Justification** : Ces modules appartiennent à WIMRUX FACTURATION (Electron Desktop). Toute duplication crée des conflits de certification SECeF DGI.

---

### [2026-05-23] — Buckets `carnet-*`

**Décision** : NE PAS utiliser les 6 buckets `carnet-*` sans confirmation explicite.

**Justification** : Buckets présents dans le backend InsForge mais non documentés dans les deux projets actuels. Possiblement liés à un ancien projet ou module futur.

---

### [2026-05-23] — Stack technologique verrouillée

**Décision** : Ne pas changer la stack :
- Frontend : Quasar 2 + Vue 3 + TypeScript + Pinia
- Backend : InsForge BaaS
- IA : OpenRouter (clé chiffrée par entreprise dans `companies.openrouter_api_key`)
- PDF : jsPDF + jspdf-autotable
- Déploiement : Vercel

**Justification** : Code existant, configurations déployées, contraintes de compatibilité DGI BF.

---

### [2026-05-23] — Conventions obligatoires pour tout nouveau code

**RLS** : Toute nouvelle table DOIT avoir :
```sql
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;
-- Policy isolation company
CREATE POLICY <table>_company_isolation ON <table>
  FOR ALL TO public
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());
-- Policy admin
CREATE POLICY <table>_project_admin ON <table>
  FOR ALL TO project_admin
  USING (true) WITH CHECK (true);
```

**Audit** : Toute table sensible DOIT avoir :
```sql
CREATE TRIGGER trg_audit_<table>
  AFTER INSERT OR UPDATE OR DELETE ON <table>
  FOR EACH ROW EXECUTE FUNCTION log_audit_changes();
```

**Multi-tenant** : `company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE`

---

## CLARIFICATIONS OBTENUES

_(aucune clarification enregistrée)_

---

## POINTS EN SUSPENS (à clarifier avant implémentation)

| ID | Question | Bloque | Sprint |
|---|---|---|---|
| Q1 | URL et credentials API DGI BF pour vérification IFU | T2.4 `verify-ifu-dgi` | S2 |
| Q2 | URL et credentials API DGI BF pour stickers d'impôts | T2.6 `verify-tax-sticker` | S2 |
| Q3 | InsForge supporte-t-il le 2FA natif TOTP ? | T19.1 | S9 |
| Q4 | Format exact des relevés bancaires des banques locales BF (OFX ou CSV propriétaire ?) | T1.3 `parse-bank-statement` | S1 |
| Q5 | Taux dégressif fiscal BF par catégorie d'immobilisation (cf. DGI BF) | T6.2 `useDepreciation.ts` | S4 |

---

*Dernière mise à jour : 2026-05-23*
