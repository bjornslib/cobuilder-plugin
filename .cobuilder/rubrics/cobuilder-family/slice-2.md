# Rubric: Slice 2 — the compatibility gate exists

Feature: cobuilder-family
Epic: plugin-split/E3
Slice goal: `require_compatible()` and `stamp_generator()` pass their tests, called by nothing yet.
Test command: `uv run --with pytest pytest tests/ -v`

## Criteria

### C1 — A bundle that demands a newer reader is refused [CRITICAL]
**Must be true:** Writing into a bundle whose `min_reader_schema` exceeds the running code's `SCHEMA_VERSION` raises, rather than writing and corrupting.
**Evidence to check:** `pytest tests/ -k require_compatible -v`, and read the raising branch.
**Scoring:** 1.0 — raises a named exception with the two versions in the message. 0.5 — raises a bare exception, or warns and continues. 0.0 — writes anyway.

### C2 — A newer bundle format is refused
**Must be true:** A `bundle_format` above the running code's is refused on the same path.
**Evidence to check:** The matching test.
**Scoring:** 1.0 — refused. 0.5 — refused only in one of the two code paths. 0.0 — accepted.

### C3 — A new bundle is not treated as incompatible
**Must be true:** A missing `bundle.json` means a new bundle and passes.
**Evidence to check:** The matching test.
**Scoring:** 1.0 — passes silently. 0.5 — passes with a spurious warning. 0.0 — raises.

### C4 — Recording one plugin's version does not drop another's
**Must be true:** Stamping as one plugin preserves every other entry in the generators map.
**Evidence to check:** The matching test, with two plugins already present.
**Scoring:** 1.0 — both survive. 0.5 — order or formatting churns but both survive. 0.0 — an entry is lost.

## Regression check
- Every test that passed before this slice still passes.
- No caller is changed. Scope is the shared version module and its tests.

## Out of scope — do not penalise
- Wiring the gate into the existing writers. That is slice 3.
- The migration ladder and `min_reader_schema` being written anywhere real.
