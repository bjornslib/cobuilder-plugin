import type { ReactNode } from "react";

import type { SectionKey } from "../model";

const NOTE_CLASS =
  "mb-4 min-w-0 rounded-lg border border-dashed border-line bg-surface-2 px-3.5 py-2 font-mono text-[12.5px] text-ink-dim";
const WARN_NOTE_CLASS =
  "mb-4 min-w-0 rounded-lg border border-dashed border-warn bg-warn-wash px-3.5 py-2 font-mono text-[12.5px] text-ink-dim";
const CARD_CLASS = "max-w-[80ch] rounded-xl border border-dashed border-warn bg-warn-wash px-4 py-3.5";
const CARD_TITLE_CLASS = "m-0 font-mono text-[12.5px] font-bold tracking-[0.06em] text-warn uppercase";

export const CARD_TEXT_CLASS = "mt-2 mb-0 font-serif text-[16px] leading-[1.55] text-ink-mid";

interface RedirectProps {
  from: SectionKey | null;
  section: SectionKey;
  reason: string;
}

export function RedirectNote({ from, section, reason }: RedirectProps) {
  if (from === null) return null;
  return (
    <p className={NOTE_CLASS}>
      The route named {from}, and {reason} The shell redirected to {section}.
    </p>
  );
}

/*
 * A RECORD THE BUNDLE COULD NOT GIVE THE CHANGE IS STATED ABOVE THE ROWS.
 * A story entry the bundle does not hold, and a record file that did not
 * load, are both read failures. The rows below state what each one could
 * not read; this line states why, once, so a reader is not left to guess
 * whether the change is thin or the page is broken.
 */
export function ChangeNotice({ notice }: { notice: string | null }) {
  if (notice === null) return null;
  return <p className={WARN_NOTE_CLASS}>{notice}</p>;
}

export function WarnCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={CARD_CLASS}>
      <p className={CARD_TITLE_CLASS}>{title}</p>
      {children}
    </div>
  );
}
