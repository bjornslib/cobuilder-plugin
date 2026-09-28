"""The diagram tiles open their drawing.

Cobuilder-viewer slice 11, epic `cobuilder-viewer/E5`. A level's drawings are tiles. A
tile shows one drawing scaled to its box, and a press opens that drawing whole in a
dialog: zoomed from 50 to 400 percent, closed by Escape, by the backdrop, and by its
own close control, and showing the authored source when the render failed.

THE SLICE'S END, IN FOUR PARTS. `04-slices.md` writes it, and every case below holds
one:

  1. A tile shows the drawing scaled to its box.
  2. A press opens it whole with zoom from 50 to 400 percent.
  3. Escape and the backdrop close it.
  4. A failed render shows the authored source.

`epic-E5-design.md`'s Test Plan names the same four as three cases,
`test_diagram_tile_opens_the_dialog`, `test_diagram_zoom_steps`, and
`test_diagram_failure_shows_the_source`, and this file carries each of them plus the
claims the three do not reach.

WHERE THESE CASES READ, AND WHY.

The tiles are component work. `epic-E5-design.md` puts its cases in
`tests/test_sections.py`, which no slice wrote and which does not exist anywhere in
the repository, and `04-slices.md` says the viewer slices run their component cases
through `npm test` in `plugins/artifact/viewer/`. The run for this slice uses the
repository's suite instead, `uv run --with pytest pytest tests/ -v`, and that suite
renders no React component. So each case below reads the things this suite can read:

1. `plugins/artifact/viewer/src/shell/DiagramTiles.tsx`, as text, which the design
   makes the one home of the tiles, the dialog, the zoom, and the source fallback; and
2. the built viewer at `plugins/artifact/viewer/index.html`, which since slice 3 is
   the file that ships, and which carries the same markup the source does.

The names every case reads come from `epic-E5-design.md`'s Types & Signatures
(`loadMermaid`, `uncap`, `DiagramTiles`, `Theme`), from `04-slices.md`'s own words for
this slice, and from the sources themselves. A case reads its needles with every run
of space removed and a trailing comma dropped, so a reformat alone never fails one.

WHAT THIS FILE CANNOT MEASURE. jsdom holds no layout engine, and no browser runs here.
The miniature's measured scale, the dialog's fitted width, and the scrollable box a
zoom produces are geometry, and they belong to the Gate 4c rubrics on the built
surface. Each case below reads the rule that produces that geometry instead: the
expressions, the clamping, and the markup the reader meets.

EVERY CASE HERE PASSES ON ARRIVAL, AND THAT IS RECORDED RATHER THAN HIDDEN. The ported
shell already satisfies this slice, exactly as it already satisfied slice 10, whose own
contract file records the same fact. The value of the file is that it fires when a
claim breaks, and not that it was red once. That was measured, one claim at a time:
twenty violations were staged in `DiagramTiles.tsx`, each breaking a single invariant,
and each one fired the case that owns it. Three more staged the claims that read beyond
that file — the import removed from `panels/Intent.tsx`, one control renamed in the
built `index.html`, and the module renamed away — and each of those fired too. Every
case in this file therefore has a violation that reddens it.

Run with: uv run --with pytest pytest tests/test_diagram_tiles.py -v
"""
from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWER = REPO_ROOT / "plugins" / "artifact" / "viewer"
SHIPPED_VIEWER = VIEWER / "index.html"
SHELL = VIEWER / "src" / "shell"

TILES = SHELL / "DiagramTiles.tsx"
INTENT_PANEL = SHELL / "panels" / "Intent.tsx"
ARCHITECTURE_PANEL = SHELL / "panels" / "Architecture.tsx"

# The two ends the engineer asked for, as multiples of the fitted size.
ZOOM_LOW = 0.5
ZOOM_HIGH = 4.0
# The step the dialog opens on: the drawing fitted to the body.
FIT = 1.0

# The three states one level's drawing moves through.
DRAWN_STATES = ("pending", "ready", "failed")

# The controls the dialog carries, by the accessible name of each.
DIALOG_CONTROLS = ("Zoom out", "Zoom in", "Reset to fit", "Close the drawing")


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
        "The tiles, the dialog, the zoom, and the source fallback read their parts "
        "from this file."
    )
    return path.read_text(encoding="utf-8", errors="replace")


def tiles_text(claim: str) -> str:
    """The tiles module's compacted text, or a marker that names the missing file.

    One case owns the claim that the module lands at the path `epic-E5-design.md`
    names. Every other case reads the module for its own content, so a file that is
    absent then fails on the content that is missing rather than on the file name
    alone. A case that failed because a file was absent would prove nothing about the
    tiles.
    """
    if not TILES.is_file():
        return f"/* {TILES.relative_to(REPO_ROOT).as_posix()} does not exist */"
    return compact(TILES.read_text(encoding="utf-8", errors="replace"))


def assert_has(haystack: str, needle: str, claim: str) -> None:
    """Fail unless `needle` is in `haystack`, and show the needle that was tried."""
    wanted = compact(needle)
    assert wanted in haystack, (
        f"{claim}: {wanted!r} appears nowhere in the sources this claim reads.\n"
        "  Every run of space is dropped before the search, so formatting is not the "
        "cause."
    )


def assert_any(haystack: str, needles: tuple[str, ...], claim: str) -> None:
    """Fail unless one of `needles` is in `haystack`, and name every one tried."""
    tried = [compact(needle) for needle in needles]
    for needle in tried:
        if needle in haystack:
            return
    assert False, (
        f"{claim}: none of {tried} appears in the sources this claim reads.\n"
        "  Every run of space is dropped before the search, so formatting is not the "
        "cause."
    )


def array_literal(text: str, name: str, claim: str) -> list[str]:
    """The numbers in one `const <name> = [ ... ]` literal, as strings.

    A zoom step is a number the reader sees as a whole percentage, so the ends are
    read as numbers rather than as the spelling of a line. A reformat, or a step
    appended at either end, still reads.
    """
    found = re.search(rf"{re.escape(name)}\s*=\s*\[([^\]]*)\]", text)
    assert found is not None, (
        f"{claim}: the sources carry no `{name} = [ ... ]` literal, so the steps this "
        "claim reads are gone."
    )
    return [part.strip() for part in found.group(1).split(",") if part.strip()]


def shipped_text(claim: str) -> str:
    """The built viewer's compacted text, or a marker that names the missing file.

    Since slice 3 the built `index.html` is the file that ships, so a control that
    reaches a reader is in this file and not only in the source that produced it.
    """
    if not SHIPPED_VIEWER.is_file():
        return f"/* {SHIPPED_VIEWER.relative_to(REPO_ROOT).as_posix()} does not exist */"
    return compact(SHIPPED_VIEWER.read_text(encoding="utf-8", errors="replace"))


# --------------------------------------------------------------- the tile itself


def test_the_module_lands_where_the_epic_design_names_it() -> None:
    """`epic-E5-design.md` fixes `src/shell/DiagramTiles.tsx` as the tiles' one home."""
    claim = "the tiles module's own path and exports"
    text = tiles_text(claim)

    assert TILES.is_file(), (
        f"{claim}: {TILES.relative_to(REPO_ROOT).as_posix()} does not exist. "
        "`epic-E5-design.md`'s Files Touched fixes this path for the tiles, the "
        "dialog, the zoom, and the offline source fallback."
    )
    assert_has(text, "export function DiagramTiles(", claim)
    assert_has(text, "export async function loadMermaid(", claim)
    assert_has(text, "export function uncap(", claim)
    assert_has(text, 'export type Theme = "light" | "dark"', claim)


def test_every_recorded_level_gets_one_tile() -> None:
    """A tile per level the caller names, each one carrying its level and its word.

    The level number is how a reader and the dialog agree on which drawing is which,
    and the one word is the grammar's own name rather than the grammar's keyword.
    """
    claim = "one tile per recorded level"
    text = tiles_text(claim)

    assert_has(text, "levels.map((level) => {", claim)
    assert_has(text, "<DiagramTile", claim)
    assert_has(text, "const label = labelFor(source);", claim)
    assert_has(text, "label={label}", claim)
    assert_has(text, "aria-label={`Open the ${label} drawing for level ${level}`}", claim)


def test_the_tile_scales_the_drawing_to_its_box() -> None:
    """The miniature is the drawing at its own size, under a scale that fits the box.

    A drawing laid out for a narrow box composes its labels for that box and then
    shrinks to nothing legible. So the tile measures both the box and the drawing and
    scales by their ratio, and it never scales a small drawing up.
    """
    claim = "the miniature's measured scale"
    text = tiles_text(claim)

    assert_has(text, "const natural = drawing.offsetWidth;", claim)
    assert_has(text, "setScale(Math.min(1, box.clientWidth / natural))", claim)
    assert_has(text, "transform: `scale(${scale})`", claim)
    # A layout measure, and not the scaled rect: an ancestor's transform does not
    # change `offsetWidth`, and `getBoundingClientRect` would report the scaled width.
    assert_has(text, "drawing.offsetWidth", claim)


def test_the_tile_keeps_the_drawing_inside_one_press_target() -> None:
    """A press anywhere in the tile opens it, so the drawing takes no pointer of its own."""
    claim = "the tile's one press target"
    text = tiles_text(claim)

    assert_has(text, 'className="pointer-events-none block w-max"', claim)
    assert_has(text, "onClick={onOpen}", claim)


def test_the_tile_uncaps_the_drawing_before_it_draws_it() -> None:
    """Mermaid caps most grammars with `width="100%"` beside a pixel `max-width`.

    A drawing that keeps that cap is laid out for the tile's width, so the cap becomes
    the size: the width attribute takes the pixel value the style carried, and the cap
    comes off. A bundle may carry any grammar, so this is normalised here rather than
    through one config key per kind.
    """
    claim = "the drawing's uncapped size"
    text = tiles_text(claim)

    assert_has(text, r'svg.match(/max-width:\s*([\d.]+)px/)', claim)
    assert_has(text, 'svg.replace(/width="100%"/, `width="${capped[1]}"`)', claim)
    assert_has(text, 'uncap(result.svg)', claim)


# ----------------------------------------------------- a press opens it whole


def test_a_press_opens_the_dialog() -> None:
    """One level is open at a time, and the tile's press is what sets it."""
    claim = "the press that opens the drawing"
    text = tiles_text(claim)

    assert_has(text, "const [open, setOpen] = useState<string | null>(null);", claim)
    assert_has(text, "onOpen={() => setOpen(level)}", claim)
    assert_has(text, "{open !== null ? (", claim)
    assert_has(text, "<DiagramDialog", claim)
    assert_has(text, "level={open}", claim)
    assert_has(text, "onClose={() => setOpen(null)}", claim)


def test_the_dialog_is_a_modal_that_names_its_drawing() -> None:
    """A dialog and not a popover, portalled to the body, and named by word and level.

    A popover anchored to a small tile would overflow the viewport before the drawing
    was legible, so the pattern is the record Sheet's: a portal, a modal role, and an
    accessible name a reader can hear.
    """
    claim = "the dialog's modal shape"
    text = tiles_text(claim)

    assert_has(text, "createPortal(", claim)
    assert_has(text, "document.body,", claim)
    assert_has(text, 'role="dialog"', claim)
    assert_has(text, 'aria-modal="true"', claim)
    assert_has(text, "aria-label={`${label} drawing, level ${level}`}", claim)


def test_the_dialog_shows_the_whole_drawing_on_both_axes() -> None:
    """The dialog's body owns the scroll, so a drawing larger than the viewport is
    reachable in full, in both directions."""
    claim = "the dialog's own scroll"
    text = tiles_text(claim)

    assert_has(text, "overflow-auto", claim)
    assert_has(text, "overscroll-contain", claim)
    assert_has(text, "w-max origin-top-left", claim)


# ------------------------------------------- the zoom, from 50 to 400 percent


def test_the_zoom_spans_fifty_to_four_hundred_percent() -> None:
    """The engineer's two ends, as the first and last step of one list.

    A step list rather than a multiplying factor, so every reading is a whole number a
    reader recognises, and 100 percent is the drawing fitted to the dialog.
    """
    claim = "the zoom's two ends"
    text = tiles_text(claim)

    steps = [float(value) for value in array_literal(TILES.read_text(encoding="utf-8"), "ZOOM_STEPS", claim)]
    assert steps[0] == ZOOM_LOW, (
        f"{claim}: the lowest step is {steps[0]}, and the engineer asked for "
        f"{ZOOM_LOW} ({ZOOM_LOW:.0%})."
    )
    assert steps[-1] == ZOOM_HIGH, (
        f"{claim}: the highest step is {steps[-1]}, and the engineer asked for "
        f"{ZOOM_HIGH} ({ZOOM_HIGH:.0%})."
    )
    assert FIT in steps, (
        f"{claim}: no step is {FIT}, so 100 percent would not be one of the readings."
    )
    assert steps == sorted(steps), f"{claim}: the steps are not in ascending order: {steps}"


def test_the_dialog_opens_on_the_fitted_step() -> None:
    """A reader meets the whole drawing first, and zooms from there."""
    claim = "the step the dialog opens on"
    text = tiles_text(claim)

    assert_has(text, "const FIT_STEP = ZOOM_STEPS.indexOf(1);", claim)
    assert_has(text, "useState(FIT_STEP)", claim)


def test_the_zoom_reading_is_a_whole_percentage() -> None:
    """Every reading is a whole number with a percent sign, and one reading is live.

    A reader who presses a zoom control expects the number to change in place, so the
    reading is announced rather than found on the next page load.
    """
    claim = "the zoom's reading"
    text = tiles_text(claim)

    assert_has(text, "const percent = Math.round(ZOOM_STEPS[step] * 100);", claim)
    assert_has(text, "{percent}%", claim)
    assert_has(text, 'aria-live="polite"', claim)


def test_the_zoom_scales_the_drawing_and_not_the_body() -> None:
    """The zoom multiplies the fitted scale, and it sizes the drawing's box.

    A transform would leave the layout size alone and put the rest of a zoomed drawing
    out of reach, so the box carries the transform and the body keeps its scroll.
    """
    claim = "what the zoom scales"
    text = tiles_text(claim)

    assert_has(text, "const scale = fit * ZOOM_STEPS[step];", claim)
    assert_has(text, "const [fit, setFit] = useState(1);", claim)
    assert_has(text, "setFit(Math.min(1, body.clientWidth / natural))", claim)


def test_the_zoom_ends_state_that_they_cannot_act() -> None:
    """A control at either end is disabled, and it says so to a reader who cannot see it.

    `disabled` stops the press, and `aria-disabled` states the same thing to a reader
    the styling does not reach. Both are set from the same condition, so the two never
    disagree.
    """
    claim = "the zoom's two ends"
    text = tiles_text(claim)

    assert_has(text, "disabled={step === 0}", claim)
    assert_has(text, "disabled={step === ZOOM_STEPS.length - 1}", claim)
    assert_has(text, "setStep((current) => Math.max(0, current - 1))", claim)
    assert_has(text, "setStep((current) => Math.min(ZOOM_STEPS.length - 1, current + 1))", claim)
    assert_has(text, "aria-disabled={disabled}", claim)


def test_the_zoom_returns_to_the_fitted_step() -> None:
    """One control puts the drawing back to fitted, and it is disabled while it is there."""
    claim = "the reset-to-fit control"
    text = tiles_text(claim)

    assert_has(text, 'label="Reset to fit"', claim)
    assert_has(text, "disabled={step === FIT_STEP}", claim)
    assert_has(text, "setStep(FIT_STEP)", claim)


# ------------------------------------------ Escape, the backdrop, and the close


def test_escape_closes_the_drawing() -> None:
    """Escape closes the dialog, wherever the press happened, and the listener goes
    with the dialog rather than staying on the window."""
    claim = "the Escape that closes the drawing"
    text = tiles_text(claim)

    assert_has(text, 'window.addEventListener("keydown", onKey)', claim)
    assert_has(text, 'if (event.key === "Escape") onClose();', claim)
    assert_has(text, 'return () => window.removeEventListener("keydown", onKey);', claim)


def test_the_backdrop_closes_only_a_press_that_missed_the_dialog() -> None:
    """The backdrop closes the drawing, and a press inside the dialog does not.

    The guard is the event's own target against the element that carries the handler,
    so a press that landed on the dialog or on any of its controls is not a backdrop
    press.
    """
    claim = "the backdrop's own press"
    text = tiles_text(claim)

    assert_has(text, "onMouseDown={(event) => {", claim)
    assert_has(text, "if (event.target === event.currentTarget) onClose();", claim)
    assert_has(text, 'role="presentation"', claim)


def test_the_close_control_closes_the_drawing_and_is_forty_four_pixels() -> None:
    """A visible close control, at the smallest target this shell allows, with a name."""
    claim = "the dialog's close control"
    text = tiles_text(claim)

    assert_has(text, 'aria-label="Close the drawing"', claim)
    assert_has(text, "size-11", claim)
    assert_has(text, "onClick={onClose}", claim)


# ------------------------------------------------- a failed render, and its source


def test_a_level_is_pending_ready_or_failed() -> None:
    """Three states, and no fourth. A tile that could not draw has a state of its own."""
    claim = "the three states of one level's drawing"
    text = tiles_text(claim)

    for state in DRAWN_STATES:
        assert_has(text, f'state: "{state}"', claim)
    assert_has(text, 'const state = drawn[level] ?? { state: "pending" as const };', claim)


def test_a_failed_render_states_the_failure_on_the_tile() -> None:
    """A tile keeps one line that says the drawing did not load.

    With the source block gone from the tile, a failed render would otherwise leave a
    reader an empty box. The failure is stated, and the tile stays pressable so the
    source is one press away.
    """
    claim = "the tile's own failure line"
    text = tiles_text(claim)

    assert_has(text, 'The drawing did not load', claim)
    assert_has(text, 'drawn.state === "failed" ? (', claim)


def test_a_failed_render_shows_the_authored_source_in_the_dialog() -> None:
    """The authored `.mmd` text, in a `pre`, and a sentence that says why it is there.

    The dialog's source block is the only place the source survives in the working
    shell, and it is the documented offline fallback rather than a toggle: the working
    case shows no source at all.
    """
    claim = "the authored source in the dialog"
    text = tiles_text(claim)

    assert_has(text, "source: string;", claim)
    assert_has(text, "source={sources[open] ?? \"\"}", claim)
    assert_has(text, "{source}</pre>", claim)
    assert_has(text, "The render failed, so the source is here", claim)


def test_a_failed_load_fails_every_tile_of_the_section() -> None:
    """No runtime means no drawing for any level, and each tile says so.

    The runtime loads once for the whole section, so a load that failed is a fact about
    every tile rather than about the first one only.
    """
    claim = "the failed runtime"
    text = tiles_text(claim)

    assert_has(text, "api = await loadMermaid(theme);", claim)
    assert_any(
        text,
        (
            'settle(level, { state: "failed", message: reason(error) });\n        }\n        return;',
            "for (const level of levels) settle(level, { state: \"failed\",",
        ),
        claim,
    )
    assert_has(text, "securityLevel: \"strict\"", claim)


# --------------------------------------------------------- where the tiles reach


def test_the_two_levels_mount_the_tiles_over_the_record_they_hold() -> None:
    """Intent draws the container level and Architecture the mechanism levels.

    A tile that no panel mounts shows a reader nothing, so this is the reach rather
    than the tile's own parts. The caller chooses the levels, because a bundle's first
    drawing names the surfaces and the people who use them, which answers the Intent
    level, and the levels after it are mechanism.
    """
    claim = "the tiles' two homes"
    intent = compact(read(INTENT_PANEL, claim))
    architecture = compact(read(ARCHITECTURE_PANEL, claim))

    assert_has(intent, "import { DiagramTiles } from \"../DiagramTiles\";", claim)
    assert_has(intent, "<DiagramTiles levels={levels} sources={sources} theme={theme} />", claim)
    assert_has(architecture, "import { DiagramTiles } from \"../DiagramTiles\";", claim)
    assert_has(architecture, "<DiagramTiles levels={levels} sources={sources} theme={theme} />", claim)


def test_the_shipped_viewer_carries_the_dialogs_controls() -> None:
    """The built file is what ships, so every control of the dialog is in it.

    Since slice 3 the build writes `plugins/artifact/viewer/index.html`, so a control
    that only the source carries would reach no reader.
    """
    claim = "the dialog's controls in the built viewer"
    text = shipped_text(claim)

    for control in DIALOG_CONTROLS:
        assert_has(text, control, claim)
    assert_has(text, "The drawing did not load", claim)
    assert_has(text, "The render failed, so the source is here", claim)
