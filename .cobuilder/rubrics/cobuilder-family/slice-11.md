# Rubric: Slice 11 — the Builds mode and the Backlog lane

Feature: cobuilder-family
Epic: plugin-split/E5
Slice goal: Gates driven by the status document, the Backlog lane computed from the index, and pages moved into the bundle.
Test command: `uv run --with pytest pytest tests/ -v`

## Criteria

### C1 — The Backlog lane shows what is planned and not started [CRITICAL]
**Must be true:** The Builds mode carries a Backlog lane holding every epic with no branch and every slice not yet scored. Each epic shows what it is, not only its id, and the slices that advance it.
**Evidence to check:** Open the Builds mode against this repo. Confirm the epic count against `goal.json`. Confirm an epic with no slice is shown as deferred rather than omitted.
**Scoring:** 1.0 — correct count, each epic legible, its slices listed, the deferred one visible. 0.5 — present but showing ids without their work, which is the failure this slice exists to fix. 0.0 — absent.

### C2 — The lane is computed, not authored [CRITICAL]
**Must be true:** The lane is a query over the index. No authored backlog file feeds it, and adding an epic to a design makes it appear with no other edit.
**Evidence to check:** Grep for any backlog document. Add an epic to a design, rebuild, and open the mode.
**Scoring:** 1.0 — computed, and a new epic appears with no other edit. 0.5 — computed from a file that a person maintains. 0.0 — the list is authored.

### C3 — Builds is driven by the status document, not showing it
**Must be true:** Approval marks and slice scores are chrome derived from the status document, and that document is not rendered as a panel of its own.
**Evidence to check:** Open the Builds mode and check the gate rail against the real states.
**Scoring:** 1.0 — driven and correct at every gate. 0.5 — driven, one state wrong. 0.0 — shown as a document.

### C4 — The epic to slice join is proved by being used
**Must be true:** The lane lists the slices under each epic, taken from the declared join rather than guessed from the files a slice touches.
**Evidence to check:** Change one slice's declared epic, rebuild, and confirm it moves.
**Scoring:** 1.0 — it moves. 0.5 — the grouping is hardcoded. 0.0 — no grouping.

### C5 — Pages live in the bundle, not in a foreign tool's directory
**Must be true:** Generated pages are written under the bundle, the existing pages have moved, and their published addresses still work.
**Evidence to check:** List the bundle page directory. Confirm nothing writes to the old location. Republish one page and confirm the address is unchanged.
**Scoring:** 1.0 — moved and an address preserved. 0.5 — moved and an address lost. 0.0 — still writing to the old location.

### C6 — Five modes stay navigable
**Must be true:** With all five present, a person can tell which mode they are in and reach any other in one action.
**Evidence to check:** Switch between all five.
**Scoring:** 1.0 — obvious and one action. 0.5 — reachable, current mode unclear. 0.0 — a mode is unreachable.

## Regression check
- The Decisions and Contexts modes from slice 10 behave as they did.
- Publishing a page still produces a working page.

## Out of scope — do not penalise
- Ranking the lane by dependent decision count. Slice-count ranking is acceptable here, and the richer ranking is a later refinement.
- Commenting and anchoring. Those are slices 12 to 14.
