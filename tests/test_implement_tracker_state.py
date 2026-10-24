"""Slice 13 of beads-storage: the implement plugin writes slice state through the tracker.

The first group runs shared/tracker.py against a fake adapter in a tmp dir.
The second group checks structure: an operation name must exist in the CLI, a
path must resolve, a file must be absent. It never tests the wording of prose.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _tracker_cli_support as support  # noqa: E402

PROGRAM = "wm-demo"
SLICE = "wm-demo/1"

IMPLEMENT = ROOT / "plugins" / "implement"
BUILD = IMPLEMENT / "skills" / "build"
PROSE_FILES = [
    BUILD / "references" / "slice-loop.md",
    BUILD / "SKILL.md",
    BUILD / "references" / "validation-scoring.md",
    IMPLEMENT / "commands" / "start.md",
    IMPLEMENT / "commands" / "install.md",
    IMPLEMENT / "commands" / "debug.md",
]
SETUP_SKILL = ROOT / "plugins/cobuilder-full-lifecycle/skills/cobuilder-setup/SKILL.md"
OP_RE = support.OP_RE
_cli = support.cli
_ok = support.ok
_snapshot = support.snapshot


def _repo(tmp_path: Path, with_config: bool = True) -> tuple[Path, Path, Path]:
    """Copy the fixture into tmp_path. Return the config path, state file, and plans root."""
    corpus, plans = support.copy_write_model(tmp_path)
    if with_config:
        config, state = support.write_fake_config(tmp_path, corpus)
    else:
        state = tmp_path / "state" / "tracker-state.json"
        config = tmp_path / ".cobuilder" / "tracker.yaml"
    return config, state, plans


def _regen(config: Path, tmp_path: Path, plans: Path) -> None:
    _ok(_cli(config, tmp_path, "regenerate-status-files", PROGRAM, "--plans-dir", str(plans)))


# --- behavior ---------------------------------------------------------------


def test_claim_slice_sets_assignee(tmp_path: Path) -> None:
    config, _, _ = _repo(tmp_path)
    assert _ok(_cli(config, tmp_path, "get-slice", SLICE))["assignee"] is None
    _ok(_cli(config, tmp_path, "claim-slice", SLICE, "agent-x"))
    assert _ok(_cli(config, tmp_path, "get-slice", SLICE))["assignee"] == "agent-x"


def test_record_attempt_increments_attempts(tmp_path: Path) -> None:
    config, _, _ = _repo(tmp_path)
    before = _ok(_cli(config, tmp_path, "get-slice", SLICE))["envelope"].get("attempts") or 0
    _ok(_cli(config, tmp_path, "record-attempt", SLICE, "0.5"))
    after = _ok(_cli(config, tmp_path, "get-slice", SLICE))["envelope"].get("attempts")
    assert after == before + 1


def test_set_slice_state_score_reaches_status_files(tmp_path: Path) -> None:
    config, _, plans = _repo(tmp_path)
    _ok(_cli(config, tmp_path, "set-slice-state", SLICE, "closed", "--score", "0.93"))
    _regen(config, tmp_path, plans)
    for name in ("00-status.md", "04-slices.md"):
        assert "0.93" in (plans / PROGRAM / name).read_text(encoding="utf-8"), name


def test_second_identical_write_changes_no_file(tmp_path: Path) -> None:
    config, _, plans = _repo(tmp_path)
    args = ("set-slice-state", SLICE, "closed", "--score", "0.93")
    _ok(_cli(config, tmp_path, *args))
    _regen(config, tmp_path, plans)
    before = _snapshot(tmp_path)
    _ok(_cli(config, tmp_path, *args))
    _regen(config, tmp_path, plans)
    assert _snapshot(tmp_path) == before


def test_write_without_tracker_yaml_exits_2_and_changes_no_file(tmp_path: Path) -> None:
    config, _, _ = _repo(tmp_path, with_config=False)
    assert not config.exists()
    before = _snapshot(tmp_path)
    result = _cli(config, tmp_path, "set-slice-state", SLICE, "closed", "--score", "0.93")
    assert result.returncode == 2, result.stderr + result.stdout
    assert _snapshot(tmp_path) == before


# --- manifests --------------------------------------------------------------


def test_implement_manifest_versions_match() -> None:
    plugin = json.loads((IMPLEMENT / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"))
    market = json.loads((ROOT / ".claude-plugin" / "marketplace.json").read_text(encoding="utf-8"))
    entry = next(p for p in market["plugins"] if p["name"] == "implement")
    assert plugin["version"] == entry["version"]


# --- structure of the prose -------------------------------------------------


def test_every_tracker_op_named_in_prose_is_a_cli_operation() -> None:
    support.assert_prose_ops_exist(PROSE_FILES)


def test_slice_loop_names_the_write_operations() -> None:
    text = (BUILD / "references" / "slice-loop.md").read_text(encoding="utf-8")
    named = set(OP_RE.findall(text))
    required = {"claim-next", "record-attempt", "set-slice-state", "escalate", "regenerate-status-files"}
    assert required <= named, f"slice-loop.md misses {sorted(required - named)}"


def test_skill_links_tracker_usage_and_path_resolves() -> None:
    text = (BUILD / "SKILL.md").read_text(encoding="utf-8")
    match = re.search(r"[\w./-]*shared/tracker-usage\.md", text)
    assert match, "SKILL.md does not name shared/tracker-usage.md"
    assert (ROOT / "shared" / "tracker-usage.md").is_file()


def test_goal_sync_is_gone() -> None:
    assert not (BUILD / "references" / "goal-sync.md").exists()
    holders = [
        p.relative_to(ROOT).as_posix()
        for p in IMPLEMENT.rglob("*")
        if p.is_file() and "goal-sync" in p.read_text(encoding="utf-8", errors="ignore")
    ]
    assert not holders, f"files still name goal-sync: {holders}"


def test_start_names_backfill_reference_and_it_exists() -> None:
    text = (IMPLEMENT / "commands" / "start.md").read_text(encoding="utf-8")
    assert "shared/tracker-backfill.md" in text
    assert (ROOT / "shared" / "tracker-backfill.md").is_file()


def test_setup_skill_has_allow_rule_for_tracker() -> None:
    text = SETUP_SKILL.read_text(encoding="utf-8")
    assert re.search(r"Bash\([^)\n]*shared/tracker\.py[^)\n]*\)", text), (
        "cobuilder-setup has no Bash(...) allow rule that names shared/tracker.py"
    )
