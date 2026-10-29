"""The judge agreement bar: `priority judge-check`.

The pairs file is a JSON list. Each pair names a `session`, a `stop` (an int
or a zero-padded string such as "008"), two payload lists `a` and `b`, and
the human pick `human` ("a", "b", or null). The command scores each side with
`metric.score` against the stop's reference payload, `repeats` times, on the
brief built from the transcript. Three bars, fixed before the run: the judge
direction matches the human on at least 75% of the picked pairs, with at
least 6 picked pairs. The judge scores a code-made copy of each reference,
with one closed field changed, lower than the reference at least 90% of the
time. The judge direction flips between repeats on at most 10% of the pairs.
"""
from __future__ import annotations

import copy
import json
from pathlib import Path

from priority.brief import StopBrief, build_brief
from priority.evaluation.check import stop_key
from priority.evaluation.judge import reset_usage, usage_line
from priority.evaluation.labels import load_labels, match_session_key
from priority.evaluation.metric import score
from priority.evaluation.payload_rules import as_steps

AGREEMENT_BAR = 0.75
MIN_PAIRS = 6
PROBE_BAR = 0.90
FLIP_BAR = 0.10


def _transcript(real_dir: Path, session_id: str) -> Path:
    """The transcript of one session: the exact file, else the one file that starts with the id."""
    exact = Path(real_dir) / f"{session_id}.jsonl"
    matches = sorted(Path(real_dir).glob(f"{session_id}*.jsonl"))
    return exact if exact.exists() or len(matches) != 1 else matches[0]


def _example(real_dir: Path, session_id: str, number: int, reference: object) -> dict:
    """The metric example of one stop: the built brief text and the reference payload."""
    brief = build_brief(_transcript(real_dir, session_id), stop=number)
    text = brief.for_model() if isinstance(brief, StopBrief) else ""
    return {"brief_text": text, "expected_payloads": reference}


def _reference(labels_by_session: dict, session_id: str, number: int) -> object:
    """The reference payload of one stop. A missing label or reference raises."""
    key = match_session_key(labels_by_session, session_id)
    label = labels_by_session.get(key, {}).get(stop_key(number)) if key is not None else None
    if label is None or "payloads" not in label:
        raise ValueError(f"session {session_id} stop {stop_key(number)} has no reference payload")
    return label["payloads"]


def _direction(a: float, b: float) -> str | None:
    """The side the judge prefers, or None on a tie."""
    if a == b:
        return None
    return "a" if a > b else "b"


def _judge_pair(example: dict, entry: dict, repeats: int) -> tuple[str | None, bool]:
    """The judge direction over all repeats, and whether it flips between repeats."""
    a = [score(example, {"payloads": entry["a"]})[0] for _ in range(repeats)]
    b = [score(example, {"payloads": entry["b"]})[0] for _ in range(repeats)]
    flipped = len({_direction(x, y) for x, y in zip(a, b)}) > 1
    return _direction(sum(a), sum(b)), flipped


def _flip_multi(detail: dict) -> bool:
    """Flip multi_select on the first question. Return whether a field changed."""
    questions = detail.get("questions") or []
    if not questions or not isinstance(questions[0], dict):
        return False
    questions[0]["multi_select"] = not questions[0].get("multi_select", False)
    return True


def _swap_role(detail: dict) -> bool:
    """Swap the ask_human role. Return whether a field changed."""
    detail["role"] = "review" if detail.get("role") == "decide" else "decide"
    return True


def _rename_label(detail: dict) -> bool:
    """Rename the first option label of the first question. Return whether a field changed."""
    questions = detail.get("questions") or []
    options = questions[0].get("options") if questions and isinstance(questions[0], dict) else None
    if not options or not isinstance(options[0], dict) or "label" not in options[0]:
        return False
    options[0]["label"] = f"not {options[0]['label']}"
    return True


def probe_copies(reference: list) -> list[list]:
    """Code-made copies of one reference, each with one closed field changed."""
    index = next((i for i, step in enumerate(reference)
                  if isinstance(step, dict) and step.get("kind") == "ask_human"
                  and isinstance(step.get("detail"), dict)), None)
    if index is None:
        return []
    copies = []
    for change in (_flip_multi, _swap_role, _rename_label):
        changed = copy.deepcopy(reference)
        if change(changed[index]["detail"]):
            copies.append(changed)
    return copies


def _probe(labels_by_session: dict, real_dir: Path) -> tuple[int, int]:
    """How many probe copies score lower than their reference, and how many copies ran."""
    lower = total = 0
    for session_id, stops in labels_by_session.items():
        for key, label in stops.items():
            reference = as_steps(label.get("payloads"))
            copies = probe_copies(reference)
            if not copies:
                continue
            example = _example(real_dir, session_id, int(key), reference)
            base = score(example, {"payloads": reference})[0]
            total += len(copies)
            lower += sum(1 for changed in copies if score(example, {"payloads": changed})[0] < base)
    return lower, total


def _pairs(pairs: list, labels_by_session: dict, real_dir: Path, repeats: int) -> tuple[int, int, int]:
    """Judge each pair. Return the human matches, the picked pairs, and the flipped pairs."""
    matched = picked = flipped = 0
    for entry in pairs:
        number = int(entry["stop"])
        reference = _reference(labels_by_session, entry["session"], number)
        direction, flip = _judge_pair(_example(real_dir, entry["session"], number, reference),
                                      entry, repeats)
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


def run(pairs_path: Path, labels: Path, real_dir: Path, repeats: int = 2) -> int:
    """Measure the judge against the three bars and print the verdict. Return exit code."""
    reset_usage()
    try:
        pairs = json.loads(Path(pairs_path).read_text())
        labels_by_session = load_labels(labels)
        matched, picked, flipped = _pairs(pairs, labels_by_session, real_dir, repeats)
        probe = _probe(labels_by_session, real_dir)
    except (OSError, ValueError, KeyError, TypeError) as exc:
        print(f"judge-check failed: {exc}")
        return 1
    passed = _report((matched, picked), probe, (flipped, len(pairs)))
    print(f"agreement bar: {'pass' if passed else 'fail'}")
    return 0 if passed else 1
