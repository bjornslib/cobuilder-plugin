# Rubric: Slice 5 — E3 tracer bullet: the 2b group in verify_gate.py

Feature: interaction-design-gate
Epic: E3
Slice goal: `plugins/implement/scripts/verify_gate.py` reports a `2b` group with its four keys, treats a missing `2b` line as `n/a`, and fails a `2b` line that is present and unapproved.
Test command: uv run --with pytest pytest tests/test_verify_gate_2b.py -v

## Criteria

### C1 — the tool prints a `2b` group with four keys [CRITICAL]
**Must be true:** Running the tool against a plan directory prints a `2b`
group carrying `interaction.file`, `interaction.sections`, `ui_spec.file`, and
`interaction.approved`. The group appears in the human output and in the
`--json` payload.
**Evidence to check:**
- Run `uv run --with pytest pytest tests/test_verify_gate_2b.py -v`.
- Run `python3 plugins/implement/scripts/verify_gate.py --plan docs/plans/interaction-design-gate`
  and read the output.
- Run the same command with `--json` and confirm a `"2b"` key is present.
**Scoring:**
- 1.0 — the group appears in both outputs with all four keys.
- 0.5 — the group appears, but a key is missing or the `--json` payload omits it.
- 0.0 — no `2b` group. The gate is invisible to the tool.

### C2 — a present and unapproved `2b` line fails the gate [CRITICAL]
**Must be true:** A plan whose `00-status.md` carries a `2b` line reading
`pending` exits non-zero. A gate that cannot fail is not a gate.
**Evidence to check:**
- Run the test suite and find `test_pending_2b_line_fails`.
- Read that test and confirm it builds a fixture with a `pending` line and
  asserts a non-zero exit.
**Scoring:**
- 1.0 — the test exists, passes, and asserts a non-zero exit.
- 0.5 — the test asserts a failure for one key but the overall exit stays zero.
- 0.0 — a `pending` `2b` line passes.

### C3 — a missing `2b` line means `n/a`, not failure
**Must be true:** A `00-status.md` with no `2b` line at all reports `n/a` and
exits zero. The gate is newer than those files, so their silence means the gate
did not exist, not that it is waiting. This is the rule that keeps the three
plans already in this repository passing.
**Evidence to check:**
- Run the test suite and find `test_missing_2b_line_is_n/a`.
- Run `python3 plugins/implement/scripts/verify_gate.py --plan docs/plans/cobuilder-family`
  and `--plan docs/plans/gate-doc-surfacing`. Both must still report
  `Overall: OK`.
- Run the same command against `docs/plans/skill-collision-fix`, which fails
  Gate 4 for unrelated reasons, and confirm the `2b` keys are `n/a` rather than
  the cause.
**Scoring:**
- 1.0 — a missing line is `n/a`, and the three existing plans behave as described.
- 0.5 — a missing line is `n/a`, but an existing plan's overall result changed.
- 0.0 — a missing line fails the gate, which would break every plan written before today.

### C4 — the section check names what is missing
**Must be true:** `check_interaction_sections()` returns `ok` when all eight
headings are present, and `incomplete:<missing,...>` otherwise, naming the
headings that are absent. `REQUIRED_INTERACTION_SECTIONS` holds those eight
headings as literal strings, matching `templates/interaction-design.md`.
**Evidence to check:**
- Run the test suite and find
  `test_approved_2b_line_fails_when_a_section_is_absent`.
- Read `REQUIRED_INTERACTION_SECTIONS` in
  `plugins/implement/scripts/verify_gate.py` and compare it against the eight
  headings in `plugins/implement/skills/design-to-code/templates/interaction-design.md`.
**Scoring:**
- 1.0 — the check names the absent headings, and the constant matches the template.
- 0.5 — the check fails a document with a missing heading but does not name which one.
- 0.0 — the check passes a document with a missing heading, or the constant disagrees with the template.

### C5 — the docstring and the exit rule keep their meaning
**Must be true:** The module docstring names Gate 2b as well as Gate 4. The
exit rule is unchanged: exit 0 only when every key is `ok` or `n/a`.
**Evidence to check:**
- Read the docstring at the top of `plugins/implement/scripts/verify_gate.py`.
- Read the exit rule and confirm `is_ok()` still treats `n/a` as acceptable.
- Run the tool against a plan that fails Gate 4 and confirm the exit code is non-zero.
**Scoring:**
- 1.0 — the docstring names both gates, and the exit rule is unchanged.
- 0.5 — the docstring is stale, or the exit rule changed.
- 0.0 — the exit rule now passes a plan with a failed key.

## Regression check
- All tests that passed before this slice must still pass:
  `uv run --with pytest pytest tests/ -q`.
- `python3 plugins/implement/scripts/verify_gate.py --plan docs/plans/cobuilder-family`
  and `--plan docs/plans/gate-doc-surfacing` must both still report `Overall: OK`.
- Files outside `plugins/implement/scripts/verify_gate.py` and
  `tests/test_verify_gate_2b.py` must be unchanged.

## Out of scope — do not penalise
- The `interaction_design` entity in the index, `GATE_LINE`, `GATE_DOCS`, the
  Builds view rail, and `current_doc()` (slices 6 and 7).
- The three integer-only call sites (slice 7).
- Any change to the vendored skill (epic E1) or the build skill (epic E2).
- The `n/a` answer's accuracy. The tool cannot tell whether a front end exists,
  and the approved design accepts that limit.
