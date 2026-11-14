"""Tests for the name rules of shared/structure_signals.py, slice 2 of structure-coaching (E1).

The slice covers the token split, the test-name rule, the name-stem cluster,
the generic name, the families fact, the config file, the excluded paths, and
the command with --file, --survey, and --defaults. Each case builds a git repo
in tmp_path, or calls a pure function. No case reads this repository.

The command runs by its absolute path, with the tmp repo as its working folder.

Run with: uv run pytest tests/test_structure_names.py -q
"""
from __future__ import annotations

import dataclasses
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
STRUCTURE_SIGNALS_PATH = REPO_ROOT / "shared" / "structure_signals.py"
CONFIG_RELPATH = ".cobuilder/structure-signals.json"
COMMIT_OPTIONS = ("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false")
# Twelve first tokens that are not generic, not excluded, and not test names.
FILLER_STEMS = ("ant", "bee", "cat", "dog", "eel", "fox", "gnu", "hen", "ibis", "jay", "koi", "lynx")


def _load_structure_signals() -> ModuleType:
    """Return the module, or fail with an assertion when the file is missing."""
    assert STRUCTURE_SIGNALS_PATH.exists(), f"missing {STRUCTURE_SIGNALS_PATH}"
    spec = importlib.util.spec_from_file_location("structure_signals", STRUCTURE_SIGNALS_PATH)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    # Register the module first. Dataclasses look up their module by name.
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _api(signals: ModuleType, name: str) -> Any:
    """Return a public name of the module, or fail with an assertion when it is missing."""
    assert hasattr(signals, name), f"structure_signals has no public name {name!r} yet"
    return getattr(signals, name)


def _limits(config: Any) -> dict[str, Any]:
    """Return each config field but the problem note, so that defaults compare as equal."""
    return {
        field.name: getattr(config, field.name)
        for field in dataclasses.fields(config)
        if field.name != "problem"
    }


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True, text=True)


def _new_repo(tmp_path: Path, branch: str = "main") -> Path:
    """Return an empty repo whose HEAD names branch, so the default branch is known."""
    repo = tmp_path / "repo"
    repo.mkdir()
    repo = repo.resolve()
    _git(repo, "init", "-q")
    _git(repo, "symbolic-ref", "HEAD", f"refs/heads/{branch}")
    return repo


def _write(repo: Path, rel: str, text: str = "content\n") -> Path:
    target = repo / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(text)
    return target


def _write_config(repo: Path, text: str) -> None:
    _write(repo, CONFIG_RELPATH, text)


def _commit_all(repo: Path, message: str = "base") -> None:
    _git(repo, "add", "-A")
    _git(repo, *COMMIT_OPTIONS, "commit", "-q", "-m", message)


def _committed_repo(tmp_path: Path, rel_paths: list[str]) -> Path:
    """Return a repo on main whose first commit holds rel_paths."""
    repo = _new_repo(tmp_path)
    for rel in rel_paths:
        _write(repo, rel)
    _commit_all(repo)
    return repo


def _names(folder: str, stem: str, count: int, suffix: str = ".py") -> list[str]:
    """Return count repo paths of one stem in one folder: stem_a, stem_b, and so on."""
    return [f"{folder}/{stem}_{chr(ord('a') + index)}{suffix}" for index in range(count)]


def _files(folder: str, count: int, suffix: str = ".py", prefix: str = "mod") -> list[str]:
    return [f"{folder}/{prefix}_{index:02d}{suffix}" for index in range(count)]


def _findings(report: Any, signal: str) -> list[Any]:
    return [finding for finding in report.findings if finding.signal == signal]


def _clusters(report: Any) -> list[Any]:
    return _findings(report, "name-stem-cluster")


def _generic(report: Any) -> list[Any]:
    return _findings(report, "generic-name")


def _crowded(report: Any) -> list[Any]:
    return _findings(report, "crowded-folder")


def _example_names(value: Any) -> list[str]:
    """Return the file names of an examples value, which is a list or a comma-joined string."""
    items = value if isinstance(value, list) else str(value).split(",")
    return [Path(str(item).strip()).name for item in items if str(item).strip()]


def _run_script(repo: Path, *args: str) -> subprocess.CompletedProcess[str]:
    """Run the script by its absolute path, from the tmp repo, so it reads only that repo."""
    return subprocess.run(
        ["python3", str(STRUCTURE_SIGNALS_PATH), *args],
        cwd=repo,
        capture_output=True,
        text=True,
        timeout=60,
    )


def _json_out(result: subprocess.CompletedProcess[str]) -> Any:
    """Return the parsed stdout. Fail with an assertion that shows what the run printed."""
    assert result.returncode == 0, f"exit {result.returncode}: {result.stderr.strip()[-300:]}"
    try:
        return json.loads(result.stdout)
    except ValueError as error:
        assert False, f"stdout is not JSON ({error}): {result.stdout[:200]!r}"


def _contains(value: Any, needle: Any) -> bool:
    """Return True when needle is a value anywhere in the parsed JSON."""
    if value == needle:
        return True
    if isinstance(value, dict):
        return any(_contains(item, needle) for item in value.values())
    if isinstance(value, list):
        return any(_contains(item, needle) for item in value)
    return False


# ---------------------------------------------------------------------------
# The token split and the test-name rule
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("stem", "tokens"),
    [
        ("beads_claim_next", ["beads", "claim", "next"]),
        ("tracker-usage", ["tracker", "usage"]),
        ("IntentDrawing", ["intent", "drawing"]),
        ("HTTPServerError", ["http", "server", "error"]),
        ("foo.test", ["foo", "test"]),
        ("s3_config", ["s3", "config"]),
    ],
)
def test_split_tokens_gives_the_lower_case_tokens_of_the_a5_table(stem, tokens):
    signals = _load_structure_signals()

    assert _api(signals, "split_tokens")(stem) == tokens


@pytest.mark.parametrize("name", ["test_x.py", "x.test.ts", "x.spec.ts", "x_test.go", "test-x.ts"])
def test_is_test_name_is_true_for_each_test_form(name):
    signals = _load_structure_signals()

    assert _api(signals, "is_test_name")(name, signals.Config()) is True


@pytest.mark.parametrize("name", ["tracker.py", "latest.py", "testing.py", "contest_x.py"])
def test_is_test_name_is_false_for_names_that_only_contain_test(name):
    signals = _load_structure_signals()

    assert _api(signals, "is_test_name")(name, signals.Config()) is False


# ---------------------------------------------------------------------------
# Excluded paths
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("rel", "glob"),
    [
        ("pkg/docs/readme.md", "**/docs/**"),
        ("docs/readme.md", "**/docs/**"),
        ("documentation/prds/phase1-guide.md", "**/documentation/**"),
        ("fixtures/a.json", "**/fixtures/**"),
        ("src/fixtures/a.json", "**/fixtures/**"),
        (".cache/x.py", "**/.*/**"),
        ("src/.cache/x.py", "**/.*/**"),
    ],
)
def test_excluded_by_names_the_glob_that_excludes_the_path(rel, glob):
    signals = _load_structure_signals()

    assert _api(signals, "excluded_by")(rel, signals.Config()) == glob


def test_excluded_by_gives_none_when_no_glob_matches_a_whole_folder_name():
    signals = _load_structure_signals()
    excluded_by = _api(signals, "excluded_by")

    assert excluded_by("src/pkg/mod.py", signals.Config()) is None
    assert excluded_by("src/docstrings/mod.py", signals.Config()) is None


# ---------------------------------------------------------------------------
# Signal 2: the name-stem cluster
# ---------------------------------------------------------------------------


def test_three_new_siblings_give_a_name_stem_cluster(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, ["src/pkg/keep.py"])
    new = [_write(repo, rel) for rel in _names("src/pkg", "beads", 3)]

    report = signals.signals_for(str(new[0]), repo, signals.Config())

    clusters = _clusters(report)
    assert len(clusters) == 1, f"expected one name-stem-cluster finding, got {report.findings!r}"
    finding = clusters[0]
    assert finding.path == "src/pkg/beads_a.py"
    assert finding.folder == "src/pkg"
    assert finding.facts["stem"] == "beads"
    assert finding.facts["count"] == 3


def test_examples_name_at_most_five_siblings_in_sort_order(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, ["src/pkg/keep.py"])
    new = [_write(repo, rel) for rel in _names("src/pkg", "beads", 7)]

    report = signals.signals_for(str(new[3]), repo, signals.Config())

    clusters = _clusters(report)
    assert len(clusters) == 1, f"expected one name-stem-cluster finding, got {report.findings!r}"
    assert "examples" in clusters[0].facts, f"the finding has no examples: {clusters[0].facts!r}"
    assert clusters[0].facts["count"] == 7
    assert _example_names(clusters[0].facts["examples"]) == [
        "beads_a.py", "beads_b.py", "beads_c.py", "beads_d.py", "beads_e.py",
    ]


def test_two_new_siblings_give_no_cluster_and_a_third_does(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, ["src/pkg/keep.py"])
    first = _write(repo, "src/pkg/beads_a.py")
    _write(repo, "src/pkg/beads_b.py")

    two = signals.signals_for(str(first), repo, signals.Config())
    assert _clusters(two) == [], "two siblings must give no cluster"

    third = _write(repo, "src/pkg/beads_c.py")
    three = signals.signals_for(str(third), repo, signals.Config())
    assert len(_clusters(three)) == 1, "control: a third sibling must give the cluster"


@pytest.mark.parametrize(
    ("sub_folder", "cluster_expected"),
    [("beads", False), ("beads_store", True)],
    ids=["sub-folder-named-for-the-stem", "sub-folder-with-more-tokens"],
)
def test_sub_folder_named_for_the_stem_stops_the_cluster(tmp_path, sub_folder, cluster_expected):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, ["src/pkg/keep.py", f"src/pkg/{sub_folder}/store.py"])
    new = [_write(repo, rel) for rel in _names("src/pkg", "beads", 3)]
    plain = [_write(repo, rel) for rel in _names("src/plain", "beads", 3)]

    control = signals.signals_for(str(plain[0]), repo, signals.Config())
    assert len(_clusters(control)) == 1, "control: three siblings in a folder with no sub-folder give a cluster"

    report = signals.signals_for(str(new[0]), repo, signals.Config())
    assert (len(_clusters(report)) == 1) is cluster_expected, (
        f"sub-folder {sub_folder!r}: expected a cluster of {cluster_expected}, got {report.findings!r}"
    )


def test_test_files_do_not_start_or_join_a_cluster(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, ["src/base/keep.py"])
    plain = [_write(repo, rel) for rel in _names("src/plain", "beads", 3, ".ts")]
    tests = [_write(repo, rel) for rel in _names("src/tests", "beads", 3, ".test.ts")]
    first_mixed = _write(repo, "src/mixed/beads_a.ts")
    _write(repo, "src/mixed/beads_b.ts")
    _write(repo, "src/mixed/beads_c.test.ts")

    control = signals.signals_for(str(plain[0]), repo, signals.Config())
    assert len(_clusters(control)) == 1, "control: three non-test siblings give a cluster"
    for path in tests:
        report = signals.signals_for(str(path), repo, signals.Config())
        assert _clusters(report) == [], f"{path.name} is a test name, so it starts no cluster"
    report = signals.signals_for(str(first_mixed), repo, signals.Config())
    assert _clusters(report) == [], "a test-name file must not count as a sibling"


@pytest.mark.parametrize(
    "template",
    ["test_widget_{}.py", "test-widget-{}.ts"],
    ids=["underscore-prefix", "dash-prefix"],
)
def test_test_prefix_files_give_no_cluster(tmp_path, template):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, ["src/base/keep.py"])
    prefixed = [_write(repo, f"src/pkg/{template.format(letter)}") for letter in "abc"]
    plain = [_write(repo, f"src/plain/widget_{letter}.py") for letter in "abc"]

    control = signals.signals_for(str(plain[0]), repo, signals.Config())
    assert len(_clusters(control)) == 1, "control: three widget siblings give a cluster"
    for path in prefixed:
        report = signals.signals_for(str(path), repo, signals.Config())
        assert _clusters(report) == [], f"{path.name} is a test name, so it starts no cluster"


@pytest.mark.parametrize("stem", ["a", "an", "the", "index", "main", "init", "use", "2024"])
def test_excluded_stem_or_all_digit_stem_gives_no_cluster(tmp_path, stem):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, ["src/base/keep.py"])
    excluded = [_write(repo, rel) for rel in _names("src/stems", stem, 3)]
    plain = [_write(repo, rel) for rel in _names("src/plain", "beads", 3)]

    control = signals.signals_for(str(plain[0]), repo, signals.Config())
    assert len(_clusters(control)) == 1, "control: three beads siblings give a cluster"
    report = signals.signals_for(str(excluded[0]), repo, signals.Config())
    assert _clusters(report) == [], f"the stem {stem!r} is excluded, so it gives no cluster"


@pytest.mark.parametrize(
    ("folder", "cluster_expected"),
    [
        ("components/university", False),
        ("app/university/tabs/panel", False),
        ("university/tabs/panel/deep", True),
    ],
    ids=["stem-is-the-folder", "stem-in-the-last-three-parts", "stem-above-the-last-three-parts"],
)
def test_stem_that_the_folder_path_holds_gives_no_cluster(tmp_path, folder, cluster_expected):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, ["src/base/keep.py"])
    inside = [_write(repo, rel) for rel in _names(folder, "university", 3, ".tsx")]
    shelf = [_write(repo, rel) for rel in _names("shelf", "university", 3, ".tsx")]

    control = signals.signals_for(str(shelf[0]), repo, signals.Config())
    assert len(_clusters(control)) == 1, "control: the stem in a folder that does not hold it gives a cluster"
    report = signals.signals_for(str(inside[0]), repo, signals.Config())
    assert (len(_clusters(report)) == 1) is cluster_expected, (
        f"folder {folder!r}: expected a cluster of {cluster_expected}, got {report.findings!r}"
    )


# ---------------------------------------------------------------------------
# Signal 3: the generic name
# ---------------------------------------------------------------------------


@pytest.mark.parametrize("name", ["_utils.py", "Helpers.ts", "_Common.tsx"])
def test_generic_name_with_a_leading_underscore_or_any_case_gives_a_finding(tmp_path, name):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, ["src/pkg/keep.py"])
    generic = _write(repo, f"src/pkg/{name}")
    plain = _write(repo, "src/pkg/utilities.py")

    report = signals.signals_for(str(generic), repo, signals.Config())

    found = _generic(report)
    assert len(found) == 1, f"expected one generic-name finding for {name}, got {report.findings!r}"
    assert found[0].path == f"src/pkg/{name}"
    assert _generic(signals.signals_for(str(plain), repo, signals.Config())) == [], (
        "utilities is not in the generic list, so it gives no finding"
    )


def test_old_generic_name_file_gives_no_generic_finding(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, ["src/pkg/utils.py", "src/pkg/keep.py"])
    fresh = _write(repo, "src/pkg/helpers.py")

    control = signals.signals_for(str(fresh), repo, signals.Config())
    assert len(_generic(control)) == 1, "control: a new generic-name file gives a finding"

    old = repo / "src/pkg/utils.py"
    old.write_text("changed\n")
    report = signals.signals_for(str(old), repo, signals.Config())
    assert _generic(report) == [], "an old file on the default branch is not new"


# ---------------------------------------------------------------------------
# The families fact of a crowded folder
# ---------------------------------------------------------------------------


def test_crowded_finding_names_the_families_largest_first_and_skips_test_files(tmp_path):
    signals = _load_structure_signals()
    base = (
        _names("src/pkg", "alpha", 4)
        + _names("src/pkg", "beta", 2)
        + ["src/pkg/alpha_a.test.ts", "src/pkg/alpha_b.spec.ts", "src/pkg/beta_a_test.go"]
        + [f"src/pkg/{stem}.py" for stem in FILLER_STEMS]
    )
    repo = _committed_repo(tmp_path, base)
    new = _write(repo, "src/pkg/zed.py")

    report = signals.signals_for(str(new), repo, signals.Config())

    crowded = _crowded(report)
    assert len(crowded) == 1, f"expected one crowded-folder finding, got {report.findings!r}"
    assert "families" in crowded[0].facts, f"the finding has no families fact: {crowded[0].facts!r}"
    families = crowded[0].facts["families"]
    assert isinstance(families, str), f"families must read as a string, got {families!r}"
    pairs = [(name, int(count)) for name, count in re.findall(r"([a-z0-9]+) \((\d+)\)", families)]
    assert pairs == [("alpha", 4), ("beta", 2)], f"families were {families!r}"


def test_files_that_hold_no_code_give_no_name_stem_cluster(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, _names("src/pkg", "prd", 3, ".md"))
    new = _write(repo, "src/pkg/prd_d.md")

    report = signals.signals_for(str(new), repo, signals.Config())

    assert _clusters(report) == [], f"documents are not code: {report.findings!r}"


def test_the_whole_repo_view_gives_no_name_stem_cluster_for_documents(tmp_path):
    signals = _load_structure_signals()
    from structure.repo_signals import stem_findings

    files = _names("src/pkg", "prd", 4, ".md") + _names("src/pkg", "beads", 3)
    found = stem_findings(files, signals.Config())

    assert [finding.facts["stem"] for finding in found] == ["beads"], f"got {found!r}"


def test_the_families_text_counts_only_code_files(tmp_path):
    signals = _load_structure_signals()
    base = (
        _names("src/pkg", "alpha", 2)
        + _names("src/pkg", "dockerfile", 4, ".prod")
        + [f"src/pkg/{stem}.py" for stem in FILLER_STEMS]
        + [f"src/pkg/{stem}_x.py" for stem in FILLER_STEMS[:6]]
    )
    repo = _committed_repo(tmp_path, base)
    new = _write(repo, "src/pkg/zed.py")

    crowded = _crowded(signals.signals_for(str(new), repo, signals.Config()))

    assert len(crowded) == 1, "control: the folder is crowded"
    assert "dockerfile" not in crowded[0].facts["families"], crowded[0].facts["families"]
    assert "alpha (2)" in crowded[0].facts["families"], crowded[0].facts["families"]


# ---------------------------------------------------------------------------
# The config file: defaults, bad files, and each limit
# ---------------------------------------------------------------------------


def test_missing_config_file_gives_the_defaults(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, ["src/pkg/keep.py"])
    assert not (repo / CONFIG_RELPATH).exists(), "control: the tree has no config file"

    config = _api(signals, "load_config")(repo)

    assert _limits(config) == _limits(signals.Config())


@pytest.mark.parametrize("text", ["{not json", "[1, 2]"], ids=["not-json", "json-list"])
def test_bad_config_file_gives_the_defaults(tmp_path, text):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, ["src/pkg/keep.py"])
    _write_config(repo, text)

    config = _api(signals, "load_config")(repo)

    assert _limits(config) == _limits(signals.Config())


def test_config_folder_limit_changes_the_crowded_limit(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, _files("src/pkg", 6))
    new = _write(repo, "src/pkg/new_mod.py")
    _write_config(repo, json.dumps({"folder_limit": 5}))

    report = signals.signals_for(str(new), repo, _api(signals, "load_config")(repo))

    crowded = _crowded(report)
    assert len(crowded) == 1, f"the config limit 5 must give a finding, got {report.findings!r}"
    assert crowded[0].facts["count"] == 7
    assert crowded[0].facts["limit"] == 5
    control = signals.signals_for(str(new), repo, signals.Config())
    assert _crowded(control) == [], "control: the default limit of 20 gives no finding"


def test_config_percentile_changes_the_limit_when_no_folder_limit_applies(tmp_path):
    signals = _load_structure_signals()
    folders = [f"src/d{index:02d}/one.py" for index in range(10)]
    repo = _committed_repo(tmp_path, folders + ["src/pkg/mod_00.py", "src/pkg/mod_01.py"])
    new = _write(repo, "src/pkg/new_mod.py")
    _write_config(repo, json.dumps({"folder_limit": None, "percentile": 50}))

    control = signals.signals_for(str(new), repo, signals.Config())
    assert _crowded(control) == [], "control: the default percentile and limit give no finding"

    report = signals.signals_for(str(new), repo, _api(signals, "load_config")(repo))
    crowded = _crowded(report)
    assert len(crowded) == 1, f"the 50th percentile of 1 must give a finding, got {report.findings!r}"
    assert crowded[0].facts["limit"] == 1
    assert crowded[0].facts["count"] == 3


def test_config_min_folders_changes_when_the_percentile_applies(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(
        tmp_path, ["src/a/one.py", "src/b/one.py", "src/pkg/mod_00.py", "src/pkg/mod_01.py"]
    )
    new = _write(repo, "src/pkg/new_mod.py")
    _write_config(repo, json.dumps({"folder_limit": None, "percentile": 50, "min_folders": 3}))

    control = signals.signals_for(str(new), repo, signals.Config(folder_limit=None, percentile=50))
    assert _crowded(control) == [], "control: three folders are fewer than the default minimum of ten"

    report = signals.signals_for(str(new), repo, _api(signals, "load_config")(repo))
    crowded = _crowded(report)
    assert len(crowded) == 1, f"min_folders 3 must let the percentile apply, got {report.findings!r}"
    assert crowded[0].facts["limit"] == 1


def test_config_cluster_min_changes_the_cluster_size(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, ["src/pkg/keep.py"])
    first = _write(repo, "src/pkg/beads_a.py")
    _write(repo, "src/pkg/beads_b.py")
    _write_config(repo, json.dumps({"cluster_min": 2}))

    control = signals.signals_for(str(first), repo, signals.Config())
    assert _clusters(control) == [], "control: two siblings give no cluster at the default minimum of three"

    report = signals.signals_for(str(first), repo, _api(signals, "load_config")(repo))
    clusters = _clusters(report)
    assert len(clusters) == 1, f"cluster_min 2 must give a cluster, got {report.findings!r}"
    assert clusters[0].facts["count"] == 2


def test_generic_names_come_from_the_config_list_only(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, ["src/pkg/keep.py"])
    tools = _write(repo, "src/pkg/tools.py")
    utils = _write(repo, "src/pkg/utils.py")
    _write_config(repo, json.dumps({"generic_names": ["tools"]}))
    config = _api(signals, "load_config")(repo)

    assert len(_generic(signals.signals_for(str(tools), repo, config))) == 1, "tools is in the config list"
    assert _generic(signals.signals_for(str(utils), repo, config)) == [], (
        "utils is not in the config list, so it gives no finding"
    )


# ---------------------------------------------------------------------------
# Excluded paths
# ---------------------------------------------------------------------------


def test_nested_docs_folder_is_excluded_from_the_crowded_signal(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, _files("plugins/x/docs", 25) + _files("plugins/x/notes", 25))
    docs_new = _write(repo, "plugins/x/docs/new_mod.py")
    notes_new = _write(repo, "plugins/x/notes/new_mod.py")

    control = signals.signals_for(str(notes_new), repo, signals.Config())
    assert len(_crowded(control)) == 1, "control: a crowded notes folder gives a finding"

    report = signals.signals_for(str(docs_new), repo, signals.Config())
    assert _crowded(report) == [], "a file in a nested docs folder is excluded from the signal"


def test_excluded_new_file_names_its_path_and_its_glob(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, ["src/pkg/keep.py"])
    new = _write(repo, "plugins/x/docs/new_mod.py")

    report = signals.signals_for(str(new), repo, signals.Config())

    assert report.findings == (), f"an excluded file gives no findings, got {report.findings!r}"
    assert any("**/docs/**" in line for line in report.not_analysed), (
        f"not_analysed must name the glob: {report.not_analysed!r}"
    )
    assert any("new_mod.py" in line for line in report.not_analysed), (
        f"not_analysed must name the path: {report.not_analysed!r}"
    )


def test_excluded_files_give_one_not_analysed_line_per_glob_with_its_count(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, ["docs/a.md", "docs/b.md", "src/pkg/keep.py"])
    new = _write(repo, "src/pkg/new_mod.py")

    report = signals.signals_for(str(new), repo, signals.Config())

    lines = [line for line in report.not_analysed if "**/docs/**" in line]
    assert len(lines) == 1, f"expected one line for **/docs/**, got {report.not_analysed!r}"
    assert re.search(r"\b2\b", lines[0]), f"the line must count the 2 files, got {lines[0]!r}"


# ---------------------------------------------------------------------------
# The command: --file, --survey, and --defaults
# ---------------------------------------------------------------------------


def test_file_option_prints_json_with_the_cluster_finding_of_the_file(tmp_path):
    repo = _committed_repo(tmp_path, ["src/base/keep.py"])
    paths = [_write(repo, rel) for rel in _names("src/pkg", "beads", 3)]

    data = _json_out(_run_script(repo, "--file", str(paths[0])))

    assert isinstance(data, dict), f"the report must be a JSON object, got {data!r}"
    assert {"findings", "not_analysed"} <= set(data), f"report keys were {sorted(data)}"
    matches = [
        finding
        for finding in data["findings"]
        if isinstance(finding, dict)
        and finding.get("signal") == "name-stem-cluster"
        and finding.get("path") == "src/pkg/beads_a.py"
    ]
    assert len(matches) == 1, f"expected the cluster finding in {data['findings']!r}"
    assert {"signal", "path", "folder", "facts"} <= set(matches[0]), "a finding has four keys"


def test_file_option_repeats_for_each_file(tmp_path):
    repo = _committed_repo(tmp_path, ["src/base/keep.py"])
    beads = [_write(repo, rel) for rel in _names("src/pkg", "beads", 3)]
    widgets = [_write(repo, rel) for rel in _names("src/pkg", "widget", 3)]

    data = _json_out(_run_script(repo, "--file", str(beads[0]), "--file", str(widgets[0])))

    paths = {finding["path"] for finding in data["findings"]}
    assert {"src/pkg/beads_a.py", "src/pkg/widget_a.py"} <= paths, f"findings name {sorted(paths)}"


def test_survey_option_prints_the_folders_over_the_limit_with_their_counts(tmp_path):
    repo = _committed_repo(tmp_path, _files("src/crowded", 21) + ["src/small/one.py"])

    data = _json_out(_run_script(repo, "--survey"))

    assert _contains(data, "src/crowded"), f"the folder over the limit is missing: {data!r}"
    assert _contains(data, 21), f"its count of 21 is missing: {data!r}"
    assert not _contains(data, "src/small"), f"a folder under the limit must not appear: {data!r}"


def test_defaults_option_prints_the_default_config_as_json(tmp_path):
    repo = _committed_repo(tmp_path, ["src/base/keep.py"])

    data = _json_out(_run_script(repo, "--defaults"))

    assert isinstance(data, dict), f"the defaults must be a JSON object, got {data!r}"
    assert data.get("folder_limit") == 20
    assert data.get("percentile") == 90
    assert data.get("min_folders") == 10
    assert data.get("cluster_min") == 3


def test_unknown_option_is_a_usage_error_with_exit_code_two(tmp_path):
    repo = _committed_repo(tmp_path, ["src/base/keep.py"])

    result = _run_script(repo, "--no-such-option")

    assert result.returncode == 2, f"exit {result.returncode}, stdout {result.stdout[:200]!r}"


def test_file_option_reads_the_limits_from_the_config_file(tmp_path):
    repo = _committed_repo(tmp_path, _files("src/pkg", 6))
    new = _write(repo, "src/pkg/new_mod.py")
    _write_config(repo, json.dumps({"folder_limit": 5}))

    data = _json_out(_run_script(repo, "--file", str(new)))

    crowded = [
        finding
        for finding in data["findings"]
        if isinstance(finding, dict) and finding.get("signal") == "crowded-folder"
    ]
    assert len(crowded) == 1, f"the config limit must reach the command: {data['findings']!r}"
    assert crowded[0]["facts"]["limit"] == 5


@pytest.mark.parametrize("text", ["{not json", "[1, 2]"], ids=["not-json", "json-list"])
def test_bad_config_adds_a_not_analysed_line_and_the_defaults_apply(tmp_path, text):
    repo = _committed_repo(tmp_path, _files("src/pkg", 20))
    new = _write(repo, "src/pkg/new_mod.py")
    _write_config(repo, text)

    data = _json_out(_run_script(repo, "--file", str(new)))

    crowded = [
        finding
        for finding in data["findings"]
        if isinstance(finding, dict) and finding.get("signal") == "crowded-folder"
    ]
    assert len(crowded) == 1 and crowded[0]["facts"]["limit"] == 20, (
        f"the defaults must apply: {data['findings']!r}"
    )
    assert any("config" in line.lower() or "structure-signals" in line for line in data["not_analysed"]), (
        f"a bad config must add a not_analysed line: {data['not_analysed']!r}"
    )
