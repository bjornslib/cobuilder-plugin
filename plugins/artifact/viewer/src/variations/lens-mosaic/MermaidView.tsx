/**
 * Mermaid rendering, inside this variation only.
 *
 * THE CHOICE, STATED PLAINLY. Mermaid is not installed in this app, and this
 * variation does not add it, because `package.json` is out of bounds for this work.
 * So the component does both things the brief allows, in this order:
 *
 *   1. The diagram SOURCE always renders. It sits in a preformatted block styled as
 *      code, under a status line that reads "renderer not installed" until a reader
 *      asks for more. That state is explicit, never blank.
 *   2. A "Render diagram" button loads Mermaid 11 from the jsDelivr CDN with a
 *      dynamic import, and draws the source as an SVG. The import sits in this
 *      module, which no other surface imports, so a CDN reference cannot leak into a
 *      packaged file. A vite-ignore comment keeps Vite from resolving the URL at
 *      build time.
 *
 * If the CDN is unreachable, or the source does not parse, the failure is stated
 * with its reason and the source stays on screen. The source is the record. The SVG
 * is one drawing of it.
 *
 * `src/data/bundle.ts` records that a published Artifact sits under a policy that
 * blocks every outbound request. A published build therefore never reaches the CDN,
 * and takes the failure path on purpose.
 */

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Code2, Loader2, Play, RefreshCw } from "lucide-react";

import { cn } from "@/lib/utils";

import { Chip, Disclosure, FOCUS_RING } from "./primitives";
import type { Theme } from "./theme";

const MERMAID_CDN =
  "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

interface MermaidApi {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, text: string) => Promise<{ svg: string }>;
}

let pending: Promise<MermaidApi> | null = null;

function loadMermaid(): Promise<MermaidApi> {
  if (!pending) {
    // The URL passes through a variable so TypeScript reads a dynamic specifier and
    // does not try to resolve a module named "https:".
    const url: string = MERMAID_CDN;
    pending = import(/* @vite-ignore */ url).then((module: unknown) => {
      const candidate = module as { default?: unknown };
      const api = (candidate.default ?? module) as Partial<MermaidApi>;
      if (typeof api.render !== "function" || typeof api.initialize !== "function") {
        throw new Error(`${MERMAID_CDN} did not export a Mermaid API.`);
      }
      return api as MermaidApi;
    });
    // A failed load must not be cached, or the retry button does nothing.
    pending.catch(() => {
      pending = null;
    });
  }
  return pending;
}

let diagramSeq = 0;

type Render =
  | { state: "idle" }
  | { state: "loading" }
  | { state: "ready"; svg: string }
  | { state: "failed"; message: string };

/**
 * The diagram kind is the first word of the source, and that word is real. A
 * `title` line, when the source carries one, is the diagram's own title.
 */
export function diagramKind(source: string): string {
  const first = source.trim().split("\n")[0]?.trim() ?? "";
  return first.length > 0 ? first : "Mermaid";
}

export function diagramTitle(source: string): string | null {
  const line = source
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith("title "));
  if (!line) return null;
  // The C4 title sits behind an indent in the source, so the trim above does the
  // work and this slice drops the keyword.
  return line.slice("title ".length).trim() || null;
}

export function MermaidView({
  level,
  source,
  theme,
}: {
  level: string;
  source: string;
  theme: Theme;
}) {
  const [render, setRender] = useState<Render>({ state: "idle" });
  const idRef = useRef<string>("");

  // A theme change invalidates the drawing, because Mermaid bakes colours into the
  // SVG it returns.
  useEffect(() => {
    setRender({ state: "idle" });
  }, [theme, source]);

  async function draw() {
    setRender({ state: "loading" });
    try {
      const mermaid = await loadMermaid();
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: theme === "dark" ? "dark" : "default",
        fontFamily: "JetBrains Mono, ui-monospace, Menlo, monospace",
      });
      diagramSeq += 1;
      idRef.current = `lens-mosaic-mermaid-${level}-${diagramSeq}`;
      const { svg } = await mermaid.render(idRef.current, source);
      setRender({ state: "ready", svg });
    } catch (error: unknown) {
      setRender({
        state: "failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const kilobytes = (new TextEncoder().encode(source).length / 1024).toFixed(1);
  const title = diagramTitle(source);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone="accent">{diagramKind(source)}</Chip>
        <span className="font-mono text-[13px] font-bold">
          {title ?? `Level ${level} diagram`}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <Chip tone={render.state === "failed" ? "warn" : "plain"}>
            {render.state === "ready" ? "drawn" : render.state === "loading" ? "drawing" : "not drawn"}
          </Chip>
          <button
            type="button"
            onClick={() => void draw()}
            disabled={render.state === "loading"}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-line bg-card px-2.5 py-1.5 font-mono text-[12.5px] font-bold text-ink-mid transition-colors duration-150 ease-house hover:bg-surface-2 hover:text-foreground disabled:cursor-progress disabled:opacity-60",
              FOCUS_RING,
            )}
          >
            {render.state === "ready" ? (
              <RefreshCw className="size-3.5" aria-hidden="true" />
            ) : render.state === "loading" ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Play className="size-3.5" aria-hidden="true" />
            )}
            {render.state === "ready" ? "Redraw" : "Render diagram"}
          </button>
        </span>
      </div>

      {render.state === "ready" ? (
        <div
          className="overflow-x-auto rounded-lg border border-line bg-card px-3 py-3"
          // Mermaid returns SVG markup. securityLevel "strict" sanitises what it was
          // given, and the source comes from this repository's own bundle rather
          // than from a reader.
          dangerouslySetInnerHTML={{ __html: render.svg }}
        />
      ) : null}

      {render.state === "failed" ? (
        <div className="rounded-lg border border-dashed border-warn bg-warn-wash px-3.5 py-3">
          <p className="m-0 flex items-center gap-2 font-mono text-[12.5px] font-bold text-warn">
            <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
            Mermaid did not draw this diagram
          </p>
          <p className="m-0 mt-1.5 font-serif text-[15px] leading-[1.5] text-ink-mid">
            {render.message}
          </p>
          <p className="m-0 mt-1.5 font-serif text-[15px] leading-[1.5] text-ink-mid">
            The source below is the record. Nothing about it changed.
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-line bg-surface-2">
        <div className="flex flex-wrap items-center gap-2 border-b border-line-soft px-3.5 py-2">
          <Code2 className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
          <span className="font-mono text-[12px] font-bold text-ink-mid">
            Mermaid source
          </span>
          <span className="font-mono text-[12px] text-ink-faint tabular-nums">
            {kilobytes} KB
          </span>
          <span className="ml-auto">
            <RendererState state={render.state} />
          </span>
        </div>
        <pre className="m-0 max-h-80 overflow-auto px-3.5 py-3 font-mono text-[13px] leading-[1.6] text-ink-mid">
          <code>{source}</code>
        </pre>
      </div>
    </div>
  );
}

/**
 * The line the brief asks for by name: an explicit "renderer not installed" state.
 * It is true until a reader asks for the draw, and it stays true when the request
 * fails, because the renderer really is not part of this app.
 */
function RendererState({ state }: { state: Render["state"] }) {
  if (state === "ready") {
    return (
      <Chip
        tone="good"
        title="Mermaid 11 drawn from the jsDelivr CDN for this view only."
      >
        renderer loaded from CDN
      </Chip>
    );
  }
  if (state === "loading") {
    return <Chip tone="accent">loading renderer</Chip>;
  }
  return (
    <Chip
      tone="muted"
      title="Mermaid is not a dependency of this app. The source shows as code until a reader asks for the draw."
    >
      renderer not installed
    </Chip>
  );
}

/** Every level's source, behind one disclosure per level. */
export function MermaidSourceList({
  diagrams,
  theme,
}: {
  diagrams: Record<string, string>;
  theme: Theme;
}) {
  const levels = Object.keys(diagrams).sort();
  return (
    <div className="flex flex-col gap-2.5">
      {levels.map((level, index) => (
        <Disclosure
          key={level}
          label={diagramTitle(diagrams[level]) ?? `Level ${level} diagram`}
          kind={diagramKind(diagrams[level])}
          defaultOpen={index === 0}
        >
          <MermaidView level={level} source={diagrams[level]} theme={theme} />
        </Disclosure>
      ))}
    </div>
  );
}
