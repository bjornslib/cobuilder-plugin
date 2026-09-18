# Epic E3 design: The mechanical consumer and the projection

## Scope and Intent

Two jobs, both about the gate being real rather than recorded.

1. `verify_gate.py` checks the gate. A 2b line that reads pending fails the
   script, so a session cannot reach a slice while the design is missing.
2. The Builds view shows the document. A reviewer reads the interaction design
   the same way as the other gate documents, without opening the file system.

This epic is separable. If the reviewer wants a smaller change, this is the
epic to cut. Gate 2b still works without it, because `verify_gate.py` needs no
viewer and the rubric author reads a file. The cost of cutting it is that a
reviewer must open `docs/plans/<slug>/interaction-design.md` by hand.

This epic is also larger than it first looks. Three places assume a gate label
is a small integer. Each one is named below, with its line number.

## Files Touched

| File | Change |
|---|---|
| `plugins/implement/scripts/verify_gate.py` | A `STATUS_2B_RE` regex, `REQUIRED_INTERACTION_SECTIONS`, and three functions: `check_2b_status()`, `check_interaction_sections()`, `check_2b()`. The `--json` payload and the printed table gain a 2b block. The docstring changes. |
| `shared/build_index.py` | `STATUS_GATE_RE` accepts a letter suffix. A new `discover_interaction_design_docs()` function. A new `interaction_design` key beside `program_design` and `epic_design` (line 1255). |
| `plugins/artifact/scripts/build_builds_view.py` | `GATE_LINE` accepts a letter suffix. `GATE_DOCS` gains a `"2b"` key. `current_doc()` treats an `n/a` gate as done. |
| `plugins/artifact/viewer/index.html` | Line 3290 stops comparing `g.n` to the literal `4`. |
| `tests/test_gate_2b.py` | New. Six tests. |
| `tests/test_build_index_gate_docs.py` | Covers the new entity, following the pattern already used for `program_design`. |

### The three integer-only assumptions

| # | Location | Code today | Why it breaks |
|---|---|---|---|
| 1 | `shared/build_index.py:1091` | `if gate["n"] == 3 and feature in program_design_features:` | `n` is an integer, so `"2b"` never equals it. The comparison is also untyped, so a string `n` silently stops matching gate 3. |
| 2 | `plugins/artifact/viewer/index.html:3290` | `const isCurrent = g.n === 4;` | The rail marks gate 4 as current. The literal assumes the last gate is number 4. |
| 3 | `plugins/artifact/scripts/build_builds_view.py:181` | `if not g["state"].startswith("APPROVED"):` | An `n/a` gate is not approved, so the page opens on a gate that asks for nothing. |

Assumption 3 is the sharpest. It is a live defect for the `n/a` convention
itself, not only for Gate 2b. If Gate 4b ever reads `n/a` for every epic, the
same bug appears today.

## Types & Signatures

```python
# --- plugins/implement/scripts/verify_gate.py -----------------------------

def check_2b_status(status_text: str | None) -> str:
    """Return "ok", "n/a", or "pending" for the 2b line.

    No 2b line at all returns "n/a". The gate is newer than those status
    files, so silence means the gate did not exist. This choice keeps
    docs/plans/cobuilder-family and docs/plans/gate-doc-surfacing passing.
    A 2b line that is present and unapproved returns "pending".
    """


def check_interaction_sections(text: str) -> str:
    """Return "ok", or "incomplete:<missing,...>". Mirrors
    check_design_sections(), which Gate 4b already uses."""


def check_2b(plan_dir: Path, status_text: str | None) -> dict[str, str]:
    """Return {interaction.file, interaction.sections, ui_spec.file,
    interaction.approved}."""


# --- shared/build_index.py ------------------------------------------------

STATUS_GATE_RE = re.compile(r"^-\s*Gate\s*(\d+\w?)\s*[—–-]\s*([^:]+):\s*(.+)$")


def discover_interaction_design_docs(repo: Path) -> list[dict]:
    """One entity per docs/plans/<slug>/interaction-design.md.

    Keys: feature_slug, gate ("2b"), title, state, source_path, body_md.
    Mirrors discover_plan_gate_docs() under ADR-0022.
    """


def resolve_feature_gates(repo: Path) -> dict[str, list[dict]]:
    """`n` becomes str(gm.group(1)) for every gate, so one type serves the
    array. Callers that compare a number must compare a string."""
```

```javascript
// --- plugins/artifact/viewer/index.html ----------------------------------
// Was: const isCurrent = g.n === 4;
// The last gate in the array is the current one when every gate is done.
const isCurrent = g === gates[gates.length - 1] && g.n !== '2b';
```

## Slice Decomposition

- **Slice 5** adds the 2b group to `verify_gate.py`. It proves enforcement works
  before anything depends on the viewer. This slice is the mechanical consumer
  that the ADR requires.
- **Slice 6** projects the entity and renders the rail card. It proves a
  reviewer can read the document in the Builds view.
- **Slice 7** repairs the three integer-only assumptions. It proves the two
  historical plans still pass, which is the regression test that matters.

Slice 7 carries the risk. A regex widened to `(\d+\w?)` matches more than
`2b`, so the tests must show that gates 1 to 4 behave exactly as before.

## Test Plan

`tests/test_gate_2b.py` — new. Fixtures in `tmp_path`, no network.

| Test | Assertion |
|---|---|
| Missing 2b line | Reports `n/a` and exits 0 |
| Pending 2b line | Reports `pending` and exits non-zero |
| Approved, both files, all sections | Reports `ok` and exits 0 |
| Approved, one section absent | Reports `incomplete:` and exits non-zero |
| `n/a` line, no artifact | Reports `n/a` and exits 0 |
| Two historical plans | `cobuilder-family` and `gate-doc-surfacing` both report `Overall: OK` |

`tests/test_build_index_gate_docs.py` gains a case for `interaction_design`,
following the pattern already there for `program_design`.

The last row of the first table is the regression test. It runs the script
against the two plans that pass today, so a widened regex cannot quietly break
them.

## Risks & Open Questions

- **The 2b label widens two regexes.** `(\d+)` becomes `(\d+\w?)`. A plan with a
  line such as `- Gate 2b — ...` in prose could match, so the regex stays
  anchored at the line start. Covered by slice 9.
- **`n` changes type in `data/index.json`.** This is a breaking change for any
  consumer outside this repository. The viewer is the only consumer found.
  Open question: should `n` stay an integer, with the label in a second field?
  That would keep `feature_gates` stable and add `label`. Not decided, and
  slice 8 should settle it.
- **The viewer's landing gate changes.** Adding a 2b gate to a plan that has one
  changes which gate the page opens on. For plans with no 2b line, nothing
  changes. Accepted.
- **`current_doc()` and `n/a` is a pre-existing defect.** Fixing it is worth
  doing on its own line, because Gate 4b can read `n/a` today. Open question:
  should that fix ship in this epic, or in its own change?
- **The Builds view is a static bundle.** The rail reads `data/index.json`, so
  the document appears only after an index rebuild. Accepted. Every other gate
  document behaves the same way.
- **This plan's epic joins resolve.** Epic identity comes from
  `docs/architecture/designs/<name>/goal.json`. A design record was written by
  hand on 2026-09-14 at `docs/architecture/designs/interaction-design-gate/`,
  holding the outcome, the epic registry for E1 to E3, and `stage: decided`.
  `uv run shared/build_index.py` printed no warnings, and all seven slices joined
  to their epics.

  The record is the minimum the index reads. Design mode did not run, so its
  four companion files are absent on purpose. `min_work.note` says so, and
  ADR-0024 holds the reasoning.
