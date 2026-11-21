"""The retry of the digest command (RED role). No test makes a live model call.

- `priority digest` runs `DigestRun` again when it gives the Abstain `invalid_output` or `model_error`. It
  makes up to 3 attempts in all, and it prints the first RunDigest. After 3 failed attempts it prints the
  last Abstain.
- An Abstain `no_agent_reply` or `brief_too_large` is final. The command makes one attempt.
- `DigestRun.forward` still makes one model call for each call.
"""
from __future__ import annotations

import json

import pytest

from brief_support import FIXTURES, require
from digest_support import DIGEST, FailingLM, RateLimited, digest_api, digest_reply, dummy, interpreter_api, make_digest

WAITING = FIXTURES / "waiting-question.jsonl"


def abstain(reason: str, detail: str = "x"):
    return digest_api().Abstain(reason=reason, detail=detail)


class Script:
    """A stand-in for DigestRun. Each call returns the next result of the script, and the Script counts calls."""

    def __init__(self, results):
        self.results, self.calls = list(results), 0

    def __call__(self, *args, **kwargs):
        script = self

        class Run:
            def __call__(self, brief):
                script.calls += 1
                return script.results.pop(0)

        return Run()


PAUSES: list[float] = []


def run_cli(monkeypatch, capsys, run=None, lm=None):
    interpreter, cli = interpreter_api(), require("priority.cli")
    model = lm or dummy([])
    PAUSES.clear()
    monkeypatch.setattr(cli.time, "sleep", PAUSES.append)
    monkeypatch.setattr(interpreter, "digest_lm", lambda *a, **k: model)
    monkeypatch.setattr(cli, "digest_lm", lambda *a, **k: model, raising=False)
    if run is not None:
        monkeypatch.setattr(interpreter, "DigestRun", run)
    code = cli.main(["digest", str(WAITING)])
    return code, json.loads(capsys.readouterr().out)


@pytest.mark.parametrize("reason", ["invalid_output", "model_error"])
def test_a_failed_attempt_is_tried_again_and_the_first_run_digest_prints(monkeypatch, capsys, reason):
    run = Script([abstain(reason), make_digest(ran="Second attempt."), make_digest(ran="Third attempt.")])
    code, data = run_cli(monkeypatch, capsys, run)
    assert code == 0
    assert run.calls == 2, f"the command made {run.calls} attempts, not 2"
    assert data["ran"] == "Second attempt."


def test_the_third_attempt_may_succeed(monkeypatch, capsys):
    run = Script([abstain("invalid_output"), abstain("model_error"), make_digest()])
    _, data = run_cli(monkeypatch, capsys, run)
    assert run.calls == 3, f"the command made {run.calls} attempts, not 3"
    assert data.get("ran") == DIGEST["ran"]


def test_three_failed_attempts_print_the_last_abstain(monkeypatch, capsys):
    run = Script([abstain("invalid_output", "first"), abstain("model_error", "second"),
                  abstain("invalid_output", "third"), make_digest()])
    code, data = run_cli(monkeypatch, capsys, run)
    assert code == 0
    assert run.calls == 3, f"the command made {run.calls} attempts, not 3"
    assert data == {"reason": "invalid_output", "detail": "third"}
    assert PAUSES == [2, 4], f"the pauses between attempts were {PAUSES}"


def test_a_first_attempt_that_succeeds_makes_no_pause(monkeypatch, capsys):
    run_cli(monkeypatch, capsys, Script([make_digest()]))
    assert PAUSES == []


def test_a_run_digest_at_the_first_attempt_is_the_only_attempt(monkeypatch, capsys):
    run = Script([make_digest(), make_digest(ran="never")])
    _, data = run_cli(monkeypatch, capsys, run)
    assert run.calls == 1 and data["ran"] == DIGEST["ran"]


@pytest.mark.parametrize("reason", ["no_agent_reply", "brief_too_large"])
def test_a_final_abstain_is_not_tried_again(monkeypatch, capsys, reason):
    run = Script([abstain(reason, "final"), make_digest()])
    _, data = run_cli(monkeypatch, capsys, run)
    assert run.calls == 1
    assert data == {"reason": reason, "detail": "final"}


def test_the_real_run_retries_a_bad_reply_with_one_model_call_each(monkeypatch, capsys):
    lm = dummy([{"digest": "this is not JSON"}, {"digest": "still not JSON"}, digest_reply(), digest_reply(ran="no")])
    _, data = run_cli(monkeypatch, capsys, lm=lm)
    assert len(lm.history) == 3, f"the model got {len(lm.history)} calls, not 3"
    assert data.get("ran") == DIGEST["ran"]


def test_the_real_run_stops_after_three_bad_replies(monkeypatch, capsys):
    lm = dummy([{"digest": "bad 1"}, {"digest": "bad 2"}, {"digest": "bad 3"}, digest_reply()])
    _, data = run_cli(monkeypatch, capsys, lm=lm)
    assert len(lm.history) == 3, f"the model got {len(lm.history)} calls, not 3"
    assert data["reason"] == "invalid_output"


def test_the_real_run_retries_a_model_error(monkeypatch, capsys):
    lm = FailingLM([digest_reply()], RateLimited("429 Too Many Requests"), fail_at=1)
    _, data = run_cli(monkeypatch, capsys, lm=lm)
    assert lm.count == 2, f"the model got {lm.count} calls, not 2"
    assert data.get("ran") == DIGEST["ran"]
