"""The GEPA valset: the train sessions held out of the GEPA train split. The mix of a set of stops is in priority.valset_mix.

`neighbours` picks a run of the sorted train ids from offset `seed % n`, so the valset is whatever ids
sit next to each other. `stratified` (the default) picks whole sessions so that the valset matches the
train stops on each tag. A tag is a repository (the manifest group, see valset_mix) or a stop kind.

The stratified pick is greedy. Each step adds the session that leaves the smallest gap, where the gap
is the sum over all tags of |valset share - train share|. A swap pass then exchanges one picked session
for one unpicked session while the swap lowers the gap. A swap keeps the valset size and one train session
per repository. A tie goes to the lower sha256 of `seed:session id`, so one seed gives one valset. A session
never splits. A repository keeps at least one train session. The pick ends when the valset reaches its
`ValsetSize`: `sessions` train sessions, or at least `stops` stops, or when no session can be added.
"""
from __future__ import annotations

import hashlib
from collections import Counter
from collections.abc import Callable
from dataclasses import dataclass
from itertools import product

from priority.evaluation.payload_rules import get_field
from priority.valset_mix import NO_GROUP, counts_of

METHODS = ("neighbours", "stratified")
DEFAULT_VAL_SESSIONS = 1
_EPS = 1e-12


@dataclass(frozen=True)
class ValsetSize:
    """How big the valset is. `sessions` is a train session count, and `stops` is a stop count the valset must
    reach or pass. Both None means one session. Give one of the two, not both."""
    sessions: int | None = None
    stops: int | None = None

    @property
    def session_count(self) -> int:
        return DEFAULT_VAL_SESSIONS if self.sessions is None else self.sessions

    def reached(self, picked: int, stops: int) -> bool:
        """True when a valset of `picked` sessions and `stops` stops is big enough."""
        if self.stops is not None:
            return stops >= self.stops
        return picked >= self.session_count


def _tie(seed: int, session_id: str) -> str:
    """The tie-break rank of one session under one seed."""
    return hashlib.sha256(f"{seed}:{session_id}".encode()).hexdigest()


@dataclass(frozen=True)
class _Session:
    """One train session: its repository, its stop count, and how many of its stops carry each tag."""
    repo: str
    stops: int
    counts: Counter


def _sessions(examples: list) -> dict[str, _Session]:
    """The train sessions that hold at least one example, by session id."""
    grouped: dict[str, list] = {}
    for example in examples:
        grouped.setdefault(get_field(example, "session_id"), []).append(example)
    return {sid: _Session(get_field(group[0], "repo", NO_GROUP), len(group), counts_of(group))
            for sid, group in grouped.items()}


def _gap(counts: Counter, stops: int, target: dict[str, float]) -> float:
    """The sum over tags of the absolute gap between the share in counts and the target share. Tags are sorted, so
    the float sum has one order in every process."""
    return sum(abs(counts[tag] / stops - target.get(tag, 0.0)) for tag in sorted(set(counts) | set(target)))


def pick_stratified(examples: list, seed: int, size: ValsetSize) -> set[str]:
    """Whole train sessions, picked greedily and then swapped so the valset shares match the train shares. See the module docstring."""
    sessions = _sessions(examples)
    if len(sessions) <= 1:
        return set()
    target = {tag: count / len(examples) for tag, count in counts_of(examples).items()}
    spare = Counter(session.repo for session in sessions.values())
    picked: set[str] = set()
    counts, stops = Counter(), 0
    while not size.reached(len(picked), stops):
        open_ids = [sid for sid, session in sessions.items() if sid not in picked and spare[session.repo] > 1]
        if not open_ids:
            break
        best = min(open_ids, key=lambda sid: (_gap(counts + sessions[sid].counts,
                                                   stops + sessions[sid].stops, target), _tie(seed, sid)))
        picked.add(best)
        spare[sessions[best].repo] -= 1
        counts += sessions[best].counts
        stops += sessions[best].stops
    return _refine(picked, sessions, target, size)


def _refine(picked: set[str], sessions: dict[str, _Session], target: dict[str, float],
            size: ValsetSize) -> set[str]:
    """Swap one picked session for one unpicked session while a swap lowers the gap. A swap keeps the valset size
    and one train session per repository. The walk is in sorted order, so one seed gives one valset."""
    repos = Counter(session.repo for session in sessions.values())

    def score(ids: set[str]) -> tuple[float, bool]:
        counts = sum((sessions[sid].counts for sid in ids), Counter())
        stops = sum(sessions[sid].stops for sid in ids)
        held = Counter(sessions[sid].repo for sid in ids)
        valid = size.reached(len(ids), stops) and all(held[r] < repos[r] for r in repos)
        return _gap(counts, stops, target), valid

    best, _ = score(picked)
    while (swap := _better_swap(picked, sessions, score, best)) is not None:
        picked = swap
        best, _ = score(picked)
    return picked


def _better_swap(picked: set[str], sessions: dict[str, _Session],
                 score: Callable[[set[str]], tuple[float, bool]], best: float) -> set[str] | None:
    """The first swap, in sorted order, that keeps the pick valid and lowers the gap below `best`, or None."""
    for out, inn in product(sorted(picked), sorted(set(sessions) - picked)):
        candidate = (picked - {out}) | {inn}
        gap, valid = score(candidate)
        if valid and gap < best - _EPS:
            return candidate
    return None


def pick_neighbours(train_ids: list[str], seed: int, count: int) -> set[str]:
    """The old ring pick: `count` sessions from the sorted ids, starting at `seed % n`. One session always stays in train."""
    ordered = sorted(train_ids)
    if len(ordered) <= 1:
        return set()
    count = max(0, min(count, len(ordered) - 1))
    start = seed % len(ordered)
    return {ordered[(start + offset) % len(ordered)] for offset in range(count)}


def _ring_by_stops(train_ids: list[str], seed: int, stops_of: Counter, target: int) -> set[str]:
    """The ring pick, walked until the picked sessions hold `target` stops. One session always stays in train."""
    ordered = sorted(train_ids)
    if len(ordered) <= 1:
        return set()
    start = seed % len(ordered)
    picked: set[str] = set()
    stops = 0
    for offset in range(len(ordered) - 1):
        if stops >= target:
            break
        sid = ordered[(start + offset) % len(ordered)]
        picked.add(sid)
        stops += stops_of[sid]
    return picked


def pick_ids(examples: list, train_ids: list[str], seed: int, method: str, size: ValsetSize) -> set[str]:
    """The valset session ids, picked by `method` and sized by `size`. The options are checked first.

    Raises ValueError when the options are refused, or when `size.stops` cannot be reached.
    """
    error = size_error(method, size)
    if error is not None:
        raise ValueError(error)
    if size.stops is None:
        if method == "stratified":
            return pick_stratified(examples, seed, size)
        return pick_neighbours(train_ids, seed, size.session_count)
    if method == "stratified":
        picked = pick_stratified(examples, seed, size)
    else:
        stops_of = Counter(get_field(example, "session_id") for example in examples)
        picked = _ring_by_stops(train_ids, seed, stops_of, size.stops)
    stops = sum(1 for example in examples if get_field(example, "session_id") in picked)
    if stops < size.stops:
        raise ValueError(f"valset: asked for {size.stops} stops, the pick reaches {stops}")
    return picked


def size_error(method: str, size: ValsetSize) -> str | None:
    """Why the valset options are refused, or None when they are valid."""
    if size.sessions is not None and size.stops is not None:
        return "give --val-sessions or --val-stops, not both"
    if method not in METHODS:
        return f"unknown valset {method!r}: use one of {', '.join(METHODS)}"
    if size.stops is not None and size.stops < 1:
        return f"--val-stops must be at least 1, got {size.stops}"
    return None


def describe(method: str, size: ValsetSize) -> str:
    """The valset text for the report: the method and its size."""
    if size.stops is not None:
        return f"{method}, sized by stops (target {size.stops})"
    return f"{method}, sized by sessions ({size.session_count})"
