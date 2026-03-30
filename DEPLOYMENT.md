# Guide de Déploiement — WIMRUX® FINANCES

## Prérequis

- Node.js ≥ 20
- npm ≥ 6.13
- Compte InsForge avec projet configuré
- Domaine personnalisé (optionnel)

---

## 1. Variables d'environnement

Créer `.env` à la racine de `wimrux_app/` :

```env
VITE_INSFORGE_URL=https://gfe4bd9y.eu-central.insforge.app
VITE_INSFORGE_ANON_KEY=<votre_clé_anonyme>
VITE_MCF_API_BASE_URL=https://gfe4bd9y.eu-central.insforge.app/api/functions/mcf-simulator
```

> **Ne jamais commiter** les clés API dans le dépôt. Utiliser `.env` (gitignored).

---

## 2. Migrations base de données

Exécuter les scripts de migration dans l'ordre :

```bash
cd migrations/
node create_invoice_sequences.mjs   # Table séquences + fonction atomique
node create_stock_trigger.mjs       # Trigger décrément stock
node add_cash_operation.mjs         # Colonne is_cash_operation
node fix_sim_invoices_rls.mjs       # RLS sur sim_invoices
```

Vérifier l'état RLS :

```bash
node audit_rls.mjs
```

Résultat attendu : **22/22 tables RLS ON**, aucune table sans politique.

---

## 3. Edge Function MCF Simulator

La fonction `mcf-simulator` est déjà déployée sur InsForge. Pour redéployer :

1. Modifier le code dans le dashboard InsForge → Edge Functions → `mcf-simulator`
2. Ou utiliser l'outil MCP `update-function` avec le slug `mcf-simulator`

---

## 4. Storage

Le bucket `invoices-pdf` doit exister (public : false). Vérifier :

```
InsForge Dashboard → Storage → invoices-pdf
```

---

## 5. Build de production

```bash
cd wimrux_app/
npm install
npm run test          # 56 tests doivent passer
npx quasar build      # Build SPA dans dist/spa/
```

---

## 6. Déploiement frontend

### Option A : InsForge Hosting (recommandé)

Utiliser l'outil MCP `create-deployment` :

```
sourceDirectory: /chemin/vers/wimrux_app
projectSettings:
  buildCommand: npx quasar build
  outputDirectory: dist/spa
```

### Option B : Serveur web classique

Copier le contenu de `dist/spa/` vers le serveur (Nginx, Apache, etc.).

Configuration Nginx exemple :

```nginx
server {
    listen 80;
    server_name finances.wimrux.com;
    root /var/www/wimrux_finances/dist/spa;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Option C : Netlify

```bash
npx quasar build
# Deploy dist/spa/ via Netlify CLI ou dashboard
```

Ajouter `_redirects` dans `dist/spa/` :

```
/*    /index.html   200
```

---

## 7. Vérifications post-déploiement

| Vérification | Commande / Action |
|--------------|-------------------|
| RLS activé (22/22) | `node migrations/audit_rls.mjs` |
| Tests unitaires | `npm run test` |
| Séquence factures | Créer 2 factures FV → vérifier numéros consécutifs |
| Certification MCF | Certifier une facture → vérifier QR code + numéro fiscal |
| PDF stockage | Certifier → vérifier dans Storage `invoices-pdf` |
| Mode dégradé | Couper MCF → soumettre → vérifier file d'attente |
| Audit log | Modifier un client → vérifier entrée dans Journal d'audit |
| Rapport Z | Clôturer → vérifier compteurs remis à zéro |

---

## 8. Sécurité production

- [ ] Désactiver le mode debug Quasar (`quasar.config.js` → `build.vueDevtools: false`)
- [ ] Vérifier que `.env` n'est pas dans le bundle (`dist/spa/`)
- [ ] Activer HTTPS sur le domaine
- [ ] Configurer CORS dans InsForge pour n'autoriser que le domaine de production
- [ ] Rotation régulière des clés API InsForge
- [ ] Sauvegardes PostgreSQL automatiques (InsForge gère)

---

## 9. Monitoring

- **InsForge Dashboard** : logs API, Edge Functions, PostgreSQL
- **Audit log** : table `audit_log` dans la base — inaltérable
- **Rapports Z quotidiens** : vérifier la cohérence des compteurs
