import type { ReactNode } from "react";

import { changeSections } from "../change/sections";
import { changeInShort } from "./levelParts";
import { PagedLevel } from "./PagedLevel";
import type { ShellView } from "./view";

function changeData(v: ShellView) {
  const { entry, levels, diff, diffMessage } = v.change;
  return { entry, levels, diff, diffMessage, theme: v.theme, joins: v.resolvedJoins, adrs: v.adrs, openSheet: v.openSheet };
}

function artHandlers({ art }: ShellView) {
  return {
    artMode: art.artMode,
    onArtMode: art.setArtMode,
    failedArt: art.failedArt,
    onArtFailed: art.setFailedArt,
    diffFile: art.diffFile,
    onDiffFile: art.setDiffFile,
  };
}

function changeSectionsOf(v: ShellView): ReactNode[] {
  return changeSections({ ...changeData(v), ...artHandlers(v) }, v.changeRow);
}

export function ChangePaged({ v, carried }: { v: ShellView; carried: string | null }) {
  return (
    <PagedLevel
      inShort={changeInShort(v.change.levels, v.changeRow, v.servedAudio)}
      targets={v.jumpTargets}
      routeKey={v.routeKey}
      carried={carried}
      sections={changeSectionsOf(v)}
    />
  );
}
