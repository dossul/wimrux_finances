import { ref } from 'vue';
import { useCompanyStore } from 'src/stores/company-store';
import type { AiTaskType, AiTaskRoute, AiRouting } from 'src/types';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const TASK_SYSTEM_PROMPTS: Record<AiTaskType, string> = {
  assistant_fiscal: `Tu es un assistant fiscal expert pour le Burkina Faso. Tu aides les utilisateurs de WIMRUX® FINANCES avec :
- La réglementation fiscale burkinabè (TVA, PSVB, timbre quittance, groupes A-P)
- Les factures normalisées certifiées (FNEC) et les exigences DGI
- Le calcul des taxes et la conformité fiscale
- L'interprétation des rapports Z et X
- Les conseils de gestion financière et comptable
- Le régime RNI, RSI, et les obligations déclaratives
Réponds toujours en français. Sois précis et cite les textes réglementaires quand c'est pertinent.`,
  analyse_facture: `Tu es un analyseur de factures expert. Analyse les données de facturation fournies et identifie :
- Les erreurs potentielles de calcul (HT, TVA, TTC)
- Les incohérences de groupes de taxation (A-P)
- Les champs manquants ou suspects
- Les recommandations d'optimisation fiscale
Réponds en français, de manière structurée et concise.`,
  resume_rapport: `Tu es un analyste financier. À partir des données de rapport fournies, génère un résumé exécutif comprenant :
- Les chiffres clés (CA, TVA, résultat)
- Les tendances observées
- Les points d'attention
- Les recommandations
Réponds en français avec des bullet points clairs.`,
  suggestion_fiscale: `Tu es un conseiller fiscal spécialisé Burkina Faso. Analyse la situation fiscale et propose :
- Des optimisations fiscales légales
- Des alertes sur les obligations déclaratives à venir
- Des recommandations sur les groupes de taxation
- Des conseils de conformité DGI
Réponds en français avec des actions concrètes.`,
  classification_depense: `Tu es un expert en comptabilité OHADA. Classifie les dépenses selon :
- Le plan comptable OHADA
- Le groupe de taxation approprié (A-P)
- La déductibilité TVA
- La nature de la charge (exploitation, financière, exceptionnelle)
Réponds en français de manière structurée.`,
  detection_anomalie: `Tu es un auditeur financier. Analyse les données fournies et détecte :
- Les anomalies de montants (doublons, écarts significatifs)
- Les séquences manquantes de numéros de facture
- Les incohérences de dates
- Les patterns suspects
Réponds en français avec un niveau de risque pour chaque anomalie.`,
};

const DEFAULT_ROUTING: AiRouting = {
  assistant_fiscal:      { model: 'anthropic/claude-sonnet-4.5', fallback: 'openai/gpt-4o-mini', temperature: 0.3, max_tokens: 2048, enabled: true },
  analyse_facture:       { model: 'openai/gpt-4o-mini', fallback: 'deepseek/deepseek-v3.2', temperature: 0.1, max_tokens: 1024, enabled: true },
  resume_rapport:        { model: 'openai/gpt-4o-mini', fallback: 'deepseek/deepseek-v3.2', temperature: 0.2, max_tokens: 1500, enabled: true },
  suggestion_fiscale:    { model: 'anthropic/claude-sonnet-4.5', fallback: 'openai/gpt-4o', temperature: 0.4, max_tokens: 2048, enabled: true },
  classification_depense:{ model: 'openai/gpt-4o-mini', fallback: 'deepseek/deepseek-v3.2', temperature: 0.1, max_tokens: 512, enabled: true },
  detection_anomalie:    { model: 'openai/gpt-4o', fallback: 'anthropic/claude-sonnet-4.5', temperature: 0.1, max_tokens: 2048, enabled: true },
};

interface OpenRouterResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string; code?: number };
}

export const AI_TASK_LABELS: Record<AiTaskType, { label: string; icon: string; description: string }> = {
  assistant_fiscal:       { label: 'Assistant fiscal',        icon: 'smart_toy',       description: 'Chat conversationnel sur la fiscalité BF' },
  analyse_facture:        { label: 'Analyse de factures',     icon: 'receipt_long',    description: 'Vérification et validation de factures' },
  resume_rapport:         { label: 'Résumé de rapports',      icon: 'summarize',       description: 'Synthèse exécutive des rapports financiers' },
  suggestion_fiscale:     { label: 'Suggestions fiscales',    icon: 'lightbulb',       description: 'Recommandations d\'optimisation fiscale' },
  classification_depense: { label: 'Classification dépenses', icon: 'category',        description: 'Catégorisation comptable OHADA' },
  detection_anomalie:     { label: 'Détection d\'anomalies',  icon: 'warning',         description: 'Audit automatique et alertes' },
};

export function getDefaultRouting(): AiRouting {
  return JSON.parse(JSON.stringify(DEFAULT_ROUTING));
}

export function useAiAssistant() {
  const messages = ref<ChatMessage[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const activeModel = ref('');
  const activeTask = ref<AiTaskType>('assistant_fiscal');

  function getCompanyConfig() {
    const company = useCompanyStore().company;
    return {
      apiKey: company?.openrouter_api_key || '',
      enabled: company?.ai_enabled ?? true,
      routing: company?.ai_routing || DEFAULT_ROUTING,
      customPrompt: company?.ai_system_prompt || null,
    };
  }

  function getTaskRoute(task: AiTaskType): AiTaskRoute {
    const config = getCompanyConfig();
    const routing = config.routing;
    return routing[task] || DEFAULT_ROUTING[task];
  }

  function addMessage(role: 'user' | 'assistant', content: string) {
    messages.value.push({ role, content, timestamp: new Date().toISOString() });
  }

  async function callOpenRouter(
    apiKey: string,
    model: string,
    apiMessages: { role: string; content: string }[],
    temperature: number,
    maxTokens: number,
  ): Promise<string> {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'WIMRUX FINANCES',
      },
      body: JSON.stringify({
        model,
        messages: apiMessages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({})) as OpenRouterResponse;
      throw new Error(errBody.error?.message || `OpenRouter ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as OpenRouterResponse;
    return data.choices?.[0]?.message?.content || 'Pas de réponse.';
  }

  async function sendMessage(userMessage: string, task: AiTaskType = 'assistant_fiscal') {
    if (!userMessage.trim()) return;

    const config = getCompanyConfig();
    if (!config.enabled) {
      addMessage('user', userMessage);
      addMessage('assistant', '⚠️ L\'assistant IA est désactivé. Activez-le dans Paramètres > Intelligence Artificielle.');
      return;
    }
    if (!config.apiKey) {
      addMessage('user', userMessage);
      addMessage('assistant', '⚠️ Aucune clé API OpenRouter configurée. Ajoutez-la dans Paramètres > Intelligence Artificielle.');
      return;
    }

    const route = getTaskRoute(task);
    if (!route.enabled) {
      addMessage('user', userMessage);
      addMessage('assistant', `⚠️ La tâche "${AI_TASK_LABELS[task].label}" est désactivée dans le routage IA.`);
      return;
    }

    activeTask.value = task;
    addMessage('user', userMessage);
    loading.value = true;
    error.value = null;

    const systemPrompt = config.customPrompt && task === 'assistant_fiscal'
      ? config.customPrompt
      : TASK_SYSTEM_PROMPTS[task];

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.value.slice(-20).map(m => ({ role: m.role, content: m.content })),
    ];

    // Try primary model, then fallback
    try {
      activeModel.value = route.model;
      const reply = await callOpenRouter(config.apiKey, route.model, apiMessages, route.temperature, route.max_tokens);
      addMessage('assistant', reply);
    } catch (primaryErr: unknown) {
      if (route.fallback && route.fallback !== route.model) {
        try {
          activeModel.value = route.fallback + ' (fallback)';
          const reply = await callOpenRouter(config.apiKey, route.fallback, apiMessages, route.temperature, route.max_tokens);
          addMessage('assistant', reply);
        } catch (fallbackErr: unknown) {
          const msg = fallbackErr instanceof Error ? fallbackErr.message : 'Erreur IA';
          error.value = msg;
          addMessage('assistant', `⚠️ Erreur (${route.model} + ${route.fallback}) : ${msg}`);
        }
      } else {
        const msg = primaryErr instanceof Error ? primaryErr.message : 'Erreur IA';
        error.value = msg;
        addMessage('assistant', `⚠️ Erreur : ${msg}`);
      }
    } finally {
      loading.value = false;
    }
  }

  /** One-shot AI call for programmatic use (no chat history) */
  async function runTask(task: AiTaskType, prompt: string): Promise<{ result: string; error: string | null }> {
    const config = getCompanyConfig();
    if (!config.enabled || !config.apiKey) return { result: '', error: 'IA non configurée' };
    const route = getTaskRoute(task);
    if (!route.enabled) return { result: '', error: 'Tâche désactivée' };

    const apiMessages = [
      { role: 'system', content: TASK_SYSTEM_PROMPTS[task] },
      { role: 'user', content: prompt },
    ];

    try {
      const reply = await callOpenRouter(config.apiKey, route.model, apiMessages, route.temperature, route.max_tokens);
      return { result: reply, error: null };
    } catch (err: unknown) {
      if (route.fallback && route.fallback !== route.model) {
        try {
          const reply = await callOpenRouter(config.apiKey, route.fallback, apiMessages, route.temperature, route.max_tokens);
          return { result: reply, error: null };
        } catch (fbErr: unknown) {
          return { result: '', error: fbErr instanceof Error ? fbErr.message : 'Erreur IA' };
        }
      }
      return { result: '', error: err instanceof Error ? err.message : 'Erreur IA' };
    }
  }

  function clearChat() {
    messages.value = [];
    error.value = null;
  }

  return { messages, loading, error, activeModel, activeTask, sendMessage, runTask, clearChat };
}
