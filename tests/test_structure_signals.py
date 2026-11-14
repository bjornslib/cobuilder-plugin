"""Tests for shared/structure_signals.py, slice 1 of structure-coaching (E1).

The slice covers the file list, the new-file rule, the folder limit, and the
crowded-folder signal. Each case builds a git repo in tmp_path. No case reads
this repository.

A new file is untracked, staged as added, or added since the merge-base with
the default branch. An old file is a file that the default branch holds.

Run with: uv run pytest tests/test_structure_signals.py -q
"""
from __future__ import annotations

import importlib.util
import subprocess
import sys
from pathlib import Path
from types import ModuleType

import pytest

REPO_ROOT = Path(__file__).resolve().parent.parent
STRUCTURE_SIGNALS_PATH = REPO_ROOT / "shared" / "structure_signals.py"

COMMIT_OPTIONS = ("-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false")


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


def _commit_all(repo: Path, message: str = "base") -> None:
    _git(repo, "add", "-A")
    _git(repo, *COMMIT_OPTIONS, "commit", "-q", "-m", message)


def _files(folder: str, count: int, suffix: str = ".py", prefix: str = "mod") -> list[str]:
    return [f"{folder}/{prefix}_{index:02d}{suffix}" for index in range(count)]


def _committed_repo(tmp_path: Path, rel_paths: list[str]) -> Path:
    """Return a repo on main whose first commit holds rel_paths."""
    repo = _new_repo(tmp_path)
    for rel in rel_paths:
        _write(repo, rel)
    _commit_all(repo)
    return repo


def _crowded(report) -> list:
    return [finding for finding in report.findings if finding.signal == "crowded-folder"]


# ---------------------------------------------------------------------------
# Config defaults, the file list, and the folder limit
# ---------------------------------------------------------------------------


def test_config_defaults_match_the_design():
    signals = _load_structure_signals()
    config = signals.Config()
    assert config.folder_limit == 20
    assert config.percentile == 90
    assert config.min_folders == 10
    assert (config.examples_max, config.parse_cap, config.caller_cap) == (5, 60, 10)
    assert (config.locality_min_importers, config.layer_limit) == (2, 3)
    assert (config.co_change_min_support, config.co_change_min_jaccard) == (5, 0.5)
    assert (config.change_window_days, config.wide_change_window_days) == (90, 365)
    assert set(config.code_extensions) == {
        ".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".php",
        ".java", ".rb", ".go", ".rs", ".kt", ".cs", ".swift",
    }
    assert set(config.excluded_paths) == {
        "**/.*/**", "**/docs/**", "**/documentation/**", "**/fixtures/**", "**/__snapshots__/**",
        "**/migrations/**", "**/vendor/**", "**/generated/**",
    }


def test_repo_files_lists_tracked_and_untracked_files_and_skips_ignored_ones(tmp_path):
    signals = _load_structure_signals()
    repo = _new_repo(tmp_path)
    _write(repo, ".gitignore", "*.log\n")
    _write(repo, "src/pkg/tracked.py")
    _commit_all(repo)
    _write(repo, "src/pkg/untracked.py")
    _write(repo, "src/pkg/ignored.log")

    files = signals.repo_files(repo)

    assert "src/pkg/tracked.py" in files
    assert "src/pkg/untracked.py" in files
    assert "src/pkg/ignored.log" not in files


def test_folder_counts_counts_only_the_direct_files_of_each_folder():
    signals = _load_structure_signals()
    files = ["a.py", "src/x.py", "src/pkg/y.py", "src/pkg/z.md"]

    assert signals.folder_counts(files) == {".": 1, "src": 1, "src/pkg": 2}


def test_folder_limit_is_the_config_limit_when_fewer_than_min_folders():
    signals = _load_structure_signals()
    counts = {"src/a": 30, "src/b": 2}

    assert signals.folder_limit(counts, signals.Config()) == 20


def test_folder_limit_takes_the_percentile_when_it_is_larger():
    signals = _load_structure_signals()
    counts = {f"src/d{index}": 1 for index in range(8)}
    counts["src/big"] = 25
    counts["src/bigger"] = 30

    assert signals.folder_limit(counts, signals.Config()) == 25


def test_folder_limit_uses_the_nearest_rank_percentile_without_a_config_limit():
    signals = _load_structure_signals()
    counts = {f"src/d{count:02d}": count for count in range(1, 11)}

    assert signals.folder_limit(counts, signals.Config(folder_limit=None)) == 9


def test_folder_limit_is_none_with_fewer_than_min_folders_and_no_config_limit():
    signals = _load_structure_signals()
    counts = {"src/a": 30, "src/b": 2}

    assert signals.folder_limit(counts, signals.Config(folder_limit=None)) is None


# ---------------------------------------------------------------------------
# The new-file rule
# ---------------------------------------------------------------------------


def test_untracked_file_is_new(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, _files("src/pkg", 3))
    _write(repo, "src/pkg/new_mod.py")

    assert "src/pkg/new_mod.py" in signals.new_files(repo)


def test_old_file_on_the_default_branch_is_not_new(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, _files("src/pkg", 3))
    _write(repo, "src/pkg/new_mod.py")

    new = signals.new_files(repo)

    assert "src/pkg/new_mod.py" in new, "control: the untracked file must count as new"
    assert "src/pkg/mod_00.py" not in new


def test_staged_added_file_is_new(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, _files("src/pkg", 3))
    _write(repo, "src/pkg/new_mod.py")
    _git(repo, "add", "src/pkg/new_mod.py")

    assert "src/pkg/new_mod.py" in signals.new_files(repo)


def test_file_added_on_a_branch_is_new(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, _files("src/pkg", 3))
    _git(repo, "checkout", "-q", "-b", "feature")
    _write(repo, "src/pkg/new_mod.py")
    _commit_all(repo, "feature work")

    new = signals.new_files(repo)

    assert "src/pkg/new_mod.py" in new
    assert "src/pkg/mod_00.py" not in new


def test_repo_without_a_merge_base_counts_untracked_and_staged_files(tmp_path):
    signals = _load_structure_signals()
    repo = _new_repo(tmp_path, branch="trunk")
    _write(repo, "src/pkg/base.py")
    _commit_all(repo)
    _write(repo, "src/pkg/untracked.py")
    _write(repo, "src/pkg/staged.py")
    _git(repo, "add", "src/pkg/staged.py")

    new = signals.new_files(repo)

    assert "src/pkg/untracked.py" in new
    assert "src/pkg/staged.py" in new
    assert "src/pkg/base.py" not in new


# ---------------------------------------------------------------------------
# The crowded-folder signal through signals_for
# ---------------------------------------------------------------------------


def test_new_file_in_a_folder_over_the_limit_gives_a_crowded_finding(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, _files("src/pkg", 20))
    new = _write(repo, "src/pkg/new_mod.py")

    report = signals.signals_for(str(new), repo, signals.Config())

    crowded = _crowded(report)
    assert len(crowded) == 1, f"expected one crowded-folder finding, got {report.findings!r}"
    finding = crowded[0]
    assert isinstance(finding, signals.Finding)
    assert finding.path == "src/pkg/new_mod.py"
    assert finding.folder == "src/pkg"
    assert finding.facts["count"] == 21
    assert finding.facts["limit"] == 20


def test_crowded_folder_gives_a_finding_only_above_the_limit(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, _files("src/pkg", 19))
    at_limit = _write(repo, "src/pkg/new_one.py")
    assert _crowded(signals.signals_for(str(at_limit), repo, signals.Config())) == [], (
        "a folder that holds 20 files, the limit, must give no finding"
    )
    over_limit = _write(repo, "src/pkg/new_two.py")
    crowded = _crowded(signals.signals_for(str(over_limit), repo, signals.Config()))
    assert len(crowded) == 1, "a folder that holds 21 files must give one finding"
    assert crowded[0].facts["count"] == 21


@pytest.mark.parametrize("edit", [False, True], ids=["unchanged", "edited"])
def test_old_file_in_a_crowded_folder_gives_no_finding(tmp_path, edit):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, _files("src/pkg", 25))
    new = _write(repo, "src/pkg/new_mod.py")
    control = signals.signals_for(str(new), repo, signals.Config())
    assert len(_crowded(control)) == 1, "control: a new file in the same folder must get a finding"
    old = repo / "src/pkg/mod_00.py"
    if edit:
        old.write_text("content changed\n")

    report = signals.signals_for(str(old), repo, signals.Config())

    assert _crowded(report) == []


def test_test_files_count_toward_the_folder_total(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(
        tmp_path, _files("src/pkg", 15) + _files("src/pkg", 5, prefix="test_mod")
    )
    new = _write(repo, "src/pkg/new_mod.py")

    crowded = _crowded(signals.signals_for(str(new), repo, signals.Config()))

    assert len(crowded) == 1, "the five test files must count, so 21 files is over the limit"
    assert crowded[0].facts["count"] == 21
    assert crowded[0].facts["limit"] == 20


def test_crowded_folder_of_text_files_gives_no_finding(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(
        tmp_path, _files("notes", 25, suffix=".md", prefix="note") + _files("src/pkg", 25)
    )
    code_file = _write(repo, "src/pkg/new_mod.py")
    text_file = _write(repo, "notes/new_note.md", "# new note\n")

    control = signals.signals_for(str(code_file), repo, signals.Config())
    assert len(_crowded(control)) == 1, "control: a folder with a code file must get a finding"

    report = signals.signals_for(str(text_file), repo, signals.Config())

    assert _crowded(report) == [], "a folder with no code file must give no finding"


def test_file_added_on_a_branch_in_a_crowded_folder_gives_a_finding(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, _files("src/pkg", 20))
    _git(repo, "checkout", "-q", "-b", "feature")
    new = _write(repo, "src/pkg/new_mod.py")
    _commit_all(repo, "feature work")

    report = signals.signals_for(str(new), repo, signals.Config())

    assert len(_crowded(report)) == 1


def test_fewer_than_min_folders_without_a_limit_gives_no_finding_and_a_reason(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, _files("src/pkg", 25) + ["src/other/a.py", "top.py"])
    new = _write(repo, "src/pkg/new_mod.py")
    config = signals.Config(folder_limit=None)

    report = signals.signals_for(str(new), repo, config)

    assert _crowded(report) == []
    assert len(report.not_analysed) >= 1, "the report must say why the signal did not run"


def test_fewer_than_min_folders_with_the_config_limit_still_gives_the_finding(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, _files("src/pkg", 25) + ["src/other/a.py", "top.py"])
    new = _write(repo, "src/pkg/new_mod.py")

    crowded = _crowded(signals.signals_for(str(new), repo, signals.Config()))

    assert len(crowded) == 1
    assert crowded[0].facts["limit"] == 20


def test_signals_for_returns_a_report_with_tuple_fields(tmp_path):
    signals = _load_structure_signals()
    repo = _committed_repo(tmp_path, _files("src/pkg", 3))
    new = _write(repo, "src/pkg/new_mod.py")

    report = signals.signals_for(str(new), repo, signals.Config())

    assert isinstance(report, signals.Report)
    assert report.findings == ()
    assert isinstance(report.not_analysed, tuple)
