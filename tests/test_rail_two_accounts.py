"""The rail reads two accounts, each at its own address.

Cobuilder-viewer slice 16, epic `cobuilder-viewer/E7`. The work item and the pull
request its own epics carry are two accounts of one surface. Slice 15 landed the
change's four rows; this slice lands the rail that reads both accounts and the
address each row opens.

THE SLICE'S END, IN FIVE PARTS. `04-slices.md` writes them, and every case below
holds one:

  1. The rail groups its rows under Build and Review. Build reads the program's
     account, and Review reads the change's.
  2. `#/<work>/pull-requests/<pr>` opens the change's Intent section.
  3. One appended segment selects a named section, so
     `#/<work>/pull-requests/<pr>/architecture` opens the change's Architecture.
  4. The row that opens the reader's address reads current.
  5. The rail's fold and its arrow walk obey one convention.

WHERE THESE CASES READ, AND WHY.

The rail is component work. `epic-E7-design.md` puts its cases in the viewer's own
suite, `npm test` in `plugins/artifact/viewer/`. The run for this slice uses the
repository's suite instead, `uv run --with pytest pytest tests/ -v`, and that suite
renders no React component. So each case below reads the sources the design fixes
under `src/shell/`, as text, and the built viewer at
`plugins/artifact/viewer/index.html`, which since slice 3 is the file that ships.

The names every case reads are fixed by `epic-E7-design.md`'s Types & Signatures
(`GroupKey`, `AccountId`, `RailRow`, `RailGroup`, `railGroups`, `rowsOf`,
`changeHref`, `programHref`, `ChangeKey`, `ProgramKey`) and by the reviewed
prototype at `src/variations/flightdeck/accountModel.ts`, which the engineer
approved as slice 14. A case reads its needles with every run of space removed and
with a trailing comma dropped, so a reformat alone never fails one.

Run with: uv run --with pytest pytest tests/test_rail_two_accounts.py -v
"""
from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWER = REPO_ROOT / "plugins" / "artifact" / "viewer"
SHIPPED_VIEWER = VIEWER / "index.html"
SHELL = VIEWER / "src" / "shell"

MODEL = SHELL / "model.ts"
RAIL = SHELL / "Rail.tsx"
APP = SHELL / "App.tsx"

# The two groups, in the order the rail renders them, and the account each reads.
GROUP_ACCOUNTS = (("build", "program"), ("review", "change"))

# The program's five rows, in the order the rail renders them.
PROGRAM_KEYS = ("intent", "problem-and-solution", "architecture", "epics", "rubrics")
PROGRAM_LABELS = ("Intent", "Problem & Solution", "Architecture", "Epics", "Rubrics")

# The change's four rows, in the order the rail renders them. The fourth name stands
# in the change's account alone.
CHANGE_KEYS = ("intent", "problem-and-solution", "architecture", "file-diffs")

# The three section names both accounts carry. The repetition is what makes the same
# section reachable on either account, and it is why a row is matched by address.
SHARED_KEYS = ("intent", "problem-and-solution", "architecture")


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
        "The rail's two accounts read their rows from this file."
    )
    return path.read_text(encoding="utf-8", errors="replace")


def shell_sources() -> dict[str, str]:
    """Every TypeScript source directly under `src/shell/`, by file name.

    The rail's model is one of these, and the design names `model.ts` as its home.
    A claim about a name the design fixes reads this whole set, so a case does not
    fail because the name landed in the neighbouring file of the same layer.
    """
    return {
        path.name: path.read_text(encoding="utf-8", errors="replace")
        for path in sorted(SHELL.glob("*.ts")) + sorted(SHELL.glob("*.tsx"))
        if path.is_file()
    }


def shell_text() -> str:
    """Every shell source in one text, for a claim that spans more than one file."""
    return "\n".join(shell_sources().values())


def quote_forms(fragment: str) -> tuple[str, ...]:
    """`fragment` as written with double quotes, and again with single quotes."""
    return (fragment, fragment.replace('"', "'"))


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


def function_region(text: str, name: str, claim: str) -> str:
    """The body of the top-level function `name`, however it is declared.

    A `function` declaration ends at the first closing brace at column zero, and a
    bound arrow ends at the first blank line after it. Both forms are read, so a case
    about a builder's body does not fail on the declaration form alone.
    """
    if f"function {name}" in text:
        return block_region(text, f"function {name}", "\n}", claim)
    if f"{name} =" in text:
        return block_region(text, f"{name} =", "\n\n", claim)
    assert False, (
        f"{claim}: the sources declare no `{name}`, by a `function` keyword or as a "
        "bound function."
    )


# ------------------------------------------------------------------ the groups


def test_the_shell_declares_two_accounts():
    """Two accounts of one work item, each with a fixed id.

    `epic-E7-design.md` fixes the ids as `program` and `change`. The program reads
    the work's own design records, and the change reads the pull request the work's
    own epics carry. ADR-0029 decided the shape.
    """
    claim = "the shell names the program's account and the change's account"
    assert_any(
        quote_forms('"program" | "change"'),
        compact(shell_text()),
        claim,
    )


def test_the_shell_declares_two_groups():
    """The rail's group keys, and there are two.

    The engineer approved the grouping on 2026-09-25: Build and Review. A third
    group was named, given no rows, and removed, so `GroupKey` carries two values.
    """
    claim = "the shell names the rail's two groups, Build and Review"
    assert_any(
        quote_forms('"build" | "review"'),
        compact(shell_text()),
        claim,
    )


def test_each_group_names_the_account_it_reads():
    """Every group states which account it reads, and the two accounts differ.

    Build holds the program's rows and Review holds the change's rows. Because the
    two groups repeat three section names, a reader who cannot tell the groups apart
    cannot tell the accounts apart either, so the account is a field of the group and
    not a fact a reader has to infer.
    """
    claim = "each group states the account it reads"
    haystack = compact(shell_text())
    assert_any(("account: AccountId", "account: AccountId;"), haystack, claim)
    assert_any(
        quote_forms('account: "program"') + quote_forms('build: "program"'),
        haystack,
        f"{claim}: no source names the program's account on a group or on a row",
    )
    assert_any(
        quote_forms('account: "change"') + quote_forms('review: "change"'),
        haystack,
        f"{claim}: no source names the change's account on a group or on a row",
    )


def test_build_holds_the_programs_five_rows_in_order():
    """Build's rows, in the order the rail renders them.

    Intent, Problem & Solution, Architecture, Epics, and Rubrics. The order is the
    reading order, and the one list serves the rail and the arrow walk, so a second
    copy of it would let the two drift.
    """
    claim = "Build holds the program's five rows in reading order"
    haystack = compact(shell_text())
    listed = '","'.join(PROGRAM_KEYS)
    labelled = '","'.join(PROGRAM_LABELS)
    assert_any(
        (f'["{listed}"]', f"['{listed}']", f'["{labelled}"]', f"['{labelled}']"),
        haystack,
        claim,
    )


def test_review_holds_the_changes_four_rows_from_one_key_list():
    """Review's rows are the change's own four keys, and not a second copy of them.

    Slice 15 declared `CHANGE_KEYS` and the four names in
    `src/shell/change/sections.tsx`, and the rail's Review group reads the change's
    account. A second list of the same four names would let the row the rail opens
    and the row the pager renders disagree.
    """
    claim = "Review's rows are the change's own four keys"
    model = compact(read(MODEL, claim))
    change_key_names = quote_forms('["intent","problem-and-solution","architecture","file-diffs"]')
    assert_any(
        ("CHANGE_KEYS", "ChangeKey") + change_key_names,
        model,
        f"{claim}: `{MODEL.name}` declares no reader of the change's four row keys, "
        "so the Review group builds its rows from a list of its own",
    )


def test_the_rail_row_type_carries_its_account_its_shared_name_and_a_count():
    """One row type, with the five fields a grouped rail needs.

    `epic-E7-design.md` fixes `RailRow`: the key, the label, the one address a press
    opens, the account the row reads, the section name it shares with the other
    account (or null), and how much the section holds. `RailGroup` holds rows of
    that type, and it names its own account.
    """
    claim = "the rail's row type carries the fields a grouped rail needs"
    haystack = compact(shell_text())
    assert_any(("interface RailRow", "type RailRow"), haystack, claim)

    row = compact(block_region(shell_text(), "RailRow {", "\n}", claim))
    for field in ("key:string", "label:string", "href:string", "account:AccountId"):
        assert field in row, (
            f"{claim}: `RailRow` declares no {field!r}. The design fixes that field "
            "on the row."
        )
    assert_any(
        ("shared: SharedKey | null", "shared: SharedKey|null"),
        row,
        f"{claim}: `RailRow` carries no `shared` field, so a row cannot say which "
        "section name it shares with the other account",
    )
    assert "count:string" in row, (
        f"{claim}: `RailRow` declares no `count` field, so a row states no count."
    )

    group = compact(block_region(shell_text(), "RailGroup {", "\n}", claim))
    assert "rows:RailRow[]" in group, (
        f"{claim}: `RailGroup` holds no `rows: RailRow[]`, so the group is not the "
        "row list the rail renders and the walk steps."
    )
    assert "account:AccountId" in group, (
        f"{claim}: `RailGroup` names no `account`, so the group does not say which "
        "account its rows read."
    )


def test_rail_groups_returns_a_build_group_and_a_review_group():
    """The one builder returns both groups, in reading order.

    `railGroups` is the rail's whole row list and the arrow walk's whole row list.
    It returns Build first and Review second, and it returns Review even when the
    work's own epics carry no pull request, so the change's absence is a state the
    reader sees rather than a missing group.
    """
    claim = "railGroups returns a Build group and a Review group"
    model = compact(read(MODEL, claim))
    assert_any(
        ("function railGroups",),
        model,
        f"{claim}: `{MODEL.name}` declares no `railGroups`, so no one builder holds "
        "the rail's order.",
    )
    for key in ("build", "review"):
        assert_any(
            quote_forms(f'key: "{key}"'),
            model,
            f"{claim}: `railGroups` builds no group whose key reads {key!r}",
        )
    for label in ("Build", "Review"):
        assert_any(
            quote_forms(f'label: "{label}"'),
            model,
            f"{claim}: `railGroups` builds no group whose label reads {label!r}",
        )


# ---------------------------------------------------------------- the addresses


def test_the_change_address_is_the_pull_request_route_with_one_appended_segment():
    """One builder, and one appended segment per named section.

    ADR-0029 fixed the change's address as `#/<work>/pull-requests/<pr>`. The other
    three rows append exactly one segment, which is the row's own name. The segment
    rides the shell's existing route field, so no second address scheme exists.
    """
    claim = "the change's address is the pull-request route plus one segment"
    body = compact(function_region(read(MODEL, claim), "changeHref", claim))
    assert "pull-requests" in body, (
        f"{claim}: `changeHref` builds no address under `pull-requests`, so the "
        "change's address is not the one ADR-0029 fixed."
    )
    assert_any(
        ("${section}", '"/" + section', "'/' + section", '`/${section}`'),
        body,
        f"{claim}: `changeHref` appends no named section to the address",
    )
    assert "ChangeKey" in body, (
        f"{claim}: `changeHref` takes no `ChangeKey`, so the segment it appends is "
        "not the row's own name."
    )


def test_the_bare_change_address_opens_the_change_intent_row():
    """The address with no appended segment is the change's first row.

    `#/<work>/pull-requests/<pr>` opens the change's Intent section, and Intent is
    the first of the change's four rows. So the bare address and the named one take
    the same route, and the first row is the one a route change lands on.
    """
    claim = "the bare change address opens the change's Intent row"
    body = compact(function_region(read(MODEL, claim), "changeHref", claim))
    assert_any(
        quote_forms('section === "intent"') + quote_forms('"intent" === section'),
        body,
        f"{claim}: `changeHref` does not single out the row named `intent`, so the "
        "bare address and the named one cannot be told apart.",
    )
    assert CHANGE_KEYS[0] == "intent", (
        f"{claim}: this case assumes the change's first row is Intent, and it read "
        f"{CHANGE_KEYS[0]!r}."
    )


def test_every_row_address_comes_from_the_one_builder():
    """No row invents an address.

    The program's rows open the shell's own section addresses and the change's rows
    open the pull-request addresses. The design states one builder per account, and
    each builder is called by the row that carries its address, so a row's address is
    never written by hand.
    """
    claim = "every rail row takes its address from the account's own builder"
    model = compact(read(MODEL, claim))
    for name in ("programHref", "changeHref"):
        assert any(
            text.count(f"{name}(") >= 2 for text in (model,)
        ), (
            f"{claim}: `{MODEL.name}` does not both declare and call `{name}`, so a "
            "row's address is written where the row is built rather than by the "
            "account's own builder."
        )


def test_the_appended_segment_selects_the_changes_own_row():
    """The appended segment decides which of the change's rows opens.

    The segment is the row's own name, so `.../architecture` opens the change's
    Architecture row and `.../file-diffs` opens its File Diffs. The shell reads the
    segment from its own route field and turns it into the row the pager starts on,
    so a deep link lands on the named row rather than on the first one.
    """
    claim = "the appended segment selects the change's named row"
    sources = {name: compact(text) for name, text in shell_sources().items()}
    paired = [
        name
        for name, text in sources.items()
        if "subId" in text
        and any(
            reader in text for reader in ("CHANGE_KEYS", "ChangeKey", '"file-diffs"')
        )
    ]
    named = [
        name
        for name, text in sources.items()
        for needle in (
            "CHANGE_KEYS.indexOf",
            "CHANGE_KEYS.findIndex",
            "changeRowIndex",
            "changeStartIndex",
            "changeIndex",
            "changeRowOf",
            "rowIndexOf",
            "rowIndexFor",
            "startIndexOf",
        )
        if needle in text
    ]
    assert paired or named, (
        f"{claim}: no shell source reads the route's appended segment (`subId`) "
        "together with the change's own row keys, so the segment selects no row.\n"
        f"  Sources read: {sorted(sources)}."
    )


# -------------------------------------------------------------- the current row


def test_the_row_that_opens_the_readers_address_reads_current():
    """The current row is the row whose address is the reader's.

    An exact match on the address, never a match on the section name: the two groups
    repeat three section names, so a section match would light more than one row at
    once. The row the reader arrived on is therefore the row that opens the address
    they are on, and it carries the shell's own current-row treatment.
    """
    claim = "the row that opens the reader's address reads current"
    rail = compact(read(RAIL, claim))
    assert "group.rows" in rail, (
        f"{claim}: `{RAIL.name}` does not read `group.rows`, so the rail still "
        "renders a row list of its own rather than the grouped one."
    )
    assert_any(
        ("href === here", "href===here"),
        rail,
        f"{claim}: the rail does not compare a row's address with the reader's own "
        "address",
    )
    assert "aria-current" in rail, (
        f"{claim}: the current row carries no `aria-current`, so a reader who cannot "
        "see the treatment is not told which row they are on."
    )


# -------------------------------------------------------- the fold and the walk


def test_the_arrow_walk_steps_every_row_of_both_groups():
    """The walk steps the rail's whole list, across both groups.

    A folded group is a display choice and not a wall: the walk reaches every row of
    both groups, and a group boundary is one step. One flat list serves the walk and
    the rail, so the walk cannot know fewer rows than the rail shows.
    """
    claim = "the arrow walk steps every row of both groups"
    model = compact(read(MODEL, claim))
    assert_any(
        ("function rowsOf",),
        model,
        f"{claim}: `{MODEL.name}` declares no `rowsOf`, so the walk has no one flat "
        "list of both groups to step.",
    )
    walk = compact(read(APP, claim) + "\n" + read(RAIL, claim))
    assert_any(
        (
            "rowsOf(",
            "flatMap((group) => group.rows)",
            "flatMap((g) => g.rows)",
            "flatMap(({ rows }) => rows)",
        ),
        walk,
        f"{claim}: neither `{APP.name}` nor `{RAIL.name}` builds the walk's list from "
        "the rail's rows",
    )


def test_the_fold_refuses_to_close_the_group_holding_the_readers_row():
    """A group that holds the current row does not close.

    The rail's convention is that the reader always sees the row they are on. The
    walk visits every row of both groups, folded or not, so a press can land inside
    a folded group. The group holding the current row is therefore always open, and
    the fold refuses to close it rather than create a state the rule would undo on
    the next render.
    """
    claim = "the fold refuses to close the group that holds the reader's row"
    haystack = compact(shell_text())
    assert_any(
        (
            "holdsCurrent",
            "holdsCurrentRow",
            "holdingCurrent",
            "liveRow",
            "group.key === key",
            "rowsOf(groups).find",
            "stays open",
            "refuses to close",
        ),
        haystack,
        f"{claim}: no shell source keeps the group holding the current row open, so "
        "a fold can hide the row the reader is on.",
    )


def test_the_fold_control_states_why_it_refuses():
    """The fold control says why it does not close.

    A control that silently does nothing reads as broken. The design's own words are
    that the control states the reason, so the refusal is written on the control a
    reader would press, and a reader who never presses it still reads it.
    """
    claim = "the fold control states why it refuses to close"
    rail = read(RAIL, claim)
    region = block_region(rail, "groups.map(", "</button>", claim)
    assert_any(
        ("aria-label", "title="),
        compact(region),
        f"{claim}: the rail's group header region carries no `aria-label` and no "
        "`title`, so the refused fold states no reason on the control.",
    )


# --------------------------------------------------------- the shipped viewer


def test_the_shipped_viewer_carries_the_review_group():
    """The built viewer carries the grouping.

    Since slice 3, `plugins/artifact/viewer/index.html` is the build's own output
    and the file that ships. The Review group is part of the shipped surface only
    when this file carries its label. No standalone `Review` label stands in the
    shell's sources today, so its absence is the grouped rail missing.
    """
    claim = "the shipped viewer carries the Review group"
    assert SHIPPED_VIEWER.is_file(), (
        f"{claim}: {SHIPPED_VIEWER.relative_to(REPO_ROOT).as_posix()} does not exist"
    )
    text = SHIPPED_VIEWER.read_text(encoding="utf-8", errors="replace")
    assert '"Review"' in text, (
        f"{claim}: the built viewer carries no \"Review\" label.\n"
        "  The Review group holds the change's four rows, and the build writes this "
        "file. Run `npm run build` in plugins/artifact/viewer/ once the rail reads "
        "both accounts."
    )
