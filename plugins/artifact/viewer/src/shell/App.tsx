/**
 * The application shell.
 *
 * THIS FILE IS THE PROTOTYPE AT `src/variations/sections-e/` PORTED INTO THE SHIPPED
 * SHELL. The prototype built and measured the arrangement, and it stays on disk as the
 * comparison, so a reader can hold the two side by side. Four things changed in the move:
 * the data comes from `@/data/bundle` instead of the variation's own scaffolding, the
 * route is the bare `#/` because the shell is no longer one variation among several, the
 * THE FILE IS NOW THE ONLY ENTRY THE SHIPPED GRAPH HAS. The comparison harness that
 * rendered the prototype arrangements used to sit beside it, and this file handed that
 * harness its own addresses back. The harness is gone, and the prototypes it compared
 * were removed from `src/variations/` on 2026-10-08. No file the shell can reach imports one. So the shell answers every address the bundle's own designs answer, and
 * an address that names no design says so.
 *
 * Three fixed regions and one scrolling region. The document does not scroll at all,
 * per interaction-design section 11.3: `html` and `body` carry no overflow, and the
 * shell fills the space its host gives it. Only the scroll pane scrolls.
 *
 *   ┌──────────────────────────────────────────────────────────┐
 *   │ TOP BAR (fixed)   [ work item ] [ status ] [ theme ]     │
 *   ├────────────┬─────────────────────────────────────────────┤
 *   │ LEFT NAV   │  SCROLL PANE — the only scrolling region    │
 *   │ (fixed)    │                                             │
 *   └────────────┴─────────────────────────────────────────────┘
 *
 * FOUR LEVELS ARE HORIZONTAL SECTION PAGERS rather than stacked pages: one section per
 * box on a track that slides sideways, and each box scrolls its own overflow. Intent
 * pages the four parts of its contract. Problem & Solution pages its four panels.
 * Architecture regroups its level into Diagrams, Architecture Decisions, Boundaries,
 * and Districts and alternatives considered. Build pages its epics, six to a section.
 * Every other section keeps the layout below unchanged, and Build's Rubrics sub-view
 * keeps it too. `Pager.tsx` holds the pager pieces, and its header comment states what
 * the engineer asked for and why each piece is shaped so.
 *
 * A paged level also drops its visible heading band, because the section strip names
 * the same words a band would. It keeps the heading as `sr-only`, so the focus
 * contract and the document's one `h1` survive.
 *
 * THE BOARD IS THE LANDING SURFACE, and it is not a level. The bare route `#/` names no
 * work item, and it renders every work item as one row rather than the error it used to
 * render. The route that names an id the bundle lacks keeps that error. The board draws
 * no strip, no pager, and no level progress bar, and `Board.tsx` states why it also draws
 * no reading-progress strip. The rail's top entry opens it from any level.
 *
 * SECTION 11.3'S FOUR RULES ARE THE LAYOUT CONTRACT, and each one is applied here.
 *
 *   1. The shell fills its parent, never the viewport. The root carries `h-full` and
 *      never `h-dvh`, because the viewport height belongs to whoever owns the page. The
 *      page that serves this shell gives that height: `src/index.css` sets `height: 100%`
 *      on `html`, `body`, and `#root`, so the root's `h-full` resolves to the viewport on
 *      every state. The root also caps its own height with `max-h-dvh`, which binds when a
 *      host hands it a height taller than the visible screen. Without the cap the shell
 *      would overflow such a host, the document would scroll, and no ancestor would bound
 *      the pane. That is the board's defect.
 *   2. The scroll pane scrolls on both axes: `overflow-auto`, never `overflow-y: auto`
 *      with `overflow-x: hidden`. A pane that hides its horizontal overflow clips a
 *      wide block with no scrollbar and no way to reach it.
 *   3. A wide block scrolls itself. Every table, code block, and diagram sits inside
 *      its own `overflow-x: auto` container, so the pane keeps its own scroll and the
 *      wide block keeps its integrity. See `markdown.tsx`, `DiagramTiles.tsx`, and the
 *      diagram source block.
 *   4. Every flex and grid child carries `min-w-0`. A flex child defaults to its
 *      content width, so one wide row would stretch the pane and push its siblings off
 *      the edge.
 *
 * THE RAIL IS A SHADCN SIDEBAR. `SidebarProvider` is the shell's own frame, and the
 * rail renders inside a `Sidebar`, so the shell gains the sidebar's drawer below
 * 768 px, its icon collapse, and its toggle shortcut. The body row inside the frame
 * is the sidebar's positioned ancestor, so the top bar keeps the full width section
 * 2.1 gives it and the rail starts below the bar rather than beside it.
 *
 * The shell renders. It never computes. Every count, state, and join comes from
 * `data/index.json`, and every record body comes from `data/designs.js` and
 * `data/adrs.js`.
 */

import type { Theme } from "./DiagramTiles";
import { PopulatedShell } from "./app/PopulatedShell";
import { EmptyShell, FailedShell } from "./app/states";
import { useShellState } from "./app/useShellState";

export default function ShellApp() {
  const s = useShellState();

  if (s.load.state === "failed") return <FailedShell s={s} message={s.load.message} />;
  if (s.load.state === "ready" && s.works.size === 0) return <EmptyShell reduce={s.reduce} />;
  return <PopulatedShell s={s} />;
}

export type { Theme };
