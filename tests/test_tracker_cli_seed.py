"""CLI contract for shared/tracker.py: the seed refresh flag and the status file refusal.

Run with: uv run pytest tests/test_tracker_cli_seed.py -q
"""
from __future__ import annotations

import shutil
import subprocess
from pathlib import Path


import _tracker_cli_support as support

TRACKER_CLI = support.TRACKER_CLI
CORPUS_DIR = support.FIXTURES / "corpus"
PLANS_DIR = support.FIXTURES / "plans"
_cfg = support.fake_config
_cli = support.cli
_payload = support.ok
_snapshot = support.snapshot


def test_seed_refresh_flag_is_accepted(tmp_path: Path) -> None:
    created = _payload(_cli(_cfg(tmp_path), tmp_path, "seed-from-files", str(PLANS_DIR), "--refresh-envelope"))
    assert created, "the seed with the refresh flag returns the records it creates"


def test_seed_refresh_dry_run_writes_nothing(tmp_path: Path) -> None:
    state = tmp_path / "state.json"
    config = _cfg(tmp_path, state_file=state)
    dry = _cli(config, tmp_path, "seed-from-files", str(PLANS_DIR), "--dry-run", "--refresh-envelope")
    assert dry.returncode == 0, dry.stderr
    assert not state.exists()


def test_regenerate_status_files_without_adapter_exits_2_and_writes_nothing(
    tmp_path: Path,
) -> None:
    assert TRACKER_CLI.is_file(), "shared/tracker.py does not exist"

    # A copy of the mini plan, and no .cobuilder/tracker.yaml.
    plans_root = tmp_path / "plans"
    shutil.copytree(PLANS_DIR, plans_root)
    missing_config = tmp_path / ".cobuilder" / "tracker.yaml"
    assert not missing_config.exists()

    before = _snapshot(tmp_path)

    result = subprocess.run(
        [
            "uv",
            "run",
            str(TRACKER_CLI),
            "--config",
            str(missing_config),
            "regenerate-status-files",
            "beads-storage-mini",
            "--plans-dir",
            str(plans_root),
        ],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=180,
        check=False,
    )

    assert result.returncode == 2, result.stderr + result.stdout
    assert _snapshot(tmp_path) == before
