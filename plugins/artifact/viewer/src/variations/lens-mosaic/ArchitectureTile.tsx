/**
 * The Architecture lens. The wide tile, because it holds the diagram sources.
 *
 * It shows two real things and invents neither:
 *
 *   The Mermaid source for each narration level the design carries, drawn by
 *   `MermaidView`. The source always shows. The drawing needs a renderer, which this
 *   app does not install, so the drawing is one click away and says why it is not
 *   there yet.
 *
 *   Every decision the design reaches, from `goal.adrs`, with the decision's real
 *   title and state from the index, and the pull request it lands in from
 *   `joins.adr_to_pull_request`. `cobuilder-viewer` reaches five.
 */

import { useState } from "react";
import { Boxes, ChevronRight, Landmark } from "lucide-react";

import type { AdrEntity, Joins } from "@/data/types";
import { cn } from "@/lib/utils";

import { MermaidSourceList, diagramKind, diagramTitle } from "./MermaidView";
import {
  Chip,
  CLICKABLE_ROW,
  EmptyLensBody,
  LensTile,
  LoadingLine,
  SectionLabel,
} from "./primitives";
import { absenceNote, architectureStatus } from "./lenses";
import type { DesignRecord, RecordsLoad } from "./records";
import type { Theme } from "./theme";

export function ArchitectureTile({
  record,
  load,
  designId,
  adrsById,
  joins,
  theme,
}: {
  record: DesignRecord | null;
  load: RecordsLoad;
  designId: string;
  adrsById: Map<string, AdrEntity>;
  joins: Joins;
  theme: Theme;
}) {
  const status = architectureStatus(record, designId);
  const diagrams = record?.diagrams ?? {};
  const decisions = record?.goal.adrs ?? [];
  const levels = Object.keys(diagrams).length;
  const absent = load.state === "ready" && !status.present;

  const sub =
    load.state === "loading"
      ? "reading the design's diagrams and decisions"
      : load.state === "failed"
        ? "the authored records did not load"
        : absent
          ? "no diagram source and no linked decision"
          : `${levels} diagram ${levels === 1 ? "level" : "levels"} · ${decisions.length} ${
              decisions.length === 1 ? "decision" : "decisions"
            } reached`;

  return (
    <LensTile
      icon={Boxes}
      title="Architecture"
      sub={sub}
      muted={absent || load.state === "failed"}
      action={
        Object.keys(diagrams).length > 0 ? (
          <span className="flex flex-wrap justify-end gap-1.5">
            {Object.keys(diagrams)
              .sort()
              .map((level) => (
                <Chip key={level} tone="muted" title={diagramTitle(diagrams[level]) ?? undefined}>
                  {diagramKind(diagrams[level])}
                </Chip>
              ))}
          </span>
        ) : undefined
      }
    >
      {load.state === "loading" ? (
        <LoadingLine>Reading the diagrams and decisions for {designId}.</LoadingLine>
      ) : null}

      {load.state === "failed" ? (
        <LoadingLine>
          The authored records did not load, so this lens cannot read the diagrams or
          the decisions.
        </LoadingLine>
      ) : null}

      {absent ? (
        <EmptyLensBody
          file={`docs/architecture/designs/${designId}/diagrams/`}
          what={status.missing}
          note={absenceNote(record)}
        />
      ) : null}

      {load.state === "ready" && status.present ? (
        <div className="flex flex-col gap-4">
          {Object.keys(diagrams).length > 0 ? (
            <div>
              <SectionLabel count={Object.keys(diagrams).length}>
                Diagram source, by narration level
              </SectionLabel>
              <MermaidSourceList diagrams={diagrams} theme={theme} />
            </div>
          ) : (
            <p className="m-0 rounded-lg border border-dashed border-line-soft bg-surface-2 px-3.5 py-3 font-serif text-[15.5px] leading-[1.5] text-ink-dim">
              This design carries no diagram. It reaches decisions, which are listed
              below.
            </p>
          )}

          <div>
            <SectionLabel count={decisions.length}>Decisions this design reaches</SectionLabel>
            {decisions.length === 0 ? (
              <p className="m-0 rounded-lg border border-dashed border-line-soft bg-surface-2 px-3.5 py-3 font-serif text-[15.5px] leading-[1.5] text-ink-dim">
                The goal record names no decision.
              </p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {decisions.map((id) => (
                  <DecisionRow
                    key={id}
                    id={id}
                    adr={adrsById.get(id) ?? null}
                    pullRequest={joins.adr_to_pull_request[id] ?? null}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </LensTile>
  );
}

/**
 * One decision, as a row that opens. The title and the state are the index's. The
 * pull request comes from the join, and the row states which path the join took, so
 * a reader can see why the decision landed on that pull request.
 */
function DecisionRow({
  id,
  adr,
  pullRequest,
}: {
  id: string;
  adr: AdrEntity | null;
  pullRequest: { pr: number; via: string; path: string[] } | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <li
      className={cn(
        "overflow-hidden rounded-lg border bg-card",
        open ? "border-primary" : "border-line",
      )}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((was) => !was)}
        className={cn("flex w-full items-start gap-2.5 px-3 py-2.5 text-left", CLICKABLE_ROW)}
      >
        <ChevronRight
          className={cn(
            "mt-0.5 size-4 shrink-0 text-ink-faint transition-transform duration-200 ease-house",
            open && "rotate-90 text-primary",
          )}
          aria-hidden="true"
        />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-mono text-[13px] font-bold text-accent-deep">{id}</span>
            <span className="font-serif text-[15.5px] leading-[1.4] font-semibold underline decoration-line decoration-1 underline-offset-[3px]">
              {adr?.title ?? "This decision is not an entity in the index"}
            </span>
            {adr ? <Chip tone={adr.state === "rejected" ? "dashed" : "good"}>{adr.state}</Chip> : null}
          </span>
        </span>
      </button>

      {open ? (
        <div className="flex flex-col gap-2 border-t border-line-soft bg-surface-2 px-3 py-3">
          <div className="flex items-start gap-2.5">
            <Landmark className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden="true" />
            <p className="m-0 font-serif text-[15px] leading-[1.5] text-ink-mid">
              {adr
                ? "The index carries this decision with its title and state. The record itself sits at docs/architecture/adr/."
                : "goal.json names this decision and the index holds no entity for it, so this variation prints the identifier alone rather than invent a title."}
            </p>
          </div>
          {pullRequest ? (
            <p className="m-0 pl-6 font-mono text-[12.5px] text-ink-dim">
              reaches pull request{" "}
              <span className="font-bold text-foreground">{pullRequest.pr}</span> via{" "}
              {pullRequest.via}
              {pullRequest.path.length > 0 ? ` (${pullRequest.path.join(", ")})` : ""}
            </p>
          ) : (
            <p className="m-0 pl-6 font-mono text-[12.5px] text-ink-faint">
              joins.adr_to_pull_request holds no entry for this decision
            </p>
          )}
        </div>
      ) : null}
    </li>
  );
}
