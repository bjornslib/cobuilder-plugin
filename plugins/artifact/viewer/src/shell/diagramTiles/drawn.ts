import { useEffect, useId, useRef, useState } from "react";

import { loadMermaid, type MermaidApi, type Theme } from "./runtime";
import { sizeFromViewBox, uncap } from "./svgText";

export type Drawn =
  | { state: "pending" }
  | { state: "ready"; svg: string }
  | { state: "failed"; message: string };

type Settle = (level: string, next: Drawn) => void;
type SetDrawn = (update: (current: Record<string, Drawn>) => Record<string, Drawn>) => void;

interface DrawRequest {
  levels: string[];
  sources: Record<string, string>;
  theme: Theme;
  uid: string;
}

interface Drawer {
  api: MermaidApi;
  uid: string;
  settle: Settle;
  sources: Record<string, string>;
}

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/*
  The named runtime slot (ADR-0036) is authored inline SVG, checked by
  `check_design_svg.py` at authoring time. It never enters the mermaid pipeline, because
  it is already a drawing. This effect settles it before any mermaid load, so a failed
  CDN load never blanks it. A script element means the validator was skipped, so the
  tile says so instead of rendering the file raw.
*/
function settleRuntime(source: string | undefined, settle: Settle): void {
  if (source === undefined) return;
  settle(
    "runtime",
    /<script/i.test(source)
      ? { state: "failed", message: "authored SVG carries a <script> element" }
      : { state: "ready", svg: sizeFromViewBox(source) },
  );
}

/* A failed runtime load leaves no drawing for any level, so each tile says so. */
function failAll(levels: string[], error: unknown, settle: Settle): void {
  for (const level of levels) {
    if (level !== "runtime") settle(level, { state: "failed", message: reason(error) });
  }
}

async function drawLevel(drawer: Drawer, level: string): Promise<void> {
  const source = drawer.sources[level];
  if (source === undefined || level === "runtime") return;
  drawer.settle(level, { state: "pending" });
  try {
    /* Sequential, because Mermaid writes a temporary element per render. */
    const result = await drawer.api.render(`diagram-tile-${drawer.uid}-l${level}`, source);
    drawer.settle(level, { state: "ready", svg: uncap(result.svg) });
  } catch (error: unknown) {
    drawer.settle(level, { state: "failed", message: reason(error) });
  }
}

async function drawLevels(request: DrawRequest, settle: Settle): Promise<void> {
  const { levels, sources, theme, uid } = request;
  const api = await loadMermaid(theme).catch((error: unknown) => failAll(levels, error, settle));
  if (!api) return;
  const drawer = { api, uid, settle, sources };
  for (const level of levels) await drawLevel(drawer, level);
}

function startDrawing(request: DrawRequest, setDrawn: SetDrawn): () => void {
  let live = true;
  const settle: Settle = (level, next) => {
    if (live) setDrawn((current) => ({ ...current, [level]: next }));
  };
  settleRuntime(request.sources["runtime"], settle);
  void drawLevels(request, settle);
  return () => {
    live = false;
  };
}

/*
 * The signature is exact: it carries each level's whole source, so a changed source
 * redraws and an unchanged one does not. The shell uses the same string-dependency
 * idiom in `useJumpTargets`.
 */
function signatureOf(levels: string[], sources: Record<string, string>): string {
  return levels.map((level) => `${level}:${sources[level] ?? ""}`).join("|");
}

function useLatest<T>(value: T) {
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}

export function useDrawn(levels: string[], sources: Record<string, string>, theme: Theme) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [drawn, setDrawn] = useState<Record<string, Drawn>>({});
  const latest = useLatest({ levels, sources });
  const signature = signatureOf(levels, sources);
  useEffect(() => startDrawing({ ...latest.current, theme, uid }, setDrawn), [signature, theme, uid, latest]);
  return drawn;
}
