"""Contract drift for a renamed Python file, in the slice view and the whole-repository view.

A renamed file compares its new public surface with the surface of its old path at the
base commit. A file outside the diff that still imports the old module gives a
module-renamed event.
"""
from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent
SHARED = REPO_ROOT / "shared"
EVIDENCE_PATH = SHARED / "structure_evidence.py"
COMMIT_OPTIONS = ("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false")

LIB = "def fetch(key):\n    if not key:\n        raise ValueError('empty key')\n    return key\n"
LIB_NEW_RAISE = LIB.replace("ValueError", "KeyError")
OLD_CALLER = "from pkg.lib import fetch\n\n\ndef load():\n    return fetch('a')\n"
NEW_CALLER = OLD_CALLER.replace("pkg.lib", "pkg.fetching")


def _load_evidence() -> ModuleType:
    spec = importlib.util.spec_from_file_location("structure_evidence_rename", EVIDENCE_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _git(repo: Path, *args: str) -> str:
    done = subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True, text=True)
    return done.stdout.strip()


def _repo(tmp_path: Path, files: dict[str, str]) -> tuple[Path, str]:
    """Return a repo that holds files in one commit, and the sha of that commit."""
    repo = (tmp_path / "repo").resolve()
    repo.mkdir()
    _git(repo, "init", "-q")
    for rel, text in files.items():
        _write(repo, rel, text)
    _git(repo, "add", "-A")
    _git(repo, *COMMIT_OPTIONS, "commit", "-q", "-m", "base")
    return repo, _git(repo, "rev-parse", "HEAD")


def _write(repo: Path, rel: str, text: str) -> None:
    target = repo / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


def _rename(repo: Path, old: str, new: str, text: str) -> None:
    """Move old to new as an untracked file, the way an agent writes it, with new text."""
    (repo / old).unlink()
    _write(repo, new, text)


def _drift(findings: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [item for item in findings if item.get("signal") == "contract-drift"]


def _kinds(findings: list[dict[str, Any]]) -> list[str]:
    return sorted(item["facts"]["kind"] for item in _drift(findings))


def test_a_renamed_file_with_a_changed_raise_gives_a_drift_event_that_names_the_old_path(tmp_path):
    repo, base = _repo(tmp_path, {"pkg/lib.py": LIB, "app/caller.py": NEW_CALLER})
    _rename(repo, "pkg/lib.py", "pkg/fetching.py", LIB_NEW_RAISE)

    packet = _load_evidence().build_packet(repo, base)

    raised = [item for item in _drift(packet["findings"]) if item["facts"]["kind"] == "raises-changed"]
    assert len(raised) == 1, f"expected one raises-changed event, got {packet['findings']}"
    assert raised[0]["path"] == "pkg/fetching.py"
    assert raised[0]["facts"]["renamed_from"] == "pkg/lib.py"
    assert raised[0]["facts"]["callers_untouched"] == ["app/caller.py"]


def test_an_old_import_outside_the_diff_gives_a_module_renamed_event(tmp_path):
    repo, base = _repo(tmp_path, {"pkg/lib.py": LIB, "app/caller.py": OLD_CALLER})
    _rename(repo, "pkg/lib.py", "pkg/fetching.py", LIB)

    packet = _load_evidence().build_packet(repo, base)

    assert _kinds(packet["findings"]) == ["module-renamed"], packet["findings"]
    facts = _drift(packet["findings"])[0]["facts"]
    assert facts["renamed_from"] == "pkg/lib.py"
    assert facts["class"] == "input"
    assert facts["callers_untouched"] == ["app/caller.py"]
    assert facts["callers_total"] == 1


def test_a_rename_with_the_same_surface_and_updated_importers_gives_no_drift(tmp_path):
    repo, base = _repo(tmp_path, {"pkg/lib.py": LIB, "app/caller.py": OLD_CALLER})
    _rename(repo, "pkg/lib.py", "pkg/fetching.py", LIB)
    _write(repo, "app/caller.py", NEW_CALLER)

    packet = _load_evidence().build_packet(repo, base)

    assert _drift(packet["findings"]) == [], packet["findings"]


def test_a_renamed_test_file_gives_no_drift(tmp_path):
    repo, base = _repo(tmp_path, {"tests/test_lib.py": LIB, "app/caller.py": "x = 1\n"})
    _rename(repo, "tests/test_lib.py", "tests/test_fetching.py", LIB_NEW_RAISE)

    packet = _load_evidence().build_packet(repo, base)

    assert _drift(packet["findings"]) == [], packet["findings"]


def test_the_whole_repo_view_compares_a_rename_since_the_base(tmp_path):
    repo, base = _repo(tmp_path, {"pkg/lib.py": LIB, "app/caller.py": OLD_CALLER})
    _rename(repo, "pkg/lib.py", "pkg/fetching.py", LIB_NEW_RAISE)
    _git(repo, "add", "-A")
    _git(repo, *COMMIT_OPTIONS, "commit", "-q", "-m", "rename")
    _load_evidence()
    sys.path.insert(0, str(SHARED))
    from structure.config import Config
    from structure.repo_signals import drift_findings

    notes: list[str] = []
    found = drift_findings(repo, base, Config(), notes)

    kinds = sorted(finding.facts["kind"] for finding in found)
    assert kinds == ["module-renamed", "raises-changed"], f"got {found}, notes {notes}"
    assert all(finding.facts["renamed_from"] == "pkg/lib.py" for finding in found)
