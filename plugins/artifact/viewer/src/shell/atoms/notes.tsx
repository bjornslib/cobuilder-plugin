import type { ReactNode } from "react";

import { Info, Minus, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";

const EMPTY_NOTE_CLASS =
  "m-0 flex min-w-0 items-start gap-2 rounded-lg border border-dashed border-line bg-card/60 px-3.5 py-3 font-serif text-[15.5px] leading-[1.55] text-ink-dim";

export function EmptyNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn(EMPTY_NOTE_CLASS, className)}>
      <Info className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

const FIELD_LABEL_CLASS = "font-mono text-[12px] tracking-[0.06em] text-ink-faint uppercase";

const FIELD_VALUE_CLASS = "font-serif text-[16px] leading-[1.5] break-words text-foreground";

export function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span className={FIELD_LABEL_CLASS}>{label}</span>
      <span className={FIELD_VALUE_CLASS}>{children}</span>
    </div>
  );
}

const MISSING_CLASS =
  "flex min-w-0 flex-col gap-1.5 rounded-lg border border-dashed border-line bg-surface-2/50 px-3 py-2.5";

const MISSING_LINE_CLASS =
  "m-0 flex min-w-0 items-start gap-2 font-serif text-[15.5px] leading-[1.5] text-ink-dim";

/**
 * A record the panel could not read.
 *
 * This is the shell's empty state. A missing record is stated in place, never hidden
 * and never rendered as a blank box. It names the record kind and stops there, because
 * a reader cannot act on a file name.
 */
export function Missing({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(MISSING_CLASS, className)}>
      <p className={MISSING_LINE_CLASS}>
        <Minus className="mt-1 size-4 shrink-0 text-ink-faint" aria-hidden="true" />
        <span>{children}</span>
      </p>
    </div>
  );
}

const ABSENT_LINE_CLASS =
  "m-0 flex min-w-0 items-start gap-2 font-mono text-[12.5px] leading-[1.6] text-ink-faint";

/** A stated absence that is not a record gap: a count of zero, a list that is empty. */
export function AbsentLine({ children }: { children: ReactNode }) {
  return (
    <p className={ABSENT_LINE_CLASS}>
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

export function AbsentRecordLine({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 font-mono text-[12px] leading-[1.6] text-ink-faint">{children}</p>
  );
}
