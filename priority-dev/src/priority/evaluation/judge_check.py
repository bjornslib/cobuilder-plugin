"""The judge agreement bar: `priority judge-check`.

The pairs file is a JSON list. Each pair names a `session`, a `stop` (an int
or a zero-padded string such as "008"), two payload objects `a` and `b`, each
with a `priority` and a list of `steps`, and the human pick `human` ("a", "b",
or null). The command scores each side with `metric.score` against the stop's
reference `{"priority", "steps"}`, `repeats` times, on the brief built from the
transcript. Three bars, fixed before the run: the judge direction matches the
human on at least 75% of the picked pairs, with at least 6 picked pairs. The
judge scores a code-made copy of each reference, with one closed field changed
(the priority, multi_select, the role, or one option label), lower than the
reference at least 90% of the time. The judge direction flips between repeats
on at most 10% of the pairs.

Each judge call prints one flushed progress line with the seconds it took. With
a checkpoint file, each finished pair and probe copy is appended as one row, and
a run that starts again judges only the units that have no row.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

from priority.brief import StopBrief, build_brief
from priority.evaluation.check import stop_key
from priority.evaluation.judge import reset_usage, usage_line
from priority.evaluation.judge_check_store import Checkpoint, fingerprint, pair_key, probe_key
from priority.evaluation.judge_probe import probe_copies
from priority.evaluation.labels import load_labels, match_session_key
from priority.evaluation.metric import score
from priority.evaluation.payload_rules import as_steps

AGREEMENT_BAR = 0.75
MIN_PAIRS = 6
PROBE_BAR = 0.90
FLIP_BAR = 0.10
clock = time.monotonic  # read at call time, so a test can set it


def _transcript(real_dir: Path, session_id: str) -> Path:
    """The transcript of one session: the exact file, else the one file that starts with the id."""
    exact = Path(real_dir) / f"{session_id}.jsonl"
    matches = sorted(Path(real_dir).glob(f"{session_id}*.jsonl"))
    return exact if exact.exists() or len(matches) != 1 else matches[0]


def _example(real_dir: Path, session_id: str, number: int, label: dict) -> dict:
    """The metric example of one stop: the built brief text and the reference of the label."""
    brief = build_brief(_transcript(real_dir, session_id), stop=number)
    text = brief.for_model() if isinstance(brief, StopBrief) else ""
    return {"brief_text": text, "priority": label.get("priority"), "expected_payloads": label["payloads"]}


def _label(labels_by_session: dict, session_id: str, number: int) -> dict:
    """The label of one stop. A missing label or reference raises."""
    key = match_session_key(labels_by_session, session_id)
    label = labels_by_session.get(key, {}).get(stop_key(number)) if key is not None else None
    if label is None or "payloads" not in label:
        raise ValueError(f"session {session_id} stop {stop_key(number)} has no reference payload")
    return label


def _side(payload: dict) -> dict:
    """One payload object as a prediction that did not abstain."""
    return {"priority": payload.get("priority"), "steps": payload.get("steps"), "abstain": None}


def _direction(a: float, b: float) -> str | None:
    """The side the judge prefers, or None on a tie."""
    if a == b:
        return None
    return "a" if a > b else "b"


def _timed(example: dict, payload: dict, label: str) -> float:
    """One judge call. Print its progress line, flushed, with the seconds it took. Return the score."""
    start = clock()
    value = score(example, _side(payload))[0]
    print(f"{label} done {clock() - start:.1f}s", flush=True)
    return value


def _verdict(a: list, b: list) -> tuple[str | None, bool]:
    """The judge direction over all repeats, and whether it flips between repeats."""
    flipped = len({_direction(x, y) for x, y in zip(a, b)}) > 1
    return _direction(sum(a), sum(b)), flipped


def _pair_row(example: dict, entry: dict, repeats: int, where: str, digest: str) -> dict:
    """Judge both sides of one pair, every repeat. Return the checkpoint row."""
    scores = {side: [_timed(example, entry[side], f"pair {where} side {side} repeat {n}/{repeats}")
                     for n in range(1, repeats + 1)] for side in ("a", "b")}
    return {"session": entry["session"], "stop": int(entry["stop"]), "fingerprint": digest, **scores}


def _probe_reference(session_id: str, key: str, label: dict, real_dir: Path, store: Checkpoint) -> tuple[int, int]:
    """How many copies of one reference score lower than it, and how many copies there are."""
    reference = {"priority": label.get("priority"), "steps": as_steps(label.get("payloads"))}
    copies = probe_copies(reference)
    rows = {name: store.get(probe_key(session_id, key, name, fingerprint([reference, changed])))
            for name, changed in copies}
    base = next((row["base"] for row in rows.values() if row), None)
    example, where, lower = None, f"probe {session_id} stop {key}", 0
    for name, changed in copies:
        if rows[name] is None:
            example = example or _example(real_dir, session_id, int(key), label)
            base = _timed(example, reference, f"{where} base") if base is None else base
            rows[name] = {"session": session_id, "stop": int(key), "changed": name,
                          "fingerprint": fingerprint([reference, changed]), "base": base,
                          "copy": _timed(example, changed, f"{where} copy {name}")}
            store.add(rows[name])
        lower += rows[name]["copy"] < rows[name]["base"]
    return lower, len(copies)


def _probe(labels_by_session: dict, real_dir: Path, store: Checkpoint) -> tuple[int, int]:
    """How many probe copies score lower than their reference, and how many copies ran."""
    lower = total = 0
    for session_id, stops in labels_by_session.items():
        for key, label in stops.items():
            found, count = _probe_reference(session_id, key, label, real_dir, store)
            lower, total = lower + found, total + count
    return lower, total


def _pairs(pairs: list, labels_by_session: dict, real_dir: Path, repeats: int,
           store: Checkpoint) -> tuple[int, int, int]:
    """Judge each pair. Return the human matches, the picked pairs, and the flipped pairs."""
    matched = picked = flipped = 0
    for index, entry in enumerate(pairs, 1):
        number = int(entry["stop"])
        label = _label(labels_by_session, entry["session"], number)
        digest = fingerprint({"a": entry["a"], "b": entry["b"], "repeats": repeats})
        row = store.get(pair_key(entry["session"], number, digest))
        if row is None:
            example = _example(real_dir, entry["session"], number, label)
            row = _pair_row(example, entry, repeats, f"{index}/{len(pairs)}", digest)
            store.add(row)
        direction, flip = _verdict(row["a"], row["b"])
        flipped += flip
        if entry.get("human") in ("a", "b"):
            picked += 1
            matched += direction == entry["human"]
    return matched, picked, flipped


def _ratio(hits: int, total: int) -> float:
    """One share, or 0 when nothing ran."""
    return hits / total if total else 0.0


def _report(agreement: tuple[int, int], probe: tuple[int, int], flips: tuple[int, int]) -> bool:
    """Print the three bars and the judge usage line. Return whether every bar passes."""
    agree_ratio, probe_ratio, flip_ratio = _ratio(*agreement), _ratio(*probe), _ratio(*flips)
    print(f"human agreement: {agreement[0]}/{agreement[1]} = {agree_ratio:.2f} "
          f"(bar {AGREEMENT_BAR:.2f}, min {MIN_PAIRS} pairs)")
    print(f"closed-field probe: {probe[0]}/{probe[1]} = {probe_ratio:.2f} (bar {PROBE_BAR:.2f})")
    print(f"repeat flips: {flips[0]}/{flips[1]} = {flip_ratio:.2f} (bar {FLIP_BAR:.2f})")
    print(usage_line())
    return (agreement[1] >= MIN_PAIRS and agree_ratio >= AGREEMENT_BAR
            and probe[1] > 0 and probe_ratio >= PROBE_BAR and flip_ratio <= FLIP_BAR)


def run(pairs_path: Path, labels: Path, real_dir: Path, repeats: int = 2, checkpoint: Path | None = None) -> int:
    """Measure the judge against the three bars and print the verdict. Return exit code."""
    reset_usage()
    try:
        pairs = json.loads(Path(pairs_path).read_text())
        labels_by_session = load_labels(labels)
        store = Checkpoint(checkpoint)
        matched, picked, flipped = _pairs(pairs, labels_by_session, real_dir, repeats, store)
        probe = _probe(labels_by_session, real_dir, store)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f"judge-check failed: {exc}")
        return 1
    store.warn_unused()
    passed = _report((matched, picked), probe, (flipped, len(pairs)))
    print(f"agreement bar: {'pass' if passed else 'fail'}")
    return 0 if passed else 1
