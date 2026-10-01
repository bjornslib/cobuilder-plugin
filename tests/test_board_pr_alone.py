"""A pull request with no design is a row of its own — the rule, and the corpus.

Cobuilder-viewer slice 18, epic `cobuilder-viewer/E19`. This file once held
eight cases. Six of them read the board's component surface
(`src/shell/Board.tsx` and `Board.test.tsx`), which ADR-0034's work drawer
superseded before it ever shipped; those cases were removed in 2026-10-01, on
the engineer's word, because their subject does not exist. The two cases that
remain pin the slice's pure rule and its corpus measurement, and both read
live code: `readiness.ts` still exports `prAloneSources`, and the record
index still says what belongs to no design.

The rest of the rule surface — `boardStatus`, `statusTabs`, `matchesKind`,
`ROW_KINDS` — also lives in `readiness.ts` and is held by the drawer's own
vitest cases, not by this file.

Run with: uv run --with pytest pytest tests/test_board_pr_alone.py -v
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
READINESS = (
    REPO_ROOT / "plugins" / "artifact" / "viewer" / "src" / "shell" / "readiness.ts"
)
SELF_BUNDLE = REPO_ROOT / ".cobuilder-architect" / "self"
INDEX_JSON = SELF_BUNDLE / "data" / "index.json"

# The measurement `epic-E19-design.md` records for this repository's own bundle:
# "twelve of the index's seventeen pull requests belong to no design. They are 1
# to 10, 17, and 22."
PR_ALONE_IDS = (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 17, 22)


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
        "A pull request both carried by a design and listed alone would earn two rows."
    )
    assert len(entities - listed) == len(PR_ALONE_IDS)
    reads(READINESS, "the subtraction's own input", r"DesignRow\[\]")


if __name__ == "__main__":  # pragma: no cover
    sys.exit(pytest.main([__file__, "-v"]))