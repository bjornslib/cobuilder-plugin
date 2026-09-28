/**
 * Mermaid, inside this component and nowhere else.
 *
 * The bundle holds real diagram source in `window.DESIGNS[design].diagrams`, one
 * entry per level, written from `docs/architecture/designs/<name>/diagrams/level-N.mmd`.
 * This board draws that source.
 *
 * The choice, stated plainly: Mermaid is NOT installed in this application, and the
 * packaging rule that once forbade a runtime is under revision, so this component
 * loads Mermaid 11 from jsdelivr on the first open, by a dynamic import that Vite
 * leaves alone. Nothing outside this file requests it. Two consequences follow, and
 * both are handled here rather than hidden:
 *
 *   - No network means no renderer. The component then says so and shows the diagram
 *     source in a `<pre>`, which is the state the older prototype shipped in.
 *   - A render is a third-party operation on the page. `securityLevel: "strict"` is
 *     set before the first render, and the returned SVG is the only thing written
 *     into the DOM. The source it renders is this repository's own authored file.
 *
 * The theme is passed in, because Mermaid bakes a theme into its output and a theme
 * switch has to re-render rather than re-style.
 */

import { useEffect, useId, useState } from "react";

import { AlertTriangle, Code2, Eye, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import { TextButton } from "./atoms";

const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

interface MermaidApi {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, text: string) => Promise<{ svg: string }>;
}

let apiPromise: Promise<MermaidApi> | null = null;
let apiTheme: string | null = null;

async function loadMermaid(theme: Theme): Promise<MermaidApi> {
  if (!apiPromise) {
    apiPromise = import(/* @vite-ignore */ MERMAID_URL)
      .then((mod: { default?: MermaidApi }) => {
        const api = mod.default;
        if (!api) throw new Error("the mermaid module exported no default");
        return api;
      })
      .catch((error: unknown) => {
        apiPromise = null;
        apiTheme = null;
        throw error;
      });
  }
  const api = await apiPromise;
  if (apiTheme !== theme) {
    api.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: theme === "dark" ? "dark" : "default",
      fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    });
    apiTheme = theme;
  }
  return api;
}

export type Theme = "light" | "dark";

type Render =
  | { state: "loading" }
  | { state: "ready"; svg: string }
  | { state: "failed"; message: string };

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function MermaidDiagram({
  level,
  kind,
  source,
  theme,
}: {
  /** The level number the bundle records: `"1"`, `"2"`, or `"3"`. */
  level: string;
  /** The Mermaid grammar the source opens with, read from the source itself. */
  kind: string;
  source: string;
  theme: Theme;
}) {
  const domId = `mosaic-${useId().replace(/[^a-zA-Z0-9]/g, "")}-l${level}`;
  const [render, setRender] = useState<Render>({ state: "loading" });
  const [showSource, setShowSource] = useState(false);

  useEffect(() => {
    let live = true;
    setRender({ state: "loading" });
    loadMermaid(theme)
      .then((api) => api.render(domId, source))
      .then((result) => {
        if (live) setRender({ state: "ready", svg: result.svg });
      })
      .catch((error: unknown) => {
        if (live) setRender({ state: "failed", message: reason(error) });
      });
    return () => {
      live = false;
    };
  }, [domId, source, theme]);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[12.5px] text-ink-mid">
          Level {level} · {kind}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {render.state === "ready" ? (
            <TextButton
              icon={showSource ? Eye : Code2}
              onClick={() => setShowSource(!showSource)}
              title="Switch between the drawn diagram and the Mermaid source it draws."
            >
              {showSource ? "Show the diagram" : "Show the source"}
            </TextButton>
          ) : null}
        </span>
      </div>

      {render.state === "loading" ? (
        <p className="m-0 flex items-center gap-2 font-mono text-[12.5px] text-ink-dim">
          <Loader2 className="size-4 animate-spin" />
          Loading the Mermaid renderer from jsdelivr, then drawing this source.
        </p>
      ) : null}

      {render.state === "failed" ? (
        <div className="rounded-lg border border-dashed border-warn bg-warn-wash px-3.5 py-3">
          <p className="m-0 flex items-start gap-2 font-mono text-[12px] font-bold tracking-[0.06em] text-warn uppercase">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            The renderer did not load, so this board draws nothing
          </p>
          <p className="mt-2 mb-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
            {render.message}
          </p>
          <p className="mt-2 mb-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
            Mermaid is not installed in this application. The source below is the
            bundle&apos;s own file, and it is what the shipped viewer draws.
          </p>
        </div>
      ) : null}

      {render.state === "ready" && !showSource ? (
        <div
          className="overflow-x-auto rounded-lg border border-line-soft bg-surface px-3.5 py-3 [&_svg]:mx-auto [&_svg]:max-w-full"
          /*
           * The only inner-HTML write in this variation. The string is Mermaid's own
           * output for this repository's authored source, produced with
           * `securityLevel: "strict"`.
           */
          dangerouslySetInnerHTML={{ __html: render.svg }}
        />
      ) : null}

      {render.state === "failed" || showSource ? (
        <pre
          className={cn(
            "m-0 max-h-[26rem] overflow-auto rounded-lg border border-line-soft bg-surface-2 px-3.5 py-3",
            "font-mono text-[13px] leading-[1.65] text-ink-mid",
          )}
        >
          {source}
        </pre>
      ) : null}
    </div>
  );
}
