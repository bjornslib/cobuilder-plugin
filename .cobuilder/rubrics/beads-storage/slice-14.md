Kind: behavioral

# Rubric: Slice 14 — Architect writes gate values

Feature: beads-storage
Epic: beads-storage/E4
Slice goal: A fixture program records each gate value and the program stage through `tracker.py`, and the status file shows each approval date.
Test command: `uv run pytest tests/test_architect_tracker_state.py -q`

## Criteria

### C1 — Design mode records each gate approval through `set-gate-value` [CRITICAL]

**Must be true:** Given only `plugins/architect/skills/architecture/references/design-mode.md` and a fixture program with gate 1 approved on 2026-10-17, a fresh agent records the approval by running `tracker.py set-gate-value` with the gate and the date. It never edits the gate line of `00-status.md` by hand.

**Evidence to check:** Transcript of the fresh run. A `set-gate-value --gate gate1 --value 2026-10-17` call must appear. No `Edit` or `Write` call targets a gate line in `00-status.md`.

**Scoring:**
- 1.0: the `set-gate-value` call runs with the gate and the date, and no hand write appears.
- 0.5: the call runs, but the agent also writes the gate line by hand.
- 0.0: no `set-gate-value` call, and the gate line is written by hand.

### C2 — Design mode records the program stage through `set-program-stage`

**Must be true:** Given the architecture SKILL.md "Workflow state" section and a fixture design that is decided, a fresh agent runs `tracker.py set-program-stage` with a stage named in `_bundle_meta.DESIGN_STAGES`. It never writes a stage string by hand into a state file.

**Evidence to check:** Transcript of the fresh run. The `set-program-stage` call must carry a `--stage` value from the list in `shared/_bundle_meta.py`. A value outside the list must not appear.

**Scoring:**
- 1.0: the call runs with a listed stage.
- 0.5: the call runs with a stage not in the list, and the CLI exits 4.
- 0.0: no call appears.

### C3 — Stage 7 writes the epic branch through `set-epic-state --branch`

**Must be true:** Given `design-mode.md` stage 7 and a fixture epic that has a branch, a fresh agent runs `tracker.py set-epic-state` with `--branch`. The branch value is read back with `list-epics` and matches the fixture branch.

**Evidence to check:** Transcript of the fresh run. The `set-epic-state` call must carry `--branch` with the fixture branch name. A later `list-epics` call must show the same value.

**Scoring:**
- 1.0: the branch is written through the CLI and read back equal.
- 0.5: the branch is written through the CLI, but the read back differs.
- 0.0: no branch write appears, or the agent edits `goal.json` by hand.

### C4 — The status file shows each approval date after regeneration

**Must be true:** After the fresh run, `tracker.py regenerate-status-files` runs for the fixture program. The regenerated `00-status.md` shows the approval date for each recorded gate.

**Evidence to check:** `uv run pytest tests/test_architect_tracker_state.py -q -k approval_dates` passes. Read the regenerated file and find the gate 1 line. It must show `2026-10-17`.

**Scoring:**
- 1.0: every recorded gate shows its date.
- 0.5: some gates show a date.
- 0.0: no date appears, or the regenerate call is missing.

## Regression check

- `uv run pytest tests/test_architect_tracker_state.py -q` passes.
- The architect `plugin.json` and `marketplace.json` versions match.
- `design-mode.md` makes no hand write to program or gate state.

## Out of scope — do not penalise

- Gate content, ADR text, and design prose. Those belong to the design process, not the write path.
- The stage 6 draft review. It does not change in this slice.
- Port internals. Those belong to E1 to E3.
