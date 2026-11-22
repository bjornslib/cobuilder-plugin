"""Tests for the --compare option of structure_evidence.py, slice 14 of structure-coaching (E6).

With --repo and --compare, each finding of the new record carries a trend tag from compare_findings.
A top-level fixed list holds each key that only the old record has. A --compare path that holds no
record gives one not_analysed line and no trend. Without --repo, --compare is a usage error. Each
case builds git repos in tmp_path and runs the real script. The helpers are in
_structure_repo_support.py.

Run with: uv run pytest tests/test_structure_trend_option.py -q
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import pytest
from _structure_repo_support import (
    EVIDENCE_PATH,
    commit,
    facts_of,
    field,
    field_list,
    finding_list,
    git,
    load_compare_findings,
    new_repo,
    parts,
    run_record,
)

TREND_TAGS = ("new", "worse", "unchanged")


def items(folder: str, count: int) -> dict[str, str]:
    """Return count one-line Python files named item_NN in one folder."""
    return {f"{folder}/item_{index:02d}.py": f"VALUE_{index} = {index}\n" for index in range(count)}


def run_script(repo: Path, out: Path, *options: str) -> subprocess.CompletedProcess[str]:
    """Run the script in repo with the options and --out. Return the finished process."""
    argv = [sys.executable, str(EVIDENCE_PATH), *options, "--out", str(out)]
    return subprocess.run(argv, cwd=repo, capture_output=True, text=True, timeout=300, check=False)


def compare_record(repo: Path, previous: Path, out: Path) -> dict[str, Any]:
    """Run --repo with --compare, assert exit 0, and return the record that the script writes."""
    result = run_script(repo, out, "--repo", "--compare", str(previous))
    assert result.returncode == 0, f"the script exited {result.returncode}: {result.stderr}"
    assert out.is_file(), f"no record file at {out}"
    return json.loads(out.read_text(encoding="utf-8"))


def trend_of(item: dict[str, Any]) -> Any:
    """Return the trend tag of one finding. It reads the trend key, or else the trend fact."""
    if "trend" in item:
        return item["trend"]
    return field(facts_of(item), "trend")


def keys_of(record: dict[str, Any]) -> list[str]:
    """Return the key of each finding of a record, in record order."""
    return [field(item, "key") for item in finding_list(record)]


@pytest.fixture(scope="module")
def trend_case(tmp_path_factory):
    """Write the previous record of one repo state, then change the repo. Return both records."""
    base = tmp_path_factory.mktemp("trend")
    repo = new_repo(base)
    before = {**parts("crowd", 21), **items("alpha", 21), "shared_bits/helpers.py": "VALUE = 1\n"}
    commit(repo, before, 30, "before")
    previous = base / "previous.json"
    previous_record = run_record(repo, previous)
    git(repo, "rm", "-q", "shared_bits/helpers.py")
    commit(repo, {**parts("crowd", 22), "tools/utils.py": "VALUE = 1\n"}, 1, "grow, add, remove")
    return {
        "repo": repo, "previous": previous, "previous_record": previous_record,
        "plain": run_record(repo, base / "plain.json"),
    }


def test_each_finding_of_the_new_record_carries_one_trend_tag(trend_case, tmp_path):
    record = compare_record(trend_case["repo"], trend_case["previous"], tmp_path / "new.json")
    findings = finding_list(record)
    assert findings, "the new record holds no finding"
    for item in findings:
        tag = trend_of(item)
        assert tag in TREND_TAGS, f"finding {item.get('key')!r} has the trend {tag!r}"


def test_the_fixed_list_holds_each_key_that_only_the_old_record_had(trend_case, tmp_path):
    record = compare_record(trend_case["repo"], trend_case["previous"], tmp_path / "new.json")
    only_old = set(keys_of(trend_case["previous_record"])) - set(keys_of(record))
    assert only_old, "the change left no key that only the old record holds"
    fixed = field_list(record, "fixed")
    assert all(isinstance(key, str) for key in fixed), f"fixed is not a list of keys: {fixed}"
    assert sorted(fixed) == sorted(only_old), f"fixed: {fixed}, only in the old: {only_old}"


def test_each_tag_matches_the_change_made_to_the_repo(trend_case, tmp_path):
    record = compare_record(trend_case["repo"], trend_case["previous"], tmp_path / "new.json")
    tags = {field(item, "key"): trend_of(item) for item in finding_list(record)}
    assert field(tags, "generic-name|tools/utils.py") == "new", f"tools/utils.py is new: {tags}"
    assert field(tags, "crowded-folder|crowd") == "worse", "the crowd folder grew from 21 to 22"
    assert field(tags, "name-stem-cluster|crowd|part") == "worse", "the part family grew too"
    assert field(tags, "crowded-folder|alpha") == "unchanged", "the alpha folder did not change"
    fixed = field_list(record, "fixed")
    assert "generic-name|shared_bits/helpers.py" in fixed, f"helpers.py was removed: {fixed}"


@pytest.mark.parametrize(
    "content", [None, "this is not a record\n", '{"hello": 1}\n'],
    ids=["missing-path", "text-file", "json-object"],
)
def test_a_bad_compare_path_gives_one_not_analysed_line(trend_case, tmp_path, content):
    bad = tmp_path / "bad.json"
    if content is not None:
        bad.write_text(content, encoding="utf-8")
    plain = trend_case["plain"]
    record = compare_record(trend_case["repo"], bad, tmp_path / "new.json")
    assert len(record["not_analysed"]) == len(plain["not_analysed"]) + 1, record["not_analysed"]
    assert keys_of(record) == keys_of(plain), "the other steps must still run"
    assert not record.get("fixed"), f"fixed: {record.get('fixed')}"
    for item in finding_list(record):
        assert "trend" not in item and "trend" not in item.get("facts", {}), f"{item}"


def test_compare_without_repo_is_a_usage_error_that_exits_two(trend_case, tmp_path):
    out = tmp_path / "no-repo.json"
    result = run_script(trend_case["repo"], out, "--compare", str(trend_case["previous"]))
    assert result.returncode == 2, f"exit {result.returncode}: {result.stderr}"
    assert not out.exists(), "a usage error must write no record"
    errors = [line for line in result.stderr.splitlines() if "error:" in line]
    assert any("--repo" in line for line in errors), f"the error does not name --repo: {errors}"


def test_the_tags_equal_compare_findings_for_the_same_two_records(trend_case, tmp_path):
    compare_findings = load_compare_findings()
    expected = compare_findings(trend_case["previous_record"], trend_case["plain"])
    record = compare_record(trend_case["repo"], trend_case["previous"], tmp_path / "new.json")
    tags = {field(item, "key"): trend_of(item) for item in finding_list(record)}
    assert tags == {key: tag for key, tag in expected.items() if tag != "fixed"}, f"tags: {tags}"
    fixed = sorted(field_list(record, "fixed"))
    fixed_keys = sorted(key for key, tag in expected.items() if tag == "fixed")
    assert fixed == fixed_keys, f"fixed: {fixed}, expected: {fixed_keys}"
