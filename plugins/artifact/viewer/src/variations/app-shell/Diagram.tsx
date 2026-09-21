/**
 * One diagram level: the Mermaid source as code, and a control that draws it.
 *
 * The initial state is the source. The runtime is a large dependency, so a reader who
 * wants one diagram should not pay for it on first paint. The runtime therefore loads
 * on the reader's press and at no other moment, per interaction-design section 2.3 and
 * the diagram panel state table in section 3.2.
 *
 * Two consequences follow, and the panel states both rather than hiding them.
 *
 *   - No network means no renderer, so the panel reports the failure and keeps the
 *     source on screen.
 *   - A render is a third-party operation on this page. The runtime is initialized
 *     with `securityLevel: "strict"` before its first call, and its returned SVG is
 *     the only string written into the DOM. The source it draws is this repository's
 *     own authored file.
 *
 * The theme is passed in, because Mermaid bakes a theme into its output and a theme
 * switch has to redraw rather than restyle.
 */

import { useId, useState } from "react";

import { AlertTriangle, Code2, Eye, Loader2, Play } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

import { Chip } from "./atoms";

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
  | { state: "source" }
  | { state: "rendering" }
  | { state: "ready"; svg: string }
  | { state: "failed"; message: string };

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function Diagram({
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
  const domId = `shell-${useId().replace(/[^a-zA-Z0-9]/g, "")}-l${level}`;
  const [render, setRender] = useState<Render>({ state: "source" });
  const [showSource, setShowSource] = useState(false);
  const reduce = useReducedMotion();

  function draw() {
    setRender({ state: "rendering" });
    loadMermaid(theme)
      .then((api) => api.render(domId, source))
      .then((result) => setRender({ state: "ready", svg: result.svg }))
      .catch((error: unknown) => setRender({ state: "failed", message: reason(error) }));
  }

  const drawn = render.state === "ready" && !showSource;

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-card shadow-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-line-soft bg-surface-2 px-4 py-2.5">
        <Chip tone="accent">{`level ${level}`}</Chip>
        <span className="font-mono text-[12.5px] text-ink-mid">{kind}</span>
        <span className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={draw}
            disabled={render.state === "rendering"}
            className={cn(
              /*
               * The hover stays in the light tint family. It used to fill with
               * `--primary`, which is a deep teal and reads as the heading colour.
               * See the heading rule in `index.css`.
               */
              "inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-primary bg-accent-wash px-3.5 font-mono text-[12.5px] font-bold text-accent-deep",
              "transition-colors duration-150 ease-house hover:border-accent-deep hover:bg-tint",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              "disabled:cursor-not-allowed disabled:opacity-60",
            )}
          >
            {render.state === "rendering" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="size-4" aria-hidden="true" />
            )}
            {render.state === "ready" ? "Render again" : "Render"}
          </button>
          {render.state === "ready" ? (
            <button
              type="button"
              onClick={() => setShowSource(!showSource)}
              className={cn(
                "inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 font-mono text-[12.5px] text-ink-mid",
                "transition-colors duration-150 ease-house hover:bg-surface-2 hover:text-foreground",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
            >
              {showSource ? <Eye className="size-4" aria-hidden="true" /> : <Code2 className="size-4" aria-hidden="true" />}
              {showSource ? "Show the drawing" : "Show the source"}
            </button>
          ) : null}
        </span>
      </div>

      <div className="px-4 pb-4">
        {render.state === "rendering" ? (
          <div className="flex flex-col gap-2">
            <p className="m-0 font-mono text-[12.5px] text-ink-dim" aria-live="polite">
              Loading the Mermaid runtime from jsdelivr, then drawing this source.
            </p>
            <div
              className="h-[240px] animate-pulse rounded-lg border border-dashed border-line bg-surface-2"
              aria-hidden="true"
            />
          </div>
        ) : null}

        {render.state === "failed" ? (
          <div className="mb-3 rounded-lg border border-dashed border-warn bg-warn-wash px-3.5 py-3">
            <p className="m-0 flex items-start gap-2 font-mono text-[12px] font-bold tracking-[0.06em] text-warn uppercase">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              The render failed, so the source stays on screen
            </p>
            <p className="mt-2 mb-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
              {render.message}
            </p>
            <p className="mt-2 mb-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
              Mermaid is not installed in this application. The runtime is fetched from
              the CDN on the press, so a machine with no network draws nothing.
            </p>
          </div>
        ) : null}

        {drawn ? (
          <motion.div
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: [0.22, 0.75, 0.3, 1] }}
            className="overflow-auto rounded-lg border border-line-soft bg-surface px-3.5 py-3 [&_svg]:mx-auto [&_svg]:max-w-full"
            /*
             * The only inner-HTML write in this shell. The string is Mermaid's own
             * output for this repository's authored source, produced with
             * `securityLevel: "strict"`.
             */
            dangerouslySetInnerHTML={{ __html: render.svg }}
          />
        ) : null}

        {!drawn && render.state !== "rendering" ? (
          <pre className="m-0 max-h-[22rem] overflow-auto rounded-lg border border-line-soft bg-surface-2 px-3.5 py-3 font-mono text-[12.5px] leading-[1.65] text-ink-mid">
            {source}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
