import { ref } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

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

export function useAiAssistant() {
  const messages = ref<ChatMessage[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const activeModel = ref('');

  function getAiConfig() {
    const company = useCompanyStore().company;
    return {
      model: company?.ai_model || DEFAULT_MODEL,
      fallback: company?.ai_fallback_model || DEFAULT_FALLBACK,
      systemPrompt: company?.ai_system_prompt || DEFAULT_SYSTEM_PROMPT,
      enabled: company?.ai_enabled ?? true,
    };
  }

  function addMessage(role: 'user' | 'assistant', content: string) {
    messages.value.push({ role, content, timestamp: new Date().toISOString() });
  }

  async function callModel(model: string, apiMessages: { role: 'user' | 'assistant' | 'system'; content: string }[]) {
    return await insforge.ai.chat.completions.create({
      model,
      messages: apiMessages,
      temperature: 0.3,
      maxTokens: 2048,
    });
  }

  async function sendMessage(userMessage: string) {
    if (!userMessage.trim()) return;

    const config = getAiConfig();
    if (!config.enabled) {
      addMessage('user', userMessage);
      addMessage('assistant', '⚠️ L\'assistant IA est désactivé pour votre entreprise. Activez-le dans Paramètres > Intelligence Artificielle.');
      return;
    }

    addMessage('user', userMessage);
    loading.value = true;
    error.value = null;

    type MsgRole = 'user' | 'assistant' | 'system';
    const apiMessages: { role: MsgRole; content: string }[] = [
      { role: 'system' as MsgRole, content: config.systemPrompt },
      ...messages.value.slice(-20).map(m => ({ role: m.role as MsgRole, content: m.content })),
    ];

    // Try primary model, then fallback
    try {
      activeModel.value = config.model;
      const completion = await callModel(config.model, apiMessages);
      const reply = completion.choices?.[0]?.message?.content || 'Pas de réponse.';
      addMessage('assistant', reply);
    } catch (primaryErr: unknown) {
      // Fallback to secondary model
      if (config.fallback && config.fallback !== config.model) {
        try {
          activeModel.value = config.fallback;
          const fallbackCompletion = await callModel(config.fallback, apiMessages);
          const reply = fallbackCompletion.choices?.[0]?.message?.content || 'Pas de réponse.';
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
