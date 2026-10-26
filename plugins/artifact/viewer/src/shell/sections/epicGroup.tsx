import { useMemo } from "react";

import { ListTree, ShieldQuestion } from "lucide-react";

import BasicAccordion, { type AccordionItem } from "@/components/smoothui/basic-accordion";
import type { EpicEntity } from "@/data/types";

import { Chip, Panel } from "../atoms";
import type { WorkItem } from "../model";
import { excerpt } from "../records";
import type { OpenSheet } from "./common";
import { EpicDisclosure, epicOutcome } from "./epicDisclosure";

function EpicRowTitle({ work, epic }: { work: WorkItem; epic: EpicEntity }) {
  return (
    <span className="flex min-w-0 flex-1 items-baseline gap-2.5">
      <span className="shrink-0 font-mono text-[14px] font-bold text-accent-deep">{epic.epic_id}</span>
      <span className="min-w-0 font-serif text-[16px] leading-[1.45]">
        {excerpt(epicOutcome(work, epic) ?? "No outcome recorded.", 120)}
      </span>
    </span>
  );
}

/*
  THE ROW CARRIES NO STATE PILL EITHER. It used to show the refined state beside the
  slice count, and the refined state of every epic in this work is
  `no-pull-request`, which is the join talking about the absence of a pull request
  rather than about the epic. The count is the epic's own content, so it stays.
*/
function EpicRowMeta({ count }: { count: number }) {
  return (
    <Chip title="How many slices this epic owns.">
      {count} {count === 1 ? "slice" : "slices"}
    </Chip>
  );
}

function epicRow(work: WorkItem, epic: EpicEntity, openSheet: OpenSheet): AccordionItem {
  const count = work.slicesByEpic.get(epic.id)?.length ?? 0;
  return {
    id: epic.id,
    title: <EpicRowTitle work={work} epic={epic} />,
    meta: <EpicRowMeta count={count} />,
    content: (
      <EpicDisclosure work={work} epicId={epic.epic_id} index={work.epics.indexOf(epic)} openSheet={openSheet} />
    ),
  };
}

/**
 * How many epics one section of the paged Build level holds, and the cut itself, are
 * stated in `./model.ts` as `epicGroups`. The cut is a derivation, and the shell keeps
 * every derivation in one file. `EpicGroupSection` below states the same rule to the
 * reader, in the panel's own lead.
 */

/** The accordion rows for a set of epics, in the order the caller gives them. */
function epicRows(work: WorkItem, epics: EpicEntity[], openSheet: OpenSheet): AccordionItem[] {
  return epics.map((epic) => epicRow(work, epic, openSheet));
}

function heldEpic(group: EpicEntity[], focusEpic: string | null): string | null {
  return focusEpic !== null && group.some((epic) => epic.epic_id === focusEpic) ? focusEpic : null;
}

interface EpicAccordionProps {
  workId: string;
  items: AccordionItem[];
  held: string | null;
}

/* The key remounts the accordion when the route's epic changes, because
   `defaultExpandedIds` is read once at mount. */
function EpicAccordion({ workId, items, held }: EpicAccordionProps) {
  return (
    <BasicAccordion
      key={`${workId}:${held ?? ""}`}
      items={items}
      allowMultiple
      idPrefix="epic"
      defaultExpandedIds={held !== null ? [`${workId}/${held}`] : []}
    />
  );
}

interface EpicGroupSectionProps {
  work: WorkItem;
  group: EpicEntity[];
  focusEpic: string | null;
  openSheet: OpenSheet;
}

/**
 * One section of the paged Build level: a run of epics in delivery order.
 *
 * The title names the range the section holds, so the strip says which epics are in the
 * box a reader is looking at. The route's epic opens here when it falls in this run, and
 * the section the reader lands on is the one that holds it.
 */
export function EpicGroupSection({ work, group, focusEpic, openSheet }: EpicGroupSectionProps) {
  const items = useMemo(() => epicRows(work, group, openSheet), [work, group, openSheet]);
  const first = group[0]?.epic_id ?? "";
  const last = group[group.length - 1]?.epic_id ?? "";
  return (
    <Panel title={`Epics ${first}–${last}`} icon={ListTree} absent={group.length === 0}
      lead={`${group.length} epics in delivery order.`} count={group.length}>
      <EpicAccordion workId={work.id} items={items} held={heldEpic(group, focusEpic)} />
    </Panel>
  );
}

/** Slices that belong to no epic. It renders only while the bundle holds one. */
export function UnresolvedSlicesSection({ count }: { count: number }) {
  return (
    <Panel title="Unresolved slices" icon={ShieldQuestion} lead="Slices that belong to no epic.">
      <p className="m-0 min-w-0 font-serif text-[16px]">{count} slices belong to no epic.</p>
    </Panel>
  );
}
