declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: string;
    VUE_ROUTER_MODE: 'hash' | 'history' | 'abstract' | undefined;
    VUE_ROUTER_BASE: string | undefined;
  }
}

// Vite environment variables interface
interface ImportMetaEnv {
  readonly VITE_INSFORGE_URL: string;
  readonly VITE_INSFORGE_ANON_KEY: string;
  readonly VITE_MCF_API_BASE_URL?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
