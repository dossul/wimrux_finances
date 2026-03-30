# CONFORMITÉ FEC — Checklist Mentions Obligatoires
> Source : Spéc. SFE §3, §5 + Arrêté n°2023-00216/MEFP/SG/DGI + Arrêté n°2025-0049/MEF/SG/DGI
> Mise à jour : 02/03/2026

---

## §5.1 — Bloc VENDEUR (Émetteur)

| Réf. | Mention obligatoire | Champ DB | Sur le PDF | État |
|------|-------------------|----------|------------|------|
| 3(a) | Nom / Raison sociale | `companies.name` | Bloc ÉMETTEUR | ✅ |
| 3(b) | IFU de l'entreprise | `companies.ifu` | `IFU : ...` | ✅ |
| 3(b) | RCCM | `companies.rccm` | `RCCM : ...` | ✅ |
| 3(c) | Adresse cadastrale (SSSS LLL PPPP) | `companies.address_cadastral` | `Adresse : ...` | ✅ |
| 3(d) | Téléphone | `companies.phone` | `Tél : ...` | ✅ |
| 3(d) | Email | `companies.email` | `Tél : ... — email` | ✅ |
| 3(j) | Compte(s) bancaire(s) | `companies.bank_name/bank_account` | `Banque : ... — Compte : ...` | ✅ (si renseigné) |
| 3(j) | IBAN | `companies.iban` | `IBAN : ...` | ✅ (si renseigné) |
| 3(k) | Régime d'imposition | `companies.tax_regime` | `Régime fiscal : ...` | ✅ |
| 3(l) | Service des impôts de rattachement | `companies.tax_office` | `Centre des impôts : ...` | ✅ |
| — | ISF (identifiant SFE) | dérivé NIM (4 premiers car.) | Bloc Sécurité `ISF : BF01` | ✅ |
| — | N° ISF entreprise | `companies.isf_number` | `N° ISF : ...` | ✅ (si renseigné) |

---

## §5.2 — Bloc CLIENT

| Réf. | Mention obligatoire | Condition | Champ DB | Sur le PDF | État |
|------|-------------------|-----------|----------|------------|------|
| 2.14 | Type de client (CC/PM/PP/PC) | Toujours | `clients.type` | `Type : PM/PP/...` | ✅ |
| 2.14 | Nom / Raison sociale | Obligatoire si PM, PP, PC | `clients.name` | Nom en gras côté CLIENT | ✅ |
| 2.14 | IFU du client | Obligatoire si PM ou PC | `clients.ifu` | `IFU : ...` | ✅ (si renseigné) |
| 7 | IFU client format libre | Si export (EV/ET/EA) | `clients.ifu` | `IFU : (export — libre)` | ✅ |
| — | RCCM client | Si PM et renseigné | `clients.rccm` | `RCCM : ...` | ✅ |
| — | Adresse client | Si le client le demande | `clients.address` | `Adresse : ...` | ✅ (si renseigné) |
| — | Téléphone client | Si le client le demande | `clients.phone` | `Tél : ...` | ✅ (si renseigné) |
| — | Client comptant (PP sans fiche) | Si pas de client lié | — | `Client comptant (PP)` | ✅ |

---

## §5.3 — Bloc FACTURE (identité & type)

| Réf. | Mention obligatoire | Champ DB | Sur le PDF | État |
|------|-------------------|----------|------------|------|
| 2.18 | Numéro de série (unique, ininterrompu/année) | `invoices.reference` | `Réf : FV-2026-00001` | ✅ |
| — | Date et heure d'établissement | `invoices.created_at` | `Date : 02/03/2026 14:46` | ✅ |
| 2.7 | Type de facture (FV/FT/FA/EV/ET/EA) en toutes lettres | `invoices.type` | `FACTURE DE VENTE` | ✅ |
| 6.3/6.4 | Mode de prix (HT ou TTC) | `invoices.price_mode` | `Mode de prix : TTC` | ✅ |
| 2.11 | Mention **DUPLICATA** | Si copie | `options.isDuplicate` | En rouge en haut à droite | ✅ |
| 2.28 | Mention **FACTURE D'AVOIR** + nature (COR/RAN/RAM/RRR) | Si FA ou EA | `invoices.credit_note_nature` | `Nature : ...` | ✅ |
| — | Référence facture originale | Si FA ou EA | via `original_invoice_id` | `Facture d'origine : ...` | ✅ |
| — | Mention **EXPORTATION** | Si EV/ET/EA | `invoices.type` | `Facture export — TVA non applicable` | ✅ |
| — | Mention **D'ACOMPTE** | Si FT ou ET | type label | `FACTURE D'ACOMPTE OU D'AVANCE` | ✅ |
| 3(n) | Nom de l'opérateur | `invoices.operator_name` | `Opérateur : ...` | ✅ |

---

## §5.4 — Bloc ARTICLES

| Réf. | Mention obligatoire | Champ DB | Colonne PDF | État |
|------|-------------------|----------|-------------|------|
| 2.19 | Désignation | `invoice_items.name` | `Désignation` | ✅ |
| 2.19 | Code article | `invoice_items.code` | `Code` | ✅ |
| 2.19 | Type d'article (LOCBIE/LOCSER/IMPBIE/IMPSER) | `invoice_items.type` | `Type` | ✅ |
| 2.19 | Quantité | `invoice_items.quantity` | `Qté` | ✅ |
| 2.19 | Unité de mesure | `invoice_items.unit` | `Unité` | ✅ |
| 2.19 | Prix unitaire (HT ou TTC) | `invoice_items.price` | `P.U.` | ✅ |
| 2.15 | Groupe de taxation (A–P) | `invoice_items.tax_group` | `Grp` | ✅ |
| — | Montant HT | `invoice_items.amount_ht` | `HT` | ✅ |
| — | Montant TVA | `invoice_items.amount_tva` | `TVA` | ✅ |
| — | Montant TTC | `invoice_items.amount_ttc` | `TTC` | ✅ |
| — | Réduction (remise/rabais/ristourne) | `invoice_items.discount` | Dans désignation `(-X FCFA)` | ✅ |
| — | Taxe spécifique si applicable | `invoice_items.specific_tax` | Dans désignation `[T.Sp: X]` | ✅ |

---

## §5.5 — Bloc FISCAL (totaux & taxes)

| Réf. | Mention obligatoire | Champ DB | Sur le PDF | État |
|------|-------------------|----------|------------|------|
| — | Total HT | `invoices.total_ht` | Tableau totaux | ✅ |
| — | Total TVA | `invoices.total_tva` | Tableau totaux | ✅ |
| — | Total PSVB | `invoices.total_psvb` | Tableau totaux | ✅ |
| — | **TOTAL TTC** | `invoices.total_ttc` | En gras 14pt | ✅ |
| — | Montant HT + TVA + PSVB par groupe de taxation | `invoices.tax_calculation` | Tableau récap gauche | ✅ |
| 3(s) | Timbre quittance + montant | `invoices.stamp_duty` | Dans tableau totaux si > 0 | ✅ |
| 3(u) | **Montant total TTC en lettres (français)** | Calculé | `Arrêtée la présente...` | ✅ |
| 2.21 | Modes de paiement + montants | `options.payments` | `Modes de paiement :` | ✅ (si fourni) |
| — | Mention exonération TVA | Groupes tva=0 | `Exonération de TVA...` | ✅ (si applicable) |
| — | Mention export TVA non applicable | EV/ET/EA | `Facture export — TVA...` | ✅ (si applicable) |

---

## §5.6 — Bloc SÉCURITÉ (éléments MCF)

| Réf. | Mention obligatoire | Champ DB | Sur le PDF | État |
|------|-------------------|----------|------------|------|
| — | **N° Fiscal** | `invoices.fiscal_number` | `N° Fiscal : FV0000001/2026` | ✅ |
| — | **Code SECeF/DGI** (24 car. XXXX-XXXX-...) | `invoices.code_secef_dgi` | `Code SECeF/DGI : BF4A1C-...` | ✅ |
| — | **NIM** (MMCCNNNNNN) | `invoices.nim` | `NIM : BF01000001` | ✅ |
| — | **ISF** (4 premiers car. NIM) | dérivé NIM | `ISF : BF01` | ✅ |
| — | **Compteurs** (CPIT/FDOC TYPE) | `invoices.counters` | `Compteurs : 1/1 FV` | ✅ |
| — | **Date et heure MCF** (horodatage certifié) | `invoices.certification_datetime` | `Date certification : ...` | ✅ |
| — | **UID** (identifiant unique transaction) | `invoices.mcf_uid` | `UID : 72856687-...` | ✅ |
| — | **Signature numérique** (complète, DER hex) | `invoices.signature` | Intégrale, wrappée auto | ✅ |
| 2.30 | **QR Code 2D** scannable (format BF;...) | `invoices.qr_code` | Image PNG générée | ✅ |
| — | Mention **FACTURE ÉLECTRONIQUE CERTIFIÉE** | Texte fixe | Titre bloc vert | ✅ |
| — | Mention **EXIGEZ LA FACTURE ÉLECTRONIQUE CERTIFIÉE** | Texte fixe | Pied de page | ✅ |

---

## §5.7 — Bloc COMMENTAIRES (lignes A–H)

| Réf. | Mention | État |
|------|---------|------|
| 2.27 | Observations libres | ✅ affiché si `options.comments` fourni |
| A | Référence certificat d'exonération | ✅ dans `options.comments` |
| B | Base juridique de l'exonération | ✅ dans `options.comments` |
| C–H | Réservé DGI | Non applicable |

---

## Mentions légales pied de page

| Mention | État |
|---------|------|
| Référence arrêté n°2023-00216/MEFP/SG/DGI | ✅ |
| Référence arrêté n°2025-0049/MEF/SG/DGI | ✅ |
| Mention SECeF Burkina Faso | ✅ |
| Logiciel émetteur (WIMRUX® FINANCES) | ✅ |
| Date d'impression | ✅ |
| Mention **DUPLICATA** pied de page | ✅ (si applicable) |

---

## Résultat Global

| Catégorie | Total mentions | Présentes | Manquantes |
|-----------|---------------|-----------|------------|
| Bloc Vendeur | 12 | 12 | 0 |
| Bloc Client | 8 | 8 | 0 |
| Bloc Facture | 11 | 11 | 0 |
| Bloc Articles | 12 | 12 | 0 |
| Bloc Fiscal | 11 | 11 | 0 |
| Bloc Sécurité | 11 | 11 | 0 |
| Commentaires | 2 | 2 | 0 |
| Pied de page | 6 | 6 | 0 |
| **TOTAL** | **73** | **73** | **0** |

> ✅ **TOUTES LES MENTIONS OBLIGATOIRES SONT PRÉSENTES** — Conforme aux spécifications SFE/SECeF DGI Burkina Faso.

---

## Note sur la Signature

La **signature numérique** est une signature ECDSA/DER encodée en hexadécimal (~140 caractères).
Elle était précédemment tronquée à 32 car. + `...` dans le code.
**Depuis le 02/03/2026** : signature intégrale affichée, avec retour à la ligne automatique (`splitTextToSize`).
Le bloc de certification a une **hauteur dynamique** qui s'adapte au nombre de lignes de la signature.
