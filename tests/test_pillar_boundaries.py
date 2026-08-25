"""Slice-5 regression test: no file under one pillar's skill directory may
resolve a path into another pillar's skill directory.

A pillar is any skill directory that is not in the shared, vendored set
(ADR-0017: `ste-writing` and `mermaid` today). Pillar and shared skill
directories are discovered by finding every `SKILL.md` in the repo, not by
naming `architecture` and `odyssey` directly, so this test keeps working
once slice 6 moves skill directories under separate plugin roots.

Run with: uv run --with pytest pytest tests/ -v
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent

# Skills vendored into every plugin per ADR-0017. A reference to one of
# these from any pillar is safe and must never be flagged.
SHARED_SKILLS = {"ste-writing", "mermaid"}

# The two pillars this slice governs. A pillar name survives slice 6's
# directory move, even though its path does not, so this set names skills,
# never paths. A third skill (for example `collaborate-with-user`) may cite
# either pillar today. That crossing is out of scope for this slice and is
# not scanned here.
PILLAR_NAMES = {"architecture", "odyssey"}

# A skill that is neither a pillar nor a vendored shared skill, but is a
# known, legitimate third party that may cite a pillar. `discover_pillars`
# fails loudly on any `SKILL.md` outside PILLAR_NAMES, SHARED_SKILLS, and
# this set, so a new pillar cannot go unscanned by silently landing here.
# Widen this set by hand only for a skill that is deliberately not a
# pillar, never to silence a real finding.
KNOWN_OTHER_SKILLS = {"collaborate-with-user", "artifact", "implement", "orientation"}

# Directories that hold generated or historical content, or tooling that is
# not part of this plugin's own skill catalog, never scanned.
EXCLUDED_DIR_NAMES = {
    ".git",
    ".claude",
    ".cobuilder-architect",
    ".migration-backup",
    "__pycache__",
    "node_modules",
}

# The scan no longer trusts a file extension allowlist (a validator found a
# reference in a `.toml` file slips past an allowlist). Instead it scans
# every file and skips binary content by sniffing the bytes. These suffixes
# are known-binary formats and are skipped without opening the file, purely
# as a speed shortcut. The sniff below is what actually decides "binary",
# not this set, so a mislabeled or unknown binary extension is still safe.
BINARY_SUFFIXES = {
    ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".bmp",
    ".wav", ".mp3", ".ogg", ".flac", ".m4a",
    ".pdf", ".zip", ".gz", ".tar", ".whl",
}


def _is_excluded(path: Path) -> bool:
    return any(part in EXCLUDED_DIR_NAMES for part in path.parts)


def _looks_binary(file_path: Path) -> bool:
    """Detect binary content by sniffing bytes, instead of guessing from a name.

    A null byte in the first chunk of a file almost never appears in real
    text, so its presence is a reliable, cheap binary signal.
    """
    try:
        with file_path.open("rb") as handle:
            chunk = handle.read(8192)
    except OSError:
        return True
    return b"\x00" in chunk


def discover_skill_roots(root: Path) -> dict[str, Path]:
    """Map each skill's directory name to its directory path.

    A skill is any directory containing a `SKILL.md` file. This does not
    hardcode "architecture" or "odyssey" so it survives a later move of
    skill directories under a `plugins/*/skills/` layout, as long as each
    skill still has its own directory holding a `SKILL.md`.
    """
    roots: dict[str, Path] = {}
    for skill_md in root.rglob("SKILL.md"):
        if _is_excluded(skill_md):
            continue
        roots[skill_md.parent.name] = skill_md.parent
    return roots


def assert_no_unscanned_pillar(
    root: Path,
    pillar_names: set[str] = PILLAR_NAMES,
    shared_names: set[str] = SHARED_SKILLS,
    known_other_names: set[str] = KNOWN_OTHER_SKILLS,
) -> None:
    """Fail loudly if a `SKILL.md` exists outside every known name set.

    A new pillar that nobody adds to `PILLAR_NAMES` by hand would otherwise
    go unscanned in silence. This check makes that omission a test failure
    instead. A skill deliberately outside the pillar system (for example
    `collaborate-with-user`) must be named in `known_other_names`, or this
    raises for it too.
    """
    skill_roots = discover_skill_roots(root)
    known = pillar_names | shared_names | known_other_names
    unknown = sorted(set(skill_roots) - known)
    assert not unknown, (
        "Found SKILL.md director(ies) not in PILLAR_NAMES, SHARED_SKILLS, "
        f"or KNOWN_OTHER_SKILLS: {unknown}. Classify each one by hand before "
        "the scan can trust its own coverage."
    )


def _path_shape_pattern(name: str) -> re.Pattern[str]:
    """Build a pattern that matches `name` used as a *skill* path segment.

    Three shapes are a skill reference: `skills/<name>/...`, a `../<name>/...`
    relative reference, and a bare `<name>/...` reference. Each requires a
    `/` immediately after `name`, and requires what follows to keep looking
    like a path (another `/`, or a file extension) rather than stop dead --
    otherwise prose such as "recommended for architecture/tech description"
    would match on ordinary slash-as-"or" usage, with no path meant at all.
    A bare reference also requires that no word character, dot, or `/` sits
    immediately before `name` -- otherwise `docs/architecture/adr/...` or
    `corpus/principles/architecture/...` would match on the word
    "architecture" alone, even though neither path has anything to do with
    the architecture *skill* directory. The `skills/` and `../` prefixed
    forms carry their own unambiguous anchor, so they only need a plain
    non-word boundary before that anchor, and `/` is allowed there
    (`.../skills/<name>/...` is a normal path).
    """
    escaped = re.escape(name)
    looks_like_a_path = r"(?=[A-Za-z0-9_.\-]*(?:/|\.[A-Za-z0-9]+\b))"
    bare = rf"(?<![A-Za-z0-9_./\-]){escaped}/{looks_like_a_path}"
    relative = rf"(?:^|[^A-Za-z0-9_-])\.\./{escaped}/{looks_like_a_path}"
    prefixed = rf"(?:^|[^A-Za-z0-9_-])skills/{escaped}/{looks_like_a_path}"
    # A pillar name is matched without regard to letter case. A path
    # segment written `Beta` or `BETA` names the same skill directory as
    # `beta` on every case-preserving and case-insensitive file system this
    # plugin runs on, so a case-varied reference is a real cross-pillar
    # reference and must be caught the same way.
    return re.compile(rf"(?:{bare})|(?:{relative})|(?:{prefixed})", re.IGNORECASE)


def _normalise_line(line: str) -> str:
    """Normalise a line to one path spelling before the pattern runs.

    A backslash path separator becomes a forward slash, since Windows path
    text and POSIX path text name the same directory. A leading `./` is
    stripped from the start of a path reference, since it means "here" and
    carries no information the pattern needs. Normalising the text first is
    simpler and more reliable than widening the pattern to cover every
    separator and prefix style by itself.
    """
    normalised = line.replace("\\", "/")
    normalised = re.sub(r"(?<![A-Za-z0-9_.])\./", "", normalised)
    return normalised


def find_cross_pillar_references(
    root: Path, pillar_names: set[str] = PILLAR_NAMES, shared_names: set[str] = SHARED_SKILLS
) -> list[tuple[str, int, str]]:
    """Scan every pillar skill's own files for a path into a sibling pillar.

    Returns a list of (relative file path, line number, matched reference)
    tuples, one per violation found. `pillar_names` names the skills that
    must not reference each other. A reference to a name in `shared_names`,
    or to the pillar's own directory, is not a violation. A reference is
    caught whether it is prefixed with `skills/`, is a bare relative path,
    or is a `../` relative path, and whether it sits in prose, a script, or
    any other scanned file type.
    """
    skill_roots = discover_skill_roots(root)
    pillars = {name: path for name, path in skill_roots.items() if name in pillar_names}

    # Only a pillar name or a shared name can ever matter to the verdict, so
    # only build patterns for those. Any other word ending in "/" is not
    # something this check needs to notice.
    candidate_names = set(pillars) | set(shared_names)
    patterns = {name: _path_shape_pattern(name) for name in candidate_names}

    violations: list[tuple[str, int, str]] = []
    for pillar_name, pillar_path in pillars.items():
        for file_path in pillar_path.rglob("*"):
            if file_path.is_dir() or _is_excluded(file_path):
                continue
            if file_path.suffix.lower() in BINARY_SUFFIXES:
                continue
            if _looks_binary(file_path):
                continue
            try:
                text = file_path.read_text(errors="ignore")
            except OSError:
                continue
            for line_no, raw_line in enumerate(text.splitlines(), start=1):
                line = _normalise_line(raw_line)
                for referenced, pattern in patterns.items():
                    if referenced == pillar_name:
                        continue
                    if referenced in shared_names:
                        continue
                    if referenced not in pillars:
                        continue
                    match = pattern.search(line)
                    if match:
                        rel = file_path.relative_to(root)
                        violations.append((str(rel), line_no, match.group(0).lstrip()))
    return violations


def test_no_cross_pillar_references_in_repo() -> None:
    """The whole-repo scan finds zero references from one pillar into another."""
    violations = find_cross_pillar_references(REPO_ROOT)
    assert not violations, (
        "Cross-pillar references found (one pillar skill points into "
        f"another pillar's skill directory): {violations}"
    )


# --- C2: prove the checker tells a vendored reference apart from a
# cross-pillar one, on an isolated fixture, independent of repo content ---


def _write_skill(root: Path, name: str) -> Path:
    skill_dir = root / "skills" / name
    skill_dir.mkdir(parents=True)
    (skill_dir / "SKILL.md").write_text(f"# {name}\n")
    return skill_dir


def test_checker_passes_vendored_and_fails_cross_pillar_reference(tmp_path: Path) -> None:
    """Feed the checker one safe reference and one cross-pillar reference.

    Two synthetic pillars ("alpha", "beta") and one synthetic shared skill
    ("mermaid") prove the verdict is not an artifact of the real repo's
    current file set.
    """
    _write_skill(tmp_path, "alpha")
    _write_skill(tmp_path, "beta")
    _write_skill(tmp_path, "mermaid")

    alpha_dir = tmp_path / "skills" / "alpha"
    (alpha_dir / "references").mkdir()

    safe_file = alpha_dir / "references" / "safe.md"
    safe_file.write_text(
        "See the vendored guide at "
        "`${CLAUDE_PLUGIN_ROOT}/skills/mermaid/references/guide.md`.\n"
    )

    unsafe_file = alpha_dir / "references" / "unsafe.md"
    unsafe_file.write_text(
        "See `skills/beta/references/other.md` for the schema.\n"
    )

    violations = find_cross_pillar_references(
        tmp_path, pillar_names={"alpha", "beta"}, shared_names={"mermaid"}
    )
    violation_files = {v[0] for v in violations}

    assert "skills/alpha/references/unsafe.md" in violation_files, (
        "the cross-pillar reference (alpha -> beta) must be flagged"
    )
    assert "skills/alpha/references/safe.md" not in violation_files, (
        "the vendored reference (alpha -> mermaid) must not be flagged"
    )


def test_checker_ignores_a_pillars_own_self_reference(tmp_path: Path) -> None:
    """A file citing its own pillar's path is not a violation."""
    _write_skill(tmp_path, "alpha")
    alpha_dir = tmp_path / "skills" / "alpha"
    (alpha_dir / "references").mkdir()
    own_file = alpha_dir / "references" / "self.md"
    own_file.write_text("See `skills/alpha/references/other.md`.\n")

    violations = find_cross_pillar_references(tmp_path, pillar_names={"alpha", "beta"})
    assert not violations


def test_widening_does_not_flag_a_bare_word_that_shares_a_pillar_name(tmp_path: Path) -> None:
    """Widening the pattern must not turn an ordinary word or an unrelated
    directory into a false positive.

    "architecture" (here "beta") is an ordinary English word and a common
    path segment outside any skills/ tree, for example `docs/beta/adr/...`
    or `corpus/principles/beta/...`. Neither is a reference to the beta
    *skill* directory, and neither may be flagged.
    """
    _write_skill(tmp_path, "alpha")
    _write_skill(tmp_path, "beta")
    alpha_dir = tmp_path / "skills" / "alpha"
    (alpha_dir / "references").mkdir()
    prose_file = alpha_dir / "references" / "prose.md"
    prose_file.write_text(
        "The beta skill is a fine idea. See docs/beta/adr/0001.md and "
        "corpus/principles/beta/007_thing.yaml for the record. "
        "The word beta also just appears in prose here.\n"
    )

    violations = find_cross_pillar_references(tmp_path, pillar_names={"alpha", "beta"})
    assert not violations, f"ordinary prose and non-skill paths must not be flagged: {violations}"


# --- Four evasions a synthetic harness proved get past the checker before
# this fix. Each test drives find_cross_pillar_references() directly on a
# fixture built for that one evasion, never against the real repository,
# because the point is that the checker itself is now sound. ---


def test_evasion_relative_path_with_no_skills_prefix(tmp_path: Path) -> None:
    """A `../beta/...` reference has no literal `skills/` segment."""
    _write_skill(tmp_path, "alpha")
    _write_skill(tmp_path, "beta")
    alpha_dir = tmp_path / "skills" / "alpha"
    (alpha_dir / "references").mkdir()
    unsafe_file = alpha_dir / "references" / "unsafe.md"
    unsafe_file.write_text("See `../beta/references/other.md` for the schema.\n")

    violations = find_cross_pillar_references(tmp_path, pillar_names={"alpha", "beta"})
    violation_files = {v[0] for v in violations}
    assert "skills/alpha/references/unsafe.md" in violation_files, (
        "a relative ../beta/... reference with no skills/ prefix must be caught"
    )


def test_evasion_bare_path_with_no_skills_prefix(tmp_path: Path) -> None:
    """A bare `beta/...` reference has no `skills/` prefix at all."""
    _write_skill(tmp_path, "alpha")
    _write_skill(tmp_path, "beta")
    alpha_dir = tmp_path / "skills" / "alpha"
    (alpha_dir / "references").mkdir()
    unsafe_file = alpha_dir / "references" / "unsafe.md"
    unsafe_file.write_text("See `beta/references/other.md` for the schema.\n")

    violations = find_cross_pillar_references(tmp_path, pillar_names={"alpha", "beta"})
    violation_files = {v[0] for v in violations}
    assert "skills/alpha/references/unsafe.md" in violation_files, (
        "a bare beta/... reference with no skills/ prefix must be caught"
    )


def test_evasion_reference_inside_a_python_file(tmp_path: Path) -> None:
    """A reference inside a `.py` file falls outside the old .md/.mmd/.txt allowlist."""
    _write_skill(tmp_path, "alpha")
    _write_skill(tmp_path, "beta")
    alpha_dir = tmp_path / "skills" / "alpha"
    (alpha_dir / "scripts").mkdir()
    unsafe_file = alpha_dir / "scripts" / "helper.py"
    unsafe_file.write_text('REFERENCE = "skills/beta/references/other.md"\n')

    violations = find_cross_pillar_references(tmp_path, pillar_names={"alpha", "beta"})
    violation_files = {v[0] for v in violations}
    assert "skills/alpha/scripts/helper.py" in violation_files, (
        "a cross-pillar reference inside a .py file must be caught"
    )


def test_evasion_new_pillar_outside_hardcoded_name_set(tmp_path: Path) -> None:
    """A third pillar the caller's pillar_names set does not know is still caught.

    `find_cross_pillar_references` takes `pillar_names` as a parameter, so a
    caller that keeps it current catches every pillar it names. This test
    proves a reference to (and from) a pillar outside a stale, hardcoded
    two-name set is caught once that pillar is included, and drives
    `assert_no_unscanned_pillar` to prove a stale caller cannot stay silent.
    """
    _write_skill(tmp_path, "alpha")
    _write_skill(tmp_path, "beta")
    _write_skill(tmp_path, "gamma")
    beta_dir = tmp_path / "skills" / "beta"
    (beta_dir / "references").mkdir()
    unsafe_file = beta_dir / "references" / "unsafe.md"
    unsafe_file.write_text("See `skills/gamma/references/other.md` for the schema.\n")

    stale_violations = find_cross_pillar_references(tmp_path, pillar_names={"alpha", "beta"})
    assert not stale_violations, (
        "a stale two-name pillar_names set cannot see the gamma reference, "
        "which is exactly why assert_no_unscanned_pillar must fail loudly"
    )

    current_violations = find_cross_pillar_references(
        tmp_path, pillar_names={"alpha", "beta", "gamma"}
    )
    violation_files = {v[0] for v in current_violations}
    assert "skills/beta/references/unsafe.md" in violation_files, (
        "the beta -> gamma reference must be caught once gamma is a known pillar"
    )

    with pytest.raises(AssertionError):
        assert_no_unscanned_pillar(
            tmp_path, pillar_names={"alpha", "beta"}, shared_names=set(), known_other_names=set()
        )


# --- Four further evasions an independent validator proved get past the
# checker before this fix. Each drives find_cross_pillar_references() on a
# fixture built for that one evasion, never against the real repository. ---


def test_evasion_backslash_path_separator(tmp_path: Path) -> None:
    """A `skills\\beta\\references\\other.md` reference uses Windows separators."""
    _write_skill(tmp_path, "alpha")
    _write_skill(tmp_path, "beta")
    alpha_dir = tmp_path / "skills" / "alpha"
    (alpha_dir / "references").mkdir()
    unsafe_file = alpha_dir / "references" / "unsafe.md"
    unsafe_file.write_text("See skills\\beta\\references\\other.md for the schema.\n")

    violations = find_cross_pillar_references(tmp_path, pillar_names={"alpha", "beta"})
    violation_files = {v[0] for v in violations}
    assert "skills/alpha/references/unsafe.md" in violation_files, (
        "a backslash-separated skills\\beta\\... reference must be caught"
    )


def test_evasion_dot_slash_prefix(tmp_path: Path) -> None:
    """A `./beta/references/other.md` reference is an ordinary relative path."""
    _write_skill(tmp_path, "alpha")
    _write_skill(tmp_path, "beta")
    alpha_dir = tmp_path / "skills" / "alpha"
    (alpha_dir / "references").mkdir()
    unsafe_file = alpha_dir / "references" / "unsafe.md"
    unsafe_file.write_text("See ./beta/references/other.md for the schema.\n")

    violations = find_cross_pillar_references(tmp_path, pillar_names={"alpha", "beta"})
    violation_files = {v[0] for v in violations}
    assert "skills/alpha/references/unsafe.md" in violation_files, (
        "a ./beta/... reference must be caught"
    )


def test_evasion_mixed_case_pillar_name(tmp_path: Path) -> None:
    """A `skills/Beta/references/other.md` reference varies the pillar's letter case."""
    _write_skill(tmp_path, "alpha")
    _write_skill(tmp_path, "beta")
    alpha_dir = tmp_path / "skills" / "alpha"
    (alpha_dir / "references").mkdir()
    unsafe_file = alpha_dir / "references" / "unsafe.md"
    unsafe_file.write_text("See skills/Beta/references/other.md for the schema.\n")

    violations = find_cross_pillar_references(tmp_path, pillar_names={"alpha", "beta"})
    violation_files = {v[0] for v in violations}
    assert "skills/alpha/references/unsafe.md" in violation_files, (
        "a mixed-case skills/Beta/... reference must be caught"
    )


def test_evasion_extension_outside_the_old_allowlist(tmp_path: Path) -> None:
    """A reference inside a `.toml` file falls outside the old suffix allowlist."""
    _write_skill(tmp_path, "alpha")
    _write_skill(tmp_path, "beta")
    alpha_dir = tmp_path / "skills" / "alpha"
    (alpha_dir / "config").mkdir()
    unsafe_file = alpha_dir / "config" / "settings.toml"
    unsafe_file.write_text('reference = "skills/beta/references/other.md"\n')

    violations = find_cross_pillar_references(tmp_path, pillar_names={"alpha", "beta"})
    violation_files = {v[0] for v in violations}
    assert "skills/alpha/config/settings.toml" in violation_files, (
        "a cross-pillar reference inside a .toml file must be caught"
    )


def test_binary_file_is_skipped_without_error(tmp_path: Path) -> None:
    """A binary file that happens to embed a pillar-shaped byte string does not crash the scan.

    Binary content is skipped by sniffing its bytes, not by trusting its
    extension, so this proves the sniff itself, not the suffix set.
    """
    _write_skill(tmp_path, "alpha")
    _write_skill(tmp_path, "beta")
    alpha_dir = tmp_path / "skills" / "alpha"
    (alpha_dir / "assets").mkdir()
    binary_file = alpha_dir / "assets" / "data.bin"
    binary_file.write_bytes(b"\x00\x01skills/beta/references/other.md\x00\x02")

    violations = find_cross_pillar_references(tmp_path, pillar_names={"alpha", "beta"})
    violation_files = {v[0] for v in violations}
    assert "skills/alpha/assets/data.bin" not in violation_files, (
        "binary content must be skipped, not scanned as text"
    )


def test_assert_no_unscanned_pillar_passes_on_the_real_repo() -> None:
    """The repo's own skill set is fully classified today.

    This also proves the check does not turn `collaborate-with-user` -- a
    real third skill that is neither a pillar nor vendored, and that
    legitimately cites the architecture skill -- into a false failure.
    """
    assert_no_unscanned_pillar(REPO_ROOT)
