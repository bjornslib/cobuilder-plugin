"""Slice 15 of beads-storage: the pr plugin records a pull request through the tracker.

The first group runs shared/tracker.py against a fake adapter in a tmp dir.
The second group checks structure: an operation name must exist in the CLI, a
path must resolve, a command must be absent. It never tests the wording of prose.
"""

from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _tracker_port_support as support  # noqa: E402

FIXTURE = support.FIXTURES / "write-model-pr"
EPICS = ["pr-demo/E-a", "pr-demo/E-b"]
REF = "pr/1"

PR = ROOT / "plugins" / "pr"
SKILL = PR / "skills" / "odyssey" / "SKILL.md"
PROSE_FILES = [SKILL, *sorted((PR / "commands").glob("*.md"))]
OP_RE = support.OP_RE
_cli = support.cli
_ok = support.ok
_snapshot = support.snapshot


def _repo(tmp_path: Path) -> tuple[Path, Path]:
    corpus = tmp_path / "corpus"
    shutil.copytree(FIXTURE, corpus)
    return support.write_fake_config(tmp_path, corpus)


def _ready(config: Path, tmp_path: Path, kind: str) -> list[dict]:
    return _ok(_cli(config, tmp_path, "next-ready", "--kind", kind))  # type: ignore[return-value]


def _ready_epics(config: Path, tmp_path: Path) -> set[str]:
    return {r["id"] for r in _ready(config, tmp_path, "epic")}


# --- behavior ---------------------------------------------------------------


def test_epics_ready_before_pull_request(tmp_path: Path) -> None:
    config, _ = _repo(tmp_path)
    assert _ready_epics(config, tmp_path) == set(EPICS)


def test_open_pull_request_blocks_both_epics(tmp_path: Path) -> None:
    config, _ = _repo(tmp_path)
    _ok(_cli(config, tmp_path, "open-pull-request", REF, *EPICS))
    assert _ready_epics(config, tmp_path) == set()


def test_open_pull_request_twice_changes_no_file(tmp_path: Path) -> None:
    # The CLI refuses a repeat call: exit 4, "pull request already exists", no write.
    config, state = _repo(tmp_path)
    _ok(_cli(config, tmp_path, "open-pull-request", REF, *EPICS))
    before = _snapshot(tmp_path)
    assert state.exists()
    again = _cli(config, tmp_path, "open-pull-request", REF, *EPICS)
    assert again.returncode == 4, again.stderr + again.stdout
    assert "already exists" in again.stderr
    assert _snapshot(tmp_path) == before


def test_merge_frees_both_epics(tmp_path: Path) -> None:
    config, _ = _repo(tmp_path)
    _ok(_cli(config, tmp_path, "open-pull-request", REF, *EPICS))
    _ok(_cli(config, tmp_path, "set-pull-request-state", REF, "merged"))
    assert _ready_epics(config, tmp_path) == set(EPICS)


def test_pr_record_never_ready(tmp_path: Path) -> None:
    config, _ = _repo(tmp_path)
    steps = [(), ("open-pull-request", REF, *EPICS), ("set-pull-request-state", REF, "merged")]
    for step in steps:
        if step:
            _ok(_cli(config, tmp_path, *step))
        for kind in ("program", "epic", "slice"):
            assert all(r["kind"] != "pr" for r in _ready(config, tmp_path, kind))
        # --help lists kind pr, but the CLI refuses it with exit 4, so no result holds a pr.
        assert _cli(config, tmp_path, "next-ready", "--kind", "pr").returncode == 4
        out = _ok(_cli(config, tmp_path, "next-ready"))
        assert all(r["kind"] != "pr" for r in out)  # type: ignore[union-attr]


def test_pr_versions_match() -> None:
    plugin = json.loads((PR / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"))
    market = json.loads((ROOT / ".claude-plugin" / "marketplace.json").read_text(encoding="utf-8"))
    entry = next(p for p in market["plugins"] if p["name"] == "pr")
    assert plugin["version"] == entry["version"]


# --- structure --------------------------------------------------------------


def test_every_tracker_op_in_prose_exists() -> None:
    support.assert_prose_ops_exist(PROSE_FILES)


def test_skill_names_write_ops_and_links_usage() -> None:
    text = SKILL.read_text(encoding="utf-8")
    assert "open-pull-request" in text
    assert "set-pull-request-state" in text
    links = re.findall(r"\]\(([^)\s]*tracker-usage\.md)[^)]*\)", text)
    assert links, "SKILL.md must link shared/tracker-usage.md"
    assert any((SKILL.parent / link).resolve().is_file() for link in links)


def test_open_pull_request_follows_gh_pr_create() -> None:
    text = SKILL.read_text(encoding="utf-8")
    assert "gh pr create" in text and "open-pull-request" in text
    assert text.index("gh pr create") < text.index("open-pull-request")


def test_pr_plugin_never_merges() -> None:
    for path in PR.rglob("*.md"):
        assert "gh pr merge" not in path.read_text(encoding="utf-8"), path
