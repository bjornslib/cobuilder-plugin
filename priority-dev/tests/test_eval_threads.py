"""Slice RED: `priority eval --threads N` scores stops concurrently.

The contract. `priority eval --threads N` clamps N to 1..6 (`MAX_THREADS = 6`
on the runner or the CLI) and prints the effective count, for example
`threads: 4`. `runner.run(..., threads=None)` keeps today's serial behaviour
and row order when the option is absent or 1. With threads > 1, the stops are
scored in a `ThreadPoolExecutor(max_workers=min(threads, 6))` and the rows come
back in manifest order regardless of completion order. `_score_stop` is
unchanged per stop, and a brief that abstains still never calls the model.
`judge.USAGE` increments from worker threads stay exact, and the `calls.jsonl`
writes stay safe under concurrency. Every world, program, and judge here is a
stub, so no test makes a live model call.
"""
from __future__ import annotations

import contextlib
import io
import json
import re
import threading
import time
from pathlib import Path
from brief_support import Transcript
from eval_support import write_eval_world  # noqa: F401 (kept for run_eval default)
from fixtures_support import SESSION_IDS, make_labels, require, stop_key
from interpret_support import Always, propose
from judge_ref_support import install_judge

SCORE_STOP = re.compile(r"^score stop session=(\S+) stop=(\d{3}) ", re.M)
JUDGE_USAGE = re.compile(r"^judge calls: (\d+) prompt_tokens: (\d+) completion_tokens: (\d+)\s*$", re.M)
THREADS = re.compile(r"^threads: (\d+)$", re.M)

SLEEP = 0.05  # the stub judge sleeps this long per call, so serial runs take ~SLEEP * stops


class SleepingJudge:
    """A stub judge that sleeps ~50 ms per call and records the timestamps of each call.

    Each call also meters one judge call through the real `_meter`, with a fake
    model that carries no history entry, so `USAGE['calls']` stays exact even
    though `judge.judge` itself is stubbed out.
    """

    def __init__(self, score: float = 0.5):
        self.score = score
        self.timestamps: list[float] = []
        self._lock = threading.Lock()

    def __call__(self, brief_text, predicted, expected):
        api = require("priority.evaluation.judge")
        api._meter(object(), 0)  # one call, no history entry, so no tokens
        with self._lock:
            self.timestamps.append(time.perf_counter())
        time.sleep(SLEEP)
        return (self.score, ["payload: the made-up parts match."])


def run_eval(monkeypatch, tmp_path, *extra, interpreter=None, judge=None, world=None):
    """Run `priority eval --split train` on a made-up world with stubs.

    Return the exit code, the printed text, the split parts, and the stub judge.
    The SystemExit guard covers the run before the `--threads` flag exists, so
    the tests fail on their assertions and not on the missing parser.
    """
    judge = install_judge(monkeypatch, judge if judge is not None else SleepingJudge())
    api = require("priority.interpreter")
    if world is None:
        manifest_path, labels_path, real_dir, parts = write_multi_stop_world(tmp_path)
    else:
        manifest_path, labels_path, real_dir, parts = world
    if interpreter is None:
        interpreter = _stub_program(manifest_path, labels_path)
    monkeypatch.setattr(api, "Interpreter", lambda *a, **k: interpreter)
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out):
        code = main(["eval", "--split", "train", "--manifest", str(manifest_path),
                     "--labels", str(labels_path), "--real-dir", str(real_dir),
                     "--log-dir", str(tmp_path / "logs"), *extra])
    return code, out.getvalue(), parts, judge


def _stub_program(manifest_path: Path, labels_path: Path):
    """A stub program that answers each call with the label facts, in manifest order."""
    from eval_support import StubInterpreter, stub_predictions_for

    return StubInterpreter(stub_predictions_for(manifest_path, labels_path))


def scored_order(printed: str) -> list[tuple[str, str]]:
    """The (session, stop) of each score line, in printed order."""
    return SCORE_STOP.findall(printed)


def manifest_order(manifest_path: Path, parts: dict) -> list[tuple[str, str]]:
    """The (session, stop) pairs of one split, in manifest order."""
    manifest = json.loads(manifest_path.read_text())
    wanted = set(parts["train"])
    return [(entry["session"], stop_key(number))
            for entry in manifest if entry["session"] in wanted for number in entry["stops"]]

def write_multi_stop_world(tmp_path: Path, stops: int = 5):
    """A made-up world whose transcripts each hold `stops` stops, so every stop builds a brief.

    Return the manifest path, the labels path, the transcripts dir, and the split parts.
    """
    from priority.evaluation.split import split

    manifest_path = tmp_path / "set-manifest.json"
    labels_path = tmp_path / "labels-confirmed.json"
    real_dir = tmp_path / "real"
    real_dir.mkdir(exist_ok=True)
    sessions = list(SESSION_IDS)
    manifest = [{"session": sid, "stops_in_session": stops, "stops": list(range(1, stops + 1)),
                 "skipped": []} for sid in sessions]
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    labels = make_labels(session_ids=sessions, stops_per=stops)
    for per_session in labels["sessions"].values():
        for label in per_session["stops"].values():
            label["payloads"] = []
    labels_path.write_text(json.dumps(labels, indent=2) + "\n")
    for index, sid in enumerate(sessions):
        t = Transcript()
        for n in range(1, stops + 1):
            t.human(f"Made-up question {n} of session {index}?")
            t.reply(f"Made-up answer {n}.")
        t.write(real_dir / f"{sid}.jsonl")
    return manifest_path, labels_path, real_dir, split(sessions)




# ---- Item 1: the CLI option, the clamp, and the printed count ----------------


def test_eval_has_a_threads_option_defaulting_to_one(monkeypatch, tmp_path):
    runner = require("priority.evaluation.runner")
    assert "threads" in (runner.run.__code__.co_varnames[: runner.run.__code__.co_argcount]
                        if hasattr(runner.run, "__code__") else ()), \
        "runner.run has no threads parameter"
    code, printed, _, _ = run_eval(monkeypatch, tmp_path)
    assert code == 0, printed[-500:]
    match = THREADS.search(printed)
    assert match, f"eval printed no `threads:` line: {printed[-500:]}"
    assert match.group(1) == "1", f"the default thread count is {match.group(1)}, not 1"


def test_threads_four_runs_faster_than_serial(monkeypatch, tmp_path):
    world = write_multi_stop_world(tmp_path)
    rows = len(manifest_order(world[0], world[3]))
    assert rows >= 6, "the made-up world needs enough train stops to show a speedup"

    start = time.perf_counter()
    _, serial_printed, _, _ = run_eval(monkeypatch, tmp_path, "--threads", "1", world=world)
    serial = time.perf_counter() - start
    start = time.perf_counter()
    _, fast_printed, _, _ = run_eval(monkeypatch, tmp_path, "--threads", "4", world=world)
    fast = time.perf_counter() - start
    assert scored_order(serial_printed) == scored_order(fast_printed)
    assert fast < serial * 0.75, \
        f"threads=4 took {fast:.2f}s, not clearly below the serial {serial:.2f}s"


def test_eval_clamps_threads_above_the_max_to_six(monkeypatch, tmp_path):
    code, printed, _, _ = run_eval(monkeypatch, tmp_path, "--threads", "99")
    assert code == 0, printed[-500:]
    match = THREADS.search(printed)
    assert match, f"eval printed no `threads:` line: {printed[-500:]}"
    assert match.group(1) == "6", f"--threads 99 printed {match.group(1)}, not the clamp 6"


def test_eval_clamps_threads_below_one_to_one(monkeypatch, tmp_path):
    code, printed, _, _ = run_eval(monkeypatch, tmp_path, "--threads", "0")
    assert code == 0, printed[-500:]
    match = THREADS.search(printed)
    assert match, f"eval printed no `threads:` line: {printed[-500:]}"
    assert match.group(1) == "1", f"--threads 0 printed {match.group(1)}, not the clamp 1"


def test_eval_prints_the_effective_thread_count(monkeypatch, tmp_path):
    code, printed, _, _ = run_eval(monkeypatch, tmp_path, "--threads", "4")
    assert code == 0, printed[-500:]
    match = THREADS.search(printed)
    assert match and match.group(1) == "4", f"eval printed no `threads: 4` line: {printed[-500:]}"


def test_the_max_thread_count_is_named_six(monkeypatch, tmp_path):
    runner = require("priority.evaluation.runner")
    from priority import cli

    named = [value for module in (runner, cli)
             for name in dir(module)
             if name.isupper() and "THREAD" in name and isinstance(getattr(module, name), int)
             for value in (getattr(module, name),)]
    assert 6 in named, f"no MAX_THREADS = 6 on the runner or the CLI: {named}"


# ---- Item 2: serial behaviour and manifest order ------------------------------


def test_threads_one_keeps_the_rows_in_manifest_order(monkeypatch, tmp_path):
    manifest_path, labels_path, real_dir, parts = write_multi_stop_world(tmp_path)
    code, printed, parts, _ = run_eval(monkeypatch, tmp_path, "--threads", "1",
                                       world=(manifest_path, labels_path, real_dir, parts))
    assert code == 0, printed[-500:]
    assert scored_order(printed) == manifest_order(manifest_path, parts), \
        "threads=1 changed the row order"


def test_no_threads_option_keeps_the_rows_in_manifest_order(monkeypatch, tmp_path):
    manifest_path, labels_path, real_dir, parts = write_multi_stop_world(tmp_path)
    code, printed, parts, _ = run_eval(monkeypatch, tmp_path,
                                       world=(manifest_path, labels_path, real_dir, parts))
    assert code == 0, printed[-500:]
    assert scored_order(printed) == manifest_order(manifest_path, parts), \
        "the default run changed the row order"


def test_threads_four_keeps_the_rows_in_manifest_order(monkeypatch, tmp_path):
    manifest_path, labels_path, real_dir, parts = write_multi_stop_world(tmp_path)
    code, printed, parts, _ = run_eval(monkeypatch, tmp_path, "--threads", "4",
                                       world=(manifest_path, labels_path, real_dir, parts))
    assert code == 0, printed[-500:]
    assert scored_order(printed) == manifest_order(manifest_path, parts), \
        "threads=4 returned the rows in completion order, not manifest order"


def test_runner_run_accepts_a_threads_keyword(monkeypatch, tmp_path):
    runner = require("priority.evaluation.runner")
    manifest_path, labels_path, real_dir, parts = write_multi_stop_world(tmp_path)
    install_judge(monkeypatch, SleepingJudge())
    api = require("priority.interpreter")
    monkeypatch.setattr(api, "Interpreter",
                        lambda *a, **k: _stub_program(manifest_path, labels_path))
    try:
        code = runner.run(manifest_path, labels_path, real_dir, "train",
                          log_dir=tmp_path / "logs", threads=4)
    except TypeError as exc:
        raise AssertionError(f"runner.run rejected the threads keyword: {exc}") from exc
    assert code == 0


# ---- Item 3: exact judge usage and a real speedup -----------------------------


def test_threads_four_makes_exactly_one_judge_call_per_row(monkeypatch, tmp_path):
    judge = SleepingJudge()
    manifest_path, labels_path, real_dir, parts = write_multi_stop_world(tmp_path)
    code, printed, parts, judge = run_eval(monkeypatch, tmp_path, "--threads", "4", judge=judge,
                                           world=(manifest_path, labels_path, real_dir, parts))
    assert code == 0, printed[-500:]
    rows = scored_order(printed)
    judge_api = require("priority.evaluation.judge")
    assert judge_api.USAGE["calls"] == len(rows), \
        f"USAGE['calls'] is {judge_api.USAGE['calls']}, not one per row ({len(rows)})"
    assert set(judge_api.USAGE) == {"calls", "prompt_tokens", "completion_tokens"}, \
        f"USAGE holds {sorted(judge_api.USAGE)}, not exactly the three keys"
    match = JUDGE_USAGE.search(printed)
    assert match and int(match.group(1)) == len(rows), \
        f"the printed judge call count is not one per row: {printed[-300:]}"
    assert len(judge.timestamps) == len(rows), \
        f"the stub judge ran {len(judge.timestamps)} times for {len(rows)} rows"


def test_threads_four_runs_faster_than_serial(monkeypatch, tmp_path):
    world = write_multi_stop_world(tmp_path)
    rows = len(manifest_order(world[0], world[3]))
    assert rows >= 6, "the made-up world needs enough train stops to show a speedup"

    _, serial_printed, _, _ = run_eval(monkeypatch, tmp_path, "--threads", "1", world=world)
    serial_start = time.perf_counter()  # placeholder, replaced below
    # Time the two runs around the CLI call itself.
    start = time.perf_counter()
    _, serial_printed, _, _ = run_eval(monkeypatch, tmp_path, "--threads", "1", world=world)
    serial = time.perf_counter() - start
    start = time.perf_counter()
    _, fast_printed, _, _ = run_eval(monkeypatch, tmp_path, "--threads", "4", world=world)
    fast = time.perf_counter() - start
    assert scored_order(serial_printed) == scored_order(fast_printed)
    assert fast < serial * 0.75, \
        f"threads=4 took {fast:.2f}s, not clearly below the serial {serial:.2f}s"


def test_the_stub_judge_actually_overlaps_calls_at_four_threads(monkeypatch, tmp_path):
    judge = SleepingJudge()
    code, printed, _, judge = run_eval(monkeypatch, tmp_path, "--threads", "4", judge=judge)
    assert code == 0, printed[-500:]
    stamps = sorted(judge.timestamps)
    assert len(stamps) >= 4
    # In a serial run the first four calls start ~SLEEP apart. Overlapped, at
    # least two of the first four calls start within half a sleep of each other.
    gaps = [b - a for a, b in zip(stamps, stamps[1:])]
    assert min(gaps[:3]) < SLEEP / 2, \
        f"the judge calls did not overlap: the first gaps are {[round(g, 3) for g in gaps[:3]]}s"


# ---- Item 4: calls.jsonl stays safe under concurrency --------------------------


def test_calls_jsonl_holds_one_clean_row_per_call_at_four_threads(monkeypatch, tmp_path):
    world = write_multi_stop_world(tmp_path)
    manifest_path, labels_path, real_dir, parts = world
    log_dir = tmp_path / "logs"
    lm = Always(propose([], status="continuing", needs_human=False, priority="P3"))
    monkeypatch.setattr(require("priority.interpreter"), "interpreter_lm", lambda *a, **k: lm)
    install_judge(monkeypatch, SleepingJudge())
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out):
        code = main(["eval", "--split", "train", "--manifest", str(manifest_path),
                     "--labels", str(labels_path), "--real-dir", str(real_dir),
                     "--log-dir", str(log_dir), "--threads", "4"])
    assert code == 0, out.getvalue()[-500:]
    rows = [line for line in (log_dir / "calls.jsonl").read_text().splitlines() if line.strip()]
    expected = len(manifest_order(manifest_path, parts))
    assert len(rows) == expected, f"calls.jsonl holds {len(rows)} rows, not {expected}"
    parsed = [json.loads(line) for line in rows]  # a torn write would fail the parse here
    assert all(row.get("stage") == "propose" for row in parsed)
    assert all(isinstance(row.get("rendered_input"), str) and row["rendered_input"] for row in parsed)


# ---- Item 2 (abstain): a brief that abstains never calls the model -------------


def abstaining_world(tmp_path: Path):
    """A made-up world whose transcripts yield no brief, so every stop abstains."""
    manifest = [{"session": sid, "stops_in_session": 1, "stops": [1], "skipped": []}
                for sid in SESSION_IDS[:8]]
    labels = make_labels(session_ids=SESSION_IDS[:8], stops_per=1)
    for per_session in labels["sessions"].values():
        for label in per_session["stops"].values():
            label["payloads"] = []
    manifest_path = tmp_path / "set-manifest.json"
    labels_path = tmp_path / "labels-confirmed.json"
    real_dir = tmp_path / "real"
    real_dir.mkdir(exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    labels_path.write_text(json.dumps(labels, indent=2) + "\n")
    for sid in SESSION_IDS[:8]:
        (real_dir / f"{sid}.jsonl").write_text("")  # no records, so build_brief abstains
    from priority.evaluation.split import split

    return manifest_path, labels_path, real_dir, split([*SESSION_IDS[:8]])


def test_a_brief_that_abstains_never_calls_the_model_at_four_threads(monkeypatch, tmp_path):
    world = abstaining_world(tmp_path)
    manifest_path, labels_path, real_dir, parts = world
    lm = Always(propose([], status="continuing", needs_human=False, priority="P3"))
    monkeypatch.setattr(require("priority.interpreter"), "interpreter_lm", lambda *a, **k: lm)
    judge = install_judge(monkeypatch, SleepingJudge())
    from priority.cli import main

    log_dir = tmp_path / "logs"
    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out):
        code = main(["eval", "--split", "train", "--manifest", str(manifest_path),
                     "--labels", str(labels_path), "--real-dir", str(real_dir),
                     "--log-dir", str(log_dir), "--threads", "4"])
    printed = out.getvalue()
    assert code == 0, printed[-500:]
    assert len(lm.history) == 0, f"an abstaining brief made {len(lm.history)} model calls"
    assert not (log_dir / "calls.jsonl").exists() or not (log_dir / "calls.jsonl").read_text().strip(), \
        "an abstaining brief wrote a call row"
    judge_api = require("priority.evaluation.judge")
    # The judge still grades the abstained prediction, once per row, but the
    # stub never touches the model, and the interpreter model saw no call.
    assert judge_api.USAGE["calls"] == len(scored_order(printed))


def test_threads_one_keeps_the_abstain_behaviour(monkeypatch, tmp_path):
    world = abstaining_world(tmp_path)
    manifest_path, labels_path, real_dir, parts = world
    lm = Always(propose([], status="continuing", needs_human=False, priority="P3"))
    monkeypatch.setattr(require("priority.interpreter"), "interpreter_lm", lambda *a, **k: lm)
    install_judge(monkeypatch, SleepingJudge())
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out):
        code = main(["eval", "--split", "train", "--manifest", str(manifest_path),
                     "--labels", str(labels_path), "--real-dir", str(real_dir),
                     "--log-dir", str(tmp_path / "logs"), "--threads", "1"])
    assert code == 0, out.getvalue()[-500:]
    assert len(lm.history) == 0, "threads=1 let an abstaining brief call the model"
