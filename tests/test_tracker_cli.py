"""CLI contract for shared/tracker.py. Slice 2 checks the write refusal with no adapter.

A write with no configured adapter exits 2, prints a message that names the
missing adapter, and changes no file.
"""

from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

REPO_DIR = Path(__file__).resolve().parent.parent
TRACKER_CLI = REPO_DIR / "shared" / "tracker.py"
FIXTURES_DIR = REPO_DIR / "tests" / "fixtures" / "tracker"


def _snapshot(root: Path) -> dict[str, str]:
    # Map each file's relative path to a digest of its bytes. A missing root is an empty snapshot.
    if not root.exists():
        return {}
    return {
        str(path.relative_to(root)): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in sorted(root.rglob("*"))
        if path.is_file()
    }


def test_write_without_adapter_exits_2_and_changes_no_file(tmp_path: Path) -> None:
    assert TRACKER_CLI.is_file(), "shared/tracker.py does not exist"

    # A tmp repo with one state file, and no .cobuilder/tracker.yaml.
    status_file = tmp_path / "docs" / "plans" / "demo" / "04-slices.md"
    status_file.parent.mkdir(parents=True)
    status_file.write_text("| demo-E1-s3 | open |\n", encoding="utf-8")
    missing_config = tmp_path / ".cobuilder" / "tracker.yaml"
    assert not missing_config.exists()

    before_repo = _snapshot(tmp_path)
    before_fixtures = _snapshot(FIXTURES_DIR)

    result = subprocess.run(
        [
            "uv",
            "run",
            str(TRACKER_CLI),
            "--config",
            str(missing_config),
            "set-slice-state",
            "demo-E1-s3",
            "closed",
        ],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=180,
        check=False,
    )

    assert result.returncode == 2, result.stderr
    assert "adapter" in result.stderr.lower(), result.stderr
    # The command prints JSON on stdout. Empty stdout is also allowed for a refusal.
    if result.stdout.strip():
        assert isinstance(json.loads(result.stdout), dict), result.stdout
    assert _snapshot(tmp_path) == before_repo
    assert _snapshot(FIXTURES_DIR) == before_fixtures
