"""Shared helpers for the tracker CLI and the plugin write-state tests. Not a test module.

The helpers run shared/tracker.py, write fake-adapter configs, copy the
write-model fixture, and check that prose names real CLI operations.
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any

from _tracker_port_support import FIXTURES, REPO_ROOT

TRACKER_CLI = REPO_ROOT / "shared" / "tracker.py"
WRITE_MODEL = FIXTURES / "write-model"
OP_RE = re.compile(r"tracker\.py\s+(?:--[a-z-]+(?:\s+\S+)?\s+)*([a-z][a-z-]+)")


def snapshot(root: Path) -> dict[str, str]:
    """Map each file's relative path to a digest of its bytes. A missing root is empty."""
    if not root.exists():
        return {}
    return {
        p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted(root.rglob("*"))
        if p.is_file()
    }


def write_fake_config(tmp_path: Path, corpus: Path) -> tuple[Path, Path]:
    """Write a fake-adapter tracker.yaml under tmp_path. Return the config and state file."""
    state = tmp_path / "state" / "tracker-state.json"
    config = tmp_path / ".cobuilder" / "tracker.yaml"
    config.parent.mkdir(parents=True)
    config.write_text(
        "adapter: fake\n"
        f"corpus: {json.dumps(str(corpus))}\n"
        f"state_file: {json.dumps(str(state))}\n",
        encoding="utf-8",
    )
    return config, state


def copy_write_model(tmp_path: Path) -> tuple[Path, Path]:
    """Copy the write-model fixture. Return the corpus dir and the plans root."""
    corpus = tmp_path / "corpus"
    plans = tmp_path / "plans"
    shutil.copytree(WRITE_MODEL, corpus, ignore=shutil.ignore_patterns("plans"))
    shutil.copytree(WRITE_MODEL / "plans", plans)
    return corpus, plans


def fake_config(tmp_path: Path, corpus: Path = FIXTURES / "corpus", state_file: Path | None = None) -> Path:
    # The config names the fake adapter and a corpus. The tmp repo holds it, never docs/plans.
    config = tmp_path / ".cobuilder" / "tracker.yaml"
    config.parent.mkdir(parents=True, exist_ok=True)
    lines = [
        "adapter: fake",
        f"corpus: {json.dumps(str(corpus))}",
        f"plans_dir: {json.dumps(str(FIXTURES / 'plans'))}",
    ]
    if state_file is not None:
        lines.append(f"state_file: {json.dumps(str(state_file))}")
    config.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return config


def cli(config: Path, cwd: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["uv", "run", str(TRACKER_CLI), "--config", str(config), *args],
        cwd=cwd, capture_output=True, text=True, timeout=180, check=False,
    )


def ok(result: subprocess.CompletedProcess[str]) -> Any:
    """Assert a success envelope and return its result."""
    assert result.returncode == 0, result.stderr + result.stdout
    body = json.loads(result.stdout)
    assert body["ok"] is True, result.stdout
    return body["result"]


def cli_ops() -> set[str]:
    out = subprocess.run(
        ["uv", "run", str(TRACKER_CLI), "--help"], capture_output=True, text=True, timeout=180, check=True
    ).stdout
    match = re.search(r"\{([a-z,-]+)\}", out)
    assert match, out
    return set(match.group(1).split(","))


def assert_prose_ops_exist(paths: list[Path]) -> None:
    """Every tracker.py operation that a prose file names must be a CLI operation."""
    ops = cli_ops()
    for path in paths:
        assert path.is_file(), f"missing {path.relative_to(REPO_ROOT)}"
        unknown = sorted(set(OP_RE.findall(path.read_text(encoding="utf-8"))) - ops)
        assert not unknown, f"{path.relative_to(REPO_ROOT)} names unknown operations {unknown}"
