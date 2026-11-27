"""Helpers for the slice 21 eval, demo, and GEPA tests (RED role). No helper makes a model call.

The crate world holds ten made-up one-stop sessions. Each session has its own
transcript, so each stop brief is a different text with a different length.
The session ids hold letters only, so a printed number is never part of an id.
"""
from __future__ import annotations

import contextlib
import io
import json
import re

from brief_support import simple
from fixtures_support import CONFIRMED_BY, CONFIRMED_ON, make_label, require
from interpret_support import Always, dspy, propose
from judge_ref_support import JudgeRecorder, ask_step, install_judge, reply_step

NAMES = ("alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliet")
SESSIONS = tuple(f"crate-world-{name}" for name in NAMES)
SNOOZE = {"kind": "snooze", "until_event": "turn_end"}
# (template label, reference payloads, priority) for the session at each index modulo 5
SHAPES = ((1, [ask_step()], "P1"), (4, [reply_step()], "P2"), (3, [], "P3"),
          (2, [{"kind": "continue"}], "P3"), (5, [SNOOZE, {"kind": "continue"}], "P2"))


class World:
    """The paths, labels, briefs, and split parts of one crate world."""

    def __init__(self, tmp_path):
        from priority.evaluation.split import split

        self.real_dir = tmp_path / "real"
        self.real_dir.mkdir(exist_ok=True)
        self.labels: dict[str, dict] = {}
        for index, (session, name) in enumerate(zip(SESSIONS, NAMES)):
            template, payloads, priority = SHAPES[index % len(SHAPES)]
            self.labels[session] = make_label(template, payloads=payloads, priority=priority)
            final = f"Session {name} is waiting. " + "The crates are sorted. " * (index + 1) + "Which shelf next?"
            simple(self.real_dir / f"{session}.jsonl", ask=f"Sort the {name} crates.", final=final)
        self.manifest = tmp_path / "set-manifest.json"
        self.manifest.write_text(json.dumps([{"session": s, "stops_in_session": 1, "stops": [1], "skipped": []}
                                             for s in SESSIONS], indent=2) + "\n")
        self.labels_path = tmp_path / "labels-confirmed.json"
        self.labels_path.write_text(json.dumps({"confirmed_by": CONFIRMED_BY, "confirmed_on": CONFIRMED_ON,
                                                "sessions": {s: {"stops": {"001": label}}
                                                             for s, label in self.labels.items()}}, indent=2))
        self.parts = split(list(SESSIONS))
        self.briefs = {s: require("priority.brief").build_brief(self.real_dir / f"{s}.jsonl", stop=1).for_model()
                       for s in SESSIONS}

    def args(self) -> list[str]:
        return ["--manifest", str(self.manifest), "--labels", str(self.labels_path), "--real-dir", str(self.real_dir)]

    def demo(self, session: str) -> dict:
        """The demo of one stop: its brief in, its full reference out."""
        label = self.labels[session]
        return {"session_id": session, "stop": "001", "brief_text": self.briefs[session], "status": label["status"],
                "needs_human": label["needs_human"], "steps": label["payloads"], "priority": label["priority"]}


def propose_of(program):
    """The one predictor of a program, or an assertion failure."""
    named = dict(program.named_predictors())
    assert "propose" in named, f"the program has no propose predictor: {sorted(named)}"
    return named["propose"]


def save_program_with_demos(path, demos: list[dict]):
    """Save a real Interpreter whose propose predictor holds the given demos."""
    program = require("priority.interpreter").Interpreter(lm=None)
    propose_of(program).demos = [dspy.Example(**demo) for demo in demos]
    program.save(str(path))
    return path


def field(demo, name):
    """One field of a demo. A loaded program may hold a demo as a dict or as an Example."""
    return demo.get(name) if isinstance(demo, dict) else getattr(demo, name, None)


def run_cli(monkeypatch, argv: list[str], lm=None, judge=None) -> tuple:
    """Run the priority CLI in process with a stub model and a stub judge. Return the code and the text."""
    interpreter = require("priority.interpreter")
    stub = lm if lm is not None else Always(propose([], status="continuing", needs_human=False, priority="P3"))
    monkeypatch.setattr(interpreter, "interpreter_lm", lambda *a, **k: stub)
    install_judge(monkeypatch, judge if judge is not None else JudgeRecorder(0.5))
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out):
        code = main(argv)
    return code, out.getvalue()


def scored_sessions(printed: str) -> set[str]:
    """The sessions of the per-stop score lines."""
    return set(re.findall(r"^score stop session=(\S+) ", printed, re.M))


def count_line(printed: str, word: str, count: int) -> list[str]:
    """The printed lines that name the word and hold the count as a number, outside any path."""
    found = []
    for line in printed.splitlines():
        text = " ".join(part for part in line.split() if "/" not in part)
        if word in text.lower() and count in (int(n) for n in re.findall(r"\d+", text)):
            found.append(line)
    return found
