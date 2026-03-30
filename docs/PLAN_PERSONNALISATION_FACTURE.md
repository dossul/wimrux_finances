# PLAN — Personnalisation de la Facture PDF
> WIMRUX® FINANCES — Charte graphique & Logo par entreprise
> Planifié le : 02/03/2026

---

## Objectifs

| # | Fonctionnalité | Priorité |
|---|---------------|----------|
| 1 | Upload du logo de l'entreprise (Storage InsForge) | HIGH |
| 2 | Activation/désactivation du logo sur la facture PDF | HIGH |
| 3 | Palette de couleurs personnalisée par entreprise | MEDIUM |
| 4 | Éléments visuels configurables (entêtes, lignes paires/impaires, bordures…) | MEDIUM |
| 5 | Prévisualisation en temps réel dans les Settings | LOW |

---

## 1. Modèle de données

### 1.1 Colonnes à ajouter à `companies`

```sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS
  invoice_settings JSONB DEFAULT '{}'::jsonb;
```

Structure du JSONB `invoice_settings` :

```json
{
  "show_logo": true,
  "logo_position": "left",
  "colors": {
    "primary":        "#2962FF",
    "header_bg":      "#2962FF",
    "header_text":    "#FFFFFF",
    "row_odd_bg":     "#F5F5F5",
    "row_even_bg":    "#FFFFFF",
    "row_text":       "#000000",
    "total_bg":       "#E3F2FD",
    "total_text":     "#000000",
    "cert_border":    "#009600",
    "cert_title":     "#007800",
    "accent":         "#2962FF"
  }
}
```

> `logo_url` existe déjà dans `companies` — pas de nouvelle colonne nécessaire.

### 1.2 Valeurs par défaut (couleurs actuelles du PDF)

| Élément | Couleur actuelle | Clé JSON |
|---------|-----------------|----------|
| Entête tableau (fond) | `#2962FF` (bleu) | `header_bg` |
| Entête tableau (texte) | `#FFFFFF` | `header_text` |
| Ligne impaire | `#F5F5F5` (gris clair) | `row_odd_bg` |
| Ligne paire | `#FFFFFF` | `row_even_bg` |
| Bloc totaux (fond) | `#E3F2FD` | `total_bg` |
| Bloc certification (bordure) | `#009600` (vert) | `cert_border` |
| Bloc certification (titre) | `#007800` | `cert_title` |
| Bandeaux ÉMETTEUR/DESTINATAIRE | `#2962FF` | `primary` |

---

## 2. Bucket Storage

### 2.1 Créer le bucket `company-logos`
- Accès : **public** (pour lecture dans le PDF et l'UI)
- Nommage fichier : `{company_id}/logo.{png|jpg|webp}`
- Taille max : 2 Mo
- Formats acceptés : PNG, JPG, WEBP, SVG

### 2.2 RLS Storage
- Upload : uniquement les utilisateurs de la company concernée (rôle admin)
- Lecture : public (pour inclusion dans le PDF)

---

## 3. Types TypeScript

### 3.1 Nouvelles interfaces dans `src/types/index.ts`

```typescript
export interface InvoiceColors {
  primary: string;
  header_bg: string;
  header_text: string;
  row_odd_bg: string;
  row_even_bg: string;
  row_text: string;
  total_bg: string;
  total_text: string;
  cert_border: string;
  cert_title: string;
  accent: string;
}

export interface InvoiceSettings {
  show_logo: boolean;
  logo_position: 'left' | 'center' | 'right';
  colors: InvoiceColors;
}
```

### 3.2 Mise à jour de l'interface `Company`

```typescript
export interface Company {
  // ... champs existants ...
  logo_url: string | null;           // déjà présent
  invoice_settings: InvoiceSettings | null;  // NOUVEAU
}
```

### 3.3 Mise à jour de `PdfCompanyInfo`

```typescript
export interface PdfCompanyInfo {
  // ... champs existants ...
  logo_url?: string | null;           // NOUVEAU
  invoice_settings?: InvoiceSettings | null; // NOUVEAU
}
```

---

## 4. Composable `useInvoicePdf.ts`

### 4.1 Chargement du logo

```typescript
// En début de generatePdf(), charger le logo si activé
let logoDataUrl: string | null = null;
if (company?.invoice_settings?.show_logo && company?.logo_url) {
  logoDataUrl = await fetchImageAsDataUrl(company.logo_url);
}
```

```typescript
async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}
```

### 4.2 Affichage du logo dans l'en-tête PDF

```
Position logo_position = 'left'  → x=15,  y=10, h=20mm
Position logo_position = 'center' → centré, y=10, h=20mm
Position logo_position = 'right'  → x=pageW-50, y=10, h=20mm
```

- Si logo présent : décaler le texte d'en-tête (WIMRUX® FINANCES…) vers le bas de 22mm
- Si pas de logo : layout actuel conservé

### 4.3 Palette de couleurs dynamique

Remplacer toutes les couleurs hardcodées par des variables lues depuis `invoice_settings.colors` (avec fallback sur les valeurs par défaut) :

```typescript
const colors = {
  ...DEFAULT_INVOICE_COLORS,
  ...(company?.invoice_settings?.colors || {}),
};
// Puis utiliser :
doc.setFillColor(...hexToRgb(colors.header_bg));
```

```typescript
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}
```

### 4.4 Zones colorées à paramétrer

| Zone du PDF | Variable couleur | Appel jsPDF |
|------------|-----------------|-------------|
| Bandeaux ÉMETTEUR/DESTINATAIRE | `primary` | `setFillColor` |
| En-tête tableau articles | `header_bg` + `header_text` | `headStyles` |
| Lignes impaires tableau | `row_odd_bg` | `alternateRowStyles` |
| Texte tableau | `row_text` | `styles.textColor` |
| Fond bloc totaux | `total_bg` | `setFillColor` |
| Texte totaux | `total_text` | `setTextColor` |
| Bordure bloc certification | `cert_border` | `setDrawColor` |
| Titre bloc certification | `cert_title` | `setTextColor` |

---

## 5. UI Settings — Onglet Entreprise

### 5.1 Section Logo

```
[ Zone de dépôt / sélection de fichier ]
  - Aperçu du logo actuel (miniature)
  - Bouton "Changer" + "Supprimer"
  - Formats : PNG, JPG, WEBP (max 2 Mo)

[ Toggle ] Afficher le logo sur la facture PDF
[ Select ] Position du logo : ● Gauche  ○ Centre  ○ Droite
```

### 5.2 Section Charte Graphique

```
Couleurs de la facture :
  [ Color picker ] Couleur principale (bandeaux, entêtes)
  [ Color picker ] Entête tableau — fond
  [ Color picker ] Entête tableau — texte
  [ Color picker ] Lignes impaires — fond
  [ Color picker ] Bloc totaux — fond
  [ Color picker ] Certification — bordure
  [ Color picker ] Certification — titre

[ Bouton ] Réinitialiser aux couleurs par défaut
[ Aperçu ] Miniature de la palette choisie (swatches)
```

### 5.3 Composants Quasar à utiliser

- **`q-file`** — upload logo (avec `accept="image/*"` et `max-file-size="2048000"`)
- **`q-img`** — aperçu du logo
- **`q-toggle`** — activation logo sur facture
- **`q-btn-toggle`** — position logo (Gauche / Centre / Droite)
- **`q-color`** (Quasar color picker) — sélecteur couleur pour chaque élément

---

## 6. Store `company-store.ts`

### 6.1 Nouvelles actions

```typescript
// Upload logo
async uploadLogo(file: File): Promise<{ url: string | null; error: Error | null }>

// Supprimer logo
async deleteLogo(): Promise<void>

// Sauvegarder settings facture (couleurs + logo toggle)
async updateInvoiceSettings(settings: Partial<InvoiceSettings>): Promise<void>
```

---

## 7. Passage des settings au PDF

Dans `InvoiceEditorPage.vue`, `companyPdfInfo` computed :

```typescript
const companyPdfInfo = computed<PdfCompanyInfo | undefined>(() => {
  const c = companyStore.company;
  if (!c) return undefined;
  const bank = c.bank_accounts?.[0];
  return {
    // ... champs existants ...
    logo_url: c.logo_url || null,
    invoice_settings: c.invoice_settings || null,
  };
});
```

---

## 8. Planning d'implémentation

### Étape 1 — DB + Types (30 min)
- [ ] Migration SQL : `ALTER TABLE companies ADD COLUMN invoice_settings JSONB`
- [ ] Interfaces TypeScript : `InvoiceColors`, `InvoiceSettings`
- [ ] Mise à jour `Company` + `PdfCompanyInfo`

### Étape 2 — Storage bucket (15 min)
- [ ] Créer bucket `company-logos` (public)
- [ ] Configurer les permissions
- [ ] Ajouter `uploadLogo()` + `deleteLogo()` dans company-store

### Étape 3 — PDF generation (1h)
- [ ] `fetchImageAsDataUrl()` helper
- [ ] `hexToRgb()` helper + `DEFAULT_INVOICE_COLORS` constant
- [ ] Affichage logo conditionnel dans l'en-tête
- [ ] Remplacement de toutes les couleurs hardcodées par palette dynamique

### Étape 4 — UI Settings (1h30)
- [ ] Section logo : upload, aperçu, toggle, position
- [ ] Section charte graphique : 6 color pickers + reset
- [ ] `updateInvoiceSettings()` appelé au submit
- [ ] Chargement dans `loadCompanyForm()`

### Étape 5 — Tests & validation (30 min)
- [ ] Tester avec logo + couleurs custom → régénérer PDF
- [ ] Tester sans logo → layout par défaut intact
- [ ] Vérifier sur les 3 entreprises (WESTAGO, ILTIC, WIMRUX)

**Durée totale estimée : ~3h30**

---

## 9. Contraintes & décisions

| Décision | Choix |
|---------|-------|
| Format logo dans PDF | Data URL (base64) — pas de dépendance externe |
| Fallback couleurs | Constante `DEFAULT_INVOICE_COLORS` si `invoice_settings` null |
| Logo activé par défaut | `show_logo: false` (opt-in par l'admin) |
| Couleur minimum lisible | Validation contraste AA WCAG au niveau UI (avertissement) |
| Stockage couleurs | JSONB dans `companies.invoice_settings` — pas de table séparée |
