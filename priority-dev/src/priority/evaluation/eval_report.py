"""Print the eval report for one split from the scored per-stop rows."""
from __future__ import annotations

import json
from pathlib import Path

from priority.evaluation.metric import FACT_FIELDS


def _mean(rows: list, key: str) -> float:
    """The mean of one component over the scored stops."""
    return sum(row[key] for row in rows) / len(rows)


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


def print_report(split_name: str, wanted: set, rows: list, contradictions: int) -> None:
    """Print the per-session, per-stop, per-fact, and overall lines of one split."""
    plain = [row for row in rows if not row["ambiguous"]]
    print(f"eval {split_name}")
    print(f"sessions: {len(wanted)}")
    for session_id in sorted(wanted):
        session_rows = [row for row in rows if row["session"] == session_id]
        print(f"session {session_id} overall {_mean(session_rows, 'overall'):.3f} "
              f"({len(session_rows)} stops) facts {_mean(session_rows, 'facts'):.3f} "
              f"steps {_mean(session_rows, 'steps'):.3f} "
              f"validity {_mean(session_rows, 'validity'):.3f}")
    for row in rows:
        print(f"score stop session={row['session']} stop={row['stop']} "
              f"overall={row['overall']:.3f} payload={row['payload']:.3f} gate={row['gate']} "
              f"ambiguous={'yes' if row['ambiguous'] else 'no'}")
    for row in rows:
        print(f"stop {row['session']} {row['stop']}: {row['overall']:.3f}")
    for field in FACT_FIELDS:
        hits = sum(1 for row in rows if row["fact_ok"][field])
        print(f"fact {field}: {hits / len(rows):.3f} ({hits}/{len(rows)})")
    print(f"steps: {_mean(rows, 'steps'):.3f}")
    print(f"contradictions: {contradictions} ({len(rows)} stops)")
    print(f"overall including ambiguous: {_mean(rows, 'overall'):.3f} ({len(rows)} stops)")
    if plain:
        print(f"overall excluding ambiguous: {_mean(plain, 'overall'):.3f} ({len(plain)} stops)")
    else:
        print("overall excluding ambiguous: n/a (0 stops)")


def print_calls(calls_path: Path | None, start: int) -> None:
    """Print the interpreter call count and the characters sent during this run."""
    stored = _stored_rows(calls_path, start)
    sent = sum(len(row.get("rendered_input") or "") for row in stored)
    print(f"calls: {len(stored)}")
    print(f"chars sent: {sent}")
