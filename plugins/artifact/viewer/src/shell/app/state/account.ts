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
 * THE CHANGE'S ACCOUNT. A route that names a pull request number opens the change the
 * work's own epics carry, and the four rows read that pull request's own records. The
 * number comes from the route's `sub` field, which is the field the pull-request list
 * already writes, so no second address scheme exists.
 *
 * A WORKLESS ROUTE'S CHANGE IS THE PULL REQUEST ITS WORK SEGMENT NAMES, AND `sub` CANNOT
 * OVERRIDE IT. No design carries the segment, and `model.worklessPullRequest` answered
 * which pull request does. That pull request's change account is the address's whole
 * destination, so a `sub` that named another number would name a change this address does
 * not belong to. The segment therefore wins, and `#/17/pull-requests` and
 * `#/17/pull-requests/17` answer the same change. One derivation, so the heading and the
 * rows read the same number and cannot disagree.
 *
 * The four hooks sit above the loading and error returns, because a hook that runs on
 * one render and not the next is the defect the rules of hooks exist to prevent. A
 * route that names no pull request reads nothing: `useChangeBundle(null)` answers the
 * idle state and asks the bundle for no file.
 */
export function useChangeAccount({ route }: ShellCore, { section, worklessPr }: Address) {
  const changePr = changePrOf(section, worklessPr, namedPrOf(route.sub));
  const change = useChangeBundle(changePr);
  const servedAudio = useServedAudio(change.levels);
  const art = useArtState(changePr);
  return { changePr, change, servedAudio, art };
}

export type Account = ReturnType<typeof useChangeAccount>;
