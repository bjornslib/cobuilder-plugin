"""The evidence of one GEPA optimiser run, kept in the run folder beside GEPA's own state.

GEPA writes its state under `<run dir>/gepa`. This module writes one `reflection-NNN.json`
per reflection call, and `candidates.json` for the candidate table, into the run folder.
"""
from __future__ import annotations

import itertools
import json
import shutil
from collections.abc import Callable
from pathlib import Path


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


def discard_run_log(run_dir: Path, existed_before: bool) -> None:
    """Remove a stopped run's log folder, but only when this run created it. A folder that was there before stays."""
    if not existed_before and run_dir.exists():
        shutil.rmtree(run_dir)
