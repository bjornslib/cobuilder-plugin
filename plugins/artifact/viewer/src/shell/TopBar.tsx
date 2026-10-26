/**
 * The top bar. It never scrolls and it never moves.
 *
 * Three controls and one status, held on one line at every width, per
 * interaction-design section 2.1. The work-item switcher rewrites the route and
 * keeps the section where the new work item can fill it.
 *
 * The bar renders from the route before the index resolves, so the work item's name
 * is present at first paint and the switcher's list fills in behind it. That is the
 * loading state of section 3.2: a skeleton the width of a design name.
 *
 * THIS FILE IS THE PORTED PROTOTYPE at `src/variations/sections-e/TopBar.tsx`, with one
 * import changed: `Theme` now comes from `./DiagramTiles`, because the port folds the
 * prototype's `Diagram.tsx` into that file.
 */

import { MobileTrigger, SkipLink, ThemeToggle, WorkBoardButton } from "./topBar/buttons";
import type { TopBarProps } from "./topBar/props";
import { StatusRow } from "./topBar/Status";
import { Switcher } from "./topBar/Switcher";

export type { TopBarProps } from "./topBar/props";

const BAR_CLASS = "flex min-w-0 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-2";

export function TopBar(bar: TopBarProps) {
  return (
    <header className={BAR_CLASS} style={{ zIndex: "var(--layer-fixed)" }}>
      <SkipLink paneId={bar.paneId} />
      <MobileTrigger />
      <WorkBoardButton onOpenWork={bar.onOpenWork} />
      <Switcher bar={bar} />
      <StatusRow bar={bar} />
      <ThemeToggle theme={bar.theme} onToggleTheme={bar.onToggleTheme} />
    </header>
  );
}
