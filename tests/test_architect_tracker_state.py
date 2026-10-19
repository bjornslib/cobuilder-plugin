"""Slice 14 of beads-storage: the architect plugin writes program state through the tracker.

The first group runs shared/tracker.py against a fake adapter in a tmp dir.
The second group checks structure: an operation name must exist in the CLI, a
path must resolve, a line must hold a tracker call. It never tests the wording
of prose.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "shared"))
from _bundle_meta import DESIGN_STAGES  # noqa: E402

TRACKER_CLI = ROOT / "shared" / "tracker.py"
FIXTURE = ROOT / "tests" / "fixtures" / "tracker" / "write-model"
PROGRAM = "wm-demo"
EPIC = "wm-demo/E1"

ARCHITECT = ROOT / "plugins" / "architect"
SKILL = ARCHITECT / "skills" / "architecture"
DESIGN_MODE = SKILL / "references" / "design-mode.md"
PROSE_FILES = [SKILL / "SKILL.md", DESIGN_MODE]
OP_RE = re.compile(r"tracker\.py\s+(?:--[a-z-]+(?:\s+\S+)?\s+)*([a-z][a-z-]+)")


def _repo(tmp_path: Path) -> tuple[Path, Path]:
    """Copy the fixture. Gates 1 and 2 are absent and gate 2b is n/a. Return config and plans root."""
    corpus = tmp_path / "corpus"
    plans = tmp_path / "plans"
    shutil.copytree(FIXTURE, corpus, ignore=shutil.ignore_patterns("plans"))
    shutil.copytree(FIXTURE / "plans", plans)
    program_file = corpus / "program.json"
    records = json.loads(program_file.read_text(encoding="utf-8"))
    records[0]["envelope"] = {"gate2b": "n/a"}
    program_file.write_text(json.dumps(records), encoding="utf-8")
    state = tmp_path / "state" / "tracker-state.json"
    config = tmp_path / ".cobuilder" / "tracker.yaml"
    config.parent.mkdir(parents=True)
    config.write_text(
        "adapter: fake\n"
        f"corpus: {json.dumps(str(corpus))}\n"
        f"state_file: {json.dumps(str(state))}\n",
        encoding="utf-8",
    )
    return config, plans


def _cli(config: Path, cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["uv", "run", str(TRACKER_CLI), "--config", str(config), *args],
        cwd=cwd, capture_output=True, text=True, timeout=180, check=False,
    )


def _ok(result: subprocess.CompletedProcess[str]) -> object:
    assert result.returncode == 0, result.stderr + result.stdout
    body = json.loads(result.stdout)
    assert body["ok"] is True, result.stdout
    return body["result"]


def _cli_ops() -> set[str]:
    out = subprocess.run(
        ["uv", "run", str(TRACKER_CLI), "--help"], capture_output=True, text=True, timeout=180, check=True
    ).stdout
    match = re.search(r"\{([a-z,-]+)\}", out)
    assert match, out
    return set(match.group(1).split(","))


# --- behavior ---------------------------------------------------------------


def test_set_gate_value_reaches_status_file(tmp_path: Path) -> None:
    config, plans = _repo(tmp_path)
    _ok(_cli(config, tmp_path, "set-gate-value", PROGRAM, "gate1", "2026-10-17"))
    _ok(_cli(config, tmp_path, "regenerate-status-files", PROGRAM, "--plans-dir", str(plans)))
    status = (plans / PROGRAM / "00-status.md").read_text(encoding="utf-8")
    gate1 = [line for line in status.splitlines() if "Gate 1" in line]
    assert gate1 and "2026-10-17" in gate1[0], status


def test_set_program_stage_accepts_design_stage_and_rejects_others(tmp_path: Path) -> None:
    config, _ = _repo(tmp_path)
    for stage in DESIGN_STAGES:
        _ok(_cli(config, tmp_path, "set-program-stage", PROGRAM, stage))
    bad = _cli(config, tmp_path, "set-program-stage", PROGRAM, "not-a-stage")
    assert "not-a-stage" not in DESIGN_STAGES
    assert bad.returncode == 4, bad.stderr + bad.stdout


def test_set_epic_state_branch_shows_in_list_epics(tmp_path: Path) -> None:
    config, _ = _repo(tmp_path)
    _ok(_cli(config, tmp_path, "set-epic-state", EPIC, "open", "--branch", "feature/x"))
    epics = _ok(_cli(config, tmp_path, "list-epics", "--program", PROGRAM))
    assert "feature/x" in json.dumps(epics)


def test_architect_manifest_versions_match() -> None:
    plugin = json.loads((ARCHITECT / ".claude-plugin" / "plugin.json").read_text(encoding="utf-8"))
    market = json.loads((ROOT / ".claude-plugin" / "marketplace.json").read_text(encoding="utf-8"))
    entry = next(p for p in market["plugins"] if p["name"] == "architect")
    assert plugin["version"] == entry["version"]


# --- structure of the prose -------------------------------------------------


def test_every_tracker_op_named_in_prose_is_a_cli_operation() -> None:
    ops = _cli_ops()
    for path in PROSE_FILES:
        assert path.is_file(), f"missing {path.relative_to(ROOT)}"
        named = OP_RE.findall(path.read_text(encoding="utf-8"))
        unknown = sorted(set(named) - ops)
        assert not unknown, f"{path.relative_to(ROOT)} names unknown operations {unknown}"


def test_design_mode_names_the_write_operations() -> None:
    named = set(OP_RE.findall(DESIGN_MODE.read_text(encoding="utf-8")))
    required = {"set-gate-value", "set-program-stage", "set-epic-state", "add-note"}
    assert required <= named, f"design-mode.md misses {sorted(required - named)}"


def test_skill_links_tracker_usage_and_path_resolves() -> None:
    text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
    match = re.search(r"[\w./-]*shared/tracker-usage\.md", text)
    assert match, "SKILL.md does not name shared/tracker-usage.md"
    assert (ROOT / "shared" / "tracker-usage.md").is_file()


def test_design_mode_writes_no_gate_approval_into_status_file_by_hand() -> None:
    """Structural check, line by line. A line that names an approval and 00-status.md
    must also hold a tracker.py call. It covers one-line steps only. A step that
    splits the approval and the file over two lines is not caught."""
    offenders = [
        f"{n}: {line.strip()}"
        for n, line in enumerate(DESIGN_MODE.read_text(encoding="utf-8").splitlines(), 1)
        if re.search(r"approv", line, re.I) and "00-status.md" in line and "tracker.py" not in line
    ]
    assert not offenders, "hand-written approval into 00-status.md:\n" + "\n".join(offenders)
