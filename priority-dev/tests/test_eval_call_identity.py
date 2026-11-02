"""Slice RED: every row of `calls.jsonl` carries the identity of its stop.

The contract. A call row gains the fields `session_id` and `stop` (empty strings
when unset), taken from the Interpreter's `session_id` and from a `stop`
attribute that the eval runner sets on the interpreter before each call (or
that a caller passes through `forward(brief_text=..., stop=...)`; the two stay
backward compatible, so `priority interpret` and replay keep working with the
empty defaults). In a threaded eval the rows of `calls.jsonl` arrive in
completion order, so only these two fields let a report be joined to the log:
the set of `(session_id, stop)` in the log must equal the set of the report's
`score stop session=... stop=...` lines, one row per stop, and each row's
`rendered_input` must be the brief of that stop. A serial run (threads=1)
keeps writing the rows in manifest order. Every world, model, and judge here
is a stub, so no test makes a live model call.
"""
from __future__ import annotations

import contextlib
import io
import json
import re
import threading
import time
from pathlib import Path

from brief_support import Transcript, build
from fixtures_support import SESSION_IDS, make_labels, require, stop_key
from interpret_support import Always, no_live_call, propose, read_calls  # noqa: F401 (fixture re-export)
from judge_ref_support import install_judge

SCORE_STOP = re.compile(r"^score stop session=(\S+) stop=(\d{3}) ", re.M)
THREADS = re.compile(r"^threads: (\d+)$", re.M)

STOPS = 3  # stops per session in the made-up world
SLEEP = 0.02  # the stub model sleeps a varying amount per call, so rows land out of order


class SleepingLM(Always):
    """A stub model that sleeps a varying amount per call.

    The nth call sleeps `(n % 3) * SLEEP`, so the threaded rows of `calls.jsonl`
    complete in an order that differs from the manifest order.
    """

    def __init__(self, reply: dict):
        super().__init__(reply)
        self.count = 0
        self._lock = threading.Lock()

    def forward(self, prompt=None, messages=None, **kwargs):
        with self._lock:
            self.count += 1
            n = self.count
        time.sleep((n % 3) * SLEEP)
        return super().forward(prompt=prompt, messages=messages, **kwargs)


class SleepingJudge:
    """A stub judge that sleeps a little, so the worker threads overlap."""

    def __call__(self, brief_text, predicted, expected):
        time.sleep(SLEEP)
        return (0.5, ["payload: the made-up parts match."])


def distinct_world(tmp_path: Path, sessions: list[str] = SESSION_IDS, stops: int = STOPS):
    """A made-up world whose brief of each stop names that stop's own question.

    Each session transcript holds `stops` exchanges, and the question of stop n
    of session s reads `Question s-n?`, so the brief of one stop contains that
    marker and no other stop's marker. Return the manifest path, the labels
    path, the transcripts dir, the split parts, and the per-stop brief texts.
    """
    from priority.evaluation.split import split

    manifest_path = tmp_path / "set-manifest.json"
    labels_path = tmp_path / "labels-confirmed.json"
    real_dir = tmp_path / "real"
    real_dir.mkdir(exist_ok=True)
    manifest = [{"session": sid, "stops_in_session": stops, "stops": list(range(1, stops + 1)),
                 "skipped": []} for sid in sessions]
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    labels = make_labels(session_ids=sessions, stops_per=stops)
    for per_session in labels["sessions"].values():
        for label in per_session["stops"].values():
            label["payloads"] = []
    labels_path.write_text(json.dumps(labels, indent=2) + "\n")
    briefs = {}
    for sid in sessions:
        t = Transcript()
        for n in range(1, stops + 1):
            t.human(f"Question {sid}-{n}?")
            t.reply(f"Answer {n}.")
        t.write(real_dir / f"{sid}.jsonl")
        for n in range(1, stops + 1):
            brief = build(real_dir / f"{sid}.jsonl", stop=n)
            assert type(brief).__name__ == "StopBrief", f"stop {n} of {sid} built no brief"
            briefs[(sid, stop_key(n))] = str(brief.for_model())
    return manifest_path, labels_path, real_dir, split(sessions), briefs


def run_eval(monkeypatch, tmp_path, world, lm, *extra):
    """Run `priority eval --split train` on the world with the stub model and judge.

    The runner's real Interpreter is used (only `interpreter_lm` is stubbed),
    so the call rows come from the real `CallRecorder`. Return the exit code,
    the printed text, and the log dir.
    """
    manifest_path, labels_path, real_dir, parts, _ = world
    monkeypatch.setattr(require("priority.interpreter"), "interpreter_lm", lambda *a, **k: lm)
    install_judge(monkeypatch, SleepingJudge())
    from priority.cli import main

    log_dir = tmp_path / "logs"
    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out):
        code = main(["eval", "--split", "train", "--manifest", str(manifest_path),
                     "--labels", str(labels_path), "--real-dir", str(real_dir),
                     "--log-dir", str(log_dir), *extra])
    return code, out.getvalue(), log_dir


def scored_stops(printed: str) -> list[tuple[str, str]]:
    """The (session, stop) of each `score stop` line, in printed order."""
    return SCORE_STOP.findall(printed)


def manifest_stops(manifest_path: Path, parts: dict) -> list[tuple[str, str]]:
    """The (session, stop) pairs of the train split, in manifest order."""
    manifest = json.loads(manifest_path.read_text())
    wanted = set(parts["train"])
    return [(entry["session"], stop_key(number))
            for entry in manifest if entry["session"] in wanted for number in entry["stops"]]


def logged_keys(rows: list[dict]) -> list[tuple[str, str]]:
    """The (session_id, stop) of each call row, failing on a missing field."""
    for row in rows:
        assert "session_id" in row and "stop" in row, \
            f"a call row holds no (session_id, stop): {sorted(row)}"
    return [(row["session_id"], row["stop"]) for row in rows]


# ---- Item 1: the call rows carry the session and the stop ----------------------


def test_every_call_row_carries_session_id_and_stop_at_four_threads(monkeypatch, tmp_path):
    world = distinct_world(tmp_path)
    manifest_path, _, _, parts, _ = world
    lm = SleepingLM(propose([], status="continuing", needs_human=False, priority="P3"))
    code, printed, log_dir = run_eval(monkeypatch, tmp_path, world, lm, "--threads", "4")
    assert code == 0, printed[-500:]
    rows = read_calls(log_dir)
    expected = manifest_stops(manifest_path, parts)
    assert len(rows) == len(expected), f"calls.jsonl holds {len(rows)} rows, not {len(expected)}"
    for row in rows:
        assert "session_id" in row, f"a call row holds no session_id: {sorted(row)}"
        assert "stop" in row, f"a call row holds no stop: {sorted(row)}"
        assert isinstance(row["session_id"], str) and isinstance(row["stop"], str), \
            f"session_id and stop must be strings, got {row['session_id']!r}, {row['stop']!r}"
        assert (row["session_id"], row["stop"]) in expected, \
            f"a call row names {row['session_id']!r} stop {row['stop']!r}, which the report never scored"


def test_the_row_set_of_the_log_equals_the_scored_stop_set_at_four_threads(monkeypatch, tmp_path):
    world = distinct_world(tmp_path)
    lm = SleepingLM(propose([], status="continuing", needs_human=False, priority="P3"))
    code, printed, log_dir = run_eval(monkeypatch, tmp_path, world, lm, "--threads", "4")
    assert code == 0, printed[-500:]
    keys = logged_keys(read_calls(log_dir))
    logged = set(keys)
    scored = set(scored_stops(printed))
    assert logged == scored, \
        f"the log holds {len(logged)} stops, the report {len(scored)}; " \
        f"only in the log: {sorted(logged - scored)[:3]}, only in the report: {sorted(scored - logged)[:3]}"
    counts: dict[tuple[str, str], int] = {}
    for key in keys:
        counts[key] = counts.get(key, 0) + 1
    assert set(counts.values()) == {1}, f"the join is not 1:1: a stop has {sorted(set(counts.values()))} rows"


def test_each_rows_rendered_input_belongs_to_that_stop(monkeypatch, tmp_path):
    world = distinct_world(tmp_path)
    _, _, _, _, briefs = world
    lm = SleepingLM(propose([], status="continuing", needs_human=False, priority="P3"))
    code, printed, log_dir = run_eval(monkeypatch, tmp_path, world, lm, "--threads", "4")
    assert code == 0, printed[-500:]
    for row in read_calls(log_dir):
        assert "session_id" in row and "stop" in row, \
            f"a call row holds no (session_id, stop): {sorted(row)}"
        key = (row["session_id"], row["stop"])
        assert key in briefs, f"a call row names {key}, which no brief was built for"
        assert briefs[key] in row["rendered_input"], \
            f"the row of {key} does not hold the brief of that stop"
        others = [text for other, text in briefs.items() if other != key and text in row["rendered_input"]]
        assert not others, f"the row of {key} also holds {len(others)} other stops' briefs"


def test_the_log_and_the_report_join_one_to_one_at_four_threads(monkeypatch, tmp_path):
    world = distinct_world(tmp_path)
    _, _, _, _, briefs = world
    lm = SleepingLM(propose([], status="continuing", needs_human=False, priority="P3"))
    code, printed, log_dir = run_eval(monkeypatch, tmp_path, world, lm, "--threads", "4")
    assert code == 0, printed[-500:]
    scored = scored_stops(printed)
    rows = read_calls(log_dir)
    assert len(rows) == len(scored), f"{len(rows)} call rows for {len(scored)} scored stops"
    keys = logged_keys(rows)
    joined = {(row["session_id"], row["stop"]): row for row, key in zip(rows, keys) if key is not None}
    assert len(joined) == len(scored), "two call rows carry the same (session_id, stop)"
    for session, stop in scored:
        assert (session, stop) in joined, f"the report scored {session} {stop}, but no call row carries it"
        assert briefs[(session, stop)] in joined[(session, stop)]["rendered_input"], \
            f"the call row of {session} {stop} does not hold that stop's brief"


# ---- Item 2: a direct interpreter call also records the identity ---------------


def test_a_forward_call_records_the_session_and_stop_it_was_given(tmp_path):
    from interpret_support import predicted

    lm = Always(propose([], status="continuing", needs_human=False, priority="P3"))
    try:
        out = predicted(lm, log_dir=tmp_path, session_id="made-up-session", stop="003")
    except TypeError as exc:
        raise AssertionError(f"the Interpreter rejected a stop keyword: {exc}") from exc
    assert out.abstain is None
    rows = read_calls(tmp_path)
    assert len(rows) == 1
    assert rows[0].get("session_id") == "made-up-session", \
        f"the call row holds session_id {rows[0].get('session_id')!r}, not 'made-up-session'"
    assert rows[0].get("stop") == "003", f"the call row holds stop {rows[0].get('stop')!r}, not '003'"


def test_a_forward_call_without_a_stop_records_empty_strings(tmp_path):
    from interpret_support import predicted

    lm = Always(propose([], status="continuing", needs_human=False, priority="P3"))
    predicted(lm, log_dir=tmp_path, session_id="made-up-session")
    rows = read_calls(tmp_path)
    assert len(rows) == 1
    assert rows[0].get("session_id") == "made-up-session", \
        f"the call row holds session_id {rows[0].get('session_id')!r}, not 'made-up-session'"
    assert rows[0].get("stop") == "", f"an unset stop must log as '', got {rows[0].get('stop')!r}"


def test_a_call_without_a_session_records_an_empty_session_id(tmp_path):
    from interpret_support import predicted

    lm = Always(propose([], status="continuing", needs_human=False, priority="P3"))
    predicted(lm, log_dir=tmp_path)
    rows = read_calls(tmp_path)
    assert len(rows) == 1
    assert rows[0].get("session_id") == "", \
        f"an unset session_id must log as '', got {rows[0].get('session_id')!r}"
    assert rows[0].get("stop") == "", f"an unset stop must log as '', got {rows[0].get('stop')!r}"


# ---- Item 3: a serial run keeps the rows in manifest order ----------------------


def test_threads_one_writes_the_call_rows_in_manifest_order(monkeypatch, tmp_path):
    world = distinct_world(tmp_path)
    manifest_path, _, _, parts, _ = world
    lm = SleepingLM(propose([], status="continuing", needs_human=False, priority="P3"))
    code, printed, log_dir = run_eval(monkeypatch, tmp_path, world, lm, "--threads", "1")
    assert code == 0, printed[-500:]
    match = THREADS.search(printed)
    assert match and match.group(1) == "1", f"the run printed no `threads: 1` line: {printed[-300:]}"
    logged = logged_keys(read_calls(log_dir))
    expected = manifest_stops(manifest_path, parts)
    assert logged == expected, \
        f"threads=1 wrote the rows in completion order: the first rows are {logged[:4]}, " \
        f"not the manifest order {expected[:4]}"
    assert logged == scored_stops(printed), "the serial rows do not match the printed score lines"
