# Rubric: Slice 2 — Labels and the filter walk

Feature: `work-drawer`
Epic: `work-drawer/E2` — Labels and the filter walk
Slice goal: The drawer says what it holds, the pane's buttons say what they do, and the arrows step the filter.
Test command: `cd plugins/artifact/viewer && npm run typecheck && npm run test`

## Criteria

### C1 — The header carries no held-out text [CRITICAL]

**Must be true:** The drawer's header carries the title, the design count,
and the shown count. The text "held out: … ADRs · … unfinished PRs" is not in
the header. The exclusion rule stays stated, permanently, in the footer.

**Evidence to check:** Open the drawer and read the header line: no held-out
text. Read the footer: the rule and the counts are there.

**Scoring:** 1.0 = the header is clean and the footer states the rule.
0.5 = the header is clean but the rule is stated nowhere. 0.0 = the header
still narrates it.

### C2 — The pane's shell link reads "Open work item" [CRITICAL]

**Must be true:** The detail pane's link to the shell reads "Open work
item", with the row's own design name in the link's accessible name.

**Evidence to check:** Select a row and read the pane's link text and its
aria-label.

**Scoring:** 1.0 = the label reads "Open work item" and the accessible name
carries the design. 0.0 = either is missing.

### C3 — The pane's dismiss control reads "Close" [CRITICAL]

**Must be true:** The detail pane's dismiss button reads "Close", and a press
clears the selection and drops the drawer to its working snap.

**Evidence to check:** Select a row, read the button's text, press it, and
read the selection gone and the drawer back at 0.6.

**Scoring:** 1.0 = the label reads "Close" and the press does both. 0.0 =
either is missing.

### C4 — Tapping forward/backward arrow selects the next/previous filter [CRITICAL]

**Must be true:** While the filter strip holds the focus, `→` makes the next
chip active and `←` makes the previous chip active, through the lanes'
vocabulary, stopping at the ends. Up and down still walk the deck, and left
and right never type into the search field by accident.

**Evidence to check:** Focus the strip; press `→` from `All` and read
`Needs a decision` active; walk to the last chip and press `→` again and read
the walk stop; press `←` twice and read the chip step back. Then press `↓`
and read the row walk unaffected.

**Scoring:** 1.0 = the chip steps, the ends stop, and the row walk is
unaffected. 0.5 = the chip steps but the ends do not stop. 0.0 = the keys do
nothing.

### C5 — The repository's gates hold [CRITICAL]

**Must be true:** `npm run typecheck`, `npm run test`, and `npm run build`
all pass in the viewer, with no test skipped and no new failure.

**Evidence to check:** Run the three in the viewer directory and print the
tails.

**Scoring:** 1.0 = all three pass. 0.0 = any fails or any test skips.