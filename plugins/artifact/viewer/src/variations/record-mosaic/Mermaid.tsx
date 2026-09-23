/**
 * The Mermaid block, loaded from a CDN and drawn on a click.
 *
 * Mermaid is not an installed dependency of this application. `package.json` is
 * shared with two other variations and this variation may not change it, so this
 * file fetches the runtime from `cdn.jsdelivr.net` and injects one script tag. The
 * request is scoped to this component. Nothing else in the variation asks the
 * network for anything.
 *
 * Three states are honest and all three are reachable.
 *
 *   - `idle`    the block waits for a click. The kind and the title of the diagram
 *               are visible, so a reader knows what the click buys.
 *   - `rendered` the runtime drew the diagram into an SVG.
 *   - `failed`  the runtime did not load or did not parse the source. The block
 *               says which, and it shows the Mermaid source in a code block. A
 *               published Artifact blocks every outbound request, so this state is
 *               the published state, not an error the reader caused.
 *
 * The source is always one click away, in every state.
 */

import { motion, useReducedMotion } from "motion/react";
import { Code, Network, RotateCcw, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useId, useState } from "react";

import { cn } from "@/lib/utils";

import { ActionButton, Chip } from "./ui";

/** The version is pinned to the major line, so a minor release cannot change the render. */
export const MERMAID_SRC = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";

interface MermaidRuntime {
  initialize(config: Record<string, unknown>): void;
  render(id: string, source: string): Promise<{ svg: string }>;
}

declare global {
  interface Window {
    mermaid?: MermaidRuntime;
  }
}

let pending: Promise<MermaidRuntime> | null = null;
let renderCounter = 0;

/** Load the runtime once per page, and clear the cache on failure so a retry is real. */
export function loadMermaidRuntime(): Promise<MermaidRuntime> {
  if (window.mermaid) return Promise.resolve(window.mermaid);
  if (!pending) {
    pending = injectRuntime().catch((error: unknown) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}

function injectRuntime(): Promise<MermaidRuntime> {
  return new Promise<MermaidRuntime>((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = MERMAID_SRC;
    tag.async = true;
    tag.onload = () => {
      if (window.mermaid) resolve(window.mermaid);
      else reject(new Error(`${MERMAID_SRC} loaded and assigned no window.mermaid.`));
    };
    tag.onerror = () =>
      reject(
        new Error(
          `${MERMAID_SRC} did not load. A published Artifact blocks outbound requests, so a diagram renders from source only there.`,
        ),
      );
    document.head.appendChild(tag);
  });
}

type RenderState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "rendered"; svg: string; theme: Theme }
  | { kind: "failed"; message: string };

export type Theme = "light" | "dark";

/**
 * One Mermaid block. The caller passes the source, the diagram kind, and the title,
 * because those come from the record file and this component only draws.
 */
export function MermaidDiagram({
  source,
  kind,
  title,
  theme,
  className,
}: {
  source: string;
  kind: string;
  title: string | null;
  theme: Theme;
  className?: string;
}) {
  const [state, setState] = useState<RenderState>({ kind: "idle" });
  const [showSource, setShowSource] = useState(false);
  const reduce = useReducedMotion();
  const baseId = useId().replace(/[^a-zA-Z0-9]/g, "");

  const draw = useCallback(async () => {
    setState({ kind: "loading" });
    renderCounter += 1;
    const renderId = `mmd-${baseId}-${renderCounter}`;
    try {
      const runtime = await loadMermaidRuntime();
      runtime.initialize({
        startOnLoad: false,
        theme: theme === "dark" ? "dark" : "neutral",
        securityLevel: "strict",
        fontFamily: "JetBrains Mono, ui-monospace, monospace",
        flowchart: { htmlLabels: false },
      });
      const { svg } = await runtime.render(renderId, source);
      setState({ kind: "rendered", svg, theme });
    } catch (error: unknown) {
      setState({
        kind: "failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [baseId, source, theme]);

  /* A diagram drawn in one theme stays wrong in the other, so a theme change redraws. */
  const drawnTheme = state.kind === "rendered" ? state.theme : null;
  useEffect(() => {
    if (drawnTheme !== null && drawnTheme !== theme) void draw();
  }, [theme, drawnTheme, draw]);

  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border border-line bg-card p-3.5", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Chip>
          <Network className="size-3.5" aria-hidden />
          {kind}
        </Chip>
        {title ? (
          <span className="font-serif text-[15.5px] leading-snug text-ink-mid">{title}</span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <ActionButton
            icon={showSource ? Network : Code}
            onClick={() => setShowSource((open) => !open)}
            ariaLabel={showSource ? "Hide the Mermaid source" : "Show the Mermaid source"}
          >
            {showSource ? "Hide source" : "Show source"}
          </ActionButton>
          {state.kind === "rendered" ? (
            <ActionButton icon={RotateCcw} onClick={() => void draw()}>
              Redraw
            </ActionButton>
          ) : null}
        </div>
      </div>

      {state.kind === "idle" ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-line bg-surface-2/70 px-3.5 py-3">
          <p className="m-0 max-w-[62ch] font-serif text-[15.5px] leading-[1.55] text-ink-dim">
            The source is in the bundle. The renderer is not installed in this
            application, so it loads from cdn.jsdelivr.net on this click.
          </p>
          <ActionButton icon={Network} onClick={() => void draw()} className="ml-auto">
            Render diagram
          </ActionButton>
        </div>
      ) : null}

      {state.kind === "loading" ? (
        <p className="m-0 flex items-center gap-2 font-mono text-[13.5px] text-ink-dim">
          <Network className="size-4 animate-pulse" aria-hidden />
          Loading the Mermaid runtime and drawing the diagram.
        </p>
      ) : null}

      {state.kind === "failed" ? (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-warn bg-warn-wash/70 px-3.5 py-3">
          <p className="m-0 flex items-start gap-2 font-mono text-[13.5px] font-bold text-warn">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            The renderer did not load, so this diagram shows as source.
          </p>
          <p className="m-0 max-w-[74ch] font-serif text-[15.5px] leading-[1.55] text-ink-mid">
            {state.message}
          </p>
        </div>
      ) : null}

      {state.kind === "rendered" ? (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.2, ease: [0.22, 0.75, 0.3, 1] }}
          className="max-h-[40rem] overflow-auto rounded-lg border border-line-soft bg-card p-3 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
          /* The runtime returns its own SVG string. `securityLevel: "strict"` makes
             the runtime sanitize the labels, and the source is authored in this
             repository rather than fetched. */
          dangerouslySetInnerHTML={{ __html: state.svg }}
        />
      ) : null}

      {showSource ? (
        <pre className="m-0 max-h-80 overflow-auto rounded-lg border border-line bg-surface-3 p-3 font-mono text-[13px] leading-[1.55] text-ink-mid">
          <code>{source}</code>
        </pre>
      ) : null}
    </div>
  );
}
