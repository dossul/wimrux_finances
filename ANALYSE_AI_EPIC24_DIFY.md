# Analyse : Implémentation AI EPIC 24 vs Approche Dify (inspiré ILpaye)

## 📊 État actuel AI dans WIMRUX Finances

### ✅ Ce qui est implémenté

| Composant | Statut | Localisation |
|-----------|:------:|--------------|
| **ai-router Edge Function** | ✅ Déployé | `ai_router_fn/index.ts` |
| **Call Dify workflow** | ✅ Code prêt | `index.ts:476-522` |
| **Call Stirling workflow** | ✅ Code prêt | `index.ts:526-557` |
| **Fallback LiteLLM** | ✅ Actif | `index.ts:734-778` |
| **Task routing par tenant** | ✅ | `company_ai_task_routing` |
| **24 patterns SMS** | ✅ Seedés | `sms_parsing_patterns` |
| **ingest-sms.ts** | ✅ Créé | Fallback regex → AI |
| **ingest-payment.ts** | ✅ Existant | Orchestrateur central |

### 🔴 Ce qui manque (bloquant Dify)

| Service | Statut | Impact |
|---------|:------:|--------|
| **Dify déployé** | ❌ Non | Workflows impossibles |
| **LiteLLM déployé** | ❌ Non | Routing direct LLM impossible |
| **Credentials Dify** | ❌ Non | Appels API échoueront |

---

## 🔄 Comparaison : Approche Actuelle vs ILpaye/Dify

### Approche Actuelle WIMRUX (ai-router direct)

```
SMS reçu
    ↓
[ingest-sms] → Match regex patterns (24 seedés)
    ↓ (si échec)
[ai-router] → Call LiteLLM direct (prompt codé en dur)
    ↓
Extraction JSON → [ingest-payment] → wallet_transactions
```

**Avantages :**
- ✅ Fonctionne sans Dify déployé
- ✅ Une seule Edge Function à maintenir
- ✅ Latence faible (pas d'orchestrateur intermédiaire)

**Inconvénients :**
- ❌ Prompts codés en dur (modif = redéploiement)
- ❌ Pas de versionning des prompts
- ❌ Un seul modèle pour toutes les tâches
- ❌ Complexité si multi-étapes nécessaires

---

### Approche ILpaye (Dify Workflows)

```
SMS reçu
    ↓
[App Android] → Call Dify Workflow API
    ↓
[Dify Workflow]
    ├── Input Node: raw_sms, sender, timestamp
    ├── LLM Node: Prompt spécialisé "Expert Mobile Money"
    └── Output Node: JSON structuré
    ↓
[App Android] → Sync InsForge financial_transactions
```

**Workflow Dify ILpaye :**
```yaml
Workflow: "sms_payment_parser"
Inputs:
  - raw_sms: string
  - sender: string  
  - timestamp: string

Nodes:
  1. INPUT: Récupère les 3 variables
  2. LLM Node:
     - Model: GPT-4o-mini (via LiteLLM)
     - Prompt: "Tu es un expert Mobile Money en Afrique..."
     - Output Format: JSON
  3. CODE Node (optionnel): Validation JSON
  4. OUTPUT: 
     - is_financial: boolean
     - type: enum
     - amount: number
     - currency: string
     - confidence_score: float

Fallback:
  - Si confidence < 0.8 → "needs_human_review"
```

**Avantages :**
- ✅ Prompts modifiables sans redéployer le code
- ✅ Versionning des workflows
- ✅ Multi-étapes (LLM → Code → Condition → LLM)
- ✅ UI visuelle pour créer/modifier les workflows
- ✅ Monitoring intégré des exécutions
- ✅ A/B testing facile des prompts

**Inconvénients :**
- ❌ Nécessite Dify déployé et accessible
- ❌ Latence additionnelle (round-trip Dify)
- ❌ Point de défaillance supplémentaire

---

## 🎯 Recommandation pour EPIC 24

### Phase 1 : Immédiat (sans Dify)
**Conserver l'approche actuelle** — elle fonctionne et n'a pas besoin de services externes.

```typescript
// ingest-sms.ts (déjà créé)
const PATTERNS = await db.sms_parsing_patterns.query(...); // 24 patterns
const match = tryRegexPatterns(sms, PATTERNS);
if (match) return match;

// Fallback AI via ai-router direct
const result = await callAiRouter({
  task_code: "sms_parsing",
  input: { text: sms_body }
});
```

### Phase 2 : Migration Dify (quand disponible)
**Créer des workflows spécialisés** pour chaque canal EPIC 24 :

| Workflow Dify | Canal EPIC 24 | Prompt spécialisé |
|---------------|:-------------:|-------------------|
| `epic24_sms_parser` | SMS | "Expert SMS Mobile Money CEDEAO" |
| `epic24_text_parser` | Texte collé | "Expert extraction texte bancaire" |
| `epic24_image_parser` | Screenshot | "Vision OCR reçu paiement" |
| `epic24_file_parser` | PDF/CSV | "Analyse relevé bancaire" |

**Architecture cible :**

```
Canal d'entrée (SMS/texte/image/fichier)
    ↓
[Edge Function: ingest-*] 
    ↓ (si pas de match simple)
[Call Dify Workflow via ai-router]
    ↓
[Dify Workflow exécuté]
    ├── LLM Node (prompt versionné)
    ├── Code Node (validation)
    └── Condition Node (confidence check)
    ↓
[Retour JSON structuré]
    ↓
[ingest-payment] → wallet_transactions
```

---

## 🔧 Implémentation technique migration

### 1. Créer les workflows Dify (quand disponible)

**Workflow `epic24_sms_parser` :**
```yaml
# Export YAML Dify
app:
  mode: workflow
  name: EPIC24 SMS Parser

workflow:
  nodes:
    - id: input
      type: start
      variables:
        - raw_sms: string
        - sender: string
        - country_hint: string  # 'BF', 'CI', 'SN'...
    
    - id: llm_extract
      type: llm
      model: gpt-4o-mini
      prompt: |
        Tu es un expert Mobile Money en Afrique de l'Ouest (CEDEAO).
        Pays probable: {{country_hint}}
        
        Analyse ce SMS et extrais en JSON :
        {
          "is_financial": boolean,
          "transaction_type": "RECEIVE|SEND|WITHDRAW|PAYMENT|AIRTIME|REFUND|UNKNOWN",
          "amount": number,
          "currency": "XOF|XAF|GNF|...",
          "sender_phone": string|null,
          "receiver_phone": string|null,
          "counterparty_name": string|null,
          "reference": string|null,
          "balance_after": number|null,
          "transaction_date": "ISO8601",
          "confidence_score": 0.0-1.0,
          "explanation": "string"
        }
        
        SMS: {{raw_sms}}
        Expéditeur: {{sender}}
        
        Réponds UNIQUEMENT avec le JSON, pas de markdown.
      
    - id: code_validate
      type: code
      code: |
        // Valider et nettoyer le JSON
        import json
        try:
          data = json.loads(args['llm_output'])
          if data['confidence_score'] < 0.7:
            data['needs_review'] = True
          return data
        except:
          return {"error": "parse_failed", "needs_review": True}
    
    - id: output
      type: end
      outputs:
        - is_financial
        - transaction_type
        - amount
        - currency
        - counterparty_name
        - reference
        - confidence_score
        - needs_review
```

### 2. Modifier ai-router pour supporter Dify workflows

```typescript
// Dans ai-router, ajouter au task routing :
const TASK_TO_DIFY_WORKFLOW: Record<string, string> = {
  "sms_parsing": "epic24_sms_parser",
  "text_payment_extraction": "epic24_text_parser", 
  "ocr_payment_evidence": "epic24_image_parser",
  "pdf_statement_parsing": "epic24_file_parser",
};

// Si task correspond → call Dify au lieu de LiteLLM direct
if (TASK_TO_DIFY_WORKFLOW[task_code] && workflowRouting.provider_code === "dify") {
  return callDify({
    workflow_id: TASK_TO_DIFY_WORKFLOW[task_code],
    input: { raw_sms: input.text, sender: options.sender, ... }
  });
}
```

### 3. Modifier ingest-sms pour envoyer contexte riche

```typescript
// Au lieu d'envoyer juste le texte :
const result = await callAiRouter({
  task_code: "sms_parsing",
  input: { 
    text: sms_body,
    // Contexte additionnel pour Dify
    sender: sender,
    country_hint: wallet.country_code || "BF",
    wallet_type: wallet.category,
  },
  options: { 
    language: "fr",
    // Indiquer qu'on veut Dify si dispo
    prefer_workflow: true 
  }
});
```

---

## ✅ Checklist migration (quand Dify prêt)

- [ ] Déployer Dify sur `https://dify.wimrux.com`
- [ ] Créer les 4 workflows EPIC 24 dans Dify UI
- [ ] Exporter les clés API par workflow
- [ ] Stocker credentials dans InsForge Secrets
- [ ] Modifier ai-router pour détecter task → workflow mapping
- [ ] Mettre à jour ingest-sms/ingest-text/ingest-image pour envoyer contexte riche
- [ ] Tests E2E sur chaque canal
- [ ] Documenter les workflows dans Dify (versions, changelogs)

---

## 📈 Estimation effort migration

| Phase | Durée | Dépendances |
|-------|-------|-------------|
| Déploiement Dify | 2j | Opérateur (Ulrich) |
| Création 4 workflows | 1j | Dify UI accessible |
| Modification ai-router | 0.5j | Credentials Dify |
| Tests E2E | 1j | Workflows déployés |
| **Total** | **~4.5j** | Dify déployé |

---

## 💡 Conclusion

**Actuellement** : L'approche directe via ai-router fonctionne et permet d'avancer sans blocage.

**Recommandation** : Quand Dify sera déployé, migrer les tâches EPIC 24 vers des workflows Dify spécialisés pour gagner en flexibilité et maintenabilité.

**ILpaye a fait le bon choix** dès le départ avec Dify car ils avaient déjà l'infrastructure. Nous on l'implémente en deux temps pour ne pas être bloqués.
