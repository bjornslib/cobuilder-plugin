import { useEffect, useState } from "react";

import type { ChangeLevel } from "./keys";

/*
 * The voice script is a promise and not the file. A level carries a `voice` string when
 * the bundle records that it was voiced, but no file in the bundle lists the audio it
 * holds. So the record cannot tell a level whose audio was recorded from a level whose
 * audio file the bundle no longer carries.
 *
 * The account asks the bundle once per address. A `HEAD` request answers whether a file
 * sits at the address, and this module caches the ask, so a reader who walks the four
 * rows asks once per voiced level and not once per row.
 *
 * It does not use a preloading media element. `<audio preload="metadata">` on a missing
 * file reports the missing resource to the console, and a reader meets a broken page
 * rather than a stated absence. The control draws only where the bundle answered.
 */
const audioAnswers = new Map<string, Promise<boolean>>();

function asksForAudio(url: string): Promise<boolean> {
  const held = audioAnswers.get(url);
  if (held) return held;
  const pending = fetch(url, { method: "HEAD" })
    .then((response) => response.ok)
    .catch(() => false);
  audioAnswers.set(url, pending);
  return pending;
}

function answersFor(urls: string[]): Promise<Record<string, boolean>> {
  return Promise.all(urls.map((url) => asksForAudio(url).then((ok) => [url, ok] as const))).then(
    (rows) => Object.fromEntries(rows),
  );
}

type Setter = (served: Record<string, boolean>) => void;

function watchAnswers(urls: string[], setServed: Setter): () => void {
  let live = true;
  answersFor(urls).then((served) => {
    if (live) setServed(served);
  });
  return () => {
    live = false;
  };
}

function askAddresses(signature: string, setServed: Setter): (() => void) | undefined {
  if (signature === "") {
    setServed({});
    return undefined;
  }
  return watchAnswers(signature.split("|"), setServed);
}

/**
 * The audio addresses the bundle answers, keyed by address. An address with no entry is
 * one the bundle has not answered yet, which a level reads as a question still open and
 * not as an absence.
 */
export function useServedAudio(levels: ChangeLevel[]): Record<string, boolean> {
  const [served, setServed] = useState<Record<string, boolean>>({});
  const asked = levels
    .map((level) => level.audio)
    .filter((url): url is string => url !== null);
  const signature = asked.join("|");
  useEffect(() => askAddresses(signature, setServed), [signature]);
  return served;
}
