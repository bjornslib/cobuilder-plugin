# Rubric: Slice 7 — E3 edge cases: the three integer-only assumptions

Feature: interaction-design-gate
Epic: E3
Slice goal: The three places that assume a gate number is an integer handle a string label, and the gates that existed before this change behave exactly as they did.
Test command: uv run --with pytest pytest tests/ -v

## Criteria

### C1 — every gate number is a string, not only 2b [CRITICAL]
**Must be true:** `resolve_feature_gates()` writes `n` as a string for every
gate, so one type serves the whole array. Widening only the 2b entry would leave
two types in one list.
**Evidence to check:**
- Run `uv run shared/build_index.py`.
- Run
  `python3 -c "import json; d=json.load(open('.cobuilder-architect/self/data/index.json')); ns=[g['n'] for g in d['joins']['feature_gates']['interaction-design-gate']]; print(ns, [type(x).__name__ for x in ns])"`.
  Expect five string values.
- Read `resolve_feature_gates()` in `shared/build_index.py` and confirm the
  conversion happens once, for the whole array.
**Scoring:**
- 1.0 — every gate carries a string `n`.
- 0.5 — the 2b entry is a string and the others are integers, so the array holds two types.
- 0.0 — the 2b entry is an integer, so the viewer cannot match it against `GATE_DOCS`.

### C2 — the gates that already worked keep working [CRITICAL]
**Must be true:** The two plans that reported `Overall: OK` before this change
still report it, and the plan that failed Gate 4 still fails it for the same
reason. The widened pattern must not change what a plain gate line parses into.
**Evidence to check:**
- Run `python3 plugins/implement/scripts/verify_gate.py --plan docs/plans/cobuilder-family`
  and `--plan docs/plans/gate-doc-surfacing`. Both must report `Overall: OK`.
- Run the same command against `docs/plans/skill-collision-fix` and confirm the
  failure is still the Gate 4 rubric failure, not a new parsing failure.
- Run `uv run --with pytest pytest tests/ -v` and confirm the historical-plans
  test named in `docs/plans/interaction-design-gate/03-program-design.md` passes.
**Scoring:**
- 1.0 — both passing plans still pass and the failing plan fails for the same reason.
- 0.5 — a passing plan still passes, but a gate's parsed label or state text changed.
- 0.0 — a plan that passed now fails, or the failing plan fails for a new reason.

### C3 — the viewer no longer asks whether a gate is gate 4
**Must be true:** `plugins/artifact/viewer/index.html` no longer compares the
gate number to the integer `4` to decide which gate is current. That comparison
was one of the three integer-only assumptions, and it breaks the moment a gate
label carries a letter.
**Evidence to check:**
- Run `grep -n 'n === 4\|n == 4\|isCurrent' plugins/artifact/viewer/index.html`
  and read each match.
- Compare the replacement against the code shown in
  `docs/plans/interaction-design-gate/epic-E3-design.md`, section Types & Signatures.
- Browser check: open the Builds view, confirm a current gate is highlighted on
  the rail, and confirm the console shows no error.
**Scoring:**
- 1.0 — the comparison is gone, and the rail still marks a current gate.
- 0.5 — the comparison is replaced, but no gate is highlighted, or the wrong one is.
- 0.0 — the integer comparison survives.

### C4 — an `n/a` gate is treated as answered
**Must be true:** `current_doc()` counts a gate as done when its state starts
with `APPROVED` or with `n/a`. An `n/a` gate needs no answer, so the page must
not open on it.
**Evidence to check:**
- Read `current_doc()` in `plugins/artifact/scripts/build_builds_view.py`.
- Browser check: open the Builds view for `interaction-design-gate`, whose Gate
  2b line reads `n/a`. Confirm the page opens on a gate that still needs an
  answer, and does not open on the `n/a` gate.
- Read the console messages and confirm no error appears.
**Scoring:**
- 1.0 — `n/a` counts as done, and the page opens on the first gate that needs an answer.
- 0.5 — `n/a` counts as done, but the page opens on a gate chosen at random.
- 0.0 — the page opens on the `n/a` gate, so a reader is asked to answer a gate that never applies.

### C5 — a plain gate line still parses after the pattern was widened
**Must be true:** A `00-status.md` line reading `- Gate 3 — Program Design:
APPROVED 2026-09-14` still parses, and `resolve_feature_gates()` still attaches
the Gate 3 document where it did before.
**Evidence to check:**
- Run a focused check: build a fixture status file with one plain Gate 3 line,
  run the parser over it, and read the result.
- Run `uv run shared/build_index.py` and read the `feature_gates` entries for
  `gate-doc-surfacing`, which carries a Gate 3 document.
**Scoring:**
- 1.0 — the plain line parses, and the Gate 3 document still attaches.
- 0.5 — the plain line parses, but the document no longer attaches.
- 0.0 — the widened pattern rejects a plain numeric label.

## Regression check
- All tests that passed before this slice must still pass:
  `uv run --with pytest pytest tests/ -q`.
- The four pre-existing `PIL` WebP failures are the baseline and are not this
  slice's fault.
- Files outside `shared/build_index.py`,
  `plugins/artifact/scripts/build_builds_view.py`, and
  `plugins/artifact/viewer/index.html` must be unchanged.

## Out of scope — do not penalise
- The `2b` group in `verify_gate.py` (slice 5).
- The `interaction_design` entity and the rail card (slice 6).
- Any change to the vendored skill (epic E1) or the build skill (epic E2).
- The committed copy of `.cobuilder-architect/self/data/index.json`.
- The `/home/user` paths inside that committed copy. That defect is recorded and
  is not part of this feature.
