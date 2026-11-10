"""RED: `priority interpret --program P` loads a saved program before the one model call.

The load follows `eval --program`: the Interpreter loads the saved file, so the propose instruction the
model receives is the saved one. Without the option the default instruction is used. A missing path
exits 1, names the path, and makes no model call. `digest` does not take the option.
No test makes a live model call: each uses the DummyLM from interpret_support.
"""
from __future__ import annotations

import json
from brief_support import require
from interpret_support import DONE, TRANSCRIPT, dummy, interpreter_api, propose  # noqa: F401
from propose_support import propose_of

MARKER = "SAVED-PROGRAM-MARKER-7f3a: read the stop and propose the steps."


def write_program(path):
    """Save a real Interpreter whose propose instruction holds the marker."""
    program = interpreter_api().Interpreter(lm=None)
    predictor = propose_of(program)
    predictor.signature = predictor.signature.with_instructions(MARKER)
    program.save(str(path))
    return path


def run_cli(monkeypatch, capsys, lm, *args):
    """Run `priority interpret TRANSCRIPT ARGS` in process with a stub model. Return the exit code and output."""
    api = interpreter_api()
    cli = require("priority.cli")
    monkeypatch.setattr(api, "interpreter_lm", lambda *a, **k: lm)
    monkeypatch.setattr(cli, "interpreter_lm", lambda *a, **k: lm, raising=False)
    try:
        code = cli.main(["interpret", str(TRANSCRIPT), *args])
    except SystemExit as exc:
        code = exc.code
    return code, capsys.readouterr()


def prompts_sent(lm) -> str:
    """Every message that the stub model received, as one text."""
    return json.dumps(lm.history, default=str)


def test_the_saved_instruction_reaches_the_model(monkeypatch, capsys, tmp_path):
    program = write_program(tmp_path / "saved.json")
    lm = dummy([propose()])
    code, _ = run_cli(monkeypatch, capsys, lm, "--program", str(program))
    assert code == 0
    assert len(lm.history) == 1, "the model was not called once"
    assert MARKER in prompts_sent(lm), "the model did not receive the saved instruction"


def test_without_the_option_the_saved_instruction_does_not_reach_the_model(monkeypatch, capsys, tmp_path):
    write_program(tmp_path / "saved.json")
    lm = dummy([propose()])
    code, _ = run_cli(monkeypatch, capsys, lm)
    assert code == 0
    assert len(lm.history) == 1, "the model was not called once"
    assert MARKER not in prompts_sent(lm), "the model received a saved instruction without --program"


def test_a_missing_program_path_exits_one_and_never_calls_the_model(monkeypatch, capsys, tmp_path):
    missing = tmp_path / "no-such-program.json"
    lm = dummy([propose()])
    code, captured = run_cli(monkeypatch, capsys, lm, "--program", str(missing))
    assert code == 1, f"exit code {code}, expected 1"
    assert str(missing) in captured.out + captured.err, "the error does not name the missing path"
    assert lm.history == [], "the model was called for a missing program"


def test_digest_does_not_take_the_program_option(monkeypatch, tmp_path):
    program = write_program(tmp_path / "saved.json")
    cli = require("priority.cli")
    monkeypatch.setattr(interpreter_api(), "digest_lm", lambda *a, **k: dummy([DONE]))
    try:
        code = cli.main(["digest", str(TRANSCRIPT), "--program", str(program)])
    except SystemExit as exc:
        code = exc.code
    assert code == 2, f"digest accepted --program (exit {code}); the option belongs to interpret only"
