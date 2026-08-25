# Epic Technical Solution Design: E4 — The record index

Feature: cobuilder-family
Epic ID: plugin-split/E4

This design was written on 2026-08-25, after this epic's two slices were
built and accepted. Gate 4b did not run before implementation, so this
document records the design as built. It did not constrain the work. The
rubrics for this epic in `.cobuilder/rubrics/cobuilder-family/` were
derived without a written 4b design in hand.

## Scope and Intent

E4 replaces the two separate projection scripts (`build_adrs.py` and
`build_designs.py`) with one `shared/build_index.py` that emits every
entity — ADR, design, epic, context, district, boundary rule, pull request,
slice, publication — with a stable id, and resolves the joins between them,
including an ADR reaching its pull request through a design and an epic.
ADR-0018 governs this epic.

## Files Touched

- `shared/build_index.py` — the whole collect-and-resolve pipeline, 1163
  lines. `build_adrs.py` and `build_designs.py` no longer exist anywhere in
  the tree.
- `docs/architecture/designs/plugin-split/goal.json` and
  `docs/plans/cobuilder-family/04-slices.md` — the source data `collect_
  designs()` and `collect_plans()` read.
- `.cobuilder-architect/self/data/index.json` and `index.js` — the
  generated output, checked in as the self-bundle's own projection.

## Types & Signatures

Read directly from `shared/build_index.py`. Selected signatures, in the
order the pipeline calls them:

```python
def collect_adrs(repo: Path) -> tuple[list[dict], dict[str, dict], list[str]]: ...
def collect_designs(repo: Path) -> tuple[list[dict], ...]: ...
def collect_contexts(repo: Path) -> tuple[list[dict], list[dict], list[str]]: ...
def collect_districts(bundle_dir: Path) -> tuple[list[dict], list[str]]: ...
def collect_plans(repo: Path) -> tuple[list[dict], list[str]]: ...
def collect_pull_requests(bundle_dir: Path) -> tuple[list[dict], list[str]]: ...
def collect_publications(bundle_dir: Path) -> tuple[list[dict], list[str]]: ...

def gh_pr_for_branch(branch: str, warnings: list[str], gh_state: dict) -> int | None: ...
def resolve_epic_pull_requests(...) -> tuple[dict[str, int], dict[str, str]]: ...
def refine_epic_status(epic_status: dict[str, str], epic_to_pr: dict[str, int],
                        pull_requests: list[dict]) -> None: ...
def adrs_reaching_design(adr_id: str, adr_record: dict,
                          design_records: dict[str, dict]) -> list[str]: ...
def resolve_adr_to_pull_request(...) -> ...
def resolve_slice_to_epic(...) -> ...
def resolve_context_district_joins(...) -> ...
def resolve_joins(...) -> dict: ...

def hash_tree(path: Path) -> str: ...
def git_head(repo: Path) -> str | None: ...
def compute_sources(repo: Path) -> dict: ...
def is_stale(index: dict, repo: Path) -> bool: ...
def build_index(repo: Path, bundle_dir: Path) -> tuple[dict, dict, dict, list[str]]: ...
```

`collect_pull_requests(bundle_dir: Path)` reads `data/story.json`:

```python
def collect_pull_requests(bundle_dir: Path) -> tuple[list[dict], list[str]]:
    story_path = bundle_dir / "data" / "story.json"
    ...
    timeline = raw.get("timeline")
    ...
    for entry in timeline:
        if not isinstance(entry, dict) or entry.get("pr") is None:
            continue
        entities.append({"id": entry["pr"], "title": entry.get("title"),
                          "state": entry.get("status"), ...})
    return entities, []
```

`refine_epic_status` then tries to overwrite the placeholder state:

```python
def refine_epic_status(epic_status: dict[str, str], epic_to_pr: dict[str, int],
                        pull_requests: list[dict]) -> None:
    """Replace the placeholder 'open' status with the real pull request state."""
    state_by_number = {pr["id"]: pr.get("state") for pr in pull_requests}
    for epic_id, pr_number in epic_to_pr.items():
        state = state_by_number.get(pr_number)
        if state:
            epic_status[epic_id] = str(state).lower()
```

## Slice Decomposition

Per `04-slices.md`:

1. **Slice 8 — the index holds the entities.** No dependency beyond E3's
   compatibility gate. `build_index.py` emits every entity, and the two
   scripts it replaces are gone. Completed, score 1.00.
2. **Slice 9 — the index resolves the joins.** Depends on slice 8's entity
   set existing to join against. `adr_to_pull_request`, `slice_to_epic`,
   `district_uncovered`, and freshness (`is_stale`). Completed, score 1.00.

## Test Plan

`tests/test_build_index.py` carries twenty tests. The ones specific to
each slice:

- Slice 8: `test_every_entity_type_appears_with_correct_count`,
  `test_deleting_a_source_document_removes_it_on_rebuild` (proves the index
  is a full rebuild, not a merge), `test_writes_nothing_into_docs`,
  `test_calls_compatibility_gate_before_first_write`, and
  `test_slice_8_entities_still_present_alongside_joins`.
- Slice 9: `test_adr_reaches_pull_request_direct_path`, `test_adr_reaches_
  pull_request_through_design_and_epic`, `test_adr_with_no_reachable_
  design_is_unresolved_not_guessed`, `test_epic_with_no_branch_is_
  unstarted`, `test_epic_with_branch_but_no_pull_request_is_reported_not_
  errored`, `test_district_and_context_resolve_both_ways`, `test_uncovered_
  district_is_listed`, `test_every_slice_declares_an_existing_epic`,
  `test_a_bare_epic_header_id_is_unresolved_not_guessed`, `test_an_epic_
  header_naming_an_undeclared_epic_is_unresolved`, `test_all_fourteen_
  real_slices_resolve_from_the_scoped_id`, `test_changing_an_authored_
  document_marks_the_index_stale`, `test_moving_the_git_head_marks_the_
  index_stale`, `test_epic_id_scoped_to_design_no_collision`, and
  `test_gate_source_scan`.

No test in the suite asserts the open-pull-request behavior described
below under Risks. `test_epic_with_branch_but_no_pull_request_is_reported_
not_errored` covers an epic with no matching pull request at all, which is
a different case from an epic whose pull request exists but is open, not
merged.

## Risks & Open Questions

- **An open pull request does not resolve to a real state.**
  `collect_pull_requests()` reads only `data/story.json`, which holds
  narrated merged pull requests. An open pull request is never narrated
  into `story.json`, so it never becomes a `pull_request` entity.
  `resolve_epic_pull_requests()` still finds the PR number through `gh pr
  list --head <branch>`, and sets a hardcoded placeholder state of
  `"open"`. `refine_epic_status()` then tries to look that number up in
  `pull_requests`, finds nothing, and the placeholder survives unchanged.
  Verified by reading `collect_pull_requests` and `refine_epic_status`
  together in `shared/build_index.py`. This is the exact behavior the
  epic's own PR (pull request 11, still open at the time of writing) hits
  today: `resolve_epic_pull_requests` reports E1 through E6 as `"open"` by
  construction, not because the placeholder was refined against a real
  state.
- **Closing this gap needs a decision, not a fix.** Either `collect_pull_
  requests()` gains a second, `gh`-backed path for a pull request with no
  narration yet, or the placeholder stays and the index documents it as a
  known limit. This design does not resolve which.
- **`hash_tree()` and `is_stale()` were read but not exercised by hand**
  against a real edit during this write-up. The corresponding tests,
  `test_changing_an_authored_document_marks_the_index_stale` and `test_
  moving_the_git_head_marks_the_index_stale`, stand in for that
  verification.
