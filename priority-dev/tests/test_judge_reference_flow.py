"""Slice 20 RED: payloads reach the metric, and stops with no reference drop out.

The contract. `runner.to_prediction(interpretation)` returns a `payloads`
key: the dumped proposal steps, or `[]` with no advice. `runner.run` and the
optimise example builder skip each stop whose label has no `payloads` key and
print `excluded: N stops (no reference payload)`. A label with `payloads: []`
stays. `eval` and `optimise` print the judge usage line at the end. Every
world here is made up, and the interpreter and the judge are stubs.
"""
from __future__ import annotations

import contextlib
import io
import json
import re

from eval_support import StubInterpreter, stub_predictions_for, write_eval_world
from fixtures_support import STOPS_PER_SESSION, stop_key
from judge_ref_support import JudgeRecorder, install_judge, made_interp, made_steps, require
from optimise_support import run_optimise

SCORE_STOP = re.compile(r"^score stop session=(\S+) stop=(\d{3}) overall=\d\.\d{3} "
                        r"payload=\d\.\d{3} gate=\S+ ambiguous=(?:yes|no)$")
USAGE = re.compile(r"^judge calls: \d+ prompt_tokens: \d+ completion_tokens: \d+$")


# ---- Item 4: to_prediction carries the payloads --------------------------------


def test_to_prediction_carries_the_dumped_proposal_steps():
    runner = require("priority.evaluation.runner")
    steps = made_steps()
    prediction = runner.to_prediction(made_interp(steps))
    assert prediction.get("payloads") == [step.model_dump() for step in steps], \
        f"to_prediction dropped the payloads: {prediction.get('payloads')!r}"


def test_to_prediction_with_no_advice_carries_an_empty_payload_list():
    runner = require("priority.evaluation.runner")
    for interp in (made_interp(status="done"), made_interp(abstain="no_agent_reply")):
        prediction = runner.to_prediction(interp)
        assert prediction.get("payloads", "missing") == [], \
            f"a stop with no advice carries {prediction.get('payloads', 'missing')!r}"


def test_to_prediction_passes_a_dict_through():
    runner = require("priority.evaluation.runner")
    flat = {"status": "done", "steps": ["notify"], "payloads": [{"kind": "notify"}]}
    assert runner.to_prediction(flat) is flat


# ---- Item 5: stops with no reference payload are excluded ----------------------


def drop_references(labels_path, parts) -> set:
    """Remove `payloads` from three train stops. Keep `[]` on the rest."""
    doc = json.loads(labels_path.read_text())
    train = sorted(parts["train"])
    dropped = {(train[0], stop_key(1)), (train[0], stop_key(2)), (train[1], stop_key(3))}
    for session_id, key in dropped:
        del doc["sessions"][session_id]["stops"][key]["payloads"]
    labels_path.write_text(json.dumps(doc, indent=2) + "\n")
    return dropped


def run_eval(monkeypatch, tmp_path, drop=False):
    """Run `priority eval --split train` on the made-up world with stubs."""
    install_judge(monkeypatch, JudgeRecorder(0.5))
    interpreter = require("priority.interpreter")
    manifest_path, labels_path, real_dir, parts = write_eval_world(tmp_path)
    dropped = drop_references(labels_path, parts) if drop else set()
    monkeypatch.setattr(interpreter, "Interpreter", lambda *a, **k: StubInterpreter(
        stub_predictions_for(manifest_path, labels_path)))
    from priority.cli import main

    code, out = None, io.StringIO()
    with contextlib.suppress(SystemExit), contextlib.redirect_stdout(out):
        code = main(["eval", "--split", "train", "--manifest", str(manifest_path),
                     "--labels", str(labels_path), "--real-dir", str(real_dir),
                     "--log-dir", str(tmp_path / "logs")])
    return code, out.getvalue(), parts, dropped


def test_eval_skips_stops_with_no_reference_and_prints_the_count(monkeypatch, tmp_path):
    code, printed, parts, dropped = run_eval(monkeypatch, tmp_path, drop=True)
    assert code == 0, printed[-500:]
    lines = printed.splitlines()
    assert lines.count("excluded: 3 stops (no reference payload)") == 1, \
        f"no single excluded line: {[line for line in lines if 'excluded' in line]}"
    scored = [SCORE_STOP.match(line) for line in lines if line.startswith("score stop ")]
    assert all(scored), "a per-stop line changed its format"
    keys = {(match.group(1), match.group(2)) for match in scored}
    assert not keys & dropped, f"a stop with no reference was scored: {keys & dropped}"
    assert len(keys) == len(parts["train"]) * STOPS_PER_SESSION - len(dropped), \
        "a stop with `payloads: []` was dropped"


def test_optimise_builder_skips_stops_with_no_reference_and_prints_the_count(tmp_path, capsys):
    optimise = require("priority.optimise")
    manifest_path, labels_path, real_dir, parts = write_eval_world(tmp_path)
    dropped = drop_references(labels_path, parts)
    capsys.readouterr()
    examples, _ = optimise.build_trainset(manifest_path, labels_path, real_dir)
    printed = capsys.readouterr().out
    assert printed.splitlines().count("excluded: 3 stops (no reference payload)") == 1, \
        f"the builder printed no single excluded line: {printed!r}"
    keys = {(example.session_id, example.stop) for example in examples}
    assert not keys & dropped, f"a stop with no reference became an example: {keys & dropped}"
    assert len(examples) == len(parts["train"]) * STOPS_PER_SESSION - len(dropped)
    assert all(example.expected_payloads == [] for example in examples), \
        "an example lost its `payloads: []` reference"


# ---- Item 6: eval and optimise print the judge usage line at the end -----------


def test_eval_prints_the_judge_usage_line_last(monkeypatch, tmp_path):
    code, printed, _, _ = run_eval(monkeypatch, tmp_path)
    assert code == 0, printed[-500:]
    lines = [line for line in printed.splitlines() if line.strip()]
    assert USAGE.match(lines[-1]), f"eval ends on {lines[-1]!r}, not the judge usage line"


def test_optimise_prints_the_judge_usage_line_last(monkeypatch, tmp_path):
    install_judge(monkeypatch, JudgeRecorder(0.5))
    code, printed, *_ = run_optimise(monkeypatch, tmp_path, "bootstrap")
    assert code == 0, printed[-500:]
    lines = [line for line in printed.splitlines() if line.strip()]
    assert USAGE.match(lines[-1]), f"optimise ends on {lines[-1]!r}, not the judge usage line"
