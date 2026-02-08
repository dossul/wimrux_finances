import { ref } from 'vue';
import { insforge } from 'src/boot/insforge';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

const SYSTEM_PROMPT = `Tu es un assistant fiscal expert pour le Burkina Faso. Tu aides les utilisateurs de WIMRUX® FINANCES avec :
- La réglementation fiscale burkinabè (TVA, PSVB, timbre quittance, groupes A-P)
- Les factures normalisées certifiées (FNEC) et les exigences DGI
- Le calcul des taxes et la conformité fiscale
- L'interprétation des rapports Z et X
- Les conseils de gestion financière et comptable
- Le régime RNI, RSI, et les obligations déclaratives

Réponds toujours en français. Sois précis et cite les textes réglementaires quand c'est pertinent.`;

export function useAiAssistant() {
  const messages = ref<ChatMessage[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  function addMessage(role: 'user' | 'assistant', content: string) {
    messages.value.push({ role, content, timestamp: new Date().toISOString() });
  }

  async function sendMessage(userMessage: string) {
    if (!userMessage.trim()) return;
    addMessage('user', userMessage);
    loading.value = true;
    error.value = null;

    try {
      const apiMessages = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...messages.value.slice(-20).map(m => ({ role: m.role, content: m.content })),
      ];

      const completion = await insforge.ai.chat.completions.create({
        model: 'anthropic/claude-3.5-haiku',
        messages: apiMessages,
        temperature: 0.3,
        maxTokens: 2048,
      });

      const reply = completion.choices?.[0]?.message?.content || 'Pas de réponse.';
      addMessage('assistant', reply);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur IA';
      error.value = msg;
      addMessage('assistant', `⚠️ Erreur : ${msg}`);
    } finally {
      loading.value = false;
    }
  }

  function clearChat() {
    messages.value = [];
    error.value = null;
  }

  return { messages, loading, error, sendMessage, clearChat };
}
