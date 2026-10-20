"""E3 slice 10 follow-up: seed_from_files(refresh_envelope=...) rewrites stale envelopes.

A record that the seed already created keeps its envelope from the first run.
With refresh_envelope=True the seed rewrites each existing record whose envelope
differs from the plan files. The merge rule (record.merge_refresh_envelope):
- file-derived keys overwrite the held values;
- score and attempts take the file value only when the held value is missing or None;
- runtime keys that the file lacks are kept.
Every test first checks that the keyword exists, so a missing keyword fails on an assertion.
"""

from __future__ import annotations

import dataclasses
import inspect
import json
import shutil
import subprocess
from pathlib import Path
from typing import Any

import pytest

import _tracker_port_support as support  # noqa: E402

PLANS_DIR = support.PLANS_DIR
CORPUS_DIR = support.CORPUS

# Slice roles in the plans fixture, keyed by external_ref.
REF_MISSING_SCORE = "beads-storage-mini/1"  # held envelope has no score key: the file fills it
REF_RUNTIME_SCORE = "beads-storage-mini/2"  # held envelope has a runtime score and attempts: both kept
REF_NULL_SCORE = "beads-storage-mini/3"  # held score is None: the file fills it
RUNTIME_SCORE = 0.8
RUNTIME_ATTEMPTS = 2


def _file_slice_envelopes() -> dict[str, dict[str, Any]]:
    from tracker_port.files import seedable_records

    found, _conflicts = seedable_records(PLANS_DIR)
    return {record.external_ref: record.envelope for record in found if record.kind == "slice"}


def _stale_envelope(ref: str, file_envelope: dict[str, Any]) -> dict[str, Any]:
    # Every slice holds an older title and summary. The score differs by role.
    stale = {**file_envelope, "title": "Stale title", "ends_with": "Stale summary"}
    if ref == REF_MISSING_SCORE:
        del stale["score"]
    elif ref == REF_RUNTIME_SCORE:
        stale["score"] = RUNTIME_SCORE
        stale["attempts"] = RUNTIME_ATTEMPTS
    return stale


def _stale_map(file_envelopes: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {ref: _stale_envelope(ref, envelope) for ref, envelope in file_envelopes.items()}


def _expected_after_refresh(ref: str, file_envelope: dict[str, Any]) -> dict[str, Any]:
    # File values overwrite title and summary. A runtime score and attempts survive.
    if ref == REF_RUNTIME_SCORE:
        return {**file_envelope, "score": RUNTIME_SCORE, "attempts": RUNTIME_ATTEMPTS}
    return dict(file_envelope)


def _apply_stale(adapter: Any, stale_by_ref: dict[str, dict[str, Any]]) -> None:
    adapter._records = [
        dataclasses.replace(record, envelope=stale_by_ref[record.external_ref])
        if record.external_ref in stale_by_ref
        else record
        for record in adapter._records
    ]


def test_fake_refresh_overwrites_summary_and_fills_or_keeps_score() -> None:
    from tracker_port.fake import FakeAdapter

    assert "refresh_envelope" in inspect.signature(FakeAdapter.seed_from_files).parameters
    adapter = FakeAdapter(CORPUS_DIR)
    adapter.seed_from_files(PLANS_DIR)
    file_envelopes = _file_slice_envelopes()
    _apply_stale(adapter, _stale_map(file_envelopes))
    adapter.seed_from_files(PLANS_DIR, refresh_envelope=True)
    refreshed = {record.external_ref: record.envelope for record in adapter._records if record.external_ref in file_envelopes}
    assert refreshed == {ref: _expected_after_refresh(ref, env) for ref, env in file_envelopes.items()}


def test_fake_refresh_keeps_lifecycle_parent_and_blocked_by() -> None:
    from tracker_port.fake import FakeAdapter

    assert "refresh_envelope" in inspect.signature(FakeAdapter.seed_from_files).parameters
    adapter = FakeAdapter(CORPUS_DIR)
    adapter.seed_from_files(PLANS_DIR)
    _apply_stale(adapter, _stale_map(_file_slice_envelopes()))
    before = {record.id: (record.lifecycle, record.parent, record.blocked_by) for record in adapter._records}
    adapter.seed_from_files(PLANS_DIR, refresh_envelope=True)
    after = {record.id: (record.lifecycle, record.parent, record.blocked_by) for record in adapter._records}
    assert after == before


def test_fake_refresh_writes_nothing_when_envelopes_are_current() -> None:
    from tracker_port.fake import FakeAdapter

    assert "refresh_envelope" in inspect.signature(FakeAdapter.seed_from_files).parameters
    adapter = FakeAdapter(CORPUS_DIR)
    adapter.seed_from_files(PLANS_DIR)
    commits: list[None] = []
    adapter._commit = lambda: commits.append(None)  # type: ignore[method-assign]
    adapter.seed_from_files(PLANS_DIR, refresh_envelope=True)
    assert commits == []


def test_fake_default_seed_leaves_stale_envelopes_alone() -> None:
    # Regression guard: without the flag, the seed does not refresh. This test passes today.
    from tracker_port.fake import FakeAdapter

    adapter = FakeAdapter(CORPUS_DIR)
    adapter.seed_from_files(PLANS_DIR)
    file_envelopes = _file_slice_envelopes()
    stale_envelopes = _stale_map(file_envelopes)
    _apply_stale(adapter, stale_envelopes)
    adapter.seed_from_files(PLANS_DIR)
    unchanged = {record.external_ref: record.envelope for record in adapter._records if record.external_ref in file_envelopes}
    assert unchanged == stale_envelopes


class _RecordingRunner:
    # Wraps a bd runner and keeps the argv of each call, in order.
    def __init__(self, inner: Any) -> None:
        self.inner = inner
        self.calls: list[list[str]] = []

    def run(self, argv: list[str]) -> str:
        self.calls.append(list(argv))
        return self.inner.run(argv)


@pytest.fixture
def scratch_bd(tmp_path: Path) -> Path:
    if shutil.which("bd") is None:
        pytest.skip("bd is not on PATH")
    subprocess.run(["git", "init", "-q"], cwd=tmp_path, check=True)
    subprocess.run(["bd", "init", "--prefix", "demo", "--non-interactive", "--quiet"], cwd=tmp_path, check=True)
    subprocess.run(["bd", "config", "set", "types.custom", "program"], cwd=tmp_path, check=True)
    return tmp_path


def test_real_bd_refresh_updates_only_stale_slices(scratch_bd: Path) -> None:
    from tracker_port.beads import LIST_ARGS, BeadsAdapter, _cb_block, _metadata_arg
    from tracker_port.bd_runner import BdRunner
    from tracker_port.files import seedable_records

    assert "refresh_envelope" in inspect.signature(BeadsAdapter.seed_from_files).parameters
    runner = _RecordingRunner(BdRunner(bd="bd", cwd=scratch_bd))
    adapter = BeadsAdapter(runner)
    adapter.seed_from_files(PLANS_DIR)

    # Make each slice envelope stale through bd, the way an older adapter wrote it.
    file_envelopes = _file_slice_envelopes()
    stale = _stale_map(file_envelopes)
    for row in json.loads(runner.run(LIST_ARGS)):
        cb = _cb_block(row)
        if cb["kind"] == "slice":
            runner.run(["update", row["id"], "--metadata", _metadata_arg({**cb, "envelope": stale[cb["id"]]})])

    file_slices = [record for record in seedable_records(PLANS_DIR)[0] if record.kind == "slice"]
    runner.calls.clear()

    adapter.seed_from_files(PLANS_DIR, refresh_envelope=True)

    updates = [call for call in runner.calls if call[:1] == ["update"] and "--metadata" in call]
    assert len(updates) == len(file_slices), "one metadata write per stale slice"
    assert [call for call in runner.calls if call[:1] == ["create"]] == []
    assert runner.calls.count(["sync"]) == 1
    refreshed = {record.external_ref: record.envelope for record in adapter._records().values() if record.external_ref in file_envelopes}
    assert refreshed == {ref: _expected_after_refresh(ref, env) for ref, env in file_envelopes.items()}

    runner.calls.clear()
    adapter.seed_from_files(PLANS_DIR, refresh_envelope=True)
    assert [call for call in runner.calls if call[:1] == ["update"]] == [], "a second refresh writes nothing"
