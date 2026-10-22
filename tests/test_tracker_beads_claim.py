"""Slice 7 of E2: beads slice claims, state writes, and attempts replay bd transcripts.

Run with: uv run pytest tests/test_tracker_beads_claim.py -q
"""
from __future__ import annotations



import _beads_support as support


def test_set_slice_state_sends_the_full_cb_block() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = support.SequenceRunner(support.with_syncs(support.steps("set_slice_state_steps")))
    BeadsAdapter(runner).set_slice_state("demo-E1-s2", "closed", score=0.8)

    assert [call[0] for call in runner.calls] == ["list", "update", "sync"]


def test_open_pull_request_replays_the_recorded_argv() -> None:
    # E5-4 adds one gate for each epic, so the replay uses the transcript that holds the gate calls.
    from tracker_port.beads import BeadsAdapter

    steps = support.with_syncs(support.steps("open_pull_request_gate_steps"))
    runner = support.SequenceRunner(steps)
    BeadsAdapter(runner).open_pull_request("pr-101", ["demo-E1", "demo-E2"])

    assert len(runner.calls) == len(steps)


def test_sequence_runner_rejects_a_drifted_argument() -> None:
    # The replay is only evidence if a changed argument fails it.
    steps = support.steps("open_pull_request_steps")
    runner = support.SequenceRunner(steps)
    runner.run(list(steps[0]["args"]))
    drifted = list(steps[1]["args"])
    drifted[drifted.index("--external-ref") + 1] = "gh-102"
    try:
        runner.run(drifted)
    except AssertionError:
        return
    raise AssertionError("a create argv with a changed external ref must fail the replay")


def test_record_attempt_and_gate_round_trip_keep_every_envelope_key() -> None:
    from tracker_port.beads import BeadsAdapter

    runner = support.SequenceRunner(support.with_syncs(support.steps("round_trip_steps")))
    adapter = BeadsAdapter(runner)
    adapter.record_attempt("demo-E1-s1", 0.92)
    adapter.set_gate_value("demo", "gate1", "2026-10-14")
    slice_envelope = dict(adapter.get_slice("demo-E1-s1").envelope)
    program = next(record for record in adapter.list_programs() if record.id == "demo")

    written = support.metadata_arg(runner.calls[1])["cb"]["envelope"]
    assert "note" not in written
    assert written == {
        "run": 3,
        "flaky": True,
        "label": "first pass",
        "ratio": 0.5,
        "evidence": ["docs/rubrics/a.md", "docs/rubrics/b.md"],
        "score": 0.92,
        "attempts": 1,
    }
    assert slice_envelope == {
        "run": 3,
        "flaky": True,
        "label": "first pass",
        "ratio": 0.5,
        "score": 0.92,
        "attempts": 1,
        "evidence": ("docs/rubrics/a.md", "docs/rubrics/b.md"),
    }
    assert "note" not in slice_envelope
    assert type(slice_envelope["run"]) is int
    assert type(slice_envelope["flaky"]) is bool
    assert type(slice_envelope["label"]) is str
    assert type(slice_envelope["ratio"]) is float
    assert dict(program.envelope) == {"gate1": "2026-10-14"}
    assert len(runner.calls) == 8
