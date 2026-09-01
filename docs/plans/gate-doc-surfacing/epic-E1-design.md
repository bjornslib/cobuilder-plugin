# Epic Technical Solution Design: E1 — Index gate docs into data/index.json

Feature: gate-doc-surfacing
Epic ID: E1

## Scope and Intent
Project `docs/plans/<slug>/03-program-design.md` and
`docs/plans/<slug>/epic-<id>-design.md` files into two new
`data/index.json` entity arrays, `program_design` and `epic_design`, so the
viewer has something to read. Attach a `doc` reference to the matching
Gate 3 entry in `joins.feature_gates`, and a `design_doc` reference to the
matching epic in `entities.epic`. No viewer changes in this epic — that is
E2.

## Files Touched
- `shared/build_index.py` — add `PROGRAM_DESIGN_FIELDS`,
  `EPIC_DESIGN_FIELDS`, `discover_plan_gate_docs()`,
  `project_program_design()`, `project_epic_design()`; wire the new
  entities into the top-level `build_index()`/`main()` flow the same way
  `collect_designs()` already is; extend `resolve_feature_gates()` and the
  epic entity emission in `collect_designs()` with the new `doc`/`design_doc`
  references.
- `tests/test_build_index_gate_docs.py` — new test file.

## Types & Signatures

```python
PROGRAM_DESIGN_FIELDS: tuple[str, ...] = (
    "id", "feature_slug", "gate", "title", "body_md", "approved_date", "source_path",
)
EPIC_DESIGN_FIELDS: tuple[str, ...] = (
    "id", "epic_id", "feature_slug", "title", "body_md", "approved_date", "source_path",
)

def discover_plan_gate_docs(repo: Path) -> list[dict]:
    """Walk docs/plans/*/. Return one dict per gate doc found:
    {"kind": "program", "feature_slug": str, "path": Path, "text": str}
    or
    {"kind": "epic", "epic_id": str, "feature_slug": str, "path": Path, "text": str}.
    An epic id is parsed from the filename epic-<id>-design.md; a file
    whose id segment fails to parse is skipped, not raised on — this
    function never crashes a full index rebuild over one malformed name.
    """

def project_program_design(feature_slug: str, path: Path, text: str) -> dict:
    """Extract a title (first '# ' heading) and approved_date (from the
    matching 00-status.md's Gate 3 line, if resolvable) alongside the raw
    body. Returns a dict filtered through project_fields(..., PROGRAM_DESIGN_FIELDS)."""

def project_epic_design(epic_id: str, feature_slug: str, path: Path, text: str) -> dict:
    """Same shape, keyed on epic_id instead of feature_slug."""
```

`id` for a `program_design` entity is the bare `feature_slug` (one Gate 3
doc per feature, so no collision risk). `id` for an `epic_design` entity is
the bare `epic_id` parsed from its filename — note this is the *unscoped*
epic id (`E1`), not the `<design>/<epic-id>` scoped id `entities.epic`
uses, because a technical design file lives under one `docs/plans/<slug>/`
directory already, so `feature_slug` carries the scoping context instead.
`entities.epic[].design_doc` stores the *scoped* lookup path
(`epic_design[<feature_slug>/<epic_id>]` is wrong; the correct join is:
look up `epic_design` by its own `epic_id` key, disambiguated by also
matching `feature_slug`, since two features could each have an `E1`).
Implementation note: to avoid this exact ambiguity, `epic_design`'s
`id` field is actually `f"{feature_slug}/{epic_id}"`, matching
`entities.epic`'s own `<design>/<epic-id>` scoping convention. This
supersedes the plain `epic_id` framing above — keep them consistent
during implementation; the test plan below locks this down.

## Slice Decomposition
1. **Slice 1 (tracer bullet).** Add the constants and empty-list wiring so
   `data/index.json` always carries `program_design: []` and
   `epic_design: []`, even with zero gate docs on disk. No dependency.
2. **Slice 2 (real parsing).** Implement `discover_plan_gate_docs()`,
   `project_program_design()`, `project_epic_design()`, and the
   `feature_gates`/`epic` join attachment. Depends on slice 1's constants.
3. **Slice 3 (edge cases).** Missing `docs/plans/` entirely, a plan
   directory with only some gate docs, a malformed epic filename. Depends
   on slice 2.

## Test Plan
`tests/test_build_index_gate_docs.py`:
- `test_project_program_design_reads_title_and_body` — feed a small
  markdown fixture, assert `title`/`body_md`/`source_path` match.
- `test_project_epic_design_id_is_scoped_feature_slug_and_epic_id` — locks
  down the `<feature_slug>/<epic_id>` id convention from the note above.
- `test_discover_plan_gate_docs_skips_malformed_epic_filename` — a file
  named `epic-design.md` (no id segment) is skipped, not raised on.
- `test_discover_plan_gate_docs_no_plans_dir_returns_empty_list` — repo
  with no `docs/plans/` at all.
- `test_resolve_feature_gates_attaches_doc_when_program_design_exists`.
- `test_resolve_feature_gates_gate3_doc_key_absent_when_no_md_file`.
- `test_build_index_end_to_end_index_json_has_program_design_and_epic_design_keys`
  — run against this repo's own tree; assert both keys exist, and (once
  this feature's own gate docs land) that this feature's own entities are
  among them.

## Risks & Open Questions
- The id-scoping ambiguity flagged above (`epic_id` alone vs.
  `<feature_slug>/<epic_id>`) must be resolved consistently between the
  producer (`project_epic_design`) and the consumer
  (`entities.epic[].design_doc` lookup in E2) — the test plan pins the
  chosen shape so E2 cannot silently diverge from it.
- `approved_date` sourcing from `00-status.md`'s Gate 3/4b lines duplicates
  what `resolve_feature_gates()` already parses there. Acceptable
  duplication since the two functions read the same file for different
  fields, not the same field twice.
