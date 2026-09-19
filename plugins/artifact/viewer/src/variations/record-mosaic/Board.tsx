/**
 * The board: every design, behind five tabs, each tile carrying the six-record
 * strip that says what the design holds.
 *
 * The lane rule is the one the approved prototype fixes, and the tabs replace its
 * filter row. Four lanes come from `stage`, and a superseded design belongs to no
 * lane, because no work waits on it. It stays reachable under All, which is the one
 * tab that lists it, and its tile says which design superseded it rather than hiding
 * it.
 *
 * Radix `Tabs` is the primitive the repository already wraps in
 * `src/components/ui/tabs.tsx`. This variation uses the primitive directly, because
 * that wrapper fixes a 32-pixel tab height and this surface needs a larger one.
 */

import { motion, useReducedMotion } from "motion/react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { ChevronRight, CircleDashed, GitPullRequest, History, Layers } from "lucide-react";

import { cn } from "@/lib/utils";

import { ScrollArea } from "@/components/ui/scroll-area";

import type { BundleModel, DesignModel } from "./records";
import { RECORD_KINDS } from "./types";
import type { RecordKind } from "./types";
import { Chip, ReadinessPill, StateBadge, plural } from "./ui";

export interface Lane {
  key: string;
  label: string;
  stages: string[];
  blurb: string;
}

export const LANES: Lane[] = [
  {
    key: "all",
    label: "All",
    stages: [],
    blurb:
      "Every design in the record index, superseded ones included. A superseded design holds no lane, because no work is waiting on it, so this tab is the one that lists it.",
  },
  {
    key: "decision",
    label: "Needs a decision",
    stages: ["backlog", "decided"],
    blurb:
      "The design is not settled. Either design mode stopped after the goal, or a decision is recorded and no approved design has followed.",
  },
  {
    key: "build",
    label: "Ready to build",
    stages: ["approved"],
    blurb: "The design is approved. No epic has left the plan, so the work can start.",
  },
  {
    key: "review",
    label: "In review",
    stages: ["review"],
    blurb: "The design reached design mode's review stage and waits on a reviewer.",
  },
  {
    key: "shipped",
    label: "Shipped",
    stages: ["implemented"],
    blurb:
      "The design is implemented. The record still describes the tree, and an epic inside it may still point at an open pull request.",
  },
];

export function laneDesigns(model: BundleModel, lane: Lane): DesignModel[] {
  if (lane.stages.length === 0) return model.designs;
  return model.designs.filter((entry) => lane.stages.includes(entry.design.stage));
}

const RECORD_LABEL: Record<RecordKind, string> = {
  goal: "goal",
  intent: "intent",
  narrative: "narrative",
  assessment: "assessment",
  "pr-draft": "pr-draft",
  diagrams: "diagrams",
};

export function Board({
  model,
  lane,
  onLaneChange,
  onOpen,
}: {
  model: BundleModel;
  lane: string;
  onLaneChange: (value: string) => void;
  onOpen: (id: string) => void;
}) {
  const active = LANES.find((entry) => entry.key === lane) ?? LANES[0];
  const designs = laneDesigns(model, active);

  return (
    <TabsPrimitive.Root
      value={active.key}
      onValueChange={onLaneChange}
      className="flex h-full min-h-0 flex-col gap-0"
    >
      <TabsPrimitive.List
        aria-label="Work lanes"
        className="flex flex-wrap items-stretch gap-x-1 border-b border-line bg-surface-2 px-4"
      >
        {LANES.map((entry) => {
          const count = laneDesigns(model, entry).length;
          return (
            <TabsPrimitive.Trigger
              key={entry.key}
              value={entry.key}
              className="relative -mb-px inline-flex cursor-pointer items-center gap-2 rounded-t-md border-x border-t border-transparent px-4 py-3 font-mono text-[15px] font-bold text-ink-dim transition-colors duration-150 ease-house hover:bg-accent-wash/50 hover:text-foreground data-[state=active]:border-line data-[state=active]:border-b-transparent data-[state=active]:bg-card data-[state=active]:text-accent-deep"
            >
              {entry.label}
              <span className="font-mono text-[13px] font-normal text-ink-faint tabular-nums">
                {count}
              </span>
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>

      <ScrollArea className="min-h-0 flex-1">
        <TabsPrimitive.Content value={active.key} className="mt-0 flex flex-col gap-4 px-4 pt-4 pb-12">
          <div className="flex flex-col gap-2">
            <h2 className="m-0 flex flex-wrap items-baseline gap-2 font-mono text-[17px] font-bold">
              {active.label}
              <span className="font-mono text-[14px] font-normal text-ink-faint tabular-nums">
                {designs.length} {designs.length === 1 ? "design" : "designs"}
              </span>
            </h2>
            <p className="m-0 max-w-[92ch] font-serif text-[16.5px] leading-[1.6] text-ink-mid">
              {active.blurb}
            </p>
            <p className="m-0 max-w-[92ch] font-serif text-[15.5px] leading-[1.55] text-ink-dim">
              Each tile carries a strip of the six authored records:{" "}
              <span className="font-mono text-[14px]">
                {RECORD_KINDS.map((kind) => RECORD_LABEL[kind]).join(", ")}
              </span>
              . A filled pill means the record exists. A dashed pill means it does not,
              and opening the tile names what is missing.
            </p>
          </div>

          {designs.length === 0 ? (
            <p className="m-0 font-serif text-[16px] text-ink-dim">
              No design in this bundle sits in that lane.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {designs.map((design, index) => (
                <DesignTile
                  key={design.design.id}
                  design={design}
                  index={index}
                  onOpen={() => onOpen(design.design.id)}
                />
              ))}
            </div>
          )}
        </TabsPrimitive.Content>
      </ScrollArea>
    </TabsPrimitive.Root>
  );
}

function DesignTile({
  design,
  index,
  onOpen,
}: {
  design: DesignModel;
  index: number;
  onOpen: () => void;
}) {
  const reduce = useReducedMotion();
  const total = design.epics.length;
  const done = design.epics.filter(
    (epic) => epic.status === "completed" || epic.status === "merged",
  ).length;
  const superseded = design.supersededBy !== null;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduce ? 0 : 0.22,
        delay: reduce ? 0 : Math.min(index * 0.02, 0.16),
        ease: [0.22, 0.75, 0.3, 1],
      }}
      whileHover={reduce ? undefined : { y: -3 }}
      className="h-full"
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Open the record mosaic for ${design.design.name}`}
        className={cn(
          "flex h-full w-full cursor-pointer flex-col gap-3 rounded-xl border p-4 text-left transition-shadow duration-150 ease-house hover:shadow-raise",
          superseded
            ? "border-dashed border-line bg-surface-2/60 hover:border-ink-faint"
            : "border-line bg-card shadow-card hover:border-primary",
        )}
      >
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          <h3 className="m-0 min-w-[10ch] flex-1 font-mono text-[18px] leading-[1.25] font-bold tracking-[-0.01em]">
            {design.design.name}
          </h3>
          <StateBadge state={design.design.stage} className="text-[13px]" />
        </div>

        <p className="m-0 font-serif text-[16px] leading-[1.55] text-ink-mid">
          {design.design.outcome}
        </p>

        {superseded ? (
          <p className="m-0 flex items-start gap-2 rounded-lg border border-dashed border-line bg-card px-3 py-2 font-serif text-[15px] leading-[1.5] text-ink-dim">
            <History className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden />
            <span>
              Superseded by{" "}
              <b className="font-mono text-[14px] font-bold text-ink-mid">
                {design.supersededBy}
              </b>
              . No lane holds it. Open the tile for what replaced it.
            </span>
          </p>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] font-bold tracking-[0.05em] text-ink-dim uppercase">
              records
            </span>
            <b className="font-mono text-[14px] text-foreground tabular-nums">
              {design.presentCount} of {RECORD_KINDS.length}
            </b>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {RECORD_KINDS.map((kind) => (
              <span
                key={kind}
                title={`${RECORD_LABEL[kind]}: ${design.verdicts[kind].state}`}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 font-mono text-[12.5px]",
                  design.verdicts[kind].state === "present"
                    ? "border-line bg-surface-2 text-ink-dim"
                    : design.verdicts[kind].state === "partial"
                      ? "border-dashed border-primary/70 bg-accent-wash/50 text-accent-deep"
                      : "border-dashed border-line text-ink-faint",
                )}
              >
                {design.verdicts[kind].state === "present" ? null : (
                  <CircleDashed className="size-3" aria-hidden />
                )}
                {RECORD_LABEL[kind]}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-1.5 border-t border-line-soft pt-3">
          <Chip>
            <Layers className="size-3.5" aria-hidden />
            {done} of {plural(total, "epic", "epics")}
          </Chip>
          {design.slices.length > 0 ? (
            <Chip>{plural(design.slices.length, "slice", "slices")}</Chip>
          ) : null}
          {design.decisions.length > 0 ? (
            <Chip>{plural(design.decisions.length, "decision", "decisions")}</Chip>
          ) : null}
          {design.pullRequests.length > 0 ? (
            <Chip>
              <GitPullRequest className="size-3.5" aria-hidden />
              {design.pullRequests.length}
            </Chip>
          ) : (
            <Chip muted>no PR</Chip>
          )}
          <span className="ml-auto inline-flex items-center gap-1 font-mono text-[13px] font-bold text-accent-deep underline-offset-2">
            records
            <ChevronRight className="size-4" aria-hidden />
          </span>
        </div>
      </button>
    </motion.div>
  );
}

/** The readiness words, defined once on the board so a tile pill needs no tooltip. */
export function BoardKey() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[13px] tracking-[0.05em] text-ink-dim uppercase">
        tile readiness
      </span>
      <ReadinessPill state="present" />
      <span className="font-serif text-[15px] text-ink-dim">the record exists and is complete</span>
      <ReadinessPill state="partial" />
      <span className="font-serif text-[15px] text-ink-dim">it exists and a named part is empty</span>
      <ReadinessPill state="absent" />
      <span className="font-serif text-[15px] text-ink-dim">no record exists, and the tile says what is missing</span>
    </div>
  );
}
