/**
 * The record Sheet.
 *
 * Deep content does not belong in the scroll pane. An ADR carries fourteen fields,
 * including a full authored markdown body, a Gate 4b design carries six kilobytes of
 * prose, and a boundary rule carries a detail map whose keys differ by rule kind.
 * Stacking any of those inside a panel buries the panel's own subject. So the panel
 * shows the one line that matters and offers a control, and the whole record opens
 * here, in a Sheet over the pane.
 *
 * Two consequences are deliberate.
 *
 *   - The pane does not move when a Sheet opens, so a reader keeps their place in the
 *     work while they read the record.
 *   - The Sheet owns its own scroll on both axes, so a wide table in an ADR body keeps
 *     its integrity without the pane growing a second scrollbar.
 *
 * The Sheet names no source. It used to close every body with a line saying which file
 * the record came from, and the engineer removed every one of those lines from the
 * shell. A reader who opens a decision record wants the record, not the path it was
 * read from.
 *
 * The Sheet carries no pull request block either. It used to open with one, saying
 * which pull request reached the decision, naming its title, and counting the epics on
 * the join's path. The engineer removed it: the work item's own state already says
 * whether the work reached a pull request, so the decision did not need to say it a
 * second time.
 *
 * This file is presentational. It decides no verdict, computes no join, and reads no
 * file. Its caller holds the subject.
 */

import { useCallback, useState } from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";

import { AdrBody } from "./sheet/AdrBody";
import { BoundaryBody } from "./sheet/BoundaryBody";
import { useFocusReturn } from "./sheet/focusReturn";
import { RecordHeader } from "./sheet/header";
import { SheetJumpLinks, useSheetHeadings } from "./sheet/jumpLinks";
import { MetaBody } from "./sheet/MetaBody";
import { titleOf, type RecordSheetProps, type SheetSubject, type SubjectOf } from "./sheet/subject";

export type { RecordSheetProps, SheetSubject } from "./sheet/subject";

function RubricBody({ subject }: { subject: SubjectOf<"rubric"> }) {
  return <MetaBody leadLabel="slice" leadValue={subject.slice.id} doc={subject.doc} />;
}

function EpicDesignBody({ subject }: { subject: SubjectOf<"epic-design"> }) {
  return <MetaBody leadLabel="epic" leadValue={subject.doc.epic_id} doc={subject.doc} />;
}

function SheetBody({ subject }: { subject: SheetSubject }) {
  if (subject.kind === "adr") return <AdrBody subject={subject} />;
  if (subject.kind === "boundary") return <BoundaryBody subject={subject} />;
  if (subject.kind === "rubric") return <RubricBody subject={subject} />;
  return <EpicDesignBody subject={subject} />;
}

/**
 * The Sheet's own scroll container, held as the element the reader works on.
 *
 * IT ARRIVES AFTER THE FIRST RENDER, which is why this is a callback ref and not a
 * lookup by id. The Sheet is a portal that Radix mounts when a subject opens, so an
 * effect that ran on the open would find nothing and never look again. A ref callback
 * puts the element into state the moment it exists, and the reader below re-runs on it.
 *
 * The row lives above the container rather than inside it, so it stays put while the
 * record scrolls under it, and no sticky offset is needed when a link lands a heading.
 */
function useRecordScroll(subject: SheetSubject | null) {
  const [scroll, setScroll] = useState<HTMLDivElement | null>(null);
  const attachScroll = useCallback((element: HTMLDivElement | null) => setScroll(element), []);
  const kind = subject?.kind ?? "";
  const headings = useSheetHeadings(scroll, [kind, subject === null ? "" : titleOf(subject)]);
  return { scroll, attachScroll, headings };
}

const CONTENT_CLASS =
  "flex flex-col gap-0 p-0 data-[side=right]:w-[min(60rem,94vw)] data-[side=right]:sm:max-w-[min(60rem,94vw)]";

/*
 * The width override carries the same `data-[side=right]` variant the registry
 * item uses. Without the matching variant the registry's `w-3/4` wins on
 * specificity, and the Sheet renders 384 px wide, which is too narrow to read
 * an ADR's body in.
 *
 * The Sheet owns its own scroll on both axes, so a wide block stays intact.
 */
function RecordContent({ subject, onCloseAutoFocus }: ContentProps) {
  const { scroll, attachScroll, headings } = useRecordScroll(subject);
  return (
    <SheetContent side="right" className={CONTENT_CLASS} aria-label="A record from the bundle" onCloseAutoFocus={onCloseAutoFocus}>
      <RecordHeader subject={subject} />
      <SheetJumpLinks headings={headings} scroll={scroll} />
      <div ref={attachScroll} className="min-h-0 min-w-0 flex-1 overflow-auto px-4 py-4">
        <SheetBody subject={subject} />
      </div>
    </SheetContent>
  );
}

interface ContentProps {
  subject: SheetSubject;
  onCloseAutoFocus: (event: Event) => void;
}

export function RecordSheet({ subject, onOpenChange }: RecordSheetProps) {
  const returnFocus = useFocusReturn(subject !== null);

  return (
    <Sheet open={subject !== null} onOpenChange={onOpenChange}>
      {subject === null ? null : <RecordContent subject={subject} onCloseAutoFocus={returnFocus} />}
    </Sheet>
  );
}
