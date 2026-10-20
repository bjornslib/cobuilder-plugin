"""CLI contract for shared/tracker.py. Slice 2 checks the write refusal with no adapter.

A write with no configured adapter exits 2, prints a message that names the
missing adapter, and changes no file. The read-path spy sits in
test_tracker_cli_spy.py, and the seed refresh tests sit in test_tracker_cli_seed.py.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path


import _tracker_cli_support as support

TRACKER_CLI = support.TRACKER_CLI
CORPUS_DIR = support.FIXTURES / "corpus"
PLANS_DIR = support.FIXTURES / "plans"
_cfg = support.fake_config
_cli = support.cli
_payload = support.ok
_snapshot = support.snapshot
FIXTURES_DIR = support.FIXTURES


def test_write_without_adapter_exits_2_and_changes_no_file(tmp_path: Path) -> None:
    assert TRACKER_CLI.is_file(), "shared/tracker.py does not exist"

    # A tmp repo with one state file, and no .cobuilder/tracker.yaml.
    status_file = tmp_path / "docs" / "plans" / "demo" / "04-slices.md"
    status_file.parent.mkdir(parents=True)
    status_file.write_text("| demo-E1-s3 | open |\n", encoding="utf-8")
    missing_config = tmp_path / ".cobuilder" / "tracker.yaml"
    assert not missing_config.exists()

    before_repo = _snapshot(tmp_path)
    before_fixtures = _snapshot(FIXTURES_DIR)

    result = subprocess.run(
        [
            "uv",
            "run",
            str(TRACKER_CLI),
            "--config",
            str(missing_config),
            "set-slice-state",
            "demo-E1-s3",
            "closed",
        ],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=180,
        check=False,
    )

    assert result.returncode == 2, result.stderr
    assert "adapter" in result.stderr.lower(), result.stderr
    # The command prints JSON on stdout. Empty stdout is also allowed for a refusal.
    if result.stdout.strip():
        assert isinstance(json.loads(result.stdout), dict), result.stdout
    assert _snapshot(tmp_path) == before_repo
    assert _snapshot(FIXTURES_DIR) == before_fixtures


def test_list_programs_prints_corpus_ids(tmp_path: Path) -> None:
    programs = _payload(_cli(_cfg(tmp_path), tmp_path, "list-programs"))
    corpus = json.loads((CORPUS_DIR / "program.json").read_text(encoding="utf-8"))
    rows = corpus if isinstance(corpus, list) else [corpus]
    assert [row["id"] for row in programs] == [row["id"] for row in rows]


def test_success_exits_0(tmp_path: Path) -> None:
    result = _cli(_cfg(tmp_path), tmp_path, "get-slice", "demo-E1-s3")
    assert result.returncode == 0, result.stderr
    assert _payload(result)["id"] == "demo-E1-s3"


def test_missing_corpus_exits_3(tmp_path: Path) -> None:
    config = _cfg(tmp_path, corpus=tmp_path / "no-such-corpus")
    assert _cli(config, tmp_path, "list-programs").returncode == 3


def test_unknown_subcommand_exits_4(tmp_path: Path) -> None:
    assert _cli(_cfg(tmp_path), tmp_path, "no-such-command").returncode == 4


def test_missing_argument_exits_4(tmp_path: Path) -> None:
    assert _cli(_cfg(tmp_path), tmp_path, "get-slice").returncode == 4


def test_state_file_carries_write_to_next_call(tmp_path: Path) -> None:
    state = tmp_path / "state" / "tracker-state.json"
    config = _cfg(tmp_path, state_file=state)
    _payload(_cli(config, tmp_path, "claim-slice", "demo-E1-s3", "agent-x"))
    assert state.is_file()
    assert _payload(_cli(config, tmp_path, "get-slice", "demo-E1-s3"))["assignee"] == "agent-x"


def test_capabilities_reports_flags(tmp_path: Path) -> None:
    caps = _payload(_cli(_cfg(tmp_path), tmp_path, "capabilities"))
    assert {"atomic_claim", "rich_envelope", "offline_read"} <= set(caps)
    assert all(isinstance(value, bool) for value in caps.values())


def test_doctor_with_adapter_reports_adapter_and_capabilities(tmp_path: Path) -> None:
    report = _payload(_cli(_cfg(tmp_path), tmp_path, "doctor"))
    assert report["adapter"] == "fake"
    assert isinstance(report["capabilities"], dict)


def test_doctor_without_adapter_exits_2(tmp_path: Path) -> None:
    result = _cli(tmp_path / ".cobuilder" / "tracker.yaml", tmp_path, "doctor")
    assert result.returncode == 2, result.stderr
    assert "adapter" in (result.stdout + result.stderr).lower()


def test_seed_dry_run_prints_lines_and_writes_nothing(tmp_path: Path) -> None:
    state = tmp_path / "state.json"
    config = _cfg(tmp_path, state_file=state)
    dry = _cli(config, tmp_path, "seed-from-files", str(PLANS_DIR), "--dry-run")
    assert dry.returncode == 0, dry.stderr
    assert not state.exists()
    created = _payload(_cli(config, tmp_path, "seed-from-files", str(PLANS_DIR)))
    assert created, "the real seed creates records"
    for row in created:
        assert row["id"] in dry.stdout, row["id"]
