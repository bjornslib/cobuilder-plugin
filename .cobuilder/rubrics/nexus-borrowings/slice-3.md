# Rubric: Slice 3 — Viewer renders the runtime tile and the contracts section

Feature: nexus-borrowings
Epic: nexus-borrowings/E1
Slice goal: `architectureTileLevels` returns `["runtime","3"]` when the named key is present; the overview still leads the design. The `runtime` value renders as inline SVG, never through the mermaid renderer. `ContractsSection` hides on absence. Viewer tests pass.
Test command: viewer test suite (LevelSections and design-route tests)

Sources: `04-slices.md` row 3, `epic-E1-design.md`, `03-program-design.md`, ADR-0036, ADR-0020.

## Criteria

### C1 — Tile order: runtime leads the architecture level, never the design [CRITICAL]
**Must be true:** Inside the architecture level, the runtime tile renders before the `"3"` class tile. The level-1 overview remains the first diagram of the design. No level list gains an entry; `"4"` never appears.
**Evidence to check:** `architectureTileLevels` (single source) returns `["runtime","3"]`/`["3"]`; the test asserts order and the untouched overview.
**Scoring:** 1.0 with a single-source function and tests; 0.5 order right but call sites hard-code the key; 0.0 wrong.

### C2 — runtime renders inline SVG; never through mermaid [CRITICAL]
**Must be true:** The `runtime` value is injected as SVG markup. The mermaid renderer never receives it. No `<script>` content executes — the value comes pre-validated by check_design_svg at authoring time.
**Evidence to check:** The render path test; grep shows `runtime` and `mermaid` never meet in a call.
**Scoring:** 1.0; 0.5 renders but via the mermaid path; 0.0 otherwise.

### C3 — ContractsSection beside the envisioned PR, hidden on absence [CRITICAL]
**Must be true:** A contracts section renders next to the envisioned-pull-request section when `record["contracts"]` is set; a record without the key renders nothing there — not a placeholder, not an error.
**Evidence to check:** Two-direction test with real record fixtures.
**Scoring:** 1.0 both; 0.0 otherwise.

### C4 — Viewer build and ADR-0020 discipline hold [IMPORTANT]
**Must be true:** `npm run build` (or the committed `viewer/index.html` path) reflects the source change per ADR-0020; the readiness logic for levels is untouched.
**Evidence to check:** Build output or committed build artifact updated; readiness tests green.
**Scoring:** 1.0 both; 0.5 tests green but build artifact stale; 0.0 otherwise.