import SmoothScrollProgress from "@/components/smoothui/scroll-progress";

import { JumpBar } from "../jump";
import { PROGRESS_PX } from "../Pager";
import { PANE_ID } from "./ids";
import type { ShellView } from "./view";

const BAND_STYLE = { zIndex: "var(--layer-raised)" };

/*
 * The reading-progress strip, then the section-link bar, as one sticky band at the
 * pane's top edge. They are the pane's first children, so the pane keeps the only
 * scroll, per section 11.3.
 *
 * The strip measures the pane, not the window. `useDocumentNoScroll` guarantees the
 * document cannot scroll, so a window-scoped bar would read zero at every position.
 *
 * The band carries the ground fill so content passing under the strip does not show
 * through. The bar adds `PROGRESS_PX` to the jump offset, so a jumped-to heading lands
 * below both.
 *
 * The paging level drops the band. Its pane never scrolls, so nothing could stick, and
 * `PagedLevel` draws its own strip, which measures the box on screen.
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
