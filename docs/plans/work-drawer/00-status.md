# Status: Work drawer

**Feature:** `work-drawer`
**Epics:** E1 — the search owns the result set · E2 — labels and the filter walk
**Slices:** 2 · both completed at 1.00 (see `Verification record`)

**Scope note, 2026-09-28, later the same day.** The engineer read the refined
drawer and asked for it wired into the shipped viewer before the slices were
scored. The port this plan deliberately held out has therefore started: the
day deck now ships beside the shell as `src/shell/WorkDrawer.tsx` with its
pure rules in `src/shell/workDeck.ts`, the shell's own Work icon in the top
bar opens it, and the full-page board route `#/` keeps rendering untouched,
exactly as ADR-0034's consequence states. Retiring that route is still the
design's next epic.

## Gates

- Gate 1 — Product (no tech talk): APPROVED 2026-09-28
  view: `#/work-drawer/build/plan/product`
- Gate 2 — Architecture: APPROVED 2026-09-28
  view: `#/work-drawer/build/plan/architecture`
- Gate 2b — Interaction design: APPROVED 2026-09-28
  view: n/a (no page — the engineer gets the file path)
- Gate 3 — Program design: APPROVED 2026-09-28
  view: `#/work-drawer/build/plan/program`
- Gate 4 — Slice plan, epic designs, and rubrics: APPROVED 2026-09-28
  view: `#/work-drawer/build/plan/epics`
  - 4a Slice plan: APPROVED 2026-09-28
  - 4b Epic technical solution designs: n/a (one slice per epic)
  - 4c Blind rubrics: APPROVED 2026-09-28

Design mode: docs/architecture/designs/work-drawer/ (ADR-0034)
Hindsight: available — initiative page kp-b6fe94648e5b4e74830dbd5516b02872

## Slices

- [x] Slice 1 — the search owns the result set: score: 1.00 (attempt 1)
- [x] Slice 2 — labels and the filter walk: score: 1.00 (attempt 1)

## Notes for a fresh session

This plan refines the day-deck drawer prototype
(`plugins/artifact/viewer/src/variations/work-drawer-deck/`). It changes no
shipped file: `src/shell/` is untouched, because the port that retires the
full-page board route is the design's next epic and is deliberately not in
this plan.

Slice 1 owns the drawer's search behaviour and the single-result rule in
`work-drawer-deck/index.tsx`. Slice 2 owns the labels in
`work-drawer-deck/detail.tsx`, the header line in `index.tsx`, and the
arrow-key walk over the filter strip. The two slices share no criterion, and
neither owns the other's file alone.

The keyboard contract on this surface is written to what the machine does:
Radix's dismissable layer listens for Escape in the capture phase, so Escape
closes the drawer and Enter toggles the detail. The interaction design states
the contract and the hint line states it again.

## Verification record

Filled 2026-09-28, attempt 1 of each slice, in Chrome with real key events
(CDP `Input.dispatchKeyEvent` — synthetic events do not reach React's
listeners). Full records: `.cobuilder/rubrics/work-drawer/evidence/`.

- **Slice 1 — 1.00.** Typing `plugin` after narrowing to `Shipped` reset the
  strip to All and read the needle's result set across all five lanes; `/`
  focused the field from a lane trigger and typed the character from the
  field; `ubiquitous` and `cobuilder-vi` auto-read their sole results, a
  broadened set cleared the automatic read entirely, and a dismissed sole
  stayed dismissed until the needle changed, which started a new read.
  Gates: typecheck clean, 210 tests passing (181 baseline + the rules
  beside the prototype and the shipped port), build shape unchanged.
- **Slice 2 — 1.00.** Header carries `WORK` + the counts and no held-out
  text; the footer states the rule with 33 decisions and 5 unfinished pull
  requests in one sentence; `Open work item` follows the shell's own route
  builder and closes the drawer on navigation; `Close` closes the pane.
  The chip walk stepped `Ready to build → In review → Shipped → Super…`,
  stopped at both ends, and `↓` from the strip walked rows with the filter
  unchanged while the rail's own walk slept.
- **Port check.** The drawer over the shipped shell: opened from the
  top bar's Work icon at the 0.6 snap, sole result auto-read with the
  amber hit marked, the pane's record marks read the real
  `load.designs`, Enter toggled the pane and moved the snap (322/805 →
  40/805), Escape closed and reopening presented the whole deck.
- **Defects found and fixed during the run.** Two, both in the prototype
  first: an automatic selection survived its own broadening as a highlight
  without a pane, and the dismissed sole never re-read after a needle
  change. Both fixed; the fixes are stated in `index.tsx` and ported into
  `src/shell/WorkDrawer.tsx`.
## Slice 3 — the board route retires (2026-09-29, attempt 1 at 1.00)

The engineer's follow-up asked for the rest of ADR-0034's epic: retire the
full-page board.

- The bare route `#/` renders no full page. It normalizes an empty hash to
  `#/` (no history entry — the root *is* the board route) and opens the
  drawer itself, over an empty pane. The pane carries no copy and no second
  control: the drawer is the board, so the landing's text and its
  "Open the Work board" button go too.
- The rail's own `Work` row (`model.ts`'s `BoardRow` and its badge count) is
  gone. The top bar's Work icon — already the drawer's one control — is the
  way in, and the rail renders the two accounts alone. `RailSource` loses
  the `board` and `workCount` fields the row was the only reader of.
- The rail's arrow walk no longer steps the board's address: the drawer is
  not an address the hash names, so `steps()` is the two accounts' rows
  alone, and a walk that reaches the first row clamps. The pane's
  "Open work item" opens the work item at **Intent** (`routeHref(id,
  "intent")`) per the engineer's direction — "once a work item is selected,
  navigate to Intent".
- Deleted: `src/shell/Board.tsx`, `Board.test.tsx`, `BoardRowLink.test.tsx`.
  The jsdom suite is 190 tests, all passing (the deleted files took the rest).

Filled with the same evidence standard as slices 1–2: real browser
verification of the bare route over dev server, drawer auto-open, the empty
pane behind it, and the pane's link landing on Intent (verified on
`inflight-record-store`, whose goal record fills it).
