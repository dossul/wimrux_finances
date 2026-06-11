---
description: Purger toutes les données de test (factures, items, paiements, storage) malgré les RLS et triggers d'immutabilité
---

## Prérequis

- Projet lié : `npx @insforge/cli link --project-id 0feefe21-1489-41b5-a2b6-3c44593ec819`
- Connexion string admin disponible via : `npx @insforge/cli db connection-string`

---

## Étape 1 — Désactiver les triggers d'immutabilité et vider les tables

Les triggers `trg_invoice_immutable_delete` et `trg_invoice_immutable_update` bloquent la suppression des factures `certified` et `validated`. Il faut les désactiver avant le DELETE.

```powershell
npx @insforge/cli db query "ALTER TABLE invoices DISABLE TRIGGER trg_invoice_immutable_delete; ALTER TABLE invoices DISABLE TRIGGER trg_invoice_immutable_update; DELETE FROM invoice_payments; DELETE FROM invoice_items; DELETE FROM withholding_taxes; DELETE FROM invoices; ALTER TABLE invoices ENABLE TRIGGER trg_invoice_immutable_delete; ALTER TABLE invoices ENABLE TRIGGER trg_invoice_immutable_update; SELECT 'ok' as result;" --json
```

**Vérification :**
```powershell
npx @insforge/cli db query "SELECT (SELECT COUNT(*) FROM invoices) as invoices, (SELECT COUNT(*) FROM invoice_items) as items, (SELECT COUNT(*) FROM invoice_payments) as payments;" --json
```
Résultat attendu : `invoices: 0, items: 0, payments: 0`

---

## Étape 2 — Vider le bucket storage `invoices-scans`

La table `storage.objects` est protégée par RLS — le CLI PostgREST ne peut pas supprimer les objets d'autres utilisateurs. Il faut passer par la **connexion Postgres directe**.

// turbo
```powershell
$conn = npx @insforge/cli db connection-string
node -e "
import pg from 'pg';
const client = new pg.Client({ connectionString: '$conn' });
await client.connect();
const r = await client.query(\"DELETE FROM storage.objects WHERE bucket = 'invoices-scans' RETURNING key\");
console.log(r.rowCount + ' fichiers supprimés');
r.rows.forEach(row => console.log(' -', row.key));
await client.end();
" --input-type=module
```

> **Alternative script Node.js :**
> Créer `scripts/purge-storage.mjs` avec la connexion string admin, lancer avec `node scripts/purge-storage.mjs`, puis supprimer le script.

---

## Étape 3 — (Optionnel) Vider d'autres tables liées

Si d'autres données de test existent dans des tables liées :

```powershell
# Autres tables à nettoyer si besoin
npx @insforge/cli db query "DELETE FROM reminder_logs; DELETE FROM pending_certification_queue; DELETE FROM audit_log WHERE table_name = 'invoices';" --json
```

---

## Étape 4 — Vérification finale

```powershell
npx @insforge/cli db query "SELECT (SELECT COUNT(*) FROM invoices) as invoices, (SELECT COUNT(*) FROM storage.objects WHERE bucket = 'invoices-scans') as storage_files;" --json
```
Résultat attendu : `invoices: 0, storage_files: 0`

---

## Pourquoi les RLS bloquent et comment les contourner

| Blocage | Cause | Contournement |
|---------|-------|---------------|
| `INTERDIT: Les factures validées ou certifiées sont inaltérables` | Trigger `trg_invoice_immutable_delete` | `ALTER TABLE invoices DISABLE TRIGGER ...` avant DELETE, réactiver après |
| `permission denied for table objects` (storage) | RLS `storage_objects_owner_delete` — vérifie `uploaded_by = auth.uid()` | Connexion Postgres directe avec le rôle `postgres` (superuser) via `connection-string` |
| `permission denied for schema storage` (SDK anon) | SDK tourne avec le JWT anon sans `sub` utilisateur valide | Utiliser l'API key admin `ik_...` ou connexion Postgres directe |

---

## Script complet one-shot (PowerShell)

```powershell
# 1. Vider les tables
npx @insforge/cli db query "ALTER TABLE invoices DISABLE TRIGGER trg_invoice_immutable_delete; ALTER TABLE invoices DISABLE TRIGGER trg_invoice_immutable_update; DELETE FROM invoice_payments; DELETE FROM invoice_items; DELETE FROM withholding_taxes; DELETE FROM invoices; ALTER TABLE invoices ENABLE TRIGGER trg_invoice_immutable_delete; ALTER TABLE invoices ENABLE TRIGGER trg_invoice_immutable_update;" --json

# 2. Vider le storage via Postgres direct
$CONN = (npx @insforge/cli db connection-string 2>&1 | Select-String "postgresql").ToString().Trim()
node --input-type=module << 'EOF'
import pg from 'pg';
const client = new pg.Client({ connectionString: process.env.CONN });
await client.connect();
const r = await client.query("DELETE FROM storage.objects WHERE bucket = 'invoices-scans' RETURNING key");
console.log(r.rowCount + ' fichiers supprimés');
await client.end();
EOF
```

---

*Note créée le 2026-06-01 — À utiliser uniquement en environnement de développement/test*
