"""The train examples of `priority optimise`: one dspy example per train stop, and the train-only guard."""
from __future__ import annotations

import json
from pathlib import Path

from priority.evaluation.payload_rules import get_field


def assert_train_only(examples: list, holdout_ids: list[str]) -> None:
    """Fail when any example session id names a held-out session."""
    holdout = {session_id for session_id in holdout_ids if session_id}
    leaked = {get_field(example, "session_id") for example in examples} & holdout
    if leaked:
        raise ValueError(f"train-only guard: held-out session leaked: {', '.join(sorted(leaked))}")


def _train_example(session_id: str, key: str, label: dict, transcript: Path) -> object:
    """One dspy example: the brief text in, the label reference and diagnostics as the other fields."""
    import dspy

    from priority.brief import StopBrief, build_brief

    brief = build_brief(transcript, stop=int(key))
    text = brief.for_model() if isinstance(brief, StopBrief) else ""
    return dspy.Example(session_id=session_id, stop=key, brief_text=text, status=label["status"],
                        needs_human=label["needs_human"], priority=label.get("priority"),
                        ambiguous=label["ambiguous"], expected_payloads=label["payloads"]).with_inputs("brief_text")


def build_trainset(manifest: Path, labels_path: Path, real_dir: Path) -> tuple[list, dict[str, list[str]]]:
    """One dspy example per train stop. A stop whose label has no `payloads` key is excluded, and the
    count is printed."""
    from priority.evaluation.check import stop_key
    from priority.evaluation.labels import load_labels, match_session_key
    from priority.evaluation.split import parts_of

    entries = json.loads(Path(manifest).read_text())
    labels_by_session = load_labels(labels_path)
    parts = parts_of(entries)
    examples, excluded = [], 0
    for entry in (entry for entry in entries if entry["session"] in set(parts["train"])):
        session_id = entry["session"]
        matched_key = match_session_key(labels_by_session, session_id)
        if matched_key is None:
            raise ValueError(f"session {session_id} has no labels")
        for key in (stop_key(number) for number in entry["stops"]):
            label = labels_by_session[matched_key].get(key)
            if label is None:
                raise ValueError(f"session {session_id} stop {key} has no label")
            if "payloads" not in label:
                excluded += 1
                continue
            examples.append(_train_example(session_id, key, label, Path(real_dir) / f"{session_id}.jsonl"))
    print(f"excluded: {excluded} stops (no reference payload)")
    return examples, parts


def split_gepa_valset(examples: list, train_ids: list[str], seed: int,
                      val_sessions: int = 1) -> tuple[list, list, list[str]]:
    """Train sessions, picked by seed, as the GEPA valset. Holdout is untouched."""
    ordered = sorted(train_ids)
    count = max(0, min(val_sessions, len(ordered) - 1)) if len(ordered) > 1 else 0
    if count <= 0:
        return examples, [], []
    start = seed % len(ordered)
    val_ids = {ordered[(start + offset) % len(ordered)] for offset in range(count)}
    train = [example for example in examples if get_field(example, "session_id") not in val_ids]
    val = [example for example in examples if get_field(example, "session_id") in val_ids]
    if not train or not val:
        return examples, [], []
    return train, val, sorted(val_ids)
