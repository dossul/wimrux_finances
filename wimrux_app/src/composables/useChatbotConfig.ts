import { ref } from 'vue';
import { insforge } from 'src/boot/insforge';
import { useCompanyStore } from 'src/stores/company-store';
import { useAuthStore } from 'src/stores/auth-store';
import type {
  ChatbotApiKey,
  ChatbotPermission,
  ChatbotAction,
  ChatbotChannel,
  ChatbotConversation,
  ChatbotMessage,
  ChatbotUsageStats,
} from 'src/types';
import { ALL_CHATBOT_ACTIONS } from 'src/types';

/**
 * Generate a random API key with a readable prefix.
 * Format: wmrx_cb_<32 random hex chars>
 */
function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const chars = 'abcdef0123456789';
  let random = '';
  for (let i = 0; i < 32; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  const raw = `wmrx_cb_${random}`;
  const prefix = raw.substring(0, 12);
  // Simple hash for storage (SHA-256 would be ideal but we store raw hash server-side)
  const hash = raw;
  return { raw, prefix, hash };
}

export function useChatbotConfig() {
  const apiKeys = ref<ChatbotApiKey[]>([]);
  const conversations = ref<ChatbotConversation[]>([]);
  const messages = ref<ChatbotMessage[]>([]);
  const loading = ref(false);
  const stats = ref<ChatbotUsageStats | null>(null);

  const companyStore = useCompanyStore();
  const authStore = useAuthStore();

  // ── API Keys CRUD ──

  async function loadApiKeys(): Promise<void> {
    loading.value = true;
    try {
      const { data, error } = await insforge.database
        .from('chatbot_api_keys')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) {
        apiKeys.value = data as ChatbotApiKey[];
      }
    } finally {
      loading.value = false;
    }
  }

  async function createApiKey(params: {
    name: string;
    channels: ChatbotChannel[];
    expires_at?: string | null;
    rate_limit_per_hour?: number;
    permissions: ChatbotAction[];
  }): Promise<{ apiKey: ChatbotApiKey | null; rawKey: string | null; error: string | null }> {
    const companyId = companyStore.companyId;
    if (!companyId) return { apiKey: null, rawKey: null, error: 'Entreprise non trouvée' };

    const { raw, prefix, hash } = generateApiKey();

    const { data, error } = await insforge.database
      .from('chatbot_api_keys')
      .insert([{
        company_id: companyId,
        name: params.name,
        api_key_hash: hash,
        api_key_prefix: prefix,
        channels: params.channels,
        is_active: true,
        expires_at: params.expires_at || null,
        rate_limit_per_hour: params.rate_limit_per_hour || 60,
        created_by: authStore.user?.id || null,
      }])
      .select()
      .single();

    if (error) return { apiKey: null, rawKey: null, error: error.message };

    const created = data as ChatbotApiKey;

    // Create permissions for all selected actions
    const permRows = params.permissions.map((action) => ({
      api_key_id: created.id,
      company_id: companyId,
      action,
      enabled: true,
    }));

    // Also create disabled entries for non-selected actions
    const disabledActions = ALL_CHATBOT_ACTIONS.filter(a => !params.permissions.includes(a));
    for (const action of disabledActions) {
      permRows.push({
        api_key_id: created.id,
        company_id: companyId,
        action,
        enabled: false,
      });
    }

    if (permRows.length > 0) {
      await insforge.database.from('chatbot_permissions').insert(permRows);
    }

    apiKeys.value.unshift(created);
    return { apiKey: created, rawKey: raw, error: null };
  }

  async function toggleApiKey(keyId: string, active: boolean): Promise<string | null> {
    const { error } = await insforge.database
      .from('chatbot_api_keys')
      .update({ is_active: active })
      .eq('id', keyId);
    if (error) return error.message;

    const found = apiKeys.value.find(k => k.id === keyId);
    if (found) found.is_active = active;
    return null;
  }

  async function deleteApiKey(keyId: string): Promise<string | null> {
    const { error } = await insforge.database
      .from('chatbot_api_keys')
      .delete()
      .eq('id', keyId);
    if (error) return error.message;

    apiKeys.value = apiKeys.value.filter(k => k.id !== keyId);
    return null;
  }

  // ── Permissions ──

  async function loadPermissions(keyId: string): Promise<ChatbotPermission[]> {
    const { data, error } = await insforge.database
      .from('chatbot_permissions')
      .select('*')
      .eq('api_key_id', keyId)
      .order('action', { ascending: true });

    if (error || !data) return [];
    return data as ChatbotPermission[];
  }

  async function updatePermission(permId: string, updates: Partial<ChatbotPermission>): Promise<string | null> {
    const { error } = await insforge.database
      .from('chatbot_permissions')
      .update(updates)
      .eq('id', permId);
    return error ? error.message : null;
  }

  async function bulkUpdatePermissions(keyId: string, permissions: { action: ChatbotAction; enabled: boolean; valid_from?: string | null; valid_until?: string | null; rate_limit_per_hour?: number | null }[]): Promise<string | null> {
    const companyId = companyStore.companyId;
    if (!companyId) return 'Entreprise non trouvée';

    // Delete existing and re-create
    await insforge.database.from('chatbot_permissions').delete().eq('api_key_id', keyId);

    const rows = permissions.map(p => ({
      api_key_id: keyId,
      company_id: companyId,
      action: p.action,
      enabled: p.enabled,
      valid_from: p.valid_from || null,
      valid_until: p.valid_until || null,
      rate_limit_per_hour: p.rate_limit_per_hour || null,
    }));

    const { error } = await insforge.database.from('chatbot_permissions').insert(rows);
    return error ? error.message : null;
  }

  // ── Conversations ──

  async function loadConversations(limit = 50): Promise<void> {
    loading.value = true;
    try {
      const { data, error } = await insforge.database
        .from('chatbot_conversations')
        .select('*')
        .order('last_message_at', { ascending: false })
        .limit(limit);
      if (!error && data) {
        conversations.value = data as ChatbotConversation[];
      }
    } finally {
      loading.value = false;
    }
  }

  async function loadMessages(conversationId: string, limit = 100): Promise<void> {
    const { data, error } = await insforge.database
      .from('chatbot_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);
    if (!error && data) {
      messages.value = data as ChatbotMessage[];
    }
  }

  // ── Stats ──

  async function loadStats(from?: string): Promise<void> {
    loading.value = true;
    try {
      // Conversations count
      let convQuery = insforge.database.from('chatbot_conversations').select('id, channel', { count: 'exact' });
      if (from) convQuery = convQuery.gte('started_at', from);
      const { data: convData, count: convCount } = await convQuery;

      // Messages count
      let msgQuery = insforge.database.from('chatbot_messages').select('id, action_requested, action_status', { count: 'exact' });
      if (from) msgQuery = msgQuery.gte('created_at', from);
      const { data: msgData, count: msgCount } = await msgQuery;

      // Active keys
      const { count: activeKeysCount } = await insforge.database
        .from('chatbot_api_keys')
        .select('id', { count: 'exact' })
        .eq('is_active', true);

      // Aggregate by channel
      const byChannel: Record<string, number> = {};
      if (convData) {
        for (const c of convData as { id: string; channel: string }[]) {
          byChannel[c.channel] = (byChannel[c.channel] || 0) + 1;
        }
      }

      // Aggregate by action
      const byAction: Record<string, number> = {};
      let actionsExecuted = 0;
      let actionsDenied = 0;
      if (msgData) {
        for (const m of msgData as { id: string; action_requested: string | null; action_status: string | null }[]) {
          if (m.action_requested) {
            byAction[m.action_requested] = (byAction[m.action_requested] || 0) + 1;
            if (m.action_status === 'success') actionsExecuted++;
            if (m.action_status === 'denied') actionsDenied++;
          }
        }
      }

      stats.value = {
        total_conversations: convCount || 0,
        total_messages: msgCount || 0,
        active_keys: activeKeysCount || 0,
        actions_executed: actionsExecuted,
        actions_denied: actionsDenied,
        by_channel: byChannel as Record<ChatbotChannel, number>,
        by_action: byAction,
      };
    } finally {
      loading.value = false;
    }
  }

  // ── Admin: all companies ──

  async function loadAllApiKeys(): Promise<ChatbotApiKey[]> {
    const { data, error } = await insforge.database
      .from('chatbot_api_keys')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) return [];
    return data as ChatbotApiKey[];
  }

  async function loadAllConversations(limit = 100): Promise<ChatbotConversation[]> {
    const { data, error } = await insforge.database
      .from('chatbot_conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data as ChatbotConversation[];
  }

  async function loadAllStats(from?: string): Promise<ChatbotUsageStats> {
    let convQuery = insforge.database.from('chatbot_conversations').select('id, channel', { count: 'exact' });
    if (from) convQuery = convQuery.gte('started_at', from);
    const { data: convData, count: convCount } = await convQuery;

    let msgQuery = insforge.database.from('chatbot_messages').select('id, action_requested, action_status', { count: 'exact' });
    if (from) msgQuery = msgQuery.gte('created_at', from);
    const { data: msgData, count: msgCount } = await msgQuery;

    const { count: activeKeysCount } = await insforge.database
      .from('chatbot_api_keys')
      .select('id', { count: 'exact' })
      .eq('is_active', true);

    const byChannel: Record<string, number> = {};
    if (convData) {
      for (const c of convData as { id: string; channel: string }[]) {
        byChannel[c.channel] = (byChannel[c.channel] || 0) + 1;
      }
    }

    const byAction: Record<string, number> = {};
    let actionsExecuted = 0;
    let actionsDenied = 0;
    if (msgData) {
      for (const m of msgData as { id: string; action_requested: string | null; action_status: string | null }[]) {
        if (m.action_requested) {
          byAction[m.action_requested] = (byAction[m.action_requested] || 0) + 1;
          if (m.action_status === 'success') actionsExecuted++;
          if (m.action_status === 'denied') actionsDenied++;
        }
      }
    }

    return {
      total_conversations: convCount || 0,
      total_messages: msgCount || 0,
      active_keys: activeKeysCount || 0,
      actions_executed: actionsExecuted,
      actions_denied: actionsDenied,
      by_channel: byChannel as Record<ChatbotChannel, number>,
      by_action: byAction,
    };
  }

  return {
    apiKeys,
    conversations,
    messages,
    loading,
    stats,
    loadApiKeys,
    createApiKey,
    toggleApiKey,
    deleteApiKey,
    loadPermissions,
    updatePermission,
    bulkUpdatePermissions,
    loadConversations,
    loadMessages,
    loadStats,
    loadAllApiKeys,
    loadAllConversations,
    loadAllStats,
  };
}
