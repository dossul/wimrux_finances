// =============================================================================
// WIMRUX® FINANCES — Global 401 / Token Refresh Interceptor
//
// Patches globalThis.fetch to detect "invalid token" / 401 responses from
// the InsForge backend.  When detected:
//   1. Attempts refreshSession() once
//   2. If successful  → retries the original request with the new token
//   3. If failed      → redirects to /auth/login (forces re-authentication)
//
// This prevents the "invalid token" error shown to end-users when their JWT
// expires mid-session (common after 1h of inactivity).
// =============================================================================
import { boot } from 'quasar/wrappers';
import { useAuthStore } from 'src/stores/auth-store';

// Track whether we're already refreshing to avoid infinite loops
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export default boot(({ store, router }) => {
  const insforgeUrl = import.meta.env.VITE_INSFORGE_URL as string;
  if (!insforgeUrl) return;

  const originalFetch = globalThis.fetch.bind(globalThis);

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    // Only intercept InsForge API calls
    if (!url.startsWith(insforgeUrl)) {
      return originalFetch(input, init);
    }

    const response = await originalFetch(input, init);

    // 401 or body contains "invalid token" / "jwt expired"
    if (response.status === 401) {
      let shouldRefresh = true;

      // Try to read error body to confirm it's a token issue
      try {
        const clone = response.clone();
        const body = await clone.json() as { message?: string; error?: string };
        const msg = (body.message || body.error || '').toLowerCase();
        // Only refresh for token errors, not permission denied
        shouldRefresh = /invalid token|jwt|expired|unauthorized|not authenticated/i.test(msg) || msg === '';
      } catch { /* JSON parse failed — assume token issue */ }

      if (shouldRefresh) {
        // Deduplicate: only one refresh at a time
        if (!isRefreshing) {
          isRefreshing = true;
          const authStore = useAuthStore(store);
          refreshPromise = authStore.refreshSession().finally(() => {
            isRefreshing = false;
            refreshPromise = null;
          });
        }

        const refreshed = await (refreshPromise ?? Promise.resolve(false));

        if (refreshed) {
          // Retry the original request — the InsForge SDK will include the new token
          console.log('[TokenInterceptor] Token refreshed — retrying request:', url);
          return originalFetch(input, init);
        } else {
          // Refresh failed → force logout and redirect
          console.warn('[TokenInterceptor] Refresh failed — redirecting to login');
          const authStore = useAuthStore(store);
          await authStore.logout().catch(() => {/* ignore */});
          void router.push('/auth/login');
        }
      }
    }

    return response;
  };
});
