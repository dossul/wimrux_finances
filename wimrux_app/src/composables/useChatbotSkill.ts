import { useCompanyStore } from 'src/stores/company-store';
import { useChatbotConfig } from 'src/composables/useChatbotConfig';
import type { ChatbotApiKey, ChatbotPermission, ChatbotAction } from 'src/types';
import { CHATBOT_ACTION_LABELS, ALL_CHATBOT_ACTIONS } from 'src/types';

/**
 * Generates a complete Chatbot Skill document in Markdown format.
 * This file can be exported and used as system prompt / knowledge base
 * for any LLM-based chatbot (ClaudeBot, GPT, etc.) to operate
 * all available API actions on the WIMRUX® Finances platform.
 */
export function useChatbotSkill() {
  const companyStore = useCompanyStore();
  const chatbot = useChatbotConfig();

  /**
   * Generate the full skill .md for a specific API key,
   * including only the permissions granted to that key.
   */
  async function generateSkillForKey(apiKey: ChatbotApiKey): Promise<string> {
    const company = companyStore.company;
    if (!company) return '# Erreur\n\nEntreprise non trouvée.';

    const perms = await chatbot.loadPermissions(apiKey.id);
    const enabledPerms = perms.filter(p => p.enabled);
    const enabledActions = enabledPerms.map(p => p.action);

    return buildMarkdown(company.name, company.ifu, apiKey, enabledPerms, enabledActions);
  }

  /**
   * Generate a full skill .md with ALL actions
   * (for companies wanting a complete reference).
   */
  function generateFullSkill(): string {
    const company = companyStore.company;
    if (!company) return '# Erreur\n\nEntreprise non trouvée.';

    const allPerms = ALL_CHATBOT_ACTIONS.map(action => ({
      id: '', api_key_id: '', company_id: company.id,
      action, enabled: true, valid_from: null, valid_until: null,
      rate_limit_per_hour: null, conditions: {}, created_at: '',
    })) as ChatbotPermission[];

    return buildMarkdown(company.name, company.ifu, null, allPerms, ALL_CHATBOT_ACTIONS);
  }

  function buildMarkdown(
    companyName: string,
    companyIfu: string,
    apiKey: ChatbotApiKey | null,
    perms: ChatbotPermission[],
    enabledActions: ChatbotAction[],
  ): string {
    const now = new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    const gatewayUrl = `${import.meta.env.VITE_INSFORGE_URL as string || '<INSFORGE_URL>'}/functions/chatbot-gateway`;

    const sections: string[] = [];

    // ── Header ──
    sections.push(`# Skill Chatbot — ${companyName}

> Document généré automatiquement le ${now} par WIMRUX® Finances.
> Ce fichier décrit toutes les capacités de votre chatbot pour interagir avec la plateforme.

---

## Informations générales

| Élément | Valeur |
|---------|--------|
| **Entreprise** | ${companyName} |
| **IFU** | ${companyIfu} |
| **Plateforme** | WIMRUX® Finances — Système de Facturation Électronique |
| **Endpoint API** | \`POST ${gatewayUrl}\` |
${apiKey ? `| **Clé API** | \`${apiKey.api_key_prefix}...\` (${apiKey.name}) |` : '| **Clé API** | *(toutes clés — référence complète)* |'}
${apiKey ? `| **Canaux autorisés** | ${apiKey.channels.length > 0 ? apiKey.channels.join(', ') : 'Tous'} |` : ''}
${apiKey?.expires_at ? `| **Expiration** | ${new Date(apiKey.expires_at).toLocaleDateString('fr-FR')} |` : ''}
| **Devise** | FCFA (Franc CFA — XOF) |
| **Langue** | Français |`);

    // ── How to call ──
    sections.push(`
---

## Comment appeler l'API

### Requête HTTP

\`\`\`http
POST ${gatewayUrl}
Content-Type: application/json
X-API-Key: <votre_clé_api>
X-Channel: whatsapp | telegram | email | sms | api | webhook
\`\`\`

### Corps de la requête (JSON)

\`\`\`json
{
  "message": "Montre-moi les factures du mois",
  "conversation_id": "optionnel — pour continuer une conversation",
  "external_id": "optionnel — identifiant externe (ex: numéro WhatsApp)",
  "external_user": "optionnel — nom de l'utilisateur externe"
}
\`\`\`

### Réponse (JSON)

\`\`\`json
{
  "conversation_id": "uuid",
  "reply": "Voici vos 5 dernières factures...",
  "action": "view_invoices",
  "action_status": "success | denied | error | null",
  "action_result": { "data": [...], "summary": "..." },
  "tokens_used": 150
}
\`\`\`

### Comportement du chatbot

1. L'utilisateur envoie un message en **langage naturel** (français)
2. L'IA analyse l'intention et identifie l'action correspondante
3. Si l'action est autorisée → elle est exécutée et les résultats sont retournés
4. Si l'action n'est pas autorisée → le chatbot informe poliment l'utilisateur
5. Si c'est une salutation ou question générale → le chatbot répond normalement
6. Le contexte conversationnel est maintenu via \`conversation_id\``);

    // ── Permissions summary ──
    const categories = [...new Set(ALL_CHATBOT_ACTIONS.map(a => CHATBOT_ACTION_LABELS[a].category))];
    let permTable = `
---

## Actions autorisées

| Action | Catégorie | Statut | Période | Limite/h |
|--------|-----------|--------|---------|----------|
`;
    for (const action of ALL_CHATBOT_ACTIONS) {
      const meta = CHATBOT_ACTION_LABELS[action];
      const perm = perms.find(p => p.action === action);
      const isEnabled = enabledActions.includes(action);
      const status = isEnabled ? '✅ Autorisée' : '❌ Refusée';
      const period = perm?.valid_from || perm?.valid_until
        ? `${perm.valid_from ? new Date(perm.valid_from).toLocaleDateString('fr-FR') : '—'} → ${perm.valid_until ? new Date(perm.valid_until).toLocaleDateString('fr-FR') : '∞'}`
        : 'Permanent';
      const rateLimit = perm?.rate_limit_per_hour ? `${perm.rate_limit_per_hour}/h` : '∞';
      permTable += `| \`${action}\` | ${meta.category} | ${status} | ${period} | ${rateLimit} |\n`;
    }
    sections.push(permTable);

    // ── Detailed action docs ──
    sections.push(`
---

## Documentation détaillée des actions

Chaque action est décrite avec ses paramètres, les exemples de messages utilisateur, et le format de réponse attendu.
`);

    for (const cat of categories) {
      const catActions = ALL_CHATBOT_ACTIONS.filter(a =>
        CHATBOT_ACTION_LABELS[a].category === cat && enabledActions.includes(a),
      );
      if (catActions.length === 0) continue;

      sections.push(`### ${cat}\n`);

      for (const action of catActions) {
        sections.push(getActionDoc(action));
      }
    }

    // ── System prompt template ──
    sections.push(`
---

## Prompt système recommandé

Utilisez ce prompt comme instruction système pour votre chatbot LLM :

\`\`\`
Tu es un assistant chatbot pour l'entreprise "${companyName}" sur la plateforme WIMRUX® Finances.
Tu gères la comptabilité, la facturation et la fiscalité au Burkina Faso (devise : FCFA).

Tu peux exécuter UNIQUEMENT les actions suivantes :
${enabledActions.map(a => `- ${a}: ${CHATBOT_ACTION_LABELS[a].description}`).join('\n')}

Quand l'utilisateur demande quelque chose :
1. Identifie l'action la plus appropriée parmi celles autorisées
2. Réponds au format JSON strict suivant :
{
  "action": "<nom_action>" ou null si c'est une conversation générale,
  "params": { ... paramètres pour l'action },
  "reply": "Réponse en français à l'utilisateur"
}

Règles :
- Si l'action demandée n'est PAS dans la liste autorisée, réponds avec action=null et explique poliment.
- Si c'est une question générale ou salutation, réponds normalement avec action=null.
- Réponds TOUJOURS en JSON valide.
- Utilise le français.
- Les montants sont en FCFA.
- Les dates sont au format JJ/MM/AAAA.
- Sois concis et professionnel.
\`\`\``);

    // ── Integration examples ──
    sections.push(`
---

## Exemples d'intégration

### cURL

\`\`\`bash
curl -X POST "${gatewayUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: wmrx_cb_votre_cle_ici" \\
  -H "X-Channel: api" \\
  -d '{"message": "Quelles sont mes 5 dernières factures ?"}'
\`\`\`

### Python

\`\`\`python
import requests

response = requests.post(
    "${gatewayUrl}",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": "wmrx_cb_votre_cle_ici",
        "X-Channel": "api"
    },
    json={"message": "Quel est le solde de ma trésorerie ?"}
)
print(response.json()["reply"])
\`\`\`

### JavaScript / Node.js

\`\`\`javascript
const response = await fetch("${gatewayUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "wmrx_cb_votre_cle_ici",
    "X-Channel": "api"
  },
  body: JSON.stringify({ message: "Crée un client nommé Entreprise ABC, type PM" })
});
const data = await response.json();
console.log(data.reply);
\`\`\`

### WhatsApp / Telegram (via webhook)

Configurez votre webhook pour transmettre chaque message reçu vers l'endpoint API :
- **X-Channel**: \`whatsapp\` ou \`telegram\`
- **external_id**: numéro de téléphone ou chat ID
- **external_user**: nom de l'utilisateur
- Le \`conversation_id\` retourné doit être réutilisé pour maintenir le contexte`);

    // ── Error handling ──
    sections.push(`
---

## Gestion des erreurs

| Code HTTP | Signification |
|-----------|---------------|
| \`200\` | Succès — la réponse contient \`reply\` et éventuellement \`action_result\` |
| \`400\` | Requête invalide — champ \`message\` manquant |
| \`401\` | Clé API invalide, inactive ou expirée |
| \`403\` | Canal non autorisé, chatbot désactivé, ou aucune permission active |
| \`500\` | Erreur interne du serveur |

### Statuts d'action (\`action_status\`)

| Statut | Description |
|--------|-------------|
| \`success\` | L'action a été exécutée avec succès |
| \`denied\` | L'action existe mais n'est pas autorisée pour cette clé |
| \`error\` | L'action a échoué lors de l'exécution |
| \`null\` | Aucune action détectée (conversation générale) |`);

    // ── Rate limiting ──
    sections.push(`
---

## Limites et bonnes pratiques

- **Rate limiting** : ${apiKey ? `${apiKey.rate_limit_per_hour} requêtes/heure` : 'configurable par clé API'}
- **Contexte conversationnel** : réutilisez \`conversation_id\` pour maintenir le contexte (jusqu'à 10 messages d'historique)
- **Tokens IA** : chaque requête consomme des tokens OpenRouter (inclus dans \`tokens_used\`)
- **Données sensibles** : ne transmettez jamais la clé API dans le corps du message utilisateur
- **Idempotence** : les actions de création (\`create_*\`) ne sont PAS idempotentes — évitez les doublons

---

*Document généré par WIMRUX® Finances — ${now}*
`);

    return sections.join('\n');
  }

  /**
   * Download skill as .md file
   */
  function downloadSkill(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    generateSkillForKey,
    generateFullSkill,
    downloadSkill,
  };
}

// ── Detailed per-action documentation ──

function getActionDoc(action: ChatbotAction): string {
  const meta = CHATBOT_ACTION_LABELS[action];
  const docs: Record<ChatbotAction, string> = {
    view_invoices: `#### \`view_invoices\` — ${meta.label}

${meta.description}.

**Paramètres optionnels :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| \`status\` | string | Filtrer par statut : \`draft\`, \`certified\`, \`cancelled\` |
| \`type\` | string | Filtrer par type : \`FV\` (vente), \`FA\` (avoir), \`FP\` (proforma) |
| \`limit\` | number | Nombre max de résultats (défaut : 10) |

**Exemples de messages utilisateur :**
- "Montre-moi mes factures"
- "Quelles sont les factures certifiées ?"
- "Liste les 5 dernières factures de vente"
- "Y a-t-il des factures en brouillon ?"

**Réponse :** Liste de factures avec \`id\`, \`reference\`, \`type\`, \`status\`, \`total_ttc\`, \`created_at\`.
`,

    create_invoice: `#### \`create_invoice\` — ${meta.label}

${meta.description}.

> ⚠️ **Action en écriture** — Cette action crée une facture réelle dans le système.

**Paramètres requis :**

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| \`client_id\` | string (uuid) | ✅ | ID du client destinataire |
| \`type\` | string | ✅ | \`FV\` (vente), \`FA\` (avoir), \`FP\` (proforma) |
| \`items\` | array | ✅ | Lignes de facture |

**Format d'un item :**
\`\`\`json
{
  "designation": "Service de conseil",
  "quantity": 1,
  "unit_price": 50000,
  "tax_group": "A"
}
\`\`\`

**Groupes de taxe (Burkina Faso) :**
- **A** : TVA 18%
- **B** : Exonéré
- **C** à **P** : Autres régimes fiscaux spécifiques

**Exemples de messages utilisateur :**
- "Crée une facture de 100 000 FCFA pour le client Entreprise ABC"
- "Facture de vente : 3 articles à 25 000 FCFA chacun, TVA 18%"

**Réponse :** Facture créée avec \`id\`, \`reference\`, \`total_ttc\`.
`,

    view_clients: `#### \`view_clients\` — ${meta.label}

${meta.description}.

**Paramètres optionnels :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| \`search\` | string | Recherche par nom (insensible à la casse) |
| \`limit\` | number | Nombre max de résultats (défaut : 20) |

**Exemples de messages utilisateur :**
- "Liste mes clients"
- "Cherche le client Ouédraogo"
- "Combien de clients ai-je ?"

**Réponse :** Liste de clients avec \`id\`, \`name\`, \`type\`, \`ifu\`, \`phone\`, \`email\`.
`,

    create_client: `#### \`create_client\` — ${meta.label}

${meta.description}.

> ⚠️ **Action en écriture** — Cette action crée un client réel dans le système.

**Paramètres :**

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| \`name\` | string | ✅ | Nom ou raison sociale |
| \`type\` | string | ✅ | \`PP\` (personne physique) ou \`PM\` (personne morale) |
| \`ifu\` | string | — | Numéro IFU (Identifiant Fiscal Unique) |
| \`phone\` | string | — | Téléphone |
| \`email\` | string | — | Email |
| \`address\` | string | — | Adresse |

**Exemples de messages utilisateur :**
- "Crée un client Entreprise ABC, personne morale, IFU 12345678A"
- "Ajoute le client Jean Dupont, particulier, tél 70123456"

**Réponse :** Client créé avec confirmation du nom.
`,

    view_treasury: `#### \`view_treasury\` — ${meta.label}

${meta.description}.

**Paramètres :** Aucun.

**Exemples de messages utilisateur :**
- "Quel est le solde de ma trésorerie ?"
- "Montre-moi mes comptes bancaires"
- "Combien ai-je en caisse ?"

**Réponse :** Liste des comptes avec soldes et total général en FCFA.
`,

    create_treasury_movement: `#### \`create_treasury_movement\` — ${meta.label}

${meta.description}.

> ⚠️ **Action en écriture** — Cette action enregistre un mouvement financier réel.

**Paramètres :**

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| \`account_id\` | string (uuid) | ✅ | ID du compte de trésorerie |
| \`amount\` | number | ✅ | Montant en FCFA |
| \`type\` | string | ✅ | \`ENTREE\` ou \`SORTIE\` |
| \`description\` | string | — | Description du mouvement |
| \`payment_type\` | string | — | \`ESPECES\`, \`CHEQUE\`, \`VIREMENT\`, \`MOBILE_MONEY\`, \`AUTRE\` |

**Exemples de messages utilisateur :**
- "Enregistre une entrée de 500 000 FCFA sur le compte principal"
- "Sortie de 75 000 FCFA en espèces, achat fournitures"

**Réponse :** Confirmation du mouvement enregistré.
`,

    view_reports: `#### \`view_reports\` — ${meta.label}

${meta.description}.

**Paramètres :** Aucun.

**Exemples de messages utilisateur :**
- "Donne-moi un résumé de mes ventes"
- "Quel est mon chiffre d'affaires ?"
- "Combien de factures certifiées ai-je ?"

**Réponse :** Nombre de factures, total TTC, nombre de factures certifiées.
`,

    generate_fiscal_report: `#### \`generate_fiscal_report\` — ${meta.label}

${meta.description}.

**Paramètres :**

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| \`type\` | string | ✅ | \`Z\` (rapport de clôture) ou \`X\` (rapport intermédiaire) |
| \`date\` | string | — | Date du rapport (format YYYY-MM-DD, défaut : aujourd'hui) |

**Exemples de messages utilisateur :**
- "Génère un rapport Z pour aujourd'hui"
- "Fais un rapport X du 15 janvier"

**Réponse :** Rapport fiscal généré avec les données agrégées.
`,

    view_audit_log: `#### \`view_audit_log\` — ${meta.label}

${meta.description}.

**Paramètres optionnels :**

| Paramètre | Type | Description |
|-----------|------|-------------|
| \`limit\` | number | Nombre max d'entrées (défaut : 10) |

**Exemples de messages utilisateur :**
- "Montre-moi le journal d'audit"
- "Quelles sont les dernières modifications ?"
- "Qui a modifié quoi récemment ?"

**Réponse :** Liste des entrées d'audit avec horodatage, utilisateur, action, détails.
`,

    ai_assistant: `#### \`ai_assistant\` — ${meta.label}

${meta.description}.

**Paramètres :** Le message de l'utilisateur est transmis directement à l'assistant IA.

**Exemples de messages utilisateur :**
- "Comment calculer la TVA sur une prestation de service ?"
- "Quelles sont les obligations fiscales d'une SARL au Burkina ?"
- "Explique-moi la différence entre facture normalisée et proforma"

**Réponse :** Réponse de l'assistant IA fiscal.
`,

    view_dashboard: `#### \`view_dashboard\` — ${meta.label}

${meta.description}.

**Paramètres :** Aucun.

**Exemples de messages utilisateur :**
- "Donne-moi un résumé de mon activité"
- "Quels sont mes KPIs ?"
- "Tableau de bord rapide"

**Réponse :** Nombre de factures, nombre de clients, chiffre d'affaires total, solde de trésorerie.
`,
  };

  return docs[action] || `#### \`${action}\` — ${meta.label}\n\n${meta.description}.\n`;
}
