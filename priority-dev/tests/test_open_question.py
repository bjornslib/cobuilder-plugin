"""Slice 3 RED: `priority interpret --open-question` (E2, priority-ask-question).

The flag reads a JSON list of questions in the AskUserQuestion input shape. With the list, the
brief gets an OPEN QUESTION section, and the stop is `stop_kind: question`. Without it, the brief
text equals the stored snapshot, and the stop is `turn_end`. A file that is not such a list ends
the command with a one-line message on stderr and makes no model call. No test here makes a live
model call.
"""
from __future__ import annotations

import inspect
import json
from pathlib import Path

import pytest

from brief_support import FIXTURES, SNAPSHOTS, brief_api, build, require
from interpret_support import dummy, interpreter_api, no_live_call, propose, step  # noqa: F401

TRANSCRIPT = FIXTURES / "brief-plain.jsonl"  # the transcript of the stored snapshot
SNAPSHOT = SNAPSHOTS / "brief-plain.txt"
STOP_TRANSCRIPT = FIXTURES / "waiting-question.jsonl"  # a transcript that reaches the model

QUESTIONS = [
    {
        "question": "Which retry style should the upload helper use?",
        "header": "Retry",
        "multiSelect": False,
        "options": [
            {"label": "Use a fixed delay", "description": "Wait the same time before each try."},
            {"label": "Use exponential backoff", "description": "Double the wait before each try."},
        ],
    },
    {
        "question": "Which log lines should the helper keep?",
        "options": [{"label": "Keep error lines"}, {"label": "Keep every line"}],
        "multiSelect": True,
    },
]

BAD_FILES = {
    "not-json": '[{"question": ',
    "not-a-list": json.dumps({"question": "Which retry style?", "options": [{"label": "fixed"}]}),
    "item-not-an-object": json.dumps(["Which retry style?"]),
    "no-options-key": json.dumps([{"question": "Which retry style?"}]),
    "empty-options": json.dumps([{"question": "Which retry style?", "options": []}]),
    "no-question-text": json.dumps([{"options": [{"label": "fixed"}]}]),
}


def write_questions(path: Path, questions) -> Path:
    path.write_text(json.dumps(questions))
    return path


def build_with_questions(path: Path, questions):
    """Build the brief with the open questions. Fail on an assertion if build_brief takes no such argument."""
    build_brief = brief_api().build_brief
    assert "open_questions" in inspect.signature(build_brief).parameters, \
        "build_brief takes no open_questions argument yet"
    return build_brief(path, open_questions=questions)


def run_cli(cli, argv, capsys):
    """Run the CLI. Return the exit code with the printed stdout and stderr."""
    try:
        code = cli.main(argv)
    except SystemExit as exc:
        code = exc.code
    captured = capsys.readouterr()
    return code, captured.out, captured.err


def refuse_model(monkeypatch) -> list[str]:
    """Stub the model factory and the Interpreter so that a call is recorded and fails. Return the record."""
    api = interpreter_api()
    calls: list[str] = []

    def refuse(*args, **kwargs):
        calls.append("model")
        raise AssertionError("a model call was made")

    monkeypatch.setattr(api, "interpreter_lm", refuse)
    monkeypatch.setattr(api, "Interpreter", refuse)
    return calls


def use_model(monkeypatch):
    """Stub the model with a DummyLM that returns one fixed reading. Return the DummyLM."""
    lm = dummy([propose([step("pick_option")], priority="P1")])
    monkeypatch.setattr(interpreter_api(), "interpreter_lm", lambda *a, **k: lm)
    return lm


# ---- 1. build_brief with open questions -------------------------------------

def test_open_questions_set_the_stop_kind_to_question():
    brief = build_with_questions(TRANSCRIPT, QUESTIONS)
    assert getattr(brief, "stop_kind", None) == "question", \
        f"stop_kind is {getattr(brief, 'stop_kind', None)!r}, want 'question'"


def test_open_question_section_holds_each_question_and_option_label():
    brief = build_with_questions(TRANSCRIPT, QUESTIONS)
    text = brief.for_model()
    assert "OPEN QUESTION" in text, "for_model() has no OPEN QUESTION section"
    section = text[text.index("OPEN QUESTION"):]
    for item in QUESTIONS:
        assert item["question"] in section, f"the section misses the question {item['question']!r}"
        for option in item["options"]:
            assert option["label"] in section, f"the section misses the option label {option['label']!r}"


# ---- 2. build_brief without open questions ----------------------------------

def test_no_open_questions_gives_the_turn_end_stop_kind():
    brief = build(TRANSCRIPT)
    assert getattr(brief, "stop_kind", None) == "turn_end", \
        f"stop_kind is {getattr(brief, 'stop_kind', None)!r}, want 'turn_end'"


def test_no_open_questions_keeps_the_stored_snapshot():
    brief = build(TRANSCRIPT)
    assert brief.for_model().strip() == SNAPSHOT.read_text().strip()


# ---- 3. The interpret parser ------------------------------------------------

def test_the_interpret_parser_takes_open_question(monkeypatch, capsys, tmp_path):
    cli = require("priority.cli")
    path = write_questions(tmp_path / "q.json", QUESTIONS)
    passed: list = []

    def stub_interpret(*args, **kwargs):
        passed.extend([*args, *kwargs.values()])
        return 0

    monkeypatch.setattr(cli, "interpret", stub_interpret)
    code, _, err = run_cli(cli, ["interpret", str(STOP_TRANSCRIPT), "--open-question", str(path)], capsys)
    assert passed, f"interpret did not run: exit {code!r}, stderr {err!r}"
    assert any(str(value) == str(path) for value in passed), f"interpret got {passed!r}, not the question file"


# ---- 4. A bad question file -------------------------------------------------

@pytest.mark.parametrize("name", sorted(BAD_FILES))
def test_a_bad_question_file_ends_with_one_line_and_no_model_call(name, monkeypatch, capsys, tmp_path):
    cli = require("priority.cli")
    path = tmp_path / "q.json"
    path.write_text(BAD_FILES[name])
    calls = refuse_model(monkeypatch)
    code, _, err = run_cli(cli, ["interpret", str(STOP_TRANSCRIPT), "--open-question", str(path)], capsys)
    assert code != 0, f"exit code is {code!r}, want non-zero"
    lines = [line for line in err.splitlines() if line.strip()]
    assert len(lines) == 1, f"stderr has {len(lines)} lines, want one: {err!r}"
    assert calls == [], "a bad question file reached the model"


# ---- 5. The printed reading -------------------------------------------------

def test_the_printed_reading_is_a_question_with_the_flag(monkeypatch, capsys, tmp_path):
    cli = require("priority.cli")
    lm = use_model(monkeypatch)
    path = write_questions(tmp_path / "q.json", QUESTIONS)
    code, out, err = run_cli(cli, ["interpret", str(STOP_TRANSCRIPT), "--open-question", str(path)], capsys)
    assert code == 0, f"exit code is {code!r}, stderr {err!r}"
    data = json.loads(out)
    assert data.get("stop_kind") == "question", f"the reading has stop_kind {data.get('stop_kind')!r}"
    assert any(QUESTIONS[0]["question"] in str(entry) for entry in lm.history), \
        "the model did not read the open question"


def test_the_printed_reading_is_turn_end_without_the_flag(monkeypatch, capsys):
    cli = require("priority.cli")
    use_model(monkeypatch)
    code, out, err = run_cli(cli, ["interpret", str(STOP_TRANSCRIPT)], capsys)
    assert code == 0, f"exit code is {code!r}, stderr {err!r}"
    data = json.loads(out)
    assert data.get("stop_kind") == "turn_end", f"the reading has stop_kind {data.get('stop_kind')!r}"
