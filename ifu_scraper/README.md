# WIMRUX® FINANCES — IFU Scraper Service

Service Node.js de vérification IFU DGI Burkina Faso via Browserless.

## Architecture

```
[Frontend WIMRUX] → [Edge Function InsForge] → [IFU Scraper :4200] → [Browserless :3000] → [dgi.bf]
                                                      ↑
                                               p-queue (1 req/3s)
```

## Installation & Démarrage

### 1. Browserless (Docker — serveur)

```bash
docker run -d \
  --name browserless \
  --restart unless-stopped \
  -p 3000:3000 \
  -e "TOKEN=wimrux_ifu_token" \
  -e "CONCURRENT=1" \
  -e "QUEUED=10" \
  -e "TIMEOUT=30000" \
  ghcr.io/browserless/chromium:latest
```

### 2. IFU Scraper (Node.js)

```bash
cd ifu_scraper
npm install

# Variables d'environnement
export PORT=4200
export BROWSERLESS_WS=ws://localhost:3000
export BROWSERLESS_TOKEN=wimrux_ifu_token

npm start
```

### 3. Vérifier le service

```bash
# Santé
curl http://localhost:4200/health

# Vérification IFU unique
curl -X POST http://localhost:4200/verify \
  -H "Content-Type: application/json" \
  -d '{"ifu": "000123456789"}'

# Pression queue
curl http://localhost:4200/pressure
```

## Configuration .env.local (Frontend)

```
VITE_IFU_SCRAPER_URL=http://votre-serveur:4200
```

## Endpoints

| Méthode | Route          | Description                         |
|---------|---------------|-------------------------------------|
| GET     | /health       | Santé du service + état queue       |
| POST    | /verify       | Vérification IFU unique             |
| POST    | /verify-batch | Vérification batch (max 50 IFUs)    |
| GET     | /pressure     | Métriques queue temps réel          |

## Réponse JSON

```json
{
  "ifu": "000123456789",
  "statut": "ok",
  "resultat": {
    "etat": "ACTIVE",
    "nom": "WESTAGO SARL",
    "rccm": "BF-OUA-2020-B-12345",
    "regime": "RNI",
    "adresse": "Avenue Kwame Nkrumah, Ouagadougou",
    "brut": "Texte brut de la page DGI"
  },
  "fromCache": false
}
```

## Intégration Frontend (WIMRUX)

Le composant `ReceivedInvoiceWizard.vue` appelle le scraper via l'Edge Function `verify-tax-id` quand `VITE_DIFY_IFU_WORKFLOW_URL` est défini.
Pour utiliser le scraper directement, définir `VITE_IFU_SCRAPER_URL` dans `.env.local`.
