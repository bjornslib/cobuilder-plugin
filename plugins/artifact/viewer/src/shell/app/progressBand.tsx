import SmoothScrollProgress from "@/components/smoothui/scroll-progress";

import { JumpBar } from "../jump";
import { PROGRESS_PX } from "../Pager";
import { PANE_ID } from "./ids";
import type { ShellView } from "./view";

const BAND_STYLE = { zIndex: "var(--layer-raised)" };

/*
 * The reading-progress strip, then the section-link bar, as one
 * sticky band at the pane's top edge. Neither is a fourth fixed
 * region: they are the pane's first children and they are `sticky`,
 * so the pane keeps the only scroll, per section 11.3.
 *
 * THE STRIP MEASURES THE PANE, NOT THE WINDOW. `useDocumentNoScroll`
 * guarantees the document cannot scroll, so a window-scoped progress
 * bar would read zero at every position. The component takes the
 * container as a ref, and this ref is the pane.
 *
 * The band carries the ground fill, so content passing under the
 * strip does not show through it, and the bar adds `PROGRESS_PX` to
 * the jump offset so a jumped-to heading lands below both.
 *
 * THE PAGING LEVEL DROPS THE BAND. Its pane never scrolls, so nothing
 * could stick, and its headings are the section strip on the track
 * rather than links into a page. `PagedLevel` draws its own strip,
 * which measures the box on screen.
 */
export function ProgressBand({ v }: { v: ShellView }) {
  if (v.paged) return null;
  return (
    <div className="sticky top-0 min-w-0 bg-ground" style={BAND_STYLE}>
      <SmoothScrollProgress container={v.paneRef} variant="bar" position="inline" thickness={PROGRESS_PX} color="var(--band)" />
      <JumpBar paneId={PANE_ID} targets={v.jumpTargets} topOffset={PROGRESS_PX} />
    </div>
  );
}
