import { ScrollText } from "lucide-react";
import type { ReactNode } from "react";

import type { AdrRecord } from "@/data/adrs";
import type { ResolvedJoins } from "@/data/joins";
import { cn } from "@/lib/utils";
import { Missing, Panel } from "@/shell/atoms";
import type { SheetSubject } from "@/shell/Sheet";

import { narrationOf, type RowContext } from "./rowContext";
import type { ChangeBodyProps } from "./sectionModel";

const NO_INDEX =
  "The index did not load, so this row cannot read the decisions this change landed. The join that names them lives in the index.";
const DECISION_CLASS = cn(
  "flex min-h-9 w-full min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-line-soft bg-card px-3 py-2 text-left",
  "transition-colors duration-150 ease-house hover:bg-surface-2",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

interface DecisionProps {
  id: string;
  record: AdrRecord | undefined;
  openSheet: (subject: SheetSubject) => void;
}

function subjectFor(id: string, record: AdrRecord | undefined): SheetSubject {
  return { kind: "adr", record, title: record?.title ?? id, state: record?.state ?? "unknown" };
}

function DecisionButton({ id, record, openSheet }: DecisionProps) {
  return (
    <button type="button" onClick={() => openSheet(subjectFor(id, record))} className={DECISION_CLASS}>
      <ScrollText className="size-3.5 shrink-0 text-ink-faint" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-mid">
        {id} · {record?.title ?? "no record in this bundle"}
      </span>
    </button>
  );
}

function DecisionItem(props: DecisionProps) {
  return (
    <li className="min-w-0 list-none">
      <DecisionButton {...props} />
    </li>
  );
}

function Decisions({ props, landed }: { props: ChangeBodyProps; landed: string[] }) {
  if (props.joins === null) return <Missing>{NO_INDEX}</Missing>;
  if (landed.length === 0) return <Missing>This pull request landed no decision record.</Missing>;
  return (
    <ul className="m-0 flex min-w-0 list-none flex-col gap-2 p-0">
      {landed.map((id) => (
        <DecisionItem key={id} id={id} record={props.adrs[id]} openSheet={props.openSheet} />
      ))}
    </ul>
  );
}

/*
 * THE DECISIONS COME FROM THE INDEX'S JOIN, AND FROM NOWHERE ELSE. `entry.adrs` is the
 * story entry's own list, and it and `data/index.json` already disagree about which
 * decisions a change landed. One fact has one source, so this row reads the join the
 * index computed and derives none of it. A null join is the index not loaded, which is
 * stated in place rather than answered from the second list.
 */
function landedOf(joins: ResolvedJoins | null, pr: number): string[] {
  return joins === null ? [] : joins.adrIdsForPullRequest(pr);
}

function decisionsPanel({ props, entry, icon }: RowContext): ReactNode {
  const landed = landedOf(props.joins, entry.pr);
  return (
    <Panel key="decisions" title="Decisions landed" icon={icon} absent={landed.length === 0}>
      <Decisions props={props} landed={landed} />
    </Panel>
  );
}

export function architectureSections(ctx: RowContext): ReactNode[] {
  return [
    <Panel key="mechanism" title="Mechanism" icon={ctx.icon} absent={ctx.level === null}>
      {narrationOf(ctx)}
    </Panel>,
    decisionsPanel(ctx),
  ];
}
