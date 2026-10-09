"""The narration level named `intent`, in every reader of the key.

Cobuilder-viewer slice 15. ADR-0029 decides that the narration level `landscape`
becomes `intent`, as a real rename and not a display label. `00-status.md` pins the
rename to this slice: "The rename of `landscape` to `intent` runs with slice 15's
parity work."

WHY THE RENAME TRAVELS WITH THIS SLICE. The change's account reads one bundle level
behind each of its four rows, and the row named Intent reads the level the bundle
keys `landscape` today. The record, the audio filename, the authoring guide, and
the screen would then disagree about one thing's name. This repository's rule is
one name for one thing.

THE KEY REACHES AN AUDIO FILENAME. `data/audio/pr{N}_{level_key}.wav` is the path,
so the rename moves a paid, authored file and never re-records it. ADR-0029 names
six places: the level keys in `story.json` and a design's `narrative.json`,
`LEVEL_KEYS` in `shared/verify_bundle.py`, the authoring level list in
`plugins/pr/skills/odyssey/references/story-mode.md`, the viewer's level labels in
`src/shell/readiness.ts`, and the audio files themselves. Two more readers carry
their own copy of the key list, `shared/migrate_bundle.py` and
`plugins/pr/scripts/generate_prompts.py`, so each takes the new key too.
`epic-E7-design.md` adds the viewer's bundle types and the self-bundle's story
data to that list.

THE WORD `landscape` IS NOT THE KEY. A diff, a narration sentence, or a decision
record may use the word, and their history must not change. Every case below reads
a level *key*, in the file that holds it, and never the word alone.

Run with: uv run --with pytest pytest tests/test_intent_level_key.py -v
"""
from __future__ import annotations

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
VIEWER = REPO_ROOT / "plugins" / "artifact" / "viewer"
SELF_BUNDLE = REPO_ROOT / ".cobuilder-architect" / "self"
DESIGNS_SOURCE = REPO_ROOT / "docs" / "architecture" / "designs"

OLD_KEY = "landscape"
NEW_KEY = "intent"

# The four keys, in the bundle's own order, as each code reader writes its list. The
# list carries no surrounding bracket, because one reader writes a list and another
# writes a tuple.
NEW_KEY_LIST = '"intent", "problem_solution", "architecture", "file_changes"'
OLD_KEY_LIST = '"landscape", "problem_solution", "architecture", "file_changes"'


def compact(text: str) -> str:
    """`text` with every run of space removed, so a reformat never fails a case."""
    return re.sub(r"\s+", "", text)


def read(path: Path, claim: str) -> str:
    """The text of `path`, or a failure that names the file the claim needs."""
    assert path.is_file(), (
        f"{claim}: {path.relative_to(REPO_ROOT).as_posix()} does not exist"
    )
    return path.read_text(encoding="utf-8", errors="replace")


def js_payload(path: Path, prefix: str, claim: str) -> object:
    """The JSON object a bundle script assigns to its window global.

    A bundle writes `window.STORY = {...};`, and this reads that object. The
    projection is the bundle's own, so a key the bundle still holds under the old
    name is a key the shipped page cannot find.
    """
    text = read(path, claim).strip()
    at = text.find(prefix)
    assert at >= 0, (
        f"{claim}: {path.relative_to(REPO_ROOT).as_posix()} carries no {prefix!r}"
    )
    return json.loads(text[at + len(prefix) :].strip().rstrip(";").strip())


def level_key_lists(value: object, path: str = "") -> list[str]:
    """Every key named `landscape` anywhere in `value`, with its own path.

    The level keys sit under `levels` in a pull request's timeline entry and under
    `narrative` in a design's record, and a design may wrap them one level deeper.
    This walks every object, so a key is found wherever the bundle puts it.
    """
    found: list[str] = []
    if isinstance(value, dict):
        for key, item in value.items():
            if key == OLD_KEY:
                found.append(f"{path}/{key}")
            found.extend(level_key_lists(item, f"{path}/{key}"))
    elif isinstance(value, list):
        for position, item in enumerate(value):
            found.extend(level_key_lists(item, f"{path}[{position}]"))
    return found


# ------------------------------------------------- the three code key lists


def test_verify_bundle_names_the_level_intent():
    """`shared/verify_bundle.py` holds the bundle's level keys, and takes `intent`.

    This list is the gate the whole family reads: a bundle whose key disagrees with
    it fails verification. ADR-0029 names this file first among the six places.
    """
    claim = "shared/verify_bundle.py names the narration level `intent`"
    haystack = compact(read(REPO_ROOT / "shared" / "verify_bundle.py", claim))
    assert compact(NEW_KEY_LIST) in haystack, (
        f"{claim}: LEVEL_KEYS does not read {NEW_KEY_LIST}.\n"
        "  ADR-0029 fixes the level's only key as `intent`. The old list was "
        f"{OLD_KEY_LIST}."
    )


def test_migrate_bundle_names_the_level_intent():
    """`shared/migrate_bundle.py` carries its own copy of the level key list.

    ADR-0029 names it as a second reader of the same key, so it takes the new name
    too. This case reads the level key list alone, because a migration ladder for an
    older bundle legitimately names the old key when it reads it.
    """
    claim = "shared/migrate_bundle.py names the narration level `intent`"
    haystack = compact(read(REPO_ROOT / "shared" / "migrate_bundle.py", claim))
    assert compact(NEW_KEY_LIST) in haystack, (
        f"{claim}: its LEVEL_KEYS does not read {NEW_KEY_LIST}.\n"
        "  ADR-0029 names migrate_bundle.py as a second reader of the level key, and "
        "epic-E7-design.md lists it under Files Touched."
    )


def test_generate_prompts_names_the_level_intent():
    """`plugins/pr/scripts/generate_prompts.py` holds the authoring level list.

    The script writes one image prompt per level, so its level numbers and its level
    keys are one list. ADR-0029 names it as the third reader of the same key.
    """
    claim = "plugins/pr/scripts/generate_prompts.py names the narration level `intent`"
    path = REPO_ROOT / "plugins" / "pr" / "scripts" / "generate_prompts.py"
    haystack = compact(read(path, claim))
    assert compact(NEW_KEY_LIST) in haystack, (
        f"{claim}: LEVEL_KEYS does not read {NEW_KEY_LIST}.\n"
        "  ADR-0029 names generate_prompts.py as a reader of the level key, and the "
        "key reaches the prompt it writes."
    )


# ------------------------------------------------------- the authoring guide


def test_the_authoring_guide_names_the_level_intent():
    """`story-mode.md` is the authoring guide for a narration level.

    Its level table, its audio section, and its per-level guidance each name the
    level. ADR-0029 lists the guide among the six places the rename reaches, so no
    part of it still calls the level by the old name.
    """
    claim = "story-mode.md names the narration level `intent`"
    path = (
        REPO_ROOT
        / "plugins"
        / "pr"
        / "skills"
        / "odyssey"
        / "references"
        / "story-mode.md"
    )
    text = read(path, claim)
    assert f"`{NEW_KEY}`" in text or f" {NEW_KEY} " in text, (
        f"{claim}: the guide carries no {NEW_KEY!r} level name.\n"
        "  ADR-0029: the authoring level list in story-mode.md takes the new key."
    )
    stale = [
        line.strip()
        for line in text.splitlines()
        if OLD_KEY in line
    ]
    assert not stale, (
        f"{claim}: {len(stale)} line(s) still name the level {OLD_KEY!r}:\n"
        + "\n".join(f"  {line}" for line in stale[:6])
        + "\n  The guide authors this level, so a reader who follows it would write the "
        "old key into a bundle."
    )


# ------------------------------------------------------------- the viewer


def test_the_viewers_level_list_names_intent():
    """`src/shell/readiness.ts` holds the viewer's level labels.

    ADR-0029 names this list as one of the six places. The shipped shell reads a
    design's narration through it, so a list that still reads `landscape` finds no
    level once the records take the new key.
    """
    claim = "the viewer's level list names the narration level `intent`"
    haystack = compact(read(VIEWER / "src" / "shell" / "readiness.ts", claim))
    assert compact(f'key: "{NEW_KEY}", label: "Intent"') in haystack, (
        f"{claim}: the level list carries no {NEW_KEY!r} entry.\n"
        "  ADR-0029: the viewer's level labels in src/shell/readiness.ts take the new "
        "key."
    )
    assert compact(f'key: "{OLD_KEY}"') not in haystack, (
        f"{claim}: the level list still carries a {OLD_KEY!r} entry.\n"
        "  One name for one thing: the level is named once in this list."
    )


# --------------------------------------------------------- the self-bundle


def test_the_self_bundle_story_names_the_level_intent():
    """The self-bundle's story carries the new level key, in both of its files.

    `data/story.json` is the source of truth for the shape, and `data/story.js` is
    the sibling script the page loads. A page that asks for `intent` and a file that
    answers `landscape` renders a level with no narration.

    The word `landscape` may stand in a narration sentence or in a diff. This case
    reads level keys alone.
    """
    claim = "the self-bundle's story keys the narration level `intent`"
    for name in ("story.json", "story.js"):
        path = SELF_BUNDLE / "data" / name
        if path.suffix == ".js":
            story = js_payload(path, "window.STORY =", claim)
        else:
            story = json.loads(read(path, claim))
        stale = level_key_lists(story)
        assert not stale, (
            f"{claim}: {path.relative_to(REPO_ROOT).as_posix()} still holds "
            f"{len(stale)} level key(s) named {OLD_KEY!r}: {stale[:4]}\n"
            "  The key reaches the audio filename, so the file's name moves with it. "
            "ADR-0029: the bytes stay as they are, and nobody records a paid file "
            "again."
        )
        entries = [
            entry
            for entry in story.get("timeline", [])
            if isinstance(entry, dict) and "levels" in entry
        ]
        assert entries, (
            f"{claim}: {name} holds no timeline entry with a `levels` object, so this "
            "case read nothing. The self-bundle holds narrated pull requests."
        )
        for entry in entries:
            levels = entry.get("levels") or {}
            assert levels, f"{claim}: pull request {entry.get('pr')} holds no levels"


def test_the_self_bundle_audio_file_follows_the_key():
    """The level's audio file takes the new name, and the old name is gone.

    `data/audio/pr{N}_{level_key}.wav` is the path the bundle serves and the viewer
    requests, so the key's rename is a file move. The self-bundle's pull request 2 is
    the one narrated change it holds, and ADR-0029 names its three files as the sharp
    edge of this rename.
    """
    claim = "the self-bundle's audio file name follows the level key"
    audio = SELF_BUNDLE / "data" / "audio"
    assert audio.is_dir(), (
        f"{claim}: {audio.relative_to(REPO_ROOT).as_posix()} does not exist"
    )
    wanted = audio / f"pr2_{NEW_KEY}.wav"
    old = audio / f"pr2_{OLD_KEY}.wav"
    assert wanted.is_file(), (
        f"{claim}: {wanted.name} is absent.\n"
        "  ADR-0029: the rename moves each audio file to its new name and must not "
        "re-record one. The file's bytes stay as they are."
    )
    assert not old.exists(), (
        f"{claim}: {old.name} is still present beside the new name.\n"
        "  A move leaves one file, and a second copy of a paid asset is not a move."
    )


def test_the_self_bundle_designs_name_the_level_intent():
    """The self-bundle's projected design records carry the new level key.

    `data/designs.js` is `shared/build_index.py`'s projection of the designs under
    `docs/`. The shipped shell reads it, so a projection that still keys the level
    `landscape` while the viewer asks for `intent` shows every design as un-narrated.
    """
    claim = "the self-bundle's design records key the narration level `intent`"
    path = SELF_BUNDLE / "data" / "designs.js"
    designs = js_payload(path, "window.DESIGNS =", claim)
    stale = level_key_lists(designs)
    assert not stale, (
        f"{claim}: {path.relative_to(REPO_ROOT).as_posix()} still holds {len(stale)} "
        f"level key(s) named {OLD_KEY!r}: {stale[:4]}\n"
        "  Rebuild the projection after the design records take the new key: "
        "`uv run shared/build_index.py` writes this file from docs/."
    )


def test_the_design_records_name_the_level_intent():
    """Every design record under `docs/` keys its narration level `intent`.

    A design's `narrative.json` is authored source, and ADR-0029 names it among the
    six places. The viewer reads these records through the projection, and the
    program's account renders the level this key names.
    """
    claim = "the design records key the narration level `intent`"
    files = sorted(DESIGNS_SOURCE.glob("*/narrative.json"))
    assert files, (
        f"{claim}: no narrative.json sits under "
        f"{DESIGNS_SOURCE.relative_to(REPO_ROOT).as_posix()}"
    )
    stale: list[str] = []
    named = 0
    for path in files:
        record = json.loads(read(path, claim))
        found = level_key_lists(record)
        if found:
            stale.append(f"{path.relative_to(REPO_ROOT).as_posix()}: {found}")
        elif NEW_KEY in record or NEW_KEY in (record.get("levels") or {}):
            named += 1
    assert not stale, (
        f"{claim}: {len(stale)} design record(s) still key a level {OLD_KEY!r}:\n"
        + "\n".join(f"  {row}" for row in stale)
        + "\n  ADR-0029: the level keys in a design's narrative.json take the new name. "
        "The viewer reads these records through the projection, so an old key here "
        "shows a narrated design as un-narrated."
    )
    assert named > 0, (
        f"{claim}: no design record keys a level {NEW_KEY!r}.\n"
        "  The rename replaces a key rather than removing one."
    )
