/**
 * Mode two: many pull requests, the select-and-recommend path, drawn as a design.
 *
 * WHAT THIS MODE IS. It is a drawing, not a surface. Every control on it is a control
 * that would exist, drawn where it would sit and labelled with what it would do, and
 * every one of them is inert. A reader must be able to tell in one look that nothing
 * here is wired, so the mode says that in three places: a band at the top, a marker on
 * each step, and a sentence under every control that looks pressable.
 *
 * WHY IT IS DRAWN AND NOT BUILT. `docs/plans/cobuilder-viewer/epic-E7-design.md` puts the
 * multi-pull-request mode, the merge-order simulator, the ledger's three state subtypes,
 * and the path runner out of E7's boundary, and defers them with E11 to E18. Slice 14's
 * job is to fix the shape E7 ports, and a shape is not a behaviour.
 *
 * WHY THE STEPS ARE THE STEPS. The path is: a reader SELECTS the pull requests to reason
 * about, the surface RECOMMENDS an order and says what it would accept, and a reviewer
 * ACCEPTS the recommendation into the ledger. The three are drawn in that order because
 * that is the order the deferred work names them, and each one names the epics it defers
 * with, so an engineer reading this page can find the work.
 *
 * THE POOL IS REAL. The rows under Select are this bundle's own narrated pull requests,
 * read from `window.STORY`, so the sketch is drawn at the size and shape of the corpus an
 * engineer would actually meet. The recommendation under Recommend is shaped like an
 * answer and carries no answer: it says so.
 */

import { Check, ChevronRight, CircleSlash, Filter, ListChecks, Plane, Scale, Shuffle } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Chip, Panel, SectionHeading, StateBadge } from "@/shell/atoms";

import type { StoryEntry } from "./model";

/** The sketch frame every unbuilt block shares, so the mode reads as one drawing. */
const SKETCH = "rounded-lg border border-dashed border-line bg-surface-2/50";

/**
 * One step of the path: what it is, what it would do, and what defers it.
 *
 * The `deferred` list is not decoration. It is the whole reason the step is a drawing,
 * and it names the epics a reader should open to find the work.
 */
function Step({
  number,
  title,
  icon: Icon,
  intent,
  deferred,
  children,
}: {
  number: number;
  title: string;
  icon: typeof Scale;
  intent: string;
  deferred: string;
  children: ReactNode;
}) {
  return (
    <Panel
      span="band"
      title={`Step ${number} · ${title}`}
      icon={Icon}
      lead={intent}
      action={
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <Chip tone="warn" dashed icon={CircleSlash}>
            not wired
          </Chip>
          <Chip dashed className="text-ink-faint">
            {deferred}
          </Chip>
        </span>
      }
    >
      <div className={cn("flex min-w-0 flex-col gap-3 p-3.5", SKETCH)}>{children}</div>
    </Panel>
  );
}

/** A control that would exist. It is drawn, it is inert, and it says so to a reader. */
function SketchControl({
  label,
  note,
  tone = "neutral",
}: {
  label: string;
  note: string;
  tone?: "neutral" | "accent";
}) {
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <button
        type="button"
        disabled
        title={note}
        className={cn(
          "inline-flex min-h-9 cursor-not-allowed items-center gap-2 rounded-full border border-dashed px-3 font-mono text-[12.5px] font-bold",
          tone === "accent" ? "border-line text-ink-dim" : "border-line text-ink-faint",
        )}
      >
        {label}
      </button>
      <span className="font-mono text-[11.5px] leading-tight text-ink-faint">{note}</span>
    </span>
  );
}

/** A placeholder where a computed value would sit. It carries no value and says so. */
function Placeholder({ label }: { label: string }) {
  return (
    <span className="flex min-w-0 flex-col gap-1.5">
      <span className="font-mono text-[12px] tracking-[0.06em] text-ink-faint uppercase">
        {label}
      </span>
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="block h-3 w-full rounded-full bg-line" />
        <span className="block h-3 rounded-full bg-line" style={{ width: "72%" }} />
        <span className="block h-3 rounded-full bg-line" style={{ width: "45%" }} />
      </span>
      <span className="font-mono text-[11.5px] text-ink-faint">
        The shape of an answer. No value is computed anywhere on this page.
      </span>
    </span>
  );
}

export function MultiPrDesign({ entries }: { entries: StoryEntry[] }) {
  const open = entries.filter((entry) => entry.status !== "merged");
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
      <div className="min-w-0 px-6 py-5">
        <SectionHeading
          title="FlightDeck · many pull requests"
          lead="The select-and-recommend path, drawn as a design. Nothing on this page is wired."
          id="flightdeck-multi-heading"
        />

        {/*
          THE ONE STATEMENT THAT MUST NOT BE MISSED. It leads the mode, it names what the
          mode is, and it names why it is not built, so a reader who scrolls no further
          still knows they are reading a drawing.
        */}
        <div className="mb-5 flex min-w-0 flex-col gap-2 rounded-xl border-2 border-dashed border-warn bg-warn-wash px-4 py-3.5">
          <span className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] font-bold tracking-[0.06em] text-warn uppercase">
              This mode is a design, not a shipped surface
            </span>
            <Chip tone="warn" dashed icon={CircleSlash}>
              drawn, not built
            </Chip>
          </span>
          <p className="m-0 max-w-[92ch] font-serif text-[16px] leading-[1.6] text-ink-mid">
            Everything below is a drawing of the path a reader would take to select several
            pull requests and accept a recommendation about them. Every control is inert,
            every number is a placeholder, and no press changes anything. The behaviour is
            deferred with E11 to E13, E14&apos;s ledger, and E15&apos;s path runner, and it
            arrives after this prototype is approved.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Step
            number={1}
            title="Select"
            icon={ListChecks}
            intent="A reader picks the pull requests to reason about. The pool is every narrated pull request in this bundle, and the selection would seed everything downstream."
            deferred="defers with E11"
          >
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <SketchControl label="Select all open" note="Would select the pull requests no merge carries yet." />
              <SketchControl label="Clear" note="Would empty the selection." />
              <SketchControl
                label="Filter by district"
                note="Would narrow the pool by the districts a pull request touched."
                tone="accent"
              />
            </span>

            <ul className="m-0 flex min-w-0 list-none flex-col gap-1.5 p-0">
              {entries.map((entry) => (
                <li key={entry.pr} className="min-w-0 list-none">
                  <span
                    className={cn(
                      "flex min-w-0 items-center gap-2.5 rounded-lg border border-dashed border-line bg-card px-2.5 py-2",
                    )}
                  >
                    <span className="inline-flex size-4 shrink-0 items-center justify-center rounded border border-dashed border-line text-ink-faint">
                      <Check className="size-3" aria-hidden="true" />
                    </span>
                    <span className="shrink-0 font-mono text-[12.5px] font-bold text-ink-faint">
                      PR {entry.pr}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-serif text-[15.5px] text-ink-mid">
                      {entry.title}
                    </span>
                    <StateBadge
                      word={entry.status ?? "unknown"}
                      tone={entry.status === "merged" ? "good" : "accent"}
                    />
                  </span>
                </li>
              ))}
            </ul>

            <span className="font-mono text-[12px] leading-[1.6] text-ink-faint">
              {entries.length} narrated pull requests in this bundle, {open.length} of them
              not merged. A checkbox here is a shape only: pressing it would do nothing, so
              it is drawn as a box rather than as a control.
            </span>
          </Step>

          <Step
            number={2}
            title="Recommend"
            icon={Shuffle}
            intent="The surface orders the selection and says what it would accept: which pull request to read first, and which decision, design, or epic reaches each one."
            deferred="defers with E12 and E13"
          >
            <div className="@container grid min-w-0 grid-cols-12 gap-4">
              <div className="col-span-12 min-w-0 @3xl:col-span-6">
                <Placeholder label="Recommended order" />
              </div>
              <div className="col-span-12 min-w-0 @3xl:col-span-6">
                <Placeholder label="Why this one first" />
              </div>
            </div>
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <SketchControl label="Recompute" note="Would re-run the recommendation over the selection." />
              <SketchControl label="Show the join evidence" note="Would list the decisions, the design, and the epics that reach each pull request." />
            </span>
            <span className="font-mono text-[12px] leading-[1.6] text-ink-faint">
              The one rule the recommendation is already bound by: a pull request is reached
              by a decision, a design, or an epic the index&apos;s joins resolve, and the
              rail reads that join rather than deriving one of its own.
            </span>
          </Step>

          <Step
            number={3}
            title="Accept"
            icon={Scale}
            intent="The path a reviewer accepts. The recommendation is written into the ledger with the reader's own name on it, and the ledger's three state subtypes record how far the reading got."
            deferred="defers with E14 and E15"
          >
            <ol className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
              {[
                "A reader reads the recommendation and its evidence.",
                "A reader accepts it, or asks for a different order.",
                "The ledger records the acceptance, its date, and who made it.",
              ].map((line, index) => (
                <li
                  key={line}
                  className="flex min-w-0 items-start gap-2.5 rounded-lg border border-dashed border-line bg-card px-3 py-2"
                >
                  <span className="mt-0.5 font-mono text-[12px] font-bold text-ink-faint tabular-nums">
                    {index + 1}
                  </span>
                  <span className="min-w-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
                    {line}
                  </span>
                </li>
              ))}
            </ol>
            <span className="flex min-w-0 flex-wrap items-center gap-2">
              <SketchControl label="Accept the recommendation" note="Would write the acceptance into the ledger." tone="accent" />
              <SketchControl label="Ask for a different order" note="Would send the recommendation back for another reading." />
            </span>
            <span className="flex min-w-0 items-center gap-2 font-mono text-[12px] leading-[1.6] text-ink-faint">
              <ChevronRight className="size-3.5 shrink-0" aria-hidden="true" />
              Nothing is written here. The ledger is E14&apos;s, and it does not exist yet.
            </span>
          </Step>

          <Panel
            span="band"
            title="What this mode defers"
            icon={Filter}
            lead="One line per deferred epic, so the work this drawing stands for is findable."
          >
            <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
              {[
                ["E11", "The multi-pull-request surface itself, and the selection step above it."],
                ["E12", "The merge-order simulator, and the order a recommendation would propose."],
                ["E13", "The recommendation rule, and the evidence it would show beside it."],
                ["E14", "The ledger, and its three state subtypes."],
                ["E15", "The path runner that walks an accepted recommendation."],
              ].map(([epic, line]) => (
                <li key={epic} className="flex min-w-0 items-start gap-2.5">
                  <Chip dashed className="shrink-0">
                    {epic}
                  </Chip>
                  <span className="min-w-0 font-serif text-[15.5px] leading-[1.55] text-ink-mid">
                    {line}
                  </span>
                </li>
              ))}
            </ul>
            <span className="mt-3 flex min-w-0 items-center gap-2 font-mono text-[12px] leading-[1.6] text-ink-faint">
              <Plane className="size-3.5 shrink-0" aria-hidden="true" />
              The single-pull-request mode beside this one is real. This one is a drawing of
              where E7 puts the second.
            </span>
          </Panel>
        </div>
      </div>
    </div>
  );
}
