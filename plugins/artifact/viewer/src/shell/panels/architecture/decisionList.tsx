import { ScrollText } from "lucide-react";

import BasicAccordion, { type AccordionItem } from "@/components/smoothui/basic-accordion";
import type { AdrEntity } from "@/data/types";

import { AbsentLine, ActionButton, Box, Chip, StateBadge, toneForStage } from "../../atoms";
import type { WorkItem } from "../../model";
import type { AdrRecord } from "../../records";
import type { SheetSubject } from "../../Sheet";

type OpenSheet = (subject: SheetSubject) => void;

export interface DecisionListProps {
  work: WorkItem;
  adrs: Record<string, AdrRecord>;
  openSheet: OpenSheet;
}

/**
 * The linked decisions, as an accordion.
 *
 * The pull request a decision reached used to sit here, as a chip on the row and as a
 * block in the body. The engineer removed it: the work item's own state already says
 * whether the work reached a pull request, so a decision did not need to say it a
 * second time. The whole record is still one press away, and it carries the fields
 * the bundle keeps for it.
 */
export function DecisionList({ work, adrs, openSheet }: DecisionListProps) {
  const only = work.linkedAdrs.length === 1 ? [work.linkedAdrs[0].id] : [];
  return (
    <BasicAccordion
      allowMultiple
      idPrefix="adr"
      defaultExpandedIds={only}
      items={work.linkedAdrs.map((adr) => decisionItem(adr, adrs[adr.id], openSheet))}
    />
  );
}

function decisionItem(adr: AdrEntity, full: AdrRecord | undefined, openSheet: OpenSheet): AccordionItem {
  return {
    id: adr.id,
    title: <DecisionTitle adr={adr} />,
    meta: <DecisionMeta adr={adr} hasBody={Boolean(full)} />,
    content: <DecisionContent adr={adr} full={full} openSheet={openSheet} />,
  };
}

function DecisionTitle({ adr }: { adr: AdrEntity }) {
  return (
    <span className="flex min-w-0 flex-1 items-baseline gap-2.5">
      <span className="shrink-0 font-mono text-[14px] font-bold text-accent-deep">{adr.id}</span>
      <span className="min-w-0 font-serif text-[16px] leading-[1.45]">{adr.title}</span>
    </span>
  );
}

function DecisionMeta({ adr, hasBody }: { adr: AdrEntity; hasBody: boolean }) {
  return (
    <>
      {!hasBody ? (
        <Chip tone="warn" dashed title="No record body was read for this decision.">
          no body
        </Chip>
      ) : null}
      <StateBadge word={adr.state} tone={toneForStage(adr.state)} />
    </>
  );
}

const NO_RULE_TEXT =
  "This decision states no enforceable rule here, so only the title is available. The whole record names the rest.";

function DecisionRule({ rule }: { rule: string | undefined }) {
  if (rule) return <Box label="The rule this decision enforces">{rule}</Box>;
  return <AbsentLine>{NO_RULE_TEXT}</AbsentLine>;
}

function DecisionModules({ modules }: { modules: string[] | undefined }) {
  if (!modules || modules.length === 0) return null;
  return (
    <span className="flex min-w-0 flex-wrap gap-1.5">
      {modules.map((module) => (
        <Chip key={module} className="text-ink-faint">
          {module}
        </Chip>
      ))}
    </span>
  );
}

interface DecisionContentProps {
  adr: AdrEntity;
  full: AdrRecord | undefined;
  openSheet: OpenSheet;
}

function DecisionContent({ adr, full, openSheet }: DecisionContentProps) {
  const open = () => openSheet({ kind: "adr", record: full, title: adr.title, state: adr.state });
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <DecisionRule rule={full?.maps_to?.rule} />
      <DecisionModules modules={full?.maps_to?.modules} />
      <ActionButton icon={ScrollText} onClick={open} ariaLabel={`Open the whole record for ${adr.id}`}>
        Open the whole record
      </ActionButton>
    </div>
  );
}

export function UnresolvedAdrs({ linked, adrs }: { linked: AdrEntity[]; adrs: Record<string, AdrRecord> }) {
  const missing = linked.filter((adr) => adrs[adr.id] === undefined);
  if (missing.length === 0) return null;
  return (
    <AbsentLine>
      {missing.length} named decision
      {missing.length === 1 ? "" : "s"} did not resolve to a decision record:{" "}
      {missing.map((adr) => adr.id).join(", ")}.
    </AbsentLine>
  );
}
