/**
 * The intended state vocabulary, drawn beside the state the record carries.
 *
 * This is the answer to the widened-state feedback, and the hard part is honesty.
 * The data does not carry `in-progress`, `blocked`, `in-review`, `red`, `green`,
 * `validated`, `failed`, or `skipped`. Nothing here writes one of those onto a
 * record. Instead the rail does three things:
 *
 *   1. It draws the intended vocabulary as an explicitly marked plan. Every step is
 *      dashed, and the legend says no record carries these yet.
 *   2. It marks the one step the record's real state maps to, with a hollow marker
 *      and the mapping rule in plain words underneath. The rule text always shows,
 *      so a reader never has to hover to learn where a state came from.
 *   3. It keeps the real state next to it, in the badge the tile already carries.
 *
 * A state with no rule draws no marker and says so. `unknown` is the real example:
 * `gh` could not answer, so this prototype places nothing.
 */

import { CornerDownRight } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { Chip } from "./primitives";
import type { StateMapping, VocabStep } from "./vocab";

export function StateRail({
  scope,
  vocabulary,
  mapping,
  raw,
  rawSource,
}: {
  scope: string;
  vocabulary: VocabStep[];
  mapping: StateMapping | null;
  raw: string;
  rawSource: string;
}) {
  const step = mapping?.step ?? null;
  const mapped = step ? vocabulary.find((entry) => entry.key === step) : null;

  return (
    <div className="rounded-lg border border-line-soft bg-surface-2 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-0.5 font-mono text-[12px] font-bold tracking-[0.06em] text-ink-faint uppercase">
          intended {scope}
        </span>
        {vocabulary.map((entry) => {
          const on = entry.key === step;
          const marker = (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 font-mono text-[12px] whitespace-nowrap",
                on
                  ? "border-2 border-dashed border-primary bg-accent-wash font-bold text-accent-deep"
                  : "border-dashed border-line-soft text-ink-faint",
              )}
            >
              {on ? (
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full border border-primary bg-transparent"
                />
              ) : null}
              {entry.label}
            </span>
          );
          return on ? (
            <Tooltip key={entry.key}>
              <TooltipTrigger asChild>{marker}</TooltipTrigger>
              <TooltipContent className="max-w-80 font-serif text-[14px] leading-snug">
                {entry.gloss}
              </TooltipContent>
            </Tooltip>
          ) : (
            <span key={entry.key}>{marker}</span>
          );
        })}
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <CornerDownRight
          className="size-3.5 shrink-0 self-center text-ink-faint"
          aria-hidden="true"
        />
        <StateQuote raw={raw} rawSource={rawSource} />
        {mapped ? (
          <span className="font-serif text-[14.5px] leading-[1.45] text-ink-dim">
            {mapping?.rule}
          </span>
        ) : (
          <span className="font-serif text-[14.5px] leading-[1.45] text-ink-dim">
            {mapping?.rule ??
              `This prototype has no rule for the state "${raw}", so it places no marker on the rail.`}
          </span>
        )}
      </div>
    </div>
  );
}

function StateQuote({ raw, rawSource }: { raw: string; rawSource: string }) {
  return (
    <span className="font-mono text-[12px] text-ink-dim">
      the index carries{" "}
      <span className="font-bold text-foreground">{raw}</span>
      <span className="text-ink-faint"> ({rawSource})</span>
    </span>
  );
}

/**
 * The legend. It renders near the top of the Build tile and states the whole
 * intent once, so an individual rail does not have to.
 */
export function StateLegend({
  scope,
  vocabulary,
  from,
  note,
}: {
  scope: string;
  vocabulary: VocabStep[];
  from: string;
  note: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface-2 px-3.5 py-3">
      <div className="mb-2 flex flex-wrap items-baseline gap-2">
        <span className="font-mono text-[12px] font-bold tracking-[0.06em] text-warn uppercase">
          prototype schema
        </span>
        <span className="font-mono text-[12px] font-bold text-ink-mid">
          intended {scope} states
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {vocabulary.map((entry, index) => (
          <span key={entry.key} className="flex items-center gap-1.5">
            {index > 0 ? (
              <span aria-hidden="true" className="font-mono text-[12px] text-ink-faint">
                &rarr;
              </span>
            ) : null}
            <Chip tone="dashed" title={entry.gloss}>
              {entry.label}
            </Chip>
          </span>
        ))}
      </div>
      <p className="m-0 mt-2 max-w-[76ch] font-serif text-[14.5px] leading-[1.5] text-ink-mid">
        No record carries this vocabulary yet. {note}
      </p>
      <p className="m-0 mt-1.5 font-mono text-[12px] text-ink-faint">
        read from {from}
      </p>
    </div>
  );
}
