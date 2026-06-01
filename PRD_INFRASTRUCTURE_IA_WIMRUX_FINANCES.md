# PRD — Infrastructure IA & Observabilité WIMRUX® Finances

**Version :** 1.0
**Date :** 2026-05-23
**Auteur :** Ulrich Dossougoin
**Statut :** À exécuter
**Périmètre :** Déploiement infrastructure IA self-hosted + intégration SaaS multi-tenant
**Cible géographique :** CEDEAO / UEMOA (15 pays)
**Modèle commercial :** Hybride — Quota plateforme inclus dans l'abonnement + Crédits IA achetables + BYOK (Bring Your Own Key)

---

## 📑 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [PARTIE 1 — GUIDE OPÉRATEUR (Vous, Ulrich)](#partie-1--guide-opérateur-vous-ulrich)
  - [1.1 Architecture cible](#11-architecture-cible)
  - [1.2 Inventaire des services à déployer](#12-inventaire-des-services-à-déployer)
  - [1.3 Prérequis VPS](#13-prérequis-vps)
  - [1.4 Procédure de déploiement détaillée](#14-procédure-de-déploiement-détaillée)
  - [1.5 Configuration post-déploiement](#15-configuration-post-déploiement)
  - [1.6 Données à transmettre aux agents codeurs](#16-données-à-transmettre-aux-agents-codeurs)
- [PARTIE 2 — SPÉCIFICATION POUR AGENTS CODEURS](#partie-2--spécification-pour-agents-codeurs)
  - [2.1 Contexte produit](#21-contexte-produit)
  - [2.2 Modèle économique IA — Règles de routage](#22-modèle-économique-ia--règles-de-routage)
  - [2.3 Tables à créer (migrations SQL)](#23-tables-à-créer-migrations-sql)
  - [2.4 Edge Function `ai-router`](#24-edge-function-ai-router)
  - [2.5 Panneau Admin SaaS — Paramétrage IA](#25-panneau-admin-saas--paramétrage-ia)
  - [2.6 Panneau Tenant — Gestion crédits & BYOK](#26-panneau-tenant--gestion-crédits--byok)
  - [2.7 Workflows critiques](#27-workflows-critiques)
  - [2.8 Critères d'acceptation](#28-critères-dacceptation)

---

## Vue d'ensemble

### Objectif

Construire une infrastructure IA **self-hosted, multi-tenant, économiquement viable** pour WIMRUX Finances permettant :

1. **Observabilité complète** : tracer chaque appel IA, coût en USD, latence, erreurs, par tenant
2. **Routage intelligent** : choisir automatiquement le bon modèle pour la bonne tâche au meilleur coût
3. **Modèle commercial flexible** :
   - **Quota plateforme** inclus dans abonnement (utilise nos clés)
   - **Crédits IA achetables** en surplus (paiement Mobile Money/Carte)
   - **BYOK** : le client apporte ses propres clés API (Anthropic, OpenAI, OpenRouter...)
4. **Conformité PII** : anonymisation des données sensibles avant envoi LLM externe
5. **Workflows visuels** : Dify, Langflow, Flowise pour personnalisation par tenant
6. **Mémoire long terme** : conversations contextualisées des assistants fiscal/comptable

### Stack open source retenue (déployée sur votre VPS)

| Composant | Rôle | Statut probable chez vous |
|---|---|---|
| **LiteLLM Proxy** | Gateway unifié 100+ providers + budgets + rate limit | À déployer |
| **Langfuse** | Observabilité, traces, coûts, métriques, prompt management | À déployer |
| **Presidio** | Anonymisation PII avant envoi LLM externe | À déployer |
| **Dify** | Workflow engine IA visuel | Déjà déployé ? |
| **Stirling AI** | Workflow secondaire | Déjà déployé ? |
| **Langflow** | Workflow visuel alternatif (optionnel) | Optionnel |
| **Flowise** | Workflow visuel alternatif (optionnel) | Optionnel |
| **Zep** | Mémoire long terme assistants conversationnels | À déployer (P2) |
| **TEI** | Text Embeddings Inference self-hosted | À déployer (P3) |
| **Ollama** | LLMs locaux pour tâches non-critiques low-cost | Optionnel (P3) |

### Principes directeurs

- **Une seule porte d'entrée IA** : tout appel IA passe par `ai-router` (Edge Function InsForge) → LiteLLM → provider final
- **Anonymisation systématique** des PII pour tâches utilisant des LLMs externes (cloud)
- **Isolation par `company_id`** : aucune fuite cross-tenant possible
- **Audit complet** : chaque token consommé est tracé (Langfuse) + facturé (table `ai_usage_logs`)
- **Failover automatique** : si modèle premium indisponible → fallback modèle économique
- **Plafonds stricts** : impossible de dépasser le quota d'abonnement sans crédits ou BYOK

---

# PARTIE 1 — GUIDE OPÉRATEUR (Vous, Ulrich)

> Cette partie liste **exactement ce que vous devez déployer sur votre VPS** (Contabo/Hostinger), dans quel ordre, avec quelles configurations, et **quelles informations remonter aux agents codeurs**.

---

## 1.1 Architecture cible

```
┌──────────────────────────────────────────────────────────────────────────┐
│  CLIENT WIMRUX FINANCES (Quasar SPA)                                     │
│  https://finances.wimrux.com                                             │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ HTTPS
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  INSFORGE BAAS (gfe4bd9y.eu-central.insforge.app)                        │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Edge Function `ai-router`                                         │  │
│  │  - Authentification (JWT InsForge)                                 │  │
│  │  - Récupération company_id                                         │  │
│  │  - Routage par ai_tasks.code                                       │  │
│  │  - Vérification quotas (subscription + credits + BYOK)             │  │
│  │  - Anonymisation PII (Presidio)                                    │  │
│  │  - Appel LiteLLM                                                   │  │
│  │  - Log usage (ai_usage_logs)                                       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────┬───────────────────────────────────────────┘
                               │ HTTPS (clé service)
                               ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  VOTRE VPS (Contabo / Hostinger)                                         │
│  Domaine : ai.wimrux.com (ou ia.wimrux.com)                              │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │
│  │  Traefik /      │  │  Presidio API   │  │  Langfuse               │   │
│  │  Nginx          │  │  (PII redact)   │  │  - Web (3000)           │   │
│  │  (reverse proxy)│  │  (5001)         │  │  - Worker               │   │
│  └────────┬────────┘  └────────┬────────┘  │  - Postgres + ClickHouse│   │
│           │                    │           │  - Redis + MinIO        │   │
│           ▼                    │           └────────────┬────────────┘   │
│  ┌─────────────────┐           │                        │                │
│  │  LiteLLM Proxy  │───────────┴────────────────────────┘                │
│  │  (4000)         │  (traces + costs)                                   │
│  │  + Postgres     │                                                     │
│  └────────┬────────┘                                                     │
│           │                                                              │
│           ▼                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  PROVIDERS LLM EXTERNES (sortants)                                 │  │
│  │  OpenRouter | Anthropic | OpenAI | Mistral | Google AI | DeepSeek  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐   │
│  │  Dify           │  │  Stirling AI    │  │  Zep (P2)               │   │
│  │  (déjà ?)       │  │  (déjà ?)       │  │  Mémoire LT             │   │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘   │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐                                │
│  │  TEI (P3)       │  │  Ollama (P3)    │                                │
│  │  Embeddings     │  │  LLMs locaux    │                                │
│  └─────────────────┘  └─────────────────┘                                │
└──────────────────────────────────────────────────────────────────────────┘
```

### Domaines à configurer (DNS)

Créez les sous-domaines suivants pointant vers l'IP de votre VPS :

| Sous-domaine | Service | Port interne | Accès |
|---|---|---|---|
| `litellm.wimrux.com` | LiteLLM Proxy | 4000 | Privé (whitelist InsForge + admin) |
| `langfuse.wimrux.com` | Langfuse Web | 3000 | Public (UI) + privé (API ingestion) |
| `presidio.wimrux.com` | Presidio Analyzer + Anonymizer | 5001/5002 | Privé (whitelist InsForge) |
| `dify.wimrux.com` | Dify (si pas encore exposé) | 80/443 | Public (UI éditeur workflows) |
| `stirling.wimrux.com` | Stirling AI | (selon) | Privé |
| `zep.wimrux.com` | Zep | 8000 | Privé |
| `embeddings.wimrux.com` | TEI | 8080 | Privé |

> 💡 Utilisez **Cloudflare** pour la gestion DNS + protection DDoS + SSL automatique.

---

## 1.2 Inventaire des services à déployer

### Priorité P0 — Critiques pour le MVP commercial

#### Service 1 : LiteLLM Proxy

- **Image Docker :** `ghcr.io/berriai/litellm:main-stable`
- **Rôle :** Gateway unifié vers tous providers LLM, applique budgets et rate limits
- **Ressources :** 1 vCPU, 2 GB RAM
- **Base de données :** PostgreSQL (peut être mutualisée ou dédiée)
- **Dépendances :** Aucune
- **Documentation :** https://docs.litellm.ai/docs/proxy/deploy

#### Service 2 : Langfuse

- **Image Docker :** `langfuse/langfuse:latest` + `langfuse/langfuse-worker:latest`
- **Rôle :** Observabilité LLM (traces, coûts, métriques, prompts)
- **Ressources :** 2 vCPU, 4 GB RAM minimum (recommandé 8 GB pour scale)
- **Bases de données :** PostgreSQL + ClickHouse + Redis + MinIO (ou S3)
- **Dépendances :** Aucune
- **Documentation :** https://langfuse.com/self-hosting/docker-compose

#### Service 3 : Presidio

- **Images Docker :**
  - `mcr.microsoft.com/presidio-analyzer:latest`
  - `mcr.microsoft.com/presidio-anonymizer:latest`
- **Rôle :** Détection et anonymisation des PII (noms, IBAN, RIB, IFU, téléphones, emails)
- **Ressources :** 1 vCPU, 1 GB RAM par service
- **Dépendances :** Aucune
- **Documentation :** https://microsoft.github.io/presidio/installation/

### Priorité P1 — Déjà déployés (à vérifier/exposer)

#### Service 4 : Dify

- **Statut :** Probablement déjà déployé chez vous
- **À vérifier :**
  - URL d'accès admin
  - Clé API pour appels programmatiques
  - Workflows existants pour WIMRUX
- **Documentation :** https://docs.dify.ai/

#### Service 5 : Stirling AI

- **Statut :** Probablement déjà déployé chez vous
- **À vérifier :** URL, API key

### Priorité P2 — Recommandés à court terme

#### Service 6 : Zep (Memory)

- **Image Docker :** `ghcr.io/getzep/zep:latest`
- **Rôle :** Mémoire long terme pour `assistant_fiscal` et `assistant_comptable`
- **Ressources :** 1 vCPU, 2 GB RAM
- **Base de données :** PostgreSQL + pgvector
- **Documentation :** https://help.getzep.com/

### Priorité P3 — Optimisations futures

#### Service 7 : TEI (Text Embeddings Inference)

- **Image Docker :** `ghcr.io/huggingface/text-embeddings-inference:latest`
- **Rôle :** Embeddings self-hosted (économise coût OpenAI embeddings)
- **Ressources :** 2 vCPU, 4 GB RAM (CPU) ou GPU si dispo
- **Modèle recommandé :** `BAAI/bge-m3` (multilingue, parfait français)

#### Service 8 : Ollama (LLMs locaux)

- **Image Docker :** `ollama/ollama:latest`
- **Rôle :** LLMs locaux pour tâches non-critiques sans coût marginal
- **Modèles à pull :** `llama3.2:3b`, `qwen2.5:7b`, `mistral:7b`
- **Ressources :** 4+ vCPU, 8+ GB RAM (sans GPU) — beaucoup plus avec GPU

---

## 1.3 Prérequis VPS

### Configuration minimale recommandée

| Ressource | Minimum P0 | Recommandé P0+P1+P2 | Complet P0→P3 |
|---|---|---|---|
| vCPU | 4 | 8 | 16 |
| RAM | 8 GB | 16 GB | 32 GB |
| Disque SSD | 100 GB | 200 GB | 500 GB |
| Bande passante | 1 TB/mois | 5 TB/mois | Illimité |

### Logiciels requis

- **OS :** Ubuntu 22.04 LTS ou 24.04 LTS
- **Docker** : 24.0+
- **Docker Compose** : v2.20+
- **Traefik** (recommandé) ou **Nginx** pour reverse proxy + SSL
- **Cloudflare Tunnel** (optionnel, sécurité accrue)
- **Fail2ban** + UFW configurés
- **Sauvegardes automatisées** (Restic + Backblaze B2 / S3 recommandé)

### Sécurité minimale

- [ ] SSH par clé uniquement (pas de mot de passe)
- [ ] UFW : seuls 22, 80, 443 ouverts
- [ ] Fail2ban actif
- [ ] Toutes les APIs (LiteLLM, Presidio, Langfuse ingestion) protégées par tokens et **whitelist IP InsForge**
- [ ] SSL Let's Encrypt sur tous les sous-domaines
- [ ] Secrets dans `.env` chiffrés (jamais en clair dans le repo)

---

## 1.4 Procédure de déploiement détaillée

> ⚠️ Toutes les commandes sont à exécuter sur votre VPS. Adaptez les chemins selon votre arborescence.

### Étape 1 — Préparation du serveur

```bash
# Mise à jour
sudo apt update && sudo apt upgrade -y

# Outils de base
sudo apt install -y docker.io docker-compose-plugin ufw fail2ban git curl jq

# Firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Arborescence
sudo mkdir -p /opt/wimrux-ai/{traefik,litellm,langfuse,presidio,zep,tei,ollama,backups}
sudo chown -R $USER:$USER /opt/wimrux-ai
cd /opt/wimrux-ai
```

### Étape 2 — Traefik (reverse proxy + SSL)

Créez `/opt/wimrux-ai/traefik/docker-compose.yml` :

```yaml
version: "3.9"
services:
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    command:
      - --api.dashboard=true
      - --providers.docker=true
      - --providers.docker.exposedbydefault=false
      - --entrypoints.web.address=:80
      - --entrypoints.web.http.redirections.entryPoint.to=websecure
      - --entrypoints.web.http.redirections.entryPoint.scheme=https
      - --entrypoints.websecure.address=:443
      - --certificatesresolvers.le.acme.email=admin@wimrux.com
      - --certificatesresolvers.le.acme.storage=/letsencrypt/acme.json
      - --certificatesresolvers.le.acme.tlschallenge=true
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./letsencrypt:/letsencrypt
    networks:
      - wimrux-ai

networks:
  wimrux-ai:
    external: true
```

```bash
docker network create wimrux-ai
cd /opt/wimrux-ai/traefik && docker compose up -d
```

### Étape 3 — LiteLLM Proxy

Créez `/opt/wimrux-ai/litellm/.env` :

```env
# Master key (gardez secret, à partager avec ai-router uniquement)
LITELLM_MASTER_KEY=sk-litellm-master-CHANGEZ_MOI_64_CHARS_RANDOM

# PostgreSQL
DATABASE_URL=postgresql://litellm:STRONG_PASSWORD@litellm-db:5432/litellm

# UI
UI_USERNAME=admin
UI_PASSWORD=CHANGEZ_MOI_STRONG

# Clés des providers (vos clés plateforme — celles qui alimentent le quota inclus)
OPENROUTER_API_KEY=sk-or-v1-VOTRE_CLE
ANTHROPIC_API_KEY=sk-ant-VOTRE_CLE
OPENAI_API_KEY=sk-VOTRE_CLE
MISTRAL_API_KEY=VOTRE_CLE
GOOGLE_API_KEY=VOTRE_CLE
DEEPSEEK_API_KEY=VOTRE_CLE
GROQ_API_KEY=VOTRE_CLE

# Intégration Langfuse (tracing automatique)
LANGFUSE_PUBLIC_KEY=pk-lf-A_REMPLACER
LANGFUSE_SECRET_KEY=sk-lf-A_REMPLACER
LANGFUSE_HOST=https://langfuse.wimrux.com
```

Créez `/opt/wimrux-ai/litellm/config.yaml` :

```yaml
model_list:
  # === Modèles premium ===
  - model_name: claude-sonnet-4.5
    litellm_params:
      model: openrouter/anthropic/claude-sonnet-4.5
      api_key: os.environ/OPENROUTER_API_KEY

  - model_name: claude-haiku
    litellm_params:
      model: openrouter/anthropic/claude-haiku-4
      api_key: os.environ/OPENROUTER_API_KEY

  - model_name: gpt-4o
    litellm_params:
      model: openrouter/openai/gpt-4o
      api_key: os.environ/OPENROUTER_API_KEY

  - model_name: gpt-4o-mini
    litellm_params:
      model: openrouter/openai/gpt-4o-mini
      api_key: os.environ/OPENROUTER_API_KEY

  - model_name: mistral-large
    litellm_params:
      model: openrouter/mistralai/mistral-large
      api_key: os.environ/OPENROUTER_API_KEY

  - model_name: gemini-2.0-flash
    litellm_params:
      model: openrouter/google/gemini-2.0-flash-001
      api_key: os.environ/OPENROUTER_API_KEY

  # === Modèles low-cost (default fallback) ===
  - model_name: deepseek-chat
    litellm_params:
      model: openrouter/deepseek/deepseek-chat
      api_key: os.environ/OPENROUTER_API_KEY

litellm_settings:
  drop_params: true
  set_verbose: false
  cache: true
  cache_params:
    type: redis
    host: litellm-redis
    port: 6379
  success_callback: ["langfuse"]
  failure_callback: ["langfuse"]

router_settings:
  routing_strategy: simple-shuffle
  fallbacks:
    - claude-sonnet-4.5: ["claude-haiku", "gpt-4o-mini"]
    - gpt-4o: ["claude-haiku", "gpt-4o-mini"]

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/DATABASE_URL
  store_model_in_db: true
  alerting: ["slack"]
  proxy_budget_rescheduler_min_time: 597
  proxy_budget_rescheduler_max_time: 605
```

Créez `/opt/wimrux-ai/litellm/docker-compose.yml` :

```yaml
version: "3.9"
services:
  litellm:
    image: ghcr.io/berriai/litellm:main-stable
    container_name: litellm
    restart: unless-stopped
    command: ["--config", "/app/config.yaml", "--port", "4000", "--num_workers", "4"]
    env_file: .env
    volumes:
      - ./config.yaml:/app/config.yaml:ro
    depends_on:
      - litellm-db
      - litellm-redis
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.litellm.rule=Host(`litellm.wimrux.com`)"
      - "traefik.http.routers.litellm.entrypoints=websecure"
      - "traefik.http.routers.litellm.tls.certresolver=le"
      - "traefik.http.services.litellm.loadbalancer.server.port=4000"
    networks:
      - wimrux-ai

  litellm-db:
    image: postgres:16-alpine
    container_name: litellm-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: litellm
      POSTGRES_PASSWORD: STRONG_PASSWORD
      POSTGRES_DB: litellm
    volumes:
      - litellm_db_data:/var/lib/postgresql/data
    networks:
      - wimrux-ai

  litellm-redis:
    image: redis:7-alpine
    container_name: litellm-redis
    restart: unless-stopped
    networks:
      - wimrux-ai

volumes:
  litellm_db_data:

networks:
  wimrux-ai:
    external: true
```

```bash
cd /opt/wimrux-ai/litellm && docker compose up -d
```

**Vérification :**
```bash
curl https://litellm.wimrux.com/health -H "Authorization: Bearer $LITELLM_MASTER_KEY"
```

### Étape 4 — Langfuse

Téléchargez le docker-compose officiel :

```bash
cd /opt/wimrux-ai/langfuse
curl -L https://raw.githubusercontent.com/langfuse/langfuse/main/docker-compose.yml -o docker-compose.yml
```

Créez `.env` :

```env
NEXTAUTH_SECRET=CHANGEZ_MOI_64_CHARS_RANDOM
SALT=CHANGEZ_MOI_64_CHARS_RANDOM
ENCRYPTION_KEY=CHANGEZ_MOI_64_CHARS_HEX

NEXTAUTH_URL=https://langfuse.wimrux.com
DATABASE_URL=postgresql://postgres:STRONG@postgres:5432/postgres

CLICKHOUSE_URL=http://clickhouse:8123
CLICKHOUSE_USER=clickhouse
CLICKHOUSE_PASSWORD=STRONG

REDIS_HOST=redis
REDIS_PORT=6379

LANGFUSE_S3_EVENT_UPLOAD_BUCKET=langfuse
LANGFUSE_S3_EVENT_UPLOAD_REGION=auto
LANGFUSE_S3_EVENT_UPLOAD_ACCESS_KEY_ID=minioadmin
LANGFUSE_S3_EVENT_UPLOAD_SECRET_ACCESS_KEY=minioadmin
LANGFUSE_S3_EVENT_UPLOAD_ENDPOINT=http://minio:9000
LANGFUSE_S3_EVENT_UPLOAD_FORCE_PATH_STYLE=true

# Désactiver l'inscription publique (organisation interne uniquement)
AUTH_DISABLE_SIGNUP=true
```

Ajustez le docker-compose.yml pour intégrer Traefik et démarrez :

```bash
cd /opt/wimrux-ai/langfuse && docker compose up -d
```

**Post-déploiement :**
1. Allez sur https://langfuse.wimrux.com
2. Créez le compte admin (premier compte = admin)
3. Créez une **Organisation** "WIMRUX"
4. Créez un **Project** "wimrux-finances"
5. Générez une paire de clés API : `pk-lf-...` + `sk-lf-...`
6. Remettez ces clés dans `litellm/.env` et redémarrez LiteLLM

### Étape 5 — Presidio

Créez `/opt/wimrux-ai/presidio/docker-compose.yml` :

```yaml
version: "3.9"
services:
  presidio-analyzer:
    image: mcr.microsoft.com/presidio-analyzer:latest
    container_name: presidio-analyzer
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.presidio-analyzer.rule=Host(`presidio.wimrux.com`) && PathPrefix(`/analyze`)"
      - "traefik.http.routers.presidio-analyzer.entrypoints=websecure"
      - "traefik.http.routers.presidio-analyzer.tls.certresolver=le"
      - "traefik.http.services.presidio-analyzer.loadbalancer.server.port=3000"
      - "traefik.http.routers.presidio-analyzer.middlewares=presidio-auth"
      - "traefik.http.middlewares.presidio-auth.basicauth.users=admin:$$apr1$$HASH"
    networks:
      - wimrux-ai

  presidio-anonymizer:
    image: mcr.microsoft.com/presidio-anonymizer:latest
    container_name: presidio-anonymizer
    restart: unless-stopped
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.presidio-anonymizer.rule=Host(`presidio.wimrux.com`) && PathPrefix(`/anonymize`)"
      - "traefik.http.routers.presidio-anonymizer.entrypoints=websecure"
      - "traefik.http.routers.presidio-anonymizer.tls.certresolver=le"
      - "traefik.http.services.presidio-anonymizer.loadbalancer.server.port=3000"
    networks:
      - wimrux-ai

networks:
  wimrux-ai:
    external: true
```

```bash
cd /opt/wimrux-ai/presidio && docker compose up -d
```

**Test :**
```bash
curl -X POST https://presidio.wimrux.com/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Le client Marie Dupont (IFU 13456789B) a payé 50000 FCFA depuis +22670123456",
    "language": "fr"
  }'
```

### Étape 6 — Zep (P2, optionnel court terme)

```bash
cd /opt/wimrux-ai/zep
git clone https://github.com/getzep/zep.git .
cp .env.example .env
# Éditez .env : OPENAI_API_KEY (ou laisser vide pour summarizer local)
docker compose up -d
```

### Étape 7 — TEI (P3)

```bash
docker run -d --name tei \
  --network wimrux-ai \
  -e MODEL_ID=BAAI/bge-m3 \
  --label "traefik.enable=true" \
  --label "traefik.http.routers.tei.rule=Host(\`embeddings.wimrux.com\`)" \
  --label "traefik.http.routers.tei.tls.certresolver=le" \
  --label "traefik.http.services.tei.loadbalancer.server.port=80" \
  ghcr.io/huggingface/text-embeddings-inference:cpu-latest
```

---

## 1.5 Configuration post-déploiement

### Checklist de validation

- [ ] Tous les services répondent en HTTPS sur leur sous-domaine
- [ ] Certificats SSL Let's Encrypt valides (vérifier `https://www.ssllabs.com/ssltest/`)
- [ ] LiteLLM `/health` répond `OK`
- [ ] Langfuse UI accessible + projet "wimrux-finances" créé
- [ ] Presidio `/analyze` répond correctement en français
- [ ] Tests cross-service : un appel LiteLLM doit créer une trace dans Langfuse
- [ ] Whitelist IP : seules les IPs d'InsForge peuvent atteindre LiteLLM et Presidio
- [ ] Sauvegardes automatiques configurées (DB LiteLLM, DB Langfuse, Postgres Zep)
- [ ] Monitoring : Uptime Kuma ou équivalent surveille tous les endpoints
- [ ] Alertes : email/SMS si un service tombe

### Whitelist IP InsForge

Récupérez les IPs sortantes de votre instance InsForge (depuis le dashboard ou support) et ajoutez-les à Traefik en middleware :

```yaml
- "traefik.http.middlewares.ipwhitelist.ipallowlist.sourcerange=A.B.C.D/32,E.F.G.H/32"
```

### Sauvegardes (à automatiser)

```bash
#!/bin/bash
# /opt/wimrux-ai/backups/backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/opt/wimrux-ai/backups/$DATE
mkdir -p $BACKUP_DIR

# LiteLLM DB
docker exec litellm-db pg_dump -U litellm litellm | gzip > $BACKUP_DIR/litellm.sql.gz

# Langfuse DB
docker exec langfuse-postgres pg_dump -U postgres postgres | gzip > $BACKUP_DIR/langfuse.sql.gz

# Upload vers Backblaze B2 / S3 (avec restic)
restic -r b2:wimrux-backups:ai backup $BACKUP_DIR

# Rétention 30 jours
find /opt/wimrux-ai/backups -type d -mtime +7 -exec rm -rf {} +
```

Cron : `0 3 * * * /opt/wimrux-ai/backups/backup.sh`

---

## 1.6 Données à transmettre aux agents codeurs

> 🎯 **Section critique.** Une fois le déploiement terminé, vous devez fournir aux agents codeurs **exactement** ce bloc d'informations dans un fichier `.env` ou dans le système de secrets de votre IDE.

### Bloc 1 — Endpoints services

```env
# LiteLLM Gateway (porte d'entrée IA principale)
LITELLM_BASE_URL=https://litellm.wimrux.com
LITELLM_MASTER_KEY=sk-litellm-master-XXXXXXXXXXXX

# Langfuse Observability
LANGFUSE_PUBLIC_KEY=pk-lf-XXXXXXXXXXXX
LANGFUSE_SECRET_KEY=sk-lf-XXXXXXXXXXXX
LANGFUSE_HOST=https://langfuse.wimrux.com

# Presidio PII
PRESIDIO_ANALYZER_URL=https://presidio.wimrux.com/analyze
PRESIDIO_ANONYMIZER_URL=https://presidio.wimrux.com/anonymize
PRESIDIO_AUTH_HEADER=Basic XXXXXXXXXXXX

# Dify (si déjà déployé)
DIFY_BASE_URL=https://dify.wimrux.com
DIFY_API_KEY=app-XXXXXXXXXXXX
DIFY_WORKFLOW_IDS={"assistant_fiscal":"wf-abc","reconciliation":"wf-def"}

# Stirling AI (si déjà déployé)
STIRLING_BASE_URL=https://stirling.wimrux.com
STIRLING_API_KEY=XXXXXXXXXXXX

# Zep (P2)
ZEP_API_URL=https://zep.wimrux.com
ZEP_API_KEY=XXXXXXXXXXXX

# TEI Embeddings (P3)
TEI_BASE_URL=https://embeddings.wimrux.com

# Ollama (P3)
OLLAMA_BASE_URL=https://ollama.wimrux.com
```

### Bloc 2 — Catalogue de modèles disponibles via LiteLLM

| Nom logique LiteLLM | Provider réel | Coût input ($/M tokens) | Coût output ($/M tokens) | Usage recommandé |
|---|---|---|---|---|
| `claude-sonnet-4.5` | OpenRouter/Anthropic | 3.00 | 15.00 | Assistants conversationnels, raisonnement complexe |
| `claude-haiku` | OpenRouter/Anthropic | 0.80 | 4.00 | Classifications, OCR validation |
| `gpt-4o` | OpenRouter/OpenAI | 2.50 | 10.00 | Polyvalence |
| `gpt-4o-mini` | OpenRouter/OpenAI | 0.15 | 0.60 | Tâches simples, fallback |
| `mistral-large` | OpenRouter/Mistral | 2.00 | 6.00 | Français, conformité EU |
| `gemini-2.0-flash` | OpenRouter/Google | 0.10 | 0.40 | Multimodal, OCR images |
| `deepseek-chat` | OpenRouter/DeepSeek | 0.27 | 1.10 | Économique, raisonnement |

> ⚠️ Mettez à jour ces coûts régulièrement — ils sont stockés en BDD (`ai_models.cost_input_usd_per_million`).

### Bloc 3 — Mapping recommandé `ai_tasks.code` ↔ modèle par défaut

À insérer dans la table `ai_models_default_routing` (voir Partie 2) :

| ai_task.code | Modèle par défaut | Fallback |
|---|---|---|
| `assistant_fiscal` | `claude-sonnet-4.5` | `gpt-4o-mini` |
| `assistant_comptable` | `claude-sonnet-4.5` | `gpt-4o-mini` |
| `classification_depense` | `claude-haiku` | `gpt-4o-mini` |
| `classification_facture` | `claude-haiku` | `gpt-4o-mini` |
| `ocr_supplier_invoice` | `gemini-2.0-flash` | `claude-haiku` |
| `ocr_receipt` | `gemini-2.0-flash` | `claude-haiku` |
| `ocr_bank_statement` | `claude-sonnet-4.5` | `gpt-4o` |
| `ocr_payment_evidence` | `gemini-2.0-flash` | `claude-haiku` |
| `ingest_image_payment` | `gemini-2.0-flash` | `claude-haiku` |
| `text_payment_extraction` | `claude-haiku` | `gpt-4o-mini` |
| `sms_parsing` | `gpt-4o-mini` | `claude-haiku` |
| `email_payment_parsing` | `claude-haiku` | `gpt-4o-mini` |
| `reconciliation_suggestion` | `claude-sonnet-4.5` | `gpt-4o` |
| `reconciliation_batch` | `claude-haiku` | `gpt-4o-mini` |
| `cashflow_forecast` | `claude-sonnet-4.5` | `gpt-4o` |
| `revenue_forecast` | `claude-sonnet-4.5` | `gpt-4o` |
| `budget_variance_analysis` | `claude-sonnet-4.5` | `gpt-4o` |
| `aging_balance_analysis` | `claude-haiku` | `gpt-4o-mini` |
| `detection_anomalie` | `claude-haiku` | `gpt-4o-mini` |
| `detection_fraude` | `claude-sonnet-4.5` | `gpt-4o` |
| `detection_doublon` | `gpt-4o-mini` | `deepseek-chat` |
| `report_summary` | `claude-haiku` | `gpt-4o-mini` |
| `monthly_briefing` | `claude-sonnet-4.5` | `gpt-4o` |
| `email_draft` | `claude-haiku` | `gpt-4o-mini` |
| `reminder_message_personalization` | `claude-haiku` | `gpt-4o-mini` |
| `nl_to_sql` | `claude-sonnet-4.5` | `gpt-4o` |
| `semantic_search` | `embeddings-bge-m3` (TEI) | `text-embedding-3-small` |
| `compliance_check_invoice` | `claude-sonnet-4.5` | `gpt-4o` |
| `compliance_check_supplier` | `claude-haiku` | `gpt-4o-mini` |
| `kyc_risk_scoring` | `claude-sonnet-4.5` | `gpt-4o` |
| `translation` | `gpt-4o-mini` | `claude-haiku` |
| `label_normalization` | `gpt-4o-mini` | `deepseek-chat` |
| `suggestion_fiscale` | `claude-sonnet-4.5` | `gpt-4o` |
| `suggestion_tresorerie` | `claude-sonnet-4.5` | `gpt-4o` |
| `suggestion_paiement` | `claude-haiku` | `gpt-4o-mini` |
| `ocr_check` | `gemini-2.0-flash` | `claude-haiku` |
| `ocr_identity_doc` | `gemini-2.0-flash` | `claude-sonnet-4.5` |

### Bloc 4 — IDs Dify (workflows existants)

Si Dify est déjà déployé, listez les workflows existants :

```json
{
  "workflows": [
    {"id": "wf-xxx", "name": "Assistant Fiscal Burkina", "task_code": "assistant_fiscal"},
    {"id": "wf-yyy", "name": "Réconciliation auto", "task_code": "reconciliation_batch"}
  ]
}
```

### Bloc 5 — Quotas par plan d'abonnement (USD/mois)

| Plan | `ai_monthly_cost_usd_cap` | Tâches autorisées | BYOK autorisé ? |
|---|---|---|---|
| `free` | 1.00 | Limité (5 tâches basiques) | Non |
| `starter` | 10.00 | 15 tâches | Oui (sur clés Anthropic/OpenAI) |
| `pro` | 50.00 | Toutes sauf premium | Oui |
| `business` | 200.00 | Toutes | Oui |
| `enterprise` | Illimité | Toutes + workflows custom | Oui |

### Bloc 6 — Pricing crédits IA (achat en surplus)

| Pack crédits | Prix XOF | Équivalent USD IA |
|---|---|---|
| Pack S | 3 000 XOF | 5 USD |
| Pack M | 15 000 XOF | 25 USD |
| Pack L | 50 000 XOF | 90 USD |
| Pack XL | 150 000 XOF | 300 USD |

> 💡 Marge plateforme : ~15-25 % sur le coût brut LLM.

---

# PARTIE 2 — SPÉCIFICATION POUR AGENTS CODEURS

> Cette partie est à coller dans le contexte des agents codeurs (Claude Code, Codex, Cursor, etc.). Elle décrit **exactement quoi développer** dans WIMRUX Finances pour utiliser l'infrastructure déployée en Partie 1.

---

## 2.1 Contexte produit

### Ce que vous (l'agent) devez savoir

- **Produit :** WIMRUX Finances — plateforme SaaS de gestion financière pour PME en CEDEAO/UEMOA
- **Stack :** Quasar 2 (Vue 3 + TS) frontend, InsForge BaaS backend (PostgreSQL + PostgREST + Edge Functions Deno)
- **Multi-tenant :** isolation stricte par `company_id` via RLS PostgreSQL
- **Backend URL :** `https://gfe4bd9y.eu-central.insforge.app`
- **Langue UI :** Français (CEDEAO francophone) + anglais (Nigeria, Ghana, Liberia, Sierra Leone) + portugais (Guinée-Bissau, Cap-Vert)

### Composants infrastructure IA disponibles (déjà déployés par l'opérateur)

L'opérateur vous fournira un fichier `.env` avec les credentials des services suivants (voir Partie 1, Bloc 1). **Vous n'avez pas à les déployer**, vous devez **les consommer**.

| Service | URL exemple | Rôle |
|---|---|---|
| LiteLLM | `https://litellm.wimrux.com` | Gateway unifié vers tous les LLMs |
| Langfuse | `https://langfuse.wimrux.com` | Observabilité automatique via LiteLLM |
| Presidio | `https://presidio.wimrux.com` | Anonymisation PII |
| Dify | `https://dify.wimrux.com` | Workflows IA visuels |
| Stirling AI | `https://stirling.wimrux.com` | Workflows alternatifs |
| Zep | `https://zep.wimrux.com` | Mémoire long terme |
| TEI | `https://embeddings.wimrux.com` | Embeddings self-hosted |

---

## 2.2 Modèle économique IA — Règles de routage

### Trois sources de financement IA possibles par tenant

À chaque appel IA, le système doit déterminer **quelle source de fonds utilise le tenant** :

#### Source A — Quota plateforme inclus dans l'abonnement

- Définie par `subscription_plans.ai_monthly_cost_usd_cap`
- Consommée en premier (par défaut)
- Reset le 1er de chaque mois
- Suivie dans `company_ai_quota_usage` (cumul mensuel)

#### Source B — Crédits IA achetés (top-up)

- Le tenant achète des packs de crédits (table `ai_credit_packs` puis `company_ai_credits`)
- Utilisée **après épuisement** du quota plateforme
- Solde permanent (pas de reset mensuel)
- Visible en temps réel dans le panneau tenant

#### Source C — BYOK (Bring Your Own Key)

- Le tenant configure ses propres clés API (Anthropic, OpenAI, OpenRouter, Mistral...)
- Stockées chiffrées dans `company_ai_credentials`
- Sélectionnable par tâche (`company_ai_task_routing`) ou globalement
- **Aucun débit** sur quota plateforme ni crédits

### Logique de routage (ordre de priorité)

```
1. La tâche est-elle autorisée pour le plan du tenant ?
   ├── NON → Refuser (HTTP 403) + suggérer upgrade
   └── OUI → Continuer

2. Le tenant a-t-il configuré BYOK pour cette tâche ?
   ├── OUI → Utiliser ses clés (route directe via LiteLLM avec ses credentials)
   └── NON → Continuer

3. Le tenant a-t-il du quota plateforme restant ce mois-ci ?
   ├── OUI → Utiliser quota plateforme
   └── NON → Continuer

4. Le tenant a-t-il des crédits IA achetés ?
   ├── OUI → Décrémenter crédits
   └── NON → Refuser (HTTP 402 Payment Required) + proposer achat crédits ou BYOK
```

### Estimation pré-appel obligatoire

Avant tout appel, estimer le coût en tokens (input + output max prévu) × prix unitaire du modèle. Si l'estimation dépasse le solde restant → refuser avant l'appel.

---

## 2.3 Tables à créer (migrations SQL)

> ⚠️ Toutes les tables suivent les conventions WIMRUX :
> - `company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE` pour les tables tenant
> - RLS activée avec `company_id = get_user_company_id()` + `project_admin_policy`
> - Trigger d'audit `trg_audit_<table>` AFTER INSERT/UPDATE/DELETE → `log_audit_changes()`
> - `created_at`, `updated_at` avec triggers automatiques
> - Champs chiffrés pour secrets : préfixés `encrypted_` + IV + cipher AES-256-GCM

### Table 1 — `ai_credit_packs` (catalogue global)

```sql
CREATE TABLE IF NOT EXISTS ai_credit_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  ai_credit_usd NUMERIC(10,2) NOT NULL,
  price_xof NUMERIC(12,0) NOT NULL,
  price_usd NUMERIC(10,2),
  is_active BOOLEAN DEFAULT true,
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seeds initiaux
INSERT INTO ai_credit_packs (code, name, ai_credit_usd, price_xof, price_usd) VALUES
  ('pack_s', 'Pack S — 5 $', 5.00, 3000, 5.50),
  ('pack_m', 'Pack M — 25 $', 25.00, 15000, 27.00),
  ('pack_l', 'Pack L — 90 $', 90.00, 50000, 90.00),
  ('pack_xl', 'Pack XL — 300 $', 300.00, 150000, 270.00)
ON CONFLICT (code) DO UPDATE
  SET ai_credit_usd = EXCLUDED.ai_credit_usd,
      price_xof = EXCLUDED.price_xof,
      price_usd = EXCLUDED.price_usd,
      updated_at = now();
```

### Table 2 — `company_ai_credits` (solde par tenant)

```sql
CREATE TABLE IF NOT EXISTS company_ai_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  balance_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
  total_purchased_usd NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_consumed_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE company_ai_credits ENABLE ROW LEVEL SECURITY;
-- + politiques RLS standards
```

### Table 3 — `ai_credit_transactions` (historique achats + consos)

```sql
CREATE TABLE IF NOT EXISTS ai_credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('purchase', 'consumption', 'refund', 'adjustment', 'bonus')),
  pack_id UUID REFERENCES ai_credit_packs(id),
  amount_usd NUMERIC(12,4) NOT NULL,
  balance_before NUMERIC(12,4),
  balance_after NUMERIC(12,4),
  payment_provider_id UUID REFERENCES payment_providers(id),
  payment_reference TEXT,
  related_usage_log_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Table 4 — `company_ai_quota_usage` (consommation mensuelle quota plateforme)

```sql
CREATE TABLE IF NOT EXISTS company_ai_quota_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_month DATE NOT NULL,
  quota_cap_usd NUMERIC(12,4) NOT NULL,
  consumed_usd NUMERIC(12,4) NOT NULL DEFAULT 0,
  remaining_usd NUMERIC(12,4) GENERATED ALWAYS AS (quota_cap_usd - consumed_usd) STORED,
  is_exhausted BOOLEAN GENERATED ALWAYS AS (consumed_usd >= quota_cap_usd) STORED,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, period_month)
);
```

### Table 5 — `ai_usage_logs` (log détaillé de chaque appel)

```sql
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  task_id UUID REFERENCES ai_tasks(id),
  task_code TEXT,
  ai_provider_id UUID REFERENCES ai_providers(id),
  ai_model_id UUID REFERENCES ai_models(id),
  model_name TEXT,
  funding_source TEXT NOT NULL CHECK (funding_source IN ('platform_quota', 'platform_credits', 'byok')),
  tokens_input INT,
  tokens_output INT,
  tokens_total INT GENERATED ALWAYS AS (COALESCE(tokens_input,0) + COALESCE(tokens_output,0)) STORED,
  cost_usd NUMERIC(12,6) NOT NULL DEFAULT 0,
  cost_billed_usd NUMERIC(12,6),
  margin_usd NUMERIC(12,6) GENERATED ALWAYS AS (COALESCE(cost_billed_usd,0) - cost_usd) STORED,
  latency_ms INT,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout', 'rate_limited', 'quota_exceeded')),
  error_code TEXT,
  error_message TEXT,
  langfuse_trace_id TEXT,
  litellm_request_id TEXT,
  request_metadata JSONB,
  response_metadata JSONB,
  pii_redacted BOOLEAN DEFAULT false,
  pii_entities_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_ai_usage_logs_company_period ON ai_usage_logs(company_id, created_at);
CREATE INDEX idx_ai_usage_logs_task_code ON ai_usage_logs(task_code);
CREATE INDEX idx_ai_usage_logs_status ON ai_usage_logs(status) WHERE status != 'success';
```

### Table 6 — `ai_models_default_routing` (mapping global ai_task → modèle)

```sql
CREATE TABLE IF NOT EXISTS ai_models_default_routing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES ai_tasks(id) ON DELETE CASCADE,
  task_code TEXT NOT NULL,
  primary_model_name TEXT NOT NULL,
  fallback_model_name TEXT,
  max_tokens_output INT DEFAULT 2048,
  temperature NUMERIC(3,2) DEFAULT 0.3,
  requires_pii_redaction BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_code)
);
```

### Table 7 — `company_ai_task_routing` (override par tenant)

```sql
CREATE TABLE IF NOT EXISTS company_ai_task_routing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES ai_tasks(id) ON DELETE CASCADE,
  task_code TEXT NOT NULL,
  override_model_name TEXT,
  use_byok BOOLEAN DEFAULT false,
  byok_credential_id UUID REFERENCES company_ai_credentials(id),
  workflow_provider TEXT CHECK (workflow_provider IN ('direct', 'dify', 'stirling', 'langflow', 'flowise')),
  workflow_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, task_id)
);
```

### Table 8 — `company_ai_credentials` (BYOK chiffré)

```sql
CREATE TABLE IF NOT EXISTS company_ai_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  ai_provider_id UUID NOT NULL REFERENCES ai_providers(id),
  provider_code TEXT NOT NULL,
  label TEXT,
  encrypted_api_key BYTEA NOT NULL,
  iv BYTEA NOT NULL,
  cipher_algo TEXT DEFAULT 'aes-256-gcm',
  last_4_chars TEXT,
  custom_base_url TEXT,
  is_active BOOLEAN DEFAULT true,
  validated_at TIMESTAMPTZ,
  validation_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Table 9 — `pii_redaction_rules` (configuration anonymisation)

```sql
CREATE TABLE IF NOT EXISTS pii_redaction_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL = règle globale
  entity_type TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  replacement_strategy TEXT CHECK (replacement_strategy IN ('mask', 'replace', 'redact', 'hash', 'keep')),
  replacement_value TEXT,
  applies_to_tasks JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Table 10 — `ai_admin_settings` (paramétrage global panneau admin SaaS)

```sql
CREATE TABLE IF NOT EXISTS ai_admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  is_secret BOOLEAN DEFAULT false,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO ai_admin_settings (key, value, description) VALUES
  ('litellm_base_url', '"https://litellm.wimrux.com"', 'Base URL du gateway LiteLLM'),
  ('langfuse_host', '"https://langfuse.wimrux.com"', 'Host Langfuse pour observabilité'),
  ('presidio_analyzer_url', '"https://presidio.wimrux.com/analyze"', 'URL Presidio analyzer'),
  ('presidio_anonymizer_url', '"https://presidio.wimrux.com/anonymize"', 'URL Presidio anonymizer'),
  ('default_pii_redaction_enabled', 'true', 'PII redaction activée par défaut'),
  ('platform_margin_percent', '20', 'Marge plateforme sur coût brut LLM (%)'),
  ('quota_reset_day', '1', 'Jour du mois pour reset quota (1-28)'),
  ('low_credit_warning_threshold_usd', '1.0', 'Seuil alerte crédits faibles'),
  ('byok_validation_required', 'true', 'Forcer validation des clés BYOK avant activation')
ON CONFLICT (key) DO NOTHING;
```

---

## 2.4 Edge Function `ai-router`

### Rôle

Orchestrateur unique qui :
1. Reçoit toutes les requêtes IA du frontend Quasar
2. Authentifie + récupère `company_id`
3. Détermine le routage (BYOK / quota / crédits)
4. Anonymise PII si requis
5. Appelle LiteLLM (ou Dify/Stirling pour workflows)
6. Enregistre `ai_usage_logs`
7. Met à jour solde (quota ou crédits)
8. Retourne la réponse au frontend

### Endpoint

```
POST https://gfe4bd9y.eu-central.insforge.app/functions/v1/ai-router
```

### Payload requête

```typescript
interface AIRouterRequest {
  task_code: string;           // ex: "assistant_fiscal"
  input: {
    messages?: Array<{role: string, content: string}>;
    text?: string;
    image_url?: string;
    file_url?: string;
    metadata?: Record<string, any>;
  };
  options?: {
    model_override?: string;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    session_id?: string;       // pour Zep memory
    skip_pii_redaction?: boolean;
  };
}
```

### Réponse

```typescript
interface AIRouterResponse {
  success: boolean;
  data?: {
    content: string;
    tokens_input: number;
    tokens_output: number;
    model_used: string;
    funding_source: 'platform_quota' | 'platform_credits' | 'byok';
    cost_usd: number;
    latency_ms: number;
    langfuse_trace_url?: string;
  };
  error?: {
    code: 'quota_exhausted' | 'no_credits' | 'task_not_allowed' | 'byok_invalid' | 'pii_error' | 'llm_error';
    message: string;
    suggested_action?: 'upgrade_plan' | 'buy_credits' | 'add_byok';
  };
  usage: {
    quota_remaining_usd: number;
    credits_balance_usd: number;
    period_end: string;
  };
}
```

### Algorithme (pseudo-code)

```typescript
async function aiRouter(req: AIRouterRequest, ctx: Context) {
  // 1. Auth + company
  const user = await verifyJWT(ctx.headers.authorization);
  const company = await db.getCompany(user.company_id);
  const plan = await db.getSubscription(company.id);

  // 2. Charger task + vérifier allowance
  const task = await db.getAITask(req.task_code);
  if (!isTaskAllowedForPlan(task, plan)) {
    return error('task_not_allowed', { suggested_action: 'upgrade_plan' });
  }

  // 3. Déterminer routing
  const routing = await resolveRouting(company.id, task.id);
  // routing = { source: 'byok'|'quota'|'credits', model, workflow_provider, byok_creds }

  // 4. Vérifier solde
  if (routing.source === 'quota') {
    const usage = await db.getQuotaUsage(company.id, currentMonth());
    if (usage.is_exhausted) {
      // Fallback automatique sur crédits
      const credits = await db.getCredits(company.id);
      if (credits.balance_usd <= 0) {
        return error('quota_exhausted', { suggested_action: 'buy_credits' });
      }
      routing.source = 'credits';
    }
  }

  // 5. PII redaction
  let processedInput = req.input;
  let piiRedacted = false;
  let piiCount = 0;
  if (shouldRedactPII(task, routing) && !req.options?.skip_pii_redaction) {
    const result = await presidio.anonymize(processedInput);
    processedInput = result.anonymized;
    piiRedacted = true;
    piiCount = result.entities_count;
  }

  // 6. Choisir clés (BYOK ou plateforme)
  const apiKey = routing.source === 'byok'
    ? await decryptBYOK(routing.byok_creds)
    : process.env.LITELLM_MASTER_KEY;

  // 7. Appel LiteLLM (ou Dify si workflow)
  const startTime = Date.now();
  let response;
  try {
    if (routing.workflow_provider === 'dify') {
      response = await callDify(routing.workflow_id, processedInput, apiKey);
    } else if (routing.workflow_provider === 'stirling') {
      response = await callStirling(routing.workflow_id, processedInput, apiKey);
    } else {
      response = await callLiteLLM(routing.model, processedInput, apiKey, {
        metadata: {
          company_id: company.id,
          user_id: user.id,
          task_code: task.code,
          funding_source: routing.source,
        },
        trace_name: `${task.code}-${company.id.substring(0,8)}`,
      });
    }
  } catch (err) {
    await logUsage({ status: 'error', error_message: err.message, /*...*/ });
    return error('llm_error', { message: err.message });
  }
  const latency = Date.now() - startTime;

  // 8. Calcul coût + marge
  const costBrut = computeCost(routing.model, response.usage);
  const margin = await db.getSetting('platform_margin_percent') / 100;
  const costBilled = routing.source === 'byok' ? 0 : costBrut * (1 + margin);

  // 9. Débiter
  if (routing.source === 'quota') {
    await db.incrementQuotaUsage(company.id, currentMonth(), costBilled);
  } else if (routing.source === 'credits') {
    await db.decrementCredits(company.id, costBilled);
    await db.insertCreditTransaction({
      company_id: company.id, type: 'consumption',
      amount_usd: -costBilled
    });
  }

  // 10. Log
  await db.insertUsageLog({
    company_id: company.id,
    user_id: user.id,
    task_code: task.code,
    model_name: routing.model,
    funding_source: routing.source,
    tokens_input: response.usage.prompt_tokens,
    tokens_output: response.usage.completion_tokens,
    cost_usd: costBrut,
    cost_billed_usd: costBilled,
    latency_ms: latency,
    status: 'success',
    langfuse_trace_id: response.langfuse_trace_id,
    pii_redacted: piiRedacted,
    pii_entities_count: piiCount,
  });

  // 11. Réponse
  return {
    success: true,
    data: {
      content: response.content,
      tokens_input: response.usage.prompt_tokens,
      tokens_output: response.usage.completion_tokens,
      model_used: routing.model,
      funding_source: routing.source,
      cost_usd: costBilled,
      latency_ms: latency,
    },
    usage: await getUsageSnapshot(company.id),
  };
}
```

### Sécurité

- ✅ Jamais exposer `LITELLM_MASTER_KEY` au frontend
- ✅ Toujours valider `task_code` contre `ai_tasks` (whitelist stricte)
- ✅ Rate limit par `user_id` + `company_id` (max 100 req/min)
- ✅ Décryptage BYOK uniquement en mémoire de l'Edge Function
- ✅ Log d'audit complet (`log_audit_changes()` sur `ai_usage_logs`)

---

## 2.5 Panneau Admin SaaS — Paramétrage IA

Le **super-admin WIMRUX** (vous) doit pouvoir tout configurer depuis l'UI Quasar admin (`/admin/ai/`).

### Pages à créer

#### Page 1 — `/admin/ai/dashboard`

Vue d'ensemble globale :
- KPI : appels totaux 24h/7j/30j, coût total $, marge nette, top tenants consommateurs
- Graphiques : usage par jour, par modèle, par tâche, par pays
- Top erreurs récentes
- Lien direct vers Langfuse pour drilldown

#### Page 2 — `/admin/ai/settings`

Édition des `ai_admin_settings` :
- URLs des services (LiteLLM, Langfuse, Presidio, Dify, Stirling, Zep)
- Marge plateforme (%)
- Jour de reset quota (1-28)
- PII redaction par défaut (on/off)
- Toggle BYOK validation

> ⚠️ Modifier ces valeurs ne déploie pas les services — les services doivent déjà tourner. Cet écran ne fait que pointer le code vers les bons endpoints.

#### Page 3 — `/admin/ai/providers`

CRUD `ai_providers` :
- Liste des providers (OpenRouter, Anthropic, OpenAI, Mistral, Dify, Stirling AI...)
- Activer/désactiver
- Configurer base_url et nom logique LiteLLM

#### Page 4 — `/admin/ai/models`

CRUD `ai_models` :
- Liste des modèles disponibles
- Coûts USD/M tokens input/output (à jour manuellement ou via sync API)
- Capacités (vision, function calling, JSON mode)
- Activer/désactiver

#### Page 5 — `/admin/ai/tasks`

CRUD `ai_tasks` (catalogue des 38+ tâches) :
- Code (immutable une fois créé)
- Nom français + anglais + portugais
- Description
- Catégorie (assistant, classification, OCR, prévision...)
- Plans autorisés (free, starter, pro, business, enterprise) — multi-select
- Mots-clés / tags

#### Page 6 — `/admin/ai/default-routing`

CRUD `ai_models_default_routing` :
- Pour chaque tâche : modèle primaire + fallback
- Max tokens output
- Temperature
- PII redaction required (on/off)

> 💡 C'est ici que vous définissez le mapping du Bloc 3 (Partie 1).

#### Page 7 — `/admin/ai/credit-packs`

CRUD `ai_credit_packs` :
- Code, nom, montant USD, prix XOF + autres devises CEDEAO
- Ordre d'affichage
- Activer/désactiver

#### Page 8 — `/admin/ai/subscription-plans`

CRUD `subscription_plans` (alimente la page tarifs) :
- Code, nom, prix XOF/mois
- `ai_monthly_cost_usd_cap`
- Tâches autorisées (multi-select sur `ai_tasks`)
- BYOK autorisé (oui/non)

#### Page 9 — `/admin/ai/pii-rules`

CRUD `pii_redaction_rules` (règles globales) :
- Type d'entité (PERSON, IBAN, PHONE_NUMBER, EMAIL, CREDIT_CARD, IFU_BURKINA, NIF_TOGO...)
- Stratégie (mask, replace, hash, redact, keep)
- Valeur de remplacement
- Tâches concernées

#### Page 10 — `/admin/ai/tenants`

Vue tenant par tenant :
- Liste des companies avec leur consommation
- Drill-down : usage détaillé, BYOK configurés, crédits, alertes
- Actions : adjuster crédits manuellement, forcer reset quota, suspendre IA

### Composants UI réutilisables

- `<AIUsageChart>` : graph time-series via `ai_usage_logs`
- `<AICostBreakdown>` : pie chart coût par modèle/tâche
- `<AIModelSelector>` : select model avec affichage prix
- `<AIRoutingMatrix>` : matrice tâches × modèles éditable
- `<AICreditPackCard>` : carte achat crédit

---

## 2.6 Panneau Tenant — Gestion crédits & BYOK

Le **client final (admin de la company)** doit pouvoir gérer son IA depuis `/settings/ai/`.

### Pages à créer

#### Page 1 — `/settings/ai/usage`

Tableau de bord consommation :
- Quota du mois consommé / restant (jauge + chiffres)
- Solde crédits IA
- Graphique des 30 derniers jours
- Top tâches consommatrices
- Bouton "Acheter des crédits"

#### Page 2 — `/settings/ai/credits/buy`

Achat de packs :
- Cartes des packs disponibles (S/M/L/XL)
- Sélection du provider de paiement (Mobile Money, Carte, Wallet local)
- Réutilise EPIC 24 (`payment_providers`, `payment_wallets`)
- Au paiement réussi → insert `ai_credit_transactions` (type='purchase') + update `company_ai_credits.balance_usd`

#### Page 3 — `/settings/ai/byok`

Gestion BYOK :
- Liste des credentials configurés (provider, label, last_4_chars, status)
- Ajouter une nouvelle clé :
  - Provider (OpenRouter, Anthropic, OpenAI, Mistral, Google...)
  - Label (ex : "Clé Anthropic du CFO")
  - API Key (input password, chiffrée immédiatement côté Edge Function)
  - Base URL custom (optionnel pour Azure, etc.)
- Bouton "Tester" → appel test à l'API pour valider la clé
- Activer/désactiver
- Supprimer

#### Page 4 — `/settings/ai/routing`

Override de routage par tâche :
- Tableau des tâches avec :
  - Modèle plateforme par défaut (read-only)
  - Override modèle (select parmi `ai_models` actifs)
  - Source : Plateforme / BYOK + sélection credential
  - Workflow provider : Direct / Dify / Stirling
- Sauvegarde dans `company_ai_task_routing`

#### Page 5 — `/settings/ai/history`

Historique détaillé :
- Liste paginée `ai_usage_logs` (filtres : date, tâche, statut, modèle)
- Détail au clic : prompt, réponse, tokens, coût, trace Langfuse (lien si admin tenant)

### UX critiques

- **Alerte quota faible** : notification in-app + email quand quota < 20 %
- **Alerte crédits faibles** : idem
- **Bloquant** : avant chaque appel IA, le frontend vérifie via un endpoint léger `/ai/precheck?task_code=X` qu'il y a du budget. Sinon : modale "Acheter crédits / Activer BYOK / Upgrader".
- **Mode dégradé** : si IA indisponible, propose le mode manuel pour la tâche

---

## 2.7 Workflows critiques

### Workflow 1 — Inscription d'un nouveau tenant

```
1. User crée company → row dans companies
2. Auto-création abonnement Free → company_subscriptions
3. Auto-création quota Free → company_ai_quota_usage (1$ pour le mois en cours)
4. Auto-création solde crédits à 0 → company_ai_credits
5. Pas de BYOK par défaut
6. Welcome email mentionnant les 1$ de quota IA offert
```

### Workflow 2 — Achat de pack crédits

```
1. Tenant clique "Acheter pack M" sur /settings/ai/credits/buy
2. Sélection mode paiement → flux EPIC 24 (Mobile Money / Carte)
3. Webhook paiement validé → Edge Function "credit-purchase-callback"
4. Insert ai_credit_transactions (type='purchase', amount_usd=+25)
5. Update company_ai_credits.balance_usd += 25
6. Notif in-app + email confirmation
```

### Workflow 3 — Activation BYOK

```
1. Tenant entre sa clé sur /settings/ai/byok
2. Frontend POST /functions/v1/ai-credential
3. Edge Function :
   a. Chiffre la clé (AES-256-GCM avec clé maître de l'instance)
   b. Insère company_ai_credentials (encrypted_api_key, iv, last_4_chars)
   c. Lance un test (appel "ping" au provider via LiteLLM ou direct)
   d. Met à jour validated_at + validation_error si échec
4. Si validée, affichage status "Active"
```

### Workflow 4 — Appel IA classique (assistant fiscal)

```
1. User pose une question dans l'assistant
2. Frontend appelle /functions/v1/ai-router avec task_code="assistant_fiscal"
3. ai-router exécute l'algorithme (cf 2.4)
4. Réponse streamée (si options.stream=true) ou en bloc
5. UI affiche la réponse + indicateur de coût (ex: "0.012 $ consommés")
6. Log dans ai_usage_logs + trace Langfuse automatique
```

### Workflow 5 — Reset mensuel du quota

```
Edge Function planifiée le 1er de chaque mois à 00:01 UTC :

1. SELECT toutes les companies actives
2. Pour chaque company :
   a. Récupérer subscription_plan.ai_monthly_cost_usd_cap
   b. INSERT INTO company_ai_quota_usage (company_id, period_month, quota_cap_usd)
3. Notification "Votre quota IA a été rechargé"
```

### Workflow 6 — Détection PII et anonymisation

```
1. ai-router reçoit input (texte de facture par ex)
2. Si task.requires_pii_redaction = true ET funding_source != 'byok-self-hosted-ollama' :
   a. POST presidio/analyze → liste d'entités détectées
   b. POST presidio/anonymize avec stratégies de pii_redaction_rules
   c. Remplacer le texte dans messages avant envoi LLM
3. Stocker dans ai_usage_logs : pii_redacted=true, pii_entities_count=N
4. La réponse LLM ne contient que les placeholders ; remapper si nécessaire avant retour user
```

---

## 2.8 Critères d'acceptation

L'agent codeur a terminé son travail quand **tous** ces critères sont validés :

### Sécurité

- [ ] Aucune clé API n'est jamais exposée au frontend
- [ ] Toutes les clés BYOK sont chiffrées au repos (AES-256-GCM)
- [ ] RLS active sur toutes les tables tenant
- [ ] Politique `project_admin_policy` appliquée
- [ ] Rate limiting effectif sur `ai-router`
- [ ] Audit log déclenché sur toutes les tables sensibles

### Fonctionnel

- [ ] Un appel IA passe sans erreur du frontend jusqu'au modèle final via `ai-router → LiteLLM → provider`
- [ ] Le coût est correctement calculé et débité (quota, puis crédits)
- [ ] Le fallback automatique fonctionne (modèle indisponible → fallback)
- [ ] BYOK activé court-circuite correctement le débit plateforme
- [ ] PII anonymisée pour les tâches qui le requièrent
- [ ] Trace visible dans Langfuse pour chaque appel
- [ ] Reset mensuel du quota fonctionne

### UX

- [ ] L'utilisateur voit en temps réel son quota restant
- [ ] Achat de crédits avec Mobile Money fonctionne end-to-end
- [ ] Configuration BYOK avec test de validation fonctionne
- [ ] Override de routage par tâche fonctionne
- [ ] Alerte quota faible / crédits faibles déclenchée
- [ ] Refus gracieux (quota_exhausted, no_credits) avec CTA clairs

### Admin

- [ ] Panneau admin permet d'éditer providers, modèles, tâches, routage
- [ ] Dashboard admin affiche métriques agrégées
- [ ] Drill-down par tenant fonctionne
- [ ] Lien vers Langfuse depuis l'admin fonctionne

### Performance

- [ ] Latence `ai-router` overhead < 200ms (hors temps LLM)
- [ ] PII redaction < 500ms pour 1000 caractères
- [ ] L'UI ne bloque jamais sur attente IA (streaming ou async)

### Multi-tenant

- [ ] Aucune fuite de données cross-tenant possible (testé avec 2 companies)
- [ ] Les seeds globaux (`ai_providers`, `ai_models`, `ai_tasks`, `ai_credit_packs`) sont en lecture seule pour les tenants

### Tests

- [ ] Tests unitaires sur la logique de routage (3 sources, fallback, quota exhausted)
- [ ] Tests d'intégration `ai-router` end-to-end (mock LiteLLM)
- [ ] Tests E2E Cypress/Playwright : achat crédits, ajout BYOK, appel assistant
- [ ] Tests de charge : 100 req/s sur `ai-router` sans dégradation

---

## Annexe A — Commandes de validation rapide

À exécuter pour vérifier que l'infrastructure est prête avant développement.

```bash
# 1. LiteLLM
curl -s https://litellm.wimrux.com/health \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" | jq .

# 2. Appel test LiteLLM via OpenAI SDK compatible
curl -s https://litellm.wimrux.com/v1/chat/completions \
  -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-haiku",
    "messages": [{"role":"user","content":"Bonjour"}],
    "max_tokens": 50
  }' | jq .

# 3. Langfuse ingestion
curl -s -X POST https://langfuse.wimrux.com/api/public/health | jq .

# 4. Presidio analyze
curl -s -X POST https://presidio.wimrux.com/analyze \
  -H "Content-Type: application/json" \
  -d '{"text":"Marie Dupont 70123456","language":"fr"}' | jq .

# 5. Presidio anonymize
curl -s -X POST https://presidio.wimrux.com/anonymize \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Marie Dupont 70123456",
    "analyzer_results": [
      {"entity_type":"PERSON","start":0,"end":12,"score":0.85},
      {"entity_type":"PHONE_NUMBER","start":13,"end":21,"score":0.9}
    ],
    "anonymizers": {"DEFAULT":{"type":"replace","new_value":"<REDACTED>"}}
  }' | jq .
```

---

## Annexe B — Ordre d'exécution recommandé pour l'agent codeur

> Si vous passez ce PRD à un agent autonome (Claude Code, Codex), voici l'ordre des sprints.

**Sprint AI-1 : Fondations BDD (3-4 jours)**
- Migrations SQL des 10 tables (2.3)
- RLS + policies + triggers d'audit
- Seeds initiaux (`ai_credit_packs`, `ai_admin_settings`)

**Sprint AI-2 : Edge Function ai-router (5-7 jours)**
- Squelette + auth + routing
- Intégration LiteLLM (appel + streaming)
- Intégration Presidio (analyze + anonymize)
- Calcul coût + débit quota/crédits
- Logging dans `ai_usage_logs`

**Sprint AI-3 : Panneau Tenant (5-7 jours)**
- Pages `/settings/ai/usage` + `/credits/buy` + `/byok` + `/routing` + `/history`
- Intégration paiement Mobile Money (réutilise EPIC 24)
- Test BYOK + chiffrement

**Sprint AI-4 : Panneau Admin SaaS (7-10 jours)**
- 10 pages CRUD (2.5)
- Dashboard avec graphiques
- Drill-down par tenant

**Sprint AI-5 : Workflows Dify/Stirling (3-5 jours)**
- Adapter `callDify()` dans ai-router
- Adapter `callStirling()` dans ai-router
- Sync workflows Dify ↔ `ai_tasks`

**Sprint AI-6 : Tests + Hardening (5-7 jours)**
- Tests unitaires + intégration + E2E
- Tests de charge
- Audit sécurité
- Documentation utilisateur (aide en ligne)

**Total : 28-40 jours-hommes (~6-8 semaines pour 1 dev senior)**

---

## Annexe C — Fichier `.env` template à fournir à l'agent

```env
# === INSFORGE ===
INSFORGE_PROJECT_URL=https://gfe4bd9y.eu-central.insforge.app
INSFORGE_ANON_KEY=eyJhbGc...
INSFORGE_SERVICE_KEY=eyJhbGc...

# === LITELLM ===
LITELLM_BASE_URL=https://litellm.wimrux.com
LITELLM_MASTER_KEY=sk-litellm-master-xxx

# === LANGFUSE ===
LANGFUSE_PUBLIC_KEY=pk-lf-xxx
LANGFUSE_SECRET_KEY=sk-lf-xxx
LANGFUSE_HOST=https://langfuse.wimrux.com

# === PRESIDIO ===
PRESIDIO_ANALYZER_URL=https://presidio.wimrux.com/analyze
PRESIDIO_ANONYMIZER_URL=https://presidio.wimrux.com/anonymize
PRESIDIO_AUTH_USERNAME=admin
PRESIDIO_AUTH_PASSWORD=xxx

# === DIFY ===
DIFY_BASE_URL=https://dify.wimrux.com
DIFY_API_KEY=app-xxx

# === STIRLING AI ===
STIRLING_BASE_URL=https://stirling.wimrux.com
STIRLING_API_KEY=xxx

# === ZEP (P2) ===
ZEP_API_URL=https://zep.wimrux.com
ZEP_API_KEY=xxx

# === TEI (P3) ===
TEI_BASE_URL=https://embeddings.wimrux.com

# === BYOK ENCRYPTION ===
BYOK_ENCRYPTION_KEY=hex-64-chars-aes-256-gcm

# === PLATFORM SETTINGS ===
PLATFORM_MARGIN_PERCENT=20
QUOTA_RESET_DAY=1
DEFAULT_PII_REDACTION=true
```

---

**FIN DU PRD**

*Préparé pour Ulrich Dossougoin — WIMRUX® Finances. Périmètre CEDEAO/UEMOA. Version 1.0 — 23 mai 2026.*
