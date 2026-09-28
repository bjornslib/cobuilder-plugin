# Rubric: Slice 16 — the rail reads two accounts, each at its own address

Feature: cobuilder-viewer
Epic: cobuilder-viewer/E7
Slice goal: The rail groups its rows under Build and Review, the change's own address opens the change's account, and one more segment selects a named section
Test command: `uv run --with pytest pytest tests/ -v`

Serve the bundle before any browser check: `python3 -m http.server` rooted at
`.cobuilder-architect/self/`. Use one work item whose own epics carry a merged pull
request: `plugin-split`.

## Criteria

### C1 — The rail groups its rows under Build and Review [CRITICAL]
**Must be true:** The rail holds two groups. Build carries the program's account: Intent, Problem & Solution, Architecture, Epics, and Rubrics. Review carries the change's account: Intent, Problem & Solution, Architecture, and File Diffs. The three section names both accounts carry appear once in each group.
**Evidence to check:**
- With the ChromeDevTools MCP tools, read the rail's group labels, then the rows under each one.
- Compare each group's rows against the model's own list for that account. The group holds exactly its own list, in the model's order.
- Count the rows that share a section name. Six rows carry one of the three shared names, three in each group.
**Scoring:**
- 1.0 — both groups render, each holds exactly its own rows, and the three shared names appear in both.
- 0.5 — one row is missing, or one row sits in the wrong group.
- 0.0 — the rail holds one group, or both groups carry the same rows.

### C2 — The change's own address opens the change's account [CRITICAL]
**Must be true:** `#/<work>/pull-requests/<pr>` opens the change's Intent section. One appended segment selects a named section, so `.../problem-and-solution`, `.../architecture`, and `.../file-diffs` each open their own section. An address that names a section the change does not carry lands on the change's Intent section, and never on an error.
**Evidence to check:**
- With the ChromeDevTools MCP tools, open the four addresses in turn. Read the section that renders, the strip's selected label, and the row that reads current.
- Open the bare address and confirm the change's Intent section renders, and not the program's.
- Open an address with an unknown trailing segment. The change's Intent section renders.
**Scoring:**
- 1.0 — every address opens its own section, the current row follows it, and an unknown segment lands on the change's Intent section.
- 0.5 — one address opens the change's Intent section where it names another section.
- 0.0 — an address renders an error, or it renders a second surface.

### C3 — Every row carries its own address, and one row reads current
**Must be true:** No two rows share an address. The row that opens the reader's own address is the current row, and a section-name match does not light two rows at once.
**Evidence to check:**
- Read each row's address, in both groups. The six rows that carry a shared section name hold six different addresses.
- Walk the whole rail. Read the current row at each stop. Exactly one row reads current at a time.
- Read the address after a press, and compare it against the row the reader pressed.
**Scoring:**
- 1.0 — every row carries its own address, and exactly one row reads current.
- 0.5 — two rows share an address, or two rows read current together.
- 0.0 — a row opens nothing, or the current row does not follow the address.

### C4 — A press reaches the section the row names
**Must be true:** The rail is a way in. A press on a row renders that row's own section, on that row's own account.
**Evidence to check:**
- With the ChromeDevTools MCP tools, press one row in each group. Each press renders the section that row names.
- Press a second row in the same group. It renders the second section.
**Scoring:**
- 1.0 — every row opens its own section.
- 0.5 — one row opens another row's section.
- 0.0 — a press does nothing.

### C5 — A work with no change states the absence in the rail
**Must be true:** A work item whose own epics carry no pull request offers no Review rows, and the rail states why rather than rendering rows that open nothing. A row a reader cannot fill is worse than a group that says why.
**Evidence to check:**
- Open a design the bundle holds whose own epics carry no pull request. Read the Review group.
- Read what stands where its rows would be. It states that no pull request of this work exists.
- Read the console messages. None reports an error.
**Scoring:**
- 1.0 — the absence is stated in place, with a clean console.
- 0.5 — four rows render and open nothing.
- 0.0 — the rail errors on a work with no change.

### C6 — The rail's fold and its arrow walk obey one convention
**Must be true:** ADR-0029's amendment of 2026-09-25 fixes the rail's own convention, and the shipped rail takes it. The arrow walk visits every row of both groups, whether a group is open or closed. The group that holds the current row stays open, so a press that would close it does nothing. The control states that reason in its own accessible name.
**Evidence to check:**
- With the ChromeDevTools MCP tools, walk the rail with the arrow keys through both groups. Read each row the walk reaches. Every row of both groups is reachable, open or closed.
- Fold one group, then walk again. The walk still reaches that group's rows.
- Press the fold control on the group that holds the current row. The group stays open, and the current row stays visible.
- Read that control's accessible name. It carries the reason the group stays open.
**Scoring:**
- 1.0 — the walk reaches every row of both groups, the current row's group stays open, and its control states why.
- 0.5 — the walk skips the rows of a closed group, or the current row's group closes.
- 0.0 — the walk stops at a group boundary, or the current row becomes unreachable.

## Regression check
- All tests that passed before this slice must still pass, including every case in the test files under `plugins/artifact/viewer/src/shell/`.
- Files outside the slice scope must remain unchanged: `shared/`, the bundle's data files, and `plugins/artifact/scripts/`.
- The change's account still renders its own records, and the program's account still renders its own. This slice adds navigation and removes no content.

## Out of scope — do not penalise
- The content of the change's account, and the absence state a section reads. Slice 15 owns both.
- The account mark, and the jump between the two accounts. Slice 17 owns it.
- The multi-pull-request mode and the merge-order path. They defer with E11 to E13.
- A check of the change against the program's records. ADR-0030 decides that check, and another design owns it.
