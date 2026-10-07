/**
 * The In Short strip: a level's short summary, above the section tabs.
 *
 * The strip sits outside the section track, so a change of section leaves it alone.
 * A level with no narration draws nothing: no frame and no sentence. Listen shows only
 * when the caller passes an audio address the bundle serves.
 */

import { useRef, useState } from "react";

export function InShort({ text, audio }: { text: string; audio?: string | null }) {
  const [playing, setPlaying] = useState(false);
  const player = useRef<HTMLAudioElement | null>(null);

  if (text.trim().length === 0) return null;

  function toggle() {
    const element = player.current;
    if (element === null) return;
    if (playing) {
      element.pause();
      setPlaying(false);
    } else {
      setPlaying(true);
      void Promise.resolve(element.play()).catch(() => setPlaying(false));
    }
  }

  return (
    <section
      aria-label="In Short"
      className="flex min-w-0 shrink-0 flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line px-6 py-2"
    >
      <span className="shrink-0 font-mono text-[11px] tracking-[0.08em] text-ink-faint uppercase">
        In Short
      </span>
      <p className="m-0 min-w-0 flex-1 basis-64 font-serif text-[15px] leading-[1.5] text-foreground">
        {text}
      </p>
      {audio ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            ref={player}
            preload="none"
            src={audio}
            onEnded={() => setPlaying(false)}
            onPause={() => setPlaying(false)}
          />
          <button
            type="button"
            aria-pressed={playing}
            onClick={toggle}
            className="ml-auto shrink-0 cursor-pointer border-0 bg-transparent p-0 font-mono text-[12.5px] text-ink-mid underline-offset-2 hover:underline"
          >
            {playing ? "Pause" : "Listen"}
          </button>
        </>
      ) : null}
    </section>
  );
}
