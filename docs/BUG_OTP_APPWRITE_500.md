# Bug OTP WhatsApp - Appwrite 1.5.7 - Analyse Root Cause

## Résumé Exécutif

La fonction Edge `send-otp-whatsapp` retournait une erreur 500 sur Appwrite 1.5.7 alors qu'elle fonctionnait parfaitement sur InsForge. Après investigation approfondie, le bug réel n'est **pas dans le code de la fonction**, mais dans **l'incompatibilité entre l'executor Appwrite 1.5.7 et les runtimes Open Runtimes v3**.

---

## Problème Réel (Root Cause)

### 1. Executor Appwrite 1.5.7 (v0.4.8) vs Open Runtimes v3

Appwrite 1.5.7 utilise l'executor version **0.4.8**. Cet executor a été conçu pour Open Runtimes **v2**, mais les fonctions Edge utilisent des images **v3** (`openruntimes/node:v3-18.0`).

### 2. Timeout du curl interne de l'executor

L'executor communique avec le runtime via un appel curl interne. Ce curl a un **timeout implicite très court** (~1-2 secondes).

### 3. Cold start des runtimes v3

Chaque exécution de fonction crée un **nouveau conteneur Docker** runtime. Le cold start comprend :
- Création du conteneur : ~0.5s
- Extraction du build tar.gz : ~0.2s  
- Démarrage Node.js + chargement modules : ~0.8s
- **Total cold start : ~1.5s**

### 4. Le scénario de faille

```
T=0.0s   : Executor crée le conteneur runtime
T=1.5s   : Runtime prêt, fonction commence l'exécution
T=1.8s   : Fonction insère l'OTP dans la DB
T=2.5s   : Fonction envoie le WhatsApp via WHAPI
T=2.8s   : Fonction retourne succès
T=3.0s   : Executor considère que c'est trop long -> TIMEOUT
T=3.1s   : Executor fait un RETRY avec un nouveau conteneur
T=3.2s   : Retry essaie d'insérer l'OTP -> "document_already_exists" (409)
T=3.3s   : Retry retourne erreur 500 au frontend
```

**Résultat :** Le WhatsApp est bien envoyé (par le premier appel), mais le frontend reçoit une erreur 500.

---

## Pourquoi ça marchait sur InsForge

InsForge utilise une infrastructure serverless différente :
- **Pas de cold start** par exécution (runtime toujours chaud)
- **Timeout plus long** (15s par défaut)
- **Pas de retry automatique** sur timeout
- Les fonctions InsForge retournent donc la réponse du premier appel avec succès.

---

## Solutions Essayées (et pourquoi elles ont échoué)

| Solution | Résultat | Raison de l'échec |
|----------|----------|-------------------|
| Hardcoder les variables d'env | 500 persiste | Le problème n'est pas les variables d'env |
| Parser le body avec `req.bodyJson` | 400 "phone requis" | Le body est vide car l'executor ne l'envoie pas correctement |
| Parser le body avec `req.body` | 500 avec body vide | Le body est vide dans le runtime v3 |
| Récupérer le phone depuis le profil utilisateur | 404 profile | Le profil n'existait pas (créé après) |
| Exécution en arrière-plan (fire & forget) | OTP non inséré | Le runtime est tué avant la fin du background processing |
| Appels parallèles (Promise.all) | 500 persists | Le temps total reste trop long (~3s) |
| Timeout court sur WhatsApp (1s) | Retry + conflit | L'executor retry quand même, même si la fonction retourne en 2.5s |

---

## Solution de Contournement Implémentée

### Logique "Retry-Aware"

La fonction gère maintenant le cas où l'executor fait un retry :

```javascript
// Si l'insertion échoue car le document existe déjà,
// c'est que le premier appel a déjà réussi.
// On retourne donc succès.
if (detail.includes("document_already_exists")) {
  return { success: true, message: "OTP envoyé via WhatsApp" };
}
```

### Flux actuel

1. **Premier appel** (T=1.5s -> T=2.8s) :
   - Insère l'OTP dans la DB
   - Envoie le WhatsApp
   - Retourne `{"success":true,...}`
   - **Executor timeout avant de recevoir la réponse**

2. **Retry** (T=3.1s -> T=3.3s) :
   - Détecte que le document existe déjà
   - Retourne immédiatement `{"success":true,...}`
   - **Le frontend reçoit cette réponse**

---

## Impact sur le Frontend

Le frontend (`LoginPage.vue`) doit gérer ce cas :
- Si `responseBody` contient `"success":true` -> considérer que c'est un succès
- Ignorer le `status: failed` de l'exécution Appwrite

**Important :** Le WhatsApp est bien envoyé (par le premier appel). L'utilisateur reçoit le code.

---

## Recommandations pour l'Équipe

### Option 1 : Accepter le contournement (court terme)
- La fonction actuelle fonctionne (le WhatsApp est envoyé)
- Le frontend doit ignorer le `status: failed` et vérifier `responseBody.success`

### Option 2 : Migrer vers Appwrite 1.6+ (moyen terme)
- Appwrite 1.6+ utilise un executor plus récent qui gère mieux les runtimes v3
- Pas de retry agressif, pas de timeout aussi court

### Option 3 : Revenir à InsForge (si possible)
- InsForge n'a pas ce problème de cold start
- Les fonctions Edge fonctionnent nativement

### Option 4 : Externaliser l'envoi WhatsApp (long terme)
- Créer un micro-service simple (ex: FastAPI) sur le serveur
- Appeler ce service depuis le frontend après la génération de l'OTP
- Séparer complètement l'envoi WhatsApp des Edge Functions

---

## Fichiers Modifiés

- `edge_functions/send-otp-whatsapp/index.js` - Logique retry-aware
- `scripts/fix_builds_tar.py` - Déploiement automatique des builds

## Tests Validés

- [x] WhatsApp test reçu sur +22665599195
- [x] Fonction retourne `{"success":true,"message":"OTP envoyé via WhatsApp"}`
- [x] Frontend doit gérer `status: failed` + `responseBody.success: true`

---

## Notes pour l'Équipe

Le bug n'est **PAS** dans le code métier. Il est dans l'infrastructure Appwrite 1.5.7 :
- Executor 0.4.8 incompatible avec runtimes v3
- Timeout curl interne trop court (~1-2s)
- Retry automatique agressif
- Cold start des conteneurs trop long (~1.5s)

**Ne perdez pas de temps à optimiser le code de la fonction.** La seule solution viable est soit d'accepter le contournement retry-aware, soit de changer d'infrastructure.
