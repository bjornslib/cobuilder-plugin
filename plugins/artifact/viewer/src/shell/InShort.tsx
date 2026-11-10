/**
 * The strip sits outside the section track, so a change of section leaves it alone.
 * Listen shows only when the caller passes an audio address the bundle serves.
 */

import { ListenControls, useListen } from "./inShort/Listen";

const STRIP_CLASS =
  "flex min-w-0 shrink-0 flex-col gap-y-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-4 border-b border-line px-6 py-2";

function Summary({ text }: { text: string }) {
  return (
    <>
      <span className="shrink-0 font-mono text-[11px] tracking-[0.08em] text-ink-faint uppercase">
        In Short
      </span>
      <p className="m-0 min-w-0 flex-1 basis-64 font-serif text-[15px] leading-[1.5] text-foreground">
        {text}
      </p>
    </>
  );
}

export function InShort({ text, audio }: { text: string; audio?: string | null }) {
  const listen = useListen();

  if (text.trim().length === 0) return null;

  return (
    <section aria-label="In Short" className={STRIP_CLASS}>
      <Summary text={text} />
      {audio ? <ListenControls audio={audio} text={text} listen={listen} /> : null}
    </section>
  );
}
