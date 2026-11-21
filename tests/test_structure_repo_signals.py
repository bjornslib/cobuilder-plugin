"""Tests for the per-signal findings of the whole-repository record, slice 13 of structure-coaching (E6).

Each case runs the real script on a repo with dated commits. It checks one rule on the findings.
The rules cover the crowded folder, the name family, and the boundary edge of old files.
They also cover the twin name, the co-change group, and the duplicated block.
The record shape and the trend are in test_structure_repo.py. The helpers are in
_structure_repo_support.py.

Run with: uv run pytest tests/test_structure_repo_signals.py -q
"""
from __future__ import annotations

import pytest
from _structure_repo_support import (
    BLOCK,
    FIRST,
    PAGE,
    SECOND,
    TEST,
    commit,
    context_records,
    facts_of,
    field,
    finding_list,
    new_repo,
    one,
    pair_commit,
    parts,
    run_record,
    with_prefix,
    with_signal,
)


def test_a_crowded_folder_a_name_family_and_a_boundary_edge_in_old_files_give_findings(tmp_path):
    repo = new_repo(tmp_path)
    commit(repo, {
        **parts("crowd", 21),
        "family/report_a.py": "A = 1\n",
        "family/report_b.py": "B = 1\n",
        "family/report_c.py": "C = 1\n",
        "alpha/consumer.py": "from beta.helpers import helper\n\n\ndef run():\n    return helper()\n",
        "beta/helpers.py": "def helper():\n    return 1\n",
        **context_records(),
    }, 200, "old code")
    findings = finding_list(run_record(repo, tmp_path / "findings.json"))
    assert len(with_signal(findings, "crowded-folder")) == 1, "a crowded folder gives one finding"
    assert field(one(findings, "crowded-folder|crowd"), "folder") == "crowd"
    assert field(one(findings, "name-stem-cluster|family|report"), "folder") == "family"
    edge = one(findings, "boundary-edge|alpha/consumer.py|beta")
    assert field(edge, "path") == "alpha/consumer.py"
    assert facts_of(edge).get("to_context") == "beta", f"facts: {facts_of(edge)}"


@pytest.mark.parametrize(
    ("files", "expected"),
    [
        pytest.param({"app/one/page.tsx": PAGE, "app/two/page.tsx": PAGE}, [], id="page-tsx"),
        pytest.param(
            {"left/util.py": "A = 1\n", "right/util.py": "B = 1\n"},
            ["twin-name|util"], id="util-py",
        ),
        pytest.param(
            {"left/util.py": "A = 1\n", "right/util.ts": "export const b = 1;\n"},
            [], id="util-py-and-util-ts",
        ),
    ],
)
def test_twin_names_need_two_folders_in_one_language_family_and_skip_next_js_names(
    tmp_path, files, expected
):
    repo = new_repo(tmp_path)
    commit(repo, files, 30)
    findings = finding_list(run_record(repo, tmp_path / "findings.json"))
    twins = [field(item, "key") for item in with_prefix(findings, "twin-name|")]
    assert twins == expected, f"the twin-name keys are {twins}, expected {expected}"


def test_two_files_in_two_folders_committed_together_in_five_of_six_commits_give_one_group(tmp_path):
    repo = new_repo(tmp_path)
    for index, days_ago in enumerate((60, 50, 40, 30, 20)):
        pair_commit(repo, FIRST, SECOND, index, days_ago)
    commit(repo, {"other/notes.txt": "notes\n"}, 10, "unrelated change")
    findings = finding_list(run_record(repo, tmp_path / "findings.json"))
    keys = [field(item, "key") for item in with_prefix(findings, "co-change|")]
    assert len(keys) == 1, f"expected one co-change group, got {keys}"
    assert FIRST in keys[0] and SECOND in keys[0], f"the group does not name both files: {keys[0]}"


def test_a_code_file_and_its_test_file_do_not_form_a_co_change_pair(tmp_path):
    repo = new_repo(tmp_path)
    for index, days_ago in enumerate((60, 50, 40, 30, 20)):
        pair_commit(repo, FIRST, TEST, index, days_ago)
    commit(repo, {"other/notes.txt": "notes\n"}, 10, "unrelated change")
    findings = finding_list(run_record(repo, tmp_path / "findings.json"))
    assert with_prefix(findings, "co-change|") == [], "a code file and its test file form a pair"


@pytest.mark.parametrize(
    ("total", "groups"), [(30, 1), (31, 0)], ids=["thirty-files-kept", "thirty-one-files-skipped"]
)
def test_a_commit_of_more_than_thirty_files_is_skipped_by_the_co_change_count(
    tmp_path, total, groups
):
    repo = new_repo(tmp_path)
    for index, days_ago in enumerate((60, 50, 40, 30)):
        pair_commit(repo, FIRST, SECOND, index, days_ago)
    fillers = {f"bulk/filler_{index:02d}.txt": "bulk\n" for index in range(total - 2)}
    pair_commit(repo, FIRST, SECOND, 4, 20, extra=fillers)
    findings = finding_list(run_record(repo, tmp_path / "findings.json"))
    keys = [field(item, "key") for item in with_prefix(findings, "co-change|")]
    assert len(keys) == groups, f"a {total}-file commit gives {groups} group(s), got {keys}"


def test_one_block_copied_into_three_product_files_gives_one_duplicate_group(tmp_path):
    repo = new_repo(tmp_path)
    copies = {
        "billing/invoice.py": "def invoice_total(customer, region, lines):\n" + BLOCK,
        "shipping/parcel.py": "def parcel_total(customer, region, lines):\n" + BLOCK,
        "returns/refund.py": "def refund_total(customer, region, lines):\n" + BLOCK,
    }
    commit(repo, copies, 30)
    findings = finding_list(run_record(repo, tmp_path / "findings.json"))
    keys = [field(item, "key") for item in with_prefix(findings, "duplicate-group|")]
    assert len(keys) == 1, f"expected one duplicate-group finding, got {keys}"
    missing = [rel for rel in copies if rel not in keys[0]]
    assert not missing, f"the group key does not name {missing}: {keys[0]}"
