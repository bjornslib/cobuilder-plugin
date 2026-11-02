"""Score the interpreter against the labelled fixture set, one split at a time.

For each manifest stop of the requested part, the runner builds the stop brief from the transcript, runs
the program, and scores the Prediction that it returns against the reference `{"priority", "steps"}` of
the confirmed label. A stop whose label has no `payloads` key is excluded, and so is a stop whose brief is
a demo of the program. The report prints both counts. A brief that abstains makes no model call. The
report also gives the status, needs_human, and step-kind matches as diagnostics, and it counts ambiguous
stops both with and without them. The last line holds the judge call and token totals.
"""
from __future__ import annotations

import json
import logging
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from priority.brief import StopBrief, build_brief
from priority.evaluation.check import stop_key
from priority.evaluation.demos import demo_briefs
from priority.evaluation.eval_report import diagnostics, print_calls, print_report
from priority.evaluation.judge import reset_usage, usage_line
from priority.evaluation.labels import load_labels, match_session_key
from priority.evaluation.metric import score
from priority.evaluation.split import split

MAX_THREADS = 6  # the most stops that one eval scores in flight at once

log = logging.getLogger("priority.eval")


def _make_interpreter(log_dir: Path | str | None = None, program: Path | str | None = None):
    """The real interpreter, or one without a model when the key is missing. A saved program loads into it.

    The caller may stub the Interpreter class (as the tests do); then the model is unused. A missing key only
    warns here, and every run abstains. A program that does not load raises ValueError.
    """
    from priority import interpreter

    try:
        lm = interpreter.interpreter_lm()
    except Exception as exc:  # noqa: BLE001 (offline runs still report, as abstains)
        log.warning("eval runs without a model: %s", exc)
        lm = None
    model = interpreter.Interpreter(lm, log_dir=log_dir)
    if program is not None:
        try:
            model.load(str(program))
        except Exception as exc:  # noqa: BLE001 (a corrupt file may raise anything)
            raise ValueError(f"cannot load program {program}: {exc}") from exc
    return model


def _is_ambiguous(label: dict) -> bool:
    """Whether one label marks its stop ambiguous, in any stored shape."""
    value = label.get("ambiguous", False)
    if isinstance(value, str):
        return value.strip().lower() in ("true", "1", "yes")
    return bool(value)


def _predict(model: object, brief: object, session_id: str = "", stop: str = "") -> tuple[object, str]:
    """The Prediction of one stop and its brief text. A brief Abstain becomes an abstained prediction.

    The identity goes to the call, not to the model, because worker threads share one model.
    """
    if isinstance(brief, StopBrief):
        text = brief.for_model()
        return model(brief_text=text, session_id=session_id, stop=stop), text
    abstain = {"reason": brief.reason, "detail": brief.detail, "raw": ""}
    return {"status": None, "needs_human": None, "priority": None, "steps": [], "abstain": abstain}, ""


def _score_stop(model: object, brief: object, label: dict, session_id: str = "", stop: str = "") -> dict:
    """Run the program on one stop and score it. Return the row."""
    prediction, brief_text = _predict(model, brief, session_id, stop)
    example = {"brief_text": brief_text, "priority": label.get("priority"), "expected_payloads": label["payloads"]}
    value, feedback = score(example, prediction)
    abstain = prediction.get("abstain") if isinstance(prediction, dict) else prediction.abstain
    gate = abstain.get("reason") if isinstance(abstain, dict) else "pass"
    return {**diagnostics(label, prediction), "overall": value, "ambiguous": _is_ambiguous(label),
            "payload": value, "gate": gate, "feedback": feedback}


def _stops(entries: list, labels_by_session: dict, wanted: set):
    """Each wanted stop as (session, key, number, label). A missing label raises."""
    for entry in entries:
        session_id = entry["session"]
        if session_id not in wanted:
            continue
        matched_key = match_session_key(labels_by_session, session_id)
        if matched_key is None:
            raise ValueError(f"session {session_id} has no labels")
        for number in entry["stops"]:
            key = stop_key(number)
            if key not in labels_by_session[matched_key]:
                raise ValueError(f"session {session_id} stop {key} has no label")
            yield session_id, key, number, labels_by_session[matched_key][key]


def _score_split(model: object, entries: list, labels_by_session: dict, wanted: set,
                 real_dir: Path, threads: int = 1) -> tuple[list, int, int]:
    """Score each stop of the wanted sessions. Return the rows, the count of stops excluded for no
    reference payload, and the count excluded as a demo of the program. A missing label raises.
    With threads > 1 the stops are scored in a thread pool, and the rows come back in manifest order."""
    rows, excluded, demos = [], 0, 0
    briefs = demo_briefs(model)
    work = []
    for session_id, key, number, label in _stops(entries, labels_by_session, wanted):
        if "payloads" not in label:
            excluded += 1
            continue
        brief = build_brief(Path(real_dir) / f"{session_id}.jsonl", stop=number)
        if isinstance(brief, StopBrief) and brief.for_model() in briefs:
            demos += 1
            continue
        work.append((session_id, key, brief, label))
    if threads > 1:
        with ThreadPoolExecutor(max_workers=min(threads, MAX_THREADS)) as pool:
            scored = list(pool.map(lambda item: _score_stop(model, item[2], item[3], item[0], item[1]), work))
    else:
        scored = [_score_stop(model, brief, label, session_id, key) for session_id, key, brief, label in work]
    rows = [{"session": session_id, "stop": key} | row
            for (session_id, key, _, _), row in zip(work, scored)]
    return rows, excluded, demos


def _load(manifest: Path, labels: Path) -> tuple[list, dict]:
    """The manifest entries and the labels. A file that does not read raises ValueError."""
    try:
        entries = json.loads(Path(manifest).read_text())
    except (OSError, ValueError) as exc:
        raise ValueError(f"cannot read manifest {manifest}: {exc}") from exc
    return entries, load_labels(labels)


def run(manifest: Path, labels: Path, real_dir: Path, split_name: str,
        log_dir: Path | str | None = None, program: Path | str | None = None,
        threads: int | None = None) -> int:
    """Score one split of the fixture set and print the report. Return exit code.
    threads=None keeps the serial loop; threads > 1 scores the stops in a thread pool of at most
    MAX_THREADS workers, and the rows still come back in manifest order."""
    workers = 1 if threads is None else max(1, min(int(threads), MAX_THREADS))
    print(f"threads: {workers}")
    try:
        entries, labels_by_session = _load(manifest, labels)
        parts = split([entry["session"] for entry in entries])
        if split_name not in parts:
            raise ValueError(f"unknown split {split_name!r}: use one of train, holdout")
        calls_path = Path(log_dir) / "calls.jsonl" if log_dir is not None else None
        start = len(calls_path.read_text().splitlines()) if calls_path is not None and calls_path.exists() else 0
        model = _make_interpreter(log_dir, program)
        if program is not None:
            print(f"program: {program}")
        reset_usage()
        rows, excluded, demos = _score_split(model, entries, labels_by_session, set(parts[split_name]),
                                              real_dir, workers)
    except ValueError as exc:
        print(f"eval failed: {exc}")
        return 1
    print(f"excluded: {excluded} stops (no reference payload)")
    print(f"demo stops excluded: {demos}")
    if not rows:
        print(f"eval failed: split {split_name} holds no stops")
        return 1
    print_report(split_name, set(parts[split_name]), rows)
    print_calls(calls_path, start)
    print(usage_line())
    return 0
