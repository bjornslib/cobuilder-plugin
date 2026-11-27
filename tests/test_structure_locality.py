"""Tests for consumer locality in the evidence packet, slice 11 of structure-coaching (E4).

An added product file gets a consumer_locality entry when its product importers all sit in one
folder. That folder must be neither the folder of the file nor an ancestor of it, and it must
not import 3 or more files of the folder of the file. The entries live in the evidence only.
They never add a finding. The design is in epic-E4-design.md, step C6.

Each case that expects no entry also builds a control file that must get one, so the case
fails on its assertion until the rule exists.

Run with: uv run pytest tests/test_structure_locality.py -q
"""
from __future__ import annotations

import ast
import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
EVIDENCE_PATH = REPO_ROOT / "shared" / "structure_evidence.py"
LOCALITY_PATH = REPO_ROOT / "shared" / "structure" / "locality.py"
CONTRACT_KEYS = ("schema", "base", "files", "findings", "evidence", "not_analysed")
GIT = ("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false")

# The control has two importers in one folder, and that folder imports no other file of the
# control folder. Each negative case must still give the control an entry.
CONTROL_PATH = "VA/store/cache_new.py"
CONTROL_BASE = {
    "VA/workers/job.py": "from ..store.cache_new import CACHE\n",
    "VA/workers/sync.py": "from ..store.cache_new import CACHE\n",
}
CONTROL_NEW = {CONTROL_PATH: "CACHE = 1\n"}
ENTRY_PATH = "VA/helpers/llm_factory.py"
ENTRY_FACTORY = "def build_llm():\n    return None\n"
ENTRY_BASE = {
    "VA/entrypoints/chat.py": "from ..helpers.llm_factory import build_llm\n",
    "VA/entrypoints/voice.py": "from ..helpers.llm_factory import build_llm\n",
}
ENTRY_NEW = {ENTRY_PATH: ENTRY_FACTORY}


def _load_evidence() -> ModuleType:
    """Return the entry module, loaded by its path. Fail with an assertion when it is missing."""
    assert EVIDENCE_PATH.exists(), f"missing {EVIDENCE_PATH}"
    spec = importlib.util.spec_from_file_location("structure_evidence_under_test", EVIDENCE_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module  # dataclasses look up their module by name
    spec.loader.exec_module(module)
    return module


def _get(mapping: Any, key: str) -> Any:
    """Return one key of a dict. Fail with an assertion when the key is missing."""
    assert isinstance(mapping, dict) and key in mapping, f"no {key!r} key in {mapping!r}"
    return mapping[key]


def _git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args], check=True, capture_output=True, text=True
    )
    return result.stdout.strip()


def _put(repo: Path, files: dict[str, str]) -> None:
    for rel, text in files.items():
        target = repo / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")


def _packet(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, base: dict[str, str], new: dict[str, str]
) -> dict[str, Any]:
    """Commit the base files, add the new files, run the script, and return the packet it writes."""
    repo = tmp_path.resolve() / "repo"
    repo.mkdir()
    _git(repo, "init", "-q")
    _git(repo, "symbolic-ref", "HEAD", "refs/heads/main")
    _put(repo, base)
    _git(repo, "add", "-A")
    _git(repo, *GIT, "commit", "-q", "-m", "base")
    base_sha = _git(repo, "rev-parse", "HEAD")
    _put(repo, new)
    out = tmp_path / "packet.json"
    monkeypatch.chdir(repo)
    module = _load_evidence()
    assert hasattr(module, "main"), "structure_evidence.py has no main function"
    assert module.main(["--base", base_sha, "--out", str(out)]) == 0, "the script must exit 0"
    assert out.is_file(), f"no packet file at {out}"
    packet = json.loads(out.read_text(encoding="utf-8"))
    missing = [key for key in CONTRACT_KEYS if key not in packet]
    assert not missing, f"the packet has no {missing}"
    return packet


def _entry(packet: dict[str, Any], rel: str) -> dict[str, Any] | None:
    """Return the consumer_locality entry of one file, or None when the packet has none."""
    entries = _get(_get(packet, "evidence"), "consumer_locality")
    assert isinstance(entries, list), f"consumer_locality is not a list: {entries!r}"
    found = [item for item in entries if isinstance(item, dict) and item.get("path") == rel]
    assert len(found) <= 1, f"more than one entry for {rel}: {found}"
    return found[0] if found else None


def _require(packet: dict[str, Any], rel: str) -> dict[str, Any]:
    """Return the entry of one file. Fail with an assertion when the file has none."""
    entry = _entry(packet, rel)
    assert entry is not None, f"no consumer_locality entry for {rel}: {packet['evidence']}"
    return entry


def _imports(path: Path) -> list[tuple[str, int]]:
    """Return the top module name and the relative level of each import in a file."""
    found: list[tuple[str, int]] = []
    for node in ast.walk(ast.parse(path.read_text(encoding="utf-8"))):
        if isinstance(node, ast.Import):
            found.extend((alias.name.split(".")[0], 0) for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            found.append(((node.module or "").split(".")[0], node.level))
    return found


def test_an_added_file_with_two_importers_in_one_folder_gets_an_entry_for_that_folder(
    tmp_path, monkeypatch
):
    packet = _packet(
        tmp_path, monkeypatch, {**CONTROL_BASE, **ENTRY_BASE}, {**CONTROL_NEW, **ENTRY_NEW}
    )
    entry = _require(packet, ENTRY_PATH)
    assert _get(entry, "importers_by_folder") == {"VA/entrypoints": 2}, f"entry: {entry}"
    assert _get(entry, "sole_consumer_folder") == "VA/entrypoints", f"entry: {entry}"


def test_a_consumer_folder_that_imports_three_files_of_the_file_folder_gives_no_entry(
    tmp_path, monkeypatch
):
    base = {
        **CONTROL_BASE,
        "VA/helpers/b_helper.py": "B = 1\n",
        "VA/helpers/c_helper.py": "C = 1\n",
        "VA/helpers/d_helper.py": "D = 1\n",
        "VA/entrypoints/chat.py": (
            "from ..helpers.llm_factory import build_llm\n"
            "from ..helpers.b_helper import B\n"
            "from ..helpers.c_helper import C\n"
            "from ..helpers.d_helper import D\n"
        ),
        "VA/entrypoints/voice.py": "from ..helpers.llm_factory import build_llm\n",
    }
    packet = _packet(tmp_path, monkeypatch, base, {**CONTROL_NEW, **ENTRY_NEW})
    _require(packet, CONTROL_PATH)
    assert _entry(packet, ENTRY_PATH) is None, "the layer rule must drop the helper entry"


@pytest.mark.parametrize(
    ("base", "new_path"),
    [
        pytest.param(
            {
                "VA/entrypoints/chat.py": (
                    "from ..helpers.llm_factory import build_llm\n"
                    "from ..store.one_new import ONE\n"
                ),
                "VA/entrypoints/voice.py": "from ..helpers.llm_factory import build_llm\n",
            },
            "VA/store/one_new.py",
            id="one-importer",
        ),
        pytest.param(
            {
                "VA/entrypoints/chat.py": (
                    "from ..helpers.llm_factory import build_llm\n"
                    "from ..store.two_new import TWO\n"
                ),
                "VA/entrypoints/voice.py": "from ..helpers.llm_factory import build_llm\n",
                "VA/jobs/run.py": "from ..store.two_new import TWO\n",
            },
            "VA/store/two_new.py",
            id="importers-in-two-folders",
        ),
    ],
)
def test_one_importer_or_importers_in_two_folders_give_no_entry(
    tmp_path, monkeypatch, base, new_path
):
    new = {**CONTROL_NEW, **ENTRY_NEW, new_path: "VALUE = 1\n"}
    packet = _packet(tmp_path, monkeypatch, {**CONTROL_BASE, **base}, new)
    _require(packet, ENTRY_PATH)
    assert _entry(packet, new_path) is None, f"the packet gives {new_path} an entry"


@pytest.mark.parametrize(
    ("base", "new_path"),
    [
        pytest.param(
            {
                "VA/helpers/pool.py": "from .llm_factory import build_llm\n",
                "VA/helpers/cache.py": "from .llm_factory import build_llm\n",
            },
            ENTRY_PATH,
            id="importers-in-the-own-folder",
        ),
        pytest.param(
            {
                "VA/helpers/a.py": "from .deep.tool import run\n",
                "VA/helpers/b.py": "from .deep.tool import run\n",
            },
            "VA/helpers/deep/tool.py",
            id="importers-in-an-ancestor-folder",
        ),
    ],
)
def test_importers_in_the_own_folder_or_an_ancestor_give_no_entry(
    tmp_path, monkeypatch, base, new_path
):
    new = {**CONTROL_NEW, new_path: ENTRY_FACTORY}
    packet = _packet(tmp_path, monkeypatch, {**CONTROL_BASE, **base}, new)
    _require(packet, CONTROL_PATH)
    assert _entry(packet, new_path) is None, f"the packet gives {new_path} an entry"


def test_a_test_file_that_imports_the_file_does_not_count_as_an_importer(tmp_path, monkeypatch):
    base = {
        **CONTROL_BASE,
        **ENTRY_BASE,
        "tests/test_llm.py": "from VA.helpers.llm_factory import build_llm\n",
    }
    packet = _packet(tmp_path, monkeypatch, base, {**CONTROL_NEW, **ENTRY_NEW})
    entry = _require(packet, ENTRY_PATH)
    assert _get(entry, "importers_by_folder") == {"VA/entrypoints": 2}, f"entry: {entry}"
    assert _get(entry, "sole_consumer_folder") == "VA/entrypoints", f"entry: {entry}"


def test_a_changed_file_gets_no_entry_while_an_added_file_does(tmp_path, monkeypatch):
    base = {**CONTROL_BASE, **ENTRY_BASE, ENTRY_PATH: ENTRY_FACTORY}
    changed = ENTRY_FACTORY + "\nDEFAULT_NAME = 'llm'\n"
    packet = _packet(tmp_path, monkeypatch, base, {**CONTROL_NEW, ENTRY_PATH: changed})
    _require(packet, CONTROL_PATH)
    assert _entry(packet, ENTRY_PATH) is None, "a changed file gets a consumer_locality entry"


def test_locality_adds_an_entry_to_the_evidence_and_nothing_to_the_findings(tmp_path, monkeypatch):
    packet = _packet(
        tmp_path, monkeypatch, {**CONTROL_BASE, **ENTRY_BASE}, {**CONTROL_NEW, **ENTRY_NEW}
    )
    _require(packet, ENTRY_PATH)
    assert packet["findings"] == [], f"consumer locality adds a finding: {packet['findings']}"


def test_the_locality_module_imports_only_the_standard_library():
    assert LOCALITY_PATH.is_file(), f"missing {LOCALITY_PATH}: slice 11 creates this module"
    for name, level in _imports(LOCALITY_PATH):
        if level == 0 and name:
            assert name in sys.stdlib_module_names or name == "structure", (
                f"locality.py imports {name!r}, which is neither stdlib nor a structure module"
            )
