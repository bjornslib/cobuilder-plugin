"""Digest report: the numbers and flags of a digest run, and the compact-versus-full comparison.

Reads calls.jsonl and eval output. It holds numbers and flags only, never brief or reply text.
The compare step takes each test set from the manifest: a held-out entry with group "first set" is
"test set 1", and every other held-out entry is "test set 2".

Usage:
  python digest_report.py digest LOG_DIR
  python digest_report.py compare FULL_OUT COMPACT_OUT FULL_LOG COMPACT_LOG MANIFEST
"""
from __future__ import annotations

import argparse
import json
import random
import re
from pathlib import Path

PREVIOUS = "PREVIOUS RUN:"
HUMAN_ASKED = "HUMAN ASKED:\n"
SECTION = "\nRUN"
SCORE = re.compile(r"^score stop session=(\S+) stop=(\d+) overall=([0-9.]+)", re.MULTILINE)
DRAWS = 2000
SEED = 25


def read_rows(log_dir) -> list[dict]:
    path = Path(log_dir) / "calls.jsonl"
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def human_asked_chars(text: str) -> int:
    start = text.find(HUMAN_ASKED)
    if start < 0:
        return 0
    rest = text[start + len(HUMAN_ASKED):]
    end = rest.find(SECTION)
    if end >= 0:
        rest = rest[:end]
    return len(rest.strip())


def digest_rows(log_dir) -> list[dict]:
    """One dict per call row. The dict holds numbers and flags only."""
    out = []
    for row in read_rows(log_dir):
        text = row.get("rendered_input") or ""
        out.append({
            "session": row["session_id"][:8],
            "stop": row["stop"],
            "stage": row["stage"],
            "model_id": row["model_id"],
            "input_chars": len(text),
            "reply_chars": len(row.get("raw_reply") or ""),
            "previous_run": PREVIOUS in text,
            "human_asked_chars": human_asked_chars(text),
            "valid": bool(row.get("valid", True)) and not row.get("error"),
        })
    return out


def scores(text: str) -> dict:
    return {(session[:8], int(stop)): float(overall) for session, stop, overall in SCORE.findall(text)}


def chars_by_key(calls: list[dict]) -> dict:
    """The propose-stage input size of each call, keyed by (session, int stop)."""
    return {(row["session_id"][:8], int(row["stop"])): len(row.get("rendered_input") or "")
            for row in calls if row.get("stage") == "propose"}


def mean(values: list[float]) -> float:
    return sum(values) / len(values)


def interval(rows: list[dict]) -> tuple[float, float]:
    """A 95 percent bootstrap interval of the mean difference. It resamples sessions with a fixed seed."""
    by_session: dict[str, list[float]] = {}
    for row in rows:
        by_session.setdefault(row["session"], []).append(row["diff"])
    groups = list(by_session.values())
    rng = random.Random(SEED)
    stats = []
    for _ in range(DRAWS):
        picked = [groups[rng.randrange(len(groups))] for _ in groups]
        stats.append(mean([value for group in picked for value in group]))
    stats.sort()
    return stats[int(0.025 * (DRAWS - 1))], stats[int(0.975 * (DRAWS - 1))]


def summary(rows: list[dict]) -> dict:
    if not rows:
        return {"n": 0, "sessions": 0, "full": None, "compact": None, "diff": None, "lo": None, "hi": None}
    full = mean([row["full"] for row in rows])
    compact = mean([row["compact"] for row in rows])
    lo, hi = interval(rows)
    return {"n": len(rows), "sessions": len({row["session"] for row in rows}), "full": full,
            "compact": compact, "diff": compact - full, "lo": lo, "hi": hi}


def manifest_groups(entries: list[dict]) -> dict[str, str]:
    """Map each held-out session of a manifest to its test set. Group "first set" is test set 1."""
    return {entry["session"]: "test set 1" if entry.get("group") == "first set" else "test set 2"
            for entry in entries if entry.get("part") == "holdout"}


def compare_rows(full_out: str, compact_out: str, full_calls: list[dict], compact_calls: list[dict],
                 groups: dict[str, str]) -> dict:
    """Pair the score lines of two eval outputs by session and stop. Summarise compact minus full.

    `groups` maps each held-out session id to its test set. A paired session that `groups`
    does not hold raises ValueError, so no row takes a group by guess.
    """
    by_short = {session[:8]: name for session, name in groups.items()}
    full, compact = scores(full_out), scores(compact_out)
    full_chars, compact_chars = chars_by_key(full_calls), chars_by_key(compact_calls)
    rows = []
    for session, stop in sorted(full.keys() & compact.keys()):
        if session not in by_short:
            raise ValueError(f"session {session} is not a held-out session of the manifest")
        rows.append({"session": session, "stop": stop, "group": by_short[session],
                     "full": full[(session, stop)], "compact": compact[(session, stop)],
                     "diff": compact[(session, stop)] - full[(session, stop)],
                     "full_chars": full_chars.get((session, stop)),
                     "compact_chars": compact_chars.get((session, stop))})
    result = {"rows": rows, "all": summary(rows)}
    for name in sorted(set(by_short.values())):
        result[name] = summary([row for row in rows if row["group"] == name])
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="The digest report and the compact comparison.")
    sub = parser.add_subparsers(dest="command", required=True)
    one = sub.add_parser("digest", help="Print the digest rows of a log folder")
    one.add_argument("log_dir", type=Path)
    two = sub.add_parser("compare", help="Compare the compact and full eval outputs")
    two.add_argument("full_out", type=Path)
    two.add_argument("compact_out", type=Path)
    two.add_argument("full_log", type=Path)
    two.add_argument("compact_log", type=Path)
    two.add_argument("manifest", type=Path)
    args = parser.parse_args(argv)
    if args.command == "digest":
        data = digest_rows(args.log_dir)
    else:
        entries = json.loads(args.manifest.read_text())
        data = compare_rows(args.full_out.read_text(), args.compact_out.read_text(),
                            read_rows(args.full_log), read_rows(args.compact_log),
                            manifest_groups(entries))
    print(json.dumps(data, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
