"""The change's account of one work item, and the four rows it renders.

Cobuilder-viewer slice 15, epic `cobuilder-viewer/E7`. A work item and the pull
request its own epics carry are two accounts of one surface. The program's account
is the work's own records, and slices 6 to 13 render it. This slice adds the
change's account: four rows read from that pull request's own records.

The four rows are Intent, Problem & Solution, Architecture, and File Diffs. The
last name stands in the change's account alone. The first three also stand in
Build, and that repetition is what makes slice 17's jump across possible.

WHERE THESE CASES READ, AND WHY.

The change's account is component work. `epic-E7-design.md` puts its cases in the
viewer's own suite, `npm test` in `plugins/artifact/viewer/`. The run for this
slice uses the repository's suite instead, `uv run --with pytest pytest tests/ -v`,
and that suite renders no React component. So each case below reads the two things
this suite can read:

1. the sources the design fixes under `src/shell/change/`, as text; and
2. the built viewer at `plugins/artifact/viewer/index.html`, which since slice 3 is
   the file that ships.

A case that reads the sources holds the structures the design names. A case that
reads the built viewer holds that the shipped file carries them.

Every needle below is a name the design fixes: `CHANGE_LEVEL_KEY` and its four
pairs from `epic-E7-design.md`'s Types & Signatures, the row names from its Scope
and Intent section, and the asset reads from its Types & Signatures note on asset
paths. A case reads its needles with every run of space removed, so a reformat
alone never fails one.

Run with: uv run --with pytest pytest tests/test_change_account.py -v
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWER = REPO_ROOT / "plugins" / "artifact" / "viewer"
SHIPPED_VIEWER = VIEWER / "index.html"
SHELL = VIEWER / "src" / "shell"
CHANGE = SHELL / "change"

# The five modules `epic-E7-design.md` names under Files Touched. `model.ts` is the
# change's address, and slice 16 owns it, so this list does not require it here.
CHANGE_FILES = ("sections.tsx", "levels.ts", "Frame.tsx", "Diff.tsx", "Sheets.tsx")

# The change's four rows, in the order the row pages them.
CHANGE_KEYS = ("intent", "problem-and-solution", "architecture", "file-diffs")

# Each row, and the bundle's own narration level key behind it.
LEVEL_KEY_PAIRS = (
    ("intent", "intent"),
    ("problem-and-solution", "problem_solution"),
    ("architecture", "architecture"),
    ("file-diffs", "file_changes"),
)

# The six parts of parity `epic-E7-design.md` names, and a name each part cannot be
# rendered without. A part whose name is absent is a part the change's account
# cannot reach.
PARITY_PARTS = (
    ("the four narration levels", ("changeLevelsOf",)),
    ("the scene art", ("hero",)),
    ("the narration audio", (".wav",)),
    ("the drawings", ("diagram",)),
    ("the diff", ("diff",)),
    ("the change's intent record", ("entry.intent", "change.intent", "intent")),
    ("the change's assessment record", ("entry.assessment", "change.assessment", "assessment")),
)


def compact(text: str) -> str:
    """`text` with every run of space removed.

    Every needle here is read this way, so a reformat of the sources, a line break
    inside an object literal, or a quote-style change alone never fails a case. The
    words and the punctuation are what the case asserts.
    """
    return re.sub(r"\s+", "", text)


def read(path: Path, claim: str) -> str:
    """The text of `path`, or a failure that names the file the claim needs."""
    assert path.is_file(), (
        f"{claim}: {path.relative_to(REPO_ROOT).as_posix()} does not exist. "
        "The change's account reads its own records from this file."
    )
    return path.read_text(encoding="utf-8", errors="replace")


def quote_forms(fragment: str) -> tuple[str, ...]:
    """`fragment` as written with double quotes, and again with single quotes."""
    return (fragment, fragment.replace('"', "'"))


def assert_any(needles: tuple[str, ...], haystack: str, claim: str) -> None:
    """Fail unless one of `needles` is in `haystack`, and say which were tried.

    The comparison drops every run of space on both sides. `haystack` is compacted
    by the caller, once per case.
    """
    tried = [compact(needle) for needle in needles]
    for needle in tried:
        if needle in haystack:
            return
    assert False, (
        f"{claim}: none of {tried} appears in the sources this claim reads.\n"
        "  Every run of space is dropped before the search, so formatting is not "
        "the cause."
    )


def change_sources() -> dict[str, str]:
    """Every file under `src/shell/change/`, by name.

    The claim is stated by the caller, so a missing directory fails with that
    claim rather than with a bare file error. Slice 15 creates this directory.
    """
    assert CHANGE.is_dir(), (
        "the change's account has no home: "
        f"{CHANGE.relative_to(REPO_ROOT).as_posix()} does not exist. "
        "epic-E7-design.md names `src/shell/change/{sections.tsx,levels.ts,Frame.tsx,"
        "Diff.tsx,Sheets.tsx}` as the four rows, the levels, the frame, the diff, and "
        "the sheets of the change's own account."
    )
    return {
        path.name: path.read_text(encoding="utf-8", errors="replace")
        for path in sorted(CHANGE.rglob("*"))
        if path.is_file()
    }


def change_text() -> str:
    """Every change source in one text, for a claim that spans more than one file."""
    return "\n".join(change_sources().values())


# ------------------------------------------------------------- the module tree


def test_the_change_module_tree_exists():
    """The change's account lands at `src/shell/change/`, one module per job.

    `epic-E7-design.md` names the five files, and each one holds one thing: the
    four rows, the four levels, the level's frame, the diff view, and the two
    sheets. The account lands in the shipped shell, so a reader reaches it without
    a mode switch and without a second surface.
    """
    claim = "the change's account lands in the shipped shell at src/shell/change/"
    missing = [name for name in CHANGE_FILES if not (CHANGE / name).is_file()]
    assert not missing, (
        f"{claim}: {len(missing)} of {len(CHANGE_FILES)} modules are absent from "
        f"{CHANGE.relative_to(REPO_ROOT).as_posix()}: {missing}.\n"
        f"  The design names all five: {list(CHANGE_FILES)}."
    )


# ------------------------------------------------------------------ the rows


def test_the_change_declares_its_four_rows_in_reading_order():
    """The four rows are declared once, in the order the reader walks them.

    The order is Intent, Problem & Solution, Architecture, and File Diffs. The
    fourth name stands in this account alone, and the first three repeat in Build.
    """
    claim = "the change's four rows are declared in reading order"
    haystack = compact(change_text())
    union = '" | "'.join(CHANGE_KEYS)
    listed = '","'.join(CHANGE_KEYS)
    assert_any(
        quote_forms(f'"{union}"') + (f'["{listed}"]', f"['{listed}']"),
        haystack,
        claim,
    )


def test_each_row_names_the_bundle_level_behind_it():
    """Every row reads the bundle's own narration level key.

    The row's word and the bundle's key differ for two of the four rows, so one
    table holds the mapping: `CHANGE_LEVEL_KEY` in `epic-E7-design.md`'s Types &
    Signatures. The key under the word Intent is `intent`, because the rename of
    `landscape` to `intent` runs with this slice. See ADR-0029.
    """
    claim = "each of the change's four rows names the bundle level key behind it"
    haystack = compact(change_text())
    for row, key in LEVEL_KEY_PAIRS:
        needle = f'"{row}":"{key}"'
        assert_any(
            quote_forms(needle),
            haystack,
            f"{claim}: the row {row!r} does not map to the bundle key {key!r}",
        )


def test_a_row_reads_the_changes_own_pull_request():
    """Each row reads the pull request this work's own epics carry.

    The row's records belong to one pull request, so the level, the art, the audio,
    and the diff all read that entry's own number. The account reads the join the
    index holds and derives none of it, so the number reaches the rows as the entry
    the caller resolved.
    """
    claim = "the change's rows read the pull request's own number"
    haystack = compact(change_text())
    assert_any(
        ("entry.pr", "change.pr", "props.entry.pr"),
        haystack,
        claim,
    )


def test_a_row_states_an_absent_record_in_place():
    """A row whose record the bundle lacks states that absence where the row reads.

    Absence is a state, and not a gap. An open pull request carries fewer records
    than a merged one, and a level the bundle never voiced carries no audio file.
    The shipped shell states an absence with the `absent` prop on its own panel, and
    the change's rows use that same shape rather than an empty row.
    """
    claim = "a row whose record is absent states the absence in place"
    haystack = compact(change_text())
    assert_any(("absent", "missing"), haystack, claim)


def test_the_change_rows_are_one_element_per_panel():
    """The rows are a list, one element per panel.

    The shell's own paged level holds one panel per section, because the section
    strip reads its links from the panel headings and a section holding two panels
    would put two links on the strip and one step on the pager. So the change's rows
    return a list, and the shell hands that list to its own stage, strip, and pager.
    ADR-0028 fixed that shape.
    """
    claim = "the change's rows are one element per panel, as a list"
    haystack = compact(change_text())
    assert_any(("changeSections",), haystack, claim)
    assert_any(
        ("ReactNode[]", "React.ReactNode[]", "JSX.Element[]", "ReactElement[]", "ReactNode[];"),
        haystack,
        f"{claim}: no row builder returns a list of elements",
    )


def test_the_shell_renders_the_changes_rows():
    """The shipped shell reaches the change's rows.

    The change's account renders inside the shipped shell, so `App.tsx` reads the
    change's rows. A module under `src/shell/change/` that nothing renders is a
    surface a reader cannot reach.
    """
    claim = "the shipped shell renders the change's rows"
    app = compact(read(SHELL / "App.tsx", claim))
    assert_any(
        ("change/sections", "change/levels", "change/Sheets", "shell/change", "changeSections"),
        app,
        claim,
    )


# ------------------------------------------------------------------ parity

@pytest.mark.parametrize("part,needles", PARITY_PARTS, ids=[p for p, _ in PARITY_PARTS])
def test_the_change_reaches_each_part_of_parity(part, needles):
    """Every part the change's account carries is a part the rows can reach.

    `epic-E7-design.md` fixes the six parts of parity: the four narration levels,
    the drawings, the scene art, the narration audio, the diff, and the intent and
    assessment sheet. Each one lives in a module under `src/shell/change/`, and a
    part with no reader is a part the account only promises.
    """
    claim = f"the change's account reaches {part}"
    assert_any(
        tuple(quote_forms(n)[0] for n in needles) + tuple(quote_forms(n)[1] for n in needles),
        compact(change_text()),
        claim,
    )


# --------------------------------------------------------- the shipped viewer


def test_the_shipped_viewer_carries_the_change_account():
    """The built viewer carries the change's four rows.

    Since slice 3, `plugins/artifact/viewer/index.html` is the build's own output
    and the file that ships. The change's account is part of the shipped surface
    only when this file carries it. `File Diffs` and the keys under it stand in no
    other surface, so their absence is the change's account missing.
    """
    claim = "the shipped viewer carries the change's four rows"
    assert SHIPPED_VIEWER.is_file(), (
        f"{claim}: {SHIPPED_VIEWER.relative_to(REPO_ROOT).as_posix()} does not exist"
    )
    text = SHIPPED_VIEWER.read_text(encoding="utf-8", errors="replace")
    for needle in ('"file-diffs"', "File Diffs", "file_changes"):
        assert needle in text, (
            f"{claim}: the built viewer carries no {needle!r}.\n"
            "  The change's fourth row is File Diffs, and the bundle's key behind it "
            "is `file_changes`. Neither name stands in the program's account, so "
            "this file has no change's account until the build carries both."
        )
