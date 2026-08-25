# Rubric: Slice 3 — the gate is wired and the bundle migrates

Feature: cobuilder-family
Epic: plugin-split/E3
Slice goal: Format 3, `min_reader_schema`, the generators map, and every writer gated.
Test command: `uv run --with pytest pytest tests/ -v`

## Criteria

### C1 — Every script that writes into a bundle calls the gate first [CRITICAL]
**Must be true:** No writer stamps a schema version without checking compatibility. The three that do so today are named in `03-program-design.md`.
**Evidence to check:** The static test that scans each writer, plus a read of each call site.
**Scoring:** 1.0 — every writer gated, and the test fails when a call is removed. 0.5 — writers gated but no test guards it. 0.0 — a writer still stamps unchecked.

### C2 — An existing bundle migrates without losing authored content [CRITICAL]
**Must be true:** A real bundle from before this change steps to format 3, and every authored field is byte-identical afterwards.
**Evidence to check:** Run the migration against a copy of the committed self-bundle. Diff the authored fields before and after.
**Scoring:** 1.0 — layout and schema step forward, authored fields unchanged, a backup exists. 0.5 — correct result with no backup written. 0.0 — an authored field changes, or the run half-writes.

### C3 — The scalar generator version becomes a map
**Must be true:** The single generator string is replaced by a map keyed by plugin, and the old value is preserved as the first entry rather than discarded.
**Evidence to check:** The migration test, and the migrated `bundle.json`.
**Scoring:** 1.0 — preserved and keyed correctly. 0.5 — map created, old value dropped. 0.0 — field unchanged or removed.

### C4 — A migration that touches an unexpected authored field stops before writing
**Must be true:** The existing authored-field guard still holds at the new version, and a violation writes nothing at all.
**Evidence to check:** The guard test, driven by a deliberately bad migration step.
**Scoring:** 1.0 — nothing reaches disk. 0.5 — it writes then reports. 0.0 — it writes silently.

### C5 — The viewer copy refreshes unconditionally
**Must be true:** The viewer refresh is not gated on a version check.
**Evidence to check:** Read the migration entry point, and the test that asserts a refresh at an unchanged version.
**Scoring:** 1.0 — unconditional and tested. 0.5 — unconditional and untested. 0.0 — behind a version gate.

## Regression check
- Every bundle in the repo still passes verification after migrating.
- The three committed bundles are migrated, not regenerated.

## Out of scope — do not penalise
- Any rename, any directory split, the index, the viewer modes, and the ledger.
