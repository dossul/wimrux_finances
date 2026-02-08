import { ref } from 'vue';
import { useCompanyStore } from 'src/stores/company-store';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const DEFAULT_SYSTEM_PROMPT = `Tu es un assistant fiscal expert pour le Burkina Faso. Tu aides les utilisateurs de WIMRUX® FINANCES avec :
- La réglementation fiscale burkinabè (TVA, PSVB, timbre quittance, groupes A-P)
- Les factures normalisées certifiées (FNEC) et les exigences DGI
- Le calcul des taxes et la conformité fiscale
- L'interprétation des rapports Z et X
- Les conseils de gestion financière et comptable
- Le régime RNI, RSI, et les obligations déclaratives

Réponds toujours en français. Sois précis et cite les textes réglementaires quand c'est pertinent.`;

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4.5';
const DEFAULT_FALLBACK = 'openai/gpt-4o-mini';

interface OpenRouterResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string; code?: number };
}

export function useAiAssistant() {
  const messages = ref<ChatMessage[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const activeModel = ref('');

  function getAiConfig() {
    const company = useCompanyStore().company;
    return {
      apiKey: company?.openrouter_api_key || '',
      model: company?.ai_model || DEFAULT_MODEL,
      fallback: company?.ai_fallback_model || DEFAULT_FALLBACK,
      systemPrompt: company?.ai_system_prompt || DEFAULT_SYSTEM_PROMPT,
      enabled: company?.ai_enabled ?? true,
    };
  }

  function addMessage(role: 'user' | 'assistant', content: string) {
    messages.value.push({ role, content, timestamp: new Date().toISOString() });
  }

  async function callOpenRouter(
    apiKey: string,
    model: string,
    apiMessages: { role: string; content: string }[],
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
        temperature: 0.3,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({})) as OpenRouterResponse;
      throw new Error(errBody.error?.message || `OpenRouter ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as OpenRouterResponse;
    return data.choices?.[0]?.message?.content || 'Pas de réponse.';
  }

  async function sendMessage(userMessage: string) {
    if (!userMessage.trim()) return;

    const config = getAiConfig();
    if (!config.enabled) {
      addMessage('user', userMessage);
      addMessage('assistant', '⚠️ L\'assistant IA est désactivé pour votre entreprise. Activez-le dans Paramètres > Intelligence Artificielle.');
      return;
    }
    if (!config.apiKey) {
      addMessage('user', userMessage);
      addMessage('assistant', '⚠️ Aucune clé API OpenRouter configurée. Ajoutez votre clé dans Paramètres > Intelligence Artificielle.');
      return;
    }

    addMessage('user', userMessage);
    loading.value = true;
    error.value = null;

    const apiMessages = [
      { role: 'system', content: config.systemPrompt },
      ...messages.value.slice(-20).map(m => ({ role: m.role, content: m.content })),
    ];

    // Try primary model, then fallback
    try {
      activeModel.value = config.model;
      const reply = await callOpenRouter(config.apiKey, config.model, apiMessages);
      addMessage('assistant', reply);
    } catch (primaryErr: unknown) {
      if (config.fallback && config.fallback !== config.model) {
        try {
          activeModel.value = config.fallback + ' (fallback)';
          const reply = await callOpenRouter(config.apiKey, config.fallback, apiMessages);
          addMessage('assistant', reply);
        } catch (fallbackErr: unknown) {
          const msg = fallbackErr instanceof Error ? fallbackErr.message : 'Erreur IA';
          error.value = msg;
          addMessage('assistant', `⚠️ Erreur (modèle principal + fallback) : ${msg}`);
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

  function clearChat() {
    messages.value = [];
    error.value = null;
  }

  return { messages, loading, error, activeModel, sendMessage, clearChat };
}
