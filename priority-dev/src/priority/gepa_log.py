"""The evidence of one GEPA optimiser run, kept in the run folder beside GEPA's own state.

GEPA writes its state under `<run dir>/gepa`. This module writes one `reflection-NNN.json`
per reflection call, and `candidates.json` for the candidate table, into the run folder.
"""
from __future__ import annotations

import itertools
import json
from collections.abc import Callable
from pathlib import Path

import dspy

from priority import config
from priority.evaluation.metric import score_checked
from priority.evaluation.payload_rules import get_field
from priority.interpreter.calls import CallRecorder
from priority.run_folder import RunFolder
from priority.valset_mix import mix_line


def _dump(path: Path, data: object) -> None:
    """Write data as indented JSON. A value with no JSON form is written as its text."""
    path.write_text(json.dumps(data, indent=2, default=str) + "\n")


def recording_proposer(propose: Callable, run_dir: Path) -> Callable:
    """Wrap a GEPA instruction proposer so each reflection call writes reflection-NNN.json into run_dir."""
    calls = itertools.count(1)

    def record(candidate: dict, reflective_dataset: dict, components_to_update: list) -> dict:
        proposed = propose(candidate, reflective_dataset, components_to_update)
        name = components_to_update[0]
        _dump(run_dir / f"reflection-{next(calls):03d}.json", {
            "component": name,
            "model": config.reflection_model(),
            "current_instruction": candidate.get(name),
            "reflective_dataset": reflective_dataset.get(name),
            "proposal": proposed.get(name),
        })
        return proposed

    return record


def write_candidates(run_dir: Path, compiled: object) -> None:
    """Write candidates.json from the GEPA result that the compiled program tracked. No result, no file."""
    result = getattr(compiled, "detailed_results", None)
    if result is None:
        return
    entries = [
        {"instruction": {name: predictor.signature.instructions for name, predictor in candidate.named_predictors()},
         "parents": result.parents[i],
         "val_score": result.val_aggregate_scores[i]}
        for i, candidate in enumerate(result.candidates)
    ]
    _dump(run_dir / "candidates.json", {"best_index": result.best_idx, "candidates": entries})


MINIBATCH_DEFAULT = 3  # GEPA's default minibatch size (dspy gepa.py:408)


def with_identity(examples: list) -> list:
    """Copies of the examples that name their session and stop as inputs, so a student call carries both."""
    return [example.with_inputs("brief_text", "session_id", "stop") for example in examples]


def judge_checker(log_dir: RunFolder | None):
    """The GEPA judge call. Each try writes one judge row to log_dir. None when no log dir is set."""
    if log_dir is None:
        return None

    def checked(example: object, prediction: object) -> tuple[float, str, bool]:
        recorder = CallRecorder(log_dir, "chat", get_field(example, "session_id"), get_field(example, "stop"))
        recorder.stage = "judge"
        with dspy.context(callbacks=[*dspy.settings.callbacks, recorder]):
            value, feedback, judge_error = score_checked(example, prediction)
        recorder.commit(not judge_error, feedback if judge_error else "")
        return value, feedback, judge_error

    return checked


def print_split(train: list, val: list, minibatch: int | None) -> None:
    """Print each split's stop and session counts, the minibatch size, each split's mix, and each split's stops."""
    size = MINIBATCH_DEFAULT if minibatch is None else minibatch
    print(f"trainset: {len(train)} stops ({_sessions(train)} sessions); "
          f"valset: {len(val)} stops ({_sessions(val)} sessions); minibatch: {size}")
    print(mix_line("valset", val))
    print(mix_line("trainset", train))
    print(f"train stops: {_stop_list(train)}")
    print(f"valset stops: {_stop_list(val) or '(none)'}")


def _sessions(examples: list) -> int:
    return len({get_field(example, "session_id") for example in examples})


def _stop_list(examples: list) -> str:
    """The stops as sorted session/stop pairs. The session shows eight characters, and the stop is zero-padded."""
    keys = sorted((str(get_field(ex, "session_id")), str(get_field(ex, "stop")).zfill(3)) for ex in examples)
    return " ".join(f"{session[:8]}/{stop}" for session, stop in keys)
