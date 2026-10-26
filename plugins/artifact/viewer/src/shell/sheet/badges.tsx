import type { ReactNode } from "react";

import { Chip, StateBadge, toneForStage } from "../atoms";
import type { AdrRecord } from "../records";
import type { SheetSubject, SubjectOf } from "./subject";

function DecisionState({ state }: { state: string }) {
  return (
    <StateBadge word={state} tone={toneForStage(state)} gloss="The decision's own state field." />
  );
}

function AdrBadges({ subject }: { subject: SubjectOf<"adr"> }) {
  const record = subject.record;
  return (
    <>
      <DecisionState state={subject.state} />
      <Chip>{subject.kind}</Chip>
      {record?.provenance ? <Chip>provenance: {record.provenance}</Chip> : null}
      <UnanchoredChip record={record} />
    </>
  );
}

function UnanchoredChip({ record }: { record: AdrRecord | undefined }) {
  if (!record?.maps_to?.unanchored) return null;
  return (
    <Chip tone="warn" dashed title="No module anchors this rule. It is recorded, not enforced.">
      unanchored
    </Chip>
  );
}

function BoundaryBadges({ subject }: { subject: SubjectOf<"boundary"> }) {
  return (
    <>
      <Chip tone="warn">{subject.kindLabel}</Chip>
      <Chip title={subject.contextEntity?.path ?? "The index holds no context row."}>
        {subject.context}
      </Chip>
    </>
  );
}

function SliceState({ state }: { state: string }) {
  return (
    <StateBadge
      word={state}
      tone={state === "completed" ? "good" : "neutral"}
      gloss="The slice's own state field."
    />
  );
}

function RubricBadges({ subject }: { subject: SubjectOf<"rubric"> }) {
  return (
    <>
      <Chip>{subject.doc.feature_slug}</Chip>
      <Chip>slice {subject.slice.n}</Chip>
      <SliceState state={subject.slice.state} />
    </>
  );
}

function EpicBadges({ subject }: { subject: SubjectOf<"epic-design"> }) {
  return (
    <>
      <Chip>{subject.doc.feature_slug}</Chip>
      <Chip>{subject.epic.epic_id}</Chip>
    </>
  );
}

export function badgesOf(subject: SheetSubject): ReactNode {
  if (subject.kind === "adr") return <AdrBadges subject={subject} />;
  if (subject.kind === "boundary") return <BoundaryBadges subject={subject} />;
  if (subject.kind === "rubric") return <RubricBadges subject={subject} />;
  return <EpicBadges subject={subject} />;
}
