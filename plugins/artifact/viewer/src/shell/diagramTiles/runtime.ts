const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

export interface MermaidApi {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, text: string) => Promise<{ svg: string }>;
}

export type Theme = "light" | "dark";

let apiPromise: Promise<MermaidApi> | null = null;
let apiTheme: string | null = null;

function apiOf(mod: { default?: MermaidApi }): MermaidApi {
  const api = mod.default;
  if (!api) throw new Error("the mermaid module exported no default");
  return api;
}

function resetRuntime(error: unknown): never {
  apiPromise = null;
  apiTheme = null;
  throw error;
}

function importMermaid(): Promise<MermaidApi> {
  return import(/* @vite-ignore */ MERMAID_URL).then(apiOf).catch(resetRuntime);
}

function configure(api: MermaidApi, theme: Theme): void {
  api.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme: theme === "dark" ? "dark" : "default",
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
  });
  apiTheme = theme;
}

/**
 * The runtime, loaded once and shared by every caller.
 *
 * The configuration is the shell's own: in particular `securityLevel: "strict"` is set
 * before the first render call.
 */
export async function loadMermaid(theme: Theme): Promise<MermaidApi> {
  if (!apiPromise) apiPromise = importMermaid();
  const api = await apiPromise;
  if (apiTheme !== theme) configure(api, theme);
  return api;
}
