"""Tests for the tuning limits that the config file of the structure signals sets.

Each limit is a field of Config. A value in .cobuilder/structure-signals.json changes the
behaviour of its signal. A bad value gives the defaults and a problem note. The option
--defaults prints every field as valid JSON.

Run with: uv run pytest tests/test_structure_config_limits.py -q
"""
from __future__ import annotations

import dataclasses
import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from _structure_repo_support import commit, new_repo

SHARED = Path(__file__).resolve().parents[1] / "shared"
sys.path.insert(0, str(SHARED))

from structure.config import CONFIG_RELPATH, Config, config_json, load_config  # noqa: E402
from structure.duplicates import duplicate_blocks  # noqa: E402
from structure.locality import consumer_locality  # noqa: E402
from structure.names import stem_cluster  # noqa: E402
from structure.repo import repo_findings  # noqa: E402
from structure.repo_folders import folder_table  # noqa: E402
from structure.repo_groups import co_change_groups, twin_names  # noqa: E402
from structure.boundary import import_groups  # noqa: E402
from structure.slice_drift import callers_untouched  # noqa: E402

DEFAULTS: dict[str, Any] = {
    "examples_max": 5,
    "parse_cap": 60,
    "dup_min_line_chars": 4,
    "dup_min_distinct_lines": 4,
    "dup_named_lines_drop": 4,
    "dup_skip_prefixes": ("#", "//", "*", "/*", "import ", "from ", "export {", "}", ")", "]"),
    "locality_min_importers": 2,
    "layer_limit": 3,
    "twin_excluded_stems": frozenset({
        "index", "__init__", "main", "types", "conftest",
        "page", "route", "layout", "loading", "error", "not-found", "template", "default",
    }),
    "co_change_max_commit_files": 30,
    "co_change_min_support": 5,
    "co_change_min_jaccard": 0.5,
    "folder_table_min_code": 3,
    "change_window_days": 90,
    "wide_change_window_days": 365,
    "min_window_commits": 20,
    "co_change_days": 365,
    "caller_cap": 10,
}


def _write_config(root: Path, data: object) -> None:
    path = root / CONFIG_RELPATH
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data), encoding="utf-8")


def _files(root: Path, files: dict[str, str]) -> list[str]:
    for rel, text in files.items():
        (root / rel).parent.mkdir(parents=True, exist_ok=True)
        (root / rel).write_text(text, encoding="utf-8")
    return sorted(files)


def test_the_defaults_equal_the_old_constants():
    config = Config()
    for name, value in DEFAULTS.items():
        assert getattr(config, name) == value, f"{name} is {getattr(config, name)!r}, not {value!r}"
    assert isinstance(config.co_change_min_jaccard, float)
    assert isinstance(config.dup_skip_prefixes, tuple)
    assert isinstance(config.twin_excluded_stems, frozenset)


def test_a_loaded_file_sets_each_limit_with_its_type(tmp_path):
    _write_config(tmp_path, {
        "parse_cap": 7, "co_change_min_jaccard": 0.8, "dup_skip_prefixes": ["x"],
        "twin_excluded_stems": ["Rail"], "caller_cap": 0,
    })
    config = load_config(tmp_path)
    assert config.problem is None, config.problem
    assert config.parse_cap == 7
    assert config.co_change_min_jaccard == 0.8
    assert config.dup_skip_prefixes == ("x",)
    assert config.twin_excluded_stems == frozenset({"rail"})
    assert config.caller_cap == 0


def test_a_whole_number_is_a_good_jaccard_limit(tmp_path):
    _write_config(tmp_path, {"co_change_min_jaccard": 1})
    config = load_config(tmp_path)
    assert config.problem is None, config.problem
    assert config.co_change_min_jaccard == 1.0


@pytest.mark.parametrize("bad", [1.5, -0.1, True, "x", None, [0.5]])
def test_a_bad_jaccard_limit_gives_the_defaults_and_a_problem_note(tmp_path, bad):
    _write_config(tmp_path, {"co_change_min_jaccard": bad, "parse_cap": 7})
    config = load_config(tmp_path)
    assert config.problem is not None
    assert "co_change_min_jaccard" in config.problem, config.problem
    assert dataclasses.replace(config, problem=None) == Config()


@pytest.mark.parametrize(
    ("name", "bad"),
    [
        ("parse_cap", -1), ("parse_cap", 1.5), ("parse_cap", True), ("layer_limit", "3"),
        ("dup_skip_prefixes", "#"), ("dup_skip_prefixes", [1]),
        ("twin_excluded_stems", "index"), ("twin_excluded_stems", [None]),
        ("change_window_days", -5),
    ],
)
def test_another_bad_limit_gives_the_defaults_and_a_problem_note(tmp_path, name, bad):
    _write_config(tmp_path, {name: bad})
    config = load_config(tmp_path)
    assert config.problem is not None and name in config.problem, config.problem
    assert dataclasses.replace(config, problem=None) == Config()


def test_parse_cap_stops_the_import_reader(tmp_path):
    files = _files(tmp_path, {f"pkg/m{n}.py": "VALUE = 1\n" for n in range(3)})
    groups, _ = import_groups("pkg", files, tmp_path, Config())
    assert groups == ()
    groups, notes = import_groups("pkg", files, tmp_path, Config(parse_cap=2))
    assert groups is None
    assert "parse cap of 2" in notes[0], notes


def test_layer_limit_and_min_importers_change_the_locality_entries():
    graph = {
        "app/a.py": {"lib/x.py", "lib/y.py", "lib/z.py"},
        "app/b.py": {"lib/x.py"},
    }
    assert consumer_locality(graph, ["lib/x.py"], Config()) == []
    kept = consumer_locality(graph, ["lib/x.py"], Config(layer_limit=4))
    assert [entry["path"] for entry in kept] == ["lib/x.py"]
    assert consumer_locality(graph, ["lib/x.py"], Config(layer_limit=4, locality_min_importers=3)) == []


def test_co_change_limits_change_the_groups():
    commits = [["a/x.py", "b/y.py"]] * 5
    files = {"a/x.py", "b/y.py"}
    assert len(co_change_groups(commits, files, Config())) == 1
    assert co_change_groups(commits, files, Config(co_change_min_support=6)) == []
    assert co_change_groups(commits, files, Config(co_change_max_commit_files=1)) == []
    assert co_change_groups(commits, files, Config(co_change_min_jaccard=1.0)) != []
    loose = [*commits, ["a/x.py"], ["a/x.py"]]
    assert co_change_groups(loose, files, Config()) != []
    assert co_change_groups(loose, files, Config(co_change_min_jaccard=0.9)) == []


def test_examples_max_cuts_the_examples_of_a_cluster():
    files = [f"src/alpha_{name}.py" for name in "abcdefg"]
    found = stem_cluster(files[0], files, Config())
    assert found is not None and found.facts["examples"].count(",") == 4, found
    found = stem_cluster(files[0], files, Config(examples_max=2))
    assert found is not None and found.facts["examples"].count(",") == 1, found


def test_twin_excluded_stems_change_the_twin_names():
    files = ["left/rail.py", "right/rail.py", "left/index.py", "right/index.py"]
    stems = [finding.facts["stem"] for finding in twin_names(files, Config())]
    assert stems == ["rail"]
    config = Config(twin_excluded_stems=frozenset({"rail"}))
    assert [finding.facts["stem"] for finding in twin_names(files, config)] == ["index"]


BODY = (
    "total = compute(alpha)\nresult = combine(total, beta)\nreport = render(result)\n"
    "output = publish(report)\nfinal = archive(output)\nreturn final\n"
)


def test_the_duplicate_limits_change_the_blocks():
    texts = [("one.py", BODY), ("two.py", BODY)]
    assert len(duplicate_blocks(texts, Config())) == 1
    assert duplicate_blocks(texts, Config(dup_min_distinct_lines=7)) == []
    assert duplicate_blocks(texts, Config(dup_min_line_chars=40)) == []
    assert duplicate_blocks(texts, Config(dup_skip_prefixes=("total", "result"))) == []


def test_folder_table_min_code_changes_the_rows(tmp_path):
    files = _files(tmp_path, {f"pkg/m{n}.py": "VALUE = 1\n" for n in range(3)})
    assert len(folder_table(tmp_path, files, {}, Config(), [])) == 1
    assert folder_table(tmp_path, files, {}, Config(folder_table_min_code=4), []) == []


def test_the_window_limits_change_the_record(tmp_path):
    repo = new_repo(tmp_path)
    commit(repo, {"pkg/one.py": "VALUE = 1\n"}, 30)
    assert repo_findings(repo, None)["window_days"] == 365
    _write_config(repo, {"min_window_commits": 1})
    assert repo_findings(repo, None)["window_days"] == 90
    _write_config(repo, {"min_window_commits": 1, "change_window_days": 40})
    assert repo_findings(repo, None)["window_days"] == 40
    _write_config(repo, {"wide_change_window_days": 400})
    assert repo_findings(repo, None)["window_days"] == 400


def test_caller_cap_changes_the_caller_list(tmp_path):
    repo = new_repo(tmp_path)
    callers = {f"use_{n:02d}.py": "from lib import fetch\nfetch(1)\n" for n in range(12)}
    commit(repo, {"lib.py": "def fetch(key):\n    return key\n", **callers}, 5)
    assert len(callers_untouched(repo, "fetch", {"lib.py"})) == 10
    _write_config(repo, {"caller_cap": 3})
    assert len(callers_untouched(repo, "fetch", {"lib.py"})) == 3


def test_defaults_prints_every_field_as_valid_json():
    result = subprocess.run(
        [sys.executable, str(SHARED / "structure_signals.py"), "--defaults"],
        check=True, capture_output=True, text=True,
    )
    printed = json.loads(result.stdout)
    names = [field.name for field in dataclasses.fields(Config) if field.name != "problem"]
    assert list(printed) == names
    assert set(DEFAULTS) <= set(printed)
    assert printed["co_change_min_jaccard"] == 0.5
    assert printed["dup_skip_prefixes"] == list(DEFAULTS["dup_skip_prefixes"])
    assert printed["twin_excluded_stems"] == sorted(DEFAULTS["twin_excluded_stems"])
    assert printed == json.loads(json.dumps(config_json(Config())))


def test_the_printed_defaults_load_back_as_the_defaults(tmp_path):
    _write_config(tmp_path, config_json(Config()))
    assert load_config(tmp_path) == Config()
