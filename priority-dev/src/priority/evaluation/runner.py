"""Score the interpreter against the labelled fixture set, one split at a time.

For each manifest stop of the requested part, the runner builds the stop
brief from the transcript, runs the interpreter, and scores the outcome
against the confirmed label. A brief that abstains makes no model call.
The report breaks the score into facts, step kinds, grounding, and an
overall score, counting ambiguous stops both with and without them.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

from priority.brief import StopBrief, build_brief
from priority.evaluation.check import stop_key
from priority.evaluation.labels import load_labels
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
    """A stub dict passes through; an Interpretation becomes a prediction dict."""
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
    steps, quotes = [], []
    advice = getattr(result, "advice", None)
    if advice is not None:
        for action in advice.proposal.steps:
            steps.append(action.kind)
            if action.kind != "ask_human" and action.evidence_quote:
                quotes.append(action.evidence_quote)
    prediction.update({"steps": steps, "quotes": quotes, "abstain": None})
    abstained = getattr(result, "abstained", None)
    if abstained is not None:
        prediction["abstain"] = {"reason": abstained.reason, "detail": abstained.detail}
    return prediction


def _make_interpreter(log_dir: Path | str | None = None):
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
    return interpreter.Interpreter(lm, log_dir=log_dir)


def _match_labels(labels_by_session: dict, session_id: str):
    """Find the labels entry for one manifest session by prefix match.

    The manifest keys sessions by full id while the confirmed labels may
    key them by short prefix, or the reverse. An exact key wins; else the
    one labels key sharing a prefix with the session wins. Several sharing
    keys is an error, so the caller fails naming the session.
    """
    if session_id in labels_by_session:
        return labels_by_session[session_id], None
    matches = [key for key in labels_by_session
               if key.startswith(session_id) or session_id.startswith(key)]
    if len(matches) == 1:
        return labels_by_session[matches[0]], None
    if len(matches) > 1:
        return None, (f"eval failed: session {session_id} matches several "
                      f"labels keys: {', '.join(sorted(matches))}")
    return None, None


def _mean(rows: list, key: str) -> float:
    """The mean of one component over the scored stops."""
    return sum(row[key] for row in rows) / len(rows)


def _is_ambiguous(label: dict) -> bool:
    """Whether one label marks its stop ambiguous, in any stored shape."""
    value = label.get("ambiguous", False)
    if isinstance(value, str):
        return value.strip().lower() in ("true", "1", "yes")
    return bool(value)


def _stored_rows(path: Path | None, start: int) -> list[dict]:
    """The call rows stored during this run: the lines after `start`."""
    if path is None or not path.exists():
        return []
    rows = []
    for line in path.read_text().splitlines()[start:]:
        if line.strip():
            try:
                rows.append(json.loads(line))
            except ValueError:
                continue
    return rows


def run(manifest: Path, labels: Path, real_dir: Path, split_name: str,
        log_dir: Path | str | None = None) -> int:
    """Score one split of the fixture set and print the report. Return exit code."""
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
    model = _make_interpreter(log_dir)
    rows = []
    for entry in entries:
        session_id = entry["session"]
        if session_id not in wanted:
            continue
        session_labels, error = _match_labels(labels_by_session, session_id)
        if error is not None:
            print(error)
            return 1
        if session_labels is None:
            print(f"eval failed: session {session_id} has no labels")
            return 1
        transcript = Path(real_dir) / f"{session_id}.jsonl"
        for number in entry["stops"]:
            key = stop_key(number)
            if key not in session_labels:
                print(f"eval failed: session {session_id} stop {key} has no label")
                return 1
            label = session_labels[key]
            brief = build_brief(transcript, stop=number)
            if isinstance(brief, StopBrief):
                prediction = to_prediction(model(brief))
                brief_text = brief.for_model()
            else:
                prediction = {"abstain": {"reason": brief.reason, "detail": brief.detail}}
                brief_text = ""
            example = {field: label[field] for field in FACT_FIELDS} | {
                "steps": label["steps"], "ambiguous": label["ambiguous"], "brief_text": brief_text}
            value, _ = score(example, prediction)
            rows.append({"session": session_id, "stop": key, "overall": value,
                         **components(example, prediction), "ambiguous": _is_ambiguous(label)})
    if not rows:
        print(f"eval failed: split {split_name} holds no stops")
        return 1
    plain = [row for row in rows if not row["ambiguous"]]
    print(f"eval {split_name}")
    print(f"sessions: {len(wanted)}")
    for session_id in sorted(wanted):
        session_rows = [row for row in rows if row["session"] == session_id]
        print(f"session {session_id} overall {_mean(session_rows, 'overall'):.3f} "
              f"({len(session_rows)} stops) facts {_mean(session_rows, 'facts'):.3f} "
              f"steps {_mean(session_rows, 'steps'):.3f} "
              f"grounding {_mean(session_rows, 'grounding'):.3f} "
              f"validity {_mean(session_rows, 'validity'):.3f}")
    for row in rows:
        print(f"stop {row['session']} {row['stop']}: {row['overall']:.3f}")
    for field in FACT_FIELDS:
        hits = sum(1 for row in rows if row["fact_ok"][field])
        print(f"fact {field}: {hits / len(rows):.3f} ({hits}/{len(rows)})")
    print(f"steps: {_mean(rows, 'steps'):.3f}")
    print(f"grounding: {_mean(rows, 'grounding'):.3f}")
    print(f"overall including ambiguous: {_mean(rows, 'overall'):.3f} ({len(rows)} stops)")
    if plain:
        print(f"overall excluding ambiguous: {_mean(plain, 'overall'):.3f} ({len(plain)} stops)")
    else:
        print("overall excluding ambiguous: n/a (0 stops)")
    stored = _stored_rows(calls_path, start)
    sent = sum(len(row.get("rendered_input") or "") for row in stored)
    print(f"calls: {len(stored)}")
    print(f"chars sent: {sent}")
    return 0
