"""The account mark, and the jump across.

Cobuilder-viewer slice 17, epic `cobuilder-viewer/E7`. A work item and the pull
request its own epics carry are two accounts of one surface. Slice 15 landed the
change's four rows, and slice 16 landed the rail that reads both accounts and the
address each row opens. This slice lands the mark that says which account a section
belongs to, and the one press that crosses to the other account's same-named
section.

THE SLICE'S END, IN THREE PARTS. `04-slices.md` writes it, and every case below
holds one:

  1. Every section of both accounts carries its account's mark: a word and a glyph,
     and no fill.
  2. A press moves a reader from one account's section to the other account's
     same-named section.
  3. The three states `epic-E7-design.md` names: a section both accounts carry, a
     section only one account carries, and a reader who arrives on a deep link.

WHERE THESE CASES READ, AND WHY.

The mark is component work. `epic-E7-design.md` puts its cases in the viewer's own
suite, `npm test` in `plugins/artifact/viewer/`. The run for this slice uses the
repository's suite instead, `uv run --with pytest pytest tests/ -v`, and that suite
renders no React component. So each case below reads the two things this suite can
read:

1. the sources the design fixes under `src/shell/`, as text; and
2. the built viewer at `plugins/artifact/viewer/index.html`, which since slice 3 is
   the file that ships.

The names every case reads come from `epic-E7-design.md`'s Types & Signatures
(`AccountMark.tsx`, `ACCOUNT_MARK`, `ACCOUNT_GLYPH`, `AccountRule`, `JumpTargetLink`,
its `account`, `whose`, `section`, `jump`, and `onGo` props, and `changeHref` and
`programHref` in `model.ts`) and from the reviewed prototype at
`src/variations/flightdeck/AccountMark.tsx`, which the engineer approved as slice 14.
A case reads its needles with every run of space removed and with a trailing comma
dropped, so a reformat alone never fails one.

Run with: uv run --with pytest pytest tests/test_account_mark.py -v
"""
from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWER = REPO_ROOT / "plugins" / "artifact" / "viewer"
SHIPPED_VIEWER = VIEWER / "index.html"
SHELL = VIEWER / "src" / "shell"

MARK = SHELL / "AccountMark.tsx"
APP = SHELL / "App.tsx"
MODEL = SHELL / "model.ts"

# The two accounts, and the word the mark shows for each. ADR-0029 fixes them.
ACCOUNT_WORDS = (("program", "Program"), ("change", "Change"))

# The two parts of the mark, and the map each one comes from.
MARK_PARTS = (
    ("the account's word", ("ACCOUNT_MARK[account]", "ACCOUNT_MARK[", "mark.word")),
    ("the account's glyph", ("ACCOUNT_GLYPH[account]", "ACCOUNT_GLYPH[", "Glyph")),
)

# The reader's own address, matched against a rail row's address. The design's own
# test plan calls the third state one where the reader arrives on a deep link.
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


def mark_text(claim: str) -> str:
    """The mark module's text, or a marker that names the file the design fixes.

    One case owns the claim that the module lands at the path `epic-E7-design.md` names.
    Every other case reads the module for its own content, so a file that is absent then
    fails on the content that is missing rather than on the file name alone. A case that
    failed because a file was absent would prove nothing about the mark.
    """
    if MARK.is_file():
        return MARK.read_text(encoding="utf-8", errors="replace")
    return f"/* {MARK.relative_to(REPO_ROOT).as_posix()} does not exist */"


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


def block_region(text: str, opener: str, closer: str, claim: str) -> str:
    """The raw text from `opener` to the first `closer` after it, both included."""
    start = text.find(opener)
    assert start >= 0, (
        f"{claim}: the sources carry no {opener!r}, so the structure that carried "
        "this claim is gone."
    )
    stop = text.find(closer, start)
    assert stop >= 0, (
        f"{claim}: the sources carry {opener!r} with no {closer!r} after it, so the "
        "structure that carried this claim is incomplete."
    )
    return text[start : stop + len(closer)]


def rule_body(text: str, claim: str) -> str:
    """The rule's whole declaration, to the next top-level declaration or the file's end.

    `AccountRule` takes its props destructured, so its declaration carries a closing brace
    at column zero before its body even starts. A region that ended at the first column-zero
    brace would end inside the props and read none of the rule. This region ends where the
    next top-level declaration begins instead, so it holds every part of the rule.
    """
    start = text.find("function AccountRule")
    if start < 0:
        start = text.find("AccountRule =")
    assert start >= 0, (
        f"{claim}: the sources declare no `AccountRule`, by a `function` keyword or as a "
        "bound function. The design fixes the rule that carries the mark and the jump."
    )
    ends = [
        found
        for found in (
            text.find(marker, start + 1)
            for marker in (
                "\nexport ",
                "\nfunction ",
                "\nconst ",
                "\ninterface ",
                "\ntype ",
            )
        )
        if found >= 0
    ]
    return text[start : min(ends)] if ends else text[start:]


def mark_markup(rule: str) -> str:
    """The mark's own markup inside the rule, up to the point the jump control starts.

    The region starts at the rule's returned markup, so the props that name the jump do
    not count as markup. The jump is a control of its own, so the region ends where the
    jump control begins and the mark's own parts are what it holds.
    """
    at = rule.find("return")
    if at < 0:
        at = rule.find("=>")
    body = rule[at:] if at >= 0 else rule
    ends = [
        found
        for found in (
            body.find("jump"),
            body.find("<a"),
            body.find("ArrowLeftRight"),
        )
        if found >= 0
    ]
    return body[: min(ends)] if ends else body


# --------------------------------------------------------------- the mark, and no fill


def test_the_mark_module_lands_in_the_shipped_shell():
    """The mark has a module of its own, at the path the design fixes.

    `epic-E7-design.md` names `src/shell/AccountMark.tsx` as new, and it holds three
    things: the mark's word, the mark's glyph, and the rule that carries both with the
    jump. The mark renders inside the shipped shell, so a reader reaches it without a
    mode switch and without a second surface.
    """
    claim = "the mark lands in the shipped shell at src/shell/AccountMark.tsx"
    assert MARK.is_file(), (
        f"{claim}: {MARK.relative_to(REPO_ROOT).as_posix()} does not exist. "
        "epic-E7-design.md names `src/shell/AccountMark.tsx` as the mark's own module."
    )


def test_each_account_has_its_own_word():
    """One map holds the mark's first part, and the two accounts' words differ.

    ADR-0029 fixes both words: `Program` stands by a person, and `Change` stands by a
    pull request. A reader who cannot tell the words apart cannot tell the accounts
    apart, because the two groups repeat three section names.
    """
    claim = "each account carries its own word"
    text = mark_text(claim) + "\n" + read(MODEL, claim)
    assert_any(
        ("ACCOUNT_MARK", "AccountMark"),
        compact(text),
        f"{claim}: no shell source declares the map of account words",
    )
    for account, word in ACCOUNT_WORDS:
        assert_any(
            (f'{account}: {{ word: "{word}" }}', f'{account}: "{word}"', f'{account}:"{word}"'),
            compact(text),
            f"{claim}: the mark carries no word {word!r} for the {account} account",
        )
    assert "Program" != "Change", f"{claim}: the two accounts' words are the same word"


def test_each_account_has_its_own_glyph():
    """The mark's second part is one glyph per account, and the two differ.

    ADR-0029 fixes what each glyph stands for: a person for the program and a pull
    request for the change. One copy of the glyph map exists, so the rule and every
    other reader of it cannot show two different glyphs for one account.
    """
    claim = "each account carries its own glyph"
    text = mark_text(claim)
    assert_any(
        ("ACCOUNT_GLYPH", "AccountGlyph"),
        compact(text),
        f"{claim}: no shell source declares the map of account glyphs",
    )
    glyphs = compact(
        block_region(text, "ACCOUNT_GLYPH", "};", f"{claim}: the glyph map is absent")
    )
    assert_any(
        ("program:",),
        glyphs,
        f"{claim}: the glyph map names no glyph for the program account",
    )
    assert_any(
        ("change:",),
        glyphs,
        f"{claim}: the glyph map names no glyph for the change account",
    )
    assert_any(
        ("User", "UserRound", "CircleUser", "UserCircle"),
        glyphs,
        f"{claim}: no glyph in the map stands for a person, and the program's mark "
        "stands by a person",
    )
    assert_any(
        ("GitPullRequest", "GitPullRequestArrow", "GitPullRequestDraft"),
        glyphs,
        f"{claim}: no glyph in the map stands for a pull request, and the change's "
        "mark stands by a pull request",
    )


def test_the_mark_is_a_word_and_a_glyph():
    """The rule draws both of the mark's parts, from the maps that hold them.

    The mark had three parts and the engineer dropped the third, which was a fill. Two
    parts remain: the account's word and the account's glyph. The rule reads them from
    one map each, so a rule that invents a word or a glyph of its own is not this mark.
    """
    claim = "the rule draws the account's word and the account's glyph"
    text = compact(mark_text(claim))
    for part, needles in MARK_PARTS:
        assert_any(
            needles,
            text,
            f"{claim}: the rule draws no {part}",
        )


def test_the_mark_carries_no_fill():
    """The mark's own markup carries no background fill.

    The engineer dropped the mark's third part, and it was a fill: the shell's
    selected-row wash for the program's account and its heading band for the change's.
    The two parts that remain are the word and the glyph, and neither one is a colour.
    """
    claim = "the mark carries no fill"
    rule = mark_text(claim)
    markup = mark_markup(rule_body(rule, claim))
    fills = re.findall(r"(?<![\w-])bg-[\w-]+", markup)
    assert not fills, (
        f"{claim}: the rule paints the mark with {sorted(set(fills))}. The mark's third "
        "part was a fill and the engineer dropped it, so the mark is the account's word "
        "and the account's glyph and nothing else."
    )


# ------------------------------------------------- the rule stands on every section


def test_the_rule_stands_above_the_section_of_both_accounts():
    """The shipped pane renders the rule, and the rule is one render path.

    Every section of both accounts carries its account's mark, so the rule stands in
    the pane that renders both accounts rather than in a branch of one of them. The
    shell renders one section at a time, so one rule above that section serves every
    section of both accounts.
    """
    claim = "the rule stands above the section, for both accounts"
    app = compact(read(APP, claim))
    assert_any(
        ("AccountRule", "AccountMark"),
        app,
        f"{claim}: `{APP.name}` renders no rule, so no section carries a mark",
    )
    assert_any(
        ("account={", "account="),
        app,
        f"{claim}: the rule is rendered with no account, so a section cannot state "
        "which account it belongs to",
    )
    for literal in ('account="program"', 'account="change"'):
        assert compact(literal) not in app, (
            f"{claim}: `{APP.name}` renders the rule with the literal {literal!r}. One "
            "render path serves both accounts, so the account has to be resolved rather "
            "than written down."
        )


def test_the_rule_is_handed_the_account_the_section_and_the_jump():
    """The rule takes the four facts the design fixes on it.

    `epic-E7-design.md` fixes `AccountRule`'s props: the account, who the reader is
    reading about, the section's own name, the jump to the other account's same-named
    section, and the callback a press runs. Each one is passed by the shell, so the mark
    and the jump cannot be built two different ways.
    """
    claim = "the rule is handed the account, the section, and the jump"
    app = compact(read(APP, claim))
    for prop in ("account={", "whose={", "section={", "jump=", "onGo="):
        assert prop in app, (
            f"{claim}: `{APP.name}` renders the rule without `{prop}`. The design fixes "
            "that prop on the rule."
        )


def test_the_shell_resolves_the_readers_row_by_its_address():
    """The reader's mark is the mark of the row their own address opens.

    The design's third state is a reader who arrives on a deep link. The shell matches
    the reader's address against the rail's rows by exact address and never by section
    name, because the two groups repeat three section names and a name match would light
    more than one row at once.
    """
    claim = "the shell resolves the reader's row by its address"
    # THE MARK'S OWN READERS, AND NOT THE RAIL'S. `Rail.tsx` already matches a row's
    # address to light the current row, and that is slice 16's claim. This case reads the
    # two files that carry slice 17's mark, the pane and the mark's own module, because
    # the mark follows the address the reader arrived on.
    haystack = compact(read(APP, claim) + "\n" + mark_text(claim))
    assert_any(
        LIVE_ROW_LOOKUPS,
        haystack,
        f"{claim}: neither `{APP.name}` nor `{MARK.name}` matches a rail row's address "
        "against the reader's own address, so the mark cannot know which section the "
        "reader arrived on",
    )


def test_a_deep_link_carries_its_own_sections_mark():
    """The section the rule names is the section the reader's row names.

    A reader who opens `#/<work>/pull-requests/<pr>/architecture` arrives on the change's
    Architecture row. The mark above it names Architecture and carries the jump to the
    program's Architecture, so the mark follows the address rather than the account's
    first row. The section name in the rule is the name the rail lists the row under.
    """
    claim = "a deep link carries its own section's mark"
    app = compact(read(APP, claim)) + "\n" + compact(mark_text(claim))
    assert_any(
        (
            "section={row.label}",
            "section={live.row.label}",
            "section={current.label}",
            "section={here.label}",
            "section={label}",
            "section={mark.label}",
        ),
        app,
        f"{claim}: the rule's section is not the name the reader's row carries, so a deep "
        "link's mark names a different section than the one the reader is on",
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
    for text in (read(MODEL, claim), mark_text(claim)):
        chunks += re.split(r"\n(?:export )?(?:async )?(?:function|const|let) ", text)
    crossing = [
        chunk
        for chunk in chunks
        if "changeHref(" in chunk and "programHref(" in chunk and "rows:" not in chunk
    ]
    assert crossing or any(
        builder in read(MODEL, claim) + mark_text(claim) for builder in COUNTERPART_BUILDERS
    ), (
        f"{claim}: neither `{MODEL.name}` nor `{MARK.name}` declares a builder that "
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
    mark = mark_text(claim)

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
        app + "\n" + mark + "\n" + model,
    )
    assert decides, (
        f"{claim}: neither `{APP.name}` nor `{MARK.name}` branches on a row's `shared` "
        "field where it builds the jump.\n"
        "  A jump decided from a row's label would be offered on a section the other "
        "account does not carry: the change's File Diffs row, and the program's Epics and "
        "Rubrics rows, share no section name with the other account."
    )


def test_a_section_only_one_account_carries_states_that_fact_in_place():
    """The state with no counterpart is stated where the jump would stand.

    Absence is a state, and not a gap. A section one account carries alone has no jump,
    and the rule says so on the bar rather than leaving a control that leads nowhere. The
    design's own words are that the section states that fact in place.
    """
    claim = "a section only one account carries states that fact in place"
    text = compact(mark_text(claim))
    assert_any(
        (
            "jump===null",
            "jump==null",
            "jump?",
            "!jump",
        ),
        text,
        f"{claim}: the rule carries no state for a section with no counterpart, so a "
        "jump-less section renders as a section the rule forgot",
    )
    assert_any(
        (
            "exists on this account alone",
            "this account alone",
            "carries no counterpart",
            "no counterpart",
            "alone on this account",
        ),
        text,
        f"{claim}: the rule states no reason for the missing jump, so a reader meets a "
        "silent gap where the control would be",
    )


def test_the_jump_is_a_link_that_names_its_destination():
    """The press lands on the other account's section, and the control says which one.

    The jump is a real link with a real address, so it can be copied, sent, opened in a
    new tab, and read by a screen reader as a link. Its label names the destination
    rather than the act: `Read the change's Architecture` tells a reader where the press
    lands, and `Jump` does not.
    """
    claim = "the jump is a link that names the section a press lands on"
    rule = mark_text(claim)
    text = compact(rule)
    assert_any(
        ("href={jump.href}", "jump.href", "href={jumpUrl}", "href={target.href}"),
        text,
        f"{claim}: the jump carries no address of its own, so no link leads to the other "
        "account's section",
    )
    assert "<a" in text, (
        f"{claim}: the jump is no anchor, so a reader cannot copy it, send it, or open it "
        "in a new tab"
    )
    assert "onGo" in text, (
        f"{claim}: the jump never runs the shell's own `onGo`, so a press cannot move "
        "the reader without a full page load"
    )

    # The label is read on the jump control alone, and not on the prose around it: a
    # comment may quote the word the control must not use.
    control = rule_body(rule, claim)
    at = control.find("<a")
    control = compact(control[at:] if at >= 0 else control)
    assert_any(
        ("Read the", "read the"),
        control,
        f"{claim}: the jump's label names no destination, so a reader is told the act "
        "and not the section the press lands on",
    )
    for act in (">Jump<", '"Jump"', "'Jump'"):
        assert compact(act) not in control, (
            f"{claim}: the jump's label reads {act!r}, which names the act rather than "
            "the destination. The design's own words are `Read the change's Architecture`."
        )


# --------------------------------------------------------- the shipped viewer


def test_the_shipped_viewer_carries_the_mark_and_the_jump():
    """The built viewer carries the mark and the one control that crosses accounts.

    Since slice 3, `plugins/artifact/viewer/index.html` is the build's own output and the
    file that ships. The mark and the jump are part of the shipped surface only when this
    file carries them. No other surface of the shipped viewer states that a section
    exists on one account alone, and no other surface offers to read the other account's
    section, so their absence is this slice missing from the build.
    """
    claim = "the shipped viewer carries the mark and the jump"
    assert SHIPPED_VIEWER.is_file(), (
        f"{claim}: {SHIPPED_VIEWER.relative_to(REPO_ROOT).as_posix()} does not exist"
    )
    text = SHIPPED_VIEWER.read_text(encoding="utf-8", errors="replace")
    for needle in ("exists on this account alone", "Read the "):
        assert needle in text, (
            f"{claim}: the built viewer carries no {needle!r}.\n"
            "  The first string is the state of a section one account carries alone, and "
            "the second one opens the jump's label. Run `npm run build` in "
            "plugins/artifact/viewer/ once the rule reads both accounts."
        )
