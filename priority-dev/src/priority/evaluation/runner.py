"""Score the interpreter against the labelled fixture set, one split at a time.

For each manifest stop of the requested part, the runner builds the stop
brief from the transcript, runs the interpreter, and scores the payload
against the reference payload of the confirmed label. A stop whose label has
no `payloads` key is excluded, and the report prints the count. A brief that
abstains makes no model call. The report also breaks out facts, step kinds,
and an overall score as diagnostics, counting ambiguous stops both with and
without them. The last line holds the judge call and token totals.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

from priority.brief import StopBrief, build_brief
from priority.evaluation.check import stop_key
from priority.evaluation.eval_report import print_calls, print_report
from priority.evaluation.judge import reset_usage, usage_line
from priority.evaluation.labels import load_labels, match_session_key
from priority.evaluation.metric import FACT_FIELDS, components, score
from priority.evaluation.split import split

log = logging.getLogger("priority.eval")


def _nearest(mapping: dict, value: object) -> object:
    """Map a model number back to its label word, or keep a word as it is."""
    if isinstance(value, str) and value in mapping:
        return value
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return value
    return min(mapping, key=lambda name: abs(mapping[name] - number))


def to_prediction(result: object) -> dict:
    """A stub dict passes through; an Interpretation becomes a prediction dict.

    `payloads` holds the dumped proposal steps, or `[]` with no advice."""
    if isinstance(result, dict):
        return result
    from priority.interpreter.signatures import HINT, RISK

    prediction: dict = {}
    facts = getattr(result, "facts", None)
    if facts is not None:
        prediction.update({
            "status": facts.status, "needs_human": facts.needs_human,
            "answer_class": facts.answer_class, "risk": _nearest(RISK, facts.risk),
            "priority_hint": _nearest(HINT, facts.priority_hint)})
    steps, quotes, asked, payloads = [], [], [], []
    advice = getattr(result, "advice", None)
    if advice is not None:
        payloads = [action.model_dump() for action in advice.proposal.steps]
        for action in advice.proposal.steps:
            steps.append(action.kind)
            if action.kind != "ask_human" and action.evidence_quote:
                quotes.append(action.evidence_quote)
            if action.kind == "ask_human":
                detail = getattr(action, "detail", None)
                items = getattr(detail, "questions", ()) if detail is not None else ()
                asked.extend(items)
    if not asked and advice is not None and getattr(advice, "question", None) is not None:
        asked = [advice.question]
    prediction.update({"steps": steps, "quotes": quotes, "questions": asked,
                       "payloads": payloads, "abstain": None})
    abstained = getattr(result, "abstained", None)
    if abstained is not None:
        prediction["abstain"] = {"reason": abstained.reason, "detail": abstained.detail}
    return prediction


def contradiction_count(predictions: list) -> int:
    """How many predictions pair a question card with a first step that avoids the human."""
    count = 0
    for prediction in predictions:
        steps = prediction.get("steps") or []
        asked = prediction.get("questions") or []
        has_card = bool(asked) or prediction.get("question") is not None or prediction.get("card") is not None
        if steps and steps[0] == "snooze" and has_card:
            count += 1
    return count


def _make_interpreter(log_dir: Path | str | None = None, variant: str = "chain"):
    """The real interpreter, or one without a model when the key is missing.

    The caller may stub the Interpreter class (as the tests do); then the
    model is unused. A missing key only warns here, and every run abstains.
    """
    from priority import interpreter

    try:
        lm = interpreter.interpreter_lm()
    except Exception as exc:  # noqa: BLE001 (offline runs still report, as abstains)
        log.warning("eval runs without a model: %s", exc)
        lm = None
    return interpreter.Interpreter(lm, log_dir=log_dir, variant=variant)


def _is_ambiguous(label: dict) -> bool:
    """Whether one label marks its stop ambiguous, in any stored shape."""
    value = label.get("ambiguous", False)
    if isinstance(value, str):
        return value.strip().lower() in ("true", "1", "yes")
    return bool(value)


def _score_stop(model: object, transcript: Path, number: int, label: dict) -> tuple[dict, dict]:
    """Run the interpreter on one stop and score it. Return the prediction and its row."""
    brief = build_brief(transcript, stop=number)
    if isinstance(brief, StopBrief):
        prediction = to_prediction(model(brief))
        brief_text = brief.for_model()
    else:
        prediction = {"abstain": {"reason": brief.reason, "detail": brief.detail}}
        brief_text = ""
    example = {field: label[field] for field in FACT_FIELDS} | {
        "steps": label["steps"], "ambiguous": label["ambiguous"], "brief_text": brief_text,
        "expected_payloads": label["payloads"]}
    value, feedback = score(example, prediction)
    abstain = prediction.get("abstain") if isinstance(prediction, dict) else None
    gate = abstain.get("reason") if isinstance(abstain, dict) else "pass"
    return prediction, {**components(example, prediction), "overall": value,
                        "ambiguous": _is_ambiguous(label), "payload": value, "gate": gate,
                        "feedback": feedback}


def _score_split(model: object, entries: list, labels_by_session: dict, wanted: set,
                 real_dir: Path) -> tuple[list, list, int]:
    """Score each stop of the wanted sessions. Return the rows, the predictions,
    and the count of stops excluded for no reference payload. A missing label raises."""
    rows, predictions, excluded = [], [], 0
    for entry in entries:
        session_id = entry["session"]
        if session_id not in wanted:
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
            if "payloads" not in session_labels[key]:
                excluded += 1
                continue
            prediction, row = _score_stop(model, transcript, number, session_labels[key])
            predictions.append(prediction)
            rows.append({"session": session_id, "stop": key} | row)
    return rows, predictions, excluded


def run(manifest: Path, labels: Path, real_dir: Path, split_name: str,
        log_dir: Path | str | None = None, variant: str = "chain",
        program: Path | str | None = None) -> int:
    """Score one split of the fixture set and print the report. Return exit code."""
    if program is not None:
        try:
            json.loads(Path(program).read_text())
        except (OSError, ValueError) as exc:
            print(f"eval failed: cannot load program {program}: {exc}")
            return 1
        print(f"program: {program}")
    try:
        entries = json.loads(Path(manifest).read_text())
    except (OSError, ValueError) as exc:
        print(f"eval failed: cannot read manifest {manifest}: {exc}")
        return 1
    try:
        labels_by_session = load_labels(labels)
    except ValueError as exc:
        print(f"eval failed: {exc}")
        return 1
    parts = split([entry["session"] for entry in entries])
    if split_name not in parts:
        print(f"eval failed: unknown split {split_name!r}: use one of train, holdout")
        return 1
    wanted = set(parts[split_name])
    calls_path = Path(log_dir) / "calls.jsonl" if log_dir is not None else None
    start = len(calls_path.read_text().splitlines()) if calls_path is not None and calls_path.exists() else 0
    model = _make_interpreter(log_dir, variant)
    reset_usage()
    try:
        rows, predictions, excluded = _score_split(model, entries, labels_by_session, wanted, real_dir)
    except ValueError as exc:
        print(f"eval failed: {exc}")
        return 1
    print(f"excluded: {excluded} stops (no reference payload)")
    if not rows:
        print(f"eval failed: split {split_name} holds no stops")
        return 1
    print_report(split_name, wanted, rows, contradiction_count(predictions))
    print_calls(calls_path, start)
    print(usage_line())
    return 0
