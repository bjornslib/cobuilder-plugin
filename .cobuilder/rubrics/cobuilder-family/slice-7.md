# Rubric: Slice 7 — the two ports land

Feature: cobuilder-family
Epic: plugin-split/E1
Slice goal: `cobuilder-implement` renamed and shipped, `collaborate-with-user` folded in, and the orientation skill written.
Test command: `uv run --with pytest pytest tests/ -v`

## Criteria

### C1 — The build skill ships as a plugin and runs its own gates [CRITICAL]
**Must be true:** The personal skill is now an installed plugin under its new name, and running it on a small change produces the four gate documents and the rubrics.
**Evidence to check:** Install it alone. Run it on a one-file change and list what it wrote.
**Scoring:** 1.0 — four gate documents and one rubric per slice. 0.5 — the documents, no rubrics. 0.0 — it does not run from the installed copy.

### C2 — The old name survives nowhere except as recorded lineage
**Must be true:** No path, command, or procedure uses the old name. One lineage note may keep it, marked as history.
**Evidence to check:** Grep the repo for the old name.
**Scoring:** 1.0 — only the lineage note. 0.5 — one or two stale mentions. 0.0 — paths or commands still carry it.

### C3 — The presentation skill is folded in, not bolted on [CRITICAL]
**Must be true:** Its rules live inside the artifact plugin's own skill and references, and it is not a separate skill directory. The established skill-authoring practice was followed.
**Evidence to check:** Read the artifact plugin's skill and references. Confirm the honesty rule, the theme-token rules, and the composition rules all survive.
**Scoring:** 1.0 — folded in with every rule intact. 0.5 — folded in with a rule lost. 0.0 — still a separate skill, or rules dropped without a note.

### C4 — The orientation skill routes rather than duplicates
**Must be true:** The umbrella plugin's skill names each mode and when to reach for it, and it does not restate another plugin's procedure.
**Evidence to check:** Read it. Check every mode it names exists.
**Scoring:** 1.0 — every mode named and correct, no duplication. 0.5 — a named mode does not exist. 0.0 — it copies another plugin's procedure.

## Regression check
- Every plugin still validates and installs.
- No page or report changes appearance because a rule was lost in the fold.

## Out of scope — do not penalise
- Moving pages out of `.lavish/`. That is slice 10.
- Any index or ledger work.
