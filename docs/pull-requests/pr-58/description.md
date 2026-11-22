# PR #58 — Kanban board: programs, epics, and slices by status in the viewer

## Problem

The Work drawer lists each program by stage and stops there. A reader cannot see which epics and slices of a program are planned, in progress, or done. The reader opens each program in turn to learn where its work stands.

ADR-0047 made the tracker the one source of stage and status. The record index now holds the status of each epic and slice, and no surface shows it as a board.

## Why this approach

A Kanban board is a full page of the viewer at #/board, with no left rail. The program board shows each program as a card in its stage column. A card opens the epic board of that program, and a slice card opens its epic page with the slice row marked. Pure rule modules group, search, and sort the cards, and the address holds the view state. The index gains an optional epic title and build time. A move between the board and a page slides in the direction of travel. The branch also carries the pull request refresh of commit 829ae285.

## Alternatives considered

- **A lane matrix: one row for each program, and selected programs turn into columns** — rejected because The engineer compared the prototype and chose the two-level board. The stage showed only as a badge, and 26 rows made a long page.
- **A stage board with a dock for selected programs** — rejected because Two regions share the width, and a fourth docked program needs a sideways scroll.
- **A roster on the left and a board whose shape follows the selection** — rejected because The reader must learn three board shapes. The engineer preferred one shape for each level.
- **Put the status columns inside the Work drawer** — rejected because ADR-0034 built this and rejected it. Columns behind a sideways scroll spend the width of the drawer.
- **A second HTML entry with its own data file and a new tracker operation** — rejected because A second built file breaks the one-shell model and the byte check of the build.
- **One data file for each program, loaded when a card opens** — rejected because The index holds 26 programs and 112 epics, so no scale problem exists. A page opened from disk cannot fetch a further file.
- **Copy the tracker command of the next step from a card** — rejected because The index holds no map from a stage to a command. The engineer chose a start prompt for the design and build workflows.
- **A plain fade, or a full-width push, for the move between the board and a page** — rejected because The engineer chose a 32 px slide with a fade, because it shows the direction of travel and stays short.

## Out of scope

- A change of workflow state from the board, and drag and drop
- The multi-selection of programs and vertical swim lanes
- A sort by date, priority, or assignee, because the index holds none of them
- A page for one slice
- A change to the Work drawer
- Leave animations: a hidden column, a collapsed list, and a closed notice go at once

## Risks

- A design named board would take the address of the board. The engineer accepted this risk
- The build time changes the committed index on each build, so each build shows a diff
- Some epics stay open while all their slices are done, until a person records the merge of their pull request
- The start prompt names a command of another plugin as text. A renamed command leaves a stale prompt
- The clipboard call is not verified in each host that embeds the viewer, such as a published Artifact

## How this was tested

RED, GREEN, and VALIDATE ran for each of the 7 slices and for the review change. VALIDATE scored each against a blind rubric at 1.00, with browser checks on the real bundle. The engineer checked the board in Chrome on 2026-11-23. The full pytest gives 2949 passed, and Vitest gives 437 passed.

## Where to focus

- Does the build time sit outside the sources block and outside the projector, so the stale check still holds
- Does any board file compute a status that the index does not hold
- Does the amendment in ADR-0050 leave the rule of ADR-0034 true for the drawer
- Is the reserved board segment safe against a real design name

---

_Authorship: agent-generated._
