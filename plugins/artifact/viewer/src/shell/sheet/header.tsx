import { AlertOctagon, ClipboardCheck, ListChecks, ScrollText, type LucideIcon } from "lucide-react";

import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import { badgesOf } from "./badges";
import { descriptionOf, titleOf, type SheetSubject } from "./subject";

const ICON: Record<SheetSubject["kind"], LucideIcon> = {
  adr: ScrollText,
  boundary: AlertOctagon,
  "epic-design": ListChecks,
  rubric: ClipboardCheck,
};

function RecordIcon({ kind }: { kind: SheetSubject["kind"] }) {
  const Icon = ICON[kind];
  return (
    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-accent-deep">
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}

function HeaderTitle({ subject }: { subject: SheetSubject }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <RecordIcon kind={subject.kind} />
      <SheetTitle className="min-w-0 font-mono text-[17px] font-bold tracking-[-0.01em]">
        {titleOf(subject)}
      </SheetTitle>
    </span>
  );
}

function HeaderDescription({ subject }: { subject: SheetSubject }) {
  const text = descriptionOf(subject);
  if (!text) return null;
  return (
    <SheetDescription className="font-serif text-[15.5px] leading-[1.5] text-ink-dim">
      {text}
    </SheetDescription>
  );
}

const HEADER_CLASS = "shrink-0 gap-1.5 border-b border-line bg-surface-2 p-4 pr-14";

/*
 * The Sheet is modal, so it takes layer 4 from section 11.1. The overlay carries
 * the same layer, one below the content it dims.
 */
export function RecordHeader({ subject }: { subject: SheetSubject }) {
  return (
    <SheetHeader className={HEADER_CLASS} style={{ position: "relative" }}>
      <HeaderTitle subject={subject} />
      <HeaderDescription subject={subject} />
      <span className="flex flex-wrap items-center gap-2">{badgesOf(subject)}</span>
    </SheetHeader>
  );
}
