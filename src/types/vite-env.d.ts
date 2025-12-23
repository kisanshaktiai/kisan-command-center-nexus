/// <reference types="vite/client" />

/**
 * Extended Vite environment variables for App Version System
 */
interface ImportMetaEnv {
  /** Current app version from package.json */
  readonly VITE_APP_VERSION: string;
  /** Build hash generated at build time */
  readonly VITE_BUILD_HASH: string;
  /** App key for version API (e.g., USER_APP) */
  readonly VITE_APP_KEY: string;
  /** Supabase project ID */
  readonly VITE_SUPABASE_PROJECT_ID: string;
  /** Supabase publishable key */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  /** Supabase URL */
  readonly VITE_SUPABASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
