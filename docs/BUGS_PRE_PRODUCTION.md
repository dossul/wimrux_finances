# WIMRUX FINANCES — Rapport de bugs pré-production

**Date**: 5 avril 2026  
**URL de production**: https://wimrux-app.vercel.app

---

## ✅ BUGS CORRIGÉS

### BUG-001: Erreur 400 sur RPC next_invoice_reference
**Statut**: ✅ CORRIGÉ  
**Sévérité**: CRITIQUE

**Problème**: La fonction `next_invoice_reference` utilisait `type` au lieu de `invoice_type` pour la colonne dans la table `invoice_sequences`.

**Solution appliquée**:
```sql
CREATE OR REPLACE FUNCTION next_invoice_reference(p_company_id uuid, p_type varchar, p_year integer)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER AS $fn$
DECLARE v_num integer;
BEGIN
  INSERT INTO invoice_sequences(company_id, invoice_type, year, last_number)
  VALUES (p_company_id, p_type, p_year, 1)
  ON CONFLICT (company_id, invoice_type, year)
  DO UPDATE SET last_number = invoice_sequences.last_number + 1
  RETURNING last_number INTO v_num;
  RETURN p_type || '-' || p_year || '-' || lpad(v_num::text, 5, '0');
END; $fn$;
```

### BUG-002: Cache PostgREST non rechargé après modification fonction
**Statut**: ✅ CORRIGÉ

**Solution**: `NOTIFY pgrst, 'reload schema';`

### BUG-003: Contrainte CHECK manquant type PF (Proforma)
**Statut**: ✅ CORRIGÉ  
**Sévérité**: CRITIQUE

**Erreur**: `new row for relation "invoices" violates check constraint "invoices_type_check"`

**Cause**: La contrainte `invoices_type_check` n'incluait pas le type `PF`.

**Solution appliquée**:
```sql
ALTER TABLE invoices DROP CONSTRAINT invoices_type_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_type_check CHECK (type IN ('FV', 'FT', 'FA', 'EV', 'ET', 'EA', 'PF'));
```

---

## 🟡 BUGS NON BLOQUANTS

### BUG-003: Erreur console webpage_content_reporter.js
**Statut**: Ignoré  
**Sévérité**: FAIBLE

**Cause**: Extension de navigateur (pas lié à l'application).

---

## 🔵 VÉRIFICATIONS À EFFECTUER

### Pour chaque compte (admin@wimrux.bf, admin@iltic.bf, admin@westago.bf):

| Page | Vérification | Status |
|------|-------------|--------|
| Tableau de bord | Chargement OK | ⬜ |
| Factures | Liste visible | ⬜ |
| Factures | Création nouvelle facture | ⬜ |
| Factures | Édition facture brouillon | ⬜ |
| Factures | Certification SECeF | ⬜ |
| Factures | Téléchargement PDF | ⬜ |
| Articles | Liste visible | ⬜ |
| Articles | Création/Modification | ⬜ |
| Clients | Liste visible | ⬜ |
| Clients | Création/Modification | ⬜ |
| Trésorerie | Comptes visibles | ⬜ |
| Trésorerie | Ajout mouvement | ⬜ |
| Rapports | KPIs chargés | ⬜ |
| Rapports fiscaux | Rapport Z/X | ⬜ |
| A-Rapport | Génération | ⬜ |
| Journal d'audit | Logs visibles | ⬜ |
| Paramètres | Toutes les tabs | ⬜ |
| Assistant IA | Chat fonctionnel | ⬜ |

---

## 🛠️ CORRECTIONS APPLIQUÉES

### 1. Fonction next_invoice_reference
```sql
CREATE OR REPLACE FUNCTION next_invoice_reference(p_company_id uuid, p_type varchar, p_year integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_num integer;
BEGIN
  INSERT INTO invoice_sequences(company_id, invoice_type, year, last_number)
  VALUES (p_company_id, p_type, p_year, 1)
  ON CONFLICT (company_id, invoice_type, year)
  DO UPDATE SET last_number = invoice_sequences.last_number + 1
  RETURNING last_number INTO v_num;
  RETURN p_type || '-' || p_year || '-' || lpad(v_num::text, 5, '0');
END;
$fn$;
```

### 2. Cache PostgREST rechargé
```sql
NOTIFY pgrst, 'reload schema';
```

---

## 📋 PROCHAINES ÉTAPES

1. [ ] Tester la création de facture après correction RLS
2. [ ] Valider l'isolation des données entre entreprises
3. [ ] Tester le workflow complet de certification
4. [ ] Vérifier les rapports fiscaux
5. [ ] Tester l'assistant IA
