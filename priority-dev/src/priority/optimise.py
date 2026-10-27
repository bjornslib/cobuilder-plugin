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
    """Fail when any example session id names a held-out session."""
    holdout = {session_id for session_id in holdout_ids if session_id}
    leaked: set[str] = set()
    for example in examples:
        session_id = _session_id_of(example)
        if session_id in holdout:
            leaked.add(session_id)  # type: ignore[arg-type]
    if leaked:
        raise ValueError(f"train-only guard: held-out session leaked: {', '.join(sorted(leaked))}")


def gepa_feedback(example: object, prediction: object, trace: object = None,
                  pred_name: object = None, pred_trace: object = None,
                  program_trace: object = None) -> object:
    """The slice 16 score as a GEPA ScoreWithFeedback prediction.

    The score is the program-level number, so acceptance sums stay comparable.
    The feedback targets the named predictor: its own fields and trace."""
    import dspy

    from priority.evaluation.metric import score
    from priority.evaluation.runner import to_prediction

    value, feedback = score(example, to_prediction(prediction), trace, pred_name, pred_trace)
    return dspy.Prediction(score=value, feedback=feedback)


def plain_score(example: object, prediction: object, *ignored: object) -> float:
    """The float-only metric for MIPROv2 and BootstrapFewShot."""
    from priority.evaluation.metric import score
    from priority.evaluation.runner import to_prediction

    value, _ = score(example, to_prediction(prediction))
    return value


def build_trainset(manifest: Path, labels_path: Path,
                   real_dir: Path) -> tuple[list, dict[str, list[str]]]:
    """One dspy example per train stop, with the brief text and final reply as inputs."""
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
            if isinstance(brief, StopBrief):
                text, final = brief.for_model(), brief.final
            else:
                text, final = "", ""
            fields = {field: label[field] for field in FACT_FIELDS}
            examples.append(dspy.Example(
                session_id=session_id, stop=key, brief_text=text, final_text=final,
                steps=label["steps"], ambiguous=label["ambiguous"], **fields,
            ).with_inputs("brief_text", "final_text"))
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


def load_seed_program(path: Path | str) -> object:
    """A fresh student carrying one saved program's instructions and demos."""
    from priority import interpreter as interpreter_mod

    student = interpreter_mod.Interpreter(lm=None, variant="chain")
    student.load(str(path))
    return student


def _restore_seed_demos(compiled: object, seed_demos: dict) -> None:
    """Copy seeded demos onto compiled predictors that lost them.

    GEPA deepcopies the student, so its demos survive on their own. The
    bootstrap compile resets its student copy, so seeded demos are merged
    back in front of the bootstrapped ones, matched by value."""
    named = getattr(compiled, "named_predictors", None)
    if not seed_demos or not callable(named):
        return
    for name, predictor in named():
        seeded = seed_demos.get(name, [])
        if not seeded:
            continue
        have = list(getattr(predictor, "demos", None) or [])
        missing = [demo for demo in seeded if demo not in have]
        if missing:
            predictor.demos = missing + have


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
        return interpreter_lm(retries=3)
    except AssertionError:
        # The made-up-world tests block the real key this way. Their stub
        # teleprompter needs no model, so the run continues without one.
        return None


def busy_fill_kinds(labels_path: Path, train_ids: list[str]) -> list[str]:
    """The sorted Fill kinds that appear in the train labels. Never hardcoded."""
    from priority.evaluation.labels import load_labels, match_session_key

    labels_by_session = load_labels(labels_path)
    kinds: set[str] = set()
    for session_id in train_ids:
        key = match_session_key(labels_by_session, session_id)
        if key is None:
            continue
        for label in labels_by_session[key].values():
            steps = label.get("steps", []) if isinstance(label, dict) else []
            for entry in steps or []:
                if isinstance(entry, list):
                    for kind in entry:
                        if isinstance(kind, str):
                            kinds.add(kind)
                elif isinstance(entry, str):
                    kinds.add(entry)
    return sorted(kinds)


def busy_predictor_names(labels_path: Path, train_ids: list[str]) -> list[str]:
    """Triage, Pick, Card, plus one Fill predictor for each train label kind."""
    kinds = busy_fill_kinds(labels_path, train_ids)
    return ["triage", "pick"] + [f"fill['{kind}']" for kind in kinds] + ["card"]


class BusyComponentSelector:
    """A GEPA selector that reflects only on busy predictors, round robin."""

    def __init__(self, busy_names: list[str] | tuple[str, ...]) -> None:
        self.busy = tuple(busy_names)

    def __call__(self, state: object, trajectories: list, subsample_scores: list,
                 candidate_idx: int, candidate: dict) -> list[str]:
        """The next busy predictor for one candidate, cycling in program order."""
        busy_set = set(self.busy)
        ordered = [name for name in getattr(state, "list_of_named_predictors", []) if name in busy_set]
        if not ordered:
            ordered = [name for name in candidate.keys() if name in busy_set] or list(candidate.keys())
        if not ordered:
            return []
        ids = getattr(state, "named_predictor_id_to_update_next_for_program_candidate", [])
        pid = ids[candidate_idx] if 0 <= candidate_idx < len(ids) else 0
        name = ordered[pid % len(ordered)]
        if 0 <= candidate_idx < len(ids):
            ids[candidate_idx] = (pid + 1) % len(ordered)
        return [name]


def split_gepa_valset(examples: list, train_ids: list[str], seed: int,
                      val_sessions: int = 1) -> tuple[list, list, list[str]]:
    """Train sessions, picked by seed, as the GEPA valset. Holdout is untouched."""
    ordered = sorted(train_ids)
    count = max(0, min(val_sessions, len(ordered) - 1)) if len(ordered) > 1 else 0
    if count <= 0:
        return examples, [], []
    start = seed % len(ordered)
    picked = [ordered[(start + offset) % len(ordered)] for offset in range(count)]
    val_ids = set(picked)
    train = [example for example in examples if _session_id_of(example) not in val_ids]
    val = [example for example in examples if _session_id_of(example) in val_ids]
    if not train or not val:
        return examples, [], []
    return train, val, sorted(val_ids)


SCHEMA_GUARD_LINE = "Use exactly these fields. Do not invent field names."


def signature_for_component(name: object) -> object | None:
    """The DSPy signature class behind one GEPA component name, or None."""
    from priority.interpreter.signatures import FILL, PickStep, TriageLM, WriteCard, WriteCombined

    if name == "triage":
        return TriageLM
    if name == "pick":
        return PickStep
    if name == "card":
        return WriteCard
    if name == "combined":
        return WriteCombined
    if isinstance(name, str) and name.startswith("fill[") and name.endswith("]"):
        return FILL.get(name[len("fill["):-1].strip("'\""))
    return None


def _render_annotation(annotation: object) -> str:
    """Short schema text for one field annotation, with the allowed literals."""
    import types
    import typing

    from pydantic import BaseModel

    if annotation is bool:
        return "bool"
    if annotation is int:
        return "int"
    if annotation is float:
        return "float"
    if annotation is str:
        return "str"
    origin = typing.get_origin(annotation)
    args = typing.get_args(annotation)
    if origin is typing.Literal:
        return "one of " + ", ".join(str(value) for value in args)
    if origin in (list, tuple, typing.Sequence):
        items = [arg for arg in args if arg is not Ellipsis]
        return "list of " + (" or ".join(_render_annotation(arg) for arg in items) if items else "str")
    if origin is typing.Union or (isinstance(origin, type) and issubclass(origin, types.UnionType)) or isinstance(annotation, types.UnionType):
        rest = [arg for arg in args if arg is not type(None)]
        inner = " or ".join(_render_annotation(arg) for arg in rest)
        return f"optional {inner}" if len(rest) < len(args) else inner
    if isinstance(annotation, type) and issubclass(annotation, BaseModel):
        from priority.interpreter.models import ACTION_KINDS

        fields = []
        for field_name, info in annotation.model_fields.items():
            if (field_name == "kind" and info.annotation is str
                    and annotation.__name__ in ("PickedStep", "CombinedAction")):
                rendered = "one of " + ", ".join(ACTION_KINDS)
            else:
                rendered = _render_annotation(info.annotation)
            fields.append(f"{field_name}: {rendered}")
        return "{" + "; ".join(fields) + "}"
    return str(annotation).replace("typing.", "")


def schema_guard(component_name: object) -> str:
    """The schema guard for one GEPA component: exact fields and allowed literals."""
    signature = signature_for_component(component_name)
    if signature is None:
        return SCHEMA_GUARD_LINE
    fields = "; ".join(
        f"{field_name}: {_render_annotation(info.annotation)}"
        for field_name, info in signature.output_fields.items()
    )
    return f"Schema guard for {component_name}: {fields}. {SCHEMA_GUARD_LINE}"


MAX_PROPOSAL_CHARS = 4000


def _strip_guard(text: str) -> str:
    """The draft without any earlier schema guard block."""
    head = text.split(SCHEMA_GUARD_LINE, 1)[0]
    marker = head.rfind("Schema guard for ")
    if marker != -1:
        head = head[:marker]
    return head.rstrip()


def _cap_draft(text: str, limit: int = MAX_PROPOSAL_CHARS) -> str:
    """The draft within the length cap, cut back to the last space."""
    if len(text) <= limit:
        return text
    cut = text[:limit]
    return cut.rsplit(" ", 1)[0] if " " in cut else cut


def guided_instruction_proposer(candidate: dict, reflective_dataset: dict,
                                components_to_update: list) -> dict:
    """The GEPA instruction proposer: the default reflective flow plus a schema guard.

    The call signature matches dspy's ProposalFn: the candidate instruction
    mapping, the reflective dataset of ReflectiveExamples (Inputs, Generated
    Outputs, Feedback), and the components to update. It returns the new
    instruction mapping. Each proposed instruction gains the exact Pydantic
    field list of its predictor, so drifted fields and invented names fail
    the shape check instead of slipping into the prompt. An earlier guard
    is stripped before the fresh one is appended, so guards do not pile up
    across rounds, and each draft is capped at MAX_PROPOSAL_CHARS.
    """
    from dspy.teleprompt.gepa import InstructionProposer

    proposed = InstructionProposer()(
        candidate=candidate,
        reflective_dataset=reflective_dataset,
        components_to_update=components_to_update,
    )
    return {name: _cap_draft(_strip_guard(text)) + "\n\n" + schema_guard(name)
            for name, text in proposed.items()}


def _build_optimiser(optimiser: str, cls: object, budget: int, seed: int,
                     busy_names: list[str] | tuple[str, ...] | None = None,
                     minibatch: int | None = None, threads: int | None = None) -> object:
    """One optimiser with the run budget and seed recorded in its settings."""
    if optimiser == "gepa":
        settings: dict = {"metric": gepa_feedback, "max_full_evals": budget, "seed": seed,
                          "instruction_proposer": guided_instruction_proposer,
                          "add_format_failure_as_feedback": True}
        if minibatch is not None:
            settings["reflection_minibatch_size"] = minibatch
        if threads is not None:
            settings["num_threads"] = threads
        if busy_names is not None:
            settings["component_selector"] = BusyComponentSelector(list(busy_names))
        reflection = _reflection_lm()
        if reflection is not None:
            settings["reflection_lm"] = reflection
        return cls(**settings)
    if optimiser == "miprov2":
        return cls(metric=plain_score, num_candidates=budget, seed=seed)
    return cls(metric=plain_score, max_bootstrapped_demos=max(1, min(budget, 4)))


def _settings_line(optimiser: str, budget: int, seed: int, minibatch: int | None = None,
                   threads: int | None = None, val_sessions: int = 1) -> str:
    """The per-optimiser settings for the report."""
    if optimiser == "gepa":
        from priority.interpreter.module import INTERPRETER_MODEL
        batch = str(minibatch) if minibatch is not None else "GEPA default"
        thread_text = str(threads) if threads is not None else "GEPA default"
        return (f"candidates: {budget} (max_full_evals); reflection model: {INTERPRETER_MODEL} "
                f"(same as the interpreter); reflection minibatch size: {batch}; "
                f"threads (num_threads): {thread_text}; "
                f"valset sessions: {val_sessions}; "
                f"schema-guarded instruction proposer; format failures as feedback; seed {seed}")
    if optimiser == "miprov2":
        found = importlib.util.find_spec("optuna") is not None
        state = "present" if found else "absent (not installed; no install attempted)"
        return f"candidates: {budget} (num_candidates); seed {seed}; optuna extra: {state}"
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


def run(manifest: Path, labels: Path, real_dir: Path,
        optimiser: str, budget: int, seed: int, minibatch: int | None = None,
        threads: int | None = None, val_sessions: int = 1,
        seed_program: Path | str | None = None) -> int:
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
        student_lm = interpreter_mod.interpreter_lm(retries=3)
    except (AssertionError, RuntimeError):
        # Offline (or the made-up-world tests, which stub the key): the stub
        # teleprompter needs no model, so the run continues without one.
        student_lm = None
    student = interpreter_mod.Interpreter(lm=student_lm, variant="chain")
    seed_demos: dict = {}
    if seed_program is not None:
        try:
            student = load_seed_program(seed_program)
            if student_lm is not None:
                student.lm = student_lm
        except (OSError, ValueError) as exc:
            print(f"optimise failed: cannot load seed program {seed_program}: {exc}")
            return 1
        seed_demos = {name: list(predictor.demos) for name, predictor in student.named_predictors()
                      if list(getattr(predictor, "demos", None) or [])}
    try:
        if optimiser == "gepa":
            busy_names = busy_predictor_names(labels, parts["train"])
            train_examples, val_examples, _val_sessions = split_gepa_valset(
                examples, parts["train"], seed, val_sessions)
            optimiser_obj = _build_optimiser(optimiser, cls, budget, seed, busy_names, minibatch, threads)
            if val_examples:
                compiled = optimiser_obj.compile(student, trainset=train_examples, valset=val_examples)
            else:
                compiled = optimiser_obj.compile(student, trainset=train_examples)
        else:
            compiled = _build_optimiser(optimiser, cls, budget, seed).compile(student, trainset=examples)
    except Exception as exc:
        print(f"optimise failed: {optimiser} compile failed: {exc}")
        return 1
    _restore_seed_demos(compiled, seed_demos)
    program = PROGRAM_DIR / f"{optimiser}-budget{budget}-seed{seed}.json"
    save_program(compiled, program)
    append_report(REPORT_RELATIVE, optimiser, budget, seed, parts, program, minibatch, threads,
                  val_sessions)
    print(f"optimise {optimiser}: compiled on {len(examples)} train stops, "
          f"held out {len(parts['holdout'])} sessions")
    print(f"program: {program}")
    print(f"report: {REPORT_RELATIVE}")
    return 0
