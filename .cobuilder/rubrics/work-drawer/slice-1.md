# Rubric: Slice 1 — Tracer bullet: the search owns the result set

Feature: `work-drawer`
Epic: `work-drawer/E1` — The search owns the result set
Slice goal: A needle over the deck drives the filter, the focus, and the self-read.
Test command: `cd plugins/artifact/viewer && npm run typecheck && npm run test`

## Criteria

### C1 — Typing anything into the search resets the state filter to All [CRITICAL]

**Must be true:** The moment the search field holds a needle, the state
filter's active chip is `All`, whatever it held before. A reader who left the
board narrowed to `Shipped` and then types sees the whole board's rows and a
count the board earns.

**Evidence to check:** Narrow the board to `Shipped`. Focus the field and
type one character. Read the strip: `All` is active, and the rows and the
shown count read the needle's result set across all five lanes, not `Shipped`'s.

**Scoring:** 1.0 = the reset is immediate and the count reads the needle's
result. 0.5 = the rows refine but the strip keeps its old choice. 0.0 = no
reset.

### C2 — Pressing slash anywhere in the open drawer moves the cursor into the search field [CRITICAL]

**Must be true:** With the drawer open, `/` puts the caret in the search
field, from a row, a chip, a fold, or the footer. From the field itself, `/`
types the character and moves nothing.

**Evidence to check:** Click a row (which selects, not types), then press
`/`, and read the active element is the search input. Then focus the field
and press `/` again, and read the character lands in the field.

**Scoring:** 1.0 = the caret lands from a row and slash types from the
field. 0.5 = the caret lands but slash also types from the field, or the
caret never lands. 0.0 = the key does nothing.

### C3 — A search that resolves to exactly one work item displays that item's details [CRITICAL]

**Must be true:** A needle whose result set is exactly one row selects that
row and shows the detail pane with no second press. A needle that widens the
set past one clears the selection. The pane's content is that design's own:
the outcome prose, the six authored record marks, the epics with their
refined states, and the merged pull requests.

**Evidence to check:** Type a needle that names exactly one design (a
distinct word of its outcome). Read the pane: it is open and carries that
design. Type one more character that broadens the set; read the pane: it
clears.

**Scoring:** 1.0 = the sole result reads itself and a broader set clears.
0.5 = the sole result reads itself but never clears. 0.0 = the pane stays
closed.

### C4 — The repository's gates hold [CRITICAL]

**Must be true:** `npm run typecheck`, `npm run test`, and `npm run build`
all pass in the viewer, with no test skipped and no new failure.

**Evidence to check:** Run the three in the viewer directory and print the
tails.

**Scoring:** 1.0 = all three pass. 0.0 = any fails or any test skips.