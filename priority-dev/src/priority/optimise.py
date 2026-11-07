"""Compile the one-call interpreter with a DSPy optimiser, or give it labelled demos, on train sessions only.

GEPA tunes one component, `propose`, with no component selector. A stop whose brief is a demo of the
student leaves the GEPA train set, the valset, and the train rescore, and the run prints the count.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from functools import partial
from pathlib import Path

from priority import config
from priority.evaluation.demos import as_demo, demo_briefs, drop_demo_stops, pick_demos
from priority.evaluation.metric import JudgeFailure, ModelFailure
from priority.evaluation.payload_rules import abstain_of, as_steps, get_field, strip
from priority.gepa_log import (judge_checker, print_split, recording_proposer,
                               with_identity, write_candidates)
from priority.gepa_proposer import blocked_details, guided_instruction_proposer
from priority.optimise_report import append_report, write_eval_rows
from priority.run_folder import RunFolder
from priority.structure_diff import structure_diff
from priority.trainset import assert_train_only, build_trainset, split_gepa_valset
from priority.valset import ValsetSize, describe, size_error

CLASS_BY_OPTIMISER = {"gepa": "GEPA", "miprov2": "MIPROv2", "bootstrap": "BootstrapFewShot"}
OPTIMISERS = ("gepa", "miprov2", "bootstrap", "labeled")
REPORT_RELATIVE = Path("probes") / "optimiser-report.md"
PROGRAM_DIR = Path("probes") / "programs"
REFLECTION_MAX_TOKENS = 16000
REFLECTION_META_MAX_TOKENS = 32000
REFLECTION_TIMEOUT = 180  # seconds for the one attempt; one reflection prompt holds several whole briefs


@dataclass(frozen=True)
class Settings:
    optimiser: str
    budget: int
    seed: int
    minibatch: int | None = None
    threads: int | None = None
    size: ValsetSize = ValsetSize()
    log_dir: RunFolder | None = None
    method: str = "stratified"
    proposer: str = "v2"


def _reference_of(example: object) -> dict:
    """The reference object of one labelled stop: its status, its yes or no, its priority, and its steps."""
    return {"status": get_field(example, "status"), "needs_human": get_field(example, "needs_human"),
            "priority": get_field(example, "priority"),
            "steps": strip(as_steps(get_field(example, "expected_payloads")))}


def _structured_feedback(example: object, prediction: object, value: float, notes: str) -> str:
    """The score line, the notes, and the typed diff and reference JSON after their own header lines.
    The note of an abstain keeps its reason alone, because its detail and its raw reply carry payload text."""
    abstain = abstain_of(prediction)
    if abstain is not None:
        notes = f"abstain: the call gave no payload ({abstain.get('reason')})."
    reference = _reference_of(example)
    head = f"Score: {value:.2f} of 1.00. {notes}".strip()
    return (f"{head}\nStructure:\n" + "\n".join(structure_diff(reference, prediction))
            + "\nReference:\n" + json.dumps(reference, default=str))


def gepa_feedback(example: object, prediction: object, trace: object = None,
                  pred_name: object = None, pred_trace: object = None,
                  program_trace: object = None, *, checked: object = None, structure: bool = False) -> object:
    """The metric score and feedback as a GEPA ScoreWithFeedback prediction.
    `checked` is the judge call that a GEPA run wraps with its log recorder. None uses the plain judge.
    `structure` adds the typed diff and the reference JSON, for the v2 proposer."""
    import dspy

    from priority.evaluation.metric import score

    value, notes = score(example, prediction, trace, pred_name, pred_trace, checked=checked)
    if structure:
        feedback = _structured_feedback(example, prediction, value, notes)
    else:
        feedback = f"Score: {value:.2f} of 1.00. {notes}"
    return dspy.Prediction(score=value, feedback=feedback)


def plain_score(example: object, prediction: object, *ignored: object) -> float:
    """The float-only metric for MIPROv2 and BootstrapFewShot."""
    from priority.evaluation.metric import score

    return score(example, prediction)[0]


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


class _Stop(Exception):
    """The run ends before the compile, with an exit code and a printed message."""

    def __init__(self, code: int, message: str):
        super().__init__(message)
        self.code, self.message = code, message


def _prepare(manifest: Path, labels: Path, real_dir: Path, optimiser: str, tag: str | None) -> tuple[list, dict]:
    """The train examples and the split parts, after the optimiser and tag checks."""
    if optimiser not in OPTIMISERS:
        raise _Stop(1, f"optimise failed: unknown optimiser {optimiser!r}: use one of {', '.join(OPTIMISERS)}")
    if tag is not None and (not tag or "/" in tag or "\\" in tag):
        raise _Stop(1, f"optimise failed: tag {tag!r} must be a plain filename part, with no path separator")
    try:
        examples, parts = build_trainset(manifest, labels, real_dir)
        assert_train_only(examples, parts["holdout"])
    except (OSError, ValueError) as exc:
        raise _Stop(1, f"optimise failed: {exc}") from exc
    return examples, parts


def _student(seed_program: Path | str | None, log_dir: RunFolder | None = None) -> object:
    """The program to compile: a fresh Interpreter, or one that carries a saved program."""
    from priority import interpreter as interpreter_mod

    try:
        lm = interpreter_mod.interpreter_lm(retries=3)
    except (AssertionError, RuntimeError):
        # Offline, or the made-up-world tests, which stub the key: the stub teleprompter needs no model.
        lm = None
    student = interpreter_mod.Interpreter(lm=lm, log_dir=log_dir)
    if seed_program is not None:
        try:
            student.load(str(seed_program))
        except (OSError, ValueError) as exc:
            raise _Stop(1, f"optimise failed: cannot load seed program {seed_program}: {exc}") from exc
    return student


def _restore_seed_demos(compiled: object, seed_demos: dict) -> None:
    """Copy seeded demos onto compiled predictors that lost them.

    GEPA deepcopies the student, so its demos survive on their own. The bootstrap compile resets its
    student copy, so seeded demos go back in front of the bootstrapped ones, matched by value."""
    named = getattr(compiled, "named_predictors", None)
    if not seed_demos or not callable(named):
        return
    for name, predictor in named():
        seeded = seed_demos.get(name, [])
        have = list(getattr(predictor, "demos", None) or [])
        missing = [demo for demo in seeded if demo not in have]
        if missing:
            predictor.demos = missing + have


def _teleprompter_for(optimiser: str) -> object | None:
    """The dspy teleprompter class, or None for the labeled optimiser. A missing class skips the run."""
    if optimiser not in CLASS_BY_OPTIMISER:
        return None
    try:
        import dspy.teleprompt as teleprompt
    except ImportError:
        teleprompt = None
    cls = getattr(teleprompt, CLASS_BY_OPTIMISER[optimiser], None)
    if not callable(cls):
        raise _Stop(0, f"optimise skipped: dspy has no {CLASS_BY_OPTIMISER[optimiser]} teleprompter here")
    return cls


def _reflection_lm() -> object | None:
    """The GEPA reflection model from the REFLECTION_* settings (default: NVIDIA Mistral), never the judge
    or the task model. None when the key is stubbed out."""
    try:
        import dspy
        return dspy.LM(config.reflection_model(), api_key=config.reflection_key(),
                       api_base=config.reflection_base_url(), temperature=config.reflection_temperature(),
                       model_type=config.reflection_model_type(), engine=config.reflection_engine(), num_retries=0, cache=False,
                       timeout=REFLECTION_TIMEOUT, **_reflection_extras())
    except (AssertionError, RuntimeError):
        # The made-up-world tests stub the keys this way. Their stub teleprompter needs no model.
        return None


def _reflection_extras() -> dict:
    """Settings that only meta takes: a reasoning effort, top_p, and a larger output budget."""
    if config.reflection_provider() != "meta":
        return {"max_tokens": REFLECTION_MAX_TOKENS}
    return {"max_tokens": REFLECTION_META_MAX_TOKENS, "reasoning_effort": "medium", "top_p": 1.0}


def _build_optimiser(cls: object, settings: Settings, train: list) -> object:
    """One optimiser with the run budget and seed recorded in its settings."""
    if settings.optimiser == "gepa":
        gepa_dir = settings.log_dir.path / "gepa"
        gepa_dir.mkdir(parents=True, exist_ok=True)
        metric = partial(gepa_feedback, checked=judge_checker(settings.log_dir),
                         structure=settings.proposer == "v2")
        options: dict = {"metric": metric, "max_full_evals": settings.budget, "seed": settings.seed,
                         "instruction_proposer": recording_proposer(
                             partial(guided_instruction_proposer, blocked=blocked_details(train),
                                     version=settings.proposer),
                             settings.log_dir.path, settings.proposer),
                         "add_format_failure_as_feedback": True, "track_stats": True,
                         "log_dir": str(gepa_dir)}
        if settings.minibatch is not None:
            options["reflection_minibatch_size"] = settings.minibatch
        if settings.threads is not None:
            options["num_threads"] = settings.threads
        print(f"proposer: {settings.proposer}")
        print(f"reflection model: {config.reflection_model()}")
        reflection = _reflection_lm()
        if reflection is not None:
            options["reflection_lm"] = reflection
        return cls(**options)
    if settings.optimiser == "miprov2":
        return cls(metric=plain_score, num_candidates=settings.budget, seed=settings.seed)
    return cls(metric=plain_score, max_bootstrapped_demos=max(1, min(settings.budget, 4)))


def _compile(cls: object, settings: Settings, student: object, examples: list, train_ids: list[str]) -> object:
    """The compiled program. The labeled optimiser has no compile step: its student already holds the demos."""
    if settings.optimiser == "labeled":
        return student
    if settings.optimiser != "gepa":
        return _build_optimiser(cls, settings, examples).compile(student, trainset=examples)
    train, val, _ = split_gepa_valset(examples, train_ids, settings.seed, settings.size,
                                      method=settings.method)
    train, val = with_identity(train), with_identity(val)
    print_split(train, val, settings.minibatch)
    optimiser = _build_optimiser(cls, settings, train)
    if val:
        return optimiser.compile(student, trainset=train, valset=val)
    return optimiser.compile(student, trainset=train)


def _finish(compiled: object, settings: Settings, examples: list, parts: dict, stem: str) -> None:
    """Rescore the train stops, then save the program, append the report, write the rows, and print the summary.
    The rescore runs first, so a judge that never works leaves no program, report, or rows file."""
    name = f"{stem}-budget{settings.budget}-seed{settings.seed}"
    checked = judge_checker(settings.log_dir if settings.optimiser == "gepa" else None)
    try:
        rows = write_eval_rows(compiled, examples, PROGRAM_DIR / f"{name}-rows.jsonl", checked=checked)
    except Exception:  # noqa: BLE001 (a stub teleprompter has no callable program; rows stay unwritten)
        rows = []
    program = save_program(compiled, PROGRAM_DIR / f"{name}.json")
    valset = describe(settings.method, settings.size)
    append_report(REPORT_RELATIVE, settings.optimiser, settings.budget, settings.seed, parts, program,
                  settings.minibatch, settings.threads, valset)
    if rows:
        print(f"train overall {sum(row['score'] for row in rows) / len(rows):.6f} ({len(rows)} stops)")
    print(f"optimise {settings.optimiser}: compiled on {len(examples)} train stops, "
          f"held out {len(parts['holdout'])} sessions")
    print(f"program: {program}")
    print(f"report: {REPORT_RELATIVE}")


def _failure_stop(failure: BaseException, folder: RunFolder) -> int:
    """Remove this run's new log folder, print the stop message for a judge or a model that never worked, and return the exit code."""
    folder.discard()
    print(f"optimise failed: {failure}. The run stopped and saved nothing.")
    return 1


def run(manifest: Path, labels: Path, real_dir: Path,
        optimiser: str, budget: int, seed: int, minibatch: int | None = None,
        threads: int | None = None, size: ValsetSize = ValsetSize(),
        seed_program: Path | str | None = None, tag: str | None = None,
        gepa_log_dir: Path | None = None, method: str = "stratified", proposer: str = "v2") -> int:
    """Compile the interpreter with one optimiser. Return exit code. A run that compiles ends on the
    judge call and token totals."""
    from priority.evaluation.judge import reset_usage, usage_line

    reset_usage()
    error = size_error(method, size)
    if error is not None:
        print(f"optimise failed: {error}")
        return 2
    stem = (optimiser if tag is None else f"{optimiser}-{tag}") + ("-seeded" if seed_program is not None else "")
    log_dir = gepa_log_dir or PROGRAM_DIR / f"{stem}-budget{budget}-seed{seed}-log"
    folder = RunFolder(log_dir)
    settings = Settings(optimiser, budget, seed, minibatch, threads, size, folder,
                        method=method, proposer=proposer)
    try:
        examples, parts = _prepare(manifest, labels, real_dir, optimiser, tag)
        cls = _teleprompter_for(optimiser)
        student = _student(seed_program, settings.log_dir if optimiser == "gepa" else None)
    except _Stop as stop:
        print(stop.message)
        return stop.code
    seed_demos = {name: list(predictor.demos) for name, predictor in student.named_predictors()
                  if list(getattr(predictor, "demos", None) or [])}
    if optimiser == "labeled":
        student.propose.demos = [as_demo(example) for example in pick_demos(examples)]
    examples = drop_demo_stops(examples, demo_briefs(student))
    try:
        compiled = _compile(cls, settings, student, examples, parts["train"])
    except (JudgeFailure, ModelFailure) as exc:
        return _failure_stop(exc, folder)
    except Exception as exc:  # noqa: BLE001 (any compile fault ends the run with a message)
        folder.discard()
        print(f"optimise failed: {optimiser} compile failed: {exc}")
        return 1
    _restore_seed_demos(compiled, seed_demos)
    try:
        _finish(compiled, settings, examples, parts, stem)
    except (JudgeFailure, ModelFailure) as exc:
        return _failure_stop(exc, folder)
    if optimiser == "gepa":
        write_candidates(folder.path, compiled)
    print(usage_line())
    return 0
