"""Split fixture sessions into train and held-out parts, by session.

No stop of a held-out session may train the prompt, so the split never
divides a session. A fixed seed plus the session id decides the part, so
the split is stable across runs and input orders.
"""
from __future__ import annotations

import hashlib

SEED = "priority-fixtures-v1"
HOLDOUT_FRACTION = 0.3
MIN_HOLDOUT = 3


def _rank(session_id: str) -> str:
    """The stable rank of one session under the fixed seed."""
    return hashlib.sha256(f"{SEED}:{session_id}".encode()).hexdigest()


def parts_of(entries: list[dict]) -> dict[str, list[str]]:
    """The parts of one manifest. Every entry may declare `part` of `train` or `holdout`.

    When every entry carries a valid `part`, those fields decide the parts. When no
    entry carries `part`, the stable hash split decides. A mixed manifest, or a
    `part` with another value, raises ValueError that names the session.
    """
    declared = [entry.get("part") for entry in entries]
    if all(part is None for part in declared):
        return split([entry["session"] for entry in entries])
    for entry in entries:
        part = entry.get("part")
        if part not in ("train", "holdout"):
            raise ValueError(f"session {entry['session']} has part {part!r}: "
                             "use train or holdout on every entry, or none")
    return {name: sorted(entry["session"] for entry in entries if entry["part"] == name)
            for name in ("train", "holdout")}


def split(session_ids: list[str]) -> dict[str, list[str]]:
    """Split session ids into train and holdout lists, about 30 percent held out."""
    ordered = sorted(set(session_ids), key=_rank)
    count = len(ordered)
    if count <= 1:
        return {"train": sorted(ordered), "holdout": []}
    want = max(1, round(count * HOLDOUT_FRACTION))
    if count > MIN_HOLDOUT:
        want = max(MIN_HOLDOUT, want)
    want = min(want, count - 1)
    holdout = ordered[:want]
    train = ordered[want:]
    return {"train": sorted(train), "holdout": sorted(holdout)}
