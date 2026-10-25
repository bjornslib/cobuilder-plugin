"""Slice 6 follow-up, the link from a digest to the next stop brief (RED role). Every test uses DummyLM.

The contract that these tests pin:
- `priority digest <transcript> [--stop N] --log-dir DIR` stores the RunDigest as JSON at
  `DIR/digests/<session_id>.json`. The session id is the transcript file stem, the id that `interpret` uses.
  An Abstain stores nothing, and it leaves an earlier stored digest as it was.
- `priority interpret <transcript> ... --log-dir DIR` loads `DIR/digests/<session_id>.json` when it exists
  and passes the RunDigest as `previous` to `build_brief`. The model then receives the `PREVIOUS RUN:` block.
  A digest of another session is never used. A missing, corrupt, or over-limit file gives `previous=None`,
  a log record at INFO or above that names the digest, and an interpretation that still runs.
1. The digest command stores the digest
2. The digest command stores nothing for an Abstain
3. The interpret command loads the digest
4. The interpret command with no usable digest
5. The two-stop flow, and a digest model failure
"""
from __future__ import annotations

import json
import logging

import pytest

from brief_support import FIXTURES, Transcript, require
from digest_support import (DIGEST, FailingLM, RateLimited, digest_api, digest_reply, dummy, interpreter_api,
                            log_reasons, make_digest, no_live_call, read_calls)  # noqa: F401
from interpret_support import DONE

WAITING = FIXTURES / "waiting-question.jsonl"
PREVIOUS = "PREVIOUS RUN:"


# ---- helpers ------------------------------------------------------------------

def run_cli(monkeypatch, capsys, command, lm, transcript, *args):
    """Run `priority <command>` with the model patched in, as the CLI tests of slices 5 and 6 do."""
    interpreter = interpreter_api()
    cli = require("priority.cli")
    monkeypatch.setattr(interpreter, "interpreter_lm", lambda *a, **k: lm)
    monkeypatch.setattr(cli, "interpreter_lm", lambda *a, **k: lm, raising=False)
    monkeypatch.setattr(interpreter, "digest_lm", lambda *a, **k: lm)
    monkeypatch.setattr(cli, "digest_lm", lambda *a, **k: lm, raising=False)
    try:
        code = cli.main([command, str(transcript), *args])
    except SystemExit as exc:
        code = exc.code
    return code, capsys.readouterr().out


def spy_on_build_brief(monkeypatch) -> list:
    """The briefs that the CLI builds, in order."""
    cli = require("priority.cli")
    real = cli.build_brief
    briefs = []

    def recording(*args, **kwargs):
        brief = real(*args, **kwargs)
        briefs.append(brief)
        return brief

    monkeypatch.setattr(cli, "build_brief", recording)
    return briefs


def stored_path(log_dir, session_id: str):
    return log_dir / "digests" / f"{session_id}.json"


def store(log_dir, session_id: str, text: str | None = None):
    """Put a digest file where the link reads it. The default text is a valid RunDigest."""
    path = stored_path(log_dir, session_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(make_digest().model_dump_json() if text is None else text)
    return path


def two_stops(tmp_path, name: str = "two-stops.jsonl"):
    t = Transcript()
    t.human("Do the first thing.")
    t.reply("FIRSTREPLY the first thing is done.")
    t.human("Now do the second thing.")
    t.reply("SECONDREPLY the second thing is done.")
    return t.write(tmp_path / name)


def triage_inputs(log_dir) -> list[str]:
    return [c["rendered_input"] for c in read_calls(log_dir) if c["stage"] == "triage"]


def assert_interpreted(out: str) -> dict:
    data = json.loads(out)
    assert data.get("abstained") is None, f"the interpretation abstained: {data.get('abstained')!r}"
    assert data["facts"]["status"] == "done"
    return data


# ---- 1. The digest command stores the digest -----------------------------------

def test_the_digest_command_stores_the_digest_under_the_session_id(monkeypatch, capsys, tmp_path):
    code, out = run_cli(monkeypatch, capsys, "digest", dummy([digest_reply()]), WAITING, "--log-dir", str(tmp_path))
    assert code == 0
    path = stored_path(tmp_path, WAITING.stem)
    assert path.is_file(), f"no digest was stored at {path}"
    stored = digest_api().RunDigest.model_validate_json(path.read_text())
    assert stored == make_digest()
    assert stored == digest_api().RunDigest.model_validate(json.loads(out))


def test_the_session_id_is_the_file_stem_of_the_transcript(monkeypatch, capsys, tmp_path):
    path = two_stops(tmp_path, "session-7f3a.jsonl")
    run_cli(monkeypatch, capsys, "digest", dummy([digest_reply()]), path, "--stop", "1", "--log-dir",
            str(tmp_path / "log"))
    assert stored_path(tmp_path / "log", "session-7f3a").is_file()


def test_a_new_digest_replaces_the_stored_one(monkeypatch, capsys, tmp_path):
    store(tmp_path, WAITING.stem, make_digest(result="Stop brief 0 was the older one.").model_dump_json())
    run_cli(monkeypatch, capsys, "digest", dummy([digest_reply()]), WAITING, "--log-dir", str(tmp_path))
    stored = digest_api().RunDigest.model_validate_json(stored_path(tmp_path, WAITING.stem).read_text())
    assert stored == make_digest()


# ---- 2. The digest command stores nothing for an Abstain -----------------------

ABSTAINS = {
    "model_error": (lambda: FailingLM([digest_reply()], RateLimited("429 Too Many Requests"), fail_at=1), WAITING),
    "invalid_output": (lambda: dummy([{"digest": "this is not JSON"}]), WAITING),
    "no_agent_reply": (lambda: dummy([digest_reply()]), FIXTURES / "brief-only-synthetic.jsonl"),
}


@pytest.mark.parametrize("reason", ABSTAINS)
def test_an_abstain_stores_nothing(monkeypatch, capsys, tmp_path, reason):
    make_lm, transcript = ABSTAINS[reason]
    code, out = run_cli(monkeypatch, capsys, "digest", make_lm(), transcript, "--log-dir", str(tmp_path))
    assert code == 0
    assert json.loads(out)["reason"] == reason
    path = stored_path(tmp_path, transcript.stem)
    assert not path.exists(), f"an Abstain stored a digest at {path}"


@pytest.mark.parametrize("reason", ABSTAINS)
def test_an_abstain_leaves_the_earlier_stored_digest_untouched(monkeypatch, capsys, tmp_path, reason):
    make_lm, transcript = ABSTAINS[reason]
    earlier = make_digest(result="Stop brief 0 was the older one.").model_dump_json()
    path = store(tmp_path, transcript.stem, earlier)
    code, out = run_cli(monkeypatch, capsys, "digest", make_lm(), transcript, "--log-dir", str(tmp_path))
    assert code == 0
    assert json.loads(out)["reason"] == reason
    assert path.read_text() == earlier


# ---- 3. The interpret command loads the digest ---------------------------------

def test_the_interpret_command_passes_the_stored_digest_as_previous(monkeypatch, capsys, tmp_path):
    store(tmp_path, WAITING.stem)
    briefs = spy_on_build_brief(monkeypatch)
    code, out = run_cli(monkeypatch, capsys, "interpret", dummy([DONE]), WAITING, "--log-dir", str(tmp_path))
    assert code == 0
    assert_interpreted(out)
    assert len(briefs) == 1 and briefs[0].previous == make_digest()


def test_the_model_receives_the_previous_run_block(monkeypatch, capsys, tmp_path):
    store(tmp_path, WAITING.stem)
    code, out = run_cli(monkeypatch, capsys, "interpret", dummy([DONE]), WAITING, "--log-dir", str(tmp_path))
    assert code == 0
    assert_interpreted(out)
    sent = triage_inputs(tmp_path)[0]
    assert PREVIOUS in sent
    assert DIGEST["ran"] in sent and DIGEST["result"] in sent


def test_a_digest_of_another_session_is_never_used(monkeypatch, capsys, tmp_path):
    other = two_stops(tmp_path, "other-session.jsonl")
    run_cli(monkeypatch, capsys, "digest", dummy([digest_reply()]), other, "--stop", "1", "--log-dir",
            str(tmp_path / "log"))
    assert stored_path(tmp_path / "log", "other-session").is_file(), "the digest of the other session is missing"
    briefs = spy_on_build_brief(monkeypatch)
    code, out = run_cli(monkeypatch, capsys, "interpret", dummy([DONE]), WAITING, "--log-dir",
                        str(tmp_path / "log"))
    assert code == 0
    assert_interpreted(out)
    assert briefs[0].previous is None
    assert PREVIOUS not in triage_inputs(tmp_path / "log")[0]


# ---- 4. The interpret command with no usable digest ---------------------------

def test_no_stored_digest_means_no_previous_run_block(monkeypatch, capsys, tmp_path):
    briefs = spy_on_build_brief(monkeypatch)
    code, out = run_cli(monkeypatch, capsys, "interpret", dummy([DONE]), WAITING, "--log-dir", str(tmp_path))
    assert code == 0
    assert_interpreted(out)
    assert briefs[0].previous is None
    assert PREVIOUS not in triage_inputs(tmp_path)[0]


def corrupt_json(path):
    path.write_text("{this is not JSON")


def wrong_shape(path):
    path.write_text('["not", "a", "digest"]')


def over_limit_ran(path):
    path.write_text(json.dumps({**DIGEST, "ran": "x" * 601}))


def over_limit_items(path):
    path.write_text(json.dumps({**DIGEST, "open_items": [f"item {n}" for n in range(6)]}))


def unreadable(path):
    path.mkdir()  # a folder where the file belongs: reading it raises


UNUSABLE = {"corrupt_json": corrupt_json, "wrong_shape": wrong_shape, "over_limit_ran": over_limit_ran,
            "over_limit_items": over_limit_items, "unreadable": unreadable}


@pytest.mark.parametrize("damage", UNUSABLE)
def test_an_unusable_stored_digest_means_no_previous_and_a_logged_reason(monkeypatch, capsys, caplog, tmp_path,
                                                                        damage):
    caplog.set_level(logging.INFO)
    path = stored_path(tmp_path, WAITING.stem)
    path.parent.mkdir(parents=True)
    UNUSABLE[damage](path)
    briefs = spy_on_build_brief(monkeypatch)
    code, out = run_cli(monkeypatch, capsys, "interpret", dummy([DONE]), WAITING, "--log-dir", str(tmp_path))
    assert code == 0
    assert_interpreted(out)
    assert briefs[0].previous is None
    assert PREVIOUS not in triage_inputs(tmp_path)[0]
    assert "digest" in log_reasons(caplog).lower(), "the CLI did not log why it dropped the stored digest"


# ---- 5. The two-stop flow, and a digest model failure --------------------------

def test_digest_stop_1_then_interpret_stop_2_carries_the_digest(monkeypatch, capsys, tmp_path):
    path = two_stops(tmp_path)
    log_dir = tmp_path / "log"
    code, _ = run_cli(monkeypatch, capsys, "digest", dummy([digest_reply()]), path, "--stop", "1", "--log-dir",
                      str(log_dir))
    assert code == 0
    assert stored_path(log_dir, path.stem).is_file(), "the digest of stop 1 was not stored"
    stored = digest_api().RunDigest.model_validate_json(stored_path(log_dir, path.stem).read_text())
    assert stored == make_digest()

    briefs = spy_on_build_brief(monkeypatch)
    code, out = run_cli(monkeypatch, capsys, "interpret", dummy([DONE]), path, "--stop", "2", "--log-dir",
                        str(log_dir))
    assert code == 0
    assert_interpreted(out)
    assert briefs[0].previous == stored
    sent = triage_inputs(log_dir)[0]
    assert PREVIOUS in sent
    assert stored.ran in sent and stored.result in sent
    assert all(text in sent for text in (*stored.open_items, *stored.decisions))
    assert "SECONDREPLY" in sent


def test_a_digest_model_failure_stores_nothing_and_the_next_interpret_still_runs(monkeypatch, capsys, caplog,
                                                                              tmp_path):
    caplog.set_level(logging.INFO)
    path = two_stops(tmp_path)
    log_dir = tmp_path / "log"
    lm = FailingLM([digest_reply()], RateLimited("429 Too Many Requests"), fail_at=1)
    code, out = run_cli(monkeypatch, capsys, "digest", lm, path, "--stop", "1", "--log-dir", str(log_dir))
    assert code == 0
    assert json.loads(out)["reason"] == "model_error"
    assert "model_error" in log_reasons(caplog)
    assert not stored_path(log_dir, path.stem).exists(), "a failed digest left a stored file"

    briefs = spy_on_build_brief(monkeypatch)
    code, out = run_cli(monkeypatch, capsys, "interpret", dummy([DONE]), path, "--stop", "2", "--log-dir",
                        str(log_dir))
    assert code == 0
    assert_interpreted(out)
    assert briefs[0].previous is None
    assert PREVIOUS not in triage_inputs(log_dir)[0]
