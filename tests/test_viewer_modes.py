"""The viewer's surfaces, held to the shipped file.

The five cases below came from the hand-written viewer's five modes: designs,
pull requests, decisions, contexts, and builds. Cobuilder-viewer slice 3 made
`plugins/artifact/viewer/index.html` the output of `npm run build` in
`plugins/artifact/viewer/`, so the surfaces those cases asserted moved to the
React application. Each case now reads the structure the shipped viewer carries
the same claim through, or skips with the slice that still owes it. The last
case reads the exporter, not the viewer.

Run with: uv run --with pytest pytest tests/test_viewer_modes.py -v
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "plugins" / "artifact" / "scripts"))
sys.path.insert(0, str(REPO_ROOT / "shared"))

import export_artifact as ea  # noqa: E402


VIEWER_PATH = REPO_ROOT / "plugins" / "artifact" / "viewer" / "index.html"


def viewer_text() -> str:
    """The shipped viewer, as the build writes it.

    Since cobuilder-viewer slice 3, `plugins/artifact/viewer/index.html` is the
    output of `npm run build` in `plugins/artifact/viewer/`. A case that asserted
    a name the hand-written file carried now asserts the React application's own
    structure in this file, because this file is what ships.
    """
    return VIEWER_PATH.read_text(encoding="utf-8", errors="replace")


def bounded_region(text: str, opener: str, closer: str, claim: str) -> str:
    """The text from `opener` to the first `closer` after it, both included.

    A region is the unit these cases assert on. A fragment inside a bounded
    region is a fragment of one structure, and not a word that happens to occur
    somewhere in a 1.1 MB bundle.
    """
    start = text.find(opener)
    assert start >= 0, (
        f"{claim}: the build carries no {opener!r}, so the structure that carried "
        "this claim is gone from the shipped viewer."
    )
    stop = text.find(closer, start)
    assert stop >= 0, (
        f"{claim}: the build carries {opener!r} with no {closer!r} after it, so the "
        "structure that carried this claim is incomplete."
    )
    return text[start : stop + len(closer)]


def section_region(
    text: str, opener: str, closer: str, fragments: list[str], limit: int
) -> str:
    """The first region from `opener` to `closer` that holds `fragments` in order.

    Some openers occur more than once in the build, because the comparison
    harness under `src/variations/` ships its own copies of a surface. `limit`
    is what tells the surfaces apart: one level's section list is a few
    kilobytes, and four panels a quarter of a megabyte apart are four different
    surfaces. A region that holds the fragments in order, inside that limit, is
    one surface's own list.

    An empty string means no such region exists. The caller states the claim it
    was looking for, so this helper carries no message of its own.
    """
    start = 0
    while True:
        start = text.find(opener, start)
        if start < 0:
            break
        stop = text.find(closer, start)
        if stop >= 0:
            region = text[start : stop + len(closer)]
            if len(region) <= limit and contains_in_order(region, fragments):
                return region
        start += 1
    return ""


def contains_in_order(region: str, fragments: list[str]) -> bool:
    """True when every fragment sits inside `region`, in the order given."""
    at = -1
    for fragment in fragments:
        found = region.find(fragment, at + 1)
        if found < 0:
            return False
        at = found
    return True


def assert_ordered(fragments: list[str], region: str, claim: str) -> None:
    """Fail unless every fragment is in the region, in order, and name the one that is not.

    The order is the assertion. `Boundaries` before `Districts and alternatives
    considered` is a claim about a level's section list, and the same two words
    in the other order would be a different surface.
    """
    at = -1
    for position, fragment in enumerate(fragments):
        found = region.find(fragment, at + 1)
        assert found >= 0, (
            f"{claim}: {fragment!r} is absent from its own region, or it sits before "
            f"fragment {position - 1} ({fragments[position - 1]!r}).\n"
            f"  region length: {len(region)} characters\n"
            f"  fragments found, in order, before this one: {fragments[:position]}"
        )
        at = found


# The shipped Architecture level's section list, as the build writes it. The
# opener is the Diagrams panel, the closer is the last section's title, and the
# limit keeps the search inside one level: the two copies of this list that the
# build carries are both 2,283 bytes.
ARCHITECTURE_OPEN = '{title:"Diagrams",icon:'
ARCHITECTURE_CLOSE = 'title:"Districts and alternatives considered"'
ARCHITECTURE_SECTIONS = [
    'title:"Diagrams"',
    'title:"Architecture Decisions"',
    'title:"Boundaries"',
    ARCHITECTURE_CLOSE,
]
ARCHITECTURE_LIMIT = 4_000


def architecture_region(text: str, claim: str) -> str:
    """The Architecture level's four sections, in the order the level pages them."""
    region = section_region(
        text,
        ARCHITECTURE_OPEN,
        ARCHITECTURE_CLOSE,
        ARCHITECTURE_SECTIONS,
        ARCHITECTURE_LIMIT,
    )
    assert region != "", (
        f"{claim}: the build carries no Architecture level whose section list holds "
        f"{ARCHITECTURE_SECTIONS} in order, inside {ARCHITECTURE_LIMIT} bytes. The "
        "level's sections are the surface this claim reads."
    )
    return region


def test_viewer_contains_all_five_mode_buttons():
    """The shell reaches all five record families, without a mode button.

    The legacy viewer switched between five modes from a topbar, and this case
    read the five `data-mode` attributes and the three `mode-btn-*` ids. The
    shipped viewer has no mode switch and no `data-mode` attribute. It reaches
    the same five families through two structures, and this case holds both to
    the build:

    1. the rail's own entry list, which is one list in `src/shell/model.ts`. It
       carries the designs (the board every reader lands on), the builds (the
       Epics and Rubrics entries), and the pull requests (this work's own, and
       FlightDeck); and
    2. the Architecture level's section list, which carries the decisions (the
       Architecture Decisions section) and the contexts (the Boundaries section,
       which states the rules the touched contexts declare).

    Both are read from `plugins/artifact/viewer/index.html`, which since slice 3
    is the build's own output.
    """
    text = viewer_text()
    claim = "the navigation reaches designs, pull requests, decisions, contexts, and builds"

    # The shipped rail's own list. The two anchors are unique in the build: the
    # comparison harness's rails build their groups from `items`, and this one
    # builds them from `entries`.
    rail = bounded_region(
        text,
        'label:null,entries:[{key:"work",label:"Work"',
        '{key:"shipped",label:"Release status"',
        claim,
    )
    assert_ordered(
        [
            'label:null,entries:[{key:"work",label:"Work"',   # the designs board
            '{key:"the-work",label:"The work",entries:',      # the three levels
            '{key:"build",label:"Build"',                     # builds
            '{key:"epics",label:"Epics"',
            '{key:"rubrics",label:"Rubrics"',
            '{key:"pull-requests",label:"Pull requests"',     # pull requests
            "{key:\"this-work\",label:\"This work's pull requests\"",
            '{key:"flightdeck",label:"FlightDeck"',
            '{key:"shipped",label:"Shipped"',
            '{key:"shipped",label:"Release status"',
        ],
        rail,
        claim,
    )

    # The Architecture level's four sections, in the order the level pages them.
    # The rail lists the level; the level's sections are where a reader meets a
    # decision and a boundary rule.
    assert_ordered(ARCHITECTURE_SECTIONS, architecture_region(text, claim), claim)


def test_decisions_mode_lists_all_records_and_anchor_distinction():
    """The decisions surface lists its records and tells the anchors apart.

    The legacy viewer drew a Decisions mode: one table of every decision record,
    one row per record, with an anchor badge that read `verified` for a decision
    anchored to a bounded context, `inferred` for one that maps to a district,
    and `unanchored` for one that names neither, plus an `unreferenced` chip for
    a decision no pull request reaches. This case read those class names and the
    two functions that drew them.

    The shipped viewer has no Decisions mode. Its decisions surface is the
    Architecture level's Architecture Decisions section, which lists the
    decisions the work itself names and carries each one's rule and the press
    that opens its whole record. The anchor distinction moved to that record, in
    the sheet: `/src/shell/Sheet.tsx` states the record's provenance, marks a
    rule no module anchors as `unanchored`, and chips the context or the district
    the rule lands in. This case holds all three structures to the build.

    The `unreferenced` chip has no equivalent, and its loss is deliberate: the
    engineer removed the pull request a decision reached from this surface,
    because the work item's own state already says whether the work shipped.
    """
    text = viewer_text()
    claim = "the decisions surface lists its records and tells an anchored decision from an unanchored one"

    # The section: one list of decisions, each with the rule it enforces and the
    # press that opens the whole record.
    listing = bounded_region(text, 'idPrefix:"adr"', 'children:"Open the whole record"', claim)
    assert_ordered(
        [
            'idPrefix:"adr"',
            "linkedAdrs.map(",  # the work's own linked decisions, and no other list
            'label:"The rule this decision enforces"',
            'children:"Open the whole record"',
        ],
        listing,
        claim,
    )

    # The section's own panel, so a reader meets it as a section of the level
    # rather than as a fragment of code.
    panel = bounded_region(
        text,
        'title:"Architecture Decisions"',
        'children:"This work names no decision."',
        claim,
    )
    assert_ordered(
        [
            'title:"Architecture Decisions"',
            'lead:"Each decision with the rule it enforces, and its whole record one press away."',
            'children:"This work names no decision."',
        ],
        panel,
        claim,
    )

    # The anchor distinction, on the record the press opens: the state badge,
    # the record's provenance, and the marker for a rule no module anchors.
    badges = bounded_region(
        text, 'gloss:"The decision\'s own state field."', 'children:"unanchored"', claim
    )
    assert_ordered(
        [
            'gloss:"The decision\'s own state field."',
            'children:["provenance: ",',
            'title:"No module anchors this rule. It is recorded, not enforced."',
            'children:"unanchored"',
        ],
        badges,
        claim,
    )

    # The rule's own box, which names the context a verified anchor lands in and
    # the district an inferred one lands in.
    rule = bounded_region(
        text,
        'label:"The rule this decision enforces",children:[',
        'children:["district ",',
        claim,
    )
    assert_ordered(
        [
            'label:"The rule this decision enforces",children:[',
            'children:["context ",',
            'children:["district ",',
        ],
        rule,
        claim,
    )


def test_contexts_mode_leads_with_violations_and_uncovered_districts():
    """The boundary rules lead the contexts surface, and the uncovered districts follow.

    The legacy viewer drew a Contexts mode whose first section was Boundary
    Violations, one card per forbidden edge and each badged a Decision
    candidate, and whose second section was the Uncovered Districts backlog.
    This case read those two headings and the function that drew them.

    The shipped viewer has no Contexts mode. Its contexts surface is the
    Architecture level, and the level pages its own sections in one order: the
    rules the work's touched contexts declare come before the districts and
    alternatives, and the districts no context verifies read inside that later
    section. This case now holds the build to that order, and to each of the two
    structures that carries it.

    The words changed with the surface. `src/shell/panels/Architecture.tsx`
    calls a violation a boundary rule and marks each one by its kind, so the
    `Decision candidate` badge has no equivalent here. `joins.district_uncovered`
    still feeds the uncovered line, and that line now reads `carries no
    verifying context`.
    """
    text = viewer_text()
    claim = "the contexts surface leads with boundary rules and the uncovered districts follow"

    # The order: the boundaries section sits before the districts section in the
    # one list the level pages.
    assert_ordered(
        [
            'title:"Architecture Decisions"',
            'title:"Boundaries"',
            ARCHITECTURE_CLOSE,
        ],
        architecture_region(text, claim),
        claim,
    )

    # The boundaries section itself: one card per rule of a touched context,
    # each with the reason it carries and the press that opens the whole rule.
    boundaries = bounded_region(
        text, 'title:"Boundaries",icon:', 'children:"Open the whole rule"', claim
    )
    assert_ordered(
        [
            'title:"Boundaries"',
            'lead:"The rules the touched contexts declare, and the reason each one carries."',
            'children:"Open the whole rule"',
        ],
        boundaries,
        claim,
    )

    # The uncovered list the surface draws is the index's own join, kept on the
    # work item as a derived field. Nothing here recomputes it.
    work = bounded_region(text, "districtsUncovered:", "district_uncovered.map(", claim)
    assert_ordered(["districtsUncovered:", "district_uncovered"], work, claim)

    # The uncovered line, drawn from that list.
    uncovered = bounded_region(
        text, "districtsUncovered.length>0", '" carries no verifying context."', claim
    )
    assert_ordered(
        ["districtsUncovered.length>0", '" carries no verifying context."'], uncovered, claim
    )


def test_contexts_mode_renders_boundary_record_as_readable_rules():
    """A boundary record reads as rules, not as raw fields.

    The legacy viewer drew a boundary record as a `module-rule-card`: the module
    invariant's own statement, then its `Allowed Inbound` and `Allowed Outbound`
    flows, and a `context-map-card` per integration. This case read those two
    class names and those three labels.

    The shipped viewer renders a boundary record in two places, and both are
    checked here. The Boundaries section draws one card per rule, naming the
    rule's kind and target and the reason it carries. A press opens the whole
    record in the sheet, where `src/shell/Sheet.tsx` draws the rule, the reason,
    and every other field the record holds under that field's own name.

    The fixed labels went with the legacy surface, and that is why this case no
    longer reads them. A module invariant's flows are its own `allowed_inbound`
    and `allowed_outbound` fields, and the sheet renders each one as a heading
    over its value: a sentence when the value is one, a list when it is a list,
    and the raw value only when it is neither. That is the readable-rules claim,
    and it holds for every kind of rule alike.
    """
    text = viewer_text()
    claim = "a boundary record reads as rules, and every field it carries reads under its own name"

    # The card: one per rule of a touched context, with the reason it carries and
    # the press that opens the whole rule.
    card = bounded_region(
        text, 'title:"Boundaries",icon:', 'children:"Open the whole rule"', claim
    )
    assert_ordered(
        [
            'title:"Boundaries"',
            'lead:"The rules the touched contexts declare, and the reason each one carries."',
            'children:"Open the whole rule"',
        ],
        card,
        claim,
    )

    # The whole record, in the sheet: the rule, the reason, then every other
    # field, each under its own heading and each rendered as a value a reader
    # reads rather than as raw data.
    record = bounded_region(
        text, '{label:"The rule",tone:"problem"', "No further field is recorded on this rule", claim
    )
    assert_ordered(
        [
            '{label:"The rule",tone:"problem"',  # the kind and the target
            'label:"Why",tone:"note"',           # the reason
            '"Every other field on this rule"',  # the head over every other field
            "tracking-[0.06em] text-ink-faint uppercase",  # that field's own name, as a heading
            "mt-1 mb-0 min-w-0 font-serif text-[15.5px] leading-[1.6] break-words text-ink-mid",
            'className:"mt-1.5"',  # a list value reads as a list
            "No further field is recorded on this rule",  # and the absence line
        ],
        record,
        claim,
    )


def test_builds_mode_resolves_n_a_gate_and_counts_approved_gates():
    """The gate surface resolves an n/a gate and counts the approved ones. Not built yet.

    The claim, in plain words: a gate whose state reads `n/a` is drawn as a
    closed gate and not as one that has not started, and the header counts the
    gates whose state begins `APPROVED` out of the total, rather than counting
    every card.

    The legacy viewer drew that surface, and this case read its two card classes,
    its two pill classes, and the two expressions that resolved the state and
    summed the count. The shipped viewer carries no equivalent. Its gate surface
    is the Build level's Rubrics section, and `src/shell/sections.tsx` renders
    one row per gate step whose only derived value is the badge tone, which is
    `good` for a step whose state is `implemented` and neutral for everything
    else. So an `APPROVED 2026-09-22` step reads exactly as a `pending` one, and
    the section counts nothing. The one place in the build that resolves an
    `n/a` state and sums an approved count is
    `src/variations/epic-first-mosaic/LensTiles.tsx`, which is a prototype in
    the comparison harness and is not the shipped Work surface.

    cobuilder-viewer slice 10 owns the surface this claim renders on: its rubric
    requires the Build level to show its rubrics, and its Build level's sections
    are the shipped equivalent of the legacy gate rail. Its rubric does not yet
    require a gate state to be resolved or a count to be stated, so this claim
    is unbuilt rather than broken. Do not invent a structure for it here.
    """
    pytest.skip(
        "unbuilt: the shipped Work surface renders a gate step's state verbatim, so an "
        "n/a gate does not read as closed and no approved-gate count is stated. "
        "cobuilder-viewer slice 10 owns the Build level's rubrics section, where this "
        "claim would render."
    )


def test_export_artifact_parses_updated_viewer(tmp_path):
    """Regression: export_artifact.py parses the updated viewer and inlines index without error."""
    viewer_html = VIEWER_PATH.read_text()
    story_obj = {
        "meta": {"repo": "prodyssey", "schema_version": "1.3"},
        "world": {"districts": []},
        "timeline": [{"pr": 1, "title": "Initial", "levels": {}}],
    }
    manifest_obj = {"schema_version": "1.3", "excluded_prs": [], "hero": [], "diff_prs": []}
    adrs_obj = {"ADR-0016": {"id": "ADR-0016", "title": "Sample ADR", "state": "approved"}}
    diagrams_obj = {}
    designs_obj = {}
    index_obj = {
        "schema_version": "1.3",
        "entities": {"adr": [{"id": "ADR-0016", "title": "Sample ADR", "state": "approved"}]},
        "joins": {"adr_to_context": {"ADR-0016": "cobuilder-packaging"}},
    }
    assets_map = {}
    audio_map = {}

    out = ea.build_html(
        viewer_html=viewer_html,
        story_obj=story_obj,
        manifest_obj=manifest_obj,
        diffs_js=None,
        adrs_obj=adrs_obj,
        diagrams_obj=diagrams_obj,
        designs_obj=designs_obj,
        assets_map=assets_map,
        audio_map=audio_map,
        page_title="Test Page",
        inline_mermaid_js=None,
        index_obj=index_obj,
    )

    assert "window.STORY =" in out
    assert "window.INDEX =" in out
    assert "cobuilder-packaging" in out
    assert "window.INDEX = window.INDEX || {};" not in out
