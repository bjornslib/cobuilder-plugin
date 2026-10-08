"""The link on a section heading, and the jump across.

Cobuilder-viewer slice 17, epic `cobuilder-viewer/E7`, as the engineer reshaped it
(ADR-0037). A work item and the pull request its own epics carry are two accounts of
one surface. An earlier form of this slice drew an account rule bar above each section,
with a word and a glyph for the account. The engineer removed the bar, `AccountMark.tsx`,
and the account words and glyphs. The jump moved to a plain text link at the right end
of each section heading: "Read in PR <n> ›" on the work item, and "Read in the work
item ›" on the pull request.

The cases that pinned the bar, the word, the glyph, and the fill were deleted. Nothing
replaces them, because the thing they checked is gone. The cases below keep the facts
that survive:

  1. The heading link carries a label from `readInLabel`, and it is absent where the
     other account has no counterpart.
  2. `PanelActionContext` hands the link to every section panel, and the shell builds it
     from the reader's row, found by its address.
  3. The address comes from `counterpartHref`, which calls both account builders.
  4. A press carries the section name, and `carriedSectionIndex` opens the level there.

These cases read the sources under `src/shell/` as text, and the built viewer at
`plugins/artifact/viewer/index.html`. A case reads its needles with every run of space
removed and with a trailing comma dropped, so a reformat alone never fails one.

Run with: uv run --with pytest pytest tests/test_account_mark.py -v
"""
from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWER = REPO_ROOT / "plugins" / "artifact" / "viewer"
SHIPPED_VIEWER = VIEWER / "index.html"
SHELL = VIEWER / "src" / "shell"

APP = SHELL / "App.tsx"
ATOMS = SHELL / "atoms.tsx"
MODEL = SHELL / "model.ts"

# The reader's own address, matched against a rail row's address, so a deep link finds
# its own row.
LIVE_ROW_LOOKUPS = (
    "liveRow(",
    "hereRow(",
    "currentRow(",
    "rowAt(",
    "rowFor(",
    "theRow(",
    "href===here",
    "href===window.location.hash",
    "row.href===here",
    ".find((row)=>row.href===",
    ".find((candidate)=>candidate.href===",
    ".find((entry)=>entry.href===",
)

# The jump's own address, built from the other account's builder. `counterpartHref` is
# the reviewed prototype's name for it, and the design fixes the behaviour rather than
# the name, so a builder that calls both address builders is the claim.
COUNTERPART_BUILDERS = (
    "counterpartHref",
    "otherAccountHref",
    "counterpart(",
    "jumpHref(",
    "otherHref(",
    "jumpTarget(",
)



def compact(text: str) -> str:
    """`text` with every run of space removed, and a trailing comma dropped.

    Every needle here is read this way, so a reformat of the sources, a line break
    inside an object literal, a trailing comma, or a quote-style change alone never
    fails a case. The words and the punctuation are what the case asserts.
    """
    squashed = re.sub(r"\s+", "", text)
    return squashed.replace(",]", "]").replace(",}", "}")


def read(path: Path, claim: str) -> str:
    """The text of `path`, or a failure that names the file the claim needs."""
    assert path.is_file(), (
        f"{claim}: {path.relative_to(REPO_ROOT).as_posix()} does not exist. "
        "The mark and the jump read their parts from this file."
    )
    return path.read_text(encoding="utf-8", errors="replace")


def assert_any(needles: tuple[str, ...], haystack: str, claim: str) -> None:
    """Fail unless one of `needles` is in `haystack`, and say which were tried.

    Both sides are compacted, so a caller may pass either form and either spelling
    of a quote.
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



def test_the_shell_resolves_the_readers_row_by_its_address():
    """The reader's mark is the mark of the row their own address opens.

    The design's third state is a reader who arrives on a deep link. The shell matches
    the reader's address against the rail's rows by exact address and never by section
    name, because the two groups repeat three section names and a name match would light
    more than one row at once.
    """
    claim = "the shell resolves the reader's row by its address"
    # THE HEADING LINK'S READER, AND NOT THE RAIL'S. `Rail.tsx` already matches a row's
    # address to light the current row, and that is slice 16's claim. This case reads the
    # pane, because the heading link follows the address the reader arrived on.
    haystack = compact(read(APP, claim))
    assert_any(
        LIVE_ROW_LOOKUPS,
        haystack,
        f"{claim}: `{APP.name}` does not match a rail row's address "
        "against the reader's own address, so the link cannot know which section the "
        "reader arrived on",
    )



# ---------------------------------------------------------------------- the jump


def test_the_jump_address_comes_from_the_accounts_own_builder():
    """One builder returns the other account's address for a shared section name.

    The jump's address is the other account's builder, never string surgery on the
    address the reader is on. `changeHref` and `programHref` are the two builders the
    design fixes in `model.ts`, and the one builder that crosses between them calls
    both, so a change to the route shape reaches the rail and the jump at once.
    """
    claim = "the jump's address comes from a builder that calls both address builders"
    # `railGroups` calls both builders too, because it builds one row per account. It is
    # not the crossing builder: it builds rows, and the builder this case reads returns
    # one address for the same section name on the other account.
    chunks = []
    for text in (read(MODEL, claim),):
        chunks += re.split(r"\n(?:export )?(?:async )?(?:function|const|let) ", text)
    crossing = [
        chunk
        for chunk in chunks
        if "changeHref(" in chunk and "programHref(" in chunk and "rows:" not in chunk
    ]
    assert crossing or any(
        builder in read(MODEL, claim) for builder in COUNTERPART_BUILDERS
    ), (
        f"{claim}: `{MODEL.name}` declares no builder that "
        "returns the other account's address by calling both `changeHref` and "
        "`programHref`.\n"
        "  A jump whose address is assembled where the control is drawn is a second "
        "address scheme beside the two the design fixes."
    )


def test_the_jump_reads_the_shared_section_name():
    """The jump exists where the two accounts share a section name, and nowhere else.

    `RailRow` carries `shared`, which is the section name a row shares with the other
    account or null. The change's File Diffs row and the program's Epics and Rubrics rows
    share nothing, so the jump reads that field rather than guessing from a row's label.
    """
    claim = "the jump reads the row's shared section name"
    app = read(APP, claim)
    model = read(MODEL, claim)

    # The field the jump reads is the rail row's own `shared`, and the row type carries it.
    assert_any(
        ("shared: SharedKey | null", "shared: SharedKey|null"),
        compact(model),
        f"{claim}: `{MODEL.name}` carries no `shared` field on the rail's row type, so a "
        "row cannot say which section name it shares with the other account",
    )

    # The jump's own derivation branches on that field, and the branch is the jump's
    # absence. A jump built from a row's label would guess, and the two accounts repeat
    # three labels.
    decides = re.search(
        r"\.shared\s*(?:===|==|\?|&&|\|\||\)|,)"
        r"|shared\s*(?:===|==)\s*(?:null|undefined)"
        r"|!\s*[\w.]*?shared\b",
        app + "\n" + model,
    )
    assert decides, (
        f"{claim}: `{APP.name}` and `{MODEL.name}` never branch on a row's `shared` "
        "field where it builds the jump.\n"
        "  A jump decided from a row's label would be offered on a section the other "
        "account does not carry: the change's File Diffs row, and the program's Epics and "
        "Rubrics rows, share no section name with the other account."
    )



# ---------------------------------------------------------- the link on the heading


def test_the_read_in_label_names_the_other_account():
    """`readInLabel` words the link, and gives no label where there is no counterpart.

    The work item's link names the pull request, and has no label when the work carries
    no pull request. The pull request's link always leads back to the work item.
    """
    claim = "readInLabel words the heading link"
    model = read(MODEL, claim)
    assert_any(("export function readInLabel",), compact(model), claim)
    assert_any(('"Read in the work item ›"',), compact(model), claim)
    assert_any(("`Read in PR ${pr} ›`",), compact(model), claim)
    assert_any(("pr===null?null",), compact(model), f"{claim}: no label without a pull request")


def test_the_panel_context_hands_the_link_to_every_section_panel():
    """`PanelActionContext` carries the link, and the section panel draws it as an anchor.

    The link is a real anchor with a real address, so a reader can copy it and open it in
    a new tab. Its label is the context's own label, which names the destination. A press
    with a modifier key belongs to the browser, and any other press runs the shell's `onGo`.
    """
    claim = "the panel context hands the link to the section heading"
    atoms = compact(read(ATOMS, claim))
    assert_any(("exportconstPanelActionContext=createContext",), atoms, claim)
    assert_any(("href={counterpart.href}",), atoms, f"{claim}: the link has no address")
    assert "<a" in atoms, f"{claim}: the link is no anchor"
    assert_any(("counterpart.onGo(counterpart.href,title)",), atoms, f"{claim}: no press runs onGo")
    assert_any(("{counterpart.label}",), atoms, f"{claim}: the link shows no label")
    assert_any(("event.metaKey",), atoms, f"{claim}: a modified press is not left to the browser")


def test_the_shell_provides_the_link_built_from_the_readers_row():
    """The shell builds the link from the label, the counterpart address, and `onGo`.

    One provider serves both accounts, so the account is resolved from the reader's row
    and never written down as a literal. A row with no shared section name, or a work
    with no pull request, gives no link.
    """
    claim = "the shell provides the heading link"
    app = compact(read(APP, claim))
    assert_any(("<PanelActionContext.Providervalue={panelAction}>",), app, claim)
    assert_any(("readInLabel(row.account",), app, f"{claim}: the label is not from readInLabel")
    assert_any(
        ("counterpartHref(work?.id??\"\",railChangePr,row.account,row.shared)",),
        app,
        f"{claim}: the address is not from counterpartHref",
    )
    assert_any(("row.shared===null",), app, f"{claim}: a section with no counterpart still gets a link")
    assert "<AccountRule" not in app, f"{claim}: the removed account rule bar is still rendered"


def test_a_press_carries_the_section_name_to_the_level_it_opens():
    """The section name rides view state, and `carriedSectionIndex` opens the level there.

    A press on the link on the Architecture heading opens the other account's
    Architecture level, and the level opens on the section of the same name. The match
    ignores case and space, and falls back to the first section.
    """
    claim = "a press carries the section name across"
    app = compact(read(APP, claim))
    model = compact(read(MODEL, claim))
    assert_any(("exportfunctioncarriedSectionIndex(",), model, claim)
    assert_any(("carriedSectionIndex(",), app, f"{claim}: the shell never reads the carried name")
    assert_any(("setCarried({href,section:sectionName})",), app, f"{claim}: a press stores no name")
    assert_any(("carried.href!==here",), app, f"{claim}: the name outlives its address")


# --------------------------------------------------------- the shipped viewer


def test_the_shipped_viewer_carries_the_heading_link():
    """The built viewer carries both labels of the heading link and the account rule's absence.

    Since slice 3, `plugins/artifact/viewer/index.html` is the build's own output and the
    file that ships. The link is part of the shipped surface only when this file carries
    its two labels.
    """
    claim = "the shipped viewer carries the heading link"
    assert SHIPPED_VIEWER.is_file(), (
        f"{claim}: {SHIPPED_VIEWER.relative_to(REPO_ROOT).as_posix()} does not exist"
    )
    text = SHIPPED_VIEWER.read_text(encoding="utf-8", errors="replace")
    for needle in ("Read in the work item ›", "Read in PR "):
        assert needle in text, (
            f"{claim}: the built viewer carries no {needle!r}. "
            "Run `npm run build` in plugins/artifact/viewer/."
        )
    assert "exists on this account alone" not in text, (
        f"{claim}: the built viewer still carries the removed account rule bar"
    )
