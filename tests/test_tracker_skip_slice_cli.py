"""Decision 1A at the edges: the `skip-slice` command, the status files, and the prose.

Run with: uv run pytest tests/test_tracker_skip_slice_cli.py -q
"""
from __future__ import annotations

import json
import re
import shutil
from pathlib import Path

import pytest

import _skip_slice_support as skip
import _tracker_cli_support as cli_support
from _tracker_port_support import CORPUS, REPO_ROOT

FIXTURES = REPO_ROOT / "tests" / "fixtures" / "tracker"
PROGRAM = "beads-storage-mini"


def _cli_state(tmp_path: Path) -> tuple[Path, Path]:
    corpus = tmp_path / "corpus"
    shutil.copytree(CORPUS, corpus)
    state = tmp_path / "state.json"
    return cli_support.fake_config(tmp_path, corpus, state), state


def test_cli_skip_slice_closes_with_outcome(tmp_path: Path) -> None:
    config, _state = _cli_state(tmp_path)

    result = cli_support.ok(cli_support.cli(config, tmp_path, "skip-slice", "demo-E1-s3", "--reason", "later"))

    assert result["lifecycle"] == "closed"
    assert (result["envelope"]["outcome"], result["envelope"]["reason"]) == ("skipped", "later")
    got = cli_support.ok(cli_support.cli(config, tmp_path, "get-slice", "demo-E1-s3"))
    assert got["lifecycle"] == "closed"


def test_cli_skip_slice_outcome_escalated(tmp_path: Path) -> None:
    config, _state = _cli_state(tmp_path)

    result = cli_support.ok(
        cli_support.cli(config, tmp_path, "skip-slice", "demo-E1-s3", "--reason", "limit", "--outcome", "escalated")
    )

    assert result["envelope"]["outcome"] == "escalated"


@pytest.mark.parametrize(
    "extra",
    [["--reason", ""], ["--reason", "later", "--outcome", "done"], []],
    ids=["empty-reason", "bad-outcome", "no-reason"],
)
def test_cli_skip_slice_bad_arguments_exit_4_and_write_nothing(tmp_path: Path, extra: list[str]) -> None:
    config, state = _cli_state(tmp_path)

    result = cli_support.cli(config, tmp_path, "skip-slice", "demo-E1-s3", *extra)

    assert result.returncode == 4, result.stderr + result.stdout
    assert "invalid choice: 'skip-slice'" not in result.stderr, "the operation must exist"
    assert not state.exists()


def test_cli_skip_slice_unknown_id_exits_4(tmp_path: Path) -> None:
    config, _state = _cli_state(tmp_path)

    result = cli_support.cli(config, tmp_path, "skip-slice", "demo-E1-s99", "--reason", "later")

    assert result.returncode == 4, result.stderr + result.stdout
    assert "invalid choice: 'skip-slice'" not in result.stderr, "the operation must exist"
    assert "demo-E1-s99" in result.stderr


def test_cli_skip_slice_with_no_adapter_exits_2(tmp_path: Path) -> None:
    result = cli_support.cli(tmp_path / ".cobuilder" / "tracker.yaml", tmp_path, "skip-slice", "x", "--reason", "later")

    assert result.returncode == 2, result.stderr + result.stdout


def _regenerated(tmp_path: Path, outcome: str, score: float | None, attempts: int | None = None) -> Path:
    """Skip slice 3 of the mini plan in a fake corpus copy, regenerate, and return the plans root."""
    from tracker_port.fake import FakeAdapter
    from tracker_port.regenerate import regenerate

    corpus = tmp_path / "corpus"
    shutil.copytree(FIXTURES / "regenerate-corpus", corpus)
    plans = tmp_path / "plans"
    shutil.copytree(FIXTURES / "plans", plans)
    adapter = FakeAdapter(corpus)
    adapter.set_slice_state(f"{PROGRAM}/3", "open", score=score, attempts=attempts)
    adapter.skip_slice(f"{PROGRAM}/3", "delayed", outcome=outcome)
    regenerate(adapter, PROGRAM, plans)
    return plans


@pytest.mark.parametrize("outcome", skip.OUTCOMES)
def test_regenerate_renders_a_skipped_slice_checked_with_note_and_state_word(tmp_path: Path, outcome: str) -> None:
    plans = _regenerated(tmp_path, outcome, None)

    status = next(l for l in (plans / PROGRAM / "00-status.md").read_text(encoding="utf-8").splitlines() if "Slice 3" in l)
    assert status.startswith("- [x] Slice 3")
    assert re.search(r"score:\s*—", status), status
    assert status.rstrip().endswith("note: skipped"), status
    row = next(l for l in (plans / PROGRAM / "04-slices.md").read_text(encoding="utf-8").splitlines() if l.startswith("| 3 "))
    cells = [cell.strip() for cell in row.split("|")]
    assert cells[5:7] == ["—", "skipped"], row


def test_regenerate_keeps_the_score_of_a_skipped_slice(tmp_path: Path) -> None:
    plans = _regenerated(tmp_path, "escalated", 0.4, 3)

    status = next(l for l in (plans / PROGRAM / "00-status.md").read_text(encoding="utf-8").splitlines() if "Slice 3" in l)
    assert re.search(r"score:\s*0\.4\s+on attempt 3", status) and status.rstrip().endswith("note: skipped"), status
    row = next(l for l in (plans / PROGRAM / "04-slices.md").read_text(encoding="utf-8").splitlines() if l.startswith("| 3 "))
    assert [c.strip() for c in row.split("|")][5:7] == ["0.4 (attempt 3)", "skipped"], row


def test_files_adapter_reads_a_skipped_slice_back_as_closed(tmp_path: Path) -> None:
    from tracker_port.files import FilesAdapter

    plans = _regenerated(tmp_path, "skipped", None)
    assert FilesAdapter(plans).get_slice(f"{PROGRAM}/3").lifecycle == "closed"

    # The table alone also reads closed: no checkbox line, State word `skipped`.
    (plans / PROGRAM / "00-status.md").unlink()
    assert FilesAdapter(plans).get_slice(f"{PROGRAM}/3").lifecycle == "closed"


def test_slice_loop_names_skip_slice_in_the_escalation_branch() -> None:
    text = (REPO_ROOT / "plugins/implement/skills/build/references/slice-loop.md").read_text(encoding="utf-8")
    row = next(line for line in text.splitlines() if line.startswith("| **ESCALATION**"))

    assert "tracker.py skip-slice" in text or "skip-slice" in row
    assert "skip-slice" in row, "the ESCALATION row must name skip-slice"
    assert row.index("escalate <id>") < row.index("skip-slice")


def test_usage_doc_documents_skip_slice() -> None:
    text = (REPO_ROOT / "shared" / "tracker-usage.md").read_text(encoding="utf-8")

    assert re.search(r"tracker\.py[ \t]+skip-slice\b", text)


def test_cli_lists_skip_slice() -> None:
    assert "skip-slice" in cli_support.cli_ops()


def test_implement_version_is_0_12_0_or_higher_and_manifests_agree() -> None:
    plugin = json.loads((REPO_ROOT / "plugins/implement/.claude-plugin/plugin.json").read_text(encoding="utf-8"))
    market = json.loads((REPO_ROOT / ".claude-plugin/marketplace.json").read_text(encoding="utf-8"))
    listed = next(p for p in market["plugins"] if p["name"] == "implement")["version"]

    assert listed == plugin["version"]
    assert tuple(int(x) for x in plugin["version"].split(".")) >= (0, 12, 0)
