import { ref } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import { useAuthStore } from 'src/stores/auth-store';
import type { AiTaskType, AiTaskRoute, AiRouting } from 'src/types';
import { useCrypto } from 'src/composables/useCrypto';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const TASK_SYSTEM_PROMPTS: Record<AiTaskType, string> = {
  assistant_fiscal: `Tu es un assistant fiscal expert pour le Burkina Faso. Tu aides les utilisateurs de WIMRUX® FINANCES avec :
- La réglementation fiscale burkinabè (TVA, PSVB, timbre quittance, groupes A-P)
- Les factures électroniques certifiées (FEC) SECeF et les exigences DGI
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
  choices?: { message?: { content?: string; refusal?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  error?: { message?: string; code?: number; metadata?: { reasons?: string[]; flagged_input?: string } };
  moderation?: { flagged?: boolean; categories?: string[] };
}

interface AiCallResult {
  content: string;
  tokens_input: number;
  tokens_output: number;
  latency_ms: number;
  moderation_flagged: boolean;
  moderation_reason: string | null;
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

  const { decrypt } = useCrypto();

  function getCompanyConfig() {
    const company = useCompanyStore().company;
    return {
      encryptedKey: company?.openrouter_api_key || '',
      enabled: company?.ai_enabled ?? true,
      routing: company?.ai_routing || DEFAULT_ROUTING,
      customPrompt: company?.ai_system_prompt || null,
    };
  }

  async function resolveApiKey(encryptedKey: string): Promise<string> {
    if (!encryptedKey) return '';
    // Try to decrypt; if it fails, assume it's a plain key (legacy)
    const { plaintext, error: decErr } = await decrypt(encryptedKey);
    return (!decErr && plaintext) ? plaintext : encryptedKey;
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
  ): Promise<AiCallResult> {
    const startMs = Date.now();
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
    const latency_ms = Date.now() - startMs;

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({})) as OpenRouterResponse;
      const modFlag = errBody.error?.code === 400 && errBody.error?.metadata?.reasons;
      if (modFlag) {
        const reasons = errBody.error?.metadata?.reasons?.join(', ') || 'content_policy';
        throw Object.assign(
          new Error(`Modération: ${reasons}`),
          { moderation_flagged: true, moderation_reason: reasons, latency_ms },
        );
      }
      throw Object.assign(
        new Error(errBody.error?.message || `OpenRouter ${response.status}: ${response.statusText}`),
        { moderation_flagged: false, moderation_reason: null, latency_ms },
      );
    }

    const data = await response.json() as OpenRouterResponse;
    const refusal = data.choices?.[0]?.message?.refusal;
    const modFlagged = !!data.moderation?.flagged || !!refusal;
    const modReason = refusal
      || data.moderation?.categories?.join(', ')
      || null;

    return {
      content: data.choices?.[0]?.message?.content || 'Pas de réponse.',
      tokens_input: data.usage?.prompt_tokens || 0,
      tokens_output: data.usage?.completion_tokens || 0,
      latency_ms,
      moderation_flagged: modFlagged,
      moderation_reason: modReason,
    };
  }

  async function logUsage(params: {
    model: string; task: string; tokens_input: number; tokens_output: number;
    latency_ms: number; status: string; is_fallback: boolean;
    error_message: string | null; moderation_flagged: boolean; moderation_reason: string | null;
  }) {
    try {
      const companyId = useCompanyStore().company?.id;
      const userId = useAuthStore().user?.id;
      if (!companyId || !userId) return;
      await insforge.database.from('ai_usage_logs').insert([{
        company_id: companyId,
        user_id: userId,
        ...params,
      }]);
    } catch {
      // silent — logging should never block the user
    }
  }

  async function sendMessage(userMessage: string, task: AiTaskType = 'assistant_fiscal') {
    if (!userMessage.trim()) return;

    const config = getCompanyConfig();
    if (!config.enabled) {
      addMessage('user', userMessage);
      addMessage('assistant', '⚠️ L\'assistant IA est désactivé. Activez-le dans Paramètres > Intelligence Artificielle.');
      return;
    }
    if (!config.encryptedKey) {
      addMessage('user', userMessage);
      addMessage('assistant', '⚠️ Aucune clé API OpenRouter configurée. Ajoutez-la dans Paramètres > Intelligence Artificielle.');
      return;
    }
    const apiKey = await resolveApiKey(config.encryptedKey);

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
      const result = await callOpenRouter(apiKey, route.model, apiMessages, route.temperature, route.max_tokens);
      addMessage('assistant', result.content);
      void logUsage({ model: route.model, task, tokens_input: result.tokens_input, tokens_output: result.tokens_output, latency_ms: result.latency_ms, status: result.moderation_flagged ? 'moderated' : 'success', is_fallback: false, error_message: null, moderation_flagged: result.moderation_flagged, moderation_reason: result.moderation_reason });
    } catch (primaryErr: unknown) {
      const pErr = primaryErr as { moderation_flagged?: boolean; moderation_reason?: string; latency_ms?: number };
      void logUsage({ model: route.model, task, tokens_input: 0, tokens_output: 0, latency_ms: pErr.latency_ms || 0, status: pErr.moderation_flagged ? 'moderated' : 'error', is_fallback: false, error_message: primaryErr instanceof Error ? primaryErr.message : 'Erreur', moderation_flagged: !!pErr.moderation_flagged, moderation_reason: pErr.moderation_reason || null });

      if (route.fallback && route.fallback !== route.model) {
        try {
          activeModel.value = route.fallback + ' (fallback)';
          const fbResult = await callOpenRouter(apiKey, route.fallback, apiMessages, route.temperature, route.max_tokens);
          addMessage('assistant', fbResult.content);
          void logUsage({ model: route.fallback, task, tokens_input: fbResult.tokens_input, tokens_output: fbResult.tokens_output, latency_ms: fbResult.latency_ms, status: fbResult.moderation_flagged ? 'moderated' : 'success', is_fallback: true, error_message: null, moderation_flagged: fbResult.moderation_flagged, moderation_reason: fbResult.moderation_reason });
        } catch (fallbackErr: unknown) {
          const fbE = fallbackErr as { moderation_flagged?: boolean; moderation_reason?: string; latency_ms?: number };
          void logUsage({ model: route.fallback, task, tokens_input: 0, tokens_output: 0, latency_ms: fbE.latency_ms || 0, status: fbE.moderation_flagged ? 'moderated' : 'error', is_fallback: true, error_message: fallbackErr instanceof Error ? fallbackErr.message : 'Erreur', moderation_flagged: !!fbE.moderation_flagged, moderation_reason: fbE.moderation_reason || null });
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
    if (!config.enabled || !config.encryptedKey) return { result: '', error: 'IA non configurée' };
    const apiKey = await resolveApiKey(config.encryptedKey);
    const route = getTaskRoute(task);
    if (!route.enabled) return { result: '', error: 'Tâche désactivée' };

    const apiMessages = [
      { role: 'system', content: TASK_SYSTEM_PROMPTS[task] },
      { role: 'user', content: prompt },
    ];

    try {
      const res = await callOpenRouter(apiKey, route.model, apiMessages, route.temperature, route.max_tokens);
      void logUsage({ model: route.model, task, tokens_input: res.tokens_input, tokens_output: res.tokens_output, latency_ms: res.latency_ms, status: res.moderation_flagged ? 'moderated' : 'success', is_fallback: false, error_message: null, moderation_flagged: res.moderation_flagged, moderation_reason: res.moderation_reason });
      return { result: res.content, error: null };
    } catch (err: unknown) {
      const e = err as { moderation_flagged?: boolean; moderation_reason?: string; latency_ms?: number };
      void logUsage({ model: route.model, task, tokens_input: 0, tokens_output: 0, latency_ms: e.latency_ms || 0, status: e.moderation_flagged ? 'moderated' : 'error', is_fallback: false, error_message: err instanceof Error ? err.message : 'Erreur', moderation_flagged: !!e.moderation_flagged, moderation_reason: e.moderation_reason || null });
      if (route.fallback && route.fallback !== route.model) {
        try {
          const fbRes = await callOpenRouter(apiKey, route.fallback, apiMessages, route.temperature, route.max_tokens);
          void logUsage({ model: route.fallback, task, tokens_input: fbRes.tokens_input, tokens_output: fbRes.tokens_output, latency_ms: fbRes.latency_ms, status: fbRes.moderation_flagged ? 'moderated' : 'success', is_fallback: true, error_message: null, moderation_flagged: fbRes.moderation_flagged, moderation_reason: fbRes.moderation_reason });
          return { result: fbRes.content, error: null };
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
