/**
 * ADR-0034 is this file's record. The Work board is a vaul bottom drawer that the
 * shell's Work icon opens, at two snap points: 0.6, where it opens, and 0.95,
 * where a record reads tall. Inside, the deck is the arrangement prototype B won:
 * five collapsible lanes in one vertical read, a state filter strip whose chips
 * the arrow keys step, an incremental search that marks its match, and a detail
 * pane beside the board that follows the selection.
 *
 * The seven refinements are the contract, each stated in one place:
 *
 *   1. Typing anything resets the filter to All (`filterForTyping`).
 *   2. `/` moves the cursor into the search field, from anywhere in the open
 *      drawer but the field itself.
 *   3. The header states the board's own fact; the held-out rule and its counts
 *      live in the footer, permanently.
 *   4. A result set of exactly one selects itself (`soleOf`), broadening past one
 *      takes the read away, and a changed needle starts a new read.
 *   5. The pane's link reads "Open work item", and opens the shell's own route for
 *      the design.
 *   6. The pane's dismiss reads "Close".
 *   7. `←`/`→` step the filter strip's active chip from its own vocabulary,
 *      stopping at the ends (`chipStepped`).
 *
 * A folded lane is not a gap. A fold is a display choice, never an exclusion: the
 * rows stay in the walk and in the counts, and the lane holding the current row
 * refuses to fold, the same rule the rail's groups hold. So the walk never lands
 * on a row the deck cannot show.
 *
 * The rail's arrow walk sleeps while the drawer holds the keys. The rail walks its
 * own rows from a window-level listener, and the deck stops the propagation of the
 * keys it takes over, so an arrow inside the drawer never steps the rail behind it.
 *
 * The Escape is Radix's, not this file's. The dismissable layer listens in the
 * capture phase, so Escape closes the whole drawer before any handler here runs.
 * The honest hint is the one that implies it: Escape closes the drawer, Enter
 * toggles the detail pane.
 *
 * Drawer state resets when the drawer closes, so the next open is the whole deck
 * and no read survives a close the reader does not remember.
 */

import { useState } from "react";
import { Drawer } from "vaul";

import type { DesignRecords } from "@/data/bundle";
import type { DesignRow, RecordIndex } from "@/data/types";

import { DrawerBody } from "./drawer/DrawerBody";

/**
 * The records may still be in flight. The pane states the load rather than an
 * empty pane, and the bundle's own load answers in its own time.
 */
export interface WorkDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The data layer's own rows: one per design, `designRowsOf` the only author. */
  rows: DesignRow[];
  /** The index, for the held-out counts and the detail pane's one join read. */
  index: RecordIndex | null;
  records: DesignRecords | null;
}

const SNAP_POINTS = [0.6, 0.95];
const CONTENT_CLASS =
  "fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[100dvh] flex-col overflow-hidden rounded-t-2xl border border-line bg-card shadow-frame outline-none";

type SnapSetter = (snapPoint: string | number | null) => void;

function DrawerLayer({ props, setSnap }: { props: WorkDrawerProps; setSnap: (snapPoint: number) => void }) {
  const { open, onOpenChange, rows, index, records } = props;
  return (
    <Drawer.Portal>
      <Drawer.Overlay className="fixed inset-0 z-40 bg-ink/55" />
      <Drawer.Content className={CONTENT_CLASS}>
        {index !== null ? <DrawerBody rows={rows} index={index} records={records} open={open} onLeave={() => onOpenChange(false)} setSnap={setSnap} /> : null}
      </Drawer.Content>
    </Drawer.Portal>
  );
}

export function WorkDrawer(props: WorkDrawerProps) {
  /* Controlled snap: Enter's expand contract needs to set the height, not ask. */
  const [snap, setSnap] = useState<number | null>(0.6);
  return (
    <Drawer.Root open={props.open} onOpenChange={props.onOpenChange} snapPoints={SNAP_POINTS} activeSnapPoint={snap} setActiveSnapPoint={setSnap as SnapSetter} fadeFromIndex={1}>
      <DrawerLayer props={props} setSnap={setSnap} />
    </Drawer.Root>
  );
}

export default WorkDrawer;
