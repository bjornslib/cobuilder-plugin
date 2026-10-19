"""Docs guard for the tracker port: structure and references, never wording.

Checks 1 to 7 of slice 17, epic E4 (beads-storage).

Scope of the `bd` scan (check 3): `plugins/` and `shared/`. It skips
`shared/tracker_port/`, `shared/tracker-adapter-beads.md`, and symlinks (each
plugin links `shared`, so the scan would count a file twice). It skips `docs/`
on purpose: an ADR or a design may describe a `bd` command as history. `tests/`
and its fixtures are skipped too, so this file may name the command.
"""

from __future__ import annotations

import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[1]
PLUGINS = REPO / "plugins"
SHARED = REPO / "shared"

# Reuse the one structural definition of "names a bd command".
_spec = importlib.util.spec_from_file_location(
    "_tracker_usage_doc_for_docs_test", REPO / "tests" / "test_tracker_usage_doc.py"
)
assert _spec and _spec.loader
_mod = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = _mod
_spec.loader.exec_module(_mod)
BD_COMMAND: re.Pattern[str] = _mod.BD_COMMAND

FENCE = re.compile(r"^\s*(```+|~~~+)\s*([^\n`]*)$")
OUTPUT_INFO = ("output", "text", "txt", "json")
OPERATION = re.compile(r"tracker\.py[ \t]+([a-z][a-z-]*)")
CODE_SPAN = re.compile(r"`([^`\n]+)`")

MAIN_SKILLS = {
    "architect": "plugins/architect/skills/architecture/SKILL.md",
    "implement": "plugins/implement/skills/build/SKILL.md",
    "pr": "plugins/pr/skills/odyssey/SKILL.md",
    "artifact": "plugins/artifact/skills/cobuilder-artifacts/SKILL.md",
}
SKIP_DIRS = {"node_modules", "__pycache__", ".git", "dist"}
TEXT_SUFFIXES = {".md", ".json", ".py", ".ts", ".tsx", ".sh", ".yaml", ".yml", ".toml", ".txt"}


def _operations() -> set[str]:
    out = subprocess.run(
        [sys.executable, str(SHARED / "tracker.py"), "--help"],
        capture_output=True, text=True, check=True,
    ).stdout
    match = re.search(r"\{([a-z][a-z0-9,-]+)\}", out)
    assert match, "tracker.py --help lists no operations"
    return set(match.group(1).split(","))


def _scan_files(exclude_tracker_internals: bool) -> list[Path]:
    files: list[Path] = []
    for root in (PLUGINS, SHARED):
        for p in sorted(root.rglob("*")):
            rel = p.relative_to(REPO)
            if any(part in SKIP_DIRS for part in rel.parts):
                continue
            if p.is_symlink() or any(q.is_symlink() for q in p.parents if q != REPO and REPO in q.parents):
                continue
            if not p.is_file() or p.suffix not in TEXT_SUFFIXES:
                continue
            if exclude_tracker_internals and (
                rel.parts[:2] == ("shared", "tracker_port")
                or rel.as_posix() == "shared/tracker-adapter-beads.md"
            ):
                continue
            files.append(p)
    return files


def _command_fragments(text: str):
    """Yield (line number, fragment) for text that can hold a command.

    Fenced blocks whose info string marks output are skipped. In a `console`
    block only the `$` lines are commands. Outside a fence, only inline code
    spans count, so prose such as "the tracker.py script" never matches.
    """
    fence: str | None = None
    kind = ""
    for n, line in enumerate(text.splitlines(), 1):
        m = FENCE.match(line)
        if m:
            if fence is None:
                fence, kind = m.group(1)[0], m.group(2).strip().lower()
            elif m.group(1)[0] == fence and not m.group(2).strip():
                fence, kind = None, ""
            continue
        if fence is None:
            for span in CODE_SPAN.findall(line):
                yield n, span
        elif kind.startswith(OUTPUT_INFO):
            continue
        elif kind.startswith("console"):
            if line.lstrip().startswith("$"):
                yield n, line
        else:
            yield n, line


def test_usage_reference_exists_and_main_skills_name_it() -> None:
    assert (SHARED / "tracker-usage.md").is_file()
    missing = [
        name for name, rel in MAIN_SKILLS.items()
        if "tracker-usage.md" not in (REPO / rel).read_text(encoding="utf-8")
    ]
    assert not missing, f"main SKILL.md does not name shared/tracker-usage.md: {missing}"


def test_every_tracker_operation_token_is_listed_by_help() -> None:
    ops = _operations()
    targets = [
        p for p in _scan_files(exclude_tracker_internals=False)
        if p.suffix == ".md" and (p.relative_to(REPO).parts[0] == "plugins" or p.parent == SHARED)
    ]
    bad = []
    for p in targets:
        for n, frag in _command_fragments(p.read_text(encoding="utf-8")):
            for op in OPERATION.findall(frag):
                if op not in ops:
                    bad.append(f"{p.relative_to(REPO)}:{n}: tracker.py {op}")
    assert not bad, "operations that --help does not list:\n" + "\n".join(bad)


def test_no_file_outside_the_adapter_names_a_bd_command() -> None:
    offenders = []
    for p in _scan_files(exclude_tracker_internals=True):
        text = p.read_text(encoding="utf-8", errors="replace")
        for n, line in enumerate(text.splitlines(), 1):
            if BD_COMMAND.search(line):
                offenders.append(f"{p.relative_to(REPO)}:{n}: {line.strip()[:100]}")
    assert not offenders, "bd commands outside the adapter:\n" + "\n".join(offenders)


def test_prose_budget_lists_the_usage_reference() -> None:
    spec = importlib.util.spec_from_file_location(
        "_prose_budget_test_mod", REPO / "tests" / "test_prose_budget.py"
    )
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = mod
    spec.loader.exec_module(mod)
    assert "shared/tracker-usage.md" in mod.AUTHORING_REFERENCES


def _dry_run_precedes_consent(text: str) -> bool:
    """True when the backfill pointer, the dry run, and a consent step come in that order."""
    ref = text.find("tracker-backfill.md")
    if ref < 0:
        return False
    dry = text.find("--dry-run", ref)
    consent = text.lower().find("consent", ref)
    return dry >= 0 and consent >= 0 and dry < consent


@pytest.mark.parametrize(
    "rel",
    [
        "plugins/cobuilder-full-lifecycle/commands/install.md",
        "plugins/cobuilder-full-lifecycle/skills/cobuilder-setup/SKILL.md",
    ],
)
def test_install_surfaces_name_the_backfill_with_dry_run_before_consent(rel: str) -> None:
    text = (REPO / rel).read_text(encoding="utf-8")
    assert "shared/tracker-backfill.md" in text, "backfill reference not named"
    assert "seed-from-files" in text, "seed-from-files not named"
    assert "--dry-run" in text, "--dry-run not named"
    # Proves the dry run is introduced before any consent step that follows the
    # backfill pointer, so the engineer reads the planned creates before a write.
    assert _dry_run_precedes_consent(text), "dry run must come before the consent step"


def _version(path: Path) -> str:
    return json.loads(path.read_text(encoding="utf-8"))["version"]


def _marketplace() -> dict[str, dict]:
    data = json.loads((REPO / ".claude-plugin" / "marketplace.json").read_text(encoding="utf-8"))
    return {e["name"]: e for e in data["plugins"]}


def test_lifecycle_plugin_and_marketplace_versions_match() -> None:
    declared = _version(PLUGINS / "cobuilder-full-lifecycle" / ".claude-plugin" / "plugin.json")
    assert _marketplace()["cobuilder-full-lifecycle"]["version"] == declared

# Check 7 exists already: tests/test_plugin_manifests.py::test_plugin_version_matches_marketplace_entry
# covers every plugin, so it is not repeated here.
