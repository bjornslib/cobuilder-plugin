/**
 * The Work drawer: the day deck, ported from prototype B into the shell.
 *
 * ADR-0034 is this file's record. The Work board is a vaul bottom drawer the
 * shell's own Work icon opens, at two snap points: 0.6, where it opens, and
 * 0.95, where a record reads tall. Inside, the deck is the arrangement the
 * two prototypes compared and prototype B won: five collapsible lanes in one
 * vertical read, a state filter strip whose chips the arrow keys step, an
 * incremental search that marks its match, resets the filter the moment it
 * has a needle, and auto-reads a result set of exactly one, and a detail pane
 * beside the board that follows the selection.
 *
 * THE SEVEN REFINEMENTS ARE THE CONTRACT, each one stated in one place:
 *
 *   1. Typing anything resets the filter to All — `filterForTyping`.
 *   2. `/` moves the cursor into the search field, from anywhere in the open
 *      drawer but the field itself.
 *   3. The header states the board's own fact; the held-out rule and its
 *      counts live in the footer, permanently.
 *   4. A result set of exactly one selects itself (`soleOf`), broadening past
 *      one takes the read away, and a changed needle starts a new read.
 *   5. The pane's link reads "Open work item", and opens the shell's own
 *      route for the design.
 *   6. The pane's dismiss reads "Close".
 *   7. `←`/`→` step the filter strip's active chip from its own vocabulary,
 *      stopping at the ends (`chipStepped`).
 *
 * THE LANES FOLD, AND A FOLDED LANE IS NOT A GAP. A fold is a display
 * choice, never an exclusion: the rows stay in the walk and in the counts,
 * and the lane holding the current row refuses to fold, the same rule the
 * rail's groups hold — so the walk never lands on a row the deck cannot
 * show, and nothing a reader folded takes content off the board.
 *
 * THE RAIL'S ARROW WALK SLEEPS WHILE THE DRAWER HOLDS THE KEYS. The shell's
 * rail walks its own rows from a window-level listener; the deck stops the
 * propagation of the keys it takes over, so an arrow inside the drawer never
 * steps the rail behind it, and the two walks never steal each other's keys.
 *
 * THE ESCAPE IS RADIX'S, NOT THIS FILE'S. The dismissable layer listens in
 * the capture phase, so Escape closes the whole drawer before any handler
 * here runs, and the honest hint is the one that implies: Escape closes the
 * drawer, Enter toggles the detail pane.
 *
 * DRAWER STATE RESETS WHEN THE DRAWER CLOSES, so the next open is the whole
 * deck and no read survives a close the reader does not remember.
 */

import { useState } from "react";
import { Drawer } from "vaul";

import type { DesignRecords } from "@/data/bundle";
import type { DesignRow, RecordIndex } from "@/data/types";

import { DrawerBody } from "./drawer/DrawerBody";

/**
 * The drawer the shell mounts, once, over whatever surface it reads.
 *
 * THE RECORDS MAY STILL BE IN FLIGHT. The pane states the load rather than an
 * empty pane, and the bundle's own load answers in its own time.
 */
export interface WorkDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The data layer's own rows: one per design, `designRowsOf` the only author. */
  rows: DesignRow[];
  /** The index, for the held-out counts and the detail pane's one join read. */
  index: RecordIndex | null;
  /** The loaded design records, for the pane's six marks. */
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
