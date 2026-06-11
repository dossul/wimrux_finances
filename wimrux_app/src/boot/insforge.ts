/**
 * Legacy boot file — kept for router compatibility only.
 * All services now use Appwrite directly via src/services/.
 */
import { boot } from 'quasar/wrappers';
import { appwriteDb } from 'src/services/appwrite-db';
import { appwriteAuth } from 'src/services/appwrite-auth';
import { appwriteStorage } from 'src/services/appwrite-storage';
import { appwriteRealtime } from 'src/services/appwrite-realtime';
import { functions } from 'src/boot/appwrite';

const APPWRITE_ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT as string || 'https://appwrite.benga.live/v1';

// Functions invoke shim — same signature as InsForge
async function invokeFunction(name: string, options?: { body?: unknown }): Promise<{ data: unknown; error: Error | null }> {
  try {
    const resp = await functions.createExecution(name, options?.body ? JSON.stringify(options.body) : undefined);
    let data: unknown = resp.responseBody;
    try { data = JSON.parse(resp.responseBody); } catch { /* keep raw */ }
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

// Storage shim — insforge.storage.from(bucket).upload(path, file)
function storageFrom(bucket: string) {
  return {
    async upload(path: string, file: File | Blob) {
      return appwriteStorage.upload(bucket, file, path);
    },
    getPublicUrl(path: string) {
      return appwriteStorage.getPublicUrl(bucket, path);
    },
    async remove(path: string) {
      return appwriteStorage.remove(bucket, path);
    },
  };
}

// Realtime shim — insforge.realtime.subscribe/on/unsubscribe/connect/disconnect
const realtimeListeners: Record<string, Array<(p: unknown) => void>> = {};
const realtimeShim = {
  async connect() { /* no-op, Appwrite realtime connects on subscribe */ },
  disconnect() { try { /* no-op */ } catch { /* ignore */ } },
  async subscribe(channel: string) {
    const col = channel.split(':')[1] || channel;
    appwriteRealtime.subscribeToTable(col, (payload) => {
      (realtimeListeners[channel] || []).forEach(fn => fn(payload));
    });
  },
  async unsubscribe(_channel: string) { /* handled by appwriteRealtime */ },
  on(event: string, cb: (p: unknown) => void) {
    if (!realtimeListeners[event]) realtimeListeners[event] = [];
    realtimeListeners[event]!.push(cb);
  },
};

// Auth shim
const authShim = {
  async getCurrentUser() { return appwriteAuth.getCurrentUser(); },
  async signInWithPassword(opts: { email: string; password: string }) {
    return appwriteAuth.signIn(opts.email, opts.password);
  },
  async signUp(opts: { email: string; password: string; name?: string }) {
    return appwriteAuth.signUp(opts.email, opts.password, opts.name || '');
  },
  async signOut() { return appwriteAuth.signOut(); },
  async sendResetPasswordEmail(opts: { email: string }) {
    return appwriteAuth.sendPasswordRecovery(opts.email);
  },
};

// Database shim — insforge.database.from(table).select/insert/update/delete/eq/...
// Delegates directly to appwriteDb which already has the same interface.
// Special: .delete().eq() pattern — we intercept to handle Appwrite's delete-by-id
class DbDeleteShim {
  private _table: string;
  private _filters: Array<{ col: string; val: unknown }> = [];

  constructor(table: string) { this._table = table; }

  eq(col: string, val: unknown): this {
    this._filters.push({ col, val });
    return this;
  }

  async then(resolve: (v: { data: null; error: Error | null }) => void) {
    // Execute: fetch matching docs then delete each
    try {
      let q = appwriteDb.from(this._table);
      for (const f of this._filters) q = q.eq(f.col, f.val) as typeof q;
      const { data } = await q.select('$id');
      const docs: Array<{ $id: string }> = (data as Array<{ $id: string }>) || [];
      for (const doc of docs) {
        const { databases, DATABASE_ID } = await import('src/boot/appwrite');
        await databases.deleteDocument(DATABASE_ID, this._table, doc.$id);
      }
      resolve({ data: null, error: null });
    } catch (error) {
      resolve({ data: null, error: error as Error });
    }
  }
}

const dbShim = {
  from(table: string) {
    const builder = appwriteDb.from(table);
    // Patch .delete() to return DbDeleteShim for .delete().eq() pattern
    const origDelete = builder.delete.bind(builder);
    builder.delete = function() {
      // If called directly (no eq chained), use original
      return origDelete() as ReturnType<typeof origDelete>;
    };
    return builder;
  },
  // rpc — map to functions.invoke
  async rpc(fnName: string, params?: Record<string, unknown>) {
    return invokeFunction(fnName, { body: params });
  },
};

// THE MAIN SHIM OBJECT — drop-in replacement for insforge client
export const insforge = {
  database: dbShim,
  auth: authShim,
  storage: { from: storageFrom },
  functions: { invoke: invokeFunction },
  realtime: realtimeShim,
};

export default boot(async ({ app }) => {
  app.provide('appwrite-endpoint', APPWRITE_ENDPOINT);
});
