"""Helpers for the tests of `priority judge-check`, on payload objects.

The world is made up: a pairs file, a confirmed labels file with reference
payloads and a priority on each stop, and one copied made-up transcript per
session. Each pair names stop 1, the only stop of the made-up transcript that
"steps"}. The probe covers the stops of the pairs, so the reference of a
pair stop is also the reference of its probe copies. By default that
reference is one reply step with the priority P3, which gets two copies (the
priority and the step kind). A test that needs another reference passes
`references`: a map from the pair session to its `(priority, steps)`. The
grading judge is a stub, so no helper makes a model call.
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
PAIR_STEPS = [{"kind": "reply", "text": "The reference answer for the made-up stop."}]
PAIR_PRIORITY = "P3"
PROBE_PRIORITY = "P1"
# Pair 0 gets an ask_human reference with option labels (four copies), pair 1 one without (three copies).
PROBE_REFERENCES = {"judge-check-pair-00": (PROBE_PRIORITY, [ask_step(options=True)]),
                    "judge-check-pair-01": (PROBE_PRIORITY, [ask_step(options=False)])}
MULTI = ("steps", 0, "detail", "questions", 0, "multi_select")
ROLE = ("steps", 0, "detail", "role")
LABEL = ("steps", 0, "detail", "questions", 0, "options", 0, "label")
PRIORITY = ("priority",)


def pair(index: int, a: float | str, b: float | str, human: str | None) -> dict:
    """One made-up pair. A float side is a graded reply. "flaky" flips each call."""
    def side(name, grade):
        text = "flaky" if grade == "flaky" else f"grade {grade} pair-{index}-{name}"
        return {"priority": "P2", "steps": [{"kind": "reply", "text": text}]}
    return {"session": f"judge-check-pair-{index:02d}", "stop": 1,
            "a": side("a", a), "b": side("b", b), "human": human}


def agreeing(count: int, start: int = 0) -> list:
    """Pairs where the judge direction matches the human pick."""
    return [pair(start + i, 0.9, 0.2, "a") if i % 2 == 0 else pair(start + i, 0.1, 0.8, "b")
            for i in range(count)]


def first_text(payload) -> str:
    """The text of the first step of a payload object, or "" for any other shape."""
    steps = payload.get("steps") if isinstance(payload, dict) else None
    first = steps[0] if isinstance(steps, list) and steps else {}
    return str(first.get("text", "")) if isinstance(first, dict) else ""


class GradingJudge:
    """A stub judge. A graded reply scores its grade. A flaky reply scores 0.9,
    then 0.1. Any other payload scores 1.0 against itself and 0.4 against a
    different reference. A probe-blind judge scores 1.0 always, and a
    priority-blind judge does not see a change of the priority alone."""

    def __init__(self, probe_blind: bool = False, priority_blind: bool = False):
        self.probe_blind, self.priority_blind = probe_blind, priority_blind
        self.calls, self.seen = [], Counter()

    def __call__(self, brief_text, predicted, expected):
        self.calls.append({"brief_text": brief_text, "predicted": predicted, "expected": expected})
        key = as_json(predicted)
        self.seen[key] += 1
        text = first_text(predicted)
        if text.startswith("grade "):
            return (float(text.split()[1]), ["graded reply"])
        if text == "flaky":
            return (0.9 if self.seen[key] % 2 == 1 else 0.1, ["flaky reply"])
        if self.probe_blind or predicted == expected or (self.priority_blind and steps_match(predicted, expected)):
            return (1.0, ["the payload matches the reference"])
        return (0.4, ["a closed field differs"])


def steps_match(predicted, expected) -> bool:
    return isinstance(predicted, dict) and isinstance(expected, dict) and predicted.get("steps") == expected.get("steps")


def write_world(tmp_path, pairs: list, references: dict | None = None) -> tuple:
    """Write the pairs file, the labels file, and the transcripts. Return the paths.

    `references` maps a pair session to the `(priority, steps)` of its reference. Other sessions get the default one.
    """
    references = references or {}
    sessions = {}
    for entry in pairs:
        priority, steps = references.get(entry["session"], (PAIR_PRIORITY, PAIR_STEPS))
        sessions[entry["session"]] = {"stops": {"001": make_label(2, payloads=steps, priority=priority)}}
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


def run_check(monkeypatch, tmp_path, pairs: list, judge: GradingJudge, extra=(), references=None) -> tuple:
    """Run `priority judge-check` in process. Return the exit code and the printed text."""
    install_judge(monkeypatch, judge)
    pairs_path, labels_path, real_dir = write_world(tmp_path, pairs, references)
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
