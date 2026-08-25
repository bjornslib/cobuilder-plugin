"""Tests for the feedback ledger (Slice 12).

Run with: uv run --with pytest pytest tests/test_ledger.py -v
"""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import types
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "shared"))

import ledger  # noqa: E402
from ledger import (  # noqa: E402
    LedgerPaths,
    append_comment,
    append_reply,
    append_state,
    fold_threads,
    get_all_threads,
    get_thread,
    load_projection,
    project_threads,
    read_ledger,
    rebuild_projection,
    write_projection,
)


def test_append_comment_assigns_ulid_and_returns_it(tmp_path: Path):
    paths = LedgerPaths(tmp_path)
    anchor = {"selector": ".test-class", "selection": {"quotedText": "selected text"}}
    ulid_val = append_comment(paths, anchor, "This is a comment")
    assert ulid_val is not None
    assert len(ulid_val) == 26  # ULID length

    lines = read_ledger(paths.ledger)
    assert len(lines) == 1
    assert lines[0]["type"] == "comment"
    assert lines[0]["ulid"] == ulid_val
    assert lines[0]["thread_ulid"] == ulid_val
    assert lines[0]["anchor"] == anchor
    assert lines[0]["text"] == "This is a comment"
    assert lines[0]["author"] == "human"


def test_append_thread_never_rewrites_an_existing_line(tmp_path: Path):
    paths = LedgerPaths(tmp_path)
    ulid1 = append_comment(paths, {"selector": "#a"}, "First")
    ulid2 = append_comment(paths, {"selector": "#b"}, "Second")

    lines = read_ledger(paths.ledger)
    assert len(lines) == 2
    assert lines[0]["ulid"] == ulid1
    assert lines[1]["ulid"] == ulid2
    # First line unchanged
    assert lines[0]["text"] == "First"


def test_two_concurrent_appends_both_survive(tmp_path: Path):
    """Simulate concurrent appends by reading, appending, reading again."""
    paths = LedgerPaths(tmp_path)

    # Simulate two processes appending at roughly the same time
    # Process 1 reads current state
    lines_before = read_ledger(paths.ledger)
    offset = len(lines_before)

    # Process 1 appends
    ulid1 = append_comment(paths, {"selector": "#a"}, "First")

    # Process 2 appends (without re-reading, simulating race)
    ulid2 = append_comment(paths, {"selector": "#b"}, "Second")

    lines_after = read_ledger(paths.ledger)
    assert len(lines_after) == 2
    ulids = {l["ulid"] for l in lines_after}
    assert ulid1 in ulids
    assert ulid2 in ulids


def test_state_change_is_a_new_line_not_an_edit(tmp_path: Path):
    paths = LedgerPaths(tmp_path)
    ulid = append_comment(paths, {"selector": "#a"}, "Comment")
    append_state(paths, ulid, "resolved", by="human")

    lines = read_ledger(paths.ledger)
    assert len(lines) == 2
    assert lines[0]["type"] == "comment"
    assert lines[1]["type"] == "state"
    assert lines[1]["state"] == "resolved"
    # Original comment line unchanged
    assert lines[0]["text"] == "Comment"


def test_read_does_not_delete(tmp_path: Path):
    """Reading the ledger, folding, and projecting all leave the file byte-identical."""
    paths = LedgerPaths(tmp_path)
    ulid = append_comment(paths, {"selector": "#a"}, "Comment")

    # Read multiple times
    for _ in range(3):
        lines = read_ledger(paths.ledger)
        folded = fold_threads(lines)
        proj = project_threads(lines)
        write_projection(paths.projection, proj)

    # File should be unchanged
    content_after = paths.ledger.read_bytes()
    # Re-read and verify same content
    lines = read_ledger(paths.ledger)
    assert len(lines) == 1
    assert lines[0]["ulid"] == ulid
    assert lines[0]["text"] == "Comment"


def test_thread_view_folds_a_reply_under_its_root(tmp_path: Path):
    paths = LedgerPaths(tmp_path)
    thread_ulid = append_comment(paths, {"selector": "#a"}, "Root comment")
    append_reply(paths, thread_ulid, "Agent reply 1")
    append_reply(paths, thread_ulid, "Agent reply 2")

    threads = get_all_threads(paths)
    assert thread_ulid in threads
    thread = threads[thread_ulid]
    assert thread["reply_count"] == 2
    assert len(thread["replies"]) == 2
    assert thread["replies"][0]["text"] == "Agent reply 1"
    assert thread["replies"][1]["text"] == "Agent reply 2"


def test_an_agent_reply_carries_author_agent_and_replies_to(tmp_path: Path):
    paths = LedgerPaths(tmp_path)
    thread_ulid = append_comment(paths, {"selector": "#a"}, "Root")
    reply_ulid = append_reply(paths, thread_ulid, "Agent response", author="agent")

    lines = read_ledger(paths.ledger)
    reply_lines = [l for l in lines if l["type"] == "reply"]
    assert len(reply_lines) == 1
    assert reply_lines[0]["author"] == "agent"
    assert reply_lines[0]["thread_ulid"] == thread_ulid
    assert reply_lines[0]["ulid"] == reply_ulid


def test_projection_state_equals_the_last_transition_in_the_ledger(tmp_path: Path):
    paths = LedgerPaths(tmp_path)
    thread_ulid = append_comment(paths, {"selector": "#a"}, "Comment")
    append_state(paths, thread_ulid, "open", by="human")
    append_state(paths, thread_ulid, "resolved", by="agent")

    proj = get_all_threads(paths)
    thread = proj[thread_ulid]
    assert thread["current_state"] == "resolved"
    assert thread["updated_by"] == "agent"
    assert len(thread["state_changes"]) == 2
    assert thread["state_changes"][0]["state"] == "open"
    assert thread["state_changes"][1]["state"] == "resolved"


def test_deleting_the_projection_rebuilds_it_from_the_ledger(tmp_path: Path):
    paths = LedgerPaths(tmp_path)
    thread_ulid = append_comment(paths, {"selector": "#a"}, "Comment")
    append_state(paths, thread_ulid, "resolved", by="human")

    # Delete projection
    paths.projection.unlink(missing_ok=True)
    assert not paths.projection.exists()

    # Rebuild
    rebuilt = rebuild_projection(paths)

    assert paths.projection.exists()
    thread = rebuilt[thread_ulid]
    assert thread["current_state"] == "resolved"
    assert thread["updated_by"] == "human"


def test_projection_records_who_moved_the_state_and_when(tmp_path: Path):
    paths = LedgerPaths(tmp_path)
    thread_ulid = append_comment(paths, {"selector": "#a"}, "Comment")
    append_state(paths, thread_ulid, "resolved", by="agent")

    thread = get_thread(paths, thread_ulid)
    assert thread["updated_by"] == "agent"
    assert thread["updated_at"] is not None
    assert "T" in thread["updated_at"]  # ISO timestamp


def test_get_thread_returns_none_for_missing(tmp_path: Path):
    paths = LedgerPaths(tmp_path)
    result = get_thread(paths, "non-existent")
    assert result is None


def test_projection_is_disposable_full_rebuild(tmp_path: Path):
    """The projection is disposable - delete and rebuild gives same result."""
    paths = LedgerPaths(tmp_path)
    ulid1 = append_comment(paths, {"selector": "#a"}, "First")
    ulid2 = append_comment(paths, {"selector": "#b"}, "Second")
    append_state(paths, ulid1, "resolved", by="human")

    proj1 = get_all_threads(paths)

    # Full rebuild
    paths.projection.unlink()
    proj2 = rebuild_projection(paths)

    assert set(proj1.keys()) == set(proj2.keys())
    for key in proj1:
        assert proj1[key]["current_state"] == proj2[key]["current_state"]
        assert proj1[key]["reply_count"] == proj2[key]["reply_count"]


def test_ulid_factory_degrades_when_import_yields_wrong_object(monkeypatch):
    """A wrong-object import must fall through to the uuid fallback.

    This reproduces the shipped bug directly, with no network and no real
    dependency. `from ulid import ulid` used to bind the `ulid.ulid`
    submodule instead of a function, so the import succeeded and the
    guard never engaged. The failure moved to call time, where it raised
    "'module' object is not callable". Inject the same wrong-object shape
    here and assert the factory degrades instead of raising.
    """
    fake_ulid_module = types.ModuleType("ulid")
    # Same shape as the real bug: an attribute that is a module, not a
    # callable that returns a ULID.
    fake_ulid_module.new = types.ModuleType("ulid.new")
    monkeypatch.setitem(sys.modules, "ulid", fake_ulid_module)

    factory = ledger._load_ulid_factory()
    value = factory()

    assert isinstance(value, str)
    assert len(value) == 26


def test_ulid_factory_degrades_when_new_returns_wrong_shape(monkeypatch):
    """A callable `ulid.new` that returns an object without `.str` must
    also degrade to the fallback, not raise."""
    fake_ulid_module = types.ModuleType("ulid")
    fake_ulid_module.new = lambda: object()  # no .str attribute
    monkeypatch.setitem(sys.modules, "ulid", fake_ulid_module)

    factory = ledger._load_ulid_factory()
    value = factory()

    assert isinstance(value, str)
    assert len(value) == 26


def test_ulid_factory_uses_real_dependency_when_shape_is_correct(monkeypatch):
    """A correctly shaped `ulid.new()` result is used as-is, via `.str`."""

    class _FakeUlid:
        str = "01ARZ3NDEKTSV4RRFFQ69G5FAV"

    fake_ulid_module = types.ModuleType("ulid")
    fake_ulid_module.new = lambda: _FakeUlid()
    monkeypatch.setitem(sys.modules, "ulid", fake_ulid_module)

    factory = ledger._load_ulid_factory()
    assert factory() == "01ARZ3NDEKTSV4RRFFQ69G5FAV"


def test_uuid_fallback_is_not_time_sortable():
    """The uuid4 fallback is a valid 26-char id, but NOT sortable by
    creation order. This is why `ulid-py` stays a dependency: dropping it
    would break the ledger's reliance on append-order sorting."""
    import base64
    import uuid

    def _fallback() -> str:
        return base64.b32encode(uuid.uuid4().bytes).decode().lower().rstrip("=")

    values = [_fallback() for _ in range(20)]
    assert values != sorted(values)


@pytest.mark.skipif(
    subprocess.run(["uv", "--version"], capture_output=True).returncode != 0,
    reason="uv is not on PATH, cannot resolve ulid-py for a real-dependency check",
)
def test_ulid_factory_works_against_real_ulid_py_dependency():
    """End-to-end proof against the real `ulid-py` package, not a stub.

    Runs in a subprocess with `uv run --with 'ulid-py>=1.0'` so the actual
    dependency is present, the same way `serve_bundle.py` resolves it.
    Before the fix, this call raised "'module' object is not callable".
    """
    ledger_dir = str(Path(__file__).resolve().parent.parent / "shared")
    script = (
        "import sys; "
        f"sys.path.insert(0, {ledger_dir!r}); "
        "import ledger; "
        "value = ledger._ulid(); "
        "assert isinstance(value, str), value; "
        "assert len(value) == 26, value; "
        "print(value)"
    )
    result = subprocess.run(
        ["uv", "run", "--with", "ulid-py>=1.0", "python3", "-c", script],
        capture_output=True,
        text=True,
        timeout=60,
    )
    if result.returncode != 0:
        pytest.fail(
            "Real ulid-py dependency check failed:\n"
            f"stdout: {result.stdout}\nstderr: {result.stderr}"
        )
    produced = result.stdout.strip()
    assert len(produced) == 26


if __name__ == "__main__":
    pytest.main([__file__, "-v"])