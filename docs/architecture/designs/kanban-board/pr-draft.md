# envisioned PR: kanban-board

## Summary

The viewer gains a read-only Kanban board as a full page at `#/board` (ADR-0050). The program board shows each program as a card in the column of its stage. A click on a card opens the epic board of that program, with its epics or slices in three status columns. The Work drawer stays.

## Motivation

The Work drawer lists each program by stage and stops there. A reader opens each program in turn to learn which epics and slices are open. The record index holds that status since ADR-0047, and no surface shows it.

## Changes

1. **The route.** `shell/model/routes.ts` reads `board` as a reserved first segment, and the query names the program or the No program board, with the search, the sort, the hidden columns, and the card switch. The route also gains a `sliceN` field for a fifth segment on an epic page.
2. **The rules.** A new folder `shell/board/` holds pure modules: one groups the cards into columns with true counts and empty reasons, one reads and writes the view state in the address, and one gives the start prompt of a record.
3. **The program board.** One column for each of the five stage lanes, with one card for each program. The lane list has one definition, which the Work drawer also reads. The Superseded column starts hidden.
4. **The epic board.** The epics of one program in Planned, In progress, and Done, with a switch to the slices and a control back to the program board.
5. **The No program card.** One card on the program board opens the slices that belong to no program. It is absent when the index holds no such slice.
6. **The index.** `shared/build_index.py` projects the title of each epic from the tracker record. It writes a build time as a top-level key, outside `sources`.
7. **The header.** The board header shows the build time, and the count of shown records beside the total.
8. **The start prompt.** A copy icon on a program card and an epic card copies one prompt and shows "Prompt copied". An open epic whose slices are all done shows a mark.
9. **The slice mark.** The page of an epic brings one slice row into view and marks it, when the address names the slice.
10. **The top bar.** One link opens the board. The Work board button still opens the drawer.
11. **The records.** ADR-0050 amends ADR-0034. The glossary gains the terms of the board. The built `index.html` and the plugin version change.

## Out of scope

- A change of workflow state from the board, and drag and drop.
- The multi-selection of programs and vertical swim lanes.
- A sort by date, priority, or assignee.
- A page for one slice.
- A check of pull requests at the start of a workflow, and any change of a tracker rule.
- A change to the Work drawer.

## Open and unverified

- Whether the two new index fields need a schema version step is not settled.
- The build time changes the committed index on each build. The size of that cost in review is not measured.
- Whether the clipboard call works inside a published Artifact is not verified.
- A design named `board` would take the address of the board. The engineer accepted this risk.
- The prototypes prove the layout in plain HTML. They do not prove the React build.

## Test plan

- Unit tests of the column rule: the stage column of each program, the true total under a search, the reason on an empty column, a hidden column, and the No program card.
- A round-trip test of the address codec, with an unknown key and an unknown value.
- A table test of the start prompt for each stage and each epic state.
- A `build_index.py` test: the epic entity carries the tracker title, and the build time sits outside `sources`.
- A check that the stale check and the golden index tests still pass.
- A component test: a click on a program card opens its epic board, and the back control returns.
- A browser check at 1280 by 800: the five stage columns show with no sideways scroll of the page.
- `npm run build`, then the test that compares the build with the committed `index.html`.
