"""Tests for shared/structure_evidence.py, slice 8 of structure-coaching (E4).

The entry point writes the evidence packet for one slice diff. The slice diff
runs from the slice base to the work tree. The packet holds four kinds of facts.
It holds the file lists, the contract drift, the boundary-edge findings, and the
prose rules of each touched context.

Each case builds a git repo in tmp_path with a base commit and a work-tree
change. Most cases call the functions of the module. One case runs the script
with uv.

Run with: uv run pytest tests/test_structure_evidence.py -q
"""
from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tomllib
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
EVIDENCE_PATH = REPO_ROOT / "shared" / "structure_evidence.py"
CONTRACT_KEYS = ("schema", "base", "files", "findings", "evidence", "not_analysed")
COMMIT_OPTIONS = ("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false")

LIB_BEFORE = (
    "def fetch(key):\n"
    "    if not key:\n"
    "        raise ValueError('empty key')\n"
    "    return key\n"
)
LIB_AFTER = LIB_BEFORE.replace("ValueError", "KeyError")
CALLER = "from lib import fetch\n\n\ndef load():\n    return fetch('a')\n"
MOVED_BEFORE = "def helper(x):\n    return x\n\n\ndef keep(y):\n    return y\n"
MOVED_AFTER = "def keep(y):\n    return y\n"
MOVED_TARGET = "def helper(x):\n    return x\n"
PROSE_TARGET = "shared helpers are imported by name"
OTHER_PROSE_TARGET = "beta keeps its own copy of the helpers"


# ---------------------------------------------------------------------------
# Helpers: the entry module, the git repos, the boundary records, and the packet
# ---------------------------------------------------------------------------


def _load_evidence() -> ModuleType:
    """Return the entry module. Assert that the file exists first."""
    assert EVIDENCE_PATH.exists(), f"missing {EVIDENCE_PATH}: slice 8 creates this script"
    spec = importlib.util.spec_from_file_location("structure_evidence_under_test", EVIDENCE_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    # Register the module first. Dataclasses look up their module by name.
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _api(module: ModuleType, name: str) -> Any:
    """Return a public name of the module. Fail with an assertion when there is none."""
    assert hasattr(module, name), f"structure_evidence.py has no public name {name!r} yet"
    return getattr(module, name)


def _get(mapping: Any, key: str) -> Any:
    """Return one key of a dict. Assert that the key exists."""
    assert isinstance(mapping, dict), f"expected a dict, got {mapping!r}"
    assert key in mapping, f"no {key!r} key in {sorted(mapping)}"
    return mapping[key]


def _list(mapping: Any, key: str) -> list[Any]:
    """Return one list of a dict. Fail with an assertion when the value is not a list."""
    value = _get(mapping, key)
    assert isinstance(value, list), f"{key!r} is not a list: {value!r}"
    return value


def _only(items: list[Any]) -> Any:
    """Return the one item of a list. Fail with an assertion when the count is not one."""
    assert len(items) == 1, f"expected one item, got {items}"
    return items[0]


def _git(repo: Path, *args: str) -> str:
    result = subprocess.run(
        ["git", "-C", str(repo), *args], check=True, capture_output=True, text=True
    )
    return result.stdout.strip()


def _new_repo(tmp_path: Path) -> Path:
    """Return an empty repo with main as its HEAD branch."""
    repo = tmp_path / "repo"
    repo.mkdir()
    repo = repo.resolve()
    _git(repo, "init", "-q")
    _git(repo, "symbolic-ref", "HEAD", "refs/heads/main")
    return repo


def _write(repo: Path, rel: str, text: str) -> None:
    target = repo / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text, encoding="utf-8")


def _commit(repo: Path, files: dict[str, str], message: str = "base") -> str:
    """Write each file, commit all of them, and return the sha of the new commit."""
    for rel, text in files.items():
        _write(repo, rel, text)
    _git(repo, "add", "-A")
    _git(repo, *COMMIT_OPTIONS, "commit", "-q", "-m", message)
    return _git(repo, "rev-parse", "HEAD")


def _record(
    context: str,
    path: str,
    allowed: tuple[str, ...] = (),
    forbidden: tuple[tuple[str, str], ...] = (),
) -> str:
    """Return a synthetic boundary record in the shape that the records of this repo use."""
    lines = [
        f"# Synthetic boundary record for the {context} context.",
        f"id: {context}",
        f"path: {path}",
        f'name: "{context}: a synthetic context"',
        "",
    ]
    if allowed:
        lines += ["allowed_dependencies:", *(f"  - {name}" for name in allowed)]
    else:
        lines.append("allowed_dependencies: []")
    if forbidden:
        lines += ["", "forbidden_dependencies:"]
        for target, why in forbidden:
            lines += [f'  - target: "{target}"', f'    why: "{why}"']
    return "\n".join(lines) + "\n"


def _alpha_beta_records() -> dict[str, str]:
    """Return the boundary records of two synthetic contexts, alpha and beta."""
    return {
        "docs/architecture/contexts/alpha/boundary.yaml": _record("alpha", "alpha"),
        "docs/architecture/contexts/beta/boundary.yaml": _record("beta", "beta"),
    }


def _require_keys(packet: dict[str, Any]) -> None:
    missing = [key for key in CONTRACT_KEYS if key not in packet]
    assert not missing, f"the packet has no {missing}"


def _build(repo: Path, base: str) -> dict[str, Any]:
    """Return the packet that build_packet makes for the slice base."""
    packet = _api(_load_evidence(), "build_packet")(repo, base)
    assert isinstance(packet, dict), f"build_packet gives {type(packet).__name__}, not a dict"
    _require_keys(packet)
    return packet


def _read_packet(path: Path) -> dict[str, Any]:
    """Return the packet that the script wrote to path. Fail with an assertion when there is none."""
    assert path.is_file(), f"no packet file at {path}"
    packet = json.loads(path.read_text(encoding="utf-8"))
    assert isinstance(packet, dict), "the packet file holds no JSON object"
    _require_keys(packet)
    return packet


def _run_main(argv: list[str]) -> int:
    """Run the entry point in process and return its exit code."""
    main = _api(_load_evidence(), "main")
    try:
        code = main(argv)
    except SystemExit as error:
        code = error.code
    assert isinstance(code, int), f"main ended with {code!r}, not an exit code"
    return code


def _findings(packet: dict[str, Any], signal: str) -> list[dict[str, Any]]:
    """Return the findings of one signal."""
    findings = _list(packet, "findings")
    return [item for item in findings if isinstance(item, dict) and item.get("signal") == signal]


def _facts(finding: dict[str, Any]) -> dict[str, Any]:
    facts = _get(finding, "facts")
    assert isinstance(facts, dict), f"the facts are not a dict: {facts!r}"
    return facts


def _dicts(value: Any) -> list[dict[str, Any]]:
    """Return each dict inside a JSON value, the value itself included."""
    if isinstance(value, dict):
        return [value, *(found for item in value.values() for found in _dicts(item))]
    if isinstance(value, list):
        return [found for item in value for found in _dicts(item)]
    return []


def _pep723_block(text: str) -> str | None:
    """Return the body of the PEP 723 script block, with the comment marks removed."""
    lines = text.splitlines()
    if "# /// script" not in lines:
        return None
    body: list[str] = []
    for line in lines[lines.index("# /// script") + 1:]:
        if line == "# ///":
            return "\n".join(body)
        if not line.startswith("#"):
            return None
        body.append(line[2:] if line.startswith("# ") else line[1:])
    return None


# ---------------------------------------------------------------------------
# Cases: the file lists, the contract drift, the boundary edges, and the entry point
# ---------------------------------------------------------------------------


def test_added_modified_and_untracked_files_land_in_their_lists(tmp_path):
    repo = _new_repo(tmp_path)
    base = _commit(repo, {".gitignore": "*.log\n", "old.py": "VALUE = 1\n", "keep.py": "KEEP = 1\n"})
    _commit(repo, {"added.py": "ADDED = 1\n"}, "add a file")
    _write(repo, "old.py", "VALUE = 2\n")
    _write(repo, "untracked.py", "NEW = 1\n")
    _write(repo, "build.log", "ignored\n")
    files = _api(_load_evidence(), "slice_files")(repo, base)
    assert set(_list(files, "added")) == {"added.py", "untracked.py"}
    assert set(_list(files, "modified")) == {"old.py"}


def test_added_lines_gives_the_line_number_of_each_added_line(tmp_path):
    repo = _new_repo(tmp_path)
    base = _commit(repo, {"mod.py": "A = 1\nB = 2\n"})
    _write(repo, "mod.py", "A = 1\nNEW = 9\nB = 2\n")
    added_lines = _api(_load_evidence(), "added_lines")
    assert added_lines(repo, base, "mod.py") == [2]


def test_a_changed_raise_gives_one_contract_drift_finding_with_its_untouched_caller(tmp_path):
    repo = _new_repo(tmp_path)
    base = _commit(repo, {"lib.py": LIB_BEFORE, "caller.py": CALLER, "other.py": "OTHER = 1\n"})
    _write(repo, "lib.py", LIB_AFTER)
    drift = _findings(_build(repo, base), "contract-drift")
    assert len(drift) == 1, f"expected one contract-drift finding, got {drift}"
    assert _get(drift[0], "path") == "lib.py"
    facts = _facts(drift[0])
    assert _get(facts, "kind") == "raises-changed", f"facts: {facts}"
    assert _get(facts, "symbol") == "fetch"
    assert _get(facts, "class") == "error"
    assert _get(facts, "callers_untouched") == ["caller.py"]
    assert _get(facts, "callers_total") == 1


def test_the_caller_list_stops_at_ten_and_the_packet_counts_every_caller(tmp_path):
    repo = _new_repo(tmp_path)
    callers = {f"caller_{index:02d}.py": "value = fetch(1)\n" for index in range(12)}
    base = _commit(repo, {"lib.py": LIB_BEFORE, **callers})
    _write(repo, "lib.py", LIB_AFTER)
    listed = _api(_load_evidence(), "callers_untouched")(repo, "fetch", {"lib.py"})
    assert len(listed) == 10, f"the cap is 10 callers, got {len(listed)}"
    assert set(listed) <= set(callers), f"a listed file is not a caller: {listed}"
    facts = _facts(_only(_findings(_build(repo, base), "contract-drift")))
    assert _get(facts, "callers_total") == 12
    assert len(_list(facts, "callers_untouched")) == 10


def test_callers_match_whole_words_and_skip_files_in_the_diff(tmp_path):
    repo = _new_repo(tmp_path)
    _commit(repo, {
        "lib.py": LIB_BEFORE,
        "real.py": "value = fetch(1)\n",
        "near.py": "value = fetched_store\n",
    })
    callers_untouched = _api(_load_evidence(), "callers_untouched")
    assert sorted(callers_untouched(repo, "fetch", {"lib.py"})) == ["real.py"]
    assert sorted(callers_untouched(repo, "Client.fetch", {"lib.py"})) == ["real.py"]


@pytest.mark.parametrize(
    "destination_is_new",
    [True, False],
    ids=["untracked-new-file", "tracked-existing-file"],
)
def test_a_moved_function_gives_no_removed_event_and_records_moved_to(tmp_path, destination_is_new):
    repo = _new_repo(tmp_path)
    files = {"lib.py": MOVED_BEFORE}
    if not destination_is_new:
        files["moved.py"] = "OTHER = 1\n"
    base = _commit(repo, files)
    _write(repo, "lib.py", MOVED_AFTER)
    _write(repo, "moved.py", MOVED_TARGET)
    packet = _build(repo, base)
    removed = [item for item in _dicts(packet) if item.get("kind") == "removed"]
    assert removed == [], f"a moved function gives no removed event: {removed}"
    records = [item for item in _dicts(packet) if item.get("moved_to") == "moved.py"]
    assert records, "no record holds moved_to: moved.py"


def test_a_removed_function_with_no_new_home_gives_a_removed_event(tmp_path):
    repo = _new_repo(tmp_path)
    base = _commit(repo, {"lib.py": MOVED_BEFORE})
    _write(repo, "lib.py", MOVED_AFTER)
    packet = _build(repo, base)
    removed = [
        finding for finding in _findings(packet, "contract-drift")
        if _get(_facts(finding), "kind") == "removed"
    ]
    assert len(removed) == 1, f"expected one removed event, got {removed}"
    assert _get(removed[0], "path") == "lib.py"
    assert _get(_facts(removed[0]), "symbol") == "helper"
    assert not [item for item in _dicts(packet) if item.get("moved_to")], "no move exists to record"


def test_drift_checks_modified_product_files_and_not_test_names_or_new_files(tmp_path):
    repo = _new_repo(tmp_path)
    base = _commit(repo, {
        "test_lib.py": "def check(a):\n    return a\n",
        "lib.py": "def run(a):\n    return a\n",
    })
    _write(repo, "test_lib.py", "def check(a, b):\n    return a\n")
    _write(repo, "lib.py", "def run(a, b):\n    return a\n")
    _write(repo, "fresh.py", "def make(a, b):\n    return a\n")
    drift = _findings(_build(repo, base), "contract-drift")
    assert [_get(item, "path") for item in drift] == ["lib.py"], f"got {drift}"
    assert _get(_facts(drift[0]), "kind") == "new-required-param"


def test_a_modified_file_that_does_not_parse_gives_no_finding_and_a_not_analysed_line(
    tmp_path, monkeypatch
):
    repo = _new_repo(tmp_path)
    base = _commit(repo, {"lib.py": LIB_BEFORE})
    _write(repo, "lib.py", "def fetch(key:\n    return key\n")
    out = tmp_path / "packet.json"
    monkeypatch.chdir(repo)
    assert _run_main(["--base", base, "--out", str(out)]) == 0
    packet = _read_packet(out)
    assert packet["findings"] == [], f"a file that does not parse gives no finding: {packet['findings']}"
    assert any("lib.py" in line for line in packet["not_analysed"]), f"not_analysed: {packet['not_analysed']}"


def test_a_boundary_edge_in_an_added_line_gives_a_finding_and_an_old_line_gives_none(tmp_path):
    repo = _new_repo(tmp_path)
    base = _commit(repo, {
        **_alpha_beta_records(),
        "alpha/mod.py": 'OLD = "beta/ledger.py"\n',
        "beta/ledger.py": "LEDGER = 1\n",
    })
    _write(repo, "alpha/mod.py", 'OLD = "beta/ledger.py"\nLINK = "beta/ledger.py"\n')
    edges = _findings(_build(repo, base), "boundary-edge")
    assert len(edges) == 1, f"expected one boundary-edge finding, got {edges}"
    assert _get(edges[0], "path") == "alpha/mod.py"
    facts = _facts(edges[0])
    assert _get(facts, "line") == 2, f"the added line is line 2: {facts}"
    assert _get(facts, "to_context") == "beta"
    assert _get(facts, "kind") == "outside-allowed"


def test_a_boundary_edge_in_an_added_file_gives_a_finding(tmp_path):
    repo = _new_repo(tmp_path)
    base = _commit(repo, {**_alpha_beta_records(), "beta/ledger.py": "LEDGER = 1\n"})
    _write(repo, "alpha/new.py", 'NEW = "beta/ledger.py"\n')
    edges = _findings(_build(repo, base), "boundary-edge")
    found = [(_get(edge, "path"), _get(_facts(edge), "line")) for edge in edges]
    assert found == [("alpha/new.py", 1)], f"got {found}"


def test_prose_forbidden_targets_reach_the_agent_for_touched_contexts_only(tmp_path):
    repo = _new_repo(tmp_path)
    base = _commit(repo, {
        "docs/architecture/contexts/alpha/boundary.yaml": _record(
            "alpha", "alpha", forbidden=((PROSE_TARGET, "the coach reads the script"),)
        ),
        "docs/architecture/contexts/beta/boundary.yaml": _record(
            "beta", "beta", forbidden=((OTHER_PROSE_TARGET, "a second rule"),)
        ),
        "alpha/mod.py": "OLD = 1\n",
        "beta/ledger.py": "LEDGER = 1\n",
    })
    _write(repo, "alpha/mod.py", "OLD = 2\n")
    rules = _list(_build(repo, base)["evidence"], "boundary_rules_for_agent")
    text = json.dumps(rules)
    assert PROSE_TARGET in text, f"the prose rule of the touched context is missing: {rules}"
    assert OTHER_PROSE_TARGET not in text, f"an untouched context leaks a rule: {rules}"


def test_excluded_paths_stay_out_of_the_file_lists(tmp_path):
    repo = _new_repo(tmp_path)
    base = _commit(repo, {"keep.py": "KEEP = 1\n"})
    _write(repo, "docs/guide.md", "# Guide\n")
    _write(repo, "real.py", "REAL = 1\n")
    packet = _build(repo, base)
    added = _list(_get(packet, "files"), "added")
    assert "real.py" in added, f"added: {added}"
    assert "docs/guide.md" not in added, f"an excluded path is in the diff: {added}"
    assert any("docs" in line for line in packet["not_analysed"]), f"not_analysed: {packet['not_analysed']}"


def test_a_bad_base_gives_one_not_analysed_line_and_exit_zero(tmp_path, monkeypatch):
    repo = _new_repo(tmp_path)
    _commit(repo, {"lib.py": LIB_BEFORE})
    out = tmp_path / "packet.json"
    monkeypatch.chdir(repo)
    assert _run_main(["--base", "no-such-revision", "--out", str(out)]) == 0
    packet = _read_packet(out)
    assert packet["findings"] == [], f"a bad base gives no finding: {packet['findings']}"
    assert len(packet["not_analysed"]) == 1, f"not_analysed: {packet['not_analysed']}"


@pytest.mark.parametrize(
    "argv",
    [["--bogus"], ["--base"]],
    ids=["unknown-option", "option-without-value"],
)
def test_a_usage_error_exits_two(tmp_path, monkeypatch, argv):
    monkeypatch.chdir(_new_repo(tmp_path))
    assert _run_main(argv) == 2


def test_the_packet_file_has_the_contract_keys(tmp_path, monkeypatch):
    repo = _new_repo(tmp_path)
    base = _commit(repo, {"lib.py": LIB_BEFORE})
    _write(repo, "lib.py", LIB_AFTER)
    out = tmp_path / "packet.json"
    monkeypatch.chdir(repo)
    assert _run_main(["--base", base, "--out", str(out)]) == 0
    packet = _read_packet(out)
    assert packet["schema"] == 1
    assert packet["base"] == base
    assert "boundary_rules_for_agent" in _get(packet, "evidence")


def test_without_base_the_diff_starts_at_the_merge_base_with_the_default_branch(tmp_path, monkeypatch):
    repo = _new_repo(tmp_path)
    fork = _commit(repo, {"old.py": "VALUE = 1\n"}, "base on main")
    _git(repo, "checkout", "-q", "-b", "feature")
    _commit(repo, {"new.py": "NEW = 1\n"}, "feature work")
    _write(repo, "old.py", "VALUE = 2\n")
    out = tmp_path / "packet.json"
    monkeypatch.chdir(repo)
    assert _run_main(["--out", str(out)]) == 0
    packet = _read_packet(out)
    assert packet["base"] == fork, "the base is not the merge-base with main"
    assert "new.py" in _list(packet["files"], "added")
    assert "old.py" in _list(packet["files"], "modified")


def test_the_script_runs_under_uv_and_prints_the_packet_path(tmp_path):
    assert EVIDENCE_PATH.exists(), f"missing {EVIDENCE_PATH}: slice 8 creates this script"
    repo = _new_repo(tmp_path)
    base = _commit(repo, {"lib.py": LIB_BEFORE})
    _write(repo, "lib.py", LIB_AFTER)
    out = tmp_path / "packet.json"
    result = subprocess.run(
        ["uv", "run", str(EVIDENCE_PATH), "--base", base, "--out", str(out)],
        cwd=repo,
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )
    assert result.returncode == 0, f"uv run exited {result.returncode}: {result.stderr}"
    printed = [str(path) for path in (out, out.resolve()) if str(path) in result.stdout]
    assert printed, f"the packet path is not printed: {result.stdout!r}"
    packet = _read_packet(out)
    assert len(_findings(packet, "contract-drift")) == 1


def test_the_script_declares_pyyaml_in_its_pep_723_block():
    assert EVIDENCE_PATH.exists(), f"missing {EVIDENCE_PATH}: slice 8 creates this script"
    block = _pep723_block(EVIDENCE_PATH.read_text(encoding="utf-8"))
    assert block is not None, "the script has no PEP 723 script block"
    try:
        dependencies = tomllib.loads(block).get("dependencies", [])
    except tomllib.TOMLDecodeError as error:
        raise AssertionError(f"the PEP 723 block is not TOML: {error}") from error
    assert any(str(dep).lower().startswith("pyyaml") for dep in dependencies), (
        f"the PEP 723 dependencies are {dependencies}"
    )
