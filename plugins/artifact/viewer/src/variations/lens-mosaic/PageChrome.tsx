/**
 * The page furniture: the corpus line, the theme switch, the load states, and the
 * note that records which prototype assumptions this board still carries.
 *
 * The three load states are here rather than inside a tile, because a reader must
 * see them before any record exists. The skeleton mirrors the mosaic's own spans, so
 * the page does not jump when the data lands.
 */

import { Moon, RotateCw, Sun } from "lucide-react";

import type { RecordIndex } from "@/data/types";
import { cn } from "@/lib/utils";

import { Chip, Disclosure, FOCUS_RING } from "./primitives";
import type { Theme } from "./theme";

export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: Theme;
  onToggle: () => void;
}) {
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={`Switch to the ${next} theme`}
      aria-pressed={theme === "dark"}
      title={`Switch to the ${next} theme`}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line bg-card px-2.5 py-1.5 font-mono text-[12.5px] font-bold text-ink-mid transition-colors duration-150 ease-house hover:bg-surface-2 hover:text-foreground",
        FOCUS_RING,
      )}
    >
      {theme === "dark" ? (
        <Moon className="size-4" aria-hidden="true" />
      ) : (
        <Sun className="size-4" aria-hidden="true" />
      )}
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}

export function CorpusLine({ index }: { index: RecordIndex }) {
  const entities = index.entities;
  const items: Array<[number, string]> = [
    [entities.design.length, "designs"],
    [entities.epic.length, "epics"],
    [entities.slice.length, "slices"],
    [entities.adr.length, "decisions"],
    [entities.pull_request.length, "pull requests"],
  ];
  return (
    <div className="text-right font-mono text-[12.5px] leading-[1.75] text-ink-dim">
      <div>
        {items.map(([count, label], position) => (
          <span key={label}>
            {position > 0 ? <span className="text-ink-faint"> &middot; </span> : null}
            <b className="text-[15px] font-bold text-foreground tabular-nums">{count}</b>{" "}
            {label}
          </span>
        ))}
      </div>
      <div className="text-ink-faint">
        read from <code>.cobuilder-architect/self/data/index.json</code>, schema{" "}
        {index.schema_version}, git {index.sources.git_head.slice(0, 7)}
      </div>
    </div>
  );
}

/**
 * What is real and what is a prototype rule on this board.
 *
 * The list is the static prototype's own list, kept because a reader must be able to
 * tell a recorded number from a rule this board applies. One assumption is gone:
 * the static prototype read the record chips out of each design directory by hand,
 * and this variation reads `data/designs.js` instead, so the chips are now real.
 */
export function PrototypeNotes() {
  return (
    <Disclosure label="What is real on this board, and what is a prototype rule">
      <div className="flex flex-col gap-2.5">
        <p className="m-0 max-w-[86ch] font-serif text-[15.5px] leading-[1.55] text-ink-mid">
          <b>What is real.</b> Every design, its name, its stage, and its outcome come
          from the record index. Every epic, its state, its branch, and its pull request
          come from the index and its joins. Every slice, its score, and its attempt
          count come from the slice table. The intent, problem, solution, architecture,
          risks, and verdict lenses read the authored records in{" "}
          <code className="font-mono text-[13px]">data/designs.js</code>, which{" "}
          <code className="font-mono text-[13px]">shared/build_index.py</code> projects
          from <code className="font-mono text-[13px]">docs/architecture/designs/</code>.
        </p>
        <p className="m-0 max-w-[86ch] font-serif text-[15.5px] leading-[1.55] text-ink-mid">
          <b>What is a prototype rule.</b> The lane assignment. The rule that reads a
          finished epic as merged or completed. The progress bar. And the wide epic and
          slice state vocabulary, which no record carries yet and which this board
          always draws as a dashed, labelled plan.
        </p>
        <p className="m-0 max-w-[86ch] font-serif text-[15.5px] leading-[1.55] text-ink-mid">
          <b>What this variation added.</b> The record chips are real here. The static
          prototype read them out of each design directory by hand, and the index does
          not carry them, so the prototype listed that as an assumption. This board
          reads the same authored records a second way and drops the assumption.
        </p>
        <p className="m-0 max-w-[86ch] font-serif text-[15.5px] leading-[1.55] text-ink-mid">
          <b>What is still simplified.</b> A Mermaid diagram draws only when a reader
          asks for it, because this app installs no Mermaid runtime. The source always
          shows, and the state says which of the two a reader is looking at.
        </p>
      </div>
    </Disclosure>
  );
}

/** The mosaic's own spans, drawn empty. Nothing here is a record. */
export function MosaicSkeleton() {
  const spans = [
    "lg:col-span-12 h-40",
    "lg:col-span-4 h-56",
    "lg:col-span-4 h-56",
    "lg:col-span-4 h-56",
    "lg:col-span-8 h-48",
    "lg:col-span-4 h-48",
  ];
  return (
    <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12" aria-hidden="true">
      {spans.map((span, position) => (
        <div
          key={span + position}
          className={cn(
            "animate-pulse rounded-xl border border-dashed border-line bg-surface-2",
            span,
          )}
        />
      ))}
    </div>
  );
}

export function LoadPanel({
  kind,
  message,
  onRetry,
}: {
  kind: "loading" | "failed";
  message?: string;
  onRetry: () => void;
}) {
  if (kind === "loading") {
    return (
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-2.5" aria-live="polite">
          <Chip tone="accent">reading the record index</Chip>
          <span className="font-mono text-[12.5px] text-ink-dim">
            /bundle/data/index.json and /bundle/data/designs.js
          </span>
        </div>
        <MosaicSkeleton />
      </div>
    );
  }
  return (
    <div
      className="max-w-[86ch] rounded-lg border border-dashed border-warn bg-warn-wash px-4 py-3.5"
      role="alert"
    >
      <p className="m-0 font-mono text-[12.5px] font-bold tracking-[0.08em] text-warn uppercase">
        The record index did not load
      </p>
      <p className="m-0 mt-1.5 font-serif text-[16px] leading-[1.55] text-ink-mid">
        {message}
      </p>
      <p className="m-0 mt-1.5 font-serif text-[16px] leading-[1.55] text-ink-mid">
        The board shows nothing rather than a partial board, because every count on it
        comes from the same file.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          "mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-warn bg-card px-2.5 py-1.5 font-mono text-[12.5px] font-bold text-warn transition-colors duration-150 ease-house hover:bg-warn-wash",
          FOCUS_RING,
        )}
      >
        <RotateCw className="size-4" aria-hidden="true" />
        Read the index again
      </button>
    </div>
  );
}
