"""Tests for the whole-repository record: ranking, folder table, window, keys, drift, trend.

Slice 13 of structure-coaching (E6). `shared/structure_evidence.py --repo --out <path>
[--since <sha>]` writes one record for a repo: the findings ranked by change count, the
folder table, and the not_analysed lines. `compare_findings` tags two records by key.
The per-signal cases are in test_structure_repo_signals.py. The helpers are in
_structure_repo_support.py.

Run with: uv run pytest tests/test_structure_repo.py -q
"""
from __future__ import annotations

import pytest
from _structure_repo_support import (
    FINDING_KEYS,
    FOLDER_KEYS,
    RECORD_KEYS,
    commit,
    drift_repo,
    facts_of,
    field,
    field_list,
    finding_list,
    folder_row,
    git,
    load_compare_findings,
    make_finding,
    new_repo,
    one,
    parts,
    record_of,
    run_record,
    with_signal,
)


def _counts(row: dict) -> tuple:
    return tuple(field(row, key) for key in ("n", "internal", "out", "in"))


def test_the_folder_with_more_commits_in_the_window_comes_first(tmp_path):
    repo = new_repo(tmp_path)
    commit(repo, {**parts("zeta", 21), **parts("alpha", 21)}, 30, "base")
    for days_ago in (10, 5, 2):
        commit(repo, {"zeta/part_00.py": f"VALUE_0 = {days_ago}\n"}, days_ago, "touch zeta")
    findings = finding_list(run_record(repo, tmp_path / "findings.json"))
    zeta = one(findings, "crowded-folder|zeta")
    alpha = one(findings, "crowded-folder|alpha")
    assert field(zeta, "changes") == 4, f"zeta has four commits in the window: {zeta}"
    assert field(alpha, "changes") == 1, f"alpha has one commit in the window: {alpha}"
    keys = [field(item, "key") for item in findings]
    assert keys.index("crowded-folder|zeta") < keys.index("crowded-folder|alpha"), f"order: {keys}"
    ranked = [(-field(item, "changes"), field(item, "key")) for item in findings]
    assert ranked == sorted(ranked), f"the findings are not ranked by change count: {keys}"


def test_the_folder_table_gives_cf_and_instability_and_null_for_a_folder_with_no_edges(tmp_path):
    repo = new_repo(tmp_path)
    commit(repo, {
        "core/a_one.py": "from core.b_two import helper\nfrom store.s_one import load\n",
        "core/b_two.py": "def helper():\n    return 1\n",
        "core/c_three.py": "from store.s_one import load\n",
        "store/s_one.py": "def load():\n    return 1\n",
        "api/h_one.py": "from core.c_three import load\n",
        "api/h_two.py": "VALUE = 2\n",
        "api/h_three.py": "VALUE = 3\n",
        "isolated/i_one.py": "VALUE = 1\n",
        "isolated/i_two.py": "VALUE = 2\n",
        "isolated/i_three.py": "VALUE = 3\n",
        "pair/p_one.py": "from pair.p_two import value\n",
        "pair/p_two.py": "value = 1\n",
    }, 30)
    record = run_record(repo, tmp_path / "findings.json")
    # core: one internal edge, two edges out to store, one edge in from api.
    core = folder_row(record, "core")
    assert _counts(core) == (3, 1, 2, 1), f"core row: {core}"
    assert field(core, "cf") == pytest.approx(2 / 5)
    assert field(core, "instability") == pytest.approx(2 / 3)
    # api: one edge out to core, and no edge inside api or in from outside.
    api = folder_row(record, "api")
    assert _counts(api) == (3, 0, 1, 0), f"api row: {api}"
    assert field(api, "cf") == pytest.approx(0.0)
    assert field(api, "instability") == pytest.approx(1.0)
    # isolated: three files and no edge at all, so both ratios are null.
    isolated = folder_row(record, "isolated")
    assert _counts(isolated) == (3, 0, 0, 0), f"isolated row: {isolated}"
    assert field(isolated, "cf") is None and field(isolated, "instability") is None
    folders = [row.get("folder") for row in field_list(record, "folders")]
    assert "store" not in folders and "pair" not in folders, f"folders under three files: {folders}"


def test_compare_findings_tags_each_key_new_worse_unchanged_or_fixed():
    compare_findings = load_compare_findings()
    previous = record_of([
        make_finding("crowded-folder|app/api", 22),
        make_finding("crowded-folder|app/ui", 22),
        make_finding("crowded-folder|lib/old", 22),
    ])
    current = record_of([
        make_finding("crowded-folder|app/api", 25),
        make_finding("crowded-folder|app/ui", 22),
        make_finding("crowded-folder|lib/new", 21),
    ])
    assert compare_findings(previous, current) == {
        "crowded-folder|app/api": "worse",
        "crowded-folder|app/ui": "unchanged",
        "crowded-folder|lib/old": "fixed",
        "crowded-folder|lib/new": "new",
    }


@pytest.mark.parametrize(
    ("commits", "window"),
    [(5, 365), (19, 365), (20, 90)],
    ids=["five-commits", "nineteen-commits", "twenty-commits"],
)
def test_the_window_widens_to_365_days_when_the_90_day_window_holds_fewer_than_20_commits(
    tmp_path, commits, window
):
    repo = new_repo(tmp_path)
    for index in range(commits):
        commit(repo, {f"notes/note_{index:02d}.txt": f"{index}\n"}, 1 + index, f"note {index}")
    record = run_record(repo, tmp_path / "findings.json")
    window_days = field(record, "window_days")
    assert window_days == window, f"{commits} commits in 90 days gave a {window_days}-day window"


def test_the_record_has_the_d5_keys_and_each_finding_and_folder_row_has_its_keys(tmp_path):
    repo = new_repo(tmp_path)
    head = commit(repo, parts("crowd", 21), 30)
    record = run_record(repo, tmp_path / "findings.json")
    missing = [key for key in RECORD_KEYS if key not in record]
    assert not missing, f"the record has no {missing}"
    assert field(record, "schema") == 1
    assert field(record, "commit") == head
    assert field(record, "since") is None
    findings = finding_list(record)
    assert findings, "the crowded folder gives no finding"
    for item in findings:
        missing = [key for key in FINDING_KEYS if key not in item]
        assert not missing, f"finding {item.get('key')!r} has no {missing}"
    rows = field_list(record, "folders")
    assert rows, "the folder table is empty"
    for row in rows:
        missing = [key for key in FOLDER_KEYS if key not in row]
        assert not missing, f"folder row {row.get('folder')!r} has no {missing}"


def test_without_since_the_record_holds_no_contract_drift_finding(tmp_path):
    repo, _ = drift_repo(tmp_path)
    findings = finding_list(run_record(repo, tmp_path / "findings.json"))
    assert with_signal(findings, "contract-drift") == [], "no --since gives no contract drift"


def test_with_since_a_changed_raise_gives_one_contract_drift_finding(tmp_path):
    repo, base = drift_repo(tmp_path)
    record = run_record(repo, tmp_path / "findings.json", since=base)
    assert field(record, "since") == base
    drift = with_signal(finding_list(record), "contract-drift")
    assert len(drift) == 1, f"expected one contract-drift finding, got {drift}"
    assert field(drift[0], "path") == "lib.py"
    assert field(facts_of(drift[0]), "kind") == "raises-changed"
    assert field(facts_of(drift[0]), "symbol") == "fetch"


def test_two_records_from_the_script_compare_with_stable_keys(tmp_path):
    repo = new_repo(tmp_path)
    commit(repo, {**parts("crowd", 21), "shared_bits/helpers.py": "VALUE = 1\n"}, 30, "before")
    previous = run_record(repo, tmp_path / "previous.json")
    git(repo, "rm", "-q", "shared_bits/helpers.py")
    commit(repo, {**parts("crowd", 22), "tools/utils.py": "VALUE = 1\n"}, 1, "grow crowd")
    current = run_record(repo, tmp_path / "current.json")
    assert load_compare_findings()(previous, current) == {
        "crowded-folder|crowd": "worse",
        "name-stem-cluster|crowd|part": "worse",
        "generic-name|shared_bits/helpers.py": "fixed",
        "generic-name|tools/utils.py": "new",
    }
