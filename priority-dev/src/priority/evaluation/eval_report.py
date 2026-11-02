"""Print the eval report for one split from the scored per-stop rows.

The payload score is the only score. The facts (`status` and `needs_human`) and the step kinds are
diagnostics: they show where a prediction differs from the label, and they never change a score.
"""
from __future__ import annotations

import json
from pathlib import Path

from priority.evaluation.payload_rules import as_steps, get_field

FACT_FIELDS = ("status", "needs_human")


def _kinds(steps: object) -> list:
    return [get_field(step, "kind") for step in as_steps(steps)]


def diagnostics(label: dict, prediction: object) -> dict:
    """The fact and step-kind matches of one stop: each fact, the facts share, and the steps match."""
    fact_ok = {field: label.get(field) == get_field(prediction, field) for field in FACT_FIELDS}
    steps_ok = _kinds(label.get("payloads")) == _kinds(get_field(prediction, "steps"))
    return {"fact_ok": fact_ok, "facts": sum(fact_ok.values()) / len(FACT_FIELDS), "steps": float(steps_ok)}


def _mean(rows: list, key: str) -> float:
    """The mean of one component over the scored stops, or 0 for no stops."""
    return sum(row[key] for row in rows) / len(rows) if rows else 0.0


def _overall_line(label: str, rows: list) -> str:
    """One overall line, or n/a for no stops."""
    value = f"{_mean(rows, 'overall'):.3f}" if rows else "n/a"
    return f"overall {label}: {value} ({len(rows)} stops)"


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


def _print_stops(rows: list) -> None:
    for row in rows:
        marked = " model_error" if row.get("model_error") else " judge_error" if row["judge_error"] else ""
        print(f"score stop session={row['session']} stop={row['stop']} "
              f"overall={row['overall']:.3f} payload={row['payload']:.3f} gate={row['gate']} "
              f"ambiguous={'yes' if row['ambiguous'] else 'no'}{marked}")
    for row in rows:
        print(f"stop {row['session']} {row['stop']}: {row['overall']:.3f}")


def print_report(split_name: str, wanted: set, rows: list) -> None:
    """Print the per-session, per-stop, diagnostic, and overall lines of one split.

    A row with a judge error or a model error shows on its per-stop line only. It stays out of every mean and
    count, and the report counts each kind of error on its own line.
    """
    good = [row for row in rows if not row["judge_error"] and not row.get("model_error")]
    plain = [row for row in good if not row["ambiguous"]]
    print(f"eval {split_name}")
    print(f"sessions: {len(wanted)}")
    for session_id in sorted(wanted):
        session_rows = [row for row in good if row["session"] == session_id]
        if not session_rows:
            continue
        print(f"session {session_id} overall {_mean(session_rows, 'overall'):.3f} "
              f"({len(session_rows)} stops) facts {_mean(session_rows, 'facts'):.3f} "
              f"steps {_mean(session_rows, 'steps'):.3f}")
    _print_stops(rows)
    for field in FACT_FIELDS:
        hits = sum(1 for row in good if row["fact_ok"][field])
        print(f"fact {field}: {hits / len(good) if good else 0.0:.3f} ({hits}/{len(good)})")
    print(f"steps: {_mean(good, 'steps'):.3f}")
    print(f"judge errors: {sum(1 for row in rows if row['judge_error'])}")
    print(f"model errors: {sum(1 for row in rows if row.get('model_error'))}")
    print(_overall_line("including ambiguous", good))
    print(_overall_line("excluding ambiguous", plain))


def print_calls(calls_path: Path | None, start: int) -> None:
    """Print the interpreter call count and the characters sent during this run."""
    stored = _stored_rows(calls_path, start)
    sent = sum(len(row.get("rendered_input") or "") for row in stored)
    print(f"calls: {len(stored)}")
    print(f"chars sent: {sent}")
