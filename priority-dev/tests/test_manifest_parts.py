"""A manifest `part` field decides the train and holdout parts.

The contract: when every manifest entry carries `part` of `train` or
`holdout`, those fields pick the parts for `eval` and `optimise`. When no
entry carries `part`, the stable hash split decides, exactly as before. A
manifest where only some entries carry `part`, or a `part` with another
value, fails with an error that names the session. All sessions, labels,
and transcripts here are made up, the interpreter is a stub, and the
judge is a stub, so no test makes a model call.
"""
from __future__ import annotations

import contextlib
import io
import json
import re
from pathlib import Path

import pytest

from eval_support import StubInterpreter, stub_predictions_for, write_eval_world
from fixtures_support import SESSION_IDS, make_manifest, require
from judge_ref_support import JudgeRecorder, install_judge
from optimise_support import block_live_calls

TRAIN_IDS = SESSION_IDS[:7]
HOLDOUT_IDS = SESSION_IDS[7:]
SCORE_STOP = re.compile(r"^score stop session=(\S+) stop=(\d{3}) ", re.M)


class _RecordingOptimiser:
    """A stub teleprompter: it records the compile kwargs and returns a savable program."""

    def __init__(self, seen: list) -> None:
        self._seen = seen

    def compile(self, *args, **kwargs):
        self._seen.append(kwargs)
        import json as _json

        class _Compiled:
            def save(self, path) -> str:
                target = Path(path)
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_text(_json.dumps({"made_up": True}) + "\n")
                return str(target)
        return _Compiled()


def parts_manifest():
    """A made-up manifest with `part` on every entry: seven train, three holdout."""
    manifest = make_manifest()
    for entry in manifest:
        entry["part"] = "train" if entry["session"] in TRAIN_IDS else "holdout"
    return manifest


def mixed_manifest():
    """The parts manifest with the `part` field taken off one entry."""
    manifest = parts_manifest()
    del manifest[0]["part"]
    return manifest


def invalid_manifest():
    """The parts manifest with one `part` value that is neither train nor holdout."""
    manifest = parts_manifest()
    manifest[0]["part"] = "test"
    return manifest


def write_parts_world(tmp_path, manifest):
    """Write the made-up world, then put the given manifest in place. Return the paths."""
    manifest_path, labels_path, real_dir, _ = write_eval_world(tmp_path)
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
    return manifest_path, labels_path, real_dir


def run_eval(monkeypatch, tmp_path, split_name, manifest=None):
    """Run `priority eval --split <name>` in process with a stub interpreter and judge.

    Return the exit code, the printed report, and the expected parts.
    """
    install_judge(monkeypatch, JudgeRecorder())
    api = require("priority.interpreter")
    if manifest is None:
        manifest_path, labels_path, real_dir, parts = write_eval_world(tmp_path)
    else:
        manifest_path, labels_path, real_dir = write_parts_world(tmp_path, manifest)
        parts = {"train": TRAIN_IDS, "holdout": HOLDOUT_IDS}
    monkeypatch.setattr(api, "Interpreter", lambda *a, **k: StubInterpreter(
        stub_predictions_for(manifest_path, labels_path)))
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out):
        code = main(["eval", "--split", split_name, "--manifest", str(manifest_path),
                     "--labels", str(labels_path), "--real-dir", str(real_dir)])
    return code, out.getvalue(), parts


def scored_sessions(printed: str) -> set[str]:
    """The session ids that the run scored at least one stop of."""
    return {session for session, _ in SCORE_STOP.findall(printed)}


def test_parts_of_honours_explicit_parts(tmp_path):
    from priority.evaluation.split import parts_of

    parts = parts_of(json.loads(json.dumps(parts_manifest())))
    assert parts == {"train": sorted(TRAIN_IDS), "holdout": sorted(HOLDOUT_IDS)}


def test_parts_of_without_part_keeps_the_hash_split(tmp_path):
    from priority.evaluation.split import parts_of, split

    entries = json.loads(json.dumps(make_manifest()))
    assert parts_of(entries) == split([entry["session"] for entry in entries])


def test_parts_of_mixed_parts_raises_and_names_the_session(tmp_path):
    from priority.evaluation.split import parts_of

    entries = json.loads(json.dumps(mixed_manifest()))
    with pytest.raises(ValueError, match=SESSION_IDS[0]):
        parts_of(entries)


def test_parts_of_invalid_part_raises_and_names_the_session(tmp_path):
    from priority.evaluation.split import parts_of

    entries = json.loads(json.dumps(invalid_manifest()))
    with pytest.raises(ValueError, match=SESSION_IDS[0]):
        parts_of(entries)


def test_eval_split_train_honours_explicit_parts(monkeypatch, tmp_path):
    code, printed, parts = run_eval(monkeypatch, tmp_path, "train", parts_manifest())
    assert code == 0
    assert scored_sessions(printed) == set(parts["train"]), \
        "eval --split train did not score exactly the sessions with part train"


def test_eval_split_holdout_honours_explicit_parts(monkeypatch, tmp_path):
    code, printed, parts = run_eval(monkeypatch, tmp_path, "holdout", parts_manifest())
    assert code == 0
    assert scored_sessions(printed) == set(parts["holdout"]), \
        "eval --split holdout did not score exactly the sessions with part holdout"


def test_eval_split_all_with_parts_scores_both(monkeypatch, tmp_path):
    code, printed, parts = run_eval(monkeypatch, tmp_path, "all", parts_manifest())
    assert code == 0
    assert scored_sessions(printed) == set(parts["train"]) | set(parts["holdout"]), \
        "eval --split all did not score every session with a part field"


def test_eval_without_part_keeps_the_hash_split(monkeypatch, tmp_path):
    code, printed, parts = run_eval(monkeypatch, tmp_path, "train")
    assert code == 0
    assert scored_sessions(printed) == set(parts["train"]), \
        "a manifest with no part field did not keep the hash split for --split train"


def test_eval_mixed_parts_fails_and_names_the_session(monkeypatch, tmp_path):
    code, printed, _ = run_eval(monkeypatch, tmp_path, "train", mixed_manifest())
    assert code == 1
    assert SESSION_IDS[0] in printed, f"the error does not name the session: {printed[:300]}"


def test_optimise_trainset_never_holds_a_held_out_session(monkeypatch, tmp_path):
    """Optimise on the parts manifest, then read the trainset out of the compile call."""
    import dspy
    import dspy.teleprompt as teleprompt

    manifest_path, labels_path, real_dir = write_parts_world(tmp_path, parts_manifest())
    seen = []

    def factory(*args, **kwargs):
        return _RecordingOptimiser(seen)

    monkeypatch.setattr(teleprompt, "BootstrapFewShot", factory)
    monkeypatch.setattr(dspy, "BootstrapFewShot", factory, raising=False)
    block_live_calls(monkeypatch)
    interpreter_mod = require("priority.interpreter")
    monkeypatch.setattr(interpreter_mod, "Interpreter", lambda *a, **k: StubInterpreter([]))
    monkeypatch.chdir(tmp_path)
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out):
        code = main(["optimise", "--optimiser", "bootstrap",
                     "--manifest", str(manifest_path), "--labels", str(labels_path),
                     "--real-dir", str(real_dir), "--budget", "5", "--seed", "7"])
    assert code == 0, f"optimise failed, so assert_train_only did not pass: {out.getvalue()[:300]}"
    assert seen and seen[0].get("trainset"), "no trainset reached the compile call"
    ids = {example.session_id for example in seen[0]["trainset"]}
    assert ids == set(TRAIN_IDS), f"the trainset held sessions outside part train: {sorted(ids)}"
    assert not ids & set(HOLDOUT_IDS), "a held-out session entered the trainset"


def test_optimise_holds_out_the_declared_count(monkeypatch, tmp_path):
    import dspy
    import dspy.teleprompt as teleprompt

    manifest_path, labels_path, real_dir = write_parts_world(tmp_path, parts_manifest())

    def factory(*args, **kwargs):
        return _RecordingOptimiser([])

    monkeypatch.setattr(teleprompt, "BootstrapFewShot", factory)
    monkeypatch.setattr(dspy, "BootstrapFewShot", factory, raising=False)
    block_live_calls(monkeypatch)
    interpreter_mod = require("priority.interpreter")
    monkeypatch.setattr(interpreter_mod, "Interpreter", lambda *a, **k: StubInterpreter([]))
    monkeypatch.chdir(tmp_path)
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out):
        code = main(["optimise", "--optimiser", "bootstrap",
                     "--manifest", str(manifest_path), "--labels", str(labels_path),
                     "--real-dir", str(real_dir), "--budget", "5", "--seed", "7"])
    assert code == 0, out.getvalue()[:300]
    assert re.search(r"held out 3 sessions", out.getvalue()), \
        f"the summary does not count the three declared holdout sessions: {out.getvalue()[:400]}"

