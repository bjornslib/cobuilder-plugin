"""Four claims about this repository's sparse designs, and the bundle that carries them.

A sparse design is a design whose authored directory under `docs/architecture/designs/`
holds `goal.json` and nothing else. Design mode's stages 2 to 7 have not run for it, so
it carries no `intent.json`, no `narrative.json`, and no `assessment.json`. The
vocabulary table in `CLAUDE.md` names `maintainable-viewer/` and `inflight-record-store/`
as two legitimate examples. A sparse design is a state, not a design that generation
stopped partway through.

This file restores four claims a deleted test file carried, and no other file in `tests/`
covers them today. Each claim is read from this repository's own files, and the four the
cases hold are:

1. `test_the_built_viewer_carries_the_sparse_design_gating` — the shipped viewer, at
   `plugins/artifact/viewer/index.html`, carries the gating a sparse design is read by.
2. `test_the_index_resolves_every_decision_a_sparse_design_names` — the real index at
   `.cobuilder-architect/self/data/index.json` resolves each sparse design's
   `goal.adrs[]`, so the decision a sparse design names has an indexed record and a
   resolved link.
3. `test_every_sparse_design_is_a_work_item_with_a_stage` — every sparse design appears
   in that index as a work item, and it carries the stage its authored goal states.
4. `test_the_derived_record_agrees_with_the_authored_directory` — this repository holds
   at least one sparse design, and the derived entry in
   `.cobuilder-architect/self/data/designs.js` agrees with the authored directory about
   that design.

THE SUBJECT IS DERIVED, NEVER LISTED. `sparse_designs()` walks `docs/architecture/designs/`
the way the viewer does and takes the directories that hold `goal.json` alone. Every id,
every stage, and every linked decision below comes from the authored files. A design that
stops being sparse leaves this file's subject set with no edit here, and a corpus that
loses its last sparse design fails case 4 rather than passing in silence.

No case here runs a build or writes a file. The shipped viewer and the bundle are read
where they lie, so the suite leaves both as it found them.

Run with: uv run --with pytest pytest tests/test_sparse_design_corpus.py -v
"""
from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DESIGNS_DIR = REPO_ROOT / "docs" / "architecture" / "designs"
INDEX_JSON = REPO_ROOT / ".cobuilder-architect" / "self" / "data" / "index.json"
DESIGNS_JS = REPO_ROOT / ".cobuilder-architect" / "self" / "data" / "designs.js"
BUILT_VIEWER = REPO_ROOT / "plugins" / "artifact" / "viewer" / "index.html"


# ---- the subject ----


def authored_files(design_id: str) -> list[str]:
    """The file names one design's own authored directory holds, sorted."""
    return sorted(
        entry.name for entry in (DESIGNS_DIR / design_id).iterdir() if entry.is_file()
    )


def sparse_designs() -> list[tuple[str, dict]]:
    """Every design whose authored directory holds `goal.json` alone, as (id, goal).

    This is the whole of the subject set. The directory name is the design id, which is
    the key the index's design entity and the viewer's route both use.
    """
    found: list[tuple[str, dict]] = []
    for entry in sorted(DESIGNS_DIR.iterdir()):
        if not entry.is_dir():
            continue
        if authored_files(entry.name) != ["goal.json"]:
            continue
        goal = json.loads((entry / "goal.json").read_text(encoding="utf-8"))
        found.append((entry.name, goal))
    return found


def named_decisions(goal: dict) -> list[str]:
    """The decision ids one authored goal names, in the order the record writes them.

    A goal names its decisions in `adrs[]`. The singular `adr` is the older field, and
    `adrs_reaching_design()` in `shared/build_index.py` reads both, so both are read here.
    """
    named = list(goal.get("adrs") or [])
    single = goal.get("adr")
    if single and single not in named:
        named.append(single)
    return named


def read_index() -> dict:
    """The real bundle index, which is the record both cases 2 and 3 read."""
    assert INDEX_JSON.is_file(), (
        f"{INDEX_JSON.relative_to(REPO_ROOT).as_posix()} is absent, so the index these "
        "cases read cannot be checked. It is a committed bundle file."
    )
    return json.loads(INDEX_JSON.read_text(encoding="utf-8"))


def inline_scripts(text: str) -> str:
    """The bodies of the shipped file's own `<script>` elements, joined.

    A shipped viewer renders from its inline script. A gating string that sits in an HTML
    comment, or in prose a reader sees, does not gate anything.
    """
    return "\n".join(re.findall(r"<script\b[^>]*>(.*?)</script>", text, flags=re.DOTALL))


# ---- 1. the shipped viewer carries the gating ----


def test_the_built_viewer_carries_the_sparse_design_gating():
    """The shipped viewer carries the gating a sparse design is read by.

    THE CLAIM. The built `plugins/artifact/viewer/index.html` carries the sparse-design
    gating: a rail row the design cannot fill reads disabled and states the record it
    could not read, so an absence reads as a state and never as a blank box.

    WHY THE BUILT FILE, AND NOT THE SOURCE. The source states this gating in
    `src/shell/model.ts`, which returns the absent record names, and in `src/shell/Rail.tsx`,
    which renders them. `plugins/artifact/viewer/index.html` is a build output, and a
    reader of the bundle meets that file and no other. A build that dropped the gating, or
    a shipped file that fell behind its source, would leave every source-side case green,
    so the claim is asserted against the bytes that ship.

    No build runs here. The file is read where it lies, and `tests/test_viewer_build.py`
    holds it to a fresh build.
    """
    assert BUILT_VIEWER.is_file(), (
        f"{BUILT_VIEWER.relative_to(REPO_ROOT).as_posix()} is absent, so the shipped "
        "viewer cannot be read. It is the file the viewer build writes."
    )
    text = BUILT_VIEWER.read_text(encoding="utf-8", errors="replace")
    shipped = inline_scripts(text)

    assert shipped, (
        "plugins/artifact/viewer/index.html carries no inline <script>. The shipped "
        "viewer renders from one, so this case reads no code at all."
    )

    required = {
        # The rail's disabled row: the state, and the name a reader hears.
        'aria-disabled': "the attribute that marks a gated row as a row, not a step",
        "is disabled. Absent: ": "the disabled row's own words, which name the absence",
        # The two sections a sparse design cannot fill, and the reason each one states.
        "intent.json": "a record Problem & Solution names when the design holds none",
        "narrative.json": "a record Problem & Solution names when the design holds none",
        "assessment.json": "a record Problem & Solution names when the design holds none",
        "no linked decision in goal.adrs[]": "the reason Architecture states for a goal "
        "that names no decision",
    }

    missing = [name for name in required if name not in shipped]
    assert not missing, (
        "the shipped viewer carries no gating for these, so a sparse design's absence "
        "reaches a reader as a blank or as an error state:\n"
        + "\n".join(f"  {name!r} — {required[name]}" for name in missing)
    )


# ---- 2. the index resolves each decision a sparse design names ----


def test_the_index_resolves_every_decision_a_sparse_design_names():
    """Every decision a sparse design names has an indexed record and a resolved link.

    THE CLAIM. The real `.cobuilder-architect/self/data/index.json` resolves each sparse
    design's `goal.adrs[]`, so the decision link a sparse design names appears in its
    indexed record. A design that names a decision the index does not carry would leave
    its Architecture level backed by nothing, and no other case reads both sides.
    """
    index = read_index()
    adr_records = {entity["id"]: entity for entity in index["entities"]["adr"]}
    resolved = index["joins"]["adr_to_pull_request"]
    designs = sparse_designs()

    assert designs, (
        "no design under docs/architecture/designs/ holds goal.json alone, so this "
        "claim has no subject."
    )

    checked = 0
    for design_id, goal in designs:
        for adr_id in named_decisions(goal):
            checked += 1
            where = f"{design_id} names {adr_id}"

            assert adr_id in adr_records, (
                f"{where}, and the index carries no record for it. The index's adr "
                "entities are the only records a linked decision resolves against."
            )
            record = adr_records[adr_id]
            assert record.get("title"), f"{where}, and its indexed record states no title"
            assert record.get("state"), f"{where}, and its indexed record states no state"

            assert adr_id in resolved, (
                f"{where}, and the index resolves no link for it. "
                "joins.adr_to_pull_request is where a decision's own reach is recorded, "
                "and a decision missing from it is unresolved."
            )

    assert checked > 0, (
        "no sparse design names a decision, so this case asserted nothing. The claim is "
        "about the decisions these designs name, and the corpus currently names none."
    )


# ---- 3. every sparse design is a work item with a stage ----


def test_every_sparse_design_is_a_work_item_with_a_stage():
    """Every sparse design appears in the index as a work item, with its authored stage.

    THE CLAIM. Every design whose directory holds `goal.json` alone appears in that index
    as a work item with a stage. The stage is read from the authored goal, so the index
    is compared against the file and not against a list kept here. A work item missing
    from the index is a design no route reaches.
    """
    index = read_index()
    work_items = {entity["id"]: entity for entity in index["entities"]["design"]}
    designs = sparse_designs()

    assert designs, (
        "no design under docs/architecture/designs/ holds goal.json alone, so this "
        "claim has no subject."
    )

    for design_id, goal in designs:
        entity = work_items.get(design_id)
        assert entity is not None, (
            f"{design_id} holds goal.json alone and the index carries no work item for "
            f"it. The index holds {len(work_items)} work items, and none is this one."
        )
        assert entity.get("name"), f"the index's work item for {design_id} carries no name"

        stage = entity.get("stage")
        assert isinstance(stage, str) and stage.strip(), (
            f"the index's work item for {design_id} carries no stage, so the work cannot "
            "be read as planned, in design, or shipped."
        )
        authored = goal.get("stage")
        assert stage == authored, (
            f"the index says {design_id} is at stage {stage!r}, and the authored goal "
            f"says {authored!r}. The index is derived from the goal, so the two must agree."
        )


# ---- 4. the derived record agrees with the authored directory ----


def test_the_derived_record_agrees_with_the_authored_directory():
    """The derived designs.js entry agrees with the authored directory about a design.

    THE CLAIM. This repository holds at least one design whose directory carries
    `goal.json` alone, and the derived `.cobuilder-architect/self/data/designs.js` entry
    agrees with the authored directory about it: the derived goal is the authored goal,
    and the derived record carries nothing beside the goal. That second fact is what makes
    the design read as sparse, and it is the fact `SparseDesign.test.tsx` builds its
    fixture on.
    """
    assert DESIGNS_JS.is_file(), (
        f"{DESIGNS_JS.relative_to(REPO_ROOT).as_posix()} is absent, so the derived design "
        "records cannot be read. It is a committed bundle file."
    )
    text = DESIGNS_JS.read_text(encoding="utf-8")
    prefix = "window.DESIGNS"
    assert text.lstrip().startswith(prefix), (
        "plugins/artifact/viewer/index.html reads its design records from a "
        f"`{prefix} = ...;` assignment, and this file does not carry one."
    )
    derived = json.loads(text.split("=", 1)[1].strip().rstrip(";"))

    designs = sparse_designs()
    assert designs, (
        "no design under docs/architecture/designs/ holds goal.json alone. This claim "
        "rests on at least one sparse design, and the corpus currently holds none."
    )

    for design_id, goal in designs:
        assert design_id in derived, (
            f"{design_id} holds goal.json alone in the authored tree, and the derived "
            f"records hold no entry for it. The derived file holds {len(derived)} entries."
        )
        record = derived[design_id]

        assert record.get("goal") == goal, (
            f"the derived goal for {design_id} is not the authored goal. The derived "
            "record is a projection of docs/architecture/designs/<id>/goal.json."
        )
        assert set(record) == {"goal"}, (
            f"the derived record for {design_id} carries {sorted(record)} and not the "
            "goal alone. A sparse design's directory holds goal.json alone, so a record "
            "with more than the goal would claim records the design never authored."
        )
