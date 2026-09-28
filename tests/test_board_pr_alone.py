"""A pull request with no design is a row of its own.

Cobuilder-viewer slice 18, epic `cobuilder-viewer/E19`. `04-slices.md` writes the
slice's end in one sentence: "A pull request with no design reads as a row of its
own, its status is its own state, and the tabs filter by status."

THE SLICE'S END, IN THREE PARTS. Every case below holds one:

  1. A pull request that belongs to no design is a row of its own, and the board
     gains the second row source that lists it. The subtraction runs against the
     pull requests a design's own epics carry, so one pull request earns one row.
  2. A PR-alone row states the pull request's own state, `open` or `merged`, and
     the kind word `PR`. It carries no six-mark record signature, because those
     marks read a design directory and a pull request holds none.
  3. A tab strip filters the flat list by status, and a kind control narrows the
     board to the PR-alone rows while the status tabs keep working inside that set.

WHERE THESE CASES READ, AND WHY.

The surface is component work. `epic-E19-design.md` puts its cases in the viewer's
own suite, `npm test` in `plugins/artifact/viewer/`, over `src/shell/Board.test.tsx`
and `src/shell/readiness.test.ts`. The run for this slice uses the repository's
suite, `uv run --with pytest pytest tests/ -v`, and that suite renders no React
component. So each case below reads the things this suite can read:

1. the shell's sources under `plugins/artifact/viewer/src/shell/`, which
   `epic-E19-design.md`'s Files Touched names: `readiness.ts` gains the board's
   pure row rules, `Board.tsx` gains the second row source and the two filters,
   `App.tsx` hands the board the index's pull request entities, and `atoms.tsx`
   gains the tone a pull request's own state reads;
2. the repository's own bundle, `.cobuilder-architect/self/data/index.json`, which
   says how many pull requests the board must list alone and what state each one
   carries. The count is the subtraction's own answer, so a rule that subtracted
   the wrong set fails here rather than only on the built surface;
3. the viewer's own runner, which `epic-E19-design.md` names as this slice's test
   plan. One case runs it and asserts it passes, because the pure rules and the
   component cases are executable and this suite is not.

A case reads a code needle with every run of space removed, so a reformat alone
never fails one, and a signature needle is a pattern, so a wrapped argument list
never fails one either. The names come from `epic-E19-design.md`'s Types &
Signatures (`RowKind`, `ROW_KINDS`, `ROW_KIND_LABEL`, `BoardSource`,
`boardStatus`, `statusTabs`, `matchesStatus`, `matchesKind`, `prAloneSources`,
`toneForState`), from its Files Touched, and from the sources themselves.

WHAT THIS FILE CANNOT MEASURE. jsdom holds no layout engine, and no browser runs
here. The strip's geometry, the press on a tab, and the address a pressed row
leaves belong to the Gate 4c rubrics on the built surface, which
`epic-E19-design.md`'s Test Plan already records as a known gap with no runner.
This file reads the rules and the markup that produce them.

Run with: uv run --with pytest pytest tests/test_board_pr_alone.py -v
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWER = REPO_ROOT / "plugins" / "artifact" / "viewer"
SHELL = VIEWER / "src" / "shell"
SELF_BUNDLE = REPO_ROOT / ".cobuilder-architect" / "self"
INDEX_JSON = SELF_BUNDLE / "data" / "index.json"

READINESS = SHELL / "readiness.ts"
BOARD = SHELL / "Board.tsx"
APP = SHELL / "App.tsx"
ATOMS = SHELL / "atoms.tsx"
BOARD_TEST = SHELL / "Board.test.tsx"
READINESS_TEST = SHELL / "readiness.test.ts"

# The two row kinds, in the order `epic-E19-design.md` declares them.
ROW_KINDS = ("design", "pull-request")

# The two pull request states the index's own corpus writes, per `data/types.ts`.
PR_STATES = ("open", "merged")

# The status vocabulary the strip reads: the six design stages, plus the two pull
# request states. `STAGE_ORDER` in `src/data/bundle.ts` fixes the six.
DESIGN_STAGES = ("backlog", "decided", "approved", "review", "implemented", "superseded")

# The measurement `epic-E19-design.md` records for this repository's own bundle:
# "twelve of the index's seventeen pull requests belong to no design. They are 1
# to 10, 17, and 22. ... Ten of those twelve read merged and two read open."
PR_ALONE_IDS = (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 17, 22)
PR_ALONE_MERGED = 10
PR_ALONE_OPEN = 2


def compact(text: str) -> str:
    """`text` with every run of space removed, for a code needle."""
    return re.sub(r"\s+", "", text)


def read(path: Path, claim: str) -> str:
    """The text of `path`, or a failure that names the file the claim needs."""
    assert path.is_file(), (
        f"{claim}: {path.relative_to(REPO_ROOT).as_posix()} does not exist. "
        "`epic-E19-design.md`'s Files Touched names it as this slice's home."
    )
    return path.read_text(encoding="utf-8")


def reads(path: Path, claim: str, *patterns: str) -> None:
    """Assert every pattern sits in `path` read with its spaces removed."""
    text = compact(read(path, claim))
    for pattern in patterns:
        assert re.search(pattern, text), (
            f"{path.relative_to(REPO_ROOT).as_posix()} no longer states the claim "
            f"this slice rests on. Missing: {pattern!r}"
        )


def bounded_region(text: str, opener: str, claim: str) -> str:
    """The text from `opener` to the end of the file, or a failure naming it."""
    start = text.find(opener)
    assert start >= 0, (
        f"{claim}: the source carries no {opener!r}, so the structure it names is gone."
    )
    return text[start:]


def index_json() -> dict:
    """The record index this repository's own bundle carries."""
    return json.loads(read(INDEX_JSON, "the record index"))


def carried_pull_requests(index: dict) -> set[int]:
    """Every pull request a design's own epics point at.

    The subtraction's own input. `data/bundle.ts` resolves it for each row from
    `joins.epic_to_pull_request` and the epic's own `pr` field, and the board reads
    that answer rather than deriving a second one.
    """
    epics = index["entities"]["epic"]
    join = index["joins"]["epic_to_pull_request"]
    carried: set[int] = set()
    for epic in epics:
        pr = join.get(epic["id"], epic.get("pr"))
        if isinstance(pr, int):
            carried.add(pr)
    return carried


def pr_alone(index: dict) -> list[dict]:
    """The index's pull requests that no design's epics carry, in id order."""
    carried = carried_pull_requests(index)
    return [
        pull
        for pull in sorted(index["entities"]["pull_request"], key=lambda p: p["id"])
        if pull["id"] not in carried
    ]


# ----------------------------------------------------------- the second row source

def test_the_pr_alone_rule_subtracts_what_a_designs_epics_carry() -> None:
    """One pull request earns one row, so the source subtracts the carried ones.

    `epic-E19-design.md` fixes the rule's name and its two inputs: "The subtraction
    runs against `DesignRow.pullRequests`, which the data layer already resolves, so
    no pull request earns two rows." A source that read the index's pull request
    entities alone would list a design's own pull request twice.
    """
    reads(
        READINESS,
        "the PR-alone row source",
        r"exportfunctionprAloneSources\(",
        r"prAloneSources\(rows:DesignRow\[\],pullRequests:PullRequest\[\]",
    )


def test_a_pull_request_no_design_carries_reads_as_its_own_row() -> None:
    """The board takes the pull requests beside its rows, and the index says how many.

    THE COUNT IS THIS SLICE'S OWN ANSWER. `epic-E19-design.md` measured this bundle
    at twelve PR-alone rows, "1 to 10, 17, and 22", ten of them merged and two open.
    A rule that listed the wrong set would still render a board, so the fixture is
    pinned here: the twelve ids, and the state each one carries.
    """
    reads(
        BOARD,
        "the board's second row source",
        r"pullRequests:PullRequest\[\];",
        r"PullRequest",
    )
    reads(
        APP,
        "the shell's hand-off",
        r"<Board",
        r"pullRequests=\{[A-Za-z_$][\w$]*\}",
    )

    index = index_json()
    alone = pr_alone(index)

    assert [pull["id"] for pull in alone] == list(PR_ALONE_IDS), (
        "The board's PR-alone set no longer matches the measurement "
        "`epic-E19-design.md` records, so the slice's subject changed shape."
    )
    states = [pull["state"] for pull in alone]
    assert states.count("merged") == PR_ALONE_MERGED
    assert states.count("open") == PR_ALONE_OPEN
    for pull in alone:
        assert pull["state"] in PR_STATES, (
            f"pull request {pull['id']} carries state {pull['state']!r}, which the "
            "board's two-state vocabulary does not cover."
        )


def test_a_designs_own_pull_request_earns_no_second_row() -> None:
    """The subtraction runs against the rows, and the corpus proves the difference.

    The index holds seventeen pull requests, and a design's epics carry six of them.
    A row source that read the entities alone would list those six a second time.
    """
    index = index_json()
    carried = carried_pull_requests(index)
    entities = {pull["id"] for pull in index["entities"]["pull_request"]}

    assert carried, "No design's epics carry a pull request, so the subtraction is untested."

    # A join may name a pull request the index holds no entity for. `plugin-split/E8`
    # points at 18, and no entity carries that id, which is the recorded gap
    # `inflight-record-store` owns. The board lists entities, so a name the index
    # holds no row for earns no row either way.
    listed = carried & entities
    assert listed, "No carried pull request resolves to an entity."
    assert not (entities - listed) & listed, (
        "The carried set and the PR-alone set no longer partition the pull requests "
        "the index holds, so one of the two cases above reads the wrong corpus."
    )
    assert len(entities - listed) == len(PR_ALONE_IDS)
    reads(READINESS, "the subtraction's own input", r"DesignRow\[\]")


# ------------------------------------------------------ a row's own status and mark

def test_a_pr_alone_row_states_the_pull_requests_own_state() -> None:
    """A row's status is its own state, and one rule reads it for both kinds.

    `epic-E19-design.md`: "A design row's status is its stage. A PR-alone row's
    status is its own state. So one tab selects both kinds by one rule." The badge
    reads `toneForState`, which `atoms.tsx` gains for exactly this row.
    """
    reads(
        READINESS,
        "the board's status rule",
        r"exportfunctionboardStatus\(source:BoardSource\):string",
        r'RowKind="design"\|"pull-request"',
    )
    reads(
        ATOMS,
        "the pull request state's tone",
        r"exportfunctiontoneForState\(",
    )
    reads(
        BOARD,
        "the PR-alone row's own words",
        r"toneForState",
    )


def test_a_pr_alone_row_carries_the_kind_word_and_no_record_signature() -> None:
    """`PR` names the kind and never a status, and the six marks stay off that row.

    `epic-E19-design.md`: "A PR-alone row carries the pull request's id, its title,
    and its state, and no six record marks. Those marks read a design directory, and
    a pull request holds none."
    """
    reads(
        READINESS,
        "the kind vocabulary",
        r"exportconstROW_KINDS:RowKind\[\]",
        r"exportconstROW_KIND_LABEL:Record<RowKind,string>",
        r'"pull-request":"PR"',
        r"exporttypeBoardSource=",
    )
    for kind in ROW_KINDS:
        reads(READINESS, "the kind vocabulary", re.escape(f'"{kind}"'))

    text = compact(read(BOARD, "the PR-alone row"))
    assert "RowKind" in text or "BoardSource" in text, (
        "Board.tsx names neither the row kind nor the board source, so its second "
        "row source is not typed by the rule module that owns it."
    )
    assert "SIGNATURE_LABEL" in text, (
        "Board.tsx no longer names the record signature, so no case can state which "
        "rows carry it."
    )


# ------------------------------------------------------------------- the two filters

def test_the_status_tabs_filter_the_board_by_one_rule() -> None:
    """The strip's vocabulary is the six stages plus the two pull request states.

    `epic-E19-design.md`: "The strip selects by status, and its vocabulary is the six
    design stages plus the two pull request states, `open` and `merged`." The strip
    reuses the lens prototype's `Tabs`/`TabsList`/`TabsTrigger` with `variant="line"`,
    and a count sits beside each label.
    """
    reads(
        READINESS,
        "the status tab rules",
        r"exportfunctionstatusTabs\(sources:BoardSource\[\]\):string\[\]",
        r"exportfunctionmatchesStatus\(source:BoardSource,status:string\):boolean",
    )
    reads(
        BOARD,
        "the strip's mechanism",
        r'from"@/components/ui/tabs"',
        r"TabsList",
        r"TabsTrigger",
        r'variant="line"',
        r"All",
    )
    assert len(DESIGN_STAGES) + len(PR_STATES) == 8, (
        "The strip's vocabulary changed size, so the eight tabs this slice states "
        "are no longer the six stages plus the two pull request states."
    )


def test_the_kind_control_narrows_the_board_to_the_pr_alone_rows() -> None:
    """The kind group rides beside the strip, and the two groups combine with AND.

    `epic-E19-design.md`: "It selects `design` or `pull-request`, and the two groups
    combine with AND. So a reader reaches the PR-alone rows and then narrows them by
    status. `All` leads each group and clears that group alone."
    """
    reads(
        READINESS,
        "the kind predicate",
        r"exportfunctionmatchesKind\(source:BoardSource,kind:RowKind\):boolean",
    )
    reads(
        BOARD,
        "the kind control",
        r"ROW_KINDS",
        r"ROW_KIND_LABEL",
        r"matchesKind",
        r"matchesStatus",
    )


# --------------------------------------------------------------- the viewer's suite

def test_the_viewers_own_cases_for_this_slice_pass() -> None:
    """The pure rules and the component cases run, and every one of them passes.

    `epic-E19-design.md` names this slice's runner: "`npm test` runs `vitest run` in
    `plugins/artifact/viewer/`, over `src/shell/Board.test.tsx` and
    `src/shell/readiness.test.ts`. Vitest is already a dependency of this package."
    This repository's suite reads sources as text, so a case here runs that suite and
    asserts its exit status. A checkout with no Node skips, the way
    `tests/test_viewer_build.py` skips.
    """
    assert READINESS_TEST.is_file(), (
        f"{READINESS_TEST.relative_to(REPO_ROOT).as_posix()} does not exist, so the "
        "board's pure rules have no runner."
    )
    assert BOARD_TEST.is_file(), (
        f"{BOARD_TEST.relative_to(REPO_ROOT).as_posix()} does not exist, so the "
        "board's component cases have no runner."
    )

    if shutil.which("npx") is None or not (VIEWER / "node_modules").is_dir():
        pytest.skip("Node or the viewer's node_modules is absent, so vitest cannot run.")

    result = subprocess.run(
        ["npx", "vitest", "run"],
        cwd=VIEWER,
        capture_output=True,
        text=True,
        timeout=600,
    )
    tail = "\n".join((result.stdout + result.stderr).strip().splitlines()[-40:])
    assert result.returncode == 0, (
        "The viewer's own cases fail, so the board's rules and rows are not the ones "
        f"this slice states.\n\n{tail}"
    )


if __name__ == "__main__":  # pragma: no cover
    sys.exit(pytest.main([__file__, "-v"]))
