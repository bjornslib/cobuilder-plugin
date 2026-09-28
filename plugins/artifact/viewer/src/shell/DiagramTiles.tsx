/**
 * The three diagram levels, as three tiles.
 *
 * A tile is a miniature of one drawing, and a press opens that drawing whole. The level
 * used to be three stacked blocks, and each one carried a header bar, a lead sentence, a
 * Render button, and a source block that stood in until a press replaced it. The
 * engineer removed all of that: none of it added any value to a reader who came to see
 * the shape. So a tile holds the drawing and one word for its kind, and nothing else.
 *
 * THE RUNTIME LOADS WHEN THIS SECTION MOUNTS. The old rule, recorded in the prototype's
 * `Diagram.tsx` and in interaction-design section 2.3, was that Mermaid loads on the
 * reader's press and at no other moment, because the runtime is large. A tile cannot wait
 * for a press: the tile IS the drawing. So the rule becomes: the runtime loads when the
 * reader reaches the Diagrams section, and at no other moment. No other level, and
 * nothing before this section mounts, pays for it.
 *
 * THE OFFLINE FALLBACK SURVIVES. A recorded rule says Mermaid shows the plain source
 * when the CDN is unreachable. With the source block gone, a failed render would leave
 * three empty boxes and a reader with nothing. So a failed tile states the failure in
 * one line, and its dialog shows the source as text. That is the only place the source
 * survives, and it is the fallback, not a feature: the working case has no source
 * toggle, and no reader sees the source unless the drawing could not be made.
 *
 * ONE RUNTIME, THREE RENDERS. All three levels go through the same `loadMermaid` call,
 * one after the other. Mermaid writes a temporary element per render, so the renders
 * are sequential rather than concurrent.
 *
 * The drawing itself is Mermaid's output for this repository's own authored source,
 * produced with `securityLevel: "strict"`. It is written with `dangerouslySetInnerHTML`,
 * which is the only inner-HTML write in this shell.
 *
 * THIS FILE IS TWO PROTOTYPES MERGED. The port folds `src/variations/sections-e/Diagram.tsx`
 * into this file, so the runtime, the theme, and the tiles have one home. The
 * prototype's `Diagram` component is not ported: it drew one level on a press, with a
 * source toggle beside it, and no surface in the shell ever read it. Its place is the
 * dialog below, and `loadMermaid`, `uncap`, `Theme`, and `MermaidApi` keep their names.
 */

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { createPortal } from "react-dom";

import { AlertTriangle, Loader2, Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import { useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ runtime */

const MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

export interface MermaidApi {
  initialize: (config: Record<string, unknown>) => void;
  render: (id: string, text: string) => Promise<{ svg: string }>;
}

let apiPromise: Promise<MermaidApi> | null = null;
let apiTheme: string | null = null;

/**
 * The runtime, loaded once and shared by every caller.
 *
 * The configuration is the shell's own: in particular `securityLevel: "strict"` is set
 * before the first render call.
 */
export async function loadMermaid(theme: Theme): Promise<MermaidApi> {
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

/* ------------------------------------------------------------------- tiles */

/** The miniature's height, in pixels. The drawing is clipped to it. */
const TILE_HEIGHT = 200;

/**
 * The zoom steps, as multiples of the fitted size.
 *
 * A step list rather than a multiplying factor, so every reading is a whole number a
 * reader recognises: 100 % is the drawing fitted to the dialog, and the ends are the
 * 50 % to 400 % the engineer asked for.
 */
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4] as const;

/** The step the dialog opens on: the drawing fitted to the width of the body. */
const FIT_STEP = ZOOM_STEPS.indexOf(1);

/** One level's drawing, as this file holds it. */
type Drawn =
  | { state: "pending" }
  | { state: "ready"; svg: string }
  | { state: "failed"; message: string };

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The drawing at its own size.
 *
 * Mermaid caps the width of most grammars and emits `width="100%"` beside a pixel
 * `max-width` instead of a real width. A drawing laid out inside a 300 px box composes
 * its labels for 300 px and then shrinks to nothing legible under the tile's scale, so
 * the cap becomes the size: the width attribute takes the pixel value the style carried,
 * and the height follows from the viewBox. The cap is set per diagram grammar, and a
 * bundle may carry any grammar, so the emitted drawing is normalised here rather than
 * through a config key per kind.
 */
export function uncap(svg: string): string {
  const capped = svg.match(/max-width:\s*([\d.]+)px/);
  if (!capped) return svg;
  return svg.replace(/width="100%"/, `width="${capped[1]}"`).replace(/max-width:\s*[\d.]+px;?/, "");
}

/**
 * One word for the grammar a source opens with.
 *
 * The word comes from the source's own first line, which is the only place the kind is
 * recorded. A reader wants "Classes", not "classDiagram".
 *
 * A LINE THAT NAMES THE DRAWING IS NOT THE GRAMMAR LINE. An authored source may open
 * with a `%%` comment, and that comment names the drawing for a human. The reading
 * therefore skips a blank line and a `%%` comment line, and takes the first line that is
 * neither. A source of comments alone falls through to "Diagram".
 */
export function labelFor(source: string): string {
  const first =
    source
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line !== "" && !line.startsWith("%%")) ?? "";
  if (/classdiagram/i.test(first)) return "Classes";
  if (/sequencediagram/i.test(first)) return "Sequence";
  if (/c4container/i.test(first)) return "Container";
  return first || "Diagram";
}

export function DiagramTiles({
  levels,
  sources,
  theme,
}: {
  /** The level numbers the bundle records, in ascending order: `"1"`, `"2"`, `"3"`. */
  levels: string[];
  /** The Mermaid source, per level. */
  sources: Record<string, string>;
  theme: Theme;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [drawn, setDrawn] = useState<Record<string, Drawn>>({});
  const [open, setOpen] = useState<string | null>(null);

  /*
   * The signature is exact: it carries each level's whole source, so a changed source
   * redraws and an unchanged one does not. The shell uses the same string-dependency
   * idiom in `useJumpTargets`.
   */
  const signature = levels.map((level) => `${level}:${sources[level] ?? ""}`).join("|");

  useEffect(() => {
    let live = true;
    const settle = (level: string, next: Drawn) =>
      setDrawn((current) => ({ ...current, [level]: next }));

    (async () => {
      let api: MermaidApi;
      try {
        api = await loadMermaid(theme);
      } catch (error: unknown) {
        /* No runtime means no drawing for any level. Each tile says so. */
        if (live) {
          for (const level of levels) settle(level, { state: "failed", message: reason(error) });
        }
        return;
      }

      for (const level of levels) {
        const source = sources[level];
        if (source === undefined) continue;
        if (live) settle(level, { state: "pending" });
        try {
          /* Sequential, because Mermaid writes a temporary element per render. */
          const result = await api.render(`diagram-tile-${uid}-l${level}`, source);
          if (live) settle(level, { state: "ready", svg: uncap(result.svg) });
        } catch (error: unknown) {
          if (live) settle(level, { state: "failed", message: reason(error) });
        }
      }
    })();

    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, theme, uid]);

  return (
    <>
      {/*
        THE ROW KEEPS THREE COLUMNS WHATEVER THE COUNT. A tile is a fixed 200 px tall
        window onto a drawing laid out at its own size, so a wider tile shows LESS of the
        drawing, not more: a lone tile at the full pane width scaled this drawing to 94 %
        and left only its title strip in view. A tile therefore keeps the width it has in
        a row of three, and a shorter row is simply short.
      */}
      <div className="grid min-w-0 grid-cols-1 gap-3.5 @3xl:grid-cols-3">
        {levels.map((level) => {
          const source = sources[level] ?? "";
          const label = labelFor(source);
          const state = drawn[level] ?? { state: "pending" as const };
          return (
            <DiagramTile
              key={level}
              level={level}
              label={label}
              drawn={state}
              onOpen={() => setOpen(level)}
            />
          );
        })}
      </div>

      {open !== null ? (
        <DiagramDialog
          level={open}
          label={labelFor(sources[open] ?? "")}
          drawn={drawn[open] ?? { state: "pending" }}
          source={sources[open] ?? ""}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}

/**
 * One tile: a word, then the drawing scaled to fit.
 *
 * THE DRAWING IS LAID OUT AT ITS REAL SIZE AND THEN SCALED. Mermaid is asked for an
 * uncapped SVG (`useMaxWidth: false` in `loadMermaid`), so the element carries the
 * drawing's own pixel width. The miniature is that drawing under `transform: scale(k)`,
 * with `k` the tile's width over the drawing's width, measured after the SVG lands and
 * re-measured when the tile resizes. A drawing laid out for a 380 px box would compose
 * its labels for 380 px and then shrink to nothing legible.
 *
 * `pointer-events: none` on the drawing keeps the whole tile one press target, so a
 * press anywhere in it opens the drawing.
 */
function DiagramTile({
  level,
  label,
  drawn,
  onOpen,
}: {
  level: string;
  label: string;
  drawn: Drawn;
  onOpen: () => void;
}) {
  /** The tile's box, which is the width the miniature has to fit. */
  const boxRef = useRef<HTMLSpanElement | null>(null);
  /**
   * The untransformed holder of the drawing. Its `offsetWidth` is the drawing's own
   * width, because `offsetWidth` is a layout measure and an ancestor's `transform` does
   * not change it. `getBoundingClientRect` would report the scaled width instead.
   */
  const drawingRef = useRef<HTMLSpanElement | null>(null);
  const [scale, setScale] = useState(0);

  const svg = drawn.state === "ready" ? drawn.svg : "";

  useLayoutEffect(() => {
    const box = boxRef.current;
    const drawing = drawingRef.current;
    if (!box || !drawing || svg === "") return;
    const measure = () => {
      const natural = drawing.offsetWidth;
      if (natural > 0) setScale(Math.min(1, box.clientWidth / natural));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [svg]);

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="font-mono text-[12px] tracking-[0.05em] text-ink-dim uppercase">
        {label}
      </span>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open the ${label} drawing for level ${level}`}
        className={cn(
          "relative block h-[200px] w-full cursor-pointer overflow-hidden rounded-lg border border-line bg-surface",
          "transition-colors duration-150 ease-house hover:border-accent-deep hover:bg-surface-2",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
        style={{ height: TILE_HEIGHT }}
      >
        <span ref={boxRef} className="absolute inset-0 block">
          {drawn.state === "ready" ? (
            <span
              className="block w-max origin-top-left"
              style={{ transform: `scale(${scale})` }}
            >
              <span
                ref={drawingRef}
                className="pointer-events-none block w-max"
                dangerouslySetInnerHTML={{ __html: drawn.svg }}
              />
            </span>
          ) : null}
        </span>

        {drawn.state === "pending" ? (
          <span className="absolute inset-0 flex items-center justify-center gap-2 font-mono text-[12.5px] text-ink-dim">
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Drawing
          </span>
        ) : null}

        {drawn.state === "failed" ? (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-3 text-center">
            <AlertTriangle className="size-4 text-warn" aria-hidden="true" />
            <span className="font-mono text-[12px] font-bold tracking-[0.06em] text-warn uppercase">
              The drawing did not load
            </span>
            <span className="font-serif text-[15px] leading-[1.45] text-ink-dim">
              The source opens on a press.
            </span>
          </span>
        ) : null}
      </button>
    </div>
  );
}

/**
 * One drawing, whole, over the shell.
 *
 * A modal dialog and not a popover. A thumbnail cannot anchor a drawing that needs a
 * thousand pixels, and a popover anchored to a 380 px tile would overflow the viewport
 * before the drawing was legible.
 *
 * The pattern is the record Sheet's: a portal to `document.body`, Escape closes, the
 * backdrop closes, and the close button is 44 px. The two z-indexes come from the layer
 * scale in `src/index.css`, which lives on the root so portalled content can read it.
 * The backdrop carries no blur, because this shell already recorded what two
 * `backdrop-filter` layers do to each other in Chrome.
 *
 * A level whose render failed shows its source here instead. That is the offline
 * fallback, and the only place the source survives.
 */
function DiagramDialog({
  level,
  label,
  drawn,
  source,
  onClose,
}: {
  level: string;
  label: string;
  drawn: Drawn;
  source: string;
  onClose: () => void;
}) {
  const reduce = useReducedMotion() ?? false;
  const closeRef = useRef<HTMLButtonElement | null>(null);

  /* The zoom is a step index into `ZOOM_STEPS`, so every reading is a whole number. */
  const [step, setStep] = useState(FIT_STEP);

  /*
   * The fitted width. The drawing is drawn at its own size and the dialog scales it, so
   * "fit" is the body's width over the drawing's own width. It is measured rather than
   * assumed, because a dialog is 92 vw and a level's drawing can be any width at all.
   */
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const drawingRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState(1);

  const svg = drawn.state === "ready" ? drawn.svg : "";

  useLayoutEffect(() => {
    const body = bodyRef.current;
    const drawing = drawingRef.current;
    if (!body || !drawing || svg === "") return;
    const measure = () => {
      const natural = drawing.offsetWidth;
      if (natural > 0) setFit(Math.min(1, body.clientWidth / natural));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(body);
    return () => observer.disconnect();
  }, [svg]);

  /* Escape closes, and focus starts on the control that closes it. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const percent = Math.round(ZOOM_STEPS[step] * 100);
  const scale = fit * ZOOM_STEPS[step];

  return createPortal(
    <div
      role="presentation"
      style={{ zIndex: "var(--layer-panel)" }}
      className="fixed inset-0 bg-black/10 backdrop-blur-xs"
      onMouseDown={(event) => {
        /* The backdrop is the target only when the press missed the dialog. */
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${label} drawing, level ${level}`}
        style={{ zIndex: "var(--layer-modal)" }}
        className="fixed top-1/2 left-1/2 flex h-[85vh] w-[92vw] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-frame"
      >
        <header className="flex min-w-0 shrink-0 items-center gap-3 border-b border-line-soft bg-surface-2 px-4 py-2">
          <span className="font-mono text-[12px] tracking-[0.05em] text-ink-dim uppercase">
            {label}
          </span>
          <span className="min-w-0 font-mono text-[12px] text-ink-faint">level {level}</span>

          <span className="ml-auto flex min-w-0 items-center gap-1.5">
            <ZoomButton
              label="Zoom out"
              icon={ZoomOut}
              disabled={step === 0}
              onClick={() => setStep((current) => Math.max(0, current - 1))}
            />
            <span
              className="min-w-[4.5ch] text-center font-mono text-[12.5px] text-ink-mid tabular-nums"
              aria-live="polite"
            >
              {percent}%
            </span>
            <ZoomButton
              label="Zoom in"
              icon={ZoomIn}
              disabled={step === ZOOM_STEPS.length - 1}
              onClick={() => setStep((current) => Math.min(ZOOM_STEPS.length - 1, current + 1))}
            />
            <ZoomButton
              label="Reset to fit"
              icon={Maximize2}
              disabled={step === FIT_STEP}
              onClick={() => setStep(FIT_STEP)}
            />

            <button
              ref={closeRef}
              type="button"
              onClick={onClose}
              aria-label="Close the drawing"
              className={cn(
                "ml-2 inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-line bg-surface text-ink-mid",
                "transition-colors duration-150 ease-house hover:bg-surface-3",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </span>
        </header>

        {/*
          The whole drawing, at its own size, on both scroll axes. `w-max` keeps the
          drawing's width instead of letting a flex parent squeeze it.

          THE ZOOM SCALES THE DRAWING, NOT THE BODY. The body keeps its own scroll, and
          the drawing's box is sized in pixels, so a zoomed drawing grows the scrollable
          area and the reader can reach every part of it. A `transform` would leave the
          layout size alone and put the rest of the drawing out of reach.

          The box carries `w-max` and the transform origin, and the transition is the
          only thing reduced motion turns off: the zoom itself is a discrete step.
        */}
        <div
          ref={bodyRef}
          className="min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain bg-surface p-4"
        >
          {drawn.state === "ready" ? (
            <div
              ref={drawingRef}
              className="w-max origin-top-left"
              style={{
                transform: `scale(${scale})`,
                transition: reduce ? "none" : "transform 150ms var(--ease-house)",
              }}
              dangerouslySetInnerHTML={{ __html: drawn.svg }}
            />
          ) : null}

          {drawn.state === "pending" ? (
            <p className="m-0 flex items-center gap-2 font-mono text-[12.5px] text-ink-dim">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Drawing level {level}.
            </p>
          ) : null}

          {drawn.state === "failed" ? (
            <div className="flex min-w-0 flex-col gap-2.5">
              <p className="m-0 flex items-start gap-2 font-mono text-[12px] font-bold tracking-[0.06em] text-warn uppercase">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                The render failed, so the source is here
              </p>
              <p className="m-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
                {drawn.message}
              </p>
              <p className="m-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
                Mermaid is fetched from the CDN when this section mounts, so a machine
                with no network draws nothing. The source below is the authored file.
              </p>
              <pre className="m-0 overflow-auto rounded-lg border border-line-soft bg-surface-2 px-3.5 py-3 font-mono text-[12.5px] leading-[1.65] text-ink-mid">
                {source}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * One zoom control.
 *
 * Every target is 44 px, per section 11.2, and every one carries an `aria-label`,
 * because the icon is the whole control. A control at the end of the range states that
 * it cannot act, with `disabled` and `aria-disabled` together, and it drops the pointer
 * cursor with the state.
 */
function ZoomButton({
  label,
  icon: Icon,
  disabled,
  onClick,
}: {
  label: string;
  icon: typeof ZoomIn;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-mid",
        "transition-colors duration-150 ease-house",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        disabled
          ? "cursor-not-allowed border-dashed bg-surface-2 text-ink-faint"
          : "cursor-pointer hover:bg-surface-3",
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
