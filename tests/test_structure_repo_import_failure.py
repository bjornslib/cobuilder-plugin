"""The --repo run when a structure module does not import.

The run must still write one record with no finding and one not_analysed line, and exit 0.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
SHARED = REPO_ROOT / "shared"
RECORD_KEYS = {"schema", "commit", "since", "window_days", "findings", "folders", "not_analysed"}


@pytest.mark.parametrize("broken", ["config.py", "repo.py"])
def test_a_broken_structure_module_gives_a_record_with_one_not_analysed_line(tmp_path, broken):
    scripts = tmp_path / "shared"
    scripts.mkdir()
    shutil.copy(SHARED / "structure_evidence.py", scripts / "structure_evidence.py")
    shutil.copytree(SHARED / "structure", scripts / "structure")
    (scripts / "structure" / broken).write_text("def broken(:\n", encoding="utf-8")
    repo = tmp_path / "repo"
    repo.mkdir()
    subprocess.run(["git", "-C", str(repo), "init", "-q"], check=True)
    out = tmp_path / "record.json"

    done = subprocess.run(
        [sys.executable, "-I", str(scripts / "structure_evidence.py"), "--repo", "--out", str(out)],
        cwd=repo, capture_output=True, text=True, check=False,
    )

    assert done.returncode == 0, f"exit {done.returncode}: {done.stderr}"
    record = json.loads(out.read_text(encoding="utf-8"))
    assert set(record) == RECORD_KEYS, record
    assert record["findings"] == [] and record["folders"] == []
    assert len(record["not_analysed"]) == 1, record["not_analysed"]
    assert "not analysed" in record["not_analysed"][0]
