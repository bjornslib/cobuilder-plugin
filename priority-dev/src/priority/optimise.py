"""Compile the chain interpreter with a DSPy optimiser, on train sessions only."""
from __future__ import annotations

import importlib.util
import json
from pathlib import Path

CLASS_BY_OPTIMISER = {"gepa": "GEPA", "miprov2": "MIPROv2", "bootstrap": "BootstrapFewShot"}
OPTIMISERS = ("gepa", "miprov2", "bootstrap")
REPORT_RELATIVE = Path("probes") / "optimiser-report.md"
PROGRAM_DIR = Path("probes") / "programs"


def _session_id_of(example: object) -> str | None:
    """The session id stored on one train example, or None when missing."""
    get = getattr(example, "get", None)
    if callable(get):
        try:
            value = get("session_id")
        except Exception:
            value = None
        if isinstance(value, str):
            return value
    value = getattr(example, "session_id", None)
    return value if isinstance(value, str) else None


def assert_train_only(examples: list, holdout_ids: list[str]) -> None:
    """Fail when any example carries a held-out session id, in any field."""
    holdout = {session_id for session_id in holdout_ids if session_id}
    leaked: set[str] = set()
    for example in examples:
        if _session_id_of(example) in holdout:
            leaked.add(_session_id_of(example))  # type: ignore[arg-type]
        leaked.update(wanted for wanted in holdout if wanted in repr(example))
    if leaked:
        raise ValueError(f"train-only guard: held-out session leaked: {', '.join(sorted(leaked))}")


def gepa_feedback(example: object, prediction: object, trace: object = None,
                  pred_name: object = None, pred_trace: object = None,
                  program_trace: object = None) -> object:
    """The slice 16 score as a GEPA ScoreWithFeedback prediction."""
    import dspy

    from priority.evaluation.metric import score

    value, feedback = score(example, prediction, trace, pred_name, pred_trace)
    return dspy.Prediction(score=value, feedback=feedback)


def plain_score(example: object, prediction: object, *ignored: object) -> float:
    """The float-only metric for MIPROv2 and BootstrapFewShot."""
    from priority.evaluation.metric import score

    value, _ = score(example, prediction)
    return value


def build_trainset(manifest: Path, labels_path: Path,
                   real_dir: Path) -> tuple[list, dict[str, list[str]]]:
    """One dspy example per train stop, with the brief text as the input."""
    import dspy

    from priority.brief import StopBrief, build_brief
    from priority.evaluation.check import stop_key
    from priority.evaluation.labels import load_labels, match_session_key
    from priority.evaluation.metric import FACT_FIELDS
    from priority.evaluation.split import split

    entries = json.loads(Path(manifest).read_text())
    labels_by_session = load_labels(labels_path)
    parts = split([entry["session"] for entry in entries])
    train = set(parts["train"])
    examples = []
    for entry in entries:
        session_id = entry["session"]
        if session_id not in train:
            continue
        matched_key = match_session_key(labels_by_session, session_id)
        if matched_key is None:
            raise ValueError(f"session {session_id} has no labels")
        session_labels = labels_by_session[matched_key]
        transcript = Path(real_dir) / f"{session_id}.jsonl"
        for number in entry["stops"]:
            key = stop_key(number)
            if key not in session_labels:
                raise ValueError(f"session {session_id} stop {key} has no label")
            label = session_labels[key]
            brief = build_brief(transcript, stop=number)
            text = brief.for_model() if isinstance(brief, StopBrief) else ""
            fields = {field: label[field] for field in FACT_FIELDS}
            examples.append(dspy.Example(
                session_id=session_id, stop=key, brief_text=text,
                steps=label["steps"], ambiguous=label["ambiguous"], **fields,
            ).with_inputs("brief_text"))
    return examples, parts


def save_program(compiled: object, path: Path) -> Path:
    """Save one compiled program as JSON through its own saver."""
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    saver = getattr(compiled, "save", None)
    if callable(saver):
        saver(str(target))
    else:
        target.write_text(json.dumps({"program": repr(compiled)}, indent=2) + "\n")
    return target


def _teleprompter(optimiser: str) -> object | None:
    """The dspy teleprompter class, or None when the import is missing."""
    try:
        import dspy.teleprompt as teleprompt
    except ImportError:
        return None
    cls = getattr(teleprompt, CLASS_BY_OPTIMISER[optimiser], None)
    return cls if callable(cls) else None


def _reflection_lm() -> object | None:
    """The interpreter model for GEPA reflection, or None when the key is stubbed out."""
    try:
        from priority.interpreter.module import interpreter_lm
        return interpreter_lm()
    except AssertionError:
        # The made-up-world tests block the real key this way. Their stub
        # teleprompter needs no model, so the run continues without one.
        return None


def _build_optimiser(optimiser: str, cls: object, budget: int, seed: int) -> object:
    """One optimiser with the run budget and seed recorded in its settings."""
    if optimiser == "gepa":
        settings: dict = {"metric": gepa_feedback, "max_full_evals": budget, "seed": seed}
        reflection = _reflection_lm()
        if reflection is not None:
            settings["reflection_lm"] = reflection
        return cls(**settings)
    if optimiser == "miprov2":
        return cls(metric=plain_score, num_candidates=budget, seed=seed)
    return cls(metric=plain_score, max_bootstrapped_demos=max(1, min(budget, 4)))


def _settings_line(optimiser: str, budget: int, seed: int) -> str:
    """The per-optimiser settings for the report."""
    if optimiser == "gepa":
        from priority.interpreter.module import INTERPRETER_MODEL
        return f"candidates: {budget} (max_full_evals); reflection model: {INTERPRETER_MODEL} (same as the interpreter); seed {seed}"
    if optimiser == "miprov2":
        found = importlib.util.find_spec("optuna") is not None
        state = "present" if found else "absent (not installed; no install attempted)"
        return f"candidates: {budget} (num_candidates); seed {seed}; optuna extra: {state}"
    return f"cheap baseline; bootstrapped demos: {max(1, min(budget, 4))}; seed {seed}"


def append_report(report: Path, optimiser: str, budget: int, seed: int,
                  parts: dict[str, list[str]], program: Path) -> Path:
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
            f"- settings: {_settings_line(optimiser, budget, seed)}\n"
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


def run(manifest: Path, labels: Path, real_dir: Path,
        optimiser: str, budget: int, seed: int) -> int:
    """Compile the chain interpreter with one optimiser. Return exit code."""
    from priority import interpreter as interpreter_mod

    if optimiser not in CLASS_BY_OPTIMISER:
        print(f"optimise failed: unknown optimiser {optimiser!r}: use one of {', '.join(OPTIMISERS)}")
        return 1
    try:
        examples, parts = build_trainset(manifest, labels, real_dir)
        assert_train_only(examples, parts["holdout"])
    except (OSError, ValueError) as exc:
        print(f"optimise failed: {exc}")
        return 1
    cls = _teleprompter(optimiser)
    if cls is None:
        print(f"optimise skipped: dspy has no {CLASS_BY_OPTIMISER[optimiser]} teleprompter here")
        return 0
    try:
        student_lm = interpreter_mod.interpreter_lm()
    except (AssertionError, RuntimeError):
        # Offline (or the made-up-world tests, which stub the key): the stub
        # teleprompter needs no model, so the run continues without one.
        student_lm = None
    student = interpreter_mod.Interpreter(lm=student_lm, variant="chain")
    try:
        compiled = _build_optimiser(optimiser, cls, budget, seed).compile(student, trainset=examples)
    except Exception as exc:
        print(f"optimise failed: {optimiser} compile failed: {exc}")
        return 1
    program = PROGRAM_DIR / f"{optimiser}-budget{budget}-seed{seed}.json"
    save_program(compiled, program)
    append_report(REPORT_RELATIVE, optimiser, budget, seed, parts, program)
    print(f"optimise {optimiser}: compiled on {len(examples)} train stops, "
          f"held out {len(parts['holdout'])} sessions")
    print(f"program: {program}")
    print(f"report: {REPORT_RELATIVE}")
    return 0
