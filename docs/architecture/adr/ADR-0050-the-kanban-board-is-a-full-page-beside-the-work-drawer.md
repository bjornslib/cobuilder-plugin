---
title: "ADR-0050 — the Kanban board is a full page beside the Work drawer"
status: active
type: architecture
last_verified: 2026-11-17
owner: bjornslib
id: ADR-0050
source_pr: null
name: "the Kanban board is a full page beside the Work drawer"
state: decided
groups: [viewer, work, interaction]
approved_by: ""
problem: "The Work drawer lists each program by stage and stops there. A reader cannot see which epics and slices of a program are planned, in progress, or done. ADR-0034 says that no full-page board route remains, so the viewer has no place for status columns."
decision: "The viewer gains a read-only Kanban board as a full page at the address #/board. The program board shows each program as a card in the column of its stage. A click on a card opens the epic board of that program at #/board?program=<id>, with the epics in the columns Planned, In progress, and Done. A switch shows the slices in place of the epics. The address query holds the search, the sort, the hidden columns, and the card switch. The record index gains the title of each epic and a build time. A copy icon on a program card or an epic card copies a start prompt. The Work drawer stays as ADR-0034 decided it. This amends the rule of ADR-0034 for the Kanban board only."
maps_to:
  context: artifact
  modules: [plugins/artifact/viewer/src/shell/board, plugins/artifact/viewer/src/shell/model/routes.ts, plugins/artifact/viewer/src/data/types, shared/build_index.py]
  rule: "The Kanban board computes no status of its own and writes no workflow state. Each column, count, and mark comes from the record index through the data layer."
forces:
  - "ADR-0034 rejected status columns inside the drawer for lack of width, and it removed the full-page board."
  - "ADR-0047 made the tracker the source of stage and status, so the index holds the status of each epic and slice."
  - "The index holds 26 programs, 112 epics, and 172 slices. 127 of 130 joined slices and 51 of 112 epics are done, so a board must let the reader hide the Done column."
  - "42 slices belong to plans that have no design, so no program card holds them."
  - "The epic entity of the index holds no title. The 19 epics of one program read alike by branch name."
  - "The viewer is a static page with no write path, and workflow state moves only through tracker.py."
  - "The index is a snapshot, and it holds the commit of its build and no time."
alternatives:
  - option: "A lane matrix: one row for each program across the status columns, and selected programs turn into columns"
    rejected_because: "The engineer compared the prototype and chose the two-level board. The stage showed only as a badge, 26 rows made a long page, and the comparison of programs was not needed now."
  - option: "A stage board with a dock: a selected program docks beside the board as a column"
    rejected_because: "Two regions share the width, and a fourth docked program needs a sideways scroll. The two-level board keeps the stage columns of this option and drops the dock."
  - option: "A roster on the left and a board whose shape follows the selection"
    rejected_because: "The reader must learn three board shapes. The engineer preferred one shape for each level."
  - option: "Put the status columns inside the Work drawer"
    rejected_because: "ADR-0034 built this and rejected it. Columns behind a sideways scroll spend the width of the drawer, and each lane needs a second scrollbar."
  - option: "A second HTML entry with its own board data file and a new tracker read operation"
    rejected_because: "A second built file breaks the one-shell model and the check that the build gives the committed bytes. The index read already covers what the new operation would return."
  - option: "A source field on each record, content hashes, and a committed log of each status change"
    rejected_because: "The board has one reader on one machine, so the audit cost has no user. The log would be a second store of workflow state."
  - option: "One data file for each program, loaded when a card opens, with windowed columns"
    rejected_because: "The index holds 26 programs and 112 epics, so no scale problem exists. A page opened from disk cannot fetch a further file."
  - option: "Show the epic id in place of a title, and leave out the slices that have no program"
    rejected_because: "The epics of one program read alike without a title. A board that drops 42 slices shows totals that differ from the index."
  - option: "Copy the tracker command of the next step from a card"
    rejected_because: "The index holds no map from a stage to a command. The engineer chose a start prompt for the design and build workflows."
delivers:
  capability: "A reader sees every program by stage on one page, opens one program, and sees each epic and slice in its status column."
  benefit: "The reader learns where the work of a program stands without opening each epic. A start prompt takes the reader from a card to the next workflow in one paste."
  beneficiary: [developer, operator]
  enables: ["A later design that compares programs side by side", "A later design that records merged pull requests at the start of a workflow"]
provenance: authored
history:
  - { state: decided, date: 2026-11-17, by: engineer, note: "Decided in session. The engineer compared four clickable prototypes on the real record index and chose the two-level board. The engineer removed the multi-selection of programs and the vertical swim lanes from the scope on 2026-11-14." }
related_decisions:
  - { type: amends, target: ADR-0034 }
  - { type: depends-on, target: ADR-0047 }
  - { type: is-related-to, target: ADR-0029 }
  - { type: is-related-to, target: ADR-0023 }
related:
  - "docs/architecture/designs/kanban-board/goal.json"
  - "docs/architecture/designs/kanban-board/contracts.md"
  - "docs/architecture/designs/kanban-board/prototypes/option-d-program-drilldown.html"
  - "docs/architecture/contexts/artifact/boundary.yaml"
---

# ADR-0050 — the Kanban board is a full page beside the Work drawer

## Context

The Work drawer is the survey of the work today. ADR-0034 made it a drawer over the shell, with five stage lanes in one vertical read. It rejected status columns inside the drawer, and its rule says that no full-page board route remains.

ADR-0047 then made the tracker the source of program stage and of epic and slice status. The record index now holds the status of each epic and slice. No surface shows that status across the epics of a program.

These facts come from the index at the commit of this design.

- The index holds 26 programs, 112 epics, and 172 slices.
- 36 epics are planned, 25 are in progress, and 51 are done.
- 130 slices join an epic of a design. 127 of them are done.
- 42 slices belong to four plans that have no design.
- The epic entity holds an id, a branch, and a pull request number. It holds no title. The tracker record of an epic holds one.
- 22 epics are open while all of their slices are done. GitHub shows merged pull requests for some of them, and the tracker holds no record of the merge.
- The index holds the commit of its build. It holds no build time, no date, no priority, and no assignee.

The engineer compared four clickable prototypes on this data. They are in `docs/architecture/designs/kanban-board/prototypes/`.

## Options considered

1. **A lane matrix.** One row for each program crosses the status columns, and selected programs turn into columns. Rejected: the stage is only a badge, and 26 rows make a long page.
2. **A stage board with a dock.** Programs are cards by stage, and a selected program docks as a column. Rejected: two regions share the width.
3. **A roster and a focus board.** A list on the left selects programs, and the board changes shape. Rejected: the reader must learn three shapes.
4. **Status columns inside the Work drawer.** Rejected by ADR-0034, and nothing has changed since.
5. **A second HTML entry with its own data file.** Rejected: it breaks the one-shell model and the byte check of the built viewer.
6. **An audit trail with hashes and a status log.** Rejected: one reader does not need it, and the log is a second store of state.
7. **One data file for each program.** Rejected: no scale problem exists, and a page from disk cannot fetch a file.
8. **A board with no epic title and no home for unowned slices.** Rejected: the cards read alike, and the totals differ from the index.
9. **A two-level board as a full page (chosen).** The program board shows programs by stage. A card opens the epic board of one program.

## Decision

1. **Surface.** The Kanban board is a full page of the viewer shell. The Work drawer stays, and it still opens over each surface, the board included. The top bar gains one link to the board.
2. **Address.** The program board is `#/board`. The epic board of a program is `#/board?program=<id>`, and the No program board is `#/board?orphans=1`. The query also holds the search, the sort, the hidden columns, and the card switch, so no program id is reserved. A reload, a shared link, and the back button restore the same board.
3. **Program board.** Each program is a card in the column of its stage. The columns are the five stage lanes of the Work drawer, and both surfaces read one lane list. The Superseded column starts hidden. A card shows the name, the outcome, the epic counts by status, the slice count, and the next ready slice.
4. **Epic board.** The epics of one program sit in the columns Planned, In progress, and Done. `contracts.md` maps each status and state that the index emits to one column, and the card keeps the raw word. A switch shows the slices in place of the epics. One control leads back to the program board.
5. **Controls.** The program board has a text search and a sort by name, by open work, and by progress, each with name as the tie-break. The epic board has the text search and the card switch. Each column has a control that hides it. A hidden column keeps a narrow rail with its count.
6. **True counts.** The header shows the count of shown records and the total, such as 22 of 26 programs. An empty column states why it is empty.
7. **No program.** When slices belong to no program, the program board shows one card named No program. The card opens those slices in the status columns. A slice card there opens in place, because no epic page exists for it. The card is absent when no such slice exists, and it never counts as a program.
8. **Index.** The epic entity gains `title`, from the tracker record. The index gains `built_at`. It sits outside the `sources` block and outside the projector. `schema_version` stays, and both fields are optional for a reader.
9. **Navigation.** The name on a program card opens the program. An epic card opens the page of the epic. A slice card of a program opens the page of its epic with the slice number as a fifth segment, and that page brings the slice row into view and marks it.
10. **Start prompt.** A copy icon on a program card or an epic card that has a next workflow copies one prompt, and the board shows the notice "Prompt copied". A refused clipboard write shows "Copy failed" with the prompt text. `contracts.md` holds the exact prompt for each stage and state.
11. **Marked epics.** An epic with an open lifecycle and all slices done shows the mark "Slices done". Its prompt starts `/pr:generate` when it has no pull request. With a pull request, or with the status `merged`, the prompt asks the agent to record the merge. The card carries the status, the lifecycle, and the pull request as separate fields.
12. **Read-only.** The board changes no workflow state. It has no drag and no edit.

Out of scope: the multi-selection of programs, vertical swim lanes, a sort by date or priority, a page for one slice, and any change of a tracker rule.

## Consequences

- **Positive:** One page answers where each program stands and what is open in one program. The address makes a board state shareable.
- **Constraint introduced:** The Kanban board computes no status of its own and writes no workflow state. Each column, count, and mark comes from the record index through the data layer.
- **Amendment to ADR-0034:** The rule "no full-page board route remains" now holds for the Work board only. The Kanban board is a second surface with its own address. The drawer keeps its rows, its lanes, and its search.
- **Negative / accepted:** The viewer has two surveys of the work. The committed index changes on each build, because it holds a build time. A design named `board` would take the address of the board, and the engineer accepted that risk. The start prompts hold the command names of other plugins as text.

## Value delivered

- **New capability:** A reader sees every program by stage on one page, opens one program, and sees each epic and slice in its status column.
- **Benefit:** The reader learns where the work of a program stands without opening each epic. A start prompt takes the reader from a card to the next workflow in one paste.
- **Beneficiary:** developer, operator

## Maps to

Context `artifact`, modules `plugins/artifact/viewer/src/shell/board`, `plugins/artifact/viewer/src/shell/model/routes.ts`, and `plugins/artifact/viewer/src/data/types`. The index change is in `shared/build_index.py`, in the context `shared`. See the boundary record's rule and the context canvas.
