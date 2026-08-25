# Epic Technical Solution Design: E5 — One lifecycle surface

Feature: cobuilder-family
Epic ID: plugin-split/E5

This design was written on 2026-08-25, after this epic's two slices were
built and accepted. Gate 4b did not run before implementation, so this
document records the design as built. It did not constrain the work. The
rubrics for this epic in `.cobuilder/rubrics/cobuilder-family/` were
derived without a written 4b design in hand.

## Scope and Intent

E5 adds three viewer modes — Decisions, Contexts, and Builds — on top of
the index E4 built, adds a computed Backlog lane inside the Builds mode,
and moves the six generated pages out of `.lavish/` into the bundle's own
`pages/` directory. ADR-0018 governs the record index and lifecycle surface
this epic presents.

## Files Touched

- `plugins/cobuilder-artifact/viewer/index.html` — the five-mode top-left
  switcher (Designs, Pull requests, Decisions, Contexts, Builds), each
  mode's render function, and the Backlog lane computation.
- `scripts/build_builds_view.py` — reads the status document and the index
  to render the Builds page: `read_epics`, `read_rubrics`, `read_plan`,
  `current_doc`, `render`, and `main`.
- `.cobuilder-architect/self/pages/{builds-view.html,decisions-register.html,
  view-designs.html,artifact-transport-map.html,cobuilder-vocabulary.html,
  gate1-cobuilder-family.html}` — the six pages, now living in the bundle
  instead of `.lavish/`. `.lavish/` still holds its own copies as of this
  writing; `git status --short` does not list `.lavish/*.html` as deleted,
  so the move added a bundle copy without yet removing the `.lavish/`
  originals.
- `docs/architecture/contexts/cobuilder-packaging/{canvas.md,boundary.yaml}`
  — the one bounded context the Contexts mode renders today.

## Types & Signatures

`scripts/build_builds_view.py`:

```python
def read_epics(designs_dir: Path, slices_md: str) -> list[dict]: ...
def read_rubrics(rubrics_dir: Path) -> tuple[dict, dict]: ...
def read_plan(plan_dir: Path, designs_dir: Path, rubrics_dir: Path) -> dict: ...
def current_doc(gates: list[dict]) -> tuple[str, str, bool]: ...
def render(page: Path, plan_dir: Path, designs_dir: Path, rubrics_dir: Path) -> None: ...
def main() -> None: ...
```

The viewer's Builds mode reads `window.INDEX.entities.epic` and
`window.INDEX.joins` directly, per the in-page label at line 3305 of
`plugins/cobuilder-artifact/viewer/index.html`: "The Backlog lane is a
dynamic query over `window.INDEX.entities.epic` and `window.INDEX.joins`.
No authored backlog file feeds it." The Backlog lane holds every epic with
a null branch, plus every slice not yet scored, matching
`03-program-design.md`'s stated rule.

## Slice Decomposition

Per `04-slices.md`:

1. **Slice 10 — the Decisions and Contexts modes.** Depends on E4's index
   existing to read from. A person browses every decision and every
   context, with the anchor distinction (a decision an ADR cites versus a
   decision it merely touches) visible. Completed, score 1.00.
2. **Slice 11 — the Builds mode and the Backlog lane.** Depends on slice
   10's mode-switcher scaffold and on E4's `epic_to_pull_request` and
   `slice_to_epic` joins. Gates driven by the status document, the Backlog
   lane computed from the index, and pages moved into the bundle.
   Completed, score 0.92 — the one slice in this feature that scored below
   1.00, though it is still recorded as completed rather than escalated.

## Test Plan

- `tests/test_viewer_modes.py` — `test_viewer_contains_all_five_mode_
  buttons`, `test_decisions_mode_lists_all_records_and_anchor_distinction`,
  `test_contexts_mode_leads_with_violations_and_uncovered_districts`,
  `test_contexts_mode_renders_boundary_record_as_readable_rules`, and
  `test_export_artifact_parses_updated_viewer` — this last test guards
  against the exact regression `CLAUDE.md`'s Publish mode notes describe:
  an artifact export that cannot parse a viewer carrying new mode markup.
- No test file name in `tests/` targets `scripts/build_builds_view.py` by
  name, and no `test_builds_*` or `test_backlog_*` function exists in the
  suite as collected. The Builds mode and the Backlog lane are exercised
  indirectly, through `test_viewer_contains_all_five_mode_buttons` and the
  index tests in `tests/test_build_index.py` that the lane's query depends
  on, but neither a dedicated unit test nor an assertion on `read_plan`'s
  or `current_doc`'s return shape was found.

## Risks & Open Questions

- **`scripts/build_builds_view.py` carries no direct test coverage.**
  This is a genuine gap, not a design choice recorded anywhere. A change to
  `current_doc`'s gate-ordering logic or to `read_rubrics`'s score parsing
  could regress silently until a person looks at the rendered page.
- **`.lavish/` still holds the six pages the move was meant to retire.**
  `git status --short` shows no deletion for any `.lavish/*.html` file, so
  either the removal step of slice 11 has not run, or it ran in a commit
  this design could not locate. The bundle's `pages/` directory and
  `.lavish/` currently disagree about which copy is the source of record.
- **The 0.92 score on slice 11 has no recorded reason in `00-status.md`'s
  Escalated section**, because the slice was accepted rather than
  escalated. What specifically fell short of 1.00 was not found in any
  file this design reviewed.
