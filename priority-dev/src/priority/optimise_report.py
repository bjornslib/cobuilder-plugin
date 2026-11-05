"""The outputs of `priority optimise`: the cumulative comparison report and the per-stop rescore rows."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

from priority.evaluation.payload_rules import get_field


def _settings_line(optimiser: str, budget: int, seed: int, minibatch: int | None = None,
                   threads: int | None = None, val_sessions: int = 1) -> str:
    """The per-optimiser settings for the report."""
    if optimiser == "gepa":
        from priority.config import reflection_model
        batch = str(minibatch) if minibatch is not None else "GEPA default"
        thread_text = str(threads) if threads is not None else "GEPA default"
        return (f"candidates: {budget} (max_full_evals); reflection model: {reflection_model()}; "
                f"reflection minibatch size: {batch}; "
                f"threads (num_threads): {thread_text}; "
                f"valset sessions: {val_sessions}; one component (propose), no component selector; "
                f"schema-guarded instruction proposer; format failures as feedback; seed {seed}")
    if optimiser == "miprov2":
        found = importlib.util.find_spec("optuna") is not None
        state = "present" if found else "absent (not installed; no install attempted)"
        return f"candidates: {budget} (num_candidates); seed {seed}; optuna extra: {state}"
    if optimiser == "labeled":
        return "labelled demos: up to 4 train stops picked by pick_demos, no model call; seed unused"
    return f"cheap baseline; bootstrapped demos: {max(1, min(budget, 4))}; seed {seed}"


def append_report(report: Path, optimiser: str, budget: int, seed: int,
                  parts: dict[str, list[str]], program: Path, minibatch: int | None = None,
                  threads: int | None = None, val_sessions: int = 1) -> Path:
    """Append one optimiser section to the cumulative comparison report."""
    report.parent.mkdir(parents=True, exist_ok=True)
    if not report.exists():
        report.write_text(
            "# Optimiser comparison (slice 18)\n\n"
            "Each optimiser trains on the train sessions only. "
            "BootstrapFewShot is the cheap baseline. "
            "Read each gain against the spread over repeats.\n")
    train = sorted(parts["train"])
    holdout = sorted(parts["holdout"])
    with report.open("a") as handle:
        handle.write(
            f"\n## {optimiser} (budget {budget}, seed {seed})\n\n"
            f"- settings: {_settings_line(optimiser, budget, seed, minibatch, threads, val_sessions)}\n"
            f"- train sessions ({len(train)}): {', '.join(train)}\n"
            f"- held-out sessions ({len(holdout)}): {', '.join(holdout)}\n"
            "- held-out score before: n/a in this run (no holdout scoring without model calls)\n"
            "- held-out score after: n/a in this run (score the saved program with "
            f"`priority eval --split holdout --program {program}`)\n"
            "- spread over repeats: read each gain against the slice 16 baseline spread "
            "(probes/eval-baseline.md); a gain smaller than that spread is not a result\n"
            f"- cost: optimiser budget {budget}; model-call count is not metered by this command\n"
            f"- program: {program} (load it with `priority eval --program`)\n")
    return report


def _row_for(example: object, prediction: object) -> dict:
    """One runner-format per-stop row for one compiled output, scored by the metric."""
    from priority.evaluation.metric import score

    abstain = get_field(prediction, "abstain")
    reason = get_field(abstain, "reason") if abstain is not None else None
    value, feedback = score(example, prediction)
    parts = [feedback] if feedback and reason is None else []
    return {"session": get_field(example, "session_id", ""), "stop": get_field(example, "stop", ""),
            "score": value, "parts": parts, "gate": reason or "pass"}


def write_eval_rows(compiled: object, examples: list, path: Path) -> list[dict]:
    """Score the compiled program on its train stops and write runner-format rows."""
    rows = [_row_for(example, compiled(brief_text=get_field(example, "brief_text", ""))) for example in examples]
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text("".join(json.dumps(row) + "\n" for row in rows))
    return rows
