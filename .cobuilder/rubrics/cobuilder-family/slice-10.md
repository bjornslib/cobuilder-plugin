# Rubric: Slice 10 — the Decisions and Contexts modes

Feature: cobuilder-family
Epic: plugin-split/E5
Slice goal: A person browses every decision and every context, with the anchor distinction visible.
Test command: `uv run --with pytest pytest tests/ -v`

## Criteria

### C1 — A person browses the decisions rather than stumbles on one [CRITICAL]
**Must be true:** The Decisions mode lists every record with its state and what it anchors to, including any record no change happens to cite.
**Evidence to check:** Serve a bundle. Count the rows against the record count. Confirm the record with no inbound reference is present.
**Scoring:** 1.0 — every record listed, including the unreferenced one. 0.5 — the referenced ones only, which reproduces today's problem. 0.0 — records missing.

### C2 — The anchor column shows which joins resolve and which do not [CRITICAL]
**Must be true:** A record resolving to a verified context is visibly distinct from one resolving only to an inferred district.
**Evidence to check:** Open the mode against this repo, where the split between the two is uneven and visible.
**Scoring:** 1.0 — the two states are distinct at a glance. 0.5 — the anchor is shown without distinguishing them. 0.0 — no anchor column, which makes it a list without the point.

### C3 — Contexts leads with the violations
**Must be true:** Boundary violations appear first, each marked as a decision candidate, and the districts no context covers are listed.
**Evidence to check:** Open the Contexts mode against the context in this repo, which records seven findings.
**Scoring:** 1.0 — violations first, marked, uncovered districts listed. 0.5 — rendered but not led with. 0.0 — violations not shown.

### C4 — A boundary record reads as rules, not as raw configuration
**Must be true:** The boundary record renders as a readable rule list rather than as its file format.
**Evidence to check:** Open a context and read it.
**Scoring:** 1.0 — readable rules with their reasons. 0.5 — the raw file, pretty-printed. 0.0 — not rendered.

### C5 — Both modes are reachable and the current one is obvious
**Must be true:** A person can tell which mode they are in and reach the other in one action.
**Evidence to check:** Switch between every mode present at this slice.
**Scoring:** 1.0 — obvious and one action. 0.5 — reachable, current mode unclear. 0.0 — a mode is unreachable.

## Regression check
- The existing modes behave as they did.
- Every join from slice 9 still resolves.

## Out of scope — do not penalise
- The Builds mode, the Backlog lane, and moving pages. Those are slice 11.
- Commenting and anchoring. Those are slices 12 to 14.
