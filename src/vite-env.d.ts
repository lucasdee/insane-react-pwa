/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of insane-node-rest-api, without a trailing slash. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
