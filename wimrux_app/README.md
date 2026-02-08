# WIMRUX® FINANCES

**Système de Facturation Électronique (SFE) homologué DGI — Burkina Faso**

Application SaaS de gestion de facturation conforme aux normes FNEC (Facture Normalisée Électronique Certifiée) du Burkina Faso.

## Stack technique

- **Frontend** : Quasar Framework 2.x + Vue 3 + TypeScript
- **Backend** : InsForge BaaS (PostgreSQL, Auth, Edge Functions, Realtime)
- **PDF** : jsPDF + jspdf-autotable
- **i18n** : Français (défaut) + Anglais

## Fonctionnalités

- Gestion multi-entreprise (SaaS isolé par company_id + RLS)
- Facturation : FV, FT, FA, EV, ET, EA avec 16 groupes fiscaux (A-P)
- Certification FNEC (soumission, confirmation, numéro fiscal, QR code)
- Calcul automatique TVA + PSVB + timbre quittance
- Trésorerie : comptes bancaires, caisse, mobile money
- Rapports : KPIs, ventilation par type et groupe fiscal
- Rapports fiscaux : Z (clôture) et X (consultation) via API FNEC
- Journal d'audit inaltérable avec traçabilité complète
- Export PDF et CSV
- Notifications temps réel (WebSocket)
- Gestion des appareils SFE (NIM)

## Installation

```bash
npm install
cp .env.example .env
# Configurer les variables VITE_INSFORGE_URL et VITE_INSFORGE_ANON_KEY
```

## Développement

```bash
npx quasar dev
```

## Lint

```bash
npm run lint
```

## Production

```bash
npx quasar build
```

## Structure

```
src/
├── boot/          # insforge, i18n, axios
├── composables/   # useFnecApi, useTaxCalculation, useInvoicePdf, useExportCsv, useRealtimeNotifications
├── i18n/          # fr/, en-US/
├── layouts/       # MainLayout, AuthLayout
├── pages/         # auth/, invoices/, clients/, treasury/, reports/, audit/, settings/
├── router/        # routes + RBAC guard
├── stores/        # auth-store, company-store, invoice-store
└── types/         # TypeScript interfaces
```

## Première entreprise enregistrée

**WESTAGO SARL** — IFU: 00089946R · RCCM: BF OUA 2021 M 13807

## Licence

Propriétaire — WIMRUX®
