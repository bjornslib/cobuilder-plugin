import { useEffect, useState } from "react";

import { useChangeBundle, useServedAudio } from "../../change/levels";
import type { ArtMode } from "../../change/Frame";
import type { SectionKey } from "../../model";
import type { Address } from "./address";
import type { ShellCore } from "./core";

function namedPrOf(sub: string | null): number | null {
  return sub !== null && sub !== "flightdeck" ? Number(sub) : null;
}

function changePrOf(section: SectionKey, worklessPr: { id: number } | null, namedPr: number | null): number | null {
  if (section !== "pull-requests") return null;
  if (worklessPr !== null) return worklessPr.id;
  return namedPr !== null && Number.isFinite(namedPr) ? namedPr : null;
}

/* A reader who opens another change meets that change's own frame, diff file, and picture. */
function useArtState(changePr: number | null) {
  const [artMode, setArtMode] = useState<ArtMode>("image");
  const [failedArt, setFailedArt] = useState<string | null>(null);
  const [diffFile, setDiffFile] = useState<string | null>(null);
  useEffect(() => {
    setArtMode("image");
    setFailedArt(null);
    setDiffFile(null);
  }, [changePr]);
  return { artMode, setArtMode, failedArt, setFailedArt, diffFile, setDiffFile };
}

/*
 * The change's account. A route that names a pull request number opens the change the
 * work's own epics carry, and the four rows read that pull request's own records. The
 * number comes from the route's `sub` field, which the pull-request list already writes,
 * so no second address scheme exists.
 *
 * A workless route's change is the pull request its work segment names, and `sub` cannot
 * override it. A `sub` that named another number would name a change this address does
 * not belong to. The segment wins, so `#/17/pull-requests` and `#/17/pull-requests/17`
 * answer the same change. One derivation keeps the heading and the rows on one number.
 *
 * The four hooks sit above the loading and error returns, because a hook that runs on
 * one render and not the next breaks the rules of hooks. A route that names no pull
 * request reads nothing: `useChangeBundle(null)` answers idle and asks for no file.
 */
export function useChangeAccount({ route }: ShellCore, { section, worklessPr }: Address) {
  const changePr = changePrOf(section, worklessPr, namedPrOf(route.sub));
  const change = useChangeBundle(changePr);
  const servedAudio = useServedAudio(change.levels);
  const art = useArtState(changePr);
  return { changePr, change, servedAudio, art };
}

export type Account = ReturnType<typeof useChangeAccount>;
