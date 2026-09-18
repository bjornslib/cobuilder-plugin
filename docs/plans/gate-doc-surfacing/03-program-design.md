# Program Design: Gate doc surfacing

## Files
- `shared/build_index.py` — modified. New constants `PROGRAM_DESIGN_FIELDS`,
  `EPIC_DESIGN_FIELDS`; new functions `discover_plan_gate_docs()`,
  `project_program_design()`, `project_epic_design()`; `collect_designs()`
  or a new `collect_gate_docs()` wires the new entities into the index;
  `resolve_feature_gates()` attaches `doc` per gate.
- `plugins/artifact/viewer/index.html` — modified. New functions
  `openGateDocSheet(kind, id)`, `closeGateDocSheet()`,
  `renderGateDocSheet()`. New markup block for the sheet (siblings of
  `#adr-sheet`). `renderBuildsMainContent()`'s `gate-rail-grid` and
  `renderEpicCard()` gain click wiring.
- `tests/test_build_index_gate_docs.py` — new. Covers the projection
  functions and `resolve_feature_gates()`'s new `doc` field.

## Types & signatures

```python
# shared/build_index.py
PROGRAM_DESIGN_FIELDS: tuple[str, ...]
EPIC_DESIGN_FIELDS: tuple[str, ...]

def discover_plan_gate_docs(repo: Path) -> list[dict]:
    """One dict per docs/plans/<slug>/{03-program-design.md, epic-*-design.md}
    found, with slug, kind ('program'|'epic'), epic_id (if kind == 'epic'),
    path, and raw markdown text."""

def project_program_design(feature_slug: str, path: Path, text: str) -> dict:
    """-> {"id": feature_slug, "feature_slug", "gate": 3, "title",
    "body_md", "approved_date", "source_path"}, fields filtered through
    project_fields(..., PROGRAM_DESIGN_FIELDS)."""

def project_epic_design(epic_id: str, feature_slug: str, path: Path, text: str) -> dict:
    """-> {"id": epic_id, "epic_id", "feature_slug", "title", "body_md",
    "approved_date", "source_path"}, filtered through
    project_fields(..., EPIC_DESIGN_FIELDS)."""
```

```javascript
// plugins/artifact/viewer/index.html
function openGateDocSheet(kind, id) { /* kind: 'program' | 'epic' */ }
function closeGateDocSheet() { }
function renderGateDocSheet() { /* reads window.INDEX.entities.program_design
  or .epic_design by id, renders via renderMarkdown() into the sheet body */ }
```

## Call stack

Index build (top to bottom):
```
main()
  build_index(repo)
    collect_designs(repo)          # unchanged
    discover_plan_gate_docs(repo)  # new
      project_program_design()     # new, one call per feature with a Gate 3 doc
      project_epic_design()        # new, one call per epic-*-design.md found
    resolve_joins(repo)
      resolve_feature_gates(repo)  # extended: attaches doc id where found
```

Viewer click (top to bottom):
```
gate-card click / epic design-doc chip click
  openGateDocSheet(kind, id)
    state.gateDocOpen = true; state.activeGateDocKind = kind; state.activeGateDocId = id
    renderGateDocSheet()
      lookup window.INDEX.entities.program_design[id] or .epic_design[id]
      renderMarkdown(record.body_md)   # reused, unchanged
    renderSheetVisibility()            # existing mutual-exclusivity function, extended
```

## Test plan
- `test_build_index_gate_docs.py::test_project_program_design_reads_title_and_body`
- `test_build_index_gate_docs.py::test_project_epic_design_parses_epic_id_from_filename`
- `test_build_index_gate_docs.py::test_discover_plan_gate_docs_skips_plan_dir_with_no_gate_docs`
- `test_build_index_gate_docs.py::test_resolve_feature_gates_attaches_doc_id_when_program_design_exists`
- `test_build_index_gate_docs.py::test_resolve_feature_gates_gate3_doc_absent_when_no_program_design_md`
- `test_build_index_gate_docs.py::test_build_index_end_to_end_index_json_carries_new_entity_keys`

Manual dogfood check (no automated frontend test harness in this repo):
open the rebuilt viewer, navigate to Builds, click this feature's own Gate
3 card once `03-program-design.md` exists (after this gate is approved),
confirm the sheet shows this document's content.

## Least confident decisions
- Whether `collect_designs()` should absorb the new entities directly, or
  a separate `collect_gate_docs()` function is cleaner — deferred to
  implementation; either satisfies the same `data/index.json` shape.
- Whether the sheet reuses the *same* DOM nodes as `#adr-sheet` with a mode
  flag, or gets its own sibling `#gate-doc-sheet` block — leaning toward a
  sibling block, since `renderAdrSheet` and a future `renderGateDocSheet`
  read different record shapes and a shared node risks stale content on a
  fast open/open across the two kinds.
