/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_AUTH_MODE?: "local" | "oidc" | "both"
  readonly VITE_CF_LOGOUT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
