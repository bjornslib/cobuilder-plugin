"""Verify a labelled fixture set: labels, split, manifest cover, git ignore.

The check passes only when every manifest stop has an engineer-confirmed
label, the split holds whole sessions with no overlap, and every real file
is Git-ignored. The report lists the train and holdout sessions and the
part of every stop.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

from priority.evaluation.labels import load_labels
from priority.evaluation.split import split


def stop_key(number: int) -> str:
    """The zero-padded stop key used in the labels file, for example "003"."""
    return f"{number:03d}"


def _git_root(start: Path) -> Path | None:
    """The repository root above start, or None outside a repository."""
    result = subprocess.run(
        ["git", "rev-parse", "--show-toplevel"],
        cwd=start if start.is_dir() else start.parent,
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        return None
    return Path(result.stdout.strip())


def _check_real_dir(real_dir: Path) -> str | None:
    """Fail when a file under the real dir is not Git-ignored."""
    if not real_dir.exists():
        return None
    root = _git_root(real_dir.resolve())
    files = sorted(p for p in real_dir.resolve().rglob("*") if p.is_file())
    if not files:
        return None
    if root is None:
        return f"real dir {real_dir} is not in a git repository, cannot verify ignore rules"
    for path in files:
        result = subprocess.run(
            ["git", "check-ignore", "-q", str(path)],
            cwd=root, capture_output=True,
        )
        if result.returncode != 0:
            return f"real file {path} is not git-ignored"
    return None


def _match_session(session_id: str, labels_by_session: dict) -> str | None:
    """Match a manifest session to its labels entry, by full id or short prefix."""
    if session_id in labels_by_session:
        return session_id
    if session_id[:8] in labels_by_session:
        return session_id[:8]
    candidates = [key for key in labels_by_session
                  if session_id.startswith(key) or key.startswith(session_id)]
    if len(candidates) == 1:
        return candidates[0]
    return None


def run(manifest: Path, labels: Path, real_dir: Path) -> int:
    """Check the fixture set and print the report. Return the exit code."""
    try:
        entries = json.loads(manifest.read_text())
    except (OSError, ValueError) as exc:
        print(f"fixtures check failed: cannot read manifest {manifest}: {exc}")
        return 1
    try:
        labels_by_session = load_labels(labels)
    except ValueError as exc:
        print(f"fixtures check failed: {exc}")
        return 1
    try:
        raw_labels = json.loads(labels.read_text())
    except (OSError, ValueError) as exc:
        print(f"fixtures check failed: cannot read labels {labels}: {exc}")
        return 1
    matched: dict[str, str] = {}
    for entry in entries:
        key = _match_session(entry["session"], labels_by_session)
        if key is None:
            print(f"fixtures check failed: session {entry['session']} has no labels")
            return 1
        matched[entry["session"]] = key

    session_ids = [entry["session"] for entry in entries]
    if "train" in raw_labels or "holdout" in raw_labels:
        train = set(raw_labels.get("train", []))
        holdout = set(raw_labels.get("holdout", []))
    else:
        parts = split(session_ids)
        train, holdout = set(parts["train"]), set(parts["holdout"])
    for session_id in sorted(train & holdout):
        print(f"fixtures check failed: session {session_id} is in both parts")
        return 1
    for session_id in session_ids:
        if session_id not in train and session_id not in holdout:
            print(f"fixtures check failed: session {session_id} is in neither part")
            return 1

    stop_count = 0
    for entry in entries:
        session_id = entry["session"]
        stops = labels_by_session.get(matched[session_id], {})
        for number in entry["stops"]:
            key = stop_key(number)
            if key not in stops:
                print(f"fixtures check failed: session {session_id} stop {key} has no label")
                return 1
            stop_count += 1

    problem = _check_real_dir(real_dir)
    if problem is not None:
        print(f"fixtures check failed: {problem}")
        return 1

    part_of = {sid: "train" for sid in train}
    part_of.update({sid: "holdout" for sid in holdout})
    print("fixtures ok")
    print(f"sessions: {len(entries)}")
    print(f"stops: {stop_count}")
    for entry in entries:
        print(f"{part_of[entry['session']]} {entry['session']}")
    for entry in entries:
        for number in entry["stops"]:
            print(f"stop {entry['session']} {stop_key(number)} {part_of[entry['session']]}")
    return 0
