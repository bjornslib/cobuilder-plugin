"""Helpers for the progress, checkpoint, and resume tests of `priority judge-check`.

The world is the one of `judge_check_support`: six pairs (five that the judge
scores as the human picked, and one tie). The probe covers the six pair stops.
Each stop has a plain reply reference, so it gets two copies (the priority
and the step kind). With `--repeats 2` the full run makes 42 judge calls:
24 for the pairs, then 3 for each of the six probe stops (one base call and
two copies). The clock is injected as the module attribute
`priority.evaluation.judge_check.clock`, a function with no argument that
returns seconds. The spy judge moves the fake clock, so a call of known length
takes a known time, and the tests do not depend on how often the code reads it.
"""
from __future__ import annotations

import contextlib
import io
import json
import re
from pathlib import Path
from typing import NamedTuple

from fixtures_support import require
from judge_check_support import GradingJudge, agreeing, pair, write_world
from judge_ref_support import install_judge

PAIR_LINE = re.compile(r"^pair (\d+)/(\d+) side ([ab]) repeat (\d+)/(\d+) done (\d+\.\d)s$")
PROBE_LINE = re.compile(r"^probe .* done (\d+\.\d)s$")
BARS = ("human agreement:", "closed-field probe:", "repeat flips:", "agreement bar:")
PAIRS = agreeing(5) + [pair(5, 0.5, 0.5, "a")]
PAIR_CALLS, ALL_CALLS = 24, 42


def call_seconds(number: int) -> float:
    """The made-up length of judge call `number` (from 1). Exact in binary, so it prints exactly."""
    return 10.0 + 0.5 * number


class Clock:
    """A fake clock that only the spy judge moves."""

    def __init__(self):
        self.now = 0.0

    def __call__(self) -> float:
        return self.now


class SpyJudge(GradingJudge):
    """The grading judge, plus a clock it moves, a spy that runs at the start of each call, and a kill call."""

    def __init__(self, clock: Clock | None = None, spy=None, kill_at: int | None = None):
        super().__init__()
        self.clock, self.spy, self.kill_at = clock, spy, kill_at

    def __call__(self, brief_text, predicted, expected):
        number = len(self.calls) + 1
        if self.spy:
            self.spy(number)
        if number == self.kill_at:
            raise KeyboardInterrupt
        result = super().__call__(brief_text, predicted, expected)
        if self.clock:
            self.clock.now += call_seconds(number)
        return result


class FlushedOut(io.StringIO):
    """A stdout that keeps the text of the last flush apart from the text written."""

    flushed = ""

    def flush(self):
        self.flushed = self.getvalue()
        super().flush()


class Result(NamedTuple):
    code: object
    text: str
    err: str


def run_cli(monkeypatch, tmp_path, pairs: list, judge, extra=(), clock=None, out=None) -> Result:
    """Run `priority judge-check` in process. A KeyboardInterrupt of the judge goes out to the test."""
    install_judge(monkeypatch, judge)
    if clock is not None:
        monkeypatch.setattr(require("priority.evaluation.judge_check"), "clock", clock, raising=False)
    pairs_path, labels_path, real_dir = write_world(tmp_path, pairs)
    from priority.cli import main

    out, err, code = out or FlushedOut(), io.StringIO(), None
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        try:
            code = main(["judge-check", "--pairs", str(pairs_path), "--labels", str(labels_path),
                         "--real-dir", str(real_dir), *extra])
        except SystemExit as stop:
            code = stop.code
    return Result(code, out.getvalue(), err.getvalue())


def progress(text: str) -> list:
    """The progress lines of a printed text."""
    return [line for line in text.splitlines() if line.startswith(("pair ", "probe "))]


def report(text: str) -> list:
    """The three bar lines and the verdict line of a printed text."""
    return [line for line in text.splitlines() if line.startswith(BARS)]


def warnings(result: Result) -> list:
    """The lines of either stream that name a warning."""
    return [line for line in (result.text + result.err).splitlines() if "warning" in line.lower()]


def read_rows(path: Path) -> list:
    """The JSONL rows of a checkpoint file, or none when the file does not exist."""
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def write_rows(path: Path, rows: list) -> None:
    """Replace a checkpoint file with these rows."""
    path.write_text("".join(json.dumps(row) + "\n" for row in rows))


def pair_number(call: dict) -> int | None:
    """The pair number (from 0) that a recorded judge call scored, or None for a probe call."""
    text = str(call["predicted"].get("steps", [{}])[0].get("text", ""))
    return int(text.split("pair-")[1].split("-")[0]) if "pair-" in text else None
