# Dossier `deployment/` — Référence officielle WIMRUX® Finances

> **Lecture obligatoire pour tout agent (humain ou IA) intervenant sur le projet.**
> Ce dossier est la **source de vérité unique** pour les règles, méthodes, procédures de déploiement et tests E2E.

---

## 🎯 Objectif

Éviter que tout nouvel intervenant reproduise les erreurs déjà commises (bug `ANON_KEY` non déclaré, push sans build, OTP qui ne part pas, etc.) et garantir la qualité de chaque mise en production.

---

## 📂 Sommaire

| # | Fichier | Contenu | Quand le lire |
|:--|:--|:--|:--|
| **0** | [`README.md`](./README.md) | Ce fichier — point d'entrée | En premier |
| **1** | [`01-STACK-ET-INFRA.md`](./01-STACK-ET-INFRA.md) | Stack technique, URLs, IDs, secrets | Avant toute action |
| **2** | [`02-RULES-AGENT.md`](./02-RULES-AGENT.md) | DO / DON'T stricts | Avant d'éditer du code |
| **3** | [`03-WORKFLOW-DEV-DEPLOY.md`](./03-WORKFLOW-DEV-DEPLOY.md) | Procédure dev → commit → build → Vercel | À chaque déploiement |
| **4** | [`04-DATABASE-MIGRATIONS.md`](./04-DATABASE-MIGRATIONS.md) | SQL + InsForge CLI | Avant d'altérer la DB |
| **5** | [`05-EDGE-FUNCTIONS.md`](./05-EDGE-FUNCTIONS.md) | Pattern Deno + secrets | Avant de toucher une edge function |
| **6** | [`06-E2E-CHECKLIST-PROD.md`](./06-E2E-CHECKLIST-PROD.md) | Checklist exhaustive E2E | **OBLIGATOIRE** avant mise en prod |

---

## 🚨 Règles d'or (en 5 lignes)

1. **Lire `02-RULES-AGENT.md` AVANT d'éditer du code.**
2. **Toujours `npm run build` AVANT `vercel deploy --prod --yes`.**
3. **Toujours déclarer `Deno.env.get("ANON_KEY")` au top du module edge function.**
4. **Toujours mettre à jour `src/types/index.ts` après un `ALTER TABLE`.**
5. **Toujours exécuter la checklist de `06-E2E-CHECKLIST-PROD.md` avant production.**

---

## 📚 Docs complémentaires (racine projet)

| Fichier | Rôle |
|:--|:--|
| `AGENTS.md` | Règles SDK InsForge (à respecter) |
| `DEPLOYMENT.md` | Doc historique (référence, ne pas dupliquer ici) |
| `E2E_TEST_SCENARIOS.md` | Scénarios E2E détaillés métier |
| `CREDENTIALS_WIMRUX.md` | Comptes de test (ne pas commiter en clair en prod) |
| `DB_SCHEMA_INSFORGE_WIMRUX.md` | Schéma complet base de données |
| `bugs/detected.md` | Liste des bugs détectés en prod |

---

## ✅ Workflow type d'un agent

```
1. Lire deployment/01 → 02 → 03
2. Identifier le type de tâche :
   - Code frontend → 03
   - DB → 04
   - Edge function → 05
3. Implémenter
4. Build local (npm run build) → exit 0
5. Commit + push
6. Si déploiement prod → exécuter 06-E2E-CHECKLIST-PROD.md
```

---

**Dernière mise à jour** : 2026-05-27
**Mainteneur** : Équipe WIMRUX®
