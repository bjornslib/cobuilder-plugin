# Rubric: Slice 3 — E2 tracer bullet: the gate line and its section

Feature: interaction-design-gate
Epic: E2
Slice goal: `plugins/implement/skills/build/SKILL.md` carries a `## Gate 2b` section between the Gate 2 and Gate 3 sections, and the `00-status.md` template carries the `2b` line in the same position.
Test command: uv run --with pytest pytest tests/test_gate_2b.py -v

## Criteria

### C1 — the gate has its own section in the build skill [CRITICAL]
**Must be true:** `build/SKILL.md` carries a `## Gate 2b` section. It sits
after the Gate 2 section and before the Gate 3 section, so a session reads the
gates in order.
**Evidence to check:**
- Run `grep -nE '^## Gate' plugins/implement/skills/build/SKILL.md` and read the
  line numbers.
- Read the `## Gate 2b` section and confirm it states what the gate asks for.
**Scoring:**
- 1.0 — the section exists at the approved position and states the gate.
- 0.5 — the section exists but sits after Gate 3, or the order is unreadable.
- 0.0 — no Gate 2b section, or the gate is written as a sub-step of Gate 2.

### C2 — the `00-status.md` template carries the `2b` line in the right position [CRITICAL]
**Must be true:** The template block inside `build/SKILL.md` shows five gate
lines. The `2b` line sits between the Gate 2 line and the Gate 3 line, in this
order:
```
- Gate 1 — Product: ...
- Gate 2 — Architecture: ...
- Gate 2b — Interaction design: ...
- Gate 3 — Program Design: ...
- Gate 4 — Slice plan, epic designs, and rubrics: ...
```
**Evidence to check:**
- Read the template block in `plugins/implement/skills/build/SKILL.md`.
- Read the same block in `docs/plans/interaction-design-gate/epic-E2-design.md`
  and compare the two.
- Run the template-order check named in the test plan of
  `docs/plans/interaction-design-gate/epic-E2-design.md`, if it is present.
**Scoring:**
- 1.0 — five lines, `2b` between Gate 2 and Gate 3, spelled `Gate 2b — Interaction design:`.
- 0.5 — the line exists but sits in the wrong position, or its label differs.
- 0.0 — the template still shows four lines.

### C3 — the gate is a tracked line, not a sub-step
**Must be true:** The `2b` line is a peer of the other gate lines. It begins
with `- Gate 2b` at the same indent, and it carries the same four answer forms
as its neighbours. A person reading `00-status.md` sees one line per approval.
**Evidence to check:**
- Read the template block and confirm the leading characters are identical
  across the five lines.
- Read the `## Gate 2b` section and confirm it says the gate is separate from
  Gate 2.
**Scoring:**
- 1.0 — a peer line at the same indent, with the same answer forms.
- 0.5 — a peer line, but the answer forms differ from its neighbours or the prose
  still nests it under Gate 2.
- 0.0 — nested as a sub-bullet, so a reader counts four gates.

### C4 — the template line demands the `## Screens` quote for an `n/a` answer
**Must be true:** The template's `2b` line shows the `n/a (no UI)` form and
requires the `## Screens` entry to be quoted. `verify_gate.py` cannot tell
whether a front end exists, so the quote is the only check on that answer.
**Evidence to check:**
- Read the template line and confirm the quote requirement is visible.
- Compare against the template line in
  `docs/plans/interaction-design-gate/epic-E2-design.md`.
**Scoring:**
- 1.0 — the `n/a` form and the quote requirement both appear.
- 0.5 — the `n/a` form appears with no quote requirement.
- 0.0 — the line offers only `pending` and `APPROVED`.

## Regression check
- All tests that passed before this slice must still pass:
  `uv run --with pytest pytest tests/ -q`.
- `tests/test_commands.py` must keep passing. It requires a matching mode
  heading for each command, and this change adds no command.
- Files outside `plugins/implement/skills/build/SKILL.md` must be unchanged.

## Out of scope — do not penalise
- The three paths, the two consumption rules, the resume rule, the
  `commands/start.md` list, and the version bump (slice 4).
- Any change to `verify_gate.py`. The gate check is slice 5. Until slice 5
  lands, a `2b` line is invisible to the tool, and that is expected here.
- Any change to the index or the Builds view (slices 6 and 7).
- The vendored skill itself (epic E1).
