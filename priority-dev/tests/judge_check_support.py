"""Helpers for the slice 20 RED tests of `priority judge-check`.

The world is made up: a pairs file, a confirmed labels file with reference
payloads, and one copied made-up transcript per session. Each pair names
stop 1, the only stop of the made-up transcript that builds a StopBrief.
The grading judge is a stub, so no helper makes a model call.
"""
from __future__ import annotations

import contextlib
import io
import json
import shutil
from collections import Counter

from fixtures_support import CONFIRMED_BY, CONFIRMED_ON, make_label
from judge_ref_support import ask_step, as_json, install_judge
from probe_support import FIXTURES

TRANSCRIPT = FIXTURES / "waiting-question.jsonl"
PAIR_REFERENCE = [{"kind": "reply", "text": "The reference answer for the made-up stop."}]
PROBE_REFERENCES = (ask_step(options=True), ask_step(options=False))
MULTI = (0, "detail", "questions", 0, "multi_select")
ROLE = (0, "detail", "role")
LABEL = (0, "detail", "questions", 0, "options", 0, "label")


def pair(index: int, a: float | str, b: float | str, human: str | None) -> dict:
    """One made-up pair. A float side is a graded reply. "flaky" flips each call."""
    def side(name, grade):
        text = "flaky" if grade == "flaky" else f"grade {grade} pair-{index}-{name}"
        return [{"kind": "reply", "text": text}]
    return {"session": f"judge-check-pair-{index:02d}", "stop": 1,
            "a": side("a", a), "b": side("b", b), "human": human}


def agreeing(count: int, start: int = 0) -> list:
    """Pairs where the judge direction matches the human pick."""
    return [pair(start + i, 0.9, 0.2, "a") if i % 2 == 0 else pair(start + i, 0.1, 0.8, "b")
            for i in range(count)]


class GradingJudge:
    """A stub judge. A graded reply scores its grade. A flaky reply scores 0.9,
    then 0.1. Any other payload scores 1.0 against itself and 0.4 against a
    different reference, or 1.0 always when the judge is probe-blind."""

    def __init__(self, probe_blind: bool = False):
        self.probe_blind, self.calls, self.seen = probe_blind, [], Counter()

    def __call__(self, brief_text, predicted, expected):
        self.calls.append({"brief_text": brief_text, "predicted": predicted, "expected": expected})
        key = as_json(predicted)
        self.seen[key] += 1
        first = predicted[0] if isinstance(predicted, list) and predicted else {}
        text = str(first.get("text", "")) if isinstance(first, dict) else ""
        if text.startswith("grade "):
            return (float(text.split()[1]), ["graded reply"])
        if text == "flaky":
            return (0.9 if self.seen[key] % 2 == 1 else 0.1, ["flaky reply"])
        if self.probe_blind or predicted == expected:
            return (1.0, ["the payload matches the reference"])
        return (0.4, ["a closed field differs"])


def write_world(tmp_path, pairs: list) -> tuple:
    """Write the pairs file, the labels file, and the transcripts. Return the paths."""
    sessions = {entry["session"]: {"stops": {"001": make_label(2, payloads=PAIR_REFERENCE)}}
                for entry in pairs}
    for index, reference in enumerate(PROBE_REFERENCES):
        sessions[f"judge-check-probe-{index:02d}"] = {"stops": {"001": make_label(1, payloads=[reference])}}
    real_dir = tmp_path / "real"
    real_dir.mkdir(exist_ok=True)
    for session_id in sessions:
        shutil.copy(TRANSCRIPT, real_dir / f"{session_id}.jsonl")
    labels_path = tmp_path / "labels-confirmed.json"
    labels_path.write_text(json.dumps({"confirmed_by": CONFIRMED_BY, "confirmed_on": CONFIRMED_ON,
                                       "sessions": sessions}, indent=2) + "\n")
    pairs_path = tmp_path / "pairs.json"
    pairs_path.write_text(json.dumps(pairs, indent=2) + "\n")
    return pairs_path, labels_path, real_dir


def run_check(monkeypatch, tmp_path, pairs: list, judge: GradingJudge, extra=()) -> tuple:
    """Run `priority judge-check` in process. Return the exit code and the printed text.

    Before GREEN, argparse rejects the unknown subcommand with SystemExit, so
    the code stays None and the caller fails on its assertion.
    """
    install_judge(monkeypatch, judge)
    pairs_path, labels_path, real_dir = write_world(tmp_path, pairs)
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out), \
            contextlib.redirect_stderr(io.StringIO()):
        code = main(["judge-check", "--pairs", str(pairs_path), "--labels", str(labels_path),
                     "--real-dir", str(real_dir), *extra])
    return code, out.getvalue()


def leaves(value, path=()):
    """Each leaf of a JSON value with its path."""
    if isinstance(value, dict):
        for key, item in value.items():
            yield from leaves(item, path + (key,))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            yield from leaves(item, path + (index,))
    else:
        yield path, value


def diff_paths(first, second) -> set:
    """The leaf paths where two JSON values differ."""
    left, right = dict(leaves(first)), dict(leaves(second))
    return {path for path in left.keys() | right.keys()
            if left.get(path, "<absent>") != right.get(path, "<absent>")}
