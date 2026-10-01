# Rubric: Slice 1 — The SVG contract and its validator

Feature: nexus-borrowings
Epic: nexus-borrowings/E1
Slice goal: `plugins/architect/skills/architecture/references/runtime-architecture-diagram.md` exists and `shared/skills/mermaid/references/architecture-diagram.md` is gone. `uv run plugins/architect/scripts/check_design_svg.py` passes this design's `runtime-architecture.svg` and fails each broken fixture for its own check; a long-text fixture only warns. `tests/test_design_svg.py` passes.
Test command: `uv run --with pytest pytest tests/test_design_svg.py -q`

Sources: `04-slices.md` row 1, `epic-E1-design.md`, ADR-0036.

## Criteria

### C1 — The contract reference exists and the mermaid contract is gone [CRITICAL]
**Must be true:** `plugins/architect/skills/architecture/references/runtime-architecture-diagram.md` exists, states the slot path `docs/architecture/designs/<name>/diagrams/runtime-architecture.svg`, the clustered-boundary, shape-semantics, protocol-label, 8-30-node, and single-page rules, the no-script/no-external-reference SVG rules, and cites ADR-0035. `shared/skills/mermaid/references/architecture-diagram.md` does not exist.
**Evidence to check:**
- Read both paths.
- `grep -n "ADR-0035" plugins/architect/skills/architecture/references/runtime-architecture-diagram.md` finds the citation.
**Scoring:** 1.0 both; 0.5 contract exists but the mermaid contract lingers; 0.0 either missing.

### C2 — The validator passes a good SVG and fails broken ones for their own check [CRITICAL]
**Must be true:** `uv run plugins/architect/scripts/check_design_svg.py docs/architecture/designs/nexus-borrowings/diagrams/runtime-architecture.svg` exits 0. Each broken fixture under `tests/fixtures/design_svg/` exits 1 with its check number in the output. A long-text fixture exits 0 and prints a warning.
**Evidence to check:**
- Run the commands; read the output lines (`ERROR check N:` / `WARN check N:`).
**Scoring:** 1.0 all three behaviors; 0.5 passes good but fixtures cannot be matched to checks; 0.0 validator missing or wrong on the good file.

### C3 — The checker mirrors the options-report checker's discipline [IMPORTANT]
**Must be true:** No third-party imports; `html.parser` subclass; `Result` dataclass with `check`, `severity`, `message`; `main` exit-0-only-when-no-error; the module docstring names the pattern source.
**Evidence to check:** Read the script head; compare with `plugins/architect/scripts/check_options_report.py`.
**Scoring:** 1.0 all; 0.5 works but imports a dependency or skips the docstring; 0.0 otherwise.

### C4 — Out of scope respected [IMPORTANT]
**Must be true:** No change to `shared/build_index.py` (slice 2), the viewer (slice 3), or any level-{1,2,3} consumer. `build_diagrams.py` untouched.
**Evidence to check:** `git diff` for the slice touches only the two new files, fixtures, tests, and the deleted mermaid contract.
**Scoring:** 1.0 clean; 0.0 scope creep.